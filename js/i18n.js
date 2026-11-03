/* =====================================================================
   i18n.js — Textos de la interfaz (ES / EN).
   Para agregar un idioma: añade otra clave en CV.I18N con las mismas
   llaves y amplía CV.LANGS.
   ===================================================================== */
(function () {
  'use strict';
  const CV = (window.CV = window.CV || {});

  CV.LANGS = ['es', 'en'];

  CV.I18N = {
    es: {
      'app.name': 'HojaDeVida',
      'app.tagline': 'Editor gratuito',
      'app.docTitle': 'Hoja de Vida',
      'tab.content': 'Contenido',
      'tab.design': 'Diseño',

      'btn.undo': 'Deshacer (Ctrl+Z)',
      'btn.redo': 'Rehacer (Ctrl+Y)',
      'btn.import': 'Importar',
      'btn.export': 'Exportar',
      'btn.pdf': 'Guardar PDF',
      'btn.theme': 'Cambiar entre modo claro y oscuro',
      'btn.lang': 'Switch interface to English',
      'btn.zoomIn': 'Acercar',
      'btn.zoomOut': 'Alejar',
      'btn.zoomFit': 'Ajustar al ancho',
      'btn.edit': 'Editar',

      'menu.json': 'Datos en JSON (.json)',
      'menu.csv': 'Datos en CSV (.csv)',
      'menu.sample': 'Cargar ejemplo',
      'menu.reset': 'Empezar de cero',

      'content.profile': 'Datos personales',
      'content.photo': 'Fotografía',
      'content.sections': 'Secciones',
      'content.addSection': 'Agregar sección',
      'content.hint': 'Haz clic sobre cualquier texto de la hoja para editarlo, o despliega una sección aquí abajo para editarla desde el panel. Arrastra el ícono ⋮⋮ para reordenar. Selecciona texto en una descripción para dar formato.',

      'field.name': 'Nombre completo',
      'field.title': 'Título profesional',
      'field.location': 'Ubicación',
      'field.phone': 'Teléfono',
      'field.email': 'Correo',
      'field.linkedin': 'LinkedIn',
      'field.website': 'Sitio web',
      'field.github': 'GitHub / Portafolio',

      'photo.show': 'Mostrar foto en la hoja',
      'photo.upload': 'Subir foto',
      'photo.change': 'Cambiar',
      'photo.remove': 'Quitar',
      'photo.shape': 'Forma',
      'photo.size': 'Tamaño (mm)',
      'photo.position': 'Posición',
      'photo.add': 'Agregar foto',
      'photo.none': 'Sin foto',
      'shape.circle': 'Círculo',
      'shape.rounded': 'Redondeada',
      'shape.square': 'Cuadrada',
      'pos.left': 'Izquierda',
      'pos.right': 'Derecha',

      'design.template': 'Plantilla',
      'design.paper': 'Papel y márgenes',
      'design.typography': 'Tipografía y espaciado',
      'design.colors': 'Colores',
      'design.tplOptions': 'Opciones de la plantilla',
      'design.reset': 'Restablecer diseño',

      'paper.size': 'Tamaño del papel',
      'paper.A4': 'A4 (210 × 297 mm)',
      'paper.Letter': 'Carta (216 × 279 mm)',
      'paper.Legal': 'Legal (216 × 356 mm)',
      'paper.Oficio': 'Oficio (216 × 330 mm)',
      'margin.title': 'Márgenes (mm)',
      'margin.top': 'Superior',
      'margin.bottom': 'Inferior',
      'margin.left': 'Izquierdo',
      'margin.right': 'Derecho',
      'margin.preset.narrow': 'Estrechos',
      'margin.preset.normal': 'Normales',
      'margin.preset.wide': 'Amplios',

      'type.family': 'Fuente',
      'type.custom': 'Personalizada…',
      'type.customPh': "Ej.: 'Garamond', serif",
      'type.size': 'Tamaño del texto (pt)',
      'type.nameSize': 'Tamaño del nombre (pt)',
      'type.headingSize': 'Tamaño de títulos (pt)',
      'type.lineHeight': 'Interlineado',
      'type.sectionGap': 'Espacio entre secciones (mm)',
      'type.itemGap': 'Espacio entre entradas (mm)',

      'color.text': 'Texto',
      'color.accent': 'Acento (nombre, títulos, líneas)',

      'sec.hide': 'Ocultar en la hoja',
      'sec.show': 'Mostrar en la hoja',
      'sec.delete': 'Eliminar sección',
      'sec.addItem': 'Agregar entrada',
      'sec.drag': 'Arrastrar para reordenar',
      'sec.empty': 'Sección sin entradas · haz clic aquí para agregar una',
      'sec.title': 'Título de la sección',
      'item.duplicate': 'Duplicar entrada',
      'item.delete': 'Eliminar entrada',

      'toast.sectionDeleted': 'Sección eliminada',
      'toast.itemDeleted': 'Entrada eliminada',
      'toast.undo': 'Deshacer',
      'toast.imported': 'Datos importados correctamente',
      'toast.importError': 'No se pudo leer el archivo. ¿Es un JSON o CSV exportado desde aquí?',
      'toast.exported': 'Archivo descargado',
      'toast.photoError': 'No se pudo cargar la imagen',
      'toast.sample': 'Ejemplo cargado',
      'toast.reset': 'Hoja en blanco lista',
      'toast.printTip': 'En el diálogo de impresión elige "Guardar como PDF" y desactiva "Encabezados y pies de página".',

      'confirm.reset': '¿Borrar todo el contenido y empezar de cero?\n\nConsejo: exporta un JSON antes si quieres conservar una copia.',
      'confirm.sample': '¿Reemplazar el contenido actual con el ejemplo?',
      'confirm.import': '¿Reemplazar el contenido actual con el archivo importado?',

      'fmt.bold': 'Negrita (Ctrl+B)',
      'fmt.italic': 'Cursiva (Ctrl+I)',
      'fmt.underline': 'Subrayado (Ctrl+U)',
      'fmt.ul': 'Lista con viñetas',
      'fmt.ol': 'Lista numerada',
      'fmt.clear': 'Quitar formato',
      'fmt.link': 'Insertar enlace',
      'fmt.linkPrompt': 'Dirección del enlace:',

      'pages.one': '1 página',
      'pages.many': '≈ {n} páginas',
      'pages.break': 'Página {n}',

      'privacy': 'Tus datos se guardan solo en este navegador. Nada se envía a ningún servidor.',

      'ph.name': 'Nombre Apellido',
      'ph.title': 'Título profesional (opcional)',
      'ph.location': 'Ciudad, País',
      'ph.phone': '+57 300 000 0000',
      'ph.email': 'correo@example.com',
      'ph.linkedin': 'linkedin.com/in/usuario',
      'ph.website': 'sitioweb.com',
      'ph.github': 'github.com/usuario',
      'ph.sectionTitle': 'Título de la sección',

      'fl.sectionTitle': 'Título de la sección',
      'fl.title': 'Título o cargo',
      'fl.org': 'Organización',
      'fl.location': 'Lugar',
      'fl.dates': 'Fechas',
      'fl.description': 'Descripción',
      'fl.content': 'Contenido',
      'side.entry': 'Entrada {n}',
      'side.addItem': 'Agregar entrada',
      'side.expand': 'Desplegar para editar aquí',
      'side.goto': 'Ver en la hoja',
      'item.up': 'Subir',
      'item.down': 'Bajar',

      'date.pick': 'Elegir fechas',
      'date.precision': 'Precisión',
      'date.year': 'Año',
      'date.month': 'Mes',
      'date.day': 'Día',
      'date.range': 'Rango (inicio y fin)',
      'date.start': 'Inicio',
      'date.end': 'Fin',
      'date.current': 'Actual (en curso)',
      'date.currentLabel': 'Actual',
      'date.format': 'Formato',
      'date.apply': 'Aplicar',
      'date.clear': 'Limpiar',
      'date.cancel': 'Cancelar',
      'date.preview': 'Así se verá',
      'date.prevYear': 'Año anterior',
      'date.nextYear': 'Año siguiente',
      'date.fmt.short': 'Mes corto (Mar 2022)',
      'date.fmt.long': 'Mes completo (Marzo 2022)',
      'date.fmt.numeric': 'Numérico (03/2022)',
      'date.fmt.day.short': 'Corto (15 mar 2022)',
      'date.fmt.day.long': 'Completo (15 de marzo de 2022)',
      'date.fmt.day.numeric': 'Numérico (15/03/2022)',
      'date.fmt.day.iso': 'ISO (2022-03-15)',
    },

    en: {
      'app.name': 'HojaDeVida',
      'app.tagline': 'Free resume builder',
      'app.docTitle': 'Resume',
      'tab.content': 'Content',
      'tab.design': 'Design',

      'btn.undo': 'Undo (Ctrl+Z)',
      'btn.redo': 'Redo (Ctrl+Y)',
      'btn.import': 'Import',
      'btn.export': 'Export',
      'btn.pdf': 'Save PDF',
      'btn.theme': 'Toggle light / dark mode',
      'btn.lang': 'Cambiar la interfaz a español',
      'btn.zoomIn': 'Zoom in',
      'btn.zoomOut': 'Zoom out',
      'btn.zoomFit': 'Fit to width',
      'btn.edit': 'Edit',

      'menu.json': 'Data as JSON (.json)',
      'menu.csv': 'Data as CSV (.csv)',
      'menu.sample': 'Load sample',
      'menu.reset': 'Start from scratch',

      'content.profile': 'Personal details',
      'content.photo': 'Photo',
      'content.sections': 'Sections',
      'content.addSection': 'Add section',
      'content.hint': 'Click any text on the page to edit it, or expand a section below to edit it from the panel. Drag the ⋮⋮ handle to reorder. Select text in a description to format it.',

      'field.name': 'Full name',
      'field.title': 'Professional title',
      'field.location': 'Location',
      'field.phone': 'Phone',
      'field.email': 'Email',
      'field.linkedin': 'LinkedIn',
      'field.website': 'Website',
      'field.github': 'GitHub / Portfolio',

      'photo.show': 'Show photo on the page',
      'photo.upload': 'Upload photo',
      'photo.change': 'Change',
      'photo.remove': 'Remove',
      'photo.shape': 'Shape',
      'photo.size': 'Size (mm)',
      'photo.position': 'Position',
      'photo.add': 'Add photo',
      'photo.none': 'No photo',
      'shape.circle': 'Circle',
      'shape.rounded': 'Rounded',
      'shape.square': 'Square',
      'pos.left': 'Left',
      'pos.right': 'Right',

      'design.template': 'Template',
      'design.paper': 'Paper & margins',
      'design.typography': 'Typography & spacing',
      'design.colors': 'Colors',
      'design.tplOptions': 'Template options',
      'design.reset': 'Reset design',

      'paper.size': 'Paper size',
      'paper.A4': 'A4 (210 × 297 mm)',
      'paper.Letter': 'Letter (8.5 × 11 in)',
      'paper.Legal': 'Legal (8.5 × 14 in)',
      'paper.Oficio': 'Oficio (216 × 330 mm)',
      'margin.title': 'Margins (mm)',
      'margin.top': 'Top',
      'margin.bottom': 'Bottom',
      'margin.left': 'Left',
      'margin.right': 'Right',
      'margin.preset.narrow': 'Narrow',
      'margin.preset.normal': 'Normal',
      'margin.preset.wide': 'Wide',

      'type.family': 'Font',
      'type.custom': 'Custom…',
      'type.customPh': "e.g. 'Garamond', serif",
      'type.size': 'Text size (pt)',
      'type.nameSize': 'Name size (pt)',
      'type.headingSize': 'Heading size (pt)',
      'type.lineHeight': 'Line height',
      'type.sectionGap': 'Space between sections (mm)',
      'type.itemGap': 'Space between entries (mm)',

      'color.text': 'Text',
      'color.accent': 'Accent (name, headings, rules)',

      'sec.hide': 'Hide on page',
      'sec.show': 'Show on page',
      'sec.delete': 'Delete section',
      'sec.addItem': 'Add entry',
      'sec.drag': 'Drag to reorder',
      'sec.empty': 'Empty section · click here to add an entry',
      'sec.title': 'Section title',
      'item.duplicate': 'Duplicate entry',
      'item.delete': 'Delete entry',

      'toast.sectionDeleted': 'Section deleted',
      'toast.itemDeleted': 'Entry deleted',
      'toast.undo': 'Undo',
      'toast.imported': 'Data imported',
      'toast.importError': 'Could not read the file. Is it a JSON or CSV exported from here?',
      'toast.exported': 'File downloaded',
      'toast.photoError': 'Could not load the image',
      'toast.sample': 'Sample loaded',
      'toast.reset': 'Blank page ready',
      'toast.printTip': 'In the print dialog choose "Save as PDF" and turn off "Headers and footers".',

      'confirm.reset': 'Delete all content and start from scratch?\n\nTip: export a JSON first if you want to keep a copy.',
      'confirm.sample': 'Replace the current content with the sample?',
      'confirm.import': 'Replace the current content with the imported file?',

      'fmt.bold': 'Bold (Ctrl+B)',
      'fmt.italic': 'Italic (Ctrl+I)',
      'fmt.underline': 'Underline (Ctrl+U)',
      'fmt.ul': 'Bulleted list',
      'fmt.ol': 'Numbered list',
      'fmt.clear': 'Clear formatting',
      'fmt.link': 'Insert link',
      'fmt.linkPrompt': 'Link address:',

      'pages.one': '1 page',
      'pages.many': '≈ {n} pages',
      'pages.break': 'Page {n}',

      'privacy': 'Your data is stored only in this browser. Nothing is sent to any server.',

      'ph.name': 'First Last',
      'ph.title': 'Professional title (optional)',
      'ph.location': 'City, Country',
      'ph.phone': '+1 555 000 0000',
      'ph.email': 'email@example.com',
      'ph.linkedin': 'linkedin.com/in/username',
      'ph.website': 'website.com',
      'ph.github': 'github.com/username',
      'ph.sectionTitle': 'Section title',

      'fl.sectionTitle': 'Section title',
      'fl.title': 'Title or role',
      'fl.org': 'Organization',
      'fl.location': 'Location',
      'fl.dates': 'Dates',
      'fl.description': 'Description',
      'fl.content': 'Content',
      'side.entry': 'Entry {n}',
      'side.addItem': 'Add entry',
      'side.expand': 'Expand to edit here',
      'side.goto': 'Show on the page',
      'item.up': 'Move up',
      'item.down': 'Move down',

      'date.pick': 'Pick dates',
      'date.precision': 'Precision',
      'date.year': 'Year',
      'date.month': 'Month',
      'date.day': 'Day',
      'date.range': 'Range (start and end)',
      'date.start': 'Start',
      'date.end': 'End',
      'date.current': 'Present (ongoing)',
      'date.currentLabel': 'Present',
      'date.format': 'Format',
      'date.apply': 'Apply',
      'date.clear': 'Clear',
      'date.cancel': 'Cancel',
      'date.preview': 'Preview',
      'date.prevYear': 'Previous year',
      'date.nextYear': 'Next year',
      'date.fmt.short': 'Short month (Mar 2022)',
      'date.fmt.long': 'Full month (March 2022)',
      'date.fmt.numeric': 'Numeric (03/2022)',
      'date.fmt.day.short': 'Short (Mar 15, 2022)',
      'date.fmt.day.long': 'Full (March 15, 2022)',
      'date.fmt.day.numeric': 'Numeric (03/15/2022)',
      'date.fmt.day.iso': 'ISO (2022-03-15)',
    },
  };

  CV.lang = 'es';

  /** Traduce una llave; {n} y similares se reemplazan con `vars`. */
  CV.t = function (key, vars) {
    const dict = CV.I18N[CV.lang] || CV.I18N.es;
    let s = dict[key] !== undefined ? dict[key] : (CV.I18N.es[key] !== undefined ? CV.I18N.es[key] : key);
    if (vars) {
      for (const k in vars) s = s.replace(new RegExp('\\{' + k + '\\}', 'g'), vars[k]);
    }
    return s;
  };

  /** Devuelve el texto localizado de un objeto {es:'…', en:'…'} (o la cadena tal cual). */
  CV.L = function (obj) {
    if (obj == null) return '';
    if (typeof obj === 'string') return obj;
    if (obj[CV.lang] !== undefined) return obj[CV.lang];
    if (obj.es !== undefined) return obj.es;
    const vals = Object.values(obj);
    return vals.length ? vals[0] : '';
  };

  /** Aplica las traducciones a los elementos con data-i18n* del DOM. */
  CV.applyI18n = function (root) {
    root = root || document;
    root.querySelectorAll('[data-i18n]').forEach((el) => { el.textContent = CV.t(el.dataset.i18n); });
    root.querySelectorAll('[data-i18n-title]').forEach((el) => {
      const s = CV.t(el.dataset.i18nTitle);
      el.title = s;
      el.setAttribute('aria-label', s);
    });
    root.querySelectorAll('[data-i18n-ph]').forEach((el) => { el.placeholder = CV.t(el.dataset.i18nPh); });
    document.documentElement.lang = CV.lang;
  };
})();
