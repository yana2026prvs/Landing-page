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
