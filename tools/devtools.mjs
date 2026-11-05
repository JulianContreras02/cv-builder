// Drives headless Chrome through the DevTools protocol with no npm packages:
// a static file server, Chrome discovery and launch, and a small protocol client.
// Used by the tests (tests/browser.test.mjs) and the demo recorder
// (tools/record-demo.mjs). Needs Node 22+ for its built-in WebSocket client.
import { createServer } from 'node:http';
import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { extname, join, normalize, sep } from 'node:path';

const MIME = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8', '.svg': 'image/svg+xml', '.png': 'image/png', '.gif': 'image/gif', '.json': 'application/json',
};

export const sleep = (ms) => new Promise((ok) => setTimeout(ok, ms));

/** Serves the folder `root` on a free local port. Resolves to { server, url }. */
export function serve(root) {
  const server = createServer(async (req, res) => {
    const path = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
    const file = normalize(join(root, path.endsWith('/') ? path + 'index.html' : path));
    if (!file.startsWith(root + sep)) return res.writeHead(403).end();
    try {
      const body = await readFile(file);
      res.writeHead(200, { 'content-type': MIME[extname(file)] || 'application/octet-stream' }).end(body);
    } catch {
      res.writeHead(404).end('not found');
    }
  });
  return new Promise((ok) => server.listen(0, '127.0.0.1', () => ok({ server, url: `http://127.0.0.1:${server.address().port}/` })));
}

export function findChrome() {
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

/** Starts headless Chrome with a throwaway profile. Resolves to { wsUrl, profileDir, close() }. */
export async function launchChrome({ width = 1280, height = 900 } = {}) {
  const profileDir = await mkdtemp(join(tmpdir(), 'cv-builder-chrome-'));
  const args = ['--headless=new', '--remote-debugging-port=0', `--user-data-dir=${profileDir}`, '--no-first-run',
    '--no-default-browser-check', '--disable-extensions', '--hide-scrollbars', `--window-size=${width},${height}`];
  // GitHub's Ubuntu 24.04 runners block the user namespaces Chrome's sandbox needs.
  if (process.env.CI) args.push('--no-sandbox', '--disable-dev-shm-usage');
  const proc = spawn(findChrome(), [...args, 'about:blank'], { stdio: 'ignore' });
  const close = async () => {
    proc.kill();
    await rm(profileDir, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 }).catch(() => {});
  };
  // With port 0 Chrome picks a free port and writes it to DevToolsActivePort.
  for (let i = 0; i < 150; i++) {
    try {
      const [port] = (await readFile(join(profileDir, 'DevToolsActivePort'), 'utf8')).split('\n');
      const targets = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json();
      const target = targets.find((t) => t.type === 'page');
      if (target) return { wsUrl: target.webSocketDebuggerUrl, profileDir, close };
    } catch { /* not ready yet */ }
    await sleep(100);
  }
  await close();
  throw new Error('Chrome did not start');
}

/**
 * Connects to a page target. Collects page errors in `errors` (failed requests count
 * only when they go to `origin`) and accepts confirm() dialogs like a user clicking OK.
 */
export async function connect(wsUrl, { origin = '' } = {}) {
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
    if (msg.method === 'Log.entryAdded' && msg.params.entry.level === 'error' && (!msg.params.entry.url || msg.params.entry.url.startsWith(origin))) errors.push(msg.params.entry.text + ' ' + (msg.params.entry.url || ''));
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
    /** Subscribes to protocol events; returns a function that unsubscribes. */
    on(fn) { listeners.add(fn); return () => listeners.delete(fn); },
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
