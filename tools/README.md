# tools

Scripts that generate the animated assets in `../assets` and record the demo GIFs.
Node 20+ and `npm i sharp puppeteer-core` inside this folder are enough.

| Script | What it does |
|---|---|
| `gen-hero.js <repo-root>` | Builds `assets/hero.svg` (starfield, circuit traces, floating skill icons, marquee). Icons come from `icons.json`, extracted from skillicons.dev. The logo is embedded from `assets/pm-logo-dark.png`. |
| `gen-terminal.js <out.svg>` | Builds `assets/terminal.svg`, the fake terminal with the typing animation. Edit the lines at the bottom of the script. |
| `serve.js <dir> <port>` | Tiny static server, used to serve a `flutter build web` output while recording. |
| `driver.js` | Headless Chrome driver with an HTTP control endpoint (`POST localhost:8790/run`). Supports clicks with a natural mouse glide, typing, scrolling, file uploads into Flutter `file_picker` inputs (`fpupload`), and CDP screencast recording (`recstart` / `recstop`). The mouse path is logged so the GIF can draw a cursor. |
| `gif.js out.gif [--fps N] [--width W] [--cursor] [--keep seg:a-b,c-d] [--pip dir@x,y,w] seg...` | Turns recorded frame folders into a GIF: constant frame rate, hold collapsing, cursor and click ripple overlay, time-range trimming, picture-in-picture of other recordings. |
| `activity.js <frames-dir>` | Prints the moments where a recording visibly changes, handy for choosing `--keep` ranges. |
| `demo-mokuply.actions.json` | The action list that produced `assets/demo-mokuply.gif` (absolute paths need adjusting). |

The SmartUp mark SVGs are the company's loader animation recoloured for dark and light GitHub themes.
