(function () {
    debugger;
  // Footer year
  const yearEl = document.getElementById('year');
  if (yearEl) yearEl.textContent = String(new Date().getFullYear());

  // Backend base
  const backendBase = `${location.protocol}//${location.hostname}:4000`;

  // Header elements (use server session like dashboard.js)
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
      location.href = 'login.html';
    });
  }

  // Require auth for this page via server session
  refreshHeader().then(async () => {
    try {
      const meRes = await fetch(`${backendBase}/me`, { credentials: 'include' });
      if (!meRes.ok) { location.href = 'login.html'; }
    } catch {
      location.href = 'login.html';
    }
  });

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
      const res = await fetch(`${backendBase}/me`, { credentials: 'include' });
      if (res.status === 401) { location.href = 'login.html'; return; }
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
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
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
