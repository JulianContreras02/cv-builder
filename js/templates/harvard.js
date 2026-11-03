/* =====================================================================
   Plantilla "Harvard" — formato clásico de una columna:
   nombre centrado en mayúsculas, línea de contacto, títulos de sección
   en mayúsculas con línea inferior, entradas con organización en negrita
   y cargo en cursiva, fechas y lugar alineados a la derecha.

   Para crear otra plantilla copia este archivo, cambia el id, el css y
   el render, y añade su <script> en index.html.
   ===================================================================== */
(function () {
  'use strict';
  const CV = window.CV;

  const tpl = {
    id: 'harvard',
    name: 'Harvard',
    description: {
      es: 'Clásico de una columna, sobrio y legible. El formato más aceptado por reclutadores y sistemas ATS.',
      en: 'Classic single-column layout, sober and legible. The format most accepted by recruiters and ATS systems.',
    },

    /* Ajustes de tipografía recomendados al elegir esta plantilla */
    defaults: {
      fontFamily: "'Times New Roman', Times, serif",
      fontSize: 11,
      nameSize: 18,
      headingSize: 11.5,
      lineHeight: 1.25,
      sectionGap: 4,
      itemGap: 2.2,
      textColor: '#111111',
      accentColor: '#000000',
    },

    /* Opciones propias; la app las dibuja en "Opciones de la plantilla" */
    options: [
      { key: 'align', type: 'select', default: 'center', label: { es: 'Alineación del encabezado', en: 'Header alignment' },
        choices: [{ value: 'center', label: { es: 'Centrado', en: 'Centered' } }, { value: 'left', label: { es: 'Izquierda', en: 'Left' } }] },
      { key: 'uppercaseName', type: 'toggle', default: true, label: { es: 'Nombre en mayúsculas', en: 'Uppercase name' } },
      { key: 'uppercaseHeadings', type: 'toggle', default: true, label: { es: 'Títulos de sección en mayúsculas', en: 'Uppercase section headings' } },
      { key: 'headingRule', type: 'toggle', default: true, label: { es: 'Línea bajo los títulos de sección', en: 'Rule under section headings' } },
      { key: 'separator', type: 'select', default: '•', label: { es: 'Separador de la línea de contacto', en: 'Contact line separator' },
        choices: [{ value: '•', label: '•' }, { value: '|', label: '|' }, { value: '·', label: '·' }, { value: '—', label: '—' }] },
      { key: 'showTitle', type: 'toggle', default: true, label: { es: 'Mostrar título profesional bajo el nombre', en: 'Show professional title under the name' } },
    ],

    css: [
      '.tpl-harvard .cv-header { display: flex; align-items: center; gap: 6mm; margin-bottom: var(--gap-section); }',
      '.tpl-harvard .cv-header.photo-left { flex-direction: row; }',
      '.tpl-harvard .cv-header.photo-right { flex-direction: row-reverse; }',
      '.tpl-harvard .cv-head-text { flex: 1; min-width: 0; }',
      '.tpl-harvard.align-center .cv-head-text { text-align: center; }',
      '.tpl-harvard.align-left .cv-head-text { text-align: left; }',
      '.tpl-harvard .cv-name { display: block; font-size: var(--fs-name); font-weight: 700; line-height: 1.15; color: var(--accent); letter-spacing: 0.02em; margin: 0 0 1mm; }',
      '.tpl-harvard.name-upper .cv-name { text-transform: uppercase; }',
      '.tpl-harvard .cv-title { display: block; font-size: calc(var(--fs) + 0.5pt); margin-bottom: 1mm; }',
      '.tpl-harvard .cv-contacts { font-size: calc(var(--fs) - 0.5pt); }',
      '.tpl-harvard .contact-item { display: inline-block; }',
      '.tpl-harvard .contact-item:not(:last-child)::after { content: " " var(--sep) " "; white-space: pre; color: var(--text); }',
      '.tpl-harvard .cv-heading { font-size: var(--fs-heading); font-weight: 700; margin: var(--gap-section) 0 1.2mm; padding-bottom: 0.6mm; color: var(--accent); letter-spacing: 0.04em; line-height: 1.2; }',
      '.tpl-harvard.head-upper .cv-heading { text-transform: uppercase; }',
      '.tpl-harvard.head-rule .cv-heading { border-bottom: 1px solid var(--accent); }',
      '.tpl-harvard .cv-header + .cv-section .cv-heading { margin-top: 0; }',
      '.tpl-harvard .cv-item + .cv-item { margin-top: var(--gap-item); }',
      '.tpl-harvard .row { display: flex; justify-content: space-between; align-items: baseline; gap: 4mm; }',
      '.tpl-harvard .row .left { flex: 1; min-width: 0; }',
      '.tpl-harvard .row .right { text-align: right; white-space: nowrap; flex-shrink: 0; }',
      '.tpl-harvard .strong { font-weight: 700; }',
      '.tpl-harvard .italic { font-style: italic; }',
      '.tpl-harvard .desc { margin-top: 0.4mm; }',
      '.tpl-harvard .compact .strong::after { content: ""; }',
      '.tpl-harvard .cv-block { text-align: justify; }',
      /* Al imprimir, si un campo está vacío se oculta (sheet.css); aquí ocultamos su separador */
      '@media print { .tpl-harvard .contact-item:empty { display: none !important; } .tpl-harvard .contact-item:not(:last-child)::after { content: none; } .tpl-harvard .contact-item:not(:empty) ~ .contact-item:not(:empty)::before { content: " " var(--sep) " "; white-space: pre; } .tpl-harvard .cv-header:has(.cv-name:empty):has(.cv-title:empty) .cv-contacts:not(:has(.contact-item:not(:empty))) { display:none; } }',
    ].join('\n'),

    render(state, h, opt) {
      const p = state.profile;
      const s = state.settings;
      const t = h.t;

      const rootCls = ['tpl-harvard',
        'align-' + (opt.align || 'center'),
        opt.uppercaseName ? 'name-upper' : '',
        opt.uppercaseHeadings ? 'head-upper' : '',
        opt.headingRule ? 'head-rule' : '',
      ].filter(Boolean).join(' ');

      const contactKeys = ['location', 'phone', 'email', 'linkedin', 'website', 'github'];
      const contacts = contactKeys.map((k) => h.ed('profile.' + k, p[k], { cls: 'contact-item', ph: t('ph.' + k) })).join('');

      const header =
        '<header class="cv-header photo-' + h.esc(s.photo.position) + '">' +
          h.photo() +
          '<div class="cv-head-text">' +
            h.ed('profile.name', p.name, { tag: 'h1', cls: 'cv-name', ph: t('ph.name') }) +
            (opt.showTitle ? h.ed('profile.title', p.title, { cls: 'cv-title', ph: t('ph.title') }) : '') +
            '<div class="cv-contacts" style="--sep:\'' + h.esc(String(opt.separator || '•').replace(/'/g, '')) + '\'">' + contacts + '</div>' +
          '</div>' +
        '</header>';

      const sections = state.sections.map((sec, i) => {
        if (sec.visible === false) return '';
        return h.section(sec, i, h.heading(sec, i) + this.renderBody(sec, i, h));
      }).join('');

      return '<div class="' + rootCls + '" data-sections>' + header + sections + '</div>';
    },

    renderBody(sec, i, h) {
      const def = CV.SECTION_TYPES[sec.type] || CV.SECTION_TYPES.custom;
      if (def.layout === 'block') {
        return h.rich('sections.' + i + '.content', sec.content, { cls: 'cv-block', ph: h.ph(sec.type, 'content') });
      }
      return h.items(sec, i, (it, base) => this.renderItem(def, sec, it, base, h));
    },

    renderItem(def, sec, it, base, h) {
      const has = (k) => def.fields.includes(k);
      const E = (k, cls) => h.ed(base + '.' + k, it[k], { cls, ph: h.ph(sec.type, k) });
      const R = (k) => h.rich(base + '.' + k, it[k], { cls: 'desc', ph: h.ph(sec.type, k) });

      switch (def.layout) {
        case 'compact':
          return '<div class="compact">' + E('title', 'strong') + '<span class="sep">: </span>' + E('description', '') + '</div>';

        case 'line': {
          let html = '<div class="row"><span class="left">' + E('title', 'strong');
          if (has('org')) html += '<span class="sep">, </span>' + E('org', '');
          html += '</span>' + (has('dates') ? E('dates', 'right') : '') + '</div>';
          if (has('description')) html += R('description');
          return html;
        }

        case 'entry':
        default: {
          // Harvard: organización en negrita + lugar a la derecha; cargo en cursiva + fechas a la derecha.
          // Para tipos "titleFirst" (proyectos, referencias…) se invierte el orden.
          const first = def.orgFirst ? 'org' : 'title';
          const second = def.orgFirst ? 'title' : 'org';
          const r1right = def.orgFirst ? 'location' : 'dates';
          const r2right = def.orgFirst ? 'dates' : 'location';
          let html = '<div class="row">' + (has(first) ? E(first, 'strong left') : '<span class="left"></span>') + (has(r1right) ? E(r1right, 'right') : '') + '</div>';
          if (has(second) || has(r2right)) {
            html += '<div class="row">' + (has(second) ? E(second, 'italic left') : '<span class="left"></span>') + (has(r2right) ? E(r2right, 'right') : '') + '</div>';
          }
          if (has('description')) html += R('description');
          return html;
        }
      }
    },
  };

  CV.registerTemplate(tpl);
})();
