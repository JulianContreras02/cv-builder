/* =====================================================================
   harness.js — A tiny test harness that runs in any browser, so the
   tests need no npm packages and no build step.

     T.test('name', () => { T.eq(actual, expected); });
     T.run();   // renders the results and sets window.__testResults

   tests/browser.test.mjs opens tests/index.html in headless Chrome and
   reads window.__testResults; opening the page by hand shows the same.
   ===================================================================== */
(function () {
  'use strict';
  const tests = [];
  let group = '';

  function fmt(v) {
    try { return JSON.stringify(v); } catch (e) { return String(v); }
  }

  const T = (window.T = {
    /** Prefix for the tests registered after this call (one per spec file). */
    group(name) { group = name; },
    test(name, fn) { tests.push({ name: (group ? group + ' › ' : '') + name, fn }); },

    ok(value, msg) {
      if (!value) throw new Error(msg || 'expected a truthy value, got ' + fmt(value));
    },
    /** Deep equality through JSON (enough for plain data such as the CV state). */
    eq(actual, expected, msg) {
      const a = fmt(actual), e = fmt(expected);
      if (a !== e) throw new Error((msg ? msg + ': ' : '') + 'expected ' + e + ', got ' + a);
    },
    match(text, re, msg) {
      if (!re.test(String(text))) throw new Error((msg ? msg + ': ' : '') + fmt(text) + ' does not match ' + re);
    },
    notMatch(text, re, msg) {
      if (re.test(String(text))) throw new Error((msg ? msg + ': ' : '') + fmt(text) + ' should not match ' + re);
    },
    throws(fn, msg) {
      try { fn(); } catch (e) { return; }
      throw new Error(msg || 'expected the function to throw');
    },

    run() {
      // The specs mutate CV.lang and CV.state; restore them after every test.
      const lang = window.CV.lang, state = window.CV.state;
      const failures = [];
      tests.forEach((t) => {
        try { t.fn(); } catch (e) { failures.push({ name: t.name, message: e.message }); }
        window.CV.lang = lang; window.CV.state = state;
      });
      const result = { total: tests.length, passed: tests.length - failures.length, failed: failures.length, failures };
      window.__testResults = result;
      render(result);
      return result;
    },
  });

  function render(r) {
    const out = document.getElementById('results');
    const failed = new Set(r.failures.map((f) => f.name));
    document.title = (r.failed ? '✗ ' : '✓ ') + r.passed + '/' + r.total + ' tests';
    out.innerHTML = '<p class="summary ' + (r.failed ? 'bad' : 'good') + '">' + r.passed + ' of ' + r.total + ' passed</p>' +
      '<ul>' + tests.map((t) => {
        const f = r.failures.find((x) => x.name === t.name);
        return '<li class="' + (failed.has(t.name) ? 'bad' : 'good') + '">' + window.CV.escapeHTML(t.name) +
          (f ? '<pre>' + window.CV.escapeHTML(f.message) + '</pre>' : '') + '</li>';
      }).join('') + '</ul>';
  }
})();
