// Renders every sticker/doodle in sheet.html to a transparent PNG.
// node tools/stickers/render.js <outDir>
const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

(async () => {
  const out = process.argv[2] || 'out';
  fs.mkdirSync(out, { recursive: true });
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2 });
  await p.goto('file://' + path.resolve(__dirname, 'sheet.html'));
  await p.waitForFunction(() => window.__ready === true, null, { timeout: 30000 });
  await p.waitForTimeout(300);
  const ids = await p.evaluate(() => [...window.__ids.stickers, ...window.__ids.doodles]);
  for (const id of ids) {
    await p.locator('#item-' + id).screenshot({ path: path.join(out, id + '.png'), omitBackground: true });
  }
  await p.locator('#sheet').screenshot({ path: path.join(out, '_sheet.png'), omitBackground: true });
  console.log('rendered', ids.length);
  await b.close();
})();
