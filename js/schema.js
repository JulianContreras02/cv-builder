/* =====================================================================
   schema.js — Tipos de sección, textos de ayuda (placeholders) y datos
   de ejemplo.

   Cada tipo declara:
     layout : 'block'   → un solo texto enriquecido (perfil, intereses…)
              'entry'   → bloque de dos líneas + descripción (experiencia…)
              'line'    → una línea: título, organización … fechas
              'compact' → "Título: descripción" (habilidades, idiomas)
     orgFirst : en layout 'entry', si la organización va en la 1ª línea
                (estilo Harvard) o el título/cargo.
     fields   : campos que existen en cada entrada.
     ph       : placeholders por campo, en {es, en}.

   Las plantillas (js/templates/*.js) deciden cómo dibujar cada layout.
   Para agregar un tipo nuevo basta con añadirlo aquí y a SECTION_ORDER.
   ===================================================================== */
(function () {
  'use strict';
  const CV = window.CV;
  const L = (es, en) => ({ es, en });

  const ENTRY = ['org', 'location', 'title', 'dates', 'description'];

  CV.SECTION_TYPES = {
    summary: {
      layout: 'block', icon: '📝',
      label: L('Perfil profesional', 'Professional Summary'),
      fields: ['content'],
      ph: { content: L('Resumen breve de tu perfil, experiencia y objetivos (3 a 4 líneas).', 'Brief summary of your profile, experience and goals (3–4 lines).') },
    },
    experience: {
      layout: 'entry', orgFirst: true, icon: '💼',
      label: L('Experiencia profesional', 'Professional Experience'),
      fields: ENTRY,
      ph: {
        org: L('Empresa u organización', 'Company or organization'),
        location: L('Ciudad, País', 'City, Country'),
        title: L('Cargo', 'Job title'),
        dates: L('Ene 2022 – Actual', 'Jan 2022 – Present'),
        description: L('Logros y responsabilidades. Escribe "- " al inicio para crear viñetas.', 'Achievements and responsibilities. Type "- " to start a bulleted list.'),
      },
    },
    education: {
      layout: 'entry', orgFirst: true, icon: '🎓',
      label: L('Educación', 'Education'),
      fields: ENTRY,
      ph: {
        org: L('Universidad o institución', 'University or institution'),
        location: L('Ciudad, País', 'City, Country'),
        title: L('Título obtenido', 'Degree'),
        dates: L('2016 – 2021', '2016 – 2021'),
        description: L('Mención, promedio, tesis (opcional)', 'Honors, GPA, thesis (optional)'),
      },
    },
    projects: {
      layout: 'entry', orgFirst: false, icon: '🚀',
      label: L('Proyectos', 'Projects'),
      fields: ['title', 'org', 'dates', 'description'],
      ph: {
        title: L('Nombre del proyecto', 'Project name'),
        org: L('Rol, tecnologías o enlace', 'Role, technologies or link'),
        dates: L('2023', '2023'),
        description: L('Qué hiciste y qué resultado tuvo.', 'What you did and the outcome.'),
      },
    },
    volunteering: {
      layout: 'entry', orgFirst: true, icon: '🤝',
      label: L('Voluntariado', 'Volunteering'),
      fields: ENTRY,
      ph: {
        org: L('Organización', 'Organization'),
        location: L('Ciudad, País', 'City, Country'),
        title: L('Rol', 'Role'),
        dates: L('2020 – 2021', '2020 – 2021'),
        description: L('Actividades y logros.', 'Activities and achievements.'),
      },
    },
    skills: {
      layout: 'compact', icon: '🛠️',
      label: L('Habilidades', 'Skills'),
      fields: ['title', 'description'],
      ph: { title: L('Categoría', 'Category'), description: L('Habilidad 1, Habilidad 2, Habilidad 3', 'Skill 1, Skill 2, Skill 3') },
    },
    languages: {
      layout: 'compact', icon: '🌐',
      label: L('Idiomas', 'Languages'),
      fields: ['title', 'description'],
      ph: { title: L('Idioma', 'Language'), description: L('Nivel (p. ej. B2, Avanzado, Nativo)', 'Level (e.g. B2, Advanced, Native)') },
    },
    certifications: {
      layout: 'line', icon: '📜', singleDate: true,
      label: L('Certificaciones', 'Certifications'),
      fields: ['title', 'org', 'dates'],
      ph: { title: L('Nombre de la certificación', 'Certification name'), org: L('Entidad emisora', 'Issuing organization'), dates: L('2024', '2024') },
    },
    awards: {
      layout: 'line', icon: '🏆', singleDate: true,
      label: L('Premios y reconocimientos', 'Awards & Honors'),
      fields: ['title', 'org', 'dates', 'description'],
      ph: { title: L('Premio o reconocimiento', 'Award or honor'), org: L('Otorgado por', 'Awarded by'), dates: L('2023', '2023'), description: L('Descripción breve (opcional)', 'Short description (optional)') },
    },
    publications: {
      layout: 'line', icon: '📚', singleDate: true,
      label: L('Publicaciones', 'Publications'),
      fields: ['title', 'org', 'dates'],
      ph: { title: L('Título de la publicación', 'Publication title'), org: L('Revista, editorial o congreso', 'Journal, publisher or conference'), dates: L('2022', '2022') },
    },
    references: {
      layout: 'entry', orgFirst: false, icon: '👤',
      label: L('Referencias', 'References'),
      fields: ['title', 'org', 'description'],
      ph: { title: L('Nombre completo', 'Full name'), org: L('Cargo, empresa', 'Position, company'), description: L('Teléfono · correo', 'Phone · email') },
    },
    interests: {
      layout: 'block', icon: '🎯',
      label: L('Intereses', 'Interests'),
      fields: ['content'],
      ph: { content: L('Intereses, actividades extracurriculares…', 'Interests, extracurricular activities…') },
    },
    custom: {
      layout: 'entry', orgFirst: false, icon: '✨',
      label: L('Sección personalizada', 'Custom section'),
      fields: ENTRY,
      ph: { title: L('Título', 'Title'), org: L('Subtítulo', 'Subtitle'), location: L('Lugar', 'Place'), dates: L('Fechas', 'Dates'), description: L('Descripción', 'Description') },
    },
    text: {
      layout: 'block', icon: '¶',
      label: L('Texto libre', 'Free text'),
      fields: ['content'],
      ph: { content: L('Escribe aquí…', 'Write here…') },
    },
  };

  /** Orden en que aparecen los tipos en la paleta "Agregar sección". */
  CV.SECTION_ORDER = ['summary', 'experience', 'education', 'skills', 'languages', 'projects', 'certifications', 'awards', 'volunteering', 'publications', 'references', 'interests', 'custom', 'text'];

  CV.phFor = function (type, field) {
    const def = CV.SECTION_TYPES[type] || CV.SECTION_TYPES.custom;
    return CV.L(def.ph && def.ph[field]);
  };

  /** Primer campo que se enfoca al crear una entrada nueva. */
  CV.firstField = function (type) {
    const def = CV.SECTION_TYPES[type] || CV.SECTION_TYPES.custom;
    if (def.layout === 'block') return 'content';
    if (def.layout === 'entry' && def.orgFirst) return 'org';
    return def.fields[0];
  };

  /* ---------------- Datos de ejemplo ---------------- */
  const ul = (items) => '<ul>' + items.map((s) => '<li>' + s + '</li>').join('') + '</ul>';

  const SAMPLES = {
    es: {
      profile: {
        name: 'Laura Martínez Gómez',
        title: 'Ingeniera de Sistemas · Analista de Datos',
        location: 'Bogotá, Colombia',
        phone: '+57 300 000 0000',
        email: 'laura.martinez@example.com',
        linkedin: 'linkedin.com/in/laura-martinez-ejemplo',
        website: '',
        github: 'github.com/laura-martinez-ejemplo',
        photo: '',
      },
      sections: [
        { type: 'summary', content: 'Ingeniera de sistemas con cinco años de experiencia en análisis de datos y desarrollo de soluciones de inteligencia de negocio. He liderado equipos pequeños y automatizado procesos que redujeron tiempos operativos en más del 30 %. Busco roles de analítica avanzada donde pueda conectar datos con decisiones de negocio.' },
        { type: 'experience', items: [
          { org: 'Banco Andino', location: 'Bogotá, Colombia', title: 'Analista Senior de Datos', dates: 'Mar 2022 – Actual',
            description: ul(['Diseñé y mantengo tableros en Power BI para seis áreas de negocio, usados por más de 200 personas cada semana.', 'Automaticé la consolidación mensual de reportes con Python y SQL, reduciendo el cierre de cinco días a uno.', 'Lidero un equipo de tres analistas y definí los estándares de calidad de datos del área.']) },
          { org: 'Tecnova S.A.S.', location: 'Medellín, Colombia', title: 'Desarrolladora Backend', dates: 'Ene 2020 – Feb 2022',
            description: ul(['Desarrollé APIs REST en Node.js para la plataforma de pagos, con cerca de 1,5 millones de transacciones al mes.', 'Implementé pruebas automatizadas que elevaron la cobertura del 40 % al 85 %.']) },
        ] },
        { type: 'education', items: [
          { org: 'Universidad Nacional de Colombia', location: 'Bogotá, Colombia', title: 'Ingeniería de Sistemas y Computación', dates: '2014 – 2019', description: 'Tesis: Modelos predictivos para la deserción estudiantil. Promedio 4,3 / 5,0.' },
          { org: 'Universidad de Michigan (Coursera)', location: 'En línea', title: 'Especialización en Applied Data Science with Python', dates: '2021', description: '' },
        ] },
        { type: 'skills', items: [
          { title: 'Lenguajes', description: 'Python, SQL, JavaScript, R' },
          { title: 'Herramientas', description: 'Power BI, Tableau, Git, Docker, Airflow' },
          { title: 'Competencias', description: 'Liderazgo de equipos, comunicación de resultados, pensamiento analítico' },
        ] },
        { type: 'certifications', items: [
          { title: 'Power BI Data Analyst Associate', org: 'Microsoft', dates: '2023' },
          { title: 'AWS Certified Cloud Practitioner', org: 'Amazon Web Services', dates: '2022' },
        ] },
        { type: 'languages', items: [
          { title: 'Español', description: 'Nativo' },
          { title: 'Inglés', description: 'Avanzado (C1)' },
          { title: 'Portugués', description: 'Intermedio (B1)' },
        ] },
      ],
    },
    en: {
      profile: {
        name: 'Alex Morgan',
        title: 'Software Engineer · Data Analyst',
        location: 'Austin, TX, USA',
        phone: '+1 512 555 0147',
        email: 'alex.morgan@example.com',
        linkedin: 'linkedin.com/in/alex-morgan-example',
        website: '',
        github: 'github.com/alex-morgan-example',
        photo: '',
      },
      sections: [
        { type: 'summary', content: 'Software engineer with five years of experience in data analytics and business-intelligence solutions. Led small teams and automated processes that cut operating time by more than 30%. Looking for advanced-analytics roles where data drives business decisions.' },
        { type: 'experience', items: [
          { org: 'Andean Bank', location: 'Austin, TX', title: 'Senior Data Analyst', dates: 'Mar 2022 – Present',
            description: ul(['Designed and maintain Power BI dashboards for six business units, used weekly by 200+ people.', 'Automated monthly report consolidation with Python and SQL, cutting close time from five days to one.', 'Lead a team of three analysts and defined the data-quality standards for the department.']) },
          { org: 'Tecnova Inc.', location: 'Denver, CO', title: 'Backend Developer', dates: 'Jan 2020 – Feb 2022',
            description: ul(['Built REST APIs in Node.js for the payments platform (~1.5M transactions per month).', 'Introduced automated testing, raising coverage from 40% to 85%.']) },
        ] },
        { type: 'education', items: [
          { org: 'University of Texas at Austin', location: 'Austin, TX', title: 'B.S. in Computer Science', dates: '2014 – 2019', description: 'Thesis: Predictive models for student dropout. GPA 3.8 / 4.0.' },
          { org: 'University of Michigan (Coursera)', location: 'Online', title: 'Applied Data Science with Python Specialization', dates: '2021', description: '' },
        ] },
        { type: 'skills', items: [
          { title: 'Languages', description: 'Python, SQL, JavaScript, R' },
          { title: 'Tools', description: 'Power BI, Tableau, Git, Docker, Airflow' },
          { title: 'Strengths', description: 'Team leadership, communicating results, analytical thinking' },
        ] },
        { type: 'certifications', items: [
          { title: 'Power BI Data Analyst Associate', org: 'Microsoft', dates: '2023' },
          { title: 'AWS Certified Cloud Practitioner', org: 'Amazon Web Services', dates: '2022' },
        ] },
        { type: 'languages', items: [
          { title: 'English', description: 'Native' },
          { title: 'Spanish', description: 'Advanced (C1)' },
          { title: 'Portuguese', description: 'Intermediate (B1)' },
        ] },
      ],
    },
  };

  /** Estado completo de ejemplo en el idioma indicado (requiere core.js). */
  CV.sampleData = function (lang) {
    const src = SAMPLES[lang] || SAMPLES.es;
    const st = CV.defaultState({ empty: true });
    st.profile = Object.assign({}, st.profile, src.profile);
    st.sections = src.sections.map((s) => {
      const sec = CV.newSection(s.type, { empty: true });
      if (s.content !== undefined) sec.content = s.content;
      if (s.items) sec.items = s.items.map((it) => Object.assign(CV.newItem(s.type), it));
      return sec;
    });
    return st;
  };
})();
