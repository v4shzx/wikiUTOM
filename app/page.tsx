'use client'

import { useEffect, useState } from 'react'
import LoginView, { UserProfile } from '@/components/login-view'
import ForumView from '@/components/forum-view'

const SESSION_KEY = 'wiki-utom-session'

export default function Page() {
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null)
  const [sessionChecked, setSessionChecked] = useState(false)

  // Restaura la sesión si el usuario marcó "Recordarme en este equipo"
  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(SESSION_KEY)
      if (stored) setCurrentUser(JSON.parse(stored) as UserProfile)
    } catch {
      window.localStorage.removeItem(SESSION_KEY)
    }
    setSessionChecked(true)
  }, [])

  if (!sessionChecked) return null

  // Vista principal que se carga por defecto: Interfaz de Login
  if (!currentUser) {
    return (
      <LoginView
        onLogin={(user, remember) => {
          if (remember) window.localStorage.setItem(SESSION_KEY, JSON.stringify(user))
          setCurrentUser(user)
        }}
      />
    )
  }

  // Vista de la comunidad / foro una vez autenticado
  return (
    <ForumView
      user={currentUser}
      onLogout={() => {
        window.localStorage.removeItem(SESSION_KEY)
        setCurrentUser(null)
      }}
    />
  )
}
