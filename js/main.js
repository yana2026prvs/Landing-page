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

  /* ---------- Active index tab ---------- */
  var tabs = document.querySelectorAll('.tabs a[href^="#"]');
  if ('IntersectionObserver' in window && tabs.length) {
    var map = {};
    tabs.forEach(function (a) { map[a.getAttribute('href').slice(1)] = a; });
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (!e.isIntersecting) return;
        tabs.forEach(function (a) { a.removeAttribute('aria-current'); });
        var a = map[e.target.id]; if (a) a.setAttribute('aria-current', 'true');
      });
    }, { rootMargin: '-45% 0px -50% 0px' });
    document.querySelectorAll('main > section[id]').forEach(function (s) { io.observe(s); });
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
