// API Base URL
const API_URL = '/api';

// Constants
const MESSAGE_DISPLAY_DURATION = 5000; // milliseconds
const MOBILE_BREAKPOINT = 1024; // matches CSS media query in styles.css
const PAGE_TITLES = {
    home: 'Home',
    submit: 'Submit Idea',
    view: 'View Ideas',
    onboarding: 'Onboarding',
    trainings: 'Trainings',
    landscape: 'IT Landscape',
    assets: 'IT Asset Inventory',
    skills: 'Skills & Talent',
    crm: 'CRM Contacts',
    pipeline: 'Sales Pipeline',
    processes: 'Process Ownership Map',
    partnerships: 'Partnerships',
    meetings: 'Meetings',
    evaluations: 'Evaluations',
    'open-positions': 'Open Positions'
};

// Store all ideas for filtering
let allIdeas = [];

// Store all IT tools for filtering
let allITTools = [];

// Store all IT assets for filtering
let allITAssets = [];

// Store all CRM contacts and deals for filtering
let allCRMContacts = [];
let allCRMDeals = [];

// Store all process ownership entries for filtering
let allProcessOwnership = [];

// Store all partnerships for filtering
let allPartnerships = [];

// Store all meetings for filtering
let allMeetings = [];

// Store all evaluations for filtering
let allEvaluations = [];

// Store all open positions for filtering
let allOpenPositions = [];

// ─── Navigation ──────────────────────────────────────────────────────────────

function showTab(tabName) {
    // Hide all sections
    document.querySelectorAll('.tab-content').forEach(tab => tab.classList.remove('active'));

    // Update sidebar nav active state
    document.querySelectorAll('.nav-item').forEach(item => item.classList.remove('active'));
    const navItem = document.querySelector(`.nav-item[data-section="${tabName}"]`);
    if (navItem) navItem.classList.add('active');

    // Update topbar page title
    const titleEl = document.getElementById('page-title');
    if (titleEl) titleEl.textContent = PAGE_TITLES[tabName] || tabName;

    // Show selected section
    const tabEl = document.getElementById(`${tabName}-tab`);
    if (tabEl) tabEl.classList.add('active');

    // Load data for the selected section
    if (tabName === 'view') loadIdeas();
    if (tabName === 'onboarding') {
        loadOnboardingDashboard();
        loadTemplates();
        loadProcesses();
        populateTemplateDropdown();
    }
    if (tabName === 'trainings') {
        loadTrainingDashboard();
        loadEmployees();
        loadTrainingTemplates();
        loadAssignments();
    }
    if (tabName === 'landscape') {
        loadITLandscape();
    }
    if (tabName === 'assets') {
        loadITAssets();
    }
    if (tabName === 'skills') {
        loadSkillProfiles();
        loadSkillCategoriesForFilter();
    }
    if (tabName === 'crm') {
        loadCRMContacts();
    }
    if (tabName === 'pipeline') {
        loadSalesPipeline();
    }
    if (tabName === 'processes') {
        loadProcessOwnership();
    }
    if (tabName === 'partnerships') {
        loadPartnerships();
    }
    if (tabName === 'meetings') {
        loadMeetings();
    }
    if (tabName === 'evaluations') {
        loadEvaluations();
    }
    if (tabName === 'open-positions') {
        loadOpenPositions();
    }

    // Close sidebar on mobile after navigating
    if (window.innerWidth < MOBILE_BREAKPOINT) closeSidebar();
}

function toggleSidebar() {
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('sidebar-overlay');
    const toggleButton = document.querySelector('[data-toggle="sidebar"], [aria-controls="sidebar"]');

    const isOpen = sidebar.classList.contains('open');

    if (isOpen) {
        sidebar.classList.remove('open');
        overlay.classList.remove('active');
        if (toggleButton) {
            toggleButton.setAttribute('aria-expanded', 'false');
        }
    } else {
        sidebar.classList.add('open');
        overlay.classList.add('active');
        if (toggleButton) {
            toggleButton.setAttribute('aria-expanded', 'true');
        }
    }
}

function closeSidebar() {
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('sidebar-overlay');
    const toggleButton = document.querySelector('[data-toggle="sidebar"], [aria-controls="sidebar"]');

    sidebar.classList.remove('open');
    overlay.classList.remove('active');

    if (toggleButton) {
        toggleButton.setAttribute('aria-expanded', 'false');
    }
}

// ─── Ideas: existing functionality ───────────────────────────────────────────

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
            headers: { 'Content-Type': 'application/json' },
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

function showMessage(type, message) {
    const el = document.getElementById(`${type}-message`);
    if (message) el.textContent = (type === 'success' ? '✓ ' : '✗ ') + message;
    el.classList.remove('hidden');
}

function hideMessage(type) {
    document.getElementById(`${type}-message`).classList.add('hidden');
}

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

function displayIdeas(ideas) {
    const ideasList = document.getElementById('ideas-list');
    if (ideas.length === 0) {
        ideasList.innerHTML = '<p class="no-ideas">No ideas submitted yet. Be the first to share your innovation!</p>';
        return;
    }
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

function filterIdeas() {
    const categoryFilter = document.getElementById('filter-category').value;
    const typeFilter = document.getElementById('filter-type').value;
    let filtered = allIdeas;
    if (categoryFilter) filtered = filtered.filter(i => i.category === categoryFilter);
    if (typeFilter) filtered = filtered.filter(i => i.type === typeFilter);
    displayIdeas(filtered);
}

function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// ─── Onboarding: state ────────────────────────────────────────────────────────

let allTemplates = [];
let allProcesses = [];

// ─── Onboarding: sub-navigation ──────────────────────────────────────────────

function showObSection(section, btn) {
    document.querySelectorAll('.ob-section').forEach(s => s.classList.remove('active'));
    document.querySelectorAll('.sub-tab-btn').forEach(b => b.classList.remove('active'));
    document.getElementById(`ob-${section}`).classList.add('active');
    if (btn) btn.classList.add('active');
}

// ─── Dashboard / KPIs ────────────────────────────────────────────────────────

async function loadOnboardingDashboard() {
    try {
        const res = await fetch(`${API_URL}/onboarding/kpis`);
        const kpis = await res.json();
        renderKpiCards(kpis);
        renderEntityChart(kpis.byEntity);
        renderRecentProcesses(kpis.recentProcesses);
    } catch (e) {
        document.getElementById('kpi-cards').innerHTML = '<p class="no-ideas">Error loading dashboard.</p>';
    }
}

function renderKpiCards(kpis) {
    const red = '#C8312B';
    const green = '#2e7d32';
    const amber = '#c45800';
    const cards = [
        { label: 'Total Processes', value: kpis.totalProcesses, icon: '📁', color: red },
        { label: 'Active', value: kpis.activeProcesses, icon: '⚙️', color: red },
        { label: 'Completed', value: kpis.completedProcesses, icon: '✅', color: green },
        { label: 'Completion Rate', value: kpis.completionRate + '%', icon: '📈', color: red },
        { label: 'Avg. Days to Complete', value: kpis.avgCompletionDays || '—', icon: '⏱️', color: amber },
        { label: 'Overdue Steps', value: kpis.overdueSteps, icon: '⚠️', color: kpis.overdueSteps > 0 ? red : green },
        { label: 'Steps Completed Late', value: kpis.completedLateSteps, icon: '🕐', color: amber },
        { label: 'Onboarding / Offboarding', value: `${kpis.onboardingCount} / ${kpis.offboardingCount}`, icon: '👥', color: red }
    ];
    document.getElementById('kpi-cards').innerHTML = cards.map(c => `
        <div class="kpi-card" style="border-top:3px solid ${c.color}">
            <div class="kpi-icon">${c.icon}</div>
            <div class="kpi-value" style="color:${c.color}">${c.value}</div>
            <div class="kpi-label">${c.label}</div>
        </div>
    `).join('');
}

function renderEntityChart(byEntity) {
    const container = document.getElementById('entity-chart');
    if (!byEntity || Object.keys(byEntity).length === 0) {
        container.innerHTML = '<p class="no-data">No data yet.</p>';
        return;
    }
    container.innerHTML = Object.entries(byEntity).map(([entity, counts]) => {
        const total = counts.active + counts.completed + counts.cancelled;
        return `
        <div class="entity-bar-row">
            <div class="entity-bar-label">${escapeHtml(entity)}</div>
            <div class="entity-bar-track">
                <div class="entity-bar-fill active-fill" style="width:${total > 0 ? (counts.active/total)*100 : 0}%" title="Active: ${counts.active}"></div>
                <div class="entity-bar-fill completed-fill" style="width:${total > 0 ? (counts.completed/total)*100 : 0}%" title="Completed: ${counts.completed}"></div>
            </div>
            <div class="entity-bar-counts">
                <span class="ebc-active">● ${counts.active} active</span>
                <span class="ebc-done">● ${counts.completed} done</span>
            </div>
        </div>`;
    }).join('');
}

function renderRecentProcesses(list) {
    const container = document.getElementById('recent-processes');
    if (!list || list.length === 0) {
        container.innerHTML = '<p class="no-data">No processes yet.</p>';
        return;
    }
    container.innerHTML = list.map(p => `
        <div class="recent-proc-row" data-process-id="${p.id}">
            <div class="rp-info">
                <span class="rp-name">${escapeHtml(p.employeeName)}</span>
                <span class="rp-meta">${escapeHtml(p.entity)} · ${p.type}</span>
            </div>
            <div class="rp-right">
                <span class="proc-status-badge ${p.status}">${statusLabel(p.status)}</span>
                <div class="mini-progress">
                    <div class="mini-progress-fill" style="width:${p.progress}%"></div>
                </div>
                <span class="rp-pct">${p.progress}%</span>
            </div>
        </div>
    `).join('');
}

function handleRecentProcessClick(e) {
    const row = e.target.closest('[data-process-id]');
    if (row) openProcessModal(row.dataset.processId);
}

// ─── Templates ────────────────────────────────────────────────────────────────

async function loadTemplates() {
    try {
        const res = await fetch(`${API_URL}/onboarding/templates`);
        allTemplates = await res.json();
        renderTemplates();
    } catch (e) {
        document.getElementById('templates-list').innerHTML = '<p class="no-ideas">Error loading templates.</p>';
    }
}

function renderTemplates() {
    const container = document.getElementById('templates-list');
    if (allTemplates.length === 0) {
        container.innerHTML = '<p class="no-data">No templates yet. Click "New Template" to create one.</p>';
        return;
    }
    container.innerHTML = allTemplates.map(t => `
        <div class="template-card">
            <div class="tpl-card-header">
                <div>
                    <span class="tpl-name">${escapeHtml(t.name)}</span>
                    <span class="badge ${t.type === 'onboarding' ? 'ob-badge' : 'off-badge'}">${t.type}</span>
                </div>
                <div class="tpl-actions">
                    <button class="btn-icon" data-action="edit" data-template-id="${t.id}" title="Edit">✏️</button>
                    <button class="btn-icon btn-danger" data-action="delete" data-template-id="${t.id}" title="Delete">🗑️</button>
                </div>
            </div>
            <div class="tpl-entities">
                ${t.entities.map(e => `<span class="entity-chip">${escapeHtml(e)}</span>`).join('')}
            </div>
            ${t.description ? `<div class="tpl-desc">${escapeHtml(t.description)}</div>` : ''}
            <div class="tpl-steps-summary">
                <strong>${t.steps.length}</strong> step${t.steps.length !== 1 ? 's' : ''} · 
                Created ${formatDate(t.createdAt)}
            </div>
            <div class="tpl-steps-list">
                ${t.steps.map(s => `
                    <div class="tpl-step-row">
                        <span class="step-order">${s.order}</span>
                        <span class="step-name">${escapeHtml(s.name)}</span>
                        <span class="step-owner">👤 ${escapeHtml(s.owner)}</span>
                        <span class="step-due">+${s.dueDaysOffset}d</span>
                    </div>
                `).join('')}
            </div>
        </div>
    `).join('');
}

function handleTemplateListClick(e) {
    const btn = e.target.closest('[data-action]');
    if (!btn) return;
    const id = btn.dataset.templateId;
    if (btn.dataset.action === 'edit') editTemplate(id);
    else if (btn.dataset.action === 'delete') deleteTemplate(id);
}

// ─── Template Modal ───────────────────────────────────────────────────────────

let stepCounter = 0;

function openTemplateModal(templateData) {
    document.getElementById('tpl-edit-id').value = '';
    document.getElementById('tpl-name').value = '';
    document.getElementById('tpl-type').value = '';
    document.getElementById('tpl-desc').value = '';
    document.querySelectorAll('[name="tpl-entity"]').forEach(cb => cb.checked = false);
    document.getElementById('steps-container').innerHTML = '';
    stepCounter = 0;

    if (templateData) {
        document.getElementById('modal-title').textContent = 'Edit Template';
        document.getElementById('tpl-edit-id').value = templateData.id;
        document.getElementById('tpl-name').value = templateData.name;
        document.getElementById('tpl-type').value = templateData.type;
        document.getElementById('tpl-desc').value = templateData.description || '';
        document.querySelectorAll('[name="tpl-entity"]').forEach(cb => {
            cb.checked = templateData.entities.includes(cb.value);
        });
        templateData.steps.forEach(s => addStepRow(s));
    } else {
        document.getElementById('modal-title').textContent = 'New Template';
        addStepRow();
    }
    document.getElementById('template-modal').classList.remove('hidden');
}

function closeTemplateModal() {
    document.getElementById('template-modal').classList.add('hidden');
}

function closeTemplateModalOnBg(e) {
    if (e.target === document.getElementById('template-modal')) closeTemplateModal();
}

function addStepRow(step) {
    stepCounter++;
    const idx = stepCounter;
    const div = document.createElement('div');
    div.className = 'step-row';
    div.id = `step-row-${idx}`;
    div.innerHTML = `
        <div class="step-row-num">${idx}</div>
        <div class="step-row-fields">
            <div class="form-row">
                <div class="form-group">
                    <label>Step Name *</label>
                    <input type="text" class="step-name-input" required placeholder="e.g. IT Account Setup" value="${step ? escapeHtml(step.name) : ''}">
                </div>
                <div class="form-group">
                    <label>Owner *</label>
                    <input type="text" class="step-owner-input" required placeholder="e.g. IT Team" value="${step ? escapeHtml(step.owner) : ''}">
                </div>
            </div>
            <div class="form-row">
                <div class="form-group">
                    <label>Owner Email</label>
                    <input type="email" class="step-email-input" placeholder="it@company.com" value="${step ? escapeHtml(step.ownerEmail) : ''}">
                </div>
                <div class="form-group">
                    <label>Due (days from start) *</label>
                    <input type="number" class="step-days-input" required min="1" value="${step ? step.dueDaysOffset : 1}">
                </div>
            </div>
            <div class="form-group">
                <label>Description</label>
                <input type="text" class="step-desc-input" placeholder="Brief description" value="${step ? escapeHtml(step.description) : ''}">
            </div>
        </div>
        <button type="button" class="btn-remove-step" onclick="removeStepRow(${idx})" title="Remove step">✕</button>
    `;
    document.getElementById('steps-container').appendChild(div);
}

function removeStepRow(idx) {
    const el = document.getElementById(`step-row-${idx}`);
    if (el) el.remove();
}

async function submitTemplate(e) {
    e.preventDefault();
    const name = document.getElementById('tpl-name').value.trim();
    const type = document.getElementById('tpl-type').value;
    const desc = document.getElementById('tpl-desc').value.trim();
    const entities = [...document.querySelectorAll('[name="tpl-entity"]:checked')].map(cb => cb.value);
    const editId = document.getElementById('tpl-edit-id').value;

    if (entities.length === 0) { alert('Please select at least one entity.'); return; }

    const stepRows = document.querySelectorAll('.step-row');
    if (stepRows.length === 0) { alert('Please add at least one step.'); return; }

    const steps = [...stepRows].map(row => ({
        id: row.dataset.stepId || undefined,
        name: row.querySelector('.step-name-input').value.trim(),
        owner: row.querySelector('.step-owner-input').value.trim(),
        ownerEmail: row.querySelector('.step-email-input').value.trim(),
        dueDaysOffset: parseInt(row.querySelector('.step-days-input').value, 10) || 1,
        description: row.querySelector('.step-desc-input').value.trim()
    }));

    if (steps.some(s => !s.name || !s.owner)) { alert('Each step must have a name and owner.'); return; }

    const payload = { name, type, entities, description: desc, steps };
    const url = editId ? `${API_URL}/onboarding/templates/${editId}` : `${API_URL}/onboarding/templates`;
    const method = editId ? 'PUT' : 'POST';

    try {
        const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
        if (!res.ok) { const d = await res.json(); alert(d.error || 'Error saving template'); return; }
        closeTemplateModal();
        await loadTemplates();
        await populateTemplateDropdown();
    } catch (err) {
        alert('Error saving template');
    }
}

async function editTemplate(id) {
    const tpl = allTemplates.find(t => t.id === id);
    if (tpl) openTemplateModal(tpl);
}

async function deleteTemplate(id) {
    if (!confirm('Delete this template? This cannot be undone.')) return;
    try {
        const res = await fetch(`${API_URL}/onboarding/templates/${id}`, { method: 'DELETE' });
        if (res.ok) { await loadTemplates(); await populateTemplateDropdown(); }
        else { const d = await res.json(); alert(d.error || 'Error deleting template'); }
    } catch (e) {
        alert('Error deleting template');
    }
}

// ─── Processes ────────────────────────────────────────────────────────────────

async function loadProcesses() {
    try {
        const res = await fetch(`${API_URL}/onboarding/processes`);
        allProcesses = await res.json();
        renderProcesses();
    } catch (e) {
        document.getElementById('processes-list').innerHTML = '<p class="no-ideas">Error loading processes.</p>';
    }
}

function renderProcesses() {
    const typeFilter = document.getElementById('proc-filter-type').value;
    const entityFilter = document.getElementById('proc-filter-entity').value;
    const statusFilter = document.getElementById('proc-filter-status').value;

    let list = allProcesses;
    if (typeFilter) list = list.filter(p => p.type === typeFilter);
    if (entityFilter) list = list.filter(p => p.entity === entityFilter);
    if (statusFilter) list = list.filter(p => p.status === statusFilter);

    const container = document.getElementById('processes-list');
    if (list.length === 0) {
        container.innerHTML = '<p class="no-data">No processes found.</p>';
        return;
    }
    list.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    container.innerHTML = list.map(p => {
        const done = p.steps.filter(s => s.status === 'completed').length;
        const total = p.steps.length;
        const pct = total > 0 ? Math.round((done / total) * 100) : 0;
        const overdue = p.steps.filter(s => s.status === 'overdue').length;
        return `
        <div class="process-card" data-process-id="${p.id}">
            <div class="proc-card-header">
                <div class="proc-emp">
                    <span class="proc-emp-name">${escapeHtml(p.employeeName)}</span>
                    ${p.employeeRole ? `<span class="proc-role">${escapeHtml(p.employeeRole)}</span>` : ''}
                </div>
                <span class="proc-status-badge ${p.status}">${statusLabel(p.status)}</span>
            </div>
            <div class="proc-meta-row">
                <span class="badge ${p.type === 'onboarding' ? 'ob-badge' : 'off-badge'}">${p.type}</span>
                <span class="entity-chip">${escapeHtml(p.entity)}</span>
                <span class="proc-date">Start: ${escapeHtml(p.startDate)}</span>
                ${overdue > 0 ? `<span class="overdue-warn">⚠️ ${overdue} overdue</span>` : ''}
            </div>
            <div class="proc-progress-row">
                <div class="progress-bar-track">
                    <div class="progress-bar-fill" style="width:${pct}%"></div>
                </div>
                <span class="progress-label">${done}/${total} steps · ${pct}%</span>
            </div>
        </div>`;
    }).join('');
}

function handleProcessListClick(e) {
    const card = e.target.closest('[data-process-id]');
    if (card) openProcessModal(card.dataset.processId);
}

// ─── Process Detail Modal ─────────────────────────────────────────────────────

async function openProcessModal(id) {
    const proc = allProcesses.find(p => p.id === id);
    if (!proc) return;
    document.getElementById('proc-modal-title').textContent =
        `${proc.type === 'onboarding' ? '📥' : '📤'} ${escapeHtml(proc.employeeName)} — ${escapeHtml(proc.templateName)}`;
    document.getElementById('proc-modal-body').innerHTML = renderProcessDetail(proc);
    document.getElementById('process-modal').classList.remove('hidden');
}

function handleModalBodyClick(e) {
    const btn = e.target.closest('[data-action]');
    if (!btn) return;
    const action = btn.dataset.action;
    if (action === 'step-done') {
        const stepsList = btn.closest('[data-proc-id]');
        if (stepsList) updateStep(stepsList.dataset.procId, btn.dataset.stepId, 'completed');
    } else if (action === 'step-start') {
        const stepsList = btn.closest('[data-proc-id]');
        if (stepsList) updateStep(stepsList.dataset.procId, btn.dataset.stepId, 'in_progress');
    } else if (action === 'cancel-process') {
        cancelProcess(btn.dataset.procId);
    }
}

function closeProcessModal() {
    document.getElementById('process-modal').classList.add('hidden');
}

function closeProcessModalOnBg(e) {
    if (e.target === document.getElementById('process-modal')) closeProcessModal();
}

function renderProcessDetail(proc) {
    const done = proc.steps.filter(s => s.status === 'completed').length;
    const pct = proc.steps.length > 0 ? Math.round((done / proc.steps.length) * 100) : 0;
    return `
        <div class="proc-detail-meta">
            <div class="pdm-item"><strong>Entity</strong><span>${escapeHtml(proc.entity)}</span></div>
            <div class="pdm-item"><strong>Type</strong><span class="badge ${proc.type === 'onboarding' ? 'ob-badge' : 'off-badge'}">${proc.type}</span></div>
            <div class="pdm-item"><strong>Status</strong><span class="proc-status-badge ${proc.status}">${statusLabel(proc.status)}</span></div>
            <div class="pdm-item"><strong>Start Date</strong><span>${escapeHtml(proc.startDate)}</span></div>
            ${proc.employeeEmail ? `<div class="pdm-item"><strong>Email</strong><span>${escapeHtml(proc.employeeEmail)}</span></div>` : ''}
            ${proc.employeeRole ? `<div class="pdm-item"><strong>Role</strong><span>${escapeHtml(proc.employeeRole)}</span></div>` : ''}
        </div>
        <div class="proc-detail-progress">
            <div class="progress-bar-track">
                <div class="progress-bar-fill" style="width:${pct}%"></div>
            </div>
            <span>${done}/${proc.steps.length} steps completed (${pct}%)</span>
        </div>
        <div class="proc-steps-list" data-proc-id="${proc.id}">
            ${proc.steps.map(s => `
                <div class="proc-step-row ${s.status}" id="psr-${s.id}">
                    <div class="psr-left">
                        <span class="step-order">${s.order}</span>
                        <div class="psr-info">
                            <div class="psr-name">${escapeHtml(s.name)}</div>
                            ${s.description ? `<div class="psr-desc">${escapeHtml(s.description)}</div>` : ''}
                            <div class="psr-meta">👤 ${escapeHtml(s.owner)} · Due: ${escapeHtml(s.dueDate)}
                            ${s.completedAt ? ` · ✅ Done: ${formatDate(s.completedAt)}` : ''}
                            </div>
                        </div>
                    </div>
                    <div class="psr-right">
                        <span class="step-status-badge ${s.status}">${stepStatusLabel(s.status)}</span>
                        ${proc.status === 'in_progress' ? `
                        <div class="psr-actions">
                            ${s.status !== 'completed' ? `<button class="btn-sm btn-success" data-action="step-done" data-step-id="${s.id}">✓ Done</button>` : ''}
                            ${s.status === 'pending' ? `<button class="btn-sm btn-warn" data-action="step-start" data-step-id="${s.id}">▶ Start</button>` : ''}
                        </div>` : ''}
                    </div>
                </div>
            `).join('')}
        </div>
        ${proc.status === 'in_progress' ? `
        <div class="proc-detail-footer">
            <button class="btn-secondary" data-action="cancel-process" data-proc-id="${proc.id}">Cancel Process</button>
        </div>` : ''}
    `;
}

async function updateStep(procId, stepId, status) {
    try {
        const res = await fetch(`${API_URL}/onboarding/processes/${procId}/steps/${stepId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status })
        });
        if (!res.ok) { const d = await res.json(); alert(d.error || 'Error updating step'); return; }
        const updated = await res.json();
        const idx = allProcesses.findIndex(p => p.id === procId);
        if (idx !== -1) allProcesses[idx] = updated;
        document.getElementById('proc-modal-body').innerHTML = renderProcessDetail(updated);
        renderProcesses();
        loadOnboardingDashboard();
    } catch (e) {
        alert('Error updating step');
    }
}

async function cancelProcess(id) {
    if (!confirm('Cancel this process?')) return;
    try {
        const res = await fetch(`${API_URL}/onboarding/processes/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status: 'cancelled' })
        });
        if (!res.ok) return;
        const updated = await res.json();
        const idx = allProcesses.findIndex(p => p.id === id);
        if (idx !== -1) allProcesses[idx] = updated;
        closeProcessModal();
        renderProcesses();
        loadOnboardingDashboard();
    } catch (e) {
        alert('Error cancelling process');
    }
}

// ─── New Process Form ─────────────────────────────────────────────────────────

async function populateTemplateDropdown() {
    if (allTemplates.length === 0) {
        try {
            const res = await fetch(`${API_URL}/onboarding/templates`);
            allTemplates = await res.json();
        } catch (e) { return; }
    }
    filterTemplatesByType();
}

function filterTemplatesByType() {
    const type = document.getElementById('np-type').value;
    const entity = document.getElementById('np-entity').value;
    const sel = document.getElementById('np-template');
    sel.innerHTML = '<option value="">Select a template</option>';

    const filtered = allTemplates.filter(t =>
        (!type || t.type === type) && (!entity || t.entities.includes(entity))
    );
    filtered.forEach(t => {
        const opt = document.createElement('option');
        opt.value = t.id;
        opt.textContent = t.name;
        sel.appendChild(opt);
    });

    if (filtered.length === 0) {
        sel.innerHTML = '<option value="">No templates match the selection</option>';
    }

    showTemplatePreview();
}

function showTemplatePreview() {
    const tplId = document.getElementById('np-template').value;
    const preview = document.getElementById('np-template-preview');
    if (!tplId) { preview.classList.add('hidden'); return; }
    const tpl = allTemplates.find(t => t.id === tplId);
    if (!tpl) { preview.classList.add('hidden'); return; }
    preview.classList.remove('hidden');
    preview.innerHTML = `
        <h4>Template Preview: ${escapeHtml(tpl.name)}</h4>
        <p>${escapeHtml(tpl.description || 'No description')}</p>
        <div class="preview-steps">
            ${tpl.steps.map(s => `
                <div class="preview-step">
                    <span class="step-order">${s.order}</span>
                    <span>${escapeHtml(s.name)}</span>
                    <span class="step-owner">👤 ${escapeHtml(s.owner)}</span>
                    <span class="step-due">+${s.dueDaysOffset}d</span>
                </div>
            `).join('')}
        </div>
    `;
}

document.getElementById('np-template').addEventListener('change', showTemplatePreview);

async function submitNewProcess(e) {
    e.preventDefault();
    const templateId = document.getElementById('np-template').value;
    const employeeName = document.getElementById('np-emp-name').value.trim();
    const employeeEmail = document.getElementById('np-emp-email').value.trim();
    const employeeRole = document.getElementById('np-emp-role').value.trim();
    const entity = document.getElementById('np-entity').value;
    const startDate = document.getElementById('np-start-date').value;

    if (!templateId) { alert('Please select a template.'); return; }

    try {
        const res = await fetch(`${API_URL}/onboarding/processes`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ templateId, employeeName, employeeEmail, employeeRole, entity, startDate })
        });
        const data = await res.json();
        if (res.ok) {
            document.getElementById('np-success').textContent = `✓ Process started for ${employeeName}. ${data.emailsSent.length} notification(s) sent.`;
            document.getElementById('np-success').classList.remove('hidden');
            document.getElementById('np-error').classList.add('hidden');
            document.getElementById('new-process-form').reset();
            document.getElementById('np-template-preview').classList.add('hidden');
            document.getElementById('np-template').innerHTML = '<option value="">Select a template</option>';
            setTimeout(() => document.getElementById('np-success').classList.add('hidden'), MESSAGE_DISPLAY_DURATION);
            await loadProcesses();
            await loadOnboardingDashboard();
        } else {
            document.getElementById('np-error').textContent = '✗ ' + (data.error || 'Error starting process');
            document.getElementById('np-error').classList.remove('hidden');
            setTimeout(() => document.getElementById('np-error').classList.add('hidden'), MESSAGE_DISPLAY_DURATION);
        }
    } catch (err) {
        document.getElementById('np-error').textContent = '✗ Error connecting to server';
        document.getElementById('np-error').classList.remove('hidden');
    }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function statusLabel(status) {
    const labels = { in_progress: 'In Progress', completed: 'Completed', cancelled: 'Cancelled', pending: 'Pending' };
    return labels[status] || status;
}

function stepStatusLabel(status) {
    const labels = { pending: 'Pending', in_progress: 'In Progress', completed: 'Completed', overdue: 'Overdue' };
    return labels[status] || status;
}

// ─── One-time event delegation setup ─────────────────────────────────────────

document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('recent-processes').addEventListener('click', handleRecentProcessClick);
    document.getElementById('templates-list').addEventListener('click', handleTemplateListClick);
    document.getElementById('processes-list').addEventListener('click', handleProcessListClick);
    document.getElementById('proc-modal-body').addEventListener('click', handleModalBodyClick);
    document.getElementById('employees-list').addEventListener('click', handleEmployeeListClick);
    document.getElementById('tr-templates-list').addEventListener('click', handleTrainingTemplateListClick);
    document.getElementById('assignments-list').addEventListener('click', handleAssignmentListClick);
    document.getElementById('take-training-body').addEventListener('click', function(e) {
        const btn = e.target.closest('[data-action="submit-training"]');
        if (btn) submitTrainingAnswers(btn.dataset.assignmentId, btn.dataset.trainingId);
    });
});

// ─── Trainings: state ─────────────────────────────────────────────────────────

let allEmployees = [];
let allTrainingTemplates = [];
let allAssignments = [];
let trainingSectionCounter = 0;

// ─── Trainings: tab/section navigation ───────────────────────────────────────

function showTrainingsSection(section, btn) {
    document.querySelectorAll('#trainings-tab .ob-section').forEach(s => s.classList.remove('active'));
    document.querySelectorAll('#trainings-tab .sub-tab-btn').forEach(b => b.classList.remove('active'));
    document.getElementById(section).classList.add('active');
    if (btn) btn.classList.add('active');
}

// ─── Training Dashboard ───────────────────────────────────────────────────────

async function loadTrainingDashboard() {
    try {
        const res = await fetch(`${API_URL}/trainings/kpis`);
        const kpis = await res.json();
        renderTrainingKpis(kpis);
        renderTrainingByTraining(kpis.byTraining);
        renderRecentAssignments(kpis.recentAssignments);
    } catch (e) {
        document.getElementById('tr-kpi-cards').innerHTML = '<p class="no-ideas">Error loading dashboard.</p>';
    }
}

function renderTrainingKpis(kpis) {
    const red = '#C8312B';
    const green = '#2e7d32';
    const amber = '#c45800';
    const muted = '#6B6B6B';
    const cards = [
        { label: 'Total Employees', value: kpis.totalEmployees, icon: '👥', color: red },
        { label: 'Total Trainings', value: kpis.totalTrainings, icon: '📚', color: red },
        { label: 'Assignments', value: kpis.total, icon: '📋', color: red },
        { label: 'Completed', value: kpis.completed, icon: '✅', color: green },
        { label: 'In Progress', value: kpis.inProgress, icon: '⚙️', color: amber },
        { label: 'Not Started', value: kpis.notStarted, icon: '⏳', color: muted },
        { label: 'Overdue', value: kpis.overdue, icon: '⚠️', color: kpis.overdue > 0 ? red : green },
        { label: 'Avg. Quiz Score', value: kpis.avgScore !== null ? kpis.avgScore + '%' : '—', icon: '🎯', color: red }
    ];
    document.getElementById('tr-kpi-cards').innerHTML = cards.map(c => `
        <div class="kpi-card" style="border-top:3px solid ${c.color}">
            <div class="kpi-icon">${c.icon}</div>
            <div class="kpi-value" style="color:${c.color}">${c.value}</div>
            <div class="kpi-label">${c.label}</div>
        </div>
    `).join('');
}

function renderTrainingByTraining(byTraining) {
    const container = document.getElementById('tr-by-training');
    if (!byTraining || Object.keys(byTraining).length === 0) {
        container.innerHTML = '<p class="no-data">No training data yet.</p>';
        return;
    }
    container.innerHTML = Object.entries(byTraining).map(([title, data]) => {
        const pct = data.total > 0 ? Math.round((data.completed / data.total) * 100) : 0;
        return `
        <div class="entity-bar-row">
            <div class="entity-bar-label">${escapeHtml(title)}</div>
            <div class="entity-bar-track">
                <div class="entity-bar-fill completed-fill" style="width:${pct}%" title="Completed: ${data.completed}"></div>
            </div>
            <div class="entity-bar-counts">
                <span class="ebc-done">● ${data.completed}/${data.total} done</span>
                ${data.overdue > 0 ? `<span style="color:#e53935;font-weight:600">⚠ ${data.overdue} overdue</span>` : ''}
                ${data.avgScore !== null ? `<span style="color:#00acc1;font-weight:600">🎯 avg ${data.avgScore}%</span>` : ''}
            </div>
        </div>`;
    }).join('');
}

function renderRecentAssignments(list) {
    const container = document.getElementById('tr-recent-assignments');
    if (!list || list.length === 0) {
        container.innerHTML = '<p class="no-data">No assignments yet.</p>';
        return;
    }
    container.innerHTML = list.map(a => `
        <div class="recent-proc-row">
            <div class="rp-info">
                <span class="rp-name">${escapeHtml(a.employeeName)}</span>
                <span class="rp-meta">${escapeHtml(a.trainingTitle)}</span>
            </div>
            <div class="rp-right">
                <span class="proc-status-badge ${a.status}">${trainingStatusLabel(a.status)}</span>
                ${a.score !== null ? `<span style="font-size:0.78em;color:#00acc1;font-weight:600">${a.score}%</span>` : ''}
            </div>
        </div>
    `).join('');
}

// ─── Employees ────────────────────────────────────────────────────────────────

async function loadEmployees() {
    try {
        const res = await fetch(`${API_URL}/employees`);
        allEmployees = await res.json();
        renderEmployees();
        populateAssignEmployeesList();
    } catch (e) {
        document.getElementById('employees-list').innerHTML = '<p class="no-ideas">Error loading employees.</p>';
    }
}

function renderEmployees() {
    const search = (document.getElementById('emp-search').value || '').toLowerCase();
    const container = document.getElementById('employees-list');
    let list = allEmployees;
    if (search) list = list.filter(e =>
        e.name.toLowerCase().includes(search) || e.email.toLowerCase().includes(search)
    );
    if (list.length === 0) {
        container.innerHTML = '<p class="no-data">No employees found. Click "+ Add Employee" to add one.</p>';
        return;
    }
    container.innerHTML = `
        <table class="emp-table">
            <thead><tr>
                <th>Name</th><th>Email</th><th>Role</th><th>Department</th><th>Entity</th><th>Actions</th>
            </tr></thead>
            <tbody>
                ${list.map(e => `
                <tr>
                    <td><strong>${escapeHtml(e.name)}</strong></td>
                    <td>${escapeHtml(e.email)}</td>
                    <td>${escapeHtml(e.role || '—')}</td>
                    <td>${escapeHtml(e.department || '—')}</td>
                    <td>${escapeHtml(e.entity || '—')}</td>
                    <td>
                        <button class="btn-icon" data-action="edit-emp" data-emp-id="${e.id}" title="Edit">✏️</button>
                        <button class="btn-icon btn-danger" data-action="delete-emp" data-emp-id="${e.id}" title="Delete">🗑️</button>
                    </td>
                </tr>`).join('')}
            </tbody>
        </table>`;
}

function handleEmployeeListClick(e) {
    const btn = e.target.closest('[data-action]');
    if (!btn) return;
    const id = btn.dataset.empId;
    if (btn.dataset.action === 'edit-emp') editEmployee(id);
    else if (btn.dataset.action === 'delete-emp') deleteEmployee(id);
}

// ─── Employee Modal ───────────────────────────────────────────────────────────

function openEmployeeModal(empData) {
    document.getElementById('emp-edit-id').value = '';
    document.getElementById('emp-name').value = '';
    document.getElementById('emp-email').value = '';
    document.getElementById('emp-role').value = '';
    document.getElementById('emp-department').value = '';
    document.getElementById('emp-entity').value = '';
    document.getElementById('emp-manager').value = '';
    if (empData) {
        document.getElementById('emp-modal-title').textContent = 'Edit Employee';
        document.getElementById('emp-edit-id').value = empData.id;
        document.getElementById('emp-name').value = empData.name;
        document.getElementById('emp-email').value = empData.email;
        document.getElementById('emp-role').value = empData.role || '';
        document.getElementById('emp-department').value = empData.department || '';
        document.getElementById('emp-entity').value = empData.entity || '';
        document.getElementById('emp-manager').value = empData.lineManagerEmail || '';
    } else {
        document.getElementById('emp-modal-title').textContent = 'Add Employee';
    }
    document.getElementById('employee-modal').classList.remove('hidden');
}

function closeEmployeeModal() {
    document.getElementById('employee-modal').classList.add('hidden');
}

function closeEmpModalOnBg(e) {
    if (e.target === document.getElementById('employee-modal')) closeEmployeeModal();
}

async function submitEmployee(e) {
    e.preventDefault();
    const editId = document.getElementById('emp-edit-id').value;
    const payload = {
        name: document.getElementById('emp-name').value.trim(),
        email: document.getElementById('emp-email').value.trim(),
        role: document.getElementById('emp-role').value.trim(),
        department: document.getElementById('emp-department').value.trim(),
        entity: document.getElementById('emp-entity').value,
        lineManagerEmail: document.getElementById('emp-manager').value.trim()
    };
    const url = editId ? `${API_URL}/employees/${editId}` : `${API_URL}/employees`;
    const method = editId ? 'PUT' : 'POST';
    try {
        const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
        if (!res.ok) { const d = await res.json(); alert(d.error || 'Error saving employee'); return; }
        closeEmployeeModal();
        await loadEmployees();
    } catch (err) {
        alert('Error saving employee');
    }
}

function editEmployee(id) {
    const emp = allEmployees.find(e => e.id === id);
    if (emp) openEmployeeModal(emp);
}

async function deleteEmployee(id) {
    if (!confirm('Delete this employee? This cannot be undone.')) return;
    try {
        const res = await fetch(`${API_URL}/employees/${id}`, { method: 'DELETE' });
        if (res.ok) await loadEmployees();
        else { const d = await res.json(); alert(d.error || 'Error deleting employee'); }
    } catch (e) {
        alert('Error deleting employee');
    }
}

// ─── Training Templates ───────────────────────────────────────────────────────

async function loadTrainingTemplates() {
    try {
        const res = await fetch(`${API_URL}/trainings/templates`);
        allTrainingTemplates = await res.json();
        renderTrainingTemplates();
        populateAssignTrainingDropdown();
        populateAssignmentFilterDropdown();
    } catch (e) {
        document.getElementById('tr-templates-list').innerHTML = '<p class="no-ideas">Error loading trainings.</p>';
    }
}

function renderTrainingTemplates() {
    const container = document.getElementById('tr-templates-list');
    if (allTrainingTemplates.length === 0) {
        container.innerHTML = '<p class="no-data">No trainings yet. Click "+ New Training" to create one.</p>';
        return;
    }
    container.innerHTML = allTrainingTemplates.map(t => {
        const textCount = t.sections.filter(s => s.type === 'text').length;
        const imageCount = t.sections.filter(s => s.type === 'image').length;
        const quizCount = t.sections.filter(s => s.type === 'quiz').length;
        return `
        <div class="template-card">
            <div class="tpl-card-header">
                <div>
                    <span class="tpl-name">${escapeHtml(t.title)}</span>
                    <span class="entity-chip">${t.dueDays} days to complete</span>
                </div>
                <div class="tpl-actions">
                    <button class="btn-icon" data-action="edit-training" data-training-id="${t.id}" title="Edit">✏️</button>
                    <button class="btn-icon btn-danger" data-action="delete-training" data-training-id="${t.id}" title="Delete">🗑️</button>
                </div>
            </div>
            ${t.description ? `<div class="tpl-desc">${escapeHtml(t.description)}</div>` : ''}
            <div class="tpl-steps-summary">
                ${textCount > 0 ? `📝 ${textCount} text ` : ''}${imageCount > 0 ? `🖼️ ${imageCount} image ` : ''}${quizCount > 0 ? `❓ ${quizCount} quiz` : ''} · 
                Reminders: ${t.reminderDays.join(', ')} days before due · Created ${formatDate(t.createdAt)}
            </div>
            <div class="tpl-steps-list">
                ${t.sections.map(s => `
                    <div class="tpl-step-row">
                        <span class="step-order">${s.order}</span>
                        <span class="step-name">${s.type === 'text' ? '📝' : s.type === 'image' ? '🖼️' : '❓'} 
                            ${s.type === 'quiz' ? escapeHtml(s.question || 'Quiz question') : 
                              s.type === 'image' ? escapeHtml(s.caption || s.imageUrl || 'Image') : 
                              escapeHtml((s.content || '').slice(0, 60) + ((s.content || '').length > 60 ? '…' : ''))}</span>
                    </div>
                `).join('')}
            </div>
        </div>`;
    }).join('');
}

function handleTrainingTemplateListClick(e) {
    const btn = e.target.closest('[data-action]');
    if (!btn) return;
    const id = btn.dataset.trainingId;
    if (btn.dataset.action === 'edit-training') editTrainingTemplate(id);
    else if (btn.dataset.action === 'delete-training') deleteTrainingTemplate(id);
}

// ─── Training Template Modal ──────────────────────────────────────────────────

function openTrainingModal(tplData) {
    trainingSectionCounter = 0;
    document.getElementById('tr-edit-id').value = '';
    document.getElementById('tr-title').value = '';
    document.getElementById('tr-desc').value = '';
    document.getElementById('tr-due-days').value = '7';
    document.getElementById('tr-reminder-days').value = '3, 1';
    document.getElementById('training-sections-container').innerHTML = '';

    if (tplData) {
        document.getElementById('training-modal-title').textContent = 'Edit Training';
        document.getElementById('tr-edit-id').value = tplData.id;
        document.getElementById('tr-title').value = tplData.title;
        document.getElementById('tr-desc').value = tplData.description || '';
        document.getElementById('tr-due-days').value = tplData.dueDays;
        document.getElementById('tr-reminder-days').value = tplData.reminderDays.join(', ');
        tplData.sections.forEach(s => addTrainingSection(s.type, s));
    } else {
        document.getElementById('training-modal-title').textContent = 'New Training';
    }
    document.getElementById('training-modal').classList.remove('hidden');
}

function closeTrainingModal() {
    document.getElementById('training-modal').classList.add('hidden');
}

function closeTrainingModalOnBg(e) {
    if (e.target === document.getElementById('training-modal')) closeTrainingModal();
}

function addTrainingSection(type, data) {
    trainingSectionCounter++;
    const idx = trainingSectionCounter;
    const div = document.createElement('div');
    div.className = 'step-row tr-section-row';
    div.id = `tr-sec-${idx}`;
    div.dataset.sectionType = type;
    if (data && data.id) div.dataset.sectionId = data.id;

    let fieldsHtml = '';
    if (type === 'text') {
        fieldsHtml = `
            <div class="form-group">
                <label>📝 Text Content *</label>
                <textarea class="tr-sec-content" rows="4" placeholder="Enter your training text here…" required>${data ? escapeHtml(data.content || '') : ''}</textarea>
            </div>`;
    } else if (type === 'image') {
        fieldsHtml = `
            <div class="form-group">
                <label>🖼️ Image URL *</label>
                <input type="url" class="tr-sec-imageurl" placeholder="https://example.com/image.png" value="${data ? escapeHtml(data.imageUrl || '') : ''}" required>
            </div>
            <div class="form-group">
                <label>Caption</label>
                <input type="text" class="tr-sec-caption" placeholder="Optional caption" value="${data ? escapeHtml(data.caption || '') : ''}">
            </div>`;
    } else if (type === 'quiz') {
        const opts = data && data.options ? data.options : ['', '', '', ''];
        const correct = data ? (data.correctAnswer || 0) : 0;
        fieldsHtml = `
            <div class="form-group">
                <label>❓ Question *</label>
                <input type="text" class="tr-sec-question" placeholder="Enter quiz question" value="${data ? escapeHtml(data.question || '') : ''}" required>
            </div>
            <div class="form-group">
                <label>Answer Options (mark correct with the radio button)</label>
                <div class="quiz-options">
                    ${opts.map((opt, i) => `
                    <div class="quiz-option-row">
                        <input type="radio" name="correct-${idx}" class="tr-sec-correct" value="${i}" ${i === correct ? 'checked' : ''}>
                        <input type="text" class="tr-sec-option" placeholder="Option ${String.fromCharCode(65+i)}" value="${escapeHtml(opt)}" required>
                    </div>`).join('')}
                </div>
            </div>`;
    }

    div.innerHTML = `
        <div class="step-row-num tr-sec-type-badge ${type}">${type === 'text' ? '📝' : type === 'image' ? '🖼️' : '❓'}</div>
        <div class="step-row-fields">${fieldsHtml}</div>
        <button type="button" class="btn-remove-step" onclick="removeTrainingSection(${idx})" title="Remove">✕</button>
    `;
    document.getElementById('training-sections-container').appendChild(div);
}

function removeTrainingSection(idx) {
    const el = document.getElementById(`tr-sec-${idx}`);
    if (el) el.remove();
}

async function submitTraining(e) {
    e.preventDefault();
    const editId = document.getElementById('tr-edit-id').value;
    const title = document.getElementById('tr-title').value.trim();
    const description = document.getElementById('tr-desc').value.trim();
    const dueDays = parseInt(document.getElementById('tr-due-days').value, 10) || 7;
    const reminderDaysStr = document.getElementById('tr-reminder-days').value;
    const reminderDays = reminderDaysStr.split(',').map(s => parseInt(s.trim(), 10)).filter(n => !isNaN(n));

    const sectionRows = document.querySelectorAll('.tr-section-row');
    if (sectionRows.length === 0) { alert('Please add at least one content section.'); return; }

    const sections = [...sectionRows].map(row => {
        const type = row.dataset.sectionType;
        const sec = { id: row.dataset.sectionId || undefined, type };
        if (type === 'text') {
            sec.content = row.querySelector('.tr-sec-content').value.trim();
        } else if (type === 'image') {
            sec.imageUrl = row.querySelector('.tr-sec-imageurl').value.trim();
            sec.caption = row.querySelector('.tr-sec-caption').value.trim();
        } else if (type === 'quiz') {
            sec.question = row.querySelector('.tr-sec-question').value.trim();
            sec.options = [...row.querySelectorAll('.tr-sec-option')].map(i => i.value.trim());
            const correctRadio = row.querySelector('.tr-sec-correct:checked');
            sec.correctAnswer = correctRadio ? parseInt(correctRadio.value, 10) : 0;
        }
        return sec;
    });

    const payload = { title, description, dueDays, reminderDays, sections };
    const url = editId ? `${API_URL}/trainings/templates/${editId}` : `${API_URL}/trainings/templates`;
    const method = editId ? 'PUT' : 'POST';
    try {
        const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
        if (!res.ok) { const d = await res.json(); alert(d.error || 'Error saving training'); return; }
        closeTrainingModal();
        await loadTrainingTemplates();
        await loadTrainingDashboard();
    } catch (err) {
        alert('Error saving training');
    }
}

function editTrainingTemplate(id) {
    const tpl = allTrainingTemplates.find(t => t.id === id);
    if (tpl) openTrainingModal(tpl);
}

async function deleteTrainingTemplate(id) {
    if (!confirm('Delete this training? This cannot be undone.')) return;
    try {
        const res = await fetch(`${API_URL}/trainings/templates/${id}`, { method: 'DELETE' });
        if (res.ok) {
            await loadTrainingTemplates();
            await loadTrainingDashboard();
        } else { const d = await res.json(); alert(d.error || 'Error deleting training'); }
    } catch (e) {
        alert('Error deleting training');
    }
}

// ─── Assignments ──────────────────────────────────────────────────────────────

async function loadAssignments() {
    try {
        const res = await fetch(`${API_URL}/trainings/assignments`);
        allAssignments = await res.json();
        renderAssignments();
    } catch (e) {
        document.getElementById('assignments-list').innerHTML = '<p class="no-ideas">Error loading assignments.</p>';
    }
}

function renderAssignments() {
    const statusFilter = document.getElementById('asgn-filter-status').value;
    const trainingFilter = document.getElementById('asgn-filter-training').value;
    let list = allAssignments;
    if (statusFilter) list = list.filter(a => a.status === statusFilter);
    if (trainingFilter) list = list.filter(a => a.trainingId === trainingFilter);

    const container = document.getElementById('assignments-list');
    if (list.length === 0) {
        container.innerHTML = '<p class="no-data">No assignments found.</p>';
        return;
    }
    list.sort((a, b) => new Date(b.assignedAt) - new Date(a.assignedAt));
    container.innerHTML = list.map(a => `
        <div class="process-card" data-assignment-id="${a.id}">
            <div class="proc-card-header">
                <div class="proc-emp">
                    <span class="proc-emp-name">${escapeHtml(a.employeeName)}</span>
                </div>
                <span class="proc-status-badge ${a.status}">${trainingStatusLabel(a.status)}</span>
            </div>
            <div class="proc-meta-row">
                <span class="entity-chip">📚 ${escapeHtml(a.trainingTitle)}</span>
                <span class="proc-date">Due: ${escapeHtml(a.dueDate)}</span>
                ${a.score !== null ? `<span class="entity-chip" style="background:#e0f7fa;color:#00838f">🎯 Score: ${a.score}%</span>` : ''}
            </div>
        </div>`).join('');
}

function handleAssignmentListClick(e) {
    const card = e.target.closest('[data-assignment-id]');
    if (card) openTakeTrainingModal(card.dataset.assignmentId);
}

// ─── Assign Training Modal ────────────────────────────────────────────────────

function openAssignModal() {
    populateAssignTrainingDropdown();
    populateAssignEmployeesList();
    document.getElementById('assign-success').classList.add('hidden');
    document.getElementById('assign-error').classList.add('hidden');
    document.getElementById('assign-modal').classList.remove('hidden');
}

function closeAssignModal() {
    document.getElementById('assign-modal').classList.add('hidden');
}

function closeAssignModalOnBg(e) {
    if (e.target === document.getElementById('assign-modal')) closeAssignModal();
}

function populateAssignTrainingDropdown() {
    const sel = document.getElementById('assign-training');
    if (!sel) return;
    sel.innerHTML = '<option value="">Select training</option>';
    allTrainingTemplates.forEach(t => {
        const opt = document.createElement('option');
        opt.value = t.id;
        opt.textContent = t.title;
        sel.appendChild(opt);
    });
}

function populateAssignEmployeesList() {
    const container = document.getElementById('assign-employees-list');
    if (!container) return;
    if (allEmployees.length === 0) {
        container.innerHTML = '<p class="no-data">No employees. Add employees first.</p>';
        return;
    }
    container.innerHTML = allEmployees.map(e => `
        <label class="emp-assign-checkbox">
            <input type="checkbox" name="assign-emp" value="${e.id}">
            <span><strong>${escapeHtml(e.name)}</strong> <small>${escapeHtml(e.email)}</small></span>
        </label>
    `).join('');
}

async function submitAssignment(e) {
    e.preventDefault();
    const trainingId = document.getElementById('assign-training').value;
    const employeeIds = [...document.querySelectorAll('[name="assign-emp"]:checked')].map(cb => cb.value);
    if (!trainingId) { alert('Please select a training.'); return; }
    if (employeeIds.length === 0) { alert('Please select at least one employee.'); return; }
    try {
        const res = await fetch(`${API_URL}/trainings/assignments`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ trainingId, employeeIds })
        });
        const data = await res.json();
        if (res.ok) {
            document.getElementById('assign-success').textContent = `✓ Training assigned to ${data.length} employee(s).`;
            document.getElementById('assign-success').classList.remove('hidden');
            document.getElementById('assign-error').classList.add('hidden');
            document.querySelectorAll('[name="assign-emp"]').forEach(cb => cb.checked = false);
            setTimeout(() => {
                document.getElementById('assign-success').classList.add('hidden');
                closeAssignModal();
            }, 2000);
            await loadAssignments();
            await loadTrainingDashboard();
        } else {
            document.getElementById('assign-error').textContent = '✗ ' + (data.error || 'Error assigning training');
            document.getElementById('assign-error').classList.remove('hidden');
        }
    } catch (err) {
        document.getElementById('assign-error').textContent = '✗ Error connecting to server';
        document.getElementById('assign-error').classList.remove('hidden');
    }
}

function populateAssignmentFilterDropdown() {
    const sel = document.getElementById('asgn-filter-training');
    if (!sel) return;
    const currentVal = sel.value;
    sel.innerHTML = '<option value="">All Trainings</option>';
    allTrainingTemplates.forEach(t => {
        const opt = document.createElement('option');
        opt.value = t.id;
        opt.textContent = t.title;
        sel.appendChild(opt);
    });
    sel.value = currentVal;
}

// ─── Take Training Modal ──────────────────────────────────────────────────────

async function openTakeTrainingModal(assignmentId) {
    const assignment = allAssignments.find(a => a.id === assignmentId);
    if (!assignment) return;

    const training = allTrainingTemplates.find(t => t.id === assignment.trainingId);
    if (!training) return;

    document.getElementById('take-training-title').textContent = `📚 ${escapeHtml(training.title)}`;
    document.getElementById('take-training-body').innerHTML = renderTakeTraining(assignment, training);
    document.getElementById('take-training-modal').classList.remove('hidden');

    // Mark as in_progress if not_started
    if (assignment.status === 'not_started') {
        try {
            const res = await fetch(`${API_URL}/trainings/assignments/${assignmentId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status: 'in_progress' })
            });
            if (res.ok) {
                const updated = await res.json();
                const idx = allAssignments.findIndex(a => a.id === assignmentId);
                if (idx !== -1) allAssignments[idx] = updated;
            }
        } catch (e) { /* silent */ }
    }
}

function renderTakeTraining(assignment, training) {
    const isCompleted = assignment.status === 'completed';
    return `
        <div class="take-training-meta">
            <span class="proc-status-badge ${assignment.status}">${trainingStatusLabel(assignment.status)}</span>
            <span class="proc-date">Due: ${escapeHtml(assignment.dueDate)}</span>
            ${assignment.score !== null ? `<span class="entity-chip" style="background:#e0f7fa;color:#00838f">🎯 Score: ${assignment.score}%</span>` : ''}
        </div>
        <div class="training-sections">
            ${training.sections.map(s => renderTrainingSection(s, assignment)).join('')}
        </div>
        ${!isCompleted ? `
        <div class="proc-detail-footer" style="margin-top:20px">
            <button class="submit-button" data-action="submit-training" data-assignment-id="${assignment.id}" data-training-id="${training.id}">Submit &amp; Complete Training</button>
        </div>` : `
        <div class="proc-detail-footer" style="margin-top:20px;text-align:center">
            <span style="color:#43a047;font-weight:700;font-size:1.1em">✅ Training Completed${assignment.score !== null ? ` — Score: ${assignment.score}%` : ''}</span>
        </div>`}
    `;
}

function renderTrainingSection(section, assignment) {
    const existingAnswer = assignment.quizAnswers ? assignment.quizAnswers[section.id] : undefined;
    const isCompleted = assignment.status === 'completed';
    if (section.type === 'text') {
        return `
        <div class="training-section text-section">
            <div class="training-text-content">${escapeHtml(section.content).replace(/\n/g, '<br>')}</div>
        </div>`;
    } else if (section.type === 'image') {
        return `
        <div class="training-section image-section">
            <img src="${escapeHtml(section.imageUrl)}" alt="${escapeHtml(section.caption || 'Training image')}" class="training-image">
            ${section.caption ? `<div class="training-image-caption">${escapeHtml(section.caption)}</div>` : ''}
        </div>`;
    } else if (section.type === 'quiz') {
        return `
        <div class="training-section quiz-section">
            <div class="quiz-question">${escapeHtml(section.question)}</div>
            <div class="quiz-options-display">
                ${section.options.map((opt, i) => `
                <label class="quiz-option-display ${isCompleted ? (i === section.correctAnswer ? 'correct' : (existingAnswer === i ? 'wrong' : '')) : ''}">
                    <input type="radio" name="quiz-${section.id}" value="${i}" data-section-id="${section.id}"
                        ${existingAnswer === i ? 'checked' : ''} ${isCompleted ? 'disabled' : ''}>
                    ${escapeHtml(opt)}
                    ${isCompleted && i === section.correctAnswer ? ' ✅' : ''}
                </label>`).join('')}
            </div>
        </div>`;
    }
    return '';
}

async function submitTrainingAnswers(assignmentId, trainingId) {
    const assignment = allAssignments.find(a => a.id === assignmentId);
    if (!assignment) return;
    const training = allTrainingTemplates.find(t => t.id === trainingId);
    if (!training) return;

    const quizSections = training.sections.filter(s => s.type === 'quiz');
    const quizAnswers = {};
    let allAnswered = true;

    for (const sec of quizSections) {
        const selected = document.querySelector(`[name="quiz-${sec.id}"]:checked`);
        if (!selected) { allAnswered = false; break; }
        quizAnswers[sec.id] = parseInt(selected.value, 10);
    }

    if (!allAnswered && quizSections.length > 0) {
        alert('Please answer all quiz questions before submitting.');
        return;
    }

    try {
        const res = await fetch(`${API_URL}/trainings/assignments/${assignmentId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status: 'completed', quizAnswers })
        });
        if (!res.ok) { const d = await res.json(); alert(d.error || 'Error submitting training'); return; }
        const updated = await res.json();
        const idx = allAssignments.findIndex(a => a.id === assignmentId);
        if (idx !== -1) allAssignments[idx] = updated;
        document.getElementById('take-training-body').innerHTML = renderTakeTraining(updated, training);
        renderAssignments();
        loadTrainingDashboard();
    } catch (err) {
        alert('Error submitting training');
    }
}

function closeTakeTrainingModal() {
    document.getElementById('take-training-modal').classList.add('hidden');
}

function closeTakeTrainingOnBg(e) {
    if (e.target === document.getElementById('take-training-modal')) closeTakeTrainingModal();
}

// ─── Helpers for Trainings ────────────────────────────────────────────────────

function trainingStatusLabel(status) {
    const labels = { not_started: 'Not Started', in_progress: 'In Progress', completed: 'Completed', overdue: 'Overdue' };
    return labels[status] || status;
}

// ─── IT Landscape ─────────────────────────────────────────────────────────────

const IT_DEPT_COLORS = {
    HR:           { bg: '#e3f2fd', color: '#1565c0', border: '#90caf9' },
    Finance:      { bg: '#e8f5e9', color: '#2e7d32', border: '#a5d6a7' },
    Backoffice:   { bg: '#fce4ec', color: '#880e4f', border: '#f48fb1' },
    Cybersecurity:{ bg: '#fff3e0', color: '#e65100', border: '#ffcc80' },
    Marketing:    { bg: '#f3e5f5', color: '#6a1b9a', border: '#ce93d8' },
    Sales:        { bg: '#e0f2f1', color: '#00695c', border: '#80cbc4' },
    IT:           { bg: '#e8eaf6', color: '#283593', border: '#9fa8da' },
    Legal:        { bg: '#fff8e1', color: '#f57f17', border: '#ffe082' },
    Operations:   { bg: '#fbe9e7', color: '#bf360c', border: '#ffab91' },
    Product:      { bg: '#e1f5fe', color: '#01579b', border: '#81d4fa' },
    Other:        { bg: '#f5f5f5', color: '#424242', border: '#bdbdbd' }
};

function showLandscapeSection(sectionId, btn) {
    document.querySelectorAll('#landscape-tab .ob-section').forEach(s => s.classList.remove('active'));
    document.querySelectorAll('#landscape-tab .sub-tab-btn').forEach(b => b.classList.remove('active'));
    const el = document.getElementById(sectionId);
    if (el) el.classList.add('active');
    if (btn) btn.classList.add('active');
}

async function loadITLandscape() {
    try {
        const res = await fetch(`${API_URL}/it-landscape`);
        if (!res.ok) throw new Error('Failed to load IT tools');
        allITTools = await res.json();
        renderITTools();
        renderITDashboard();
    } catch (err) {
        document.getElementById('it-tools-list').innerHTML = '<p class="error-state">Failed to load IT tools.</p>';
    }
}

function renderITTools() {
    const search = (document.getElementById('ls-search')?.value || '').toLowerCase();
    const dept = document.getElementById('ls-filter-dept')?.value || '';
    const status = document.getElementById('ls-filter-status')?.value || '';

    let tools = allITTools.filter(t => {
        if (dept && t.department !== dept) return false;
        if (status && t.status !== status) return false;
        if (search && !t.name.toLowerCase().includes(search) && !(t.vendor || '').toLowerCase().includes(search)) return false;
        return true;
    });

    const container = document.getElementById('it-tools-list');
    if (!container) return;

    if (tools.length === 0) {
        container.innerHTML = '<p class="empty-state">No IT tools found. Click "+ Add Tool" to get started.</p>';
        return;
    }

    container.innerHTML = tools.map(tool => {
        const dc = IT_DEPT_COLORS[tool.department] || IT_DEPT_COLORS.Other;
        const costStr = tool.cost !== null && tool.cost !== undefined
            ? `${Number(tool.cost).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${tool.currency}`
            : '—';
        const billingLabel = { monthly: '/mo', annual: '/yr', 'one-time': ' one-time' }[tool.billingCycle] || '';
        const statusColors = {
            active: { bg: '#e8f5e9', color: '#2e7d32' },
            inactive: { bg: '#f5f5f5', color: '#616161' },
            'under-review': { bg: '#fff8e1', color: '#f57f17' }
        };
        const sc = statusColors[tool.status] || statusColors.active;
        const statusLabel = { active: 'Active', inactive: 'Inactive', 'under-review': 'Under Review' }[tool.status] || tool.status;
        return `<div class="it-tool-card">
            <div class="it-tool-card-header">
                <div class="it-tool-name">${escapeHtml(tool.name)}</div>
                <div class="it-tool-badges">
                    <span class="it-dept-badge" style="background:${dc.bg};color:${dc.color};border-color:${dc.border}">${escapeHtml(tool.department)}</span>
                    <span class="it-status-badge" style="background:${sc.bg};color:${sc.color}">${statusLabel}</span>
                </div>
            </div>
            ${tool.vendor ? `<div class="it-tool-vendor">${escapeHtml(tool.vendor)}</div>` : ''}
            ${tool.description ? `<div class="it-tool-desc">${escapeHtml(tool.description)}</div>` : ''}
            <div class="it-tool-footer">
                <div class="it-tool-cost">
                    <span class="it-cost-value">${costStr}</span>${tool.cost !== null && tool.cost !== undefined ? `<span class="it-cost-cycle">${billingLabel}</span>` : ''}
                </div>
                <div class="it-tool-meta">${escapeHtml(tool.category || 'Other')}</div>
            </div>
            <div class="it-tool-actions">
                <button class="btn-link" data-tool-id="${tool.id}" onclick="openEditToolModal(this.dataset.toolId)">Edit</button>
                <button class="btn-link btn-link-danger" data-tool-id="${tool.id}" onclick="deleteTool(this.dataset.toolId)">Delete</button>
            </div>
        </div>`;
    }).join('');
}

function renderITDashboard() {
    const active = allITTools.filter(t => t.status === 'active');
    const inactive = allITTools.filter(t => t.status === 'inactive');
    const underReview = allITTools.filter(t => t.status === 'under-review');

    // Compute monthly cost (normalise annual → /12, one-time → 0 for monthly calc)
    function monthlyEquiv(tool) {
        if (tool.cost === null || tool.cost === undefined) return 0;
        if (tool.billingCycle === 'monthly') return tool.cost;
        if (tool.billingCycle === 'annual') return tool.cost / 12;
        return 0;
    }
    function annualEquiv(tool) {
        if (tool.cost === null || tool.cost === undefined) return 0;
        if (tool.billingCycle === 'monthly') return tool.cost * 12;
        if (tool.billingCycle === 'annual') return tool.cost;
        return 0; // one-time excluded from recurring annual
    }

    const totalMonthly = active.reduce((s, t) => s + monthlyEquiv(t), 0);
    const totalAnnual = active.reduce((s, t) => s + annualEquiv(t), 0);

    const kpiEl = document.getElementById('ls-kpi-cards');
    if (kpiEl) {
        kpiEl.innerHTML = `
            <div class="kpi-card"><div class="kpi-value">${allITTools.length}</div><div class="kpi-label">Total Tools</div></div>
            <div class="kpi-card"><div class="kpi-value">${active.length}</div><div class="kpi-label">Active Tools</div></div>
            <div class="kpi-card"><div class="kpi-value">€${totalMonthly.toLocaleString('en-US', {minimumFractionDigits: 0, maximumFractionDigits: 0})}</div><div class="kpi-label">Est. Monthly Cost</div></div>
            <div class="kpi-card"><div class="kpi-value">€${totalAnnual.toLocaleString('en-US', {minimumFractionDigits: 0, maximumFractionDigits: 0})}</div><div class="kpi-label">Est. Annual Cost</div></div>
        `;
    }

    // By department
    const deptEl = document.getElementById('ls-by-department');
    if (deptEl) {
        const byDept = {};
        active.forEach(t => {
            if (!byDept[t.department]) byDept[t.department] = { count: 0, monthly: 0 };
            byDept[t.department].count++;
            byDept[t.department].monthly += monthlyEquiv(t);
        });
        const entries = Object.entries(byDept).sort((a, b) => b[1].monthly - a[1].monthly);
        if (entries.length === 0) {
            deptEl.innerHTML = '<p class="empty-state" style="font-size:0.9em;color:var(--brand-muted)">No active tools yet.</p>';
        } else {
            deptEl.innerHTML = entries.map(([dept, data]) => {
                const dc = IT_DEPT_COLORS[dept] || IT_DEPT_COLORS.Other;
                return `<div class="ls-dept-row">
                    <span class="it-dept-badge" style="background:${dc.bg};color:${dc.color};border-color:${dc.border}">${escapeHtml(dept)}</span>
                    <span class="ls-dept-count">${data.count} tool${data.count !== 1 ? 's' : ''}</span>
                    <span class="ls-dept-cost">€${data.monthly.toLocaleString('en-US', {minimumFractionDigits: 0, maximumFractionDigits: 0})}/mo</span>
                </div>`;
            }).join('');
        }
    }

    // Tools overview
    const overviewEl = document.getElementById('ls-tools-overview');
    if (overviewEl) {
        const recent = [...allITTools].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).slice(0, 6);
        if (recent.length === 0) {
            overviewEl.innerHTML = '<p class="empty-state" style="font-size:0.9em;color:var(--brand-muted)">No tools added yet.</p>';
        } else {
            overviewEl.innerHTML = recent.map(t => {
                const dc = IT_DEPT_COLORS[t.department] || IT_DEPT_COLORS.Other;
                const costStr = t.cost !== null && t.cost !== undefined ? `${Number(t.cost).toLocaleString()} ${t.currency}` : '—';
                return `<div class="ls-overview-row">
                    <span class="it-dept-badge" style="background:${dc.bg};color:${dc.color};border-color:${dc.border};flex-shrink:0">${escapeHtml(t.department)}</span>
                    <span class="ls-overview-name">${escapeHtml(t.name)}</span>
                    <span class="ls-overview-cost">${costStr}</span>
                </div>`;
            }).join('');
        }
    }
}

function openToolModal() {
    const modal = document.getElementById('tool-modal');
    const form = document.getElementById('tool-form');
    form.reset();
    document.getElementById('tool-id').value = '';
    document.getElementById('tool-modal-title').textContent = 'Add IT Tool';
    document.getElementById('tool-submit-btn').textContent = 'Add Tool';
    document.getElementById('tool-success').classList.add('hidden');
    document.getElementById('tool-error').classList.add('hidden');
    modal.classList.remove('hidden');
}

function openEditToolModal(id) {
    const tool = allITTools.find(t => t.id === id);
    if (!tool) return;
    document.getElementById('tool-modal-title').textContent = 'Edit IT Tool';
    document.getElementById('tool-submit-btn').textContent = 'Save Changes';
    document.getElementById('tool-id').value = tool.id;
    document.getElementById('tool-name').value = tool.name || '';
    document.getElementById('tool-vendor').value = tool.vendor || '';
    document.getElementById('tool-description').value = tool.description || '';
    document.getElementById('tool-department').value = tool.department || '';
    document.getElementById('tool-category').value = tool.category || 'Other';
    document.getElementById('tool-cost').value = tool.cost !== null && tool.cost !== undefined ? tool.cost : '';
    document.getElementById('tool-currency').value = tool.currency || 'EUR';
    document.getElementById('tool-billing').value = tool.billingCycle || 'monthly';
    document.getElementById('tool-contract-start').value = tool.contractStart || '';
    document.getElementById('tool-contract-end').value = tool.contractEnd || '';
    document.getElementById('tool-status').value = tool.status || 'active';
    document.getElementById('tool-notes').value = tool.notes || '';
    document.getElementById('tool-success').classList.add('hidden');
    document.getElementById('tool-error').classList.add('hidden');
    document.getElementById('tool-modal').classList.remove('hidden');
}

function closeToolModal() {
    document.getElementById('tool-modal').classList.add('hidden');
}

function closeToolModalOnBg(e) {
    if (e.target === document.getElementById('tool-modal')) closeToolModal();
}

async function submitTool(event) {
    event.preventDefault();
    const id = document.getElementById('tool-id').value;
    const successEl = document.getElementById('tool-success');
    const errorEl = document.getElementById('tool-error');
    successEl.classList.add('hidden');
    errorEl.classList.add('hidden');

    const payload = {
        name: document.getElementById('tool-name').value.trim(),
        vendor: document.getElementById('tool-vendor').value.trim(),
        description: document.getElementById('tool-description').value.trim(),
        department: document.getElementById('tool-department').value,
        category: document.getElementById('tool-category').value,
        cost: document.getElementById('tool-cost').value !== '' ? parseFloat(document.getElementById('tool-cost').value) : null,
        currency: document.getElementById('tool-currency').value,
        billingCycle: document.getElementById('tool-billing').value,
        contractStart: document.getElementById('tool-contract-start').value || null,
        contractEnd: document.getElementById('tool-contract-end').value || null,
        status: document.getElementById('tool-status').value,
        notes: document.getElementById('tool-notes').value.trim()
    };

    try {
        const url = id ? `${API_URL}/it-landscape/${id}` : `${API_URL}/it-landscape`;
        const method = id ? 'PUT' : 'POST';
        const res = await fetch(url, {
            method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        const data = await res.json();
        if (!res.ok) {
            errorEl.textContent = data.error || 'Error saving tool';
            errorEl.classList.remove('hidden');
            return;
        }
        successEl.textContent = id ? 'Tool updated successfully!' : 'Tool added successfully!';
        successEl.classList.remove('hidden');
        if (id) {
            const idx = allITTools.findIndex(t => t.id === id);
            if (idx !== -1) allITTools[idx] = data;
        } else {
            allITTools.push(data);
        }
        renderITTools();
        renderITDashboard();
        setTimeout(() => closeToolModal(), 1200);
    } catch (err) {
        errorEl.textContent = 'Network error. Please try again.';
        errorEl.classList.remove('hidden');
    }
}

async function deleteTool(id) {
    if (!confirm('Are you sure you want to delete this tool?')) return;
    try {
        const res = await fetch(`${API_URL}/it-landscape/${id}`, { method: 'DELETE' });
        if (!res.ok) { const d = await res.json(); alert(d.error || 'Error deleting tool'); return; }
        allITTools = allITTools.filter(t => t.id !== id);
        renderITTools();
        renderITDashboard();
    } catch (err) {
        alert('Network error. Please try again.');
    }
}

// ─── IT Asset Inventory ───────────────────────────────────────────────────────

const ASSET_TYPE_ICONS = {
    Laptop: '💻', Desktop: '🖥️', Monitor: '🖵', Phone: '📱', Tablet: '📲',
    Printer: '🖨️', Server: '🗄️', 'Network Equipment': '🔌', Peripheral: '🖱️', Other: '📦'
};

const ASSET_STATUS_COLORS = {
    'in-use':     { bg: '#e8f5e9', color: '#2e7d32', label: 'In Use' },
    available:    { bg: '#e3f2fd', color: '#1565c0', label: 'Available' },
    maintenance:  { bg: '#fff8e1', color: '#f57f17', label: 'Maintenance' },
    retired:      { bg: '#f5f5f5', color: '#616161', label: 'Retired' },
    lost:         { bg: '#fce4ec', color: '#880e4f', label: 'Lost' }
};

const ASSET_CONDITION_COLORS = {
    excellent: { bg: '#e8f5e9', color: '#2e7d32' },
    good:      { bg: '#e3f2fd', color: '#1565c0' },
    fair:      { bg: '#fff8e1', color: '#f57f17' },
    poor:      { bg: '#fce4ec', color: '#880e4f' }
};

function showAssetsSection(sectionId, btn) {
    document.querySelectorAll('#assets-tab .ob-section').forEach(s => s.classList.remove('active'));
    document.querySelectorAll('#assets-tab .sub-tab-btn').forEach(b => b.classList.remove('active'));
    const el = document.getElementById(sectionId);
    if (el) el.classList.add('active');
    if (btn) btn.classList.add('active');
}

function formatAssetAge(months) {
    if (months === null) return '—';
    if (months >= 12) return `${Math.floor(months / 12)}y ${months % 12}m`;
    return `${months}m`;
}

async function loadITAssets() {
    try {
        const res = await fetch(`${API_URL}/it-assets`);
        if (!res.ok) throw new Error('Failed to load IT assets');
        allITAssets = await res.json();
        populateAssetDeptFilter();
        renderITAssets();
        renderAssetDashboard();
    } catch (err) {
        document.getElementById('assets-table-container').innerHTML = '<p class="error-state">Failed to load IT assets.</p>';
    }
}

function populateAssetDeptFilter() {
    const sel = document.getElementById('assets-filter-dept');
    if (!sel) return;
    const current = sel.value;
    const depts = [...new Set(allITAssets.map(a => a.department).filter(Boolean))].sort();
    sel.innerHTML = '<option value="">All Departments</option>' +
        depts.map(d => `<option value="${escapeHtml(d)}"${d === current ? ' selected' : ''}>${escapeHtml(d)}</option>`).join('');
}

function renderITAssets() {
    const search = (document.getElementById('assets-search')?.value || '').toLowerCase();
    const type = document.getElementById('assets-filter-type')?.value || '';
    const status = document.getElementById('assets-filter-status')?.value || '';
    const dept = document.getElementById('assets-filter-dept')?.value || '';

    let assets = allITAssets.filter(a => {
        if (type && a.type !== type) return false;
        if (status && a.status !== status) return false;
        if (dept && a.department !== dept) return false;
        if (search) {
            const haystack = [a.name, a.assetTag, a.serialNumber, a.assignedTo, a.brand, a.model].join(' ').toLowerCase();
            if (!haystack.includes(search)) return false;
        }
        return true;
    });

    const container = document.getElementById('assets-table-container');
    if (!container) return;

    if (assets.length === 0) {
        container.innerHTML = '<p class="empty-state">No IT assets found. Click "+ Add Asset" to get started.</p>';
        return;
    }

    const now = new Date();
    const in30Days = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

    container.innerHTML = `<div class="asset-table-scroll"><table class="asset-table">
        <thead>
            <tr>
                <th>Asset</th>
                <th>Type</th>
                <th>Brand / Model</th>
                <th>Assigned To</th>
                <th>Department</th>
                <th>Status</th>
                <th>Condition</th>
                <th>Warranty</th>
                <th>Actions</th>
            </tr>
        </thead>
        <tbody>
            ${assets.map(asset => {
                const sc = ASSET_STATUS_COLORS[asset.status] || ASSET_STATUS_COLORS.available;
                const cc = ASSET_CONDITION_COLORS[asset.condition] || ASSET_CONDITION_COLORS.good;
                const icon = ASSET_TYPE_ICONS[asset.type] || '📦';
                const brandModel = [asset.brand, asset.model].filter(Boolean).join(' / ') || '—';
                let warrantyHtml = '—';
                if (asset.warrantyExpiry) {
                    const exp = new Date(asset.warrantyExpiry);
                    if (exp < now) {
                        warrantyHtml = `<span class="asset-warranty-expired">${asset.warrantyExpiry}</span>`;
                    } else if (exp <= in30Days) {
                        warrantyHtml = `<span class="asset-warranty-soon">${asset.warrantyExpiry}</span>`;
                    } else {
                        warrantyHtml = `<span>${asset.warrantyExpiry}</span>`;
                    }
                }
                return `<tr>
                    <td>
                        <div class="asset-name-cell">
                            <span class="asset-type-icon">${icon}</span>
                            <div>
                                <div class="asset-name">${escapeHtml(asset.name)}</div>
                                ${asset.assetTag ? `<div class="asset-tag">${escapeHtml(asset.assetTag)}</div>` : ''}
                            </div>
                        </div>
                    </td>
                    <td>${escapeHtml(asset.type)}</td>
                    <td>${escapeHtml(brandModel)}</td>
                    <td>
                        ${asset.assignedTo ? `<div class="asset-assigned-name">${escapeHtml(asset.assignedTo)}</div>` : '<span class="asset-unassigned">—</span>'}
                        ${asset.assignedEmail ? `<div class="asset-assigned-email">${escapeHtml(asset.assignedEmail)}</div>` : ''}
                    </td>
                    <td>${asset.department ? escapeHtml(asset.department) : '—'}</td>
                    <td><span class="asset-status-badge" style="background:${sc.bg};color:${sc.color}">${sc.label}</span></td>
                    <td><span class="asset-condition-badge" style="background:${cc.bg};color:${cc.color}">${asset.condition ? (asset.condition.charAt(0).toUpperCase() + asset.condition.slice(1)) : '—'}</span></td>
                    <td class="asset-warranty-cell">${warrantyHtml}</td>
                    <td>
                        <div class="it-tool-actions">
                            <button class="btn-link" data-asset-id="${asset.id}" onclick="openEditAssetModal(this.dataset.assetId)">Edit</button>
                            <button class="btn-link btn-link-danger" data-asset-id="${asset.id}" onclick="deleteAsset(this.dataset.assetId)">Delete</button>
                        </div>
                    </td>
                </tr>`;
            }).join('')}
        </tbody>
    </table></div>`;
}

async function renderAssetDashboard() {
    try {
        const res = await fetch(`${API_URL}/it-assets/kpis`);
        if (!res.ok) throw new Error('KPIs failed');
        const kpis = await res.json();

        const kpiEl = document.getElementById('assets-kpi-cards');
        if (kpiEl) {
            const avgAge = formatAssetAge(kpis.avgAgeMonths);
            const totalVal = kpis.totalValue > 0
                ? `€${kpis.totalValue.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`
                : '—';
            kpiEl.innerHTML = `
                <div class="kpi-card"><div class="kpi-value">${kpis.totalAssets}</div><div class="kpi-label">Total Assets</div></div>
                <div class="kpi-card"><div class="kpi-value">${kpis.inUse}</div><div class="kpi-label">In Use</div></div>
                <div class="kpi-card"><div class="kpi-value">${kpis.available}</div><div class="kpi-label">Available</div></div>
                <div class="kpi-card"><div class="kpi-value">${totalVal}</div><div class="kpi-label">Total Asset Value</div></div>
                <div class="kpi-card ${kpis.warrantyExpiringSoon > 0 ? 'kpi-card-warn' : ''}"><div class="kpi-value">${kpis.warrantyExpiringSoon}</div><div class="kpi-label">Warranty Expiring (30d)</div></div>
                <div class="kpi-card"><div class="kpi-value">${avgAge}</div><div class="kpi-label">Avg Asset Age</div></div>
            `;
        }

        // By type
        const typeEl = document.getElementById('assets-by-type');
        if (typeEl) {
            const entries = Object.entries(kpis.byType).sort((a, b) => b[1] - a[1]);
            if (entries.length === 0) {
                typeEl.innerHTML = '<p class="empty-state" style="font-size:0.9em;color:var(--brand-muted)">No assets yet.</p>';
            } else {
                const max = Math.max(...entries.map(e => e[1]));
                typeEl.innerHTML = entries.map(([type, count]) => {
                    const icon = ASSET_TYPE_ICONS[type] || '📦';
                    const pct = Math.round((count / max) * 100);
                    return `<div class="asset-kpi-row">
                        <span class="asset-kpi-icon">${icon}</span>
                        <span class="asset-kpi-label">${escapeHtml(type)}</span>
                        <div class="asset-kpi-bar-wrap"><div class="asset-kpi-bar" style="width:${pct}%"></div></div>
                        <span class="asset-kpi-count">${count}</span>
                    </div>`;
                }).join('');
            }
        }

        // By department
        const deptEl = document.getElementById('assets-by-dept');
        if (deptEl) {
            const entries = Object.entries(kpis.byDepartment).sort((a, b) => b[1] - a[1]);
            if (entries.length === 0) {
                deptEl.innerHTML = '<p class="empty-state" style="font-size:0.9em;color:var(--brand-muted)">No assets yet.</p>';
            } else {
                const max = Math.max(...entries.map(e => e[1]));
                deptEl.innerHTML = entries.map(([dept, count]) => {
                    const pct = Math.round((count / max) * 100);
                    return `<div class="asset-kpi-row">
                        <span class="asset-kpi-label">${escapeHtml(dept)}</span>
                        <div class="asset-kpi-bar-wrap"><div class="asset-kpi-bar asset-kpi-bar-dept" style="width:${pct}%"></div></div>
                        <span class="asset-kpi-count">${count}</span>
                    </div>`;
                }).join('');
            }
        }

        // Recent assets
        const recentEl = document.getElementById('assets-recent');
        if (recentEl) {
            if (kpis.recentAssets.length === 0) {
                recentEl.innerHTML = '<p class="empty-state" style="font-size:0.9em;color:var(--brand-muted)">No assets added yet.</p>';
            } else {
                recentEl.innerHTML = kpis.recentAssets.map(a => {
                    const sc = ASSET_STATUS_COLORS[a.status] || ASSET_STATUS_COLORS.available;
                    const icon = ASSET_TYPE_ICONS[a.type] || '📦';
                    return `<div class="ls-overview-row">
                        <span class="asset-type-icon" style="flex-shrink:0">${icon}</span>
                        <div style="flex:1;min-width:0">
                            <div class="ls-overview-name">${escapeHtml(a.name)}</div>
                            ${a.assignedTo ? `<div style="font-size:0.78em;color:var(--brand-muted)">${escapeHtml(a.assignedTo)}</div>` : ''}
                        </div>
                        <span class="asset-status-badge" style="background:${sc.bg};color:${sc.color};flex-shrink:0">${sc.label}</span>
                    </div>`;
                }).join('');
            }
        }
    } catch (err) {
        const kpiEl = document.getElementById('assets-kpi-cards');
        if (kpiEl) kpiEl.innerHTML = '<p class="error-state">Failed to load dashboard.</p>';
    }
}

function openAssetModal() {
    const modal = document.getElementById('asset-modal');
    const form = document.getElementById('asset-form');
    form.reset();
    document.getElementById('asset-id').value = '';
    document.getElementById('asset-modal-title').textContent = 'Add IT Asset';
    document.getElementById('asset-submit-btn').textContent = 'Add Asset';
    document.getElementById('asset-success').classList.add('hidden');
    document.getElementById('asset-error').classList.add('hidden');
    modal.classList.remove('hidden');
}

function openEditAssetModal(id) {
    const asset = allITAssets.find(a => a.id === id);
    if (!asset) return;
    document.getElementById('asset-modal-title').textContent = 'Edit IT Asset';
    document.getElementById('asset-submit-btn').textContent = 'Save Changes';
    document.getElementById('asset-id').value = asset.id;
    document.getElementById('asset-name').value = asset.name || '';
    document.getElementById('asset-tag').value = asset.assetTag || '';
    document.getElementById('asset-type').value = asset.type || '';
    document.getElementById('asset-brand').value = asset.brand || '';
    document.getElementById('asset-model').value = asset.model || '';
    document.getElementById('asset-serial').value = asset.serialNumber || '';
    document.getElementById('asset-status').value = asset.status || 'available';
    document.getElementById('asset-condition').value = asset.condition || 'good';
    document.getElementById('asset-assigned-to').value = asset.assignedTo || '';
    document.getElementById('asset-assigned-email').value = asset.assignedEmail || '';
    document.getElementById('asset-department').value = asset.department || '';
    document.getElementById('asset-location').value = asset.location || '';
    document.getElementById('asset-purchase-date').value = asset.purchaseDate || '';
    document.getElementById('asset-price').value = asset.purchasePrice !== null && asset.purchasePrice !== undefined ? asset.purchasePrice : '';
    document.getElementById('asset-currency').value = asset.currency || 'EUR';
    document.getElementById('asset-warranty').value = asset.warrantyExpiry || '';
    document.getElementById('asset-notes').value = asset.notes || '';
    document.getElementById('asset-success').classList.add('hidden');
    document.getElementById('asset-error').classList.add('hidden');
    document.getElementById('asset-modal').classList.remove('hidden');
}

function closeAssetModal() {
    document.getElementById('asset-modal').classList.add('hidden');
}

function closeAssetModalOnBg(e) {
    if (e.target === document.getElementById('asset-modal')) closeAssetModal();
}

async function submitAsset(event) {
    event.preventDefault();
    const id = document.getElementById('asset-id').value;
    const successEl = document.getElementById('asset-success');
    const errorEl = document.getElementById('asset-error');
    successEl.classList.add('hidden');
    errorEl.classList.add('hidden');

    const priceRaw = document.getElementById('asset-price').value;
    const payload = {
        assetTag: document.getElementById('asset-tag').value.trim(),
        name: document.getElementById('asset-name').value.trim(),
        type: document.getElementById('asset-type').value,
        brand: document.getElementById('asset-brand').value.trim(),
        model: document.getElementById('asset-model').value.trim(),
        serialNumber: document.getElementById('asset-serial').value.trim(),
        status: document.getElementById('asset-status').value,
        condition: document.getElementById('asset-condition').value,
        assignedTo: document.getElementById('asset-assigned-to').value.trim(),
        assignedEmail: document.getElementById('asset-assigned-email').value.trim(),
        department: document.getElementById('asset-department').value.trim(),
        location: document.getElementById('asset-location').value.trim(),
        purchaseDate: document.getElementById('asset-purchase-date').value || null,
        purchasePrice: priceRaw !== '' ? parseFloat(priceRaw) : null,
        currency: document.getElementById('asset-currency').value,
        warrantyExpiry: document.getElementById('asset-warranty').value || null,
        notes: document.getElementById('asset-notes').value.trim()
    };

    try {
        const url = id ? `${API_URL}/it-assets/${id}` : `${API_URL}/it-assets`;
        const method = id ? 'PUT' : 'POST';
        const res = await fetch(url, {
            method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        const data = await res.json();
        if (!res.ok) {
            errorEl.textContent = data.error || 'Error saving asset';
            errorEl.classList.remove('hidden');
            return;
        }
        successEl.textContent = id ? 'Asset updated successfully!' : 'Asset added successfully!';
        successEl.classList.remove('hidden');
        if (id) {
            const idx = allITAssets.findIndex(a => a.id === id);
            if (idx !== -1) allITAssets[idx] = data;
        } else {
            allITAssets.push(data);
        }
        populateAssetDeptFilter();
        renderITAssets();
        renderAssetDashboard();
        setTimeout(() => closeAssetModal(), 1200);
    } catch (err) {
        errorEl.textContent = 'Network error. Please try again.';
        errorEl.classList.remove('hidden');
    }
}

async function deleteAsset(id) {
    if (!confirm('Are you sure you want to delete this asset?')) return;
    try {
        const res = await fetch(`${API_URL}/it-assets/${id}`, { method: 'DELETE' });
        if (!res.ok) { const d = await res.json(); alert(d.error || 'Error deleting asset'); return; }
        allITAssets = allITAssets.filter(a => a.id !== id);
        populateAssetDeptFilter();
        renderITAssets();
        renderAssetDashboard();
    } catch (err) {
        alert('Network error. Please try again.');
    }
}


// ─── Skills & Talent Module ───────────────────────────────────────────────────

let allSkillProfiles = [];
let allSkillCategories = [];
// Transient skills being built in the add/edit modal
let pendingProfileSkills = [];

const COMPETENCE_CENTRE_COLORS = {
    'Cutover & Release Management':    { bg: '#fce4ec', color: '#880e4f' },
    'Programme & Project Management':  { bg: '#e8eaf6', color: '#283593' },
    'Regulatory Reporting':            { bg: '#fff8e1', color: '#f57f17' },
    'Core Integration':                { bg: '#e8f5e9', color: '#1b5e20' }
};

const EMPLOYMENT_TYPE_COLORS = {
    Permanent:   { bg: '#e3f2fd', color: '#1565c0' },
    Contractor:  { bg: '#f3e5f5', color: '#4a148c' },
    Freelancer:  { bg: '#fff3e0', color: '#bf360c' },
    'Part-time': { bg: '#e0f2f1', color: '#004d40' },
    Intern:      { bg: '#f9fbe7', color: '#558b2f' },
    Other:       { bg: '#f5f5f5', color: '#616161' }
};

const SKILL_LEVEL_COLORS = {
    Beginner:     { bg: '#f5f5f5', color: '#757575' },
    Intermediate: { bg: '#e3f2fd', color: '#1565c0' },
    Advanced:     { bg: '#e8f5e9', color: '#2e7d32' },
    Expert:       { bg: '#fce4ec', color: '#880e4f' }
};

function showSkillsSection(sectionId, btn) {
    document.querySelectorAll('#skills-tab .ob-section').forEach(s => s.classList.remove('active'));
    document.querySelectorAll('#skills-tab .sub-tab-btn').forEach(b => b.classList.remove('active'));
    const el = document.getElementById(sectionId);
    if (el) el.classList.add('active');
    if (btn) btn.classList.add('active');
    if (sectionId === 'skills-categories') renderSkillCategories();
}

// ── Data loading ──────────────────────────────────────────────────────────────

async function loadSkillProfiles() {
    try {
        const res = await fetch(`${API_URL}/employee-skills`);
        if (!res.ok) throw new Error('Failed to load skill profiles');
        allSkillProfiles = await res.json();
        renderSkillProfiles();
        renderSkillsDashboard();
    } catch (err) {
        document.getElementById('skills-table-container').innerHTML = '<p class="error-state">Failed to load talent profiles.</p>';
    }
}

async function loadSkillCategoriesForFilter() {
    try {
        const res = await fetch(`${API_URL}/skill-categories`);
        if (!res.ok) throw new Error('Failed to load skill categories');
        allSkillCategories = await res.json();
    } catch (_) {
        allSkillCategories = [];
    }
}

// ── Dashboard ─────────────────────────────────────────────────────────────────

function renderSkillsDashboard() {
    const total = allSkillProfiles.length;
    const totalSkills = allSkillProfiles.reduce((s, p) => s + (p.skills ? p.skills.length : 0), 0);

    // KPI cards
    const kpiContainer = document.getElementById('skills-kpi-cards');
    if (kpiContainer) {
        kpiContainer.innerHTML = `
            <div class="kpi-card">
                <div class="kpi-value">${total}</div>
                <div class="kpi-label">Total Profiles</div>
            </div>
            <div class="kpi-card">
                <div class="kpi-value">${totalSkills}</div>
                <div class="kpi-label">Skills Mapped</div>
            </div>
            <div class="kpi-card">
                <div class="kpi-value">${total > 0 ? Math.round(totalSkills / total * 10) / 10 : 0}</div>
                <div class="kpi-label">Avg Skills / Person</div>
            </div>
            <div class="kpi-card">
                <div class="kpi-value">${allSkillProfiles.filter(p => p.employmentType === 'Permanent').length}</div>
                <div class="kpi-label">Permanent Staff</div>
            </div>`;
    }

    // By competence centre
    const byCentre = {};
    allSkillProfiles.forEach(p => {
        byCentre[p.competenceCentre] = (byCentre[p.competenceCentre] || 0) + 1;
    });
    const centreEl = document.getElementById('skills-by-centre');
    if (centreEl) {
        if (Object.keys(byCentre).length === 0) {
            centreEl.innerHTML = '<p class="empty-state" style="font-size:var(--fs-sm)">No data yet.</p>';
        } else {
            centreEl.innerHTML = Object.entries(byCentre)
                .sort((a, b) => b[1] - a[1])
                .map(([name, count]) => {
                    const c = COMPETENCE_CENTRE_COLORS[name] || { bg: '#f5f5f5', color: '#616161' };
                    const pct = total > 0 ? Math.round(count / total * 100) : 0;
                    return `<div class="asset-kpi-row">
                        <div class="asset-kpi-label" style="min-width:180px">${escapeHtml(name)}</div>
                        <div class="asset-kpi-bar-wrap"><div class="asset-kpi-bar" style="width:${pct}%;background:${c.color}"></div></div>
                        <span class="skills-count-badge" style="background:${c.bg};color:${c.color}">${count}</span>
                    </div>`;
                }).join('');
        }
    }

    // By employment type
    const byEmployment = {};
    allSkillProfiles.forEach(p => {
        byEmployment[p.employmentType] = (byEmployment[p.employmentType] || 0) + 1;
    });
    const empEl = document.getElementById('skills-by-employment');
    if (empEl) {
        if (Object.keys(byEmployment).length === 0) {
            empEl.innerHTML = '<p class="empty-state" style="font-size:var(--fs-sm)">No data yet.</p>';
        } else {
            empEl.innerHTML = Object.entries(byEmployment)
                .sort((a, b) => b[1] - a[1])
                .map(([type, count]) => {
                    const c = EMPLOYMENT_TYPE_COLORS[type] || EMPLOYMENT_TYPE_COLORS.Other;
                    const pct = total > 0 ? Math.round(count / total * 100) : 0;
                    return `<div class="asset-kpi-row">
                        <div class="asset-kpi-label" style="min-width:100px">${escapeHtml(type)}</div>
                        <div class="asset-kpi-bar-wrap"><div class="asset-kpi-bar" style="width:${pct}%;background:${c.color}"></div></div>
                        <span class="skills-count-badge" style="background:${c.bg};color:${c.color}">${count}</span>
                    </div>`;
                }).join('');
        }
    }

    // Top skills
    const skillCount = {};
    allSkillProfiles.forEach(p => {
        (p.skills || []).forEach(s => {
            skillCount[s.name] = (skillCount[s.name] || 0) + 1;
        });
    });
    const topSkillsEl = document.getElementById('skills-top-skills');
    if (topSkillsEl) {
        const top = Object.entries(skillCount).sort((a, b) => b[1] - a[1]).slice(0, 8);
        if (top.length === 0) {
            topSkillsEl.innerHTML = '<p class="empty-state" style="font-size:var(--fs-sm)">No skills added yet.</p>';
        } else {
            topSkillsEl.innerHTML = top.map(([name, count]) =>
                `<div class="asset-kpi-row">
                    <div class="asset-kpi-label" style="flex:1">${escapeHtml(name)}</div>
                    <span class="skills-count-badge" style="background:#e3f2fd;color:#1565c0">${count}</span>
                </div>`
            ).join('');
        }
    }
}

// ── Talent Directory ──────────────────────────────────────────────────────────

function renderSkillProfiles() {
    const search = (document.getElementById('skills-search')?.value || '').toLowerCase();
    const centre = document.getElementById('skills-filter-centre')?.value || '';
    const employment = document.getElementById('skills-filter-employment')?.value || '';

    let profiles = allSkillProfiles.filter(p => {
        if (centre && p.competenceCentre !== centre) return false;
        if (employment && p.employmentType !== employment) return false;
        if (search) {
            const skillNames = (p.skills || []).map(s => s.name).join(' ').toLowerCase();
            const haystack = [p.employeeName, skillNames].join(' ').toLowerCase();
            if (!haystack.includes(search)) return false;
        }
        return true;
    });

    const container = document.getElementById('skills-table-container');
    if (!container) return;

    if (profiles.length === 0) {
        container.innerHTML = '<p class="empty-state">No talent profiles found. Click "+ Add Profile" to get started.</p>';
        return;
    }

    container.innerHTML = `<div class="asset-table-scroll"><table class="asset-table">
        <thead>
            <tr>
                <th>Employee</th>
                <th>Employment Type</th>
                <th>Competence Centre</th>
                <th>Skills</th>
                <th>Actions</th>
            </tr>
        </thead>
        <tbody>
            ${profiles.map(profile => {
                const cc = COMPETENCE_CENTRE_COLORS[profile.competenceCentre] || { bg: '#f5f5f5', color: '#616161' };
                const ec = EMPLOYMENT_TYPE_COLORS[profile.employmentType] || EMPLOYMENT_TYPE_COLORS.Other;
                const skillTags = (profile.skills || []).slice(0, 4).map(s => {
                    const lc = SKILL_LEVEL_COLORS[s.level] || SKILL_LEVEL_COLORS.Intermediate;
                    return `<span class="skill-tag" style="background:${lc.bg};color:${lc.color}">${escapeHtml(s.name)}</span>`;
                }).join('');
                const extraCount = (profile.skills || []).length > 4 ? `<span class="skill-tag-more">+${profile.skills.length - 4}</span>` : '';
                return `<tr>
                    <td><span class="asset-name">${escapeHtml(profile.employeeName)}</span></td>
                    <td><span class="asset-status-badge" style="background:${ec.bg};color:${ec.color}">${escapeHtml(profile.employmentType)}</span></td>
                    <td><span class="asset-status-badge" style="background:${cc.bg};color:${cc.color}">${escapeHtml(profile.competenceCentre)}</span></td>
                    <td><div class="skill-tags-cell">${skillTags}${extraCount}</div></td>
                    <td>
                        <div class="it-tool-actions">
                            <button class="it-tool-btn it-tool-btn-edit" onclick="openSkillProfileModal('${escapeHtml(profile.id)}')">Edit</button>
                            <button class="it-tool-btn it-tool-btn-delete" onclick="deleteSkillProfile('${escapeHtml(profile.id)}')">Delete</button>
                        </div>
                    </td>
                </tr>`;
            }).join('')}
        </tbody>
    </table></div>`;
}

// ── Skill Categories ──────────────────────────────────────────────────────────

async function renderSkillCategories() {
    if (allSkillCategories.length === 0) {
        try {
            const res = await fetch(`${API_URL}/skill-categories`);
            if (res.ok) allSkillCategories = await res.json();
        } catch (_) {}
    }

    const container = document.getElementById('skill-categories-container');
    if (!container) return;

    if (allSkillCategories.length === 0) {
        container.innerHTML = '<p class="empty-state">No skill categories found.</p>';
        return;
    }

    container.innerHTML = `<div class="asset-table-scroll"><table class="asset-table">
        <thead>
            <tr>
                <th>Category Name</th>
                <th>Description</th>
                <th>Type</th>
                <th>Actions</th>
            </tr>
        </thead>
        <tbody>
            ${allSkillCategories.map(cat => `<tr>
                <td><span class="asset-name">${escapeHtml(cat.name)}</span></td>
                <td>${escapeHtml(cat.description || '—')}</td>
                <td><span class="asset-status-badge" style="background:${cat.isCustom ? '#e8f5e9' : '#e3f2fd'};color:${cat.isCustom ? '#2e7d32' : '#1565c0'}">${cat.isCustom ? 'Custom' : 'Built-in'}</span></td>
                <td>
                    <div class="it-tool-actions">
                        ${cat.isCustom
                            ? `<button class="it-tool-btn it-tool-btn-edit" onclick="openSkillCategoryModal('${escapeHtml(cat.id)}')">Edit</button>
                               <button class="it-tool-btn it-tool-btn-delete" onclick="deleteSkillCategory('${escapeHtml(cat.id)}')">Delete</button>`
                            : '<span style="color:var(--brand-muted);font-size:var(--fs-sm)">Built-in</span>'
                        }
                    </div>
                </td>
            </tr>`).join('')}
        </tbody>
    </table></div>`;
}

// ── Skill Profile Modal ───────────────────────────────────────────────────────

function populateCategoryDropdown() {
    const sel = document.getElementById('sp-skill-category');
    if (!sel) return;
    sel.innerHTML = '<option value="">Category</option>' +
        allSkillCategories.map(c => `<option value="${escapeHtml(c.name)}">${escapeHtml(c.name)}</option>`).join('');
}

function renderPendingSkills() {
    const list = document.getElementById('sp-skills-list');
    if (!list) return;
    if (pendingProfileSkills.length === 0) {
        list.innerHTML = '<p class="sp-no-skills">No skills added yet.</p>';
        return;
    }
    list.innerHTML = pendingProfileSkills.map((s, i) => {
        const lc = SKILL_LEVEL_COLORS[s.level] || SKILL_LEVEL_COLORS.Intermediate;
        return `<div class="sp-skill-item">
            <span class="skill-tag" style="background:${lc.bg};color:${lc.color}">${escapeHtml(s.name)}</span>
            ${s.category ? `<span class="sp-skill-cat">${escapeHtml(s.category)}</span>` : ''}
            <span class="sp-skill-level">${escapeHtml(s.level)}</span>
            <button type="button" class="sp-remove-skill" onclick="removePendingSkill(${i})">✕</button>
        </div>`;
    }).join('');
}

function addSkillToProfile() {
    const name = document.getElementById('sp-skill-name')?.value.trim();
    if (!name) return;
    const category = document.getElementById('sp-skill-category')?.value || '';
    const level = document.getElementById('sp-skill-level')?.value || 'Intermediate';
    if (pendingProfileSkills.some(s => s.name.toLowerCase() === name.toLowerCase())) {
        return;
    }
    pendingProfileSkills.push({ name, category, level });
    document.getElementById('sp-skill-name').value = '';
    renderPendingSkills();
}

function removePendingSkill(idx) {
    pendingProfileSkills.splice(idx, 1);
    renderPendingSkills();
}

async function openSkillProfileModal(profileId) {
    if (allSkillCategories.length === 0) {
        await loadSkillCategoriesForFilter();
    }
    pendingProfileSkills = [];

    const modal = document.getElementById('skill-profile-modal');
    const titleEl = document.getElementById('skill-profile-modal-title');
    const submitBtn = document.getElementById('sp-submit-btn');
    document.getElementById('skill-profile-id').value = '';
    document.getElementById('sp-employee-name').value = '';
    document.getElementById('sp-employment-type').value = '';
    document.getElementById('sp-competence-centre').value = '';
    document.getElementById('sp-notes').value = '';
    document.getElementById('sp-success').classList.add('hidden');
    document.getElementById('sp-error').classList.add('hidden');

    populateCategoryDropdown();
    renderPendingSkills();

    if (profileId) {
        const profile = allSkillProfiles.find(p => p.id === profileId);
        if (profile) {
            titleEl.textContent = 'Edit Talent Profile';
            submitBtn.textContent = 'Save Changes';
            document.getElementById('skill-profile-id').value = profile.id;
            document.getElementById('sp-employee-name').value = profile.employeeName;
            document.getElementById('sp-employment-type').value = profile.employmentType;
            document.getElementById('sp-competence-centre').value = profile.competenceCentre;
            document.getElementById('sp-notes').value = profile.notes || '';
            pendingProfileSkills = (profile.skills || []).map(s => ({ ...s }));
            renderPendingSkills();
        }
    } else {
        titleEl.textContent = 'Add Talent Profile';
        submitBtn.textContent = 'Add Profile';
    }

    modal.classList.remove('hidden');
}

function closeSkillProfileModal() {
    document.getElementById('skill-profile-modal').classList.add('hidden');
}

function closeSkillProfileModalOnBg(event) {
    if (event.target === document.getElementById('skill-profile-modal')) closeSkillProfileModal();
}

async function submitSkillProfile(event) {
    event.preventDefault();
    const id = document.getElementById('skill-profile-id').value;
    const successEl = document.getElementById('sp-success');
    const errorEl = document.getElementById('sp-error');
    successEl.classList.add('hidden');
    errorEl.classList.add('hidden');

    const payload = {
        employeeName: document.getElementById('sp-employee-name').value.trim(),
        employmentType: document.getElementById('sp-employment-type').value,
        competenceCentre: document.getElementById('sp-competence-centre').value,
        skills: pendingProfileSkills,
        notes: document.getElementById('sp-notes').value.trim()
    };

    try {
        const url = id ? `${API_URL}/employee-skills/${id}` : `${API_URL}/employee-skills`;
        const method = id ? 'PUT' : 'POST';
        const res = await fetch(url, {
            method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        const data = await res.json();
        if (!res.ok) {
            errorEl.textContent = data.error || 'Error saving profile';
            errorEl.classList.remove('hidden');
            return;
        }
        successEl.textContent = id ? 'Profile updated successfully!' : 'Profile added successfully!';
        successEl.classList.remove('hidden');
        if (id) {
            const idx = allSkillProfiles.findIndex(p => p.id === id);
            if (idx !== -1) allSkillProfiles[idx] = data;
        } else {
            allSkillProfiles.push(data);
        }
        renderSkillProfiles();
        renderSkillsDashboard();
        setTimeout(() => closeSkillProfileModal(), 1200);
    } catch (err) {
        errorEl.textContent = 'Network error. Please try again.';
        errorEl.classList.remove('hidden');
    }
}

async function deleteSkillProfile(id) {
    if (!confirm('Are you sure you want to delete this talent profile?')) return;
    try {
        const res = await fetch(`${API_URL}/employee-skills/${id}`, { method: 'DELETE' });
        if (!res.ok) { const d = await res.json(); alert(d.error || 'Error deleting profile'); return; }
        allSkillProfiles = allSkillProfiles.filter(p => p.id !== id);
        renderSkillProfiles();
        renderSkillsDashboard();
    } catch (err) {
        alert('Network error. Please try again.');
    }
}

// ── Skill Category Modal ──────────────────────────────────────────────────────

function openSkillCategoryModal(categoryId) {
    const modal = document.getElementById('skill-category-modal');
    const titleEl = document.getElementById('skill-category-modal-title');
    const submitBtn = document.getElementById('sc-submit-btn');
    document.getElementById('sc-id').value = '';
    document.getElementById('sc-name').value = '';
    document.getElementById('sc-description').value = '';
    document.getElementById('sc-success').classList.add('hidden');
    document.getElementById('sc-error').classList.add('hidden');

    if (categoryId) {
        const cat = allSkillCategories.find(c => c.id === categoryId);
        if (cat) {
            titleEl.textContent = 'Edit Skill Category';
            submitBtn.textContent = 'Save Changes';
            document.getElementById('sc-id').value = cat.id;
            document.getElementById('sc-name').value = cat.name;
            document.getElementById('sc-description').value = cat.description || '';
        }
    } else {
        titleEl.textContent = 'Add Skill Category';
        submitBtn.textContent = 'Add Category';
    }
    modal.classList.remove('hidden');
}

function closeSkillCategoryModal() {
    document.getElementById('skill-category-modal').classList.add('hidden');
}

function closeSkillCategoryModalOnBg(event) {
    if (event.target === document.getElementById('skill-category-modal')) closeSkillCategoryModal();
}

async function submitSkillCategory(event) {
    event.preventDefault();
    const id = document.getElementById('sc-id').value;
    const successEl = document.getElementById('sc-success');
    const errorEl = document.getElementById('sc-error');
    successEl.classList.add('hidden');
    errorEl.classList.add('hidden');

    const payload = {
        name: document.getElementById('sc-name').value.trim(),
        description: document.getElementById('sc-description').value.trim()
    };

    try {
        const url = id ? `${API_URL}/skill-categories/${id}` : `${API_URL}/skill-categories`;
        const method = id ? 'PUT' : 'POST';
        const res = await fetch(url, {
            method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        const data = await res.json();
        if (!res.ok) {
            errorEl.textContent = data.error || 'Error saving category';
            errorEl.classList.remove('hidden');
            return;
        }
        successEl.textContent = id ? 'Category updated!' : 'Category added!';
        successEl.classList.remove('hidden');
        if (id) {
            const idx = allSkillCategories.findIndex(c => c.id === id);
            if (idx !== -1) allSkillCategories[idx] = data;
        } else {
            allSkillCategories.push(data);
        }
        renderSkillCategories();
        setTimeout(() => closeSkillCategoryModal(), 1200);
    } catch (err) {
        errorEl.textContent = 'Network error. Please try again.';
        errorEl.classList.remove('hidden');
    }
}

async function deleteSkillCategory(id) {
    if (!confirm('Are you sure you want to delete this skill category?')) return;
    try {
        const res = await fetch(`${API_URL}/skill-categories/${id}`, { method: 'DELETE' });
        if (!res.ok) { const d = await res.json(); alert(d.error || 'Error deleting category'); return; }
        allSkillCategories = allSkillCategories.filter(c => c.id !== id);
        renderSkillCategories();
    } catch (err) {
        alert('Network error. Please try again.');
    }
}

// ─── CRM Contacts ─────────────────────────────────────────────────────────────

const CRM_TYPE_COLORS = {
    Lead:     { bg: '#e3f2fd', color: '#1565c0' },
    Prospect: { bg: '#fff8e1', color: '#f57f17' },
    Client:   { bg: '#e8f5e9', color: '#2e7d32' },
    Partner:  { bg: '#f3e5f5', color: '#6a1b9a' }
};

function showCRMSection(sectionId, btn) {
    document.querySelectorAll('#crm-tab .ob-section').forEach(s => s.classList.remove('active'));
    document.querySelectorAll('#crm-tab .sub-tab-btn').forEach(b => b.classList.remove('active'));
    const el = document.getElementById(sectionId);
    if (el) el.classList.add('active');
    if (btn) btn.classList.add('active');
}

async function loadCRMContacts() {
    try {
        const res = await fetch(`${API_URL}/crm/contacts`);
        if (!res.ok) throw new Error('Failed to load contacts');
        allCRMContacts = await res.json();
        renderCRMContacts();
        renderCRMDashboard();
    } catch (err) {
        const c = document.getElementById('crm-table-container');
        if (c) c.innerHTML = '<p class="error-state">Failed to load contacts.</p>';
    }
}

function renderCRMDashboard() {
    const total = allCRMContacts.length;
    const clients = allCRMContacts.filter(c => c.type === 'Client').length;
    const prospects = allCRMContacts.filter(c => c.type === 'Prospect').length;
    const leads = allCRMContacts.filter(c => c.type === 'Lead').length;

    const kpiEl = document.getElementById('crm-kpi-cards');
    if (kpiEl) {
        kpiEl.innerHTML = `
            <div class="kpi-card"><div class="kpi-value">${total}</div><div class="kpi-label">Total Contacts</div></div>
            <div class="kpi-card"><div class="kpi-value" style="color:#2e7d32">${clients}</div><div class="kpi-label">Clients</div></div>
            <div class="kpi-card"><div class="kpi-value" style="color:#f57f17">${prospects}</div><div class="kpi-label">Prospects</div></div>
            <div class="kpi-card"><div class="kpi-value" style="color:#1565c0">${leads}</div><div class="kpi-label">Leads</div></div>
        `;
    }

    // By Type chart
    const byType = {};
    allCRMContacts.forEach(c => { byType[c.type] = (byType[c.type] || 0) + 1; });
    const byTypeEl = document.getElementById('crm-by-type');
    if (byTypeEl) {
        if (Object.keys(byType).length === 0) {
            byTypeEl.innerHTML = '<p class="empty-state" style="font-size:var(--fs-sm)">No contacts yet.</p>';
        } else {
            byTypeEl.innerHTML = Object.entries(byType).sort((a, b) => b[1] - a[1]).map(([type, count]) => {
                const pct = Math.round((count / total) * 100);
                const col = (CRM_TYPE_COLORS[type] || { bg: '#f5f5f5', color: '#616161' }).color;
                return `<div class="chart-bar-row">
                    <span class="chart-bar-label">${escapeHtml(type)}</span>
                    <div class="chart-bar-track"><div class="chart-bar-fill" style="width:${pct}%;background:${col}"></div></div>
                    <span class="chart-bar-count">${count}</span>
                </div>`;
            }).join('');
        }
    }

    // By Company
    const byCompany = {};
    allCRMContacts.filter(c => c.company).forEach(c => { byCompany[c.company] = (byCompany[c.company] || 0) + 1; });
    const byCompanyEl = document.getElementById('crm-by-company');
    if (byCompanyEl) {
        const entries = Object.entries(byCompany).sort((a, b) => b[1] - a[1]).slice(0, 6);
        if (entries.length === 0) {
            byCompanyEl.innerHTML = '<p class="empty-state" style="font-size:var(--fs-sm)">No data yet.</p>';
        } else {
            const max = entries[0][1];
            byCompanyEl.innerHTML = entries.map(([co, count]) => {
                const pct = Math.round((count / max) * 100);
                return `<div class="chart-bar-row">
                    <span class="chart-bar-label">${escapeHtml(co)}</span>
                    <div class="chart-bar-track"><div class="chart-bar-fill" style="width:${pct}%;background:#C8312B"></div></div>
                    <span class="chart-bar-count">${count}</span>
                </div>`;
            }).join('');
        }
    }

    // Recent contacts
    const recentEl = document.getElementById('crm-recent');
    if (recentEl) {
        const recent = [...allCRMContacts].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).slice(0, 5);
        if (recent.length === 0) {
            recentEl.innerHTML = '<p class="empty-state" style="font-size:var(--fs-sm)">No contacts yet.</p>';
        } else {
            recentEl.innerHTML = recent.map(c => {
                const typeColors = CRM_TYPE_COLORS[c.type] || { bg: '#f5f5f5', color: '#616161' };
                return `<div class="recent-item">
                    <div class="recent-item-main">
                        <span class="recent-item-name">${escapeHtml(c.firstName)} ${escapeHtml(c.lastName)}</span>
                        <span class="crm-type-badge" style="background:${typeColors.bg};color:${typeColors.color}">${escapeHtml(c.type)}</span>
                    </div>
                    <div class="recent-item-sub">${c.company ? escapeHtml(c.company) : '—'}</div>
                </div>`;
            }).join('');
        }
    }
}

function renderCRMContacts() {
    const search = (document.getElementById('crm-search')?.value || '').toLowerCase();
    const type = document.getElementById('crm-filter-type')?.value || '';
    const status = document.getElementById('crm-filter-status')?.value || '';

    let contacts = allCRMContacts.filter(c => {
        if (type && c.type !== type) return false;
        if (status && c.status !== status) return false;
        if (search) {
            const hay = [c.firstName, c.lastName, c.company, c.email, c.jobTitle].join(' ').toLowerCase();
            if (!hay.includes(search)) return false;
        }
        return true;
    });

    const container = document.getElementById('crm-table-container');
    if (!container) return;

    if (contacts.length === 0) {
        container.innerHTML = '<p class="empty-state">No contacts found. Click "+ Add Contact" to get started.</p>';
        return;
    }

    container.innerHTML = `<div class="asset-table-scroll"><table class="asset-table">
        <thead>
            <tr>
                <th>Name</th>
                <th>Company</th>
                <th>Job Title</th>
                <th>Email</th>
                <th>Phone</th>
                <th>Type</th>
                <th>Status</th>
                <th>Actions</th>
            </tr>
        </thead>
        <tbody>
            ${contacts.map(c => {
                const typeColors = CRM_TYPE_COLORS[c.type] || { bg: '#f5f5f5', color: '#616161' };
                const statusBg = c.status === 'Active' ? '#e8f5e9' : '#f5f5f5';
                const statusColor = c.status === 'Active' ? '#2e7d32' : '#616161';
                return `<tr>
                    <td>
                        <div class="asset-name">${escapeHtml(c.firstName)} ${escapeHtml(c.lastName)}</div>
                    </td>
                    <td>${c.company ? escapeHtml(c.company) : '—'}</td>
                    <td>${c.jobTitle ? escapeHtml(c.jobTitle) : '—'}</td>
                    <td>${c.email ? `<a href="mailto:${escapeHtml(c.email)}" class="crm-email-link">${escapeHtml(c.email)}</a>` : '—'}</td>
                    <td>${c.phone ? escapeHtml(c.phone) : '—'}</td>
                    <td><span class="crm-type-badge" style="background:${typeColors.bg};color:${typeColors.color}">${escapeHtml(c.type)}</span></td>
                    <td><span class="asset-status-badge" style="background:${statusBg};color:${statusColor}">${escapeHtml(c.status)}</span></td>
                    <td>
                        <div class="action-btns">
                            <button class="btn-icon" title="Edit" onclick="openContactModal('${escapeHtml(c.id)}')">✏️</button>
                            <button class="btn-icon btn-icon-danger" title="Delete" onclick="deleteContact('${escapeHtml(c.id)}')">🗑️</button>
                        </div>
                    </td>
                </tr>`;
            }).join('')}
        </tbody>
    </table></div>`;
}

function openContactModal(contactId) {
    const modal = document.getElementById('contact-modal');
    const titleEl = document.getElementById('contact-modal-title');
    const submitBtn = document.getElementById('contact-submit-btn');
    document.getElementById('contact-id').value = '';
    document.getElementById('contact-firstname').value = '';
    document.getElementById('contact-lastname').value = '';
    document.getElementById('contact-company').value = '';
    document.getElementById('contact-jobtitle').value = '';
    document.getElementById('contact-email').value = '';
    document.getElementById('contact-phone').value = '';
    document.getElementById('contact-type').value = '';
    document.getElementById('contact-status').value = 'Active';
    document.getElementById('contact-notes').value = '';
    document.getElementById('contact-success').classList.add('hidden');
    document.getElementById('contact-error').classList.add('hidden');

    if (contactId) {
        const contact = allCRMContacts.find(c => c.id === contactId);
        if (contact) {
            titleEl.textContent = 'Edit Contact';
            submitBtn.textContent = 'Save Changes';
            document.getElementById('contact-id').value = contact.id;
            document.getElementById('contact-firstname').value = contact.firstName;
            document.getElementById('contact-lastname').value = contact.lastName;
            document.getElementById('contact-company').value = contact.company || '';
            document.getElementById('contact-jobtitle').value = contact.jobTitle || '';
            document.getElementById('contact-email').value = contact.email || '';
            document.getElementById('contact-phone').value = contact.phone || '';
            document.getElementById('contact-type').value = contact.type;
            document.getElementById('contact-status').value = contact.status;
            document.getElementById('contact-notes').value = contact.notes || '';
        }
    } else {
        titleEl.textContent = 'Add Contact';
        submitBtn.textContent = 'Add Contact';
    }
    modal.classList.remove('hidden');
}

function closeContactModal() {
    document.getElementById('contact-modal').classList.add('hidden');
}

function closeContactModalOnBg(event) {
    if (event.target === document.getElementById('contact-modal')) closeContactModal();
}

async function submitContact(event) {
    event.preventDefault();
    const id = document.getElementById('contact-id').value;
    const successEl = document.getElementById('contact-success');
    const errorEl = document.getElementById('contact-error');
    successEl.classList.add('hidden');
    errorEl.classList.add('hidden');

    const payload = {
        firstName: document.getElementById('contact-firstname').value.trim(),
        lastName: document.getElementById('contact-lastname').value.trim(),
        company: document.getElementById('contact-company').value.trim(),
        jobTitle: document.getElementById('contact-jobtitle').value.trim(),
        email: document.getElementById('contact-email').value.trim(),
        phone: document.getElementById('contact-phone').value.trim(),
        type: document.getElementById('contact-type').value,
        status: document.getElementById('contact-status').value,
        notes: document.getElementById('contact-notes').value.trim()
    };

    try {
        const url = id ? `${API_URL}/crm/contacts/${id}` : `${API_URL}/crm/contacts`;
        const method = id ? 'PUT' : 'POST';
        const res = await fetch(url, {
            method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        const data = await res.json();
        if (!res.ok) {
            errorEl.textContent = data.error || 'Error saving contact';
            errorEl.classList.remove('hidden');
            return;
        }
        successEl.textContent = id ? 'Contact updated!' : 'Contact added!';
        successEl.classList.remove('hidden');
        if (id) {
            const idx = allCRMContacts.findIndex(c => c.id === id);
            if (idx !== -1) allCRMContacts[idx] = data;
        } else {
            allCRMContacts.push(data);
        }
        renderCRMContacts();
        renderCRMDashboard();
        setTimeout(() => closeContactModal(), 1200);
    } catch (err) {
        errorEl.textContent = 'Network error. Please try again.';
        errorEl.classList.remove('hidden');
    }
}

async function deleteContact(id) {
    if (!confirm('Are you sure you want to delete this contact?')) return;
    try {
        const res = await fetch(`${API_URL}/crm/contacts/${id}`, { method: 'DELETE' });
        if (!res.ok) { const d = await res.json(); alert(d.error || 'Error deleting contact'); return; }
        allCRMContacts = allCRMContacts.filter(c => c.id !== id);
        renderCRMContacts();
        renderCRMDashboard();
    } catch (err) {
        alert('Network error. Please try again.');
    }
}

// ─── Sales Pipeline ───────────────────────────────────────────────────────────

const PIPELINE_STAGES = ['Lead', 'Qualified', 'Proposal', 'Negotiation', 'Won', 'Lost'];

const STAGE_COLORS = {
    Lead:        { bg: '#e3f2fd', color: '#1565c0', header: '#1565c0' },
    Qualified:   { bg: '#fff3e0', color: '#e65100', header: '#e65100' },
    Proposal:    { bg: '#fff8e1', color: '#f9a825', header: '#f9a825' },
    Negotiation: { bg: '#fce4ec', color: '#880e4f', header: '#880e4f' },
    Won:         { bg: '#e8f5e9', color: '#2e7d32', header: '#2e7d32' },
    Lost:        { bg: '#f5f5f5', color: '#616161', header: '#616161' }
};

const STAGE_DEFAULT_PROBABILITY = {
    Lead: 10, Qualified: 30, Proposal: 50, Negotiation: 75, Won: 100, Lost: 0
};

const CURRENCY_SYMBOLS = { EUR: '€', GBP: '£', USD: '$', CHF: 'CHF ' };

function showPipelineSection(sectionId, btn) {
    document.querySelectorAll('#pipeline-tab .ob-section').forEach(s => s.classList.remove('active'));
    document.querySelectorAll('#pipeline-tab .sub-tab-btn').forEach(b => b.classList.remove('active'));
    const el = document.getElementById(sectionId);
    if (el) el.classList.add('active');
    if (btn) btn.classList.add('active');
}

function autoFillProbability() {
    const stage = document.getElementById('deal-stage').value;
    if (stage && STAGE_DEFAULT_PROBABILITY[stage] !== undefined) {
        document.getElementById('deal-probability').value = STAGE_DEFAULT_PROBABILITY[stage];
    }
}

async function loadSalesPipeline() {
    try {
        const [dealsRes, contactsRes] = await Promise.all([
            fetch(`${API_URL}/crm/deals`),
            fetch(`${API_URL}/crm/contacts`)
        ]);
        if (!dealsRes.ok) throw new Error('Failed to load deals');
        allCRMDeals = await dealsRes.json();
        if (contactsRes.ok) allCRMContacts = await contactsRes.json();
        renderPipelineKPIs();
        renderPipelineBoard();
        renderDealsList();
    } catch (err) {
        const k = document.getElementById('pipeline-kanban');
        if (k) k.innerHTML = '<p class="error-state">Failed to load pipeline.</p>';
    }
}

function formatCurrency(value, currency) {
    const sym = CURRENCY_SYMBOLS[currency] || currency + ' ';
    if (value >= 1000000) return sym + (value / 1000000).toFixed(1) + 'M';
    if (value >= 1000) return sym + (value / 1000).toFixed(0) + 'k';
    return sym + value.toLocaleString();
}

function renderPipelineKPIs() {
    const active = allCRMDeals.filter(d => d.stage !== 'Won' && d.stage !== 'Lost');
    const won = allCRMDeals.filter(d => d.stage === 'Won');
    const lost = allCRMDeals.filter(d => d.stage === 'Lost');
    const pipelineValue = active.reduce((s, d) => s + (parseFloat(d.value) || 0), 0);
    const weightedValue = active.reduce((s, d) => s + (parseFloat(d.value) || 0) * ((parseFloat(d.probability) || 0) / 100), 0);
    const closedTotal = won.length + lost.length;
    const winRate = closedTotal > 0 ? Math.round((won.length / closedTotal) * 100) : 0;

    const kpiEl = document.getElementById('pipeline-kpi-row');
    if (kpiEl) {
        kpiEl.innerHTML = `
            <div class="kpi-card"><div class="kpi-value">${active.length}</div><div class="kpi-label">Active Deals</div></div>
            <div class="kpi-card"><div class="kpi-value" style="color:#1565c0">${formatCurrency(pipelineValue, 'EUR')}</div><div class="kpi-label">Pipeline Value</div></div>
            <div class="kpi-card"><div class="kpi-value" style="color:#f57f17">${formatCurrency(weightedValue, 'EUR')}</div><div class="kpi-label">Weighted Value</div></div>
            <div class="kpi-card"><div class="kpi-value" style="color:#2e7d32">${won.length}</div><div class="kpi-label">Deals Won</div></div>
            <div class="kpi-card"><div class="kpi-value" style="color:#2e7d32">${winRate}%</div><div class="kpi-label">Win Rate</div></div>
        `;
    }
}

function renderPipelineBoard() {
    const kanban = document.getElementById('pipeline-kanban');
    if (!kanban) return;

    kanban.innerHTML = PIPELINE_STAGES.map(stage => {
        const deals = allCRMDeals.filter(d => d.stage === stage);
        const stageValue = deals.reduce((s, d) => s + (parseFloat(d.value) || 0), 0);
        const sc = STAGE_COLORS[stage];

        const dealCards = deals.length === 0
            ? `<div class="pipeline-empty-col">No deals</div>`
            : deals.map(deal => {
                const contact = allCRMContacts.find(c => c.id === deal.contactId);
                const contactName = contact ? `${contact.firstName} ${contact.lastName}` : '';
                const sym = CURRENCY_SYMBOLS[deal.currency] || deal.currency + ' ';
                return `<div class="pipeline-deal-card" onclick="openDealModal('${escapeHtml(deal.id)}')">
                    <div class="deal-card-title">${escapeHtml(deal.title)}</div>
                    ${deal.company ? `<div class="deal-card-company">${escapeHtml(deal.company)}</div>` : ''}
                    ${contactName ? `<div class="deal-card-contact">👤 ${escapeHtml(contactName)}</div>` : ''}
                    <div class="deal-card-footer">
                        <span class="deal-card-value">${sym}${(parseFloat(deal.value) || 0).toLocaleString()}</span>
                        <span class="deal-card-prob">${deal.probability}%</span>
                    </div>
                    ${deal.expectedCloseDate ? `<div class="deal-card-date">📅 ${deal.expectedCloseDate}</div>` : ''}
                </div>`;
            }).join('');

        return `<div class="pipeline-column">
            <div class="pipeline-col-header" style="background:${sc.header}">
                <span class="pipeline-col-title">${stage}</span>
                <span class="pipeline-col-count">${deals.length}</span>
            </div>
            ${stageValue > 0 ? `<div class="pipeline-col-value">${formatCurrency(stageValue, 'EUR')}</div>` : ''}
            <div class="pipeline-col-cards">${dealCards}</div>
        </div>`;
    }).join('');
}

function renderDealsList() {
    const search = (document.getElementById('pipeline-search')?.value || '').toLowerCase();
    const stage = document.getElementById('pipeline-filter-stage')?.value || '';

    let deals = allCRMDeals.filter(d => {
        if (stage && d.stage !== stage) return false;
        if (search) {
            const hay = [d.title, d.company, d.owner].join(' ').toLowerCase();
            if (!hay.includes(search)) return false;
        }
        return true;
    });

    const container = document.getElementById('pipeline-table-container');
    if (!container) return;

    if (deals.length === 0) {
        container.innerHTML = '<p class="empty-state">No deals found. Click "+ Add Deal" to get started.</p>';
        return;
    }

    container.innerHTML = `<div class="asset-table-scroll"><table class="asset-table">
        <thead>
            <tr>
                <th>Deal</th>
                <th>Company</th>
                <th>Value</th>
                <th>Stage</th>
                <th>Prob.</th>
                <th>Close Date</th>
                <th>Owner</th>
                <th>Actions</th>
            </tr>
        </thead>
        <tbody>
            ${deals.map(d => {
                const sc = STAGE_COLORS[d.stage] || { bg: '#f5f5f5', color: '#616161' };
                const sym = CURRENCY_SYMBOLS[d.currency] || d.currency + ' ';
                return `<tr>
                    <td><div class="asset-name">${escapeHtml(d.title)}</div></td>
                    <td>${d.company ? escapeHtml(d.company) : '—'}</td>
                    <td><strong>${sym}${(parseFloat(d.value) || 0).toLocaleString()}</strong></td>
                    <td><span class="crm-type-badge" style="background:${sc.bg};color:${sc.color}">${escapeHtml(d.stage)}</span></td>
                    <td>${d.probability}%</td>
                    <td>${d.expectedCloseDate || '—'}</td>
                    <td>${d.owner ? escapeHtml(d.owner) : '—'}</td>
                    <td>
                        <div class="action-btns">
                            <button class="btn-icon" title="Edit" onclick="openDealModal('${escapeHtml(d.id)}')">✏️</button>
                            <button class="btn-icon btn-icon-danger" title="Delete" onclick="deleteDeal('${escapeHtml(d.id)}')">🗑️</button>
                        </div>
                    </td>
                </tr>`;
            }).join('')}
        </tbody>
    </table></div>`;
}

function populateContactDropdown(selectedId) {
    const sel = document.getElementById('deal-contact');
    if (!sel) return;
    sel.innerHTML = '<option value="">— None —</option>' +
        allCRMContacts.map(c => `<option value="${escapeHtml(c.id)}"${c.id === selectedId ? ' selected' : ''}>${escapeHtml(c.firstName + ' ' + c.lastName)}${c.company ? ' (' + escapeHtml(c.company) + ')' : ''}</option>`).join('');
}

function openDealModal(dealId) {
    const modal = document.getElementById('deal-modal');
    const titleEl = document.getElementById('deal-modal-title');
    const submitBtn = document.getElementById('deal-submit-btn');
    document.getElementById('deal-id').value = '';
    document.getElementById('deal-title').value = '';
    document.getElementById('deal-company').value = '';
    document.getElementById('deal-value').value = '';
    document.getElementById('deal-currency').value = 'EUR';
    document.getElementById('deal-stage').value = '';
    document.getElementById('deal-probability').value = '';
    document.getElementById('deal-close-date').value = '';
    document.getElementById('deal-owner').value = '';
    document.getElementById('deal-notes').value = '';
    document.getElementById('deal-success').classList.add('hidden');
    document.getElementById('deal-error').classList.add('hidden');

    populateContactDropdown('');

    if (dealId) {
        const deal = allCRMDeals.find(d => d.id === dealId);
        if (deal) {
            titleEl.textContent = 'Edit Deal';
            submitBtn.textContent = 'Save Changes';
            document.getElementById('deal-id').value = deal.id;
            document.getElementById('deal-title').value = deal.title;
            document.getElementById('deal-company').value = deal.company || '';
            document.getElementById('deal-value').value = deal.value || '';
            document.getElementById('deal-currency').value = deal.currency || 'EUR';
            document.getElementById('deal-stage').value = deal.stage;
            document.getElementById('deal-probability').value = deal.probability !== undefined ? deal.probability : '';
            document.getElementById('deal-close-date').value = deal.expectedCloseDate || '';
            document.getElementById('deal-owner').value = deal.owner || '';
            document.getElementById('deal-notes').value = deal.notes || '';
            populateContactDropdown(deal.contactId);
        }
    } else {
        titleEl.textContent = 'Add Deal';
        submitBtn.textContent = 'Add Deal';
    }
    modal.classList.remove('hidden');
}

function closeDealModal() {
    document.getElementById('deal-modal').classList.add('hidden');
}

function closeDealModalOnBg(event) {
    if (event.target === document.getElementById('deal-modal')) closeDealModal();
}

async function submitDeal(event) {
    event.preventDefault();
    const id = document.getElementById('deal-id').value;
    const successEl = document.getElementById('deal-success');
    const errorEl = document.getElementById('deal-error');
    successEl.classList.add('hidden');
    errorEl.classList.add('hidden');

    const payload = {
        title: document.getElementById('deal-title').value.trim(),
        contactId: document.getElementById('deal-contact').value,
        company: document.getElementById('deal-company').value.trim(),
        value: parseFloat(document.getElementById('deal-value').value) || 0,
        currency: document.getElementById('deal-currency').value,
        stage: document.getElementById('deal-stage').value,
        probability: parseInt(document.getElementById('deal-probability').value, 10) || 0,
        expectedCloseDate: document.getElementById('deal-close-date').value,
        owner: document.getElementById('deal-owner').value.trim(),
        notes: document.getElementById('deal-notes').value.trim()
    };

    try {
        const url = id ? `${API_URL}/crm/deals/${id}` : `${API_URL}/crm/deals`;
        const method = id ? 'PUT' : 'POST';
        const res = await fetch(url, {
            method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        const data = await res.json();
        if (!res.ok) {
            errorEl.textContent = data.error || 'Error saving deal';
            errorEl.classList.remove('hidden');
            return;
        }
        successEl.textContent = id ? 'Deal updated!' : 'Deal added!';
        successEl.classList.remove('hidden');
        if (id) {
            const idx = allCRMDeals.findIndex(d => d.id === id);
            if (idx !== -1) allCRMDeals[idx] = data;
        } else {
            allCRMDeals.push(data);
        }
        renderPipelineKPIs();
        renderPipelineBoard();
        renderDealsList();
        setTimeout(() => closeDealModal(), 1200);
    } catch (err) {
        errorEl.textContent = 'Network error. Please try again.';
        errorEl.classList.remove('hidden');
    }
}

async function deleteDeal(id) {
    if (!confirm('Are you sure you want to delete this deal?')) return;
    try {
        const res = await fetch(`${API_URL}/crm/deals/${id}`, { method: 'DELETE' });
        if (!res.ok) { const d = await res.json(); alert(d.error || 'Error deleting deal'); return; }
        allCRMDeals = allCRMDeals.filter(d => d.id !== id);
        renderPipelineKPIs();
        renderPipelineBoard();
        renderDealsList();
    } catch (err) {
        alert('Network error. Please try again.');
    }
}

// ─── Process Ownership Map ─────────────────────────────────────────────────

const PROCESS_CRITICALITY_COLORS = {
    critical: '#dc2626',
    high:     '#ea580c',
    medium:   '#ca8a04',
    low:      '#16a34a'
};

const PROCESS_STATUS_LABELS = {
    active:       'Active',
    inactive:     'Inactive',
    under_review: 'Under Review'
};

const PROCESS_CATEGORY_COLORS = {
    'HR':                 '#6366f1',
    'Finance':            '#0ea5e9',
    'IT':                 '#8b5cf6',
    'Operations':         '#f59e0b',
    'Sales':              '#10b981',
    'Legal & Compliance': '#ef4444',
    'Marketing':          '#ec4899',
    'Executive':          '#64748b',
    'Other':              '#94a3b8'
};

function showProcessesSection(sectionId, btn) {
    document.querySelectorAll('#processes-tab .ob-section').forEach(s => s.classList.remove('active'));
    document.querySelectorAll('#processes-tab .sub-tab-btn').forEach(b => b.classList.remove('active'));
    const section = document.getElementById(sectionId);
    if (section) section.classList.add('active');
    if (btn) btn.classList.add('active');
    if (sectionId === 'processes-list') renderProcessMap();
}

async function loadProcessOwnership() {
    try {
        const res = await fetch(`${API_URL}/process-ownership`);
        if (!res.ok) {
            console.error('Error loading processes: HTTP', res.status, res.statusText);
            allProcessOwnership = [];
            return;
        }
        const data = await res.json();
        if (!Array.isArray(data)) {
            console.error('Unexpected process ownership payload shape; expected an array.', data);
            allProcessOwnership = [];
            return;
        }
        allProcessOwnership = data;
        renderProcessMap();
        renderProcessDashboard();
    } catch (err) {
        console.error('Error loading processes', err);
        allProcessOwnership = [];
    }
}

function renderProcessDashboard() {
    // KPI cards
    const kpiContainer = document.getElementById('processes-kpi-cards');
    if (!kpiContainer) return;

    const total = allProcessOwnership.length;
    const active = allProcessOwnership.filter(p => p.status === 'active').length;
    const uniqueOwners = new Set(allProcessOwnership.map(p => p.primaryOwner).filter(Boolean)).size;
    const critical = allProcessOwnership.filter(p => p.criticality === 'critical').length;

    kpiContainer.innerHTML = `
        <div class="kpi-card">
            <div class="kpi-label">Total Processes</div>
            <div class="kpi-value">${total}</div>
        </div>
        <div class="kpi-card">
            <div class="kpi-label">Active Processes</div>
            <div class="kpi-value">${active}</div>
        </div>
        <div class="kpi-card">
            <div class="kpi-label">Unique Owners</div>
            <div class="kpi-value">${uniqueOwners}</div>
        </div>
        <div class="kpi-card kpi-card-warn">
            <div class="kpi-label">Critical Processes</div>
            <div class="kpi-value">${critical}</div>
        </div>
    `;

    // By Category chart
    const byCatEl = document.getElementById('processes-by-category');
    if (byCatEl) {
        const byCat = {};
        allProcessOwnership.forEach(p => { const c = p.category || 'Other'; byCat[c] = (byCat[c] || 0) + 1; });
        const maxCat = Math.max(...Object.values(byCat), 1);
        const catRows = Object.entries(byCat).sort((a, b) => b[1] - a[1]).map(([cat, cnt]) => `
            <div class="chart-bar-row">
                <span class="chart-bar-label">${escapeHtml(cat)}</span>
                <div class="chart-bar-track">
                    <div class="chart-bar-fill" style="width:${Math.round(cnt / maxCat * 100)}%;background:${PROCESS_CATEGORY_COLORS[cat] || '#94a3b8'}"></div>
                </div>
                <span class="chart-bar-count">${cnt}</span>
            </div>`).join('');
        byCatEl.innerHTML = `<div class="dashboard-card"><h3 class="dashboard-card-title">By Category</h3>${catRows || '<p class="empty-state-text">No data yet.</p>'}</div>`;
    }

    // By Department chart
    const byDeptEl = document.getElementById('processes-by-dept');
    if (byDeptEl) {
        const byDept = {};
        allProcessOwnership.forEach(p => { const d = p.department || 'Unknown'; byDept[d] = (byDept[d] || 0) + 1; });
        const maxDept = Math.max(...Object.values(byDept), 1);
        const deptRows = Object.entries(byDept).sort((a, b) => b[1] - a[1]).slice(0, 8).map(([dept, cnt]) => `
            <div class="chart-bar-row">
                <span class="chart-bar-label">${escapeHtml(dept)}</span>
                <div class="chart-bar-track">
                    <div class="chart-bar-fill" style="width:${Math.round(cnt / maxDept * 100)}%;background:#6366f1"></div>
                </div>
                <span class="chart-bar-count">${cnt}</span>
            </div>`).join('');
        byDeptEl.innerHTML = `<div class="dashboard-card"><h3 class="dashboard-card-title">By Department</h3>${deptRows || '<p class="empty-state-text">No data yet.</p>'}</div>`;
    }

    // Top owners
    const topOwnersEl = document.getElementById('processes-top-owners');
    if (topOwnersEl) {
        const ownerMap = {};
        allProcessOwnership.forEach(p => {
            if (p.primaryOwner) { ownerMap[p.primaryOwner] = (ownerMap[p.primaryOwner] || 0) + 1; }
        });
        const topOwners = Object.entries(ownerMap).sort((a, b) => b[1] - a[1]).slice(0, 6);
        const ownerRows = topOwners.map(([name, cnt]) => `
            <div class="recent-item">
                <div class="recent-item-main">
                    <span class="po-owner-avatar">${escapeHtml(name.charAt(0).toUpperCase())}</span>
                    <div>
                        <div class="recent-item-name">${escapeHtml(name)}</div>
                        <div class="recent-item-sub">${cnt} process${cnt !== 1 ? 'es' : ''} owned</div>
                    </div>
                </div>
            </div>`).join('');
        topOwnersEl.innerHTML = `<div class="dashboard-card"><h3 class="dashboard-card-title">Top Process Owners</h3>${ownerRows || '<p class="empty-state-text">No owners yet.</p>'}</div>`;
    }
}

function renderProcessMap() {
    const container = document.getElementById('processes-table-container');
    if (!container) return;

    const search = (document.getElementById('processes-search')?.value || '').toLowerCase();
    const filterCat = document.getElementById('processes-filter-category')?.value || '';
    const filterStatus = document.getElementById('processes-filter-status')?.value || '';
    const filterCrit = document.getElementById('processes-filter-criticality')?.value || '';

    let filtered = allProcessOwnership.filter(p => {
        const matchSearch = !search ||
            (p.processName || '').toLowerCase().includes(search) ||
            (p.primaryOwner || '').toLowerCase().includes(search) ||
            (p.department || '').toLowerCase().includes(search) ||
            (p.description || '').toLowerCase().includes(search);
        const matchCat = !filterCat || p.category === filterCat;
        const matchStatus = !filterStatus || p.status === filterStatus;
        const matchCrit = !filterCrit || p.criticality === filterCrit;
        return matchSearch && matchCat && matchStatus && matchCrit;
    });

    if (filtered.length === 0) {
        container.innerHTML = `<div class="empty-state"><p>${allProcessOwnership.length === 0 ? 'No processes yet. Click <b>+ Add Process</b> to get started.' : 'No processes match the current filters.'}</p></div>`;
        return;
    }

    const rows = filtered.map(p => {
        const critColor = PROCESS_CRITICALITY_COLORS[p.criticality] || '#94a3b8';
        const catColor = PROCESS_CATEGORY_COLORS[p.category] || '#94a3b8';
        const statusLabel = PROCESS_STATUS_LABELS[p.status] || p.status;
        const statusClass = p.status === 'active' ? 'po-status-active' : p.status === 'under_review' ? 'po-status-review' : 'po-status-inactive';
        return `
        <tr>
            <td><strong>${escapeHtml(p.processName)}</strong>${p.description ? `<br><span class="po-desc-sub">${escapeHtml(p.description)}</span>` : ''}</td>
            <td><span class="po-category-badge" style="background:${catColor}20;color:${catColor};border:1px solid ${catColor}40">${escapeHtml(p.category || 'Other')}</span></td>
            <td>${escapeHtml(p.department || '—')}</td>
            <td>
                ${p.primaryOwner ? `<span class="po-owner-chip">${escapeHtml(p.primaryOwner)}</span>` : '—'}
                ${p.backupOwner ? `<br><span class="po-backup-chip">↳ ${escapeHtml(p.backupOwner)}</span>` : ''}
            </td>
            <td><span class="po-criticality-dot" style="background:${critColor}"></span> ${p.criticality ? p.criticality.charAt(0).toUpperCase() + p.criticality.slice(1) : '—'}</td>
            <td><span class="po-status-badge ${statusClass}">${statusLabel}</span></td>
            <td>${p.nextReviewDate ? new Date(p.nextReviewDate).toLocaleDateString() : '—'}</td>
            <td class="table-actions">
                <button class="btn-icon" onclick="openProcessOwnershipModal('${escapeHtml(p.id)}')" title="Edit">✏️</button>
                <button class="btn-icon btn-danger" onclick="deleteProcess('${escapeHtml(p.id)}')" title="Delete">🗑️</button>
            </td>
        </tr>`;
    }).join('');

    container.innerHTML = `
        <div class="asset-table-scroll">
            <table class="asset-table">
                <thead>
                    <tr>
                        <th>Process</th>
                        <th>Category</th>
                        <th>Department</th>
                        <th>Owner(s)</th>
                        <th>Criticality</th>
                        <th>Status</th>
                        <th>Next Review</th>
                        <th>Actions</th>
                    </tr>
                </thead>
                <tbody>${rows}</tbody>
            </table>
        </div>`;
}

function openProcessOwnershipModal(id) {
    const modal = document.getElementById('process-ownership-modal');
    const titleEl = document.getElementById('po-modal-title');
    const submitBtn = document.getElementById('po-submit-btn');
    const form = document.getElementById('process-ownership-form');
    form.reset();
    document.getElementById('po-success').classList.add('hidden');
    document.getElementById('po-error').classList.add('hidden');

    if (id) {
        const p = allProcessOwnership.find(x => x.id === id);
        if (!p) return;
        titleEl.textContent = 'Edit Process';
        submitBtn.textContent = 'Save Changes';
        document.getElementById('po-id').value = p.id;
        document.getElementById('po-name').value = p.processName || '';
        document.getElementById('po-category').value = p.category || 'Other';
        document.getElementById('po-department').value = p.department || '';
        document.getElementById('po-status').value = p.status || 'active';
        document.getElementById('po-criticality').value = p.criticality || 'medium';
        document.getElementById('po-review-frequency').value = p.reviewFrequency || 'quarterly';
        document.getElementById('po-primary-owner').value = p.primaryOwner || '';
        document.getElementById('po-primary-owner-email').value = p.primaryOwnerEmail || '';
        document.getElementById('po-backup-owner').value = p.backupOwner || '';
        document.getElementById('po-backup-owner-email').value = p.backupOwnerEmail || '';
        document.getElementById('po-last-review').value = p.lastReviewDate || '';
        document.getElementById('po-next-review').value = p.nextReviewDate || '';
        document.getElementById('po-description').value = p.description || '';
        document.getElementById('po-notes').value = p.notes || '';
    } else {
        titleEl.textContent = 'Add Process';
        submitBtn.textContent = 'Add Process';
        document.getElementById('po-id').value = '';
    }

    modal.classList.remove('hidden');
}

function closeProcessOwnershipModal() {
    document.getElementById('process-ownership-modal').classList.add('hidden');
}

function closeProcessOwnershipModalOnBg(e) {
    if (e.target === document.getElementById('process-ownership-modal')) closeProcessOwnershipModal();
}

async function submitProcessOwnership(event) {
    event.preventDefault();
    const id = document.getElementById('po-id').value;
    const successEl = document.getElementById('po-success');
    const errorEl = document.getElementById('po-error');
    successEl.classList.add('hidden');
    errorEl.classList.add('hidden');

    const payload = {
        processName: document.getElementById('po-name').value.trim(),
        category: document.getElementById('po-category').value,
        department: document.getElementById('po-department').value.trim(),
        status: document.getElementById('po-status').value,
        criticality: document.getElementById('po-criticality').value,
        reviewFrequency: document.getElementById('po-review-frequency').value,
        primaryOwner: document.getElementById('po-primary-owner').value.trim(),
        primaryOwnerEmail: document.getElementById('po-primary-owner-email').value.trim(),
        backupOwner: document.getElementById('po-backup-owner').value.trim(),
        backupOwnerEmail: document.getElementById('po-backup-owner-email').value.trim(),
        lastReviewDate: document.getElementById('po-last-review').value || null,
        nextReviewDate: document.getElementById('po-next-review').value || null,
        description: document.getElementById('po-description').value.trim(),
        notes: document.getElementById('po-notes').value.trim()
    };

    try {
        const url = id ? `${API_URL}/process-ownership/${id}` : `${API_URL}/process-ownership`;
        const method = id ? 'PUT' : 'POST';
        const res = await fetch(url, {
            method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        const data = await res.json();
        if (!res.ok) {
            errorEl.textContent = data.error || 'Error saving process';
            errorEl.classList.remove('hidden');
            return;
        }
        successEl.textContent = id ? 'Process updated!' : 'Process added!';
        successEl.classList.remove('hidden');
        if (id) {
            const idx = allProcessOwnership.findIndex(p => p.id === id);
            if (idx !== -1) allProcessOwnership[idx] = data;
        } else {
            allProcessOwnership.push(data);
        }
        renderProcessMap();
        renderProcessDashboard();
        setTimeout(() => closeProcessOwnershipModal(), 1200);
    } catch (err) {
        errorEl.textContent = 'Network error. Please try again.';
        errorEl.classList.remove('hidden');
    }
}

async function deleteProcess(id) {
    if (!confirm('Are you sure you want to delete this process?')) return;
    try {
        const res = await fetch(`${API_URL}/process-ownership/${id}`, { method: 'DELETE' });
        if (!res.ok) { const d = await res.json(); alert(d.error || 'Error deleting process'); return; }
        allProcessOwnership = allProcessOwnership.filter(p => p.id !== id);
        renderProcessMap();
        renderProcessDashboard();
    } catch (err) {
        alert('Network error. Please try again.');
    }
}

// ─── Partnerships ─────────────────────────────────────────────────────────────

const PARTNERSHIP_TYPE_COLORS = {
    'Innovation': { bg: '#e3f2fd', color: '#1565c0' },
    'Consulting':  { bg: '#fce4ec', color: '#c62828' },
    'Expert':      { bg: '#f3e5f5', color: '#6a1b9a' },
    'Software':    { bg: '#e8f5e9', color: '#2e7d32' }
};

function showPartnershipsSection(sectionId, btn) {
    document.querySelectorAll('#partnerships-tab .ob-section').forEach(s => s.classList.remove('active'));
    document.querySelectorAll('#partnerships-tab .sub-tab-btn').forEach(b => b.classList.remove('active'));
    const el = document.getElementById(sectionId);
    if (el) el.classList.add('active');
    if (btn) btn.classList.add('active');
}

async function loadPartnerships() {
    try {
        const res = await fetch(`${API_URL}/partnerships`);
        if (!res.ok) throw new Error('Failed to load partnerships');
        allPartnerships = await res.json();
        renderPartnerships();
        renderPartnershipsDashboard();
    } catch (err) {
        const c = document.getElementById('partnerships-table-container');
        if (c) c.innerHTML = '<p class="error-state">Failed to load partnerships.</p>';
    }
}

function renderPartnershipsDashboard() {
    const total = allPartnerships.length;
    const active = allPartnerships.filter(p => p.status === 'Active').length;
    const pending = allPartnerships.filter(p => p.status === 'Pending').length;
    const companies = allPartnerships.filter(p => p.partnerType === 'Company').length;

    const kpiEl = document.getElementById('partnerships-kpi-cards');
    if (kpiEl) {
        kpiEl.innerHTML = `
            <div class="kpi-card"><div class="kpi-value">${total}</div><div class="kpi-label">Total Partnerships</div></div>
            <div class="kpi-card"><div class="kpi-value" style="color:#2e7d32">${active}</div><div class="kpi-label">Active</div></div>
            <div class="kpi-card"><div class="kpi-value" style="color:#f57f17">${pending}</div><div class="kpi-label">Pending</div></div>
            <div class="kpi-card"><div class="kpi-value" style="color:#1565c0">${companies}</div><div class="kpi-label">Company Partners</div></div>
        `;
    }

    // By type chart
    const byType = {};
    allPartnerships.forEach(p => { byType[p.type] = (byType[p.type] || 0) + 1; });
    const byTypeEl = document.getElementById('partnerships-by-type');
    if (byTypeEl) {
        if (Object.keys(byType).length === 0) {
            byTypeEl.innerHTML = '<p class="empty-state" style="font-size:var(--fs-sm)">No partnerships yet.</p>';
        } else {
            byTypeEl.innerHTML = Object.entries(byType).sort((a, b) => b[1] - a[1]).map(([type, count]) => {
                const pct = Math.round((count / total) * 100);
                const col = (PARTNERSHIP_TYPE_COLORS[type] || { bg: '#f5f5f5', color: '#616161' }).color;
                return `<div class="chart-bar-row">
                    <span class="chart-bar-label">${escapeHtml(type)}</span>
                    <div class="chart-bar-track"><div class="chart-bar-fill" style="width:${pct}%;background:${col}"></div></div>
                    <span class="chart-bar-count">${count}</span>
                </div>`;
            }).join('');
        }
    }

    // By partner type
    const byPartnerType = {};
    allPartnerships.forEach(p => { byPartnerType[p.partnerType] = (byPartnerType[p.partnerType] || 0) + 1; });
    const byPTEl = document.getElementById('partnerships-by-partnertype');
    if (byPTEl) {
        if (Object.keys(byPartnerType).length === 0) {
            byPTEl.innerHTML = '<p class="empty-state" style="font-size:var(--fs-sm)">No data yet.</p>';
        } else {
            const maxPT = Math.max(...Object.values(byPartnerType));
            byPTEl.innerHTML = Object.entries(byPartnerType).sort((a, b) => b[1] - a[1]).map(([pt, count]) => {
                const pct = Math.round((count / maxPT) * 100);
                return `<div class="chart-bar-row">
                    <span class="chart-bar-label">${escapeHtml(pt)}</span>
                    <div class="chart-bar-track"><div class="chart-bar-fill" style="width:${pct}%;background:#C8312B"></div></div>
                    <span class="chart-bar-count">${count}</span>
                </div>`;
            }).join('');
        }
    }

    // Recent partnerships
    const recentEl = document.getElementById('partnerships-recent');
    if (recentEl) {
        const recent = [...allPartnerships].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).slice(0, 5);
        if (recent.length === 0) {
            recentEl.innerHTML = '<p class="empty-state" style="font-size:var(--fs-sm)">No partnerships yet.</p>';
        } else {
            recentEl.innerHTML = recent.map(p => {
                const typeColors = PARTNERSHIP_TYPE_COLORS[p.type] || { bg: '#f5f5f5', color: '#616161' };
                const partnerLabel = p.partnerType === 'Person'
                    ? escapeHtml(`${p.firstName} ${p.lastName}`.trim() || p.name)
                    : escapeHtml(p.company || p.name);
                return `<div class="recent-item">
                    <div class="recent-item-main">
                        <span class="recent-item-name">${escapeHtml(p.name)}</span>
                        <span class="pship-type-badge" style="background:${typeColors.bg};color:${typeColors.color}">${escapeHtml(p.type)}</span>
                    </div>
                    <div class="recent-item-sub">${partnerLabel}</div>
                </div>`;
            }).join('');
        }
    }
}

function renderPartnerships() {
    const search = (document.getElementById('partnerships-search')?.value || '').toLowerCase();
    const type = document.getElementById('partnerships-filter-type')?.value || '';
    const status = document.getElementById('partnerships-filter-status')?.value || '';

    let partnerships = allPartnerships.filter(p => {
        if (type && p.type !== type) return false;
        if (status && p.status !== status) return false;
        if (search) {
            const hay = [p.name, p.company, p.firstName, p.lastName, p.email, p.description].join(' ').toLowerCase();
            if (!hay.includes(search)) return false;
        }
        return true;
    });

    const container = document.getElementById('partnerships-table-container');
    if (!container) return;

    if (partnerships.length === 0) {
        container.innerHTML = '<p class="empty-state">No partnerships found. Click "+ Add Partnership" to get started.</p>';
        return;
    }

    const rows = partnerships.map(p => {
        const typeColors = PARTNERSHIP_TYPE_COLORS[p.type] || { bg: '#f5f5f5', color: '#616161' };
        const partnerDisplay = p.partnerType === 'Person'
            ? escapeHtml(`${p.firstName} ${p.lastName}`.trim() || '—')
            : escapeHtml(p.company || '—');
        const contactOrg = p.partnerType === 'Person' && p.company ? `<span class="po-desc-sub">${escapeHtml(p.company)}</span>` : '';
        const statusClass = p.status === 'Active' ? 'pship-status-active' : p.status === 'Pending' ? 'pship-status-pending' : 'pship-status-inactive';
        return `<tr>
            <td><strong>${escapeHtml(p.name)}</strong></td>
            <td><span class="pship-type-badge" style="background:${typeColors.bg};color:${typeColors.color}">${escapeHtml(p.type)}</span></td>
            <td>${partnerDisplay}${contactOrg ? '<br>' + contactOrg : ''}</td>
            <td>${escapeHtml(p.partnerType)}</td>
            <td>${p.email ? `<a href="mailto:${escapeHtml(p.email)}">${escapeHtml(p.email)}</a>` : '—'}</td>
            <td>${p.startDate ? escapeHtml(p.startDate) : '—'}</td>
            <td><span class="pship-status-badge ${statusClass}">${escapeHtml(p.status)}</span></td>
            <td class="action-cell">
                <button class="btn-icon" title="Edit" onclick="openPartnershipModal('${escapeHtml(p.id)}')">✏️</button>
                <button class="btn-icon" title="Delete" onclick="deletePartnership('${escapeHtml(p.id)}')">🗑️</button>
            </td>
        </tr>`;
    }).join('');

    container.innerHTML = `<div class="asset-table-scroll"><table class="asset-table">
        <thead><tr>
            <th>Name</th>
            <th>Type</th>
            <th>Partner</th>
            <th>Partner Is</th>
            <th>Email</th>
            <th>Start Date</th>
            <th>Status</th>
            <th>Actions</th>
        </tr></thead>
        <tbody>${rows}</tbody>
    </table></div>`;
}

function togglePartnershipPartnerFields() {
    const pt = document.getElementById('partnership-partnertype')?.value;
    const companyFields = document.getElementById('partnership-company-fields');
    const personFields = document.getElementById('partnership-person-fields');
    if (!companyFields || !personFields) return;
    if (pt === 'Person') {
        companyFields.style.display = 'none';
        personFields.style.display = '';
    } else {
        companyFields.style.display = '';
        personFields.style.display = 'none';
    }
}

function openPartnershipModal(id) {
    const modal = document.getElementById('partnership-modal');
    const titleEl = document.getElementById('partnership-modal-title');
    const submitBtn = document.getElementById('partnership-submit-btn');
    if (!modal) return;

    // Reset form
    document.getElementById('partnership-form').reset();
    document.getElementById('partnership-id').value = '';
    document.getElementById('partnership-success').classList.add('hidden');
    document.getElementById('partnership-error').classList.add('hidden');
    document.getElementById('partnership-company-fields').style.display = '';
    document.getElementById('partnership-person-fields').style.display = 'none';

    if (id) {
        const p = allPartnerships.find(x => x.id === id);
        if (!p) return;
        titleEl.textContent = 'Edit Partnership';
        submitBtn.textContent = 'Save Changes';
        document.getElementById('partnership-id').value = p.id;
        document.getElementById('partnership-name').value = p.name || '';
        document.getElementById('partnership-type').value = p.type || '';
        document.getElementById('partnership-partnertype').value = p.partnerType || '';
        document.getElementById('partnership-status').value = p.status || 'Active';
        document.getElementById('partnership-email').value = p.email || '';
        document.getElementById('partnership-phone').value = p.phone || '';
        document.getElementById('partnership-website').value = p.website || '';
        document.getElementById('partnership-startdate').value = p.startDate || '';
        document.getElementById('partnership-description').value = p.description || '';
        document.getElementById('partnership-notes').value = p.notes || '';
        if (p.partnerType === 'Person') {
            document.getElementById('partnership-company-fields').style.display = 'none';
            document.getElementById('partnership-person-fields').style.display = '';
            document.getElementById('partnership-firstname').value = p.firstName || '';
            document.getElementById('partnership-lastname').value = p.lastName || '';
            document.getElementById('partnership-person-company').value = p.company || '';
        } else {
            document.getElementById('partnership-company').value = p.company || '';
        }
    } else {
        titleEl.textContent = 'Add Partnership';
        submitBtn.textContent = 'Add Partnership';
    }

    modal.classList.remove('hidden');
}

function closePartnershipModal() {
    const modal = document.getElementById('partnership-modal');
    if (modal) modal.classList.add('hidden');
}

function closePartnershipModalOnBg(event) {
    if (event.target === document.getElementById('partnership-modal')) closePartnershipModal();
}

async function submitPartnership(event) {
    event.preventDefault();
    const id = document.getElementById('partnership-id').value;
    const successEl = document.getElementById('partnership-success');
    const errorEl = document.getElementById('partnership-error');
    successEl.classList.add('hidden');
    errorEl.classList.add('hidden');

    const partnerType = document.getElementById('partnership-partnertype').value;
    const isCompany = partnerType === 'Company';
    const company = isCompany
        ? document.getElementById('partnership-company').value.trim()
        : document.getElementById('partnership-person-company').value.trim();

    const payload = {
        name: document.getElementById('partnership-name').value.trim(),
        type: document.getElementById('partnership-type').value,
        partnerType,
        company,
        firstName: isCompany ? '' : document.getElementById('partnership-firstname').value.trim(),
        lastName: isCompany ? '' : document.getElementById('partnership-lastname').value.trim(),
        email: document.getElementById('partnership-email').value.trim(),
        phone: document.getElementById('partnership-phone').value.trim(),
        website: document.getElementById('partnership-website').value.trim(),
        description: document.getElementById('partnership-description').value.trim(),
        status: document.getElementById('partnership-status').value,
        startDate: document.getElementById('partnership-startdate').value,
        notes: document.getElementById('partnership-notes').value.trim()
    };

    try {
        const url = id ? `${API_URL}/partnerships/${id}` : `${API_URL}/partnerships`;
        const method = id ? 'PUT' : 'POST';
        const res = await fetch(url, {
            method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        const data = await res.json();
        if (!res.ok) {
            errorEl.textContent = data.error || 'Error saving partnership';
            errorEl.classList.remove('hidden');
            return;
        }
        successEl.textContent = id ? 'Partnership updated!' : 'Partnership added!';
        successEl.classList.remove('hidden');
        if (id) {
            const idx = allPartnerships.findIndex(p => p.id === id);
            if (idx !== -1) allPartnerships[idx] = data;
        } else {
            allPartnerships.push(data);
        }
        renderPartnerships();
        renderPartnershipsDashboard();
        setTimeout(() => closePartnershipModal(), 1200);
    } catch (err) {
        errorEl.textContent = 'Network error. Please try again.';
        errorEl.classList.remove('hidden');
    }
}

async function deletePartnership(id) {
    if (!confirm('Are you sure you want to delete this partnership?')) return;
    try {
        const res = await fetch(`${API_URL}/partnerships/${id}`, { method: 'DELETE' });
        if (!res.ok) { const d = await res.json(); alert(d.error || 'Error deleting partnership'); return; }
        allPartnerships = allPartnerships.filter(p => p.id !== id);
        renderPartnerships();
        renderPartnershipsDashboard();
    } catch (err) {
        alert('Network error. Please try again.');
    }
}

// ─── Meetings & Todos ─────────────────────────────────────────────────────────

const MEETING_TYPE_COLORS = {
    'Management': { bg: '#e3f2fd', color: '#1565c0' },
    'Strategy':   { bg: '#f3e5f5', color: '#6a1b9a' },
    'Review':     { bg: '#e8f5e9', color: '#2e7d32' },
    'Planning':   { bg: '#fff3e0', color: '#e65100' },
    'Other':      { bg: '#f5f5f5', color: '#616161' }
};

const TODO_PRIORITY_COLORS = {
    'High':   { bg: '#fdecea', color: '#c62828' },
    'Medium': { bg: '#fff8e1', color: '#f57f17' },
    'Low':    { bg: '#e8f5e9', color: '#2e7d32' }
};

function showMeetingsSection(sectionId, btn) {
    document.querySelectorAll('#meetings-tab .ob-section').forEach(s => s.classList.remove('active'));
    document.querySelectorAll('#meetings-tab .sub-tab-btn').forEach(b => b.classList.remove('active'));
    const el = document.getElementById(sectionId);
    if (el) el.classList.add('active');
    if (btn) btn.classList.add('active');
    if (sectionId === 'meetings-todos') renderAllTodos();
    if (sectionId === 'meetings-protocols') renderAllProtocols();
}

async function loadMeetings() {
    try {
        const res = await fetch(`${API_URL}/meetings`);
        if (!res.ok) throw new Error('Failed to load meetings');
        allMeetings = await res.json();
        renderMeetings();
        renderMeetingsDashboard();
        renderAllTodos();
    } catch (err) {
        const c = document.getElementById('meetings-table-container');
        if (c) c.innerHTML = '<p class="error-state">Failed to load meetings.</p>';
    }
}

function renderMeetingsDashboard() {
    const total = allMeetings.length;
    const upcoming = allMeetings.filter(m => m.status === 'Upcoming').length;
    const completed = allMeetings.filter(m => m.status === 'Completed').length;
    const allTodos = allMeetings.flatMap(m => m.todos || []);
    const openTodos = allTodos.filter(t => t.status !== 'Done').length;
    const allProtocols = allMeetings.flatMap(m => m.protocols || []);
    const draftProtocols = allProtocols.filter(p => p.status === 'Draft').length;

    const kpiEl = document.getElementById('meetings-kpi-cards');
    if (kpiEl) {
        kpiEl.innerHTML = `
            <div class="kpi-card"><div class="kpi-value">${total}</div><div class="kpi-label">Total Meetings</div></div>
            <div class="kpi-card"><div class="kpi-value" style="color:#1565c0">${upcoming}</div><div class="kpi-label">Upcoming</div></div>
            <div class="kpi-card"><div class="kpi-value" style="color:#2e7d32">${completed}</div><div class="kpi-label">Completed</div></div>
            <div class="kpi-card${openTodos > 0 ? ' kpi-card-warn' : ''}"><div class="kpi-value" style="color:#e65100">${openTodos}</div><div class="kpi-label">Open Action Items</div></div>
            <div class="kpi-card"><div class="kpi-value" style="color:#6a1b9a">${allProtocols.length}</div><div class="kpi-label">Protocols${draftProtocols > 0 ? ' (' + draftProtocols + ' draft)' : ''}</div></div>
        `;
    }

    // By type chart
    const byType = {};
    allMeetings.forEach(m => { byType[m.type] = (byType[m.type] || 0) + 1; });
    const byTypeEl = document.getElementById('meetings-by-type');
    if (byTypeEl) {
        if (Object.keys(byType).length === 0) {
            byTypeEl.innerHTML = '<p class="empty-state" style="font-size:var(--fs-sm)">No meetings yet.</p>';
        } else {
            byTypeEl.innerHTML = Object.entries(byType).sort((a, b) => b[1] - a[1]).map(([type, count]) => {
                const pct = Math.round((count / total) * 100);
                const col = (MEETING_TYPE_COLORS[type] || { color: '#616161' }).color;
                return `<div class="chart-bar-row">
                    <span class="chart-bar-label">${escapeHtml(type)}</span>
                    <div class="chart-bar-track"><div class="chart-bar-fill" style="width:${pct}%;background:${col}"></div></div>
                    <span class="chart-bar-count">${count}</span>
                </div>`;
            }).join('');
        }
    }

    // By status chart
    const byStatus = {};
    allMeetings.forEach(m => { byStatus[m.status] = (byStatus[m.status] || 0) + 1; });
    const byStatusEl = document.getElementById('meetings-by-status');
    if (byStatusEl) {
        if (Object.keys(byStatus).length === 0) {
            byStatusEl.innerHTML = '<p class="empty-state" style="font-size:var(--fs-sm)">No data yet.</p>';
        } else {
            const maxS = Math.max(...Object.values(byStatus));
            const statusColors = { Upcoming: '#1565c0', Completed: '#2e7d32', Cancelled: '#757575' };
            byStatusEl.innerHTML = Object.entries(byStatus).sort((a, b) => b[1] - a[1]).map(([st, count]) => {
                const pct = Math.round((count / maxS) * 100);
                return `<div class="chart-bar-row">
                    <span class="chart-bar-label">${escapeHtml(st)}</span>
                    <div class="chart-bar-track"><div class="chart-bar-fill" style="width:${pct}%;background:${statusColors[st] || '#9e9e9e'}"></div></div>
                    <span class="chart-bar-count">${count}</span>
                </div>`;
            }).join('');
        }
    }

    // Upcoming meetings list
    const upcomingEl = document.getElementById('meetings-upcoming');
    if (upcomingEl) {
        const upcomingList = allMeetings
            .filter(m => m.status === 'Upcoming')
            .sort((a, b) => new Date(a.date) - new Date(b.date))
            .slice(0, 5);
        if (upcomingList.length === 0) {
            upcomingEl.innerHTML = '<p class="empty-state" style="font-size:var(--fs-sm)">No upcoming meetings.</p>';
        } else {
            upcomingEl.innerHTML = upcomingList.map(m => {
                const typeColors = MEETING_TYPE_COLORS[m.type] || { bg: '#f5f5f5', color: '#616161' };
                const todos = m.todos || [];
                const openCount = todos.filter(t => t.status !== 'Done').length;
                return `<div class="recent-item">
                    <div class="recent-item-main">
                        <span class="recent-item-name">${escapeHtml(m.title)}</span>
                        <span class="mtg-type-badge" style="background:${typeColors.bg};color:${typeColors.color}">${escapeHtml(m.type)}</span>
                    </div>
                    <div class="recent-item-sub">${escapeHtml(m.date)}${m.time ? ' ' + escapeHtml(m.time) : ''}${openCount > 0 ? ` · <span class="mtg-todo-open">${openCount} open todo${openCount > 1 ? 's' : ''}</span>` : ''}</div>
                </div>`;
            }).join('');
        }
    }
}

function renderMeetings() {
    const search = (document.getElementById('meetings-search')?.value || '').toLowerCase();
    const type = document.getElementById('meetings-filter-type')?.value || '';
    const status = document.getElementById('meetings-filter-status')?.value || '';

    let meetings = allMeetings.filter(m => {
        if (type && m.type !== type) return false;
        if (status && m.status !== status) return false;
        if (search) {
            const hay = [m.title, m.location, m.attendees, m.agenda, m.notes].join(' ').toLowerCase();
            if (!hay.includes(search)) return false;
        }
        return true;
    });

    meetings = [...meetings].sort((a, b) => new Date(b.date) - new Date(a.date));

    const container = document.getElementById('meetings-table-container');
    if (!container) return;

    if (meetings.length === 0) {
        container.innerHTML = '<p class="empty-state">No meetings found. Click "+ Add Meeting" to get started.</p>';
        return;
    }

    const rows = meetings.map(m => {
        const typeColors = MEETING_TYPE_COLORS[m.type] || { bg: '#f5f5f5', color: '#616161' };
        const todos = m.todos || [];
        const openTodos = todos.filter(t => t.status !== 'Done').length;
        const protocols = m.protocols || [];
        const statusClass = m.status === 'Upcoming' ? 'mtg-status-upcoming' : m.status === 'Completed' ? 'mtg-status-completed' : 'mtg-status-cancelled';
        return `<tr>
            <td><strong>${escapeHtml(m.title)}</strong></td>
            <td><span class="mtg-type-badge" style="background:${typeColors.bg};color:${typeColors.color}">${escapeHtml(m.type)}</span></td>
            <td>${escapeHtml(m.date)}${m.time ? '<br><span class="text-muted-sm">' + escapeHtml(m.time) + '</span>' : ''}</td>
            <td>${m.location ? escapeHtml(m.location) : '—'}</td>
            <td>${m.attendees ? escapeHtml(m.attendees) : '—'}</td>
            <td><span class="mtg-status-badge ${statusClass}">${escapeHtml(m.status)}</span></td>
            <td>
                <span class="mtg-todo-count${openTodos > 0 ? ' mtg-todo-open' : ''}">${todos.length} total / ${openTodos} open</span>
            </td>
            <td>
                <span class="mtg-todo-count">${protocols.length} protocol${protocols.length !== 1 ? 's' : ''}</span>
            </td>
            <td class="action-cell">
                <button class="btn-icon" title="View Todos" onclick="openMeetingTodos('${escapeHtml(m.id)}')">📋</button>
                <button class="btn-icon" title="Write Protocol" onclick="openMeetingProtocols('${escapeHtml(m.id)}')">📝</button>
                <button class="btn-icon" title="Edit" onclick="openMeetingModal('${escapeHtml(m.id)}')">✏️</button>
                <button class="btn-icon" title="Delete" onclick="deleteMeeting('${escapeHtml(m.id)}')">🗑️</button>
            </td>
        </tr>`;
    }).join('');

    container.innerHTML = `<div class="asset-table-scroll"><table class="asset-table">
        <thead><tr>
            <th>Title</th>
            <th>Type</th>
            <th>Date</th>
            <th>Location</th>
            <th>Attendees</th>
            <th>Status</th>
            <th>Action Items</th>
            <th>Protocols</th>
            <th>Actions</th>
        </tr></thead>
        <tbody>${rows}</tbody>
    </table></div>`;
}

function renderAllTodos() {
    const search = (document.getElementById('todos-search')?.value || '').toLowerCase();
    const priority = document.getElementById('todos-filter-priority')?.value || '';
    const status = document.getElementById('todos-filter-status')?.value || '';

    const container = document.getElementById('todos-table-container');
    if (!container) return;

    // Flatten all todos with their meeting context
    let todos = [];
    allMeetings.forEach(m => {
        (m.todos || []).forEach(t => {
            todos.push({ ...t, meetingId: m.id, meetingTitle: m.title, meetingDate: m.date });
        });
    });

    todos = todos.filter(t => {
        if (priority && t.priority !== priority) return false;
        if (status && t.status !== status) return false;
        if (search) {
            const hay = [t.task, t.assignee, t.meetingTitle].join(' ').toLowerCase();
            if (!hay.includes(search)) return false;
        }
        return true;
    });

    // Sort: open/in-progress first, then by due date
    todos.sort((a, b) => {
        const order = { 'Open': 0, 'In Progress': 1, 'Done': 2 };
        if (order[a.status] !== order[b.status]) return order[a.status] - order[b.status];
        if (a.dueDate && b.dueDate) return new Date(a.dueDate) - new Date(b.dueDate);
        if (a.dueDate) return -1;
        if (b.dueDate) return 1;
        return 0;
    });

    if (todos.length === 0) {
        container.innerHTML = '<p class="empty-state">No action items found.</p>';
        return;
    }

    const rows = todos.map(t => {
        const prioColors = TODO_PRIORITY_COLORS[t.priority] || { bg: '#f5f5f5', color: '#616161' };
        const statusClass = t.status === 'Done' ? 'todo-status-done' : t.status === 'In Progress' ? 'todo-status-inprogress' : 'todo-status-open';
        const today = new Date().toISOString().split('T')[0];
        const isOverdue = t.dueDate && t.status !== 'Done' && t.dueDate < today;
        return `<tr${t.status === 'Done' ? ' class="todo-row-done"' : ''}>
            <td>${escapeHtml(t.task)}</td>
            <td><a href="#" class="mtg-link" onclick="openMeetingModal('${escapeHtml(t.meetingId)}');return false">${escapeHtml(t.meetingTitle)}</a><br><span class="text-muted-sm">${escapeHtml(t.meetingDate)}</span></td>
            <td>${t.assignee ? escapeHtml(t.assignee) : '—'}</td>
            <td>${t.dueDate ? `<span${isOverdue ? ' class="todo-overdue"' : ''}>${escapeHtml(t.dueDate)}</span>` : '—'}</td>
            <td><span class="todo-priority-badge" style="background:${prioColors.bg};color:${prioColors.color}">${escapeHtml(t.priority)}</span></td>
            <td><span class="todo-status-badge ${statusClass}">${escapeHtml(t.status)}</span></td>
            <td class="action-cell">
                ${t.status !== 'Done' ? `<button class="btn-icon" title="Mark Done" onclick="quickMarkTodoDone('${escapeHtml(t.meetingId)}','${escapeHtml(t.id)}')">✅</button>` : ''}
                <button class="btn-icon" title="Edit" onclick="openTodoModal('${escapeHtml(t.meetingId)}','${escapeHtml(t.id)}')">✏️</button>
                <button class="btn-icon" title="Delete" onclick="deleteTodo('${escapeHtml(t.meetingId)}','${escapeHtml(t.id)}')">🗑️</button>
            </td>
        </tr>`;
    }).join('');

    container.innerHTML = `<div class="asset-table-scroll"><table class="asset-table">
        <thead><tr>
            <th>Task</th>
            <th>Meeting</th>
            <th>Assignee</th>
            <th>Due Date</th>
            <th>Priority</th>
            <th>Status</th>
            <th>Actions</th>
        </tr></thead>
        <tbody>${rows}</tbody>
    </table></div>`;
}

function openMeetingModal(id) {
    const modal = document.getElementById('meeting-modal');
    const titleEl = document.getElementById('meeting-modal-title');
    const submitBtn = document.getElementById('meeting-submit-btn');
    if (!modal) return;

    document.getElementById('meeting-form').reset();
    document.getElementById('meeting-id').value = '';
    document.getElementById('meeting-success').classList.add('hidden');
    document.getElementById('meeting-error').classList.add('hidden');

    if (id) {
        const m = allMeetings.find(x => x.id === id);
        if (!m) return;
        titleEl.textContent = 'Edit Meeting';
        submitBtn.textContent = 'Save Changes';
        document.getElementById('meeting-id').value = m.id;
        document.getElementById('meeting-title').value = m.title || '';
        document.getElementById('meeting-type').value = m.type || 'Management';
        document.getElementById('meeting-date').value = m.date || '';
        document.getElementById('meeting-time').value = m.time || '';
        document.getElementById('meeting-status').value = m.status || 'Upcoming';
        document.getElementById('meeting-location').value = m.location || '';
        document.getElementById('meeting-attendees').value = m.attendees || '';
        document.getElementById('meeting-agenda').value = m.agenda || '';
        document.getElementById('meeting-notes').value = m.notes || '';
    } else {
        titleEl.textContent = 'Add Meeting';
        submitBtn.textContent = 'Add Meeting';
    }

    modal.classList.remove('hidden');
}

function closeMeetingModal() {
    const modal = document.getElementById('meeting-modal');
    if (modal) modal.classList.add('hidden');
}

function closeMeetingModalOnBg(event) {
    if (event.target === document.getElementById('meeting-modal')) closeMeetingModal();
}

async function submitMeeting(event) {
    event.preventDefault();
    const id = document.getElementById('meeting-id').value;
    const successEl = document.getElementById('meeting-success');
    const errorEl = document.getElementById('meeting-error');
    successEl.classList.add('hidden');
    errorEl.classList.add('hidden');

    const payload = {
        title: document.getElementById('meeting-title').value.trim(),
        type: document.getElementById('meeting-type').value,
        date: document.getElementById('meeting-date').value,
        time: document.getElementById('meeting-time').value,
        status: document.getElementById('meeting-status').value,
        location: document.getElementById('meeting-location').value.trim(),
        attendees: document.getElementById('meeting-attendees').value.trim(),
        agenda: document.getElementById('meeting-agenda').value.trim(),
        notes: document.getElementById('meeting-notes').value.trim()
    };

    try {
        const url = id ? `${API_URL}/meetings/${id}` : `${API_URL}/meetings`;
        const method = id ? 'PUT' : 'POST';
        const res = await fetch(url, {
            method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        const data = await res.json();
        if (!res.ok) {
            errorEl.textContent = data.error || 'Error saving meeting';
            errorEl.classList.remove('hidden');
            return;
        }
        successEl.textContent = id ? 'Meeting updated!' : 'Meeting added!';
        successEl.classList.remove('hidden');
        if (id) {
            const idx = allMeetings.findIndex(m => m.id === id);
            if (idx !== -1) allMeetings[idx] = { ...allMeetings[idx], ...data };
        } else {
            allMeetings.push(data);
        }
        renderMeetings();
        renderMeetingsDashboard();
        renderAllTodos();
        setTimeout(() => closeMeetingModal(), 1200);
    } catch (err) {
        errorEl.textContent = 'Network error. Please try again.';
        errorEl.classList.remove('hidden');
    }
}

async function deleteMeeting(id) {
    if (!confirm('Are you sure you want to delete this meeting and all its action items?')) return;
    try {
        const res = await fetch(`${API_URL}/meetings/${id}`, { method: 'DELETE' });
        if (!res.ok) { const d = await res.json(); alert(d.error || 'Error deleting meeting'); return; }
        allMeetings = allMeetings.filter(m => m.id !== id);
        renderMeetings();
        renderMeetingsDashboard();
        renderAllTodos();
    } catch (err) {
        alert('Network error. Please try again.');
    }
}

function openMeetingTodos(meetingId) {
    const meeting = allMeetings.find(m => m.id === meetingId);
    if (!meeting) return;
    // Switch to todos tab and pre-filter
    showMeetingsSection('meetings-todos', null);
    document.querySelectorAll('#meetings-tab .sub-tab-btn').forEach((b, i) => {
        b.classList.toggle('active', i === 2);
    });
    renderAllTodos();
}

// ─── Todo CRUD ────────────────────────────────────────────────────────────────

function openTodoModal(meetingId, todoId) {
    const modal = document.getElementById('todo-modal');
    const titleEl = document.getElementById('todo-modal-title');
    const submitBtn = document.getElementById('todo-submit-btn');
    if (!modal) return;

    document.getElementById('todo-form').reset();
    document.getElementById('todo-meeting-id').value = meetingId;
    document.getElementById('todo-id').value = '';
    document.getElementById('todo-success').classList.add('hidden');
    document.getElementById('todo-error').classList.add('hidden');
    document.getElementById('todo-priority').value = 'Medium';
    document.getElementById('todo-status').value = 'Open';

    if (todoId) {
        const meeting = allMeetings.find(m => m.id === meetingId);
        const todo = meeting && (meeting.todos || []).find(t => t.id === todoId);
        if (!todo) return;
        titleEl.textContent = 'Edit Action Item';
        submitBtn.textContent = 'Save Changes';
        document.getElementById('todo-id').value = todo.id;
        document.getElementById('todo-task').value = todo.task || '';
        document.getElementById('todo-assignee').value = todo.assignee || '';
        document.getElementById('todo-duedate').value = todo.dueDate || '';
        document.getElementById('todo-priority').value = todo.priority || 'Medium';
        document.getElementById('todo-status').value = todo.status || 'Open';
    } else {
        titleEl.textContent = 'Add Action Item';
        submitBtn.textContent = 'Add Action Item';
    }

    modal.classList.remove('hidden');
}

function closeTodoModal() {
    const modal = document.getElementById('todo-modal');
    if (modal) modal.classList.add('hidden');
}

function closeTodoModalOnBg(event) {
    if (event.target === document.getElementById('todo-modal')) closeTodoModal();
}

async function submitTodo(event) {
    event.preventDefault();
    const meetingId = document.getElementById('todo-meeting-id').value;
    const todoId = document.getElementById('todo-id').value;
    const successEl = document.getElementById('todo-success');
    const errorEl = document.getElementById('todo-error');
    successEl.classList.add('hidden');
    errorEl.classList.add('hidden');

    const payload = {
        task: document.getElementById('todo-task').value.trim(),
        assignee: document.getElementById('todo-assignee').value.trim(),
        dueDate: document.getElementById('todo-duedate').value,
        priority: document.getElementById('todo-priority').value,
        status: document.getElementById('todo-status').value
    };

    try {
        const url = todoId
            ? `${API_URL}/meetings/${meetingId}/todos/${todoId}`
            : `${API_URL}/meetings/${meetingId}/todos`;
        const method = todoId ? 'PUT' : 'POST';
        const res = await fetch(url, {
            method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        const data = await res.json();
        if (!res.ok) {
            errorEl.textContent = data.error || 'Error saving action item';
            errorEl.classList.remove('hidden');
            return;
        }
        successEl.textContent = todoId ? 'Action item updated!' : 'Action item added!';
        successEl.classList.remove('hidden');
        // Update local state
        const mIdx = allMeetings.findIndex(m => m.id === meetingId);
        if (mIdx !== -1) {
            if (!Array.isArray(allMeetings[mIdx].todos)) allMeetings[mIdx].todos = [];
            if (todoId) {
                const tIdx = allMeetings[mIdx].todos.findIndex(t => t.id === todoId);
                if (tIdx !== -1) allMeetings[mIdx].todos[tIdx] = data;
            } else {
                allMeetings[mIdx].todos.push(data);
            }
        }
        renderMeetings();
        renderMeetingsDashboard();
        renderAllTodos();
        setTimeout(() => closeTodoModal(), 1200);
    } catch (err) {
        errorEl.textContent = 'Network error. Please try again.';
        errorEl.classList.remove('hidden');
    }
}

async function deleteTodo(meetingId, todoId) {
    if (!confirm('Delete this action item?')) return;
    try {
        const res = await fetch(`${API_URL}/meetings/${meetingId}/todos/${todoId}`, { method: 'DELETE' });
        if (!res.ok) { const d = await res.json(); alert(d.error || 'Error deleting action item'); return; }
        const mIdx = allMeetings.findIndex(m => m.id === meetingId);
        if (mIdx !== -1) {
            allMeetings[mIdx].todos = (allMeetings[mIdx].todos || []).filter(t => t.id !== todoId);
        }
        renderMeetings();
        renderMeetingsDashboard();
        renderAllTodos();
    } catch (err) {
        alert('Network error. Please try again.');
    }
}

async function quickMarkTodoDone(meetingId, todoId) {
    try {
        const res = await fetch(`${API_URL}/meetings/${meetingId}/todos/${todoId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status: 'Done' })
        });
        if (!res.ok) { const d = await res.json(); alert(d.error || 'Error updating action item'); return; }
        const mIdx = allMeetings.findIndex(m => m.id === meetingId);
        if (mIdx !== -1) {
            const tIdx = (allMeetings[mIdx].todos || []).findIndex(t => t.id === todoId);
            if (tIdx !== -1) allMeetings[mIdx].todos[tIdx].status = 'Done';
        }
        renderMeetings();
        renderMeetingsDashboard();
        renderAllTodos();
    } catch (err) {
        alert('Network error. Please try again.');
    }
}

// ─── Meeting Protocols ────────────────────────────────────────────────────────

const PROTOCOL_STATUS_COLORS = {
    'Draft': { bg: '#fff8e1', color: '#f57f17' },
    'Final': { bg: '#e8f5e9', color: '#2e7d32' }
};

function renderAllProtocols() {
    const search = (document.getElementById('protocols-search')?.value || '').toLowerCase();
    const status = document.getElementById('protocols-filter-status')?.value || '';

    const container = document.getElementById('protocols-table-container');
    if (!container) return;

    let protocols = [];
    allMeetings.forEach(m => {
        (m.protocols || []).forEach(p => {
            protocols.push({ ...p, meetingId: m.id, meetingTitle: m.title, meetingDate: m.date });
        });
    });

    protocols = protocols.filter(p => {
        if (status && p.status !== status) return false;
        if (search) {
            const hay = [p.title, p.author, p.content, p.meetingTitle].join(' ').toLowerCase();
            if (!hay.includes(search)) return false;
        }
        return true;
    });

    protocols.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    if (protocols.length === 0) {
        container.innerHTML = '<p class="empty-state">No protocols found. Click 📝 on a meeting to write its first protocol.</p>';
        return;
    }

    const rows = protocols.map(p => {
        const sc = PROTOCOL_STATUS_COLORS[p.status] || { bg: '#f5f5f5', color: '#616161' };
        const preview = p.content ? (p.content.length > 120 ? escapeHtml(p.content.substring(0, 120)) + '\u2026' : escapeHtml(p.content)) : '\u2014';
        const updatedAt = p.updatedAt ? new Date(p.updatedAt).toLocaleDateString() : '\u2014';
        return `<tr>
            <td><strong>${escapeHtml(p.title)}</strong></td>
            <td><span class="mtg-link-text">${escapeHtml(p.meetingTitle)}</span><br><span class="text-muted-sm">${escapeHtml(p.meetingDate)}</span></td>
            <td>${p.author ? escapeHtml(p.author) : '\u2014'}</td>
            <td><span class="protocol-status-badge" style="background:${sc.bg};color:${sc.color}">${escapeHtml(p.status)}</span></td>
            <td class="text-muted-sm">${preview}</td>
            <td class="text-muted-sm">${updatedAt}</td>
            <td class="action-cell">
                <button class="btn-icon" title="Edit" onclick="openProtocolModal('${escapeHtml(p.meetingId)}', '${escapeHtml(p.id)}')">✏️</button>
                <button class="btn-icon" title="Delete" onclick="deleteProtocol('${escapeHtml(p.meetingId)}', '${escapeHtml(p.id)}')">🗑️</button>
            </td>
        </tr>`;
    }).join('');

    container.innerHTML = `<div class="asset-table-scroll"><table class="asset-table">
        <thead><tr>
            <th>Title</th>
            <th>Meeting</th>
            <th>Author</th>
            <th>Status</th>
            <th>Content Preview</th>
            <th>Last Updated</th>
            <th>Actions</th>
        </tr></thead>
        <tbody>${rows}</tbody>
    </table></div>`;
}

function openMeetingProtocols(meetingId) {
    const btn = document.getElementById('meetings-protocols-tab-btn');
    showMeetingsSection('meetings-protocols', btn);
    openProtocolModal(meetingId, null);
}

function openProtocolModal(meetingId, protocolId) {
    const meeting = allMeetings.find(m => m.id === meetingId);
    if (!meeting) return;

    document.getElementById('protocol-meeting-id').value = meetingId;
    document.getElementById('protocol-id').value = protocolId || '';
    document.getElementById('protocol-success').classList.add('hidden');
    document.getElementById('protocol-error').classList.add('hidden');

    if (protocolId) {
        const protocol = (meeting.protocols || []).find(p => p.id === protocolId);
        if (!protocol) return;
        document.getElementById('protocol-modal-title').textContent = 'Edit Protocol';
        document.getElementById('protocol-submit-btn').textContent = 'Save Changes';
        document.getElementById('protocol-title').value = protocol.title || '';
        document.getElementById('protocol-author').value = protocol.author || '';
        document.getElementById('protocol-status').value = protocol.status || 'Draft';
        document.getElementById('protocol-content').value = protocol.content || '';
    } else {
        document.getElementById('protocol-modal-title').textContent = 'Add Protocol \u2014 ' + meeting.title;
        document.getElementById('protocol-submit-btn').textContent = 'Add Protocol';
        document.getElementById('protocol-title').value = '';
        document.getElementById('protocol-author').value = '';
        document.getElementById('protocol-status').value = 'Draft';
        document.getElementById('protocol-content').value = '';
    }

    document.getElementById('protocol-modal').classList.remove('hidden');
}

function closeProtocolModal() {
    document.getElementById('protocol-modal').classList.add('hidden');
}

function closeProtocolModalOnBg(event) {
    if (event.target === document.getElementById('protocol-modal')) closeProtocolModal();
}

async function submitProtocol(event) {
    event.preventDefault();
    const meetingId = document.getElementById('protocol-meeting-id').value;
    const protocolId = document.getElementById('protocol-id').value;
    const title = document.getElementById('protocol-title').value.trim();
    const author = document.getElementById('protocol-author').value.trim();
    const status = document.getElementById('protocol-status').value;
    const content = document.getElementById('protocol-content').value.trim();

    const successEl = document.getElementById('protocol-success');
    const errorEl = document.getElementById('protocol-error');
    const submitBtn = document.getElementById('protocol-submit-btn');
    successEl.classList.add('hidden');
    errorEl.classList.add('hidden');

    const payload = { title, author, status, content };
    const isEdit = !!protocolId;
    const url = isEdit
        ? `${API_URL}/meetings/${meetingId}/protocols/${protocolId}`
        : `${API_URL}/meetings/${meetingId}/protocols`;
    const method = isEdit ? 'PUT' : 'POST';

    submitBtn.disabled = true;
    try {
        const res = await fetch(url, {
            method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        const data = await res.json();
        if (!res.ok) {
            errorEl.textContent = data.error || 'Error saving protocol';
            errorEl.classList.remove('hidden');
            return;
        }
        const mIdx = allMeetings.findIndex(m => m.id === meetingId);
        if (mIdx !== -1) {
            if (!Array.isArray(allMeetings[mIdx].protocols)) allMeetings[mIdx].protocols = [];
            if (isEdit) {
                const pIdx = allMeetings[mIdx].protocols.findIndex(p => p.id === protocolId);
                if (pIdx !== -1) allMeetings[mIdx].protocols[pIdx] = data;
            } else {
                allMeetings[mIdx].protocols.push(data);
            }
        }
        successEl.textContent = isEdit ? 'Protocol updated!' : 'Protocol added!';
        successEl.classList.remove('hidden');
        renderAllProtocols();
        renderMeetings();
        renderMeetingsDashboard();
        setTimeout(() => closeProtocolModal(), 900);
    } catch {
        errorEl.textContent = 'Network error. Please try again.';
        errorEl.classList.remove('hidden');
    } finally {
        submitBtn.disabled = false;
    }
}

async function deleteProtocol(meetingId, protocolId) {
    if (!confirm('Delete this protocol? This cannot be undone.')) return;
    try {
        const res = await fetch(`${API_URL}/meetings/${meetingId}/protocols/${protocolId}`, { method: 'DELETE' });
        if (!res.ok) { const d = await res.json(); alert(d.error || 'Error deleting protocol'); return; }
        const mIdx = allMeetings.findIndex(m => m.id === meetingId);
        if (mIdx !== -1) {
            allMeetings[mIdx].protocols = (allMeetings[mIdx].protocols || []).filter(p => p.id !== protocolId);
        }
        renderAllProtocols();
        renderMeetings();
        renderMeetingsDashboard();
    } catch {
        alert('Network error. Please try again.');
    }
}

// ─── Employee Evaluations ─────────────────────────────────────────────────────

const EVAL_TYPE_COLORS = {
    'Annual Review':    { bg: '#e3f2fd', color: '#1565c0' },
    'Mid-Year Review':  { bg: '#f3e5f5', color: '#6a1b9a' },
    'Probation Review': { bg: '#fff3e0', color: '#e65100' },
    '360 Feedback':     { bg: '#e8f5e9', color: '#2e7d32' },
    'Other':            { bg: '#f5f5f5', color: '#616161' }
};

const EVAL_STATUS_COLORS = {
    'Draft':       { bg: '#fff8e1', color: '#f57f17' },
    'In Progress': { bg: '#e3f2fd', color: '#1565c0' },
    'Completed':   { bg: '#e8f5e9', color: '#2e7d32' }
};

const EVAL_GOAL_STATUS_COLORS = {
    'Not Started':  { bg: '#f5f5f5', color: '#616161' },
    'In Progress':  { bg: '#e3f2fd', color: '#1565c0' },
    'Achieved':     { bg: '#e8f5e9', color: '#2e7d32' },
    'Not Achieved': { bg: '#fdecea', color: '#c62828' }
};

function showEvaluationsSection(sectionId, btn) {
    document.querySelectorAll('#evaluations-tab .ob-section').forEach(s => s.classList.remove('active'));
    document.querySelectorAll('#evaluations-tab .sub-tab-btn').forEach(b => b.classList.remove('active'));
    const el = document.getElementById(sectionId);
    if (el) el.classList.add('active');
    if (btn) btn.classList.add('active');
    if (sectionId === 'evaluations-goals') renderAllEvalGoals();
}

async function loadEvaluations() {
    try {
        const res = await fetch(`${API_URL}/evaluations`);
        if (!res.ok) throw new Error('Failed to load evaluations');
        allEvaluations = await res.json();
        renderEvaluations();
        renderEvaluationsDashboard();
        renderAllEvalGoals();
    } catch (err) {
        const c = document.getElementById('evaluations-table-container');
        if (c) c.innerHTML = '<p class="error-state">Failed to load evaluations.</p>';
    }
}

function renderEvaluationsDashboard() {
    const total = allEvaluations.length;
    const draft = allEvaluations.filter(e => e.status === 'Draft').length;
    const inProgress = allEvaluations.filter(e => e.status === 'In Progress').length;
    const completed = allEvaluations.filter(e => e.status === 'Completed').length;
    const allGoals = allEvaluations.flatMap(e => e.goals || []);
    const openGoals = allGoals.filter(g => g.status !== 'Achieved' && g.status !== 'Not Achieved').length;

    const kpiEl = document.getElementById('evaluations-kpi-cards');
    if (kpiEl) {
        kpiEl.innerHTML = `
            <div class="kpi-card"><div class="kpi-value">${total}</div><div class="kpi-label">Total Evaluations</div></div>
            <div class="kpi-card"><div class="kpi-value" style="color:#f57f17">${draft}</div><div class="kpi-label">Draft</div></div>
            <div class="kpi-card"><div class="kpi-value" style="color:#1565c0">${inProgress}</div><div class="kpi-label">In Progress</div></div>
            <div class="kpi-card"><div class="kpi-value" style="color:#2e7d32">${completed}</div><div class="kpi-label">Completed</div></div>
            <div class="kpi-card${openGoals > 0 ? ' kpi-card-warn' : ''}"><div class="kpi-value" style="color:#e65100">${openGoals}</div><div class="kpi-label">Open Goals</div></div>
        `;
    }

    // By type chart
    const byType = {};
    allEvaluations.forEach(e => { byType[e.type] = (byType[e.type] || 0) + 1; });
    const byTypeEl = document.getElementById('evaluations-by-type');
    if (byTypeEl) {
        if (Object.keys(byType).length === 0) {
            byTypeEl.innerHTML = '<p class="empty-state" style="font-size:var(--fs-sm)">No evaluations yet.</p>';
        } else {
            byTypeEl.innerHTML = Object.entries(byType).sort((a, b) => b[1] - a[1]).map(([type, count]) => {
                const pct = Math.round((count / total) * 100);
                const col = (EVAL_TYPE_COLORS[type] || { color: '#616161' }).color;
                return `<div class="chart-bar-row">
                    <span class="chart-bar-label">${escapeHtml(type)}</span>
                    <div class="chart-bar-track"><div class="chart-bar-fill" style="width:${pct}%;background:${col}"></div></div>
                    <span class="chart-bar-count">${count}</span>
                </div>`;
            }).join('');
        }
    }

    // By status chart
    const byStatus = {};
    allEvaluations.forEach(e => { byStatus[e.status] = (byStatus[e.status] || 0) + 1; });
    const byStatusEl = document.getElementById('evaluations-by-status');
    if (byStatusEl) {
        if (Object.keys(byStatus).length === 0) {
            byStatusEl.innerHTML = '<p class="empty-state" style="font-size:var(--fs-sm)">No data yet.</p>';
        } else {
            const maxStatusCount = Math.max(...Object.values(byStatus));
            byStatusEl.innerHTML = Object.entries(byStatus).sort((a, b) => b[1] - a[1]).map(([st, count]) => {
                const pct = Math.round((count / maxStatusCount) * 100);
                const col = (EVAL_STATUS_COLORS[st] || { color: '#9e9e9e' }).color;
                return `<div class="chart-bar-row">
                    <span class="chart-bar-label">${escapeHtml(st)}</span>
                    <div class="chart-bar-track"><div class="chart-bar-fill" style="width:${pct}%;background:${col}"></div></div>
                    <span class="chart-bar-count">${count}</span>
                </div>`;
            }).join('');
        }
    }

    // Recent evaluations list
    const recentEl = document.getElementById('evaluations-recent');
    if (recentEl) {
        const recentList = [...allEvaluations]
            .sort((a, b) => new Date(b.updatedAt || b.createdAt) - new Date(a.updatedAt || a.createdAt))
            .slice(0, 5);
        if (recentList.length === 0) {
            recentEl.innerHTML = '<p class="empty-state" style="font-size:var(--fs-sm)">No evaluations yet.</p>';
        } else {
            recentEl.innerHTML = recentList.map(e => {
                const typeColors = EVAL_TYPE_COLORS[e.type] || { bg: '#f5f5f5', color: '#616161' };
                const sc = EVAL_STATUS_COLORS[e.status] || { bg: '#f5f5f5', color: '#616161' };
                return `<div class="recent-item">
                    <div class="recent-item-main">
                        <span class="recent-item-name">${escapeHtml(e.employeeName)}</span>
                        <span class="eval-type-badge" style="background:${typeColors.bg};color:${typeColors.color}">${escapeHtml(e.type)}</span>
                    </div>
                    <div class="recent-item-sub">${escapeHtml(e.period)}${e.overallScore ? ' · Score: ' + escapeHtml(String(e.overallScore)) + '/5' : ''} · <span class="eval-status-badge" style="background:${sc.bg};color:${sc.color}">${escapeHtml(e.status)}</span></div>
                </div>`;
            }).join('');
        }
    }
}

function renderEvaluations() {
    const search = (document.getElementById('evaluations-search')?.value || '').toLowerCase();
    const type = document.getElementById('evaluations-filter-type')?.value || '';
    const status = document.getElementById('evaluations-filter-status')?.value || '';

    let evaluations = allEvaluations.filter(e => {
        if (type && e.type !== type) return false;
        if (status && e.status !== status) return false;
        if (search) {
            const hay = [e.employeeName, e.evaluatorName, e.period, e.comments].join(' ').toLowerCase();
            if (!hay.includes(search)) return false;
        }
        return true;
    });

    evaluations = [...evaluations].sort((a, b) => new Date(b.updatedAt || b.createdAt) - new Date(a.updatedAt || a.createdAt));

    const container = document.getElementById('evaluations-table-container');
    if (!container) return;

    if (evaluations.length === 0) {
        container.innerHTML = '<p class="empty-state">No evaluations found. Click "+ Add Evaluation" to get started.</p>';
        return;
    }

    const rows = evaluations.map(e => {
        const typeColors = EVAL_TYPE_COLORS[e.type] || { bg: '#f5f5f5', color: '#616161' };
        const sc = EVAL_STATUS_COLORS[e.status] || { bg: '#f5f5f5', color: '#616161' };
        const goals = e.goals || [];
        const openGoals = goals.filter(g => g.status !== 'Achieved' && g.status !== 'Not Achieved').length;
        const scoreLabel = e.overallScore ? `${e.overallScore}/5` : '—';
        return `<tr>
            <td><strong>${escapeHtml(e.employeeName)}</strong></td>
            <td>${e.evaluatorName ? escapeHtml(e.evaluatorName) : '—'}</td>
            <td>${escapeHtml(e.period)}</td>
            <td><span class="eval-type-badge" style="background:${typeColors.bg};color:${typeColors.color}">${escapeHtml(e.type)}</span></td>
            <td><span class="eval-status-badge" style="background:${sc.bg};color:${sc.color}">${escapeHtml(e.status)}</span></td>
            <td>${e.dueDate ? escapeHtml(e.dueDate) : '—'}</td>
            <td>${scoreLabel !== '—' ? `<strong>${scoreLabel}</strong>` : '—'}</td>
            <td><span class="eval-goal-count${openGoals > 0 ? ' eval-goal-open' : ''}">${goals.length} total / ${openGoals} open</span></td>
            <td class="action-cell">
                <button class="btn-icon" title="Manage Goals" onclick="openEvaluationGoals('${escapeHtml(e.id)}')">🎯</button>
                <button class="btn-icon" title="Edit" onclick="openEvaluationModal('${escapeHtml(e.id)}')">✏️</button>
                <button class="btn-icon" title="Delete" onclick="deleteEvaluation('${escapeHtml(e.id)}')">🗑️</button>
            </td>
        </tr>`;
    }).join('');

    container.innerHTML = `<div class="asset-table-scroll"><table class="asset-table">
        <thead><tr>
            <th>Employee</th>
            <th>Evaluator</th>
            <th>Period</th>
            <th>Type</th>
            <th>Status</th>
            <th>Due Date</th>
            <th>Score</th>
            <th>Goals</th>
            <th>Actions</th>
        </tr></thead>
        <tbody>${rows}</tbody>
    </table></div>`;
}

function renderAllEvalGoals() {
    const search = (document.getElementById('eval-goals-search')?.value || '').toLowerCase();
    const status = document.getElementById('eval-goals-filter-status')?.value || '';

    const container = document.getElementById('eval-goals-table-container');
    if (!container) return;

    let goals = [];
    allEvaluations.forEach(e => {
        (e.goals || []).forEach(g => {
            goals.push({ ...g, evaluationId: e.id, employeeName: e.employeeName, period: e.period });
        });
    });

    goals = goals.filter(g => {
        if (status && g.status !== status) return false;
        if (search) {
            const hay = [g.title, g.description, g.employeeName, g.period].join(' ').toLowerCase();
            if (!hay.includes(search)) return false;
        }
        return true;
    });

    goals.sort((a, b) => {
        const order = { 'Not Started': 0, 'In Progress': 1, 'Achieved': 2, 'Not Achieved': 3 };
        return (order[a.status] ?? 99) - (order[b.status] ?? 99);
    });

    if (goals.length === 0) {
        container.innerHTML = '<p class="empty-state">No goals found. Click 🎯 on an evaluation to add goals.</p>';
        return;
    }

    const rows = goals.map(g => {
        const sc = EVAL_GOAL_STATUS_COLORS[g.status] || { bg: '#f5f5f5', color: '#616161' };
        const scoreLabel = g.score ? `${g.score}/5` : '—';
        const preview = g.description ? (g.description.length > 100 ? escapeHtml(g.description.substring(0, 100)) + '\u2026' : escapeHtml(g.description)) : '—';
        return `<tr>
            <td><strong>${escapeHtml(g.title)}</strong></td>
            <td>${escapeHtml(g.employeeName)}<br><span class="text-muted-sm">${escapeHtml(g.period)}</span></td>
            <td>${preview}</td>
            <td><span class="eval-goal-status-badge" style="background:${sc.bg};color:${sc.color}">${escapeHtml(g.status)}</span></td>
            <td>${scoreLabel !== '—' ? `<strong>${scoreLabel}</strong>` : '—'}</td>
            <td class="action-cell">
                <button class="btn-icon" title="Edit" onclick="openEvalGoalModal('${escapeHtml(g.evaluationId)}','${escapeHtml(g.id)}')">✏️</button>
                <button class="btn-icon" title="Delete" onclick="deleteEvalGoal('${escapeHtml(g.evaluationId)}','${escapeHtml(g.id)}')">🗑️</button>
            </td>
        </tr>`;
    }).join('');

    container.innerHTML = `<div class="asset-table-scroll"><table class="asset-table">
        <thead><tr>
            <th>Goal</th>
            <th>Employee / Period</th>
            <th>Description</th>
            <th>Status</th>
            <th>Score</th>
            <th>Actions</th>
        </tr></thead>
        <tbody>${rows}</tbody>
    </table></div>`;
}

function openEvaluationModal(id) {
    const modal = document.getElementById('evaluation-modal');
    const titleEl = document.getElementById('evaluation-modal-title');
    const submitBtn = document.getElementById('evaluation-submit-btn');
    if (!modal) return;

    document.getElementById('evaluation-form').reset();
    document.getElementById('evaluation-id').value = '';
    document.getElementById('evaluation-success').classList.add('hidden');
    document.getElementById('evaluation-error').classList.add('hidden');

    if (id) {
        const e = allEvaluations.find(x => x.id === id);
        if (!e) return;
        titleEl.textContent = 'Edit Evaluation';
        submitBtn.textContent = 'Save Changes';
        document.getElementById('evaluation-id').value = e.id;
        document.getElementById('evaluation-employee').value = e.employeeName || '';
        document.getElementById('evaluation-evaluator').value = e.evaluatorName || '';
        document.getElementById('evaluation-period').value = e.period || '';
        document.getElementById('evaluation-type').value = e.type || 'Annual Review';
        document.getElementById('evaluation-status').value = e.status || 'Draft';
        document.getElementById('evaluation-duedate').value = e.dueDate || '';
        document.getElementById('evaluation-score').value = e.overallScore !== null && e.overallScore !== undefined ? String(e.overallScore) : '';
        document.getElementById('evaluation-comments').value = e.comments || '';
    } else {
        titleEl.textContent = 'Add Evaluation';
        submitBtn.textContent = 'Add Evaluation';
    }

    modal.classList.remove('hidden');
}

function closeEvaluationModal() {
    const modal = document.getElementById('evaluation-modal');
    if (modal) modal.classList.add('hidden');
}

function closeEvaluationModalOnBg(event) {
    if (event.target === document.getElementById('evaluation-modal')) closeEvaluationModal();
}

async function submitEvaluation(event) {
    event.preventDefault();
    const id = document.getElementById('evaluation-id').value;
    const successEl = document.getElementById('evaluation-success');
    const errorEl = document.getElementById('evaluation-error');
    successEl.classList.add('hidden');
    errorEl.classList.add('hidden');

    const payload = {
        employeeName: document.getElementById('evaluation-employee').value.trim(),
        evaluatorName: document.getElementById('evaluation-evaluator').value.trim(),
        period: document.getElementById('evaluation-period').value.trim(),
        type: document.getElementById('evaluation-type').value,
        status: document.getElementById('evaluation-status').value,
        dueDate: document.getElementById('evaluation-duedate').value,
        overallScore: document.getElementById('evaluation-score').value,
        comments: document.getElementById('evaluation-comments').value.trim()
    };

    try {
        const url = id ? `${API_URL}/evaluations/${id}` : `${API_URL}/evaluations`;
        const method = id ? 'PUT' : 'POST';
        const res = await fetch(url, {
            method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        const data = await res.json();
        if (!res.ok) {
            errorEl.textContent = data.error || 'Error saving evaluation';
            errorEl.classList.remove('hidden');
            return;
        }
        successEl.textContent = id ? 'Evaluation updated!' : 'Evaluation added!';
        successEl.classList.remove('hidden');
        if (id) {
            const idx = allEvaluations.findIndex(e => e.id === id);
            if (idx !== -1) allEvaluations[idx] = { ...allEvaluations[idx], ...data };
        } else {
            allEvaluations.push(data);
        }
        renderEvaluations();
        renderEvaluationsDashboard();
        renderAllEvalGoals();
        setTimeout(() => closeEvaluationModal(), 1200);
    } catch (err) {
        errorEl.textContent = 'Network error. Please try again.';
        errorEl.classList.remove('hidden');
    }
}

async function deleteEvaluation(id) {
    if (!confirm('Are you sure you want to delete this evaluation and all its goals?')) return;
    try {
        const res = await fetch(`${API_URL}/evaluations/${id}`, { method: 'DELETE' });
        if (!res.ok) { const d = await res.json(); alert(d.error || 'Error deleting evaluation'); return; }
        allEvaluations = allEvaluations.filter(e => e.id !== id);
        renderEvaluations();
        renderEvaluationsDashboard();
        renderAllEvalGoals();
    } catch (err) {
        alert('Network error. Please try again.');
    }
}

function openEvaluationGoals(evaluationId) {
    const btn = document.querySelector('#evaluations-tab .sub-tab-btn:nth-child(3)');
    showEvaluationsSection('evaluations-goals', btn);
    openEvalGoalModal(evaluationId, null);
}

// ─── Evaluation Goal CRUD ─────────────────────────────────────────────────────

function openEvalGoalModal(evaluationId, goalId) {
    const modal = document.getElementById('eval-goal-modal');
    const titleEl = document.getElementById('eval-goal-modal-title');
    const submitBtn = document.getElementById('eval-goal-submit-btn');
    if (!modal) return;

    document.getElementById('eval-goal-form').reset();
    document.getElementById('eval-goal-evaluation-id').value = evaluationId;
    document.getElementById('eval-goal-id').value = '';
    document.getElementById('eval-goal-success').classList.add('hidden');
    document.getElementById('eval-goal-error').classList.add('hidden');
    document.getElementById('eval-goal-status').value = 'Not Started';
    document.getElementById('eval-goal-score').value = '';

    if (goalId) {
        const evaluation = allEvaluations.find(e => e.id === evaluationId);
        const goal = evaluation && (evaluation.goals || []).find(g => g.id === goalId);
        if (!goal) return;
        titleEl.textContent = 'Edit Goal';
        submitBtn.textContent = 'Save Changes';
        document.getElementById('eval-goal-id').value = goal.id;
        document.getElementById('eval-goal-title').value = goal.title || '';
        document.getElementById('eval-goal-description').value = goal.description || '';
        document.getElementById('eval-goal-score').value = goal.score !== null && goal.score !== undefined ? String(goal.score) : '';
        document.getElementById('eval-goal-status').value = goal.status || 'Not Started';
    } else {
        const evaluation = allEvaluations.find(e => e.id === evaluationId);
        titleEl.textContent = evaluation ? 'Add Goal — ' + evaluation.employeeName : 'Add Goal';
        submitBtn.textContent = 'Add Goal';
    }

    modal.classList.remove('hidden');
}

function closeEvalGoalModal() {
    const modal = document.getElementById('eval-goal-modal');
    if (modal) modal.classList.add('hidden');
}

function closeEvalGoalModalOnBg(event) {
    if (event.target === document.getElementById('eval-goal-modal')) closeEvalGoalModal();
}

async function submitEvalGoal(event) {
    event.preventDefault();
    const evaluationId = document.getElementById('eval-goal-evaluation-id').value;
    const goalId = document.getElementById('eval-goal-id').value;
    const successEl = document.getElementById('eval-goal-success');
    const errorEl = document.getElementById('eval-goal-error');
    const submitBtn = document.getElementById('eval-goal-submit-btn');
    successEl.classList.add('hidden');
    errorEl.classList.add('hidden');

    const payload = {
        title: document.getElementById('eval-goal-title').value.trim(),
        description: document.getElementById('eval-goal-description').value.trim(),
        score: document.getElementById('eval-goal-score').value,
        status: document.getElementById('eval-goal-status').value
    };

    const isEdit = !!goalId;
    const url = isEdit
        ? `${API_URL}/evaluations/${evaluationId}/goals/${goalId}`
        : `${API_URL}/evaluations/${evaluationId}/goals`;
    const method = isEdit ? 'PUT' : 'POST';

    submitBtn.disabled = true;
    try {
        const res = await fetch(url, {
            method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        const data = await res.json();
        if (!res.ok) {
            errorEl.textContent = data.error || 'Error saving goal';
            errorEl.classList.remove('hidden');
            return;
        }
        const eIdx = allEvaluations.findIndex(e => e.id === evaluationId);
        if (eIdx !== -1) {
            if (!Array.isArray(allEvaluations[eIdx].goals)) allEvaluations[eIdx].goals = [];
            if (isEdit) {
                const gIdx = allEvaluations[eIdx].goals.findIndex(g => g.id === goalId);
                if (gIdx !== -1) allEvaluations[eIdx].goals[gIdx] = data;
            } else {
                allEvaluations[eIdx].goals.push(data);
            }
        }
        successEl.textContent = isEdit ? 'Goal updated!' : 'Goal added!';
        successEl.classList.remove('hidden');
        renderAllEvalGoals();
        renderEvaluations();
        renderEvaluationsDashboard();
        setTimeout(() => closeEvalGoalModal(), 900);
    } catch {
        errorEl.textContent = 'Network error. Please try again.';
        errorEl.classList.remove('hidden');
    } finally {
        submitBtn.disabled = false;
    }
}

async function deleteEvalGoal(evaluationId, goalId) {
    if (!confirm('Delete this goal? This cannot be undone.')) return;
    try {
        const res = await fetch(`${API_URL}/evaluations/${evaluationId}/goals/${goalId}`, { method: 'DELETE' });
        if (!res.ok) { const d = await res.json(); alert(d.error || 'Error deleting goal'); return; }
        const eIdx = allEvaluations.findIndex(e => e.id === evaluationId);
        if (eIdx !== -1) {
            allEvaluations[eIdx].goals = (allEvaluations[eIdx].goals || []).filter(g => g.id !== goalId);
        }
        renderAllEvalGoals();
        renderEvaluations();
        renderEvaluationsDashboard();
    } catch {
        alert('Network error. Please try again.');
    }
}

// ─── Open Positions ──────────────────────────────────────────────────────────

let pendingPositionSkills = [];

function showOpenPositionsSection(sectionId, btn) {
    document.querySelectorAll('#open-positions-tab .ob-section').forEach(el => el.classList.remove('active'));
    document.getElementById(sectionId).classList.add('active');
    document.querySelectorAll('#open-positions-tab .sub-tab-btn').forEach(el => el.classList.remove('active'));
    btn.classList.add('active');
}

async function loadOpenPositions() {
    try {
        const res = await fetch(`${API_URL}/open-positions`);
        if (!res.ok) throw new Error('Failed to fetch');
        allOpenPositions = await res.json();
        renderOpenPositions();
        renderOpenPositionsDashboard();
    } catch {
        document.getElementById('op-table-container').innerHTML = '<p class="error-state">Failed to load open positions.</p>';
    }
}

function renderOpenPositionsDashboard() {
    const positions = allOpenPositions;
    const total = positions.length;
    const open = positions.filter(p => p.status === 'Open').length;
    const inProgress = positions.filter(p => p.status === 'In Progress').length;
    const filled = positions.filter(p => p.status === 'Filled').length;
    const urgent = positions.filter(p => p.priority === 'Urgent' && p.status !== 'Filled' && p.status !== 'Cancelled').length;

    const kpiEl = document.getElementById('op-kpi-cards');
    if (kpiEl) {
        kpiEl.innerHTML = `
            <div class="kpi-card"><div class="kpi-label">Total Positions</div><div class="kpi-value">${total}</div></div>
            <div class="kpi-card"><div class="kpi-label">Open</div><div class="kpi-value">${open}</div></div>
            <div class="kpi-card"><div class="kpi-label">In Progress</div><div class="kpi-value">${inProgress}</div></div>
            <div class="kpi-card ${urgent > 0 ? 'kpi-card-warn' : ''}"><div class="kpi-label">Urgent</div><div class="kpi-value">${urgent}</div></div>
        `;
    }

    const statusCounts = {};
    positions.forEach(p => { statusCounts[p.status] = (statusCounts[p.status] || 0) + 1; });
    const statusEl = document.getElementById('op-by-status');
    if (statusEl) {
        if (!total) { statusEl.innerHTML = '<p class="text-muted-sm">No data yet.</p>'; }
        else {
            statusEl.innerHTML = Object.entries(statusCounts).map(([label, count]) =>
                `<div class="chart-bar-row"><span class="chart-bar-label">${escapeHtml(label)}</span>
                 <div class="chart-bar-track"><div class="chart-bar-fill" style="width:${Math.round((count/total)*100)}%"></div></div>
                 <span class="chart-bar-count">${count}</span></div>`
            ).join('');
        }
    }

    const priorityCounts = {};
    positions.forEach(p => { if (p.status !== 'Filled' && p.status !== 'Cancelled') priorityCounts[p.priority] = (priorityCounts[p.priority] || 0) + 1; });
    const priorityEl = document.getElementById('op-by-priority');
    if (priorityEl) {
        const activeTotal = Object.values(priorityCounts).reduce((a, b) => a + b, 0);
        if (!activeTotal) { priorityEl.innerHTML = '<p class="text-muted-sm">No active positions.</p>'; }
        else {
            priorityEl.innerHTML = Object.entries(priorityCounts).map(([label, count]) =>
                `<div class="chart-bar-row"><span class="chart-bar-label">${escapeHtml(label)}</span>
                 <div class="chart-bar-track"><div class="chart-bar-fill" style="width:${Math.round((count/activeTotal)*100)}%"></div></div>
                 <span class="chart-bar-count">${count}</span></div>`
            ).join('');
        }
    }

    const empCounts = {};
    positions.forEach(p => { if (p.employmentType) empCounts[p.employmentType] = (empCounts[p.employmentType] || 0) + 1; });
    const empEl = document.getElementById('op-by-employment');
    if (empEl) {
        const empTotal = Object.values(empCounts).reduce((a, b) => a + b, 0);
        if (!empTotal) { empEl.innerHTML = '<p class="text-muted-sm">No data yet.</p>'; }
        else {
            empEl.innerHTML = Object.entries(empCounts).map(([label, count]) =>
                `<div class="chart-bar-row"><span class="chart-bar-label">${escapeHtml(label)}</span>
                 <div class="chart-bar-track"><div class="chart-bar-fill" style="width:${Math.round((count/empTotal)*100)}%"></div></div>
                 <span class="chart-bar-count">${count}</span></div>`
            ).join('');
        }
    }
}

function renderOpenPositions() {
    const search = (document.getElementById('op-search')?.value || '').toLowerCase();
    const filterStatus = document.getElementById('op-filter-status')?.value || '';
    const filterPriority = document.getElementById('op-filter-priority')?.value || '';
    const filterEmployment = document.getElementById('op-filter-employment')?.value || '';
    const container = document.getElementById('op-table-container');
    if (!container) return;

    let positions = allOpenPositions.filter(p => {
        if (filterStatus && p.status !== filterStatus) return false;
        if (filterPriority && p.priority !== filterPriority) return false;
        if (filterEmployment && p.employmentType !== filterEmployment) return false;
        if (search) {
            const skillNames = (p.requiredSkills || []).map(s => s.name).join(' ').toLowerCase();
            const haystack = [p.title, p.department, p.requestedBy, skillNames].join(' ').toLowerCase();
            if (!haystack.includes(search)) return false;
        }
        return true;
    });

    if (!positions.length) {
        container.innerHTML = '<p class="empty-state">No open positions found.</p>';
        return;
    }

    container.innerHTML = `<div class="asset-table-scroll"><table class="asset-table">
        <thead><tr>
            <th>Title</th>
            <th>Department</th>
            <th>Employment Type</th>
            <th>Priority</th>
            <th>Status</th>
            <th>Requested By</th>
            <th>Target Date</th>
            <th>Required Skills</th>
            <th>Actions</th>
        </tr></thead>
        <tbody>${positions.map(p => {
            const skills = (p.requiredSkills || []);
            const skillsHtml = skills.length
                ? skills.slice(0, 3).map(s => `<span class="skill-tag op-skill-tag">${escapeHtml(s.name)}${s.level ? ` <em class="op-skill-level">${escapeHtml(s.level)}</em>` : ''}</span>`).join('')
                  + (skills.length > 3 ? `<span class="skill-tag-more">+${skills.length - 3} more</span>` : '')
                : '<span class="text-muted-sm">—</span>';
            const targetDate = p.targetDate ? new Date(p.targetDate).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }) : '—';
            return `<tr>
                <td><strong>${escapeHtml(p.title)}</strong>${p.description ? `<div class="text-muted-sm" style="margin-top:2px">${escapeHtml(p.description.substring(0, 60))}${p.description.length > 60 ? '…' : ''}</div>` : ''}</td>
                <td>${escapeHtml(p.department || '—')}</td>
                <td>${p.employmentType ? `<span class="op-emp-badge">${escapeHtml(p.employmentType)}</span>` : '—'}</td>
                <td><span class="op-priority-badge op-priority-${(p.priority || 'medium').toLowerCase()}">${escapeHtml(p.priority || '—')}</span></td>
                <td><span class="op-status-badge op-status-${(p.status || 'open').toLowerCase().replace(' ', '-')}">${escapeHtml(p.status)}</span></td>
                <td>${escapeHtml(p.requestedBy || '—')}</td>
                <td>${targetDate}</td>
                <td><div class="skill-tags-cell">${skillsHtml}</div></td>
                <td class="action-btns">
                    <button class="btn-icon" title="Edit" onclick="openPositionModal('${p.id}')">✏️</button>
                    <button class="btn-icon btn-icon-danger" title="Delete" onclick="deletePosition('${p.id}')">🗑️</button>
                </td>
            </tr>`;
        }).join('')}</tbody>
    </table></div>`;
}

async function openPositionModal(positionId) {
    if (allSkillCategories.length === 0) {
        await loadSkillCategoriesForFilter();
    }
    pendingPositionSkills = [];
    const modal = document.getElementById('open-position-modal');
    const titleEl = document.getElementById('op-modal-title');
    const submitBtn = document.getElementById('op-submit-btn');

    // Populate skill category dropdown
    const catSelect = document.getElementById('op-skill-category');
    catSelect.innerHTML = '<option value="">Category (optional)</option>'
        + allSkillCategories.map(c => `<option value="${escapeHtml(c.name)}">${escapeHtml(c.name)}</option>`).join('');

    document.getElementById('op-id').value = '';
    document.getElementById('op-title').value = '';
    document.getElementById('op-department').value = '';
    document.getElementById('op-employment-type').value = '';
    document.getElementById('op-priority').value = 'Medium';
    document.getElementById('op-status').value = 'Open';
    document.getElementById('op-target-date').value = '';
    document.getElementById('op-requested-by').value = '';
    document.getElementById('op-description').value = '';
    document.getElementById('op-notes').value = '';
    document.getElementById('op-success').classList.add('hidden');
    document.getElementById('op-error').classList.add('hidden');

    if (positionId) {
        const pos = allOpenPositions.find(p => p.id === positionId);
        if (!pos) return;
        titleEl.textContent = 'Edit Position';
        submitBtn.textContent = 'Save Changes';
        document.getElementById('op-id').value = pos.id;
        document.getElementById('op-title').value = pos.title;
        document.getElementById('op-department').value = pos.department || '';
        document.getElementById('op-employment-type').value = pos.employmentType || '';
        document.getElementById('op-priority').value = pos.priority || 'Medium';
        document.getElementById('op-status').value = pos.status || 'Open';
        document.getElementById('op-target-date').value = pos.targetDate ? pos.targetDate.split('T')[0] : '';
        document.getElementById('op-requested-by').value = pos.requestedBy || '';
        document.getElementById('op-description').value = pos.description || '';
        document.getElementById('op-notes').value = pos.notes || '';
        pendingPositionSkills = (pos.requiredSkills || []).map(s => ({ ...s }));
    } else {
        titleEl.textContent = 'New Open Position';
        submitBtn.textContent = 'Create Position';
    }

    renderPositionSkillsList();
    modal.classList.remove('hidden');
}

function closePositionModal() {
    document.getElementById('open-position-modal').classList.add('hidden');
}

function closePositionModalOnBg(event) {
    if (event.target === document.getElementById('open-position-modal')) closePositionModal();
}

function addSkillToPosition() {
    const name = (document.getElementById('op-skill-name').value || '').trim();
    if (!name) return;
    const category = document.getElementById('op-skill-category').value || '';
    const level = document.getElementById('op-skill-level').value || 'Intermediate';
    pendingPositionSkills.push({ name, category, level });
    document.getElementById('op-skill-name').value = '';
    renderPositionSkillsList();
}

function removePositionSkill(idx) {
    pendingPositionSkills.splice(idx, 1);
    renderPositionSkillsList();
}

function renderPositionSkillsList() {
    const container = document.getElementById('op-skills-list');
    if (!container) return;
    if (!pendingPositionSkills.length) {
        container.innerHTML = '<p class="text-muted-sm" style="margin:0">No skills added yet.</p>';
        return;
    }
    container.innerHTML = pendingPositionSkills.map((s, i) =>
        `<div class="sp-skill-item">
            <span class="skill-tag">${escapeHtml(s.name)}${s.category ? ` · ${escapeHtml(s.category)}` : ''} · <em>${escapeHtml(s.level)}</em></span>
            <button type="button" class="btn-icon btn-icon-danger sp-remove-skill" onclick="removePositionSkill(${i})">×</button>
        </div>`
    ).join('');
}

async function submitPosition(event) {
    event.preventDefault();
    const successEl = document.getElementById('op-success');
    const errorEl = document.getElementById('op-error');
    const submitBtn = document.getElementById('op-submit-btn');
    successEl.classList.add('hidden');
    errorEl.classList.add('hidden');
    submitBtn.disabled = true;

    const id = document.getElementById('op-id').value;
    const isEdit = !!id;
    const payload = {
        title: document.getElementById('op-title').value.trim(),
        department: document.getElementById('op-department').value.trim(),
        employmentType: document.getElementById('op-employment-type').value,
        priority: document.getElementById('op-priority').value,
        status: document.getElementById('op-status').value,
        targetDate: document.getElementById('op-target-date').value || null,
        requestedBy: document.getElementById('op-requested-by').value.trim(),
        description: document.getElementById('op-description').value.trim(),
        notes: document.getElementById('op-notes').value.trim(),
        requiredSkills: pendingPositionSkills
    };

    try {
        const url = isEdit ? `${API_URL}/open-positions/${id}` : `${API_URL}/open-positions`;
        const method = isEdit ? 'PUT' : 'POST';
        const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
        if (!res.ok) {
            const d = await res.json();
            errorEl.textContent = d.error || 'Error saving position';
            errorEl.classList.remove('hidden');
            return;
        }
        const saved = await res.json();
        if (isEdit) {
            const idx = allOpenPositions.findIndex(p => p.id === saved.id);
            if (idx !== -1) allOpenPositions[idx] = saved;
        } else {
            allOpenPositions.push(saved);
        }
        successEl.textContent = isEdit ? 'Position updated!' : 'Position created!';
        successEl.classList.remove('hidden');
        renderOpenPositions();
        renderOpenPositionsDashboard();
        setTimeout(() => closePositionModal(), 900);
    } catch {
        errorEl.textContent = 'Network error. Please try again.';
        errorEl.classList.remove('hidden');
    } finally {
        submitBtn.disabled = false;
    }
}

async function deletePosition(positionId) {
    if (!confirm('Delete this open position? This cannot be undone.')) return;
    try {
        const res = await fetch(`${API_URL}/open-positions/${positionId}`, { method: 'DELETE' });
        if (!res.ok) { const d = await res.json(); alert(d.error || 'Error deleting position'); return; }
        allOpenPositions = allOpenPositions.filter(p => p.id !== positionId);
        renderOpenPositions();
        renderOpenPositionsDashboard();
    } catch {
        alert('Network error. Please try again.');
    }
}
