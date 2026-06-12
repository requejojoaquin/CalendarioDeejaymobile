import { createContext, useContext, useEffect, useState } from 'react'
import { onAuthStateChanged } from 'firebase/auth'
import { doc, getDoc } from 'firebase/firestore'
import { auth, db } from '../red/firebase'

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
        if (docSnap.exists()) {
          setRol(docSnap.data().role)
        }
        setUsuario(user)
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