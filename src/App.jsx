import { AuthProvider, useAuth } from './contexto/AuthContext'
import Login from './componentes/Login'
import CalendarioPantallaPrincipal from './componentes/CalendarioPantallaPrincipal'

function Contenido() {
  const { usuario, cargando } = useAuth()

  if (cargando) return <div style={{ padding: '20px' }}>Cargando...</div>
  if (!usuario) return <Login />
  return <CalendarioPantallaPrincipal />
}

function App() {
  return (
    <AuthProvider>
      <Contenido />
    </AuthProvider>
  )
}

export default App