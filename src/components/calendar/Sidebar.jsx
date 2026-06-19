import { useState, useEffect } from 'react'
import { useCalendario } from '../../context/CalendarioContext'
import { useModoOscuro } from '../../context/ModoOscuroContext'
import { Plus, ChevronLeft, ChevronRight, MoreVertical } from 'lucide-react'
import GoogleIcon from '../common/GoogleIcon'

const DIAS_MINI = ['D', 'L', 'M', 'X', 'J', 'V', 'S']
const MESES = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre']

function Sidebar({ mesActual, anioActual, onDiaClick, onCrearEvento, onMesAnterior, onMesSiguiente }) {
  const hoy = new Date()
  const { 
    calendarios, 
    toggleCalendarioVisible, 
    agregarCalendario, 
    verSoloEsteCalendario, 
    cambiarColorCalendario, 
    eliminarCalendario 
  } = useCalendario()
  const { esOscuro } = useModoOscuro()
  
  const [mostrarForm, setMostrarForm] = useState(false)
  const [nuevoNombre, setNuevoNombre] = useState('')
  const [nuevoColor, setNuevoColor] = useState('#1a73e8')
  
  const [menuAbiertoId, setMenuAbiertoId] = useState(null)
  const [menuPos, setMenuPos] = useState({ top: 0, left: 0 })

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuAbiertoId && !event.target.closest('.dots-menu-container') && !event.target.closest('.fixed-menu')) {
        setMenuAbiertoId(null)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [menuAbiertoId])

  const generarDiasMini = () => {
    const primerDia = new Date(anioActual, mesActual, 1).getDay()
    const diasEnMes = new Date(anioActual, mesActual + 1, 0).getDate()
    const dias = []
    for (let i = 0; i < primerDia; i++) dias.push(null)
    for (let i = 1; i <= diasEnMes; i++) dias.push(i)
    return dias
  }

  const handleCrearCalendario = (e) => {
    e.preventDefault()
    if (!nuevoNombre.trim()) return
    agregarCalendario({ nombre: nuevoNombre, color: nuevoColor })
    setNuevoNombre('')
    setMostrarForm(false)
  }

  const handleAbrirMenu = (e, id) => {
    e.stopPropagation()
    const rect = e.currentTarget.getBoundingClientRect()
    setMenuPos({ top: rect.bottom, left: rect.left })
    setMenuAbiertoId(menuAbiertoId === id ? null : id)
  }

  const dias = generarDiasMini()

  return (
    <div className="w-80 flex-shrink-0 border-r border-[var(--border-color)] flex flex-col pt-10 pb-10 overflow-y-auto bg-[var(--bg-primary)] text-[var(--text-primary)] transition-colors duration-200 custom-scrollbar relative">

      {/* Botón Crear Evento - Rectángulo Redondeado Estilo Linear */}
      <div className="flex justify-center mb-10 px-8">
        <button
          onClick={onCrearEvento}
          className="flex items-center justify-center gap-3 px-10 py-5 rounded-2xl bg-[var(--accent-color)] text-white text-base font-black hover:bg-[var(--accent-hover)] shadow-[0_8px_30px_rgba(94,106,210,0.3)] hover:shadow-[0_8px_40px_rgba(94,106,210,0.5)] transition-all active:scale-90 animate-fade-in group"
        >
          <GoogleIcon name="add" size={24} className="group-hover:rotate-90 transition-transform duration-300" />
          <span>Crear</span>
        </button>
      </div>

      {/* Mini calendario - Proporciones Linear */}
      <div className="mb-10 px-8">
        <div className="flex items-center justify-between mb-6">
          <span className="text-lg font-bold tracking-tight">
            {MESES[mesActual]} {anioActual}
          </span>
          <div className="flex gap-3 text-[var(--text-secondary)]">
            <button onClick={onMesAnterior} className="p-2 hover:bg-[var(--hover-color)] rounded-lg transition-colors"><GoogleIcon name="back" size={20} /></button>
            <button onClick={onMesSiguiente} className="p-2 hover:bg-[var(--hover-color)] rounded-lg transition-colors"><GoogleIcon name="back" size={20} className="rotate-180" /></button>
          </div>
        </div>

        <div className="grid grid-cols-7 mb-4 text-[var(--text-secondary)]">
          {DIAS_MINI.map(dia => (
            <div key={dia} className="text-center text-xs font-black py-1 uppercase opacity-40 tracking-widest">{dia}</div>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-1.5">
          {dias.map((dia, index) => {
            const esHoy = dia === hoy.getDate() && mesActual === hoy.getMonth() && anioActual === hoy.getFullYear()
            return (
              <div
                key={index}
                onClick={() => dia && onDiaClick(dia)}
                className={`aspect-square flex items-center justify-center text-[15px] font-medium rounded-full cursor-pointer transition-all
                  ${!dia ? 'cursor-default' : 'hover:bg-[var(--hover-color)]'}
                  ${esHoy ? 'bg-[var(--accent-color)] text-white font-bold shadow-md scale-105' : dia ? 'text-[var(--text-primary)]' : 'text-transparent'}`}
              >
                {dia || ''}
              </div>
            )
          })}
        </div>
      </div>

      {/* Sección Mis Calendarios */}
      <div className="flex flex-col gap-5 px-8">
        <div className="flex items-center justify-between mb-1">
          <span className="text-[12px] font-black text-[var(--text-secondary)] uppercase tracking-[0.2em] opacity-50">Mis calendarios</span>
          <button 
            onClick={() => setMostrarForm(!mostrarForm)}
            className="text-[var(--text-secondary)] hover:text-[var(--accent-color)] transition-all hover:scale-110"
          >
            <GoogleIcon name="add" size={18} />
          </button>
        </div>

        {mostrarForm && (
          <form onSubmit={handleCrearCalendario} className="flex flex-col gap-4 p-5 border border-[var(--border-color)] rounded-2xl bg-[var(--bg-secondary)] animate-slide-down shadow-xl">
            <input 
              type="text" 
              placeholder="Nombre" 
              value={nuevoNombre}
              onChange={(e) => setNuevoNombre(e.target.value)}
              className="linear-input text-base"
            />
            <div className="flex items-center justify-between px-1">
              <span className="text-sm font-medium text-[var(--text-secondary)]">Elegir color</span>
              <input 
                type="color" 
                value={nuevoColor}
                onChange={(e) => setNuevoColor(e.target.value)}
                className="w-10 h-8 rounded cursor-pointer border-none bg-transparent"
              />
            </div>
            <div className="flex gap-3 justify-end mt-2">
              <button type="button" onClick={() => setMostrarForm(false)} className="text-sm font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)]">Cancelar</button>
              <button type="submit" className="px-6 py-2 bg-[var(--accent-color)] text-white rounded-lg text-sm font-bold hover:bg-[var(--accent-hover)] transition-all">Crear Capa</button>
            </div>
          </form>
        )}
        <div className="flex flex-col gap-1.5">
          {calendarios.map(cal => (
            <div 
              key={cal.id} 
              className="flex items-center gap-4 px-4 py-3 rounded-xl cursor-pointer group hover:bg-[var(--hover-color)] transition-all relative border border-transparent hover:border-[var(--border-color)]"
              onClick={() => toggleCalendarioVisible(cal.id)}
            >
              <div 
                className={`w-3.5 h-3.5 rounded-sm border-2 transition-all ${cal.visible ? 'shadow-[0_0_10px_currentcolor]' : 'opacity-20'}`}
                style={{ backgroundColor: cal.visible ? cal.color : 'transparent', borderColor: cal.color, color: cal.color }}
              />
              <span className={`text-[15px] font-semibold transition-colors truncate flex-1 ${cal.visible ? 'text-[var(--text-primary)]' : 'text-[var(--text-secondary)]'}`}>
                {cal.nombre}
              </span>

              <button
                onClick={(e) => handleAbrirMenu(e, cal.id)}
                className={`p-1.5 rounded-md text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-primary)] opacity-0 group-hover:opacity-100 ${menuAbiertoId === cal.id ? 'opacity-100 shadow-sm' : ''}`}
              >
                <MoreVertical size={16} />
              </button>

              {/* Menú de opciones - FIXED para evitar corte */}
              {menuAbiertoId === cal.id && (
                <div 
                  className="fixed-menu fixed bg-[var(--bg-primary)] shadow-2xl rounded-2xl z-[9999] w-64 py-4 border border-[var(--border-color)] animate-in fade-in zoom-in duration-150 shadow-[0_20px_60px_rgba(0,0,0,0.3)]"
                  style={{ 
                    top: `${menuPos.top}px`, 
                    left: `${menuPos.left}px`,
                    transform: 'translateY(12px)'
                  }}
                  onClick={(e) => e.stopPropagation()}
                >
                  <button
                    onClick={(e) => { e.stopPropagation(); verSoloEsteCalendario(cal.id); setMenuAbiertoId(null); }}
                    className="w-full text-left px-6 py-3 text-sm font-bold text-[var(--text-primary)] hover:bg-[var(--hover-color)] transition-colors"
                  >
                    Ver solo este
                  </button>
                  
                  <div className="px-6 py-5 flex flex-wrap gap-4 border-t border-b border-[var(--border-color)] my-2">
                    {['#1a73e8', '#d50000', '#33b679', '#f4511e', '#8e24aa', '#f6bf26'].map(color => (
                      <div
                        key={color}
                        onClick={(e) => { e.stopPropagation(); cambiarColorCalendario(cal.id, color); }}
                        className={`w-7 h-7 rounded-full cursor-pointer transition-transform hover:scale-125 shadow-md ${cal.color === color ? 'ring-4 ring-blue-500/30 ring-offset-2 dark:ring-offset-[#1e1e1e]' : 'border border-gray-200 dark:border-gray-700'}`}
                        style={{ backgroundColor: color }}
                      />
                    ))}
                  </div>

                  <button
                    onClick={(e) => { e.stopPropagation(); eliminarCalendario(cal.id); setMenuAbiertoId(null); }}
                    className="w-full text-left px-6 py-3 text-sm font-black text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                  >
                    Eliminar calendario
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

    </div>
  )
}

export default Sidebar
