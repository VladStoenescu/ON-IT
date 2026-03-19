const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const fs = require('fs').promises;
const fsSync = require('fs');
const path = require('path');

const app = express();
app.set('trust proxy', 1);
const PORT = process.env.PORT || 3000;
const DATA_FILE = path.join(__dirname, 'data', 'ideas.json');
const TEMPLATES_FILE = path.join(__dirname, 'data', 'onboarding-templates.json');
const PROCESSES_FILE = path.join(__dirname, 'data', 'onboarding-processes.json');
const EMPLOYEES_FILE = path.join(__dirname, 'data', 'employees.json');
const TRAINING_TEMPLATES_FILE = path.join(__dirname, 'data', 'training-templates.json');
const TRAINING_ASSIGNMENTS_FILE = path.join(__dirname, 'data', 'training-assignments.json');
const IT_LANDSCAPE_FILE = path.join(__dirname, 'data', 'it-landscape.json');
const IT_ASSETS_FILE = path.join(__dirname, 'data', 'it-assets.json');

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
if (!fsSync.existsSync(EMPLOYEES_FILE)) {
    fsSync.writeFileSync(EMPLOYEES_FILE, JSON.stringify([], null, 2));
}
if (!fsSync.existsSync(TRAINING_TEMPLATES_FILE)) {
    fsSync.writeFileSync(TRAINING_TEMPLATES_FILE, JSON.stringify([], null, 2));
}
if (!fsSync.existsSync(TRAINING_ASSIGNMENTS_FILE)) {
    fsSync.writeFileSync(TRAINING_ASSIGNMENTS_FILE, JSON.stringify([], null, 2));
}
if (!fsSync.existsSync(IT_LANDSCAPE_FILE)) {
    fsSync.writeFileSync(IT_LANDSCAPE_FILE, JSON.stringify([], null, 2));
}
if (!fsSync.existsSync(IT_ASSETS_FILE)) {
    fsSync.writeFileSync(IT_ASSETS_FILE, JSON.stringify([], null, 2));
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

// ─── Employees API ────────────────────────────────────────────────────────────

app.get('/api/employees', async (req, res) => {
    try {
        const employees = await readJson(EMPLOYEES_FILE);
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
        const employees = await readJson(EMPLOYEES_FILE);
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
        await writeJson(EMPLOYEES_FILE, employees);
        res.status(201).json(newEmployee);
    } catch (error) {
        res.status(500).json({ error: 'Error creating employee' });
    }
});

app.put('/api/employees/:id', strictLimiter, async (req, res) => {
    try {
        const employees = await readJson(EMPLOYEES_FILE);
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
        await writeJson(EMPLOYEES_FILE, employees);
        res.json(employees[idx]);
    } catch (error) {
        res.status(500).json({ error: 'Error updating employee' });
    }
});

app.delete('/api/employees/:id', strictLimiter, async (req, res) => {
    try {
        const employees = await readJson(EMPLOYEES_FILE);
        const idx = employees.findIndex(e => e.id === req.params.id);
        if (idx === -1) return res.status(404).json({ error: 'Employee not found' });
        employees.splice(idx, 1);
        await writeJson(EMPLOYEES_FILE, employees);
        res.json({ message: 'Employee deleted' });
    } catch (error) {
        res.status(500).json({ error: 'Error deleting employee' });
    }
});

// ─── Training Templates API ───────────────────────────────────────────────────

app.get('/api/trainings/templates', async (req, res) => {
    try {
        const templates = await readJson(TRAINING_TEMPLATES_FILE);
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
        const templates = await readJson(TRAINING_TEMPLATES_FILE);
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
        await writeJson(TRAINING_TEMPLATES_FILE, templates);
        res.status(201).json(newTemplate);
    } catch (error) {
        res.status(500).json({ error: 'Error creating training template' });
    }
});

app.get('/api/trainings/templates/:id', async (req, res) => {
    try {
        const templates = await readJson(TRAINING_TEMPLATES_FILE);
        const template = templates.find(t => t.id === req.params.id);
        if (!template) return res.status(404).json({ error: 'Training template not found' });
        res.json(template);
    } catch (error) {
        res.status(500).json({ error: 'Error reading training template' });
    }
});

app.put('/api/trainings/templates/:id', strictLimiter, async (req, res) => {
    try {
        const templates = await readJson(TRAINING_TEMPLATES_FILE);
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
        await writeJson(TRAINING_TEMPLATES_FILE, templates);
        res.json(templates[idx]);
    } catch (error) {
        res.status(500).json({ error: 'Error updating training template' });
    }
});

app.delete('/api/trainings/templates/:id', strictLimiter, async (req, res) => {
    try {
        const templates = await readJson(TRAINING_TEMPLATES_FILE);
        const idx = templates.findIndex(t => t.id === req.params.id);
        if (idx === -1) return res.status(404).json({ error: 'Training template not found' });
        templates.splice(idx, 1);
        await writeJson(TRAINING_TEMPLATES_FILE, templates);
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
        const assignments = await readJson(TRAINING_ASSIGNMENTS_FILE);
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
        const templates = await readJson(TRAINING_TEMPLATES_FILE);
        const training = templates.find(t => t.id === trainingId);
        if (!training) return res.status(404).json({ error: 'Training template not found' });

        const employees = await readJson(EMPLOYEES_FILE);
        const assignments = await readJson(TRAINING_ASSIGNMENTS_FILE);
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

        await writeJson(TRAINING_ASSIGNMENTS_FILE, assignments);
        res.status(201).json(newAssignments);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error creating assignments' });
    }
});

app.get('/api/trainings/assignments/:id', async (req, res) => {
    try {
        const assignments = await readJson(TRAINING_ASSIGNMENTS_FILE);
        const assignment = assignments.find(a => a.id === req.params.id);
        if (!assignment) return res.status(404).json({ error: 'Assignment not found' });
        res.json(assignment);
    } catch (error) {
        res.status(500).json({ error: 'Error reading assignment' });
    }
});

app.put('/api/trainings/assignments/:id', strictLimiter, async (req, res) => {
    try {
        const assignments = await readJson(TRAINING_ASSIGNMENTS_FILE);
        const idx = assignments.findIndex(a => a.id === req.params.id);
        if (idx === -1) return res.status(404).json({ error: 'Assignment not found' });

        const { status, quizAnswers } = req.body;
        const assignment = assignments[idx];

        if (status) assignment.status = status;

        if (quizAnswers !== undefined) {
            assignment.quizAnswers = quizAnswers;
            // Calculate score if quiz answers provided
            const templates = await readJson(TRAINING_TEMPLATES_FILE);
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

        await writeJson(TRAINING_ASSIGNMENTS_FILE, assignments);
        res.json(assignments[idx]);
    } catch (error) {
        res.status(500).json({ error: 'Error updating assignment' });
    }
});

// ─── Training KPIs API ────────────────────────────────────────────────────────

app.get('/api/trainings/kpis', async (req, res) => {
    try {
        const assignments = computeOverdueAssignments(await readJson(TRAINING_ASSIGNMENTS_FILE));
        const employees = await readJson(EMPLOYEES_FILE);
        const templates = await readJson(TRAINING_TEMPLATES_FILE);

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
        const tools = await readJson(IT_LANDSCAPE_FILE);
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
        const tools = await readJson(IT_LANDSCAPE_FILE);
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
        await writeJson(IT_LANDSCAPE_FILE, tools);
        res.status(201).json(newTool);
    } catch (error) {
        res.status(500).json({ error: 'Error creating IT tool' });
    }
});

app.put('/api/it-landscape/:id', strictLimiter, async (req, res) => {
    try {
        const tools = await readJson(IT_LANDSCAPE_FILE);
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
        await writeJson(IT_LANDSCAPE_FILE, tools);
        res.json(tools[idx]);
    } catch (error) {
        res.status(500).json({ error: 'Error updating IT tool' });
    }
});

app.delete('/api/it-landscape/:id', strictLimiter, async (req, res) => {
    try {
        const tools = await readJson(IT_LANDSCAPE_FILE);
        const idx = tools.findIndex(t => t.id === req.params.id);
        if (idx === -1) return res.status(404).json({ error: 'IT tool not found' });
        tools.splice(idx, 1);
        await writeJson(IT_LANDSCAPE_FILE, tools);
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

app.get('/api/it-assets', async (req, res) => {
    try {
        const assets = await readJson(IT_ASSETS_FILE);
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
        const assets = await readJson(IT_ASSETS_FILE);
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
        await writeJson(IT_ASSETS_FILE, assets);
        res.status(201).json(newAsset);
    } catch (error) {
        res.status(500).json({ error: 'Error creating IT asset' });
    }
});

app.put('/api/it-assets/:id', strictLimiter, async (req, res) => {
    try {
        const assets = await readJson(IT_ASSETS_FILE);
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
        await writeJson(IT_ASSETS_FILE, assets);
        res.json(assets[idx]);
    } catch (error) {
        res.status(500).json({ error: 'Error updating IT asset' });
    }
});

app.delete('/api/it-assets/:id', strictLimiter, async (req, res) => {
    try {
        const assets = await readJson(IT_ASSETS_FILE);
        const idx = assets.findIndex(a => a.id === req.params.id);
        if (idx === -1) return res.status(404).json({ error: 'IT asset not found' });
        assets.splice(idx, 1);
        await writeJson(IT_ASSETS_FILE, assets);
        res.json({ message: 'IT asset deleted' });
    } catch (error) {
        res.status(500).json({ error: 'Error deleting IT asset' });
    }
});

app.get('/api/it-assets/kpis', async (req, res) => {
    try {
        const assets = await readJson(IT_ASSETS_FILE);
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

// Health check endpoint used by the CI/CD pipeline to verify the deployment
app.get('/health', (req, res) => {
    res.json({ status: 'ok', uptime: process.uptime() });
});

app.listen(PORT, () => {
    console.log(`Innovation Ideas Server running on http://localhost:${PORT}`);
});
