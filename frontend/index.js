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

  // --- Existing API health check ---
  const result = document.getElementById('result');

  function setResult(text, isError) {
    if (!result) return;
    result.textContent = text;
    result.style.color = isError ? '#d00' : '#222';
  }

  const btn = document.getElementById('check-btn');
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

  // Initialize auth UI on page load
  updateAuthUI();
})();
