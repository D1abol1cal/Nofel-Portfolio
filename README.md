# D1abol1cal — Portfolio

A terminal / deep-space portfolio in **plain HTML, CSS and vanilla JavaScript**. There's no build step, so it runs directly on GitHub Pages.

The site **boots live from GitHub on every visit**:

- **Profile README** ([D1abol1cal/D1abol1cal](https://github.com/D1abol1cal/D1abol1cal)) → name, roles, About, highlights, tech stack, contact links
- **Public repos** (GitHub API) → the 3D project sphere and the flagship cards

Edit your README or your repo topics on GitHub, and the site updates on the next visit.

## Controlling which projects show

| You do this on GitHub | Effect |
|---|---|
| Add topic `portfolio` to repos | Once **any** repo has it, **only** tagged repos appear in the sphere |
| Add topic `featured` | Repo becomes a flagship card at the top |
| List it under **⭐ LATEST PROJECTS** in your profile README | Also a flagship card, shown first |
| Add a `logo.png` to the repo root | Used as that repo's tile image in the sphere |

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
js/github.js        README + repo fetching/parsing, session cache, offline fallback
js/boot.js          boot terminal + moving grid
js/starfield.js     WebGL starfield (spin + drift + parallax)
js/sphere.js        WebGL project sphere
js/gallery.js       WebGL curved skills carousel
js/audio.js         synthesized hover/click sounds + ambient music
js/pages/*.js       About · Projects · Skills · Contact
vendor/ogl.min.mjs  OGL (tiny WebGL library, Unlicense), bundled locally
data/               offline snapshots, used only if GitHub is unreachable
```

## Notes

- Routes are hash-based (`#/about`, `#/projects` …), so deep links work on GitHub Pages without a 404 workaround.
- GitHub allows 60 unauthenticated API calls per hour per visitor IP. The site makes one per visit and caches it for the session.
- If GitHub can't be reached, the `data/` snapshots are used and the boot log shows `SOURCE: LOCAL SNAPSHOT`. Refresh them occasionally.
- Shortcuts: <kbd>Ctrl</kbd>+<kbd>K</kbd> opens the command palette; <kbd>Enter</kbd>/<kbd>Esc</kbd> skips the boot sequence.

## Run locally

Any static server works, for example `python3 -m http.server`, then open http://localhost:8000. ES modules don't load from `file://`.
