// Generates the animated hero banner (pure SVG + CSS/SMIL, works inside GitHub README <img>)
// usage: node gen-hero.js <repo-root>
const fs = require('fs'); const path = require('path'); const sharp = require('sharp');
const ROOT = process.argv[2];
const W = 1280, H = 440;
let seed = 20261011; const rnd = () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
const r = (a, b) => a + rnd() * (b - a);
const f1 = n => Math.round(n * 10) / 10;

(async () => {
  // ---- icons (from skillicons, extracted earlier) ----
  const icons = JSON.parse(fs.readFileSync(path.join(__dirname, 'icons.json'), 'utf8'));
  const names = ['flutter', 'dart', 'kotlin', 'androidstudio', 'firebase', 'wordpress', 'php', 'html', 'css', 'js', 'gcp', 'arduino', 'cpp', 'git', 'github', 'vscode', 'figma', 'postgres', 'mysql', 'bash', 'docker', 'linux'];
  const icon = Object.fromEntries(names.map((n, i) => [n, icons[i]]));
  // ---- logo ----
  const logoBuf = fs.readFileSync(path.join(ROOT, 'assets/pm-logo-dark.png'));
  const lm = await sharp(logoBuf).metadata();
  const LOGO_H = 236, LOGO_W = Math.round(lm.width * LOGO_H / lm.height);
  const logoX = 330 - LOGO_W / 2, logoY = 92;

  // ---- stars ----
  let stars = '';
  for (let i = 0; i < 170; i++) {
    const x = f1(r(0, W)), y = f1(r(0, 390)), rad = f1(r(0.5, 1.7)); const k = 1 + Math.floor(rnd() * 3); const d = f1(-r(0, 5));
    stars += `<circle cx="${x}" cy="${y}" r="${rad}" class="st s${k}" style="animation-delay:${d}s"/>`;
  }
  // ---- circuit traces ----
  let traces = '', pulses = '';
  const trace = (side, i) => {
    const dir = side === 'L' ? 1 : -1; let x = side === 'L' ? 0 : W; let y = f1(r(30, 360));
    const pts = [[x, y]]; const runs = 1 + Math.floor(rnd() * 2);
    for (let k = 0; k < runs; k++) {
      x += dir * f1(r(30, 70)); pts.push([x, y]);
      const dy = (rnd() < 0.5 ? -1 : 1) * f1(r(18, 45)); x += dir * Math.abs(dy); y += dy; pts.push([x, y]);
    }
    x += dir * f1(r(25, 60)); pts.push([x, y]);
    const limit = side === 'L' ? 235 : W - 235; if (side === 'L' ? x > limit : x < limit) return;
    const d = 'M' + pts.map(p => p.join(',')).join(' L');
    traces += `<path d="${d}" class="tr"/><circle cx="${x}" cy="${y}" r="4.5" class="node"/>`;
    if (i % 2 === 0) pulses += `<circle r="3" class="pulse"><animateMotion dur="${f1(r(3.5, 6))}s" begin="${f1(-r(0, 5))}s" repeatCount="indefinite" path="${d}"/></circle>`;
  };
  for (let i = 0; i < 12; i++) trace('L', i); for (let i = 0; i < 12; i++) trace('R', i);

  // ---- floating icons ----
  const place = [
    [52, 56, 'flutter', -8], [150, 38, 'dart', 6], [40, 160, 'kotlin', 5], [140, 132, 'firebase', -5], [48, 262, 'androidstudio', 7], [148, 226, 'arduino', -6], [62, 356, 'cpp', 4], [168, 322, 'git', -7],
    [1068, 44, 'wordpress', 6], [1172, 62, 'php', -6], [1056, 142, 'js', -4], [1156, 150, 'html', 7], [1228, 112, 'css', -8], [1066, 244, 'github', 5], [1168, 240, 'vscode', -5], [1234, 206, 'figma', 6], [1082, 338, 'postgres', -6], [1182, 330, 'docker', 5], [1236, 300, 'gcp', -4],
    [560, 22, 'mysql', -5], [700, 16, 'bash', 4], [850, 24, 'linux', -6],
  ];
  let floats = '';
  place.forEach(([x, y, n, rot], i) => {
    const s = 44 / 256; const dur = f1(r(4.2, 7.5)), del = f1(-r(0, 6));
    floats += `<g transform="translate(${x},${y}) rotate(${rot} 22 22)"><g class="bob" style="animation-duration:${dur}s;animation-delay:${del}s"><g transform="scale(${s})">${icon[n]}</g></g></g>`;
  });

  // ---- SmartUp mark (inline, 16px tall) ----
  const su = (x, y, h, cls) => { const s = h / 122; return `<g transform="translate(${x},${y}) scale(${s})" class="${cls}"><rect class="sb sb1" x="25.25" y="0" width="75.75" height="24.4"/><rect class="sb sb2" x="0" y="24.4" width="25.25" height="24.4"/><rect class="sb sb3" x="25.25" y="48.8" width="50.5" height="24.4"/><rect class="sb sb4" x="75.75" y="73.2" width="25.25" height="24.4"/><rect class="sb sb5" x="0" y="97.6" width="75.75" height="24.4"/></g>`; };

  // ---- chips ----
  const chips = [['Flutter dev @', 'SmartUp', true], ['WordPress &amp; WooCommerce', '', false], ['ESP32 · e-ink · BLE', '', false]];
  let chipSvg = ''; let cx = 482; const cy = 300;
  for (const [a, b, mark] of chips) {
    const txt = a + (b ? ' ' + b : ''); const w = Math.round(txt.length * 7.6 + 30 + (mark ? 20 : 0));
    chipSvg += `<g transform="translate(${cx},${cy})"><rect width="${w}" height="34" rx="17" class="chip"/>`;
    if (mark) chipSvg += `<text x="16" y="22" class="ct">${a}</text>${su(16 + a.length * 7.6 + 8, 9, 16, 'sumark')}<text x="${16 + a.length * 7.6 + 30}" y="22" class="ct teal">${b}</text>`;
    else chipSvg += `<text x="16" y="22" class="ct">${txt}</text>`;
    chipSvg += `</g>`; cx += w + 12;
  }

  // ---- marquee ----
  const words = 'FLUTTER • DART • KOTLIN • WORDPRESS • WOOCOMMERCE • IOT • ESP32 • E-INK • FIREBASE • BLE • UI/UX • ';
  const MW = 1500;
  const marquee = `<clipPath id="mq"><rect x="0" y="${H - 40}" width="${W}" height="40"/></clipPath><g clip-path="url(#mq)"><rect x="0" y="${H - 40}" width="${W}" height="40" fill="#ffffff" opacity="0.025"/><line x1="0" y1="${H - 40}" x2="${W}" y2="${H - 40}" stroke="#30363d"/><g class="mq"><text x="0" y="${H - 15}" class="mt" textLength="${MW}" lengthAdjust="spacing">${words}</text><text x="${MW}" y="${H - 15}" class="mt" textLength="${MW}" lengthAdjust="spacing">${words}</text></g></g>`;

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
<style>
.st{fill:#fff;animation:tw 3s ease-in-out infinite}.s1{animation-duration:2.6s}.s2{animation-duration:3.7s}.s3{animation-duration:4.9s}
@keyframes tw{0%,100%{opacity:.25}50%{opacity:.95}}
.tr{fill:none;stroke:#c99a3b;stroke-width:2;stroke-linejoin:round;stroke-linecap:round;opacity:.55}
.node{fill:#0b1430;stroke:#e0b25a;stroke-width:2}
.pulse{fill:#ffe08a;filter:url(#glow)}
.bob{animation:bob 5s ease-in-out infinite}
@keyframes bob{0%,100%{transform:translateY(0)}50%{transform:translateY(-8px)}}
.name{font:800 58px 'Segoe UI',Inter,'Helvetica Neue',Arial,sans-serif;fill:#e6edf3;letter-spacing:1px}
.handle{font:500 22px ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;fill:#46E9D4}
.tag{font:400 21px 'Segoe UI',Inter,'Helvetica Neue',Arial,sans-serif;fill:#9da7b3}
.chip{fill:#161b22;stroke:#30363d;stroke-width:1}
.ct{font:600 14px 'Segoe UI',Inter,'Helvetica Neue',Arial,sans-serif;fill:#c9d1d9}.teal{fill:#46E9D4}
.mt{font:600 13px ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;fill:#6e7681;letter-spacing:3px}
.mq{animation:mq 36s linear infinite}
@keyframes mq{to{transform:translateX(-${MW}px)}}
.sb{fill:#46E9D4;transform-box:fill-box;transform-origin:center;animation:suw 1.5s ease-in-out infinite}
.sb1{animation-delay:0s}.sb2{animation-delay:.11s}.sb3{animation-delay:.22s}.sb4{animation-delay:.33s}.sb5{animation-delay:.44s}
@keyframes suw{0%,65%,100%{opacity:.22;transform:scale(.86)}22%{opacity:1;transform:scale(1)}}
.lg{animation:breathe 6s ease-in-out infinite;transform-box:fill-box;transform-origin:center}
@keyframes breathe{0%,100%{opacity:.35;transform:scale(1)}50%{opacity:.6;transform:scale(1.12)}}
</style>
<defs>
<linearGradient id="bg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#070b19"/><stop offset=".5" stop-color="#0b1431"/><stop offset="1" stop-color="#070b19"/></linearGradient>
<radialGradient id="g1"><stop offset="0" stop-color="#58a6ff" stop-opacity=".55"/><stop offset="1" stop-color="#58a6ff" stop-opacity="0"/></radialGradient>
<radialGradient id="g2"><stop offset="0" stop-color="#46E9D4" stop-opacity=".35"/><stop offset="1" stop-color="#46E9D4" stop-opacity="0"/></radialGradient>
<filter id="glow" x="-100%" y="-100%" width="300%" height="300%"><feGaussianBlur stdDeviation="2.5" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
<clipPath id="frame"><rect width="${W}" height="${H}" rx="18"/></clipPath>
</defs>
<g clip-path="url(#frame)">
<rect width="${W}" height="${H}" fill="url(#bg)"/>
${stars}
<circle cx="330" cy="210" r="190" fill="url(#g1)" class="lg"/>
<circle cx="760" cy="230" r="260" fill="url(#g2)" opacity=".5"/>
${traces}${pulses}
<image x="${logoX}" y="${logoY}" width="${LOGO_W}" height="${LOGO_H}" href="data:image/png;base64,${logoBuf.toString('base64')}"/>
<text x="480" y="180" class="name">DIMITRIS MILIOS</text>
<text x="482" y="218" class="handle">~/papa_jimmi  —  Thessaloniki, GR</text>
<text x="482" y="258" class="tag">Flutter. Web. Hardware. No fluff.</text>
${chipSvg}
${floats}
${marquee}
<rect x=".5" y=".5" width="${W - 1}" height="${H - 1}" rx="18" fill="none" stroke="#30363d"/>
</g>
</svg>`;
  const out = path.join(ROOT, 'assets/hero.svg');
  fs.writeFileSync(out, svg);
  console.log('wrote', out, (svg.length / 1024).toFixed(1) + 'KB');
})();
