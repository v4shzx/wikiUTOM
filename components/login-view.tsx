'use client'

import { useState } from 'react'
import PlexusEffect from '@/components/plexus-effect'
import {
  Mail, Lock, Eye, EyeOff, ArrowRight, ShieldCheck,
  AlertCircle, HelpCircle, Loader2, CheckCircle2
} from 'lucide-react'
import { createClient, toAuthEmail } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'

export interface UserProfile {
  id: string
  studentId: string
  name: string
  fullName: string
  initials: string
  career: string
  email: string
  role: string
  bio: string
  isAdmin: boolean
  mustChangePassword: boolean
  notifReplies: boolean
  notifNotices: boolean
  notifDigest: boolean
}

interface LoginViewProps {
  // La sesión la detecta app/page.tsx con onAuthStateChange; aquí solo se avisa la preferencia
  onLogin: (remember: boolean) => void
}

// Textos de referencia: sustituir por los documentos oficiales de la universidad
const infoContent = {
  rules: {
    title: 'Guía de convivencia',
    items: [
      'Trata con respeto a compañeros, docentes y personal administrativo.',
      'Publica en la categoría correcta y busca antes de abrir un hilo repetido.',
      'No compartas datos personales, exámenes ni material con derechos de autor sin permiso.',
      'Evita spam, publicidad o contenido ajeno a la vida universitaria.',
      'Reporta cualquier contenido inapropiado al equipo de moderación.',
    ],
  },
  privacy: {
    title: 'Privacidad',
    items: [
      'Tu nombre, carrera y publicaciones son visibles para la comunidad UTOM.',
      'Tu correo institucional solo se usa para autenticarte y enviarte avisos.',
      'Con "Recordarme" tu sesión se guarda únicamente en este navegador.',
      'Puedes cerrar sesión en cualquier momento para borrar esos datos del equipo.',
    ],
  },
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

  // Se conserva el último documento abierto para que el diálogo no cambie durante su animación de cierre
  const [infoModal, setInfoModal] = useState<keyof typeof infoContent>('rules')
  const [infoOpen, setInfoOpen] = useState(false)

  const handleLogin = async (e: React.FormEvent) => {
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
    // Se guarda antes de iniciar sesión: onAuthStateChange se dispara durante signInWithPassword
    onLogin(rememberMe)
    const { error } = await createClient().auth.signInWithPassword({
      email: toAuthEmail(email),
      password,
    })
    setIsLoading(false)
    if (error) {
      setErrorMessage(
        error.message === 'Invalid login credentials'
          ? 'Matrícula o contraseña incorrectas.'
          : 'No se pudo iniciar sesión. Revisa tu conexión e inténtalo de nuevo.'
      )
    }
  }

  const openInfo = (key: keyof typeof infoContent) => {
    setInfoModal(key)
    setInfoOpen(true)
  }

  return (
    <div className="relative flex min-h-screen min-h-[100dvh] flex-col justify-between overflow-x-hidden overflow-y-auto bg-gradient-to-br from-emerald-950 via-emerald-900 to-teal-950 text-foreground selection:bg-primary selection:text-primary-foreground">
      {/* Fondo verde con efecto de partículas Plexus */}
      <PlexusEffect />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(16,185,129,0.16),transparent_60%)]" />
      <div className="pointer-events-none absolute -top-32 left-1/4 size-96 animate-float-slow rounded-full bg-emerald-500/15 blur-3xl" />
      <div className="pointer-events-none absolute right-1/4 -bottom-24 size-80 animate-float-slow rounded-full bg-teal-400/10 blur-3xl" />

      {/* Contenedor centralizado para el panel de credenciales */}
      <main className="relative z-10 my-auto flex flex-1 items-center justify-center p-4 sm:p-6">
        <div className="w-full max-w-md">

          {/* Tarjeta de login centrada */}
          <Card className="relative gap-6 py-6 shadow-lg sm:py-8 [--card-spacing:--spacing(6)] sm:[--card-spacing:--spacing(8)]">
            <div className="absolute top-0 right-0 left-0 h-1.5 bg-gradient-to-r from-emerald-500 via-emerald-600 to-teal-500" />

            {/* Cabecera con el logo oficial */}
            <CardHeader className="justify-items-center text-center">
              <img
                src="/media/logo.webp"
                alt="Logo Universidad Tecnológica del Oriente de Michoacán"
                className="mb-3 h-14 w-auto max-w-[210px] object-contain sm:h-16"
              />
              <h1 className="text-2xl font-semibold tracking-tight">Iniciar sesión</h1>
              <CardDescription>Ingresa con tu correo institucional @utom.edu.mx o matrícula</CardDescription>
            </CardHeader>

            <CardContent className="flex flex-col gap-6">
              {/* Alerta de error */}
              {errorMessage && (
                <div role="alert" className="flex items-start gap-2.5 rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-xs text-destructive">
                  <AlertCircle className="mt-0.5 size-4 shrink-0" />
                  <span>{errorMessage}</span>
                </div>
              )}

              {/* Formulario */}
              <form onSubmit={handleLogin} className="grid gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="login-email">Correo o matrícula</Label>
                  <div className="relative">
                    <Mail className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      id="login-email"
                      type="text"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="UTOM2413TIID o usuario@utom.edu.mx"
                      className="h-10 pl-9"
                      autoComplete="username"
                    />
                  </div>
                </div>

                <div className="grid gap-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="login-password">Contraseña</Label>
                    <Button
                      type="button"
                      variant="link"
                      size="xs"
                      className="h-auto px-0"
                      onClick={() => setForgotModal(true)}
                    >
                      ¿Olvidaste tu contraseña?
                    </Button>
                  </div>
                  <div className="relative">
                    <Lock className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      id="login-password"
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••••••"
                      className="h-10 pr-10 pl-9"
                      autoComplete="current-password"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute top-1/2 right-1.5 -translate-y-1/2 text-muted-foreground"
                      aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                      aria-pressed={showPassword}
                    >
                      {showPassword ? <EyeOff /> : <Eye />}
                    </Button>
                  </div>
                </div>

                <Label className="cursor-pointer font-normal text-muted-foreground">
                  <Checkbox checked={rememberMe} onCheckedChange={(checked) => setRememberMe(checked)} />
                  Recordarme en este equipo
                </Label>

                <Button type="submit" size="lg" disabled={isLoading} className="mt-2 h-10 w-full">
                  {isLoading ? (
                    <>
                      <Loader2 className="animate-spin" /> Iniciando sesión...
                    </>
                  ) : (
                    <>
                      Ingresar a Wiki UTOM <ArrowRight />
                    </>
                  )}
                </Button>
              </form>

              <Separator />

              <div className="flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
                <ShieldCheck className="size-3.5 text-primary" />
                <span>Autenticación institucional de la comunidad UTOM</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>

      {/* Pie de página institucional */}
      <footer className="relative z-10 border-t border-emerald-300/10 px-4 py-3.5 text-center text-xs text-emerald-200/60">
        <div className="mx-auto flex max-w-5xl flex-col items-center justify-between gap-2 sm:flex-row">
          <span>Universidad Tecnológica del Oriente de Michoacán · Wiki UTOM</span>
          <div className="flex items-center gap-1 text-[11px]">
            <Button variant="link" size="xs" className="text-emerald-200/60 hover:text-emerald-300" onClick={() => openInfo('rules')}>
              Guía de convivencia
            </Button>
            <span aria-hidden="true">·</span>
            <Button variant="link" size="xs" className="text-emerald-200/60 hover:text-emerald-300" onClick={() => openInfo('privacy')}>
              Privacidad
            </Button>
          </div>
        </div>
      </footer>

      {/* Diálogo: Recuperación de contraseña */}
      <Dialog open={forgotModal} onOpenChange={(open) => setForgotModal(open)}>
        <DialogContent>
          <DialogHeader>
            <div className="mb-1 flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <HelpCircle className="size-5" />
            </div>
            <DialogTitle>Recuperar contraseña</DialogTitle>
            <DialogDescription>
              Tu cuenta usa un correo interno de la plataforma, así que no podemos enviarte un enlace.
            </DialogDescription>
          </DialogHeader>

          <ul className="space-y-2 text-xs leading-relaxed text-muted-foreground">
            <li className="flex gap-2">
              <CheckCircle2 className="mt-0.5 size-3.5 shrink-0 text-primary" />
              <span>Si aún no la cambias, tu contraseña es tu matrícula (por ejemplo UTOM2413TIID).</span>
            </li>
            <li className="flex gap-2">
              <CheckCircle2 className="mt-0.5 size-3.5 shrink-0 text-primary" />
              <span>Si ya la cambiaste y no la recuerdas, pide a la administración de Wiki UTOM que la restablezca.</span>
            </li>
          </ul>
          <DialogFooter>
            <DialogClose render={<Button />}>Entendido</DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Diálogo: Guía de convivencia / Privacidad */}
      <Dialog open={infoOpen} onOpenChange={(open) => setInfoOpen(open)}>
        <DialogContent>
          <DialogHeader>
            <div className="mb-1 flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <ShieldCheck className="size-5" />
            </div>
            <DialogTitle>{infoContent[infoModal].title}</DialogTitle>
          </DialogHeader>
          <ul className="space-y-2 text-xs leading-relaxed text-muted-foreground">
            {infoContent[infoModal].items.map((item) => (
              <li key={item} className="flex gap-2">
                <CheckCircle2 className="mt-0.5 size-3.5 shrink-0 text-primary" />
                <span>{item}</span>
              </li>
            ))}
          </ul>
          <DialogFooter>
            <DialogClose render={<Button />}>Entendido</DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
