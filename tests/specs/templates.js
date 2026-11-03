/* Templates: the registration contract and what render() produces. */
(function () {
  'use strict';
  const { test, eq, ok } = T;
  T.group('templates');
  const OPTION_TYPES = ['toggle', 'select', 'range'];

  function renderWith(id, state) {
    CV.state = state;
    CV.state.settings.template = id;
    const tpl = CV.templates[id];
    const box = document.createElement('div');
    box.innerHTML = tpl.render(CV.state, CV.h, CV.ensureTemplateOptions());
    return box;
  }

  test('the three bundled templates are registered in order', () => {
    eq(CV.templateOrder, ['harvard', 'modern', 'minimal']);
  });

  test('every template has a name, description and option labels in both languages', () => {
    CV.templateOrder.forEach((id) => {
      const tpl = CV.templates[id];
      ['es', 'en'].forEach((lang) => {
        CV.lang = lang;
        ok(CV.L(tpl.name), id + ': name in ' + lang);
        ok(tpl.description && tpl.description[lang], id + ': description in ' + lang);
      });
      (tpl.options || []).forEach((opt) => {
        ok(opt.key && OPTION_TYPES.includes(opt.type), id + '.' + opt.key + ': key and type');
        ok(opt.label && opt.label.es && opt.label.en, id + '.' + opt.key + ': label in es and en');
        if (opt.type === 'select') ok(opt.choices && opt.choices.some((c) => c.value === opt.default), id + '.' + opt.key + ': default is one of the choices');
      });
    });
  });

  test('render draws one section per visible section inside data-sections containers', () => {
    CV.templateOrder.forEach((id) => {
      ['es', 'en'].forEach((lang) => {
        CV.lang = lang;
        const state = CV.sampleData(lang);
        state.sections[0].visible = false;
        const box = renderWith(id, state);
        ok(box.querySelector('[data-sections]'), id + ': has a data-sections container');
        const drawn = Array.from(box.querySelectorAll('[data-sections] > .cv-section')).map((el) => el.dataset.sid).sort();
        const visible = state.sections.filter((s) => s.visible).map((s) => s.id).sort();
        eq(drawn, visible, id + ' ' + lang + ': visible sections');
      });
    });
  });

  test('every editable field points at a value that exists in the state', () => {
    CV.templateOrder.forEach((id) => {
      const state = CV.sampleData('en');
      const box = renderWith(id, state);
      const paths = Array.from(box.querySelectorAll('.ed[data-path]')).map((el) => el.dataset.path);
      ok(paths.length > 20, id + ': renders editable fields');
      eq(paths.filter((p) => CV.getPath(state, p) === undefined), [], id + ': paths without a value');
    });
  });

  test('render escapes profile text instead of injecting HTML', () => {
    CV.templateOrder.forEach((id) => {
      const state = CV.sampleData('en');
      state.profile.name = '<img src=x onerror="window.__xss = 1">';
      state.sections[0].title = '<b>bold</b>';
      const box = renderWith(id, state);
      ok(!box.querySelector('img'), id + ': no <img> from the name');
      ok(!box.querySelector('.cv-heading b, h2 b'), id + ': no <b> from a section title');
    });
  });
})();
