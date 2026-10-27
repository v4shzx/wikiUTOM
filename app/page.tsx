'use client'

import { useEffect, useState } from 'react'
import LoginView, { UserProfile } from '@/components/login-view'
import ForumView from '@/components/forum-view'
import { careerCode, createClient, ProfileRow } from '@/lib/supabase'

// Sin "Recordarme" la sesión solo dura mientras el navegador siga abierto
const REMEMBER_KEY = 'wiki-utom-remember'
const ACTIVE_KEY = 'wiki-utom-active'

const toUserProfile = (row: ProfileRow): UserProfile => ({
  id: row.id,
  studentId: row.student_id,
  name: row.display_name,
  fullName: row.full_name,
  initials: row.initials,
  career: careerCode[row.career] ?? row.career,
  email: row.email,
  role: row.role,
  bio: row.bio,
  isAdmin: row.is_admin,
  mustChangePassword: row.must_change_password,
  notifReplies: row.notif_replies,
  notifNotices: row.notif_notices,
  notifDigest: row.notif_digest,
})

export default function Page() {
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null)
  const [sessionChecked, setSessionChecked] = useState(false)

  useEffect(() => {
    const supabase = createClient()

    const loadProfile = async (userId: string) => {
      const { data } = await supabase.from('profiles').select('*').eq('id', userId).single()
      setCurrentUser(data ? toUserProfile(data as ProfileRow) : null)
      setSessionChecked(true)
    }

    const init = async () => {
      try {
        if (window.localStorage.getItem(REMEMBER_KEY) === '0' && !window.sessionStorage.getItem(ACTIVE_KEY)) {
          await supabase.auth.signOut()
        }
      } catch {
        // Almacenamiento bloqueado: se conserva la sesión de Supabase
      }
      const { data: { session } } = await supabase.auth.getSession()
      if (session) await loadProfile(session.user.id)
      else setSessionChecked(true)
    }
    init()

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT' || !session) {
        setCurrentUser(null)
      } else if (event === 'SIGNED_IN') {
        // Se difiere: no se deben hacer consultas dentro del callback de onAuthStateChange
        setTimeout(() => loadProfile(session.user.id), 0)
      }
    })
    return () => subscription.unsubscribe()
  }, [])

  if (!sessionChecked) return null

  // Vista principal que se carga por defecto: Interfaz de Login
  if (!currentUser) {
    return (
      <LoginView
        onLogin={(remember) => {
          try {
            window.localStorage.setItem(REMEMBER_KEY, remember ? '1' : '0')
            window.sessionStorage.setItem(ACTIVE_KEY, '1')
          } catch {
            // Sin almacenamiento la sesión simplemente se recuerda
          }
        }}
      />
    )
  }

  // Vista de la comunidad / foro una vez autenticado
  return (
    <ForumView
      user={currentUser}
      onUserChange={setCurrentUser}
      onLogout={() => createClient().auth.signOut()}
    />
  )
}
