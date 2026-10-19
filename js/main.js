import { CONFIG } from './config.js';
import { loadContent } from './github.js';
import { mountSquares, runBoot } from './boot.js';
import { mountStarfield } from './starfield.js';
import * as sfx from './audio.js';

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];

const ROUTES = {
  '/about': () => import('./pages/about.js'),
  '/projects': () => import('./pages/projects.js'),
  '/skills': () => import('./pages/skills.js'),
  '/contact': () => import('./pages/contact.js'),
};
let DATA = null;

// ── boot ────────────────────────────────────────────────────
async function boot() {
  const bootEl = $('#boot');
  const stopSquares = mountSquares($('.squares-canvas', bootEl));
  bootEl.addEventListener('click', () => sfx.hover());

  // Returning visitors in the same session can skip straight in
  let skip;
  const skipped = new Promise(r => { skip = r; });
  $('.boot-skip').addEventListener('click', e => { e.stopPropagation(); sfx.click(); skip(); });
  const onKey = e => { if (e.key === 'Enter' || e.key === 'Escape') skip(); };
  window.addEventListener('keydown', onKey);

  let contentPromise;
  const wrapped = log => (contentPromise = loadContent(log));
  const bootRun = runBoot($('.terminal-box', bootEl), wrapped);

  await Promise.race([bootRun, skipped]);
  DATA = await contentPromise;
  window.removeEventListener('keydown', onKey);

  bootEl.classList.add('fade-out');
  setTimeout(() => { stopSquares(); bootEl.remove(); }, 450);
  startSite();
}

// ── chrome: status bar, clock ───────────────────────────────
function startChrome() {
  const t0 = Date.now();
  const up = $('[data-uptime]'), ping = $('[data-ping]'), alloc = $('[data-alloc]'), clock = $('[data-clock]');
  const tick = () => {
    const s = Math.floor((Date.now() - t0) / 1000);
    up.textContent = [s / 3600, (s % 3600) / 60, s % 60].map(n => String(Math.floor(n)).padStart(2, '0')).join(':');
    clock.textContent = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };
  const jitter = () => {
    const p = 10 + Math.floor(Math.random() * 6);
    ping.textContent = p; alloc.textContent = (12.4 + 0.01 * p).toFixed(2);
  };
  tick(); jitter();
  setInterval(tick, 1000); setInterval(jitter, 2000);
}

// ── dock magnification (macOS style) ────────────────────────
function startDock() {
  const panel = $('.dock-panel');
  const items = $$('.dock-item', panel);
  const BASE = 48, MAG = 64, DIST = 140;
  let raf = 0, mx = Infinity;
  const apply = () => {
    raf = 0;
    for (const it of items) {
      const r = it.getBoundingClientRect();
      const c = r.left + r.width / 2;
      const d = Math.abs(mx - c);
      const s = d < DIST ? BASE + (MAG - BASE) * Math.cos((d / DIST) * Math.PI / 2) : BASE;
      it.style.width = it.style.height = s + 'px';
    }
  };
  panel.addEventListener('mousemove', e => { mx = e.clientX; raf ||= requestAnimationFrame(apply); });
  panel.addEventListener('mouseleave', () => { mx = Infinity; raf ||= requestAnimationFrame(apply); });
  items.forEach(it => it.addEventListener('click', () => sfx.click()));
}

// ── global hover/click sounds for interactive elements ──────
function startSfxDelegation() {
  let last = null;
  document.addEventListener('pointerover', e => {
    const el = e.target.closest('a, button, [data-sfx], .palette-item');
    if (el && el !== last) { last = el; sfx.hover(); }
    if (!el) last = null;
  });
  document.addEventListener('click', e => {
    const el = e.target.closest('a:not(.dock-item), button:not(.mute-btn), [data-sfx-click]');
    if (el) sfx.click();
  });
}

// ── music: mute toggle + theme picker ───────────────────────
function startMute() {
  const btn = $('.mute-btn'), pickBtn = $('.music-btn'), panel = $('.music-panel'), list = $('.mp-list'), state = $('.mp-state');

  list.innerHTML = sfx.CHANNELS.map(ch => `
    <button type="button" class="mp-item" role="option" data-theme="${ch.id}">
      <span class="mp-bars" aria-hidden="true"><i></i><i></i><i></i></span>
      <span class="mp-text"><span class="mp-name">${ch.name}</span><span class="mp-desc">${ch.desc}</span></span>
    </button>`).join('');

  const sync = ({ on, theme }) => {
    btn.setAttribute('aria-pressed', String(on));
    btn.setAttribute('aria-label', on ? 'Turn music off' : 'Turn music on');
    btn.classList.toggle('on', on);
    pickBtn.classList.toggle('on', on);
    const name = (sfx.CHANNELS.find(c => c.id === theme) || {}).name || '';
    state.textContent = on ? '▶ ' + name.toUpperCase() : 'OFF';
    $$('.mp-item', list).forEach(it => {
      const cur = it.dataset.theme === theme;
      it.classList.toggle('current', cur); it.classList.toggle('playing', cur && on);
      it.setAttribute('aria-selected', String(cur));
    });
  };
  sfx.onMusicChange(sync);
  sync({ on: false, theme: sfx.getTheme() });

  btn.addEventListener('click', () => { sfx.setMusic(!sfx.isMusicOn()); sfx.click(); });
  const toggle = v => {
    const open = v ?? panel.hidden;
    panel.hidden = !open; pickBtn.setAttribute('aria-expanded', String(open));
  };
  pickBtn.addEventListener('click', e => { e.stopPropagation(); toggle(); });
  list.addEventListener('click', e => {
    const it = e.target.closest('.mp-item'); if (!it) return;
    if (it.dataset.theme === sfx.getTheme() && sfx.isMusicOn()) sfx.setMusic(false);
    else sfx.setTheme(it.dataset.theme);
  });
  document.addEventListener('click', e => { if (!panel.hidden && !e.target.closest('.music-picker')) toggle(false); });
  window.addEventListener('keydown', e => { if (e.key === 'Escape' && !panel.hidden) toggle(false); });
}

// ── command palette ─────────────────────────────────────────
function startPalette() {
  const overlay = $('.palette-overlay'), input = $('.palette-input'), list = $('.palette-list');
  const cmds = [
    { name: 'Navigate: About Me', run: () => go('/about') },
    { name: 'Navigate: Projects', run: () => go('/projects') },
    { name: 'Navigate: Skills & Stack', run: () => go('/skills') },
    { name: 'Navigate: Contact', run: () => go('/contact') },
    { name: 'Action: Copy Email', run: () => { const m = (DATA?.profile.contacts || []).find(c => c.url.startsWith('mailto:')); if (m) navigator.clipboard?.writeText(m.url.slice(7)); } },
    { name: 'Action: Download Résumé', run: () => window.open(CONFIG.resume, '_blank') },
    { name: 'Music: Toggle On / Off', run: () => sfx.setMusic(!sfx.isMusicOn()) },
    { name: 'Music: Next Channel', run: () => sfx.nextTheme() },
    ...sfx.CHANNELS.map(ch => ({ name: `Music: ${ch.name} — ${ch.desc}`, run: () => sfx.setTheme(ch.id) })),
    { name: 'System: Reboot', run: () => { try { sessionStorage.clear(); } catch (_) {} location.hash = ''; location.reload(); } },
    { name: 'System: View Source', run: () => window.open(`https://github.com/${CONFIG.username}/Nofel-Portfolio`, '_blank') },
  ];
  let open = false, sel = 0, shown = cmds;
  const render = () => {
    const q = input.value.toLowerCase();
    shown = cmds.filter(c => c.name.toLowerCase().includes(q));
    sel = Math.min(sel, Math.max(0, shown.length - 1));
    list.innerHTML = shown.length ? '' : '<div class="palette-empty">No results found.</div>';
    shown.forEach((c, i) => {
      const d = document.createElement('div');
      d.className = 'palette-item' + (i === sel ? ' selected' : '');
      d.setAttribute('role', 'option'); d.setAttribute('aria-selected', String(i === sel));
      d.innerHTML = '<span class="cmd-icon">&gt;</span> ';
      d.append(c.name);
      d.addEventListener('mouseenter', () => { sel = i; mark(); });
      d.addEventListener('click', () => { c.run(); toggle(false); sfx.click(); });
      list.appendChild(d);
    });
  };
  const mark = () => $$('.palette-item', list).forEach((d, i) => { d.classList.toggle('selected', i === sel); d.setAttribute('aria-selected', String(i === sel)); });
  const toggle = v => {
    open = v ?? !open; overlay.hidden = !open;
    if (open) { input.value = ''; sel = 0; render(); input.focus(); }
  };
  overlay.addEventListener('click', e => { if (e.target === overlay) toggle(false); });
  input.addEventListener('input', () => { sel = 0; render(); });
  window.addEventListener('keydown', e => {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); toggle(); sfx.click(); return; }
    if (!open) return;
    if (e.key === 'Escape') toggle(false);
    else if (e.key === 'ArrowDown') { e.preventDefault(); sel = (sel + 1) % shown.length; mark(); sfx.hover(); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); sel = (sel - 1 + shown.length) % shown.length; mark(); sfx.hover(); }
    else if (e.key === 'Enter' && shown[sel]) { e.preventDefault(); shown[sel].run(); toggle(false); sfx.click(); }
  });
}

// ── one-time hints ──────────────────────────────────────────
function onceHint(key, el, ms) {
  try { if (sessionStorage.getItem(key)) return; } catch (_) {}
  el.hidden = false;
  const close = () => { el.hidden = true; try { sessionStorage.setItem(key, '1'); } catch (_) {} };
  el.addEventListener('click', close, { once: true });
  setTimeout(close, ms);
}
export function projectsHint(el) { onceHint('nt_hint_projects_v1', el, 10000); }

// ── router ──────────────────────────────────────────────────
let current = { path: null, cleanup: null };
let navigated = false;
const go = p => { location.hash = '#' + p; };
const routeOf = () => (location.hash.replace(/^#/, '') || '/');

async function renderRoute() {
  const path = routeOf();
  $('[data-route]').textContent = path.toUpperCase();
  $$('.dock-item').forEach(d => d.classList.toggle('active', d.dataset.route === path));
  $$('.dock-item').forEach(d => d.toggleAttribute('aria-current', d.dataset.route === path));

  if (path !== '/' && !navigated) { navigated = true; $('#systems-online').classList.add('gone'); }
  if (path === current.path) return;

  const view = $('#view');
  if (current.cleanup) {
    view.classList.add('leaving');
    await new Promise(r => setTimeout(r, 300));
    try { current.cleanup(); } catch (_) {}
    current.cleanup = null;
  }
  view.innerHTML = '';
  view.className = 'view';
  current.path = path;
  const loader = ROUTES[path];
  if (!loader) return;
  const page = await loader();
  if (current.path !== path) return; // user moved on meanwhile
  const wrap = document.createElement('div');
  wrap.className = 'page page-' + path.slice(1);
  view.appendChild(wrap);
  current.cleanup = page.render(wrap, DATA, { projectsHint }) || null;
  view.focus({ preventScroll: true });
}

function startSite() {
  const site = $('#site');
  site.hidden = false;
  requestAnimationFrame(() => site.classList.add('in'));
  mountStarfield($('.particles-wrapper'));
  startChrome(); startDock(); startSfxDelegation(); startMute(); startPalette();
  if (routeOf() !== '/') { navigated = true; $('#systems-online').classList.add('gone'); }
  onceHint('nt_hint_dock_v1', $('.hint-dock'), 9000);
  window.addEventListener('hashchange', renderRoute);
  renderRoute();
}

boot();
