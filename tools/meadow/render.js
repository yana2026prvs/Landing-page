// Renders painter.html to JPEG files.
// node tools/meadow/render.js <outDir> [seed]
const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

(async () => {
  const out = process.argv[2] || 'assets';
  const seed = process.argv[3] || '7';
  fs.mkdirSync(out, { recursive: true });
  const b = await chromium.launch();
  const p = await b.newPage();
  const file = 'file://' + path.resolve(__dirname, 'painter.html');
  for (const [name, w, h] of [['meadow-wide', 2400, 1500], ['meadow-tall', 1200, 2000]]) {
    await p.goto(`${file}?w=${w}&h=${h}&seed=${seed}`);
    await p.waitForFunction(() => window.__done === true, null, { timeout: 120000 });
    const data = await p.evaluate(() => document.getElementById('c').toDataURL('image/jpeg', 0.84));
    fs.writeFileSync(path.join(out, `${name}.jpg`), Buffer.from(data.split(',')[1], 'base64'));
    console.log('wrote', name);
  }
  await b.close();
})();
