/* ===========================
   Login page logic
   =========================== */

document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('loginForm');
  const errorEl = document.getElementById('loginError');
  const submitBtn = document.getElementById('loginSubmit');

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    errorEl.textContent = '';
    submitBtn.disabled = true;
    submitBtn.textContent = 'Signing in...';

    const username = document.getElementById('username').value.trim();
    const password = document.getElementById('password').value;

    if (!username || !password) {
      errorEl.textContent = 'Please enter both username and password.';
      submitBtn.disabled = false;
      submitBtn.textContent = 'Sign In';
      return;
    }

    try {
      const res = await fetch(`${API_BASE}/auth`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });

      if (!res.ok) {
        const data = await res.json();
        errorEl.textContent = data.error || 'Login failed. Check your credentials.';
        submitBtn.disabled = false;
        submitBtn.textContent = 'Sign In';
        return;
      }

      window.location.href = '/dashboard.html';
    } catch {
      errorEl.textContent = 'Connection error. Please try again.';
      submitBtn.disabled = false;
      submitBtn.textContent = 'Sign In';
    }
  });

  // If already logged in, redirect to dashboard
  fetch(`${API_BASE}/auth?check=true`).then(res => {
    if (res.ok) window.location.href = '/dashboard.html';
  }).catch(() => {});
});
