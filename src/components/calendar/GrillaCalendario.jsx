import { useCalendario } from '../../context/CalendarioContext'
import { useModoOscuro } from '../../context/ModoOscuroContext'

const MESES_NOMBRES = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre']
const DIAS_SEMANA = ['DOM', 'LUN', 'MAR', 'MIE', 'JUE', 'VIE', 'SAB']

function GrillaCalendario({ mesActual, anioActual, onDiaClick, vistaActual, diaSeleccionado, onEventoClick }) {
  const { eventos, calendarios } = useCalendario()
  const { esOscuro } = useModoOscuro()
  const hoy = new Date()

  const formatYMD = (y, m, d) => {
    const dateObj = new Date(y, m, d)
    const year = dateObj.getFullYear()
    const month = String(dateObj.getMonth() + 1).padStart(2, '0')
    const day = String(dateObj.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
  }

  // --- VISTA MES ---
  const renderVistaMes = () => {
    const primerDia = new Date(anioActual, mesActual, 1).getDay()
    const diasEnMes = new Date(anioActual, mesActual + 1, 0).getDate()
    const dias = []
    const ultimoDiaMesAnterior = new Date(anioActual, mesActual, 0).getDate()

    for (let i = primerDia - 1; i >= 0; i--) {
      dias.push({ dia: ultimoDiaMesAnterior - i, mes: 'anterior' })
    }
    for (let i = 1; i <= diasEnMes; i++) {
      dias.push({ dia: i, mes: 'actual' })
    }
    const totalCeldas = 42
    const diasSiguiente = totalCeldas - dias.length
    for (let i = 1; i <= diasSiguiente; i++) {
      dias.push({ dia: i, mes: 'siguiente' })
    }

    return (
      <div className="flex-1 grid grid-cols-7 grid-rows-6 h-full">
        {dias.map((item, index) => {
          let m = mesActual
          if (item.mes === 'anterior') m--
          if (item.mes === 'siguiente') m++
          const fechaKey = formatYMD(anioActual, m, item.dia)
          
          // Filtrado por rango de fechas
          const eventosDia = eventos.filter(ev => {
            const inicio = ev.fechaInicio || ev.fecha
            const fin = ev.fechaFin || ev.fecha
            const esVisible = calendarios.find(c => c.id === ev.calendarioId)?.visible !== false
            return fechaKey >= inicio && fechaKey <= fin && esVisible
          })

          const esHoy = item.dia === hoy.getDate() && mesActual === hoy.getMonth() && anioActual === hoy.getFullYear() && item.mes === 'actual'

          return (
            <div 
              key={index}
              onClick={() => item.mes === 'actual' && onDiaClick(item.dia)}
              className={`border-r border-b border-[var(--border-color)]/50 p-1 min-h-0 flex flex-col gap-0.5 transition-colors hover:bg-[var(--hover-color)]/20 cursor-pointer
                ${item.mes !== 'actual' ? 'bg-[var(--bg-secondary)]/30 opacity-30' : 'bg-[var(--bg-primary)]'}`}
            >
              <div className="flex justify-center mb-1">
                <span className={`text-[11px] font-black w-6 h-6 flex items-center justify-center rounded-full transition-all
                  ${esHoy ? 'bg-[var(--accent-color)] text-white shadow-lg scale-110' : 'text-[var(--text-secondary)] opacity-60'}`}>
                  {item.dia}
                </span>
              </div>
              <div className="flex flex-col gap-0.5 overflow-hidden flex-1">
                {eventosDia.slice(0, 4).map(ev => {
                  const inicio = ev.fechaInicio || ev.fecha
                  const fin = ev.fechaFin || ev.fecha
                  const esInicio = fechaKey === inicio
                  const esFin = fechaKey === fin
                  const esMultidia = inicio !== fin

                  return (
                    <div
                      key={ev.id}
                      onClick={(e) => { e.stopPropagation(); onEventoClick(ev); }}
                      className={`
                        px-2 py-0.5 text-[9px] font-black truncate text-white shadow-sm hover:brightness-110 transition-all
                        ${esInicio ? 'rounded-l-md ml-1' : ''}
                        ${esFin ? 'rounded-r-md mr-1' : ''}
                        ${!esInicio && !esFin ? 'mx-0' : ''}
                        ${!esMultidia ? 'rounded-md mx-1' : ''}
                        ${ev.todoElDia ? 'opacity-100' : 'opacity-90'}
                      `}
                      style={{ 
                        backgroundColor: ev.color || calendarios.find(c => c.id === ev.calendarioId)?.color || '#1a73e8',
                        marginTop: '1px'
                      }}
                    >
                      {esInicio && !ev.todoElDia && <span className="opacity-70 mr-1">{ev.hora}</span>}
                      {ev.titulo}
                    </div>
                  )
                })}
                {eventosDia.length > 4 && (
                  <div className="text-[8px] font-bold text-[var(--text-secondary)] text-center mt-auto opacity-50">
                    + {eventosDia.length - 4} más
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>
    )
  }

  // --- VISTA SEMANA ---
  const renderVistaSemana = () => {
    const fechaBase = new Date(anioActual, mesActual, diaSeleccionado)
    const diaSemana = fechaBase.getDay()
    const inicioSemana = new Date(fechaBase)
    inicioSemana.setDate(fechaBase.getDate() - diaSemana)

    const diasSemanaArr = []
    for (let i = 0; i < 7; i++) {
      const d = new Date(inicioSemana)
      d.setDate(inicioSemana.getDate() + i)
      diasSemanaArr.push(d)
    }

    return (
      <div className="flex-1 grid grid-cols-7 h-full divide-x divide-[var(--border-color)] bg-[var(--bg-primary)]">
        {diasSemanaArr.map((fecha, i) => {
          const fechaKey = formatYMD(fecha.getFullYear(), fecha.getMonth(), fecha.getDate())
          const eventosDia = eventos.filter(ev => ev.fecha === fechaKey && calendarios.find(c => c.id === ev.calendarioId)?.visible !== false)
          const esHoy = fecha.toDateString() === hoy.toDateString()

          return (
            <div key={i} className="flex flex-col h-full bg-[var(--bg-primary)]">
              <div className="p-4 border-b border-[var(--border-color)] flex flex-col items-center gap-1">
                <span className="text-[10px] font-black text-[var(--text-secondary)] uppercase">{DIAS_SEMANA[i]}</span>
                <span className={`text-2xl font-bold w-12 h-12 flex items-center justify-center rounded-full ${esHoy ? 'bg-blue-600 text-white' : ''}`}>
                  {fecha.getDate()}
                </span>
              </div>
              <div className="flex-1 p-2 space-y-2 overflow-y-auto custom-scrollbar">
                {eventosDia.map(ev => (
                  <div
                    key={ev.id}
                    onClick={() => onEventoClick(ev)}
                    className="p-3 rounded-xl text-xs font-bold text-white shadow-md cursor-pointer hover:brightness-95 transition-all"
                    style={{ backgroundColor: ev.color || calendarios.find(c => c.id === ev.calendarioId)?.color || '#1a73e8' }}
                  >
                    <div className="opacity-80 text-[10px] mb-1">{ev.hora}</div>
                    <div className="truncate">{ev.titulo}</div>
                  </div>
                ))}
              </div>
            </div>
          )
        })}
      </div>
    )
  }

  // --- VISTA DIA (Rediseñada con Scroll y Mejoras Estéticas) ---
  const renderVistaDia = () => {
    const horas = Array.from({ length: 23 }, (_, i) => String(i + 1).padStart(2, '0') + ':00')
    const fechaKey = formatYMD(anioActual, mesActual, diaSeleccionado)
    const eventosDia = eventos.filter(ev => ev.fecha === fechaKey && calendarios.find(c => c.id === ev.calendarioId)?.visible !== false)
    
    return (
      <div className="flex flex-col h-full bg-[var(--bg-primary)] overflow-hidden animate-fade-in">
        {/* Cabezal del día - Fijo arriba */}
        <div className="px-8 py-6 border-b border-[var(--border-color)] flex items-end gap-6 bg-[var(--bg-secondary)]/30 backdrop-blur-md z-20">
          <span className="text-6xl font-black tracking-tighter text-[var(--accent-color)] leading-none">{diaSeleccionado}</span>
          <div className="flex flex-col mb-1">
            <span className="text-2xl font-bold text-[var(--text-primary)]">{DIAS_SEMANA[new Date(anioActual, mesActual, diaSeleccionado).getDay()]}</span>
            <span className="text-sm font-black text-[var(--text-secondary)] uppercase tracking-[0.2em]">{MESES_NOMBRES[mesActual]} {anioActual}</span>
          </div>
        </div>

        {/* Cronograma con Scroll - Área Principal */}
        <div className="flex-1 overflow-y-auto custom-scrollbar bg-[var(--bg-primary)]">
          <div className="relative min-w-full pb-20">
            {horas.map((hora) => (
              <div key={hora} className="flex border-b border-[var(--border-color)]/30 h-24 group transition-colors hover:bg-[var(--hover-color)]/10">
                <div className="w-28 flex-shrink-0 flex justify-center pt-3 border-r border-[var(--border-color)]/30">
                  <span className="text-[12px] font-black text-[var(--text-secondary)] opacity-30 group-hover:opacity-100 transition-opacity tracking-widest">{hora}</span>
                </div>
                <div className="flex-1 relative">
                  {/* Línea de media hora sutil */}
                  <div className="absolute top-1/2 left-0 right-0 h-px border-t border-dashed border-[var(--border-color)]/10" />
                  
                  {/* Eventos mapeados */}
                  {eventosDia.filter(ev => ev.hora.startsWith(hora.substring(0, 2))).map(ev => (
                    <div
                      key={ev.id}
                      onClick={() => onEventoClick(ev)}
                      className="absolute inset-x-4 top-2 bottom-2 p-4 rounded-2xl border border-white/5 shadow-2xl cursor-pointer hover:scale-[1.01] active:scale-[0.98] transition-all z-10 overflow-hidden flex gap-4 animate-zoom-in"
                      style={{ backgroundColor: ev.color || calendarios.find(c => c.id === ev.calendarioId)?.color || '#1a73e8' }}
                    >
                      <div className="w-1.5 h-full bg-white/20 rounded-full" />
                      <div className="flex flex-col justify-center min-w-0">
                        <span className="text-sm font-black text-white truncate uppercase tracking-tight leading-tight">{ev.titulo}</span>
                        <span className="text-[11px] text-white/70 font-bold mt-0.5">{ev.hora}hs</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  // --- VISTA AÑO ---
  const renderVistaAnio = () => {
    return (
      <div className="flex-1 grid grid-cols-4 grid-rows-3 gap-8 p-10 bg-[var(--bg-primary)] overflow-y-auto custom-scrollbar">
        {MESES_NOMBRES.map((nombre, mIdx) => {
          const primerDia = new Date(anioActual, mIdx, 1).getDay()
          const diasEnMes = new Date(anioActual, mIdx + 1, 0).getDate()
          const dias = []
          for (let i = 0; i < primerDia; i++) dias.push(null)
          for (let i = 1; i <= diasEnMes; i++) dias.push(i)

          return (
            <div key={nombre} className="flex flex-col gap-3">
              <h3 className="text-sm font-black text-blue-600 uppercase tracking-tighter ml-1">{nombre}</h3>
              <div className="grid grid-cols-7 text-[9px] font-bold text-[var(--text-secondary)] mb-1">
                {['D','L','M','M','J','V','S'].map((d, i) => <div key={i} className="text-center">{d}</div>)}
              </div>
              <div className="grid grid-cols-7 gap-y-1">
                {dias.map((d, i) => {
                  const fechaKey = d ? formatYMD(anioActual, mIdx, d) : null
                  const tieneEventos = d && eventos.some(ev => ev.fecha === fechaKey && calendarios.find(c => c.id === ev.calendarioId)?.visible !== false)
                  const esHoy = d === hoy.getDate() && mIdx === hoy.getMonth() && anioActual === hoy.getFullYear()

                  return (
                    <div 
                      key={i} 
                      className={`text-[9px] text-center w-5 h-5 flex items-center justify-center rounded-full transition-all
                        ${esHoy ? 'bg-blue-600 text-white font-black' : tieneEventos ? 'bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 font-bold' : 'text-[var(--text-primary)]'}
                        ${!d ? 'invisible' : 'hover:bg-[var(--hover-color)] cursor-pointer'}`}
                    >
                      {d}
                    </div>
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>
    )
  }

  return (
    <div className="flex-1 flex flex-col bg-[var(--bg-primary)] transition-colors duration-200 overflow-hidden">
      {/* Header de días solo para Mes y Semana (si aplica) */}
      {vistaActual === 'mes' && (
        <div className="grid grid-cols-7 border-b border-[var(--border-color)] bg-[var(--bg-primary)]">
          {DIAS_SEMANA.map(dia => (
            <div key={dia} className="py-3 text-center text-[11px] font-black text-[var(--text-secondary)] border-r border-[var(--border-color)] last:border-r-0 tracking-widest uppercase">
              {dia}
            </div>
          ))}
        </div>
      )}

      <div className="flex-1 overflow-hidden">
        {vistaActual === 'mes' && renderVistaMes()}
        {vistaActual === 'semana' && renderVistaSemana()}
        {vistaActual === 'dia' && renderVistaDia()}
        {vistaActual === 'anio' && renderVistaAnio()}
      </div>
    </div>
  )
}

export default GrillaCalendario
