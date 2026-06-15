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
  Check
} from 'lucide-react'

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
  const [hora, setHora] = useState(eventoAEditar?.hora || '12:00')

  useEffect(() => {
    if (!eventoAEditar) {
      const cal = calendarios.find(c => c.id === calendarioId)
      if (cal) setColorEvento(cal.color)
    }
  }, [calendarioId, calendarios, eventoAEditar])
  
  const obtenerFechaLocal = () => {
    const d = new Date()
    const offset = d.getTimezoneOffset()
    const localDate = new Date(d.getTime() - (offset * 60 * 1000))
    return localDate.toISOString().split('T')[0]
  }

  const [fecha, setFecha] = useState(eventoAEditar?.fecha || fechaSeleccionada || obtenerFechaLocal())
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
          setSugerencias(data)
        } catch (error) {
          console.error('Error buscando direcciones:', error)
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

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!titulo.trim()) return
    const datosEvento = {
      titulo,
      descripcion,
      precio,
      ubicacion,
      calendarioId,
      color: colorEvento,
      fecha,
      hora,
      invitados
    }
    if (eventoAEditar) {
      editarEvento(eventoAEditar.id, datosEvento, usuario?.email)
    } else {
      agregarEvento(datosEvento, usuario?.email)
    }
    onClose()
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-[2000] p-4 backdrop-blur-[1px]" onClick={onClose}>
      <div 
        className="bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-2xl shadow-2xl w-full max-w-[448px] overflow-hidden flex flex-col transition-all duration-300"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="bg-[var(--bg-secondary)] px-4 py-1.5 flex items-center justify-between border-b border-[var(--border-color)]">
          <button type="button" className="p-2 hover:bg-[var(--hover-color)] rounded-full transition-colors text-[var(--text-secondary)]">
            <Menu size={18} />
          </button>
          <button type="button" onClick={onClose} className="p-2 hover:bg-[var(--hover-color)] rounded-full transition-colors text-[var(--text-secondary)]">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto max-h-[80vh] custom-scrollbar">
          <div className="p-6 space-y-6">
            <div className="ml-10 relative group">
              <input
                autoFocus
                type="text"
                placeholder="Añade un título"
                value={titulo}
                onChange={(e) => setTitulo(e.target.value)}
                className="w-full text-2xl font-normal border-none outline-none text-[var(--text-primary)] placeholder-[var(--text-secondary)] bg-transparent"
              />
              <div className="absolute bottom-0 left-0 h-[2px] bg-blue-600 transition-all duration-300 w-0 group-focus-within:w-full"></div>
              <div className="absolute bottom-0 left-0 h-[1px] bg-[var(--border-color)] w-full -z-10"></div>
            </div>

            <div className="space-y-4 pt-4">
              <div className="flex items-center gap-4">
                <div className="w-6 flex justify-center text-[var(--text-secondary)]"><Clock size={20} /></div>
                <div className="flex-1 flex gap-2 items-center text-[var(--text-primary)]">
                  <input type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} className="hover:bg-[var(--hover-color)] border-none rounded px-2 py-1 text-sm outline-none focus:bg-[var(--hover-color)] transition-all cursor-pointer bg-transparent" />
                  <span className="text-[var(--text-secondary)]">⋅</span>
                  <input type="time" value={hora} onChange={(e) => setHora(e.target.value)} className="hover:bg-[var(--hover-color)] border-none rounded px-2 py-1 text-sm outline-none focus:bg-[var(--hover-color)] transition-all cursor-pointer bg-transparent" />
                </div>
              </div>

              <div className="flex items-start gap-4 relative">
                <div className="w-6 flex justify-center pt-1.5 text-[var(--text-secondary)]"><Users size={20} /></div>
                <div className="flex-1 space-y-2 relative" ref={userSearchRef}>
                  <input type="text" placeholder="Añadir invitados (email)" value={busquedaInvitado} onChange={(e) => setBusquedaInvitado(e.target.value)} className="w-full text-sm text-[var(--text-primary)] border-none outline-none py-1.5 placeholder-[var(--text-secondary)] hover:bg-[var(--hover-color)] focus:bg-[var(--hover-color)] rounded px-2 transition-colors bg-transparent" />
                  {(buscandoUsuarios || sugerenciasUsuarios.length > 0) && (
                    <div className="absolute top-full left-0 right-0 bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-lg shadow-xl z-[2100] mt-1 max-h-48 overflow-y-auto">
                      {buscandoUsuarios && <div className="p-3 text-xs text-blue-600 animate-pulse">Buscando usuarios...</div>}
                      {sugerenciasUsuarios.map((user) => (
                        <div key={user.id} onClick={() => agregarInvitado(user)} className="px-4 py-2 flex items-center gap-3 hover:bg-[var(--hover-color)] cursor-pointer border-b border-[var(--border-color)] last:border-none group">
                          <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/40 flex items-center justify-center text-blue-600 dark:text-blue-400 text-xs font-bold">{user.email?.[0].toUpperCase()}</div>
                          <div className="flex flex-col overflow-hidden"><span className="text-sm font-medium text-[var(--text-primary)] truncate">{user.name || 'Usuario'}</span><span className="text-[11px] text-[var(--text-secondary)] truncate">{user.email}</span></div>
                          <Check size={14} className="ml-auto text-blue-600 opacity-0 group-hover:opacity-100 transition-opacity" />
                        </div>
                      ))}
                    </div>
                  )}
                  {invitados.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {invitados.map(inv => (
                        <div key={inv.id} className="flex items-center gap-1.5 bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-full pl-2 pr-1 py-0.5 group hover:border-[var(--text-secondary)] transition-all">
                          <span className="text-xs text-[var(--text-primary)]">{inv.email}</span>
                          <button type="button" onClick={() => eliminarInvitado(inv.id)} className="p-0.5 hover:bg-[var(--hover-color)] rounded-full text-[var(--text-secondary)] hover:text-red-500 transition-colors"><X size={12} /></button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div className="flex items-start gap-4 relative">
                <div className="w-6 flex justify-center pt-1.5 text-[var(--text-secondary)]"><MapPin size={20} /></div>
                <div className="flex-1 relative" ref={searchRef}>
                  <input type="text" placeholder="Añadir ubicación" value={ubicacion} onChange={(e) => setUbicacion(e.target.value)} className="w-full text-sm text-[var(--text-primary)] border-none outline-none py-1.5 placeholder-[var(--text-secondary)] hover:bg-[var(--hover-color)] focus:bg-[var(--hover-color)] rounded px-2 transition-colors bg-transparent" />
                  {buscando && <div className="absolute right-2 top-2 text-[10px] text-blue-600 animate-pulse">Buscando...</div>}
                  {sugerencias.length > 0 && (
                    <div className="absolute top-full left-0 right-0 bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-lg shadow-xl z-50 mt-1 max-h-48 overflow-y-auto">
                      {sugerencias.map((sug, i) => (
                        <div key={i} onClick={() => seleccionarSugerencia(sug)} className="px-4 py-2 text-xs text-[var(--text-primary)] hover:bg-[var(--hover-color)] cursor-pointer border-b border-[var(--border-color)] last:border-none transition-colors">{sug.display_name}</div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="w-6 flex justify-center pt-1.5 text-[var(--text-secondary)]"><AlignLeft size={20} /></div>
                <div className="flex-1">
                  <textarea placeholder="Añade una descripción" value={descripcion} onChange={(e) => setDescripcion(e.target.value)} className="w-full text-sm text-[var(--text-primary)] border-none outline-none py-1.5 placeholder-[var(--text-secondary)] hover:bg-[var(--hover-color)] focus:bg-[var(--hover-color)] rounded px-2 transition-colors min-h-[40px] resize-none bg-transparent" />
                </div>
              </div>

              <div className="flex items-center gap-4">
                <div className="w-6 flex justify-center text-[var(--text-secondary)]">
                  <div 
                    className="w-3.5 h-3.5 rounded-full border border-[var(--border-color)]" 
                    style={{ backgroundColor: colorEvento }} 
                  />
                </div>
                <div className="flex-1 flex items-center gap-3">
                  <span className="text-sm text-[var(--text-secondary)]">Color del evento:</span>
                  <input 
                    type="color" 
                    value={colorEvento} 
                    onChange={(e) => setColorEvento(e.target.value)}
                    className="w-8 h-8 rounded cursor-pointer bg-transparent border-none p-0"
                  />
                </div>
              </div>

              <div className="flex items-center gap-4">
                <div className="w-6 flex justify-center text-[var(--text-secondary)]"><div className="w-3.5 h-3.5 rounded" style={{ backgroundColor: calendarios.find(c => c.id === calendarioId)?.color || '#1a73e8' }} /></div>
                <div className="flex-1">
                  <select value={calendarioId} onChange={(e) => setCalendarioId(e.target.value)} className="w-full text-sm text-[var(--text-primary)] border-none outline-none py-1 bg-transparent cursor-pointer hover:bg-[var(--hover-color)] rounded px-2 transition-colors appearance-none outline-none">
                    {calendarios.map(cal => (<option key={cal.id} value={cal.id} className="bg-[var(--bg-primary)]">{cal.nombre}</option>))}
                  </select>
                </div>
              </div>

              {isAdmin && (
                <div className="pt-2 border-t border-[var(--border-color)]">
                  <div className="flex items-start gap-4">
                    <div className="w-6 flex justify-center pt-1.5 text-green-600"><Banknote size={20} /></div>
                    <div className="flex-1">
                      <input type="text" placeholder="Precios detalles" value={precio} onChange={(e) => setPrecio(e.target.value)} className="w-full text-sm text-[var(--text-primary)] border-none outline-none py-1.5 placeholder-[var(--text-secondary)] hover:bg-[var(--hover-color)] focus:bg-[var(--hover-color)] rounded px-2 transition-colors font-medium bg-transparent" />
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="p-4 flex items-center justify-end gap-2 bg-[var(--bg-primary)] sticky bottom-0 border-t border-[var(--border-color)]">
            <button type="button" className="px-4 py-2 text-sm font-medium text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded transition-colors">Más opciones</button>
            <button type="submit" className="px-6 py-2 bg-blue-600 text-white text-sm font-medium rounded-full hover:bg-blue-700 shadow-md hover:shadow-lg transition-all duration-200">Guardar</button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default ModalEvento
