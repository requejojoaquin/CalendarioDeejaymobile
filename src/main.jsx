import React from 'react'
import ReactDOM from 'react-dom/client'
import { MotionConfig } from 'framer-motion'
import App from './App.jsx'
import './index.css'
import { AuthProvider } from './context/AuthContext'
import { CalendarioProvider } from './context/CalendarioContext'
import { ModoOscuroProvider } from './context/ModoOscuroContext'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <MotionConfig reducedMotion="user">
      <AuthProvider>
        <ModoOscuroProvider>
          <CalendarioProvider>
            <App />
          </CalendarioProvider>
        </ModoOscuroProvider>
      </AuthProvider>
    </MotionConfig>
  </React.StrictMode>,
)
