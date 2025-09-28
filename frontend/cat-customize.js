(function () {
  // Footer year
  const yearEl = document.getElementById('year');
  if (yearEl) yearEl.textContent = String(new Date().getFullYear());

  // Backend base
  const backendBase = `${location.protocol}//${location.hostname}:4000`;

  // --- Simple client-side auth state ---
  const greetEl = document.getElementById('greet');
  const loginLink = document.getElementById('login-link');
  const logoutBtn = document.getElementById('logout-btn');

  function parseAuth(raw) { try { return JSON.parse(raw); } catch { return null; } }
  function clearAuth() { localStorage.removeItem('auth'); sessionStorage.removeItem('auth'); }
  function getAuth() {
    const raw = localStorage.getItem('auth') || sessionStorage.getItem('auth');
    const auth = raw ? parseAuth(raw) : null;
    if (auth && auth.expiresAt && Date.now() > auth.expiresAt) { clearAuth(); return null; }
    return auth;
  }
  function updateAuthUI() {
    const auth = getAuth();
    if (greetEl) greetEl.textContent = auth ? `Signed in as ${auth.username}` : '';
    if (loginLink) loginLink.style.display = auth ? 'none' : '';
    if (logoutBtn) logoutBtn.style.display = auth ? '' : 'none';
  }
  if (logoutBtn) {
    logoutBtn.addEventListener('click', () => { clearAuth(); updateAuthUI(); location.href = 'login.html'; });
  }
  updateAuthUI();

  // Require auth
  const auth = getAuth();
  if (!auth) { location.href = 'login.html'; return; }

  function authHeader() { return { 'Authorization': `Bearer ${auth.username}` }; }

  // Elements
  const form = document.getElementById('cat-form');
  const nameInput = document.getElementById('name');
  const colorInput = document.getElementById('color');
  const ageInput = document.getElementById('age');
  const errorEl = document.getElementById('form-error');
  const successEl = document.getElementById('form-success');
  const prefillNote = document.getElementById('prefill-note');

  function setError(msg) { if (errorEl) errorEl.textContent = msg || ''; }
  function setSuccess(msg) {
    if (!successEl) return;
    successEl.textContent = msg || '';
    successEl.style.display = msg ? '' : 'none';
  }

  async function loadMe() {
    try {
      const res = await fetch(`${backendBase}/me`, { headers: { ...authHeader() } });
      if (res.status === 401) { clearAuth(); location.href = 'login.html'; return; }
      if (!res.ok) throw new Error(`Failed to load profile (${res.status})`);
      const data = await res.json();
      if (data && data.cat) {
        if (nameInput) nameInput.value = data.cat.name || '';
        if (colorInput) colorInput.value = data.cat.color || '';
        if (ageInput) ageInput.value = String(data.cat.age ?? '');
        if (prefillNote) prefillNote.textContent = 'We pre-filled your current cat details.';
      } else {
        if (prefillNote) prefillNote.textContent = 'Create your cat below!';
      }
    } catch (err) {
      console.error(err);
    }
  }

  if (form) {
    form.addEventListener('submit', async function (e) {
      e.preventDefault();
      setError('');
      setSuccess('');

      const name = nameInput && nameInput.value ? nameInput.value.trim() : '';
      const color = colorInput && colorInput.value ? colorInput.value.trim() : '';
      const ageRaw = ageInput && ageInput.value ? ageInput.value.trim() : '';
      const age = Number(ageRaw);

      if (!name) { setError('Name is required.'); return; }
      if (name.length > 100) { setError('Name must be 100 characters or less.'); return; }
      if (!color) { setError('Color is required.'); return; }
      if (color.length > 50) { setError('Color must be 50 characters or less.'); return; }
      if (!Number.isFinite(age) || !Number.isInteger(age) || age < 0 || age > 50) {
        setError('Age must be an integer between 0 and 50.');
        return;
      }

      try {
        const res = await fetch(`${backendBase}/me/cat`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json', ...authHeader() },
          body: JSON.stringify({ name, color, age })
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          setError(data && data.message ? data.message : `Failed to save (${res.status})`);
          return;
        }
        setSuccess('Saved! Redirecting...');
        setTimeout(() => { location.href = 'dashboard.html'; }, 800);
      } catch (err) {
        setError('Network error while saving. Please try again.');
      }
    });
  }

  // Kick off prefill
  loadMe();
})();
