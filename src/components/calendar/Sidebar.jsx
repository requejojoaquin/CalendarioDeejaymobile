import { useState, useEffect } from 'react'
import { useCalendario } from '../../context/CalendarioContext'
import { useModoOscuro } from '../../context/ModoOscuroContext'
import { Plus, ChevronLeft, ChevronRight, MoreVertical } from 'lucide-react'

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
    <div className="w-64 flex-shrink-0 border-r border-[var(--border-color)] flex flex-col pt-12 pb-6 overflow-y-auto bg-[var(--bg-primary)] text-[var(--text-primary)] transition-colors duration-200 custom-scrollbar relative">

      {/* Botón Crear Evento - CENTRADO Y MUY GRANDE */}
      <div className="flex justify-center mb-8 px-4">
        <button
          onClick={onCrearEvento}
          className="flex items-center gap-5 px-10 py-5 rounded-full border border-[var(--border-color)] bg-[var(--bg-primary)] shadow-lg hover:shadow-xl dark:hover:bg-gray-700 cursor-pointer text-lg font-bold transition-all w-fit"
        >
          <Plus size={32} className="text-blue-500" />
          <span>Crear</span>
        </button>
      </div>

      {/* Mini calendario - CON PADDING IZQUIERDO */}
      <div className="mb-6 px-6">
        <div className="flex items-center justify-between mb-4">
          <span className="text-sm font-bold">
            {MESES[mesActual]} {anioActual}
          </span>
          <div className="flex gap-1 text-[var(--text-secondary)]">
            <button onClick={onMesAnterior} className="p-1 hover:bg-[var(--hover-color)] rounded-full transition-colors"><ChevronLeft size={20} /></button>
            <button onClick={onMesSiguiente} className="p-1 hover:bg-[var(--hover-color)] rounded-full transition-colors"><ChevronRight size={20} /></button>
          </div>
        </div>

        <div className="grid grid-cols-7 mb-2 text-[var(--text-secondary)]">
          {DIAS_MINI.map(dia => (
            <div key={dia} className="text-center text-[10px] font-bold py-1 uppercase">{dia}</div>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-y-1">
          {dias.map((dia, index) => {
            const esHoy = dia === hoy.getDate() && mesActual === hoy.getMonth() && anioActual === hoy.getFullYear()
            return (
              <div
                key={index}
                onClick={() => dia && onDiaClick(dia)}
                className={`w-7 h-7 leading-7 text-center rounded-full text-[11px] cursor-pointer transition-colors flex items-center justify-center
                  ${!dia ? 'cursor-default' : 'hover:bg-[var(--hover-color)]'}
                  ${esHoy ? 'bg-blue-600 !text-white font-bold' : dia ? 'text-[var(--text-primary)]' : 'text-transparent'}`}
              >
                {dia || ''}
              </div>
            )
          })}
        </div>
      </div>

      {/* Sección Mis Calendarios - CON PADDING IZQUIERDO */}
      <div className="flex flex-col gap-3 px-4 mt-2">
        <div className="flex items-center justify-between px-2 mb-1">
          <span className="text-xs font-bold text-[var(--text-secondary)] uppercase tracking-widest ml-2">Mis calendarios</span>
          <button 
            onClick={() => setMostrarForm(!mostrarForm)}
            className="text-[var(--text-secondary)] hover:bg-[var(--hover-color)] p-1.5 rounded-full transition-colors"
          >
            <Plus size={20} />
          </button>
        </div>

        {mostrarForm && (
          <form onSubmit={handleCrearCalendario} className="mx-2 flex flex-col gap-4 p-4 border border-[var(--border-color)] rounded-xl bg-[var(--bg-secondary)] animate-in fade-in slide-in-from-top-2 duration-200 shadow-sm">
            <input 
              type="text" 
              placeholder="Nombre" 
              value={nuevoNombre}
              onChange={(e) => setNuevoNombre(e.target.value)}
              className="px-3 py-2.5 text-sm border border-[var(--border-color)] rounded-lg bg-[var(--bg-primary)] text-[var(--text-primary)] outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
            />
            <div className="flex items-center gap-3 px-1">
              <input 
                type="color" 
                value={nuevoColor}
                onChange={(e) => setNuevoColor(e.target.value)}
                className="w-10 h-10 border-none bg-transparent cursor-pointer rounded-lg overflow-hidden scale-110"
              />
              <span className="text-xs font-bold text-[var(--text-secondary)]">Elegir color</span>
            </div>
            <div className="flex gap-2 justify-end mt-1">
              <button type="button" onClick={() => setMostrarForm(false)} className="px-4 py-2 text-xs font-bold text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors">Cancelar</button>
              <button type="submit" className="px-6 py-2 text-xs bg-blue-600 text-white rounded-lg font-bold hover:bg-blue-700 shadow-sm transition-all">Guardar</button>
            </div>
          </form>
        )}

        <div className="flex flex-col gap-1 mt-1">
          {calendarios.map(cal => (
            <div 
              key={cal.id} 
              className="dots-menu-container flex items-center gap-4 px-4 py-2.5 rounded-xl cursor-pointer group hover:bg-[var(--hover-color)] transition-colors relative"
            >
              <input 
                type="checkbox" 
                checked={cal.visible} 
                onChange={() => toggleCalendarioVisible(cal.id)}
                className="w-4.5 h-4.5 rounded-md border-[var(--border-color)] cursor-pointer transition-colors"
                style={{ accentColor: cal.color }}
              />
              <span className="text-sm font-semibold text-[var(--text-primary)] flex-1 truncate">{cal.nombre}</span>
              
              <button
                onClick={(e) => handleAbrirMenu(e, cal.id)}
                className={`p-2 rounded-full text-[var(--text-secondary)] hover:bg-gray-200 dark:hover:bg-gray-700 transition-all opacity-0 group-hover:opacity-100 ${menuAbiertoId === cal.id ? 'opacity-100 bg-gray-200 dark:bg-gray-700' : ''}`}
              >
                <MoreVertical size={18} />
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
