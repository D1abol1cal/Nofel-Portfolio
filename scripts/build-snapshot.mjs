// Builds data/snapshot.json from GitHub: profile README + public repos (+ which repos have a logo.png).
// Run by .github/workflows/pages.yml every hour and on every push. Node 18+, no dependencies.
//   node scripts/build-snapshot.mjs
// Uses GITHUB_TOKEN when present (5,000 req/h); works unauthenticated too (60 req/h).
import { writeFile, mkdir, rm } from 'node:fs/promises';
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
const all = await gh(`/users/${user}/repos?per_page=100&sort=pushed&type=owner`);
if (!Array.isArray(all)) throw new Error('unexpected repos payload');
// Public repos only — this endpoint already returns only public repos, but never let a private one through.
const repos = all.filter(r => r.private === false && (r.visibility ?? 'public') === 'public');

// Which repos ship a logo.png at their root? (checked here once, so visitors never probe)
const logos = {};
await Promise.all(repos.filter(r => !r.fork).map(async r => {
  const url = `https://raw.githubusercontent.com/${user}/${r.name}/${r.default_branch}/logo.png`;
  try { const h = await fetch(url, { method: 'HEAD' }); if (h.ok) logos[r.name] = url; } catch (_) { /* ignore */ }
}));

// Custom "Social preview" images (repo Settings → Social preview). Only GraphQL exposes these, and
// GraphQL needs a token — the Action's GITHUB_TOKEN works. Images are downloaded and published with the
// site (same origin), because GitHub's image host doesn't allow cross-origin use in WebGL.
const images = {};
if (process.env.GITHUB_TOKEN) {
  try {
    const q = `query($login: String!) { user(login: $login) { repositories(first: 100, ownerAffiliations: OWNER, privacy: PUBLIC) {
      nodes { name usesCustomOpenGraphImage openGraphImageUrl } } } }`;
    const r = await fetch('https://api.github.com/graphql', { method: 'POST', headers: { ...headers, 'Content-Type': 'application/json' }, body: JSON.stringify({ query: q, variables: { login: user } }) });
    const nodes = (await r.json())?.data?.user?.repositories?.nodes || [];
    const dir = new URL('../data/repo-images/', import.meta.url);
    await rm(dir, { recursive: true, force: true }); await mkdir(dir, { recursive: true });
    await Promise.all(nodes.filter(n => n.usesCustomOpenGraphImage && !logos[n.name]).map(async n => {
      try {
        const img = await fetch(n.openGraphImageUrl);
        const type = img.headers.get('content-type') || '';
        const buf = Buffer.from(await img.arrayBuffer());
        if (!img.ok || !type.startsWith('image/') || buf.length > 3_000_000) return;
        const ext = type.includes('png') ? 'png' : type.includes('webp') ? 'webp' : type.includes('gif') ? 'gif' : 'jpg';
        const file = `${n.name.replace(/[^A-Za-z0-9._-]/g, '_')}.${ext}`;
        await writeFile(new URL(file, dir), buf);
        images[n.name] = `data/repo-images/${file}`;
      } catch (_) { /* skip this image */ }
    }));
  } catch (e) { console.warn('social preview lookup skipped:', e.message); }
}

const keep = r => ({
  name: r.name, html_url: r.html_url, description: r.description, fork: r.fork, archived: r.archived,
  language: r.language, topics: r.topics || [], stargazers_count: r.stargazers_count, forks_count: r.forks_count,
  pushed_at: r.pushed_at, homepage: r.homepage, default_branch: r.default_branch,
});

const snapshot = { fetchedAt: new Date().toISOString(), user, readme, repos: repos.map(keep), logos, images };
await mkdir(new URL('../data/', import.meta.url), { recursive: true });
await writeFile(new URL('../data/snapshot.json', import.meta.url), JSON.stringify(snapshot) + '\n');
console.log(`snapshot: README ${(readme.length / 1024).toFixed(1)}KB · ${repos.length} repos · ${Object.keys(logos).length} logos · ${Object.keys(images).length} social previews · ${snapshot.fetchedAt}`);
