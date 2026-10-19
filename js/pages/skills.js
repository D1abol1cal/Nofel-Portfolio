import { mountGallery, iconUrl } from '../gallery.js';

const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const dir = s => s.toLowerCase().replace(/&/g, 'and').replace(/[^a-z0-9+#]+/g, '-').replace(/^-|-$/g, '') + '/';

// One skill "chip": brand icon (if Simple Icons has it) + name
const chip = s => `
  <span class="sk-chip" title="${esc(s.name)}">
    ${s.slug ? `<img src="${esc(iconUrl(s.slug, 'e8ffe8'))}" alt="" loading="lazy" onerror="this.remove()">` : ''}
    <span>${esc(s.name)}</span>
  </span>`;

// Build `tree ~/stack` rows from the README's TECH STACK section:
// **Group** → folder, *Sub:* → nested folder (e.g. frameworks/java/), badges → chips.
function treeRows(stack) {
  const rows = [];
  let dirs = 0;
  stack.forEach((g, gi) => {
    const lastG = gi === stack.length - 1;
    const subs = [];
    g.items.forEach(it => { const k = it.sub || ''; let s = subs.find(x => x.name === k); if (!s) subs.push(s = { name: k, items: [] }); s.items.push(it); });
    rows.push({ prefix: lastG ? '└── ' : '├── ', label: dir(g.group), count: g.items.length, items: subs.length === 1 && !subs[0].name ? subs[0].items : null });
    dirs++;
    if (!(subs.length === 1 && !subs[0].name)) {
      subs.forEach((s, si) => {
        const lastS = si === subs.length - 1;
        rows.push({ prefix: (lastG ? '    ' : '│   ') + (lastS ? '└── ' : '├── '), label: dir(s.name || 'other'), items: s.items, sub: true });
        dirs++;
      });
    }
  });
  return { rows, dirs };
}

export function render(root, data) {
  const stack = data.profile.stack;
  const total = stack.reduce((n, g) => n + g.items.length, 0);
  const langs = (stack.find(g => /lang/i.test(g.group)) || stack[0] || { items: [] }).items;
  const { rows, dirs } = treeRows(stack);

  root.innerHTML = `
  <div class="skills-page">
    <section class="skills-hero" aria-label="Languages">
      <div class="skills-kicker">// core languages · drag or scroll</div>
      <div class="gallery-mount"></div>
    </section>

    <section class="stack-tree" aria-labelledby="tree-h">
      <div class="tree-head">
        <h2 id="tree-h"><span class="prompt">$</span> tree ~/stack</h2>
        <span class="tree-meta">${total} skills · synced from README</span>
      </div>
      <div class="tree-body">
        <div class="tree-row root"><span class="tree-label">~/stack/</span></div>
        ${rows.map(r => `
        <div class="tree-row${r.sub ? ' sub' : ''}">
          <span class="tree-prefix" aria-hidden="true">${r.prefix}</span>
          <span class="tree-label">${esc(r.label)}${r.count && !r.items ? ` <i>${r.count}</i>` : ''}</span>
          ${r.items ? `<span class="tree-items">${r.items.map(chip).join('')}</span>` : ''}
        </div>`).join('')}
      </div>
      <div class="tree-foot">${dirs} directories, ${total} skills</div>
    </section>
  </div>`;

  return mountGallery(root.querySelector('.gallery-mount'), langs, { bend: 2 });
}
