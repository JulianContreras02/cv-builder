/* =====================================================================
   Plantilla "Minimalista" — una columna, mucho aire y tipografía ligera.
   Las fechas van en una columna izquierda estrecha (opcional), los títulos
   de sección son discretos (gris, mayúsculas espaciadas) con una línea
   fina encima, y el nombre es grande y fino.
   ===================================================================== */
(function () {
  'use strict';
  const CV = window.CV;

  const tpl = {
    id: 'minimal',
    name: { es: 'Minimalista', en: 'Minimal' },
    description: {
      es: 'Una columna con aire y tipografía ligera: fechas en una columna izquierda, títulos discretos y líneas finas.',
      en: 'Airy single column with light typography: dates in a left column, subtle headings and thin rules.',
    },

    defaults: {
      fontFamily: "Helvetica, 'Helvetica Neue', Arial, sans-serif",
      fontSize: 10.5,
      nameSize: 26,
      headingSize: 9.5,
      lineHeight: 1.4,
      sectionGap: 6,
      itemGap: 3.2,
      textColor: '#1f1f1f',
      accentColor: '#111111',
    },

    options: [
      { key: 'gutter', type: 'toggle', default: true, label: { es: 'Fechas en una columna a la izquierda', en: 'Dates in a left column' } },
      { key: 'gutterWidth', type: 'range', default: 30, min: 22, max: 42, step: 1, label: { es: 'Ancho de la columna de fechas (mm)', en: 'Date column width (mm)' } },
      { key: 'nameWeight', type: 'select', default: 'light', label: { es: 'Peso del nombre', en: 'Name weight' },
        choices: [{ value: 'light', label: { es: 'Fino', en: 'Light' } }, { value: 'bold', label: { es: 'Negrita', en: 'Bold' } }] },
      { key: 'headingStyle', type: 'select', default: 'muted', label: { es: 'Títulos de sección', en: 'Section headings' },
        choices: [{ value: 'muted', label: { es: 'Gris discreto', en: 'Muted grey' } }, { value: 'accent', label: { es: 'Color de acento', en: 'Accent color' } }] },
      { key: 'rules', type: 'toggle', default: true, label: { es: 'Línea fina sobre cada sección', en: 'Thin rule above each section' } },
      { key: 'separator', type: 'select', default: '·', label: { es: 'Separador de la línea de contacto', en: 'Contact line separator' },
        choices: [{ value: '·', label: '·' }, { value: '|', label: '|' }, { value: '/', label: '/' }, { value: '•', label: '•' }] },
      { key: 'showTitle', type: 'toggle', default: true, label: { es: 'Mostrar título profesional bajo el nombre', en: 'Show professional title under the name' } },
    ],

    css: [
      '.tpl-minimal .cv-header { display: flex; align-items: flex-start; justify-content: space-between; gap: 8mm; margin-bottom: var(--gap-section); }',
      '.tpl-minimal .cv-header.photo-left { flex-direction: row-reverse; }',
      '.tpl-minimal .cv-head-text { flex: 1; min-width: 0; }',
      '.tpl-minimal .cv-name { display: block; font-size: var(--fs-name); font-weight: 300; letter-spacing: -0.01em; line-height: 1.05; color: var(--accent); margin: 0 0 1.5mm; }',
      '.tpl-minimal.name-bold .cv-name { font-weight: 700; }',
      '.tpl-minimal .cv-title { display: block; font-size: calc(var(--fs) + 1pt); opacity: 0.75; margin-bottom: 2mm; }',
      '.tpl-minimal .cv-contacts { font-size: calc(var(--fs) - 0.5pt); opacity: 0.85; }',
      '.tpl-minimal .contact-item { display: inline-block; }',
      '.tpl-minimal .contact-item:not(:last-child)::after { content: "  " var(--sep) "  "; white-space: pre; opacity: 0.6; }',
      '.tpl-minimal .cv-heading { font-size: var(--fs-heading); font-weight: 600; letter-spacing: 0.16em; text-transform: uppercase; color: #8a8a8a; margin: var(--gap-section) 0 2.2mm; padding-top: 2mm; line-height: 1.2; }',
      '.tpl-minimal.head-accent .cv-heading { color: var(--accent); }',
      '.tpl-minimal.rules .cv-heading { border-top: 0.25mm solid rgba(0, 0, 0, 0.18); }',
      '.tpl-minimal .cv-header + .cv-section .cv-heading { margin-top: 0; }',
      '.tpl-minimal .cv-item + .cv-item { margin-top: var(--gap-item); }',
      /* Con columna de fechas */
      '.tpl-minimal .entry { display: grid; grid-template-columns: var(--gutter-w, 30mm) minmax(0, 1fr); column-gap: 5mm; align-items: baseline; }',
      '.tpl-minimal .entry > .gutter { font-size: calc(var(--fs) - 1pt); color: #777; min-width: 0; }',
      '.tpl-minimal .entry > .gutter.strong { color: var(--text); font-size: var(--fs); }',
      '.tpl-minimal .entry > .body { min-width: 0; }',
      '.tpl-minimal .strong { font-weight: 700; }',
      '.tpl-minimal .meta { opacity: 0.8; }',
      '.tpl-minimal .meta .sep { opacity: 0.6; }',
      '.tpl-minimal .desc { margin-top: 0.6mm; }',
      '.tpl-minimal .cv-block { max-width: 160mm; }',
      /* Sin columna de fechas: fechas a la derecha */
      '.tpl-minimal .row { display: flex; justify-content: space-between; gap: 4mm; align-items: baseline; }',
      '.tpl-minimal .row .left { flex: 1; min-width: 0; }',
      '.tpl-minimal .row .right { white-space: nowrap; flex-shrink: 0; font-size: calc(var(--fs) - 1pt); color: #777; }',
      '@media print { .tpl-minimal .contact-item:empty { display: none !important; } .tpl-minimal .contact-item:not(:last-child)::after { content: none; } .tpl-minimal .contact-item:not(:empty) ~ .contact-item:not(:empty)::before { content: "  " var(--sep) "  "; white-space: pre; opacity: 0.6; } }',
    ].join('\n'),

    render(state, h, opt) {
      const p = state.profile;
      const s = state.settings;
      const t = h.t;
      const rootCls = ['tpl-minimal',
        'name-' + (opt.nameWeight === 'bold' ? 'bold' : 'light'),
        'head-' + (opt.headingStyle === 'accent' ? 'accent' : 'muted'),
        opt.rules ? 'rules' : '',
        opt.gutter ? 'with-gutter' : 'no-gutter',
      ].filter(Boolean).join(' ');

      const contactKeys = ['location', 'phone', 'email', 'linkedin', 'website', 'github'];
      const contacts = contactKeys.map((k) => h.ed('profile.' + k, p[k], { cls: 'contact-item', ph: t('ph.' + k) })).join('');
      const sep = String(opt.separator || '·').replace(/['"\\]/g, '');
      const gutterW = Math.max(18, Math.min(50, parseFloat(opt.gutterWidth) || 30));

      const header =
        '<header class="cv-header photo-' + h.esc(s.photo.position) + '">' +
          '<div class="cv-head-text">' +
            h.ed('profile.name', p.name, { tag: 'h1', cls: 'cv-name', ph: t('ph.name') }) +
            (opt.showTitle ? h.ed('profile.title', p.title, { cls: 'cv-title', ph: t('ph.title') }) : '') +
            '<div class="cv-contacts" style="--sep:\'' + h.esc(sep) + '\'">' + contacts + '</div>' +
          '</div>' +
          h.photo() +
        '</header>';

      const sections = state.sections.map((sec, i) => {
        if (sec.visible === false) return '';
        return h.section(sec, i, h.heading(sec, i) + this.renderBody(sec, i, h, opt));
      }).join('');

      return '<div class="' + rootCls + '" style="--sep:\'' + h.esc(sep) + '\'; --gutter-w:' + gutterW + 'mm" data-sections>' + header + sections + '</div>';
    },

    renderBody(sec, i, h, opt) {
      const def = CV.SECTION_TYPES[sec.type] || CV.SECTION_TYPES.custom;
      if (def.layout === 'block') {
        return h.rich('sections.' + i + '.content', sec.content, { cls: 'cv-block', ph: h.ph(sec.type, 'content') });
      }
      return h.items(sec, i, (it, base) => this.renderItem(def, sec, it, base, h, opt));
    },

    renderItem(def, sec, it, base, h, opt) {
      const has = (k) => def.fields.includes(k);
      const E = (k, cls) => h.ed(base + '.' + k, it[k], { cls, ph: h.ph(sec.type, k) });
      const R = (k) => h.rich(base + '.' + k, it[k], { cls: 'desc', ph: h.ph(sec.type, k) });
      const meta = () => {
        if (!has('org') && !has('location')) return '';
        return '<div class="meta">' + (has('org') ? E('org', '') : '') +
          (has('org') && has('location') ? '<span class="sep"> · </span>' : '') +
          (has('location') ? E('location', '') : '') + '</div>';
      };

      if (opt.gutter) {
        switch (def.layout) {
          case 'compact':
            return '<div class="entry"><div class="gutter strong">' + E('title', '') + '</div><div class="body">' + E('description', '') + '</div></div>';
          case 'line':
            return '<div class="entry"><div class="gutter">' + (has('dates') ? E('dates', '') : '') + '</div><div class="body">' +
              E('title', 'strong') + (has('org') ? '<span class="sep meta"> · </span>' + E('org', 'meta') : '') +
              (has('description') ? R('description') : '') + '</div></div>';
          case 'entry':
          default:
            return '<div class="entry"><div class="gutter">' + (has('dates') ? E('dates', '') : '') + '</div><div class="body">' +
              '<div>' + E('title', 'strong') + '</div>' + meta() + (has('description') ? R('description') : '') + '</div></div>';
        }
      }

      switch (def.layout) {
        case 'compact':
          return '<div class="compact">' + E('title', 'strong') + '<span class="sep">: </span>' + E('description', '') + '</div>';
        case 'line':
          return '<div class="row"><span class="left">' + E('title', 'strong') + (has('org') ? '<span class="sep meta"> · </span>' + E('org', 'meta') : '') + '</span>' +
            (has('dates') ? E('dates', 'right') : '') + '</div>' + (has('description') ? R('description') : '');
        case 'entry':
        default:
          return '<div class="row">' + E('title', 'strong left') + (has('dates') ? E('dates', 'right') : '') + '</div>' + meta() + (has('description') ? R('description') : '');
      }
    },
  };

  CV.registerTemplate(tpl);
})();
