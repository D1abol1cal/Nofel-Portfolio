import { CONFIG } from '../config.js';
import { mountSphere } from '../sphere.js';

const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

const LANG = { C: '#A8B9CC', 'C++': '#f34b7d', Python: '#3572A5', JavaScript: '#f1e05a', TypeScript: '#3178c6', Java: '#b07219', HTML: '#e34c26', CSS: '#563d7c', SCSS: '#c6538c', 'C#': '#178600', Dart: '#00B4AB', Go: '#00ADD8', Rust: '#dea584', 'Jupyter Notebook': '#DA5B0B' };
const langColor = l => LANG[l] || '#9f9';
const ago = iso => {
  if (!iso) return '';
  const d = (Date.now() - new Date(iso)) / 86400000;
  return d < 1 ? 'today' : d < 30 ? `${Math.round(d)}d ago` : d < 365 ? `${Math.round(d / 30)}mo ago` : `${Math.round(d / 365)}y ago`;
};
const VIEW_KEY = 'nt_projects_view';

export function render(root, data, { projectsHint }) {
  const featured = data.featured.slice(0, 4);
  root.innerHTML = `
  <div class="projects-page">
    <div class="hint-projects" hidden>
      <div class="hint-bubble projects">
        <span class="hint-kicker">PROJECTS</span>
        <p><b>Top cards</b> = featured work. Switch between <b>sphere</b> and <b>list</b> below · drag the sphere to spin, click a tile to focus it.</p>
        <p class="hint-sub">click to dismiss</p>
      </div>
    </div>

    ${featured.length ? `<section class="flagship-grid" aria-label="Featured projects">
      ${featured.map(f => `
        <a class="flagship-card" href="${esc(f.repoUrl)}" target="_blank" rel="noopener">
          <div class="fc-top"><span class="fc-tag">${esc((f.lang || 'project').toUpperCase())}</span><span class="fc-metric">★ ${f.stars}</span></div>
          <h3 class="fc-title">${esc(f.name)}</h3>
          ${f.desc ? `<p class="fc-blurb">${esc(f.desc)}</p>` : ''}
          ${f.topics.length ? `<p class="fc-topics">${f.topics.slice(0, 6).map(t => `<span>#${esc(t)}</span>`).join('')}</p>` : ''}
          <span class="fc-link">open repo ↗</span>
        </a>`).join('')}
    </section>` : ''}

    <div class="view-toggle" role="tablist" aria-label="Projects view">
      <button type="button" role="tab" data-view="sphere">sphere</button>
      <button type="button" role="tab" data-view="list">list</button>
    </div>

    <section class="repo-list" aria-label="All repositories (list)" hidden>
      <div class="rl-head">
        <h2><span class="prompt">$</span> ls ~/projects</h2>
        <label class="rl-filter"><span class="sr-only">Filter projects</span>
          <span class="prompt" aria-hidden="true">grep</span><input type="search" placeholder="name, language or topic" autocomplete="off" spellcheck="false">
        </label>
      </div>
      <ul class="rl-rows">
        ${data.repos.map(r => `
        <li class="rl-row" data-q="${esc([r.name, r.desc, r.lang, ...r.topics].join(' ').toLowerCase())}">
          <a class="rl-link" href="${esc(r.url)}" target="_blank" rel="noopener">
            <span class="rl-name">${esc(r.name)}${r.featured ? ' <span class="rl-star" title="featured">featured</span>' : ''}</span>
            <span class="rl-meta">
              ${r.lang ? `<span class="rl-lang"><i style="background:${langColor(r.lang)}"></i>${esc(r.lang)}</span>` : ''}
              <span>★ ${r.stars}</span>
              <span>${esc(ago(r.pushed))}</span>
            </span>
            ${r.desc ? `<span class="rl-desc">${esc(r.desc)}</span>` : ''}
            ${r.topics.filter(t => t !== CONFIG.topicShow && t !== CONFIG.topicFeatured).length ? `<span class="rl-topics">${r.topics.filter(t => t !== CONFIG.topicShow && t !== CONFIG.topicFeatured).slice(0, 6).map(t => `<span>#${esc(t)}</span>`).join('')}</span>` : ''}
          </a>
        </li>`).join('')}
      </ul>
      <p class="rl-empty" hidden>no matches</p>
    </section>

    <section class="sphere-stage" aria-label="All repositories">
      <div class="sphere-mount"></div>
      <div class="sphere-info">
        <h2 class="si-title"></h2>
        <p class="si-desc"></p>
      </div>
      <a class="sphere-action" href="#" target="_blank" rel="noopener" aria-label="Open repository">
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 17L17 7M8 7h9v9"/></svg>
      </a>
      <ul class="sphere-fallback">${data.repos.map(r => `<li><a href="${esc(r.url)}" target="_blank" rel="noopener">${esc(r.name)}</a> — ${esc(r.desc)}</li>`).join('')}</ul>
    </section>
  </div>`;

  projectsHint(root.querySelector('.hint-projects'));

  const stage = root.querySelector('.sphere-stage');
  const title = root.querySelector('.si-title'), desc = root.querySelector('.si-desc'), act = root.querySelector('.sphere-action');
  let stopSphere = null;
  const startSphere = () => {
    if (stopSphere) return;
    stopSphere = mountSphere(root.querySelector('.sphere-mount'), data.repos, {
      user: CONFIG.username,
      onMoving: m => stage.classList.toggle('moving', m),
      onActive: r => {
        title.textContent = r.name;
        desc.textContent = r.desc || `${r.lang || 'Repository'} · ★ ${r.stars}`;
        act.href = r.homepage || r.url;
        act.setAttribute('aria-label', 'Open ' + r.name);
        stage.classList.remove('moving');
      },
    });
    if (root.querySelector('.sphere-canvas')) stage.classList.add('has-gl');
  };

  // sphere ⇄ list toggle (remembered per browser)
  const list = root.querySelector('.repo-list');
  const btns = [...root.querySelectorAll('.view-toggle button')];
  const show = v => {
    btns.forEach(b => { const on = b.dataset.view === v; b.classList.toggle('active', on); b.setAttribute('aria-selected', String(on)); });
    list.hidden = v !== 'list'; stage.hidden = v !== 'sphere';
    if (v === 'sphere') startSphere();
    else if (stopSphere) { stopSphere(); stopSphere = null; stage.classList.remove('has-gl'); }
    try { localStorage.setItem(VIEW_KEY, v); } catch (_) {}
  };
  btns.forEach(b => b.addEventListener('click', () => show(b.dataset.view)));
  let initial = 'sphere';
  try { initial = localStorage.getItem(VIEW_KEY) === 'list' ? 'list' : 'sphere'; } catch (_) {}
  show(initial);

  // list filter
  const input = list.querySelector('input'), rows = [...list.querySelectorAll('.rl-row')], empty = list.querySelector('.rl-empty');
  input.addEventListener('input', () => {
    const q = input.value.trim().toLowerCase();
    let n = 0;
    rows.forEach(r => { const hit = !q || r.dataset.q.includes(q); r.hidden = !hit; n += hit; });
    empty.hidden = n > 0;
  });

  return () => { if (stopSphere) stopSphere(); };
}
