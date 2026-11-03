/* export.js: JSON and CSV export/import. */
(function () {
  'use strict';
  const { test, eq, throws } = T;
  T.group('export');

  const withoutItemIds = (sections) => sections.map((s) => Object.assign({}, s, s.items ? {
    items: s.items.map((it) => { const c = Object.assign({}, it); delete c.id; return c; }),
  } : {}));

  test('JSON export and import round-trip the whole state', () => {
    CV.state = CV.normalizeState(CV.sampleData('es'));
    const back = CV.importJSON(CV.toJSON());
    eq(back.profile, CV.state.profile);
    eq(back.settings, CV.state.settings);
    eq(back.sections, CV.state.sections);
  });

  test('JSON import rejects files that are not resumes', () => {
    throws(() => CV.importJSON('{"hello": "world"}'));
    throws(() => CV.importJSON('not json'));
  });

  test('CSV export and import round-trip profile, settings and sections', () => {
    ['es', 'en'].forEach((lang) => {
      CV.state = CV.normalizeState(CV.sampleData(lang));
      CV.state.sections[1].visible = false;
      const back = CV.importCSV(CV.toCSV());
      eq(back.profile, CV.state.profile, lang + ' profile');
      eq(back.settings, CV.state.settings, lang + ' settings');
      eq(withoutItemIds(back.sections), withoutItemIds(CV.state.sections), lang + ' sections');
    });
  });

  test('csvParse handles quotes, escaped quotes, line breaks and a BOM', () => {
    eq(CV.csvParse('﻿a,b\r\n"x, y","say ""hi"""\n"multi\nline",z\n'), [['a', 'b'], ['x, y', 'say "hi"'], ['multi\nline', 'z']]);
  });

  test('csvParse detects semicolon-separated files (Excel in Spanish locales)', () => {
    eq(CV.csvParse('scope;field;value\nprofile;name;"Ana; Pérez"'), [['scope', 'field', 'value'], ['profile', 'name', 'Ana; Pérez']]);
  });

  test('CSV import rejects files without the expected columns', () => {
    throws(() => CV.importCSV('a,b\n1,2'));
    throws(() => CV.importCSV(''));
  });

  test('importText picks the format from the content', () => {
    CV.state = CV.normalizeState(CV.sampleData('en'));
    eq(CV.importText(CV.toJSON(), 'x.txt').profile.name, 'Alex Morgan');
    eq(CV.importText(CV.toCSV(), 'x.csv').profile.name, 'Alex Morgan');
  });

  test('fileBase builds a safe file name in the UI language', () => {
    CV.state = CV.normalizeState({ profile: { name: '  Ana  María / "Pérez":  ' } });
    CV.lang = 'es';
    eq(CV.fileBase(), 'Hoja de Vida - Ana María Pérez');
    CV.lang = 'en';
    eq(CV.fileBase(), 'Resume - Ana María Pérez');
    CV.state = CV.normalizeState({});
    eq(CV.fileBase(), 'Resume');
  });
})();
