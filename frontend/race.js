(function () {
  // Footer year
  const yearEl = document.getElementById('year');
  if (yearEl) yearEl.textContent = String(new Date().getFullYear());

  // Backend base (same host, backend on 4000)
  const backendBase = `${location.protocol}//${location.hostname}:4000`;

  // --- Auth-aware header based on server session (cookie) ---
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
  const catNameEl = document.getElementById('your-cat-name');
  const noCatMsgEl = document.getElementById('no-cat-msg');
  const startRaceBtn = document.getElementById('start-race-btn');
  const raceErrorEl = document.getElementById('race-error');
  const lanesEl = document.getElementById('lanes');
  const raceStandingsEl = document.getElementById('race-standings');
  const raceContainerEl = document.getElementById('race-container');

  let yourCatName = '';

  async function loadMe() {
    try {
      const res = await fetch(`${backendBase}/me`, { credentials: 'include' });
      if (res.status === 401) { location.href = 'login.html'; return; }
      const data = await res.json();
      if (data.cat && data.cat.name) {
        yourCatName = data.cat.name;
        if (catNameEl) catNameEl.textContent = yourCatName;
        if (startRaceBtn) startRaceBtn.disabled = false;
        if (noCatMsgEl) noCatMsgEl.style.display = 'none';
      } else {
        yourCatName = '';
        if (catNameEl) catNameEl.textContent = '(no cat)';
        if (startRaceBtn) startRaceBtn.disabled = true;
        if (noCatMsgEl) noCatMsgEl.style.display = '';
      }
    } catch (err) {
      if (raceErrorEl) raceErrorEl.textContent = 'Error loading your profile.';
    }
  }

  function setRaceError(msg) { if (raceErrorEl) raceErrorEl.textContent = msg || ''; }
  function clamp(n, min, max) { return Math.min(max, Math.max(min, n)); }

  function pickOpponents(excludeName, n) {
    const pool = ['Mittens','Shadow','Luna','Sol', 'Paimon', 'Simba','Tiger','Coco','Oreo','Smokey','Pumpkin','Nala','Gizmo','Pepper','Mocha','Willow','Ziggy'];
    const names = [];
    while (names.length < n && pool.length) {
      const i = Math.floor(Math.random() * pool.length);
      const name = pool.splice(i, 1)[0];
      if (name.toLowerCase() !== String(excludeName || '').trim().toLowerCase()) names.push(name);
    }
    while (names.length < n) names.push('Cat ' + (names.length + 1));
    return names;
  }

  function fmtSec(ms) { return (ms / 1000).toFixed(2) + 's'; }

  function createLane(name, speed) {
    const lane = document.createElement('div');
    lane.className = 'race-lane';
    lane.style.position = 'relative';
    lane.style.height = '48px';
    lane.style.border = '1px solid #eee';
    lane.style.borderRadius = '10px';
    lane.style.background = 'linear-gradient(90deg, rgba(0,0,0,0.03) 0 0)';
    lane.style.overflow = 'hidden';
    lane.style.marginBottom = '8px';

    const label = document.createElement('div');
    label.textContent = `${name} — ${speed.toFixed(1)} m/s`;
    label.style.position = 'absolute';
    label.style.left = '8px';
    label.style.top = '6px';
    label.style.fontSize = '12px';
    label.style.color = '#555';

    const runner = document.createElement('div');
    runner.textContent = '🐱';
    runner.setAttribute('aria-label', name);
    runner.style.position = 'absolute';
    runner.style.left = '0px';
    runner.style.top = '50%';
    runner.style.transform = 'translate(0px, -50%)';
    runner.style.fontSize = '28px';
    runner.style.transition = 'transform 0.08s linear';

    lane.appendChild(label);
    lane.appendChild(runner);
    return { lane, runner };
  }

  function startRace() {
    if (!yourCatName) { setRaceError('You need to create a cat before racing.'); return; }
    if (!lanesEl || !raceStandingsEl || !raceContainerEl) return;
    setRaceError('');

    const distanceInput = document.getElementById('race-distance');
    const speedInput = document.getElementById('your-cat-speed');

    const yourName = yourCatName;
    let distance = Number(distanceInput && distanceInput.value ? distanceInput.value : 100);
    let yourSpeed = speedInput && speedInput.value !== '' ? Number(speedInput.value) : NaN;

    if (!Number.isFinite(distance)) distance = 100;
    distance = clamp(distance, 10, 1000);

    if (speedInput && speedInput.value !== '' && !Number.isFinite(yourSpeed)) {
      setRaceError('Please enter a valid number for your cat\'s speed.');
      return;
    }

    if (!Number.isFinite(yourSpeed)) {
      yourSpeed = 5 + Math.random() * 5; // 5–10 m/s
    }
    yourSpeed = clamp(yourSpeed, 1, 20);

    const opponents = pickOpponents(yourName, 3).map(n => {
      const base = yourSpeed * (0.8 + Math.random() * 0.4);
      const spd = clamp(base, 3.5, 12);
      return { name: n, speed: spd };
    });

    const racers = [{ name: yourName, speed: yourSpeed, you: true }, ...opponents];

    // Reset UI
    raceContainerEl.style.display = '';
    lanesEl.innerHTML = '';
    raceStandingsEl.textContent = '';

    const state = racers.map((r, idx) => {
      const { lane, runner } = createLane(r.name + (r.you ? ' (you)' : ''), r.speed);
      lanesEl.appendChild(lane);
      return { id: idx, name: r.name, you: !!r.you, baseSpeed: r.speed, pos: 0, finished: false, finishMs: 0, runner, lane };
    });

    if (startRaceBtn) { startRaceBtn.disabled = true; startRaceBtn.textContent = 'Racing...'; }

    const start = performance.now();
    let last = start;

    function updateStandings(final) {
      const copy = state.slice();
      copy.sort((a, b) => {
        if (final) return a.finishMs - b.finishMs; // smaller is better
        return b.pos - a.pos;
      });
      if (final) {
        const lines = copy.map((c, i) => `${i + 1}. ${c.name}${c.you ? ' (you)' : ''} — ${fmtSec(c.finishMs)}`);
        raceStandingsEl.textContent = 'Final results:\n' + lines.join('\n');
      } else {
        const lines = copy.map((c, i) => `${i + 1}. ${c.name}${c.you ? ' (you)' : ''} — ${Math.round(c.pos / distance * 100)}%`);
        raceStandingsEl.textContent = 'Live standings:\n' + lines.join('\n');
      }
    }

    let finishedCount = 0;

    function frame(now) {
      const dt = (now - last) / 1000; // seconds
      last = now;

      state.forEach(c => {
        if (c.finished) return;
        const variance = 0.98 + Math.random() * 0.04; // +/-2%
        c.pos += c.baseSpeed * variance * dt;
        if (c.pos >= distance) {
          c.pos = distance;
          c.finished = true;
          c.finishMs = now - start;
          finishedCount++;
        }
        const w = c.lane.clientWidth - 40; // leave some right padding
        const x = Math.max(0, Math.min(w, Math.round((c.pos / distance) * w)));
        c.runner.style.transform = `translate(${x}px, -50%)`;
      });

      if (finishedCount >= state.length) {
        updateStandings(true);
        if (startRaceBtn) { startRaceBtn.disabled = false; startRaceBtn.textContent = 'Race Again'; }
        return; // stop
      } else {
        updateStandings(false);
        requestAnimationFrame(frame);
      }
    }

    updateStandings(false);
    requestAnimationFrame(frame);
  }

  if (startRaceBtn) startRaceBtn.addEventListener('click', startRace);

  // Load user/cat
  loadMe();
})();
