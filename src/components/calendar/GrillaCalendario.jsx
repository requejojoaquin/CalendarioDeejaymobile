import { useState } from 'react'
import { motion } from 'framer-motion'
import { ChevronDown, ChevronUp } from 'lucide-react'
import { useCalendario } from '../../context/CalendarioContext'
import { ocurreEnFecha } from '../../utils/recurrencia'
import { gridStagger, fadeUpCell } from '../../lib/motion'

const MESES_NOMBRES = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre']
const DIAS_SEMANA = ['DOM', 'LUN', 'MAR', 'MIE', 'JUE', 'VIE', 'SAB']

function GrillaCalendario({ mesActual, anioActual, onDiaClick, vistaActual, diaSeleccionado, onEventoClick }) {
  const { eventos, calendarios } = useCalendario()
  const hoy = new Date()
  // Vista Día: colapsa la franja "Todo el día" a 2 eventos + "N más".
  const [diaAllDayExp, setDiaAllDayExp] = useState(false)
  // Vista Día: colapso por hora de los eventos con hora (clave hora -> abierto).
  const [horasExp, setHorasExp] = useState({})

  const formatYMD = (y, m, d) => {
    const dateObj = new Date(y, m, d)
    const year = dateObj.getFullYear()
    const month = String(dateObj.getMonth() + 1).padStart(2, '0')
    const day = String(dateObj.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
  }

  // ¿El calendario del evento está visible? (true si no hay preferencia).
  const calVisible = (ev) => calendarios.find((c) => c.id === ev.calendarioId)?.visible !== false

  // Rango de fechas del evento, normalizado. Soporta fechaInicio/fechaFin y el
  // campo legacy `fecha`. Un evento "ocupa" desde inicio hasta fin (inclusive).
  const rangoEvento = (ev) => {
    const inicio = ev.fechaInicio || ev.fecha
    const fin = ev.fechaFin || ev.fecha
    return { inicio, fin }
  }

  // Filtro unificado usado por TODAS las vistas: un evento aparece en `fechaKey`
  // si su calendario es visible Y ocurre en esa fecha. `ocurreEnFecha` cubre el
  // rango base (multi-dia) Y las repeticiones (recurrencia) expandidas al vuelo.
  const eventoEnFecha = (ev, fechaKey) => calVisible(ev) && ocurreEnFecha(ev, fechaKey)

  // BUG 2 — Un evento es "de todo el día" si está marcado o no tiene hora.
  const esTodoElDia = (ev) => ev.todoElDia || !ev.hora

  // Color efectivo del evento (color propio > color del calendario > accent).
  const colorEvento = (ev) =>
    ev.color || calendarios.find((c) => c.id === ev.calendarioId)?.color || 'var(--accent-color)'

  // Color del CALENDARIO del evento (para mostrar a qué calendario pertenece
  // aunque el evento tenga un color propio distinto).
  // Cada evento muestra SIEMPRE el color de su calendario como barra/borde
  // izquierdo (indicador de a qué calendario pertenece), en todas las vistas.
  const colorCalendarioDe = (ev) =>
    calendarios.find((c) => c.id === ev.calendarioId)?.color || 'var(--accent-color)'

  const eventosDeFecha = (fechaKey) => eventos.filter((ev) => eventoEnFecha(ev, fechaKey))

  // ¿Evento de rango (dura varios días)? Solo estos se dibujan como barra
  // continua; los de un día y las recurrencias siguen como chip suelto.
  const esRangoMultiDia = (ev) => {
    const { inicio, fin } = rangoEvento(ev)
    return !!inicio && !!fin && inicio !== fin
  }

  // Alto de cada barra multi-día y separación, para reservar espacio en la celda.
  const BARRA_H = 18
  const BARRA_TOTAL = 20
  const TOP_BARRAS = 30

  // Para una semana (7 celdas con fechaKey) calcula las barras de los eventos de
  // rango que la cruzan: en qué columnas empieza/termina, si son inicio/fin REAL
  // (no continuación de otra semana) y a qué "carril" (lane) van para no pisarse.
  const barrasMultiDia = (celdas) => {
    const weekStart = celdas[0].fechaKey
    const weekEnd = celdas[6].fechaKey
    const idxDe = (fk) => celdas.findIndex((c) => c.fechaKey === fk)
    const bars = eventos
      .filter((ev) => {
        if (!calVisible(ev) || !esRangoMultiDia(ev)) return false
        const { inicio, fin } = rangoEvento(ev)
        return inicio <= weekEnd && fin >= weekStart
      })
      .map((ev) => {
        const { inicio, fin } = rangoEvento(ev)
        const ci = inicio <= weekStart ? 0 : idxDe(inicio)
        const cf = fin >= weekEnd ? 6 : idxDe(fin)
        return {
          ev,
          colInicio: Math.max(0, ci),
          colFin: Math.min(6, cf < 0 ? 6 : cf),
          esInicioReal: inicio >= weekStart,
          esFinReal: fin <= weekEnd,
        }
      })
      .sort((a, b) => a.colInicio - b.colInicio || (b.colFin - b.colInicio) - (a.colFin - a.colInicio))
    const lanes = []
    bars.forEach((bar) => {
      let lane = 0
      while ((lanes[lane] || []).some(([s, e]) => !(bar.colFin < s || bar.colInicio > e))) lane++
      ;(lanes[lane] = lanes[lane] || []).push([bar.colInicio, bar.colFin])
      bar.lane = lane
    })
    return { bars, numLanes: lanes.length }
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
    for (let i = 1; dias.length < 42; i++) dias.push({ dia: i, mes: 'siguiente' })

    // Enriquecer cada celda con su fechaKey y partir en 6 semanas de 7 días.
    const celdasMes = dias.map((item) => {
      let m = mesActual
      if (item.mes === 'anterior') m--
      if (item.mes === 'siguiente') m++
      return { ...item, fechaKey: formatYMD(anioActual, m, item.dia) }
    })
    const semanas = []
    for (let i = 0; i < 6; i++) semanas.push(celdasMes.slice(i * 7, i * 7 + 7))

    return (
      <motion.div
        key={`mes-${anioActual}-${mesActual}`}
        className="flex-1 grid grid-rows-6 h-full"
        variants={gridStagger}
        initial="initial"
        animate="animate"
      >
        {semanas.map((celdas, wi) => {
          const { bars, numLanes } = barrasMultiDia(celdas)
          return (
            <motion.div key={wi} variants={fadeUpCell} className="relative grid grid-cols-7 min-h-0 overflow-hidden">
              {celdas.map((celda, ci) => {
                const esHoy = celda.dia === hoy.getDate() && mesActual === hoy.getMonth() && anioActual === hoy.getFullYear() && celda.mes === 'actual'
                // Eventos de UN día (los de rango van en las barras del overlay).
                const sueltos = eventosDeFecha(celda.fechaKey).filter((ev) => !esRangoMultiDia(ev))
                return (
                  <div
                    key={ci}
                    onClick={() => celda.mes === 'actual' && onDiaClick(celda.dia)}
                    className={`border-r border-b border-[var(--border-color)] p-1 min-h-0 flex flex-col overflow-hidden transition-colors duration-100 cursor-pointer
                      ${celda.mes !== 'actual'
                        ? 'bg-[var(--bg-secondary)]/40 text-[var(--text-tertiary)]'
                        : 'bg-[var(--bg-primary)] hover:bg-[var(--hover-color)]'}`}
                  >
                    <div className="flex justify-center mb-0.5">
                      <span className={`font-num text-xs font-medium w-6 h-6 flex items-center justify-center rounded-full
                        ${esHoy
                          ? 'bg-[var(--accent-color)] text-[var(--accent-contrast)]'
                          : celda.mes === 'actual' ? 'text-[var(--text-primary)]' : 'text-[var(--text-tertiary)]'}`}>
                        {celda.dia}
                      </span>
                    </div>
                    {/* Reserva el alto de las barras multi-día (que se dibujan en el overlay). */}
                    {numLanes > 0 && <div className="shrink-0" style={{ height: numLanes * BARRA_TOTAL }} />}
                    <div className="flex flex-col gap-0.5 overflow-hidden flex-1">
                      {sueltos.slice(0, 2).map((ev) => {
                        const todoDia = esTodoElDia(ev)
                        return (
                          <div
                            key={ev.id}
                            onClick={(e) => { e.stopPropagation(); onEventoClick(ev) }}
                            title={ev.titulo}
                            className="group/chip flex items-center gap-1.5 px-2 py-0.5 mx-0.5 min-h-[18px] rounded-md text-[11px] font-medium text-white shadow-[var(--shadow-sm)] hover:brightness-[1.08] transition-[filter] duration-100 leading-tight min-w-0 overflow-hidden [text-shadow:0_1px_1px_rgba(0,0,0,0.18)]"
                            style={{ backgroundColor: colorEvento(ev) }}
                          >
                            <span className="w-1.5 self-stretch rounded-full shrink-0" style={{ backgroundColor: colorCalendarioDe(ev) }} />
                            {!todoDia && ev.hora && (
                              <span className="font-num shrink-0 text-[10px] font-semibold text-white/85">{ev.hora}</span>
                            )}
                            <span className="flex-1 min-w-0 truncate">{ev.titulo}</span>
                          </div>
                        )
                      })}
                      {sueltos.length > 2 && (
                        <button
                          onClick={(e) => { e.stopPropagation(); onDiaClick(celda.dia) }}
                          className="text-[11px] font-medium text-[var(--text-secondary)] text-left mx-0.5 px-1.5 py-0.5 mt-auto rounded-md hover:bg-[var(--hover-color)] hover:text-[var(--accent-color)] transition-colors duration-100"
                        >
                          <span className="font-num">+{sueltos.length - 2}</span> más
                        </button>
                      )}
                    </div>
                  </div>
                )
              })}

              {/* Overlay de barras multi-día: una sola línea continua por evento,
                  abarca sus columnas y se redondea SOLO en el inicio/fin real. */}
              <div className="absolute left-0 right-0 pointer-events-none" style={{ top: TOP_BARRAS }}>
                {bars.map((b) => (
                  <div
                    key={b.ev.id}
                    onClick={(e) => { e.stopPropagation(); onEventoClick(b.ev) }}
                    title={b.ev.titulo}
                    className={`absolute pointer-events-auto flex items-center gap-1.5 pr-2 text-[11px] font-medium text-white cursor-pointer shadow-[var(--shadow-sm)] hover:brightness-[1.08] transition-[filter] duration-100 overflow-hidden [text-shadow:0_1px_1px_rgba(0,0,0,0.18)]
                      ${b.esInicioReal ? 'rounded-l-md' : 'pl-2'} ${b.esFinReal ? 'rounded-r-md' : ''}`}
                    style={{
                      left: `${(b.colInicio / 7) * 100}%`,
                      width: `${((b.colFin - b.colInicio + 1) / 7) * 100}%`,
                      top: b.lane * BARRA_TOTAL,
                      height: BARRA_H,
                      backgroundColor: colorEvento(b.ev),
                    }}
                  >
                    {b.esInicioReal && (
                      <span className="w-1.5 self-stretch rounded-full shrink-0" style={{ backgroundColor: colorCalendarioDe(b.ev) }} />
                    )}
                    <span className="flex-1 min-w-0 truncate">{b.ev.titulo}</span>
                  </div>
                ))}
              </div>
            </motion.div>
          )
        })}
      </motion.div>
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

    const celdasSemana = diasSemanaArr.map((fecha) => ({
      fechaKey: formatYMD(fecha.getFullYear(), fecha.getMonth(), fecha.getDate()),
    }))
    const { bars, numLanes } = barrasMultiDia(celdasSemana)
    const hayAllDay = numLanes > 0 || celdasSemana.some((c) =>
      eventosDeFecha(c.fechaKey).some((ev) => esTodoElDia(ev) && !esRangoMultiDia(ev))
    )

    return (
      <motion.div
        key={`semana-${anioActual}-${mesActual}-${diaSeleccionado}`}
        className="flex-1 flex flex-col h-full bg-[var(--bg-primary)] overflow-hidden"
        variants={fadeUpCell}
        initial="initial"
        animate="animate"
      >
        {/* En celular las 7 columnas no entran: scroll horizontal con ancho
            mínimo legible (~97px/col). En sm+ ocupa el ancho completo. */}
        <div className="flex-1 flex flex-col min-h-0 overflow-x-auto overflow-y-hidden">
        <div className="flex-1 flex flex-col min-h-0 min-w-[680px] sm:min-w-0">
        {/* Cabecera de días */}
        <div className="grid grid-cols-7 divide-x divide-[var(--border-color)] border-b border-[var(--border-color)] flex-shrink-0">
          {diasSemanaArr.map((fecha, i) => {
            const esHoy = fecha.toDateString() === hoy.toDateString()
            return (
              <button
                key={i}
                onClick={() => onDiaClick(fecha.getDate(), fecha.getMonth(), fecha.getFullYear())}
                className="p-3 flex flex-col items-center gap-1 hover:bg-[var(--hover-color)] transition-colors focus-visible:outline-none focus-visible:shadow-[var(--ring-accent)]"
              >
                <span className="text-[11px] font-medium text-[var(--text-tertiary)] uppercase tracking-wide">{DIAS_SEMANA[i]}</span>
                <span className={`font-num text-xl font-medium w-10 h-10 flex items-center justify-center rounded-full
                  ${esHoy ? 'bg-[var(--accent-color)] text-[var(--accent-contrast)]' : 'text-[var(--text-primary)]'}`}>
                  {fecha.getDate()}
                </span>
              </button>
            )
          })}
        </div>

        {/* Franja "Todo el día": barras multi-día (overlay que abarca columnas,
            una línea continua) + eventos de un día sueltos por columna. */}
        {hayAllDay && (
          <div className="relative grid grid-cols-7 divide-x divide-[var(--border-color)] border-b border-[var(--border-color)] bg-[var(--bg-secondary)]/40 flex-shrink-0">
            {diasSemanaArr.map((fecha, i) => {
              const fechaKey = celdasSemana[i].fechaKey
              const sueltosAllDay = eventosDeFecha(fechaKey).filter((ev) => esTodoElDia(ev) && !esRangoMultiDia(ev))
              return (
                <div key={i} className="px-1 py-1.5 flex flex-col gap-1 min-w-0">
                  {numLanes > 0 && <div className="shrink-0" style={{ height: numLanes * BARRA_TOTAL }} />}
                  {sueltosAllDay.map((ev) => (
                    <div
                      key={ev.id}
                      onClick={() => onEventoClick(ev)}
                      title={ev.titulo}
                      className="min-h-[22px] px-2 py-1 flex items-center gap-2 overflow-hidden rounded-md text-[11px] font-medium text-white cursor-pointer shadow-[var(--shadow-sm)] [text-shadow:0_1px_1px_rgba(0,0,0,0.18)] hover:brightness-[1.08] transition-[filter] duration-100"
                      style={{ backgroundColor: colorEvento(ev) }}
                    >
                      <span className="w-1.5 shrink-0 self-stretch rounded-full bg-white/40" style={{ backgroundColor: colorCalendarioDe(ev) }} />
                      <span className="flex-1 min-w-0 truncate">{ev.titulo}</span>
                    </div>
                  ))}
                </div>
              )
            })}

            <div className="absolute left-0 right-0 pointer-events-none" style={{ top: 6 }}>
              {bars.map((b) => (
                <div
                  key={b.ev.id}
                  onClick={(e) => { e.stopPropagation(); onEventoClick(b.ev) }}
                  title={b.ev.titulo}
                  className={`absolute pointer-events-auto flex items-center gap-1.5 pr-2 text-[11px] font-medium text-white cursor-pointer shadow-[var(--shadow-sm)] hover:brightness-[1.08] transition-[filter] duration-100 overflow-hidden [text-shadow:0_1px_1px_rgba(0,0,0,0.18)]
                    ${b.esInicioReal ? 'rounded-l-md' : 'pl-2'} ${b.esFinReal ? 'rounded-r-md' : ''}`}
                  style={{
                    left: `${(b.colInicio / 7) * 100}%`,
                    width: `${((b.colFin - b.colInicio + 1) / 7) * 100}%`,
                    top: b.lane * BARRA_TOTAL,
                    height: BARRA_H,
                    backgroundColor: colorEvento(b.ev),
                  }}
                >
                  {b.esInicioReal && (
                    <span className="w-1.5 self-stretch rounded-full shrink-0" style={{ backgroundColor: colorCalendarioDe(b.ev) }} />
                  )}
                  <span className="flex-1 min-w-0 truncate">{b.ev.titulo}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Timeline: eventos con hora (de un día) por columna, con scroll. */}
        <div className="flex-1 grid grid-cols-7 divide-x divide-[var(--border-color)] overflow-y-auto custom-scrollbar min-h-0">
          {diasSemanaArr.map((fecha, i) => {
            const conHora = eventosDeFecha(celdasSemana[i].fechaKey).filter((ev) => !esTodoElDia(ev) && !esRangoMultiDia(ev))
            return (
              <div key={i} className="p-1.5 space-y-1.5 min-w-0">
                {conHora.map((ev) => (
                  <div
                    key={ev.id}
                    onClick={() => onEventoClick(ev)}
                    title={ev.titulo}
                    className="flex items-center gap-2 px-2 py-1 min-h-[24px] rounded-md text-xs font-medium text-white cursor-pointer shadow-[var(--shadow-sm)] [text-shadow:0_1px_1px_rgba(0,0,0,0.18)] hover:brightness-[1.08] active:scale-[0.99] transition-[filter] duration-100"
                    style={{ backgroundColor: colorEvento(ev) }}
                  >
                    <span className="w-1.5 shrink-0 self-stretch rounded-full bg-white/40" style={{ backgroundColor: colorCalendarioDe(ev) }} />
                    <span className="flex flex-col min-w-0">
                      <span className="truncate leading-tight">{ev.titulo}</span>
                      {ev.hora && <span className="font-num text-[10px] font-medium text-white/85 mt-0.5">{ev.hora}</span>}
                    </span>
                  </div>
                ))}
              </div>
            )
          })}
        </div>
        </div>
        </div>
      </motion.div>
    )
  }

  // --- VISTA DIA ---
  const renderVistaDia = () => {
    const horas = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, '0') + ':00')
    const fechaKey = formatYMD(anioActual, mesActual, diaSeleccionado)
    // BUG 1 — filtra por rango (incluye eventos multi-día que cruzan este día).
    const eventosDia = eventosDeFecha(fechaKey)
    // BUG 2 — separa todo-el-día (sin hora) para no llamar startsWith sobre null.
    const todoDiaEventos = eventosDia.filter(esTodoElDia)
    const conHora = eventosDia.filter((ev) => !esTodoElDia(ev))
    const esHoy = formatYMD(hoy.getFullYear(), hoy.getMonth(), hoy.getDate()) === fechaKey

    return (
      <motion.div
        key={`dia-${anioActual}-${mesActual}-${diaSeleccionado}`}
        className="flex flex-col h-full bg-[var(--bg-primary)] overflow-hidden"
        variants={fadeUpCell}
        initial="initial"
        animate="animate"
      >
        {/* Cabezal del día */}
        <div className="px-6 py-4 border-b border-[var(--border-color)] flex items-end gap-4 bg-[var(--bg-secondary)]/40">
          <span className={`font-num text-5xl font-semibold tracking-tight leading-none ${esHoy ? 'text-[var(--accent-color)]' : 'text-[var(--text-primary)]'}`}>
            {diaSeleccionado}
          </span>
          <div className="flex flex-col mb-1">
            <span className="text-xl font-semibold text-[var(--text-primary)]">{DIAS_SEMANA[new Date(anioActual, mesActual, diaSeleccionado).getDay()]}</span>
            <span className="text-xs font-medium text-[var(--text-secondary)]">{MESES_NOMBRES[mesActual]} {anioActual}</span>
          </div>
        </div>

        {/* Franja "Todo el día" */}
        {todoDiaEventos.length > 0 && (
          <div className="px-6 py-2 border-b border-[var(--border-color)] flex items-start gap-4 bg-[var(--bg-secondary)]/20">
            <span className="text-[11px] font-medium text-[var(--text-tertiary)] uppercase tracking-wide pt-1.5 w-20 flex-shrink-0">Todo el día</span>
            <div className="flex-1 min-w-0 flex flex-col gap-1.5 py-1">
              {(diaAllDayExp ? todoDiaEventos : todoDiaEventos.slice(0, 2)).map((ev) => (
                <div
                  key={ev.id}
                  onClick={() => onEventoClick(ev)}
                  title={ev.titulo}
                  className="min-h-[24px] px-2.5 py-1 flex items-center gap-2.5 overflow-hidden rounded-md text-xs font-medium text-white cursor-pointer shadow-[var(--shadow-sm)] [text-shadow:0_1px_1px_rgba(0,0,0,0.18)] hover:brightness-[1.08] transition-[filter] duration-100"
                  style={{ backgroundColor: colorEvento(ev) }}
                >
                  <span className="w-1.5 shrink-0 self-stretch rounded-full bg-white/40" style={{ backgroundColor: colorCalendarioDe(ev) }} />
                  <span className="flex-1 min-w-0 truncate">{ev.titulo}</span>
                </div>
              ))}
              {todoDiaEventos.length > 2 && (
                <button
                  type="button"
                  onClick={() => setDiaAllDayExp((v) => !v)}
                  className="self-start inline-flex items-center gap-1.5 px-2 py-1 text-xs font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--hover-color)] rounded-[var(--radius-sm)] transition-colors"
                >
                  {diaAllDayExp
                    ? <><ChevronUp size={14} /> Ocultar</>
                    : <><ChevronDown size={14} /> {todoDiaEventos.length - 2} más</>}
                </button>
              )}
            </div>
          </div>
        )}

        {/* Cronograma por horas */}
        <div className="flex-1 overflow-y-auto custom-scrollbar bg-[var(--bg-primary)]">
          <div className="relative min-w-full pb-16">
            {horas.map((hora) => {
              // BUG 2 — guarda de null: (ev.hora||'').startsWith(...) nunca crashea.
              const eventosHora = conHora.filter((ev) => (ev.hora || '').startsWith(hora.substring(0, 2)))
              return (
                <div key={hora} className="flex border-b border-[var(--border-color)] min-h-20 group transition-colors hover:bg-[var(--hover-color)]/40">
                  <div className="w-20 flex-shrink-0 flex justify-end pr-3 pt-1 border-r border-[var(--border-color)]">
                    <span className="text-[11px] font-medium text-[var(--text-tertiary)] tabular-nums">{hora}</span>
                  </div>
                  <div className="flex-1 min-w-0 px-1.5 py-1 flex flex-col gap-1">
                    {(horasExp[hora] ? eventosHora : eventosHora.slice(0, 2)).map((ev) => (
                      <div
                        key={ev.id}
                        onClick={() => onEventoClick(ev)}
                        title={ev.titulo}
                        className="min-h-[24px] px-2 py-1 rounded-[var(--radius-sm)] cursor-pointer shadow-[var(--shadow-sm)] [text-shadow:0_1px_1px_rgba(0,0,0,0.18)] hover:brightness-[1.08] active:scale-[0.99] transition-[filter] duration-100 overflow-hidden flex items-center gap-2"
                        style={{ backgroundColor: colorEvento(ev) }}
                      >
                        <span className="w-1.5 self-stretch rounded-full bg-white/40 flex-shrink-0" style={{ backgroundColor: colorCalendarioDe(ev) }} />
                        <span className="flex-1 min-w-0 truncate text-xs font-medium text-white leading-tight">{ev.titulo}</span>
                        {ev.hora && <span className="font-num text-[10px] text-white/85 font-medium shrink-0">{ev.hora}</span>}
                      </div>
                    ))}
                    {eventosHora.length > 2 && (
                      <button
                        type="button"
                        onClick={() => setHorasExp((p) => ({ ...p, [hora]: !p[hora] }))}
                        className="self-start inline-flex items-center gap-1 px-2 py-0.5 text-[11px] font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--hover-color)] rounded-[var(--radius-sm)] transition-colors"
                      >
                        {horasExp[hora]
                          ? <><ChevronUp size={13} /> Ocultar</>
                          : <><ChevronDown size={13} /> {eventosHora.length - 2} más</>}
                      </button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </motion.div>
    )
  }

  // --- VISTA AÑO ---
  const renderVistaAnio = () => {
    return (
      <motion.div
        key={`anio-${anioActual}`}
        className="flex-1 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 p-6 bg-[var(--bg-primary)] overflow-y-auto custom-scrollbar"
        variants={gridStagger}
        initial="initial"
        animate="animate"
      >
        {MESES_NOMBRES.map((nombre, mIdx) => {
          const primerDia = new Date(anioActual, mIdx, 1).getDay()
          const diasEnMes = new Date(anioActual, mIdx + 1, 0).getDate()
          const dias = []
          for (let i = 0; i < primerDia; i++) dias.push(null)
          for (let i = 1; i <= diasEnMes; i++) dias.push(i)

          return (
            <motion.div key={nombre} variants={fadeUpCell} className="flex flex-col gap-2">
              <h3 className="text-sm font-semibold text-[var(--text-primary)] tracking-tight ml-1">{nombre}</h3>
              <div className="grid grid-cols-7 text-[10px] font-medium text-[var(--text-tertiary)] mb-1">
                {['D', 'L', 'M', 'X', 'J', 'V', 'S'].map((d, i) => <div key={i} className="text-center">{d}</div>)}
              </div>
              <div className="grid grid-cols-7 gap-y-1">
                {dias.map((d, i) => {
                  const fechaKey = d ? formatYMD(anioActual, mIdx, d) : null
                  // BUG 1 — antes `ev.fecha === fechaKey`; ahora respeta rango.
                  const tieneEventos = d && eventos.some((ev) => eventoEnFecha(ev, fechaKey))
                  const esHoy = d === hoy.getDate() && mIdx === hoy.getMonth() && anioActual === hoy.getFullYear()

                  return (
                    <button
                      key={i}
                      onClick={() => d && onDiaClick(d, mIdx, anioActual)}
                      disabled={!d}
                      aria-label={d ? `${d} de ${nombre}${tieneEventos ? ', con eventos' : ''}` : undefined}
                      className={`font-num text-[10px] text-center w-6 h-6 flex items-center justify-center rounded-full transition-colors duration-100 mx-auto
                        ${esHoy
                          ? 'bg-[var(--accent-color)] text-[var(--accent-contrast)] font-medium'
                          : tieneEventos
                            ? 'bg-[var(--accent-soft)] text-[var(--accent-color)] font-medium'
                            : 'text-[var(--text-primary)]'}
                        ${!d ? 'invisible' : 'hover:bg-[var(--hover-color)] cursor-pointer focus-visible:outline-none focus-visible:shadow-[var(--ring-accent)]'}`}
                    >
                      {d}
                    </button>
                  )
                })}
              </div>
            </motion.div>
          )
        })}
      </motion.div>
    )
  }

  return (
    <div className="flex-1 min-w-0 flex flex-col bg-[var(--bg-primary)] transition-colors duration-200 overflow-hidden">
      {/* Cabecera de días: solo en vista Mes */}
      {vistaActual === 'mes' && (
        <div className="grid grid-cols-7 border-b border-[var(--border-color)] bg-[var(--bg-primary)]">
          {DIAS_SEMANA.map((dia) => (
            <div key={dia} className="py-2.5 text-center text-[11px] font-medium text-[var(--text-tertiary)] border-r border-[var(--border-color)] last:border-r-0 tracking-wide uppercase">
              {dia}
            </div>
          ))}
        </div>
      )}

      <div className="flex-1 min-h-0 overflow-hidden">
        {vistaActual === 'mes' && renderVistaMes()}
        {vistaActual === 'semana' && renderVistaSemana()}
        {vistaActual === 'dia' && renderVistaDia()}
        {vistaActual === 'anio' && renderVistaAnio()}
      </div>
    </div>
  )
}

export default GrillaCalendario
