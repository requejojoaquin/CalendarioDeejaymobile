import { createContext, useContext, useEffect, useState } from 'react'
import { onAuthStateChanged } from 'firebase/auth'
import { doc, getDoc, addDoc, collection } from 'firebase/firestore'
import { auth, db } from '../services/firebase'
import { registrarLog } from '../services/logger'

const AuthContext = createContext()

export function AuthProvider({ children }) {
  const [usuario, setUsuario] = useState(null)
  const [rol, setRol] = useState(null)
  const [cargando, setCargando] = useState(true)

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (user) {
        const docRef = doc(db, 'users', user.uid)
        const docSnap = await getDoc(docRef)
        let userRol = null
        if (docSnap.exists()) {
          userRol = docSnap.data().role
          setRol(userRol)
        }
        setUsuario(user)

        // Registrar Log de Inicio de Sesión usando el logger centralizado
        await registrarLog('LOGIN', {
          usuario: user.email,
          rol: userRol
        })
      } else {
        setUsuario(null)
        setRol(null)
      }
      setCargando(false)
    })
    return () => unsub()
  }, [])

  return (
    <AuthContext.Provider value={{ usuario, rol, cargando }}>
      {children}
    </AuthContext.Provider>
  )
}

// Hook para usar en cualquier componente
export function useAuth() {
  return useContext(AuthContext)
}