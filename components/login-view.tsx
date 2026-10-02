'use client'

import { useState } from 'react'
import {
  LayoutGrid, Mail, Lock, Eye, EyeOff, ArrowRight, ShieldCheck,
  AlertCircle, HelpCircle, X, Loader2, CheckCircle2
} from 'lucide-react'

export interface UserProfile {
  name: string
  initials: string
  career: string
  email: string
  role?: string
}

interface LoginViewProps {
  onLogin: (user: UserProfile) => void
}

export default function LoginView({ onLogin }: LoginViewProps) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [rememberMe, setRememberMe] = useState(true)
  const [isLoading, setIsLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')

  // Modal recuperación de contraseña
  const [forgotModal, setForgotModal] = useState(false)
  const [forgotEmail, setForgotEmail] = useState('')
  const [forgotSuccess, setForgotSuccess] = useState(false)

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMessage('')

    if (!email.trim()) {
      setErrorMessage('Por favor ingresa tu correo institucional o matrícula.')
      return
    }

    if (!password.trim()) {
      setErrorMessage('Por favor ingresa tu contraseña.')
      return
    }

    setIsLoading(true)
    setTimeout(() => {
      setIsLoading(false)
      const cleanEmail = email.trim().toLowerCase()
      let name = 'Estudiante UTOM'
      let initials = 'EU'
      let career = 'TI'

      if (cleanEmail.includes('mariana') || cleanEmail.includes('ml')) {
        name = 'Mariana López'
        initials = 'ML'
        career = 'TI'
      } else if (cleanEmail.includes('carlos') || cleanEmail.includes('cm')) {
        name = 'Carlos Méndez'
        initials = 'CM'
        career = 'MEC'
      } else {
        const userPart = cleanEmail.split('@')[0]
        name = userPart.charAt(0).toUpperCase() + userPart.slice(1).replace('.', ' ')
        initials = name.substring(0, 2).toUpperCase()
      }

      onLogin({
        name,
        initials,
        career,
        email: cleanEmail.includes('@') ? cleanEmail : `${cleanEmail}@utom.edu.mx`,
        role: 'Estudiante UTOM'
      })
    }, 500)
  }

  const handleQuickDemo = (profile: UserProfile) => {
    setIsLoading(true)
    setTimeout(() => {
      setIsLoading(false)
      onLogin(profile)
    }, 300)
  }

  const handleForgotSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!forgotEmail.trim()) return
    setForgotSuccess(true)
  }

  return (
    <div className="min-h-screen bg-[#f6f8f8] text-slate-900 flex flex-col justify-between selection:bg-emerald-500 selection:text-white">
      {/* Barra superior con identidad institucional */}
      <header className="border-b border-slate-200 bg-white/95 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-5xl items-center justify-between px-4 sm:px-6">
          <div className="flex items-center gap-2.5">
            <div className="flex size-9 items-center justify-center rounded-xl bg-emerald-600 text-white shadow-sm shadow-emerald-600/20">
              <LayoutGrid size={18} />
            </div>
            <div>
              <div className="text-lg font-bold tracking-tight text-slate-900">
                Wiki <span className="text-emerald-600">UTOM</span>
              </div>
              <div className="text-[10px] font-semibold uppercase tracking-[.18em] text-slate-400">
                Comunidad estudiantil
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 rounded-full border border-emerald-100 bg-emerald-50/80 px-3 py-1 text-xs font-medium text-emerald-800">
            <span className="size-2 rounded-full bg-emerald-500 animate-pulse" />
            Portal Institucional
          </div>
        </div>
      </header>

      {/* Contenedor centralizado para el panel de credenciales */}
      <main className="flex-1 flex items-center justify-center p-4 sm:p-6 my-auto">
        <div className="w-full max-w-md">

          {/* Tarjeta de login centrada */}
          <div className="relative rounded-2xl border border-slate-200 bg-white p-6 sm:p-8 shadow-xl shadow-slate-200/60 overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-emerald-500 via-emerald-600 to-teal-500" />

            {/* Cabecera del formulario */}
            <div className="text-center mb-6">
              <h1 className="text-2xl font-bold tracking-tight text-slate-900">
                Iniciar sesión
              </h1>
              <p className="mt-1 text-xs sm:text-sm text-slate-500">
                Ingresa con tu correo institucional @utom.edu.mx o matrícula
              </p>
            </div>

            {/* Alerta de error */}
            {errorMessage && (
              <div className="mb-4 flex items-start gap-2.5 rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-800">
                <AlertCircle size={16} className="text-rose-600 shrink-0 mt-0.5" />
                <span>{errorMessage}</span>
              </div>
            )}

            {/* Formulario */}
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                  matrícula
                </label>
                <div className="relative">
                  <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-400">
                    <Mail size={17} />
                  </div>
                  <input
                    type="text"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder=""
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-10 pr-4 text-sm text-slate-900 outline-none transition focus:border-emerald-500 focus:bg-white focus:ring-2 focus:ring-emerald-500/20"
                    autoComplete="username"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                    Contraseña
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      setForgotModal(true)
                      setForgotSuccess(false)
                    }}
                    className="text-xs font-semibold text-emerald-700 hover:text-emerald-800 hover:underline cursor-pointer"
                  >
                    ¿Olvidaste tu contraseña?
                  </button>
                </div>
                <div className="relative">
                  <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-400">
                    <Lock size={17} />
                  </div>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••••••"
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-10 pr-11 text-sm text-slate-900 outline-none transition focus:border-emerald-500 focus:bg-white focus:ring-2 focus:ring-emerald-500/20"
                    autoComplete="current-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 flex items-center pr-3 text-slate-400 hover:text-slate-600 cursor-pointer"
                    aria-label="Ver u ocultar contraseña"
                  >
                    {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between pt-0.5">
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="size-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 accent-emerald-600"
                  />
                  <span className="text-xs text-slate-600">Recordarme en este equipo</span>
                </label>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full mt-2 flex items-center justify-center gap-2 rounded-xl bg-emerald-600 py-3 px-4 text-sm font-semibold text-white shadow-md shadow-emerald-600/20 hover:bg-emerald-700 focus:ring-2 focus:ring-emerald-500/40 transition disabled:opacity-70 cursor-pointer"
              >
                {isLoading ? (
                  <>
                    <Loader2 size={18} className="animate-spin" />
                    Iniciando sesión...
                  </>
                ) : (
                  <>
                    Ingresar a Wiki UTOM
                    <ArrowRight size={17} />
                  </>
                )}
              </button>
            </form>

            {/* Separador */}
            <div className="relative my-6 text-center">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-slate-200" />
              </div>
              <span className="relative bg-white px-3 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                Acceso rápido demo
              </span>
            </div>

            {/* Accesos rápidos de prueba */}
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() =>
                  handleQuickDemo({
                    name: 'Mariana López',
                    initials: 'ML',
                    career: 'TI',
                    email: 'mariana.lopez@utom.edu.mx',
                    role: 'Estudiante TI'
                  })
                }
                className="flex flex-col items-center justify-center rounded-xl border border-slate-200 bg-slate-50/80 p-2.5 text-center transition hover:bg-emerald-50/80 hover:border-emerald-300 cursor-pointer"
              >
                <div className="flex size-7 items-center justify-center rounded-full bg-emerald-100 text-emerald-800 text-xs font-bold mb-1">
                  ML
                </div>
                <span className="text-xs font-bold text-slate-800">Mariana López</span>
                <span className="text-[10px] text-slate-400">TI · 5to</span>
              </button>

              <button
                type="button"
                onClick={() =>
                  handleQuickDemo({
                    name: 'Carlos Méndez',
                    initials: 'CM',
                    career: 'MEC',
                    email: 'carlos.mendez@utom.edu.mx',
                    role: 'Estudiante MEC'
                  })
                }
                className="flex flex-col items-center justify-center rounded-xl border border-slate-200 bg-slate-50/80 p-2.5 text-center transition hover:bg-blue-50/80 hover:border-blue-300 cursor-pointer"
              >
                <div className="flex size-7 items-center justify-center rounded-full bg-blue-100 text-blue-800 text-xs font-bold mb-1">
                  CM
                </div>
                <span className="text-xs font-bold text-slate-800">Carlos Méndez</span>
                <span className="text-[10px] text-slate-400">Mecatrónica · 7mo</span>
              </button>
            </div>

            <div className="mt-6 flex items-center justify-center gap-1.5 text-[11px] text-slate-400">
              <ShieldCheck size={14} className="text-emerald-600" />
              <span>Autenticación institucional de la comunidad UTOM</span>
            </div>
          </div>

        </div>
      </main>

      {/* Pie de página institucional */}
      <footer className="border-t border-slate-200 bg-white py-3.5 px-4 text-center text-xs text-slate-400">
        <div className="mx-auto max-w-5xl flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>Universidad Tecnológica del Oriente de Michoacán · Wiki UTOM</span>
          <div className="flex items-center gap-3 text-[11px]">
            <a href="#rules" className="hover:text-emerald-700">Guía de convivencia</a>
            <span>·</span>
            <a href="#privacy" className="hover:text-emerald-700">Privacidad</a>
          </div>
        </div>
      </footer>

      {/* Modal: Recuperación de contraseña */}
      {forgotModal && (
        <div
          className="fixed inset-0 z-30 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4"
          role="dialog"
          aria-modal="true"
        >
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl border border-slate-100 relative">
            <button
              onClick={() => setForgotModal(false)}
              className="absolute top-4 right-4 rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 cursor-pointer"
              aria-label="Cerrar modal"
            >
              <X size={18} />
            </button>

            <div className="flex size-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 mb-3">
              <HelpCircle size={20} />
            </div>

            <h3 className="text-base font-bold text-slate-900">
              Recuperar contraseña
            </h3>
            <p className="mt-1 text-xs text-slate-500 leading-relaxed">
              Ingresa tu correo institucional registrado (@utom.edu.mx).
            </p>

            {forgotSuccess ? (
              <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 p-3.5 text-xs text-emerald-800">
                <div className="flex items-center gap-1.5 font-bold mb-1">
                  <CheckCircle2 size={15} className="text-emerald-600" />
                  Enlace enviado
                </div>
                Revisa tu bandeja de entrada en tu correo institucional.
                <button
                  onClick={() => setForgotModal(false)}
                  className="mt-3 block w-full rounded-lg bg-emerald-600 py-2 text-center text-xs font-semibold text-white hover:bg-emerald-700 cursor-pointer"
                >
                  Entendido
                </button>
              </div>
            ) : (
              <form onSubmit={handleForgotSubmit} className="mt-4 space-y-3">
                <input
                  type="email"
                  required
                  value={forgotEmail}
                  onChange={(e) => setForgotEmail(e.target.value)}
                  placeholder="usuario@utom.edu.mx"
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2 px-3 text-xs text-slate-900 outline-none transition focus:border-emerald-500 focus:bg-white focus:ring-1 focus:ring-emerald-500"
                />
                <div className="flex justify-end gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setForgotModal(false)}
                    className="rounded-lg px-3 py-1.5 text-xs font-semibold text-slate-500 hover:bg-slate-100 cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700 shadow-sm cursor-pointer"
                  >
                    Enviar enlace
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
