(function () {
  // Footer year
  const yearEl = document.getElementById('year');
  if (yearEl) yearEl.textContent = String(new Date().getFullYear());

  // Assume backend is accessible on same host at port 4000 when using Docker Compose
  const backendBase = `${location.protocol}//${location.hostname}:4000`;

  // --- Simple client-side auth state ---
  const greetEl = document.getElementById('greet');
  const loginLink = document.getElementById('login-link');
  const logoutBtn = document.getElementById('logout-btn');

  function parseAuth(raw) {
    try { return JSON.parse(raw); } catch { return null; }
  }
  function clearAuth() {
    localStorage.removeItem('auth');
    sessionStorage.removeItem('auth');
  }
  function getAuth() {
    const raw = localStorage.getItem('auth') || sessionStorage.getItem('auth');
    const auth = raw ? parseAuth(raw) : null;
    if (auth && auth.expiresAt && Date.now() > auth.expiresAt) {
      clearAuth();
      return null;
    }
    return auth;
  }
  function updateAuthUI() {
    const auth = getAuth();
    if (greetEl) greetEl.textContent = auth ? `Signed in as ${auth.username}` : '';
    if (loginLink) loginLink.style.display = auth ? 'none' : '';
    if (logoutBtn) logoutBtn.style.display = auth ? '' : 'none';
  }
  if (logoutBtn) {
    logoutBtn.addEventListener('click', () => {
      clearAuth();
      updateAuthUI();
    });
  }

  // Login form handling (present only on login.html)
  const loginForm = document.getElementById('login-form');
  if (loginForm) {
    const usernameInput = document.getElementById('username');
    const passwordInput = document.getElementById('password');
    const rememberInput = document.getElementById('remember');
    const errorEl = document.getElementById('form-error');
    function setError(msg) { if (errorEl) errorEl.textContent = msg || ''; }

    loginForm.addEventListener('submit', async function (e) {
      e.preventDefault();
      const username = usernameInput && usernameInput.value ? usernameInput.value.trim() : '';
      const password = passwordInput && passwordInput.value ? passwordInput.value : '';
      const remember = !!(rememberInput && rememberInput.checked);
      
      if (password.length < 8) { setError('Password must be at least 8 characters.'); return; }

      // Post credentials to backend and only proceed on success
      try {
        const res = await fetch(`${backendBase}/auth/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
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
          return; // do not set auth or redirect
        }
      } catch (err) {
        setError('Network error during login. Please try again.');
        return;
      }

      const token = (window.crypto && window.crypto.getRandomValues)
        ? Array.from(window.crypto.getRandomValues(new Uint8Array(16))).map(x => x.toString(16).padStart(2, '0')).join('')
        : Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2);

      const expiresAt = remember ? (Date.now() + 30 * 24 * 60 * 60 * 1000) : (Date.now() + 2 * 60 * 60 * 1000);
      const payload = { username, token, expiresAt };
      const dest = remember ? localStorage : sessionStorage;
      dest.setItem('auth', JSON.stringify(payload));

      setError('');
      window.location.href = 'dashboard.html';
    });
  }

  // Initialize auth UI on page load
  updateAuthUI();
})();
