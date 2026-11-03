/* =====================================================================
   core.js — Estado de la aplicación, utilidades, historial (deshacer /
   rehacer), persistencia en localStorage y mutaciones del modelo.

   Modelo de datos (resumen):
   {
     meta:     { app, version, created },
     profile:  { name, title, location, phone, email, linkedin, website, github, photo },
     settings: { template, paper, margins{top,right,bottom,left}, fontFamily, fontSize,
                 nameSize, headingSize, lineHeight, sectionGap, itemGap, textColor,
                 accentColor, photo{show,shape,size,position}, tpl{ <templateId>: {...} } },
     sections: [ { id, type, title, visible, items:[{id, …campos}] | content } ]
   }
   ===================================================================== */
(function () {
  'use strict';
  const CV = window.CV;

  const STORAGE_KEY = 'cvbuilder.state.v1';
  const UI_KEY = 'cvbuilder.ui.v1';
  const HISTORY_MAX = 80;

  /* ---------------- Constantes ---------------- */
  CV.MM = 96 / 25.4; // píxeles CSS por milímetro

  CV.PAPERS = {
    A4: { w: 210, h: 297, css: 'A4' },
    Letter: { w: 216, h: 279, css: 'letter' },
    Legal: { w: 216, h: 356, css: 'legal' },
    Oficio: { w: 216, h: 330, css: '216mm 330mm' },
  };

  /* Fuentes "seguras": vienen instaladas en la mayoría de sistemas, así el
     PDF se ve igual en pantalla y al imprimir sin descargar nada. */
  CV.FONTS = [
    { label: 'Times New Roman', value: "'Times New Roman', Times, serif" },
    { label: 'Georgia', value: 'Georgia, serif' },
    { label: 'Garamond', value: "Garamond, 'EB Garamond', 'Times New Roman', serif" },
    { label: 'Cambria', value: "Cambria, 'Hoefler Text', 'Liberation Serif', serif" },
    { label: 'Palatino', value: "'Palatino Linotype', 'Book Antiqua', Palatino, serif" },
    { label: 'Arial', value: 'Arial, Helvetica, sans-serif' },
    { label: 'Helvetica', value: "Helvetica, 'Helvetica Neue', Arial, sans-serif" },
    { label: 'Calibri', value: "Calibri, 'Segoe UI', Candara, sans-serif" },
    { label: 'Segoe UI', value: "'Segoe UI', Roboto, 'Helvetica Neue', sans-serif" },
    { label: 'Verdana', value: 'Verdana, Geneva, sans-serif' },
    { label: 'Trebuchet MS', value: "'Trebuchet MS', sans-serif" },
    /* Fuentes de Google: se descargan solo cuando se eligen (requieren internet) */
    { label: 'EB Garamond (Google)', value: "'EB Garamond', Garamond, serif", google: 'EB+Garamond:ital,wght@0,400;0,700;1,400;1,700' },
    { label: 'Merriweather (Google)', value: "'Merriweather', Georgia, serif", google: 'Merriweather:ital,wght@0,400;0,700;1,400;1,700' },
    { label: 'Lora (Google)', value: "'Lora', Georgia, serif", google: 'Lora:ital,wght@0,400;0,700;1,400;1,700' },
    { label: 'Source Serif 4 (Google)', value: "'Source Serif 4', Georgia, serif", google: 'Source+Serif+4:ital,wght@0,400;0,700;1,400;1,700' },
    { label: 'Lato (Google)', value: "'Lato', Arial, sans-serif", google: 'Lato:ital,wght@0,400;0,700;1,400;1,700' },
    { label: 'Open Sans (Google)', value: "'Open Sans', Arial, sans-serif", google: 'Open+Sans:ital,wght@0,400;0,700;1,400;1,700' },
    { label: 'Roboto (Google)', value: "'Roboto', Arial, sans-serif", google: 'Roboto:ital,wght@0,400;0,700;1,400;1,700' },
    { label: 'Inter (Google)', value: "'Inter', Arial, sans-serif", google: 'Inter:wght@400;700' },
    { label: 'Montserrat (Google)', value: "'Montserrat', Arial, sans-serif", google: 'Montserrat:ital,wght@0,400;0,700;1,400;1,700' },
  ];

  CV.MARGIN_PRESETS = { narrow: 12, normal: 20, wide: 25 };

  /* ---------------- Utilidades ---------------- */
  CV.uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-3);
  CV.clone = (o) => JSON.parse(JSON.stringify(o));
  CV.debounce = (fn, ms) => { let t; return function () { clearTimeout(t); const a = arguments; t = setTimeout(() => fn.apply(null, a), ms); }; };

  CV.escapeHTML = (s) => String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');

  CV.getPath = function (obj, path) {
    return String(path).split('.').reduce((o, k) => (o == null ? undefined : o[k]), obj);
  };
  CV.setPath = function (obj, path, value) {
    const keys = String(path).split('.');
    let o = obj;
    for (let i = 0; i < keys.length - 1; i++) {
      if (o[keys[i]] == null) o[keys[i]] = /^\d+$/.test(keys[i + 1]) ? [] : {};
      o = o[keys[i]];
    }
    o[keys[keys.length - 1]] = value;
  };

  function isObj(v) { return v && typeof v === 'object' && !Array.isArray(v); }
  CV.deepMerge = function (base, extra) {
    const out = CV.clone(base);
    if (!isObj(extra)) return out;
    for (const k of Object.keys(extra)) {
      out[k] = isObj(extra[k]) && isObj(out[k]) ? CV.deepMerge(out[k], extra[k]) : CV.clone(extra[k]);
    }
    return out;
  };

  /* ---------------- Saneado de HTML enriquecido ---------------- */
  const ALLOWED_TAGS = new Set(['B', 'STRONG', 'I', 'EM', 'U', 'S', 'UL', 'OL', 'LI', 'BR', 'P', 'DIV', 'A', 'SPAN', 'SUB', 'SUP']);

  /** Deja solo etiquetas de formato básico; elimina atributos, estilos y scripts. */
  CV.sanitizeHTML = function (html) {
    if (!html) return '';
    const doc = new DOMParser().parseFromString(String(html), 'text/html');
    const walk = (node) => {
      Array.from(node.childNodes).forEach((child) => {
        if (child.nodeType === 1) {
          const tag = child.tagName;
          if (tag === 'SCRIPT' || tag === 'STYLE' || tag === 'IFRAME' || tag === 'OBJECT') { child.remove(); return; }
          walk(child);
          if (!ALLOWED_TAGS.has(tag)) {
            while (child.firstChild) node.insertBefore(child.firstChild, child);
            child.remove();
            return;
          }
          Array.from(child.attributes).forEach((a) => {
            if (tag === 'A' && a.name === 'href' && /^(https?:|mailto:|tel:)/i.test(a.value.trim())) return;
            child.removeAttribute(a.name);
          });
          if (tag === 'A') { child.setAttribute('target', '_blank'); child.setAttribute('rel', 'noopener'); }
        } else if (child.nodeType !== 3) {
          child.remove();
        }
      });
    };
    walk(doc.body);
    return doc.body.innerHTML;
  };

  /** HTML enriquecido → texto plano con "- " para viñetas (para CSV). */
  CV.htmlToText = function (html) {
    if (!html) return '';
    const doc = new DOMParser().parseFromString(String(html), 'text/html');
    const out = [];
    const endsNL = () => out.length === 0 || /\n$/.test(out[out.length - 1]);
    const walk = (node) => {
      node.childNodes.forEach((ch) => {
        if (ch.nodeType === 3) out.push(ch.nodeValue);
        else if (ch.nodeType === 1) {
          const tag = ch.tagName;
          if (tag === 'BR') out.push('\n');
          else if (tag === 'LI') { if (!endsNL()) out.push('\n'); out.push('- '); walk(ch); out.push('\n'); }
          else if (tag === 'P' || tag === 'DIV' || tag === 'UL' || tag === 'OL') { if (!endsNL()) out.push('\n'); walk(ch); if (!endsNL()) out.push('\n'); }
          else walk(ch);
        }
      });
    };
    walk(doc.body);
    return out.join('').replace(/[ \t]+\n/g, '\n').replace(/\n{2,}/g, '\n').trim();
  };

  /** Texto plano (líneas, "- " viñetas) → HTML enriquecido. Si ya es HTML, lo sanea. */
  CV.textToHtml = function (text) {
    if (!text) return '';
    text = String(text);
    if (/<\/?[a-z][^>]*>/i.test(text)) return CV.sanitizeHTML(text);
    const blocks = [];
    text.split(/\r?\n/).forEach((raw) => {
      const line = raw.trim();
      if (!line) return;
      const m = line.match(/^[-•*·]\s+(.*)$/);
      if (m) {
        const last = blocks[blocks.length - 1];
        if (last && last.type === 'ul') last.items.push(m[1]); else blocks.push({ type: 'ul', items: [m[1]] });
      } else {
        blocks.push({ type: 'p', text: line });
      }
    });
    if (!blocks.length) return '';
    // Una sola línea sin viñetas: texto plano, igual que si se hubiera escrito en la hoja
    if (blocks.length === 1 && blocks[0].type === 'p') return CV.escapeHTML(blocks[0].text);
    return blocks.map((b) => b.type === 'ul'
      ? '<ul>' + b.items.map((s) => '<li>' + CV.escapeHTML(s) + '</li>').join('') + '</ul>'
      : '<div>' + CV.escapeHTML(b.text) + '</div>').join('');
  };

  /* ---------------- Eventos internos ---------------- */
  const listeners = {};
  CV.on = function (evt, fn) { (listeners[evt] = listeners[evt] || []).push(fn); };
  CV.emit = function (evt, payload) { (listeners[evt] || []).forEach((fn) => fn(payload)); };

  /* ---------------- Estado por defecto ---------------- */
  CV.defaultSettings = function () {
    return {
      template: 'harvard',
      paper: 'A4',
      margins: { top: 20, right: 20, bottom: 20, left: 20 },
      fontFamily: CV.FONTS[0].value,
      fontSize: 11,
      nameSize: 18,
      headingSize: 11.5,
      lineHeight: 1.25,
      sectionGap: 4,
      itemGap: 2.2,
      textColor: '#111111',
      accentColor: '#000000',
      photo: { show: false, shape: 'circle', size: 30, position: 'right' },
      tpl: {},
    };
  };

  CV.emptyProfile = () => ({ name: '', title: '', location: '', phone: '', email: '', linkedin: '', website: '', github: '', photo: '' });

  CV.newItem = function (type) {
    const def = CV.SECTION_TYPES[type] || CV.SECTION_TYPES.custom;
    const it = { id: CV.uid() };
    def.fields.forEach((f) => { it[f] = ''; });
    return it;
  };

  /** Crea una sección nueva del tipo dado. opts.empty → sin entrada inicial. */
  CV.newSection = function (type, opts) {
    opts = opts || {};
    const def = CV.SECTION_TYPES[type] || CV.SECTION_TYPES.custom;
    const sec = { id: CV.uid(), type, title: CV.L(def.label), visible: true };
    if (def.layout === 'block') sec.content = '';
    else sec.items = opts.empty ? [] : [CV.newItem(type)];
    return sec;
  };

  /** Estado inicial: hoja en blanco con secciones típicas. opts.empty → sin secciones. */
  CV.defaultState = function (opts) {
    opts = opts || {};
    return {
      meta: { app: 'cv-builder', version: 1, created: new Date().toISOString() },
      profile: CV.emptyProfile(),
      settings: CV.defaultSettings(),
      sections: opts.empty ? [] : ['summary', 'experience', 'education', 'skills', 'languages'].map((t) => CV.newSection(t)),
    };
  };

  /** Convierte cualquier objeto (importado, antiguo…) en un estado válido. */
  CV.normalizeState = function (raw) {
    raw = isObj(raw) ? raw : {};
    const base = CV.defaultState({ empty: true });
    const st = {
      meta: Object.assign({}, base.meta, isObj(raw.meta) ? raw.meta : {}),
      profile: Object.assign({}, base.profile),
      settings: CV.deepMerge(base.settings, isObj(raw.settings) ? raw.settings : {}),
      sections: [],
    };
    if (isObj(raw.profile)) {
      Object.keys(st.profile).forEach((k) => {
        if (raw.profile[k] != null) st.profile[k] = k === 'photo' ? String(raw.profile[k]) : String(raw.profile[k]).replace(/<[^>]*>/g, '');
      });
    }
    if (!CV.PAPERS[st.settings.paper]) st.settings.paper = 'A4';
    ['top', 'right', 'bottom', 'left'].forEach((k) => { st.settings.margins[k] = clampNum(st.settings.margins[k], 0, 60, 20); });
    st.settings.fontSize = clampNum(st.settings.fontSize, 7, 16, 11);
    st.settings.nameSize = clampNum(st.settings.nameSize, 10, 40, 18);
    st.settings.headingSize = clampNum(st.settings.headingSize, 7, 20, 11.5);
    st.settings.lineHeight = clampNum(st.settings.lineHeight, 0.9, 2.2, 1.25);
    st.settings.sectionGap = clampNum(st.settings.sectionGap, 0, 20, 4);
    st.settings.itemGap = clampNum(st.settings.itemGap, 0, 15, 2.2);
    st.settings.photo.size = clampNum(st.settings.photo.size, 10, 60, 30);
    st.settings.photo.show = !!st.settings.photo.show;
    if (!['circle', 'rounded', 'square'].includes(st.settings.photo.shape)) st.settings.photo.shape = 'circle';
    if (!['left', 'right'].includes(st.settings.photo.position)) st.settings.photo.position = 'right';

    const seen = new Set();
    (Array.isArray(raw.sections) ? raw.sections : []).forEach((s) => {
      if (!isObj(s)) return;
      const type = CV.SECTION_TYPES[s.type] ? s.type : 'custom';
      const def = CV.SECTION_TYPES[type];
      let id = s.id && !seen.has(s.id) ? String(s.id) : CV.uid();
      seen.add(id);
      const sec = { id, type, title: String(s.title != null ? s.title : CV.L(def.label)).replace(/<[^>]*>/g, ''), visible: s.visible !== false && s.visible !== 'false' };
      if (def.layout === 'block') sec.content = CV.sanitizeHTML(s.content || '');
      else sec.items = (Array.isArray(s.items) ? s.items : []).filter(isObj).map((it) => normalizeItem(type, it));
      st.sections.push(sec);
    });
    return st;
  };

  function clampNum(v, min, max, dflt) {
    const n = typeof v === 'string' ? parseFloat(v.replace(',', '.')) : v;
    if (typeof n !== 'number' || !isFinite(n)) return dflt;
    return Math.min(max, Math.max(min, n));
  }

  function normalizeItem(type, it) {
    const def = CV.SECTION_TYPES[type];
    const o = { id: it.id ? String(it.id) : CV.uid() };
    def.fields.forEach((f) => {
      const v = it[f] == null ? '' : String(it[f]);
      o[f] = f === 'description' ? CV.sanitizeHTML(v) : v.replace(/<[^>]*>/g, '');
    });
    // Datos estructurados del selector de fechas (opcionales; el texto en `dates` manda)
    if (def.fields.includes('dates') && isObj(it.datesData)) o.datesData = CV.normalizeDatesData(it.datesData);
    return o;
  }

  CV.normalizeDatesData = function (d) {
    const P = ['year', 'month', 'day'];
    const F = ['short', 'long', 'numeric', 'iso'];
    const iso = (v) => (typeof v === 'string' && /^\d{4}(-\d{2}(-\d{2})?)?$/.test(v) ? v : '');
    return {
      precision: P.includes(d.precision) ? d.precision : 'month',
      format: F.includes(d.format) ? d.format : 'short',
      range: d.range !== false && d.range !== 'false',
      current: d.current === true || d.current === 'true',
      start: iso(d.start),
      end: iso(d.end),
    };
  };

  /* ---------------- Persistencia ---------------- */
  CV.state = null;

  CV.load = function () {
    let raw = null;
    try { raw = JSON.parse(localStorage.getItem(STORAGE_KEY)); } catch (e) { raw = null; }
    CV.state = raw ? CV.normalizeState(raw) : CV.sampleData(CV.lang);
    CV.firstVisit = !raw;
  };

  CV.saveNow = function () {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(CV.state)); } catch (e) { /* almacenamiento lleno o bloqueado */ }
  };
  CV.save = CV.debounce(CV.saveNow, 350);

  CV.ui = { theme: null, lang: null, zoom: 'fit', tab: 'content' };
  CV.loadUI = function () {
    try { Object.assign(CV.ui, JSON.parse(localStorage.getItem(UI_KEY)) || {}); } catch (e) { /* ignorar */ }
    if (!CV.ui.theme) CV.ui.theme = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    if (!CV.LANGS.includes(CV.ui.lang)) CV.ui.lang = String(navigator.language || 'es').toLowerCase().startsWith('en') ? 'en' : 'es';
  };
  CV.saveUI = function () { try { localStorage.setItem(UI_KEY, JSON.stringify(CV.ui)); } catch (e) { /* ignorar */ } };

  /* ---------------- Historial (deshacer / rehacer) ---------------- */
  const past = [];
  const future = [];

  /** Guarda un punto de restauración. Llamar ANTES de mutar el estado,
      o pasar una instantánea tomada antes de la mutación. */
  CV.commit = function (snapshot) {
    past.push(snapshot || CV.clone(CV.state));
    if (past.length > HISTORY_MAX) past.shift();
    future.length = 0;
    CV.emit('history');
  };
  CV.undo = function () {
    if (!past.length) return false;
    future.push(CV.clone(CV.state));
    CV.state = past.pop();
    CV.save();
    CV.emit('state');
    CV.emit('history');
    return true;
  };
  CV.redo = function () {
    if (!future.length) return false;
    past.push(CV.clone(CV.state));
    CV.state = future.pop();
    CV.save();
    CV.emit('state');
    CV.emit('history');
    return true;
  };
  CV.canUndo = () => past.length > 0;
  CV.canRedo = () => future.length > 0;
  CV.clearHistory = () => { past.length = 0; future.length = 0; CV.emit('history'); };

  /* ---------------- Mutaciones ---------------- */
  function done(opts, payload) { CV.save(); if (!(opts && opts.silent)) CV.emit('state', payload); }

  CV.findSection = function (id) {
    const index = CV.state.sections.findIndex((s) => s.id === id);
    return { index, sec: index >= 0 ? CV.state.sections[index] : null };
  };

  CV.replaceState = function (newState, opts) {
    CV.commit();
    CV.state = CV.normalizeState(newState);
    done(opts);
  };

  CV.addSection = function (type, atIndex, opts) {
    CV.commit();
    const sec = CV.newSection(type);
    const idx = atIndex == null ? CV.state.sections.length : Math.max(0, Math.min(atIndex, CV.state.sections.length));
    CV.state.sections.splice(idx, 0, sec);
    done(opts, { focus: 'sections.' + idx + '.title', scrollTo: sec.id });
    return sec;
  };

  CV.removeSection = function (id, opts) {
    const { index } = CV.findSection(id);
    if (index < 0) return;
    CV.commit();
    CV.state.sections.splice(index, 1);
    done(opts);
  };

  CV.moveSection = function (from, to, opts) {
    const arr = CV.state.sections;
    if (from === to || from < 0 || from >= arr.length) return;
    CV.commit();
    const [s] = arr.splice(from, 1);
    arr.splice(Math.max(0, Math.min(to, arr.length)), 0, s);
    done(opts);
  };

  CV.toggleSection = function (id, opts) {
    const { sec } = CV.findSection(id);
    if (!sec) return;
    CV.commit();
    sec.visible = !sec.visible;
    done(opts);
  };

  CV.renameSection = function (id, title, opts) {
    const { sec } = CV.findSection(id);
    if (!sec) return;
    CV.commit();
    sec.title = title;
    done(opts);
  };

  CV.addItem = function (sid, atIndex, opts) {
    const { sec, index } = CV.findSection(sid);
    if (!sec || !sec.items) return -1;
    CV.commit();
    const j = atIndex == null ? sec.items.length : Math.max(0, Math.min(atIndex, sec.items.length));
    sec.items.splice(j, 0, CV.newItem(sec.type));
    done(opts, { focus: 'sections.' + index + '.items.' + j + '.' + CV.firstField(sec.type) });
    return j;
  };

  CV.removeItem = function (sid, j, opts) {
    const { sec } = CV.findSection(sid);
    if (!sec || !sec.items || !sec.items[j]) return;
    CV.commit();
    sec.items.splice(j, 1);
    done(opts);
  };

  CV.duplicateItem = function (sid, j, opts) {
    const { sec, index } = CV.findSection(sid);
    if (!sec || !sec.items || !sec.items[j]) return;
    CV.commit();
    const copy = Object.assign(CV.clone(sec.items[j]), { id: CV.uid() });
    sec.items.splice(j + 1, 0, copy);
    done(opts, { focus: 'sections.' + index + '.items.' + (j + 1) + '.' + CV.firstField(sec.type) });
  };

  CV.moveItem = function (sid, from, to, opts) {
    const { sec } = CV.findSection(sid);
    if (!sec || !sec.items || from === to || !sec.items[from]) return;
    CV.commit();
    const [it] = sec.items.splice(from, 1);
    sec.items.splice(Math.max(0, Math.min(to, sec.items.length)), 0, it);
    done(opts);
  };

  /** Cambia un ajuste (ruta relativa a settings). Sin historial: el llamador decide. */
  CV.setSetting = function (path, value) {
    CV.setPath(CV.state.settings, path, value);
    CV.save();
  };
})();
