'use client'

import { useState } from 'react'
import {
  LayoutGrid, Mail, Lock, Eye, EyeOff, ArrowRight, ShieldCheck,
  Sparkles, CheckCircle2, AlertCircle, HelpCircle, School,
  GraduationCap, BookOpen, Users, TrendingUp, X, Loader2
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
  const [showPassword, setShowPassword] = useState(false)
  const [rememberMe, setRememberMe] = useState(true)
  const [isLoading, setIsLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const [forgotModal, setForgotModal] = useState(false)
  const [forgotEmail, setForgotEmail] = useState('')
  const [forgotSuccess, setForgotSuccess] = useState(false)

  // Login form state
  const [loginEmail, setLoginEmail] = useState('')
  const [loginPassword, setLoginPassword] = useState('')

  const handleLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMessage('')

    if (!loginEmail.trim()) {
      setErrorMessage('Por favor ingresa tu correo institucional o matrícula.')
      return
    }

    if (!loginPassword.trim()) {
      setErrorMessage('Por favor ingresa tu contraseña.')
      return
    }

    setIsLoading(true)
    setTimeout(() => {
      setIsLoading(false)
      const cleanEmail = loginEmail.trim().toLowerCase()
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
      } else if (cleanEmail.includes('valeria') || cleanEmail.includes('vn')) {
        name = 'Valeria Núñez'
        initials = 'VN'
        career = 'BIO'
      } else {
        const usernamePart = cleanEmail.split('@')[0]
        name = usernamePart.charAt(0).toUpperCase() + usernamePart.slice(1).replace('.', ' ')
        initials = name.substring(0, 2).toUpperCase()
      }

      onLogin({
        name,
        initials,
        career,
        email: cleanEmail.includes('@') ? cleanEmail : `${cleanEmail}@utom.edu.mx`,
        role: 'Estudiante UTOM'
      })
    }, 600)
  }

  const handleQuickDemo = (profile: UserProfile) => {
    setIsLoading(true)
    setTimeout(() => {
      setIsLoading(false)
      onLogin(profile)
    }, 350)
  }

  const handleForgotSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!forgotEmail.trim()) return
    setForgotSuccess(true)
  }

  return (
    <div className="min-h-screen bg-[#f6f8f8] text-slate-900 flex flex-col justify-between selection:bg-emerald-500 selection:text-white">
      {/* Header institucional minimalista */}
      <header className="border-b border-slate-200 bg-white/95 backdrop-blur sticky top-0 z-20">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
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

          <div className="flex items-center gap-2 rounded-full border border-emerald-100 bg-emerald-50/70 px-3 py-1 text-xs font-medium text-emerald-800">
            <span className="size-2 rounded-full bg-emerald-500 animate-pulse" />
            Portal Institucional Oficial
          </div>
        </div>
      </header>

      {/* Grid de contenido */}
      <main className="flex-1 flex items-center justify-center px-4 py-8 sm:px-6 lg:px-8">
        <div className="w-full max-w-6xl grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          
          {/* Tarjeta de Login */}
          <div className="lg:col-span-6 xl:col-span-5 w-full max-w-md mx-auto">
            <div className="rounded-2xl border border-slate-200 bg-white p-6 sm:p-8 shadow-xl shadow-slate-200/50 relative overflow-hidden">
              <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-emerald-500 via-emerald-600 to-teal-500" />

              <div className="mb-6">
                <div className="flex items-center gap-2 mb-2">
                  <span className="inline-flex items-center gap-1.5 rounded-md bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700">
                    <Sparkles size={13} className="text-emerald-600" />
                    Acceso a la comunidad
                  </span>
                </div>
                <h1 className="text-2xl font-bold tracking-tight text-slate-900">
                  Iniciar sesión
                </h1>
                <p className="mt-1 text-sm text-slate-500">
                  Ingresa con tus credenciales institucionales para participar en el foro y consultar material académico.
                </p>
              </div>

              {/* Mensaje de error */}
              {errorMessage && (
                <div className="mb-4 flex items-start gap-2.5 rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-800">
                  <AlertCircle size={16} className="text-rose-600 shrink-0 mt-0.5" />
                  <span>{errorMessage}</span>
                </div>
              )}

              {/* Formulario de Login */}
              <form onSubmit={handleLoginSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Correo institucional o matrícula
                  </label>
                  <div className="relative">
                    <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-400">
                      <Mail size={17} />
                    </div>
                    <input
                      type="text"
                      value={loginEmail}
                      onChange={(e) => setLoginEmail(e.target.value)}
                      placeholder="ejemplo@utom.edu.mx o 2023TI0142"
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-10 pr-4 text-sm text-slate-900 outline-none transition focus:border-emerald-500 focus:bg-white focus:ring-2 focus:ring-emerald-500/20"
                      autoComplete="username"
                    />
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
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
                      value={loginPassword}
                      onChange={(e) => setLoginPassword(e.target.value)}
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

                <div className="flex items-center justify-between pt-1">
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

              {/* Botones de Acceso Rápido Demo */}
              <div className="relative my-6 text-center">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-slate-200" />
                </div>
                <span className="relative bg-white px-3 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  Acceso rápido de prueba
                </span>
              </div>

              <div className="space-y-2">
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
                  className="w-full flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50/70 hover:bg-emerald-50/60 hover:border-emerald-300 p-2.5 text-left transition group cursor-pointer"
                >
                  <div className="flex items-center gap-2.5">
                    <div className="flex size-7 items-center justify-center rounded-full bg-emerald-100 text-emerald-800 text-xs font-bold">
                      ML
                    </div>
                    <div>
                      <div className="text-xs font-bold text-slate-800 group-hover:text-emerald-800">
                        Mariana López
                      </div>
                      <div className="text-[10px] text-slate-400">
                        Tecnologías de la Información · 5to
                      </div>
                    </div>
                  </div>
                  <span className="rounded-md bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-700">
                    Entrar como demo →
                  </span>
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
                  className="w-full flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50/70 hover:bg-blue-50/60 hover:border-blue-300 p-2.5 text-left transition group cursor-pointer"
                >
                  <div className="flex items-center gap-2.5">
                    <div className="flex size-7 items-center justify-center rounded-full bg-blue-100 text-blue-800 text-xs font-bold">
                      CM
                    </div>
                    <div>
                      <div className="text-xs font-bold text-slate-800 group-hover:text-blue-800">
                        Carlos Méndez
                      </div>
                      <div className="text-[10px] text-slate-400">
                        Mecatrónica · 7mo
                      </div>
                    </div>
                  </div>
                  <span className="rounded-md bg-blue-100 px-2 py-0.5 text-[10px] font-bold text-blue-700">
                    Entrar como demo →
                  </span>
                </button>
              </div>

              {/* Insignia de seguridad */}
              <div className="mt-6 flex items-center gap-2 text-[11px] text-slate-400 justify-center">
                <ShieldCheck size={14} className="text-emerald-600" />
                <span>Autenticación institucional de la comunidad UTOM</span>
              </div>
            </div>
          </div>

          {/* Panel Lateral: Identidad y Características de Wiki UTOM */}
          <div className="lg:col-span-6 xl:col-span-7 flex flex-col justify-center gap-6 lg:pl-6">
            
            <div className="space-y-4">
              <div className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3.5 py-1 text-xs font-semibold text-emerald-800">
                <School size={14} className="text-emerald-600" />
                Plataforma oficial de la comunidad estudiantil
              </div>
              <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-slate-900 leading-tight">
                El punto de encuentro para todos los <span className="text-emerald-600">halcones de UTOM</span>.
              </h2>
              <p className="text-base text-slate-600 leading-relaxed max-w-xl">
                Consulta avisos oficiales, comparte apuntes y guías para tus materias, resuelve dudas con alumnos de otros cuatrimestres y colabora en proyectos extracurriculares.
              </p>
            </div>

            {/* Tarjetas informativas con la misma paleta */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm hover:border-emerald-300 transition">
                <div className="flex items-center gap-2.5 mb-2">
                  <div className="flex size-8 items-center justify-center rounded-lg bg-emerald-100 text-emerald-700">
                    <BookOpen size={16} />
                  </div>
                  <span className="text-xs font-bold text-slate-800">Apuntes y Guías</span>
                </div>
                <p className="text-xs text-slate-500 leading-5">
                  Archivos verificados, guías de estudio para exámenes y recursos compartidos por tus materias.
                </p>
              </div>

              <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm hover:border-emerald-300 transition">
                <div className="flex items-center gap-2.5 mb-2">
                  <div className="flex size-8 items-center justify-center rounded-lg bg-amber-100 text-amber-700">
                    <TrendingUp size={16} />
                  </div>
                  <span className="text-xs font-bold text-slate-800">Avisos y Convocatorias</span>
                </div>
                <p className="text-xs text-slate-500 leading-5">
                  Fechas de reinscripción, periodos de becas, hackathones y ferias académicas en tiempo real.
                </p>
              </div>

              <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm hover:border-emerald-300 transition">
                <div className="flex items-center gap-2.5 mb-2">
                  <div className="flex size-8 items-center justify-center rounded-lg bg-blue-100 text-blue-700">
                    <Users size={16} />
                  </div>
                  <span className="text-xs font-bold text-slate-800">Red entre Carreras</span>
                </div>
                <p className="text-xs text-slate-500 leading-5">
                  Conexión directa entre estudiantes de TI, Biotecnología, Mecatrónica y Gastronomía.
                </p>
              </div>

              <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm hover:border-emerald-300 transition">
                <div className="flex items-center gap-2.5 mb-2">
                  <div className="flex size-8 items-center justify-center rounded-lg bg-violet-100 text-violet-700">
                    <GraduationCap size={16} />
                  </div>
                  <span className="text-xs font-bold text-slate-800">Residencias y Estadías</span>
                </div>
                <p className="text-xs text-slate-500 leading-5">
                  Recomendaciones y experiencias de egresados para ingresar a empresas y proyectos de titulación.
                </p>
              </div>
            </div>

            {/* Testimonio de la comunidad */}
            <div className="rounded-xl border border-emerald-100 bg-emerald-50/70 p-4 sm:p-5 flex items-start gap-3.5">
              <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-white font-bold text-sm shadow-sm">
                UT
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-emerald-950">Comunidad Estudiantil UTOM</span>
                  <span className="rounded-md bg-emerald-200/80 px-1.5 py-0.2 text-[10px] font-bold text-emerald-900">
                    2025
                  </span>
                </div>
                <p className="mt-1 text-xs text-emerald-800 leading-relaxed">
                  "Construir una comunidad donde nos apoyemos con código, apuntes y consejos para residencias hace que la vida universitaria sea mucho más fácil."
                </p>
              </div>
            </div>

            {/* Métricas */}
            <div className="flex items-center gap-6 pt-2 border-t border-slate-200 text-slate-600">
              <div>
                <div className="text-lg font-bold text-slate-900">+1,200</div>
                <div className="text-[11px] text-slate-400">Estudiantes activos</div>
              </div>
              <div className="h-7 w-px bg-slate-200" />
              <div>
                <div className="text-lg font-bold text-slate-900">4 Carreras</div>
                <div className="text-[11px] text-slate-400">TI, MEC, BIO, GAST</div>
              </div>
              <div className="h-7 w-px bg-slate-200" />
              <div>
                <div className="text-lg font-bold text-emerald-600">100% Libre</div>
                <div className="text-[11px] text-slate-400">Para la comunidad UTOM</div>
              </div>
            </div>

          </div>

        </div>
      </main>

      {/* Footer institucional */}
      <footer className="border-t border-slate-200 bg-white py-4 px-4 text-center text-xs text-slate-400">
        <div className="mx-auto max-w-7xl flex flex-col sm:flex-row items-center justify-between gap-2">
          <div>
            Universidad Tecnológica del Oriente de Michoacán · Wiki UTOM © {new Date().getFullYear()}
          </div>
          <div className="flex items-center gap-4 text-[11px]">
            <a href="#rules" className="hover:text-emerald-700">Guía de convivencia</a>
            <span>·</span>
            <a href="#support" className="hover:text-emerald-700">Soporte técnico</a>
            <span>·</span>
            <a href="#privacy" className="hover:text-emerald-700">Aviso de privacidad</a>
          </div>
        </div>
      </footer>

      {/* Modal de recuperación de contraseña */}
      {forgotModal && (
        <div
          className="fixed inset-0 z-30 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4"
          role="dialog"
          aria-modal="true"
        >
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl border border-slate-100 relative">
            <button
              onClick={() => setForgotModal(false)}
              className="absolute top-4 right-4 rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 cursor-pointer"
              aria-label="Cerrar modal"
            >
              <X size={18} />
            </button>

            <div className="flex size-11 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 mb-4">
              <HelpCircle size={22} />
            </div>

            <h3 className="text-lg font-bold text-slate-900">
              Recuperar contraseña
            </h3>
            <p className="mt-1 text-xs text-slate-500 leading-relaxed">
              Ingresa tu correo institucional registrado (@utom.edu.mx). Te enviaremos un enlace con las instrucciones para restablecer tu contraseña.
            </p>

            {forgotSuccess ? (
              <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-xs text-emerald-800">
                <div className="flex items-center gap-2 font-bold mb-1">
                  <CheckCircle2 size={16} className="text-emerald-600" />
                  Enlace enviado con éxito
                </div>
                Revisa tu bandeja de entrada o spam en tu correo institucional para continuar el restablecimiento.
                <button
                  onClick={() => setForgotModal(false)}
                  className="mt-3 block w-full rounded-lg bg-emerald-600 py-2 text-center text-xs font-semibold text-white hover:bg-emerald-700 cursor-pointer"
                >
                  Entendido
                </button>
              </div>
            ) : (
              <form onSubmit={handleForgotSubmit} className="mt-4 space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Correo institucional
                  </label>
                  <input
                    type="email"
                    required
                    value={forgotEmail}
                    onChange={(e) => setForgotEmail(e.target.value)}
                    placeholder="tu.correo@utom.edu.mx"
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 px-3.5 text-sm text-slate-900 outline-none transition focus:border-emerald-500 focus:bg-white focus:ring-2 focus:ring-emerald-500/20"
                  />
                </div>
                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setForgotModal(false)}
                    className="rounded-xl px-4 py-2 text-xs font-semibold text-slate-500 hover:bg-slate-100 cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="rounded-xl bg-emerald-600 px-4 py-2 text-xs font-semibold text-white hover:bg-emerald-700 shadow-sm cursor-pointer"
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
