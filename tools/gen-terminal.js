// Generates assets/terminal.svg : an animated "fake terminal" (pure SVG + CSS, loops every T seconds)
const fs = require('fs');
const T = 18; const W = 880, LH = 24, X = 28, Y0 = 74, FS = 15, CW = 8.6;
const pct = s => (s / T * 100).toFixed(2);
const PROMPT = 'papa_jimmi@thessaloniki:~$ ';
const PW = PROMPT.length * CW;
let css = ''; let body = ''; let n = 0;
const show = (t) => { const k = 'show' + (n++); css += `@keyframes ${k}{0%,${pct(t)}%{opacity:0}${pct(t + 0.01)}%,100%{opacity:1}}`; return `animation:${k} ${T}s linear infinite both`; };
const typed = (t1, t2, chars) => { const k = 'type' + (n++); const w = chars * CW; css += `@keyframes ${k}{0%,${pct(t1)}%{transform:translateX(-${w}px);animation-timing-function:steps(${chars},end)}${pct(t2)}%,100%{transform:translateX(0)}}`; return { anim: `animation:${k} ${T}s linear infinite both`, w }; };
const esc = s => s.replace(/&/g, '&amp;').replace(/</g, '&lt;');
let line = 0; const y = () => Y0 + line * LH;
function cmd(t, text) {
  const yy = y(); const { anim, w } = typed(t + 0.3, t + 0.3 + text.length * 0.08, text.length); const id = 'c' + (n++);
  body += `<text x="${X}" y="${yy}" class="p" textLength="${PW}" lengthAdjust="spacing" style="${show(t)}">${esc(PROMPT)}</text>`;
  body += `<clipPath id="${id}"><rect x="${X + PW}" y="${yy - 18}" width="${w}" height="${LH}" style="${anim}"/></clipPath>`;
  body += `<text x="${X + PW}" y="${yy}" class="c" textLength="${w}" lengthAdjust="spacingAndGlyphs" clip-path="url(#${id})">${esc(text)}</text>`;
  line++; return t + 0.3 + text.length * 0.08;
}
function out(t, parts) { // parts: [[class,text],...]
  const yy = y(); body += `<text x="${X}" y="${yy}" style="${show(t)}">` + parts.map(([c, s]) => `<tspan class="${c}">${esc(s)}</tspan>`).join('') + `</text>`; line++;
}
let t = 0.4;
t = cmd(t, 'whoami');
out(t + 0.5, [['w', 'Dimitris Milios'], ['d', '  ·  Flutter dev @ '], ['t', 'SmartUp'], ['d', ' by day  ·  IoT tinkerer by night  ·  Thessaloniki, GR']]);
t = cmd(t + 1.3, 'flutter doctor -v');
const dots = (s, n) => s + ' ' + '·'.repeat(Math.max(2, n - s.length)) + ' ';
out(t + 0.6, [['ok', '[✓] '], ['w', dots('Flutter · Dart · Kotlin', 30)], ['d', 'production apps, iOS + Android from one codebase']]);
out(t + 1.2, [['ok', '[✓] '], ['w', dots('WordPress · WooCommerce', 30)], ['d', 'custom themes, zero page builders']]);
out(t + 1.8, [['ok', '[✓] '], ['w', dots('ESP32 · e-ink · BLE', 30)], ['d', 'hand-soldered, mostly works']]);
out(t + 2.6, [['warn', '[!] '], ['w', dots('Sleep schedule', 30)], ['warn', '1 issue found'], ['d', ' (wontfix)']]);
out(t + 3.2, [['d', '• No issues found in '], ['t', 'coffee supply'], ['d', '.']]);
line += 0.4;
const yy = y(); body += `<g style="${show(t + 4.0)}"><text x="${X}" y="${yy}" class="p">${esc(PROMPT)}</text><rect x="${X + PW}" y="${yy - 15}" width="9" height="19" fill="#46E9D4" class="cur"/></g>`;
const H = yy + 30;
const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" font-family="ui-monospace,SFMono-Regular,'SF Mono',Menlo,Consolas,'Liberation Mono',monospace" font-size="${FS}">
<style>
text{white-space:pre}
.p{fill:#3fb950}.c{fill:#e6edf3}.w{fill:#e6edf3}.d{fill:#8b949e}.t{fill:#46E9D4}.ok{fill:#3fb950}.warn{fill:#d29922}
.cur{animation:blink 1.1s steps(2,start) infinite}
@keyframes blink{to{visibility:hidden}}
${css}
</style>
<defs><linearGradient id="bg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#161b22"/><stop offset="1" stop-color="#0d1117"/></linearGradient></defs>
<rect x="0.5" y="0.5" width="${W - 1}" height="${H - 1}" rx="12" fill="url(#bg)" stroke="#30363d"/>
<rect x="0.5" y="0.5" width="${W - 1}" height="40" rx="12" fill="#21262d"/><rect x="0.5" y="20" width="${W - 1}" height="21" fill="#21262d"/>
<line x1="0.5" y1="41" x2="${W - 0.5}" y2="41" stroke="#30363d"/>
<circle cx="22" cy="21" r="6" fill="#ff5f57"/><circle cx="42" cy="21" r="6" fill="#febc2e"/><circle cx="62" cy="21" r="6" fill="#28c840"/>
<text x="${W / 2}" y="26" text-anchor="middle" fill="#8b949e" font-size="13">papa_jimmi — zsh — ${W}×${H}</text>
${body}
</svg>`;
fs.writeFileSync(process.argv[2], svg);
console.log('wrote', process.argv[2], (svg.length / 1024).toFixed(1) + 'KB', 'height', H);
