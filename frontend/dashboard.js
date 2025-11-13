(function () {
  // Footer year
  const yearEl = document.getElementById('year');
  if (yearEl) yearEl.textContent = String(new Date().getFullYear());

  // Backend base
  const backendBase = `${location.protocol}//${location.hostname}:4000`;

  // --- Auth-aware header based on server session ---
  const greetEl = document.getElementById('greet');
  const loginLink = document.getElementById('login-link');
  const logoutBtn = document.getElementById('logout-btn');

  // Dashboard elements
  const playerNameEl = document.getElementById('player-name');
  const catNameEl = document.getElementById('cat-name');
  const catColorEl = document.getElementById('cat-color');
  const catAgeEl = document.getElementById('cat-age');
  const raceListEl = document.getElementById('race-list');
  const raceStatusEl = document.getElementById('race-status');

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

  refreshHeader().then(async () => {
      // Require auth on this page based on /me
      const meRes = await fetch(`${backendBase}/me`, { credentials: 'include' });
      if (!meRes.ok) { location.href = 'login.html'; }
  });

  // Load player and cat
  async function loadMe() {
    try {
      const res = await fetch(`${backendBase}/me`, { credentials: 'include' });
      if (res.status === 401) {
        // Not logged in or unknown user
        location.href = 'login.html';
        return;
      }
      if (!res.ok) throw new Error(`Failed to load profile (${res.status})`);
      const data = await res.json();
      if (playerNameEl) playerNameEl.textContent = data.player.displayname || data.player.username || 'Player';
      if (data.cat) {
        if (catNameEl) catNameEl.textContent = data.cat.name;
        if (catColorEl) catColorEl.textContent = data.cat.color;
        if (catAgeEl) catAgeEl.textContent = String(data.cat.age);
      } else {
        if (catNameEl) catNameEl.textContent = 'No cat yet';
        if (catColorEl) catColorEl.textContent = '—';
        if (catAgeEl) catAgeEl.textContent = '—';
      }
    } catch (err) {
      console.error(err);
    }
  }

  // Load races
  async function loadRaces() {
    if (!raceListEl) return;
    raceListEl.innerHTML = '';
    try {
      const res = await fetch(`${backendBase}/races`);
      if (!res.ok) throw new Error(`Failed to load races (${res.status})`);
      const data = await res.json();
      const races = data.races || [];
      if (!races.length) {
        raceStatusEl.textContent = 'No races available right now. Check back later!';
        return;
      }
      raceStatusEl.textContent = '';
      races.forEach(r => {
        const li = document.createElement('li');
        const when = new Date(r.starts_at);
        const label = `${r.name} — ${r.distance_m}m — ${when.toLocaleString()}`;
        const span = document.createElement('span');
        span.textContent = label;
        const btn = document.createElement('button');
        btn.textContent = 'Sign Up';
        btn.addEventListener('click', async () => {
          btn.disabled = true;
          btn.textContent = 'Signing...';
          try {
            const res2 = await fetch(`${backendBase}/races/${r.id}/signup`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              credentials: 'include'
            });
            const d2 = await res2.json();
            if (res2.ok && d2.status === 'ok') {
              btn.textContent = d2.already ? 'Already signed' : 'Signed!';
            } else {
              btn.textContent = 'Try again';
              btn.disabled = false;
              alert('Failed to sign up: ' + (d2.message || res2.status));
            }
          } catch (e) {
            btn.textContent = 'Try again';
            btn.disabled = false;
            alert('Network error while signing up.');
          }
        });
        li.appendChild(span);
        li.appendChild(btn);
        raceListEl.appendChild(li);
      });
    } catch (err) {
      raceStatusEl.textContent = 'Error loading races.';
    }
  }

  // Simple cat random-walk animation
  const playfield = document.getElementById('playfield');
  const catEl = document.getElementById('cat');
  let pos = { x: 20, y: 20 };
  function moveCat() {
    if (!playfield || !catEl) return;
    const pf = playfield.getBoundingClientRect();
    const margin = 48; // keep cat within bounds
    const maxX = pf.width - margin;
    const maxY = pf.height - margin;
    // random step
    pos.x = Math.max(0, Math.min(maxX, pos.x + (Math.random() * 120 - 60)));
    pos.y = Math.max(0, Math.min(maxY, pos.y + (Math.random() * 120 - 60)));
    catEl.style.transform = `translate(${pos.x}px, ${pos.y}px)`;
  }
  setInterval(moveCat, 1500);
  // Initial place
  moveCat();

  // Kick off loads
  const loadUserTask = loadMe();
  const loadRacesTask = loadRaces();
  
  Promise.all([loadUserTask, loadRacesTask]).catch((e) => console.error('Error loading dashboard:', e));
})();
