import { useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useModoOscuro } from '../../context/ModoOscuroContext'
import { X, Sun, Moon, Check } from 'lucide-react'
import { scrimVariants, popVariants, springSnappy, tap, tapSoft, hoverLift } from '../../lib/motion'

function ModalAspecto({ onClose }) {
  const { esOscuro, setEsOscuro } = useModoOscuro()

  // Cerrar con la tecla Escape.
  useEffect(() => {
    const onKeyDown = (e) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [onClose])

  return (
    <motion.div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-[3000] p-4 backdrop-blur-sm"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Aspecto"
      variants={scrimVariants}
      initial="initial"
      animate="animate"
      exit="exit"
    >
      <motion.div
        className="bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-xl shadow-[var(--shadow-lg)] w-full max-w-[500px] overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
        variants={popVariants}
        initial="initial"
        animate="animate"
        exit="exit"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--border-color)]">
          <h2 className="text-base font-semibold text-[var(--text-primary)]">Aspecto</h2>
          <motion.button
            whileTap={tap}
            onClick={onClose}
            aria-label="Cerrar"
            className="flex items-center justify-center w-11 h-11 -mr-2 hover:bg-[var(--hover-color)] rounded-full transition-colors text-[var(--text-secondary)] hover:text-[var(--text-primary)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-color)]"
          >
            <X size={20} />
          </motion.button>
        </div>

        {/* Contenido */}
        <div className="p-8">
          <p className="text-sm text-[var(--text-secondary)] mb-8">
            Elige cómo quieres que se vea el calendario. Los colores de tus eventos se mantendrán igual.
          </p>

          <div className="grid grid-cols-2 gap-6">
            {/* Opción Claro */}
            <motion.button
              type="button"
              aria-pressed={!esOscuro}
              whileHover={hoverLift}
              whileTap={tapSoft}
              className="group cursor-pointer flex flex-col items-center gap-4 transition-colors focus:outline-none rounded-xl"
              onClick={() => setEsOscuro(false)}
            >
              <div
                className={`relative w-full aspect-video rounded-xl border overflow-hidden transition-colors ${
                  !esOscuro
                    ? 'border-[var(--accent-color)] ring-2 ring-[var(--accent-soft)]'
                    : 'border-[var(--border-color)] group-hover:border-[var(--text-tertiary)] group-focus-visible:border-[var(--accent-color)]'
                }`}
              >
                {/* Dibujo Mini Claro */}
                <div className="absolute inset-0 bg-white p-2 flex flex-col gap-1.5">
                  <div className="h-2 w-full bg-white border border-gray-200 rounded flex items-center px-1">
                    <div className="h-1 w-4 bg-[#1a73e8] rounded-full" />
                  </div>
                  <div className="flex-1 grid grid-cols-4 gap-1">
                    <div className="col-span-1 bg-white border border-gray-200 rounded" />
                    <div className="col-span-3 bg-white border border-gray-200 rounded p-1">
                      <div className="w-4 h-1 bg-blue-100 rounded" />
                    </div>
                  </div>
                </div>
                {/* Check Icon (swap animado) */}
                <AnimatePresence>
                  {!esOscuro && (
                    <motion.div
                      key="check-claro"
                      initial={{ opacity: 0, scale: 0.6 }}
                      animate={{ opacity: 1, scale: 1, transition: springSnappy }}
                      exit={{ opacity: 0, scale: 0.6, transition: { duration: 0.12 } }}
                      className="absolute top-2 right-2 bg-[var(--accent-color)] text-white rounded-full p-0.5"
                    >
                      <Check size={14} />
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
              <div className="flex items-center gap-2">
                <Sun
                  size={18}
                  className={!esOscuro ? 'text-[var(--accent-color)]' : 'text-[var(--text-secondary)]'}
                />
                <span
                  className={`text-sm font-semibold ${
                    !esOscuro ? 'text-[var(--accent-color)]' : 'text-[var(--text-primary)]'
                  }`}
                >
                  Claro
                </span>
              </div>
            </motion.button>

            {/* Opción Oscuro */}
            <motion.button
              type="button"
              aria-pressed={esOscuro}
              whileHover={hoverLift}
              whileTap={tapSoft}
              className="group cursor-pointer flex flex-col items-center gap-4 transition-colors focus:outline-none rounded-xl"
              onClick={() => setEsOscuro(true)}
            >
              <div
                className={`relative w-full aspect-video rounded-xl border overflow-hidden transition-colors ${
                  esOscuro
                    ? 'border-[var(--accent-color)] ring-2 ring-[var(--accent-soft)]'
                    : 'border-[var(--border-color)] group-hover:border-[var(--text-tertiary)] group-focus-visible:border-[var(--accent-color)]'
                }`}
              >
                {/* Dibujo Mini Oscuro */}
                <div className="absolute inset-0 bg-[#1e1e1e] p-2 flex flex-col gap-1.5">
                  <div className="h-2 w-full bg-[#2d2d2d] border border-gray-800 rounded flex items-center px-1">
                    <div className="h-1 w-4 bg-[#8ab4f8] rounded-full" />
                  </div>
                  <div className="flex-1 grid grid-cols-4 gap-1">
                    <div className="col-span-1 bg-[#2d2d2d] border border-gray-800 rounded" />
                    <div className="col-span-3 bg-[#2d2d2d] border border-gray-800 rounded p-1">
                      <div className="w-4 h-1 bg-blue-900 rounded" />
                    </div>
                  </div>
                </div>
                {/* Check Icon (swap animado) */}
                <AnimatePresence>
                  {esOscuro && (
                    <motion.div
                      key="check-oscuro"
                      initial={{ opacity: 0, scale: 0.6 }}
                      animate={{ opacity: 1, scale: 1, transition: springSnappy }}
                      exit={{ opacity: 0, scale: 0.6, transition: { duration: 0.12 } }}
                      className="absolute top-2 right-2 bg-[var(--accent-color)] text-white rounded-full p-0.5"
                    >
                      <Check size={14} />
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
              <div className="flex items-center gap-2">
                <Moon
                  size={18}
                  className={esOscuro ? 'text-[var(--accent-color)]' : 'text-[var(--text-secondary)]'}
                />
                <span
                  className={`text-sm font-semibold ${
                    esOscuro ? 'text-[var(--accent-color)]' : 'text-[var(--text-primary)]'
                  }`}
                >
                  Oscuro
                </span>
              </div>
            </motion.button>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-[var(--bg-secondary)] flex justify-end border-t border-[var(--border-color)]">
          <motion.button
            whileTap={tap}
            onClick={onClose}
            className="inline-flex items-center justify-center px-5 min-h-[44px] bg-[var(--accent-color)] text-[var(--accent-contrast)] text-sm font-medium rounded-[var(--radius-md)] hover:bg-[var(--accent-hover)] transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-color)]"
          >
            Listo
          </motion.button>
        </div>
      </motion.div>
    </motion.div>
  )
}

export default ModalAspecto
