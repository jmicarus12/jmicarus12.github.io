# jmicarus12.github.io

Personal site of **Brisbane Bacalla Jr** — full-stack PHP / Laravel developer, Cebu, Philippines.

**Live:** https://jmicarus12.github.io/

Plain HTML and CSS. No framework, no build step, no dependencies — which is exactly what
GitHub Pages is good at.

## Pages

| File | Contents |
|---|---|
| `index.html` | Introduction, quick stats, and the skills grid |
| `experience.html` | Work history as a zigzag timeline, plus education |
| `projects.html` | Beeforce CMS + Payroll, HANDS, DNA, and the Pages Lab |
| `contact.html` | Email, LinkedIn, GitHub, Facebook |
| `404.html` | Custom not-found page (uses absolute paths — it can be served at any depth) |
| `lab/` | The self-testing GitHub Pages demo: live probes of what static hosting can and cannot do |

## Editing it

Each page is standalone HTML, so the header and footer markup is repeated in all four.
Change the nav in one and change it in the others too — that is the trade-off for having
no build step.

- **Text and content** — edit the HTML directly.
- **Colours** — the whole theme is CSS custom properties at the top of `assets/css/style.css`
  (`--bg`, `--blue`, `--surface`, …). Change those, not the rules below them.
- **Skills** — each tile is one `<div class="skill">` in `index.html`. Logos load from the
  Devicon CDN; if a logo is missing or the CDN is blocked, `assets/js/site.js` swaps in a
  lettered monogram, so the grid never breaks.
- **Animation** — the fade-in is gated on `html.js`. With JavaScript off, every element is
  simply visible; nothing on the site depends on scripts to be readable.

## Adding your resume as a download

Not included by default, because the PDF contains a phone number and home address.
To publish it anyway:

```bash
cp ~/Documents/"Bacalla Resume.pdf" assets/Brisbane-Bacalla-Resume.pdf
# then add a link, e.g. in the hero of index.html:
#   <a class="btn btn-ghost" href="assets/Brisbane-Bacalla-Resume.pdf" download>Resume (PDF)</a>
```

## Local preview

```bash
python3 -m http.server 8000
# open http://localhost:8000
```

Use a server rather than opening the files directly — the lab's `fetch()` probes do not work
over `file://`.

## Deploy

Settings → Pages → Source: **Deploy from a branch** → `main` / `/ (root)`.
Then `git push`; the site updates in about a minute.
