const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;
const DATA_FILE = path.join(__dirname, 'data', 'ideas.json');

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(express.static('public'));

// Ensure data directory and file exist
if (!fs.existsSync(path.join(__dirname, 'data'))) {
    fs.mkdirSync(path.join(__dirname, 'data'));
}
if (!fs.existsSync(DATA_FILE)) {
    fs.writeFileSync(DATA_FILE, JSON.stringify([], null, 2));
}

// Get all ideas
app.get('/api/ideas', (req, res) => {
    try {
        const ideas = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
        res.json(ideas);
    } catch (error) {
        res.status(500).json({ error: 'Error reading ideas' });
    }
});

// Submit a new idea
app.post('/api/ideas', (req, res) => {
    try {
        const { title, description, category, type, submittedBy } = req.body;

        // Validation
        if (!title || !description || !category || !type) {
            return res.status(400).json({ error: 'All fields are required' });
        }

        const ideas = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
        
        const newIdea = {
            id: Date.now().toString(),
            title,
            description,
            category,
            type,
            submittedBy: submittedBy || 'Anonymous',
            submittedAt: new Date().toISOString(),
            status: 'Pending'
        };

        ideas.push(newIdea);
        fs.writeFileSync(DATA_FILE, JSON.stringify(ideas, null, 2));

        res.status(201).json({ message: 'Idea submitted successfully', idea: newIdea });
    } catch (error) {
        res.status(500).json({ error: 'Error submitting idea' });
    }
});

// Get idea by ID
app.get('/api/ideas/:id', (req, res) => {
    try {
        const ideas = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
        const idea = ideas.find(i => i.id === req.params.id);
        
        if (!idea) {
            return res.status(404).json({ error: 'Idea not found' });
        }
        
        res.json(idea);
    } catch (error) {
        res.status(500).json({ error: 'Error reading idea' });
    }
});

app.listen(PORT, () => {
    console.log(`Innovation Ideas Server running on http://localhost:${PORT}`);
});
