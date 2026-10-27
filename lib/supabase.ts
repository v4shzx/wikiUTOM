import { createBrowserClient } from '@supabase/ssr'

// En el navegador createBrowserClient reutiliza siempre la misma instancia
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    (process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)!
  )
}

// La base guarda la carrera con su nombre; la app la muestra con su código corto
export const careerCode: Record<string, string> = {
  TI: 'TI', 'Biotecnología': 'BIO', Mercadotecnia: 'MKT', 'Gastronomía': 'GAST',
}

// Correo interno de Supabase Auth: matrícula en minúsculas + @utom.edu.mx
export const toAuthEmail = (input: string) => {
  const value = input.trim().toLowerCase()
  return value.includes('@') ? value : `${value}@utom.edu.mx`
}

export interface ProfileRow {
  id: string
  student_id: string
  email: string
  full_name: string
  display_name: string
  initials: string
  career: string
  bio: string
  avatar_url: string | null
  role: string
  is_admin: boolean
  must_change_password: boolean
  notif_replies: boolean
  notif_notices: boolean
  notif_digest: boolean
}

export interface FeedThreadRow {
  id: number
  author_id: string
  category: string
  title: string
  body: string
  tags: string[]
  image_url: string | null
  attachment_url: string | null
  attachment_name: string | null
  attachment_size: string | null
  score: number
  replies_count: number
  created_at: string
  author_name: string
  author_initials: string
  author_career: string
  author_role: string
}

export interface CommentRow {
  id: number
  thread_id: number
  author_id: string
  content: string
  created_at: string
  author: { display_name: string; initials: string } | null
}

export interface NoticeRow {
  id: number
  title: string
  body: string
  published_at: string
}

export interface NotificationRow {
  id: number
  type: 'reply' | 'mention' | 'notice' | 'trending'
  title: string
  description: string
  thread_id: number | null
  notice_id: number | null
  read: boolean
  created_at: string
}

// "hace 5 min", "hace 2 h", "ayer", "hace 3 días" o la fecha
export const timeAgo = (iso: string) => {
  const seconds = Math.max(0, (Date.now() - new Date(iso).getTime()) / 1000)
  if (seconds < 60) return 'justo ahora'
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `hace ${minutes} min`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `hace ${hours} h`
  const days = Math.floor(hours / 24)
  if (days === 1) return 'ayer'
  if (days < 7) return `hace ${days} días`
  return new Date(iso).toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric' })
}
