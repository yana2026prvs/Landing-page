// Scale the fixed 1440×900 composition to fit the viewport, and size the
// meadow background so it always covers the screen (matches Figma at 1440×900).
(function () {
  var W = 1440, H = 900, BG_W = 1632, BG_H = 913, BG_DX = 30, BG_DY = 6.5;
  var root = document.documentElement;
  function fit() {
    var vw = window.innerWidth, vh = window.innerHeight;
    var s = Math.min(vw / W, vh / H);
    var k = Math.max(s, (vw / 2 + BG_DX * s) / (BG_W / 2), (vh / 2 + BG_DY * s) / (BG_H / 2));
    root.style.setProperty('--s', s);
    root.style.setProperty('--k', k);
  }
  fit();
  window.addEventListener('resize', fit);
})();

// Page-flip navigation between notebook spreads (driven by the tabs / URL hash).
//
// The turn is a real paper fold: the page corner is lifted along an arc, the
// fold line is the perpendicular bisector between the corner's rest position
// and its current position. The page is cut along that line, and its back
// (the next spread's page) is reflected across it.
(function () {
  var ORDER = ['home', 'works', 'about', 'life'];
  var TITLES = { works: 'Works', about: 'About', life: 'Life' };
  var W = 590, H = 820;
  var DURATION = 1200;
  var LIFT = 170;          // how high the corner travels mid-turn

  var notebook = document.querySelector('.notebook');
  var anchor = notebook.querySelector('.crease--front');
  var tpl = document.getElementById('blank-spread');
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)');
  var spreads = {};

  spreads.home = {
    left: notebook.querySelector('.page--left[data-spread="home"]'),
    right: notebook.querySelector('.page--right[data-spread="home"]')
  };
  ORDER.slice(1).forEach(function (name) {
    var frag = tpl.content.cloneNode(true);
    var pages = frag.querySelectorAll('.page');
    frag.querySelector('[data-slot="title"]').textContent = TITLES[name];
    pages[0].dataset.spread = pages[1].dataset.spread = name;
    pages[0].hidden = pages[1].hidden = true;
    pages[0].setAttribute('aria-label', TITLES[name]);
    notebook.insertBefore(frag, anchor);
    spreads[name] = { left: pages[0], right: pages[1] };
  });

  var current = 'home';
  var busy = false;
  var queued = null;

  function nameFromHash() {
    var h = location.hash.replace('#', '');
    return spreads[h] ? h : 'home';
  }

  function setTabs(name) {
    document.querySelectorAll('.tab').forEach(function (t) {
      var on = t.dataset.section === name;
      t.classList.toggle('tab--active', on);
      if (on) t.setAttribute('aria-current', 'page'); else t.removeAttribute('aria-current');
    });
  }

  function show(name, visible) {
    spreads[name].left.hidden = spreads[name].right.hidden = !visible;
  }

  // ---- geometry helpers ----
  var RECT = [[0, 0], [W, 0], [W, H], [0, H]];

  // Keep the part of a polygon where side(q) has the given sign.
  function clipPoly(poly, side, keepPositive) {
    var out = [];
    for (var i = 0; i < poly.length; i++) {
      var a = poly[i], b = poly[(i + 1) % poly.length];
      var da = side(a), db = side(b);
      var ina = keepPositive ? da > 0 : da <= 0;
      var inb = keepPositive ? db > 0 : db <= 0;
      if (ina) out.push(a);
      if (ina !== inb) {
        var k = da / (da - db);
        out.push([a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k]);
      }
    }
    return out;
  }
  function polyCss(poly) {
    if (poly.length < 3) return 'polygon(0 0, 0 0, 0 0)';
    return 'polygon(' + poly.map(function (p) { return p[0].toFixed(2) + 'px ' + p[1].toFixed(2) + 'px'; }).join(',') + ')';
  }
  // Time runs linearly: the cosine/sine path itself eases the corner in and out.
  function ease(t) { return t; }

  function el(cls) { var d = document.createElement('div'); d.className = cls; return d; }

  function strip(h, gradient) {
    var s = el('curl__strip');
    s.style.height = h + 'px';
    s.style.background = gradient;
    return s;
  }

  function go(to) {
    if (to === current) return;
    if (busy) { queued = to; return; }
    var from = current;
    current = to;
    setTabs(to);

    if (reduce.matches) { show(from, false); show(to, true); return; }

    busy = true;
    var fwd = ORDER.indexOf(to) > ORDER.indexOf(from);
    var A = spreads[from], B = spreads[to];
    var front = fwd ? A.right : A.left;   // the sheet being turned (front side)
    var backPg = fwd ? B.left : B.right;  // what is printed on its back
    var stay = fwd ? A.left : A.right;    // gets covered when the sheet lands
    var under = fwd ? B.right : B.left;   // revealed beneath the sheet

    // Corner starts at the outer bottom corner and swings over the spine.
    var spine = fwd ? 0 : W;
    var c0 = fwd ? [W, H] : [0, H];

    under.hidden = false; stay.hidden = false;
    under.style.zIndex = 1; stay.style.zIndex = 1; front.style.zIndex = 2;

    var curl = el('curl ' + (fwd ? 'curl--fwd' : 'curl--back'));
    // shadow cast on the revealed page, next to the fold
    var underClip = el('curl__clip');
    var underStrip = strip(90, 'linear-gradient(to top, rgba(30,18,10,.38), rgba(30,18,10,.12) 35%, rgba(30,18,10,0))');
    underClip.appendChild(underStrip);
    // the folded-over flap = back page, reflected across the fold
    var flapClip = el('curl__clip');
    var flap = el('curl__flap');
    backPg.hidden = false;
    flap.appendChild(backPg);
    flapClip.appendChild(flap);
    // shading on the flap: dark in the crease, soft highlight where the paper bends
    var flapShadeClip = el('curl__clip');
    var flapStrip = strip(260, 'linear-gradient(to bottom, rgba(40,25,15,.22) 0, rgba(40,25,15,.06) 18px, rgba(255,255,255,.28) 60px, rgba(255,255,255,0) 130px, rgba(40,25,15,.08) 260px)');
    flapShadeClip.appendChild(flapStrip);

    curl.appendChild(underClip);
    curl.appendChild(flapClip);
    curl.appendChild(flapShadeClip);
    notebook.insertBefore(curl, anchor);

    function frame(t) {
      var e = ease(t);
      var ang = Math.PI * e;
      var p = [spine + (c0[0] - spine) * Math.cos(ang), H - LIFT * Math.sin(ang)];
      var dx = c0[0] - p[0], dy = c0[1] - p[1];
      var len = Math.hypot(dx, dy);
      if (len < .5) {
        front.style.clipPath = '';
        curl.style.visibility = 'hidden';
        return;
      }
      curl.style.visibility = '';
      var n = [dx / len, dy / len];                         // points to the corner side
      var m = [(c0[0] + p[0]) / 2, (c0[1] + p[1]) / 2];     // a point on the fold
      var side = function (q) { return (q[0] - m[0]) * n[0] + (q[1] - m[1]) * n[1]; };
      var reflect = function (q) { var d = 2 * side(q); return [q[0] - d * n[0], q[1] - d * n[1]]; };

      var keep = clipPoly(RECT, side, false);     // still lying flat
      var lifted = clipPoly(RECT, side, true);    // folded over
      var flapPoly = lifted.map(reflect);

      front.style.clipPath = polyCss(keep);
      underClip.style.clipPath = polyCss(lifted);

      // back page: mirror across the sheet (x -> W - x), then reflect across the fold
      var a = -(1 - 2 * n[0] * n[0]), b = 2 * n[0] * n[1];
      var c = -2 * n[0] * n[1], d = 1 - 2 * n[1] * n[1];
      var o = reflect([W, 0]);
      flap.style.transform = 'matrix(' + [a, b, c, d, o[0], o[1]].map(function (v) { return v.toFixed(5); }).join(',') + ')';
      flap.style.clipPath = polyCss(lifted.map(function (q) { return [W - q[0], q[1]]; }));
      // flapClip itself does not clip (the flap may rise above the page edge)
      flapShadeClip.style.clipPath = polyCss(flapPoly);

      // place shading strips along the fold line
      var deg = Math.atan2(n[0], -n[1]) * 180 / Math.PI;
      var fade = Math.sin(Math.PI * t);
      var base = 'translate(' + m[0] + 'px,' + m[1] + 'px) rotate(' + deg + 'deg) translate(-1500px,';
      underStrip.style.transform = base + '-90px)';
      flapStrip.style.transform = base + '0)';
      underStrip.style.opacity = Math.min(1, fade * 1.6);
      flapStrip.style.opacity = Math.min(1, fade * 2);
    }

    var t0 = null;
    function tick(now) {
      if (t0 === null) t0 = now;
      var t = Math.min(1, (now - t0) / DURATION);
      frame(t);
      if (t < 1) { requestAnimationFrame(tick); return; }
      // land: restore normal layout
      notebook.insertBefore(backPg, anchor);
      curl.remove();
      [front, under, stay, backPg].forEach(function (pg) { pg.style.zIndex = ''; pg.style.clipPath = ''; });
      show(from, false);
      show(to, true);
      notebook.insertBefore(B.left, B.right);
      busy = false;
      if (queued) { var q = queued; queued = null; go(q); }
    }
    frame(0);
    requestAnimationFrame(tick);
  }

  var start = nameFromHash();
  if (start !== 'home') { show('home', false); show(start, true); current = start; }
  setTabs(current);

  window.addEventListener('hashchange', function () { go(nameFromHash()); });
})();
