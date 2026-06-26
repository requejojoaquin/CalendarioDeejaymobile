import { useRef, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Check, Pipette, X } from 'lucide-react'
import { PALETA_COLORES, normalizarColor } from '../../utils/colores'
import { useColoresPersonalizados } from '../../hooks/useColoresPersonalizados'
import { tapSoft } from '../../lib/motion'

// Selector de color reutilizable: paleta base + colores guardados por el usuario
// (cada uno con una "x" para quitarlo al pasar el mouse) + gotero que abre el
// picker nativo y guarda el color elegido. Usado en eventos y calendarios.
function SelectorColor({ value, onChange, size = 22, className = '' }) {
  const { colores, agregar, quitar } = useColoresPersonalizados()
  const sel = normalizarColor(value)
  const iconCheck = Math.round(size * 0.5)

  // El gotero guarda el color SOLO al confirmar el picker nativo (evento
  // 'change'), no en cada paso del arrastre ('input'). Así toca personalizar =
  // un único color guardado, en vez de los ~12 intermedios del arrastre.
  const inputRef = useRef(null)
  useEffect(() => {
    const el = inputRef.current
    if (!el) return
    const onCommit = (e) => agregar(e.target.value)
    el.addEventListener('change', onCommit)
    return () => el.removeEventListener('change', onCommit)
  }, [agregar])

  const Swatch = ({ color, removable = false }) => {
    const activo = normalizarColor(color) === sel
    return (
      <div className="relative group/swatch leading-none">
        <motion.button
          type="button"
          onClick={(e) => { e.stopPropagation(); onChange(color) }}
          whileTap={tapSoft}
          aria-label={`Color ${color}`}
          aria-pressed={activo}
          className="rounded-full flex items-center justify-center transition-shadow focus-visible:outline-none focus-visible:shadow-[var(--ring-accent)]"
          style={{
            width: size,
            height: size,
            backgroundColor: color,
            boxShadow: activo ? '0 0 0 2px var(--bg-primary), 0 0 0 4px var(--accent-color)' : undefined,
          }}
        >
          {activo && <Check size={iconCheck} className="text-white" strokeWidth={3} />}
        </motion.button>
        {removable && (
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); quitar(color) }}
            aria-label={`Quitar color guardado ${color}`}
            className="absolute -top-1.5 -right-1.5 hidden group-hover/swatch:flex items-center justify-center w-4 h-4 rounded-full bg-[var(--bg-primary)] border border-[var(--border-color)] text-[var(--text-secondary)] hover:text-[var(--danger-color)] shadow-[var(--shadow-sm)]"
          >
            <X size={10} strokeWidth={3} />
          </button>
        )}
      </div>
    )
  }

  return (
    <div className={`flex flex-wrap items-center gap-2 ${className}`}>
      {PALETA_COLORES.map((c) => <Swatch key={c} color={c} />)}
      {colores.map((c) => <Swatch key={c} color={c} removable />)}

      {/* Gotero: abre el picker nativo, aplica y guarda el color personalizado. */}
      <label
        className="relative rounded-full border border-[var(--border-color)] cursor-pointer overflow-hidden flex items-center justify-center flex-shrink-0 transition-colors hover:border-[var(--text-primary)] focus-within:shadow-[var(--ring-accent)]"
        style={{ width: size, height: size, backgroundColor: value || '#1a73e8' }}
        title="Color personalizado (se guarda)"
        aria-label="Elegir color personalizado y guardarlo"
        onClick={(e) => e.stopPropagation()}
      >
        <input
          ref={inputRef}
          type="color"
          value={value || '#1a73e8'}
          onChange={(e) => onChange(e.target.value)}
          aria-label="Elegir color personalizado"
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
        />
        <Pipette size={Math.round(size * 0.5)} className="relative text-white pointer-events-none" />
      </label>
    </div>
  )
}

export default SelectorColor
