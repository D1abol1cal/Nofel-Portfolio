# D1abol1cal — Portfolio

A terminal / deep-space portfolio in **plain HTML, CSS and vanilla JavaScript**. There's no build step, so it runs directly on GitHub Pages.

Content comes from GitHub, **refreshed once an hour**. Visitors never call the GitHub API:

- **Profile README** ([D1abol1cal/D1abol1cal](https://github.com/D1abol1cal/D1abol1cal)) → name, roles, About, highlights, tech stack, contact links
- **Public repos** → the 3D project sphere and the flagship cards

`.github/workflows/pages.yml` runs every hour (and on every push). It fetches both into `data/snapshot.json` and deploys the site with that file included. The site only reads `data/snapshot.json` from its own domain.

Edit your README or repo topics on GitHub, and the site picks it up within the hour. To update it immediately, open **Actions → Refresh data & deploy → Run workflow**.

### One-time setup
1. Repo **Settings → Pages → Build and deployment → Source: GitHub Actions**.
2. Make sure `.github/workflows/pages.yml` is committed.

Scheduled workflows pause if the repo has no activity for 60 days. GitHub emails you first, and one click in the Actions tab re-enables it. Push and manual runs always work.

## Controlling which projects show

| You do this on GitHub | Effect |
|---|---|
| Add topic `portfolio` to repos | Once **any** repo has it, **only** tagged repos appear in the sphere |
| Add topic `featured` | Repo becomes a flagship card at the top |
| List it under **⭐ LATEST PROJECTS** in your profile README | Also a flagship card, shown first |
| Add a `logo.png` to the repo root | Used as that repo's tile image in the sphere (picked up on the next hourly run) |

Until you tag anything, every non-fork repo with a description is shown, except those in `exclude` in `js/config.js`.

## README format the parser expects

Keep these `##` headings. Emoji are fine and get stripped automatically:

- `# Hi there! 👋 I'm <Name>`
- `## About Me`: one paragraph, then `- Label: value` bullets
- `## Latest Projects`: the 2-column table (`**[Title - Subtitle](url)**<br/>description … badges`)
- `## Highlights`: header row = titles, second row = text
- `## Tech Stack`: `**Group**` lines, optional `*Sub:*` lines, then shields.io badges (`logo=` gives the icon)
- `## Connect With Me`: `<a href="…"><img alt="GitHub" …></a>` links

The roles come from the `readme-typing-svg` badge's `lines=` parameter.

## Files

```
index.html          shell (boot screen, status bar, dock, palette)
css/style.css       all styling
js/config.js        ← the only file you normally edit
js/github.js        loads data/snapshot.json and parses the README (falls back to live GitHub only if the snapshot is missing)
js/boot.js          boot terminal + moving grid
js/starfield.js     WebGL starfield (spin + drift + parallax)
js/sphere.js        WebGL project sphere
js/gallery.js       WebGL curved skills carousel
js/audio.js         synthesized hover/click sounds + ambient music
js/pages/*.js       About · Projects · Skills · Contact
vendor/ogl.min.mjs  OGL (tiny WebGL library, Unlicense), bundled locally
data/snapshot.json  README + repos, rewritten hourly by the workflow
scripts/build-snapshot.mjs   the fetch script the workflow runs (node scripts/build-snapshot.mjs)
.github/workflows/pages.yml  hourly refresh + deploy
```

## Notes

- Routes are hash-based (`#/about`, `#/projects` …), so deep links work on GitHub Pages without a 404 workaround.
- The boot log shows where content came from and how old it is, e.g. `SOURCE: SNAPSHOT · SYNCED 23M AGO`.
- If a refresh fails (GitHub hiccup), the workflow deploys the previous snapshot, so the site never breaks.
- Shortcuts: <kbd>Ctrl</kbd>+<kbd>K</kbd> opens the command palette; <kbd>Enter</kbd>/<kbd>Esc</kbd> skips the boot sequence.

## Run locally

Any static server works, for example `python3 -m http.server`, then open http://localhost:8000. ES modules don't load from `file://`.
