/* ===========================
   Dashboard — Project list, CRUD, filters
   =========================== */

let allProjects = [];
let currentFilter = '';
let editingId = null;
let searchTimeout = null;

// ===== API CALLS =====
async function fetchProjects(params = {}) {
  const query = new URLSearchParams(params).toString();
  const url = `${API_BASE}/projects${query ? '?' + query : ''}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error('Failed to fetch projects');
  const data = await res.json();
  return data.projects || [];
}

async function createProject(data) {
  const res = await fetch(`${API_BASE}/projects`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || 'Failed to create project');
  }
  return res.json();
}

async function updateProject(data) {
  const res = await fetch(`${API_BASE}/projects`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
  if (!res.ok) throw new Error('Failed to update project');
  return res.json();
}

async function deleteProjectAPI(id) {
  const res = await fetch(`${API_BASE}/projects?id=${id}`, { method: 'DELETE' });
  if (!res.ok) throw new Error('Failed to delete project');
  return res.json();
}

// ===== RENDERING =====
function renderProjects(projects) {
  const tbody = document.getElementById('projectsBody');

  if (projects.length === 0) {
    tbody.innerHTML = `
      <tr><td colspan="9">
        <div class="empty-state">
          <h3>No projects found</h3>
          <p>Try a different filter or add a new project.</p>
        </div>
      </td></tr>`;
    return;
  }

  tbody.innerHTML = projects.map(p => `
    <tr>
      <td class="project-name"><a href="/project.html?id=${p.id}">${esc(p.project_name)}</a></td>
      <td class="client-name">${esc(p.client_name)}</td>
      <td>${esc(p.roof_type)}</td>
      <td>${esc(p.membrane)}</td>
      <td>${Number(p.square_footage).toLocaleString()}</td>
      <td>${esc(p.scale_ratio)}</td>
      <td><span class="badge badge-${p.status}">${p.status.replace('_', ' ')}</span></td>
      <td class="price">${p.price ? '$' + Number(p.price).toLocaleString() : '—'}</td>
      <td class="actions-cell">
        <button class="icon-btn" title="Edit" aria-label="Edit ${esc(p.project_name)}" onclick="openEditModal(${p.id})">✎</button>
        <button class="icon-btn" title="Delete" aria-label="Delete ${esc(p.project_name)}" onclick="confirmDelete(${p.id}, '${esc(p.project_name)}')">✕</button>
      </td>
    </tr>
  `).join('');
}

function updateStats(projects) {
  document.getElementById('stat-total').textContent = projects.length;
  document.getElementById('stat-active').textContent = projects.filter(p => p.status === 'in_progress').length;
  document.getElementById('stat-completed').textContent = projects.filter(p => p.status === 'completed' || p.status === 'delivered').length;
  const revenue = projects.reduce((sum, p) => sum + (parseFloat(p.price) || 0), 0);
  document.getElementById('stat-revenue').textContent = '$' + revenue.toLocaleString();
}

// ===== ACTIONS =====
async function refreshProjects() {
  try {
    const params = {};
    if (currentFilter) params.status = currentFilter;
    const search = document.getElementById('searchInput').value.trim();
    if (search) params.search = search;

    allProjects = await fetchProjects(params);
    renderProjects(allProjects);

    // Always update stats with full set
    const all = currentFilter || search ? await fetchProjects() : allProjects;
    updateStats(all);
  } catch (err) {
    showToast('Error loading projects: ' + err.message, true);
  }
}

function setFilter(btn) {
  document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  currentFilter = btn.dataset.status;
  refreshProjects();
}

function handleSearch() {
  clearTimeout(searchTimeout);
  searchTimeout = setTimeout(refreshProjects, 300);
}

// ===== MODAL =====
function openModal() {
  editingId = null;
  document.getElementById('modalTitle').textContent = 'New Project';
  document.getElementById('modalSubmit').textContent = 'Create Project';
  clearForm();
  document.getElementById('modalOverlay').classList.add('open');
}

function openEditModal(id) {
  const project = allProjects.find(p => p.id === id);
  if (!project) return;

  editingId = id;
  document.getElementById('modalTitle').textContent = 'Edit Project';
  document.getElementById('modalSubmit').textContent = 'Save Changes';

  document.getElementById('f-project_name').value = project.project_name;
  document.getElementById('f-client_name').value = project.client_name;
  document.getElementById('f-client_email').value = project.client_email;
  document.getElementById('f-roof_type').value = project.roof_type;
  document.getElementById('f-membrane').value = project.membrane;
  document.getElementById('f-square_footage').value = project.square_footage;
  document.getElementById('f-scale_ratio').value = project.scale_ratio;
  document.getElementById('f-status').value = project.status;
  document.getElementById('f-price').value = project.price || '';
  document.getElementById('f-notes').value = project.notes || '';

  document.getElementById('modalOverlay').classList.add('open');
}

function closeModal() {
  document.getElementById('modalOverlay').classList.remove('open');
}

function clearForm() {
  ['project_name','client_name','client_email','square_footage','price','notes'].forEach(f => {
    document.getElementById('f-' + f).value = '';
  });
  document.getElementById('f-roof_type').value = 'Flat';
  document.getElementById('f-membrane').value = 'TPO';
  document.getElementById('f-scale_ratio').value = '1:24';
  document.getElementById('f-status').value = 'inquiry';
}

async function submitProject() {
  const submitBtn = document.getElementById('modalSubmit');
  const data = {
    project_name: document.getElementById('f-project_name').value,
    client_name: document.getElementById('f-client_name').value,
    client_email: document.getElementById('f-client_email').value,
    roof_type: document.getElementById('f-roof_type').value,
    membrane: document.getElementById('f-membrane').value,
    square_footage: document.getElementById('f-square_footage').value,
    scale_ratio: document.getElementById('f-scale_ratio').value,
    status: document.getElementById('f-status').value,
    price: document.getElementById('f-price').value || null,
    notes: document.getElementById('f-notes').value || null,
  };

  if (!data.project_name || !data.client_name || !data.client_email) {
    showToast('Please fill in project name, client name, and email.', true);
    return;
  }

  submitBtn.disabled = true;
  try {
    if (editingId) {
      data.id = editingId;
      await updateProject(data);
      showToast('Project updated successfully');
    } else {
      await createProject(data);
      showToast('Project created successfully');
    }
    closeModal();
    refreshProjects();
  } catch (err) {
    showToast(err.message, true);
  } finally {
    submitBtn.disabled = false;
  }
}

async function confirmDelete(id, name) {
  if (!confirm(`Delete "${name}"? This cannot be undone.`)) return;
  try {
    await deleteProjectAPI(id);
    showToast('Project deleted');
    refreshProjects();
  } catch (err) {
    showToast(err.message, true);
  }
}

// ===== INIT =====
document.addEventListener('DOMContentLoaded', async () => {
  // Check auth before loading anything
  const authed = await checkAuth();
  if (!authed) return;

  // Set up nav
  renderNav('dashboard');

  // Close modal on overlay click
  const overlay = document.getElementById('modalOverlay');
  if (overlay) {
    overlay.addEventListener('click', (e) => {
      if (e.target === e.currentTarget) closeModal();
    });
  }

  // Escape key closes modal
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeModal();
  });

  // Load data
  refreshProjects();
});
