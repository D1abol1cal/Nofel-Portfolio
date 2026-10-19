import { CONFIG } from '../config.js';
import { mountSphere } from '../sphere.js';

const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

export function render(root, data, { projectsHint }) {
  const featured = data.featured.slice(0, 4);
  root.innerHTML = `
  <div class="projects-page">
    <div class="hint-projects" hidden>
      <div class="hint-bubble projects">
        <span class="hint-kicker">PROJECTS</span>
        <p><b>Top cards</b> = flagship work. <b>Sphere below</b> = drag to spin · click the center button to open the repo.</p>
        <p class="hint-sub">click to dismiss</p>
      </div>
    </div>

    <section class="flagship-grid" aria-label="Flagship projects">
      ${featured.map(f => {
        const tag = (f.subtitle || f.lang || 'project').split(/\s+/).slice(-1)[0];
        const metric = f.stars ? `★ ${f.stars}` : (f.lang || '');
        const blurb = f.tech.length ? f.tech.map(t => t.name).join(' · ') : f.desc;
        return `
        <a class="flagship-card" href="${esc(f.url)}" target="_blank" rel="noopener">
          <div class="fc-top"><span class="fc-tag">${esc(tag.toUpperCase())}</span><span class="fc-metric">${esc(metric)}</span></div>
          <h3 class="fc-title">${esc(f.name)}${f.subtitle ? ` <span class="fc-sub">${esc(f.subtitle)}</span>` : ''}</h3>
          <p class="fc-blurb">${esc(blurb)}</p>
          <span class="fc-link">open repo ↗</span>
        </a>`;
      }).join('')}
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
  const cleanup = mountSphere(root.querySelector('.sphere-mount'), data.repos, {
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
  return cleanup;
}
