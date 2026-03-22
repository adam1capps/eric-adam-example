/* ===========================
   Client portal — public project view
   =========================== */

const STATUS_ORDER = ['inquiry', 'approved', 'in_progress', 'completed', 'delivered'];
const STATUS_LABELS = {
  inquiry: 'Inquiry',
  approved: 'Approved',
  in_progress: 'In Progress',
  completed: 'Completed',
  delivered: 'Delivered'
};

function getToken() {
  return new URLSearchParams(window.location.search).get('token');
}

async function loadPortal() {
  const token = getToken();
  if (!token) {
    showError('No project link provided', 'Please use the link shared with you by RoofView Demo Co.');
    return;
  }

  try {
    const res = await fetch(`${API_BASE}/portal-api?token=${encodeURIComponent(token)}`);
    if (!res.ok) {
      const err = await res.json();
      showError('Project Not Found', err.error || 'The link may be invalid or expired.');
      return;
    }

    const data = await res.json();
    renderPortal(data.project, data.files || []);
  } catch {
    showError('Connection Error', 'Could not load project data. Please try again later.');
  }
}

function showError(title, message) {
  document.getElementById('portalContent').innerHTML = `
    <div class="portal-error">
      <h2>${esc(title)}</h2>
      <p>${esc(message)}</p>
    </div>
  `;
}

function renderPortal(project, files) {
  const p = project;
  document.title = `${p.project_name} | RoofView Demo Co`;

  // Header
  document.getElementById('portalTitle').textContent = p.project_name;
  document.getElementById('portalSubtitle').textContent = `Project for ${p.client_name}`;

  // Status stepper
  const currentIdx = STATUS_ORDER.indexOf(p.status);
  document.getElementById('portalStepper').innerHTML = STATUS_ORDER.map((s, i) => {
    let cls = '';
    if (i < currentIdx) cls = 'done';
    else if (i === currentIdx) cls = 'active';
    return `
      <div class="stepper-step ${cls}">
        <div class="stepper-dot">${i < currentIdx ? '✓' : i + 1}</div>
        <div class="stepper-label">${STATUS_LABELS[s]}</div>
      </div>
    `;
  }).join('');

  // Details
  document.getElementById('portalDetails').innerHTML = `
    <div class="portal-detail-item">
      <div class="info-label">Client</div>
      <div class="info-value">${esc(p.client_name)}</div>
    </div>
    <div class="portal-detail-item">
      <div class="info-label">Roof Type</div>
      <div class="info-value">${esc(p.roof_type)}</div>
    </div>
    <div class="portal-detail-item">
      <div class="info-label">Membrane</div>
      <div class="info-value">${esc(p.membrane)}</div>
    </div>
    <div class="portal-detail-item">
      <div class="info-label">Square Footage</div>
      <div class="info-value">${Number(p.square_footage).toLocaleString()} SF</div>
    </div>
    <div class="portal-detail-item">
      <div class="info-label">Scale</div>
      <div class="info-value">${esc(p.scale_ratio)}</div>
    </div>
    <div class="portal-detail-item">
      <div class="info-label">Current Status</div>
      <div class="info-value"><span class="badge badge-${p.status}">${p.status.replace('_', ' ')}</span></div>
    </div>
  `;

  // Files
  const filesEl = document.getElementById('portalFiles');
  if (files.length > 0) {
    filesEl.innerHTML = `
      <h3>Project Photos &amp; Documents</h3>
      <div class="portal-file-grid">
        ${files.map(f => {
          const isImage = f.mime_type.startsWith('image/');
          return `
            <a href="/api/files?file_id=${f.id}" target="_blank" class="portal-file-card" style="text-decoration:none; color:inherit;">
              ${isImage
                ? `<img src="/api/files?file_id=${f.id}" alt="${esc(f.filename)}">`
                : `<div class="file-placeholder">📄</div>`
              }
              <div class="file-label" title="${esc(f.filename)}">${esc(f.filename)}</div>
            </a>
          `;
        }).join('')}
      </div>
    `;
  } else {
    filesEl.innerHTML = '';
  }

  // Updated timestamp
  const updated = new Date(p.updated_at);
  document.getElementById('portalUpdated').textContent =
    `Last updated ${updated.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}`;

  // Show content
  document.getElementById('portalContent').style.display = 'block';
}

// ===== INIT =====
document.addEventListener('DOMContentLoaded', loadPortal);
