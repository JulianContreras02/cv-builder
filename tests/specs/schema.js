/* schema.js: section types and sample data. */
(function () {
  'use strict';
  const { test, eq, ok } = T;
  T.group('schema');
  const LAYOUTS = ['block', 'entry', 'line', 'compact'];

  test('SECTION_ORDER lists every section type exactly once', () => {
    eq(CV.SECTION_ORDER.slice().sort(), Object.keys(CV.SECTION_TYPES).sort());
  });

  test('every section type has a valid layout, labels and placeholders in both languages', () => {
    Object.entries(CV.SECTION_TYPES).forEach(([type, def]) => {
      ok(LAYOUTS.includes(def.layout), type + ': layout');
      ok(def.label && def.label.es && def.label.en, type + ': label in es and en');
      ok(Array.isArray(def.fields) && def.fields.length, type + ': fields');
      def.fields.forEach((f) => ok(def.ph[f] && def.ph[f].es && def.ph[f].en, type + '.' + f + ': placeholder in es and en'));
    });
  });

  test('newSection creates content for block layouts and one empty item otherwise', () => {
    Object.entries(CV.SECTION_TYPES).forEach(([type, def]) => {
      const sec = CV.newSection(type);
      if (def.layout === 'block') eq(sec.content, '', type);
      else eq(Object.keys(sec.items[0]).sort(), ['id'].concat(def.fields).sort(), type);
    });
  });

  // The demo is public: sample contact data must never point at real people.
  test('sample resumes only use reserved, fictitious contact data', () => {
    ['es', 'en'].forEach((lang) => {
      const p = CV.sampleData(lang).profile;
      ok(/@example\.com$/.test(p.email), lang + ': e-mail uses example.com (RFC 2606)');
      ok(/-(ejemplo|example)$/.test(p.github) && /-(ejemplo|example)$/.test(p.linkedin), lang + ': handles are marked as examples');
      ok(p.phone === '+57 300 000 0000' || /555 01\d\d$/.test(p.phone), lang + ': phone is a placeholder or a 555-01xx number');
      eq(p.photo, '', lang + ': no photo');
    });
  });
})();
