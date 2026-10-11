// Build an animated GIF from screencast segments recorded by driver.js
// usage: node gif.js out.gif --fps 12 --width 960 --cursor [--pip dir@x,y,w ...] seg1 [seg2 ...]
//   seg: a frames/<name> dir with NNNNN.jpg + index.json {frames:[{t,f}], mouse:[{t,x,y,type}]}
//   pip: another recorded dir overlaid as picture-in-picture (x,y,w in OUTPUT pixels), matched by timestamp
const fs = require('fs'); const path = require('path'); const sharp = require('sharp');
const args = process.argv.slice(2); const out = args.shift();
let fps = 12, width = 960, cursor = false, maxHold = 2.5, tail = 1.5; const segs = []; const pips = []; const keeps = {};
for (let i = 0; i < args.length; i++) {
  if (args[i] === '--fps') fps = +args[++i]; else if (args[i] === '--width') width = +args[++i]; else if (args[i] === '--cursor') cursor = true;
  else if (args[i] === '--maxhold') maxHold = +args[++i]; else if (args[i] === '--tail') tail = +args[++i];
  else if (args[i] === '--keep') { const [name, r] = args[++i].split(':'); keeps[name] = r.split(',').map(x => x.split('-').map(Number)); }
  else if (args[i] === '--pip') { const [dir, geo] = args[++i].split('@'); const [x, y, w] = geo.split(',').map(Number); pips.push({ dir: path.resolve(dir), x, y, w }); }
  else segs.push(args[i]);
}
const loadIdx = dir => { const idx = JSON.parse(fs.readFileSync(path.join(dir, 'index.json'), 'utf8')); return { frames: idx.frames || idx, mouse: idx.mouse || [] }; };
const CUR = (s) => Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${s * 24}" height="${s * 24}" viewBox="0 0 24 24"><path d="M5 3 L19 12 L12.5 13.5 L16 21 L13 22 L9.5 14.5 L5 19 Z" fill="#fff" stroke="#000" stroke-width="1.6" stroke-linejoin="round"/></svg>`);
const RIP = (s) => Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${s * 40}" height="${s * 40}" viewBox="0 0 40 40"><circle cx="20" cy="20" r="14" fill="#46E9D4" fill-opacity="0.35" stroke="#46E9D4" stroke-width="3"/></svg>`);
(async () => {
  const picks = []; // {file, delay, mouse, ripple, t}
  for (const seg of segs) {
    const dir = path.resolve(seg); const { frames, mouse } = loadIdx(dir); if (!frames.length) continue;
    const t0 = frames[0].t; const tEnd = frames[frames.length - 1].t + tail;
    const step = 1 / fps; let fi = 0; let mi = 0; let cur = null; let lastClick = -9;
    const keep = keeps[path.basename(dir)];
    for (let t = t0; t <= tEnd; t += step) {
      if (keep && !keep.some(([a, b]) => t - t0 >= a && t - t0 <= b)) continue;
      while (fi + 1 < frames.length && frames[fi + 1].t <= t) fi++;
      while (mi < mouse.length && mouse[mi].t <= t) { cur = { x: mouse[mi].x, y: mouse[mi].y }; if (mouse[mi].type === 'click') lastClick = mouse[mi].t; mi++; }
      const file = path.join(dir, String(frames[fi].f).padStart(5, '0') + '.jpg');
      const ripple = (t - lastClick) < 0.35;
      // pip frame files at this time
      const pipFiles = pips.map(p => { if (!p.idx) p.idx = loadIdx(p.dir); const fr = p.idx.frames; if (!fr.length || t < fr[0].t - 0.05) return null; let k = 0; while (k + 1 < fr.length && fr[k + 1].t <= t) k++; return path.join(p.dir, String(fr[k].f).padStart(5, '0') + '.jpg'); });
      const last = picks[picks.length - 1];
      const same = last && last.file === file && JSON.stringify(last.pipFiles) === JSON.stringify(pipFiles) && (!cursor || (JSON.stringify(last.mouse) === JSON.stringify(cur) && last.ripple === ripple));
      if (same && last.delay + step * 1000 <= maxHold * 1000) { last.delay += step * 1000; continue; }
      picks.push({ file, delay: step * 1000, mouse: cur ? { ...cur } : null, ripple, t, pipFiles });
    }
  }
  console.log('frames picked', picks.length, 'duration', (picks.reduce((a, p) => a + p.delay, 0) / 1000).toFixed(1) + 's');
  const meta = await sharp(picks[0].file).metadata(); const scale = width / meta.width; const height = Math.round(meta.height * scale);
  const curBuf = await sharp(CUR(scale * 1.15)).png().toBuffer(); const ripBuf = await sharp(RIP(scale * 1.15)).png().toBuffer();
  const curM = await sharp(curBuf).metadata(); const ripM = await sharp(ripBuf).metadata();
  const pipCache = new Map();
  const pipImg = async (file, w) => { const key = file + '@' + w; if (pipCache.has(key)) return pipCache.get(key); const h = Math.round(w * meta.height / meta.width); const b = await sharp(file).resize(w, h, { kernel: 'lanczos3' }).extend({ top: 3, bottom: 3, left: 3, right: 3, background: '#46E9D4' }).png().toBuffer(); pipCache.set(key, b); return b; };
  const bufs = []; const delays = [];
  for (const p of picks) {
    let img = sharp(p.file).resize(width, height, { kernel: 'lanczos3' });
    const comps = [];
    for (let i = 0; i < pips.length; i++) if (p.pipFiles[i]) comps.push({ input: await pipImg(p.pipFiles[i], pips[i].w), left: pips[i].x, top: pips[i].y });
    if (cursor && p.mouse) {
      if (p.ripple) comps.push({ input: ripBuf, left: Math.round(p.mouse.x * scale - ripM.width / 2), top: Math.round(p.mouse.y * scale - ripM.height / 2) });
      comps.push({ input: curBuf, left: Math.round(p.mouse.x * scale - 5 * scale), top: Math.round(p.mouse.y * scale - 3 * scale) });
    }
    const ok = comps.filter(c => c.left >= 0 && c.top >= 0 && c.left + 10 < width && c.top + 10 < height);
    if (ok.length) img = sharp(await img.png().toBuffer()).composite(ok);
    bufs.push(await img.removeAlpha().raw().toBuffer()); delays.push(Math.round(p.delay));
  }
  const joined = Buffer.concat(bufs);
  await sharp(joined, { raw: { width, height: height * bufs.length, channels: 3, pageHeight: height }, limitInputPixels: false })
    .gif({ delay: delays, loop: 0, effort: 7, dither: 0.6, colours: 255, interFrameMaxError: 4, interPaletteMaxError: 8 })
    .toFile(out);
  console.log('wrote', out, (fs.statSync(out).size / 1024 / 1024).toFixed(2) + 'MB', width + 'x' + height, 'frames', bufs.length);
})();
