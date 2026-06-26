import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { signInWithEmailAndPassword, GoogleAuthProvider, signInWithPopup } from 'firebase/auth'
import { auth } from '../../services/firebase'
import { CalendarDays, Mail, Lock, Eye, EyeOff, Loader2, AlertCircle } from 'lucide-react'
import { popVariants, staggerContainer, fadeUpItem, tap } from '../../lib/motion'

// Swap animado de iconos (mostrar/ocultar contraseña, spinner→texto).
const iconSwap = {
  initial: { opacity: 0, scale: 0.8, filter: 'blur(4px)' },
  animate: { opacity: 1, scale: 1, filter: 'blur(0px)' },
  exit: { opacity: 0, scale: 0.8, filter: 'blur(4px)' },
}

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

// Traduce los códigos de error de Firebase a mensajes claros en español.
function mensajeDeError(code) {
  switch (code) {
    case 'auth/invalid-credential':
    case 'auth/wrong-password':
    case 'auth/user-not-found':
    case 'auth/invalid-email':
      return 'Email o contraseña incorrectos.'
    case 'auth/user-disabled':
      return 'Esta cuenta está deshabilitada.'
    case 'auth/too-many-requests':
      return 'Demasiados intentos. Probá de nuevo en unos minutos.'
    case 'auth/network-request-failed':
      return 'Error de conexión. Revisá tu internet.'
    default:
      return 'No pudimos iniciar sesión. Intentá nuevamente.'
  }
}

function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [mostrarPassword, setMostrarPassword] = useState(false)
  const [cargando, setCargando] = useState(false)
  const [error, setError] = useState('')
  // Errores de validación por campo (solo se muestran tras intentar enviar).
  const [errores, setErrores] = useState({ email: '', password: '' })

  const validar = () => {
    const nuevos = { email: '', password: '' }
    if (!email.trim()) {
      nuevos.email = 'Ingresá tu email.'
    } else if (!EMAIL_REGEX.test(email.trim())) {
      nuevos.email = 'Ingresá un email válido.'
    }
    if (!password) {
      nuevos.password = 'Ingresá tu contraseña.'
    }
    setErrores(nuevos)
    return !nuevos.email && !nuevos.password
  }

  const handleLogin = async (e) => {
    e.preventDefault()
    setError('')
    if (!validar()) return

    setCargando(true)
    try {
      await signInWithEmailAndPassword(auth, email.trim(), password)
    } catch (err) {
      setError(mensajeDeError(err?.code))
    } finally {
      setCargando(false)
    }
  }

  // Registra o inicia sesión con Google (mismo flujo de popup).
  const handleGoogle = async () => {
    setError('')
    setCargando(true)
    try {
      await signInWithPopup(auth, new GoogleAuthProvider())
    } catch {
      setError('No se pudo continuar con Google.')
    } finally {
      setCargando(false)
    }
  }

  return (
    <div
      className="min-h-screen w-full flex items-center justify-center px-4 py-10"
      style={{
        background:
          'radial-gradient(110% 110% at 50% 0%, var(--accent-soft) 0%, transparent 55%), var(--bg-primary)',
      }}
    >
      <motion.main
        className="w-full max-w-[440px] rounded-xl p-10"
        style={{
          backgroundColor: 'var(--bg-secondary)',
          border: '1px solid var(--border-color)',
          boxShadow: 'var(--shadow-lg)',
        }}
        variants={popVariants}
        initial="initial"
        animate="animate"
      >
        <motion.div variants={staggerContainer} initial="initial" animate="animate">
          {/* Encabezado */}
          <header className="flex flex-col items-center text-center mb-8">
            <motion.div
              className="flex items-center justify-center w-14 h-14 rounded-xl mb-4"
              style={{
                backgroundColor: 'var(--accent-soft)',
                color: 'var(--accent-color)',
              }}
              aria-hidden="true"
              variants={fadeUpItem}
            >
              <CalendarDays size={28} strokeWidth={2} />
            </motion.div>
            <motion.h1
              className="text-2xl font-semibold tracking-tight"
              style={{ color: 'var(--text-primary)' }}
              variants={fadeUpItem}
            >
              CalendarMobile
            </motion.h1>
            <motion.p
              className="mt-2 text-sm"
              style={{ color: 'var(--text-secondary)' }}
              variants={fadeUpItem}
            >
              Iniciá sesión para organizar tu día
            </motion.p>
          </header>

          {/* Mensaje de error global (Firebase) */}
          <AnimatePresence>
            {error && (
              <motion.div
                role="alert"
                className="flex items-start gap-2 rounded-lg px-4 py-3 mb-6 text-sm"
                style={{
                  backgroundColor: 'var(--danger-soft)',
                  color: 'var(--danger-color)',
                }}
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.2 }}
              >
                <AlertCircle size={18} className="shrink-0 mt-px" aria-hidden="true" />
                <span>{error}</span>
              </motion.div>
            )}
          </AnimatePresence>

          <form onSubmit={handleLogin} noValidate className="flex flex-col gap-6">
          {/* Campo: Email */}
          <motion.div className="flex flex-col gap-2" variants={fadeUpItem}>
            <label
              htmlFor="login-email"
              className="text-sm font-medium"
              style={{ color: 'var(--text-secondary)' }}
            >
              Email
            </label>
            <div className="relative">
              <Mail
                size={18}
                className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2"
                style={{ color: 'var(--text-tertiary)' }}
                aria-hidden="true"
              />
              <input
                id="login-email"
                type="email"
                inputMode="email"
                autoComplete="email"
                className="linear-input min-h-[44px] text-[15px]"
                style={{
                  paddingLeft: '44px',
                  borderColor: errores.email ? 'var(--danger-color)' : undefined,
                }}
                placeholder="tu@email.com"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value)
                  if (errores.email) setErrores((p) => ({ ...p, email: '' }))
                }}
                disabled={cargando}
                aria-invalid={!!errores.email}
                aria-describedby={errores.email ? 'login-email-error' : undefined}
              />
            </div>
            <AnimatePresence>
              {errores.email && (
                <motion.span
                  id="login-email-error"
                  className="text-xs"
                  style={{ color: 'var(--danger-color)' }}
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                  transition={{ duration: 0.18 }}
                >
                  {errores.email}
                </motion.span>
              )}
            </AnimatePresence>
          </motion.div>

          {/* Campo: Contraseña */}
          <motion.div className="flex flex-col gap-2" variants={fadeUpItem}>
            <label
              htmlFor="login-password"
              className="text-sm font-medium"
              style={{ color: 'var(--text-secondary)' }}
            >
              Contraseña
            </label>
            <div className="relative">
              <Lock
                size={18}
                className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2"
                style={{ color: 'var(--text-tertiary)' }}
                aria-hidden="true"
              />
              <input
                id="login-password"
                type={mostrarPassword ? 'text' : 'password'}
                autoComplete="current-password"
                className="linear-input min-h-[44px] text-[15px]"
                style={{
                  paddingLeft: '44px',
                  paddingRight: '44px',
                  borderColor: errores.password ? 'var(--danger-color)' : undefined,
                }}
                placeholder="Tu contraseña"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value)
                  if (errores.password) setErrores((p) => ({ ...p, password: '' }))
                }}
                disabled={cargando}
                aria-invalid={!!errores.password}
                aria-describedby={errores.password ? 'login-password-error' : undefined}
              />
              <motion.button
                type="button"
                onClick={() => setMostrarPassword((v) => !v)}
                className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center justify-center w-8 h-8 rounded-lg transition-colors"
                style={{ color: 'var(--text-tertiary)' }}
                aria-label={mostrarPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                aria-pressed={mostrarPassword}
                tabIndex={0}
                whileTap={tap}
              >
                <AnimatePresence mode="wait" initial={false}>
                  <motion.span
                    key={mostrarPassword ? 'off' : 'on'}
                    variants={iconSwap}
                    initial="initial"
                    animate="animate"
                    exit="exit"
                    transition={{ duration: 0.15 }}
                    className="flex"
                  >
                    {mostrarPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </motion.span>
                </AnimatePresence>
              </motion.button>
            </div>
            <AnimatePresence>
              {errores.password && (
                <motion.span
                  id="login-password-error"
                  className="text-xs"
                  style={{ color: 'var(--danger-color)' }}
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                  transition={{ duration: 0.18 }}
                >
                  {errores.password}
                </motion.span>
              )}
            </AnimatePresence>
          </motion.div>

          {/* Botón de envío */}
          <motion.button
            type="submit"
            disabled={cargando}
            variants={fadeUpItem}
            whileTap={cargando ? undefined : tap}
            className="group mt-1 inline-flex items-center justify-center gap-2 w-full rounded-[var(--radius-md)] px-5 min-h-[44px] text-sm font-medium transition-colors focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-70"
            style={{
              backgroundColor: 'var(--accent-color)',
              color: 'var(--accent-contrast)',
              boxShadow: 'var(--shadow-sm)',
            }}
            onMouseEnter={(e) => {
              if (!cargando) e.currentTarget.style.backgroundColor = 'var(--accent-hover)'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'var(--accent-color)'
            }}
            onFocus={(e) => {
              e.currentTarget.style.boxShadow = 'var(--ring-accent), var(--shadow-sm)'
            }}
            onBlur={(e) => {
              e.currentTarget.style.boxShadow = 'var(--shadow-sm)'
            }}
          >
            <AnimatePresence mode="wait" initial={false}>
              {cargando ? (
                <motion.span
                  key="cargando"
                  className="flex items-center gap-2"
                  variants={iconSwap}
                  initial="initial"
                  animate="animate"
                  exit="exit"
                  transition={{ duration: 0.15 }}
                >
                  <Loader2 size={18} className="animate-spin-slow" aria-hidden="true" />
                  <span>Iniciando sesión…</span>
                </motion.span>
              ) : (
                <motion.span
                  key="idle"
                  variants={iconSwap}
                  initial="initial"
                  animate="animate"
                  exit="exit"
                  transition={{ duration: 0.15 }}
                >
                  Iniciar sesión
                </motion.span>
              )}
            </AnimatePresence>
          </motion.button>
          </form>

          {/* Divisor "o" entre el form y el acceso con Google */}
          <motion.div
            className="flex items-center gap-3 my-6"
            variants={fadeUpItem}
            aria-hidden="true"
          >
            <span className="h-px flex-1" style={{ backgroundColor: 'var(--border-color)' }} />
            <span className="text-xs font-medium" style={{ color: 'var(--text-tertiary)' }}>
              o
            </span>
            <span className="h-px flex-1" style={{ backgroundColor: 'var(--border-color)' }} />
          </motion.div>

          {/* Acceso con Google (registra o inicia sesión con el mismo flujo) */}
          <motion.button
            type="button"
            onClick={handleGoogle}
            disabled={cargando}
            variants={fadeUpItem}
            whileTap={cargando ? undefined : tap}
            className="inline-flex items-center justify-center gap-2 w-full rounded-[var(--radius-md)] px-5 min-h-[44px] text-sm font-medium transition-colors focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50"
            style={{
              backgroundColor: 'var(--bg-primary)',
              color: 'var(--text-primary)',
              border: '1px solid var(--border-color)',
            }}
            onMouseEnter={(e) => {
              if (!cargando) e.currentTarget.style.backgroundColor = 'var(--hover-color)'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'var(--bg-primary)'
            }}
            onFocus={(e) => {
              e.currentTarget.style.boxShadow = 'var(--ring-accent)'
            }}
            onBlur={(e) => {
              e.currentTarget.style.boxShadow = 'none'
            }}
          >
            <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true" className="shrink-0">
              <path
                fill="#4285F4"
                d="M17.64 9.205c0-.639-.057-1.252-.164-1.841H9v3.481h4.844a4.14 4.14 0 0 1-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615Z"
              />
              <path
                fill="#34A853"
                d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18Z"
              />
              <path
                fill="#FBBC05"
                d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332Z"
              />
              <path
                fill="#EA4335"
                d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58Z"
              />
            </svg>
            <span>Continuar con Google</span>
          </motion.button>
        </motion.div>
      </motion.main>
    </div>
  )
}

export default Login
