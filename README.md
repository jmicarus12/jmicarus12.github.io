# jmicarus12.github.io

A self-testing GitHub Pages template. Every page demonstrates the platform rather than
describing it: the home page fires live probes at the deployed site and reports which
capabilities exist and which do not.

**Live:** https://jmicarus12.github.io/

## Files, and what each one teaches

| File | Why it is here |
|---|---|
| `index.html` | Eight live capability probes, plus a table populated by `fetch()` |
| `limits.html` | Published quotas and a can/can't table |
| `how-it-works.html` | Deploys, Jekyll, base paths, custom domains, common traps |
| `404.html` | Delete it and GitHub's default 404 comes back |
| `demo.php` | Proof no server-side code runs — it is served as plain text |
| `data/posts.json` | A static file acting as a read-only API |
| `.nojekyll` | Stops Jekyll from processing (and dropping) files |
| `assets/css/style.css` | Plain CSS, light + dark, no build step |
| `assets/js/app.js` | The probes; commented so it reads as documentation |

## Learn by breaking it

- Delete `404.html`, push, visit a bad URL → GitHub's default 404.
- Delete `.nojekyll`, rename `assets/` to `_assets/`, push → the styles vanish.
- Change a leading `/` into a relative path (or back) to feel the project-site path trap.
- Edit `data/posts.json`, push → the table changes without touching any HTML.
- Add `<form action="/submit" method="post">` → nothing receives it. There is no server.

## Local preview

`fetch()` will not work from `file://`, so serve it:

```bash
python3 -m http.server 8000
# open http://localhost:8000
```

## Publish

Settings → Pages → Source: **Deploy from a branch** → `main` / `/ (root)` → Save.
Then `git push`, wait about a minute, and reload.
