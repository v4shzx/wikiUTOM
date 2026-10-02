'use client'

import { useState } from 'react'
import LoginView, { UserProfile } from '@/components/login-view'
import ForumView from '@/components/forum-view'

export default function Page() {
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null)

  // Vista principal que se carga por defecto: Interfaz de Login
  if (!currentUser) {
    return (
      <LoginView
        onLogin={(user) => {
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
        setCurrentUser(null)
      }}
    />
  )
}
