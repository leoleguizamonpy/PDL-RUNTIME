# Usar PDL

Esta guía es para quien construye un producto con PDL, sea una persona o un agente. Con la frase «usá PDL» alcanza para seguirla entera: describe qué decide PDL, qué decide el producto y cómo se comprueba que el resultado respeta el estándar.

PDL decide breakpoints, grilla, anchos, tipografía, color, controles, ritmo y estados. El producto decide qué contenido va, en qué orden y con qué marca (de las tres de PDL). Si para que algo se vea bien hace falta CSS propio, primero buscá el contrato de PDL que lo resuelve. Si no existe, es un hallazgo para PDL; no se parchea en el producto.

## 1. Proceso

Seguilo en este orden, sin saltear pasos:

1. **Elegí la plantilla** (sección 3). Copiala y conservá su estructura.
2. **Repartí el contenido en la grilla** (sección 4) con los repartos por defecto.
3. **Asigná a cada texto su rol** (sección 6) y a cada control su tamaño (sección 7).
4. **Agrupá los bloques** (sección 8): menos espacio dentro de un grupo que entre grupos.
5. **Verificá**: `npx pdl-check <carpeta> --render` debe dar PASS.
6. **Mirá el resultado** antes de entregar (sección 10).

## 2. Cargar PDL

```html
<html lang="es" data-pdl-brand="tierra">            <!-- sin atributo: Índigo -->
<link rel="stylesheet" href="…/src/css/index.css">   <!-- o ./css/bundle -->
<script type="module">
  import { initPDL } from "…/src/index.js";
  initPDL();                                         // menús, tabs, cajones, tema, tablas…
</script>
```

### Marca y tema

PDL 2 tiene un solo estilo (tipografía Manrope, superficies blancas, bordes suaves, sombras sutiles) y tres marcas. Una marca cambia solo dos colores: el **acento** (lo que se acciona: botón principal, ítem actual, foco, selección) y el **héroe** (la cifra que encabeza la pantalla, la marca del sidebar).

| Marca | Atributo | Acento | Héroe |
|---|---|---|---|
| Índigo (por defecto) | — | índigo `#4f46e5` | índigo |
| Leo | `data-pdl-brand="leo"` | tinta `#0b0b0c` (lima en oscuro) | lima `#e8ff47` |
| Tierra | `data-pdl-brand="tierra"` | verde yerba `#1f6b4a` | tierra roja `#b4472a` |

- **Tema**: sin `data-pdl-theme`, PDL sigue al sistema. `data-pdl-theme="light"` o `"dark"` lo fija (`positive` y `negative` siguen funcionando como alias).
- **Interruptor**: un botón con `data-pdl-theme-toggle` (ver la topbar de las plantillas) alterna claro/oscuro y recuerda la elección. Desde JS: `setPDLTheme("dark")`, `setPDLBrand("leo")`.
- No hay paletas, estilos alternativos ni parejas tipográficas: si un producto necesita otro color, es una marca nueva para PDL, no CSS propio.

- **Proyecto de 8 columnas**: `<html data-pdl-columns="8">`. Si no se indica, son 12.
- **Cursor propio**: queda apagado en apps (body con `.pdl-shell-main` o con perfil de página). Para encenderlo: `initPDL({ cursor: true })`.

## 3. Plantillas

Están en `templates/`. Cada una trae el shell completo: sidebar con marca, topbar con búsqueda (⌘K), interruptor de tema y menú de cuenta, paleta de comandos y toggle móvil.

| Pantalla | Plantilla | Perfil |
|---|---|---|
| Colección para buscar, filtrar y ordenar (pedidos, clientes, archivos) | `templates/listing.html` | `.pdl-listing-page` |
| Un elemento con su estado y propiedades | `templates/detail.html` | `.pdl-detail-page` |
| Alta o edición en pasos | `templates/form.html` | `.pdl-form-flow-page` |
| Herramienta con lienzo y paneles (editor, diseñador) | `templates/workspace.html` | `.pdl-workspace-page` |

Los contratos de cada componente están en `src/html/*.html`. Usá exactamente esa anatomía: los elementos `__title`, `__meta` y `__actions` existen para que no tengas que estilar nada.

## 4. Grilla

- **Gutter**: 16 px entre columnas (`--pdl-gutter`) y 32 px entre filas (`--pdl-gutter-y`).
- **Columnas**: 12 por defecto; 8 si el proyecto lo declara (sección 2).
- **Breakpoints**: sm 576 · md 768 · lg 992 · xl 1200 · xxl 1400. Son los únicos. Si tu CSS necesita un `@media`, usá esos valores (`max-width` con `.98`).
- **Contenedores**: página 1140 · chat 960 · prosa 720 · angosto 540.
- **Filas y columnas**: `.pdl-row` + `.pdl-col--N` (en todos los anchos) o `.pdl-col--md-6` (desde md hacia arriba, mobile first). En una fila de 8, los spans de 9 a 12 ocupan la fila entera. Las filas se pueden anidar: una fila dentro de una card tiene sus propias líneas.

Repartos por defecto en 12 columnas (en 8, entre paréntesis):

| Composición | Reparto | Contrato |
|---|---|---|
| Fila de 4 métricas | 3 + 3 + 3 + 3 (2 × 4) | `.pdl-stat-grid` |
| Contenido + columna lateral | 9 + 3 (6 + 2); la lateral pasa abajo antes de xl | `.pdl-split--aside`, `.pdl-detail-page__body` |
| Barra de herramientas sobre ese contenido | buscador 3 · filtros 6 · orden 3 | `.pdl-table-toolbar--columns` |
| Campos de formulario | pares `md-6`; textos largos a fila completa | `.pdl-row` + `.pdl-col--md-6` |
| Colección de cards | `.pdl-grid--3` o `--4` (dos columnas en tablet, una en teléfono) | `.pdl-grid` |

Columna lateral: lleva datos cortos (propiedades, saldo, próximas fechas). Lo que crece —tablas, actividad, historial— va en la columna principal, así las dos columnas terminan a una altura parecida y no queda un hueco bajo la principal.

Regla de alineación: todo lo que ocupa el ancho de la página cae sobre las mismas líneas de columna. `pdl-check --render` lo mide a 1440 y 1280 px.

## 5. Anchos laterales

Los anchos laterales no se calculan con la grilla. Son cuatro valores fijos, iguales en todo proyecto:

| Ancho | Valor | Para |
|---|---|---|
| `--pdl-width-rail` | 64 | Riel de íconos (sidebar entre 992 y 1199 px) |
| `--pdl-width-sidebar` | 256 | Navegación, árbol de archivos, panel izquierdo, pasos de un formulario |
| `--pdl-width-panel` | 320 | Inspector, vista previa, panel derecho, popover |
| `--pdl-width-drawer` | 448 | Cajón lateral, centro de notificaciones |

La topbar mide 64 de alto y sus bordes coinciden con las columnas 1 y 12.

## 6. Tipografía: un rol por texto

Una app usa cuatro tamaños: 12 · 13 · 16 · 24. Se activan solos cuando el `<body>` contiene `.pdl-shell-main`, o con `<html data-pdl-type="app">`. Las páginas de lectura (landing, artículo, páginas de enlaces) conservan la escala completa (12 · 14 · 16 · 20 · 28–40); para forzarla dentro de una app, `<html data-pdl-type="reading">`.

| Rol | App · lectura | Peso | Dónde |
|---|---|---|---|
| Título de página | 24 · 28–40 | bold | `.pdl-page-title` (uno por página) |
| Cifra | 24 · 28 | bold · tabular, sin cortes | `.pdl-stat__value` |
| Título de bloque | 16 · 20 | bold | `.pdl-card__title`, `.pdl-dialog__title` |
| Interfaz | 13 · 14 | strong | botones, tabs, chips, navegación, `.pdl-list-item__title` |
| Cuerpo / dato | 13 · 14–16 | regular | texto de la app, celdas, descripciones, `.pdl-alert__copy` |
| Énfasis | 13 · 14 | strong | nombres, `.pdl-alert__title`, `<strong>` |
| Etiqueta | 12 | strong | `.pdl-label`, `.pdl-stat__label`, encabezados de tabla, `.pdl-status-label` |
| Meta | 12 | regular | `.pdl-editorial-meta`, `.pdl-stat__meta`, líneas secundarias |
| Índice | 12 · mayúsculas | strong | `.pdl-eyebrow` |

Una sola familia: Manrope. La monoespaciada queda solo para código.

Si un texto no encaja en ningún rol, el problema es el contenido, no la escala. Ningún texto en minúsculas lleva espaciado entre letras. No se agregan tamaños: si algo se ve grande o chico, se revisa qué rol tiene.

## 7. Controles

- **Un solo cuerpo**: superficie blanca, línea suave, sombra mínima y radio de 8 px. Botones secundarios, campos, selects y chips son la misma familia; el botón principal lleva el acento de la marca.
- **Foco**: un anillo de 4 px en el color del acento (`--pdl-ring`).
- **Alturas**: 44 por defecto, 36 en barras de herramientas (`.pdl-table-toolbar`, `.pdl-filter-bar` y `.pdl-toolbar` los compactan solos). En pantallas táctiles siempre vuelven a 44.
- **Etiqueta al lado del control** (barras, ajustes densos): `.pdl-field--inline`.
- **Validación**: `aria-invalid="true"` en el control y `.pdl-helper` con el mensaje. El color sale solo.
- **Ícono sin texto**: `.pdl-icon-button` con `aria-label`, siempre.

## 8. Bloques y ritmo

- Las regiones de una página van separadas 64 px.
- **Listado**: cabecera (cierra con una línea) › `__summary` (alertas y métricas, con un rótulo `.pdl-eyebrow`) › `__results` (tabs, barra y resultados a 24 px).
- Dentro de un grupo se usa menos espacio que entre grupos. Si todo está a la misma distancia, falta agrupar.
- **Card dentro de una columna angosta**: `.pdl-card--compact`. Una lista dentro de una card no lleva marco propio.
- **Métricas**: `data-direction` dice si la cifra subió o bajó; `data-tone` dice si eso es bueno o malo. Por ejemplo, «+1 atrasado» se marca `data-direction="up" data-tone="negative"`.
  - La cifra que encabeza la pantalla lleva `.pdl-stat--hero` (una por fila, en el color héroe de la marca; en teléfono pasa primera y a todo el ancho).
  - Opcionales: `.pdl-stat__icon` en la cabecera y `.pdl-stat__row` con un `.pdl-stat__spark` junto a la cifra (se ocultan en teléfono).
- **Pares clave–valor**: `.pdl-kv` (tabla de propiedades), `.pdl-kv-lines` (liquidación con fila `__total`) y `.pdl-facts` (ícono, etiqueta y valor).
- **Composición**: `.pdl-meter` con segmentos `__segment` (`--pdl-progress` y `data-series`) y su `__legend`.
- **Actividad**: `.pdl-timeline` con un punto por evento o, como feed, un `.pdl-avatar` en lugar del punto y `.pdl-timeline__who`.
- **Avisos**: `.pdl-alert` con `data-state` toma el fondo y la línea del estado; opcionales `.pdl-alert__icon` y `.pdl-alert__action`.
- **Estados en celdas y títulos**: `.pdl-status-label` (con punto) o `.pdl-status` (chip), con `data-state` success · warning · danger · info · accent.

## 9. Tablas, capas y estados

- **Tablas**:
  - la columna del nombre lleva `.pdl-table__primary`;
  - las cifras y montos llevan `.pdl-table__num`, en el `<td>` y en su `<th>`;
  - las acciones llevan `.pdl-table__actions` (quedan fijas al borde);
  - la cabecera es una banda suave con etiquetas en minúscula; las filas miden 60 px;
  - los totales van en `<tfoot>`;
  - en teléfono, con `data-pdl-table-mode="stack"` y `data-label` en cada celda, cada fila pasa a ser una tarjeta de dos columnas: la primera celda hace de título, el estado (`.pdl-status-label`) se ubica a su lado sin etiqueta y las acciones quedan arriba a la derecha;
  - dentro de una card sin relleno (`.pdl-card--flush`), la tabla pierde su marco propio.
- **Tabs**: `.pdl-tabs__count` agrega el contador; el actual lleva subrayado y contador en el acento.
- **Cajones y diálogos**: `__header`, `__body` y `__footer`. Solo el cuerpo se desplaza, así la acción principal queda siempre a la vista. En teléfono el cajón se vuelve una hoja inferior con asa.
- **Estados vacío, carga y error**: `.pdl-empty`, `.pdl-state-screen` y la familia de feedback. Nunca una pantalla en blanco.

## 10. Revisión antes de entregar

1. `npx pdl-check <carpeta> --render` en PASS. Si hay advertencias, se resuelven o se justifican.
2. Mirá la pantalla en escritorio, tablet (riel) y teléfono, en claro y oscuro, con la marca del producto, con `dir="rtl"` y con un cajón abierto.
3. Comprobá que:
   - no haya desborde horizontal;
   - nada quede cortado;
   - la acción principal se vea;
   - cada texto tenga su rol;
   - los bordes caigan sobre las líneas de la grilla.

## 11. No hacer

- Breakpoints, tamaños de letra, pesos, anchos de más de 120 px, gaps o colores literales en el CSS del producto (`pdl-check` los marca).
- `style="…"` salvo propiedades `--pdl-*` (por ejemplo `--pdl-progress: 72%`).
- Clases `pdl-*` inventadas.
- Colores propios para el acento o el fondo: se elige una marca de PDL.
- Sidebar, paneles o cajones con anchos propios.
- Una regla de PDL «corregida» en el producto. Lo que falta se pide a PDL.
