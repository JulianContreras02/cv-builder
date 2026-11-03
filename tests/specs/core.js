/* core.js: sanitizer, text conversions, state normalization, history. */
(function () {
  'use strict';
  const { test, eq, ok, match, notMatch } = T;
  T.group('core');

  test('escapeHTML escapes the five HTML special characters', () => {
    eq(CV.escapeHTML(`<a href="x">'&'</a>`), '&lt;a href=&quot;x&quot;&gt;&#39;&amp;&#39;&lt;/a&gt;');
    eq(CV.escapeHTML(null), '');
  });

  test('sanitizeHTML removes scripts, styles and iframes with their content', () => {
    eq(CV.sanitizeHTML('<b>ok</b><script>alert(1)</script><style>b{}</style><iframe src="x"></iframe>'), '<b>ok</b>');
  });

  test('sanitizeHTML drops event handlers and inline styles', () => {
    eq(CV.sanitizeHTML('<b onclick="alert(1)" style="color:red">t</b>'), '<b>t</b>');
    eq(CV.sanitizeHTML('<img src="x" onerror="alert(1)">'), '');
  });

  test('sanitizeHTML keeps http, mailto and tel links and opens them safely', () => {
    eq(CV.sanitizeHTML('<a href="https://example.com">x</a>'), '<a href="https://example.com" target="_blank" rel="noopener">x</a>');
    match(CV.sanitizeHTML('<a href="mailto:a@example.com">m</a>'), /href="mailto:a@example.com"/);
    match(CV.sanitizeHTML('<a href="tel:+570000000">t</a>'), /href="tel:/);
  });

  test('sanitizeHTML strips javascript: and data: links', () => {
    notMatch(CV.sanitizeHTML('<a href="javascript:alert(1)">x</a>'), /href/);
    notMatch(CV.sanitizeHTML('<a href=" JaVaScRiPt:alert(1)">x</a>'), /href/);
    notMatch(CV.sanitizeHTML('<a href="data:text/html,<script>alert(1)</script>">x</a>'), /href/);
  });

  test('sanitizeHTML unwraps unknown tags but keeps their text', () => {
    eq(CV.sanitizeHTML('<h1>Title <em>here</em></h1><table><tr><td>cell</td></tr></table>'), 'Title <em>here</em>cell');
  });

  test('textToHtml turns "- " lines into a list and escapes text', () => {
    eq(CV.textToHtml('- one\n- two & three'), '<ul><li>one</li><li>two &amp; three</li></ul>');
    eq(CV.textToHtml('Just a line'), 'Just a line');
    eq(CV.textToHtml('Intro\n• a\n* b'), '<div>Intro</div><ul><li>a</li><li>b</li></ul>');
    eq(CV.textToHtml(''), '');
  });

  test('htmlToText and textToHtml round-trip a bulleted description', () => {
    const html = '<ul><li>First achievement</li><li>Second achievement</li></ul>';
    eq(CV.htmlToText(html), '- First achievement\n- Second achievement');
    eq(CV.textToHtml(CV.htmlToText(html)), html);
  });

  test('getPath and setPath follow dotted paths and create arrays for numeric keys', () => {
    const o = {};
    CV.setPath(o, 'sections.0.items.1.title', 'x');
    ok(Array.isArray(o.sections) && Array.isArray(o.sections[0].items), 'arrays are created');
    eq(CV.getPath(o, 'sections.0.items.1.title'), 'x');
    eq(CV.getPath(o, 'sections.5.title'), undefined);
  });

  test('deepMerge merges nested objects without mutating the base', () => {
    const base = { a: { b: 1, c: 2 }, d: [1] };
    const out = CV.deepMerge(base, { a: { c: 3 }, d: [2, 3] });
    eq(out, { a: { b: 1, c: 3 }, d: [2, 3] });
    eq(base, { a: { b: 1, c: 2 }, d: [1] });
  });

  test('normalizeState turns garbage into a valid empty state', () => {
    [null, 42, 'text', [], {}].forEach((raw) => {
      const st = CV.normalizeState(raw);
      eq(st.sections, []);
      eq(st.settings.paper, 'A4');
      eq(Object.keys(st.profile), Object.keys(CV.emptyProfile()));
    });
  });

  test('normalizeState clamps numbers and rejects unknown enum values', () => {
    const st = CV.normalizeState({ settings: {
      fontSize: 99, nameSize: '12,5', lineHeight: 'abc', paper: 'A0',
      margins: { top: -5, right: 100, bottom: '15', left: null },
      photo: { size: 1, shape: 'star', position: 'top', show: 'yes' },
    } });
    const s = st.settings;
    eq(s.fontSize, 16);
    eq(s.nameSize, 12.5, 'comma decimals are accepted');
    eq(s.lineHeight, 1.25, 'invalid numbers fall back to the default');
    eq(s.paper, 'A4');
    eq(s.margins, { top: 0, right: 60, bottom: 15, left: 20 });
    eq(s.photo, { show: true, shape: 'circle', size: 10, position: 'right' });
  });

  test('normalizeState sanitizes profile fields, titles and descriptions', () => {
    const st = CV.normalizeState({
      profile: { name: '<b>Ana</b> <img src=x onerror=alert(1)>', unknown: 'dropped' },
      sections: [{ type: 'experience', title: '<i>Work</i>', items: [{ title: 'Dev', description: '<p onclick="x">Did <script>bad()</script>things</p>' }] }],
    });
    eq(st.profile.name, 'Ana ');
    ok(!('unknown' in st.profile), 'unknown profile keys are dropped');
    eq(st.sections[0].title, 'Work');
    eq(st.sections[0].items[0].description, '<p>Did things</p>');
  });

  test('normalizeState maps unknown section types to custom and fixes duplicate ids', () => {
    const st = CV.normalizeState({ sections: [
      { id: 'a', type: 'nonsense', items: [{ title: 'x' }] },
      { id: 'a', type: 'summary', content: 'hi', visible: 'false' },
    ] });
    eq(st.sections[0].type, 'custom');
    ok(st.sections[1].id !== 'a', 'the second section gets a new id');
    eq(st.sections[1].visible, false, '"false" strings are read as false');
    eq(st.sections[1].content, 'hi');
  });

  test('normalizeState keeps and validates structured date data', () => {
    const st = CV.normalizeState({ sections: [{ type: 'experience', items: [
      { dates: 'Mar 2022 – Present', datesData: { precision: 'week', format: 'short', range: true, current: 'true', start: '2022-03', end: 'soon' } },
    ] }] });
    eq(st.sections[0].items[0].datesData, { precision: 'month', format: 'short', range: true, current: true, start: '2022-03', end: '' });
  });

  test('normalizeState is idempotent on the sample resumes', () => {
    ['es', 'en'].forEach((lang) => {
      const once = CV.normalizeState(CV.sampleData(lang));
      eq(CV.normalizeState(once), once, lang);
    });
  });

  test('undo and redo restore earlier states', () => {
    const save = CV.save;
    CV.save = () => {}; // keep the real saved resume in localStorage untouched
    try {
      CV.clearHistory();
      CV.state = CV.sampleData('en');
      const before = CV.state.sections.length;
      CV.addSection('awards');
      eq(CV.state.sections.length, before + 1);
      ok(CV.undo(), 'undo succeeds');
      eq(CV.state.sections.length, before);
      ok(CV.redo(), 'redo succeeds');
      eq(CV.state.sections.length, before + 1);
      eq(CV.state.sections[before].type, 'awards');
    } finally {
      CV.save = save;
      CV.clearHistory();
    }
  });
})();
