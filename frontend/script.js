(function () {
  const yearEl = document.getElementById('year');
  if (yearEl) yearEl.textContent = String(new Date().getFullYear());

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
        setResult(`Error contacting backend at ${backendBase}:\n` + (err && err.message ? err.message : String(err)), true);
      }
    });
  }
})();
