/* =====================================================================
   render.js — Dibuja la hoja a partir del estado usando la plantilla
   activa, conecta la edición directa (contenteditable), los controles
   superpuestos, el drag and drop (SortableJS), la barra de formato
   flotante, el zoom y las guías de salto de página.

   Contrato con las plantillas (js/templates/*.js):
     CV.registerTemplate({
       id, name:{es,en}|'…', description:{es,en},
       defaults: { fontFamily, fontSize, … },   // ajustes sugeridos al elegirla
       options: [ { key, type:'toggle'|'select'|'range', default, label:{es,en}, choices?, min?, max?, step? } ],
       css: '…',                                 // estilos, idealmente bajo .tpl-<id>
       render(state, h, opt) → HTML string       // h = helpers de abajo
     })
   La plantilla DEBE usar h.section() para cada sección, h.items()/h.item()
   para las entradas y h.ed()/h.rich() para todo texto editable, y marcar
   con data-sections el contenedor directo de las secciones.
   ===================================================================== */
(function () {
  'use strict';
  const CV = window.CV;
  const esc = CV.escapeHTML;

  /* ---------------- Iconos SVG ---------------- */
  const svg = (inner, extra) => '<svg viewBox="0 0 24 24" aria-hidden="true"' + (extra || '') + '>' + inner + '</svg>';
  CV.ICONS = {
    grip: svg('<circle cx="9" cy="5" r="1.8"/><circle cx="15" cy="5" r="1.8"/><circle cx="9" cy="12" r="1.8"/><circle cx="15" cy="12" r="1.8"/><circle cx="9" cy="19" r="1.8"/><circle cx="15" cy="19" r="1.8"/>', ' style="fill:currentColor;stroke:none"'),
    plus: svg('<path d="M12 5v14M5 12h14"/>'),
    trash: svg('<path d="M3 6h18M8 6V4h8v2M6 6l1 14h10l1-14M10 11v6M14 11v6"/>'),
    eye: svg('<path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7S1 12 1 12z"/><circle cx="12" cy="12" r="3"/>'),
    eyeOff: svg('<path d="M17.9 17.9A10.9 10.9 0 0 1 12 19C5 19 1 12 1 12a18 18 0 0 1 5.1-5.9M9.9 4.2A10 10 0 0 1 12 4c7 0 11 8 11 8a18 18 0 0 1-2.2 3.2M1 1l22 22"/>'),
    copy: svg('<rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>'),
    undo: svg('<path d="M9 14 4 9l5-5"/><path d="M4 9h10a6 6 0 0 1 0 12h-3"/>'),
    redo: svg('<path d="m15 14 5-5-5-5"/><path d="M20 9H10a6 6 0 0 0 0 12h3"/>'),
    sun: svg('<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>'),
    moon: svg('<path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/>'),
    download: svg('<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3"/>'),
    upload: svg('<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12"/>'),
    print: svg('<path d="M6 9V3h12v6M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="7"/>'),
    zoomIn: svg('<circle cx="11" cy="11" r="7"/><path d="m21 21-4.3-4.3M11 8v6M8 11h6"/>'),
    zoomOut: svg('<circle cx="11" cy="11" r="7"/><path d="m21 21-4.3-4.3M8 11h6"/>'),
    fit: svg('<path d="M8 3H5a2 2 0 0 0-2 2v3M21 8V5a2 2 0 0 0-2-2h-3M3 16v3a2 2 0 0 0 2 2h3M16 21h3a2 2 0 0 0 2-2v-3"/>'),
    chevron: svg('<path d="m6 9 6 6 6-6"/>'),
    json: svg('<path d="M8 3H7a2 2 0 0 0-2 2v5a2 2 0 0 1-2 2 2 2 0 0 1 2 2v5a2 2 0 0 0 2 2h1M16 3h1a2 2 0 0 1 2 2v5a2 2 0 0 0 2 2 2 2 0 0 0-2 2v5a2 2 0 0 1-2 2h-1"/>'),
    table: svg('<rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M3 15h18M9 3v18"/>'),
    sparkle: svg('<path d="M12 3v4M12 17v4M3 12h4M17 12h4M5.6 5.6l2.8 2.8M15.6 15.6l2.8 2.8M5.6 18.4l2.8-2.8M15.6 8.4l2.8-2.8"/>'),
    lock: svg('<rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>'),
    edit: svg('<path d="M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z"/>'),
    image: svg('<rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="m21 15-5-5L5 21"/>'),
    ul: svg('<path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"/>'),
    ol: svg('<path d="M10 6h11M10 12h11M10 18h11M4 6h1v4M4 10h2M6 18H4c0-1 2-2 2-3s-1-1.5-2-1"/>'),
    link: svg('<path d="M10 13a5 5 0 0 0 7.5.5l3-3a5 5 0 0 0-7-7l-1.5 1.5"/><path d="M14 11a5 5 0 0 0-7.5-.5l-3 3a5 5 0 0 0 7 7l1.5-1.5"/>'),
    eraser: svg('<path d="m7 21-4.3-4.3c-1-1-1-2.5 0-3.4l9.6-9.6c1-1 2.5-1 3.4 0l5.6 5.6c1 1 1 2.5 0 3.4L13 21"/><path d="M22 21H7M5 11l9 9"/>'),
    up: svg('<path d="m18 15-6-6-6 6"/>'),
    down: svg('<path d="m6 9 6 6 6-6"/>'),
    chevronLeft: svg('<path d="m15 18-6-6 6-6"/>'),
    chevronRight: svg('<path d="m9 18 6-6-6-6"/>'),
    calendar: svg('<rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/>'),
  };
  CV.icon = (name) => CV.ICONS[name] || '';

  /* ---------------- Registro de plantillas ---------------- */
  CV.templates = {};
  CV.templateOrder = [];
  CV.registerTemplate = function (tpl) {
    if (!tpl || !tpl.id || typeof tpl.render !== 'function') throw new Error('Plantilla inválida');
    CV.templates[tpl.id] = tpl;
    if (!CV.templateOrder.includes(tpl.id)) CV.templateOrder.push(tpl.id);
  };
  CV.currentTemplate = function () {
    return CV.templates[CV.state.settings.template] || CV.templates[CV.templateOrder[0]];
  };
  /** Garantiza que settings.tpl[<id>] tenga todas las opciones de la plantilla. */
  CV.ensureTemplateOptions = function () {
    const tpl = CV.currentTemplate();
    const s = CV.state.settings;
    if (!CV.templates[s.template]) s.template = tpl.id;
    s.tpl = s.tpl || {};
    const o = (s.tpl[tpl.id] = s.tpl[tpl.id] || {});
    (tpl.options || []).forEach((opt) => { if (o[opt.key] === undefined) o[opt.key] = opt.default; });
    return o;
  };

  /* ---------------- Helpers para plantillas ---------------- */
  const supportsPlain = (() => {
    try { const d = document.createElement('div'); d.contentEditable = 'plaintext-only'; return d.contentEditable === 'plaintext-only'; } catch (e) { return false; }
  })();

  const h = (CV.h = {
    t: CV.t,
    L: CV.L,
    esc,
    icon: CV.icon,
    ph: (type, field) => CV.phFor(type, field),

    /** Texto editable de una línea. o = { tag, cls, ph, attrs } */
    ed(path, value, o) {
      o = o || {};
      const tag = o.tag || 'span';
      const rich = !!o.rich;
      const cls = ['ed', rich ? 'rich' : '', o.cls || ''].filter(Boolean).join(' ');
      const content = rich ? CV.sanitizeHTML(value || '') : esc(value || '');
      const ce = rich || !supportsPlain ? 'true' : 'plaintext-only';
      // Los campos de fechas (….dates) llevan data-kind="date" para ofrecer el selector de fechas
      const kind = o.kind || (/\.dates$/.test(path) ? 'date' : '');
      return '<' + tag + ' class="' + cls + '" contenteditable="' + ce + '" data-path="' + esc(path) + '" data-ph="' + esc(o.ph || '') + '"' + (rich ? ' data-rich="1"' : '') + (kind ? ' data-kind="' + esc(kind) + '"' : '') + (o.attrs ? ' ' + o.attrs : '') + '>' + content + '</' + tag + '>';
    },
    /** Texto enriquecido multilínea (viñetas, negrita…). */
    rich(path, value, o) {
      o = o || {};
      return h.ed(path, value, Object.assign({}, o, { rich: true, tag: o.tag || 'div' }));
    },

    /** Envoltorio de sección con sus controles de edición. */
    section(sec, index, inner) {
      const def = CV.SECTION_TYPES[sec.type] || CV.SECTION_TYPES.custom;
      const isBlock = def.layout === 'block';
      const t = CV.t;
      return '<section class="cv-section" data-index="' + index + '" data-sid="' + esc(sec.id) + '" data-type="' + esc(sec.type) + '">' +
        '<div class="cv-actions sec-actions" contenteditable="false">' +
          '<span class="act grip" data-drag="section" title="' + esc(t('sec.drag')) + '">' + CV.icon('grip') + '</span>' +
          (isBlock ? '' : '<button type="button" class="act" data-act="sec-add-item" title="' + esc(t('sec.addItem')) + '">' + CV.icon('plus') + '</button>') +
          '<button type="button" class="act" data-act="sec-hide" title="' + esc(t('sec.hide')) + '">' + CV.icon('eyeOff') + '</button>' +
          '<button type="button" class="act danger" data-act="sec-delete" title="' + esc(t('sec.delete')) + '">' + CV.icon('trash') + '</button>' +
        '</div>' + inner + '</section>';
    },

    /** Título de sección editable. */
    heading(sec, index, cls) {
      return '<h2 class="' + (cls || 'cv-heading') + '">' + h.ed('sections.' + index + '.title', sec.title, { ph: CV.t('ph.sectionTitle') }) + '</h2>';
    },

    /** Contenedor de entradas (necesario para el drag and drop de entradas). */
    items(sec, index, renderItem) {
      const items = (sec.items || []).map((it, j) => h.item(sec, index, j, renderItem(it, 'sections.' + index + '.items.' + j, j))).join('');
      return '<div class="cv-items" data-sid="' + esc(sec.id) + '">' + items + '</div>' + (sec.items && sec.items.length ? '' : h.emptyHint());
    },

    /** Envoltorio de una entrada con sus controles. */
    item(sec, sIndex, j, inner) {
      const t = CV.t;
      return '<div class="cv-item" data-index="' + j + '" data-sid="' + esc(sec.id) + '" data-path="sections.' + sIndex + '.items.' + j + '">' +
        '<div class="cv-actions item-actions" contenteditable="false">' +
          '<span class="act grip" data-drag="item" title="' + esc(t('sec.drag')) + '">' + CV.icon('grip') + '</span>' +
          '<button type="button" class="act" data-act="item-dup" title="' + esc(t('item.duplicate')) + '">' + CV.icon('copy') + '</button>' +
          '<button type="button" class="act danger" data-act="item-del" title="' + esc(t('item.delete')) + '">' + CV.icon('trash') + '</button>' +
        '</div>' + inner + '</div>';
    },

    emptyHint() {
      return '<div class="cv-empty" data-act="sec-add-item">' + esc(CV.t('sec.empty')) + '</div>';
    },

    /** Foto de perfil (o nada si está desactivada). */
    photo() {
      const s = CV.state.settings.photo;
      if (!s.show) return '';
      const src = CV.state.profile.photo;
      return '<div class="cv-photo shape-' + esc(s.shape) + ' pos-' + esc(s.position) + '" contenteditable="false">' +
        (src ? '<img src="' + esc(src) + '" alt="">' : '<button type="button" class="photo-placeholder" data-act="upload-photo">' + esc(CV.t('photo.add')) + '</button>') +
        '</div>';
    },
  });

  /* ---------------- Ajustes → CSS ---------------- */
  function ensureFontLoaded(fontValue) {
    const f = CV.FONTS.find((x) => x.value === fontValue);
    if (!f || !f.google) return;
    const id = 'gf-' + f.google.replace(/\W+/g, '-');
    if (document.getElementById(id)) return;
    const link = document.createElement('link');
    link.id = id; link.rel = 'stylesheet';
    link.href = 'https://fonts.googleapis.com/css2?family=' + f.google + '&display=swap';
    document.head.appendChild(link);
  }

  CV.applySettings = function () {
    const s = CV.state.settings;
    const sheet = document.getElementById('sheet');
    const paper = CV.PAPERS[s.paper] || CV.PAPERS.A4;
    const st = sheet.style;
    st.setProperty('--paper-w', paper.w + 'mm');
    st.setProperty('--paper-h', paper.h + 'mm');
    st.setProperty('--m-top', s.margins.top + 'mm');
    st.setProperty('--m-right', s.margins.right + 'mm');
    st.setProperty('--m-bottom', s.margins.bottom + 'mm');
    st.setProperty('--m-left', s.margins.left + 'mm');
    st.setProperty('--font', s.fontFamily);
    st.setProperty('--fs', s.fontSize + 'pt');
    st.setProperty('--fs-name', s.nameSize + 'pt');
    st.setProperty('--fs-heading', s.headingSize + 'pt');
    st.setProperty('--lh', s.lineHeight);
    st.setProperty('--gap-section', s.sectionGap + 'mm');
    st.setProperty('--gap-item', s.itemGap + 'mm');
    st.setProperty('--text', s.textColor);
    st.setProperty('--accent', s.accentColor);
    st.setProperty('--photo-size', s.photo.size + 'mm');
    ensureFontLoaded(s.fontFamily);
    document.getElementById('print-page').textContent =
      '@page { size: ' + paper.css + '; margin: ' + s.margins.top + 'mm ' + s.margins.right + 'mm ' + s.margins.bottom + 'mm ' + s.margins.left + 'mm; }';
  };

  /* ---------------- Render principal ---------------- */
  let sheet, canvas, wrap;

  CV.render = function (opts) {
    opts = opts || {};
    sheet = sheet || document.getElementById('sheet');
    const tpl = CV.currentTemplate();
    const opt = CV.ensureTemplateOptions();

    const styleEl = document.getElementById('template-css');
    if (styleEl.dataset.tpl !== tpl.id) { styleEl.textContent = tpl.css || ''; styleEl.dataset.tpl = tpl.id; }

    CV.applySettings();
    // Ojo: la clase .tpl-<id> es exclusiva del elemento raíz que devuelve la plantilla;
    // la hoja solo lleva data-template para no heredar sus estilos.
    sheet.className = 'sheet';
    sheet.dataset.template = tpl.id;
    destroySortables();
    hoverTarget = null;
    sheet.innerHTML = tpl.render(CV.state, h, opt) + '<div class="page-guides" id="pageGuides"></div>';
    initSortables();
    CV.updateLayout();
    CV.emit('rendered');

    if (opts.focus) focusPath(opts.focus);
    if (opts.scrollTo) {
      const el = sheet.querySelector('.cv-section[data-sid="' + opts.scrollTo + '"]');
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  };

  function focusPath(path) {
    const el = sheet.querySelector('.ed[data-path="' + path + '"]');
    if (!el) return;
    el.focus();
    try {
      const r = document.createRange(); r.selectNodeContents(el); r.collapse(false);
      const sel = window.getSelection(); sel.removeAllRanges(); sel.addRange(r);
    } catch (e) { /* ignorar */ }
    el.scrollIntoView({ block: 'center', behavior: 'smooth' });
  }
  CV.focusPath = focusPath;

  /* ---------------- Zoom y guías de página ---------------- */
  CV.zoomValue = 1;

  CV.updateLayout = function () {
    sheet = sheet || document.getElementById('sheet');
    canvas = canvas || document.getElementById('canvas');
    wrap = wrap || document.getElementById('sheetWrap');
    const s = CV.state.settings;
    const paper = CV.PAPERS[s.paper] || CV.PAPERS.A4;
    const sheetW = paper.w * CV.MM;
    const sheetH = sheet.offsetHeight; // sin escalar

    let z = CV.ui.zoom;
    if (z === 'fit' || typeof z !== 'number') {
      const avail = canvas.clientWidth - 48;
      z = Math.min(1.5, Math.max(0.25, avail / sheetW));
    }
    CV.zoomValue = z;
    sheet.style.transform = 'scale(' + z + ')';
    wrap.style.width = sheetW * z + 'px';
    wrap.style.height = sheetH * z + 'px';
    const zl = document.getElementById('zoomLabel');
    if (zl) zl.textContent = Math.round(z * 100) + '%';

    // Guías de salto de página (aproximación: el navegador pagina al imprimir)
    const guides = document.getElementById('pageGuides');
    const pageH = paper.h * CV.MM;
    const mt = s.margins.top * CV.MM, mb = s.margins.bottom * CV.MM;
    const usable = Math.max(50, pageH - mt - mb);
    const content = sheet.firstElementChild;
    const contentH = content ? content.offsetHeight : 0;
    const pages = Math.max(1, Math.ceil(contentH / usable - 0.002));
    if (guides) {
      let html = '';
      for (let k = 1; k < pages; k++) {
        html += '<div class="page-guide" style="top:' + (mt + k * usable) + 'px"><span>' + esc(CV.t('pages.break', { n: k + 1 })) + '</span></div>';
      }
      guides.innerHTML = html;
    }
    const pl = document.getElementById('pagesLabel');
    if (pl) pl.textContent = pages === 1 ? CV.t('pages.one') : CV.t('pages.many', { n: pages });
    CV.pages = pages;
  };
  const scheduleLayout = CV.debounce(() => CV.updateLayout(), 120);

  /* ---------------- Edición directa ---------------- */
  let focusSnapshot = null;

  function readValue(el) {
    if (el.dataset.rich) {
      if (el.innerHTML === '<br>' || el.innerHTML === '<div><br></div>') el.innerHTML = '';
      return el.innerHTML;
    }
    return el.textContent.replace(/[\r\n]+/g, ' ');
  }

  /** Si el usuario escribe "- " al inicio de una descripción vacía, crea una lista. */
  function autoBullet(el) {
    if (!el.dataset.rich || el.querySelector('ul,ol')) return false;
    const text = el.textContent;
    const m = text.match(/^[-*•]\s(.*)$/s);
    if (!m) return false;
    el.innerHTML = '<ul><li>' + esc(m[1]) + '</li></ul>';
    const li = el.querySelector('li');
    try {
      const r = document.createRange(); r.selectNodeContents(li); r.collapse(false);
      const sel = window.getSelection(); sel.removeAllRanges(); sel.addRange(r);
    } catch (e) { /* ignorar */ }
    return true;
  }
  CV.autoBullet = autoBullet;

  /** Pegado como texto plano en un campo enriquecido (compartido con el panel lateral). */
  CV.pasteAsText = function (e, el) {
    e.preventDefault();
    const text = (e.clipboardData || window.clipboardData).getData('text/plain');
    if (!text) return;
    if (el.dataset.rich) {
      const html = /\n/.test(text) ? CV.textToHtml(text) : esc(text);
      document.execCommand('insertHTML', false, html);
    } else {
      document.execCommand('insertText', false, text.replace(/\s*[\r\n]+\s*/g, ' '));
    }
  };

  function handleInput(el) {
    autoBullet(el);
    const value = readValue(el);
    CV.setPath(CV.state, el.dataset.path, value);
    CV.save();
    CV.emit('field', { path: el.dataset.path, value, source: 'sheet' });
    scheduleLayout();
  }

  function finalizeEdit(el) {
    const path = el.dataset.path;
    let value;
    if (el.dataset.rich) {
      let clean = CV.sanitizeHTML(el.innerHTML);
      if (!clean.replace(/<[^>]*>/g, '').trim() && !/<li>/.test(clean)) clean = '';
      if (clean !== el.innerHTML) el.innerHTML = clean;
      value = clean;
    } else {
      value = el.textContent.replace(/\s+/g, ' ').trim();
      if (el.textContent !== value) el.textContent = value;
    }
    CV.setPath(CV.state, path, value);
    if (focusSnapshot && JSON.stringify(focusSnapshot) !== JSON.stringify(CV.state)) CV.commit(focusSnapshot);
    focusSnapshot = null;
    CV.save();
    CV.emit('field', { path, value, source: 'sheet' });
    scheduleLayout();
  }

  function bindEditing() {
    sheet.addEventListener('focusin', (e) => {
      const el = e.target.closest('.ed');
      if (!el) return;
      focusSnapshot = CV.clone(CV.state);
    });
    sheet.addEventListener('focusout', (e) => {
      const el = e.target.closest('.ed');
      if (el) finalizeEdit(el);
    });
    sheet.addEventListener('input', (e) => {
      const el = e.target.closest('.ed');
      if (el) handleInput(el);
    });
    sheet.addEventListener('keydown', (e) => {
      const el = e.target.closest('.ed');
      if (!el) return;
      if (e.key === 'Escape') { e.preventDefault(); el.blur(); return; }
      if (e.key === 'Enter' && !el.dataset.rich) { e.preventDefault(); focusNext(el, e.shiftKey ? -1 : 1); return; }
      // Atajos de formato en campos enriquecidos (Ctrl+B/I/U los maneja el navegador)
    });
    sheet.addEventListener('paste', (e) => {
      const el = e.target.closest('.ed');
      if (!el) return;
      CV.pasteAsText(e, el);
      handleInput(el);
    });
    // Evita que un enlace dentro de una descripción navegue al hacer clic mientras se edita
    sheet.addEventListener('click', (e) => {
      const a = e.target.closest('.ed a');
      if (a && !e.ctrlKey && !e.metaKey) e.preventDefault();
    });
  }

  /** Mueve el foco al siguiente/anterior campo editable (Enter / Shift+Enter). */
  function focusNext(el, dir) {
    const all = Array.from(sheet.querySelectorAll('.ed'));
    const i = all.indexOf(el);
    const next = all[i + dir];
    if (next) { next.focus(); try { const r = document.createRange(); r.selectNodeContents(next); r.collapse(false); const s = getSelection(); s.removeAllRanges(); s.addRange(r); } catch (e) { /* ignorar */ } }
    else el.blur();
  }

  /* ---------------- Controles al pasar el cursor ---------------- */
  let hoverTarget = null;
  function bindHover() {
    sheet.addEventListener('mouseover', (e) => {
      const target = e.target.closest('.cv-item') || e.target.closest('.cv-section');
      if (target === hoverTarget) return;
      if (hoverTarget) hoverTarget.classList.remove('show-actions');
      hoverTarget = target;
      if (target) target.classList.add('show-actions');
    });
    sheet.addEventListener('mouseleave', () => {
      if (hoverTarget) hoverTarget.classList.remove('show-actions');
      hoverTarget = null;
    });
    // En pantallas táctiles: al enfocar un campo se muestran los controles de su bloque
    sheet.addEventListener('focusin', (e) => {
      const target = e.target.closest('.cv-item') || e.target.closest('.cv-section');
      if (!target || target === hoverTarget) return;
      if (hoverTarget) hoverTarget.classList.remove('show-actions');
      hoverTarget = target;
      target.classList.add('show-actions');
    });
  }

  /* ---------------- Botones de acción en la hoja ---------------- */
  function bindActions() {
    sheet.addEventListener('click', (e) => {
      const btn = e.target.closest('[data-act]');
      if (!btn) return;
      e.preventDefault();
      const secEl = btn.closest('.cv-section');
      const sid = secEl ? secEl.dataset.sid : null;
      const itemEl = btn.closest('.cv-item');
      const j = itemEl ? parseInt(itemEl.dataset.index, 10) : -1;
      switch (btn.dataset.act) {
        case 'sec-add-item': CV.addItem(sid); break;
        case 'sec-hide': CV.toggleSection(sid); break;
        case 'sec-delete': {
          const name = (CV.findSection(sid).sec || {}).title || '';
          CV.removeSection(sid);
          CV.toast(CV.t('toast.sectionDeleted') + (name ? ': ' + name : ''), { action: CV.t('toast.undo'), onAction: CV.undo });
          break;
        }
        case 'item-dup': CV.duplicateItem(sid, j); break;
        case 'item-del':
          CV.removeItem(sid, j);
          CV.toast(CV.t('toast.itemDeleted'), { action: CV.t('toast.undo'), onAction: CV.undo });
          break;
        case 'upload-photo': document.getElementById('filePhoto').click(); break;
        default: break;
      }
    });
  }

  /* ---------------- Drag and drop (SortableJS) ---------------- */
  let sortables = [];
  function destroySortables() {
    sortables.forEach((s) => { try { s.destroy(); } catch (e) { /* ignorar */ } });
    sortables = [];
  }

  const SORTABLE_BASE = {
    animation: 150,
    ghostClass: 'sortable-ghost',
    chosenClass: 'sortable-chosen',
    dragClass: 'sortable-drag',
    fallbackOnBody: true,
    fallbackTolerance: 4,
    swapThreshold: 0.65,
    emptyInsertThreshold: 24,
  };

  /** Reordena en el modelo SOLO las secciones que viven en `container`, según su
      orden en el DOM; las demás (ocultas o en otra columna) conservan su posición.
      Devuelve false si no hubo cambios. */
  function applyContainerOrder(container) {
    const ids = Array.from(container.querySelectorAll(':scope > .cv-section')).map((el) => el.dataset.sid);
    const arr = CV.state.sections;
    const byId = new Map(arr.map((s) => [s.id, s]));
    if (ids.some((id) => !byId.has(id))) return false;
    const idSet = new Set(ids);
    const positions = [];
    arr.forEach((s, i) => { if (idSet.has(s.id)) positions.push(i); });
    if (positions.length !== ids.length) return false;
    if (positions.map((i) => arr[i].id).join() === ids.join()) return false;
    const next = arr.slice();
    positions.forEach((pos, k) => { next[pos] = byId.get(ids[k]); });
    CV.state.sections = next;
    return true;
  }

  function prevSectionId(el) {
    let prev = el.previousElementSibling;
    while (prev && !prev.classList.contains('cv-section')) prev = prev.previousElementSibling;
    return prev ? prev.dataset.sid : null;
  }

  function initSortables() {
    if (!window.Sortable) return;
    // Cada contenedor data-sections (p. ej. cada columna) es su propio grupo:
    // las secciones se reordenan dentro de su columna; la columna la decide la plantilla.
    sheet.querySelectorAll('[data-sections]').forEach((container) => {
      sortables.push(window.Sortable.create(container, Object.assign({}, SORTABLE_BASE, {
        group: { name: 'sheet-' + (container.dataset.sections || 'sections'), put: ['palette'] },
        draggable: '.cv-section',
        handle: '.grip[data-drag="section"]',
        onEnd(evt) {
          if (evt.from !== evt.to) return;
          const snap = CV.clone(CV.state);
          if (applyContainerOrder(container)) { CV.commit(snap); CV.save(); }
          CV.emit('state');
        },
        onAdd(evt) {
          const item = evt.item;
          const type = item.dataset.type;
          const prevSid = prevSectionId(item);
          item.remove();
          if (!type) { CV.emit('state'); return; }
          const idx = prevSid ? CV.findSection(prevSid).index + 1 : 0;
          CV.addSection(type, idx);
        },
      })));
    });
    sheet.querySelectorAll('.cv-items').forEach((container) => {
      sortables.push(window.Sortable.create(container, Object.assign({}, SORTABLE_BASE, {
        group: 'items-' + container.dataset.sid,
        draggable: '.cv-item',
        handle: '.grip[data-drag="item"]',
        onEnd(evt) {
          if (evt.oldIndex === evt.newIndex) return;
          const { sec } = CV.findSection(container.dataset.sid);
          if (!sec || !sec.items) return;
          const order = Array.from(container.querySelectorAll('.cv-item')).map((el) => parseInt(el.dataset.index, 10));
          const snap = CV.clone(CV.state);
          sec.items = order.map((i) => sec.items[i]).filter(Boolean);
          CV.commit(snap); CV.save(); CV.emit('state');
        },
      })));
    });
  }

  /* ---------------- Barra de formato flotante ---------------- */
  function bindToolbar() {
    const tb = document.getElementById('floatingToolbar');
    if (!tb) return;
    const STATE_CMDS = ['bold', 'italic', 'underline', 'insertUnorderedList', 'insertOrderedList'];

    function currentRich() {
      const sel = window.getSelection();
      if (!sel || !sel.rangeCount) return null;
      const node = sel.anchorNode;
      const el = node && (node.nodeType === 3 ? node.parentElement : node);
      // Campos enriquecidos de la hoja (.ed.rich) y del panel lateral (.side-rich)
      return el && el.closest ? el.closest('.rich[contenteditable]') : null;
    }
    function update() {
      const rich = currentRich();
      if (!rich || document.activeElement !== rich) { tb.hidden = true; return; }
      const sel = window.getSelection();
      let r = sel.getRangeAt(0).getBoundingClientRect();
      if (!r.width && !r.height) r = rich.getBoundingClientRect();
      tb.hidden = false;
      const tw = tb.offsetWidth, th = tb.offsetHeight;
      let left = r.left + r.width / 2 - tw / 2;
      left = Math.max(8, Math.min(left, window.innerWidth - tw - 8));
      let top = r.top - th - 8;
      if (top < 60) top = r.bottom + 8;
      tb.style.left = left + 'px';
      tb.style.top = top + 'px';
      tb.querySelectorAll('[data-cmd]').forEach((b) => {
        let on = false;
        if (STATE_CMDS.includes(b.dataset.cmd)) { try { on = document.queryCommandState(b.dataset.cmd); } catch (e) { on = false; } }
        b.classList.toggle('on', on);
      });
    }
    const scheduled = CV.debounce(update, 60);
    document.addEventListener('selectionchange', scheduled);
    document.addEventListener('focusout', () => setTimeout(update, 120));
    document.getElementById('canvas').addEventListener('scroll', scheduled, { passive: true });
    const sidebarEl = document.getElementById('sidebar');
    if (sidebarEl) sidebarEl.addEventListener('scroll', scheduled, { passive: true, capture: true });
    window.addEventListener('resize', scheduled);

    tb.addEventListener('mousedown', (e) => e.preventDefault()); // no perder la selección
    tb.addEventListener('click', (e) => {
      const b = e.target.closest('[data-cmd]');
      if (!b) return;
      const rich = currentRich();
      if (!rich) return;
      const cmd = b.dataset.cmd;
      if (cmd === 'createLink') {
        const url = window.prompt(CV.t('fmt.linkPrompt'), 'https://');
        if (!url || url === 'https://') return;
        document.execCommand('createLink', false, url);
      } else if (cmd === 'removeFormat') {
        document.execCommand('removeFormat', false, null);
        document.execCommand('unlink', false, null);
      } else {
        document.execCommand(cmd, false, null);
      }
      if (sheet.contains(rich)) handleInput(rich);
      else rich.dispatchEvent(new Event('input', { bubbles: true }));
      update();
    });

    /* Botón flotante "Elegir fechas" sobre el campo de fechas enfocado en la hoja */
    const dateBtn = document.createElement('button');
    dateBtn.type = 'button';
    dateBtn.id = 'dateBtn';
    dateBtn.className = 'date-btn';
    dateBtn.hidden = true;
    document.body.appendChild(dateBtn);
    let dateField = null;
    let hideTimer = null;
    function showDateBtn(el) {
      dateField = el;
      clearTimeout(hideTimer);
      dateBtn.innerHTML = CV.icon('calendar') + '<span>' + esc(CV.t('date.pick')) + '</span>';
      dateBtn.hidden = false;
      const r = el.getBoundingClientRect();
      const bw = dateBtn.offsetWidth, bh = dateBtn.offsetHeight;
      const left = Math.min(Math.max(8, r.right - bw), window.innerWidth - bw - 8);
      let top = r.top - bh - 6;
      if (top < 60) top = r.bottom + 6;
      dateBtn.style.left = left + 'px';
      dateBtn.style.top = top + 'px';
    }
    function hideDateBtn() {
      hideTimer = setTimeout(() => { dateBtn.hidden = true; dateField = null; }, 150);
    }
    sheet.addEventListener('focusin', (e) => {
      const d = e.target.closest('.ed[data-kind="date"]');
      if (d) showDateBtn(d); else dateBtn.hidden = true;
    });
    sheet.addEventListener('focusout', (e) => {
      if (e.target.closest('.ed[data-kind="date"]')) hideDateBtn();
    });
    dateBtn.addEventListener('mousedown', (e) => e.preventDefault());
    dateBtn.addEventListener('click', () => {
      if (!dateField || !CV.dates) return;
      const field = dateField;
      dateBtn.hidden = true;
      CV.dates.open({ path: field.dataset.path, anchor: field });
    });
    document.getElementById('canvas').addEventListener('scroll', () => {
      if (dateField && !dateBtn.hidden) showDateBtn(dateField);
    }, { passive: true });
  }

  /* ---------------- Inicialización ---------------- */
  CV.initRender = function () {
    sheet = document.getElementById('sheet');
    canvas = document.getElementById('canvas');
    wrap = document.getElementById('sheetWrap');
    bindEditing();
    bindHover();
    bindActions();
    bindToolbar();
    if (window.ResizeObserver) {
      new ResizeObserver(() => { if (CV.state) CV.updateLayout(); }).observe(canvas);
    } else {
      window.addEventListener('resize', () => CV.state && CV.updateLayout());
    }
  };
})();
