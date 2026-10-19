import { CONFIG } from '../config.js';
import { mountGallery } from '../gallery.js';

const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

// pick a varied carousel: round-robin across groups/sub-groups so every area shows up
function pickCarousel(stack, max = 16) {
  const buckets = [];
  for (const g of stack) {
    const subs = {};
    g.items.forEach(i => (subs[i.sub || g.group] ||= []).push(i));
    buckets.push(...Object.values(subs));
  }
  const out = [], seen = new Set();
  for (let r = 0; out.length < max && buckets.some(b => b[r]); r++) {
    for (const b of buckets) {
      const it = b[r];
      if (it && !seen.has(it.name) && out.length < max) { seen.add(it.name); out.push(it); }
    }
  }
  return out;
}

export function render(root, data) {
  const stack = data.profile.stack;
  const all = stack.flatMap(g => g.items.map(i => ({ ...i, group: i.sub || g.group })));
  const rows = all.slice(0, 14).map((s, i) => ({
    pid: 101 + i, pr: -20 + i * 3, state: i % 3 === 2 ? 'S' : 'R',
    name: s.name.toLowerCase().replace(/[^a-z0-9+#]+/g, '_').replace(/^_|_$/g, ''),
    group: s.group, cpu: Math.max(4, 98 - i * 6.5 + Math.random() * 6), mem: 2 + Math.random() * 20,
  }));

  root.innerHTML = `
  <div class="skills-page">
    <div class="skills-toggle" role="tablist" aria-label="Skills view">
      <button type="button" role="tab" class="active" aria-selected="true" data-view="carousel">carousel</button>
      <button type="button" role="tab" aria-selected="false" data-view="htop">htop</button>
    </div>
    <div class="skills-panel" data-panel="carousel">
      <div class="gallery-mount" aria-label="Skills carousel — drag or scroll"></div>
      <ul class="sr-only">${all.map(s => `<li>${esc(s.name)} (${esc(s.group)})</li>`).join('')}</ul>
    </div>
    <div class="skills-panel skills-panel-htop" data-panel="htop" hidden>
      <div class="htop">
        <div class="htop-head">
          <div><b>htop — ${esc(CONFIG.username.toLowerCase())}@systems</b></div>
          <div>Tasks: ${all.length} total · ${stack.length} groups · Load avg: <span data-load>2.09 2.09 2.09</span></div>
          <div>Mem: <span data-mem>18.4</span>G/64.0G · Uptime: infinite</div>
        </div>
        <div class="htop-table" role="table">
          <div class="htop-row htop-th" role="row"><span>PID</span><span>PR</span><span>S</span><span>CPU%</span><span class="col-mem">MEM%</span><span>Command</span></div>
          ${rows.map(r => `
          <div class="htop-row" role="row">
            <span class="col-pid">${r.pid}</span><span>${r.pr}</span>
            <span class="${r.state === 'R' ? 'state-r' : 'state-s'}">${r.state}</span>
            <span class="cpu-cell"><span class="cpu-bar" style="width:${r.cpu.toFixed(1)}%"></span><span class="cpu-label">${r.cpu.toFixed(1)}</span></span>
            <span class="col-mem">${r.mem.toFixed(1)}</span>
            <span class="cmd-cell">${esc(r.name)} <i>${esc(r.group.toLowerCase())}</i></span>
          </div>`).join('')}
        </div>
        <div class="htop-footer">F1Help  F2Setup  F3Search  F10Quit  ·  toggle: carousel</div>
      </div>
    </div>
  </div>`;

  const cleanupGallery = mountGallery(root.querySelector('.gallery-mount'), pickCarousel(stack), { bend: 2 });

  // toggle
  const btns = [...root.querySelectorAll('.skills-toggle button')];
  btns.forEach(b => b.addEventListener('click', () => {
    btns.forEach(x => { const on = x === b; x.classList.toggle('active', on); x.setAttribute('aria-selected', String(on)); });
    root.querySelectorAll('[data-panel]').forEach(p => { p.hidden = p.dataset.panel !== b.dataset.view; });
  }));

  // live htop jitter
  const bars = [...root.querySelectorAll('.htop-row:not(.htop-th)')];
  const load = root.querySelector('[data-load]'), mem = root.querySelector('[data-mem]');
  const id = setInterval(() => {
    bars.forEach((row, i) => {
      const base = rows[i].cpu, v = Math.max(1, Math.min(99.9, base + (Math.random() - 0.5) * 18));
      row.querySelector('.cpu-bar').style.width = v.toFixed(1) + '%';
      row.querySelector('.cpu-label').textContent = v.toFixed(1);
    });
    const l = (1.6 + Math.random()).toFixed(2);
    load.textContent = `${l} ${(l * 0.97).toFixed(2)} ${(l * 0.93).toFixed(2)}`;
    mem.textContent = (17 + Math.random() * 3).toFixed(1);
  }, 1400);

  return () => { clearInterval(id); cleanupGallery(); };
}
