/* =====================================================================
   app.js — Interfaz del editor: barra superior, panel lateral (contenido
   y diseño), importación/exportación, foto, tema, idioma, atajos y
   arranque de la aplicación.
   ===================================================================== */
(function () {
  'use strict';
  const CV = window.CV;
  const $ = (sel, root) => (root || document).querySelector(sel);
  const $$ = (sel, root) => Array.from((root || document).querySelectorAll(sel));
  const esc = CV.escapeHTML;
  const t = (k, v) => CV.t(k, v);

  const PROFILE_FIELDS = ['name', 'title', 'location', 'phone', 'email', 'linkedin', 'website', 'github'];

  let pendingSnapshot = null; // instantánea previa a cambios hechos desde el panel (para deshacer)
  let listSortable = null;
  let paletteSortable = null;
  let expanded = new Set(); // ids de secciones desplegadas en el panel

  /* =============== Utilidades de interfaz =============== */
  function fillIcons(root) {
    $$('[data-icon]', root).forEach((el) => { el.innerHTML = CV.icon(el.dataset.icon); });
  }

  function applyTheme() {
    document.documentElement.dataset.theme = CV.ui.theme;
    const btn = $('#btnTheme');
    if (btn) btn.innerHTML = CV.icon(CV.ui.theme === 'dark' ? 'sun' : 'moon');
  }

  function setLang(lang) {
    CV.lang = lang;
    CV.ui.lang = lang;
    CV.saveUI();
    $('#langLabel').textContent = lang === 'es' ? 'EN' : 'ES';
    CV.applyI18n();
    buildPanels();
    CV.render();
  }

  let toastTimer = null;
  CV.toast = function (msg, opts) {
    opts = opts || {};
    const el = $('#toast');
    el.innerHTML = '';
    const span = document.createElement('span');
    span.textContent = msg;
    el.appendChild(span);
    if (opts.action) {
      const b = document.createElement('button');
      b.type = 'button';
      b.textContent = opts.action;
      b.addEventListener('click', () => { el.hidden = true; if (opts.onAction) opts.onAction(); });
      el.appendChild(b);
    }
    el.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { el.hidden = true; }, opts.ms || 5000);
  };

  function commitPending() {
    if (pendingSnapshot && JSON.stringify(pendingSnapshot) !== JSON.stringify(CV.state)) CV.commit(pendingSnapshot);
    pendingSnapshot = null;
  }

  function hasContent() {
    const p = CV.state.profile;
    if (p.name || p.email || p.phone) return true;
    return CV.state.sections.some((s) =>
      (s.items && s.items.some((it) => Object.keys(it).some((k) => k !== 'id' && it[k]))) ||
      (s.content && s.content.replace(/<[^>]*>/g, '').trim()));
  }

  /* =============== Panel: Contenido =============== */
  function buildContentPanel() {
    const p = $('#panel-content');
    const prof = PROFILE_FIELDS.map((k) =>
      '<div class="field"><label for="pf-' + k + '">' + esc(t('field.' + k)) + '</label>' +
      '<input type="text" id="pf-' + k + '" data-bind="profile.' + k + '" placeholder="' + esc(t('ph.' + k)) + '" autocomplete="off"></div>').join('');

    const palette = CV.SECTION_ORDER.map((type) => {
      const def = CV.SECTION_TYPES[type];
      return '<div class="chip" role="button" tabindex="0" data-type="' + type + '" title="' + esc(t('sec.drag')) + '"><span>' + def.icon + '</span>' + esc(CV.L(def.label)) + '</div>';
    }).join('');

    p.innerHTML =
      '<p class="hint">' + esc(t('content.hint')) + '</p>' +
      '<section class="group"><h3>' + esc(t('content.profile')) + '</h3>' + prof + '</section>' +
      '<section class="group"><h3>' + esc(t('content.photo')) + '</h3>' +
        '<label class="switch"><input type="checkbox" data-setting="photo.show"> ' + esc(t('photo.show')) + '</label>' +
        '<div class="photo-row"><div class="photo-thumb" id="photoThumb"></div>' +
          '<div class="row-actions">' +
            '<button type="button" class="btn small" id="btnPhotoUpload">' + CV.icon('image') + ' <span id="btnPhotoUploadText"></span></button>' +
            '<button type="button" class="btn small" id="btnPhotoRemove">' + esc(t('photo.remove')) + '</button>' +
          '</div></div>' +
        '<div class="grid3">' +
          '<div class="field"><label>' + esc(t('photo.shape')) + '</label><select data-setting="photo.shape">' +
            ['circle', 'rounded', 'square'].map((v) => '<option value="' + v + '">' + esc(t('shape.' + v)) + '</option>').join('') + '</select></div>' +
          '<div class="field"><label>' + esc(t('photo.position')) + '</label><select data-setting="photo.position">' +
            ['left', 'right'].map((v) => '<option value="' + v + '">' + esc(t('pos.' + v)) + '</option>').join('') + '</select></div>' +
          '<div class="field"><label>' + esc(t('photo.size')) + '</label><input type="number" min="15" max="50" step="1" data-setting="photo.size"></div>' +
        '</div>' +
      '</section>' +
      '<section class="group"><h3>' + esc(t('content.sections')) + '</h3><ul class="sections-list" id="sectionsList"></ul></section>' +
      '<section class="group"><h3>' + esc(t('content.addSection')) + '</h3><div class="chips" id="palette">' + palette + '</div></section>';

    renderSectionsList();
    syncProfileInputs();
    refreshPhotoUI();
    initPaletteSortable();
  }

  function renderSectionsList() {
    const ul = $('#sectionsList');
    if (!ul) return;
    const n = CV.state.sections.length;
    ul.innerHTML = CV.state.sections.map((s, i) => {
      const def = CV.SECTION_TYPES[s.type] || CV.SECTION_TYPES.custom;
      const hidden = s.visible === false;
      const open = expanded.has(s.id);
      return '<li class="sec-row' + (hidden ? ' hidden-sec' : '') + (open ? ' expanded' : '') + '" data-sid="' + esc(s.id) + '">' +
        '<div class="sec-head">' +
          '<span class="grip" title="' + esc(t('sec.drag')) + '">' + CV.icon('grip') + '</span>' +
          '<button type="button" class="sec-toggle" data-act="toggle-expand" title="' + esc(t('side.expand')) + '" aria-expanded="' + (open ? 'true' : 'false') + '">' +
            '<span class="chev">' + CV.icon('down') + '</span>' +
            '<span class="sec-icon" aria-hidden="true">' + def.icon + '</span>' +
            '<span class="sec-title">' + esc(s.title || CV.L(def.label)) + '</span>' +
          '</button>' +
          '<button type="button" class="icon-btn" data-act="up" title="' + esc(t('item.up')) + '"' + (i === 0 ? ' disabled' : '') + '>' + CV.icon('up') + '</button>' +
          '<button type="button" class="icon-btn" data-act="down" title="' + esc(t('item.down')) + '"' + (i === n - 1 ? ' disabled' : '') + '>' + CV.icon('down') + '</button>' +
          '<button type="button" class="icon-btn" data-act="toggle" title="' + esc(t(hidden ? 'sec.show' : 'sec.hide')) + '">' + CV.icon(hidden ? 'eyeOff' : 'eye') + '</button>' +
          '<button type="button" class="icon-btn danger" data-act="delete" title="' + esc(t('sec.delete')) + '">' + CV.icon('trash') + '</button>' +
        '</div>' +
        (open ? renderSectionForm(s, i, def) : '') +
      '</li>';
    }).join('');
    syncBoundInputs(ul);
    initListSortable();
  }

  /** Formulario de una sección desplegada (título, contenido o entradas). */
  function renderSectionForm(s, i, def) {
    const base = 'sections.' + i;
    let html = '<div class="sec-body">' +
      '<div class="field"><label>' + esc(t('fl.sectionTitle')) + '</label><input type="text" data-bind="' + base + '.title" placeholder="' + esc(CV.L(def.label)) + '"></div>';
    if (def.layout === 'block') {
      html += '<div class="field"><label>' + esc(t('fl.content')) + '</label>' +
        '<div class="side-rich rich" contenteditable="true" data-bind="' + base + '.content" data-rich="1" data-ph="' + esc(CV.phFor(s.type, 'content')) + '"></div></div>';
    } else {
      html += '<div class="side-items">' + (s.items || []).map((it, j) => renderItemForm(s, i, def, j)).join('') + '</div>' +
        '<button type="button" class="btn small" data-act="add-item">' + CV.icon('plus') + ' ' + esc(t('side.addItem')) + '</button>';
    }
    html += '<div class="sec-foot"><button type="button" class="link-btn" data-act="goto">' + esc(t('side.goto')) + '</button></div></div>';
    return html;
  }

  function renderItemForm(s, i, def, j) {
    const base = 'sections.' + i + '.items.' + j;
    const n = s.items.length;
    let html = '<div class="side-item" data-index="' + j + '"><div class="side-item-head"><span>' + esc(t('side.entry', { n: j + 1 })) + '</span><span class="side-item-actions">' +
      '<button type="button" class="icon-btn" data-act="item-up" title="' + esc(t('item.up')) + '"' + (j === 0 ? ' disabled' : '') + '>' + CV.icon('up') + '</button>' +
      '<button type="button" class="icon-btn" data-act="item-down" title="' + esc(t('item.down')) + '"' + (j === n - 1 ? ' disabled' : '') + '>' + CV.icon('down') + '</button>' +
      '<button type="button" class="icon-btn" data-act="item-dup" title="' + esc(t('item.duplicate')) + '">' + CV.icon('copy') + '</button>' +
      '<button type="button" class="icon-btn danger" data-act="item-del" title="' + esc(t('item.delete')) + '">' + CV.icon('trash') + '</button>' +
      '</span></div>';
    def.fields.forEach((f) => {
      const path = base + '.' + f;
      const label = esc(t('fl.' + f));
      const ph = esc(CV.phFor(s.type, f));
      if (f === 'description') {
        html += '<div class="field"><label>' + label + '</label><div class="side-rich rich" contenteditable="true" data-bind="' + path + '" data-rich="1" data-ph="' + ph + '"></div></div>';
      } else if (f === 'dates') {
        html += '<div class="field"><label>' + label + '</label><div class="date-row"><input type="text" data-bind="' + path + '" placeholder="' + ph + '">' +
          '<button type="button" class="icon-btn" data-act="pick-date" data-path="' + path + '" title="' + esc(t('date.pick')) + '">' + CV.icon('calendar') + '</button></div></div>';
      } else {
        html += '<div class="field"><label>' + label + '</label><input type="text" data-bind="' + path + '" placeholder="' + ph + '"></div>';
      }
    });
    return html + '</div>';
  }

  /** Rellena todos los [data-bind] del contenedor con los valores del estado. */
  function syncBoundInputs(root) {
    $$('[data-bind]', root).forEach((el) => {
      if (document.activeElement === el) return;
      const v = CV.getPath(CV.state, el.dataset.bind);
      if (el.isContentEditable) el.innerHTML = CV.sanitizeHTML(v || '');
      else el.value = v == null ? '' : v;
    });
  }

  function updateRowTitle(path, value) {
    const m = path.match(/^sections\.(\d+)\.title$/);
    if (!m) return;
    const sec = CV.state.sections[+m[1]];
    const el = sec && $('.sec-row[data-sid="' + sec.id + '"] .sec-title');
    if (el) el.textContent = value || CV.L((CV.SECTION_TYPES[sec.type] || CV.SECTION_TYPES.custom).label);
  }

  function focusSideInput(path) {
    const el = $('[data-bind="' + path + '"]', $('#sectionsList'));
    if (!el) return;
    el.focus();
    if (el.scrollIntoView) el.scrollIntoView({ block: 'center', behavior: 'smooth' });
  }

  function initListSortable() {
    if (listSortable) { try { listSortable.destroy(); } catch (e) { /* ignorar */ } listSortable = null; }
    const list = $('#sectionsList');
    if (!list || !window.Sortable) return;
    listSortable = window.Sortable.create(list, {
      group: { name: 'list-sections', put: ['palette'] },
      handle: '.grip',
      animation: 150,
      ghostClass: 'sortable-ghost',
      fallbackOnBody: true,
      onEnd(evt) {
        if (evt.from !== evt.to) return;
        const ids = $$('.sec-row', list).map((el) => el.dataset.sid);
        const cur = CV.state.sections.map((s) => s.id);
        if (ids.join() === cur.join()) return;
        const byId = new Map(CV.state.sections.map((s) => [s.id, s]));
        const next = ids.map((id) => byId.get(id)).filter(Boolean);
        if (next.length !== cur.length) { renderSectionsList(); return; }
        const snap = CV.clone(CV.state);
        CV.state.sections = next;
        CV.commit(snap); CV.save(); CV.emit('state');
      },
      onAdd(evt) {
        const item = evt.item;
        const type = item.dataset.type;
        let prev = item.previousElementSibling;
        while (prev && !prev.classList.contains('sec-row')) prev = prev.previousElementSibling;
        const prevSid = prev ? prev.dataset.sid : null;
        item.remove();
        if (!type) { renderSectionsList(); return; }
        const idx = prevSid ? CV.findSection(prevSid).index + 1 : 0;
        CV.addSection(type, idx);
      },
    });
  }

  function initPaletteSortable() {
    if (paletteSortable) { try { paletteSortable.destroy(); } catch (e) { /* ignorar */ } paletteSortable = null; }
    const palette = $('#palette');
    if (!palette || !window.Sortable) return;
    paletteSortable = window.Sortable.create(palette, {
      group: { name: 'palette', pull: 'clone', put: false },
      sort: false,
      animation: 0,
      fallbackOnBody: true,
      ghostClass: 'sortable-ghost',
    });
  }

  function syncProfileInputs() {
    const panel = $('#panel-content');
    if (panel) syncBoundInputs(panel);
  }

  function refreshPhotoUI() {
    const th = $('#photoThumb');
    if (!th) return;
    const src = CV.state.profile.photo;
    th.innerHTML = src ? '<img src="' + esc(src) + '" alt="">' : CV.icon('image');
    $('#btnPhotoUploadText').textContent = t(src ? 'photo.change' : 'photo.upload');
    $('#btnPhotoRemove').disabled = !src;
  }

  /* =============== Panel: Diseño =============== */
  function numControl(key, label, min, max, step) {
    return '<div class="field"><label>' + esc(label) + '</label><div class="range-row">' +
      '<input type="range" min="' + min + '" max="' + max + '" step="' + step + '" data-setting="' + key + '">' +
      '<input type="number" min="' + min + '" max="' + max + '" step="' + step + '" data-setting="' + key + '">' +
      '</div></div>';
  }

  function buildDesignPanel() {
    const p = $('#panel-design');
    const tplOptions = CV.templateOrder.map((id) => '<option value="' + id + '">' + esc(CV.L(CV.templates[id].name)) + '</option>').join('');
    const fontOptions = CV.FONTS.map((f) => '<option value="' + esc(f.value) + '">' + esc(f.label) + '</option>').join('') +
      '<option value="__custom">' + esc(t('type.custom')) + '</option>';

    p.innerHTML =
      '<section class="group"><h3>' + esc(t('design.template')) + '</h3>' +
        '<select id="templateSelect">' + tplOptions + '</select>' +
        '<p class="muted" id="templateDesc" style="margin:8px 0 0"></p>' +
      '</section>' +
      '<section class="group"><h3>' + esc(t('design.paper')) + '</h3>' +
        '<div class="field"><label>' + esc(t('paper.size')) + '</label><select data-setting="paper">' +
          Object.keys(CV.PAPERS).map((k) => '<option value="' + k + '">' + esc(t('paper.' + k)) + '</option>').join('') + '</select></div>' +
        '<div class="field"><span class="label">' + esc(t('margin.title')) + '</span>' +
          '<div class="grid2">' + ['top', 'bottom', 'left', 'right'].map((k) =>
            '<div class="field"><label>' + esc(t('margin.' + k)) + '</label><input type="number" min="0" max="60" step="1" data-setting="margins.' + k + '"></div>').join('') + '</div>' +
          '<div class="chips">' + Object.keys(CV.MARGIN_PRESETS).map((k) =>
            '<button type="button" class="chip" data-margin-preset="' + k + '">' + esc(t('margin.preset.' + k)) + ' · ' + CV.MARGIN_PRESETS[k] + ' mm</button>').join('') + '</div>' +
        '</div>' +
      '</section>' +
      '<section class="group"><h3>' + esc(t('design.typography')) + '</h3>' +
        '<div class="field"><label>' + esc(t('type.family')) + '</label><select id="fontSelect">' + fontOptions + '</select>' +
          '<input type="text" id="fontCustom" placeholder="' + esc(t('type.customPh')) + '" hidden></div>' +
        numControl('fontSize', t('type.size'), 8, 14, 0.5) +
        numControl('nameSize', t('type.nameSize'), 12, 32, 0.5) +
        numControl('headingSize', t('type.headingSize'), 8, 18, 0.5) +
        numControl('lineHeight', t('type.lineHeight'), 1, 1.8, 0.05) +
        numControl('sectionGap', t('type.sectionGap'), 0, 12, 0.5) +
        numControl('itemGap', t('type.itemGap'), 0, 8, 0.2) +
      '</section>' +
      '<section class="group"><h3>' + esc(t('design.colors')) + '</h3><div class="grid2">' +
        '<div class="field"><label>' + esc(t('color.text')) + '</label><input type="color" data-setting="textColor"></div>' +
        '<div class="field"><label>' + esc(t('color.accent')) + '</label><input type="color" data-setting="accentColor"></div>' +
      '</div></section>' +
      '<section class="group" id="tplOptionsGroup"><h3>' + esc(t('design.tplOptions')) + '</h3><div id="tplOptions"></div></section>' +
      '<button type="button" class="btn small" id="btnResetDesign">' + esc(t('design.reset')) + '</button>';

    renderTemplateOptions();
    syncSettingsInputs();
  }

  function renderTemplateOptions() {
    const box = $('#tplOptions');
    if (!box) return;
    const tpl = CV.currentTemplate();
    const opts = tpl.options || [];
    $('#tplOptionsGroup').hidden = !opts.length;
    box.innerHTML = opts.map((o) => {
      const key = 'tpl.' + tpl.id + '.' + o.key;
      const label = esc(CV.L(o.label));
      if (o.type === 'toggle') return '<label class="switch"><input type="checkbox" data-setting="' + key + '"> ' + label + '</label>';
      if (o.type === 'select') {
        return '<div class="field"><label>' + label + '</label><select data-setting="' + key + '">' +
          (o.choices || []).map((c) => '<option value="' + esc(c.value) + '">' + esc(CV.L(c.label)) + '</option>').join('') + '</select></div>';
      }
      if (o.type === 'range') return numControl(key, CV.L(o.label), o.min, o.max, o.step || 1);
      return '<div class="field"><label>' + label + '</label><input type="text" data-setting="' + key + '"></div>';
    }).join('');
    const sel = $('#templateSelect');
    if (sel) sel.value = tpl.id;
    const desc = $('#templateDesc');
    if (desc) desc.textContent = CV.L(tpl.description);
  }

  function syncSettingsInputs() {
    $$('[data-setting]', $('#sidebar')).forEach((el) => {
      const v = CV.getPath(CV.state.settings, el.dataset.setting);
      if (el.type === 'checkbox') el.checked = !!v;
      else if (document.activeElement !== el) el.value = v == null ? '' : v;
    });
    const fam = CV.state.settings.fontFamily;
    const sel = $('#fontSelect');
    const custom = $('#fontCustom');
    if (sel && custom) {
      const known = CV.FONTS.some((f) => f.value === fam);
      sel.value = known ? fam : '__custom';
      custom.hidden = known;
      if (!known && document.activeElement !== custom) custom.value = fam;
    }
  }

  function coerceInput(el) {
    if (el.type === 'checkbox') return el.checked;
    if (el.type === 'number' || el.type === 'range') {
      const n = parseFloat(el.value);
      return isNaN(n) ? null : n;
    }
    return el.value;
  }

  function onSettingInput(el, final) {
    const v = coerceInput(el);
    if (v === null) return;
    if (!pendingSnapshot) pendingSnapshot = CV.clone(CV.state);
    CV.setSetting(el.dataset.setting, v);
    $$('[data-setting="' + el.dataset.setting + '"]', $('#sidebar')).forEach((o) => { if (o !== el && o.type !== 'checkbox') o.value = v; });
    CV.render();
    if (final) commitPending();
  }

  /** Campo del panel (input o contenteditable con data-bind) → estado → hoja. */
  function onBindInput(el, final) {
    if (!pendingSnapshot) pendingSnapshot = CV.clone(CV.state);
    const path = el.dataset.bind;
    const rich = el.isContentEditable;
    let v;
    if (rich) {
      if (el.innerHTML === '<br>' || el.innerHTML === '<div><br></div>') el.innerHTML = '';
      if (!final) CV.autoBullet(el);
      v = el.innerHTML;
      if (final) {
        let clean = CV.sanitizeHTML(v);
        if (!clean.replace(/<[^>]*>/g, '').trim() && !/<li>/.test(clean)) clean = '';
        if (clean !== el.innerHTML) el.innerHTML = clean;
        v = clean;
      }
    } else {
      v = el.value;
    }
    CV.setPath(CV.state, path, v);
    CV.save();
    $$('.ed[data-path="' + path + '"]', $('#sheet')).forEach((ed) => {
      if (document.activeElement === ed) return;
      if (rich) ed.innerHTML = v; else ed.textContent = v;
    });
    updateRowTitle(path, v);
    CV.updateLayout();
    if (final) commitPending();
  }

  function setFont(value, final) {
    if (!value) return;
    if (!pendingSnapshot) pendingSnapshot = CV.clone(CV.state);
    CV.setSetting('fontFamily', value);
    CV.render();
    if (final) commitPending();
  }

  function switchTemplate(id) {
    const tpl = CV.templates[id];
    if (!tpl || id === CV.state.settings.template) return;
    CV.commit();
    CV.state.settings.template = id;
    Object.assign(CV.state.settings, tpl.defaults || {});
    CV.ensureTemplateOptions();
    CV.save();
    renderTemplateOptions();
    syncSettingsInputs();
    CV.render();
  }
  CV.switchTemplate = switchTemplate;

  function resetDesign() {
    CV.commit();
    const s = CV.state.settings;
    const d = CV.defaultSettings();
    const tpl = CV.currentTemplate();
    CV.state.settings = Object.assign(d, { template: s.template, photo: s.photo, tpl: {} }, tpl.defaults || {});
    CV.ensureTemplateOptions();
    CV.save();
    renderTemplateOptions();
    syncSettingsInputs();
    CV.render();
  }

  function applyMarginPreset(name) {
    const mm = CV.MARGIN_PRESETS[name];
    if (mm == null) return;
    CV.commit();
    CV.state.settings.margins = { top: mm, right: mm, bottom: mm, left: mm };
    CV.save();
    syncSettingsInputs();
    CV.render();
  }

  /* =============== Foto =============== */
  function resizeImage(file, max) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      const url = URL.createObjectURL(file);
      img.onload = () => {
        const scale = Math.min(1, max / Math.max(img.width, img.height));
        const w = Math.max(1, Math.round(img.width * scale));
        const hgt = Math.max(1, Math.round(img.height * scale));
        const c = document.createElement('canvas');
        c.width = w; c.height = hgt;
        const ctx = c.getContext('2d');
        ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, w, hgt); // fondo blanco para PNG con transparencia
        ctx.drawImage(img, 0, 0, w, hgt);
        URL.revokeObjectURL(url);
        resolve(c.toDataURL('image/jpeg', 0.9));
      };
      img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('imagen no válida')); };
      img.src = url;
    });
  }

  async function onPhotoFile(file) {
    if (!file) return;
    try {
      const dataUrl = await resizeImage(file, 800);
      CV.commit();
      CV.state.profile.photo = dataUrl;
      CV.state.settings.photo.show = true;
      CV.save();
      CV.emit('state');
    } catch (e) {
      CV.toast(t('toast.photoError'));
    }
  }

  function removePhoto() {
    if (!CV.state.profile.photo) return;
    CV.commit();
    CV.state.profile.photo = '';
    CV.save();
    CV.emit('state');
  }

  /* =============== Importar / exportar =============== */
  async function importFile(file) {
    if (!file) return;
    try {
      const text = await file.text();
      const st = CV.importText(text, file.name);
      if (hasContent() && !window.confirm(t('confirm.import'))) return;
      CV.replaceState(st);
      CV.toast(t('toast.imported'));
    } catch (e) {
      console.error(e);
      CV.toast(t('toast.importError'), { ms: 7000 });
    }
  }

  function loadSample() {
    if (hasContent() && !window.confirm(t('confirm.sample'))) return;
    CV.replaceState(CV.sampleData(CV.lang));
    CV.toast(t('toast.sample'));
  }

  function resetAll() {
    if (!window.confirm(t('confirm.reset'))) return;
    const keep = CV.clone(CV.state.settings);
    const st = CV.defaultState();
    st.settings = keep; // conserva el diseño elegido
    CV.replaceState(st, { silent: true });
    CV.emit('state', { focus: 'profile.name' });
    CV.toast(t('toast.reset'));
  }

  /* =============== Impresión / PDF =============== */
  let prevTitle = null;
  function bindPrint() {
    window.addEventListener('beforeprint', () => {
      prevTitle = document.title;
      document.title = CV.fileBase();
      if (document.activeElement && document.activeElement.blur) document.activeElement.blur();
      $('#floatingToolbar').hidden = true;
      $$('.show-actions').forEach((el) => el.classList.remove('show-actions'));
    });
    window.addEventListener('afterprint', () => { if (prevTitle != null) document.title = prevTitle; });
  }
  function doPrint() {
    CV.saveNow();
    if (!CV.ui.printTipShown) {
      CV.ui.printTipShown = true; CV.saveUI();
      CV.toast(t('toast.printTip'), { ms: 9000 });
    }
    setTimeout(() => window.print(), 50);
  }

  /* =============== Zoom =============== */
  function setZoom(z) {
    CV.ui.zoom = z;
    CV.saveUI();
    CV.updateLayout();
  }
  function zoomStep(dir) {
    const cur = Math.round(CV.zoomValue * 10) / 10;
    setZoom(Math.min(1.5, Math.max(0.3, Math.round((cur + dir * 0.1) * 10) / 10)));
  }

  /* =============== Pestañas =============== */
  function selectTab(name) {
    $$('.tabs [data-tab]').forEach((b) => b.classList.toggle('active', b.dataset.tab === name));
    $$('.panel').forEach((p) => p.classList.toggle('active', p.id === 'panel-' + name));
    CV.ui.tab = name;
    CV.saveUI();
    if (name === 'ats' && CV.ats) CV.ats.refresh();
  }
  CV.selectTab = selectTab;

  function refreshHistoryButtons() {
    $('#btnUndo').disabled = !CV.canUndo();
    $('#btnRedo').disabled = !CV.canRedo();
  }

  /* =============== Eventos: barra superior =============== */
  function bindTopbar() {
    $('#btnUndo').innerHTML = CV.icon('undo');
    $('#btnRedo').innerHTML = CV.icon('redo');
    $('#btnZoomIn').innerHTML = CV.icon('zoomIn');
    $('#btnZoomOut').innerHTML = CV.icon('zoomOut');
    $('#fabEdit').innerHTML = CV.icon('edit');

    $('#btnUndo').addEventListener('click', () => CV.undo());
    $('#btnRedo').addEventListener('click', () => CV.redo());
    $('#btnZoomIn').addEventListener('click', () => zoomStep(1));
    $('#btnZoomOut').addEventListener('click', () => zoomStep(-1));
    $('#btnZoomFit').addEventListener('click', () => setZoom(CV.ui.zoom === 'fit' ? 1 : 'fit'));
    $('#btnTheme').addEventListener('click', () => { CV.ui.theme = CV.ui.theme === 'dark' ? 'light' : 'dark'; CV.saveUI(); applyTheme(); });
    $('#btnLang').addEventListener('click', () => setLang(CV.lang === 'es' ? 'en' : 'es'));
    $('#btnPdf').addEventListener('click', doPrint);
    $('#btnImport').addEventListener('click', () => $('#fileImport').click());
    $('#fileImport').addEventListener('change', (e) => { importFile(e.target.files[0]); e.target.value = ''; });
    $('#filePhoto').addEventListener('change', (e) => { onPhotoFile(e.target.files[0]); e.target.value = ''; });

    const menu = $('#exportMenu');
    const closeMenu = () => { menu.open = false; };
    $('#menuJson').addEventListener('click', () => { closeMenu(); CV.exportJSON(); CV.toast(t('toast.exported')); });
    $('#menuCsv').addEventListener('click', () => { closeMenu(); CV.exportCSV(); CV.toast(t('toast.exported')); });
    $('#menuSample').addEventListener('click', () => { closeMenu(); loadSample(); });
    $('#menuReset').addEventListener('click', () => { closeMenu(); resetAll(); });
    document.addEventListener('click', (e) => { if (menu.open && !menu.contains(e.target)) closeMenu(); });

    $('#fabEdit').addEventListener('click', () => $('#app').classList.toggle('sidebar-open'));
    $('#canvas').addEventListener('pointerdown', () => { $('#app').classList.remove('sidebar-open'); });
  }

  /* =============== Eventos: panel lateral =============== */
  function bindSidebar() {
    const sidebar = $('#sidebar');

    $$('.tabs [data-tab]').forEach((b) => b.addEventListener('click', () => selectTab(b.dataset.tab)));

    sidebar.addEventListener('focusin', (e) => {
      if (e.target.matches('input, select, textarea, [contenteditable]')) pendingSnapshot = CV.clone(CV.state);
    });
    sidebar.addEventListener('focusout', (e) => {
      const el = e.target;
      if (el.isContentEditable && el.dataset.bind) onBindInput(el, true);
      else if (el.matches('input, select, textarea')) commitPending();
    });
    sidebar.addEventListener('input', (e) => {
      const el = e.target;
      if (el.dataset.setting) onSettingInput(el, false);
      else if (el.dataset.bind) onBindInput(el, false);
      else if (el.id === 'fontCustom') setFont(el.value.trim(), false);
    });
    sidebar.addEventListener('paste', (e) => {
      const el = e.target.closest('[contenteditable][data-bind]');
      if (!el) return;
      CV.pasteAsText(e, el);
      onBindInput(el, false);
    });
    sidebar.addEventListener('keydown', (e) => {
      // Enter en un campo de una línea del panel pasa al siguiente campo
      if (e.key === 'Enter' && e.target.matches('input[type="text"][data-bind]')) {
        e.preventDefault();
        const inputs = $$('input[type="text"][data-bind], [contenteditable][data-bind]', $('#panel-content'));
        const next = inputs[inputs.indexOf(e.target) + (e.shiftKey ? -1 : 1)];
        if (next) next.focus();
      }
    });
    sidebar.addEventListener('change', (e) => {
      const el = e.target;
      if (el.dataset.setting) onSettingInput(el, true);
      else if (el.dataset.bind) onBindInput(el, true);
      else if (el.id === 'fontSelect') {
        if (el.value === '__custom') { const c = $('#fontCustom'); c.hidden = false; c.focus(); }
        else setFont(el.value, true);
      }
      else if (el.id === 'fontCustom') setFont(el.value.trim(), true);
      else if (el.id === 'templateSelect') switchTemplate(el.value);
    });

    sidebar.addEventListener('click', (e) => {
      const preset = e.target.closest('[data-margin-preset]');
      if (preset) { applyMarginPreset(preset.dataset.marginPreset); return; }
      if (e.target.closest('#btnPhotoUpload')) { $('#filePhoto').click(); return; }
      if (e.target.closest('#btnPhotoRemove')) { removePhoto(); return; }
      if (e.target.closest('#btnResetDesign')) { resetDesign(); return; }

      const chip = e.target.closest('#palette .chip');
      if (chip) { addSectionFromPalette(chip.dataset.type); return; }

      const row = e.target.closest('.sec-row');
      const actEl = e.target.closest('[data-act]');
      if (row && actEl) {
        const sid = row.dataset.sid;
        const { index, sec } = CV.findSection(sid);
        if (!sec) return;
        const itemEl = e.target.closest('.side-item');
        const j = itemEl ? parseInt(itemEl.dataset.index, 10) : -1;
        switch (actEl.dataset.act) {
          case 'toggle-expand':
            if (expanded.has(sid)) expanded.delete(sid); else expanded.add(sid);
            CV.ui.expanded = Array.from(expanded);
            CV.saveUI();
            renderSectionsList();
            break;
          case 'up': CV.moveSection(index, index - 1); break;
          case 'down': CV.moveSection(index, index + 1); break;
          case 'toggle': CV.toggleSection(sid); break;
          case 'delete': {
            const name = sec.title || '';
            CV.removeSection(sid);
            CV.toast(t('toast.sectionDeleted') + (name ? ': ' + name : ''), { action: t('toast.undo'), onAction: CV.undo });
            break;
          }
          case 'goto':
            if (sec.visible !== false) {
              CV.focusPath('sections.' + index + '.title');
              if (window.innerWidth <= 900) $('#app').classList.remove('sidebar-open');
            }
            break;
          case 'add-item': {
            const k = CV.addItem(sid, null, { silent: true });
            CV.emit('state');
            focusSideInput('sections.' + index + '.items.' + k + '.' + CV.firstField(sec.type));
            break;
          }
          case 'item-up': if (j > 0) CV.moveItem(sid, j, j - 1); break;
          case 'item-down': if (j >= 0) CV.moveItem(sid, j, j + 1); break;
          case 'item-dup': if (j >= 0) { CV.duplicateItem(sid, j, { silent: true }); CV.emit('state'); } break;
          case 'item-del':
            if (j >= 0) {
              CV.removeItem(sid, j);
              CV.toast(t('toast.itemDeleted'), { action: t('toast.undo'), onAction: CV.undo });
            }
            break;
          case 'pick-date':
            if (CV.dates) CV.dates.open({ path: actEl.dataset.path, anchor: actEl });
            break;
          default: break;
        }
      }
    });
    sidebar.addEventListener('keydown', (e) => {
      const chip = e.target.closest('#palette .chip');
      if (chip && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); addSectionFromPalette(chip.dataset.type); }
    });
  }

  function addSectionFromPalette(type) {
    if (!CV.SECTION_TYPES[type]) return;
    CV.addSection(type);
    if (window.innerWidth <= 900) $('#app').classList.remove('sidebar-open');
  }

  /* =============== Atajos de teclado =============== */
  function bindKeys() {
    document.addEventListener('keydown', (e) => {
      const mod = e.ctrlKey || e.metaKey;
      if (!mod) return;
      const key = e.key.toLowerCase();
      const inEditable = e.target.closest && e.target.closest('.ed, input, textarea, select');
      if (key === 's') { e.preventDefault(); CV.exportJSON(); CV.toast(t('toast.exported')); return; }
      if (inEditable) return; // dentro de un campo, Ctrl+Z lo gestiona el navegador
      if (key === 'z') { e.preventDefault(); if (e.shiftKey) CV.redo(); else CV.undo(); }
      else if (key === 'y') { e.preventDefault(); CV.redo(); }
    });
  }

  /* =============== Arranque =============== */
  function buildPanels() {
    buildContentPanel();
    buildDesignPanel();
    if (CV.ats) CV.ats.buildPanel();
  }

  function init() {
    CV.loadUI();
    CV.lang = CV.ui.lang;
    expanded = new Set(Array.isArray(CV.ui.expanded) ? CV.ui.expanded : []);
    $('#langLabel').textContent = CV.lang === 'es' ? 'EN' : 'ES';
    applyTheme();
    fillIcons(document);

    CV.load();
    CV.initRender();
    CV.ensureTemplateOptions();
    buildPanels();
    CV.applyI18n();
    bindTopbar();
    bindSidebar();
    bindKeys();
    bindPrint();
    selectTab(['design', 'ats'].includes(CV.ui.tab) ? CV.ui.tab : 'content');

    CV.on('state', (p) => {
      CV.render(p || {});
      renderSectionsList();
      renderTemplateOptions();
      syncSettingsInputs();
      syncProfileInputs();
      refreshPhotoUI();
      refreshHistoryButtons();
    });
    CV.on('history', refreshHistoryButtons);
    CV.on('field', (ev) => {
      if (ev.source === 'sidebar') return;
      $$('[data-bind="' + ev.path + '"]').forEach((inp) => {
        if (document.activeElement === inp) return;
        if (inp.isContentEditable) inp.innerHTML = CV.sanitizeHTML(ev.value || ''); else inp.value = ev.value;
      });
      updateRowTitle(ev.path, ev.value);
    });

    CV.render();
    refreshHistoryButtons();
    if (!window.Sortable) console.warn('SortableJS no se cargó: el reordenamiento por arrastre no estará disponible (usa las flechas del panel).');
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
