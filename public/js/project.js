/* ===========================
   Project detail page logic
   =========================== */

let currentProject = null;
let currentFiles = [];

const STATUS_ORDER = ['inquiry', 'approved', 'in_progress', 'completed', 'delivered'];
const STATUS_LABELS = {
  inquiry: 'Inquiry',
  approved: 'Approved',
  in_progress: 'In Progress',
  completed: 'Completed',
  delivered: 'Delivered'
};

function getProjectId() {
  const params = new URLSearchParams(window.location.search);
  return params.get('id');
}

async function loadProject() {
  const id = getProjectId();
  if (!id) {
    showToast('No project ID provided', true);
    return;
  }

  try {
    const res = await fetch(`${API_BASE}/projects?id=${id}`);
    if (!res.ok) throw new Error('Project not found');
    const data = await res.json();
    currentProject = data.project;
    currentFiles = data.files || [];
    renderProject();
    renderFiles();
  } catch (err) {
    document.getElementById('projectContent').innerHTML =
      `<div class="empty-state"><h3>Project not found</h3><p>${esc(err.message)}</p></div>`;
  }
}

function renderProject() {
  const p = currentProject;
  document.title = `${p.project_name} | RoofView Demo Co`;

  document.getElementById('projectName').textContent = p.project_name;

  // Info grid
  document.getElementById('projectInfo').innerHTML = `
    <div class="info-item">
      <div class="info-label">Client</div>
      <div class="info-value">${esc(p.client_name)}</div>
    </div>
    <div class="info-item">
      <div class="info-label">Email</div>
      <div class="info-value">${esc(p.client_email)}</div>
    </div>
    <div class="info-item">
      <div class="info-label">Roof Type</div>
      <div class="info-value">${esc(p.roof_type)}</div>
    </div>
    <div class="info-item">
      <div class="info-label">Membrane</div>
      <div class="info-value">${esc(p.membrane)}</div>
    </div>
    <div class="info-item">
      <div class="info-label">Square Footage</div>
      <div class="info-value">${Number(p.square_footage).toLocaleString()} SF</div>
    </div>
    <div class="info-item">
      <div class="info-label">Scale</div>
      <div class="info-value">${esc(p.scale_ratio)}</div>
    </div>
    <div class="info-item">
      <div class="info-label">Price</div>
      <div class="info-value">${p.price ? '$' + Number(p.price).toLocaleString() : 'TBD'}</div>
    </div>
    <div class="info-item">
      <div class="info-label">Status</div>
      <div class="info-value"><span class="badge badge-${p.status}">${p.status.replace('_', ' ')}</span></div>
    </div>
  `;

  // Status timeline
  const currentIdx = STATUS_ORDER.indexOf(p.status);
  document.getElementById('statusTimeline').innerHTML = STATUS_ORDER.map((s, i) => {
    let cls = '';
    if (i < currentIdx) cls = 'done';
    else if (i === currentIdx) cls = 'active';
    return `
      <div class="timeline-step ${cls}">
        <div class="timeline-dot">${i < currentIdx ? '✓' : ''}</div>
        <div class="timeline-label">${STATUS_LABELS[s]}</div>
      </div>
    `;
  }).join('');

  // Notes
  const notesEl = document.getElementById('projectNotes');
  if (p.notes) {
    notesEl.innerHTML = `<h3>Notes</h3><div class="notes-content">${esc(p.notes)}</div>`;
  } else {
    notesEl.innerHTML = '';
  }

  // Portal link
  if (p.client_token) {
    const portalUrl = `${window.location.origin}/portal.html?token=${p.client_token}`;
    document.getElementById('portalLink').innerHTML = `
      <label>Client Portal Link</label>
      <div class="portal-link-url" id="portalUrl">${portalUrl}</div>
      <button class="btn btn-outline" onclick="copyPortalLink()">Copy Link</button>
    `;
  }
}

function copyPortalLink() {
  const url = document.getElementById('portalUrl').textContent;
  navigator.clipboard.writeText(url).then(() => {
    showToast('Portal link copied to clipboard');
  }).catch(() => {
    showToast('Could not copy link', true);
  });
}

// ===== FILES =====
function renderFiles() {
  const grid = document.getElementById('fileGrid');
  if (currentFiles.length === 0) {
    grid.innerHTML = '<p style="color: var(--fog); font-size: 0.85rem;">No files uploaded yet.</p>';
    return;
  }

  grid.innerHTML = currentFiles.map(f => {
    const isImage = f.mime_type.startsWith('image/');
    const sizeKB = Math.round(f.file_size / 1024);
    const sizeStr = sizeKB > 1024 ? (sizeKB / 1024).toFixed(1) + ' MB' : sizeKB + ' KB';

    return `
      <div class="file-card">
        ${isImage
          ? `<a href="/api/files?file_id=${f.id}" target="_blank"><img class="file-thumb" src="/api/files?file_id=${f.id}" alt="${esc(f.filename)}"></a>`
          : `<a href="/api/files?file_id=${f.id}" target="_blank" class="file-thumb-placeholder">📄</a>`
        }
        <div class="file-info">
          <div class="file-name" title="${esc(f.filename)}">${esc(f.filename)}</div>
          <div class="file-meta">
            <span>${sizeStr}</span>
            <button class="file-delete" title="Delete file" onclick="deleteFile(${f.id})">✕</button>
          </div>
        </div>
      </div>
    `;
  }).join('');
}

function setupUpload() {
  const zone = document.getElementById('uploadZone');
  const input = document.getElementById('fileInput');

  zone.addEventListener('click', () => input.click());

  zone.addEventListener('dragover', (e) => {
    e.preventDefault();
    zone.classList.add('dragover');
  });

  zone.addEventListener('dragleave', () => {
    zone.classList.remove('dragover');
  });

  zone.addEventListener('drop', (e) => {
    e.preventDefault();
    zone.classList.remove('dragover');
    if (e.dataTransfer.files.length > 0) {
      uploadFile(e.dataTransfer.files[0]);
    }
  });

  input.addEventListener('change', () => {
    if (input.files.length > 0) {
      uploadFile(input.files[0]);
      input.value = '';
    }
  });
}

async function uploadFile(file) {
  // Non-image files still have a 4MB hard limit
  if (!file.type.startsWith('image/') && file.size > 4 * 1024 * 1024) {
    showToast('File too large. Maximum size is 4MB.', true);
    return;
  }

  showToast('Uploading...');

  try {
    const isImage = file.type.startsWith('image/');
    const base64 = await fileToBase64(file);

    // Images get converted to JPEG during resize
    const mimeType = isImage ? 'image/jpeg' : (file.type || 'application/octet-stream');
    const filename = isImage ? file.name.replace(/\.[^.]+$/, '.jpg') : file.name;

    const payload = JSON.stringify({
      project_id: getProjectId(),
      filename,
      mime_type: mimeType,
      file_data: base64
    });

    // Check payload size — Netlify Functions have a ~1MB body limit (6MB on paid)
    if (payload.length > 5.5 * 1024 * 1024) {
      showToast('File still too large after compression. Try a smaller photo.', true);
      return;
    }

    const res = await fetch(`${API_BASE}/files`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: payload
    });

    if (!res.ok) {
      let errMsg = 'Upload failed';
      try {
        const err = await res.json();
        errMsg = err.error || err.details || errMsg;
      } catch { /* response wasn't JSON */ }
      if (res.status === 413) errMsg = 'File too large for server. Try a smaller photo.';
      throw new Error(errMsg);
    }

    showToast('File uploaded');
    await loadProject();
  } catch (err) {
    showToast(err.message, true);
  }
}

function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    // If it's an image, resize it to keep payload under Netlify's 1MB body limit
    if (file.type.startsWith('image/')) {
      const img = new Image();
      const url = URL.createObjectURL(file);
      img.onload = () => {
        URL.revokeObjectURL(url);
        const MAX_DIM = 1600;
        let { width, height } = img;
        if (width > MAX_DIM || height > MAX_DIM) {
          const ratio = Math.min(MAX_DIM / width, MAX_DIM / height);
          width = Math.round(width * ratio);
          height = Math.round(height * ratio);
        }
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);
        // Use JPEG at 80% quality to keep size reasonable
        const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
        resolve(dataUrl.split(',')[1]);
      };
      img.onerror = reject;
      img.src = url;
    } else {
      const reader = new FileReader();
      reader.onload = () => {
        const base64 = reader.result.split(',')[1];
        resolve(base64);
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    }
  });
}

async function deleteFile(fileId) {
  if (!confirm('Delete this file? This cannot be undone.')) return;
  try {
    const res = await fetch(`${API_BASE}/files?file_id=${fileId}`, { method: 'DELETE' });
    if (!res.ok) throw new Error('Failed to delete file');
    showToast('File deleted');
    await loadProject();
  } catch (err) {
    showToast(err.message, true);
  }
}

// ===== INIT =====
document.addEventListener('DOMContentLoaded', async () => {
  const authed = await checkAuth();
  if (!authed) return;

  renderNav('dashboard');
  setupUpload();
  await loadProject();
});
