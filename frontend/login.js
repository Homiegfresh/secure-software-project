(function () {
  // Footer year
  const yearEl = document.getElementById('year');
  if (yearEl) yearEl.textContent = String(new Date().getFullYear());

  // Assume backend is accessible on same host at port 4000 when using Docker Compose
  const backendBase = `${location.protocol}//${location.hostname}:4000`;

  // Basic header elements
  const greetEl = document.getElementById('greet');
  const loginLink = document.getElementById('login-link');
  const logoutBtn = document.getElementById('logout-btn');

  async function refreshHeader() {
    try {
      const res = await fetch(`${backendBase}/me`, { credentials: 'include' });
      if (res.ok) {
        const d = await res.json();
        if (greetEl) greetEl.textContent = d && d.player ? `Signed in as ${d.player.username}` : '';
        if (loginLink) loginLink.style.display = 'none';
        if (logoutBtn) logoutBtn.style.display = '';
      } else {
        if (greetEl) greetEl.textContent = '';
        if (loginLink) loginLink.style.display = '';
        if (logoutBtn) logoutBtn.style.display = 'none';
      }
    } catch {
      if (greetEl) greetEl.textContent = '';
      if (loginLink) loginLink.style.display = '';
      if (logoutBtn) logoutBtn.style.display = 'none';
    }
  }

  if (logoutBtn) {
    logoutBtn.addEventListener('click', async () => {
      try { await fetch(`${backendBase}/auth/logout`, { method: 'POST', credentials: 'include' }); } catch {}
      await refreshHeader();
    });
  }

  // Login form handling (present only on login.html)
  const loginForm = document.getElementById('login-form');
  if (loginForm) {
    const usernameInput = document.getElementById('username');
    const passwordInput = document.getElementById('password');
    const errorEl = document.getElementById('form-error');
    function setError(msg) { if (errorEl) errorEl.textContent = msg || ''; }

    loginForm.addEventListener('submit', async function (e) {
      e.preventDefault();
      const username = usernameInput && usernameInput.value ? usernameInput.value.trim() : '';
      const password = passwordInput && passwordInput.value ? passwordInput.value : '';
      if (password.length < 8) { setError('Password must be at least 8 characters.'); return; }

      // Post credentials to backend and only proceed on success
      try {
        const res = await fetch(`${backendBase}/auth/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ username, password })
        });

        if (!res.ok) {
          if (res.status === 401) {
            setError('Invalid username or password.');
          } else {
            let msg = `Login failed (${res.status})`;
            try {
              const d = await res.json();
              if (d && d.message) msg = d.message;
            } catch {}
            setError(msg);
          }
          return; // do not redirect
        }
      } catch (err) {
        setError('Network error during login. Please try again.');
        return;
      }

      setError('');
      window.location.href = 'dashboard.html';
    });
  }

  // Initialize header auth UI on page load
  refreshHeader();
})();
