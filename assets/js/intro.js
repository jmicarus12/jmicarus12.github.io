/* ===================================================================
   Intro sequence — Brisbane Bacalla Jr

   An atom that becomes the page. A dot swells into a nucleus while the
   stack marks spiral out into three tilted electron shells; the spin
   eases off, the name resolves, and then the whole atom flies into the
   hero orbit it was standing in front of and keeps turning there.

   The marks are CLONES of the real hero orbit chips, so index.html
   stays the single source of truth for which stacks appear. Nothing
   here is required for the page to work — with scripts off you get the
   hero, orbit and all.

   Adapted from the intro in the edjen project, restyled as an atom:
   three shells instead of one ring, and the whole arrangement lands as
   a unit with a crossfade rather than matching each mark to a slot.

   Plays on every visit. Skippable with the button, Esc, Space, Enter
   or a click on the backdrop. Never runs under prefers-reduced-motion.
   =================================================================== */
(function () {
  "use strict";

  var SEQ = {
    grow:   1500,   /* dot -> nucleus, marks spiral out       */
    ease:    750,   /* fast spin eases to a drift             */
    text:    550,   /* name, rule, subtitle resolve           */
    hold:    520,   /* the beat you read it on                */
    settle: 1150    /* the atom flies into the hero           */
  };
  var T1 = SEQ.grow;
  var T2 = T1 + SEQ.ease;
  var T3 = T2 + SEQ.text;
  var T4 = T3 + SEQ.hold;
  var T5 = T4 + SEQ.settle;

  var reduced = window.matchMedia &&
                window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  function clamp01(v) { return v < 0 ? 0 : v > 1 ? 1 : v; }
  function lerp(a, b, t) { return a + (b - a) * t; }
  function outCubic(t) { return 1 - Math.pow(1 - t, 3); }
  function outQuint(t) { return 1 - Math.pow(1 - t, 5); }
  function inOutCubic(t) { return t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; }
  function outBack(t) { var c = 1.22; return 1 + (c + 1) * Math.pow(t - 1, 3) + c * Math.pow(t - 1, 2); }

  var running = false;

  function play() {
    var atom = document.getElementById("heroatom");
    if (running || !atom) { return; }
    var rings = atom.querySelectorAll(".ring");
    var coreImg = atom.querySelector(".core img");
    if (!rings.length) { return; }

    running = true;
    document.documentElement.classList.add("intro-run", "intro-landing");
    document.documentElement.classList.remove("intro-settle");
    window.scrollTo(0, 0);

    /* ---- overlay --------------------------------------------------- */
    var el = document.createElement("div");
    el.id = "intro";
    el.setAttribute("role", "presentation");
    el.innerHTML =
      '<div class="bg"></div>' +
      '<div class="grid"></div>' +
      '<div class="world">' +
        '<div class="shells"></div>' +
        '<div class="nucleus"><span class="sheen"></span></div>' +
      '</div>' +
      '<div class="copy">' +
        '<h2>Brisbane Bacalla Jr</h2>' +
        '<div class="rule"></div>' +
        '<span class="sub">PHP &middot; Laravel Developer</span>' +
      '</div>' +
      '<button class="skipbtn" type="button">Skip</button>';
    document.body.appendChild(el);

    var bg      = el.querySelector(".bg");
    var gridEl  = el.querySelector(".grid");
    var world   = el.querySelector(".world");
    var shellBox= el.querySelector(".shells");
    var nucleus = el.querySelector(".nucleus");
    var sheen   = el.querySelector(".sheen");
    var copy    = el.querySelector(".copy");
    var head    = el.querySelector(".copy h2");
    var rule    = el.querySelector(".copy .rule");
    var sub     = el.querySelector(".copy .sub");
    var skip    = el.querySelector(".skipbtn");

    /* the portrait rides inside the nucleus and fades up as it lands */
    var photo = null;
    if (coreImg) {
      photo = document.createElement("img");
      photo.src = coreImg.currentSrc || coreImg.src;
      photo.alt = "";
      nucleus.appendChild(photo);
    }

    /* ---- one shell per hero ring, marks cloned from the real chips -- */
    var TILTS = [14, -22, 34];          /* degrees, so the shells cross */
    var shells = [];
    Array.prototype.forEach.call(rings, function (ring, si) {
      var chips = ring.querySelectorAll(".chip");
      var path = document.createElement("div");
      path.className = "path";
      shellBox.appendChild(path);

      var marks = Array.prototype.map.call(chips, function (c) {
        var m = document.createElement("div");
        m.className = "mark";
        m.appendChild(c.cloneNode(true));
        shellBox.appendChild(m);
        return m;
      });

      shells.push({
        path: path,
        marks: marks,
        n: marks.length,
        tilt: TILTS[si % TILTS.length] * Math.PI / 180,
        dir: si === 1 ? -1 : 1,          /* middle shell counter-rotates */
        rad: 0.62 + si * 0.19,           /* fraction of R                */
        theta: -Math.PI / 2 + si * 0.7
      });
    });

    /* ---- geometry --------------------------------------------------- */
    var vw, vh, cx, cy, R, D, S;
    function measure() {
      vw = window.innerWidth;
      vh = window.innerHeight;
      cx = vw / 2;
      cy = vh * 0.44;
      R = Math.min(vw * 0.30, vh * 0.33);
      D = Math.min(vw * 0.17, vh * 0.19);     /* nucleus diameter */
      S = Math.max(34, Math.min(vw * 0.062, 52));
    }

    /* where the atom is going: the live hero orbit */
    var dest = null;
    function captureDest() {
      var r = atom.getBoundingClientRect();
      var c = atom.querySelector(".core").getBoundingClientRect();
      dest = {
        cx: r.left + r.width / 2,
        cy: r.top + r.height / 2,
        R: r.width / 2,
        core: c.width
      };
    }

    /* 3D point on a tilted circular shell */
    var tmp = [0, 0, 0];
    function shellPoint(a, r, tilt, out) {
      var ca = Math.cos(a), sa = Math.sin(a);
      out[0] = r * ca;
      out[1] = r * sa * Math.sin(tilt);
      out[2] = r * sa * Math.cos(tilt);
    }

    /* ---- render one moment ------------------------------------------ */
    var settled = false;

    function render(e) {
      var pGrow   = clamp01(e / T1);
      var pEase   = clamp01((e - T1) / SEQ.ease);
      var pText   = clamp01((e - T2) / SEQ.text);
      var pSettle = clamp01((e - T4) / SEQ.settle);
      var gE = outQuint(pGrow);

      if (pSettle > 0 && !dest) { captureDest(); }

      /* hand the page back while the backdrop is still clearing */
      if (pSettle >= 0.12 && !settled) {
        settled = true;
        document.documentElement.classList.remove("intro-run");
        document.documentElement.classList.add("intro-settle");
      }

      bg.style.opacity     = (1 - clamp01((pSettle - 0.10) / 0.55)).toFixed(3);
      gridEl.style.opacity = (1 - clamp01(pSettle / 0.40)).toFixed(3);
      copy.style.opacity   = (1 - clamp01(pSettle / 0.32)).toFixed(3);
      skip.style.opacity   = (1 - clamp01(pSettle / 0.25)).toFixed(3);

      /* the atom travels and shrinks into the hero orbit as one unit */
      var ax = cx, ay = cy, aR = R, nD = D;
      if (pSettle > 0 && dest) {
        var mE = inOutCubic(pSettle);
        ax = lerp(cx, dest.cx, mE);
        ay = lerp(cy, dest.cy, mE);
        aR = lerp(R, dest.R, mE);
        nD = lerp(D, dest.core, mE);
        /* crossfade to the real hero orbit rather than matching each chip */
        world.style.opacity = (1 - clamp01((pSettle - 0.62) / 0.34)).toFixed(3);
      }

      /* ---- nucleus ---- */
      var grow = lerp(0.04, 1, pGrow < 1 ? outBack(pGrow) : 1);
      var nw = nD * grow;
      nucleus.style.width = nucleus.style.height = nw.toFixed(1) + "px";
      nucleus.style.transform =
        "translate3d(" + (ax - nw / 2).toFixed(1) + "px," + (ay - nw / 2).toFixed(1) + "px,0)";
      nucleus.style.opacity = clamp01(pGrow * 2.2).toFixed(3);
      if (photo) {
        photo.style.opacity = clamp01(pGrow * 1.4 - 0.25).toFixed(3);
      }
      sheen.style.opacity = (1 - clamp01(pGrow * 1.3 - 0.2)).toFixed(3);

      /* ---- shells and their marks ---- */
      for (var si = 0; si < shells.length; si++) {
        var sh = shells[si];
        var rr = lerp(aR * sh.rad * 0.12, aR * sh.rad, gE);

        sh.path.style.width = sh.path.style.height = (rr * 2).toFixed(1) + "px";
        sh.path.style.transform =
          "translate3d(" + (ax - rr).toFixed(1) + "px," + (ay - rr).toFixed(1) + "px,0)" +
          " rotateX(" + (74 - si * 8).toFixed(1) + "deg)" +
          " rotateZ(" + (sh.tilt * 180 / Math.PI).toFixed(1) + "deg)";
        sh.path.style.opacity =
          (clamp01(pGrow * 1.6) * lerp(0.85, 0.42, pEase)).toFixed(3);

        var size = S * lerp(0.14, 1, outCubic(pGrow));
        if (pSettle > 0 && dest) { size = lerp(S, 42, inOutCubic(pSettle)); }

        for (var i = 0; i < sh.n; i++) {
          shellPoint(sh.theta + i * (Math.PI * 2 / sh.n), rr, sh.tilt, tmp);
          var px = ax + tmp[0] - size / 2;
          var py = ay + tmp[1] - size / 2;
          var m = sh.marks[i];
          m.style.width = m.style.height = size.toFixed(1) + "px";
          m.style.transform =
            "translate3d(" + px.toFixed(1) + "px," + py.toFixed(1) + "px," + tmp[2].toFixed(1) + "px)";
          m.style.opacity = clamp01(pGrow * 3 - 0.2).toFixed(3);
          /* marks on the far side of the shell pass behind the nucleus */
          m.style.zIndex = tmp[2] >= 0 ? 2 : 0;
        }
      }

      /* ---- the name ---- */
      var h = outCubic(clamp01(pText * 1.25));
      head.style.opacity = h.toFixed(3);
      head.style.transform = "translateY(" + ((1 - h) * 20).toFixed(1) + "px)";
      head.style.letterSpacing = lerp(0.1, -0.03, h).toFixed(4) + "em";

      var rl = outCubic(clamp01((pText - 0.12) / 0.55));
      rule.style.transform = "scaleX(" + rl.toFixed(3) + ")";
      rule.style.opacity = rl.toFixed(3);

      var s2 = outCubic(clamp01((pText - 0.35) / 0.65));
      sub.style.opacity = s2.toFixed(3);
      sub.style.transform = "translateY(" + ((1 - s2) * 12).toFixed(1) + "px)";
    }

    /* ---- run --------------------------------------------------------- */
    var start = 0, last = 0, raf = 0, done = false;

    function tick(now) {
      if (!start) { start = now; last = now; }
      var e = now - start;
      var dt = Math.min(64, now - last) / 1000;
      last = now;

      var pGrow = clamp01(e / T1);
      var pEase = clamp01((e - T1) / SEQ.ease);
      var speed = lerp(4.6, 0.55, outCubic(pGrow)) * lerp(1, 0.22, inOutCubic(pEase));
      for (var si = 0; si < shells.length; si++) {
        shells[si].theta += speed * shells[si].dir * (1 + si * 0.18) * dt;
      }

      render(e);
      if (e >= T5) { finish(); return; }
      raf = requestAnimationFrame(tick);
    }

    function finish() {
      if (done) { return; }
      done = true;
      running = false;
      cancelAnimationFrame(raf);
      document.documentElement.classList.remove("intro-run", "intro-landing");
      document.documentElement.classList.add("intro-settle");
      window.removeEventListener("resize", onResize);
      document.removeEventListener("keydown", onKey);
      if (el.parentNode) { el.parentNode.removeChild(el); }
    }

    function onKey(ev) {
      if (ev.key === "Escape" || ev.key === " " || ev.key === "Enter") { finish(); }
    }
    function onResize() { if (!dest) { measure(); } }

    skip.addEventListener("click", finish);
    el.addEventListener("click", function (ev) {
      if (ev.target === el || ev.target === bg || ev.target === gridEl) { finish(); }
    });
    document.addEventListener("keydown", onKey);
    window.addEventListener("resize", onResize);

    measure();
    render(0);
    raf = requestAnimationFrame(tick);
  }

  window.BBIntro = { play: play };

  if (reduced) { return; }   /* the head script already set intro-settle */

  requestAnimationFrame(function () { requestAnimationFrame(play); });
})();
