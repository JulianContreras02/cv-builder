/* =====================================================================
   dates.js — Selector de fechas para los campos "dates" de las entradas.

   Permite elegir precisión (año, mes con cuadrícula de meses, o día con
   calendario), un rango inicio–fin o una sola fecha, marcar "Actual" y el
   formato de salida. El resultado se escribe como texto en el campo
   `dates` (lo que se ve en la hoja) y, además, se guarda estructurado en
   `datesData` para poder reabrir el selector con los mismos valores.
   El texto siempre puede seguir editándose a mano.
   ===================================================================== */
(function () {
  'use strict';
  const CV = window.CV;
  const esc = CV.escapeHTML;
  const t = (k, v) => CV.t(k, v);
  const pad = (n) => String(n).padStart(2, '0');
  const FORMATS = { year: ['numeric'], month: ['short', 'long', 'numeric'], day: ['short', 'long', 'numeric', 'iso'] };

  const monthCache = {};
  function monthNames(lang, style) {
    const key = lang + ':' + style;
    if (!monthCache[key]) {
      const f = new Intl.DateTimeFormat(lang === 'en' ? 'en-US' : 'es-ES', { month: style });
      monthCache[key] = Array.from({ length: 12 }, (_, m) => {
        const s = f.format(new Date(2000, m, 15)).replace(/\.$/, '');
        return s.charAt(0).toUpperCase() + s.slice(1);
      });
    }
    return monthCache[key];
  }
  function parseISO(s) {
    const m = String(s || '').match(/^(\d{4})(?:-(\d{1,2}))?(?:-(\d{1,2}))?$/);
    if (!m) return null;
    return { y: +m[1], m: m[2] ? +m[2] : null, d: m[3] ? +m[3] : null };
  }

  const D = (CV.dates = {
    defaults(singleDate) {
      return { precision: 'month', format: 'short', range: !singleDate, current: false, start: '', end: '' };
    },

    /** Formatea una fecha ISO parcial (YYYY, YYYY-MM o YYYY-MM-DD). */
    formatOne(iso, precision, format, lang) {
      const p = parseISO(iso);
      if (!p) return '';
      lang = lang || CV.lang;
      const y = p.y, m = p.m || 1, d = p.d || 1;
      if (precision === 'year' || !p.m) return String(y);
      const short = monthNames(lang, 'short');
      const long = monthNames(lang, 'long');
      if (precision === 'month' || !p.d) {
        if (format === 'long') return long[m - 1] + ' ' + y;
        if (format === 'numeric') return pad(m) + '/' + y;
        return short[m - 1] + ' ' + y;
      }
      if (format === 'iso') return y + '-' + pad(m) + '-' + pad(d);
      if (format === 'numeric') return lang === 'en' ? pad(m) + '/' + pad(d) + '/' + y : pad(d) + '/' + pad(m) + '/' + y;
      if (format === 'long') return lang === 'en' ? long[m - 1] + ' ' + d + ', ' + y : d + ' de ' + long[m - 1].toLowerCase() + ' de ' + y;
      return lang === 'en' ? short[m - 1] + ' ' + d + ', ' + y : d + ' ' + short[m - 1].toLowerCase() + ' ' + y;
    },

    /** Texto final a partir de los datos estructurados. */
    format(data, lang) {
      lang = lang || CV.lang;
      const start = D.formatOne(data.start, data.precision, data.format, lang);
      if (!data.range) return start;
      const end = data.current ? t('date.currentLabel') : D.formatOne(data.end, data.precision, data.format, lang);
      if (start && end) return start + ' – ' + end;
      return start || end;
    },

    /** Intenta reconstruir los datos a partir de un texto escrito a mano. */
    parse(text) {
      text = String(text || '').trim();
      if (!text) return null;
      const parts = text.split(/\s+[-–—]\s+|\s*[–—]\s*|\s+(?:a|to|hasta)\s+/i).map((s) => s.trim()).filter(Boolean);
      const first = parseOne(parts[0]);
      if (!first) return null;
      const range = parts.length > 1;
      let current = false, end = null;
      if (range) {
        if (/^(actual|actualidad|presente|present|current|hoy|now|today)$/i.test(parts[1])) current = true;
        else end = parseOne(parts[1]);
      }
      return { precision: first.precision, format: first.format, range, current, start: first.iso, end: end ? end.iso : '' };
    },

    open(opts) {
      if (!picker) build();
      ctx = opts;
      const itemPath = opts.path.replace(/\.dates$/, '');
      const def = sectionTypeFor(itemPath);
      const singleDate = !!(def && def.singleDate);
      const existing = CV.getPath(CV.state, itemPath + '.datesData');
      const text = CV.getPath(CV.state, opts.path) || '';
      state = existing ? CV.normalizeDatesData(existing) : (D.parse(text) || D.defaults(singleDate));
      render();
      picker.hidden = false;
      position();
      picker.focus();
    },

    close() {
      if (picker) picker.hidden = true;
      ctx = null;
    },

    isOpen() { return !!(picker && !picker.hidden); },

    apply(path, data) {
      const snap = CV.clone(CV.state);
      const d = CV.normalizeDatesData(data);
      const text = D.format(d);
      CV.setPath(CV.state, path, text);
      CV.setPath(CV.state, path.replace(/\.dates$/, '') + '.datesData', d);
      CV.commit(snap);
      CV.save();
      sync(path, text);
    },

    clear(path) {
      const snap = CV.clone(CV.state);
      CV.setPath(CV.state, path, '');
      const item = CV.getPath(CV.state, path.replace(/\.dates$/, ''));
      if (item && typeof item === 'object') delete item.datesData;
      CV.commit(snap);
      CV.save();
      sync(path, '');
    },
  });

  function parseOne(s) {
    s = String(s || '').trim();
    let m;
    if ((m = s.match(/^(\d{4})$/))) return { iso: m[1], precision: 'year', format: 'numeric' };
    if ((m = s.match(/^(\d{4})-(\d{2})-(\d{2})$/))) return { iso: s, precision: 'day', format: 'iso' };
    if ((m = s.match(/^(\d{4})-(\d{2})$/))) return { iso: s, precision: 'month', format: 'numeric' };
    if ((m = s.match(/^(\d{1,2})\/(\d{4})$/))) return { iso: m[2] + '-' + pad(m[1]), precision: 'month', format: 'numeric' };
    if ((m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/))) {
      const en = CV.lang === 'en';
      const d = en ? +m[2] : +m[1], mo = en ? +m[1] : +m[2];
      if (mo < 1 || mo > 12) return null;
      return { iso: m[3] + '-' + pad(mo) + '-' + pad(d), precision: 'day', format: 'numeric' };
    }
    // Nombres de mes (español o inglés, corto o largo): "Mar 2022", "15 de marzo de 2022", "March 15, 2022"
    const tokens = s.toLowerCase().replace(/[.,]/g, ' ').split(/\s+/).filter((x) => x && x !== 'de');
    const year = tokens.find((x) => /^\d{4}$/.test(x));
    if (!year) return null;
    const day = tokens.find((x) => /^\d{1,2}$/.test(x));
    const word = tokens.find((x) => /^[a-záéíóúñ]{3,}$/i.test(x));
    if (!word) return null;
    const found = (idx, format) => ({ iso: year + '-' + pad(idx + 1) + (day ? '-' + pad(day) : ''), precision: day ? 'day' : 'month', format });
    // Exact names first, so "Mar" reads as the short format even though "marzo" starts with it.
    for (const lang of ['es', 'en']) {
      for (const style of ['long', 'short']) {
        const idx = monthNames(lang, style).findIndex((n) => n.toLowerCase() === word);
        if (idx >= 0) return found(idx, style);
      }
    }
    // Then variants such as "sept" or "marz": same first three letters as the full name.
    for (const lang of ['es', 'en']) {
      const short = monthNames(lang, 'short').map((n) => n.toLowerCase());
      const idx = monthNames(lang, 'long').findIndex((n) => n.toLowerCase().startsWith(word.slice(0, 3)) && word.startsWith(n.toLowerCase().slice(0, 3)));
      if (idx >= 0) return found(idx, word.length > short[idx].length ? 'long' : 'short');
    }
    return null;
  }

  function sectionTypeFor(itemPath) {
    const m = itemPath.match(/^sections\.(\d+)/);
    const sec = m && CV.state.sections[+m[1]];
    return sec ? CV.SECTION_TYPES[sec.type] : null;
  }

  function sync(path, text) {
    document.querySelectorAll('.ed[data-path="' + path + '"]').forEach((el) => { el.textContent = text; });
    CV.emit('field', { path, value: text, source: 'picker' });
    if (CV.updateLayout) CV.updateLayout();
  }

  /* ---------------- Interfaz del selector ---------------- */
  let picker = null, state = null, ctx = null;

  function build() {
    picker = document.createElement('div');
    picker.id = 'datePicker';
    picker.className = 'date-picker';
    picker.hidden = true;
    picker.tabIndex = -1;
    picker.setAttribute('role', 'dialog');
    document.body.appendChild(picker);
    picker.addEventListener('click', onClick);
    picker.addEventListener('input', onInput);
    picker.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') { e.preventDefault(); D.close(); }
      if (e.key === 'Enter' && e.target.tagName === 'INPUT') { e.preventDefault(); D.apply(ctx.path, state); D.close(); }
    });
    document.addEventListener('mousedown', (e) => {
      if (picker.hidden || picker.contains(e.target)) return;
      if (ctx && ctx.anchor && ctx.anchor.contains(e.target)) return;
      D.close();
    });
    window.addEventListener('resize', () => { if (!picker.hidden) position(); });
  }

  function compose(p) {
    if (!p.y) return '';
    let s = String(p.y);
    if (state.precision !== 'year' && p.m) s += '-' + pad(p.m);
    if (state.precision === 'day' && p.m && p.d) s += '-' + pad(p.d);
    return s;
  }
  function setPart(which, part, value) {
    const p = parseISO(state[which]) || {};
    p[part] = value;
    state[which] = compose(p);
  }
  function trimTo(iso) {
    const p = parseISO(iso);
    if (!p) return '';
    if (state.precision === 'year') return String(p.y);
    if (state.precision === 'month') return p.m ? p.y + '-' + pad(p.m) : String(p.y);
    return iso;
  }

  function block(which) {
    const s = state;
    const val = s[which];
    const p = parseISO(val) || {};
    const disabled = which === 'end' && s.current;
    const dis = disabled ? ' disabled' : '';
    let inner = '';
    if (s.precision === 'day') {
      inner = '<input type="date" class="dp-date" data-block="' + which + '" data-field="date" value="' + (p.y && p.m && p.d ? esc(val) : '') + '"' + dis + '>';
    } else {
      inner = '<div class="dp-year">' +
        '<button type="button" class="icon-btn" data-block="' + which + '" data-act="year" data-delta="-1" title="' + esc(t('date.prevYear')) + '"' + dis + '>' + CV.icon('chevronLeft') + '</button>' +
        '<input type="number" data-block="' + which + '" data-field="year" min="1900" max="2100" value="' + (p.y || '') + '" placeholder="' + new Date().getFullYear() + '"' + dis + '>' +
        '<button type="button" class="icon-btn" data-block="' + which + '" data-act="year" data-delta="1" title="' + esc(t('date.nextYear')) + '"' + dis + '>' + CV.icon('chevronRight') + '</button>' +
        '</div>';
      if (s.precision === 'month') {
        const names = monthNames(CV.lang, 'short');
        inner += '<div class="dp-months">' + names.map((n, i) =>
          '<button type="button" data-block="' + which + '" data-act="month" data-month="' + (i + 1) + '" class="' + (p.m === i + 1 ? 'on' : '') + '"' + dis + '>' + esc(n) + '</button>').join('') + '</div>';
      }
    }
    return '<div class="dp-block' + (disabled ? ' disabled' : '') + '"><div class="dp-label"><span>' + esc(t('date.' + which)) + '</span>' +
      (which === 'end' ? '<label class="switch"><input type="checkbox" data-field="current"' + (s.current ? ' checked' : '') + '> ' + esc(t('date.current')) + '</label>' : '') +
      '</div>' + inner + '</div>';
  }

  function render() {
    const s = state;
    const seg = ['year', 'month', 'day'].map((p) =>
      '<button type="button" class="' + (s.precision === p ? 'on' : '') + '" data-precision="' + p + '">' + esc(t('date.' + p)) + '</button>').join('');
    const fmts = FORMATS[s.precision];
    const fmtOpts = fmts.map((f) => '<option value="' + f + '"' + (s.format === f ? ' selected' : '') + '>' +
      esc(t(s.precision === 'day' ? 'date.fmt.day.' + f : 'date.fmt.' + f)) + '</option>').join('');
    picker.innerHTML =
      '<div class="dp-seg">' + seg + '</div>' +
      '<label class="switch"><input type="checkbox" data-field="range"' + (s.range ? ' checked' : '') + '> ' + esc(t('date.range')) + '</label>' +
      block('start') +
      (s.range ? block('end') : '') +
      (s.precision === 'year' ? '' : '<div class="field"><label>' + esc(t('date.format')) + '</label><select data-field="format">' + fmtOpts + '</select></div>') +
      '<div class="dp-preview"><small>' + esc(t('date.preview')) + '</small><div data-preview>' + esc(D.format(s) || '—') + '</div></div>' +
      '<div class="dp-actions">' +
        '<button type="button" class="btn small" data-act="clear">' + esc(t('date.clear')) + '</button>' +
        '<span class="dp-spacer"></span>' +
        '<button type="button" class="btn small" data-act="cancel">' + esc(t('date.cancel')) + '</button>' +
        '<button type="button" class="btn small primary" data-act="apply">' + esc(t('date.apply')) + '</button>' +
      '</div>';
  }

  function updatePreview() {
    const pv = picker.querySelector('[data-preview]');
    if (pv) pv.textContent = D.format(state) || '—';
  }

  function position() {
    const a = ctx && ctx.anchor;
    if (!a) return;
    const r = a.getBoundingClientRect();
    const w = picker.offsetWidth, h = picker.offsetHeight;
    const left = Math.min(Math.max(8, r.left), window.innerWidth - w - 8);
    let top = r.bottom + 8;
    if (top + h > window.innerHeight - 8) top = r.top - h - 8;
    if (top < 8) top = Math.max(8, window.innerHeight - h - 8);
    picker.style.left = left + 'px';
    picker.style.top = top + 'px';
  }

  function onClick(e) {
    const b = e.target.closest('button');
    if (!b) return;
    if (b.dataset.precision) {
      state.precision = b.dataset.precision;
      if (!FORMATS[state.precision].includes(state.format)) state.format = FORMATS[state.precision][0];
      state.start = trimTo(state.start);
      state.end = trimTo(state.end);
      render();
      return;
    }
    const which = b.dataset.block;
    switch (b.dataset.act) {
      case 'year': {
        const p = parseISO(state[which]) || {};
        setPart(which, 'y', (p.y || new Date().getFullYear()) + parseInt(b.dataset.delta, 10));
        render();
        break;
      }
      case 'month': {
        const p = parseISO(state[which]) || {};
        if (!p.y) setPart(which, 'y', new Date().getFullYear());
        setPart(which, 'm', parseInt(b.dataset.month, 10));
        render();
        break;
      }
      case 'apply': D.apply(ctx.path, state); D.close(); break;
      case 'clear': D.clear(ctx.path); D.close(); break;
      case 'cancel': D.close(); break;
      default: break;
    }
  }

  function onInput(e) {
    const el = e.target;
    const f = el.dataset.field;
    if (!f) return;
    const which = el.dataset.block;
    if (f === 'range') { state.range = el.checked; render(); return; }
    if (f === 'current') { state.current = el.checked; render(); return; }
    if (f === 'format') { state.format = el.value; updatePreview(); return; }
    if (f === 'year') {
      const y = parseInt(el.value, 10);
      if (!el.value) state[which] = '';
      else if (y >= 1900 && y <= 2100) { const p = parseISO(state[which]) || {}; p.y = y; state[which] = compose(p); }
      updatePreview();
      return;
    }
    if (f === 'date') { state[which] = el.value || ''; updatePreview(); }
  }
})();
