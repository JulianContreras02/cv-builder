// Runs the unit test page and end-to-end smoke tests in headless Chrome.
//
//   node --test
//
// No npm packages: tools/devtools.mjs drives Chrome through the DevTools protocol
// with Node's built-in WebSocket (Node 22+). Chrome or Chromium must be installed;
// set CHROME_PATH if it is not found in the usual places.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { connect, launchChrome, serve } from '../tools/devtools.mjs';

const ROOT = resolve(fileURLToPath(new URL('..', import.meta.url)));
const TEMPLATES = ['harvard', 'modern', 'minimal'];
const PAPER_MM = { A4: [210, 297], Letter: [215.9, 279.4] };

let server, chrome, profileDir, page, base;

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
  ({ server, url: base } = await serve(ROOT));
  chrome = await launchChrome();
  profileDir = chrome.profileDir;
  page = await connect(chrome.wsUrl, { origin: base });
});

after(async () => {
  page?.close();
  await chrome?.close();
  server?.close();
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

/* ---------------- ATS tab ---------------- */
async function openAts(lang, template) {
  await openApp(lang, template);
  await page.evaluate(`document.querySelector('.tabs [data-tab="ats"]').click()`);
  await page.waitFor(`document.querySelectorAll('#panel-ats .ats-item').length > 0`);
}
const atsProblems = () => page.evaluate(`[...document.querySelectorAll('#panel-ats .ats-item:not(.level-ok)')].map((li) => li.dataset.id)`);
const atsText = () => page.evaluate(`document.getElementById('atsText').textContent`);
const clickFix = (id) => page.evaluate(`document.querySelector('#panel-ats .ats-item[data-id="${id}"] [data-ats-fix]').click()`);

test('ATS tab: Harvard passes every check and its text starts with the name', { timeout: 30000 }, async () => {
  await openAts('en', 'harvard');
  assert.deepEqual(await atsProblems(), []);
  assert.match(await atsText(), /^ALEX MORGAN\n/);
  assert.deepEqual(page.errors, []);
});

test('ATS tab: Modern warns about two columns and the fix switches to Harvard', { timeout: 30000 }, async () => {
  await openAts('en', 'modern');
  assert.deepEqual(await atsProblems(), ['columns']);
  assert.match(await atsText(), /^Austin, TX, USA\n/, 'the sidebar is read before the name');
  await clickFix('columns');
  await page.waitFor(`CV.state.settings.template === 'harvard' && !document.querySelector('#panel-ats .ats-item:not(.level-ok)')`);
  assert.equal(await page.evaluate(`document.getElementById('templateSelect').value`), 'harvard');
  assert.deepEqual(page.errors, []);
});

test('ATS tab: Minimal warns about letter-spaced headings and the fix turns the option off', { timeout: 30000 }, async () => {
  await openAts('es', 'minimal');
  assert.deepEqual(await atsProblems(), ['spacing']);
  await clickFix('spacing');
  await page.waitFor(`CV.state.settings.tpl.minimal.spacedHeadings === false && !document.querySelector('#panel-ats .ats-item:not(.level-ok)')`);
  const spacing = await page.evaluate(`(() => {
    const cs = getComputedStyle(document.querySelector('#sheet .cv-heading'));
    return parseFloat(cs.letterSpacing) / parseFloat(cs.fontSize);
  })()`);
  assert.ok(spacing < 0.1, `heading letter spacing is now ${spacing.toFixed(2)} em`);
  assert.ok(await page.evaluate('CV.canUndo()'), 'the fix can be undone');
  assert.deepEqual(page.errors, []);
});

test('ATS tab: the review follows edits on the page and "Go to field" focuses the field', { timeout: 30000 }, async () => {
  await openAts('en', 'harvard');
  await page.evaluate(`(() => {
    const el = document.querySelector('#sheet .ed[data-path="profile.email"]');
    el.textContent = '';
    el.dispatchEvent(new Event('input', { bubbles: true }));
  })()`);
  await page.waitFor(`!!document.querySelector('#panel-ats .ats-item.level-error[data-id="email"]')`);
  await clickFix('email');
  assert.equal(await page.evaluate('document.activeElement && document.activeElement.dataset.path'), 'profile.email');
  assert.deepEqual(page.errors, []);
});
