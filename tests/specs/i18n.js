/* i18n.js: translations and lookup helpers. */
(function () {
  'use strict';
  const { test, eq } = T;
  T.group('i18n');

  test('every language defines the same keys', () => {
    const keys = (lang) => Object.keys(CV.I18N[lang]);
    CV.LANGS.forEach((lang) => {
      eq(keys('es').filter((k) => !(k in CV.I18N[lang])), [], 'keys missing in ' + lang);
      eq(keys(lang).filter((k) => !(k in CV.I18N.es)), [], 'keys only in ' + lang);
    });
  });

  test('t() translates, fills {vars} and falls back to Spanish, then to the key', () => {
    CV.lang = 'en';
    eq(CV.t('btn.edit'), 'Edit');
    eq(CV.t('no.such.key'), 'no.such.key');
    CV.I18N.es['test.only'] = 'Hola {name}, {name}';
    try {
      eq(CV.t('test.only', { name: 'Ana' }), 'Hola Ana, Ana');
    } finally {
      delete CV.I18N.es['test.only'];
    }
  });

  test('L() resolves {es, en} objects and passes strings through', () => {
    CV.lang = 'en';
    eq(CV.L({ es: 'Moderna', en: 'Modern' }), 'Modern');
    eq(CV.L({ es: 'Solo español' }), 'Solo español');
    eq(CV.L('Harvard'), 'Harvard');
    eq(CV.L(null), '');
  });
})();
