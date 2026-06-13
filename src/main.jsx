import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'
import { AuthProvider } from './contexto/AuthContext'
import { CalendarioProvider } from './contexto/CalendarioContext'
import { ModoOscuroProvider } from './contexto/ModoOscuroContext'

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
