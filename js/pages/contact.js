import { CONFIG } from '../config.js';

const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

// Simple brand marks (drawn for this site) + their glow colour
const ICONS = {
  github: { glow: '#a371f7', svg: '<svg viewBox="0 0 24 24"><path fill="#fff" d="M12 .5a11.5 11.5 0 0 0-3.6 22.4c.6.1.8-.3.8-.6v-2c-3.2.7-3.9-1.5-3.9-1.5-.5-1.3-1.3-1.7-1.3-1.7-1-.7.1-.7.1-.7 1.2.1 1.8 1.2 1.8 1.2 1 1.8 2.8 1.3 3.5 1 .1-.8.4-1.3.7-1.6-2.6-.3-5.3-1.3-5.3-5.7 0-1.3.5-2.3 1.2-3.1-.1-.3-.5-1.5.1-3.1 0 0 1-.3 3.2 1.2a11 11 0 0 1 5.8 0c2.2-1.5 3.2-1.2 3.2-1.2.6 1.6.2 2.8.1 3.1.8.8 1.2 1.8 1.2 3.1 0 4.4-2.7 5.4-5.3 5.7.4.4.8 1.1.8 2.2v3.3c0 .3.2.7.8.6A11.5 11.5 0 0 0 12 .5z"/></svg>' },
  linkedin: { glow: '#0a66c2', svg: '<svg viewBox="0 0 24 24"><rect width="24" height="24" rx="3" fill="#0a66c2"/><path fill="#fff" d="M5.3 9.2h2.9V19H5.3zM6.8 4.7a1.7 1.7 0 1 1 0 3.4 1.7 1.7 0 0 1 0-3.4zM10.1 9.2h2.8v1.3c.4-.8 1.4-1.6 2.9-1.6 3 0 3.6 2 3.6 4.6V19h-2.9v-4.9c0-1.2 0-2.7-1.6-2.7s-1.9 1.3-1.9 2.6v5h-2.9z"/></svg>' },
  email: { glow: '#ea4335', svg: '<svg viewBox="0 0 24 24"><path fill="#4285f4" d="M2 6.5V18a1.5 1.5 0 0 0 1.5 1.5H7V11l5 3.8z"/><path fill="#34a853" d="M17 19.5h3.5A1.5 1.5 0 0 0 22 18V6.5L17 11z"/><path fill="#fbbc04" d="M17 5.5V11l5-4.5c0-1.6-1.8-2.5-3-1.5z"/><path fill="#ea4335" d="M7 11V5.5l5 3.8 5-3.8V11l-5 3.8z"/><path fill="#c5221f" d="M2 6.5 7 11V5.5L5 4c-1.2-1-3-.1-3 1.5z"/></svg>' },
  instagram: { glow: '#e1306c', svg: '<svg viewBox="0 0 24 24"><defs><linearGradient id="igg" x1="0" y1="1" x2="1" y2="0"><stop offset="0" stop-color="#feda75"/><stop offset=".35" stop-color="#fa7e1e"/><stop offset=".6" stop-color="#d62976"/><stop offset=".85" stop-color="#962fbf"/><stop offset="1" stop-color="#4f5bd5"/></linearGradient></defs><rect x="2" y="2" width="20" height="20" rx="6" fill="none" stroke="url(#igg)" stroke-width="2.2"/><circle cx="12" cy="12" r="4.4" fill="none" stroke="url(#igg)" stroke-width="2.2"/><circle cx="17.4" cy="6.6" r="1.4" fill="url(#igg)"/></svg>' },
  discord: { glow: '#5865f2', svg: '<svg viewBox="0 0 24 24"><path fill="#5865f2" d="M19.6 5.2A17 17 0 0 0 15.4 4l-.5 1.1a15.6 15.6 0 0 0-5.8 0L8.6 4a17 17 0 0 0-4.2 1.3C1.7 9.3 1 13.2 1.3 17.1a17 17 0 0 0 5.2 2.6l1.1-1.8a11 11 0 0 1-1.7-.8l.4-.3a12.2 12.2 0 0 0 10.4 0l.4.3c-.5.3-1.1.6-1.7.8l1.1 1.8a17 17 0 0 0 5.2-2.6c.4-4.5-.7-8.4-3.1-11.9zM8.7 14.7c-1 0-1.9-1-1.9-2.1s.8-2.1 1.9-2.1 1.9 1 1.9 2.1-.8 2.1-1.9 2.1zm6.6 0c-1 0-1.9-1-1.9-2.1s.8-2.1 1.9-2.1 1.9 1 1.9 2.1-.8 2.1-1.9 2.1z"/></svg>' },
  resume: { glow: '#39ff14', svg: '<svg viewBox="0 0 24 24" fill="none" stroke="#39ff14" stroke-width="1.6"><path d="M14 3H6a1 1 0 0 0-1 1v16a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V8z"/><path d="M14 3v5h5M8 13h8M8 17h5"/></svg>' },
  link: { glow: '#39ff14', svg: '<svg viewBox="0 0 24 24" fill="none" stroke="#39ff14" stroke-width="1.6"><path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1"/></svg>' },
};

function classify(c) {
  const u = c.url.toLowerCase();
  if (u.startsWith('mailto:')) return { kind: 'email', handle: c.url.slice(7), copy: c.url.slice(7) };
  if (u.includes('github.com')) return { kind: 'github', handle: '@' + c.url.replace(/\/$/, '').split('/').pop() };
  if (u.includes('linkedin.com')) return { kind: 'linkedin', handle: c.label === 'LinkedIn' ? 'Syed Nofel Talha' : c.label };
  if (u.includes('instagram.com')) return { kind: 'instagram', handle: '@' + c.url.replace(/[?#].*$/, '').replace(/\/$/, '').split('/').pop() };
  if (u.includes('discord') || /^discord/i.test(c.label)) {
    // handle comes from the badge alt text, e.g. alt="Discord: d1abol1cal" → copy it on click
    const h = (c.label.match(/discord\s*[:@]\s*(.+)$/i) || [])[1];
    return h ? { kind: 'discord', handle: '@' + h.trim().replace(/^@/, ''), copy: h.trim().replace(/^@/, '') } : { kind: 'discord', handle: 'Discord' };
  }
  return { kind: 'link', handle: c.label };
}

// Pixel shimmer along the card (canvas), triggered on hover
function pixelCard(card) {
  const cv = card.querySelector('.pixel-canvas'); const ctx = cv.getContext('2d');
  let px = [], raf, mode = 'idle';
  const colors = ['#0d2b0d', '#1b5e1b', '#39ff14'];
  const init = () => {
    const r = card.getBoundingClientRect(); cv.width = r.width; cv.height = r.height; px = [];
    const gap = 6;
    for (let x = 0; x < r.width; x += gap) for (let y = 0; y < r.height; y += gap) {
      const dist = Math.hypot(x - r.width / 2, y - r.height / 2);
      px.push({ x, y, c: colors[(Math.random() * colors.length) | 0], s: 0, max: 0.5 + Math.random() * 1.5, delay: dist * 0.9, t: 0, speed: 0.04 + Math.random() * 0.06, ph: Math.random() * 6.28 });
    }
  };
  const loop = () => {
    ctx.clearRect(0, 0, cv.width, cv.height);
    let alive = false;
    for (const p of px) {
      if (mode === 'in') { p.t += 16; if (p.t > p.delay) p.s = Math.min(p.max, p.s + 0.1); p.ph += p.speed; }
      else p.s = Math.max(0, p.s - 0.08);
      if (p.s > 0) { alive = true; const sz = p.s * (0.75 + 0.25 * Math.sin(p.ph)); ctx.fillStyle = p.c; ctx.fillRect(p.x + (2 - sz) / 2, p.y + (2 - sz) / 2, sz, sz); }
    }
    if (alive || mode === 'in') raf = requestAnimationFrame(loop); else raf = 0;
  };
  const enter = () => { mode = 'in'; px.forEach(p => { p.t = 0; }); if (!raf) loop(); };
  const leave = () => { mode = 'out'; if (!raf) loop(); };
  init();
  card.addEventListener('pointerenter', enter); card.addEventListener('pointerleave', leave);
  const ro = new ResizeObserver(init); ro.observe(card);
  return () => { cancelAnimationFrame(raf); ro.disconnect(); };
}

// Matrix / binary rain inside a card
function matrixRain(canvas) {
  const ctx = canvas.getContext('2d'), CH = '01ZXCVBNMASDFGHJKLQWERTYUIOP', F = 12;
  let cols = [];
  const resize = () => { canvas.width = canvas.parentElement.offsetWidth; canvas.height = canvas.parentElement.offsetHeight; cols = Array(Math.floor(canvas.width / F)).fill(0).map(() => Math.random() * -40 | 0); };
  resize();
  const ro = new ResizeObserver(resize); ro.observe(canvas.parentElement);
  const id = setInterval(() => {
    ctx.fillStyle = 'rgba(0,0,0,0.06)'; ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.font = F + 'px monospace';
    cols.forEach((y, i) => {
      const ch = CH[(Math.random() * CH.length) | 0];
      ctx.fillStyle = Math.random() > 0.975 ? 'rgba(220,255,220,0.95)' : 'rgba(57,255,20,0.7)';
      ctx.fillText(ch, i * F, y * F);
      cols[i] = y * F > canvas.height && Math.random() > 0.975 ? 0 : y + 1;
    });
  }, 50);
  return () => { clearInterval(id); ro.disconnect(); };
}

export function render(root, data) {
  const contacts = [...data.profile.contacts, ...CONFIG.extraContacts]
    .filter((c, i, a) => a.findIndex(x => x.url === c.url) === i)
    .map(c => ({ ...c, ...classify(c) }));
  contacts.push({ label: 'Résumé', url: CONFIG.resume, kind: 'resume', handle: 'resume.pdf' });
  const half = Math.ceil(contacts.length / 2);
  const cards = [contacts.slice(0, half), contacts.slice(half)];

  const item = c => `
    <div class="contact-item" style="--glow:${ICONS[c.kind].glow}">
      ${c.copy
        ? `<button type="button" class="contact-link" data-copy="${esc(c.copy)}" aria-label="Copy ${esc(c.handle)}">`
        : `<a class="contact-link" href="${esc(c.url)}" target="_blank" rel="noopener" aria-label="${esc(c.label)}: ${esc(c.handle)}">`}
        <span class="icon">${ICONS[c.kind].svg}</span>
        <span class="username">${esc(c.handle)}</span>
        <span class="tooltip" aria-live="polite"></span>
      ${c.copy ? '</button>' : '</a>'}
    </div>`;

  root.innerHTML = `
  <div class="contact-container">
    ${cards.map((list, i) => `
    <div class="pixel-card ${i ? 'alt' : ''}">
      <canvas class="pixel-canvas" aria-hidden="true"></canvas>
      <div class="matrix-layer" aria-hidden="true"><canvas class="matrix-rain"></canvas></div>
      <div class="contact-section"><div class="contact-links">${list.map(item).join('')}</div></div>
    </div>`).join('')}
  </div>`;

  const cleanups = [];
  root.querySelectorAll('.pixel-card').forEach(c => cleanups.push(pixelCard(c)));
  root.querySelectorAll('.matrix-rain').forEach(c => cleanups.push(matrixRain(c)));
  root.querySelectorAll('[data-copy]').forEach(b => b.addEventListener('click', () => {
    navigator.clipboard?.writeText(b.dataset.copy);
    const t = b.querySelector('.tooltip'); t.textContent = 'Copied!'; b.classList.add('copied');
    setTimeout(() => { t.textContent = ''; b.classList.remove('copied'); }, 1500);
  }));
  return () => cleanups.forEach(f => f());
}
