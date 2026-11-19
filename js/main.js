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
(function () {
  var ORDER = ['home', 'works', 'about', 'life'];
  var TITLES = { works: 'Works', about: 'About', life: 'Life' };
  var DURATION = 1350;
  // slow lift, quick middle, long soft landing
  var EASE = 'cubic-bezier(.5,.05,.2,1)';
  var STEPS = 24;

  // Build smooth keyframes from a function of progress t∈[0,1] (no kinks between keyframes).
  function frames(fn) {
    var out = [];
    for (var i = 0; i <= STEPS; i++) { var t = i / STEPS; var f = fn(t); f.offset = t; out.push(f); }
    return out;
  }
  var bell = function (t) { return Math.sin(Math.PI * t); };

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

  function face(page, side) {
    var f = document.createElement('div');
    f.className = 'leaf__face leaf__face--' + side;
    var shade = document.createElement('div');
    shade.className = 'leaf__shade';
    page.hidden = false;
    f.appendChild(page);
    f.appendChild(shade);
    return f;
  }

  function go(to) {
    if (to === current) return;
    if (busy) { queued = to; return; }
    var from = current;
    current = to;
    setTabs(to);

    if (reduce.matches || !notebook.animate) {
      show(from, false); show(to, true);
      return;
    }

    busy = true;
    var fwd = ORDER.indexOf(to) > ORDER.indexOf(from);
    var A = spreads[from], B = spreads[to];
    // fwd: the right page of A turns over and becomes the left page of B.
    var front = fwd ? A.right : A.left;
    var back = fwd ? B.left : B.right;
    var stay = fwd ? A.left : A.right;      // covered at the end
    var under = fwd ? B.right : B.left;     // revealed as the leaf lifts

    under.hidden = false;
    stay.hidden = false;

    var leaf = document.createElement('div');
    leaf.className = 'leaf ' + (fwd ? 'leaf--fwd' : 'leaf--back');
    var fFront = face(front, 'front');
    var fBack = face(back, 'back');
    leaf.appendChild(fFront);
    leaf.appendChild(fBack);

    var shadow = document.createElement('div');
    shadow.className = 'flip-shadow ' + (fwd ? 'flip-shadow--right' : 'flip-shadow--left');
    notebook.insertBefore(shadow, anchor);
    notebook.insertBefore(leaf, anchor);

    var sign = fwd ? -1 : 1;
    var opts = { duration: DURATION, easing: EASE, fill: 'forwards' };
    var turn = leaf.animate(frames(function (t) {
      // the page lifts off the paper and settles back down, like a real sheet
      return { transform: 'rotateY(' + (sign * 180 * t) + 'deg) translateZ(' + (24 * bell(t)) + 'px)' };
    }), opts);
    fFront.querySelector('.leaf__shade').animate(frames(function (t) {
      return { opacity: Math.min(1, Math.pow(Math.min(t * 2, 1), 1.6)) };
    }), opts);
    fBack.querySelector('.leaf__shade').animate(frames(function (t) {
      return { opacity: Math.min(1, Math.pow(Math.max(0, 2 - t * 2), 1.6)) };
    }), opts);
    shadow.animate(frames(function (t) {
      return { opacity: 0.85 * Math.pow(1 - t, 1.5) };
    }), opts);

    turn.onfinish = function () {
      [front, back].forEach(function (p) { notebook.insertBefore(p, anchor); });
      leaf.remove();
      shadow.remove();
      show(from, false);
      show(to, true);
      // keep DOM order stable: left page before right page
      notebook.insertBefore(B.left, B.right);
      busy = false;
      if (queued) { var q = queued; queued = null; go(q); }
    };
  }

  // Initial state from URL without animation
  var start = nameFromHash();
  if (start !== 'home') { show('home', false); show(start, true); current = start; }
  setTabs(current);

  window.addEventListener('hashchange', function () { go(nameFromHash()); });
})();
