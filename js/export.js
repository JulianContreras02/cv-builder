/* =====================================================================
   export.js — Exportar e importar datos (JSON y CSV) y descargar archivos.

   CSV: formato "largo", una fila por dato, fácil de abrir en Excel o
   Google Sheets y de volver a importar:
     scope, section_id, section_type, section_title, item_index, field, value
   La foto (base64) no se incluye en el CSV; sí en el JSON.
   ===================================================================== */
(function () {
  'use strict';
  const CV = window.CV;

  const CSV_COLS = ['scope', 'section_id', 'section_type', 'section_title', 'item_index', 'field', 'value'];

  /* ---------------- Descarga ---------------- */
  CV.download = function (filename, content, mime) {
    const blob = new Blob([content], { type: mime || 'application/octet-stream' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = filename; a.style.display = 'none';
    document.body.appendChild(a); a.click();
    setTimeout(() => { document.body.removeChild(a); URL.revokeObjectURL(url); }, 1000);
  };

  CV.fileBase = function () {
    const name = (CV.state.profile.name || '').trim().replace(/[\\/:*?"<>|]+/g, '').replace(/\s+/g, ' ');
    return (CV.lang === 'en' ? 'Resume' : 'Hoja de Vida') + (name ? ' - ' + name : '');
  };

  /* ---------------- JSON ---------------- */
  CV.toJSON = function () {
    const data = CV.clone(CV.state);
    data.meta = Object.assign({}, data.meta, { app: 'cv-builder', version: 1, exported: new Date().toISOString() });
    return JSON.stringify(data, null, 2);
  };
  CV.exportJSON = function () {
    CV.download(CV.fileBase() + '.json', CV.toJSON(), 'application/json');
  };

  CV.importJSON = function (text) {
    const raw = JSON.parse(text);
    if (!raw || typeof raw !== 'object' || (!raw.sections && !raw.profile)) throw new Error('JSON sin datos de hoja de vida');
    return CV.normalizeState(raw);
  };

  /* ---------------- CSV: utilidades ---------------- */
  function csvCell(v) {
    const s = v == null ? '' : String(v);
    return /[",\r\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
  }
  CV.csvStringify = function (rows) {
    return rows.map((r) => r.map(csvCell).join(',')).join('\r\n');
  };

  /** Analizador CSV con soporte de comillas, saltos de línea en celdas y ; como separador. */
  CV.csvParse = function (text) {
    text = String(text).replace(/^﻿/, '');
    // Detecta separador en la primera línea (coma por defecto, punto y coma si predomina)
    const firstLine = text.split(/\r?\n/)[0] || '';
    const sep = (firstLine.split(';').length > firstLine.split(',').length) ? ';' : ',';
    const rows = [];
    let row = [], cell = '', i = 0, inQ = false;
    while (i < text.length) {
      const c = text[i];
      if (inQ) {
        if (c === '"') {
          if (text[i + 1] === '"') { cell += '"'; i += 2; continue; }
          inQ = false; i++; continue;
        }
        cell += c; i++; continue;
      }
      if (c === '"') { inQ = true; i++; continue; }
      if (c === sep) { row.push(cell); cell = ''; i++; continue; }
      if (c === '\r') { i++; continue; }
      if (c === '\n') { row.push(cell); rows.push(row); row = []; cell = ''; i++; continue; }
      cell += c; i++;
    }
    if (cell !== '' || row.length) { row.push(cell); rows.push(row); }
    return rows.filter((r) => r.some((x) => x !== ''));
  };

  function flatten(obj, prefix, out) {
    out = out || {};
    Object.keys(obj).forEach((k) => {
      const v = obj[k];
      const key = prefix ? prefix + '.' + k : k;
      if (v && typeof v === 'object' && !Array.isArray(v)) flatten(v, key, out);
      else out[key] = v;
    });
    return out;
  }

  function coerce(s) {
    if (s === 'true') return true;
    if (s === 'false') return false;
    if (/^-?\d+(\.\d+)?$/.test(s)) return parseFloat(s);
    return s;
  }

  /* ---------------- CSV: exportar ---------------- */
  CV.toCSV = function () {
    const st = CV.state;
    const rows = [CSV_COLS];
    Object.keys(st.profile).forEach((k) => {
      if (k === 'photo') return;
      rows.push(['profile', '', '', '', '', k, st.profile[k]]);
    });
    const flat = flatten(st.settings);
    Object.keys(flat).forEach((k) => rows.push(['settings', '', '', '', '', k, flat[k]]));
    st.sections.forEach((sec) => {
      const base = ['section', sec.id, sec.type, sec.title];
      rows.push(base.concat(['', 'visible', sec.visible ? 'true' : 'false']));
      if (sec.items) {
        sec.items.forEach((it, j) => {
          Object.keys(it).forEach((f) => {
            if (f === 'id') return;
            const v = f === 'description' ? CV.htmlToText(it[f]) : it[f];
            rows.push(base.concat([String(j), f, v]));
          });
        });
      } else {
        rows.push(base.concat(['', 'content', CV.htmlToText(sec.content)]));
      }
    });
    return CV.csvStringify(rows);
  };
  CV.exportCSV = function () {
    // BOM para que Excel reconozca UTF-8 (tildes, eñes)
    CV.download(CV.fileBase() + '.csv', '﻿' + CV.toCSV(), 'text/csv;charset=utf-8');
  };

  /* ---------------- CSV: importar ---------------- */
  CV.importCSV = function (text) {
    const rows = CV.csvParse(text);
    if (!rows.length) throw new Error('CSV vacío');
    const header = rows[0].map((h) => h.trim().toLowerCase());
    const idx = {};
    CSV_COLS.forEach((c) => { idx[c] = header.indexOf(c); });
    if (idx.scope < 0 || idx.field < 0 || idx.value < 0) throw new Error('CSV sin las columnas esperadas');

    const raw = { profile: {}, settings: {}, sections: [] };
    const byId = new Map();
    for (let r = 1; r < rows.length; r++) {
      const row = rows[r];
      const get = (c) => (idx[c] >= 0 && row[idx[c]] != null ? row[idx[c]] : '');
      const scope = get('scope').trim();
      const field = get('field').trim();
      const value = get('value');
      if (!scope || !field) continue;
      if (scope === 'profile') { raw.profile[field] = value; continue; }
      if (scope === 'settings') { CV.setPath(raw.settings, field, coerce(value)); continue; }
      if (scope !== 'section') continue;

      const sid = get('section_id') || ('csv-' + r);
      let sec = byId.get(sid);
      if (!sec) {
        const type = get('section_type').trim() || 'custom';
        sec = { id: sid, type, title: get('section_title'), visible: true };
        if ((CV.SECTION_TYPES[type] || CV.SECTION_TYPES.custom).layout === 'block') sec.content = ''; else sec.items = [];
        byId.set(sid, sec);
        raw.sections.push(sec);
      }
      const itemIndex = get('item_index').trim();
      if (itemIndex === '') {
        if (field === 'visible') sec.visible = coerce(value) !== false;
        else if (field === 'content') sec.content = CV.textToHtml(value);
        else if (field === 'title') sec.title = value;
        continue;
      }
      if (!sec.items) continue;
      const j = parseInt(itemIndex, 10);
      if (isNaN(j)) continue;
      while (sec.items.length <= j) sec.items.push({});
      sec.items[j][field] = field === 'description' ? CV.textToHtml(value) : value;
    }
    if (!raw.sections.length && !Object.keys(raw.profile).length) throw new Error('CSV sin datos reconocibles');
    return CV.normalizeState(raw);
  };

  /** Detecta el formato por contenido y devuelve un estado normalizado. */
  CV.importText = function (text, filename) {
    const trimmed = String(text).replace(/^﻿/, '').trim();
    const looksJson = trimmed.startsWith('{') || /\.json$/i.test(filename || '');
    return looksJson ? CV.importJSON(trimmed) : CV.importCSV(trimmed);
  };
})();
