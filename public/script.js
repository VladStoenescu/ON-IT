// API Base URL
const API_URL = '/api';

// Constants
const MESSAGE_DISPLAY_DURATION = 5000; // milliseconds

// Store all ideas for filtering
let allIdeas = [];

// ─── Tab switching ────────────────────────────────────────────────────────────

function showTab(tabName, event) {
    document.querySelectorAll('.tab-content').forEach(tab => tab.classList.remove('active'));
    document.querySelectorAll('.tab-button').forEach(button => button.classList.remove('active'));

    document.getElementById(`${tabName}-tab`).classList.add('active');
    if (event && event.target) event.target.classList.add('active');

    if (tabName === 'view') loadIdeas();
    if (tabName === 'onboarding') {
        loadOnboardingDashboard();
        loadTemplates();
        loadProcesses();
        populateTemplateDropdown();
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
    const cards = [
        { label: 'Total Processes', value: kpis.totalProcesses, icon: '📁', color: '#667eea' },
        { label: 'Active', value: kpis.activeProcesses, icon: '⚙️', color: '#43a047' },
        { label: 'Completed', value: kpis.completedProcesses, icon: '✅', color: '#00acc1' },
        { label: 'Completion Rate', value: kpis.completionRate + '%', icon: '📈', color: '#8e24aa' },
        { label: 'Avg. Days to Complete', value: kpis.avgCompletionDays || '—', icon: '⏱️', color: '#fb8c00' },
        { label: 'Overdue Steps', value: kpis.overdueSteps, icon: '⚠️', color: kpis.overdueSteps > 0 ? '#e53935' : '#43a047' },
        { label: 'Steps Completed Late', value: kpis.completedLateSteps, icon: '🕐', color: '#f4511e' },
        { label: 'Onboarding / Offboarding', value: `${kpis.onboardingCount} / ${kpis.offboardingCount}`, icon: '👥', color: '#039be5' }
    ];
    document.getElementById('kpi-cards').innerHTML = cards.map(c => `
        <div class="kpi-card" style="border-top:4px solid ${c.color}">
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
});
