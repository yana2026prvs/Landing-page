(function () {
  var root = document.documentElement;
  var UA = window.I18N_UA || {};
  var CASES = window.CASES || {};
  var store = {
    get: function (k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
    set: function (k, v) { try { localStorage.setItem(k, v); } catch (e) {} }
  };

  /* ---------- Loader cleanup ---------- */
  var loader = document.querySelector('.loader');
  if (loader && root.classList.contains('play-loader')) {
    var done = function () { root.classList.remove('play-loader'); };
    loader.addEventListener('animationend', function (e) { if (e.target === loader) done(); });
    setTimeout(done, 2200); // safety net
  }

  /* ---------- Language switch ---------- */
  var lang = root.getAttribute('data-lang') === 'ua' ? 'ua' : 'en';
  var textNodes = document.querySelectorAll('[data-i18n]');
  var htmlNodes = document.querySelectorAll('[data-i18n-html]');
  textNodes.forEach(function (el) { el.dataset.en = el.textContent; });
  htmlNodes.forEach(function (el) { el.dataset.en = el.innerHTML; });

  function applyLang(l) {
    lang = l;
    root.lang = l === 'ua' ? 'uk' : 'en';
    root.setAttribute('data-lang', l);
    textNodes.forEach(function (el) {
      var k = el.getAttribute('data-i18n');
      el.textContent = (l === 'ua' && UA[k]) ? UA[k] : el.dataset.en;
    });
    htmlNodes.forEach(function (el) {
      var k = el.getAttribute('data-i18n-html');
      el.innerHTML = (l === 'ua' && UA[k]) ? UA[k] : el.dataset.en;
    });
    document.querySelectorAll('[data-lang-opt]').forEach(function (o) {
      o.setAttribute('aria-current', o.getAttribute('data-lang-opt') === l ? 'true' : 'false');
    });
    if (currentCase) renderPreview(currentCase, false);
  }
  var langBtn = document.querySelector('.lang');
  if (langBtn) langBtn.addEventListener('click', function () {
    var next = lang === 'en' ? 'ua' : 'en';
    store.set('lang', next);
    applyLang(next);
  });

  /* ---------- Work: contents → preview ---------- */
  var preview = document.querySelector('.preview');
  var currentCase = preview ? 'fixfind' : null;
  function setP(name, value) { var el = preview.querySelector('[data-p="' + name + '"]'); if (el) el.textContent = value; return el; }
  function renderPreview(id, animate) {
    var c = CASES[id]; if (!c || !preview) return;
    var t = c[lang] || c.en;
    var paint = function () {
      setP('no', c.no); setP('title', t.title); setP('desc', t.desc); setP('metric', t.metric); setP('metricLabel', t.metricLabel);
      var shot = setP('shot', t.shot); if (shot) shot.style.background = c.color;
      var link = preview.querySelector('[data-p="link"]');
      if (c.link) {
        link.href = c.link; link.removeAttribute('aria-disabled');
        link.textContent = lang === 'ua' ? UA['work.open'] : 'Open the case →';
      } else {
        link.removeAttribute('href'); link.setAttribute('aria-disabled', 'true');
        link.textContent = lang === 'ua' ? UA['work.soon'] : 'Case coming soon';
      }
      preview.classList.remove('is-swapping');
    };
    if (animate && !matchMedia('(prefers-reduced-motion: reduce)').matches) {
      preview.classList.add('is-swapping'); setTimeout(paint, 160);
    } else { paint(); }
  }
  document.querySelectorAll('.row').forEach(function (row) {
    var select = function () {
      var id = row.getAttribute('data-case');
      if (id === currentCase) return;
      currentCase = id;
      document.querySelectorAll('.row').forEach(function (r) { r.setAttribute('aria-pressed', r === row ? 'true' : 'false'); });
      renderPreview(id, true);
    };
    row.addEventListener('mouseenter', select);
    row.addEventListener('focus', select);
    row.addEventListener('click', function () {
      select();
      // on narrow screens the preview sits below the list — bring it into view
      if (matchMedia('(max-width: 900px)').matches && preview) preview.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  });

  /* ---------- Hobbies: tap to flip on touch ---------- */
  document.querySelectorAll('.flip button').forEach(function (b) {
    b.addEventListener('click', function () { b.closest('.flip').classList.toggle('is-flipped'); });
  });

  /* ---------- Notebook stage: each section is its own spread, tabs turn the page ---------- */
  var ORDER = ['top', 'work', 'about', 'hobbies', 'contact'];
  var main = document.getElementById('main');
  var sections = {};
  ORDER.forEach(function (id) { var el = document.getElementById(id); if (el && main && main.contains(el)) sections[id] = el; });
  var tabLinks = document.querySelectorAll('.tabs a[href^="#"]');
  var stageMQ = matchMedia('(min-width: 1101px)');
  var reduce = matchMedia('(prefers-reduced-motion: reduce)');
  var current = null, busy = false;

  function idFromHash() { var h = (location.hash || '').slice(1); return sections[h] ? h : 'top'; }

  function setActive(id) {
    ORDER.forEach(function (k) {
      var el = sections[k]; if (!el) return;
      var on = k === id;
      el.classList.toggle('is-active', on);
      el.classList.remove('is-under', 'flip-fwd', 'flip-back');
      if (on) { el.removeAttribute('inert'); el.removeAttribute('aria-hidden'); }
      else { el.setAttribute('inert', ''); el.setAttribute('aria-hidden', 'true'); }
    });
    tabLinks.forEach(function (a) {
      a.setAttribute('aria-current', a.getAttribute('href') === '#' + id ? 'true' : 'false');
    });
    current = id;
    updateTurns();
    if (!stageMQ.matches) window.scrollTo(0, 0);
  }

  function leafFace(cls, src) {
    var f = document.createElement('div'); f.className = 'leaf__face ' + cls;
    var c = src.cloneNode(true); c.setAttribute('aria-hidden', 'true'); c.removeAttribute('id');
    f.appendChild(c); return f;
  }

  function go(id, fromHashChange) {
    if (!sections[id] || id === current || busy) return;
    if (!fromHashChange && location.hash !== '#' + id) { try { history.pushState(null, '', '#' + id); } catch (e) { location.hash = id; } }
    var from = current, dir = ORDER.indexOf(id) > ORDER.indexOf(from) ? 1 : -1;
    if (!stageMQ.matches || reduce.matches || !from) { setActive(id); return; }
    busy = true;
    var A = sections[from], B = sections[id];
    var aSpread = A.querySelector('.spread'), bSpread = B.querySelector('.spread');
    B.removeAttribute('inert'); B.classList.add('is-under');
    A.classList.add(dir > 0 ? 'flip-fwd' : 'flip-back');
    var leaf = document.createElement('div'); leaf.className = 'leaf ' + (dir > 0 ? 'leaf--fwd' : 'leaf--back');
    var frontSrc = aSpread.querySelector(dir > 0 ? '.page--right' : '.page--left');
    var backSrc = bSpread.querySelector(dir > 0 ? '.page--left' : '.page--right');
    leaf.appendChild(leafFace('leaf__front', frontSrc));
    leaf.appendChild(leafFace('leaf__back', backSrc));
    aSpread.appendChild(leaf);
    void leaf.offsetWidth;                       // commit the start state
    leaf.classList.add('go');
    var finished = false;
    function done() {
      if (finished) return; finished = true;
      setActive(id);
      if (leaf.parentNode) leaf.parentNode.removeChild(leaf);
      busy = false;
    }
    leaf.addEventListener('transitionend', function (e) { if (e.target === leaf && e.propertyName === 'transform') done(); });
    setTimeout(done, 1300);                      // safety net
  }

  /* turn buttons in the page corners */
  function addTurns() {
    ORDER.forEach(function (id, i) {
      var el = sections[id]; if (!el) return;
      var sp = el.querySelector('.spread'); if (!sp) return;
      [['prev', '‹', -1], ['next', '›', 1]].forEach(function (d) {
        var b = document.createElement('button'); b.type = 'button';
        b.className = 'turn turn--' + d[0]; b.textContent = d[1];
        b.setAttribute('aria-label', d[0] === 'next' ? 'Next page' : 'Previous page');
        b.hidden = !ORDER[i + d[2]];
        b.addEventListener('click', function () { go(ORDER[i + d[2]]); });
        sp.appendChild(b);
      });
    });
  }
  function updateTurns() {
    // nothing to update: the buttons are per-section and never shown on the first/last edge
  }

  function fit() {
    if (!main) return;
    if (!stageMQ.matches) { main.style.removeProperty('--fit'); return; }
    var w = innerWidth, h = innerHeight;
    var r = w >= 1420 ? 128 : 24, b = w >= 1420 ? 0 : 88;
    var f = Math.min(1, (w - r - 24) / 1300, (h - b - 28) / 840);
    main.style.setProperty('--fit', f.toFixed(3));
  }

  if (Object.keys(sections).length) {
    addTurns();
    tabLinks.forEach(function (a) {
      a.addEventListener('click', function (e) { e.preventDefault(); go(a.getAttribute('href').slice(1)); });
    });
    // any in-page link that points at a section (hero buttons, sticky notes) turns the page too
    document.addEventListener('click', function (e) {
      var a = e.target.closest && e.target.closest('a[href^="#"]');
      if (!a || a.closest('.tabs')) return;
      var id = a.getAttribute('href').slice(1);
      if (sections[id]) { e.preventDefault(); go(id); }
    });
    window.addEventListener('hashchange', function () { go(idFromHash(), true); });
    document.addEventListener('keydown', function (e) {
      if (e.altKey || e.ctrlKey || e.metaKey) return;
      var t = e.target && e.target.tagName; if (t === 'INPUT' || t === 'TEXTAREA' || t === 'SELECT') return;
      var i = ORDER.indexOf(current);
      if (e.key === 'ArrowRight' && ORDER[i + 1]) go(ORDER[i + 1]);
      if (e.key === 'ArrowLeft' && ORDER[i - 1]) go(ORDER[i - 1]);
    });
    window.addEventListener('resize', fit);
    fit();
    setActive(idFromHash());
  }

  /* ---------- Case page: "on this page" scroll-spy ---------- */
  var toc = document.querySelectorAll('.toc a');
  if ('IntersectionObserver' in window && toc.length) {
    var tmap = {};
    toc.forEach(function (a) { tmap[a.getAttribute('href').slice(1)] = a; });
    var io2 = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (!e.isIntersecting) return;
        toc.forEach(function (a) { a.removeAttribute('aria-current'); });
        if (tmap[e.target.id]) tmap[e.target.id].setAttribute('aria-current', 'true');
      });
    }, { rootMargin: '-30% 0px -60% 0px' });
    document.querySelectorAll('.story > section[id]').forEach(function (s) { io2.observe(s); });
  }

  if (lang === 'ua') applyLang('ua');
})();
