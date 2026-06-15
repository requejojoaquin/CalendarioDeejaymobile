import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'
import { AuthProvider } from './context/AuthContext'
import { CalendarioProvider } from './context/CalendarioContext'
import { ModoOscuroProvider } from './context/ModoOscuroContext'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <AuthProvider>
      <ModoOscuroProvider>
        <CalendarioProvider>
          <App />
        </CalendarioProvider>
      </ModoOscuroProvider>
    </AuthProvider>
  </React.StrictMode>,
)
