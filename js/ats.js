/* =====================================================================
   ats.js — Review for applicant tracking systems (ATS), the software
   that screens resumes before a person reads them.

     CV.ats.text(sheet)        → the page's text in reading order, the
                                 way it ends up in the PDF a parser reads
     CV.ats.check(state, ctx)  → findings [{ id, level, title, detail, fix }]
                                 level: 'error' | 'warn' | 'info' | 'ok'
        ctx (optional): { sheet, pages, text } adds the layout checks,
        which need the rendered page.

   It also draws the "ATS" tab of the side panel (buildPanel, refresh).
   Every ATS parses differently: these are rules of thumb most of them
   share, not an emulation of a particular product.
   ===================================================================== */
(function () {
  'use strict';
  const CV = window.CV;
  const esc = CV.escapeHTML;
  const t = (k, v) => CV.t(k, v);

  const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
  const LEVELS = ['error', 'warn', 'info', 'ok'];
  const ICONS = { error: '!', warn: '!', info: 'i', ok: '✓' };

  /* An ATS maps sections by their title, so an unusual title can hide a
     whole section. These are the words a standard title contains. */
  const STANDARD_TITLES = {
    summary: /perfil|resumen|sobre m[ií]|acerca de|objetivo|summary|profile|about|objective/i,
    experience: /experiencia|trayectoria|historia laboral|historial laboral|empleo|experience|employment|work history/i,
    education: /educaci[oó]n|formaci[oó]n|estudios|acad[eé]mic|education|academic/i,
    skills: /habilidad|competencia|conocimiento|aptitud|destreza|skill|expertise/i,
    languages: /idioma|lengua|language/i,
    projects: /proyecto|portafolio|project|portfolio/i,
    certifications: /certifica|licencia|curso|certification|license|course/i,
    awards: /premio|reconocimiento|distinci|logro|award|honor|achievement/i,
    volunteering: /voluntari|volunteer/i,
    publications: /publicaci|publication/i,
    references: /referencia|reference/i,
    interests: /inter[eé]s|aficion|pasatiempo|hobb|interest/i,
  };

  const filled = (v) => String(v == null ? '' : v).trim() !== '';

  /* ---------------- Text in reading order ---------------- */
  const INLINE = /^(inline|inline-block|inline-flex|inline-grid|contents)$/;

  /** Literal strings of a ::before/::after (separators such as " • "); counters and attr() are ignored. */
  function pseudoText(el, which) {
    const c = getComputedStyle(el, which).content;
    if (!c || c === 'none' || c === 'normal') return '';
    return (c.match(/"(?:[^"\\]|\\.)*"/g) || []).map((s) => s.slice(1, -1).replace(/\\(.)/g, '$1')).join('');
  }

  function transform(text, how) {
    if (how === 'uppercase') return text.toUpperCase();
    if (how === 'lowercase') return text.toLowerCase();
    return text;
  }

  const SECTION_BREAK = '\u2029'; // becomes a blank line between sections

  function extract(root) {
    const out = [];
    const walk = (node, textTransform) => {
      if (node.nodeType === 3) { out.push(transform(node.nodeValue, textTransform)); return; }
      if (node.nodeType !== 1) return;
      if (node.tagName === 'BR') { out.push('\n'); return; }
      const cs = getComputedStyle(node);
      if (cs.display === 'none' || cs.visibility === 'hidden') return;
      const block = !INLINE.test(cs.display);
      if (node.classList.contains('cv-section')) out.push(SECTION_BREAK);
      if (block) out.push('\n');
      if (cs.display === 'list-item') out.push('• ');
      out.push(transform(pseudoText(node, '::before'), cs.textTransform));
      node.childNodes.forEach((child) => walk(child, cs.textTransform));
      out.push(transform(pseudoText(node, '::after'), cs.textTransform));
      if (block) out.push('\n');
    };
    walk(root, 'none');
    return out.join('')
      .replace(/[ \t\u00a0]+/g, ' ')
      .replace(/ *\n */g, '\n')
      .replace(/\n{2,}/g, '\n')
      .replace(/\s*\u2029\s*/g, '\n\n')
      .trim();
  }

  /* ---------------- Fixes the panel can apply ---------------- */
  function goTo(path) {
    if (document.querySelector('#sheet .ed[data-path="' + path + '"]')) {
      document.getElementById('app').classList.remove('sidebar-open'); // small screens: show the page
      CV.focusPath(path);
      return;
    }
    if (CV.selectTab) CV.selectTab('content');
    const input = document.querySelector('[data-bind="' + path + '"]');
    if (input) { input.focus(); input.scrollIntoView({ block: 'center' }); }
  }

  function changeState(mutate) {
    CV.commit();
    mutate();
    CV.save();
    CV.emit('state');
  }

  const fixes = {
    goTo: (path) => ({ label: t('ats.fix.goTo'), run: () => goTo(path) }),
    add: (type) => ({ label: t('ats.fix.add'), run: () => CV.addSection(type) }),
    rename: (sections) => ({
      label: t('ats.fix.rename'),
      run: () => changeState(() => sections.forEach((s) => { s.title = CV.L(CV.SECTION_TYPES[s.type].label); })),
    }),
    oneColumn: () => (CV.templates.harvard && CV.switchTemplate
      ? { label: t('ats.fix.oneColumn'), run: () => CV.switchTemplate('harvard') } : null),
    spacing: () => {
      const tpl = CV.currentTemplate();
      if (!(tpl.options || []).some((o) => o.key === 'spacedHeadings')) return null;
      return { label: t('ats.fix.spacing'), run: () => changeState(() => { CV.ensureTemplateOptions().spacedHeadings = false; }) };
    },
  };

  /* ---------------- Checks ---------------- */
  function check(state, ctx) {
    ctx = ctx || {};
    const out = [];
    const add = (id, level, vars, fix) => out.push({
      id, level,
      title: t('ats.' + id + (level === 'ok' ? '.good' : '.bad'), vars),
      detail: level === 'ok' ? '' : t('ats.' + id + '.why', vars),
      fix: level === 'ok' ? null : fix || null,
    });
    const p = state.profile;
    const visible = state.sections.filter((s) => s.visible !== false);
    const entries = (type) => [].concat(...visible.filter((s) => s.type === type).map((s) =>
      (s.items || []).map((it, j) => ({ it, path: 'sections.' + state.sections.indexOf(s) + '.items.' + j }))));
    const named = (e) => filled(e.it.title) || filled(e.it.org);

    // Contact details
    if (filled(p.name)) add('name', 'ok'); else add('name', 'error', null, fixes.goTo('profile.name'));
    if (!filled(p.email)) add('email', 'error', null, fixes.goTo('profile.email'));
    else if (!EMAIL_RE.test(p.email.trim())) add('emailFormat', 'error', { email: p.email.trim() }, fixes.goTo('profile.email'));
    else add('email', 'ok');
    if (filled(p.phone)) add('phone', 'ok'); else add('phone', 'warn', null, fixes.goTo('profile.phone'));
    if (filled(p.location)) add('location', 'ok'); else add('location', 'info', null, fixes.goTo('profile.location'));

    // Content an ATS looks for
    const work = entries('experience').filter(named);
    const alternatives = entries('projects').concat(entries('volunteering')).filter(named);
    if (work.length || alternatives.length) add('experience', 'ok'); else add('experience', 'warn', null, fixes.add('experience'));

    const undated = entries('experience').concat(entries('education')).filter((e) => named(e) && !filled(e.it.dates));
    if (undated.length) {
      add('dates', 'warn', { list: undated.map((e) => [e.it.title, e.it.org].filter(filled).join(', ')).join('; ') }, fixes.goTo(undated[0].path + '.dates'));
    } else if (work.length) add('dates', 'ok');

    const skills = entries('skills').filter((e) => filled(e.it.title) || filled(CV.htmlToText(e.it.description)));
    if (skills.length) add('skills', 'ok'); else add('skills', 'warn', null, fixes.add('skills'));

    const summary = visible.some((s) => s.type === 'summary' && filled(CV.htmlToText(s.content)));
    if (summary) add('summary', 'ok'); else add('summary', 'info', null, fixes.add('summary'));

    const unusual = visible.filter((s) => STANDARD_TITLES[s.type] && !STANDARD_TITLES[s.type].test(s.title || ''));
    if (unusual.length) {
      add('titles', 'info', { list: unusual.map((s) => filled(s.title) ? '"' + s.title.trim() + '"' : t('ats.untitled')).join(', ') }, fixes.rename(unusual));
    } else add('titles', 'ok');

    if (state.settings.photo.show && filled(p.photo)) add('photo', 'info');

    // Layout: needs the rendered page
    if (ctx.sheet) {
      if (ctx.sheet.querySelectorAll('[data-sections]').length > 1) {
        add('columns', 'warn', null, fixes.oneColumn());
      } else {
        const text = ctx.text != null ? ctx.text : extractSheet(ctx.sheet);
        if (filled(p.name) && !text.toLowerCase().startsWith(p.name.trim().toLowerCase())) add('order', 'warn');
        else add('columns', 'ok');
      }
      const heading = ctx.sheet.querySelector('.cv-heading');
      if (heading) {
        const cs = getComputedStyle(heading);
        const spacing = (parseFloat(cs.letterSpacing) || 0) / parseFloat(cs.fontSize);
        if (spacing >= 0.1) add('spacing', 'warn', null, fixes.spacing()); else add('spacing', 'ok');
      }
    }
    if (ctx.pages > 2) add('pages', 'warn', { n: ctx.pages }); else if (ctx.pages) add('pages', 'ok');

    return out.sort((a, b) => LEVELS.indexOf(a.level) - LEVELS.indexOf(b.level));
  }

  /** Reads the sheet with the editor-only parts hidden, as printing does. */
  function extractSheet(sheet) {
    sheet.classList.add('ats-reading');
    try {
      return extract(sheet.firstElementChild || sheet);
    } finally {
      sheet.classList.remove('ats-reading');
    }
  }

  /* ---------------- Side panel tab ---------------- */
  let panel = null;
  let current = [];
  let currentText = '';

  function item(f, i) {
    return '<li class="ats-item level-' + f.level + '" data-id="' + esc(f.id) + '">' +
      '<span class="ats-icon" role="img" aria-label="' + esc(t('ats.level.' + f.level)) + '">' + ICONS[f.level] + '</span>' +
      '<div><strong>' + esc(f.title) + '</strong>' +
        (f.detail ? '<p>' + esc(f.detail) + '</p>' : '') +
        (f.fix ? '<button type="button" class="btn small" data-ats-fix="' + i + '">' + esc(f.fix.label) + '</button>' : '') +
      '</div></li>';
  }

  function buildPanel() {
    panel = document.getElementById('panel-ats');
    if (!panel) return;
    panel.innerHTML =
      '<p class="hint">' + esc(t('ats.intro')) + '</p>' +
      '<div class="ats-summary" id="atsSummary" aria-live="polite"></div>' +
      '<ul class="ats-list" id="atsFindings"></ul>' +
      '<details class="ats-passed"><summary id="atsPassedLabel"></summary><ul class="ats-list" id="atsPassed"></ul></details>' +
      '<section class="group ats-reading-group">' +
        '<h3>' + esc(t('ats.textTitle')) + '<button type="button" class="btn small" id="atsCopy">' + esc(t('ats.copy')) + '</button></h3>' +
        '<p class="muted">' + esc(t('ats.textHint')) + '</p>' +
        '<pre class="ats-text" id="atsText" tabindex="0"></pre>' +
      '</section>';
    if (!panel.dataset.bound) {
      panel.dataset.bound = '1';
      panel.addEventListener('click', onClick);
    }
    refresh();
  }

  function refresh() {
    if (!panel || !CV.state) return;
    const sheet = document.getElementById('sheet');
    currentText = sheet ? extractSheet(sheet) : '';
    current = check(CV.state, { sheet, pages: CV.pages, text: currentText });
    const counts = {};
    current.forEach((f) => { counts[f.level] = (counts[f.level] || 0) + 1; });
    panel.querySelector('#atsSummary').innerHTML = LEVELS.filter((l) => counts[l])
      .map((l) => '<span class="ats-count level-' + l + '">' + esc(t('ats.count.' + l, { n: counts[l] })) + '</span>').join('');
    panel.querySelector('#atsFindings').innerHTML = current.map((f, i) => f.level === 'ok' ? '' : item(f, i)).join('');
    panel.querySelector('#atsPassed').innerHTML = current.map((f, i) => f.level === 'ok' ? item(f, i) : '').join('');
    panel.querySelector('#atsPassedLabel').textContent = t('ats.passed', { n: counts.ok || 0 });
    panel.querySelector('#atsText').textContent = currentText;
  }

  function onClick(e) {
    const fixBtn = e.target.closest('[data-ats-fix]');
    if (fixBtn) {
      const f = current[+fixBtn.dataset.atsFix];
      if (f && f.fix) f.fix.run();
      return;
    }
    if (e.target.closest('#atsCopy')) copyText();
  }

  function copyText() {
    const done = () => CV.toast && CV.toast(t('ats.copied'));
    const fallback = () => {
      const r = document.createRange();
      r.selectNodeContents(panel.querySelector('#atsText'));
      const sel = window.getSelection(); sel.removeAllRanges(); sel.addRange(r);
      if (CV.toast) CV.toast(t('ats.copyFailed'), { ms: 6000 });
    };
    if (navigator.clipboard && window.isSecureContext) navigator.clipboard.writeText(currentText).then(done, fallback);
    else fallback();
  }

  const isActive = () => !!(panel && panel.classList.contains('active'));
  const scheduleRefresh = CV.debounce(() => { if (isActive()) refresh(); }, 250);
  CV.on('rendered', scheduleRefresh);
  CV.on('field', scheduleRefresh);

  CV.ats = { text: extractSheet, check, buildPanel, refresh, STANDARD_TITLES };
})();
