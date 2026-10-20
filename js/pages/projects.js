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

    <div class="pv-bar">
      <div class="pv-tabs" role="tablist" aria-label="Projects view">
        <button type="button" role="tab" data-view="sphere"><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9"/><ellipse cx="12" cy="12" rx="4" ry="9"/><path d="M3 12h18"/></svg>sphere</button>
        <button type="button" role="tab" data-view="list"><svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="3" width="7.5" height="7.5" rx="1.5"/><rect x="13.5" y="3" width="7.5" height="7.5" rx="1.5"/><rect x="3" y="13.5" width="7.5" height="7.5" rx="1.5"/><rect x="13.5" y="13.5" width="7.5" height="7.5" rx="1.5"/></svg>list</button>
      </div>
      <label class="rl-filter" hidden><span class="sr-only">Filter projects</span>
        <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="M20 20l-3.5-3.5"/></svg>
        <input type="text" placeholder="filter by name, language, topic" autocomplete="off" spellcheck="false">
      </label>
    </div>

    <section class="repo-list" aria-label="All repositories" hidden>
      <ul class="rl-grid">
        ${data.repos.map(r => {
          const topics = r.topics.filter(t => t !== CONFIG.topicShow && t !== CONFIG.topicFeatured);
          return `
        <li class="rl-item" data-q="${esc([r.name, r.desc, r.lang, ...topics].join(' ').toLowerCase())}">
          <a class="rl-card" href="${esc(r.url)}" target="_blank" rel="noopener">
            <span class="rl-top">
              <span class="rl-lang">${r.lang ? `<i style="background:${langColor(r.lang)}"></i>${esc(r.lang)}` : '<i></i>repo'}</span>
              ${r.featured ? '<span class="rl-feat">featured</span>' : ''}
            </span>
            <span class="rl-name">${esc(r.name)}</span>
            <span class="rl-desc">${esc(r.desc || 'No description yet.')}</span>
            ${topics.length ? `<span class="rl-topics">${topics.slice(0, 3).map(t => `<span>#${esc(t)}</span>`).join('')}</span>` : ''}
            <span class="rl-foot"><span>★ ${r.stars}</span><span>updated ${esc(ago(r.pushed))}</span><span class="rl-go" aria-hidden="true">↗</span></span>
          </a>
        </li>`; }).join('')}
      </ul>
      <p class="rl-empty" hidden>// no projects match that filter</p>
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
  const list = root.querySelector('.repo-list'), filterBox = root.querySelector('.rl-filter');
  const btns = [...root.querySelectorAll('.pv-tabs button')];
  const show = v => {
    btns.forEach(b => { const on = b.dataset.view === v; b.classList.toggle('active', on); b.setAttribute('aria-selected', String(on)); });
    list.hidden = v !== 'list'; stage.hidden = v !== 'sphere'; filterBox.hidden = v !== 'list';
    if (v === 'sphere') startSphere();
    else if (stopSphere) { stopSphere(); stopSphere = null; stage.classList.remove('has-gl'); }
    try { localStorage.setItem(VIEW_KEY, v); } catch (_) {}
  };
  btns.forEach(b => b.addEventListener('click', () => show(b.dataset.view)));
  let initial = 'sphere';
  try { initial = localStorage.getItem(VIEW_KEY) === 'list' ? 'list' : 'sphere'; } catch (_) {}
  show(initial);

  // list filter
  const input = filterBox.querySelector('input'), rows = [...list.querySelectorAll('.rl-item')], empty = list.querySelector('.rl-empty');
  input.addEventListener('input', () => {
    const q = input.value.trim().toLowerCase();
    let n = 0;
    rows.forEach(r => { const hit = !q || r.dataset.q.includes(q); r.hidden = !hit; n += hit; });
    empty.hidden = n > 0;
  });

  return () => { if (stopSphere) stopSphere(); };
}
