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
          const eventosDia = eventos.filter(ev => ev.fecha === fechaKey && calendarios.find(c => c.id === ev.calendarioId)?.visible !== false)
          const esHoy = item.dia === hoy.getDate() && mesActual === hoy.getMonth() && anioActual === hoy.getFullYear() && item.mes === 'actual'

          return (
            <div 
              key={index}
              onClick={() => item.mes === 'actual' && onDiaClick(item.dia)}
              className={`border-r border-b border-[var(--border-color)] p-2 min-h-0 flex flex-col gap-1 transition-colors hover:bg-[var(--hover-color)] cursor-pointer
                ${item.mes !== 'actual' ? 'bg-[var(--bg-secondary)] opacity-40' : 'bg-[var(--bg-primary)]'}`}
            >
              <div className="flex flex-col items-center">
                <span className={`text-xs font-bold w-8 h-8 flex items-center justify-center rounded-full
                  ${esHoy ? 'bg-blue-600 text-white shadow-md' : 'text-[var(--text-primary)]'}`}>
                  {item.dia}
                </span>
              </div>
              <div className="flex flex-col gap-1 overflow-y-auto custom-scrollbar flex-1">
                {eventosDia.map(ev => (
                  <div
                    key={ev.id}
                    onClick={(e) => { e.stopPropagation(); onEventoClick(ev); }}
                    className="px-2 py-1 rounded-md text-[10px] font-bold truncate text-white shadow-sm hover:brightness-90 transition-all"
                    style={{ backgroundColor: ev.color || calendarios.find(c => c.id === ev.calendarioId)?.color || '#1a73e8' }}
                  >
                    {ev.hora} {ev.titulo}
                  </div>
                ))}
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

  // --- VISTA DIA ---
  const renderVistaDia = () => {
    const fechaKey = formatYMD(anioActual, mesActual, diaSeleccionado)
    const eventosDia = eventos.filter(ev => ev.fecha === fechaKey && calendarios.find(c => c.id === ev.calendarioId)?.visible !== false)
    
    return (
      <div className="flex-1 flex flex-col bg-[var(--bg-primary)] p-8 max-w-4xl mx-auto w-full">
        <div className="flex items-center gap-6 mb-8 border-b border-[var(--border-color)] pb-6">
          <span className="text-6xl font-black text-blue-600">{diaSeleccionado}</span>
          <div className="flex flex-col">
            <span className="text-2xl font-bold text-[var(--text-primary)]">{DIAS_SEMANA[new Date(anioActual, mesActual, diaSeleccionado).getDay()]}</span>
            <span className="text-lg text-[var(--text-secondary)]">{MESES_NOMBRES[mesActual]} {anioActual}</span>
          </div>
        </div>
        <div className="space-y-4">
          <h3 className="text-xs font-black text-[var(--text-secondary)] uppercase tracking-widest mb-4">Eventos del día</h3>
          {eventosDia.length === 0 ? (
            <div className="py-20 text-center border-2 border-dashed border-[var(--border-color)] rounded-3xl text-[var(--text-secondary)] font-medium">
              No hay eventos programados para hoy
            </div>
          ) : (
            eventosDia.map(ev => (
              <div
                key={ev.id}
                onClick={() => onEventoClick(ev)}
                className="flex items-center gap-6 p-6 rounded-3xl bg-[var(--bg-secondary)] border border-[var(--border-color)] cursor-pointer hover:shadow-xl transition-all group"
              >
                <div className="text-xl font-bold text-[var(--text-primary)] w-20">{ev.hora}</div>
                <div className="w-1.5 h-12 rounded-full" style={{ backgroundColor: ev.color || calendarios.find(c => c.id === ev.calendarioId)?.color || '#1a73e8' }} />
                <div className="flex-1">
                  <h4 className="text-xl font-bold text-[var(--text-primary)] group-hover:text-blue-600 transition-colors">{ev.titulo}</h4>
                  <p className="text-sm text-[var(--text-secondary)] mt-1">{ev.descripcion || 'Sin descripción'}</p>
                </div>
              </div>
            ))
          )}
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
