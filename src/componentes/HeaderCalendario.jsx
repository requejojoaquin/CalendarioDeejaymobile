const MESES = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre']

function HeaderCalendario({ mesActual, anioActual, onHoy, onAnterior, onSiguiente, onToggleSidebar, vistaActual, onCambiarVista }) {

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      padding: '8px 16px',
      borderBottom: '1px solid #dadce0',
      gap: '12px',
      height: '64px',
      flexShrink: 0
    }}>

      {/* Botón hamburguesa */}
      <button
        onClick={onToggleSidebar}
        style={{
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          padding: '8px',
          borderRadius: '50%',
          fontSize: '18px',
          color: '#3c4043'
        }}
      >
        ☰
      </button>

      {/* Logo / Título */}
      <span style={{ fontSize: '22px', color: '#3c4043', fontWeight: '400', marginRight: '8px' }}>
        Calendario
      </span>

      {/* Botón Hoy */}
      <button
        onClick={onHoy}
        style={{
          padding: '8px 16px',
          border: '1px solid #dadce0',
          borderRadius: '4px',
          background: 'white',
          cursor: 'pointer',
          fontSize: '14px',
          color: '#3c4043'
        }}
      >
        Hoy
      </button>

      {/* Flechas navegación */}
      <div style={{ display: 'flex', gap: '4px' }}>
        <button
          onClick={onAnterior}
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            padding: '8px',
            borderRadius: '50%',
            fontSize: '16px',
            color: '#3c4043'
          }}
        >
          ‹
        </button>
        <button
          onClick={onSiguiente}
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            padding: '8px',
            borderRadius: '50%',
            fontSize: '16px',
            color: '#3c4043'
          }}
        >
          ›
        </button>
      </div>

      {/* Mes y año actual */}
      <span style={{ fontSize: '22px', color: '#3c4043', fontWeight: '400', flex: 1 }}>
        {MESES[mesActual]} {anioActual}
      </span>

      {/* Selector de vista */}
      <select
        value={vistaActual}
        onChange={(e) => onCambiarVista(e.target.value)}
        style={{
          padding: '8px 12px',
          border: '1px solid #dadce0',
          borderRadius: '4px',
          fontSize: '14px',
          color: '#3c4043',
          cursor: 'pointer',
          background: 'white'
        }}
      >
        <option value="mes">Mes</option>
        <option value="semana">Semana</option>
        <option value="dia">Día</option>
        <option value="anio">Año</option>
      </select>

    </div>
  )
}

export default HeaderCalendario