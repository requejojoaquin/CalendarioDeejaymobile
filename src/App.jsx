import { AuthProvider, useAuth } from './contexto/AuthContext'
import { CalendarioProvider } from './contexto/CalendarioContext'
import Login from './componentes/Login'
import CalendarioPantallaPrincipal from './componentes/CalendarioPantallaPrincipal'

function Contenido() {
  const { usuario, cargando } = useAuth()

  if (cargando) return <div style={{ padding: '20px' }}>Cargando...</div>
  if (!usuario) return <Login />
  return (
    <CalendarioProvider>
      <CalendarioPantallaPrincipal />
    </CalendarioProvider>
  )
}

function App() {
  return (
    <AuthProvider>
      <Contenido />
    </AuthProvider>
  )
}

export default App