// Records the README demo GIF from the real app in headless Chrome: edit an entry,
// drag a section, switch templates, fix an ATS finding and save the PDF.
//
//   node tools/record-demo.mjs            # English UI -> docs/demo-en.gif
//   node tools/record-demo.mjs --lang es  # Spanish UI -> docs/demo-es.gif
//
// Needs Chrome (found as in tools/devtools.mjs) and FFmpeg on the PATH, or set
// FFMPEG_PATH. Frames come from the DevTools screencast with their real timing;
// FFmpeg turns them into a looping GIF with its own palette. Only the built-in
// fictitious sample resume appears. The cursor and the captions are drawn by this
// script on top of the page, because headless Chrome renders no mouse pointer.
import { spawnSync } from 'node:child_process';
import { mkdtemp, rm, stat, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { connect, launchChrome, serve, sleep } from './devtools.mjs';

const ROOT = resolve(fileURLToPath(new URL('..', import.meta.url)));
const LANG = process.argv.includes('--lang') ? process.argv[process.argv.indexOf('--lang') + 1] : 'en';
const OUT = join(ROOT, 'docs', `demo-${LANG}.gif`);
const W = 1280, H = 800; // recorded viewport
const GIF_WIDTH = 960, FPS = 12;

const TEXT = {
  en: {
    edit: '1  Edit right on the page', drag: '2  Drag sections to reorder', template: '3  Switch templates',
    ats: '4  Check it against ATS rules', pdf: '5  Save as PDF: real text, no watermark', jobTitle: 'Lead Data Analyst',
  },
  es: {
    edit: '1  Edita directo sobre la hoja', drag: '2  Arrastra para reordenar', template: '3  Cambia de plantilla',
    ats: '4  Revísala con reglas de ATS', pdf: '5  Guarda en PDF: texto real, sin marcas de agua', jobTitle: 'Líder de Analítica de Datos',
  },
}[LANG];
if (!TEXT) throw new Error('--lang must be en or es');

// Cursor and caption drawn over the page; window.__demo moves them.
const OVERLAY = `(() => {
  const css = document.createElement('style');
  css.textContent = [
    '#demo-cursor { position: fixed; left: 0; top: 0; z-index: 2147483647; pointer-events: none; transition: transform .08s; }',
    '#demo-cursor.down { transform: scale(.82); }',
    '#demo-caption { position: fixed; left: calc(var(--sidebar-w) + (100% - var(--sidebar-w)) / 2); top: 66px; transform: translateX(-50%);',
    '  z-index: 2147483646; pointer-events: none;',
    '  background: rgba(17, 24, 39, .9); color: #fff; font: 600 21px/1.3 "Segoe UI", system-ui, sans-serif; white-space: pre;',
    '  padding: 10px 22px; border-radius: 999px; box-shadow: 0 8px 24px rgba(0, 0, 0, .25); opacity: 0; transition: opacity .25s; }',
    '#demo-caption.on { opacity: 1; }',
  ].join('\\n');
  document.head.appendChild(css);
  const cursor = document.createElement('div');
  cursor.id = 'demo-cursor';
  cursor.innerHTML = '<svg viewBox="0 0 24 24" width="26" height="26"><path d="M4 2l6.8 19 2.7-7.6 7.5-2.6z" fill="#111827" stroke="#fff" stroke-width="1.7" stroke-linejoin="round"/></svg>';
  document.body.appendChild(cursor);
  const caption = document.createElement('div');
  caption.id = 'demo-caption';
  document.body.appendChild(caption);
  window.__demo = {
    move(x, y) { cursor.style.left = (x - 4) + 'px'; cursor.style.top = (y - 2) + 'px'; },
    down(on) { cursor.classList.toggle('down', on); },
    caption(text) { caption.textContent = text; caption.classList.toggle('on', !!text); },
  };
})()`;

// SortableJS uses native HTML5 drag and drop on desktop, whose drag image the
// browser paints outside the page, so a screen recording shows nothing under the
// cursor. Its fallback mode (the one it uses on touch screens) moves a copy of the
// block inside the page instead. Re-applied after every render, which recreates
// the Sortable instances.
const SORTABLE_FALLBACK = `(() => {
  const apply = () => document.querySelectorAll('#sheet [data-sections], #sheet .cv-items').forEach((el) => {
    const s = Sortable.get(el);
    if (s) s.option('forceFallback', true);
  });
  CV.on('rendered', apply);
  apply();
})()`;

let page;
let mouse = { x: W * 0.6, y: H * 0.5 };
let pressed = false;

const caption = (text) => page.evaluate(`__demo.caption(${JSON.stringify(text)})`);

/** Center of the first element matching `selector`, in viewport pixels. */
async function centerOf(selector, dx = 0, dy = 0) {
  const r = await page.evaluate(`(() => {
    const el = document.querySelector(${JSON.stringify(selector)});
    if (!el) return null;
    const b = el.getBoundingClientRect();
    return { x: b.left + b.width / 2, y: b.top + b.height / 2 };
  })()`);
  if (!r) throw new Error('not found: ' + selector);
  return { x: r.x + dx, y: r.y + dy };
}

/** Moves the real mouse and the drawn cursor together, with easing. */
async function moveTo({ x, y }, ms = 550) {
  const from = { ...mouse };
  const steps = Math.max(1, Math.round(ms / 16));
  for (let i = 1; i <= steps; i++) {
    const t = i / steps;
    const e = t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2;
    const p = { x: from.x + (x - from.x) * e, y: from.y + (y - from.y) * e };
    await page.send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: p.x, y: p.y, button: pressed ? 'left' : 'none', buttons: pressed ? 1 : 0 });
    await page.evaluate(`__demo.move(${p.x}, ${p.y})`);
    await sleep(16);
  }
  mouse = { x, y };
}

async function press(down) {
  pressed = down;
  await page.send('Input.dispatchMouseEvent', { type: down ? 'mousePressed' : 'mouseReleased', x: mouse.x, y: mouse.y, button: 'left', buttons: down ? 1 : 0, clickCount: 1 });
  await page.evaluate(`__demo.down(${down})`);
}

async function click(point) {
  await moveTo(point);
  await press(true);
  await sleep(90);
  await press(false);
}

/** Shows a click on a <select> and changes it like a user would; the native popup is not drawn headless. */
async function choose(selector, value) {
  await moveTo(await centerOf(selector));
  await page.evaluate('__demo.down(true)');
  await sleep(120);
  await page.evaluate(`(() => {
    const el = document.querySelector(${JSON.stringify(selector)});
    el.value = ${JSON.stringify(value)};
    el.dispatchEvent(new Event('change', { bubbles: true }));
    __demo.down(false);
  })()`);
}

async function typeText(text) {
  for (const ch of text) {
    await page.send('Input.insertText', { text: ch });
    await sleep(55);
  }
}

const sectionOrder = () => page.evaluate(`CV.state.sections.map((s) => s.type).join(',')`);

async function record() {
  const { server, url } = await serve(ROOT);
  const chrome = await launchChrome({ width: W, height: H });
  const frameDir = await mkdtemp(join(tmpdir(), 'cv-builder-demo-'));
  try {
    page = await connect(chrome.wsUrl, { origin: url });
    await page.send('Emulation.setDeviceMetricsOverride', { width: W, height: H, deviceScaleFactor: 1, mobile: false });
    await page.send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-color-scheme', value: 'light' }] });
    await page.load(url);
    await page.evaluate(`localStorage.clear(); localStorage.setItem('cvbuilder.ui.v1', JSON.stringify({ lang: '${LANG}', theme: 'light', zoom: 0.8, tab: 'content' }))`);
    await page.load(url);
    await page.evaluate(OVERLAY);
    await page.evaluate(SORTABLE_FALLBACK);
    // The real print dialog cannot be recorded; the click and the app's hint are shown instead.
    await page.evaluate('window.print = () => {}');
    await page.evaluate(`__demo.move(${mouse.x}, ${mouse.y})`);
    await sleep(300);
    page.reset();

    const frames = [];
    const started = performance.now();
    page.on((msg) => {
      if (msg.method !== 'Page.screencastFrame') return;
      frames.push({ data: msg.params.data, t: (performance.now() - started) / 1000 });
      page.send('Page.screencastFrameAck', { sessionId: msg.params.sessionId });
    });
    await page.send('Page.startScreencast', { format: 'png', everyNthFrame: 1, maxWidth: W, maxHeight: H });
    await sleep(500);

    // 1. Edit an entry on the page
    await caption(TEXT.edit);
    const jobTitle = '#sheet .cv-section[data-type="experience"] .ed[data-path$="items.0.title"]';
    await click(await centerOf(jobTitle));
    await page.evaluate(`(() => {
      const r = document.createRange();
      r.selectNodeContents(document.querySelector(${JSON.stringify(jobTitle)}));
      const sel = getSelection(); sel.removeAllRanges(); sel.addRange(r);
    })()`);
    await sleep(350);
    await typeText(TEXT.jobTitle);
    await sleep(400);
    await click({ x: W - 70, y: H - 120 }); // click the empty canvas to finish editing
    await sleep(450);

    // 2. Drag the Skills section above Experience
    await caption(TEXT.drag);
    const before = await sectionOrder();
    await moveTo(await centerOf('#sheet .cv-section[data-type="skills"] .cv-heading'), 700);
    await sleep(350); // the section controls appear on hover
    const grip = await centerOf('#sheet .cv-section[data-type="skills"] .grip[data-drag="section"]');
    await moveTo(grip, 350);
    await press(true);
    await moveTo({ x: grip.x + 3, y: grip.y - 12 }, 120);
    await moveTo(await centerOf('#sheet .cv-section[data-type="experience"] .cv-heading', 0, -4), 1100);
    await sleep(250);
    await press(false);
    await sleep(700);
    const after = await sectionOrder();
    if (after === before || after.indexOf('skills') > after.indexOf('experience')) throw new Error(`drag did not reorder: ${before} -> ${after}`);

    // 3. Switch templates
    await caption(TEXT.template);
    await click(await centerOf('.tabs [data-tab="design"]'));
    await sleep(400);
    await choose('#templateSelect', 'modern');
    await sleep(1400);
    await choose('#templateSelect', 'minimal');
    await sleep(1300);

    // 4. Review for ATS and apply the fix it offers
    await caption(TEXT.ats);
    await click(await centerOf('.tabs [data-tab="ats"]'));
    await page.waitFor(`!!document.querySelector('#panel-ats .ats-item[data-id="spacing"] [data-ats-fix]')`);
    await sleep(1200);
    await click(await centerOf('#panel-ats .ats-item[data-id="spacing"] [data-ats-fix]'));
    await page.waitFor(`!document.querySelector('#panel-ats .ats-item:not(.level-ok)')`);
    await sleep(1100);

    // 5. Save the PDF
    await caption(TEXT.pdf);
    await click(await centerOf('#btnPdf'));
    await sleep(3000);
    await page.send('Page.stopScreencast');
    const total = (performance.now() - started) / 1000;

    if (page.errors.length) throw new Error('errors in the page while recording:\n' + page.errors.join('\n'));
    if (frames.length < 20) throw new Error(`only ${frames.length} frames were captured`);

    // Frames arrive only when the page repaints, so each one lasts until the next.
    const list = [];
    for (let i = 0; i < frames.length; i++) {
      const name = `f${String(i).padStart(5, '0')}.png`;
      await writeFile(join(frameDir, name), Buffer.from(frames[i].data, 'base64'));
      const until = i + 1 < frames.length ? frames[i + 1].t : total;
      list.push(`file '${name}'`, `duration ${Math.max(0.001, until - frames[i].t).toFixed(3)}`);
    }
    list.push(list[list.length - 2]); // the concat demuxer ignores the last duration otherwise
    await writeFile(join(frameDir, 'frames.txt'), list.join('\n') + '\n');

    const filter = `fps=${FPS},scale=${GIF_WIDTH}:-1:flags=lanczos,split[a][b];` +
      '[a]palettegen=max_colors=128:stats_mode=diff[p];[b][p]paletteuse=dither=bayer:bayer_scale=5:diff_mode=rectangle';
    const ff = spawnSync(process.env.FFMPEG_PATH || 'ffmpeg',
      ['-y', '-loglevel', 'error', '-f', 'concat', '-safe', '0', '-i', 'frames.txt', '-vf', filter, '-loop', '0', OUT],
      { cwd: frameDir, stdio: 'inherit' });
    if (ff.error) throw new Error('FFmpeg not found; install it or set FFMPEG_PATH (' + ff.error.message + ')');
    if (ff.status !== 0) throw new Error('FFmpeg failed with exit code ' + ff.status);

    const { size } = await stat(OUT);
    console.log(`${OUT}: ${total.toFixed(1)} s, ${frames.length} frames, ${(size / 1024 / 1024).toFixed(2)} MB`);
  } finally {
    page?.close();
    await chrome.close();
    server.close();
    await rm(frameDir, { recursive: true, force: true }).catch(() => {});
  }
}

await record();
