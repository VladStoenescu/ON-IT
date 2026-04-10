module.exports = {
    apps: [
        {
            name: 'on-it',
            script: 'server.js',
            instances: 1,
            autorestart: true,
            watch: false,
            max_memory_restart: '256M',
            env_production: {
                NODE_ENV: 'production',
                PORT: 3000,
                // PostgreSQL connection — set DB_PASSWORD (and optionally DB_HOST,
                // DB_PORT, DB_USER, DB_NAME) in the server environment or via a
                // .env file before starting the application.
                // DB_HOST: 'app-b577de97-4d36-493c-981c-d7faa5c293ee-do-user-27694528-0.d.db.ondigitalocean.com',
                // DB_PORT: '25060',
                // DB_USER: 'onpointbackoffice',
                // DB_NAME: 'onpointbackoffice',
                // DB_PASSWORD: '',  // <-- set this securely
            },
            error_file: 'logs/err.log',
            out_file: 'logs/out.log',
            log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
        },
    ],
};
