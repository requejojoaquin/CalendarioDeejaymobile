const DIAS_MINI = ['D', 'L', 'M', 'X', 'J', 'V', 'S']
const MESES = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre']

function Sidebar({ mesActual, anioActual, onDiaClick, onCrearEvento, onMesAnterior, onMesSiguiente }) {
  const hoy = new Date()

  const generarDiasMini = () => {
    const primerDia = new Date(anioActual, mesActual, 1).getDay()
    const diasEnMes = new Date(anioActual, mesActual + 1, 0).getDate()
    const dias = []
    for (let i = 0; i < primerDia; i++) dias.push(null)
    for (let i = 1; i <= diasEnMes; i++) dias.push(i)
    return dias
  }

  const dias = generarDiasMini()

  return (
    <div style={{
      width: '256px',
      flexShrink: 0,
      borderRight: '1px solid #dadce0',
      display: 'flex',
      flexDirection: 'column',
      padding: '16px',
      gap: '16px'
    }}>

      {/* Botón Crear */}
      <button
        onClick={onCrearEvento}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          padding: '12px 16px',
          borderRadius: '24px',
          border: 'none',
          backgroundColor: 'white',
          boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
          cursor: 'pointer',
          fontSize: '14px',
          color: '#3c4043',
          fontWeight: '500'
        }}
      >
        <span style={{ fontSize: '20px' }}>+</span>
        Crear
      </button>

      {/* Mini calendario */}
      <div>

        {/* Navegación mini */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '8px'
        }}>
          <span style={{ fontSize: '13px', fontWeight: '500', color: '#3c4043' }}>
            {MESES[mesActual].slice(0, 3)} {anioActual}
          </span>
          <div style={{ display: 'flex', gap: '4px' }}>
            <button
              onClick={onMesAnterior}
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                padding: '4px',
                borderRadius: '50%',
                fontSize: '14px',
                color: '#3c4043'
              }}
            >
              ‹
            </button>
            <button
              onClick={onMesSiguiente}
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                padding: '4px',
                borderRadius: '50%',
                fontSize: '14px',
                color: '#3c4043'
              }}
            >
              ›
            </button>
          </div>
        </div>

        {/* Cabecera días */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(7, 1fr)',
          marginBottom: '4px'
        }}>
          {DIAS_MINI.map(dia => (
            <div key={dia} style={{
              textAlign: 'center',
              fontSize: '11px',
              color: '#70757a',
              padding: '2px 0'
            }}>
              {dia}
            </div>
          ))}
        </div>

        {/* Días del mini calendario */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(7, 1fr)',
          gap: '2px'
        }}>
          {dias.map((dia, index) => {
            const esHoy = dia === hoy.getDate() &&
              mesActual === hoy.getMonth() &&
              anioActual === hoy.getFullYear()

            return (
              <div
                key={index}
                onClick={() => dia && onDiaClick(dia)}
                style={{
                  width: '28px',
                  height: '28px',
                  lineHeight: '28px',
                  textAlign: 'center',
                  borderRadius: '50%',
                  fontSize: '11px',
                  cursor: dia ? 'pointer' : 'default',
                  backgroundColor: esHoy ? '#1a73e8' : 'transparent',
                  color: esHoy ? 'white' : dia ? '#3c4043' : 'transparent',
                  fontWeight: esHoy ? '600' : '400'
                }}
              >
                {dia || ''}
              </div>
            )
          })}
        </div>

      </div>
    </div>
  )
}

export default Sidebar