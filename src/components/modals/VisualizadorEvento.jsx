import { useCalendario } from '../../context/CalendarioContext'
import { useAuth } from '../../context/AuthContext'
import { X, Pencil, Trash2, MapPin, AlignLeft, Users, Banknote } from 'lucide-react'

function VisualizadorEvento({ evento, onClose, onEdit }) {
  const { calendarios, eliminarEvento } = useCalendario()
  const { usuario, rol } = useAuth()
  const isAdmin = rol === 'admin'
  const calendario = calendarios.find(c => c.id === evento.calendarioId)

  const handleEliminar = () => {
    if (window.confirm('¿Estás seguro de que quieres eliminar este evento?')) {
      eliminarEvento(evento.id, usuario?.email)
      onClose()
    }
  }

  const fechaObj = new Date(evento.fecha)
  const fechaFormateada = fechaObj.toLocaleDateString('es-ES', { 
    weekday: 'long', 
    day: 'numeric', 
    month: 'long' 
  })

  return (
    <div className="fixed inset-0 bg-black/20 dark:bg-black/40 flex items-center justify-center z-[2000] p-4 backdrop-blur-[1px]" onClick={onClose}>
      <div 
        className="bg-[var(--bg-primary)] rounded-2xl shadow-2xl w-full max-w-[350px] overflow-hidden flex flex-col transition-all duration-300 transform scale-100 border border-[var(--border-color)]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-end items-center p-3 gap-2">
          <button onClick={onEdit} className="p-2 hover:bg-[var(--hover-color)] rounded-full text-[var(--text-secondary)] transition-colors" title="Editar"><Pencil size={20} /></button>
          <button onClick={handleEliminar} className="p-2 hover:bg-[var(--hover-color)] rounded-full text-[var(--text-secondary)] transition-colors" title="Eliminar"><Trash2 size={20} /></button>
          <button onClick={onClose} className="p-2 hover:bg-[var(--hover-color)] rounded-full text-[var(--text-secondary)] transition-colors" title="Cerrar"><X size={22} /></button>
        </div>

        <div className="px-8 pb-8 space-y-6">
          <div className="flex items-start gap-5">
            <div className="w-5 h-5 rounded-md mt-1.5 flex-shrink-0 shadow-sm" style={{ backgroundColor: evento.color || calendario?.color || '#1a73e8' }} />
            <div>
              <h2 className="text-2xl font-bold text-[var(--text-primary)] leading-tight">{evento.titulo}</h2>
              <p className="text-sm font-medium text-[var(--text-secondary)] mt-2">{fechaFormateada} ⋅ {evento.hora}</p>
            </div>
          </div>

          {evento.ubicacion && (
            <div className="flex items-start gap-5">
              <div className="w-6 flex justify-center text-[var(--text-secondary)] pt-0.5"><MapPin size={20} /></div>
              <span className="text-base text-[var(--text-primary)] leading-relaxed">{evento.ubicacion}</span>
            </div>
          )}

          {evento.invitados && evento.invitados.length > 0 && (
            <div className="flex items-start gap-5">
              <div className="w-6 flex justify-center text-[var(--text-secondary)] pt-0.5"><Users size={20} /></div>
              <div className="flex flex-wrap gap-2">
                {evento.invitados.map(inv => (
                  <span key={inv.id} className="text-xs bg-[var(--bg-secondary)] text-[var(--text-primary)] px-3 py-1 rounded-full border border-[var(--border-color)] font-medium">
                    {inv.email}
                  </span>
                ))}
              </div>
            </div>
          )}

          {evento.descripcion && (
            <div className="flex items-start gap-5">
              <div className="w-6 flex justify-center text-[var(--text-secondary)] pt-0.5"><AlignLeft size={20} /></div>
              <span className="text-base text-[var(--text-primary)] whitespace-pre-wrap">{evento.descripcion}</span>
            </div>
          )}

          {isAdmin && evento.precio && (
            <div className="flex items-start gap-5 pt-4 border-t border-[var(--border-color)]">
              <div className="w-6 flex justify-center text-green-600 dark:text-green-400 pt-0.5"><Banknote size={20} /></div>
              <span className="text-base font-bold text-[var(--text-primary)]">{evento.precio}</span>
            </div>
          )}

          <div className="flex items-center gap-5 text-[var(--text-secondary)]">
            <div className="w-6 flex justify-center"><div className="w-2.5 h-2.5 rounded-full bg-[var(--border-color)]" /></div>
            <span className="text-xs font-bold uppercase tracking-wider">{calendario?.nombre || 'Sin calendario'}</span>
          </div>
        </div>
      </div>
    </div>
  )
}

export default VisualizadorEvento
