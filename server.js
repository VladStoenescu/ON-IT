const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const db = require('./db');

const app = express();
app.set('trust proxy', 1);
const PORT = process.env.PORT || 3000;

const ALLOWED_SECTIONS = ['home', 'submit', 'view', 'onboarding', 'trainings', 'landscape', 'assets', 'skills', 'crm', 'pipeline', 'processes', 'partnerships', 'meetings', 'evaluations', 'open-positions', 'outlook', 'employment-certificates'];
const ADMIN_EMAIL = 'vlad.stoenescu@on-point.com';
const SESSION_DURATION_MS = 7 * 24 * 60 * 60 * 1000;

// Rate limiting configuration
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // Limit each IP to 100 requests per windowMs
    message: 'Too many requests from this IP, please try again later.'
});

const strictLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 20, // Limit each IP to 20 POST requests per windowMs
    message: 'Too many submissions from this IP, please try again later.'
});

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(express.static('public'));
app.use('/api/', limiter); // Apply rate limiting to all API routes

// Initialise DB tables and seed default data
(async () => {
    try {
        await db.initializeDatabase();
    } catch (e) {
        console.error('Fatal: could not initialise database:', e);
        process.exit(1);
    }

    // Seed default skill categories if none exist yet.
    try {
        const existing = await db.getCollection('skill_categories');
        if (existing.length === 0) {
            const defaultCategories = [
                { id: 'cat-001', name: 'Project Management', description: 'Planning, scheduling, and delivering projects', isCustom: false },
                { id: 'cat-002', name: 'Change & Release Management', description: 'Managing system changes, cutover, and release cycles', isCustom: false },
                { id: 'cat-003', name: 'Regulatory & Compliance', description: 'Regulatory reporting, compliance frameworks, and audit', isCustom: false },
                { id: 'cat-004', name: 'Integration & Architecture', description: 'System integration, APIs, middleware, and solution architecture', isCustom: false },
                { id: 'cat-005', name: 'Data & Analytics', description: 'Data modelling, BI, reporting, and analytics', isCustom: false },
                { id: 'cat-006', name: 'Leadership & Stakeholder Management', description: 'Team leadership, executive communication, and relationship management', isCustom: false },
                { id: 'cat-007', name: 'Agile & Lean', description: 'Scrum, Kanban, SAFe, and continuous-improvement practices', isCustom: false },
                { id: 'cat-008', name: 'Cloud & Infrastructure', description: 'Cloud platforms, infrastructure, and DevOps', isCustom: false },
                { id: 'cat-009', name: 'Business Analysis', description: 'Requirements gathering, process mapping, and gap analysis', isCustom: false },
                { id: 'cat-010', name: 'Finance & Accounting', description: 'Financial reporting, budgeting, and accounting practices', isCustom: false }
            ];
            await db.setCollection('skill_categories', defaultCategories);
        }
    } catch (e) {
        console.error('Error seeding skill categories:', e);
    }

    // Ensure admin user exists.
    try {
        const users = await db.getCollection('users');
        const adminIndex = users.findIndex(u => u.email === ADMIN_EMAIL);
        if (adminIndex === -1) {
            if (!process.env.ADMIN_PASSWORD) {
                console.warn('Warning: ADMIN_PASSWORD env var not set. Using default password for admin user.');
            }
            const passwordHash = bcrypt.hashSync(process.env.ADMIN_PASSWORD || 'Admin@2024!', 10);
            users.push({
                id: `user-${crypto.randomBytes(8).toString('hex')}`,
                email: ADMIN_EMAIL,
                name: 'Vlad Stoenescu',
                passwordHash,
                role: 'admin',
                permissions: [...ALLOWED_SECTIONS, 'admin'],
                createdAt: new Date().toISOString()
            });
        } else {
            users[adminIndex].role = 'admin';
            users[adminIndex].permissions = [...ALLOWED_SECTIONS, 'admin'];
        }
        await db.setCollection('users', users);
    } catch (e) {
        console.error('Error ensuring admin user:', e);
    }

    // Clean up expired sessions on startup.
    try {
        const sessions = await db.getCollection('sessions');
        const active = sessions.filter(s => new Date(s.expiresAt) > new Date());
        if (active.length !== sessions.length) {
            await db.setCollection('sessions', active);
        }
    } catch (e) {
        console.error('Error cleaning up sessions:', e);
    }
})();

// Helper utilities
function generateId() {
    return `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
}

function computeOverdueSteps(processes) {
    const now = new Date();
    return processes.map(proc => {
        if (proc.status !== 'in_progress') return proc;
        return {
            ...proc,
            steps: proc.steps.map(step => {
                if (step.status === 'pending' && new Date(step.dueDate) < now) {
                    return { ...step, status: 'overdue' };
                }
                return step;
            })
        };
    });
}

// ─── Auth Middleware ─────────────────────────────────────────────────────────

async function requireAuth(req, res, next) {
    const authHeader = req.headers['authorization'];
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'Authentication required' });
    }
    const token = authHeader.slice(7);
    const sessions = await db.getCollection('sessions');
    const session = sessions.find(s => s.token === token && new Date(s.expiresAt) > new Date());
    if (!session) {
        return res.status(401).json({ error: 'Session expired or invalid' });
    }
    const users = await db.getCollection('users');
    const user = users.find(u => u.id === session.userId);
    if (!user) {
        return res.status(401).json({ error: 'User not found' });
    }
    req.user = user;
    next();
}

function requireAdmin(req, res, next) {
    if (req.user.role !== 'admin') {
        return res.status(403).json({ error: 'Admin access required' });
    }
    next();
}

// ─── Auth Routes (no auth required) ─────────────────────────────────────────

app.post('/api/auth/register', strictLimiter, async (req, res) => {
    try {
        const { email, password, name } = req.body;
        if (!email || !email.endsWith('@on-point.com')) {
            return res.status(400).json({ error: 'Email must be an @on-point.com address' });
        }
        if (!password || password.length < 8) {
            return res.status(400).json({ error: 'Password must be at least 8 characters' });
        }
        if (!name || !name.trim()) {
            return res.status(400).json({ error: 'Name is required' });
        }
        const users = await db.getCollection('users');
        if (users.find(u => u.email === email)) {
            return res.status(400).json({ error: 'Email already registered' });
        }
        const passwordHash = await bcrypt.hash(password, 10);
        const newUser = {
            id: `user-${crypto.randomBytes(8).toString('hex')}`,
            email,
            name: name.trim(),
            passwordHash,
            role: 'user',
            permissions: [...ALLOWED_SECTIONS],
            createdAt: new Date().toISOString()
        };
        users.push(newUser);
        await db.setCollection('users', users);
        res.json({ message: 'Account created successfully' });
    } catch (error) {
        res.status(500).json({ error: 'Error creating account' });
    }
});

app.post('/api/auth/login', strictLimiter, async (req, res) => {
    try {
        const { email, password } = req.body;
        if (!email || !password) {
            return res.status(400).json({ error: 'Email and password required' });
        }
        const users = await db.getCollection('users');
        const user = users.find(u => u.email === email);
        if (!user) {
            return res.status(401).json({ error: 'Invalid email or password' });
        }
        const valid = await bcrypt.compare(password, user.passwordHash);
        if (!valid) {
            return res.status(401).json({ error: 'Invalid email or password' });
        }
        const token = crypto.randomBytes(32).toString('hex');
        const sessions = await db.getCollection('sessions');
        const now = new Date();
        const activeSessions = sessions.filter(s => new Date(s.expiresAt) > now);
        activeSessions.push({
            id: token,
            token,
            userId: user.id,
            createdAt: new Date().toISOString(),
            expiresAt: new Date(Date.now() + SESSION_DURATION_MS).toISOString()
        });
        await db.setCollection('sessions', activeSessions);
        res.json({
            token,
            user: {
                id: user.id,
                email: user.email,
                name: user.name,
                role: user.role,
                permissions: user.permissions,
                bio: user.bio || '',
                office: user.office || '',
                avatarUrl: user.avatarUrl || ''
            }
        });
    } catch (error) {
        res.status(500).json({ error: 'Error logging in' });
    }
});

app.post('/api/auth/logout', requireAuth, async (req, res) => {
    try {
        const token = req.headers['authorization'].slice(7);
        const sessions = await db.getCollection('sessions');
        const filtered = sessions.filter(s => s.token !== token);
        await db.setCollection('sessions', filtered);
        res.json({ message: 'Logged out' });
    } catch (error) {
        res.status(500).json({ error: 'Error logging out' });
    }
});

app.get('/api/auth/me', requireAuth, async (req, res) => {
    const u = req.user;
    res.json({
        id: u.id, email: u.email, name: u.name, role: u.role,
        permissions: u.permissions, bio: u.bio || '', office: u.office || '', avatarUrl: u.avatarUrl || ''
    });
});

app.put('/api/auth/profile', requireAuth, async (req, res) => {
    try {
        const { bio, office, avatarUrl } = req.body;
        const users = await db.getCollection('users');
        const userIndex = users.findIndex(u => u.id === req.user.id);
        if (userIndex === -1) return res.status(404).json({ error: 'User not found' });
        if (bio !== undefined) users[userIndex].bio = String(bio).trim().slice(0, 500);
        if (office !== undefined) users[userIndex].office = String(office).trim().slice(0, 100);
        if (avatarUrl !== undefined) {
            const urlStr = String(avatarUrl).trim();
            if (urlStr && !/^https?:\/\//.test(urlStr)) {
                return res.status(400).json({ error: 'Avatar URL must start with http:// or https://' });
            }
            users[userIndex].avatarUrl = urlStr.slice(0, 500);
        }
        await db.setCollection('users', users);
        const { passwordHash, ...updated } = users[userIndex];
        res.json(updated);
    } catch (error) {
        res.status(500).json({ error: 'Error updating profile' });
    }
});

app.put('/api/auth/change-password', requireAuth, strictLimiter, async (req, res) => {
    try {
        const { currentPassword, newPassword } = req.body;
        if (!currentPassword || !newPassword) {
            return res.status(400).json({ error: 'Current and new password required' });
        }
        if (newPassword.length < 8) {
            return res.status(400).json({ error: 'New password must be at least 8 characters' });
        }
        const users = await db.getCollection('users');
        const userIndex = users.findIndex(u => u.id === req.user.id);
        if (userIndex === -1) return res.status(404).json({ error: 'User not found' });
        const valid = await bcrypt.compare(currentPassword, users[userIndex].passwordHash);
        if (!valid) return res.status(400).json({ error: 'Current password is incorrect' });
        users[userIndex].passwordHash = await bcrypt.hash(newPassword, 10);
        await db.setCollection('users', users);
        res.json({ message: 'Password changed successfully' });
    } catch (error) {
        res.status(500).json({ error: 'Error changing password' });
    }
});

// ─── Admin Routes ─────────────────────────────────────────────────────────────

app.get('/api/admin/users', requireAuth, requireAdmin, async (req, res) => {
    try {
        const users = await db.getCollection('users');
        res.json(users.map(({ passwordHash, ...u }) => u));
    } catch (error) {
        res.status(500).json({ error: 'Error fetching users' });
    }
});

app.put('/api/admin/users/:id/permissions', requireAuth, requireAdmin, async (req, res) => {
    try {
        const { permissions } = req.body;
        if (!Array.isArray(permissions)) {
            return res.status(400).json({ error: 'Permissions must be an array' });
        }
        const users = await db.getCollection('users');
        const userIndex = users.findIndex(u => u.id === req.params.id);
        if (userIndex === -1) return res.status(404).json({ error: 'User not found' });
        if (users[userIndex].email === ADMIN_EMAIL) {
            return res.status(400).json({ error: 'Cannot modify admin permissions' });
        }
        const validPerms = permissions.filter(p => ALLOWED_SECTIONS.includes(p));
        users[userIndex].permissions = validPerms;
        await db.setCollection('users', users);
        const { passwordHash, ...updated } = users[userIndex];
        res.json(updated);
    } catch (error) {
        res.status(500).json({ error: 'Error updating permissions' });
    }
});

app.delete('/api/admin/users/:id', requireAuth, requireAdmin, async (req, res) => {
    try {
        const users = await db.getCollection('users');
        const user = users.find(u => u.id === req.params.id);
        if (!user) return res.status(404).json({ error: 'User not found' });
        if (user.email === ADMIN_EMAIL) return res.status(400).json({ error: 'Cannot delete admin user' });
        const filtered = users.filter(u => u.id !== req.params.id);
        await db.setCollection('users', filtered);
        const sessions = await db.getCollection('sessions');
        await db.setCollection('sessions', sessions.filter(s => s.userId !== req.params.id));
        res.json({ message: 'User deleted' });
    } catch (error) {
        res.status(500).json({ error: 'Error deleting user' });
    }
});

app.post('/api/admin/users/:id/reset-password', requireAuth, requireAdmin, async (req, res) => {
    try {
        const { newPassword } = req.body;
        if (!newPassword || newPassword.length < 8) {
            return res.status(400).json({ error: 'New password must be at least 8 characters' });
        }
        const users = await db.getCollection('users');
        const userIndex = users.findIndex(u => u.id === req.params.id);
        if (userIndex === -1) return res.status(404).json({ error: 'User not found' });
        if (users[userIndex].email === ADMIN_EMAIL) {
            return res.status(400).json({ error: 'Cannot reset admin password from this endpoint' });
        }
        users[userIndex].passwordHash = await bcrypt.hash(newPassword, 10);
        await db.setCollection('users', users);
        // Invalidate all existing sessions for the user
        const sessions = await db.getCollection('sessions');
        await db.setCollection('sessions', sessions.filter(s => s.userId !== req.params.id));
        res.json({ message: 'Password reset successfully' });
    } catch (error) {
        res.status(500).json({ error: 'Error resetting password' });
    }
});

// ─── Global Auth Middleware for all subsequent API routes ────────────────────
app.use('/api', (req, res, next) => {
    if (req.path.startsWith('/auth/')) return next();
    return requireAuth(req, res, next);
});

// Get all ideas
app.get('/api/ideas', async (req, res) => {
    try {
        const ideas = await db.getCollection('ideas');
        res.json(ideas);
    } catch (error) {
        res.status(500).json({ error: 'Error reading ideas' });
    }
});

// Submit a new idea
app.post('/api/ideas', requireAuth, strictLimiter, async (req, res) => {
    try {
        const { title, description, category, type } = req.body;

        // Validation
        if (!title || !description || !category || !type) {
            return res.status(400).json({ error: 'All fields are required' });
        }

        const ideas = await db.getCollection('ideas');
        
        const newIdea = {
            id: generateId(),
            title,
            description,
            category,
            type,
            submittedBy: req.user.name || req.user.email,
            submittedAt: new Date().toISOString(),
            status: 'Pending'
        };

        ideas.push(newIdea);
        await db.setCollection('ideas', ideas);

        res.status(201).json({ message: 'Idea submitted successfully', idea: newIdea });
    } catch (error) {
        res.status(500).json({ error: 'Error submitting idea' });
    }
});

// Get idea by ID
app.get('/api/ideas/:id', async (req, res) => {
    try {
        const ideas = await db.getCollection('ideas');
        const idea = ideas.find(i => i.id === req.params.id);
        
        if (!idea) {
            return res.status(404).json({ error: 'Idea not found' });
        }
        
        res.json(idea);
    } catch (error) {
        res.status(500).json({ error: 'Error reading idea' });
    }
});

// Update idea (admin: status; creator: title/description)
app.put('/api/ideas/:id', requireAuth, async (req, res) => {
    try {
        const ideas = await db.getCollection('ideas');
        const idx = ideas.findIndex(i => i.id === req.params.id);

        if (idx === -1) {
            return res.status(404).json({ error: 'Idea not found' });
        }

        const idea = ideas[idx];
        const isAdmin = req.user.role === 'admin';
        const creatorName = req.user.name || req.user.email;
        const isCreator = idea.submittedBy === creatorName;

        if (!isAdmin && !isCreator) {
            return res.status(403).json({ error: 'Not authorized to update this idea' });
        }

        if (isAdmin && req.body.status !== undefined) {
            const allowed = ['Pending', 'Prioritized', 'Implemented'];
            if (!allowed.includes(req.body.status)) {
                return res.status(400).json({ error: 'Invalid status value' });
            }
            idea.status = req.body.status;
        }

        if (isCreator) {
            if (req.body.title !== undefined) {
                if (!req.body.title.trim()) return res.status(400).json({ error: 'Title cannot be empty' });
                idea.title = req.body.title.trim();
            }
            if (req.body.description !== undefined) {
                if (!req.body.description.trim()) return res.status(400).json({ error: 'Description cannot be empty' });
                idea.description = req.body.description.trim();
            }
        }

        ideas[idx] = idea;
        await db.setCollection('ideas', ideas);
        res.json(idea);
    } catch (error) {
        res.status(500).json({ error: 'Error updating idea' });
    }
});

// Add comment to idea (creator only)
app.post('/api/ideas/:id/comments', requireAuth, async (req, res) => {
    try {
        const { text } = req.body;
        if (!text || !text.trim()) {
            return res.status(400).json({ error: 'Comment text is required' });
        }

        const ideas = await db.getCollection('ideas');
        const idx = ideas.findIndex(i => i.id === req.params.id);

        if (idx === -1) {
            return res.status(404).json({ error: 'Idea not found' });
        }

        const idea = ideas[idx];
        const creatorName = req.user.name || req.user.email;
        if (idea.submittedBy !== creatorName) {
            return res.status(403).json({ error: 'Only the idea creator can add comments' });
        }

        if (!idea.comments) idea.comments = [];
        const comment = {
            id: generateId(),
            text: text.trim(),
            author: creatorName,
            createdAt: new Date().toISOString()
        };
        idea.comments.push(comment);

        ideas[idx] = idea;
        await db.setCollection('ideas', ideas);
        res.status(201).json(comment);
    } catch (error) {
        res.status(500).json({ error: 'Error adding comment' });
    }
});

// Delete comment from idea (creator only)
app.delete('/api/ideas/:id/comments/:commentId', requireAuth, async (req, res) => {
    try {
        const ideas = await db.getCollection('ideas');
        const idx = ideas.findIndex(i => i.id === req.params.id);

        if (idx === -1) {
            return res.status(404).json({ error: 'Idea not found' });
        }

        const idea = ideas[idx];
        const creatorName = req.user.name || req.user.email;
        if (idea.submittedBy !== creatorName) {
            return res.status(403).json({ error: 'Only the idea creator can delete comments' });
        }

        if (!idea.comments) {
            return res.status(404).json({ error: 'Comment not found' });
        }
        const commentIdx = idea.comments.findIndex(c => c.id === req.params.commentId);
        if (commentIdx === -1) {
            return res.status(404).json({ error: 'Comment not found' });
        }

        idea.comments.splice(commentIdx, 1);
        ideas[idx] = idea;
        await db.setCollection('ideas', ideas);
        res.json({ message: 'Comment deleted' });
    } catch (error) {
        res.status(500).json({ error: 'Error deleting comment' });
    }
});

// ─── Onboarding Templates API ────────────────────────────────────────────────

app.get('/api/onboarding/templates', async (req, res) => {
    try {
        const templates = await db.getCollection('onboarding_templates');
        res.json(templates);
    } catch (error) {
        res.status(500).json({ error: 'Error reading templates' });
    }
});

app.post('/api/onboarding/templates', strictLimiter, async (req, res) => {
    try {
        const { name, type, entities, description, steps } = req.body;
        if (!name || !type || !entities || !Array.isArray(steps) || steps.length === 0) {
            return res.status(400).json({ error: 'Name, type, entities and at least one step are required' });
        }
        const templates = await db.getCollection('onboarding_templates');
        const newTemplate = {
            id: generateId(),
            name,
            type,
            entities: Array.isArray(entities) ? entities : [entities],
            description: description || '',
            steps: steps.map((step, index) => ({
                id: generateId(),
                order: index + 1,
                name: step.name,
                description: step.description || '',
                owner: step.owner,
                ownerEmail: step.ownerEmail || '',
                dueDaysOffset: parseInt(step.dueDaysOffset, 10) || 1
            })),
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };
        templates.push(newTemplate);
        await db.setCollection('onboarding_templates', templates);
        res.status(201).json(newTemplate);
    } catch (error) {
        res.status(500).json({ error: 'Error creating template' });
    }
});

app.get('/api/onboarding/templates/:id', async (req, res) => {
    try {
        const templates = await db.getCollection('onboarding_templates');
        const template = templates.find(t => t.id === req.params.id);
        if (!template) return res.status(404).json({ error: 'Template not found' });
        res.json(template);
    } catch (error) {
        res.status(500).json({ error: 'Error reading template' });
    }
});

app.put('/api/onboarding/templates/:id', strictLimiter, async (req, res) => {
    try {
        const templates = await db.getCollection('onboarding_templates');
        const idx = templates.findIndex(t => t.id === req.params.id);
        if (idx === -1) return res.status(404).json({ error: 'Template not found' });
        const { name, type, entities, description, steps } = req.body;
        templates[idx] = {
            ...templates[idx],
            name: name || templates[idx].name,
            type: type || templates[idx].type,
            entities: entities ? (Array.isArray(entities) ? entities : [entities]) : templates[idx].entities,
            description: description !== undefined ? description : templates[idx].description,
            steps: steps ? steps.map((step, i) => ({
                id: step.id || generateId(),
                order: i + 1,
                name: step.name,
                description: step.description || '',
                owner: step.owner,
                ownerEmail: step.ownerEmail || '',
                dueDaysOffset: parseInt(step.dueDaysOffset, 10) || 1
            })) : templates[idx].steps,
            updatedAt: new Date().toISOString()
        };
        await db.setCollection('onboarding_templates', templates);
        res.json(templates[idx]);
    } catch (error) {
        res.status(500).json({ error: 'Error updating template' });
    }
});

app.delete('/api/onboarding/templates/:id', strictLimiter, async (req, res) => {
    try {
        const templates = await db.getCollection('onboarding_templates');
        const idx = templates.findIndex(t => t.id === req.params.id);
        if (idx === -1) return res.status(404).json({ error: 'Template not found' });
        templates.splice(idx, 1);
        await db.setCollection('onboarding_templates', templates);
        res.json({ message: 'Template deleted' });
    } catch (error) {
        res.status(500).json({ error: 'Error deleting template' });
    }
});

// ─── Onboarding Processes API ─────────────────────────────────────────────────

app.get('/api/onboarding/processes', async (req, res) => {
    try {
        const processes = await db.getCollection('onboarding_processes');
        res.json(computeOverdueSteps(processes));
    } catch (error) {
        res.status(500).json({ error: 'Error reading processes' });
    }
});

app.post('/api/onboarding/processes', strictLimiter, async (req, res) => {
    try {
        const { templateId, employeeName, employeeEmail, employeeRole, entity, startDate } = req.body;
        if (!templateId || !employeeName || !entity || !startDate) {
            return res.status(400).json({ error: 'Template, employee name, entity and start date are required' });
        }
        const templates = await db.getCollection('onboarding_templates');
        const template = templates.find(t => t.id === templateId);
        if (!template) return res.status(404).json({ error: 'Template not found' });

        const processes = await db.getCollection('onboarding_processes');
        const start = new Date(startDate);

        const steps = template.steps.map(step => {
            const due = new Date(start);
            due.setDate(due.getDate() + step.dueDaysOffset);
            return {
                id: generateId(),
                templateStepId: step.id,
                order: step.order,
                name: step.name,
                description: step.description,
                owner: step.owner,
                ownerEmail: step.ownerEmail,
                dueDate: due.toISOString().split('T')[0],
                status: 'pending',
                completedAt: null,
                notes: ''
            };
        });

        const emailsSent = steps
            .filter(s => s.ownerEmail)
            .map(s => {
                const entry = {
                    to: s.ownerEmail,
                    subject: `New ${template.type} task assigned: ${s.name} for ${employeeName}`,
                    body: `You have been assigned the task "${s.name}" as part of the ${template.type} process for ${employeeName} (${entity}). Due date: ${s.dueDate}.`,
                    sentAt: new Date().toISOString()
                };
                console.log(`[EMAIL] To: ${entry.to} | Subject: ${entry.subject}`);
                return entry;
            });

        const newProcess = {
            id: generateId(),
            templateId,
            templateName: template.name,
            type: template.type,
            employeeName,
            employeeEmail: employeeEmail || '',
            employeeRole: employeeRole || '',
            entity,
            startDate,
            status: 'in_progress',
            steps,
            emailsSent,
            createdAt: new Date().toISOString(),
            completedAt: null
        };

        processes.push(newProcess);
        await db.setCollection('onboarding_processes', processes);
        res.status(201).json(newProcess);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error creating process' });
    }
});

app.get('/api/onboarding/processes/:id', async (req, res) => {
    try {
        const processes = await db.getCollection('onboarding_processes');
        const proc = processes.find(p => p.id === req.params.id);
        if (!proc) return res.status(404).json({ error: 'Process not found' });
        res.json(proc);
    } catch (error) {
        res.status(500).json({ error: 'Error reading process' });
    }
});

app.put('/api/onboarding/processes/:id', strictLimiter, async (req, res) => {
    try {
        const processes = await db.getCollection('onboarding_processes');
        const idx = processes.findIndex(p => p.id === req.params.id);
        if (idx === -1) return res.status(404).json({ error: 'Process not found' });
        const { status } = req.body;
        if (status) {
            processes[idx].status = status;
            if (status === 'completed' || status === 'cancelled') {
                processes[idx].completedAt = new Date().toISOString();
            }
        }
        await db.setCollection('onboarding_processes', processes);
        res.json(processes[idx]);
    } catch (error) {
        res.status(500).json({ error: 'Error updating process' });
    }
});

app.put('/api/onboarding/processes/:id/steps/:stepId', strictLimiter, async (req, res) => {
    try {
        const processes = await db.getCollection('onboarding_processes');
        const procIdx = processes.findIndex(p => p.id === req.params.id);
        if (procIdx === -1) return res.status(404).json({ error: 'Process not found' });
        const stepIdx = processes[procIdx].steps.findIndex(s => s.id === req.params.stepId);
        if (stepIdx === -1) return res.status(404).json({ error: 'Step not found' });

        const { status, notes } = req.body;
        const step = processes[procIdx].steps[stepIdx];
        if (status) step.status = status;
        if (notes !== undefined) step.notes = notes;
        if (status === 'completed' && !step.completedAt) {
            step.completedAt = new Date().toISOString();
        }

        const allDone = processes[procIdx].steps.every(s => s.status === 'completed');
        if (allDone) {
            processes[procIdx].status = 'completed';
            processes[procIdx].completedAt = new Date().toISOString();
        }

        await db.setCollection('onboarding_processes', processes);
        res.json(processes[procIdx]);
    } catch (error) {
        res.status(500).json({ error: 'Error updating step' });
    }
});

// ─── KPIs API ─────────────────────────────────────────────────────────────────

app.get('/api/onboarding/kpis', async (req, res) => {
    try {
        const processes = await db.getCollection('onboarding_processes');
        const now = new Date();

        const totalProcesses = processes.length;
        const activeProcesses = processes.filter(p => p.status === 'in_progress').length;
        const completedProcesses = processes.filter(p => p.status === 'completed').length;

        const completedWithDates = processes.filter(p => p.status === 'completed' && p.completedAt && p.startDate);
        const avgCompletionDays = completedWithDates.length > 0
            ? completedWithDates.reduce((sum, p) => {
                const days = Math.ceil((new Date(p.completedAt) - new Date(p.startDate)) / 86400000);
                return sum + days;
            }, 0) / completedWithDates.length
            : 0;

        const allSteps = processes.flatMap(p => p.steps);
        const overdueSteps = allSteps.filter(s => s.status !== 'completed' && new Date(s.dueDate) < now).length;
        const completedLateSteps = allSteps.filter(s =>
            s.status === 'completed' && s.completedAt && new Date(s.completedAt) > new Date(s.dueDate)
        ).length;
        const totalCompletedSteps = allSteps.filter(s => s.status === 'completed').length;

        const byEntity = {};
        processes.forEach(p => {
            if (!byEntity[p.entity]) byEntity[p.entity] = { active: 0, completed: 0, cancelled: 0 };
            if (p.status === 'in_progress') byEntity[p.entity].active++;
            else if (p.status === 'completed') byEntity[p.entity].completed++;
            else if (p.status === 'cancelled') byEntity[p.entity].cancelled++;
        });

        const onboardingCount = processes.filter(p => p.type === 'onboarding').length;
        const offboardingCount = processes.filter(p => p.type === 'offboarding').length;
        const completionRate = totalProcesses > 0 ? Math.round((completedProcesses / totalProcesses) * 100) : 0;

        const recentProcesses = [...processes]
            .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
            .slice(0, 5)
            .map(p => ({
                id: p.id,
                employeeName: p.employeeName,
                type: p.type,
                entity: p.entity,
                status: p.status,
                startDate: p.startDate,
                progress: p.steps.length > 0
                    ? Math.round((p.steps.filter(s => s.status === 'completed').length / p.steps.length) * 100)
                    : 0
            }));

        res.json({
            totalProcesses,
            activeProcesses,
            completedProcesses,
            avgCompletionDays: Math.round(avgCompletionDays * 10) / 10,
            overdueSteps,
            completedLateSteps,
            totalCompletedSteps,
            completionRate,
            byEntity,
            onboardingCount,
            offboardingCount,
            recentProcesses
        });
    } catch (error) {
        res.status(500).json({ error: 'Error computing KPIs' });
    }
});

// ─── Employees API ────────────────────────────────────────────────────────────

app.get('/api/employees', async (req, res) => {
    try {
        const employees = await db.getCollection('employees');
        res.json(employees);
    } catch (error) {
        res.status(500).json({ error: 'Error reading employees' });
    }
});

app.post('/api/employees', strictLimiter, async (req, res) => {
    try {
        const { name, email, role, department, entity, lineManagerEmail } = req.body;
        if (!name || !email) {
            return res.status(400).json({ error: 'Name and email are required' });
        }
        const employees = await db.getCollection('employees');
        if (employees.some(e => e.email === email)) {
            return res.status(400).json({ error: 'An employee with this email already exists' });
        }
        const newEmployee = {
            id: generateId(),
            name,
            email,
            role: role || '',
            department: department || '',
            entity: entity || '',
            lineManagerEmail: lineManagerEmail || '',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };
        employees.push(newEmployee);
        await db.setCollection('employees', employees);
        res.status(201).json(newEmployee);
    } catch (error) {
        res.status(500).json({ error: 'Error creating employee' });
    }
});

app.put('/api/employees/:id', strictLimiter, async (req, res) => {
    try {
        const employees = await db.getCollection('employees');
        const idx = employees.findIndex(e => e.id === req.params.id);
        if (idx === -1) return res.status(404).json({ error: 'Employee not found' });
        const { name, email, role, department, entity, lineManagerEmail } = req.body;
        if (email && email !== employees[idx].email && employees.some(e => e.email === email && e.id !== req.params.id)) {
            return res.status(400).json({ error: 'An employee with this email already exists' });
        }
        employees[idx] = {
            ...employees[idx],
            name: name || employees[idx].name,
            email: email || employees[idx].email,
            role: role !== undefined ? role : employees[idx].role,
            department: department !== undefined ? department : employees[idx].department,
            entity: entity !== undefined ? entity : employees[idx].entity,
            lineManagerEmail: lineManagerEmail !== undefined ? lineManagerEmail : employees[idx].lineManagerEmail,
            updatedAt: new Date().toISOString()
        };
        await db.setCollection('employees', employees);
        res.json(employees[idx]);
    } catch (error) {
        res.status(500).json({ error: 'Error updating employee' });
    }
});

app.delete('/api/employees/:id', strictLimiter, async (req, res) => {
    try {
        const employees = await db.getCollection('employees');
        const idx = employees.findIndex(e => e.id === req.params.id);
        if (idx === -1) return res.status(404).json({ error: 'Employee not found' });
        employees.splice(idx, 1);
        await db.setCollection('employees', employees);
        res.json({ message: 'Employee deleted' });
    } catch (error) {
        res.status(500).json({ error: 'Error deleting employee' });
    }
});

// ─── Training Templates API ───────────────────────────────────────────────────

app.get('/api/trainings/templates', async (req, res) => {
    try {
        const templates = await db.getCollection('training_templates');
        res.json(templates);
    } catch (error) {
        res.status(500).json({ error: 'Error reading training templates' });
    }
});

app.post('/api/trainings/templates', strictLimiter, async (req, res) => {
    try {
        const { title, description, dueDays, reminderDays, sections } = req.body;
        if (!title || !Array.isArray(sections) || sections.length === 0) {
            return res.status(400).json({ error: 'Title and at least one section are required' });
        }
        const templates = await db.getCollection('training_templates');
        const newTemplate = {
            id: generateId(),
            title,
            description: description || '',
            dueDays: parseInt(dueDays, 10) || 7,
            reminderDays: Array.isArray(reminderDays) ? reminderDays.map(Number) : [3, 1],
            sections: sections.map((sec, i) => ({
                id: generateId(),
                order: i + 1,
                type: sec.type,
                content: sec.content || '',
                imageUrl: sec.imageUrl || '',
                caption: sec.caption || '',
                question: sec.question || '',
                options: Array.isArray(sec.options) ? sec.options : [],
                correctAnswer: typeof sec.correctAnswer === 'number' ? sec.correctAnswer : 0
            })),
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };
        templates.push(newTemplate);
        await db.setCollection('training_templates', templates);
        res.status(201).json(newTemplate);
    } catch (error) {
        res.status(500).json({ error: 'Error creating training template' });
    }
});

app.get('/api/trainings/templates/:id', async (req, res) => {
    try {
        const templates = await db.getCollection('training_templates');
        const template = templates.find(t => t.id === req.params.id);
        if (!template) return res.status(404).json({ error: 'Training template not found' });
        res.json(template);
    } catch (error) {
        res.status(500).json({ error: 'Error reading training template' });
    }
});

app.put('/api/trainings/templates/:id', strictLimiter, async (req, res) => {
    try {
        const templates = await db.getCollection('training_templates');
        const idx = templates.findIndex(t => t.id === req.params.id);
        if (idx === -1) return res.status(404).json({ error: 'Training template not found' });
        const { title, description, dueDays, reminderDays, sections } = req.body;
        templates[idx] = {
            ...templates[idx],
            title: title || templates[idx].title,
            description: description !== undefined ? description : templates[idx].description,
            dueDays: dueDays !== undefined ? parseInt(dueDays, 10) : templates[idx].dueDays,
            reminderDays: Array.isArray(reminderDays) ? reminderDays.map(Number) : templates[idx].reminderDays,
            sections: sections ? sections.map((sec, i) => ({
                id: sec.id || generateId(),
                order: i + 1,
                type: sec.type,
                content: sec.content || '',
                imageUrl: sec.imageUrl || '',
                caption: sec.caption || '',
                question: sec.question || '',
                options: Array.isArray(sec.options) ? sec.options : [],
                correctAnswer: typeof sec.correctAnswer === 'number' ? sec.correctAnswer : 0
            })) : templates[idx].sections,
            updatedAt: new Date().toISOString()
        };
        await db.setCollection('training_templates', templates);
        res.json(templates[idx]);
    } catch (error) {
        res.status(500).json({ error: 'Error updating training template' });
    }
});

app.delete('/api/trainings/templates/:id', strictLimiter, async (req, res) => {
    try {
        const templates = await db.getCollection('training_templates');
        const idx = templates.findIndex(t => t.id === req.params.id);
        if (idx === -1) return res.status(404).json({ error: 'Training template not found' });
        templates.splice(idx, 1);
        await db.setCollection('training_templates', templates);
        res.json({ message: 'Training template deleted' });
    } catch (error) {
        res.status(500).json({ error: 'Error deleting training template' });
    }
});

// ─── Training Assignments API ─────────────────────────────────────────────────

function computeOverdueAssignments(assignments) {
    const now = new Date();
    return assignments.map(a => {
        if (a.status === 'not_started' || a.status === 'in_progress') {
            if (new Date(a.dueDate) < now) {
                return { ...a, status: 'overdue' };
            }
        }
        return a;
    });
}

app.get('/api/trainings/assignments', async (req, res) => {
    try {
        const assignments = await db.getCollection('training_assignments');
        res.json(computeOverdueAssignments(assignments));
    } catch (error) {
        res.status(500).json({ error: 'Error reading assignments' });
    }
});

app.post('/api/trainings/assignments', strictLimiter, async (req, res) => {
    try {
        const { trainingId, employeeIds } = req.body;
        if (!trainingId || !Array.isArray(employeeIds) || employeeIds.length === 0) {
            return res.status(400).json({ error: 'Training and at least one employee are required' });
        }
        const templates = await db.getCollection('training_templates');
        const training = templates.find(t => t.id === trainingId);
        if (!training) return res.status(404).json({ error: 'Training template not found' });

        const employees = await db.getCollection('employees');
        const assignments = await db.getCollection('training_assignments');
        const now = new Date();
        const newAssignments = [];

        for (const empId of employeeIds) {
            const employee = employees.find(e => e.id === empId);
            if (!employee) continue;
            // Skip if already assigned and not yet completed (covers not_started, in_progress, and overdue)
            if (assignments.some(a => a.trainingId === trainingId && a.employeeId === empId &&
                    ['not_started', 'in_progress', 'overdue'].includes(a.status))) {
                continue;
            }
            const dueDate = new Date(now);
            dueDate.setDate(dueDate.getDate() + training.dueDays);

            const assignment = {
                id: generateId(),
                trainingId,
                trainingTitle: training.title,
                employeeId: empId,
                employeeName: employee.name,
                employeeEmail: employee.email,
                lineManagerEmail: employee.lineManagerEmail || '',
                assignedAt: now.toISOString(),
                dueDate: dueDate.toISOString().split('T')[0],
                status: 'not_started',
                score: null,
                completedAt: null,
                quizAnswers: {},
                remindersSent: []
            };

            if (employee.email) {
                const emailEntry = {
                    to: employee.email,
                    subject: `Training assigned: ${training.title}`,
                    body: `You have been assigned the training "${training.title}". Please complete it by ${assignment.dueDate}.`,
                    sentAt: now.toISOString()
                };
                console.log(`[EMAIL] To: ${emailEntry.to} | Subject: ${emailEntry.subject}`);
                assignment.remindersSent.push(emailEntry);
            }

            assignments.push(assignment);
            newAssignments.push(assignment);
        }

        await db.setCollection('training_assignments', assignments);
        res.status(201).json(newAssignments);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error creating assignments' });
    }
});

app.get('/api/trainings/assignments/:id', async (req, res) => {
    try {
        const assignments = await db.getCollection('training_assignments');
        const assignment = assignments.find(a => a.id === req.params.id);
        if (!assignment) return res.status(404).json({ error: 'Assignment not found' });
        res.json(assignment);
    } catch (error) {
        res.status(500).json({ error: 'Error reading assignment' });
    }
});

app.put('/api/trainings/assignments/:id', strictLimiter, async (req, res) => {
    try {
        const assignments = await db.getCollection('training_assignments');
        const idx = assignments.findIndex(a => a.id === req.params.id);
        if (idx === -1) return res.status(404).json({ error: 'Assignment not found' });

        const { status, quizAnswers } = req.body;
        const assignment = assignments[idx];

        if (status) assignment.status = status;

        if (quizAnswers !== undefined) {
            assignment.quizAnswers = quizAnswers;
            // Calculate score if quiz answers provided
            const templates = await db.getCollection('training_templates');
            const training = templates.find(t => t.id === assignment.trainingId);
            if (training) {
                const quizSections = training.sections.filter(s => s.type === 'quiz');
                if (quizSections.length > 0) {
                    const correct = quizSections.filter(s => quizAnswers[s.id] === s.correctAnswer).length;
                    assignment.score = Math.round((correct / quizSections.length) * 100);
                }
            }
        }

        if (status === 'completed' && !assignment.completedAt) {
            assignment.completedAt = new Date().toISOString();
        }

        if (status === 'in_progress' && !assignment.startedAt) {
            assignment.startedAt = new Date().toISOString();
        }

        await db.setCollection('training_assignments', assignments);
        res.json(assignments[idx]);
    } catch (error) {
        res.status(500).json({ error: 'Error updating assignment' });
    }
});

// ─── Training KPIs API ────────────────────────────────────────────────────────

app.get('/api/trainings/kpis', async (req, res) => {
    try {
        const assignments = computeOverdueAssignments(await db.getCollection('training_assignments'));
        const employees = await db.getCollection('employees');
        const templates = await db.getCollection('training_templates');

        const total = assignments.length;
        const notStarted = assignments.filter(a => a.status === 'not_started').length;
        const inProgress = assignments.filter(a => a.status === 'in_progress').length;
        const completed = assignments.filter(a => a.status === 'completed').length;
        const overdue = assignments.filter(a => a.status === 'overdue').length;

        const completedWithScore = assignments.filter(a => a.status === 'completed' && a.score !== null);
        const avgScore = completedWithScore.length > 0
            ? Math.round(completedWithScore.reduce((sum, a) => sum + a.score, 0) / completedWithScore.length)
            : null;

        const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0;

        const byTraining = {};
        assignments.forEach(a => {
            if (!byTraining[a.trainingTitle]) {
                byTraining[a.trainingTitle] = { total: 0, completed: 0, overdue: 0, avgScore: null, scores: [] };
            }
            byTraining[a.trainingTitle].total++;
            if (a.status === 'completed') {
                byTraining[a.trainingTitle].completed++;
                if (a.score !== null) byTraining[a.trainingTitle].scores.push(a.score);
            }
            if (a.status === 'overdue') byTraining[a.trainingTitle].overdue++;
        });
        Object.values(byTraining).forEach(t => {
            t.avgScore = t.scores.length > 0 ? Math.round(t.scores.reduce((s, v) => s + v, 0) / t.scores.length) : null;
            delete t.scores;
        });

        const recentAssignments = [...assignments]
            .sort((a, b) => new Date(b.assignedAt) - new Date(a.assignedAt))
            .slice(0, 5)
            .map(a => ({
                id: a.id,
                employeeName: a.employeeName,
                trainingTitle: a.trainingTitle,
                status: a.status,
                score: a.score,
                dueDate: a.dueDate
            }));

        res.json({
            total,
            notStarted,
            inProgress,
            completed,
            overdue,
            avgScore,
            completionRate,
            byTraining,
            totalEmployees: employees.length,
            totalTrainings: templates.length,
            recentAssignments
        });
    } catch (error) {
        res.status(500).json({ error: 'Error computing training KPIs' });
    }
});

// ─── IT Landscape API ─────────────────────────────────────────────────────────

const IT_DEPARTMENTS = ['HR', 'Finance', 'Backoffice', 'Cybersecurity', 'Marketing', 'Sales', 'IT', 'Legal', 'Operations', 'Product', 'Other'];
const IT_CATEGORIES = ['SaaS', 'License', 'Hardware', 'Service', 'Subscription', 'Other'];
const IT_BILLING_CYCLES = ['monthly', 'annual', 'one-time'];
const IT_CURRENCIES = ['EUR', 'USD', 'GBP', 'CHF'];
const IT_STATUSES = ['active', 'inactive', 'under-review'];

app.get('/api/it-landscape', async (req, res) => {
    try {
        const tools = await db.getCollection('it_landscape');
        res.json(tools);
    } catch (error) {
        res.status(500).json({ error: 'Error reading IT landscape' });
    }
});

app.post('/api/it-landscape', strictLimiter, async (req, res) => {
    try {
        const { name, vendor, description, department, category, cost, currency, billingCycle, contractStart, contractEnd, status, notes } = req.body;
        if (!name || !department) {
            return res.status(400).json({ error: 'Name and department are required' });
        }
        if (!IT_DEPARTMENTS.includes(department)) {
            return res.status(400).json({ error: 'Invalid department' });
        }
        if (category && !IT_CATEGORIES.includes(category)) {
            return res.status(400).json({ error: 'Invalid category' });
        }
        if (billingCycle && !IT_BILLING_CYCLES.includes(billingCycle)) {
            return res.status(400).json({ error: 'Invalid billing cycle' });
        }
        if (currency && !IT_CURRENCIES.includes(currency)) {
            return res.status(400).json({ error: 'Invalid currency' });
        }
        if (status && !IT_STATUSES.includes(status)) {
            return res.status(400).json({ error: 'Invalid status' });
        }
        const costValue = cost !== undefined && cost !== '' ? parseFloat(cost) : null;
        if (costValue !== null && (isNaN(costValue) || costValue < 0)) {
            return res.status(400).json({ error: 'Cost must be a non-negative number' });
        }
        const tools = await db.getCollection('it_landscape');
        const newTool = {
            id: generateId(),
            name: name.trim(),
            vendor: vendor ? vendor.trim() : '',
            description: description ? description.trim() : '',
            department,
            category: category || 'Other',
            cost: costValue,
            currency: currency || 'EUR',
            billingCycle: billingCycle || 'monthly',
            contractStart: contractStart || null,
            contractEnd: contractEnd || null,
            status: status || 'active',
            notes: notes ? notes.trim() : '',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };
        tools.push(newTool);
        await db.setCollection('it_landscape', tools);
        res.status(201).json(newTool);
    } catch (error) {
        res.status(500).json({ error: 'Error creating IT tool' });
    }
});

app.put('/api/it-landscape/:id', strictLimiter, async (req, res) => {
    try {
        const tools = await db.getCollection('it_landscape');
        const idx = tools.findIndex(t => t.id === req.params.id);
        if (idx === -1) return res.status(404).json({ error: 'IT tool not found' });
        const { name, vendor, description, department, category, cost, currency, billingCycle, contractStart, contractEnd, status, notes } = req.body;
        if (department && !IT_DEPARTMENTS.includes(department)) {
            return res.status(400).json({ error: 'Invalid department' });
        }
        if (category && !IT_CATEGORIES.includes(category)) {
            return res.status(400).json({ error: 'Invalid category' });
        }
        if (billingCycle && !IT_BILLING_CYCLES.includes(billingCycle)) {
            return res.status(400).json({ error: 'Invalid billing cycle' });
        }
        if (currency && !IT_CURRENCIES.includes(currency)) {
            return res.status(400).json({ error: 'Invalid currency' });
        }
        if (status && !IT_STATUSES.includes(status)) {
            return res.status(400).json({ error: 'Invalid status' });
        }
        const costValue = cost !== undefined && cost !== '' ? parseFloat(cost) : tools[idx].cost;
        if (costValue !== null && costValue !== undefined && (isNaN(costValue) || costValue < 0)) {
            return res.status(400).json({ error: 'Cost must be a non-negative number' });
        }
        tools[idx] = {
            ...tools[idx],
            name: name ? name.trim() : tools[idx].name,
            vendor: vendor !== undefined ? vendor.trim() : tools[idx].vendor,
            description: description !== undefined ? description.trim() : tools[idx].description,
            department: department || tools[idx].department,
            category: category || tools[idx].category,
            cost: cost !== undefined && cost !== '' ? costValue : tools[idx].cost,
            currency: currency || tools[idx].currency,
            billingCycle: billingCycle || tools[idx].billingCycle,
            contractStart: contractStart !== undefined ? (contractStart || null) : tools[idx].contractStart,
            contractEnd: contractEnd !== undefined ? (contractEnd || null) : tools[idx].contractEnd,
            status: status || tools[idx].status,
            notes: notes !== undefined ? notes.trim() : tools[idx].notes,
            updatedAt: new Date().toISOString()
        };
        await db.setCollection('it_landscape', tools);
        res.json(tools[idx]);
    } catch (error) {
        res.status(500).json({ error: 'Error updating IT tool' });
    }
});

app.delete('/api/it-landscape/:id', strictLimiter, async (req, res) => {
    try {
        const tools = await db.getCollection('it_landscape');
        const idx = tools.findIndex(t => t.id === req.params.id);
        if (idx === -1) return res.status(404).json({ error: 'IT tool not found' });
        tools.splice(idx, 1);
        await db.setCollection('it_landscape', tools);
        res.json({ message: 'IT tool deleted' });
    } catch (error) {
        res.status(500).json({ error: 'Error deleting IT tool' });
    }
});

// ─── IT Asset Inventory API ───────────────────────────────────────────────────

const ASSET_TYPES = ['Laptop', 'Desktop', 'Monitor', 'Phone', 'Tablet', 'Printer', 'Server', 'Network Equipment', 'Peripheral', 'Other'];
const ASSET_STATUSES = ['in-use', 'available', 'maintenance', 'retired', 'lost'];
const ASSET_CONDITIONS = ['excellent', 'good', 'fair', 'poor'];
const ASSET_CURRENCIES = ['EUR', 'USD', 'GBP', 'CHF'];

// More-specific route defined first to avoid /:id matching 'kpis'
app.get('/api/it-assets/kpis', async (req, res) => {
    try {
        const assets = await db.getCollection('it_assets');
        const now = new Date();
        const in30Days = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

        const totalAssets = assets.length;
        const inUse = assets.filter(a => a.status === 'in-use').length;
        const available = assets.filter(a => a.status === 'available').length;
        const maintenance = assets.filter(a => a.status === 'maintenance').length;
        const retired = assets.filter(a => a.status === 'retired').length;

        const totalValue = assets.reduce((sum, a) => sum + (a.purchasePrice || 0), 0);

        const warrantyExpiringSoon = assets.filter(a => {
            if (!a.warrantyExpiry) return false;
            const exp = new Date(a.warrantyExpiry);
            return exp >= now && exp <= in30Days;
        }).length;

        const warrantyExpired = assets.filter(a => {
            if (!a.warrantyExpiry) return false;
            return new Date(a.warrantyExpiry) < now;
        }).length;

        // Average asset age in months
        const assetsWithPurchaseDate = assets.filter(a => a.purchaseDate);
        const avgAgeMonths = assetsWithPurchaseDate.length > 0
            ? Math.round(assetsWithPurchaseDate.reduce((sum, a) => {
                const months = (now - new Date(a.purchaseDate)) / (1000 * 60 * 60 * 24 * 30.44);
                return sum + months;
            }, 0) / assetsWithPurchaseDate.length)
            : null;

        // By type breakdown
        const byType = {};
        assets.forEach(a => {
            byType[a.type] = (byType[a.type] || 0) + 1;
        });

        // By department breakdown
        const byDepartment = {};
        assets.forEach(a => {
            const dept = a.department || 'Unassigned';
            byDepartment[dept] = (byDepartment[dept] || 0) + 1;
        });

        // By status breakdown
        const byStatus = { 'in-use': inUse, available, maintenance, retired, lost: assets.filter(a => a.status === 'lost').length };

        // Recently updated assets (top 8)
        const recentAssets = [...assets]
            .sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt))
            .slice(0, 8)
            .map(a => ({ id: a.id, assetTag: a.assetTag, name: a.name, type: a.type, assignedTo: a.assignedTo, department: a.department, status: a.status, condition: a.condition }));

        res.json({
            totalAssets, inUse, available, maintenance, retired, totalValue,
            warrantyExpiringSoon, warrantyExpired, avgAgeMonths,
            byType, byDepartment, byStatus, recentAssets
        });
    } catch (error) {
        res.status(500).json({ error: 'Error computing IT asset KPIs' });
    }
});

app.get('/api/it-assets', async (req, res) => {
    try {
        const assets = await db.getCollection('it_assets');
        res.json(assets);
    } catch (error) {
        res.status(500).json({ error: 'Error reading IT assets' });
    }
});

app.post('/api/it-assets', strictLimiter, async (req, res) => {
    try {
        const { assetTag, name, type, brand, model, serialNumber, purchaseDate, purchasePrice, currency,
                warrantyExpiry, assignedTo, assignedEmail, department, location, status, condition, notes } = req.body;
        if (!name || !type) {
            return res.status(400).json({ error: 'Name and type are required' });
        }
        if (!ASSET_TYPES.includes(type)) {
            return res.status(400).json({ error: 'Invalid asset type' });
        }
        if (status && !ASSET_STATUSES.includes(status)) {
            return res.status(400).json({ error: 'Invalid status' });
        }
        if (condition && !ASSET_CONDITIONS.includes(condition)) {
            return res.status(400).json({ error: 'Invalid condition' });
        }
        if (currency && !ASSET_CURRENCIES.includes(currency)) {
            return res.status(400).json({ error: 'Invalid currency' });
        }
        const priceValue = purchasePrice !== undefined && purchasePrice !== '' ? parseFloat(purchasePrice) : null;
        if (priceValue !== null && (isNaN(priceValue) || priceValue < 0)) {
            return res.status(400).json({ error: 'Purchase price must be a non-negative number' });
        }
        const assets = await db.getCollection('it_assets');
        if (assetTag && assetTag.trim() && assets.some(a => a.assetTag && a.assetTag.toLowerCase() === assetTag.trim().toLowerCase())) {
            return res.status(400).json({ error: 'Asset tag already exists' });
        }
        const newAsset = {
            id: generateId(),
            assetTag: assetTag ? assetTag.trim() : '',
            name: name.trim(),
            type,
            brand: brand ? brand.trim() : '',
            model: model ? model.trim() : '',
            serialNumber: serialNumber ? serialNumber.trim() : '',
            purchaseDate: purchaseDate || null,
            purchasePrice: priceValue,
            currency: currency || 'EUR',
            warrantyExpiry: warrantyExpiry || null,
            assignedTo: assignedTo ? assignedTo.trim() : '',
            assignedEmail: assignedEmail ? assignedEmail.trim() : '',
            department: department ? department.trim() : '',
            location: location ? location.trim() : '',
            status: status || 'available',
            condition: condition || 'good',
            notes: notes ? notes.trim() : '',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };
        assets.push(newAsset);
        await db.setCollection('it_assets', assets);
        res.status(201).json(newAsset);
    } catch (error) {
        res.status(500).json({ error: 'Error creating IT asset' });
    }
});

app.put('/api/it-assets/:id', strictLimiter, async (req, res) => {
    try {
        const assets = await db.getCollection('it_assets');
        const idx = assets.findIndex(a => a.id === req.params.id);
        if (idx === -1) return res.status(404).json({ error: 'IT asset not found' });
        const { assetTag, name, type, brand, model, serialNumber, purchaseDate, purchasePrice, currency,
                warrantyExpiry, assignedTo, assignedEmail, department, location, status, condition, notes } = req.body;
        if (type && !ASSET_TYPES.includes(type)) {
            return res.status(400).json({ error: 'Invalid asset type' });
        }
        if (status && !ASSET_STATUSES.includes(status)) {
            return res.status(400).json({ error: 'Invalid status' });
        }
        if (condition && !ASSET_CONDITIONS.includes(condition)) {
            return res.status(400).json({ error: 'Invalid condition' });
        }
        if (currency && !ASSET_CURRENCIES.includes(currency)) {
            return res.status(400).json({ error: 'Invalid currency' });
        }
        const priceValue = purchasePrice !== undefined && purchasePrice !== '' ? parseFloat(purchasePrice) : assets[idx].purchasePrice;
        if (priceValue !== null && priceValue !== undefined && (isNaN(priceValue) || priceValue < 0)) {
            return res.status(400).json({ error: 'Purchase price must be a non-negative number' });
        }
        if (assetTag && assetTag.trim() && assetTag.trim().toLowerCase() !== (assets[idx].assetTag || '').toLowerCase()) {
            if (assets.some((a, i) => i !== idx && a.assetTag && a.assetTag.toLowerCase() === assetTag.trim().toLowerCase())) {
                return res.status(400).json({ error: 'Asset tag already exists' });
            }
        }
        assets[idx] = {
            ...assets[idx],
            assetTag: assetTag !== undefined ? assetTag.trim() : assets[idx].assetTag,
            name: name ? name.trim() : assets[idx].name,
            type: type || assets[idx].type,
            brand: brand !== undefined ? brand.trim() : assets[idx].brand,
            model: model !== undefined ? model.trim() : assets[idx].model,
            serialNumber: serialNumber !== undefined ? serialNumber.trim() : assets[idx].serialNumber,
            purchaseDate: purchaseDate !== undefined ? (purchaseDate || null) : assets[idx].purchaseDate,
            purchasePrice: purchasePrice !== undefined && purchasePrice !== '' ? priceValue : assets[idx].purchasePrice,
            currency: currency || assets[idx].currency,
            warrantyExpiry: warrantyExpiry !== undefined ? (warrantyExpiry || null) : assets[idx].warrantyExpiry,
            assignedTo: assignedTo !== undefined ? assignedTo.trim() : assets[idx].assignedTo,
            assignedEmail: assignedEmail !== undefined ? assignedEmail.trim() : assets[idx].assignedEmail,
            department: department !== undefined ? department.trim() : assets[idx].department,
            location: location !== undefined ? location.trim() : assets[idx].location,
            status: status || assets[idx].status,
            condition: condition || assets[idx].condition,
            notes: notes !== undefined ? notes.trim() : assets[idx].notes,
            updatedAt: new Date().toISOString()
        };
        await db.setCollection('it_assets', assets);
        res.json(assets[idx]);
    } catch (error) {
        res.status(500).json({ error: 'Error updating IT asset' });
    }
});

app.delete('/api/it-assets/:id', strictLimiter, async (req, res) => {
    try {
        const assets = await db.getCollection('it_assets');
        const idx = assets.findIndex(a => a.id === req.params.id);
        if (idx === -1) return res.status(404).json({ error: 'IT asset not found' });
        assets.splice(idx, 1);
        await db.setCollection('it_assets', assets);
        res.json({ message: 'IT asset deleted' });
    } catch (error) {
        res.status(500).json({ error: 'Error deleting IT asset' });
    }
});

// ─── Employee Skills & Talent API ─────────────────────────────────────────────

const COMPETENCE_CENTRES = [
    'Cutover & Release Management',
    'Programme & Project Management',
    'Regulatory Reporting',
    'Core Integration'
];

const EMPLOYMENT_TYPES = ['Permanent', 'Contractor', 'Freelancer', 'Part-time', 'Intern', 'Other'];
const SKILL_LEVELS = ['Beginner', 'Intermediate', 'Advanced', 'Expert'];

app.get('/api/employee-skills', async (req, res) => {
    try {
        const profiles = await db.getCollection('employee_skills');
        res.json(profiles);
    } catch (error) {
        res.status(500).json({ error: 'Error reading employee skill profiles' });
    }
});

app.post('/api/employee-skills', strictLimiter, async (req, res) => {
    try {
        const { employeeId, employeeName, employmentType, competenceCentre, skills, notes } = req.body;
        if (!employeeName || !employeeName.trim()) {
            return res.status(400).json({ error: 'Employee name is required' });
        }
        if (!employmentType || !EMPLOYMENT_TYPES.includes(employmentType)) {
            return res.status(400).json({ error: 'Valid employment type is required' });
        }
        if (!competenceCentre || !COMPETENCE_CENTRES.includes(competenceCentre)) {
            return res.status(400).json({ error: 'Valid competence centre is required' });
        }
        const profiles = await db.getCollection('employee_skills');
        if (employeeId && profiles.some(p => p.employeeId === employeeId)) {
            return res.status(400).json({ error: 'A skill profile already exists for this employee' });
        }
        const sanitisedSkills = Array.isArray(skills)
            ? skills.filter(s => s && s.name && s.name.trim()).map(s => ({
                name: s.name.trim(),
                category: s.category ? s.category.trim() : '',
                level: SKILL_LEVELS.includes(s.level) ? s.level : 'Intermediate'
            }))
            : [];
        const newProfile = {
            id: generateId(),
            employeeId: employeeId || null,
            employeeName: employeeName.trim(),
            employmentType,
            competenceCentre,
            skills: sanitisedSkills,
            notes: notes ? notes.trim() : '',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };
        profiles.push(newProfile);
        await db.setCollection('employee_skills', profiles);
        res.status(201).json(newProfile);
    } catch (error) {
        res.status(500).json({ error: 'Error creating employee skill profile' });
    }
});

app.put('/api/employee-skills/:id', strictLimiter, async (req, res) => {
    try {
        const profiles = await db.getCollection('employee_skills');
        const idx = profiles.findIndex(p => p.id === req.params.id);
        if (idx === -1) return res.status(404).json({ error: 'Employee skill profile not found' });
        const { employeeId, employeeName, employmentType, competenceCentre, skills, notes } = req.body;
        if (employmentType && !EMPLOYMENT_TYPES.includes(employmentType)) {
            return res.status(400).json({ error: 'Invalid employment type' });
        }
        if (competenceCentre && !COMPETENCE_CENTRES.includes(competenceCentre)) {
            return res.status(400).json({ error: 'Invalid competence centre' });
        }
        const sanitisedSkills = Array.isArray(skills)
            ? skills.filter(s => s && s.name && s.name.trim()).map(s => ({
                name: s.name.trim(),
                category: s.category ? s.category.trim() : '',
                level: SKILL_LEVELS.includes(s.level) ? s.level : 'Intermediate'
            }))
            : profiles[idx].skills;
        profiles[idx] = {
            ...profiles[idx],
            employeeId: employeeId !== undefined ? (employeeId || null) : profiles[idx].employeeId,
            employeeName: employeeName ? employeeName.trim() : profiles[idx].employeeName,
            employmentType: employmentType || profiles[idx].employmentType,
            competenceCentre: competenceCentre || profiles[idx].competenceCentre,
            skills: sanitisedSkills,
            notes: notes !== undefined ? notes.trim() : profiles[idx].notes,
            updatedAt: new Date().toISOString()
        };
        await db.setCollection('employee_skills', profiles);
        res.json(profiles[idx]);
    } catch (error) {
        res.status(500).json({ error: 'Error updating employee skill profile' });
    }
});

app.delete('/api/employee-skills/:id', strictLimiter, async (req, res) => {
    try {
        const profiles = await db.getCollection('employee_skills');
        const idx = profiles.findIndex(p => p.id === req.params.id);
        if (idx === -1) return res.status(404).json({ error: 'Employee skill profile not found' });
        profiles.splice(idx, 1);
        await db.setCollection('employee_skills', profiles);
        res.json({ message: 'Employee skill profile deleted' });
    } catch (error) {
        res.status(500).json({ error: 'Error deleting employee skill profile' });
    }
});

// ─── Skill Categories API ──────────────────────────────────────────────────────

app.get('/api/skill-categories', async (req, res) => {
    try {
        const categories = await db.getCollection('skill_categories');
        res.json(categories);
    } catch (error) {
        res.status(500).json({ error: 'Error reading skill categories' });
    }
});

app.post('/api/skill-categories', strictLimiter, async (req, res) => {
    try {
        const { name, description } = req.body;
        if (!name || !name.trim()) {
            return res.status(400).json({ error: 'Category name is required' });
        }
        const categories = await db.getCollection('skill_categories');
        if (categories.some(c => c.name.toLowerCase() === name.trim().toLowerCase())) {
            return res.status(400).json({ error: 'A category with this name already exists' });
        }
        const newCategory = {
            id: generateId(),
            name: name.trim(),
            description: description ? description.trim() : '',
            isCustom: true,
            createdAt: new Date().toISOString()
        };
        categories.push(newCategory);
        await db.setCollection('skill_categories', categories);
        res.status(201).json(newCategory);
    } catch (error) {
        res.status(500).json({ error: 'Error creating skill category' });
    }
});

app.put('/api/skill-categories/:id', strictLimiter, async (req, res) => {
    try {
        const categories = await db.getCollection('skill_categories');
        const idx = categories.findIndex(c => c.id === req.params.id);
        if (idx === -1) return res.status(404).json({ error: 'Skill category not found' });
        if (!categories[idx].isCustom) {
            return res.status(403).json({ error: 'Built-in categories cannot be edited' });
        }
        const { name, description } = req.body;
        if (!name || !name.trim()) {
            return res.status(400).json({ error: 'Category name is required' });
        }
        if (categories.some((c, i) => i !== idx && c.name.toLowerCase() === name.trim().toLowerCase())) {
            return res.status(400).json({ error: 'A category with this name already exists' });
        }
        categories[idx] = {
            ...categories[idx],
            name: name.trim(),
            description: description !== undefined ? description.trim() : categories[idx].description,
            updatedAt: new Date().toISOString()
        };
        await db.setCollection('skill_categories', categories);
        res.json(categories[idx]);
    } catch (error) {
        res.status(500).json({ error: 'Error updating skill category' });
    }
});

app.delete('/api/skill-categories/:id', strictLimiter, async (req, res) => {
    try {
        const categories = await db.getCollection('skill_categories');
        const idx = categories.findIndex(c => c.id === req.params.id);
        if (idx === -1) return res.status(404).json({ error: 'Skill category not found' });
        if (!categories[idx].isCustom) {
            return res.status(403).json({ error: 'Built-in categories cannot be deleted' });
        }
        categories.splice(idx, 1);
        await db.setCollection('skill_categories', categories);
        res.json({ message: 'Skill category deleted' });
    } catch (error) {
        res.status(500).json({ error: 'Error deleting skill category' });
    }
});

// ─── CRM Contacts API ────────────────────────────────────────────────────────

app.get('/api/crm/contacts', async (req, res) => {
    try {
        const contacts = await db.getCollection('crm_contacts');
        res.json(contacts);
    } catch (error) {
        res.status(500).json({ error: 'Error reading CRM contacts' });
    }
});

app.post('/api/crm/contacts', strictLimiter, async (req, res) => {
    try {
        const { firstName, lastName, company, email, phone, jobTitle, type, status, notes } = req.body;
        if (!firstName || !lastName || !type) {
            return res.status(400).json({ error: 'First name, last name and type are required' });
        }
        const contacts = await db.getCollection('crm_contacts');
        const newContact = {
            id: generateId(),
            firstName: firstName.trim(),
            lastName: lastName.trim(),
            company: company ? company.trim() : '',
            email: email ? email.trim() : '',
            phone: phone ? phone.trim() : '',
            jobTitle: jobTitle ? jobTitle.trim() : '',
            type,
            status: status || 'Active',
            notes: notes ? notes.trim() : '',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };
        contacts.push(newContact);
        await db.setCollection('crm_contacts', contacts);
        res.status(201).json(newContact);
    } catch (error) {
        res.status(500).json({ error: 'Error creating CRM contact' });
    }
});

app.get('/api/crm/contacts/:id', async (req, res) => {
    try {
        const contacts = await db.getCollection('crm_contacts');
        const contact = contacts.find(c => c.id === req.params.id);
        if (!contact) return res.status(404).json({ error: 'Contact not found' });
        res.json(contact);
    } catch (error) {
        res.status(500).json({ error: 'Error reading CRM contact' });
    }
});

app.put('/api/crm/contacts/:id', strictLimiter, async (req, res) => {
    try {
        const contacts = await db.getCollection('crm_contacts');
        const idx = contacts.findIndex(c => c.id === req.params.id);
        if (idx === -1) return res.status(404).json({ error: 'Contact not found' });
        const { firstName, lastName, company, email, phone, jobTitle, type, status, notes } = req.body;
        if (!firstName || !lastName || !type) {
            return res.status(400).json({ error: 'First name, last name and type are required' });
        }
        contacts[idx] = {
            ...contacts[idx],
            firstName: firstName.trim(),
            lastName: lastName.trim(),
            company: company !== undefined ? company.trim() : contacts[idx].company,
            email: email !== undefined ? email.trim() : contacts[idx].email,
            phone: phone !== undefined ? phone.trim() : contacts[idx].phone,
            jobTitle: jobTitle !== undefined ? jobTitle.trim() : contacts[idx].jobTitle,
            type,
            status: status || contacts[idx].status,
            notes: notes !== undefined ? notes.trim() : contacts[idx].notes,
            updatedAt: new Date().toISOString()
        };
        await db.setCollection('crm_contacts', contacts);
        res.json(contacts[idx]);
    } catch (error) {
        res.status(500).json({ error: 'Error updating CRM contact' });
    }
});

app.delete('/api/crm/contacts/:id', strictLimiter, async (req, res) => {
    try {
        const contacts = await db.getCollection('crm_contacts');
        const idx = contacts.findIndex(c => c.id === req.params.id);
        if (idx === -1) return res.status(404).json({ error: 'Contact not found' });
        contacts.splice(idx, 1);
        await db.setCollection('crm_contacts', contacts);
        res.json({ message: 'Contact deleted' });
    } catch (error) {
        res.status(500).json({ error: 'Error deleting CRM contact' });
    }
});

// ─── CRM Deals / Sales Pipeline API ─────────────────────────────────────────

app.get('/api/crm/deals/kpis', async (req, res) => {
    try {
        const deals = await db.getCollection('crm_deals');
        const active = deals.filter(d => d.stage !== 'Won' && d.stage !== 'Lost');
        const won = deals.filter(d => d.stage === 'Won');
        const lost = deals.filter(d => d.stage === 'Lost');
        const pipelineValue = active.reduce((sum, d) => sum + (parseFloat(d.value) || 0), 0);
        const weightedValue = active.reduce((sum, d) => sum + (parseFloat(d.value) || 0) * ((parseFloat(d.probability) || 0) / 100), 0);
        const closedTotal = won.length + lost.length;
        const winRate = closedTotal > 0 ? Math.round((won.length / closedTotal) * 100) : 0;
        const byStage = {};
        deals.forEach(d => { byStage[d.stage] = (byStage[d.stage] || 0) + 1; });
        res.json({ total: deals.length, active: active.length, won: won.length, lost: lost.length, pipelineValue, weightedValue, winRate, byStage });
    } catch (error) {
        res.status(500).json({ error: 'Error computing deal KPIs' });
    }
});

app.get('/api/crm/deals', async (req, res) => {
    try {
        const deals = await db.getCollection('crm_deals');
        res.json(deals);
    } catch (error) {
        res.status(500).json({ error: 'Error reading CRM deals' });
    }
});

app.post('/api/crm/deals', strictLimiter, async (req, res) => {
    try {
        const { title, contactId, company, value, currency, stage, probability, expectedCloseDate, owner, notes } = req.body;
        if (!title || !stage) {
            return res.status(400).json({ error: 'Title and stage are required' });
        }
        const validStages = ['Lead', 'Qualified', 'Proposal', 'Negotiation', 'Won', 'Lost'];
        if (!validStages.includes(stage)) {
            return res.status(400).json({ error: 'Invalid stage value' });
        }
        const deals = await db.getCollection('crm_deals');
        const newDeal = {
            id: generateId(),
            title: title.trim(),
            contactId: contactId || '',
            company: company ? company.trim() : '',
            value: parseFloat(value) || 0,
            currency: currency || 'EUR',
            stage,
            probability: Math.min(100, Math.max(0, parseInt(probability, 10) || 0)),
            expectedCloseDate: expectedCloseDate || '',
            owner: owner ? owner.trim() : '',
            notes: notes ? notes.trim() : '',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };
        deals.push(newDeal);
        await db.setCollection('crm_deals', deals);
        res.status(201).json(newDeal);
    } catch (error) {
        res.status(500).json({ error: 'Error creating deal' });
    }
});

app.get('/api/crm/deals/:id', async (req, res) => {
    try {
        const deals = await db.getCollection('crm_deals');
        const deal = deals.find(d => d.id === req.params.id);
        if (!deal) return res.status(404).json({ error: 'Deal not found' });
        res.json(deal);
    } catch (error) {
        res.status(500).json({ error: 'Error reading deal' });
    }
});

app.put('/api/crm/deals/:id', strictLimiter, async (req, res) => {
    try {
        const deals = await db.getCollection('crm_deals');
        const idx = deals.findIndex(d => d.id === req.params.id);
        if (idx === -1) return res.status(404).json({ error: 'Deal not found' });
        const { title, contactId, company, value, currency, stage, probability, expectedCloseDate, owner, notes } = req.body;
        if (!title || !stage) {
            return res.status(400).json({ error: 'Title and stage are required' });
        }
        const validStages = ['Lead', 'Qualified', 'Proposal', 'Negotiation', 'Won', 'Lost'];
        if (!validStages.includes(stage)) {
            return res.status(400).json({ error: 'Invalid stage value' });
        }
        deals[idx] = {
            ...deals[idx],
            title: title.trim(),
            contactId: contactId !== undefined ? contactId : deals[idx].contactId,
            company: company !== undefined ? company.trim() : deals[idx].company,
            value: value !== undefined ? (parseFloat(value) || 0) : deals[idx].value,
            currency: currency || deals[idx].currency,
            stage,
            probability: probability !== undefined ? Math.min(100, Math.max(0, parseInt(probability, 10) || 0)) : deals[idx].probability,
            expectedCloseDate: expectedCloseDate !== undefined ? expectedCloseDate : deals[idx].expectedCloseDate,
            owner: owner !== undefined ? owner.trim() : deals[idx].owner,
            notes: notes !== undefined ? notes.trim() : deals[idx].notes,
            updatedAt: new Date().toISOString()
        };
        await db.setCollection('crm_deals', deals);
        res.json(deals[idx]);
    } catch (error) {
        res.status(500).json({ error: 'Error updating deal' });
    }
});

app.delete('/api/crm/deals/:id', strictLimiter, async (req, res) => {
    try {
        const deals = await db.getCollection('crm_deals');
        const idx = deals.findIndex(d => d.id === req.params.id);
        if (idx === -1) return res.status(404).json({ error: 'Deal not found' });
        deals.splice(idx, 1);
        await db.setCollection('crm_deals', deals);
        res.json({ message: 'Deal deleted' });
    } catch (error) {
        res.status(500).json({ error: 'Error deleting deal' });
    }
});

// ─── Process Ownership Map ───────────────────────────────────────────────────

const PROCESS_CATEGORIES = ['HR', 'Finance', 'IT', 'Operations', 'Sales', 'Legal & Compliance', 'Marketing', 'Executive', 'Other'];
const PROCESS_STATUSES = ['active', 'inactive', 'under_review'];
const PROCESS_CRITICALITIES = ['low', 'medium', 'high', 'critical'];
const REVIEW_FREQUENCIES = ['monthly', 'quarterly', 'bi-annually', 'annually', 'as-needed'];

app.get('/api/process-ownership/kpis', async (req, res) => {
    try {
        const processes = await db.getCollection('process_ownership');
        const total = processes.length;
        const active = processes.filter(p => p.status === 'active').length;
        const uniqueOwners = new Set(processes.map(p => p.primaryOwner).filter(Boolean)).size;
        const critical = processes.filter(p => p.criticality === 'critical').length;

        const byCategory = {};
        processes.forEach(p => {
            const cat = p.category || 'Other';
            byCategory[cat] = (byCategory[cat] || 0) + 1;
        });

        const byDepartment = {};
        processes.forEach(p => {
            const dept = p.department || 'Unknown';
            byDepartment[dept] = (byDepartment[dept] || 0) + 1;
        });

        const ownerLoadMap = {};
        processes.forEach(p => {
            if (p.primaryOwner) {
                if (!ownerLoadMap[p.primaryOwner]) {
                    ownerLoadMap[p.primaryOwner] = { name: p.primaryOwner, count: 0 };
                }
                ownerLoadMap[p.primaryOwner].count++;
            }
        });
        const topOwners = Object.values(ownerLoadMap)
            .sort((a, b) => b.count - a.count)
            .slice(0, 5);

        res.json({ total, active, uniqueOwners, critical, byCategory, byDepartment, topOwners });
    } catch (error) {
        res.status(500).json({ error: 'Error fetching process KPIs' });
    }
});

app.get('/api/process-ownership', async (req, res) => {
    try {
        const processes = await db.getCollection('process_ownership');
        res.json(processes);
    } catch (error) {
        res.status(500).json({ error: 'Error fetching processes' });
    }
});

app.post('/api/process-ownership', strictLimiter, async (req, res) => {
    try {
        const {
            processName, description, category, department,
            primaryOwner, primaryOwnerEmail, backupOwner, backupOwnerEmail,
            status, criticality, reviewFrequency, lastReviewDate, nextReviewDate, notes
        } = req.body;

        if (!processName || typeof processName !== 'string' || !processName.trim()) {
            return res.status(400).json({ error: 'Process name is required' });
        }
        if (category && !PROCESS_CATEGORIES.includes(category)) {
            return res.status(400).json({ error: 'Invalid category' });
        }
        if (status && !PROCESS_STATUSES.includes(status)) {
            return res.status(400).json({ error: 'Invalid status' });
        }
        if (criticality && !PROCESS_CRITICALITIES.includes(criticality)) {
            return res.status(400).json({ error: 'Invalid criticality' });
        }
        if (reviewFrequency && !REVIEW_FREQUENCIES.includes(reviewFrequency)) {
            return res.status(400).json({ error: 'Invalid review frequency' });
        }

        const processes = await db.getCollection('process_ownership');
        const newProcess = {
            id: generateId(),
            processName: processName.trim(),
            description: (description || '').trim(),
            category: category || 'Other',
            department: (department || '').trim(),
            primaryOwner: (primaryOwner || '').trim(),
            primaryOwnerEmail: (primaryOwnerEmail || '').trim(),
            backupOwner: (backupOwner || '').trim(),
            backupOwnerEmail: (backupOwnerEmail || '').trim(),
            status: status || 'active',
            criticality: criticality || 'medium',
            reviewFrequency: reviewFrequency || 'quarterly',
            lastReviewDate: lastReviewDate || null,
            nextReviewDate: nextReviewDate || null,
            notes: (notes || '').trim(),
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };
        processes.push(newProcess);
        await db.setCollection('process_ownership', processes);
        res.status(201).json(newProcess);
    } catch (error) {
        res.status(500).json({ error: 'Error creating process' });
    }
});

app.put('/api/process-ownership/:id', strictLimiter, async (req, res) => {
    try {
        const {
            processName, description, category, department,
            primaryOwner, primaryOwnerEmail, backupOwner, backupOwnerEmail,
            status, criticality, reviewFrequency, lastReviewDate, nextReviewDate, notes
        } = req.body;

        if (!processName || typeof processName !== 'string' || !processName.trim()) {
            return res.status(400).json({ error: 'Process name is required' });
        }
        if (category && !PROCESS_CATEGORIES.includes(category)) {
            return res.status(400).json({ error: 'Invalid category' });
        }
        if (status && !PROCESS_STATUSES.includes(status)) {
            return res.status(400).json({ error: 'Invalid status' });
        }
        if (criticality && !PROCESS_CRITICALITIES.includes(criticality)) {
            return res.status(400).json({ error: 'Invalid criticality' });
        }
        if (reviewFrequency && !REVIEW_FREQUENCIES.includes(reviewFrequency)) {
            return res.status(400).json({ error: 'Invalid review frequency' });
        }

        const processes = await db.getCollection('process_ownership');
        const idx = processes.findIndex(p => p.id === req.params.id);
        if (idx === -1) return res.status(404).json({ error: 'Process not found' });

        processes[idx] = {
            ...processes[idx],
            processName: processName.trim(),
            description: (description || '').trim(),
            category: category || processes[idx].category,
            department: (department || '').trim(),
            primaryOwner: (primaryOwner || '').trim(),
            primaryOwnerEmail: (primaryOwnerEmail || '').trim(),
            backupOwner: (backupOwner || '').trim(),
            backupOwnerEmail: (backupOwnerEmail || '').trim(),
            status: status || processes[idx].status,
            criticality: criticality || processes[idx].criticality,
            reviewFrequency: reviewFrequency || processes[idx].reviewFrequency,
            lastReviewDate: lastReviewDate !== undefined ? lastReviewDate : processes[idx].lastReviewDate,
            nextReviewDate: nextReviewDate !== undefined ? nextReviewDate : processes[idx].nextReviewDate,
            notes: (notes || '').trim(),
            updatedAt: new Date().toISOString()
        };
        await db.setCollection('process_ownership', processes);
        res.json(processes[idx]);
    } catch (error) {
        res.status(500).json({ error: 'Error updating process' });
    }
});

app.delete('/api/process-ownership/:id', strictLimiter, async (req, res) => {
    try {
        const processes = await db.getCollection('process_ownership');
        const idx = processes.findIndex(p => p.id === req.params.id);
        if (idx === -1) return res.status(404).json({ error: 'Process not found' });
        processes.splice(idx, 1);
        await db.setCollection('process_ownership', processes);
        res.json({ message: 'Process deleted' });
    } catch (error) {
        res.status(500).json({ error: 'Error deleting process' });
    }
});

// ─── Partnerships API ────────────────────────────────────────────────────────

app.get('/api/partnerships', async (req, res) => {
    try {
        const partnerships = await db.getCollection('partnerships');
        res.json(partnerships);
    } catch (error) {
        res.status(500).json({ error: 'Error reading partnerships' });
    }
});

app.post('/api/partnerships', strictLimiter, async (req, res) => {
    try {
        const { name, type, partnerType, company, firstName, lastName, email, phone, website, description, status, startDate, notes } = req.body;
        if (!name || !type || !partnerType) {
            return res.status(400).json({ error: 'Name, type and partner type are required' });
        }
        const partnerships = await db.getCollection('partnerships');
        const newPartnership = {
            id: generateId(),
            name: name.trim(),
            type,
            partnerType,
            company: company ? company.trim() : '',
            firstName: firstName ? firstName.trim() : '',
            lastName: lastName ? lastName.trim() : '',
            email: email ? email.trim() : '',
            phone: phone ? phone.trim() : '',
            website: website ? website.trim() : '',
            description: description ? description.trim() : '',
            status: status || 'Active',
            startDate: startDate || '',
            notes: notes ? notes.trim() : '',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };
        partnerships.push(newPartnership);
        await db.setCollection('partnerships', partnerships);
        res.status(201).json(newPartnership);
    } catch (error) {
        res.status(500).json({ error: 'Error creating partnership' });
    }
});

app.get('/api/partnerships/:id', async (req, res) => {
    try {
        const partnerships = await db.getCollection('partnerships');
        const partnership = partnerships.find(p => p.id === req.params.id);
        if (!partnership) return res.status(404).json({ error: 'Partnership not found' });
        res.json(partnership);
    } catch (error) {
        res.status(500).json({ error: 'Error reading partnership' });
    }
});

app.put('/api/partnerships/:id', strictLimiter, async (req, res) => {
    try {
        const partnerships = await db.getCollection('partnerships');
        const idx = partnerships.findIndex(p => p.id === req.params.id);
        if (idx === -1) return res.status(404).json({ error: 'Partnership not found' });
        const { name, type, partnerType, company, firstName, lastName, email, phone, website, description, status, startDate, notes } = req.body;
        if (!name || !type || !partnerType) {
            return res.status(400).json({ error: 'Name, type and partner type are required' });
        }
        partnerships[idx] = {
            ...partnerships[idx],
            name: name.trim(),
            type,
            partnerType,
            company: company !== undefined ? company.trim() : partnerships[idx].company,
            firstName: firstName !== undefined ? firstName.trim() : partnerships[idx].firstName,
            lastName: lastName !== undefined ? lastName.trim() : partnerships[idx].lastName,
            email: email !== undefined ? email.trim() : partnerships[idx].email,
            phone: phone !== undefined ? phone.trim() : partnerships[idx].phone,
            website: website !== undefined ? website.trim() : partnerships[idx].website,
            description: description !== undefined ? description.trim() : partnerships[idx].description,
            status: status || partnerships[idx].status,
            startDate: startDate !== undefined ? startDate : partnerships[idx].startDate,
            notes: notes !== undefined ? notes.trim() : partnerships[idx].notes,
            updatedAt: new Date().toISOString()
        };
        await db.setCollection('partnerships', partnerships);
        res.json(partnerships[idx]);
    } catch (error) {
        res.status(500).json({ error: 'Error updating partnership' });
    }
});

app.delete('/api/partnerships/:id', strictLimiter, async (req, res) => {
    try {
        const partnerships = await db.getCollection('partnerships');
        const idx = partnerships.findIndex(p => p.id === req.params.id);
        if (idx === -1) return res.status(404).json({ error: 'Partnership not found' });
        partnerships.splice(idx, 1);
        await db.setCollection('partnerships', partnerships);
        res.json({ message: 'Partnership deleted' });
    } catch (error) {
        res.status(500).json({ error: 'Error deleting partnership' });
    }
});

// ─── Meetings API ─────────────────────────────────────────────────────────────

app.get('/api/meetings', async (req, res) => {
    try {
        const meetings = await db.getCollection('meetings');
        res.json(meetings);
    } catch {
        res.status(500).json({ error: 'Error reading meetings' });
    }
});

app.post('/api/meetings', strictLimiter, async (req, res) => {
    try {
        const { title, date, time, type, status, location, attendees, agenda, notes } = req.body;
        if (!title || !title.trim()) return res.status(400).json({ error: 'Title is required' });
        if (!date) return res.status(400).json({ error: 'Date is required' });
        const meetings = await db.getCollection('meetings');
        const newMeeting = {
            id: generateId(),
            title: title.trim(),
            date,
            time: time || '',
            type: type || 'Management',
            status: status || 'Upcoming',
            location: location ? location.trim() : '',
            attendees: attendees ? attendees.trim() : '',
            agenda: agenda ? agenda.trim() : '',
            notes: notes ? notes.trim() : '',
            todos: [],
            createdAt: new Date().toISOString()
        };
        meetings.push(newMeeting);
        await db.setCollection('meetings', meetings);
        res.status(201).json(newMeeting);
    } catch {
        res.status(500).json({ error: 'Error creating meeting' });
    }
});

app.get('/api/meetings/:id', async (req, res) => {
    try {
        const meetings = await db.getCollection('meetings');
        const meeting = meetings.find(m => m.id === req.params.id);
        if (!meeting) return res.status(404).json({ error: 'Meeting not found' });
        res.json(meeting);
    } catch {
        res.status(500).json({ error: 'Error reading meeting' });
    }
});

app.put('/api/meetings/:id', strictLimiter, async (req, res) => {
    try {
        const { title, date, time, type, status, location, attendees, agenda, notes } = req.body;
        const meetings = await db.getCollection('meetings');
        const idx = meetings.findIndex(m => m.id === req.params.id);
        if (idx === -1) return res.status(404).json({ error: 'Meeting not found' });
        meetings[idx] = {
            ...meetings[idx],
            title: title !== undefined ? title.trim() : meetings[idx].title,
            date: date !== undefined ? date : meetings[idx].date,
            time: time !== undefined ? time : meetings[idx].time,
            type: type || meetings[idx].type,
            status: status || meetings[idx].status,
            location: location !== undefined ? location.trim() : meetings[idx].location,
            attendees: attendees !== undefined ? attendees.trim() : meetings[idx].attendees,
            agenda: agenda !== undefined ? agenda.trim() : meetings[idx].agenda,
            notes: notes !== undefined ? notes.trim() : meetings[idx].notes
        };
        await db.setCollection('meetings', meetings);
        res.json(meetings[idx]);
    } catch {
        res.status(500).json({ error: 'Error updating meeting' });
    }
});

app.delete('/api/meetings/:id', strictLimiter, async (req, res) => {
    try {
        const meetings = await db.getCollection('meetings');
        const idx = meetings.findIndex(m => m.id === req.params.id);
        if (idx === -1) return res.status(404).json({ error: 'Meeting not found' });
        meetings.splice(idx, 1);
        await db.setCollection('meetings', meetings);
        res.json({ message: 'Meeting deleted' });
    } catch {
        res.status(500).json({ error: 'Error deleting meeting' });
    }
});

// ─── Meeting Todos API ─────────────────────────────────────────────────────────

app.post('/api/meetings/:id/todos', strictLimiter, async (req, res) => {
    try {
        const { task, assignee, dueDate, priority } = req.body;
        if (!task || !task.trim()) return res.status(400).json({ error: 'Task is required' });
        const meetings = await db.getCollection('meetings');
        const idx = meetings.findIndex(m => m.id === req.params.id);
        if (idx === -1) return res.status(404).json({ error: 'Meeting not found' });
        const newTodo = {
            id: generateId(),
            task: task.trim(),
            assignee: assignee ? assignee.trim() : '',
            dueDate: dueDate || '',
            priority: priority || 'Medium',
            status: 'Open',
            createdAt: new Date().toISOString()
        };
        if (!Array.isArray(meetings[idx].todos)) meetings[idx].todos = [];
        meetings[idx].todos.push(newTodo);
        await db.setCollection('meetings', meetings);
        res.status(201).json(newTodo);
    } catch {
        res.status(500).json({ error: 'Error creating todo' });
    }
});

app.put('/api/meetings/:id/todos/:todoId', strictLimiter, async (req, res) => {
    try {
        const { task, assignee, dueDate, priority, status } = req.body;
        const meetings = await db.getCollection('meetings');
        const mIdx = meetings.findIndex(m => m.id === req.params.id);
        if (mIdx === -1) return res.status(404).json({ error: 'Meeting not found' });
        if (!Array.isArray(meetings[mIdx].todos)) meetings[mIdx].todos = [];
        const tIdx = meetings[mIdx].todos.findIndex(t => t.id === req.params.todoId);
        if (tIdx === -1) return res.status(404).json({ error: 'Todo not found' });
        meetings[mIdx].todos[tIdx] = {
            ...meetings[mIdx].todos[tIdx],
            task: task !== undefined ? task.trim() : meetings[mIdx].todos[tIdx].task,
            assignee: assignee !== undefined ? assignee.trim() : meetings[mIdx].todos[tIdx].assignee,
            dueDate: dueDate !== undefined ? dueDate : meetings[mIdx].todos[tIdx].dueDate,
            priority: priority || meetings[mIdx].todos[tIdx].priority,
            status: status || meetings[mIdx].todos[tIdx].status
        };
        await db.setCollection('meetings', meetings);
        res.json(meetings[mIdx].todos[tIdx]);
    } catch {
        res.status(500).json({ error: 'Error updating todo' });
    }
});

app.delete('/api/meetings/:id/todos/:todoId', strictLimiter, async (req, res) => {
    try {
        const meetings = await db.getCollection('meetings');
        const mIdx = meetings.findIndex(m => m.id === req.params.id);
        if (mIdx === -1) return res.status(404).json({ error: 'Meeting not found' });
        if (!Array.isArray(meetings[mIdx].todos)) meetings[mIdx].todos = [];
        const tIdx = meetings[mIdx].todos.findIndex(t => t.id === req.params.todoId);
        if (tIdx === -1) return res.status(404).json({ error: 'Todo not found' });
        meetings[mIdx].todos.splice(tIdx, 1);
        await db.setCollection('meetings', meetings);
        res.json({ message: 'Todo deleted' });
    } catch {
        res.status(500).json({ error: 'Error deleting todo' });
    }
});

// ─── Meeting Protocols API ────────────────────────────────────────────────────

app.post('/api/meetings/:id/protocols', strictLimiter, async (req, res) => {
    try {
        const { title, content, author, status } = req.body;
        if (!title || !title.trim()) return res.status(400).json({ error: 'Protocol title is required' });
        const meetings = await db.getCollection('meetings');
        const idx = meetings.findIndex(m => m.id === req.params.id);
        if (idx === -1) return res.status(404).json({ error: 'Meeting not found' });
        const newProtocol = {
            id: generateId(),
            title: title.trim(),
            content: content ? content.trim() : '',
            author: author ? author.trim() : '',
            status: status || 'Draft',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };
        if (!Array.isArray(meetings[idx].protocols)) meetings[idx].protocols = [];
        meetings[idx].protocols.push(newProtocol);
        await db.setCollection('meetings', meetings);
        res.status(201).json(newProtocol);
    } catch {
        res.status(500).json({ error: 'Error creating protocol' });
    }
});

app.put('/api/meetings/:id/protocols/:protocolId', strictLimiter, async (req, res) => {
    try {
        const { title, content, author, status } = req.body;
        const meetings = await db.getCollection('meetings');
        const mIdx = meetings.findIndex(m => m.id === req.params.id);
        if (mIdx === -1) return res.status(404).json({ error: 'Meeting not found' });
        if (!Array.isArray(meetings[mIdx].protocols)) meetings[mIdx].protocols = [];
        const pIdx = meetings[mIdx].protocols.findIndex(p => p.id === req.params.protocolId);
        if (pIdx === -1) return res.status(404).json({ error: 'Protocol not found' });
        meetings[mIdx].protocols[pIdx] = {
            ...meetings[mIdx].protocols[pIdx],
            title: title !== undefined ? title.trim() : meetings[mIdx].protocols[pIdx].title,
            content: content !== undefined ? content.trim() : meetings[mIdx].protocols[pIdx].content,
            author: author !== undefined ? author.trim() : meetings[mIdx].protocols[pIdx].author,
            status: status || meetings[mIdx].protocols[pIdx].status,
            updatedAt: new Date().toISOString()
        };
        await db.setCollection('meetings', meetings);
        res.json(meetings[mIdx].protocols[pIdx]);
    } catch {
        res.status(500).json({ error: 'Error updating protocol' });
    }
});

app.delete('/api/meetings/:id/protocols/:protocolId', strictLimiter, async (req, res) => {
    try {
        const meetings = await db.getCollection('meetings');
        const mIdx = meetings.findIndex(m => m.id === req.params.id);
        if (mIdx === -1) return res.status(404).json({ error: 'Meeting not found' });
        if (!Array.isArray(meetings[mIdx].protocols)) meetings[mIdx].protocols = [];
        const pIdx = meetings[mIdx].protocols.findIndex(p => p.id === req.params.protocolId);
        if (pIdx === -1) return res.status(404).json({ error: 'Protocol not found' });
        meetings[mIdx].protocols.splice(pIdx, 1);
        await db.setCollection('meetings', meetings);
        res.json({ message: 'Protocol deleted' });
    } catch {
        res.status(500).json({ error: 'Error deleting protocol' });
    }
});

// ─── Evaluations API ──────────────────────────────────────────────────────────

app.get('/api/evaluations', async (req, res) => {
    try {
        const evaluations = await db.getCollection('evaluations');
        res.json(evaluations);
    } catch {
        res.status(500).json({ error: 'Error reading evaluations' });
    }
});

app.post('/api/evaluations', strictLimiter, async (req, res) => {
    try {
        const { employeeName, evaluatorName, period, type, status, dueDate, overallScore, comments } = req.body;
        if (!employeeName || !employeeName.trim()) return res.status(400).json({ error: 'Employee name is required' });
        if (!period || !period.trim()) return res.status(400).json({ error: 'Period is required' });
        const evaluations = await db.getCollection('evaluations');
        const newEvaluation = {
            id: generateId(),
            employeeName: employeeName.trim(),
            evaluatorName: evaluatorName ? evaluatorName.trim() : '',
            period: period.trim(),
            type: type || 'Annual Review',
            status: status || 'Draft',
            dueDate: dueDate || '',
            overallScore: overallScore !== undefined && overallScore !== '' ? Number(overallScore) : null,
            comments: comments ? comments.trim() : '',
            goals: [],
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };
        evaluations.push(newEvaluation);
        await db.setCollection('evaluations', evaluations);
        res.status(201).json(newEvaluation);
    } catch {
        res.status(500).json({ error: 'Error creating evaluation' });
    }
});

app.get('/api/evaluations/:id', async (req, res) => {
    try {
        const evaluations = await db.getCollection('evaluations');
        const evaluation = evaluations.find(e => e.id === req.params.id);
        if (!evaluation) return res.status(404).json({ error: 'Evaluation not found' });
        res.json(evaluation);
    } catch {
        res.status(500).json({ error: 'Error reading evaluation' });
    }
});

app.put('/api/evaluations/:id', strictLimiter, async (req, res) => {
    try {
        const { employeeName, evaluatorName, period, type, status, dueDate, overallScore, comments } = req.body;
        const evaluations = await db.getCollection('evaluations');
        const idx = evaluations.findIndex(e => e.id === req.params.id);
        if (idx === -1) return res.status(404).json({ error: 'Evaluation not found' });
        evaluations[idx] = {
            ...evaluations[idx],
            employeeName: employeeName !== undefined ? employeeName.trim() : evaluations[idx].employeeName,
            evaluatorName: evaluatorName !== undefined ? evaluatorName.trim() : evaluations[idx].evaluatorName,
            period: period !== undefined ? period.trim() : evaluations[idx].period,
            type: type || evaluations[idx].type,
            status: status || evaluations[idx].status,
            dueDate: dueDate !== undefined ? dueDate : evaluations[idx].dueDate,
            overallScore: overallScore !== undefined && overallScore !== '' ? Number(overallScore) : overallScore === '' ? null : evaluations[idx].overallScore,
            comments: comments !== undefined ? comments.trim() : evaluations[idx].comments,
            updatedAt: new Date().toISOString()
        };
        await db.setCollection('evaluations', evaluations);
        res.json(evaluations[idx]);
    } catch {
        res.status(500).json({ error: 'Error updating evaluation' });
    }
});

app.delete('/api/evaluations/:id', strictLimiter, async (req, res) => {
    try {
        const evaluations = await db.getCollection('evaluations');
        const idx = evaluations.findIndex(e => e.id === req.params.id);
        if (idx === -1) return res.status(404).json({ error: 'Evaluation not found' });
        evaluations.splice(idx, 1);
        await db.setCollection('evaluations', evaluations);
        res.json({ message: 'Evaluation deleted' });
    } catch {
        res.status(500).json({ error: 'Error deleting evaluation' });
    }
});

// ─── Evaluation Goals API ─────────────────────────────────────────────────────

app.post('/api/evaluations/:id/goals', strictLimiter, async (req, res) => {
    try {
        const { title, description, score, status } = req.body;
        if (!title || !title.trim()) return res.status(400).json({ error: 'Goal title is required' });
        const evaluations = await db.getCollection('evaluations');
        const idx = evaluations.findIndex(e => e.id === req.params.id);
        if (idx === -1) return res.status(404).json({ error: 'Evaluation not found' });
        const newGoal = {
            id: generateId(),
            title: title.trim(),
            description: description ? description.trim() : '',
            score: score !== undefined && score !== '' ? Number(score) : null,
            status: status || 'Not Started',
            createdAt: new Date().toISOString()
        };
        if (!Array.isArray(evaluations[idx].goals)) evaluations[idx].goals = [];
        evaluations[idx].goals.push(newGoal);
        evaluations[idx].updatedAt = new Date().toISOString();
        await db.setCollection('evaluations', evaluations);
        res.status(201).json(newGoal);
    } catch {
        res.status(500).json({ error: 'Error creating goal' });
    }
});

app.put('/api/evaluations/:id/goals/:goalId', strictLimiter, async (req, res) => {
    try {
        const { title, description, score, status } = req.body;
        const evaluations = await db.getCollection('evaluations');
        const eIdx = evaluations.findIndex(e => e.id === req.params.id);
        if (eIdx === -1) return res.status(404).json({ error: 'Evaluation not found' });
        if (!Array.isArray(evaluations[eIdx].goals)) evaluations[eIdx].goals = [];
        const gIdx = evaluations[eIdx].goals.findIndex(g => g.id === req.params.goalId);
        if (gIdx === -1) return res.status(404).json({ error: 'Goal not found' });
        evaluations[eIdx].goals[gIdx] = {
            ...evaluations[eIdx].goals[gIdx],
            title: title !== undefined ? title.trim() : evaluations[eIdx].goals[gIdx].title,
            description: description !== undefined ? description.trim() : evaluations[eIdx].goals[gIdx].description,
            score: score !== undefined && score !== '' ? Number(score) : score === '' ? null : evaluations[eIdx].goals[gIdx].score,
            status: status || evaluations[eIdx].goals[gIdx].status
        };
        evaluations[eIdx].updatedAt = new Date().toISOString();
        await db.setCollection('evaluations', evaluations);
        res.json(evaluations[eIdx].goals[gIdx]);
    } catch {
        res.status(500).json({ error: 'Error updating goal' });
    }
});

app.delete('/api/evaluations/:id/goals/:goalId', strictLimiter, async (req, res) => {
    try {
        const evaluations = await db.getCollection('evaluations');
        const eIdx = evaluations.findIndex(e => e.id === req.params.id);
        if (eIdx === -1) return res.status(404).json({ error: 'Evaluation not found' });
        if (!Array.isArray(evaluations[eIdx].goals)) evaluations[eIdx].goals = [];
        const gIdx = evaluations[eIdx].goals.findIndex(g => g.id === req.params.goalId);
        if (gIdx === -1) return res.status(404).json({ error: 'Goal not found' });
        evaluations[eIdx].goals.splice(gIdx, 1);
        evaluations[eIdx].updatedAt = new Date().toISOString();
        await db.setCollection('evaluations', evaluations);
        res.json({ message: 'Goal deleted' });
    } catch {
        res.status(500).json({ error: 'Error deleting goal' });
    }
});

// ─── Open Positions API ──────────────────────────────────────────────────────

const POSITION_STATUSES = ['Open', 'In Progress', 'Filled', 'Cancelled'];
const POSITION_PRIORITIES = ['Low', 'Medium', 'High', 'Urgent'];
const POSITION_EMPLOYMENT_TYPES = ['Permanent', 'Contractor', 'Freelancer', 'Part-time', 'Intern'];

app.get('/api/open-positions', async (req, res) => {
    try {
        const positions = await db.getCollection('open_positions');
        res.json(positions);
    } catch {
        res.status(500).json({ error: 'Error reading open positions' });
    }
});

app.post('/api/open-positions', strictLimiter, async (req, res) => {
    try {
        const { title, department, employmentType, priority, status, requestedBy, targetDate, requiredSkills, description, notes } = req.body;
        if (!title || !title.trim()) return res.status(400).json({ error: 'Position title is required' });
        if (!requestedBy || !requestedBy.trim()) return res.status(400).json({ error: 'Requested by is required' });
        if (employmentType && !POSITION_EMPLOYMENT_TYPES.includes(employmentType)) return res.status(400).json({ error: 'Invalid employment type' });
        if (priority && !POSITION_PRIORITIES.includes(priority)) return res.status(400).json({ error: 'Invalid priority' });
        const resolvedStatus = status || 'Open';
        if (!POSITION_STATUSES.includes(resolvedStatus)) return res.status(400).json({ error: 'Invalid status' });

        const skills = Array.isArray(requiredSkills)
            ? requiredSkills.map(s => ({ name: String(s.name || '').trim(), category: String(s.category || '').trim(), level: String(s.level || '').trim() })).filter(s => s.name)
            : [];

        const newPosition = {
            id: generateId(),
            title: title.trim(),
            department: department ? department.trim() : '',
            employmentType: employmentType || '',
            priority: priority || 'Medium',
            status: resolvedStatus,
            requestedBy: requestedBy.trim(),
            targetDate: targetDate || null,
            requiredSkills: skills,
            description: description ? description.trim() : '',
            notes: notes ? notes.trim() : '',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };
        const positions = await db.getCollection('open_positions');
        positions.push(newPosition);
        await db.setCollection('open_positions', positions);
        res.status(201).json(newPosition);
    } catch {
        res.status(500).json({ error: 'Error creating open position' });
    }
});

app.put('/api/open-positions/:id', strictLimiter, async (req, res) => {
    try {
        const positions = await db.getCollection('open_positions');
        const idx = positions.findIndex(p => p.id === req.params.id);
        if (idx === -1) return res.status(404).json({ error: 'Position not found' });
        const { title, department, employmentType, priority, status, requestedBy, targetDate, requiredSkills, description, notes } = req.body;
        if (title !== undefined && !title.trim()) return res.status(400).json({ error: 'Position title cannot be empty' });
        if (requestedBy !== undefined && !requestedBy.trim()) return res.status(400).json({ error: 'Requested by cannot be empty' });
        if (employmentType && !POSITION_EMPLOYMENT_TYPES.includes(employmentType)) return res.status(400).json({ error: 'Invalid employment type' });
        if (priority && !POSITION_PRIORITIES.includes(priority)) return res.status(400).json({ error: 'Invalid priority' });
        if (status && !POSITION_STATUSES.includes(status)) return res.status(400).json({ error: 'Invalid status' });

        const skills = requiredSkills !== undefined
            ? (Array.isArray(requiredSkills)
                ? requiredSkills.map(s => ({ name: String(s.name || '').trim(), category: String(s.category || '').trim(), level: String(s.level || '').trim() })).filter(s => s.name)
                : positions[idx].requiredSkills)
            : positions[idx].requiredSkills;

        positions[idx] = {
            ...positions[idx],
            title: title !== undefined ? title.trim() : positions[idx].title,
            department: department !== undefined ? department.trim() : positions[idx].department,
            employmentType: employmentType !== undefined ? employmentType : positions[idx].employmentType,
            priority: priority !== undefined ? priority : positions[idx].priority,
            status: status !== undefined ? status : positions[idx].status,
            requestedBy: requestedBy !== undefined ? requestedBy.trim() : positions[idx].requestedBy,
            targetDate: targetDate !== undefined ? (targetDate || null) : positions[idx].targetDate,
            requiredSkills: skills,
            description: description !== undefined ? description.trim() : positions[idx].description,
            notes: notes !== undefined ? notes.trim() : positions[idx].notes,
            updatedAt: new Date().toISOString()
        };
        await db.setCollection('open_positions', positions);
        res.json(positions[idx]);
    } catch {
        res.status(500).json({ error: 'Error updating open position' });
    }
});

app.delete('/api/open-positions/:id', strictLimiter, async (req, res) => {
    try {
        const positions = await db.getCollection('open_positions');
        const idx = positions.findIndex(p => p.id === req.params.id);
        if (idx === -1) return res.status(404).json({ error: 'Position not found' });
        positions.splice(idx, 1);
        await db.setCollection('open_positions', positions);
        res.status(204).send();
    } catch {
        res.status(500).json({ error: 'Error deleting open position' });
    }
});

// ─── Outlook (Assessment of Outlook) API ─────────────────────────────────────

const OUTLOOK_RAG_STATUSES = ['Red', 'Amber', 'Green'];
const OUTLOOK_STATUSES = ['Draft', 'In Progress', 'Completed'];
const OUTLOOK_TASK_STATUSES = ['To Do', 'In Progress', 'Done'];

app.get('/api/outlook', async (req, res) => {
    try {
        const items = await db.getCollection('outlook');
        res.json(items);
    } catch {
        res.status(500).json({ error: 'Error reading outlook items' });
    }
});

app.post('/api/outlook', strictLimiter, async (req, res) => {
    try {
        const { title, owner, ragStatus, status, implementationDate, description } = req.body;
        if (!title || !title.trim()) return res.status(400).json({ error: 'Title is required' });
        if (!owner || !owner.trim()) return res.status(400).json({ error: 'Owner is required' });
        const resolvedRag = ragStatus || 'Amber';
        if (!OUTLOOK_RAG_STATUSES.includes(resolvedRag)) return res.status(400).json({ error: 'Invalid RAG status' });
        const resolvedStatus = status || 'Draft';
        if (!OUTLOOK_STATUSES.includes(resolvedStatus)) return res.status(400).json({ error: 'Invalid status' });
        const newItem = {
            id: generateId(),
            title: title.trim(),
            owner: owner.trim(),
            ragStatus: resolvedRag,
            status: resolvedStatus,
            implementationDate: implementationDate || null,
            description: description ? description.trim() : '',
            tasks: [],
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };
        const items = await db.getCollection('outlook');
        items.push(newItem);
        await db.setCollection('outlook', items);
        res.status(201).json(newItem);
    } catch {
        res.status(500).json({ error: 'Error creating outlook item' });
    }
});

app.get('/api/outlook/:id', async (req, res) => {
    try {
        const items = await db.getCollection('outlook');
        const item = items.find(i => i.id === req.params.id);
        if (!item) return res.status(404).json({ error: 'Outlook item not found' });
        res.json(item);
    } catch {
        res.status(500).json({ error: 'Error reading outlook item' });
    }
});

app.put('/api/outlook/:id', strictLimiter, async (req, res) => {
    try {
        const { title, owner, ragStatus, status, implementationDate, description } = req.body;
        const items = await db.getCollection('outlook');
        const idx = items.findIndex(i => i.id === req.params.id);
        if (idx === -1) return res.status(404).json({ error: 'Outlook item not found' });
        if (title !== undefined && !title.trim()) return res.status(400).json({ error: 'Title cannot be empty' });
        if (owner !== undefined && !owner.trim()) return res.status(400).json({ error: 'Owner cannot be empty' });
        if (ragStatus && !OUTLOOK_RAG_STATUSES.includes(ragStatus)) return res.status(400).json({ error: 'Invalid RAG status' });
        if (status && !OUTLOOK_STATUSES.includes(status)) return res.status(400).json({ error: 'Invalid status' });
        items[idx] = {
            ...items[idx],
            title: title !== undefined ? title.trim() : items[idx].title,
            owner: owner !== undefined ? owner.trim() : items[idx].owner,
            ragStatus: ragStatus || items[idx].ragStatus,
            status: status || items[idx].status,
            implementationDate: implementationDate !== undefined ? (implementationDate || null) : items[idx].implementationDate,
            description: description !== undefined ? description.trim() : items[idx].description,
            updatedAt: new Date().toISOString()
        };
        await db.setCollection('outlook', items);
        res.json(items[idx]);
    } catch {
        res.status(500).json({ error: 'Error updating outlook item' });
    }
});

app.delete('/api/outlook/:id', strictLimiter, async (req, res) => {
    try {
        const items = await db.getCollection('outlook');
        const idx = items.findIndex(i => i.id === req.params.id);
        if (idx === -1) return res.status(404).json({ error: 'Outlook item not found' });
        items.splice(idx, 1);
        await db.setCollection('outlook', items);
        res.json({ message: 'Outlook item deleted' });
    } catch {
        res.status(500).json({ error: 'Error deleting outlook item' });
    }
});

// ─── Outlook Tasks API ────────────────────────────────────────────────────────

app.post('/api/outlook/:id/tasks', strictLimiter, async (req, res) => {
    try {
        const { title, description, assignee, dueDate, status } = req.body;
        if (!title || !title.trim()) return res.status(400).json({ error: 'Task title is required' });
        const items = await db.getCollection('outlook');
        const idx = items.findIndex(i => i.id === req.params.id);
        if (idx === -1) return res.status(404).json({ error: 'Outlook item not found' });
        const newTask = {
            id: generateId(),
            title: title.trim(),
            description: description ? description.trim() : '',
            assignee: assignee ? assignee.trim() : '',
            dueDate: dueDate || null,
            status: status || 'To Do',
            createdAt: new Date().toISOString()
        };
        if (!Array.isArray(items[idx].tasks)) items[idx].tasks = [];
        items[idx].tasks.push(newTask);
        items[idx].updatedAt = new Date().toISOString();
        await db.setCollection('outlook', items);
        res.status(201).json(newTask);
    } catch {
        res.status(500).json({ error: 'Error creating task' });
    }
});

app.put('/api/outlook/:id/tasks/:taskId', strictLimiter, async (req, res) => {
    try {
        const { title, description, assignee, dueDate, status } = req.body;
        const items = await db.getCollection('outlook');
        const iIdx = items.findIndex(i => i.id === req.params.id);
        if (iIdx === -1) return res.status(404).json({ error: 'Outlook item not found' });
        if (!Array.isArray(items[iIdx].tasks)) items[iIdx].tasks = [];
        const tIdx = items[iIdx].tasks.findIndex(t => t.id === req.params.taskId);
        if (tIdx === -1) return res.status(404).json({ error: 'Task not found' });
        if (title !== undefined && !title.trim()) return res.status(400).json({ error: 'Task title cannot be empty' });
        if (status && !OUTLOOK_TASK_STATUSES.includes(status)) return res.status(400).json({ error: 'Invalid task status' });
        items[iIdx].tasks[tIdx] = {
            ...items[iIdx].tasks[tIdx],
            title: title !== undefined ? title.trim() : items[iIdx].tasks[tIdx].title,
            description: description !== undefined ? description.trim() : items[iIdx].tasks[tIdx].description,
            assignee: assignee !== undefined ? assignee.trim() : items[iIdx].tasks[tIdx].assignee,
            dueDate: dueDate !== undefined ? (dueDate || null) : items[iIdx].tasks[tIdx].dueDate,
            status: status || items[iIdx].tasks[tIdx].status
        };
        items[iIdx].updatedAt = new Date().toISOString();
        await db.setCollection('outlook', items);
        res.json(items[iIdx].tasks[tIdx]);
    } catch {
        res.status(500).json({ error: 'Error updating task' });
    }
});

app.delete('/api/outlook/:id/tasks/:taskId', strictLimiter, async (req, res) => {
    try {
        const items = await db.getCollection('outlook');
        const iIdx = items.findIndex(i => i.id === req.params.id);
        if (iIdx === -1) return res.status(404).json({ error: 'Outlook item not found' });
        if (!Array.isArray(items[iIdx].tasks)) items[iIdx].tasks = [];
        const tIdx = items[iIdx].tasks.findIndex(t => t.id === req.params.taskId);
        if (tIdx === -1) return res.status(404).json({ error: 'Task not found' });
        items[iIdx].tasks.splice(tIdx, 1);
        items[iIdx].updatedAt = new Date().toISOString();
        await db.setCollection('outlook', items);
        res.json({ message: 'Task deleted' });
    } catch {
        res.status(500).json({ error: 'Error deleting task' });
    }
});

// ─── Employment Certificates API ─────────────────────────────────────────────

const EMP_CERT_TYPES = ['Employment Confirmation', 'Salary Confirmation', 'Reference Letter', 'Work Experience Letter', 'Other'];
const EMP_CERT_STATUSES = ['Draft', 'Issued'];
const EMP_CERT_EMPLOYMENT_TYPES = ['Full-time', 'Part-time', 'Contract', 'Freelancer', 'Intern', 'Other'];
const EMP_CERT_ENTITIES = ['ON-POINT Switzerland', 'ON-POINT Germany', 'ON-POINT UK'];
const EMP_CERT_CURRENCIES = ['CHF', 'EUR', 'GBP', 'USD'];

app.get('/api/employment-certificates', async (req, res) => {
    try {
        const certs = await db.getCollection('employment_certificates');
        res.json(certs);
    } catch {
        res.status(500).json({ error: 'Error reading employment certificates' });
    }
});

app.post('/api/employment-certificates', strictLimiter, async (req, res) => {
    try {
        const {
            employeeName, employeeEmail, dateOfBirth, address,
            jobTitle, department, employmentType, entity,
            startDate, endDate, certificateType, status,
            salary, salaryCurrency, authorizedSignatory, signatoryTitle,
            issueDate, notes
        } = req.body;
        if (!employeeName || !employeeName.trim()) return res.status(400).json({ error: 'Employee name is required' });
        if (!jobTitle || !jobTitle.trim()) return res.status(400).json({ error: 'Job title is required' });
        if (!startDate) return res.status(400).json({ error: 'Start date is required' });
        if (!entity || !EMP_CERT_ENTITIES.includes(entity)) return res.status(400).json({ error: 'Valid entity is required' });
        const resolvedType = certificateType || 'Employment Confirmation';
        if (!EMP_CERT_TYPES.includes(resolvedType)) return res.status(400).json({ error: 'Invalid certificate type' });
        const resolvedStatus = status || 'Draft';
        if (!EMP_CERT_STATUSES.includes(resolvedStatus)) return res.status(400).json({ error: 'Invalid status' });
        if (employmentType && !EMP_CERT_EMPLOYMENT_TYPES.includes(employmentType)) return res.status(400).json({ error: 'Invalid employment type' });
        if (salaryCurrency && !EMP_CERT_CURRENCIES.includes(salaryCurrency)) return res.status(400).json({ error: 'Invalid currency' });
        const newCert = {
            id: generateId(),
            employeeName: employeeName.trim(),
            employeeEmail: employeeEmail ? employeeEmail.trim() : '',
            dateOfBirth: dateOfBirth || '',
            address: address ? address.trim() : '',
            jobTitle: jobTitle.trim(),
            department: department ? department.trim() : '',
            employmentType: employmentType || '',
            entity: entity.trim(),
            startDate: startDate,
            endDate: endDate || '',
            certificateType: resolvedType,
            status: resolvedStatus,
            salary: salary !== undefined && salary !== '' ? salary.toString().trim() : '',
            salaryCurrency: salaryCurrency || 'CHF',
            authorizedSignatory: authorizedSignatory ? authorizedSignatory.trim() : '',
            signatoryTitle: signatoryTitle ? signatoryTitle.trim() : '',
            issueDate: issueDate || '',
            notes: notes ? notes.trim() : '',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };
        const certs = await db.getCollection('employment_certificates');
        certs.push(newCert);
        await db.setCollection('employment_certificates', certs);
        res.status(201).json(newCert);
    } catch {
        res.status(500).json({ error: 'Error creating employment certificate' });
    }
});

app.get('/api/employment-certificates/:id', async (req, res) => {
    try {
        const certs = await db.getCollection('employment_certificates');
        const cert = certs.find(c => c.id === req.params.id);
        if (!cert) return res.status(404).json({ error: 'Employment certificate not found' });
        res.json(cert);
    } catch {
        res.status(500).json({ error: 'Error reading employment certificate' });
    }
});

app.put('/api/employment-certificates/:id', strictLimiter, async (req, res) => {
    try {
        const {
            employeeName, employeeEmail, dateOfBirth, address,
            jobTitle, department, employmentType, entity,
            startDate, endDate, certificateType, status,
            salary, salaryCurrency, authorizedSignatory, signatoryTitle,
            issueDate, notes
        } = req.body;
        const certs = await db.getCollection('employment_certificates');
        const idx = certs.findIndex(c => c.id === req.params.id);
        if (idx === -1) return res.status(404).json({ error: 'Employment certificate not found' });
        if (employeeName !== undefined && !employeeName.trim()) return res.status(400).json({ error: 'Employee name cannot be empty' });
        if (jobTitle !== undefined && !jobTitle.trim()) return res.status(400).json({ error: 'Job title cannot be empty' });
        if (entity && !EMP_CERT_ENTITIES.includes(entity)) return res.status(400).json({ error: 'Invalid entity' });
        if (certificateType && !EMP_CERT_TYPES.includes(certificateType)) return res.status(400).json({ error: 'Invalid certificate type' });
        if (status && !EMP_CERT_STATUSES.includes(status)) return res.status(400).json({ error: 'Invalid status' });
        if (employmentType && !EMP_CERT_EMPLOYMENT_TYPES.includes(employmentType)) return res.status(400).json({ error: 'Invalid employment type' });
        if (salaryCurrency && !EMP_CERT_CURRENCIES.includes(salaryCurrency)) return res.status(400).json({ error: 'Invalid currency' });
        certs[idx] = {
            ...certs[idx],
            employeeName: employeeName !== undefined ? employeeName.trim() : certs[idx].employeeName,
            employeeEmail: employeeEmail !== undefined ? employeeEmail.trim() : certs[idx].employeeEmail,
            dateOfBirth: dateOfBirth !== undefined ? dateOfBirth : certs[idx].dateOfBirth,
            address: address !== undefined ? address.trim() : certs[idx].address,
            jobTitle: jobTitle !== undefined ? jobTitle.trim() : certs[idx].jobTitle,
            department: department !== undefined ? department.trim() : certs[idx].department,
            employmentType: employmentType !== undefined ? employmentType : certs[idx].employmentType,
            entity: entity || certs[idx].entity,
            startDate: startDate !== undefined ? startDate : certs[idx].startDate,
            endDate: endDate !== undefined ? endDate : certs[idx].endDate,
            certificateType: certificateType || certs[idx].certificateType,
            status: status || certs[idx].status,
            salary: salary !== undefined ? salary.toString().trim() : certs[idx].salary,
            salaryCurrency: salaryCurrency || certs[idx].salaryCurrency,
            authorizedSignatory: authorizedSignatory !== undefined ? authorizedSignatory.trim() : certs[idx].authorizedSignatory,
            signatoryTitle: signatoryTitle !== undefined ? signatoryTitle.trim() : certs[idx].signatoryTitle,
            issueDate: issueDate !== undefined ? issueDate : certs[idx].issueDate,
            notes: notes !== undefined ? notes.trim() : certs[idx].notes,
            updatedAt: new Date().toISOString()
        };
        await db.setCollection('employment_certificates', certs);
        res.json(certs[idx]);
    } catch {
        res.status(500).json({ error: 'Error updating employment certificate' });
    }
});

app.delete('/api/employment-certificates/:id', strictLimiter, async (req, res) => {
    try {
        const certs = await db.getCollection('employment_certificates');
        const idx = certs.findIndex(c => c.id === req.params.id);
        if (idx === -1) return res.status(404).json({ error: 'Employment certificate not found' });
        certs.splice(idx, 1);
        await db.setCollection('employment_certificates', certs);
        res.json({ message: 'Employment certificate deleted' });
    } catch {
        res.status(500).json({ error: 'Error deleting employment certificate' });
    }
});

// Health check endpoint used by the CI/CD pipeline to verify the deployment
app.get('/health', limiter, async (req, res) => {
    try {
        await db.query('SELECT 1');
        res.json({ status: 'ok', uptime: process.uptime() });
    } catch (err) {
        res.status(503).json({
            status: 'degraded',
            uptime: process.uptime(),
            error: `Database connection failed: ${err.message}`
        });
    }
});

app.listen(PORT, () => {
    console.log(`Innovation Ideas Server running on http://localhost:${PORT}`);
});
