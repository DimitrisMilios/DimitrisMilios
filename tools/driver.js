// Persistent puppeteer driver: POST /run {actions:[...]} -> performs actions, returns results.
// v2: tracks mouse position/clicks per recording so gif.js can draw a cursor.
const puppeteer = require('puppeteer-core');
const http = require('http'); const fs = require('fs'); const path = require('path');
const OUT = path.join(__dirname, 'shots'); fs.mkdirSync(OUT, { recursive: true });
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
let browser; const pages = {}; const recs = {}; const mouse = {}; const logs = {};
const now = () => Date.now() / 1000;
const sleep = ms => new Promise(r => setTimeout(r, ms));
function logMouse(tab, x, y, type) { mouse[tab] = { x, y }; for (const r of Object.values(recs)) if (r.tab === tab && r.on) r.mouse.push({ t: now(), x, y, type }); }
async function glide(page, tab, x, y, ms) { // smooth mouse travel so the cursor overlay looks natural
  const from = mouse[tab] || { x: 640, y: 400 }; const steps = Math.max(4, Math.round(ms / 25));
  for (let i = 1; i <= steps; i++) { const k = i / steps; const e = k < .5 ? 2 * k * k : -1 + (4 - 2 * k) * k; const px = from.x + (x - from.x) * e, py = from.y + (y - from.y) * e; await page.mouse.move(px, py); logMouse(tab, px, py, 'move'); await sleep(ms / steps); }
}
async function getPage(name, fresh) {
  if (pages[name] && !fresh) return pages[name];
  if (pages[name]) { try { await pages[name].close(); } catch {} }
  const ctx = name === 'main' ? browser.defaultBrowserContext() : await browser.createBrowserContext();
  const page = await ctx.newPage();
  await page.setViewport({ width: 1280, height: 800, deviceScaleFactor: 1 });
  logs[name] = []; page.on('console', m => logs[name].push(m.type() + ': ' + m.text().slice(0, 300))); page.on('pageerror', e => logs[name].push('pageerror: ' + String(e).slice(0, 300)));
  pages[name] = page; return page;
}
async function run(actions) {
  const out = [];
  for (const a of actions) {
    const tab = a.tab || 'main'; const page = await getPage(tab, a.type === 'goto' && a.fresh);
    const t0 = Date.now();
    switch (a.type) {
      case 'goto': await page.goto(a.url, { waitUntil: 'load', timeout: 60000 }); break;
      case 'viewport': await page.setViewport({ width: a.width, height: a.height, deviceScaleFactor: a.dpr || 1 }); break;
      case 'wait': await sleep(a.ms); break;
      case 'click': await glide(page, tab, a.x, a.y, a.glide ?? 350); await page.mouse.click(a.x, a.y, { delay: 50, clickCount: a.count || 1 }); logMouse(tab, a.x, a.y, 'click'); break;
      case 'dblclick': await glide(page, tab, a.x, a.y, a.glide ?? 350); await page.mouse.click(a.x, a.y, { clickCount: 2 }); logMouse(tab, a.x, a.y, 'click'); break;
      case 'move': await glide(page, tab, a.x, a.y, a.glide ?? 350); break;
      case 'drag': {
        await glide(page, tab, a.from[0], a.from[1], a.glide ?? 350); await page.mouse.down(); logMouse(tab, a.from[0], a.from[1], 'click');
        const steps = a.steps || 30; for (let i = 1; i <= steps; i++) { const k = i / steps; const e = k < .5 ? 2 * k * k : -1 + (4 - 2 * k) * k; const px = a.from[0] + (a.to[0] - a.from[0]) * e, py = a.from[1] + (a.to[1] - a.from[1]) * e; await page.mouse.move(px, py); logMouse(tab, px, py, 'move'); await sleep(a.stepMs || 20); }
        await page.mouse.up(); break; }
      case 'type': await page.keyboard.type(a.text, { delay: a.delay ?? 70 }); break;
      case 'key': for (let i = 0; i < (a.repeat || 1); i++) { await page.keyboard.press(a.key); await sleep(a.gapMs || 60); } break;
      case 'down': await page.keyboard.down(a.key); break;
      case 'up': await page.keyboard.up(a.key); break;
      case 'scroll': { await glide(page, tab, a.x, a.y, a.glide ?? 250); const n = a.ticks || 1; for (let i = 0; i < n; i++) { await page.mouse.wheel({ deltaY: (a.dy || 0) / n, deltaX: (a.dx || 0) / n }); await sleep(a.tickMs || 40); } break; }
      case 'upload': { await glide(page, tab, a.x, a.y, a.glide ?? 350); const fcP = page.waitForFileChooser({ timeout: 10000 }); await sleep(150); await page.mouse.move(a.x, a.y); await sleep(60); await page.mouse.down(); await sleep(70); await page.mouse.up(); const fc = await fcP; logMouse(tab, a.x, a.y, 'click'); await fc.accept(a.files); break; }
      case 'fpupload': { // catch the file input that file_picker creates on click, then feed it files directly
        await page.evaluate(() => { window.__fp = null; if (!window.__fpHooked) { window.__fpHooked = true; const orig = HTMLInputElement.prototype.click; HTMLInputElement.prototype.click = function () { if (this.type === 'file') { window.__fp = this; return; } return orig.apply(this, arguments); }; } if (window.__fpObs) window.__fpObs.disconnect(); window.__fpObs = new MutationObserver(ms => { for (const m of ms) for (const n of m.addedNodes) { if (n.tagName === 'INPUT' && n.type === 'file') window.__fp = n; else if (n.querySelector) { const q = n.querySelector('input[type=file]'); if (q) window.__fp = q; } } }); window.__fpObs.observe(document.documentElement, { childList: true, subtree: true }); });
        await glide(page, tab, a.x, a.y, a.glide ?? 350); await page.mouse.down(); await sleep(70); await page.mouse.up(); logMouse(tab, a.x, a.y, 'click');
        await sleep(a.settle || 60);
        const payload = a.files.map(f => ({ name: path.basename(f), b64: fs.readFileSync(f).toString('base64'), type: f.endsWith('.jpg') ? 'image/jpeg' : 'image/png' }));
        const ok = await page.evaluate((files) => { const e = window.__fp; if (!e) return 'no input'; const dt = new DataTransfer(); for (const f of files) { const bin = atob(f.b64); const u8 = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) u8[i] = bin.charCodeAt(i); dt.items.add(new File([u8], f.name, { type: f.type })); } e.files = dt.files; e.dispatchEvent(new Event('change', { bubbles: true })); return 'set ' + e.files.length; }, payload);
        if (ok !== 'set ' + a.files.length) throw new Error('fpupload: ' + ok);
        out.push({ fpupload: a.files.length }); break; }
      case 'setfiles': { const el = await page.$(a.selector || 'input[type=file]'); if (!el) throw new Error('no file input'); await el.uploadFile(...a.files); out.push({ setfiles: a.files.length }); break; }
      case 'shot': { const f = path.join(OUT, (a.name || 'shot') + '.png'); await page.screenshot({ path: f }); out.push({ shot: f }); break; }
      case 'eval': { const v = await page.evaluate(a.js); out.push({ eval: v }); break; }
      case 'url': out.push({ url: page.url() }); break;
      case 'console': out.push({ console: logs[tab].slice(-(a.n || 30)) }); if (a.clear) logs[tab] = []; break;
      case 'recstart': {
        const client = await page.createCDPSession(); const frames = []; const dir = path.join(__dirname, 'frames', a.name); fs.rmSync(dir, { recursive: true, force: true }); fs.mkdirSync(dir, { recursive: true });
        const rec = { client, frames, dir, tab, on: true, mouse: [] }; recs[a.name] = rec;
        if (mouse[tab]) rec.mouse.push({ t: now(), x: mouse[tab].x, y: mouse[tab].y, type: 'move' });
        client.on('Page.screencastFrame', async ({ data, metadata, sessionId }) => { if (rec.on) { frames.push({ t: metadata.timestamp, f: frames.length }); fs.writeFileSync(path.join(dir, String(frames.length - 1).padStart(5, '0') + '.jpg'), Buffer.from(data, 'base64')); } try { await client.send('Page.screencastFrameAck', { sessionId }); } catch {} });
        await client.send('Page.startScreencast', { format: 'jpeg', quality: 92, maxWidth: 1280, maxHeight: 800, everyNthFrame: 1 });
        break; }
      case 'recstop': { const r = recs[a.name]; r.on = false; await r.client.send('Page.stopScreencast'); await sleep(300); fs.writeFileSync(path.join(r.dir, 'index.json'), JSON.stringify({ frames: r.frames, mouse: r.mouse })); out.push({ frames: r.frames.length, dir: r.dir }); break; }
      case 'close': await page.close(); delete pages[tab]; break;
    }
    out.push({ did: a.type, ms: Date.now() - t0 });
  }
  return out;
}
(async () => {
  browser = await puppeteer.launch({ executablePath: CHROME, headless: process.env.HEADFUL ? false : 'new', args: ['--window-size=1300,900', '--hide-scrollbars', '--force-device-scale-factor=1'] });
  http.createServer((req, res) => {
    let body = ''; req.on('data', c => body += c); req.on('end', async () => {
      try { const r = await run(JSON.parse(body).actions); res.end(JSON.stringify(r)); }
      catch (e) { res.statusCode = 500; res.end(JSON.stringify({ error: String(e && e.stack || e) })); }
    });
  }).listen(8790, () => console.log('driver v2 ready on 8790'));
})();
