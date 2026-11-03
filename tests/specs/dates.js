/* dates.js: formatting and parsing of date ranges. */
(function () {
  'use strict';
  const { test, eq } = T;
  const D = CV.dates;
  T.group('dates');

  test('formatOne formats months in both languages', () => {
    eq(D.formatOne('2022-03', 'month', 'short', 'en'), 'Mar 2022');
    eq(D.formatOne('2022-03', 'month', 'long', 'en'), 'March 2022');
    eq(D.formatOne('2022-03', 'month', 'long', 'es'), 'Marzo 2022');
    eq(D.formatOne('2022-03', 'month', 'numeric', 'es'), '03/2022');
  });

  test('formatOne formats days with each language order', () => {
    eq(D.formatOne('2022-03-15', 'day', 'numeric', 'en'), '03/15/2022');
    eq(D.formatOne('2022-03-15', 'day', 'numeric', 'es'), '15/03/2022');
    eq(D.formatOne('2022-03-15', 'day', 'long', 'en'), 'March 15, 2022');
    eq(D.formatOne('2022-03-15', 'day', 'long', 'es'), '15 de marzo de 2022');
    eq(D.formatOne('2022-03-15', 'day', 'iso', 'en'), '2022-03-15');
  });

  test('formatOne falls back to the precision the ISO value has', () => {
    eq(D.formatOne('2022', 'month', 'short', 'en'), '2022');
    eq(D.formatOne('2022-03-15', 'year', 'numeric', 'en'), '2022');
    eq(D.formatOne('soon', 'month', 'short', 'en'), '');
  });

  test('format joins ranges and translates "current"', () => {
    const data = { precision: 'month', format: 'short', range: true, current: true, start: '2022-03', end: '' };
    CV.lang = 'en';
    eq(D.format(data), 'Mar 2022 – Present');
    CV.lang = 'es';
    eq(D.format(data), 'Mar 2022 – Actual');
    eq(D.format({ precision: 'year', format: 'numeric', range: true, current: false, start: '2016', end: '2021' }), '2016 – 2021');
    eq(D.format({ precision: 'year', format: 'numeric', range: false, current: false, start: '2024', end: '' }), '2024');
  });

  test('parse reads text typed by hand', () => {
    CV.lang = 'es';
    eq(D.parse('Mar 2022 – Actual'), { precision: 'month', format: 'short', range: true, current: true, start: '2022-03', end: '' });
    eq(D.parse('2016 - 2021'), { precision: 'year', format: 'numeric', range: true, current: false, start: '2016', end: '2021' });
    eq(D.parse('Enero 2020 a Febrero 2022').end, '2022-02');
    CV.lang = 'en';
    eq(D.parse('January 2020 to Present').current, true);
    eq(D.parse('03/15/2022').start, '2022-03-15');
  });

  test('parse returns null for text that is not a date', () => {
    eq(D.parse(''), null);
    eq(D.parse('hello'), null);
  });

  // Reopening the picker on a typed date and applying it must not rewrite the text.
  test('parse then format gives back the same text for every month in both languages', () => {
    ['es', 'en'].forEach((lang) => {
      CV.lang = lang;
      for (let m = 1; m <= 12; m++) {
        const iso = '2021-' + String(m).padStart(2, '0');
        ['short', 'long', 'numeric'].forEach((fmt) => {
          const text = D.formatOne(iso, 'month', fmt, lang) + ' – ' + CV.t('date.currentLabel');
          const parsed = D.parse(text);
          eq(parsed && parsed.start, iso, lang + ' ' + fmt + ' "' + text + '" start');
          eq(D.format(parsed), text, lang + ' ' + fmt + ' "' + text + '" round trip');
        });
      }
    });
  });

  test('parse reads abbreviations that are not the exact short name', () => {
    CV.lang = 'en';
    eq(D.parse('Sept 2020').start, '2020-09');
    eq(D.parse('Sept 2020').format, 'short');
    eq(D.parse('Septem 2020').format, 'long');
  });
})();
