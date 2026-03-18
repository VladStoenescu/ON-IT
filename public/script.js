// API Base URL
const API_URL = '/api';

// Constants
const MESSAGE_DISPLAY_DURATION = 5000; // milliseconds
const MOBILE_BREAKPOINT = 1024; // matches CSS media query in styles.css

// Store all ideas for filtering
let allIdeas = [];

// ─── Navigation ──────────────────────────────────────────────────────────────

function showTab(tabName, event) {
    // Hide all sections
    document.querySelectorAll('.tab-content').forEach(tab => tab.classList.remove('active'));

    // Update sidebar nav active state
    document.querySelectorAll('.nav-item').forEach(item => item.classList.remove('active'));
    const navItem = document.querySelector(`.nav-item[data-section="${tabName}"]`);
    if (navItem) navItem.classList.add('active');

    // Update topbar page title
    const titles = {
        home: 'Home',
        submit: 'Submit Idea',
        view: 'View Ideas',
        onboarding: 'Onboarding',
        trainings: 'Trainings'
    };
    const titleEl = document.getElementById('page-title');
    if (titleEl) titleEl.textContent = titles[tabName] || tabName;

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


