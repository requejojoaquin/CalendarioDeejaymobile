# Calendario — Sistema de Diseño v2 (Cron / Apple Calendar inspired)

**Norte:** sobrio, type-driven, monocromático + UN acento ember. Inspirado en Cron/Notion Calendar (oscuro near-black) y Apple Calendar (claro). **Menos es más.** El rediseño existe porque la v1 era pesada: `font-black`, `uppercase tracking-widest`, glows neón, púrpura Linear y elementos sobredimensionados. Eso se elimina.

## Tokens (ya definidos en `src/index.css` — USAR, nunca hardcodear hex)
`--bg-primary` `--bg-secondary` `--bg-tertiary` · `--text-primary` `--text-secondary` `--text-tertiary` · `--border-color` `--hover-color` · `--accent-color` (ember) `--accent-hover` `--accent-soft` `--accent-contrast` · `--danger-color` `--success-color` · `--radius-sm/md/lg/full` · `--shadow-sm/md/lg`. Clases: `.linear-input` `.custom-scrollbar` `.animate-fade-in` `.animate-zoom-in` `.animate-slide-down` `.animate-spin-slow`.

## Reglas DURAS (DON'Ts — esto causó el rechazo de la v1)
1. **PROHIBIDO `font-black`/`font-extrabold`.** Pesos permitidos: `font-normal` (400 cuerpo), `font-medium` (500 labels/acciones), `font-semibold` (600 títulos). `font-bold` (700) SOLO en: número de día grande de vista Día y título del evento en el visor. Nada más.
2. **PROHIBIDO `uppercase` + `tracking-widest`/`tracking-[0.2em]`/`tracking-tighter`.** Excepción única: cabeceras de día de semana (LUN…DOM) y label "Mis calendarios" → permitido `uppercase` PERO a `text-[11px] font-medium tracking-wide text-[var(--text-tertiary)]`, sin `font-black`, sin `opacity-40`.
3. **PROHIBIDO sombras de color / glows:** `shadow-[0_0_8px_currentcolor]`, cualquier `rgba(94,106,210,...)` (púrpura), cualquier `shadow-[0_0_Npx_...color...]`. Separación = `border` 1px + contraste tonal. Sombra SOLO en popovers/menús/modales con `shadow-[var(--shadow-md)]` o `shadow-[var(--shadow-lg)]`.
4. **PROHIBIDO sobredimensionar:** botón Crear = `px-4 py-2.5 text-sm font-medium` (NO `px-10 py-5 text-base font-black`). Número día (vista Día) máx `text-5xl font-semibold` (NO `text-6xl font-black`). Iconos 18–20px.
5. **PROHIBIDO `border-2`** salvo el indicador "hoy". Resto `border` (1px).
6. **Radios consistentes:** inputs/botones `rounded-lg`; tarjetas/popovers/modales `rounded-xl`; chips de evento `rounded-md`; pills/avatares/dots `rounded-full`. No mezclar al azar.
7. **PROHIBIDO emojis como iconos** y **PROHIBIDO `GoogleIcon` (PNG raster)** — no se tiñe en modo oscuro (icono negro invisible). Reemplazar TODO `<GoogleIcon name="x"/>` por su equivalente `lucide-react` (`menu`→`Menu`, `search`→`Search`, `settings`→`Settings`, `add`→`Plus`, `close`→`X`, `back`→`ChevronLeft`, `delete`→`Trash2`, `home`→`CalendarDays`). lucide hereda `currentColor` y se ve bien en ambos temas.

## Tipografía
- Wordmark header "Calendario": `text-[15px] font-semibold tracking-tight`, **sin** uppercase.
- Título Mes/Año: `text-xl font-semibold`.
- Cuerpo 14px / line-height 1.5. Captions 12–13px `text-[var(--text-secondary)]`.
- Cifras tabulares para horas: `tabular-nums`.

## Espaciado (grid 4px) y layout
- Sidebar `w-64` (NO `w-80`). Header `h-16` con `px-4`/`px-6`, gaps `gap-2`/`gap-3`/`gap-4` coherentes.
- Densidad cómoda. Sin `gap` por defecto accidental; alineación deliberada.

## Motion (restraint — Emil Kowalski / productividad)
- **Grilla, navegación de mes, hover de celdas: SIN animación** o solo `transition-colors duration-100`. Es alta frecuencia → instantáneo.
- **Popovers / menús / modales:** `animate-zoom-in` (≈150ms). Scrim `bg-black/50` + `backdrop-blur-sm`.
- Hover botón: `transition-colors` 120–150ms. **NADA de `scale-110`/`scale-125`/`rotate-90` llamativos.** Máximo `active:scale-[0.98]`.
- `prefers-reduced-motion` ya respetado globalmente.

## Color
- Acento ember SOLO para: "hoy", botón primario (Crear), focus rings, tab/nav activa, spinners. Un único color cromático en el chrome.
- Eventos = color del calendario (dato de usuario), se mantiene multicolor. Texto del chip `text-white`.
- Cero azul Google / púrpura Linear residual.

## Estados (cobertura real obligatoria)
default · hover · `focus-visible` (anillo `shadow-[var(--ring-accent)]`) · active · disabled (`opacity-50 cursor-not-allowed`) · loading (spinner) · empty (icono + mensaje). Touch targets ≥40px en acciones; `aria-label` en botones de solo icono.

## Accesibilidad
Contraste AA en CLARO y OSCURO (texto ≥4.5:1). No transmitir info solo por color. Labels asociados. Probar ambos temas.
