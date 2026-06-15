import { useModoOscuro } from '../../context/ModoOscuroContext'
import { X, Sun, Moon, Check } from 'lucide-react'

function ModalAspecto({ onClose }) {
  const { esOscuro, setEsOscuro } = useModoOscuro()

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-[3000] p-4 backdrop-blur-sm" onClick={onClose}>
      <div 
        className="bg-[var(--bg-primary)] rounded-2xl shadow-2xl w-full max-w-[500px] overflow-hidden flex flex-col transition-all duration-300"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-[var(--border-color)]">
          <h2 className="text-xl font-medium text-[var(--text-primary)]">Aspecto</h2>
          <button onClick={onClose} className="p-2 hover:bg-[var(--hover-color)] rounded-full transition-colors text-[var(--text-secondary)]">
            <X size={20} />
          </button>
        </div>

        {/* Contenido */}
        <div className="p-8">
          <p className="text-sm text-[var(--text-secondary)] mb-8">
            Elige cómo quieres que se vea el calendario. Los colores de tus eventos se mantendrán igual.
          </p>

          <div className="grid grid-cols-2 gap-8">
            {/* Opción Claro */}
            <div 
              className={`group cursor-pointer flex flex-col items-center gap-4 transition-all`}
              onClick={() => setEsOscuro(false)}
            >
              <div className={`relative w-full aspect-video rounded-xl border-4 overflow-hidden transition-all duration-200 ${!esOscuro ? 'border-blue-500 ring-4 ring-blue-500/20' : 'border-[var(--border-color)] hover:border-gray-300'}`}>
                {/* Dibujo Mini Claro */}
                <div className="absolute inset-0 bg-white p-2 flex flex-col gap-1.5">
                  <div className="h-2 w-full bg-white border border-gray-200 rounded flex items-center px-1">
                     <div className="h-1 w-4 bg-blue-500 rounded-full" />
                  </div>
                  <div className="flex-1 grid grid-cols-4 gap-1">
                    <div className="col-span-1 bg-white border border-gray-200 rounded" />
                    <div className="col-span-3 bg-white border border-gray-200 rounded p-1">
                       <div className="w-4 h-1 bg-blue-100 rounded" />
                    </div>
                  </div>
                </div>
                {/* Check Icon */}
                {!esOscuro && (
                  <div className="absolute top-2 right-2 bg-blue-500 text-white rounded-full p-0.5">
                    <Check size={14} />
                  </div>
                )}
              </div>
              <div className="flex items-center gap-2">
                <Sun size={18} className={!esOscuro ? 'text-blue-500' : 'text-[var(--text-secondary)]'} />
                <span className={`text-sm font-medium ${!esOscuro ? 'text-blue-600' : 'text-[var(--text-primary)]'}`}>Claro</span>
              </div>
            </div>

            {/* Opción Oscuro */}
            <div 
              className={`group cursor-pointer flex flex-col items-center gap-4 transition-all`}
              onClick={() => setEsOscuro(true)}
            >
              <div className={`relative w-full aspect-video rounded-xl border-4 overflow-hidden transition-all duration-200 ${esOscuro ? 'border-blue-500 ring-4 ring-blue-500/20' : 'border-[var(--border-color)] hover:border-gray-300'}`}>
                {/* Dibujo Mini Oscuro */}
                <div className="absolute inset-0 bg-[#1e1e1e] p-2 flex flex-col gap-1.5">
                  <div className="h-2 w-full bg-[#2d2d2d] border border-gray-800 rounded flex items-center px-1">
                     <div className="h-1 w-4 bg-blue-600 rounded-full" />
                  </div>
                  <div className="flex-1 grid grid-cols-4 gap-1">
                    <div className="col-span-1 bg-[#2d2d2d] border border-gray-800 rounded" />
                    <div className="col-span-3 bg-[#2d2d2d] border border-gray-800 rounded p-1">
                       <div className="w-4 h-1 bg-blue-900 rounded" />
                    </div>
                  </div>
                </div>
                {/* Check Icon */}
                {esOscuro && (
                  <div className="absolute top-2 right-2 bg-blue-500 text-white rounded-full p-0.5">
                    <Check size={14} />
                  </div>
                )}
              </div>
              <div className="flex items-center gap-2">
                <Moon size={18} className={esOscuro ? 'text-blue-500' : 'text-[var(--text-secondary)]'} />
                <span className={`text-sm font-medium ${esOscuro ? 'text-blue-400' : 'text-[var(--text-primary)]'}`}>Oscuro</span>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 bg-[var(--bg-secondary)] flex justify-end border-t border-[var(--border-color)]">
          <button 
            onClick={onClose}
            className="px-6 py-2 bg-blue-600 text-white text-sm font-medium rounded-full hover:bg-blue-700 transition-all shadow-md"
          >
            Listo
          </button>
        </div>
      </div>
    </div>
  )
}

export default ModalAspecto
