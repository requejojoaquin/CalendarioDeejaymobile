import { createContext, useContext, useState, useEffect } from 'react'

const ModoOscuroContext = createContext()

export const useModoOscuro = () => useContext(ModoOscuroContext)

export const ModoOscuroProvider = ({ children }) => {
  const [esOscuro, setEsOscuro] = useState(() => {
    const saved = localStorage.getItem('modo-oscuro')
    return saved === 'true'
  })

  useEffect(() => {
    localStorage.setItem('modo-oscuro', esOscuro)
    if (esOscuro) {
      document.documentElement.classList.add  ('dark')
      document.documentElement.style.colorScheme = 'dark'
    } else {
      document.documentElement.classList.remove('dark')
      document.documentElement.style.colorScheme = 'light'
    }
  }, [esOscuro])

  return (
    <ModoOscuroContext.Provider value={{ esOscuro, setEsOscuro }}>
      {children}
    </ModoOscuroContext.Provider>
  )
}
