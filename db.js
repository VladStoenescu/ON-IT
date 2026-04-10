/**
 * PostgreSQL database layer.
 *
 * Each logical "collection" (previously stored as a JSON file) is persisted as
 * a table of the form:
 *
 *   CREATE TABLE <name> (id TEXT PRIMARY KEY, data JSONB NOT NULL)
 *
 * Two high-level helpers – getCollection / setCollection – provide a drop-in
 * replacement for the old readJson / writeJson pattern so that the rest of
 * server.js required minimal changes.
 */

'use strict';

const pg = require('pg');
const { Pool } = pg;

// Ensure self-signed / managed-DB certificates are always accepted.
// Some pg v8 builds ignore the per-Pool ssl option when a connectionString
// with embedded sslmode params is provided; setting the module-level default
// guarantees the behaviour regardless of the connection path.
pg.defaults.ssl = { rejectUnauthorized: false };

// ── Connection ────────────────────────────────────────────────────────────────

// Accept a full DATABASE_URL (e.g. from DigitalOcean's managed-DB binding) or
// fall back to individual env vars with the project defaults.
//
// Newer pg-connection-string versions treat `sslmode=require` (and related
// modes) as `verify-full`, which causes certificate verification to override
// our explicit `ssl: { rejectUnauthorized: false }` setting.  Strip the
// sslmode search-param from the URL before handing it to pg so that our ssl
// option is the sole authority on certificate checking.
function buildConnectionString(raw) {
    try {
        const u = new URL(raw);
        u.searchParams.delete('sslmode');
        return u.toString();
    } catch (_) {
        return raw; // Not a parseable URL – pass through unchanged.
    }
}

const pool = process.env.DATABASE_URL
    ? new Pool({
          connectionString: buildConnectionString(process.env.DATABASE_URL),
          ssl: { rejectUnauthorized: false },
      })
    : new Pool({
          host:     process.env.DB_HOST     || 'app-b577de97-4d36-493c-981c-d7faa5c293ee-do-user-27694528-0.d.db.ondigitalocean.com',
          port:     parseInt(process.env.DB_PORT || '25060', 10),
          user:     process.env.DB_USER     || 'onpointbackoffice',
          password: process.env.DB_PASSWORD,          // must be set via env var
          database: process.env.DB_NAME     || 'onpointbackoffice',
          ssl:      { rejectUnauthorized: false },
      });

// Log connection errors so they surface in the app logs rather than crashing
// silently.
pool.on('error', (err) => {
    console.error('PostgreSQL pool error:', err.message);
});

// ── Schema ────────────────────────────────────────────────────────────────────

// Every collection that server.js previously stored as a JSON file needs its
// own table.  The schema is intentionally minimal: the full JSON object lives
// in the `data` column so that no application-level schema migration is needed
// when new fields are added to a collection.
const TABLES = [
    'ideas',
    'onboarding_templates',
    'onboarding_processes',
    'employees',
    'training_templates',
    'training_assignments',
    'it_landscape',
    'it_assets',
    'employee_skills',
    'skill_categories',
    'crm_contacts',
    'crm_deals',
    'process_ownership',
    'partnerships',
    'meetings',
    'evaluations',
    'open_positions',
    'outlook',
    'users',
    'sessions',
];

async function initializeDatabase() {
    const client = await pool.connect();
    try {
        for (const table of TABLES) {
            await client.query(`
                CREATE TABLE IF NOT EXISTS ${table} (
                    id   TEXT PRIMARY KEY,
                    data JSONB NOT NULL
                )
            `);
        }
        console.log('Database tables verified / created.');
    } finally {
        client.release();
    }
}

// ── Collection helpers ────────────────────────────────────────────────────────

/** Throw if tableName is not in the known-good whitelist (prevents SQL injection). */
function assertValidTable(tableName) {
    if (!TABLES.includes(tableName)) {
        throw new Error(`Unknown collection: "${tableName}"`);
    }
}

/**
 * Return every item in a collection as a plain JS array (mirrors readJson).
 * Items are returned in insertion / id order; callers that care about a
 * specific order sort the array themselves (same behaviour as the old JSON
 * files).
 */
async function getCollection(tableName) {
    assertValidTable(tableName);
    const result = await pool.query(`SELECT data FROM ${tableName}`);
    return result.rows.map((r) => r.data);
}

/**
 * Atomically replace the full contents of a collection (mirrors writeJson).
 *
 * Algorithm:
 *   1. UPSERT every item in `items`.
 *   2. DELETE any row whose id is no longer present in `items`.
 *
 * Both operations run inside a single transaction so readers never see a
 * partial state.
 */
async function setCollection(tableName, items) {
    assertValidTable(tableName);
    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        if (items.length === 0) {
            await client.query(`DELETE FROM ${tableName}`);
        } else {
            const ids = items.map((i) => i.id);

            // Remove items that are no longer in the list.
            await client.query(
                `DELETE FROM ${tableName} WHERE id <> ALL($1::text[])`,
                [ids]
            );

            // Upsert every current item.
            for (const item of items) {
                await client.query(
                    `INSERT INTO ${tableName} (id, data)
                     VALUES ($1, $2)
                     ON CONFLICT (id) DO UPDATE SET data = EXCLUDED.data`,
                    [item.id, JSON.stringify(item)]
                );
            }
        }

        await client.query('COMMIT');
    } catch (err) {
        await client.query('ROLLBACK');
        throw err;
    } finally {
        client.release();
    }
}

/**
 * Execute a raw SQL query.  Exposed so that server.js can run one-off queries
 * (e.g. the health-check SELECT 1) without importing the pool directly.
 */
async function query(sql, params) {
    return pool.query(sql, params);
}

module.exports = { initializeDatabase, getCollection, setCollection, query, pool };
