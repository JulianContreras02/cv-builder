// Runs the unit test page and end-to-end smoke tests in headless Chrome.
//
//   node --test
//
// No npm packages: Node 22+ ships a WebSocket client, which is enough to drive
// Chrome through the DevTools protocol. Chrome or Chromium must be installed;
// set CHROME_PATH if it is not found in the usual places.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { extname, join, normalize, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(fileURLToPath(new URL('..', import.meta.url)));
const TEMPLATES = ['harvard', 'modern', 'minimal'];
const PAPER_MM = { A4: [210, 297], Letter: [215.9, 279.4] };
const MIME = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8', '.svg': 'image/svg+xml', '.png': 'image/png', '.json': 'application/json',
};

let server, chrome, profileDir, page, base;

/* ---------------- Static server for the repository ---------------- */
function serve() {
  const srv = createServer(async (req, res) => {
    const path = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
    const file = normalize(join(ROOT, path.endsWith('/') ? path + 'index.html' : path));
    if (!file.startsWith(ROOT + sep)) return res.writeHead(403).end();
    try {
      const body = await readFile(file);
      res.writeHead(200, { 'content-type': MIME[extname(file)] || 'application/octet-stream' }).end(body);
    } catch {
      res.writeHead(404).end('not found');
    }
  });
  return new Promise((ok) => srv.listen(0, '127.0.0.1', () => ok(srv)));
}

/* ---------------- Chrome and a minimal DevTools protocol client ---------------- */
function findChrome() {
  const found = [
    process.env.CHROME_PATH,
    'C:/Program Files/Google/Chrome/Application/chrome.exe',
    'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    '/usr/bin/google-chrome', '/usr/bin/google-chrome-stable', '/usr/bin/chromium', '/usr/bin/chromium-browser',
  ].find((p) => p && existsSync(p));
  if (!found) throw new Error('Chrome not found; set CHROME_PATH to the browser executable');
  return found;
}

const sleep = (ms) => new Promise((ok) => setTimeout(ok, ms));

async function launchChrome() {
  profileDir = await mkdtemp(join(tmpdir(), 'cv-builder-tests-'));
  const args = ['--headless=new', '--remote-debugging-port=0', `--user-data-dir=${profileDir}`, '--no-first-run',
    '--no-default-browser-check', '--disable-extensions', '--hide-scrollbars', '--window-size=1280,900'];
  // GitHub's Ubuntu 24.04 runners block the user namespaces Chrome's sandbox needs.
  if (process.env.CI) args.push('--no-sandbox', '--disable-dev-shm-usage');
  chrome = spawn(findChrome(), [...args, 'about:blank'], { stdio: 'ignore' });
  // With port 0 Chrome picks a free port and writes it to DevToolsActivePort.
  for (let i = 0; i < 150; i++) {
    try {
      const [port] = (await readFile(join(profileDir, 'DevToolsActivePort'), 'utf8')).split('\n');
      const targets = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json();
      const target = targets.find((t) => t.type === 'page');
      if (target) return target.webSocketDebuggerUrl;
    } catch { /* not ready yet */ }
    await sleep(100);
  }
  throw new Error('Chrome did not start');
}

async function connect(wsUrl) {
  const ws = new WebSocket(wsUrl);
  await new Promise((ok, fail) => { ws.onopen = ok; ws.onerror = fail; });
  let seq = 0;
  const pending = new Map();
  const listeners = new Set();
  ws.onmessage = (e) => {
    const msg = JSON.parse(e.data);
    if (msg.id) {
      const p = pending.get(msg.id);
      pending.delete(msg.id);
      if (msg.error) p.reject(new Error(msg.error.message)); else p.resolve(msg.result);
    } else {
      listeners.forEach((fn) => fn(msg));
    }
  };
  const send = (method, params = {}) => new Promise((resolve, reject) => {
    const id = ++seq;
    pending.set(id, { resolve, reject });
    ws.send(JSON.stringify({ id, method, params }));
  });
  const once = (method) => new Promise((ok) => {
    const fn = (msg) => { if (msg.method === method) { listeners.delete(fn); ok(msg.params); } };
    listeners.add(fn);
  });

  const errors = [];
  const dialogs = [];
  listeners.add((msg) => {
    if (msg.method === 'Runtime.exceptionThrown') errors.push(msg.params.exceptionDetails.exception?.description || msg.params.exceptionDetails.text);
    if (msg.method === 'Runtime.consoleAPICalled' && msg.params.type === 'error') errors.push('console.error: ' + msg.params.args.map((a) => a.value ?? a.description).join(' '));
    // Failed requests to our own server count; third-party ones (CDN, fonts) are the network's business.
    if (msg.method === 'Log.entryAdded' && msg.params.entry.level === 'error' && (!msg.params.entry.url || msg.params.entry.url.startsWith(base))) errors.push(msg.params.entry.text + ' ' + (msg.params.entry.url || ''));
    // Accept confirm() dialogs (import, reset) like a user clicking OK.
    if (msg.method === 'Page.javascriptDialogOpening') {
      dialogs.push(msg.params.message);
      send('Page.handleJavaScriptDialog', { accept: true });
    }
  });
  await Promise.all([send('Page.enable'), send('Runtime.enable'), send('Log.enable'), send('DOM.enable')]);

  const evaluate = async (expression) => {
    const r = await send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true });
    if (r.exceptionDetails) throw new Error('evaluate failed: ' + (r.exceptionDetails.exception?.description || r.exceptionDetails.text));
    return r.result.value;
  };
  return {
    send, evaluate, errors, dialogs,
    close: () => ws.close(),
    async load(url) {
      const loaded = once('Page.loadEventFired');
      await send('Page.navigate', { url });
      await loaded;
    },
    async waitFor(expression, ms = 5000) {
      for (const end = Date.now() + ms; Date.now() < end; await sleep(50)) {
        const v = await evaluate(expression);
        if (v) return v;
      }
      throw new Error('timed out waiting for ' + expression);
    },
    reset() { errors.length = 0; dialogs.length = 0; },
  };
}

/* ---------------- Helpers for the app ---------------- */
/** Opens the editor with a fresh sample resume in `lang` and switches to `template`. */
async function openApp(lang, template = 'harvard') {
  await page.load(base);
  await page.evaluate(`localStorage.clear(); localStorage.setItem('cvbuilder.ui.v1', JSON.stringify({ lang: '${lang}' }))`);
  await page.load(base);
  await setSelect('#templateSelect', template);
  page.reset();
}

/** Changes a <select> the way a user does, so the app's own change handler runs. */
function setSelect(selector, value) {
  return page.evaluate(`(() => {
    const el = document.querySelector(${JSON.stringify(selector)});
    el.value = ${JSON.stringify(value)};
    el.dispatchEvent(new Event('change', { bubbles: true }));
  })()`);
}

/** Prints like "Save as PDF" and returns the page count and the first page size in mm. */
async function printPdf() {
  await page.evaluate(`window.dispatchEvent(new Event('beforeprint'))`);
  const { data } = await page.send('Page.printToPDF', { preferCSSPageSize: true, printBackground: false });
  await page.evaluate(`window.dispatchEvent(new Event('afterprint'))`);
  const pdf = Buffer.from(data, 'base64').toString('latin1');
  const pages = (pdf.match(/\/Type\s*\/Page(?![a-zA-Z])/g) || []).length;
  const box = pdf.match(/\/MediaBox\s*\[\s*[\d.]+\s+[\d.]+\s+([\d.]+)\s+([\d.]+)\s*\]/);
  return { pages, size: box ? [box[1], box[2]].map((pt) => (pt / 72) * 25.4) : null };
}

function assertPaper(size, paper) {
  assert.ok(size, 'the PDF declares a page size');
  PAPER_MM[paper].forEach((mm, i) => assert.ok(Math.abs(size[i] - mm) < 1, `page is ${paper} (${size.map((v) => v.toFixed(1)).join(' x ')} mm)`));
}

/** What the print stylesheet leaves visible, checked with print media emulated. */
async function printView() {
  await page.send('Emulation.setEmulatedMedia', { media: 'print' });
  try {
    return await page.evaluate(`(() => {
      const shown = (el) => getComputedStyle(el).display !== 'none';
      return {
        editorChrome: ['.topbar', '.sidebar', '.fab', '.cv-actions', '.page-guides'].filter((s) => [...document.querySelectorAll(s)].some(shown)),
        // Placeholders are drawn with .ed:empty::before, so hiding empty fields hides them.
        emptyFieldsShown: [...document.querySelectorAll('#sheet .ed:empty')].filter(shown).map((el) => el.dataset.path),
      };
    })()`);
  } finally {
    await page.send('Emulation.setEmulatedMedia', { media: '' });
  }
}

/* ---------------- Setup ---------------- */
before(async () => {
  server = await serve();
  base = `http://127.0.0.1:${server.address().port}/`;
  page = await connect(await launchChrome());
});

after(async () => {
  page?.close();
  chrome?.kill();
  server?.close();
  if (profileDir) await rm(profileDir, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 }).catch(() => {});
});

/* ---------------- Tests ---------------- */
test('unit tests pass in the browser', { timeout: 30000 }, async (t) => {
  await page.load(base + 'tests/index.html');
  const r = await page.waitFor('window.__testResults', 15000);
  t.diagnostic(`${r.passed}/${r.total} browser unit tests passed`);
  assert.equal(r.failed, 0, '\n' + r.failures.map((f) => `✗ ${f.name}\n    ${f.message}`).join('\n'));
  assert.ok(r.total >= 40, 'the test page registered its specs');
});

for (const lang of ['es', 'en']) {
  for (const template of TEMPLATES) {
    test(`${template} (${lang}) renders, hides the editor in print and prints to A4`, { timeout: 30000 }, async (t) => {
      await openApp(lang, template);
      const drawn = await page.evaluate(`({
        drawn: document.querySelectorAll('#sheet [data-sections] > .cv-section').length,
        visible: CV.state.sections.filter((s) => s.visible).length,
        template: document.getElementById('sheet').dataset.template,
      })`);
      assert.equal(drawn.template, template);
      assert.equal(drawn.drawn, drawn.visible, 'one drawn section per visible section');

      const view = await printView();
      assert.deepEqual(view.editorChrome, [], 'editor controls are hidden when printing');
      assert.deepEqual(view.emptyFieldsShown, [], 'empty fields and their placeholders are hidden when printing');

      const pdf = await printPdf();
      t.diagnostic(`${pdf.pages} page(s)`);
      assertPaper(pdf.size, 'A4');
      assert.ok(pdf.pages >= 1 && pdf.pages <= 3, `the sample prints on 1 to 3 pages (got ${pdf.pages})`);
      assert.deepEqual(page.errors, [], 'no errors in the console');
    });
  }
}

test('the print title is the suggested PDF file name', { timeout: 30000 }, async () => {
  await openApp('en');
  const before = await page.evaluate('document.title');
  await page.evaluate(`window.dispatchEvent(new Event('beforeprint'))`);
  assert.equal(await page.evaluate('document.title'), 'Resume - Alex Morgan');
  await page.evaluate(`window.dispatchEvent(new Event('afterprint'))`);
  assert.equal(await page.evaluate('document.title'), before, 'the title is restored after printing');
});

test('the paper size chosen in the design panel reaches the PDF', { timeout: 30000 }, async () => {
  await openApp('en');
  await setSelect('select[data-setting="paper"]', 'Letter');
  assertPaper((await printPdf()).size, 'Letter');
  assert.deepEqual(page.errors, []);
});

test('importing a JSON file through the Import button replaces the resume', { timeout: 30000 }, async () => {
  await openApp('es');
  const data = JSON.parse(await page.evaluate('CV.toJSON()'));
  data.profile.name = 'Persona Importada';
  const file = join(profileDir, 'import.json');
  await writeFile(file, JSON.stringify(data));
  const { root } = await page.send('DOM.getDocument');
  const { nodeId } = await page.send('DOM.querySelector', { nodeId: root.nodeId, selector: '#fileImport' });
  await page.send('DOM.setFileInputFiles', { nodeId, files: [file] });
  await page.waitFor(`CV.state.profile.name === 'Persona Importada'`);
  assert.equal(page.dialogs.length, 1, 'the user is asked before replacing a resume with content');
  assert.match(await page.evaluate(`document.getElementById('sheet').innerText`), /Persona Importada/i);
  assert.deepEqual(page.errors, []);
});

test('"Start from scratch" leaves a blank resume that prints without placeholder text', { timeout: 30000 }, async () => {
  await openApp('en');
  await page.evaluate(`document.getElementById('menuReset').click()`);
  await page.waitFor(`CV.state.profile.name === ''`);
  const view = await printView();
  assert.deepEqual(view.emptyFieldsShown, [], 'empty fields and their placeholders are hidden when printing');
  const pdf = await printPdf();
  assert.equal(pdf.pages, 1);
  assert.deepEqual(page.errors, []);
});
