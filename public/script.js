// API Base URL
const API_URL = '/api';

// Constants
const MESSAGE_DISPLAY_DURATION = 5000; // milliseconds

// Store all ideas for filtering
let allIdeas = [];

// Tab switching
function showTab(tabName, event) {
    // Hide all tabs
    document.querySelectorAll('.tab-content').forEach(tab => {
        tab.classList.remove('active');
    });
    document.querySelectorAll('.tab-button').forEach(button => {
        button.classList.remove('active');
    });

    // Show selected tab
    document.getElementById(`${tabName}-tab`).classList.add('active');
    if (event && event.target) {
        event.target.classList.add('active');
    }

    // Load ideas when viewing the ideas tab
    if (tabName === 'view') {
        loadIdeas();
    }
}

// Form submission
document.getElementById('idea-form').addEventListener('submit', async (e) => {
    e.preventDefault();

    const formData = {
        title: document.getElementById('title').value,
        description: document.getElementById('description').value,
        category: document.getElementById('category').value,
        type: document.getElementById('type').value,
        submittedBy: document.getElementById('submittedBy').value
    };

    try {
        const response = await fetch(`${API_URL}/ideas`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(formData)
        });

        const data = await response.json();

        if (response.ok) {
            showMessage('success', 'Your idea has been submitted successfully!');
            document.getElementById('idea-form').reset();
            setTimeout(() => hideMessage('success'), MESSAGE_DISPLAY_DURATION);
        } else {
            showMessage('error', data.error || 'Error submitting idea');
            setTimeout(() => hideMessage('error'), MESSAGE_DISPLAY_DURATION);
        }
    } catch (error) {
        showMessage('error', 'Error connecting to server');
        setTimeout(() => hideMessage('error'), MESSAGE_DISPLAY_DURATION);
    }
});

// Show message
function showMessage(type, message) {
    const messageElement = document.getElementById(`${type}-message`);
    if (message) {
        messageElement.textContent = type === 'success' ? '✓ ' + message : '✗ ' + message;
    }
    messageElement.classList.remove('hidden');
}

// Hide message
function hideMessage(type) {
    document.getElementById(`${type}-message`).classList.add('hidden');
}

// Load all ideas
async function loadIdeas() {
    try {
        const response = await fetch(`${API_URL}/ideas`);
        const ideas = await response.json();
        allIdeas = ideas;
        displayIdeas(ideas);
    } catch (error) {
        document.getElementById('ideas-list').innerHTML = 
            '<p class="no-ideas">Error loading ideas. Please try again later.</p>';
    }
}

// Display ideas
function displayIdeas(ideas) {
    const ideasList = document.getElementById('ideas-list');

    if (ideas.length === 0) {
        ideasList.innerHTML = '<p class="no-ideas">No ideas submitted yet. Be the first to share your innovation!</p>';
        return;
    }

    // Sort by newest first
    ideas.sort((a, b) => new Date(b.submittedAt) - new Date(a.submittedAt));

    ideasList.innerHTML = ideas.map(idea => `
        <div class="idea-card">
            <div class="idea-header">
                <div>
                    <div class="idea-title">${escapeHtml(idea.title)}</div>
                    <div class="idea-meta">
                        Submitted by ${escapeHtml(idea.submittedBy)} on ${formatDate(idea.submittedAt)}
                    </div>
                </div>
            </div>
            <div class="idea-description">${escapeHtml(idea.description)}</div>
            <div class="idea-badges">
                <span class="badge category">${escapeHtml(idea.category)}</span>
                <span class="badge type">${escapeHtml(idea.type)}</span>
                <span class="badge status">${escapeHtml(idea.status)}</span>
            </div>
        </div>
    `).join('');
}

// Filter ideas
function filterIdeas() {
    const categoryFilter = document.getElementById('filter-category').value;
    const typeFilter = document.getElementById('filter-type').value;

    let filteredIdeas = allIdeas;

    if (categoryFilter) {
        filteredIdeas = filteredIdeas.filter(idea => idea.category === categoryFilter);
    }

    if (typeFilter) {
        filteredIdeas = filteredIdeas.filter(idea => idea.type === typeFilter);
    }

    displayIdeas(filteredIdeas);
}

// Format date
function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

// Escape HTML to prevent XSS
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Load ideas on page load if on view tab
document.addEventListener('DOMContentLoaded', () => {
    // Initial load is on submit tab, so no need to load ideas yet
});
