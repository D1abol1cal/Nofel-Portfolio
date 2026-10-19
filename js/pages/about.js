import { CONFIG } from '../config.js';
import { decrypt } from '../boot.js';

const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

export function render(root, data) {
  const p = data.profile;
  const role = p.roles[0] || 'Engineer';
  const subline = p.roles.slice(1).join(' · ');
  const langs = (p.stack.find(g => /lang/i.test(g.group)) || p.stack[0] || { items: [] }).items.slice(0, 4).map(i => i.name);
  const facts = p.facts.map(f => `
      <li><span class="fact-k">${esc(f.label || '›')}</span><span class="fact-v">${
        f.link ? `<a href="${esc(f.link)}" target="_blank" rel="noopener">${esc(f.value)}</a>` : esc(f.value)}</span></li>`).join('');

  root.innerHTML = `
  <div class="about-container">
    <div class="profile-card-wrap">
      <article class="profile-card" aria-label="ID card">
        <div class="pc-glare" aria-hidden="true"></div>
        <div class="pc-top">
          <span class="pc-badge">
            <svg viewBox="0 0 24 24" aria-hidden="true"><rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/></svg>
            KERNEL ACCESS
          </span>
          <svg class="pc-pulse" viewBox="0 0 24 24" aria-hidden="true"><path d="M3 12h4l3-8 4 16 3-8h4"/></svg>
        </div>
        <div class="pc-mid">
          <div class="pc-avatar">
            <img src="${esc(CONFIG.photo)}" alt="" onerror="this.remove()">
            <svg viewBox="0 0 24 24" aria-hidden="true"><rect x="6" y="6" width="12" height="12" rx="1.5"/><rect x="9.5" y="9.5" width="5" height="5"/><path d="M9 2v4M15 2v4M9 18v4M15 18v4M2 9h4M2 15h4M18 9h4M18 15h4"/></svg>
          </div>
          <h2 class="pc-name">${esc(p.name.toUpperCase())}</h2>
          <div class="pc-role">${esc(role.toUpperCase())}</div>
          <div class="pc-sub">${esc(subline)}</div>
        </div>
        <div class="pc-bottom">
          <div>
            <div class="pc-k">OPERATOR ID</div>
            <div class="pc-v">${esc(CONFIG.operatorId)}</div>
            <div class="pc-k">STACK</div>
            <div class="pc-v green">${esc(langs.join(' · '))}</div>
          </div>
          <svg class="pc-print" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 11c0 3-1 6-3 8M8 6.5A6 6 0 0 1 18 11c0 2-.3 4-1 6M5 9a8 8 0 0 1 2-3.3M6 13c0 1.5-.3 3-1 4.5M12 7a4 4 0 0 1 4 4c0 1.4-.1 2.7-.4 4M10 11a2 2 0 0 1 4 0c0 3.5-1 6.5-3 9M15 19.5c.3-.8.5-1.6.7-2.5"/></svg>
        </div>
      </article>
    </div>

    <section class="about-text">
      <h1 class="about-name"></h1>
      <h2 class="about-role">${esc(role)}</h2>
      ${p.about.map(t => `<p class="reveal">${esc(t)}</p>`).join('')}
      <ul class="fact-list reveal">${facts}</ul>
      ${p.highlights.length ? `<div class="hl-row reveal">${p.highlights.map(h => `
        <span class="hl" title="${esc(h.text)}">${esc(h.title)}</span>`).join('')}</div>` : ''}
      <div class="about-actions reveal">
        <a class="term-btn" href="${esc(CONFIG.resume)}" target="_blank" rel="noopener">./resume.pdf ↓</a>
        <a class="term-btn ghost" href="#/projects">cd ~/projects →</a>
      </div>
    </section>
  </div>`;

  decrypt(root.querySelector('.about-name'), p.name.toUpperCase(), { steps: 14, interval: 28 });
  root.querySelectorAll('.reveal').forEach((el, i) => { el.style.animationDelay = (0.15 + i * 0.09) + 's'; });

  // 3D tilt + glare following the cursor
  const card = root.querySelector('.profile-card');
  const onMove = e => {
    const r = card.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width, y = (e.clientY - r.top) / r.height;
    card.style.transform = `rotateY(${(x - 0.5) * 16}deg) rotateX(${(0.5 - y) * 16}deg)`;
    card.style.setProperty('--gx', x * 100 + '%'); card.style.setProperty('--gy', y * 100 + '%');
  };
  const onLeave = () => { card.style.transform = ''; };
  card.addEventListener('pointermove', onMove);
  card.addEventListener('pointerleave', onLeave);
  return () => { card.removeEventListener('pointermove', onMove); card.removeEventListener('pointerleave', onLeave); };
}
