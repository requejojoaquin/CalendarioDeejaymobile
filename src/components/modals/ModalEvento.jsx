import { useState, useEffect, useRef } from 'react'
import { useCalendario } from '../../context/CalendarioContext'
import { useAuth } from '../../context/AuthContext'
import { db } from '../../services/firebase'
import { collection, query, getDocs, where, limit } from 'firebase/firestore'
import { 
  X, 
  Menu, 
  Clock, 
  MapPin, 
  AlignLeft, 
  Banknote,
  Users,
  Check,
  Calendar
} from 'lucide-react'
import GoogleIcon from '../common/GoogleIcon'

function ModalEvento({ onClose, fechaSeleccionada, eventoAEditar }) {
  const { calendarios, agregarEvento, editarEvento } = useCalendario()
  const { rol, usuario } = useAuth()
  const isAdmin = rol === 'admin'
  
  const [titulo, setTitulo] = useState(eventoAEditar?.titulo || '')
  const [descripcion, setDescripcion] = useState(eventoAEditar?.descripcion || '')
  const [precio, setPrecio] = useState(eventoAEditar?.precio || '')
  const [ubicacion, setUbicacion] = useState(eventoAEditar?.ubicacion || '')
  const [sugerencias, setSugerencias] = useState([])
  const [buscando, setBuscando] = useState(false)
  const [calendarioId, setCalendarioId] = useState(eventoAEditar?.calendarioId || calendarios[0]?.id || '')
  const [colorEvento, setColorEvento] = useState(eventoAEditar?.color || calendarios.find(c => c.id === (eventoAEditar?.calendarioId || calendarios[0]?.id))?.color || '#1a73e8')
  
  // Nuevos estados para fecha inicio/fin y hora
  const [fechaInicio, setFechaInicio] = useState(eventoAEditar?.fechaInicio || eventoAEditar?.fecha || fechaSeleccionada || new Date().toISOString().split('T')[0])
  const [fechaFin, setFechaFin] = useState(eventoAEditar?.fechaFin || eventoAEditar?.fecha || fechaSeleccionada || new Date().toISOString().split('T')[0])
  const [hora, setHora] = useState(eventoAEditar?.hora || '12:00')
  const [todoElDia, setTodoElDia] = useState(eventoAEditar?.todoElDia ?? !eventoAEditar?.hora)
  const [mostrarHora, setMostrarHora] = useState(!!eventoAEditar?.hora)

  useEffect(() => {
    if (!eventoAEditar) {
      const cal = calendarios.find(c => c.id === calendarioId)
      if (cal) setColorEvento(cal.color)
    }
  }, [calendarioId, calendarios, eventoAEditar])

  const [invitados, setInvitados] = useState(eventoAEditar?.invitados || [])
  const [busquedaInvitado, setBusquedaInvitado] = useState('')
  const [sugerenciasUsuarios, setSugerenciasUsuarios] = useState([])
  const [buscandoUsuarios, setBuscandoUsuarios] = useState(false)

  const searchRef = useRef(null)
  const userSearchRef = useRef(null)

  useEffect(() => {
    const delayDebounceFn = setTimeout(async () => {
      if (ubicacion.length > 3 && !sugerencias.some(s => s.display_name === ubicacion) && ubicacion !== eventoAEditar?.ubicacion) {
        setBuscando(true)
        try {
          const res = await fetch(`http://localhost:5000/api/buscar-direccion?q=${encodeURIComponent(ubicacion)}`)
          const data = await res.json()
          setSugerencias(Array.isArray(data) ? data : [])
        } catch (error) {
          console.error('Error buscando direcciones:', error)
          setSugerencias([])
        } finally {
          setBuscando(false)
        }
      } else if (ubicacion.length <= 3) {
        setSugerencias([])
      }
    }, 500)
    return () => clearTimeout(delayDebounceFn)
  }, [ubicacion, eventoAEditar])

  useEffect(() => {
    if (busquedaInvitado.length < 2) {
      setSugerenciasUsuarios([])
      return
    }
    const buscarUsuarios = async () => {
      setBuscandoUsuarios(true)
      try {
        const q = query(
          collection(db, 'users'),
          where('email', '>=', busquedaInvitado),
          where('email', '<=', busquedaInvitado + '\uf8ff'),
          limit(5)
        )
        const querySnapshot = await getDocs(q)
        const users = []
        querySnapshot.forEach((doc) => {
          users.push({ id: doc.id, ...doc.data() })
        })
        setSugerenciasUsuarios(users.filter(u => !invitados.some(i => i.id === u.id)))
      } catch (error) {
        console.error('Error buscando usuarios:', error)
      } finally {
        setBuscandoUsuarios(false)
      }
    }
    const timer = setTimeout(buscarUsuarios, 300)
    return () => clearTimeout(timer)
  }, [busquedaInvitado, invitados])

  const seleccionarSugerencia = (sug) => {
    setUbicacion(sug.display_name)
    setSugerencias([])
  }

  const agregarInvitado = (usuario) => {
    setInvitados([...invitados, usuario])
    setBusquedaInvitado('')
    setSugerenciasUsuarios([])
  }

  const eliminarInvitado = (id) => {
    setInvitados(invitados.filter(i => i.id !== id))
  }

  const [guardando, setGuardando] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!titulo.trim()) {
      alert('Por favor, ingresa un título')
      return
    }
    
    // Asegurar que calendarioId no esté vacío
    const finalCalendarioId = calendarioId || calendarios[0]?.id
    if (!finalCalendarioId) {
      alert('Error: No hay calendarios disponibles')
      return
    }

    setGuardando(true)
    const datosEvento = {
      titulo,
      descripcion,
      precio,
      ubicacion,
      calendarioId: finalCalendarioId,
      color: colorEvento,
      fechaInicio,
      fechaFin,
      fecha: fechaInicio, // Retrocompatibilidad
      hora: todoElDia ? null : hora,
      todoElDia,
      invitados
    }

    try {
      console.log('Intentando guardar evento:', datosEvento)
      if (eventoAEditar) {
        await editarEvento(eventoAEditar.id, datosEvento, usuario?.email)
      } else {
        await agregarEvento(datosEvento, usuario?.email)
      }
      console.log('Evento guardado con éxito')
      onClose()
    } catch (error) {
      console.error('Error al guardar el evento:', error)
      alert('Hubo un error al guardar el evento. Revisa la consola.')
    } finally {
      setGuardando(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[2000] p-4 backdrop-blur-sm animate-fade-in" onClick={onClose}>
      <div 
        className="bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-xl shadow-[0_32px_64px_-16px_rgba(0,0,0,0.5)] w-full max-w-[520px] overflow-hidden flex flex-col transition-all animate-zoom-in"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-6 py-4 flex items-center justify-end border-b border-[var(--border-color)] bg-[var(--bg-secondary)]">
          <button type="button" onClick={onClose} className="p-2 hover:bg-[var(--hover-color)] rounded-md transition-all text-[var(--text-secondary)] hover:text-[var(--text-primary)]">
            <GoogleIcon name="close" size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto max-h-[85vh] custom-scrollbar">
          <div className="p-8 space-y-8">
            <div className="relative group">
              <input
                autoFocus
                type="text"
                placeholder="Título del evento"
                value={titulo}
                onChange={(e) => setTitulo(e.target.value)}
                className="w-full text-2xl font-bold tracking-tight border-none outline-none text-[var(--text-primary)] placeholder-[var(--text-secondary)] bg-transparent"
              />
              <div className="h-[2px] bg-[var(--border-color)] w-full mt-2 group-focus-within:bg-[var(--accent-color)] transition-all duration-300"></div>
            </div>

            <div className="space-y-6 pt-2">
              {/* Rango de Fechas y Lógica de Horas */}
              <div className="flex flex-col gap-4">
                <div className="flex items-center gap-5">
                  <div className="w-6 flex justify-center text-[var(--text-secondary)]"><Clock size={20} /></div>
                  <div className="flex-1 flex flex-wrap gap-3 items-center text-[var(--text-primary)]">
                    <input type="date" value={fechaInicio} onChange={(e) => setFechaInicio(e.target.value)} className="hover:bg-[var(--hover-color)] border border-[var(--border-color)] rounded-lg px-3 py-2 text-sm outline-none focus:border-[var(--accent-color)] transition-all cursor-pointer bg-[var(--bg-primary)]/50 font-medium" />
                    <span className="text-[var(--text-secondary)] font-black">→</span>
                    <input type="date" value={fechaFin} onChange={(e) => setFechaFin(e.target.value)} className="hover:bg-[var(--hover-color)] border border-[var(--border-color)] rounded-lg px-3 py-2 text-sm outline-none focus:border-[var(--accent-color)] transition-all cursor-pointer bg-[var(--bg-primary)]/50 font-medium" />
                  </div>
                </div>
                
                <div className="flex items-center gap-5 ml-11">
                  {!mostrarHora ? (
                    <button 
                      type="button" 
                      onClick={() => { setMostrarHora(true); setTodoElDia(false); }}
                      className="px-4 py-1.5 border border-[var(--border-color)] rounded-md text-xs font-bold text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-[var(--accent-color)] transition-all"
                    >
                      + Añadir hora
                    </button>
                  ) : (
                    <div className="flex items-center gap-4 animate-fade-in">
                      <input type="time" value={hora} onChange={(e) => setHora(e.target.value)} className="hover:bg-[var(--hover-color)] border border-[var(--border-color)] rounded-lg px-3 py-2 text-sm outline-none focus:border-[var(--accent-color)] transition-all cursor-pointer bg-[var(--bg-primary)]/50 font-medium" />
                      <label className="flex items-center gap-2 cursor-pointer group">
                        <input type="checkbox" checked={todoElDia} onChange={(e) => { setTodoElDia(e.target.checked); if(e.target.checked) setMostrarHora(false); }} className="w-4 h-4 rounded border-[var(--border-color)] accent-[var(--accent-color)]" />
                        <span className="text-xs font-bold text-[var(--text-secondary)] group-hover:text-[var(--text-primary)]">Todo el día</span>
                      </label>
                    </div>
                  )}
                </div>
              </div>

              {/* Selector de Calendario y Color Integrado - ÚNICO LUGAR */}
              <div className="flex items-center gap-5">
                <div className="w-6 flex justify-center text-[var(--text-secondary)]">
                  <Calendar size={20} />
                </div>
                <div className="flex-1 flex items-center gap-3">
                  <div className="relative flex-1">
                    <select 
                      value={calendarioId} 
                      onChange={(e) => setCalendarioId(e.target.value)}
                      className="w-full bg-[var(--bg-primary)]/50 border border-[var(--border-color)] rounded-lg px-4 py-2.5 text-sm font-bold text-[var(--text-primary)] appearance-none cursor-pointer hover:border-[var(--accent-color)] transition-all outline-none"
                    >
                      {calendarios.map(cal => (
                        <option key={cal.id} value={cal.id} className="bg-[var(--bg-secondary)]">{cal.nombre}</option>
                      ))}
                    </select>
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none opacity-40">
                      <GoogleIcon name="back" size={14} className="-rotate-90" />
                    </div>
                  </div>
                  
                  <div className="relative">
                    <div 
                      className="w-10 h-10 rounded-full border-2 border-[var(--border-color)] cursor-pointer transition-transform hover:scale-110 shadow-lg relative overflow-hidden"
                      style={{ backgroundColor: colorEvento }}
                    >
                      <input 
                        type="color" 
                        value={colorEvento} 
                        onChange={(e) => setColorEvento(e.target.value)}
                        className="absolute inset-0 opacity-0 cursor-pointer scale-[5]"
                        title="Personalizar color del evento"
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex items-start gap-5 relative">
                <div className="w-6 flex justify-center pt-2 text-[var(--text-secondary)]"><Users size={20} /></div>
                <div className="flex-1 space-y-3 relative" ref={userSearchRef}>
                  <input type="text" placeholder="Invitar personas (email)" value={busquedaInvitado} onChange={(e) => setBusquedaInvitado(e.target.value)} className="linear-input w-full" />
                  {(buscandoUsuarios || sugerenciasUsuarios.length > 0) && (
                    <div className="absolute top-full left-0 right-0 bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-xl shadow-2xl z-[2100] mt-2 max-h-56 overflow-y-auto animate-zoom-in">
                      {buscandoUsuarios && <div className="p-4 text-xs text-[var(--accent-color)] animate-pulse font-medium">Buscando usuarios...</div>}
                      {sugerenciasUsuarios.map((user) => (
                        <div key={user.id} onClick={() => agregarInvitado(user)} className="px-5 py-3 flex items-center gap-4 hover:bg-[var(--hover-color)] cursor-pointer border-b border-[var(--border-color)] last:border-none group">
                          <div className="w-9 h-9 rounded-full bg-[var(--accent-color)]/10 flex items-center justify-center text-[var(--accent-color)] text-xs font-bold">{user.email?.[0].toUpperCase()}</div>
                          <div className="flex flex-col overflow-hidden"><span className="text-sm font-semibold text-[var(--text-primary)] truncate">{user.name || 'Usuario'}</span><span className="text-[11px] text-[var(--text-secondary)] truncate">{user.email}</span></div>
                          <Check size={14} className="ml-auto text-[var(--accent-color)] opacity-0 group-hover:opacity-100 transition-opacity" />
                        </div>
                      ))}
                    </div>
                  )}
                  {invitados.length > 0 && (
                    <div className="flex flex-wrap gap-2 pt-1">
                      {invitados.map(inv => (
                        <div key={inv.id} className="flex items-center gap-2 bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-full pl-3 pr-1.5 py-1 group hover:border-[var(--accent-color)] transition-all">
                          <span className="text-xs font-medium text-[var(--text-primary)]">{inv.email}</span>
                          <button type="button" onClick={() => eliminarInvitado(inv.id)} className="p-1 hover:bg-[var(--hover-color)] rounded-full text-[var(--text-secondary)] hover:text-red-400 transition-colors"><GoogleIcon name="close" size={12} /></button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div className="flex items-start gap-5 relative">
                <div className="w-6 flex justify-center pt-2 text-[var(--text-secondary)]"><MapPin size={20} /></div>
                <div className="flex-1 relative" ref={searchRef}>
                  <input type="text" placeholder="Añadir ubicación" value={ubicacion} onChange={(e) => setUbicacion(e.target.value)} className="linear-input w-full" />
                  {buscando && <div className="absolute right-3 top-3 w-4 h-4 border-2 border-[var(--accent-color)] border-t-transparent rounded-full animate-spin"></div>}
                  {sugerencias.length > 0 && (
                    <div className="absolute top-full left-0 right-0 bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-xl shadow-2xl z-50 mt-2 max-h-56 overflow-y-auto animate-zoom-in">
                      {sugerencias.map((sug, i) => (
                        <div key={i} onClick={() => seleccionarSugerencia(sug)} className="px-5 py-3 text-xs text-[var(--text-primary)] hover:bg-[var(--hover-color)] cursor-pointer border-b border-[var(--border-color)] last:border-none transition-colors">{sug.display_name}</div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div className="flex items-start gap-5">
                <div className="w-6 flex justify-center pt-2 text-[var(--text-secondary)]"><AlignLeft size={20} /></div>
                <div className="flex-1">
                  <textarea placeholder="Notas adicionales..." value={descripcion} onChange={(e) => setDescripcion(e.target.value)} className="linear-input w-full min-h-[100px] resize-none" />
                </div>
              </div>

              {isAdmin && (
                <div className="pt-4 border-t border-[var(--border-color)] space-y-6">
                  <div className="flex items-start gap-5">
                    <div className="w-6 flex justify-center pt-2 text-green-500/80"><Banknote size={20} /></div>
                    <div className="flex-1">
                      <input type="text" placeholder="Información de presupuesto" value={precio} onChange={(e) => setPrecio(e.target.value)} className="linear-input w-full font-semibold" />
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="p-6 flex items-center justify-end gap-4 bg-[var(--bg-secondary)] sticky bottom-0 border-t border-[var(--border-color)]">
            <button type="button" onClick={onClose} className="px-6 py-2 text-sm font-semibold text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors">Cerrar</button>
            <button 
              type="submit" 
              disabled={guardando}
              className={`px-8 py-2 bg-[var(--accent-color)] text-white text-sm font-bold rounded-lg hover:bg-[var(--accent-hover)] shadow-lg hover:shadow-[0_8px_20px_rgba(94,106,210,0.4)] transform active:scale-95 transition-all ${guardando ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              {guardando ? 'Guardando...' : 'Guardar Cambios'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default ModalEvento
