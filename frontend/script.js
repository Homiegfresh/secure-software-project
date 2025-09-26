(function () {
  const yearEl = document.getElementById('year');
  if (yearEl) yearEl.textContent = String(new Date().getFullYear());

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
    if (greetEl) greetEl.textContent = auth ? `Signed in as ${auth.email}` : '';
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
    const emailInput = document.getElementById('email');
    const passwordInput = document.getElementById('password');
    const rememberInput = document.getElementById('remember');
    const errorEl = document.getElementById('form-error');
    function setError(msg) { if (errorEl) errorEl.textContent = msg || ''; }

    loginForm.addEventListener('submit', function (e) {
      e.preventDefault();
      const email = emailInput && emailInput.value ? emailInput.value.trim() : '';
      const password = passwordInput && passwordInput.value ? passwordInput.value : '';
      const remember = !!(rememberInput && rememberInput.checked);

      const emailOk = /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email);
      if (!emailOk) { setError('Please enter a valid email address.'); return; }
      if (password.length < 8) { setError('Password must be at least 8 characters.'); return; }

      const token = (window.crypto && window.crypto.getRandomValues)
        ? Array.from(window.crypto.getRandomValues(new Uint8Array(16))).map(x => x.toString(16).padStart(2, '0')).join('')
        : Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2);

      const expiresAt = remember ? (Date.now() + 30 * 24 * 60 * 60 * 1000) : (Date.now() + 2 * 60 * 60 * 1000);
      const payload = { email, token, expiresAt };
      const dest = remember ? localStorage : sessionStorage;
      dest.setItem('auth', JSON.stringify(payload));

      setError('');
      window.location.href = 'index.html';
    });
  }

  // --- Existing API health check ---
  const result = document.getElementById('result');
  const btn = document.getElementById('check-btn');

  // Assume backend is accessible on same host at port 4000 when using Docker Compose
  const backendBase = `${location.protocol}//${location.hostname}:4000`;

  function setResult(text, isError) {
    if (!result) return;
    result.textContent = text;
    result.style.color = isError ? '#d00' : '#222';
  }

  if (btn) {
    btn.addEventListener('click', async () => {
      setResult('Checking...', false);
      try {
        const res = await fetch(`${backendBase}/health`);
        const data = await res.json();
        setResult(JSON.stringify(data, null, 2), false);
      } catch (err) {
        const msg = err && err.message ? err.message : String(err);
        setResult(`Error contacting backend at ${backendBase}:\n` + msg, true);
      }
    });
  }

  // Initialize auth UI on every page
  updateAuthUI();
})();
