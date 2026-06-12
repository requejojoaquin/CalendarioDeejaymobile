const DIAS = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb']
const MESES = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre']
const MESES_CORTO = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun',
  'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic']
const HORAS = ['1:00','2:00','3:00','4:00','5:00','6:00','7:00','8:00','9:00','10:00','11:00','12:00','13:00','14:00','15:00','16:00','17:00','18:00','19:00','20:00','21:00','22:00','23:00']

function VistaMes({ mesActual, anioActual, onDiaClick }) {
  const hoy = new Date()
  const primerDia = new Date(anioActual, mesActual, 1).getDay()
  const diasEnMes = new Date(anioActual, mesActual + 1, 0).getDate()
  const dias = []
  for (let i = 0; i < primerDia; i++) dias.push(null)
  for (let i = 1; i <= diasEnMes; i++) dias.push(i)

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', borderBottom: '1px solid #dadce0' }}>
        {DIAS.map(dia => (
          <div key={dia} style={{ padding: '10px 0', textAlign: 'center', fontSize: '18px', color: '#000000', fontWeight: '500' }}>
            {dia}
          </div>
        ))}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gridAutoRows: '1fr', flex: 1, borderLeft: '1px solid #dadce0' }}>
        {dias.map((dia, index) => {
          const esHoy = dia === hoy.getDate() && mesActual === hoy.getMonth() && anioActual === hoy.getFullYear()
          return (
            <div key={index} onClick={() => dia && onDiaClick(dia)}
              style={{ borderRight: '1px solid #5e5a5a', borderBottom: '1px solid #535151', padding: '4px', minHeight: '100px', cursor: dia ? 'pointer' : 'default', backgroundColor: '#ffffff' }}>
              {dia && (
                <div style={{ width: '24px', height: '24px', lineHeight: '24px', textAlign: 'center', borderRadius: '50%', fontSize: '12px', fontWeight: esHoy ? '600' : '400', backgroundColor: esHoy ? 'const ' : 'transparent', color: esHoy ? 'white' : '#3c4043', margin: '2px' }}>
                  {dia}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

function VistaSemana({ mesActual, anioActual, diaSeleccionado }) {
  const hoy = new Date()
  const diaBase = new Date(anioActual, mesActual, diaSeleccionado || hoy.getDate())
  const diaSemana = diaBase.getDay()
  const diasSemana = []
  for (let i = 0; i < 7; i++) {
    const d = new Date(diaBase)
    d.setDate(diaBase.getDate() - diaSemana + i)
    diasSemana.push(d)
  }

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      {/* Cabecera días */}
      <div style={{ display: 'grid', gridTemplateColumns: '60px repeat(7, 1fr)', borderBottom: '1px solid #dadce0' }}>
        <div />
        {diasSemana.map((d, i) => {
          const esHoy = d.toDateString() === hoy.toDateString()
          return (
            <div key={i} style={{ textAlign: 'center', padding: '8px 0' }}>
              <div style={{ fontSize: '11px', color: '#0c0d0d' }}>{DIAS[d.getDay()]}</div>
              <div style={{ width: '32px', height: '32px', lineHeight: '32px', borderRadius: '50%', margin: '0 auto', fontSize: '24px', fontWeight: esHoy ? '600' : '400', backgroundColor: esHoy ? '#1a73e8' : 'transparent', color: esHoy ? 'white' : '#3c4043' }}>
                {d.getDate()}
              </div>
            </div>
          )
        })}
      </div>
      {/* Horas */}
      <div style={{ flex: 1, overflowY: 'auto' }}>
        {HORAS.map((hora, hi) => (
          <div key={hi} style={{ display: 'grid', gridTemplateColumns: '60px repeat(7, 1fr)', borderBottom: '1px solid #f1f3f4', minHeight: '48px' }}>
            <div style={{ fontSize: '12px', color: '#000000', textAlign: 'right', paddingRight: '8px', paddingTop: '4px' }}>{hora}</div>
            {diasSemana.map((_, di) => (
              <div key={di} style={{ borderLeft: '1px solid #dadce0' }} />
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}

function VistaDia({ mesActual, anioActual, diaSeleccionado }) {
  const hoy = new Date()
  const dia = new Date(anioActual, mesActual, diaSeleccionado || hoy.getDate())
  const esHoy = dia.toDateString() === hoy.toDateString()

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      {/* Cabecera */}
      <div style={{ display: 'grid', gridTemplateColumns: '60px 1fr', borderBottom: '1px solid #dadce0', padding: '8px 0' }}>
        <div />
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '16px', color: '#000000' }}>{DIAS[dia.getDay()]}</div>
          <div style={{ width: '48px', height: '48px', lineHeight: '48px', borderRadius: '50%', margin: '0 auto', fontSize: '32px', fontWeight: '400', backgroundColor: esHoy ? '#1a73e8' : 'transparent', color: esHoy ? 'white' : '#3c4043' }}>
            {dia.getDate()}
          </div>
        </div>
      </div>
      {/* Horas */}
      <div style={{ flex: 1, overflowY: 'auto' }}>
        {HORAS.map((hora, hi) => (
          <div key={hi} style={{ display: 'grid', gridTemplateColumns: '60px 1fr', borderBottom: '1px solid #f1f3f4', minHeight: '48px' }}>
            <div style={{ fontSize: '12px', color: '#000000', textAlign: 'right', paddingRight: '8px', paddingTop: '4px' }}>{hora}</div>
            <div style={{ borderLeft: '1px solid #dadce0' }} />
          </div>
        ))}
      </div>
    </div>
  )
}

function VistaAnio({ anioActual, onMesClick }) {
  const hoy = new Date()

  return (
    <div style={{ flex: 1, overflowY: 'auto', padding: '16px' }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '24px' }}>
        {Array.from({ length: 12 }, (_, mesIdx) => {
          const primerDia = new Date(anioActual, mesIdx, 1).getDay()
          const diasEnMes = new Date(anioActual, mesIdx + 1, 0).getDate()
          const dias = []
          for (let i = 0; i < primerDia; i++) dias.push(null)
          for (let i = 1; i <= diasEnMes; i++) dias.push(i)

          return (
            <div key={mesIdx}>
              <div onClick={() => onMesClick(mesIdx)} style={{ fontSize: '22px', fontWeight: '500', color: '#3c4043', marginBottom: '8px', cursor: 'pointer' }}>
                {MESES[mesIdx]}
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '1px' }}>
                {['D','L','M','X','J','V','S'].map(d => (
                  <div key={d} style={{ textAlign: 'center', fontSize: '13px', color: '#000000', paddingBottom: '4px' }}>{d}</div>
                ))}
                {dias.map((dia, i) => {
                  const esHoy = dia === hoy.getDate() && mesIdx === hoy.getMonth() && anioActual === hoy.getFullYear()
                  return (
                    <div key={i} style={{ textAlign: 'center', fontSize: '12px', width: '20px', height: '20px', lineHeight: '20px', borderRadius: '50%', margin: '0 auto', backgroundColor: esHoy ? '#1a73e8' : 'transparent', color: esHoy ? 'white' : dia ? '#3c4043' : 'transparent', fontWeight: esHoy ? '600' : '400' }}>
                      {dia || ''}
                    </div>
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function GrillaCalendario({ mesActual, anioActual, onDiaClick, vistaActual, onCambiarVista, diaSeleccionado }) {
  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      {vistaActual === 'mes' && <VistaMes mesActual={mesActual} anioActual={anioActual} onDiaClick={onDiaClick} />}
      {vistaActual === 'semana' && <VistaSemana mesActual={mesActual} anioActual={anioActual} diaSeleccionado={diaSeleccionado} />}
      {vistaActual === 'dia' && <VistaDia mesActual={mesActual} anioActual={anioActual} diaSeleccionado={diaSeleccionado} />}
      {vistaActual === 'anio' && <VistaAnio anioActual={anioActual} onMesClick={(mes) => { onCambiarVista('mes') }} />}
    </div>
  )
}

export default GrillaCalendario