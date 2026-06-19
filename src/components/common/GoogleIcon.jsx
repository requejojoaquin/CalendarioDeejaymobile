import { useModoOscuro } from '../../context/ModoOscuroContext'

// Importaciones de imágenes (Vite las maneja como URLs)
import addLight from '../../assets/recursos/add_24dp_000000_FILL0_wght400_GRAD0_opsz24.png'
import addDark from '../../assets/recursos/add_24dp_E3E3E3_FILL0_wght400_GRAD0_opsz24.png'
import backLight from '../../assets/recursos/arrow_back_ios_new_24dp_000000_FILL0_wght400_GRAD0_opsz24.png'
import backDark from '../../assets/recursos/arrow_back_ios_new_24dp_E3E3E3_FILL0_wght400_GRAD0_opsz24.png'
import closeLight from '../../assets/recursos/close_24dp_000000_FILL0_wght400_GRAD0_opsz24.png'
import closeDark from '../../assets/recursos/close_24dp_999999_FILL0_wght400_GRAD0_opsz24.png'
import deleteLight from '../../assets/recursos/delete_24dp_000000_FILL0_wght400_GRAD0_opsz24.png'
import deleteDark from '../../assets/recursos/delete_24dp_E3E3E3_FILL0_wght400_GRAD0_opsz24.png'
import menuLight from '../../assets/recursos/menu_24dp_000000_FILL0_wght400_GRAD0_opsz24.png'
import menuDark from '../../assets/recursos/menu_24dp_E3E3E3_FILL0_wght400_GRAD0_opsz24.png'
import searchLight from '../../assets/recursos/search_24dp_000000_FILL0_wght400_GRAD0_opsz24.png'
import searchDark from '../../assets/recursos/search_24dp_E3E3E3_FILL0_wght400_GRAD0_opsz24.png'
import settingsLight from '../../assets/recursos/settings_24dp_000000_FILL0_wght400_GRAD0_opsz24.png'
import settingsDark from '../../assets/recursos/settings_24dp_E3E3E3_FILL0_wght400_GRAD0_opsz24.png'
import homeLight from '../../assets/recursos/home_24dp_000000_FILL0_wght400_GRAD0_opsz24.png'

const iconMap = {
  add: { light: addLight, dark: addDark },
  back: { light: backLight, dark: backDark },
  close: { light: closeLight, dark: closeDark },
  delete: { light: deleteLight, dark: deleteDark },
  menu: { light: menuLight, dark: menuDark },
  search: { light: searchLight, dark: searchDark },
  settings: { light: settingsLight, dark: settingsDark },
  home: { light: homeLight, dark: homeLight }, // No hay homeDark, usamos el mismo o uno similar
}

function GoogleIcon({ name, size = 24, className = "" }) {
  const { esOscuro } = useModoOscuro()
  const icons = iconMap[name]
  
  if (!icons) return null
  
  const src = esOscuro ? icons.dark : icons.light
  
  // Si estamos en modo oscuro y el icono no tiene versión específica (como home), invertimos el color
  const filterStyle = (esOscuro && name === 'home') ? { filter: 'invert(1) brightness(2)' } : {}

  return (
    <img 
      src={src} 
      alt={name} 
      style={{ width: size, height: size, ...filterStyle }} 
      className={`select-none pointer-events-none ${className}`} 
    />
  )
}

export default GoogleIcon
