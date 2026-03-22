/* ===========================
   RoofView Demo Co — Shared JS
   API helpers, auth, toast, utilities
   =========================== */

const API_BASE = '/api';

// XSS protection
function esc(str) {
  const d = document.createElement('div');
  d.textContent = str || '';
  return d.innerHTML;
}

// Toast notifications
function showToast(msg, isError = false) {
  const t = document.getElementById('toast');
  if (!t) return;
  t.textContent = msg;
  t.setAttribute('role', 'alert');
  t.className = 'toast show' + (isError ? ' error' : '');
  setTimeout(() => t.className = 'toast', 3000);
}

// Auth check — redirects to login if not authenticated
async function checkAuth() {
  try {
    const res = await fetch(`${API_BASE}/auth?check=true`);
    if (!res.ok) {
      window.location.href = '/';
      return false;
    }
    return true;
  } catch {
    window.location.href = '/';
    return false;
  }
}

// Logout
async function logout() {
  try {
    await fetch(`${API_BASE}/auth`, { method: 'DELETE' });
  } catch {
    // ignore errors
  }
  window.location.href = '/';
}

// Render navigation in header
function renderNav(currentPage) {
  const nav = document.querySelector('.nav-links');
  if (!nav) return;

  const pages = [
    { href: '/dashboard.html', label: 'Dashboard', id: 'dashboard' },
    { href: '/analytics.html', label: 'Analytics', id: 'analytics' },
  ];

  nav.innerHTML = pages.map(p =>
    `<a href="${p.href}" class="${p.id === currentPage ? 'active' : ''}">${p.label}</a>`
  ).join('');
}
