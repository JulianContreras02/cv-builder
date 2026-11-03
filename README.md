# HojaDeVida — editor gratuito de hojas de vida

Editor de hojas de vida (CV) que corre completamente en el navegador. No necesita servidor,
base de datos ni cuenta: los datos se guardan en el navegador de cada persona y el PDF se
genera con la impresión nativa del navegador (texto vectorial, seleccionable, sin marcas de agua).

## Qué hace

- **Edición directa sobre la hoja**: cada texto es editable con un clic (nombre, contactos,
  títulos de sección, cargos, fechas, descripciones…). Enter pasa al siguiente campo.
- **Edición desde el panel**: cada sección de la lista se despliega y muestra sus entradas con
  todos sus campos. Lo que escribes en el panel se refleja en la hoja y viceversa.
- **Selector de fechas**: en cualquier campo de fechas (botón de calendario en el panel, o el
  botón "Elegir fechas" que aparece al hacer clic en la hoja) eliges precisión por año, mes
  (cuadrícula de meses) o día (calendario), rango o fecha única, "Actual" para lo que sigue en
  curso, y el formato de salida (Mar 2022, Marzo 2022, 03/2022…). El texto resultante sigue
  siendo editable a mano.
- **Formato dentro de las descripciones**: al seleccionar texto aparece una barra flotante con
  negrita, cursiva, subrayado, listas y enlaces. Escribir `- ` al inicio crea viñetas.
- **Drag and drop**: reordena secciones y entradas arrastrando el ícono ⋮⋮ (en la hoja o en el
  panel). Arrastra un tipo de sección desde "Agregar sección" al lugar exacto donde la quieres.
  Funciona también en pantallas táctiles (SortableJS).
- **Secciones**: perfil, experiencia, educación, habilidades, idiomas, proyectos,
  certificaciones, premios, voluntariado, publicaciones, referencias, intereses, personalizada y
  texto libre. Se pueden agregar varias veces, renombrar, ocultar sin borrar, duplicar entradas.
- **Diseño**: fuente (del sistema o Google Fonts), tamaño en puntos del texto, del nombre y de los
  títulos, interlineado, espacios, colores, papel (A4, Carta, Legal, Oficio) y márgenes en mm.
- **Opciones por plantilla**: cada plantilla declara sus propias opciones (mayúsculas, líneas,
  separadores…) y el panel las dibuja automáticamente.
- **Foto opcional**: subir, forma (círculo, redondeada, cuadrada), tamaño y posición. Se guarda
  redimensionada dentro de los datos.
- **Guardar PDF**: botón "Guardar PDF" → diálogo de impresión → "Guardar como PDF". Tamaño de
  papel y márgenes se aplican solos. Las entradas no se parten entre páginas.
- **Exportar / importar**: JSON (todo, incluida la foto) y CSV (formato largo, abre en Excel o
  Google Sheets). Ambos se pueden volver a importar. Ctrl+S descarga el JSON.
- **Deshacer / rehacer** (Ctrl+Z, Ctrl+Y), modo claro / oscuro, interfaz en español e inglés,
  guías aproximadas de salto de página, zoom.
- **Privacidad**: nada sale del navegador. No hay cuentas, cookies ni tarjetas.

## Estructura

```
cv-builder/
├── index.html              Esqueleto de la interfaz
├── css/
│   ├── app.css             Editor (barra, panel, tema claro/oscuro)
│   └── sheet.css           Hoja base, campos editables, controles, reglas @media print
└── js/
    ├── i18n.js             Textos de la interfaz (es, en)
    ├── schema.js           Tipos de sección, placeholders y datos de ejemplo
    ├── core.js             Estado, utilidades, historial, localStorage, mutaciones
    ├── export.js           JSON / CSV (exportar e importar)
    ├── render.js           Dibuja la hoja, edición directa, drag and drop, zoom, guías
    ├── dates.js            Selector de fechas (año / mes / día, rango, "Actual", formato)
    ├── app.js              Panel lateral, barra superior, atajos, arranque
    └── templates/
        ├── harvard.js      Plantilla Harvard (clásica, una columna)
        ├── modern.js       Plantilla Moderna (dos columnas, color de acento)
        └── minimal.js      Plantilla Minimalista (fechas en columna izquierda, líneas finas)
```

Sin build, sin npm. La única dependencia externa es SortableJS, cargada por CDN desde
`index.html` (si no carga, el reordenamiento sigue disponible con las flechas del panel).

## Probar en local

Basta con abrir `index.html` en el navegador. Para servirlo como en producción:

```bash
python -m http.server 8080 --directory cv-builder
```

y entrar a <http://localhost:8080>.

## Publicar gratis en tu dominio

Es un sitio estático: cualquier hosting gratuito sirve. Opciones probadas y sencillas:

| Servicio | Cómo | Dominio propio |
| --- | --- | --- |
| **Cloudflare Pages** | Sube la carpeta (o conecta un repo de GitHub). | Sí, con DNS en Cloudflare es un clic. HTTPS automático. |
| **GitHub Pages** | Repo público → Settings → Pages → rama `main`, carpeta `/`. | Sí: archivo `CNAME` con tu dominio + registro `CNAME` en tu DNS apuntando a `usuario.github.io`. |
| **Netlify** | Arrastra la carpeta en app.netlify.com/drop. | Sí, en Domain settings. |
| **Vercel** | `vercel deploy` o importar repo. | Sí. |

Pasos típicos con dominio comprado:

1. Publica la carpeta en uno de los servicios anteriores.
2. En el panel del servicio agrega tu dominio (por ejemplo `hojadevida.co`).
3. En el proveedor donde compraste el dominio, crea los registros DNS que el servicio te indique
   (normalmente un `CNAME` para `www` y un `A`/`ALIAS` para la raíz).
4. Espera la propagación (minutos a horas). El certificado HTTPS se emite solo.

No hay datos de usuarios en el servidor, así que no necesitas backend, base de datos ni políticas
de almacenamiento: todo vive en el `localStorage` del navegador de cada visitante.

## Consejos para el PDF

- Chrome / Edge: en el diálogo de impresión elige **Guardar como PDF**, deja márgenes en
  "Predeterminado" (los pone la app) y desactiva **Encabezados y pies de página** para que no
  salga la fecha ni la URL. "Gráficos de fondo" no hace falta.
- El nombre del archivo sugerido es `Hoja de Vida - <Nombre>.pdf`.
- Las líneas rojas punteadas de la vista previa son una **estimación** del salto de página. El
  navegador decide el corte exacto, pero nunca parte una entrada por la mitad.
- Las fuentes "(Google)" se descargan de Google Fonts al elegirlas; necesitan internet. Las demás
  son fuentes del sistema y se ven igual en pantalla y en el PDF.

## Cómo agregar una plantilla

1. Copia `js/templates/harvard.js` a `js/templates/<id>.js`.
2. Cambia `id`, `name`, `description`, `defaults`, `options`, `css` y `render`.
3. Añade `<script src="js/templates/<id>.js"></script>` en `index.html` después de `harvard.js`.

Aparecerá sola en el selector "Plantilla". Contrato mínimo que el núcleo necesita:

```js
CV.registerTemplate({
  id: 'moderna',
  name: 'Moderna',
  description: { es: '…', en: '…' },
  defaults: { fontFamily: 'Arial, sans-serif', fontSize: 10.5 },   // opcional
  options: [                                                       // opcional
    { key: 'accentBar', type: 'toggle', default: true, label: { es: 'Barra de color', en: 'Color bar' } },
    { key: 'cols', type: 'select', default: '1', label: { es: 'Columnas', en: 'Columns' },
      choices: [{ value: '1', label: '1' }, { value: '2', label: '2' }] },
  ],
  css: '.tpl-moderna .cv-heading { … }',
  render(state, h, opt) {
    // 1) Contenedor de secciones marcado con data-sections (necesario para arrastrar).
    // 2) Cada sección con h.section(sec, i, html), su título con h.heading(sec, i).
    // 3) Entradas con h.items(sec, i, (item, basePath) => html) y textos con
    //    h.ed(path, valor, {cls, ph}) o h.rich(path, valor, {cls, ph}).
    // 4) Foto con h.photo().
    const secs = state.sections.map((sec, i) => sec.visible === false ? '' :
      h.section(sec, i, h.heading(sec, i) + this.renderBody(sec, i, h))).join('');
    return '<div class="tpl-moderna" data-sections>' + header + secs + '</div>';
  },
});
```

Los helpers `h.*` se definen en `js/render.js` y están comentados. Las variables CSS disponibles
en la hoja son `--font`, `--fs`, `--fs-name`, `--fs-heading`, `--lh`, `--gap-section`,
`--gap-item`, `--text`, `--accent`, `--photo-size` y los márgenes `--m-*`.

Una plantilla a dos columnas tiene dos contenedores `data-sections` (ver `modern.js`): cada uno
es su propio grupo de arrastre, así que las secciones se reordenan dentro de su columna y la
columna la decide la plantilla por el tipo de sección. El orden relativo en el modelo se
conserva, por lo que al cambiar a otra plantilla no se mezcla.

## Plantillas incluidas

- **Harvard**: una columna, sobria, la más aceptada por reclutadores y sistemas ATS. Opciones:
  alineación del encabezado, mayúsculas, línea bajo títulos, separador de contactos.
- **Moderna**: dos columnas. Lateral (izquierda o derecha, ancho ajustable) con foto, contactos
  con íconos, habilidades, idiomas, certificaciones e intereses; principal con nombre en color
  de acento, perfil, experiencia, educación, proyectos y el resto. Opciones: fondo de la columna
  (tono suave, color sólido o solo línea), banda de color detrás del nombre, íconos, mayúsculas.
- **Minimalista**: una columna con aire y tipografía ligera. Las fechas van en una columna
  izquierda estrecha (o a la derecha si se desactiva), títulos de sección en gris con línea fina
  encima, nombre grande y fino. Opciones: ancho de la columna de fechas, peso del nombre, estilo
  de títulos, líneas, separador de contactos.

## Cómo agregar un tipo de sección

En `js/schema.js`, añade una entrada a `CV.SECTION_TYPES` con `layout` (`block`, `entry`,
`line` o `compact`), `fields`, `label` y `ph`, y su clave a `CV.SECTION_ORDER`. Las plantillas
existentes ya saben dibujar los cuatro layouts.

## Formato de datos

**JSON**: el estado completo (`profile`, `settings`, `sections`). Es el formato de respaldo
recomendado. Las entradas con fechas elegidas en el selector guardan además `datesData`
(`precision`, `format`, `range`, `current`, `start`, `end` en formato ISO) para reabrir el
selector con los mismos valores; el texto visible siempre está en `dates`.

**CSV** (formato largo, una fila por dato; la foto no se incluye):

```
scope,section_id,section_type,section_title,item_index,field,value
profile,,,,,name,Laura Martínez
settings,,,,,fontSize,11
section,abc123,experience,Experiencia profesional,,visible,true
section,abc123,experience,Experiencia profesional,0,org,Banco Andino
section,abc123,experience,Experiencia profesional,0,description,"- Logro uno
- Logro dos"
```

Las descripciones se exportan como texto con `- ` por viñeta y vuelven a convertirse en listas
al importar.

## Ideas para después

- Más plantillas (moderna a dos columnas, minimalista, académica).
- Carta de presentación con los mismos datos.
- Compartir diseño por URL (estado comprimido en el enlace).
- Modo sin conexión completo (service worker) y empaquetar SortableJS localmente.
