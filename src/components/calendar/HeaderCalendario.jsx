import { useState, useRef, useEffect } from 'react'
import { useCalendario } from '../../context/CalendarioContext'
import { useModoOscuro } from '../../context/ModoOscuroContext'
import { Settings, Search, Trash2, Palette, X, ChevronLeft, ChevronRight, Menu } from 'lucide-react'
import ModalAspecto from '../modals/ModalAspecto'
import GoogleIcon from '../common/GoogleIcon'

const MESES = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre']

function HeaderCalendario({ mesActual, anioActual, onHoy, onAnterior, onSiguiente, onToggleSidebar, vistaActual, onCambiarVista, onEventoClick }) {
  const { eventos, calendarios } = useCalendario()
  const { esOscuro } = useModoOscuro()
  const [searchTerm, setSearchTerm] = useState('')
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [showResultsList, setShowResultsList] = useState(false)
  const [filteredEventos, setFilteredEventos] = useState([])
  
  const [showSettingsMenu, setShowSettingsMenu] = useState(false)
  const [showAspectoModal, setShowAspectoModal] = useState(false)
  
  const searchRef = useRef(null)
  const settingsRef = useRef(null)

  useEffect(() => {
    if (searchTerm.trim() === '') {
      setFilteredEventos([])
      return
    }
    const filtered = eventos.filter(ev => 
      ev.titulo.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (ev.descripcion && ev.descripcion.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (ev.ubicacion && ev.ubicacion.toLowerCase().includes(searchTerm.toLowerCase()))
    )
    setFilteredEventos(filtered)
  }, [searchTerm, eventos])

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (searchRef.current && !searchRef.current.contains(event.target)) {
        setShowSuggestions(false)
      }
      if (settingsRef.current && !settingsRef.current.contains(event.target)) {
        setShowSettingsMenu(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      setShowResultsList(true)
      setShowSuggestions(false)
    }
  }

  const handleSelectEvento = (evento) => {
    onEventoClick(evento)
    setShowSuggestions(false)
    setShowResultsList(false)
    setSearchTerm('')
  }

  return (
    <div 
      className="flex items-center px-8 border-b border-[var(--border-color)] gap-8 h-20 flex-shrink-0 relative bg-[var(--bg-primary)] text-[var(--text-primary)] transition-colors duration-200"
    >

      <button
        onClick={onToggleSidebar}
        className="p-2.5 hover:bg-[var(--hover-color)] rounded-lg cursor-pointer transition-all text-[var(--text-primary)] active:scale-95"
      >
        <GoogleIcon name="menu" size={20} />
      </button>

      <div className="flex items-center gap-5">
        <span className="text-xl font-black tracking-tight uppercase">
          Calendario
        </span>
        
        <button
          onClick={onHoy}
          className="flex items-center gap-2 px-6 py-2 border-2 border-[var(--border-color)] rounded-xl cursor-pointer text-sm font-bold bg-[var(--bg-primary)] hover:border-[var(--text-primary)] transition-all active:scale-95"
        >
          <GoogleIcon name="home" size={18} />
          Hoy
        </button>

        <div className="flex items-center gap-2">
          <button onClick={onAnterior} className="p-2 hover:bg-[var(--hover-color)] rounded-lg transition-colors"><GoogleIcon name="back" size={22} /></button>
          <button onClick={onSiguiente} className="p-2 hover:bg-[var(--hover-color)] rounded-lg transition-colors"><GoogleIcon name="back" size={22} className="rotate-180" /></button>
        </div>
      </div>

      <span className="text-xl font-bold tracking-tight min-w-[200px]">
        {MESES[mesActual]} {anioActual}
      </span>

      <div className="flex-1" />

      {/* Buscador Estilo Linear - REUBICADO ANTES DEL SELECTOR */}
      <div ref={searchRef} className="relative group mx-2">
        <div className="flex items-center bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-xl px-4 h-11 w-[200px] transition-all group-focus-within:w-[320px] group-focus-within:border-[var(--accent-color)] group-focus-within:shadow-[0_0_20px_rgba(94,106,210,0.15)] group-focus-within:bg-[var(--bg-primary)]">
          <GoogleIcon name="search" size={16} className="text-[var(--text-secondary)] mr-3 flex-shrink-0" />
          <input
            type="text"
            placeholder="Buscar..."
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value)
              setShowSuggestions(true)
            }}
            onFocus={() => setShowSuggestions(true)}
            onKeyDown={handleKeyDown}
            className="bg-transparent border-none outline-none w-full text-sm font-medium text-[var(--text-primary)] placeholder-[var(--text-secondary)]"
          />
        </div>

        {showSuggestions && searchTerm && filteredEventos.length > 0 && (
          <div className="absolute top-14 left-0 right-0 bg-[var(--bg-secondary)] shadow-[0_20px_50px_rgba(0,0,0,0.3)] rounded-2xl z-[1200] max-h-[400px] overflow-y-auto border border-[var(--border-color)] animate-zoom-in backdrop-blur-xl">
            {filteredEventos.slice(0, 5).map(evento => {
              const cal = calendarios.find(c => c.id === evento.calendarioId)
              return (
                <div
                  key={evento.id}
                  onClick={() => handleSelectEvento(evento)}
                  className="px-6 py-4 cursor-pointer flex items-center gap-4 border-b border-[var(--border-color)] last:border-none hover:bg-[var(--hover-color)] transition-colors"
                >
                  <div className="w-3 h-3 rounded-full flex-shrink-0 shadow-[0_0_8px_currentcolor]" style={{ backgroundColor: cal?.color || '#1a73e8', color: cal?.color }} />
                  <div className="flex flex-col min-w-0">
                    <span className="text-sm font-bold truncate">{evento.titulo}</span>
                    <span className="text-[10px] text-[var(--text-secondary)] font-semibold uppercase tracking-wider">{evento.fecha}</span>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      <div className="flex items-center gap-3">
        {/* Selector de vista - REUBICADO AL FINAL */}
        <select
          value={vistaActual}
          onChange={(e) => onCambiarVista(e.target.value)}
          className="px-6 py-2 border-2 border-[var(--border-color)] rounded-xl text-sm font-bold cursor-pointer bg-[var(--bg-primary)] hover:border-[var(--text-primary)] transition-all outline-none shadow-sm appearance-none text-center min-w-[100px]"
        >
          <option value="mes">Mes</option>
          <option value="semana">Semana</option>
          <option value="dia">Día</option>
          <option value="anio">Año</option>
        </select>

        <div ref={settingsRef} className="relative">
          <button
            onClick={() => setShowSettingsMenu(!showSettingsMenu)}
            className="p-2.5 hover:bg-[var(--hover-color)] rounded-lg cursor-pointer flex items-center justify-center text-[var(--text-secondary)] transition-all active:scale-95"
          >
            <GoogleIcon name="settings" size={22} />
          </button>

          {showSettingsMenu && (
            <div className="absolute top-14 right-0 bg-[var(--bg-secondary)] shadow-[0_20px_50px_rgba(0,0,0,0.3)] rounded-2xl z-[1500] w-56 py-3 flex flex-col border border-[var(--border-color)] animate-zoom-in backdrop-blur-xl">
              <button
                onClick={() => {
                  setShowAspectoModal(true)
                  setShowSettingsMenu(false)
                }}
                className="px-6 py-3 text-sm font-bold flex items-center hover:bg-[var(--hover-color)] transition-colors gap-4"
              >
                <Palette size={18} className="text-[var(--accent-color)]" />
                Aspecto
              </button>
              <button
                className="px-6 py-3 text-sm font-bold text-[var(--text-secondary)] opacity-30 flex items-center cursor-default gap-4"
              >
                <GoogleIcon name="delete" size={18} />
                Papelera
              </button>
            </div>
          )}
        </div>
      </div>

      {showAspectoModal && (
        <ModalAspecto onClose={() => setShowAspectoModal(false)} />
      )}

    </div>
  )
}

export default HeaderCalendario
