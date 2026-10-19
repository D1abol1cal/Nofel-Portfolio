// Live content loader: profile README + repos from GitHub.
// Reads data/snapshot.json (kept fresh by the hourly GitHub Action); goes to GitHub directly only if that's missing.
import { CONFIG } from './config.js';

const CACHE_KEY = 'nt_gh_cache_v1';

// ── tiny helpers ────────────────────────────────────────────
const EMOJI = /[\p{Extended_Pictographic}\u{FE0F}\u{200D}\u{20E3}]/gu;
export const stripEmoji = (s = '') => s.replace(EMOJI, '').replace(/\s{2,}/g, ' ').trim();
const mdText = (s = '') =>
  stripEmoji(
    s.replace(/!\[[^\]]*\]\([^)]*\)/g, '')           // images
      .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')        // links → text
      .replace(/<br\s*\/?>/gi, ' ')
      .replace(/<[^>]+>/g, '')
      .replace(/\*\*|__|\*|`/g, '')
  ).trim();
const firstLink = (s = '') => (s.match(/\[[^\]]*\]\(([^)]+)\)/) || [])[1] || '';

function parseBadge(alt, url) {
  // https://img.shields.io/badge/LABEL-COLOR?style=..&logo=slug&logoColor=..
  let color = '', slug = '', logoColor = '';
  try {
    const u = new URL(url);
    const seg = decodeURIComponent(u.pathname.split('/badge/')[1] || '');
    color = (seg.match(/-([0-9A-Fa-f]{3,6})$/) || [])[1] || '';
    slug = u.searchParams.get('logo') || '';
    logoColor = u.searchParams.get('logoColor') || '';
  } catch (_) { /* ignore */ }
  return { name: alt.trim(), slug, color, logoColor };
}
const badgesIn = (s = '') =>
  [...s.matchAll(/!\[([^\]]+)\]\((https:\/\/img\.shields\.io\/badge\/[^)\s]+)\)/g)].map(m => parseBadge(m[1], m[2]));

function tableRows(block) {
  return block.split('\n')
    .filter(l => l.trim().startsWith('|') && !/^\|\s*:?-{2,}/.test(l.trim()))
    .map(l => l.trim().replace(/^\||\|$/g, '').split('|').map(c => c.trim()));
}

// ── README → profile model ──────────────────────────────────
export function parseReadme(md) {
  const out = { name: '', roles: [], about: [], facts: [], featured: [], highlights: [], stack: [], contacts: [], quote: '', sections: 0 };
  const h1 = (md.match(/^#\s+(.+)$/m) || [])[1] || '';
  out.name = stripEmoji((h1.match(/I['’]m\s+(.+)$/i) || [])[1] || h1);

  const typing = md.match(/readme-typing-svg[^)\s"]*?[?&]lines=([^&)\s"]+)/);
  if (typing) out.roles = decodeURIComponent(typing[1].replace(/\+/g, ' ')).split(';').map(s => s.trim()).filter(Boolean);

  const quote = md.match(/<i>\s*"?([^<]+?)"?\s*<\/i>/i);
  if (quote) out.quote = quote[1].trim();

  const parts = md.split(/^##\s+/m).slice(1);
  out.sections = parts.length;
  for (const part of parts) {
    const nl = part.indexOf('\n');
    const key = stripEmoji(part.slice(0, nl)).toLowerCase();
    const body = part.slice(nl + 1);

    if (key.includes('about')) {
      for (const raw of body.split('\n')) {
        const l = raw.trim();
        if (!l || /^-{3,}$/.test(l)) continue;
        if (/^[-*]\s+/.test(l)) {
          const item = l.replace(/^[-*]\s+/, '');
          const text = mdText(item);
          const m = text.match(/^([^:]{2,24}):\s*(.+)$/);
          out.facts.push(m ? { label: m[1].trim(), value: m[2].trim(), link: firstLink(item) }
                           : { label: '', value: text, link: firstLink(item) });
        } else out.about.push(mdText(l));
      }
    } else if (key.includes('project')) {
      const rows = tableRows(body);
      const cells = rows.slice(1).flat();
      for (const c of cells) {
        const title = (c.match(/\*\*\[([^\]]+)\]\(([^)]+)\)\*\*/) || []);
        if (!title[1]) continue;
        const after = c.slice(c.indexOf(title[0]) + title[0].length);
        const desc = mdText(after.split(/<br\s*\/?>\s*<br\s*\/?>/i)[0]);
        const [name, subtitle = ''] = title[1].split(/\s+[-–—]\s+/);
        out.featured.push({ name: name.trim(), subtitle: subtitle.trim(), url: title[2], desc, tech: badgesIn(c) });
      }
    } else if (key.includes('highlight')) {
      const rows = tableRows(body);
      if (rows.length >= 2) rows[0].forEach((h, i) => out.highlights.push({ title: mdText(h), text: mdText(rows[1][i] || '') }));
    } else if (key.includes('stack') || key.includes('skill')) {
      let group = null, sub = '';
      for (const raw of body.split('\n')) {
        const l = raw.trim();
        const g = l.match(/^\*\*([^*]+)\*\*$/);
        const s = l.match(/^\*([^*]+?):?\*$/);
        if (g) { group = { group: mdText(g[1]), items: [] }; out.stack.push(group); sub = ''; continue; }
        if (s) { sub = mdText(s[1]).replace(/:$/, ''); continue; }
        for (const b of badgesIn(l)) {
          if (!group) { group = { group: 'Stack', items: [] }; out.stack.push(group); }
          group.items.push({ ...b, sub });
        }
      }
    } else if (key.includes('connect') || key.includes('contact')) {
      for (const m of body.matchAll(/<a\s+href="([^"]+)"[\s\S]*?alt="([^"]+)"/g)) out.contacts.push({ label: m[2], url: m[1] });
      for (const m of body.matchAll(/(?<!!)\[([^\]]+)\]\(([^)]+)\)/g)) out.contacts.push({ label: mdText(m[1]), url: m[2] });
    }
  }
  return out;
}

// ── repos → project list ────────────────────────────────────
export function selectRepos(repos) {
  const ex = CONFIG.exclude.map(s => s.toLowerCase());
  let list = repos.filter(r => !r.fork && !r.private && !ex.includes(r.name.toLowerCase()));
  const tagged = list.filter(r => (r.topics || []).includes(CONFIG.topicShow));
  list = tagged.length ? tagged : list.filter(r => r.description);

  const isFeatured = r => (r.topics || []).includes(CONFIG.topicFeatured);

  list.sort((a, b) => (isFeatured(b) - isFeatured(a)) || (b.stargazers_count - a.stargazers_count) || (new Date(b.pushed_at) - new Date(a.pushed_at)));
  const norm = r => ({
    name: r.name, url: r.html_url, desc: r.description || '', lang: r.language || '', stars: r.stargazers_count || 0,
    forks: r.forks_count || 0, pushed: r.pushed_at, topics: r.topics || [], homepage: r.homepage || '',
    branch: r.default_branch || 'main', featured: isFeatured(r),
  });
  return list.slice(0, CONFIG.maxSphereRepos).map(norm);
}

// ── fetching with cache + fallback ──────────────────────────
async function fetchText(url) {
  const r = await fetch(url, { cache: 'no-cache' });
  if (!r.ok) throw new Error('HTTP ' + r.status);
  return r.text();
}

async function fetchReadme() {
  for (const br of CONFIG.readmeBranches) {
    try {
      const txt = await fetchText(`https://raw.githubusercontent.com/${CONFIG.username}/${CONFIG.readmeRepo}/${br}/README.md`);
      return { txt, source: `${CONFIG.readmeRepo}@${br}` };
    } catch (_) { /* try next */ }
  }
  throw new Error('README unreachable');
}

async function fetchRepos() {
  const r = await fetch(`https://api.github.com/users/${CONFIG.username}/repos?per_page=100&sort=pushed`, {
    headers: { Accept: 'application/vnd.github+json' },
  });
  if (!r.ok) throw new Error(r.status === 403 ? 'rate limited' : 'HTTP ' + r.status);
  return r.json();
}

function readCache() {
  try {
    const c = JSON.parse(sessionStorage.getItem(CACHE_KEY) || 'null');
    if (c && Date.now() - c.t < CONFIG.cacheTtl) return c;
  } catch (_) { /* storage blocked */ }
  return null;
}
function writeCache(readme, repos) {
  try { sessionStorage.setItem(CACHE_KEY, JSON.stringify({ t: Date.now(), readme, repos })); } catch (_) { /* ignore */ }
}

const ago = iso => {
  const m = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60000));
  return m < 1 ? 'just now' : m < 60 ? `${m}m ago` : m < 2880 ? `${Math.round(m / 60)}h ago` : `${Math.round(m / 1440)}d ago`;
};

/**
 * Loads everything. `log(text, status)` streams progress lines to the boot terminal.
 * Order: 1) data/snapshot.json on this site (refreshed hourly by the GitHub Action — no API calls)
 *        2) live GitHub, only if there is no snapshot (e.g. local dev before the first Action run)
 * Resolves to { profile, repos, featured, source }.
 */
export async function loadContent(log = () => {}) {
  let readme = null, repos = null, logos = {}, images = {}, source = 'OFFLINE';

  try {
    const t0 = performance.now();
    const r = await fetch('data/snapshot.json', { cache: 'no-cache' });
    if (!r.ok) throw new Error('HTTP ' + r.status);
    const raw = await r.text(); const snap = JSON.parse(raw);
    if (!snap.readme || !Array.isArray(snap.repos)) throw new Error('incomplete');
    readme = snap.readme; repos = snap.repos; logos = snap.logos || {}; images = snap.images || {};
    source = `SNAPSHOT · SYNCED ${ago(snap.fetchedAt).toUpperCase()}`;
    log(`GET /data/snapshot.json  ${(raw.length / 1024).toFixed(1)}KB ${Math.round(performance.now() - t0)}ms`, 'OK');
    log(`sync: github mirror ${ago(snap.fetchedAt)} · ${repos.length} repos`, 'OK');
  } catch (e) {
    log('snapshot unavailable (' + e.message + ')', 'WARN');
  }

  if ((!readme || !repos) && CONFIG.liveFallback) {
    const cached = readCache();
    if (cached) { readme = cached.readme; repos = cached.repos; source = 'LIVE · SESSION CACHE'; log('cache: session copy found', 'OK'); }
    else {
      const t0 = performance.now();
      const [rd, rp] = await Promise.allSettled([fetchReadme(), fetchRepos()]);
      const ms = Math.round(performance.now() - t0);
      if (rd.status === 'fulfilled') { readme = rd.value.txt; log(`GET ${rd.value.source}/README.md  ${(readme.length / 1024).toFixed(1)}KB ${ms}ms`, 'OK'); }
      else log('GET README.md  ' + rd.reason.message, 'WARN');
      if (rp.status === 'fulfilled' && Array.isArray(rp.value)) { repos = rp.value; log(`GET /users/${CONFIG.username}/repos  ${repos.length} found`, 'OK'); }
      else log('GET /repos  ' + (rp.reason ? rp.reason.message : 'bad payload'), 'WARN');
      if (readme && repos) { writeCache(readme, repos); source = 'LIVE · GITHUB'; }
    }
  }
  readme ||= ''; repos ||= [];

  const profile = parseReadme(readme);
  log(`parse: ${profile.sections} sections · ${profile.stack.reduce((n, g) => n + g.items.length, 0)} skills`, 'OK');

  const withImage = r => ({ ...r, logo: logos[r.name] || images[r.name] || '' }); // logo.png wins over the social preview
  const list = selectRepos(repos).map(withImage);
  // Flagship cards: every non-fork repo with the `featured` topic (whether or not it's tagged `portfolio`),
  // most-starred first, then most recently pushed.
  const ex = CONFIG.exclude.map(x => x.toLowerCase());
  const hidden = [CONFIG.topicShow, CONFIG.topicFeatured];
  const featured = repos
    .filter(r => !r.fork && !r.private && !ex.includes(r.name.toLowerCase()) && (r.topics || []).includes(CONFIG.topicFeatured))
    .sort((a, b) => (b.stargazers_count - a.stargazers_count) || (new Date(b.pushed_at) - new Date(a.pushed_at)))
    .map(r => ({
      name: r.name, url: r.homepage || r.html_url, repoUrl: r.html_url, desc: r.description || '',
      lang: r.language || '', stars: r.stargazers_count || 0,
      topics: (r.topics || []).filter(t => !hidden.includes(t)),
    }));
  log(`mount /projects  ${list.length} repos · ${featured.length} flagship`, 'OK');
  return { profile, repos: list, featured, source };
}
