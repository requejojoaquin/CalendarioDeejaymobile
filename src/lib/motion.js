// Lenguaje de movimiento compartido (framer-motion).
// Mezcla "polish" de Jakub (materializar con blur + spring) y restraint de Emil
// (rápido, bounce 0, profesional). prefers-reduced-motion lo maneja
// <MotionConfig reducedMotion="user"> en main.jsx (no hace falta gatear acá).

// --- Springs base (sin rebote = refinado/profesional). Ralentizados ~1.4x
//     respecto del set original para un movimiento más calmo y visible. ---
export const spring = { type: 'spring', duration: 0.6, bounce: 0 }
export const springSnappy = { type: 'spring', duration: 0.42, bounce: 0 }
export const easeOutExit = { duration: 0.22, ease: [0.4, 0, 1, 1] }

// --- Scrim de modales (fade simple) ---
export const scrimVariants = {
  initial: { opacity: 0 },
  animate: { opacity: 1, transition: { duration: 0.28 } },
  exit: { opacity: 0, transition: { duration: 0.22 } },
}

// --- Modales / pop-ups: "materializar" (opacity + scale + blur). Salida más sutil y rápida. ---
export const popVariants = {
  initial: { opacity: 0, scale: 0.96, filter: 'blur(4px)' },
  animate: { opacity: 1, scale: 1, filter: 'blur(0px)', transition: spring },
  exit: { opacity: 0, scale: 0.98, filter: 'blur(2px)', transition: easeOutExit },
}

// --- Menús / dropdowns / popovers: desde su origen (poné transform-origin en el elemento). ---
export const menuVariants = {
  initial: { opacity: 0, scale: 0.96, y: -6 },
  animate: { opacity: 1, scale: 1, y: 0, transition: springSnappy },
  exit: { opacity: 0, scale: 0.97, y: -4, transition: { duration: 0.18, ease: [0.4, 0, 1, 1] } },
}

// --- Stagger: contenedor + item (listas, campos de formulario, sugerencias) ---
export const staggerContainer = {
  animate: { transition: { staggerChildren: 0.05, delayChildren: 0.04 } },
}
export const fadeUpItem = {
  initial: { opacity: 0, y: 8, filter: 'blur(3px)' },
  animate: { opacity: 1, y: 0, filter: 'blur(0px)', transition: spring },
}

// --- Entrada de grilla al navegar (mes / semana / día / año): cada celda/fecha
//     "sube desde abajo y se completa". Misma velocidad (spring) que el resto;
//     stagger chico para que sea una cascada breve, no por celda perceptible. ---
export const gridStagger = {
  initial: {},
  animate: { transition: { staggerChildren: 0.012, delayChildren: 0.02 } },
}
export const fadeUpCell = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0, transition: spring },
}

// --- Feedback de interacción para botones/celdas (whileHover / whileTap) ---
export const tap = { scale: 0.97 }
export const tapSoft = { scale: 0.98 }
export const hoverLift = { y: -1 }
