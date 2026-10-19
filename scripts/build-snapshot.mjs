// Builds data/snapshot.json from GitHub: profile README + public repos (+ which repos have a logo.png).
// Run by .github/workflows/pages.yml every hour and on every push. Node 18+, no dependencies.
//   node scripts/build-snapshot.mjs
// Uses GITHUB_TOKEN when present (5,000 req/h); works unauthenticated too (60 req/h).
import { writeFile, mkdir } from 'node:fs/promises';
import { CONFIG } from '../js/config.js';

const user = CONFIG.username;
const headers = { 'User-Agent': `${user}-portfolio-snapshot`, Accept: 'application/vnd.github+json' };
if (process.env.GITHUB_TOKEN) headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;

async function gh(path, accept) {
  const r = await fetch(`https://api.github.com${path}`, { headers: accept ? { ...headers, Accept: accept } : headers });
  if (!r.ok) throw new Error(`${path} → HTTP ${r.status} ${await r.text().catch(() => '')}`.slice(0, 300));
  return accept ? r.text() : r.json();
}

const readme = await gh(`/repos/${user}/${CONFIG.readmeRepo}/readme`, 'application/vnd.github.raw');
const repos = await gh(`/users/${user}/repos?per_page=100&sort=pushed`);
if (!Array.isArray(repos)) throw new Error('unexpected repos payload');

// Which repos ship a logo.png at their root? (checked here once, so visitors never probe)
const logos = {};
await Promise.all(repos.filter(r => !r.fork).map(async r => {
  const url = `https://raw.githubusercontent.com/${user}/${r.name}/${r.default_branch}/logo.png`;
  try { const h = await fetch(url, { method: 'HEAD' }); if (h.ok) logos[r.name] = url; } catch (_) { /* ignore */ }
}));

const keep = r => ({
  name: r.name, html_url: r.html_url, description: r.description, fork: r.fork, archived: r.archived,
  language: r.language, topics: r.topics || [], stargazers_count: r.stargazers_count, forks_count: r.forks_count,
  pushed_at: r.pushed_at, homepage: r.homepage, default_branch: r.default_branch,
});

const snapshot = { fetchedAt: new Date().toISOString(), user, readme, repos: repos.map(keep), logos };
await mkdir(new URL('../data/', import.meta.url), { recursive: true });
await writeFile(new URL('../data/snapshot.json', import.meta.url), JSON.stringify(snapshot) + '\n');
console.log(`snapshot: README ${(readme.length / 1024).toFixed(1)}KB · ${repos.length} repos · ${Object.keys(logos).length} logos · ${snapshot.fetchedAt}`);
