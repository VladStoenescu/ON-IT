const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const fs = require('fs').promises;
const fsSync = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;
const DATA_FILE = path.join(__dirname, 'data', 'ideas.json');
const TEMPLATES_FILE = path.join(__dirname, 'data', 'onboarding-templates.json');
const PROCESSES_FILE = path.join(__dirname, 'data', 'onboarding-processes.json');

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

// Ensure data directory and files exist
if (!fsSync.existsSync(path.join(__dirname, 'data'))) {
    fsSync.mkdirSync(path.join(__dirname, 'data'), { mode: 0o755 });
}
if (!fsSync.existsSync(DATA_FILE)) {
    fsSync.writeFileSync(DATA_FILE, JSON.stringify([], null, 2));
}
if (!fsSync.existsSync(TEMPLATES_FILE)) {
    fsSync.writeFileSync(TEMPLATES_FILE, JSON.stringify([], null, 2));
}
if (!fsSync.existsSync(PROCESSES_FILE)) {
    fsSync.writeFileSync(PROCESSES_FILE, JSON.stringify([], null, 2));
}

// Helper utilities
function generateId() {
    return `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
}

async function readJson(file) {
    const data = await fs.readFile(file, 'utf8');
    return JSON.parse(data);
}

async function writeJson(file, data) {
    await fs.writeFile(file, JSON.stringify(data, null, 2));
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

// Get all ideas
app.get('/api/ideas', async (req, res) => {
    try {
        const data = await fs.readFile(DATA_FILE, 'utf8');
        const ideas = JSON.parse(data);
        res.json(ideas);
    } catch (error) {
        res.status(500).json({ error: 'Error reading ideas' });
    }
});

// Submit a new idea
app.post('/api/ideas', strictLimiter, async (req, res) => {
    try {
        const { title, description, category, type, submittedBy } = req.body;

        // Validation
        if (!title || !description || !category || !type) {
            return res.status(400).json({ error: 'All fields are required' });
        }

        const data = await fs.readFile(DATA_FILE, 'utf8');
        const ideas = JSON.parse(data);
        
        const newIdea = {
            id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            title,
            description,
            category,
            type,
            submittedBy: submittedBy || 'Anonymous',
            submittedAt: new Date().toISOString(),
            status: 'Pending'
        };

        ideas.push(newIdea);
        await fs.writeFile(DATA_FILE, JSON.stringify(ideas, null, 2));

        res.status(201).json({ message: 'Idea submitted successfully', idea: newIdea });
    } catch (error) {
        res.status(500).json({ error: 'Error submitting idea' });
    }
});

// Get idea by ID
app.get('/api/ideas/:id', async (req, res) => {
    try {
        const data = await fs.readFile(DATA_FILE, 'utf8');
        const ideas = JSON.parse(data);
        const idea = ideas.find(i => i.id === req.params.id);
        
        if (!idea) {
            return res.status(404).json({ error: 'Idea not found' });
        }
        
        res.json(idea);
    } catch (error) {
        res.status(500).json({ error: 'Error reading idea' });
    }
});

// ─── Onboarding Templates API ────────────────────────────────────────────────

app.get('/api/onboarding/templates', async (req, res) => {
    try {
        const templates = await readJson(TEMPLATES_FILE);
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
        const templates = await readJson(TEMPLATES_FILE);
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
        await writeJson(TEMPLATES_FILE, templates);
        res.status(201).json(newTemplate);
    } catch (error) {
        res.status(500).json({ error: 'Error creating template' });
    }
});

app.get('/api/onboarding/templates/:id', async (req, res) => {
    try {
        const templates = await readJson(TEMPLATES_FILE);
        const template = templates.find(t => t.id === req.params.id);
        if (!template) return res.status(404).json({ error: 'Template not found' });
        res.json(template);
    } catch (error) {
        res.status(500).json({ error: 'Error reading template' });
    }
});

app.put('/api/onboarding/templates/:id', strictLimiter, async (req, res) => {
    try {
        const templates = await readJson(TEMPLATES_FILE);
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
        await writeJson(TEMPLATES_FILE, templates);
        res.json(templates[idx]);
    } catch (error) {
        res.status(500).json({ error: 'Error updating template' });
    }
});

app.delete('/api/onboarding/templates/:id', strictLimiter, async (req, res) => {
    try {
        const templates = await readJson(TEMPLATES_FILE);
        const idx = templates.findIndex(t => t.id === req.params.id);
        if (idx === -1) return res.status(404).json({ error: 'Template not found' });
        templates.splice(idx, 1);
        await writeJson(TEMPLATES_FILE, templates);
        res.json({ message: 'Template deleted' });
    } catch (error) {
        res.status(500).json({ error: 'Error deleting template' });
    }
});

// ─── Onboarding Processes API ─────────────────────────────────────────────────

app.get('/api/onboarding/processes', async (req, res) => {
    try {
        const processes = await readJson(PROCESSES_FILE);
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
        const templates = await readJson(TEMPLATES_FILE);
        const template = templates.find(t => t.id === templateId);
        if (!template) return res.status(404).json({ error: 'Template not found' });

        const processes = await readJson(PROCESSES_FILE);
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
        await writeJson(PROCESSES_FILE, processes);
        res.status(201).json(newProcess);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error creating process' });
    }
});

app.get('/api/onboarding/processes/:id', async (req, res) => {
    try {
        const processes = await readJson(PROCESSES_FILE);
        const proc = processes.find(p => p.id === req.params.id);
        if (!proc) return res.status(404).json({ error: 'Process not found' });
        res.json(proc);
    } catch (error) {
        res.status(500).json({ error: 'Error reading process' });
    }
});

app.put('/api/onboarding/processes/:id', strictLimiter, async (req, res) => {
    try {
        const processes = await readJson(PROCESSES_FILE);
        const idx = processes.findIndex(p => p.id === req.params.id);
        if (idx === -1) return res.status(404).json({ error: 'Process not found' });
        const { status } = req.body;
        if (status) {
            processes[idx].status = status;
            if (status === 'completed' || status === 'cancelled') {
                processes[idx].completedAt = new Date().toISOString();
            }
        }
        await writeJson(PROCESSES_FILE, processes);
        res.json(processes[idx]);
    } catch (error) {
        res.status(500).json({ error: 'Error updating process' });
    }
});

app.put('/api/onboarding/processes/:id/steps/:stepId', strictLimiter, async (req, res) => {
    try {
        const processes = await readJson(PROCESSES_FILE);
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

        await writeJson(PROCESSES_FILE, processes);
        res.json(processes[procIdx]);
    } catch (error) {
        res.status(500).json({ error: 'Error updating step' });
    }
});

// ─── KPIs API ─────────────────────────────────────────────────────────────────

app.get('/api/onboarding/kpis', async (req, res) => {
    try {
        const processes = await readJson(PROCESSES_FILE);
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

app.listen(PORT, () => {
    console.log(`Innovation Ideas Server running on http://localhost:${PORT}`);
});
