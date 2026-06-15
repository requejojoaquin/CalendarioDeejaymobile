import { useState, useRef, useEffect } from 'react'
import { useCalendario } from '../../context/CalendarioContext'
import { useModoOscuro } from '../../context/ModoOscuroContext'
import { Settings, Search, Trash2, Palette, X, ChevronLeft, ChevronRight } from 'lucide-react'
import ModalAspecto from '../modals/ModalAspecto'

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
      className="flex items-center px-6 border-b border-[var(--border-color)] gap-4 h-20 flex-shrink-0 relative bg-[var(--bg-primary)] text-[var(--text-primary)] transition-colors duration-200"
    >

      <button
        onClick={onToggleSidebar}
        className="p-3 hover:bg-[var(--hover-color)] rounded-full cursor-pointer transition-colors text-[var(--text-primary)]"
      >
        ☰
      </button>

      <span className="text-2xl font-normal w-[200px] ml-2">
        Calendario
      </span>

      <div className="w-10" />

      {/* Botón Hoy - MUY GRANDE */}
      <button
        onClick={onHoy}
        className="px-10 py-3 border-2 border-[var(--border-color)] rounded-lg cursor-pointer text-base font-bold bg-[var(--bg-primary)] hover:bg-[var(--hover-color)] transition-all shadow-sm active:scale-95"
      >
        Hoy
      </button>

      {/* Flechas de navegación - MÁS GRANDES */}
      <div className="flex gap-2">
        <button
          onClick={onAnterior}
          className="p-3 hover:bg-[var(--hover-color)] rounded-full cursor-pointer transition-colors"
        >
          <ChevronLeft size={28} />
        </button>
        <button
          onClick={onSiguiente}
          className="p-3 hover:bg-[var(--hover-color)] rounded-full cursor-pointer transition-colors"
        >
          <ChevronRight size={28} />
        </button>
      </div>

      <span className="text-2xl font-semibold min-w-[250px]">
        {MESES[mesActual]} {anioActual}
      </span>

      <div className="flex-1" />

      {/* Selector de vista - MUY GRANDE */}
      <select
        value={vistaActual}
        onChange={(e) => onCambiarVista(e.target.value)}
        className="px-10 py-3 border-2 border-[var(--border-color)] rounded-lg text-base font-bold cursor-pointer bg-[var(--bg-primary)] hover:bg-[var(--hover-color)] transition-all outline-none mr-6 shadow-sm appearance-none text-center"
      >
        <option value="mes">Mes</option>
        <option value="semana">Semana</option>
        <option value="dia">Día</option>
        <option value="anio">Año</option>
      </select>

      <div ref={settingsRef} className="relative mr-6">
        <button
          onClick={() => setShowSettingsMenu(!showSettingsMenu)}
          className="p-3 hover:bg-[var(--hover-color)] rounded-full cursor-pointer flex items-center justify-center text-[var(--text-secondary)] transition-colors"
        >
          <Settings size={28} />
        </button>

        {showSettingsMenu && (
          <div className="absolute top-14 right-0 bg-[var(--bg-primary)] shadow-2xl rounded-2xl z-[1500] w-[220px] py-3 flex flex-col border border-[var(--border-color)] animate-in fade-in zoom-in duration-150 shadow-[0_10px_40px_rgba(0,0,0,0.2)]">
            <button
              onClick={() => {
                setShowAspectoModal(true)
                setShowSettingsMenu(false)
              }}
              className="px-6 py-4 text-base font-medium flex items-center hover:bg-[var(--hover-color)] transition-colors"
            >
              <Palette size={20} className="mr-4 text-blue-500" />
              Aspecto
            </button>
            <button
              className="px-6 py-4 text-base font-medium text-[var(--text-secondary)] opacity-60 flex items-center cursor-default"
            >
              <Trash2 size={20} className="mr-4" />
              Papelera
            </button>
          </div>
        )}
      </div>

      {/* Buscador - MUY ESTRECHO Y PEQUEÑO */}
      <div ref={searchRef} className="relative">
        <div className="flex items-center bg-[var(--bg-secondary)] rounded-xl px-4 w-[140px] h-12 transition-all group focus-within:bg-[var(--bg-primary)] focus-within:w-[220px] focus-within:shadow-xl border border-transparent focus-within:border-blue-400">
          <span className="text-[var(--text-secondary)] mr-2 flex-shrink-0">
            <Search size={16} />
          </span>
          <input
            type="text"
            placeholder="Buscar"
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
          <div className="absolute top-[56px] left-0 right-0 bg-[var(--bg-primary)] shadow-2xl rounded-2xl z-[1200] max-h-[350px] overflow-y-auto border border-[var(--border-color)] animate-in fade-in slide-in-from-top-2 duration-200">
            {filteredEventos.slice(0, 5).map(evento => {
              const cal = calendarios.find(c => c.id === evento.calendarioId)
              return (
                <div
                  key={evento.id}
                  onClick={() => handleSelectEvento(evento)}
                  className="px-5 py-4 cursor-pointer flex items-center gap-4 border-b border-[var(--border-color)] last:border-none hover:bg-[var(--hover-color)] transition-colors"
                >
                  <div className="w-3.5 h-3.5 rounded-full flex-shrink-0" style={{ backgroundColor: cal?.color || '#1a73e8' }} />
                  <div className="flex flex-col min-w-0">
                    <span className="text-sm font-bold truncate">{evento.titulo}</span>
                    <span className="text-xs text-[var(--text-secondary)] font-medium">{evento.fecha}</span>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {showAspectoModal && (
        <ModalAspecto onClose={() => setShowAspectoModal(false)} />
      )}

    </div>
  )
}

export default HeaderCalendario
