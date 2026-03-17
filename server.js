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
const EMPLOYEES_FILE = path.join(__dirname, 'data', 'employees.json');
const TRAINING_TEMPLATES_FILE = path.join(__dirname, 'data', 'training-templates.json');
const TRAINING_ASSIGNMENTS_FILE = path.join(__dirname, 'data', 'training-assignments.json');

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
            // Skip if already assigned
            if (assignments.some(a => a.trainingId === trainingId && a.employeeId === empId && a.status !== 'completed')) {
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

app.listen(PORT, () => {
    console.log(`Innovation Ideas Server running on http://localhost:${PORT}`);
});
