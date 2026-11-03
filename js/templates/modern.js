/* =====================================================================
   Plantilla "Moderna" — dos columnas:
   · Columna lateral (izquierda o derecha): foto, contactos con íconos y
     las secciones compactas (habilidades, idiomas, certificaciones,
     intereses).
   · Columna principal: nombre grande en color de acento, título
     profesional y el resto de secciones (perfil, experiencia, educación,
     proyectos…), con cargo en negrita y organización en color de acento.

   La columna de cada sección la decide su tipo (SIDE_TYPES). Cada columna
   es su propio contenedor data-sections, así que el arrastre reordena
   dentro de la columna.
   ===================================================================== */
(function () {
  'use strict';
  const CV = window.CV;

  /* Tipos de sección que van en la columna lateral */
  const SIDE_TYPES = new Set(['skills', 'languages', 'certifications', 'interests']);

  const I = (d) => '<svg viewBox="0 0 24 24" aria-hidden="true">' + d + '</svg>';
  const ICONS = {
    location: I('<path d="M12 22s7-7.1 7-12a7 7 0 0 0-14 0c0 4.9 7 12 7 12z"/><circle cx="12" cy="10" r="2.5"/>'),
    phone: I('<path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1.9.4 1.8.7 2.7a2 2 0 0 1-.5 2.1L8 9.8a16 16 0 0 0 6.2 6.2l1.3-1.3a2 2 0 0 1 2.1-.5c.9.3 1.8.6 2.7.7a2 2 0 0 1 1.7 2z"/>'),
    email: I('<rect x="2" y="4" width="20" height="16" rx="2"/><path d="m2 7 10 7 10-7"/>'),
    linkedin: I('<path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-4 0v7h-4v-7a6 6 0 0 1 6-6z"/><rect x="2" y="9" width="4" height="12"/><circle cx="4" cy="4" r="2"/>'),
    website: I('<circle cx="12" cy="12" r="10"/><path d="M2 12h20M12 2a15 15 0 0 1 0 20 15 15 0 0 1 0-20"/>'),
    github: I('<path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.9a3.4 3.4 0 0 0-.9-2.6c3.1-.3 6.4-1.5 6.4-7A5.4 5.4 0 0 0 20 4.8 5 5 0 0 0 19.9 1s-1.2-.3-3.9 1.5a13.4 13.4 0 0 0-7 0C6.3.7 5.1 1 5.1 1A5 5 0 0 0 5 4.8a5.4 5.4 0 0 0-1.5 3.7c0 5.5 3.3 6.7 6.4 7a3.4 3.4 0 0 0-.9 2.6V22"/>'),
  };

  const tpl = {
    id: 'modern',
    name: { es: 'Moderna', en: 'Modern' },
    description: {
      es: 'Dos columnas: lateral con foto, contactos y habilidades; principal con experiencia y educación. Color de acento configurable.',
      en: 'Two columns: sidebar with photo, contacts and skills; main column with experience and education. Configurable accent color.',
    },

    defaults: {
      fontFamily: "'Segoe UI', Roboto, 'Helvetica Neue', sans-serif",
      fontSize: 10.5,
      nameSize: 24,
      headingSize: 11,
      lineHeight: 1.3,
      sectionGap: 5,
      itemGap: 2.6,
      textColor: '#1f2937',
      accentColor: '#1f4e79',
    },

    options: [
      { key: 'side', type: 'select', default: 'left', label: { es: 'Lado de la columna lateral', en: 'Sidebar side' },
        choices: [{ value: 'left', label: { es: 'Izquierda', en: 'Left' } }, { value: 'right', label: { es: 'Derecha', en: 'Right' } }] },
      { key: 'sideStyle', type: 'select', default: 'tint', label: { es: 'Fondo de la columna lateral', en: 'Sidebar background' },
        choices: [
          { value: 'tint', label: { es: 'Tono suave del color de acento', en: 'Soft tint of the accent color' } },
          { value: 'solid', label: { es: 'Color de acento sólido (texto blanco)', en: 'Solid accent color (white text)' } },
          { value: 'line', label: { es: 'Sin fondo, solo una línea', en: 'No background, just a rule' } },
        ] },
      { key: 'sideWidth', type: 'range', default: 62, min: 48, max: 80, step: 1, label: { es: 'Ancho de la columna lateral (mm)', en: 'Sidebar width (mm)' } },
      { key: 'nameStyle', type: 'select', default: 'accent', label: { es: 'Estilo del nombre', en: 'Name style' },
        choices: [{ value: 'accent', label: { es: 'Texto en color de acento', en: 'Accent-colored text' } }, { value: 'band', label: { es: 'Banda de color detrás del nombre', en: 'Color band behind the name' } }] },
      { key: 'uppercaseHeadings', type: 'toggle', default: true, label: { es: 'Títulos de sección en mayúsculas', en: 'Uppercase section headings' } },
      { key: 'showIcons', type: 'toggle', default: true, label: { es: 'Íconos en los datos de contacto', en: 'Icons next to contact details' } },
      { key: 'showTitle', type: 'toggle', default: true, label: { es: 'Mostrar título profesional bajo el nombre', en: 'Show professional title under the name' } },
    ],

    css: [
      /* --- Rejilla de dos columnas --- */
      '.tpl-modern { display: grid; grid-template-columns: var(--side-w, 62mm) minmax(0, 1fr); column-gap: 7mm; align-items: start; }',
      '.tpl-modern.side-right { grid-template-columns: minmax(0, 1fr) var(--side-w, 62mm); }',
      '.tpl-modern > .cv-side, .tpl-modern > .cv-main { min-width: 0; }',

      /* --- Columna lateral: llena al menos la primera página; en páginas siguientes solo
             continúa si tiene contenido (así no queda un bloque de color vacío) --- */
      '.tpl-modern .cv-side { font-size: calc(var(--fs) - 0.5pt); min-height: calc(var(--paper-h) - var(--m-top) - var(--m-bottom)); -webkit-print-color-adjust: exact; print-color-adjust: exact; }',
      '.tpl-modern .cv-side-inner { padding: 5mm 4.5mm; }',
      '.tpl-modern.sidestyle-tint .cv-side { background: color-mix(in srgb, var(--accent) 9%, #fff); border-radius: 2.5mm; }',
      '.tpl-modern.sidestyle-solid .cv-side { background: var(--accent); color: #fff; border-radius: 2.5mm; }',
      '.tpl-modern.sidestyle-line .cv-side .cv-side-inner { padding-left: 0; padding-right: 0; }',
      '.tpl-modern.sidestyle-line.side-left .cv-side { border-right: 0.5mm solid var(--accent); padding-right: 4mm; }',
      '.tpl-modern.sidestyle-line.side-right .cv-side { border-left: 0.5mm solid var(--accent); padding-left: 4mm; }',
      '.tpl-modern .cv-photo { margin: 0 auto 4.5mm; }',
      '.tpl-modern .cv-contacts { margin-bottom: var(--gap-section); }',
      '.tpl-modern .contact-row { display: flex; gap: 2.2mm; align-items: flex-start; margin-bottom: 1.4mm; }',
      '.tpl-modern .contact-row svg { width: 3.6mm; height: 3.6mm; flex-shrink: 0; margin-top: 0.35mm; fill: none; stroke: currentColor; stroke-width: 2; stroke-linecap: round; stroke-linejoin: round; color: var(--accent); }',
      '.tpl-modern .contact-row .contact-val { flex: 1; min-width: 0; }',
      '.tpl-modern.sidestyle-solid .contact-row svg { color: #fff; }',
      '.tpl-modern .cv-side .compact { margin-bottom: 1.2mm; }',
      '.tpl-modern .cv-side .compact .strong { display: block; }',
      '.tpl-modern .cv-side .line-title { display: block; font-weight: 700; }',
      '.tpl-modern .cv-side .line-org, .tpl-modern .cv-side .line-dates { display: block; font-size: calc(var(--fs) - 1pt); opacity: 0.85; }',
      '.tpl-modern .cv-side .cv-item + .cv-item { margin-top: calc(var(--gap-item) * 0.8); }',

      /* --- Columna principal --- */
      '.tpl-modern .cv-header { margin-bottom: var(--gap-section); }',
      '.tpl-modern .cv-name { display: block; font-size: var(--fs-name); font-weight: 800; line-height: 1.1; color: var(--accent); letter-spacing: -0.01em; margin-bottom: 1.2mm; }',
      '.tpl-modern .cv-title { display: block; font-size: calc(var(--fs) + 1.5pt); font-weight: 500; opacity: 0.8; }',
      '.tpl-modern.name-band .cv-header { background: var(--accent); color: #fff; padding: 4.5mm 6mm; border-radius: 2.5mm; -webkit-print-color-adjust: exact; print-color-adjust: exact; }',
      '.tpl-modern.name-band .cv-name { color: #fff; }',
      '.tpl-modern.name-band .cv-title { opacity: 0.92; }',

      /* --- Títulos de sección --- */
      '.tpl-modern .cv-heading { display: flex; align-items: center; gap: 2.5mm; font-size: var(--fs-heading); font-weight: 700; color: var(--accent); letter-spacing: 0.08em; margin: var(--gap-section) 0 1.6mm; line-height: 1.2; }',
      '.tpl-modern .cv-heading::after { content: ""; flex: 1; height: 0.35mm; background: var(--accent); opacity: 0.4; }',
      '.tpl-modern.head-upper .cv-heading { text-transform: uppercase; }',
      '.tpl-modern [data-sections] > .cv-section:first-child .cv-heading { margin-top: 0; }',
      '.tpl-modern.sidestyle-solid .cv-side .cv-heading { color: #fff; }',
      '.tpl-modern.sidestyle-solid .cv-side .cv-heading::after { background: #fff; }',

      /* --- Entradas --- */
      '.tpl-modern .cv-item + .cv-item { margin-top: var(--gap-item); }',
      '.tpl-modern .row { display: flex; justify-content: space-between; align-items: baseline; gap: 4mm; }',
      '.tpl-modern .row .left { flex: 1; min-width: 0; }',
      '.tpl-modern .row .right { text-align: right; white-space: nowrap; flex-shrink: 0; font-size: calc(var(--fs) - 1pt); opacity: 0.75; }',
      '.tpl-modern .strong { font-weight: 700; }',
      '.tpl-modern .org { font-weight: 600; color: var(--accent); }',
      '.tpl-modern .org-inline { opacity: 0.8; }',
      '.tpl-modern .desc { margin-top: 0.6mm; }',
      '.tpl-modern .cv-block { text-align: justify; }',
      '.tpl-modern.sidestyle-solid .cv-side .ed:empty::before { color: rgba(255,255,255,0.6); }',

      /* --- Impresión --- */
      '@media print { .tpl-modern .contact-row:has(.ed:empty) { display: none !important; } .tpl-modern .cv-side, .tpl-modern .cv-main { break-inside: auto; } }',
    ].join('\n'),

    render(state, h, opt) {
      const p = state.profile;
      const t = h.t;

      const rootCls = ['tpl-modern',
        'side-' + (opt.side === 'right' ? 'right' : 'left'),
        'sidestyle-' + (['tint', 'solid', 'line'].includes(opt.sideStyle) ? opt.sideStyle : 'tint'),
        'name-' + (opt.nameStyle === 'band' ? 'band' : 'accent'),
        opt.uppercaseHeadings ? 'head-upper' : '',
      ].filter(Boolean).join(' ');

      const contactKeys = ['location', 'phone', 'email', 'linkedin', 'website', 'github'];
      const contacts = contactKeys.map((k) =>
        '<div class="contact-row">' + (opt.showIcons ? ICONS[k] : '') +
        h.ed('profile.' + k, p[k], { cls: 'contact-val', ph: t('ph.' + k) }) + '</div>').join('');

      const sideSecs = [];
      const mainSecs = [];
      state.sections.forEach((sec, i) => {
        if (sec.visible === false) return;
        const inSide = SIDE_TYPES.has(sec.type);
        const html = h.section(sec, i, h.heading(sec, i) + this.renderBody(sec, i, h, inSide));
        (inSide ? sideSecs : mainSecs).push(html);
      });

      const side =
        '<aside class="cv-side"><div class="cv-side-inner">' +
          h.photo() +
          '<div class="cv-contacts">' + contacts + '</div>' +
          '<div class="cv-side-sections" data-sections="side">' + sideSecs.join('') + '</div>' +
        '</div></aside>';

      const main =
        '<main class="cv-main">' +
          '<header class="cv-header">' +
            h.ed('profile.name', p.name, { tag: 'h1', cls: 'cv-name', ph: t('ph.name') }) +
            (opt.showTitle ? h.ed('profile.title', p.title, { cls: 'cv-title', ph: t('ph.title') }) : '') +
          '</header>' +
          '<div class="cv-main-sections" data-sections="main">' + mainSecs.join('') + '</div>' +
        '</main>';

      const sideW = Math.max(40, Math.min(90, parseFloat(opt.sideWidth) || 62));
      return '<div class="' + rootCls + '" style="--side-w:' + sideW + 'mm">' + (opt.side === 'right' ? main + side : side + main) + '</div>';
    },

    renderBody(sec, i, h, inSide) {
      const def = CV.SECTION_TYPES[sec.type] || CV.SECTION_TYPES.custom;
      if (def.layout === 'block') {
        return h.rich('sections.' + i + '.content', sec.content, { cls: 'cv-block', ph: h.ph(sec.type, 'content') });
      }
      return h.items(sec, i, (it, base) => this.renderItem(def, sec, it, base, h, inSide));
    },

    renderItem(def, sec, it, base, h, inSide) {
      const has = (k) => def.fields.includes(k);
      const E = (k, cls) => h.ed(base + '.' + k, it[k], { cls, ph: h.ph(sec.type, k) });
      const R = (k) => h.rich(base + '.' + k, it[k], { cls: 'desc', ph: h.ph(sec.type, k) });

      if (inSide) {
        // Columna estrecha: todo apilado en líneas
        switch (def.layout) {
          case 'compact':
            return '<div class="compact">' + E('title', 'strong') + E('description', 'compact-desc') + '</div>';
          case 'line':
            return '<div class="side-line">' + E('title', 'line-title') +
              (has('org') ? E('org', 'line-org') : '') + (has('dates') ? E('dates', 'line-dates') : '') +
              (has('description') ? R('description') : '') + '</div>';
          default:
            return '<div class="side-line">' + E('title', 'line-title') +
              (has('org') ? E('org', 'line-org') : '') + (has('location') ? E('location', 'line-org') : '') +
              (has('dates') ? E('dates', 'line-dates') : '') + (has('description') ? R('description') : '') + '</div>';
        }
      }

      switch (def.layout) {
        case 'compact':
          return '<div class="compact">' + E('title', 'strong') + '<span class="sep">: </span>' + E('description', '') + '</div>';

        case 'line': {
          let html = '<div class="row"><span class="left">' + E('title', 'strong');
          if (has('org')) html += '<span class="sep"> · </span>' + E('org', 'org-inline');
          html += '</span>' + (has('dates') ? E('dates', 'right') : '') + '</div>';
          if (has('description')) html += R('description');
          return html;
        }

        case 'entry':
        default: {
          // Moderna: cargo/título en negrita + fechas; organización en color de acento + lugar.
          let html = '<div class="row">' + (has('title') ? E('title', 'strong left') : '<span class="left"></span>') + (has('dates') ? E('dates', 'right') : '') + '</div>';
          if (has('org') || has('location')) {
            html += '<div class="row">' + (has('org') ? E('org', 'org left') : '<span class="left"></span>') + (has('location') ? E('location', 'right') : '') + '</div>';
          }
          if (has('description')) html += R('description');
          return html;
        }
      }
    },
  };

  CV.registerTemplate(tpl);
})();
