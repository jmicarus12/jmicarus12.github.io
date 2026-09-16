/* ===============================================================
   Portfolio behaviour. ~70 lines, no dependencies.
   Mobile nav, active link, scroll reveal, skill-icon fallback.
   =============================================================== */

/* Tell the stylesheet JavaScript is running, so the scroll-reveal styles switch on.
   Done first, before paint, because everything is visible by default without it. */
document.documentElement.classList.add('js');

/* Mark the nav link for the page we are on. Works at any depth. */
(function activeNav() {
  document.addEventListener('DOMContentLoaded', () => {
    const here = (location.pathname.split('/').pop() || 'index.html').toLowerCase();
    document.querySelectorAll('nav.site a').forEach(a => {
      const href = (a.getAttribute('href') || '').toLowerCase();
      if (href === here || (here === '' && href === 'index.html')) {
        a.setAttribute('aria-current', 'page');
      }
    });
  });
})();

/* Mobile menu. The nav is hidden with [hidden] so it stays accessible. */
document.addEventListener('DOMContentLoaded', () => {
  const btn = document.querySelector('.navtoggle');
  const nav = document.querySelector('nav.site');
  if (!btn || !nav) return;

  const small = () => window.matchMedia('(max-width: 720px)').matches;
  const sync = () => { nav.hidden = small(); btn.setAttribute('aria-expanded', 'false'); };

  btn.addEventListener('click', () => {
    const open = !nav.hidden;
    nav.hidden = open;
    btn.setAttribute('aria-expanded', String(!open));
  });
  nav.addEventListener('click', e => { if (e.target.tagName === 'A' && small()) sync(); });
  window.addEventListener('resize', sync);
  sync();
});

/* Reveal elements as they scroll in. Falls back to "just show it". */
document.addEventListener('DOMContentLoaded', () => {
  const items = document.querySelectorAll('.rv');
  if (!('IntersectionObserver' in window)) {
    items.forEach(el => el.classList.add('in'));
    return;
  }
  const io = new IntersectionObserver((entries, obs) => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      entry.target.classList.add('in');
      obs.unobserve(entry.target);
    });
  }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });

  items.forEach((el, i) => {
    el.style.transitionDelay = Math.min(i % 8, 7) * 45 + 'ms';
    io.observe(el);
  });

  /* Belt and braces: if anything is still hidden shortly after load (observer
     never fired, page restored from cache, odd browser), just show it. */
  setTimeout(() => items.forEach(el => el.classList.add('in')), 1600);
});

/* Skill logos come from the Devicon CDN. If one is missing (or the CDN is
   blocked) swap in a lettered tile so the grid never shows a broken image. */
document.addEventListener('DOMContentLoaded', () => {
  document.querySelectorAll('.skill img').forEach(img => {
    const swap = () => {
      const name = img.getAttribute('alt') || '?';
      const initials = name.replace(/[^A-Za-z0-9 ]/g, '')
        .split(/\s+/).map(w => w[0]).join('').slice(0, 2).toUpperCase();
      const box = document.createElement('div');
      box.className = 'fallback';
      box.textContent = initials || name[0].toUpperCase();
      box.setAttribute('aria-hidden', 'true');
      img.replaceWith(box);
    };
    img.addEventListener('error', swap, { once: true });
    if (img.complete && img.naturalWidth === 0) swap();
  });
});

/* Footer year, so the site does not quietly go stale. */
document.addEventListener('DOMContentLoaded', () => {
  document.querySelectorAll('[data-year]').forEach(el => {
    el.textContent = new Date().getFullYear();
  });
});

/* Screenshot lightbox. Progressive enhancement: with JS off the thumbnails are
   still plain links straight to the full-size image. */
document.addEventListener('DOMContentLoaded', () => {
  const shots = Array.from(document.querySelectorAll('.shot'));
  if (!shots.length) return;

  const box = document.createElement('div');
  box.className = 'lb';
  box.hidden = true;
  box.setAttribute('role', 'dialog');
  box.setAttribute('aria-modal', 'true');
  box.setAttribute('aria-label', 'Screenshot viewer');
  box.innerHTML =
    '<button class="close" type="button" aria-label="Close">&times;</button>' +
    '<button class="prev" type="button" aria-label="Previous">&#8249;</button>' +
    '<button class="next" type="button" aria-label="Next">&#8250;</button>' +
    '<div><img alt=""><p class="cap"></p><p class="count"></p></div>';
  document.body.appendChild(box);

  const img = box.querySelector('img');
  const cap = box.querySelector('.cap');
  const count = box.querySelector('.count');
  let at = 0;
  let lastFocus = null;

  const show = (i) => {
    at = (i + shots.length) % shots.length;
    const link = shots[at];
    const thumb = link.querySelector('img');
    img.src = link.getAttribute('href');
    img.alt = thumb ? thumb.alt : '';
    cap.innerHTML = '<b>' + (link.dataset.title || '') + '</b>' + (link.dataset.note || '');
    count.textContent = (at + 1) + ' / ' + shots.length;
  };

  const open = (i, trigger) => {
    lastFocus = trigger || document.activeElement;
    show(i);
    box.hidden = false;
    document.body.style.overflow = 'hidden';
    box.querySelector('.close').focus();
  };

  const close = () => {
    box.hidden = true;
    img.src = '';
    document.body.style.overflow = '';
    if (lastFocus) lastFocus.focus();
  };

  shots.forEach((link, i) => {
    link.addEventListener('click', (e) => { e.preventDefault(); open(i, link); });
  });

  box.querySelector('.close').addEventListener('click', close);
  box.querySelector('.prev').addEventListener('click', () => show(at - 1));
  box.querySelector('.next').addEventListener('click', () => show(at + 1));
  box.addEventListener('click', (e) => { if (e.target === box) close(); });

  document.addEventListener('keydown', (e) => {
    if (box.hidden) return;
    if (e.key === 'Escape') close();
    if (e.key === 'ArrowLeft') show(at - 1);
    if (e.key === 'ArrowRight') show(at + 1);
  });
});
