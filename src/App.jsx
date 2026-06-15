import { useAuth } from './context/AuthContext'
import Login from './components/auth/Login'
import CalendarioPantallaPrincipal from './layouts/CalendarioPantallaPrincipal'

function Contenido() {
  const { usuario, cargando } = useAuth()

  if (cargando) return <div style={{ padding: '20px' }}>Cargando...</div>
  if (!usuario) return <Login />
  return (
    <CalendarioPantallaPrincipal />
  )
}

function App() {
  return (
    <Contenido />
  )
}

export default App