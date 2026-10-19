// Boot sequence: diagonal-scrolling grid + terminal that types lines,
// "decrypts" some of them, and streams the real GitHub fetch results.
import { CONFIG } from './config.js';
import { hover as sfxHover } from './audio.js';

const GLYPHS = '!<>-_\\/[]{}—=+*^?#$%&@0123456789ABCDEFabcdef';

// ── moving grid background ──────────────────────────────────
export function mountSquares(canvas, { size = 40, speed = 0.4, border = '#222', hoverFill = '#222' } = {}) {
  const ctx = canvas.getContext('2d');
  let off = 0, raf, hx = -1, hy = -1;
  const resize = () => {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = canvas.offsetWidth * dpr; canvas.height = canvas.offsetHeight * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  };
  const onMove = e => {
    const r = canvas.getBoundingClientRect();
    hx = Math.floor((e.clientX - r.left + off) / size);
    hy = Math.floor((e.clientY - r.top + off) / size);
  };
  resize();
  window.addEventListener('resize', resize);
  window.addEventListener('mousemove', onMove);
  const draw = () => {
    const w = canvas.offsetWidth, h = canvas.offsetHeight;
    ctx.clearRect(0, 0, w, h);
    off = (off + speed) % size; // diagonal drift
    ctx.lineWidth = 1;
    for (let x = -size; x < w + size; x += size) {
      for (let y = -size; y < h + size; y += size) {
        const sx = x - off, sy = y - off;
        const cx = Math.floor((x) / size), cy = Math.floor((y) / size);
        if (cx === hx && cy === hy) { ctx.fillStyle = hoverFill; ctx.fillRect(sx, sy, size, size); }
        ctx.strokeStyle = border; ctx.strokeRect(sx + 0.5, sy + 0.5, size, size);
      }
    }
    // vignette
    const g = ctx.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, Math.hypot(w, h) / 2);
    g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(0,0,0,0.85)');
    ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
    raf = requestAnimationFrame(draw);
  };
  draw();
  return () => { cancelAnimationFrame(raf); window.removeEventListener('resize', resize); window.removeEventListener('mousemove', onMove); };
}

// ── text "decryption" ───────────────────────────────────────
export function decrypt(el, text, { steps = 10, interval = 22 } = {}) {
  return new Promise(res => {
    el.classList.add('encrypted-text');
    let i = 0;
    const id = setInterval(() => {
      i++;
      const reveal = Math.floor((i / steps) * text.length);
      el.textContent = text.split('').map((ch, k) =>
        k < reveal || ch === ' ' ? ch : GLYPHS[(Math.random() * GLYPHS.length) | 0]).join('');
      if (i >= steps) {
        clearInterval(id); el.textContent = text;
        el.classList.remove('encrypted-text'); el.classList.add('revealed-text');
        res();
      }
    }, interval);
  });
}

const sleep = ms => new Promise(r => setTimeout(r, ms));
const pad = (s, n) => (s + ' '.repeat(n)).slice(0, n);

/**
 * Runs the boot terminal. `load(log)` is the content loader; its log lines are
 * printed live. Resolves with the loader's result once the sequence finishes.
 */
export async function runBoot(term, load) {
  const LINE_MS = 110;
  const add = (text = '', cls = '') => {
    const d = document.createElement('div');
    d.className = 'term-line ' + cls;
    d.textContent = text || ' ';
    term.insertBefore(d, cursor);
    return d;
  };
  const cursor = document.createElement('div');
  cursor.className = 'term-line'; cursor.innerHTML = '<span class="blinking-cursor">|</span>';
  term.appendChild(cursor);

  const queue = [];
  let loaderDone = false;
  const logs = (msg, status) => queue.push({ msg, status });
  const t0 = performance.now();
  const loading = load(logs).then(r => { loaderDone = true; return r; }, e => { loaderDone = true; throw e; });

  const head = [
    `USER // ${CONFIG.username.toUpperCase()}`,
    'HOST: 127.0.0.1',
    `DATE: ${new Date().toLocaleDateString()}`,
    '',
  ];
  for (const l of head) { add(l); await sleep(LINE_MS); }

  await decrypt(add('', 'dim'), '// kernel probe...');
  add(''); await sleep(LINE_MS);
  const probes = ['vulkan renderer', 'job scheduler', 'payment switch', 'riscv core'];
  for (const p of probes) { add(`// > ${pad(p, 18)} OK`); await sleep(LINE_MS); }
  add(''); await sleep(LINE_MS);

  await decrypt(add('', 'dim'), `// uplink github.com/${CONFIG.username} ...`);
  // stream loader output until it's done
  while (!loaderDone || queue.length) {
    if (queue.length) {
      const { msg, status } = queue.shift();
      add(`// > ${msg}  ${status}`, status === 'OK' ? '' : 'warn');
      await sleep(LINE_MS);
    } else await sleep(40);
  }
  let data;
  try { data = await loading; } catch (e) { data = null; }
  const ping = Math.round(performance.now() - t0);
  add(''); await sleep(LINE_MS);

  const tail = [
    ['ENCRYPTION: TLS 1.3 · AES-256-GCM', true],
    [`LATENCY:    ${ping}ms ROUND-TRIP`, false],
    [`SOURCE:     ${data && data.live ? 'LIVE · GITHUB' : 'LOCAL SNAPSHOT'}`, false],
    ['UPTIME:     INFINITE', false],
  ];
  for (const [l, enc] of tail) { enc ? await decrypt(add(''), l) : add(l); await sleep(LINE_MS); }
  add(''); await sleep(LINE_MS);
  add('WELCOME TO MY PORTFOLIO', 'bright'); await sleep(LINE_MS);
  add('> INITIATE BROWSING_', 'bright');
  cursor.remove();
  await sleep(1200);
  return data;
}

export const bootClickSound = () => sfxHover();
