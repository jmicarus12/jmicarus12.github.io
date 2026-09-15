/* ---------------------------------------------------------------
   GitHub Pages Lab - live capability probes
   Every check below runs in YOUR browser against the live site.
   Nothing here runs on a server, because GitHub Pages has no
   server you can run code on. That is the whole point.
   --------------------------------------------------------------- */

/** Render one result into a <article class="test" id="..."> card. */
function report(id, state, text) {
  const el = document.getElementById(id);
  if (!el) return;
  el.dataset.state = state;
  el.querySelector('.status').textContent =
    { pass: 'WORKS', fail: 'BLOCKED', warn: 'CAVEAT', run: 'RUNNING' }[state] || state;
  el.querySelector('output').textContent = text;
}

/* 1. Is the site served over HTTPS with a real certificate?
      github.io ships free TLS, including on custom domains. */
function testHttps() {
  const secure = location.protocol === 'https:';
  const local = ['localhost', '127.0.0.1', ''].includes(location.hostname);
  if (secure) {
    report('t-https', 'pass', `${location.protocol}//${location.host}\nisSecureContext: ${window.isSecureContext}`);
  } else if (local) {
    report('t-https', 'warn', `Running locally (${location.href}).\nPublish to github.io to see real TLS.`);
  } else {
    report('t-https', 'fail', `Served over ${location.protocol} - no certificate.`);
  }
}

/* 2. Static files as a read-only API.
      A committed .json file is fetchable. This is the closest thing
      to a "database" Pages gives you: read-only, public, cached. */
async function testStaticJson() {
  try {
    const res = await fetch('data/posts.json', { cache: 'no-store' });
    const json = await res.json();
    const server = res.headers.get('server') || '(header hidden by browser)';
    report('t-json', 'pass',
      `GET data/posts.json -> ${res.status}\n` +
      `server: ${server}\n` +
      `${json.posts.length} records parsed, updated ${json.updated}`);
    renderPosts(json.posts);
  } catch (err) {
    report('t-json', 'fail', `Fetch failed: ${err.message}\n(Are you opening the file with file:// ? Use a local server.)`);
  }
}

/* 3. Can we POST? No. There is no application server to receive it.
      GitHub's static host answers anything that is not GET/HEAD with
      an error - so no form handling, no sign-ups, no webhooks. */
async function testPost() {
  try {
    const res = await fetch('data/posts.json', {
      method: 'POST',
      body: JSON.stringify({ title: 'written from the browser' }),
      headers: { 'Content-Type': 'application/json' }
    });
    if (res.ok) {
      report('t-post', 'warn', `Unexpected ${res.status}. The response was not persisted - the file in git is unchanged.`);
    } else {
      report('t-post', 'fail', `POST data/posts.json -> ${res.status} ${res.statusText}\nThe host is read-only. Writes must go to a separate backend.`);
    }
  } catch (err) {
    report('t-post', 'fail', `POST rejected at the network layer: ${err.message}\nNothing on Pages can accept a write.`);
  }
}

/* 4. Server-side languages. There is no PHP/Node/Python runtime.
      A .php file is handed back as plain text instead of executing. */
async function testServerSide() {
  try {
    const res = await fetch('demo.php', { cache: 'no-store' });
    if (!res.ok) {
      report('t-server', 'fail', `GET demo.php -> ${res.status}. Either way, Pages never executes server code.`);
      return;
    }
    const body = (await res.text()).trim();
    const executed = !body.includes('<?php');
    report('t-server', executed ? 'warn' : 'fail',
      executed
        ? 'The PHP tags are gone - that should never happen on Pages.'
        : `demo.php came back as raw source, unexecuted:\n${body.split('\n')[0]}\n...\nNo PHP, Node, Python, Ruby or database runs here.`);
  } catch (err) {
    report('t-server', 'fail', `Could not read demo.php: ${err.message}`);
  }
}

/* 5. Calling somebody else's API from the browser.
      Works only if THAT server sends CORS headers. You cannot add a
      proxy, and you cannot hide an API key in the page. */
async function testCors() {
  const friendly = 'https://api.github.com/repos/github/docs';
  const hostile  = 'https://example.com/';
  let out = '';
  try {
    const res = await fetch(friendly);
    const j = await res.json();
    out += `OK  ${friendly}\n    CORS allowed -> "${j.full_name}", ${j.stargazers_count} stars\n`;
  } catch (err) {
    out += `ERR ${friendly}\n    ${err.message} (rate limit or offline)\n`;
  }
  try {
    await fetch(hostile, { mode: 'cors' });
    out += `OK  ${hostile}\n    unexpectedly allowed`;
    report('t-cors', 'warn', out);
  } catch (err) {
    out += `ERR ${hostile}\n    blocked by CORS - no Access-Control-Allow-Origin header.\n    A backend would proxy this. Pages cannot.`;
    report('t-cors', 'warn', out);
  }
}

/* 6. Client-side persistence. localStorage lives in ONE browser.
      It is not shared, not backed up, and Pages cannot read it. */
function testStorage() {
  try {
    const key = 'gh-pages-lab-visits';
    const n = Number(localStorage.getItem(key) || 0) + 1;
    localStorage.setItem(key, String(n));
    report('t-storage', 'warn',
      `Visit #${n} from THIS browser profile.\n` +
      `Open the site in a private window and the counter restarts at 1.\n` +
      `There is no shared counter without a backend.`);
  } catch (err) {
    report('t-storage', 'fail', `localStorage unavailable: ${err.message}`);
  }
}

/* 7. Deep links / client-side routing.
      Pages maps URL paths to real files. A route with no file 404s on
      a hard refresh, which is the classic SPA-on-Pages trap. */
async function testRouting() {
  const ghost = 'this-route-has-no-file-' + Date.now();
  try {
    const res = await fetch(ghost, { cache: 'no-store' });
    const isCustom = (await res.text()).includes('gh-pages-lab-404');
    report('t-routing', 'warn',
      `GET /${ghost} -> ${res.status}\n` +
      (isCustom
        ? 'Served by our own 404.html.\n'
        : 'Served by the default GitHub 404 page (publish 404.html to override).\n') +
      'Deep links only work for paths that exist as files on disk.');
  } catch (err) {
    report('t-routing', 'fail', err.message);
  }
}

/* 8. Secrets. Everything shipped is public source. Prove it by
      reading this very script back out of the network. */
async function testSecrets() {
  try {
    const res = await fetch('lab.js', { cache: 'no-store' });
    const src = await res.text();
    report('t-secrets', 'warn',
      `Anyone can download this script (${(src.length / 1024).toFixed(1)} KB) and read every line.\n` +
      `A private repo can publish a public site, but the published FILES are always public.\n` +
      `Never commit an API key, token or password.`);
  } catch (err) {
    report('t-secrets', 'fail', err.message);
  }
}

/* Render the JSON "API" into a table, so the fetch has a visible payoff. */
function renderPosts(posts) {
  const tbody = document.querySelector('#posts tbody');
  if (!tbody) return;
  tbody.innerHTML = posts.map(p => `
    <tr>
      <td><code>${p.id}</code></td>
      <td>${p.title}</td>
      <td>${p.date}</td>
      <td>${p.tags.join(', ')}</td>
    </tr>`).join('');
}

/* Mark the current page in the nav without a framework. */
function markNav() {
  const here = location.pathname.split('/').pop() || 'index.html';
  document.querySelectorAll('nav.site a').forEach(a => {
    if (a.getAttribute('href') === here) a.setAttribute('aria-current', 'page');
  });
}

function runAll() {
  document.querySelectorAll('.test').forEach(el => report(el.id, 'run', 'running...'));
  testHttps(); testStaticJson(); testPost(); testServerSide();
  testCors(); testStorage(); testRouting(); testSecrets();
}

document.addEventListener('DOMContentLoaded', () => {
  markNav();
  const stamp = document.getElementById('loaded-at');
  if (stamp) stamp.textContent = new Date().toLocaleString();
  if (document.querySelector('.test')) runAll();
  const btn = document.getElementById('rerun');
  if (btn) btn.addEventListener('click', runAll);
});
