/* ats.js: content checks, fixes and text extraction. The layout checks need a
   real rendered page, so tests/browser.test.mjs covers them in the app. */
(function () {
  'use strict';
  const { test, eq, ok, match } = T;
  T.group('ats');

  const sample = (lang) => CV.normalizeState(CV.sampleData(lang || 'en'));
  const levels = (findings) => Object.fromEntries(findings.map((f) => [f.id, f.level]));
  const finding = (state, id, ctx) => CV.ats.check(state, ctx).find((f) => f.id === id);
  const section = (state, type) => state.sections.find((s) => s.type === type);

  test('the sample resumes pass every content check', () => {
    ['es', 'en'].forEach((lang) => {
      CV.lang = lang;
      eq(CV.ats.check(sample(lang)).filter((f) => f.level !== 'ok').map((f) => f.id), [], lang);
    });
  });

  test('a blank resume reports the missing basics, worst first, each with an explanation', () => {
    const findings = CV.ats.check(CV.normalizeState({}));
    const l = levels(findings);
    eq([l.name, l.email, l.phone, l.location, l.experience, l.skills, l.summary], ['error', 'error', 'warn', 'info', 'warn', 'warn', 'info']);
    eq(findings[0].level, 'error', 'errors come first');
    ok(findings.every((f) => f.level === 'ok' || (f.title && f.detail)), 'every problem has a title and a reason');
  });

  test('an e-mail without a domain is flagged and quoted', () => {
    CV.lang = 'en';
    const st = sample();
    st.profile.email = 'laura@gmail';
    const f = finding(st, 'emailFormat');
    eq(f.level, 'error');
    match(f.detail, /"laura@gmail"/);
  });

  test('experience and education entries without dates are listed by name', () => {
    const st = sample();
    section(st, 'experience').items[1].dates = '';
    const f = finding(st, 'dates');
    eq(f.level, 'warn');
    match(f.detail, /Backend Developer, Tecnova Inc\./);
    ok(f.fix, 'offers to go to the field');
  });

  test('projects count as experience for people without a job yet', () => {
    const st = CV.normalizeState({ sections: [{ type: 'projects', items: [{ title: 'Inventory app', org: 'React', dates: '2024' }] }] });
    eq(levels(CV.ats.check(st)).experience, 'ok');
  });

  test('common section titles pass in both languages; creative or empty ones are flagged', () => {
    CV.lang = 'es';
    const st = sample('es');
    section(st, 'experience').title = 'Experiencia laboral';
    section(st, 'skills').title = 'Technical Skills';
    section(st, 'education').title = 'Formación académica';
    eq(levels(CV.ats.check(st)).titles, 'ok');
    section(st, 'experience').title = 'Mi camino';
    section(st, 'education').title = '';
    const f = finding(st, 'titles');
    eq(f.level, 'info');
    match(f.detail, /"Mi camino"/);
    match(f.detail, /\(sin título\)/);
  });

  test('the title fix renames the flagged sections in a single undo step', () => {
    const save = CV.save;
    CV.save = () => {}; // keep the real saved resume in localStorage untouched
    try {
      CV.lang = 'en';
      CV.clearHistory();
      CV.state = sample('en');
      section(CV.state, 'experience').title = 'My journey';
      section(CV.state, 'skills').title = 'Superpowers';
      finding(CV.state, 'titles').fix.run();
      eq([section(CV.state, 'experience').title, section(CV.state, 'skills').title], ['Professional Experience', 'Skills']);
      ok(CV.undo(), 'undo succeeds');
      eq([section(CV.state, 'experience').title, section(CV.state, 'skills').title], ['My journey', 'Superpowers']);
      ok(!CV.canUndo(), 'it was one step');
    } finally {
      CV.save = save;
      CV.clearHistory();
    }
  });

  test('hidden sections are ignored', () => {
    const st = sample();
    section(st, 'skills').visible = false;
    eq(levels(CV.ats.check(st)).skills, 'warn');
  });

  test('more than two pages is a warning, one or two are fine, unknown is skipped', () => {
    eq(levels(CV.ats.check(sample(), { pages: 3 })).pages, 'warn');
    eq(levels(CV.ats.check(sample(), { pages: 2 })).pages, 'ok');
    ok(!('pages' in levels(CV.ats.check(sample()))));
  });

  test('a photo on the page is mentioned as a suggestion', () => {
    const st = sample();
    st.settings.photo.show = true;
    st.profile.photo = 'data:image/png;base64,AAAA';
    eq(levels(CV.ats.check(st)).photo, 'info');
  });

  test('every check has its texts in both languages', () => {
    const empty = CV.normalizeState({});
    const full = sample();
    full.settings.photo.show = true;
    full.profile.photo = 'x';
    ['es', 'en'].forEach((lang) => {
      CV.lang = lang;
      CV.ats.check(empty, { pages: 3 }).concat(CV.ats.check(full, { pages: 1 })).forEach((f) => {
        ok(!/^ats\./.test(f.title) && !/^ats\./.test(f.detail || ''), lang + ': ' + f.id + ' has no missing translation');
      });
    });
  });

  test('text() reads in DOM order with uppercase, CSS separators and section breaks, skipping editor parts', () => {
    const style = document.createElement('style');
    style.textContent = '.fx .up { text-transform: uppercase } .fx .sep:not(:last-child)::after { content: " • " } .fx .gone { display: none }';
    const sheet = document.createElement('div');
    sheet.className = 'sheet fx';
    sheet.innerHTML = '<div><h1 class="up">Ana Pérez</h1><p><span class="sep">Bogotá</span><span class="sep">ana@example.com</span></p>' +
      '<section class="cv-section"><div class="cv-actions">Delete</div><h2>Skills</h2><ul><li>SQL</li><li>Python</li></ul>' +
      '<span class="ed" data-ph="Website"></span><p class="gone">hidden</p></section></div>';
    document.head.appendChild(style);
    document.body.appendChild(sheet);
    try {
      eq(CV.ats.text(sheet), 'ANA PÉREZ\nBogotá • ana@example.com\n\nSkills\n• SQL\n• Python');
      ok(!sheet.classList.contains('ats-reading'), 'the temporary class is removed');
    } finally {
      sheet.remove();
      style.remove();
    }
  });
})();
