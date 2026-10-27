'use client'

import { useEffect, useRef, useState } from 'react'
import {
  AlertCircle, ArrowLeft, AtSign, Bell, BellOff, Bookmark, Check, CheckCheck, ChevronDown, ChevronRight, Circle,
  Download, Eye, EyeOff, FileText, GraduationCap, Hash, Home, ImagePlus, KeyRound, Link2, Loader2, LogOut,
  Megaphone, Menu, MessageCircle, MoreHorizontal, Paperclip, Save, Search, Send, Settings, Share2,
  Sliders, Sparkles, ThumbsDown, ThumbsUp, Trash2, TrendingUp,
  X, User
} from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  careerCode, CommentRow, createClient, FeedThreadRow, NoticeRow, NotificationRow, timeAgo,
} from '@/lib/supabase'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button, buttonVariants } from '@/components/ui/button'
import {
  Card, CardAction, CardContent, CardDescription, CardFooter, CardHeader, CardTitle,
} from '@/components/ui/card'
import {
  Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select'
import { Popover, PopoverContent, PopoverHeader, PopoverTitle, PopoverTrigger } from '@/components/ui/popover'
import { Separator } from '@/components/ui/separator'
import { Switch } from '@/components/ui/switch'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs' // selector de tema en Ajustes
import { Textarea } from '@/components/ui/textarea'
import { UserProfile } from './login-view'

type NotificationType = 'reply' | 'mention' | 'notice' | 'trending'

interface Notification {
  id: number
  type: NotificationType
  title: string
  description: string
  createdAt: string
  read: boolean
  threadId: number | null
  noticeId: number | null
}

interface ThreadComment {
  id: number
  author: string
  initials: string
  text: string
}

interface Thread {
  id: number
  authorId: string
  author: string
  initials: string
  career: string
  role: string
  createdAt: string
  category: string
  title: string
  body: string
  score: number
  replies: number
  accent: string
  image?: { url: string; name: string }
  tags?: string[]
  attachment?: { name: string; size: string; url: string }
}

interface CampusNotice {
  id: number
  title: string
  body: string
  publishedAt: string
}

const careerAccent: Record<string, string> = {
  'TI': 'bg-primary/15 text-primary',
  'MKT': 'bg-blue-100 dark:bg-blue-500/15 text-blue-700 dark:text-blue-400',
  'BIO': 'bg-violet-100 dark:bg-violet-500/15 text-violet-700 dark:text-violet-400',
  'GAST': 'bg-amber-100 dark:bg-amber-500/15 text-amber-700 dark:text-amber-400'
}

const toThread = (row: FeedThreadRow): Thread => {
  const career = careerCode[row.author_career] ?? row.author_career
  return {
    id: row.id,
    authorId: row.author_id,
    author: row.author_name,
    initials: row.author_initials,
    career,
    role: row.author_role,
    createdAt: row.created_at,
    category: row.category,
    title: row.title,
    body: row.body,
    score: row.score,
    replies: row.replies_count,
    accent: careerAccent[career] || careerAccent.TI,
    image: row.image_url ? { url: row.image_url, name: row.title } : undefined,
    tags: row.tags.length ? row.tags : undefined,
    attachment: row.attachment_url
      ? { name: row.attachment_name || 'Documento.pdf', size: row.attachment_size || '', url: row.attachment_url }
      : undefined,
  }
}

const toComment = (row: CommentRow): ThreadComment => ({
  id: row.id,
  author: row.author?.display_name ?? 'Usuario UTOM',
  initials: row.author?.initials ?? 'U',
  text: row.content,
})

const toNotification = (row: NotificationRow): Notification => ({
  id: row.id,
  type: row.type,
  title: row.title,
  description: row.description,
  createdAt: row.created_at,
  read: row.read,
  threadId: row.thread_id,
  noticeId: row.notice_id,
})

const formatSize = (bytes: number) =>
  bytes >= 1024 * 1024 ? `${(bytes / 1024 / 1024).toFixed(1)} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`

// Ruta dentro del bucket a partir de la URL pública (…/object/public/<bucket>/<ruta>)
const storagePath = (url: string, bucket: string) => url.split(`/object/public/${bucket}/`)[1]

// El feed ya no muestra pestañas: "Para ti" es la vista normal y las demás
// se abren desde la barra lateral (guardados, populares) o la navbar (avisos)
type FeedTab = 'Para ti' | 'En tendencia' | 'Mis guardados' | 'Avisos del campus'

const feedModeLabel: Record<Exclude<FeedTab, 'Para ti'>, string> = {
  'En tendencia': 'Hilos populares',
  'Mis guardados': 'Mis guardados',
  'Avisos del campus': 'Avisos oficiales',
}

// Categoría del foro asociada a cada carrera (para priorizar "Para ti")
const careerCategory: Record<string, string> = {
  TI: 'TI', BIO: 'Biotecnología', MKT: 'Mercadotecnia', GAST: 'Gastronomía',
}

const TRENDING_SCORE = 60
const IMAGE_MAX_MB = 5
const PDF_MAX_MB = 20
const TAGS_MAX = 5

const initialCategories = [
  'TI', 'Biotecnología', 'Mercadotecnia', 'Gastronomía',
  'Convocatorias', 'Preguntas Frecuentes',
]

const categoryDot: Record<string, string> = {
  'TI': 'bg-primary',
  'Biotecnología': 'bg-violet-500',
  'Mercadotecnia': 'bg-blue-500',
  'Gastronomía': 'bg-amber-500',
  'Convocatorias': 'bg-pink-500',
  'Preguntas Frecuentes': 'bg-muted-foreground',
}

const careerOptions = [
  { value: 'TI', label: 'Tecnologías de la Información (TI)' },
  { value: 'BIO', label: 'Biotecnología (BIO)' },
  { value: 'MKT', label: 'Mercadotecnia (MKT)' },
  { value: 'GAST', label: 'Gastronomía (GAST)' },
]

const NAME_MAX = 40
const BIO_MAX = 160

// Campos de solo lectura: <Input> con fondo atenuado
const readOnlyInputClass = 'bg-muted text-muted-foreground dark:bg-input/50'

const PASSWORD_MIN = 8

const passwordRules = [
  { id: 'length', label: `Al menos ${PASSWORD_MIN} caracteres`, test: (value: string) => value.length >= PASSWORD_MIN },
  { id: 'upper', label: 'Una letra mayúscula', test: (value: string) => /[A-ZÁÉÍÓÚÑ]/.test(value) },
  { id: 'lower', label: 'Una letra minúscula', test: (value: string) => /[a-záéíóúñ]/.test(value) },
  { id: 'number', label: 'Un número', test: (value: string) => /\d/.test(value) },
  { id: 'symbol', label: 'Un símbolo (!@#$%...)', test: (value: string) => /[^A-Za-z0-9ÁÉÍÓÚÑáéíóúñ\s]/.test(value) },
  { id: 'spaces', label: 'Sin espacios', test: (value: string) => value.length > 0 && !/\s/.test(value) },
]

const getInitials = (name: string) =>
  name.trim().split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0].toUpperCase()).join('')

type NavSection = 'feed' | 'categories' | 'notices'

const navItems: { id: NavSection; label: string; icon: typeof Home }[] = [
  { id: 'feed', label: 'Feed', icon: Home },
  { id: 'categories', label: 'Carreras', icon: GraduationCap },
  { id: 'notices', label: 'Avisos oficiales', icon: Megaphone },
]

const isNavSection = (value: string): value is NavSection =>
  navItems.some((item) => item.id === value)

interface ForumViewProps {
  user: UserProfile
  onUserChange: (user: UserProfile) => void
  onLogout: () => void
}

export default function ForumView({ user, onUserChange, onLogout }: ForumViewProps) {
  const supabase = createClient()
  const [activeTab, setActiveTab] = useState<FeedTab>('Para ti')
  const [openThread, setOpenThread] = useState<number | null>(null)
  const [saved, setSaved] = useState<number[]>([])
  // Voto actual del usuario por hilo (1, -1); el score de cada hilo ya lo incluye
  const [votes, setVotes] = useState<Record<number, number>>({})
  const [modal, setModal] = useState(false)
  const [mobileMenu, setMobileMenu] = useState(false)
  // Primer acceso con la matrícula como contraseña: se abre Ajustes para cambiarla
  const [currentView, setCurrentView] = useState<'feed' | 'settings'>(user.mustChangePassword ? 'settings' : 'feed')
  const [navSection, setNavSection] = useState<NavSection>('feed')
  const [selectedCategories, setSelectedCategories] = useState<string[]>([])

  // En Ajustes ninguna sección de la navbar queda marcada
  const activeNav: NavSection | null = currentView === 'settings' ? null : navSection

  const [openNotice, setOpenNotice] = useState<number | null>(null)

  // Aviso flotante para confirmar acciones (copiar enlace, guardar, etc.)
  const [toast, setToast] = useState<string | null>(null)
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const showToast = (message: string) => {
    setToast(message)
    if (toastTimer.current) clearTimeout(toastTimer.current)
    toastTimer.current = setTimeout(() => setToast(null), 2500)
  }

  const goToSection = (section: NavSection) => {
    setCurrentView('feed')
    setNavSection(section)
    if (section === 'notices') setActiveTab('Avisos del campus')
    else if (section === 'feed') setActiveTab((tab) => (tab === 'Avisos del campus' ? 'Para ti' : tab))
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const selectTab = (tab: FeedTab) => {
    setCurrentView('feed')
    setActiveTab(tab)
    setNavSection(tab === 'Avisos del campus' ? 'notices' : 'feed')
  }

  const openThreadInFeed = (id: number) => {
    setCurrentView('feed')
    setNavSection('feed')
    setActiveTab('Para ti')
    setSearchQuery('')
    setOpenThread(id)
    setTimeout(() => {
      document.getElementById(`thread-${id}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }, 60)
  }

  const openNoticeInFeed = (id: number | null) => {
    selectTab('Avisos del campus')
    setOpenNotice(id)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  // Sincroniza la sección activa con el hash (enlaces directos y botón atrás/adelante)
  useEffect(() => {
    const syncFromHash = () => {
      const hash = window.location.hash.slice(1)
      const threadMatch = hash.match(/^thread-(\d+)$/)
      if (threadMatch) openThreadInFeed(Number(threadMatch[1]))
      else if (isNavSection(hash)) goToSection(hash)
    }
    syncFromHash()
    window.addEventListener('hashchange', syncFromHash)
    return () => window.removeEventListener('hashchange', syncFromHash)
  }, [])

  // Settings view state
  const [settingsName, setSettingsName] = useState(user.name)
  const [settingsBio, setSettingsBio] = useState(user.bio)
  const [notifReplies, setNotifReplies] = useState(user.notifReplies)
  const [notifNotices, setNotifNotices] = useState(user.notifNotices)
  const [notifDigest, setNotifDigest] = useState(user.notifDigest)
  const [themePreference, setThemePreference] = useState<'light' | 'system' | 'dark'>('system')
  const [savedSuccess, setSavedSuccess] = useState(false)
  const [savingSettings, setSavingSettings] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')

  // Últimos ajustes guardados en Supabase: "Guardar" los confirma y "Cancelar" vuelve a ellos
  const savedSettings = {
    name: user.name,
    bio: user.bio,
    notifReplies: user.notifReplies,
    notifNotices: user.notifNotices,
    notifDigest: user.notifDigest,
  }
  const displayName = user.name
  const displayInitials = user.initials

  const handleSaveSettings = async () => {
    if (nameError) return
    const changes = {
      display_name: trimmedName,
      initials: getInitials(trimmedName) || user.initials,
      bio: settingsBio.trim(),
      notif_replies: notifReplies,
      notif_notices: notifNotices,
      notif_digest: notifDigest,
    }
    setSavingSettings(true)
    const { error } = await supabase.from('profiles').update(changes).eq('id', user.id)
    setSavingSettings(false)
    if (error) {
      showToast('No se pudieron guardar los ajustes')
      return
    }
    setSettingsName(trimmedName)
    onUserChange({
      ...user,
      name: changes.display_name,
      initials: changes.initials,
      bio: changes.bio,
      notifReplies, notifNotices, notifDigest,
    })
    // Los hilos y comentarios propios ya cargados muestran el nombre nuevo
    setThreads((current) => current.map((t) =>
      t.authorId === user.id ? { ...t, author: changes.display_name, initials: changes.initials } : t
    ))
    setSavedSuccess(true)
    setTimeout(() => setSavedSuccess(false), 3000)
    showToast('Ajustes guardados')
  }

  const handleCancelSettings = () => {
    setSettingsName(savedSettings.name)
    setSettingsBio(savedSettings.bio)
    setNotifReplies(savedSettings.notifReplies)
    setNotifNotices(savedSettings.notifNotices)
    setNotifDigest(savedSettings.notifDigest)
    goToSection('feed')
  }

  const trimmedName = settingsName.trim()
  const nameError = !trimmedName
    ? 'El nombre no puede quedar vacío.'
    : trimmedName.length < 3
      ? 'Usa al menos 3 caracteres.'
      : ''

  // Cambio de contraseña: verificación 1 = reglas de sintaxis, verificación 2 = confirmación idéntica
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPasswords, setShowPasswords] = useState(false)
  const [passwordSuccess, setPasswordSuccess] = useState(false)
  const [passwordError, setPasswordError] = useState('')
  const [changingPassword, setChangingPassword] = useState(false)

  const passwordChecks = passwordRules.map((rule) => ({ ...rule, passed: rule.test(newPassword) }))
  const passwordSyntaxValid = passwordChecks.every((rule) => rule.passed)
  const passwordReused = newPassword.length > 0 && newPassword === currentPassword
  const passwordsMatch = confirmPassword.length > 0 && confirmPassword === newPassword
  const canChangePassword =
    currentPassword.length > 0 && passwordSyntaxValid && !passwordReused && passwordsMatch && !changingPassword

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!canChangePassword) return
    setPasswordError('')
    setChangingPassword(true)

    // Supabase no pide la contraseña actual: se verifica volviendo a iniciar sesión con ella
    const { error: verifyError } = await supabase.auth.signInWithPassword({ email: user.email, password: currentPassword })
    if (verifyError) {
      setChangingPassword(false)
      setPasswordError('La contraseña actual no es correcta.')
      return
    }
    const { error } = await supabase.auth.updateUser({ password: newPassword })
    if (error) {
      setChangingPassword(false)
      setPasswordError('No se pudo actualizar la contraseña. Inténtalo de nuevo.')
      return
    }
    if (user.mustChangePassword) {
      await supabase.from('profiles').update({ must_change_password: false }).eq('id', user.id)
      onUserChange({ ...user, mustChangePassword: false })
    }
    setChangingPassword(false)
    setCurrentPassword('')
    setNewPassword('')
    setConfirmPassword('')
    setShowPasswords(false)
    setPasswordSuccess(true)
    setTimeout(() => setPasswordSuccess(false), 3000)
  }

  // Notifications state
  const [notifOpen, setNotifOpen] = useState(false)
  const [notifFilter, setNotifFilter] = useState<'all' | 'unread'>('all')
  const [notifications, setNotifications] = useState<Notification[]>([])

  // Tema: persistido en localStorage y con soporte para "Automático"
  const [systemDark, setSystemDark] = useState(false)

  useEffect(() => {
    const stored = window.localStorage.getItem('wiki-utom-theme')
    if (stored === 'light' || stored === 'dark' || stored === 'system') {
      setThemePreference(stored)
    }
  }, [])

  useEffect(() => {
    const media = window.matchMedia('(prefers-color-scheme: dark)')
    const update = () => setSystemDark(media.matches)
    update()
    media.addEventListener('change', update)
    return () => media.removeEventListener('change', update)
  }, [])

  const resolvedDark = themePreference === 'dark' || (themePreference === 'system' && systemDark)

  // Modo oscuro de shadcn: la clase .dark en <html> cambia todos los tokens de color
  useEffect(() => {
    document.documentElement.classList.toggle('dark', resolvedDark)
    return () => document.documentElement.classList.remove('dark')
  }, [resolvedDark])

  const handleThemeChange = (preference: 'light' | 'system' | 'dark') => {
    setThemePreference(preference)
    window.localStorage.setItem('wiki-utom-theme', preference)
  }

  // Modal new thread fields
  const [newTitle, setNewTitle] = useState('')
  const [newCategory, setNewCategory] = useState(initialCategories[0])
  const [newBody, setNewBody] = useState('')
  const [newImage, setNewImage] = useState<{ url: string; name: string; file: File } | null>(null)
  const [newPdf, setNewPdf] = useState<File | null>(null)
  const [newTags, setNewTags] = useState<string[]>([])
  const [tagDraft, setTagDraft] = useState('')
  const [showTagInput, setShowTagInput] = useState(false)
  const [publishing, setPublishing] = useState(false)
  const imageInputRef = useRef<HTMLInputElement>(null)
  const pdfInputRef = useRef<HTMLInputElement>(null)

  // Datos reales de Supabase
  const [threads, setThreads] = useState<Thread[]>([])
  const [comments, setComments] = useState<Record<number, ThreadComment[]>>({})
  const [campusNotices, setCampusNotices] = useState<CampusNotice[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState(false)

  const loadData = async () => {
    setLoading(true)
    setLoadError(false)
    const [threadsRes, votesRes, savedRes, noticesRes, notificationsRes] = await Promise.all([
      supabase.from('feed_threads').select('*').order('created_at', { ascending: false }),
      supabase.from('thread_votes').select('thread_id, vote_type').eq('user_id', user.id),
      supabase.from('saved_threads').select('thread_id').eq('user_id', user.id),
      supabase.from('notices').select('id, title, body, published_at').order('published_at', { ascending: false }),
      supabase.from('notifications').select('*').order('created_at', { ascending: false }).limit(50),
    ])
    setLoading(false)
    if (threadsRes.error || votesRes.error || savedRes.error || noticesRes.error || notificationsRes.error) {
      setLoadError(true)
      return
    }
    setThreads((threadsRes.data as FeedThreadRow[]).map(toThread))
    setVotes(Object.fromEntries(votesRes.data.map((v) => [v.thread_id, v.vote_type])))
    setSaved(savedRes.data.map((s) => s.thread_id))
    setCampusNotices((noticesRes.data as NoticeRow[]).map((n) => ({
      id: n.id, title: n.title, body: n.body, publishedAt: n.published_at,
    })))
    setNotifications((notificationsRes.data as NotificationRow[]).map(toNotification))
  }

  useEffect(() => {
    loadData()
  }, [user.id])

  const loadComments = async (threadId: number) => {
    const { data, error } = await supabase
      .from('comments')
      .select('*, author:profiles(display_name, initials)')
      .eq('thread_id', threadId)
      .order('created_at')
    if (!error) setComments((current) => ({ ...current, [threadId]: (data as CommentRow[]).map(toComment) }))
  }

  // Los comentarios de un hilo se cargan la primera vez que se abre
  useEffect(() => {
    if (openThread !== null && !comments[openThread]) loadComments(openThread)
  }, [openThread])

  // Tiempo real: comentarios de otros usuarios y notificaciones nuevas
  useEffect(() => {
    const channel = supabase
      .channel(`forum-${user.id}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'comments' }, async (payload) => {
        const row = payload.new as Omit<CommentRow, 'author'>
        if (row.author_id === user.id) return // los propios ya se añadieron al enviarlos
        const { data: author } = await supabase
          .from('profiles').select('display_name, initials').eq('id', row.author_id).single()
        setThreads((current) => current.map((t) => t.id === row.thread_id ? { ...t, replies: t.replies + 1 } : t))
        setComments((current) => current[row.thread_id]
          ? { ...current, [row.thread_id]: [...current[row.thread_id], toComment({ ...row, author })] }
          : current)
      })
      .on('postgres_changes', {
        event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${user.id}`,
      }, (payload) => {
        setNotifications((current) => [toNotification(payload.new as NotificationRow), ...current])
      })
      .subscribe()
    return () => {
      supabase.removeChannel(channel)
    }
  }, [user.id])

  const [newCommentText, setNewCommentText] = useState<Record<number, string>>({})

  const toggleVote = async (id: number, amount: number) => {
    const previous = votes[id] || 0
    const next = previous === amount ? 0 : amount
    const applyVote = (from: number, to: number) => {
      setVotes((current) => ({ ...current, [id]: to }))
      setThreads((current) => current.map((t) => t.id === id ? { ...t, score: t.score - from + to } : t))
    }
    applyVote(previous, next)
    // Sin upsert: el usuario solo tiene permiso para actualizar vote_type, no thread_id
    const votesTable = supabase.from('thread_votes')
    const { error } = next === 0
      ? await votesTable.delete().eq('thread_id', id).eq('user_id', user.id)
      : previous === 0
        ? await votesTable.insert({ thread_id: id, vote_type: next })
        : await votesTable.update({ vote_type: next }).eq('thread_id', id).eq('user_id', user.id)
    if (error) {
      applyVote(next, previous)
      showToast('No se pudo registrar tu voto')
    }
  }

  const toggleSave = async (id: number) => {
    const wasSaved = saved.includes(id)
    setSaved((current) => wasSaved ? current.filter((item) => item !== id) : [...current, id])
    const { error } = wasSaved
      ? await supabase.from('saved_threads').delete().eq('thread_id', id).eq('user_id', user.id)
      : await supabase.from('saved_threads').insert({ thread_id: id })
    if (error) {
      setSaved((current) => wasSaved ? [...current, id] : current.filter((item) => item !== id))
      showToast('No se pudo actualizar tus guardados')
      return
    }
    showToast(wasSaved ? 'Hilo quitado de tus guardados' : 'Hilo guardado')
  }

  const threadUrl = (id: number) => `${window.location.origin}${window.location.pathname}#thread-${id}`

  const copyThreadLink = async (id: number) => {
    try {
      await navigator.clipboard.writeText(threadUrl(id))
      showToast('Enlace copiado al portapapeles')
    } catch {
      showToast('No se pudo copiar el enlace')
    }
  }

  const shareThread = async (thread: Thread) => {
    if (navigator.share) {
      try {
        await navigator.share({ title: thread.title, url: threadUrl(thread.id) })
      } catch {
        // El usuario canceló el diálogo de compartir
      }
      return
    }
    copyThreadLink(thread.id)
  }

  const deleteThread = async (thread: Thread) => {
    if (!window.confirm(`¿Eliminar el hilo "${thread.title}"? Esta acción no se puede deshacer.`)) return
    const { error } = await supabase.from('threads').delete().eq('id', thread.id)
    if (error) {
      showToast('No se pudo eliminar el hilo')
      return
    }
    // Solo el autor puede borrar sus archivos (políticas de storage)
    if (thread.authorId === user.id) {
      const imagePath = thread.image && storagePath(thread.image.url, 'thread-images')
      const pdfPath = thread.attachment && storagePath(thread.attachment.url, 'materials')
      if (imagePath) supabase.storage.from('thread-images').remove([imagePath])
      if (pdfPath) supabase.storage.from('materials').remove([pdfPath])
    }
    setThreads((current) => current.filter((t) => t.id !== thread.id))
    setSaved((current) => current.filter((id) => id !== thread.id))
    showToast('Hilo eliminado')
  }

  const replyToComment = (threadId: number, author: string) => {
    setNewCommentText((current) => ({ ...current, [threadId]: `@${author} ` }))
    requestAnimationFrame(() => document.getElementById(`reply-input-${threadId}`)?.focus())
  }

  const searchFor = (term: string) => {
    selectTab('Para ti')
    setSelectedCategories([])
    setSearchQuery(term)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  // Las preferencias guardadas en Ajustes deciden qué tipos de notificación se muestran
  const notificationEnabled: Record<NotificationType, boolean> = {
    reply: savedSettings.notifReplies,
    mention: savedSettings.notifReplies,
    notice: savedSettings.notifNotices,
    trending: savedSettings.notifDigest,
  }
  const enabledNotifications = notifications.filter((n) => notificationEnabled[n.type])
  const unreadCount = enabledNotifications.filter((n) => !n.read).length
  const visibleNotifications = notifFilter === 'unread'
    ? enabledNotifications.filter((n) => !n.read)
    : enabledNotifications

  const markAllNotificationsRead = () => {
    const ids = enabledNotifications.filter((n) => !n.read).map((n) => n.id)
    setNotifications((current) => current.map((n) => (ids.includes(n.id) ? { ...n, read: true } : n)))
    supabase.from('notifications').update({ read: true }).in('id', ids).then()
  }

  const dismissNotification = (id: number) => {
    setNotifications((current) => current.filter((n) => n.id !== id))
    supabase.from('notifications').delete().eq('id', id).then()
  }

  const handleNotificationClick = (notification: Notification) => {
    setNotifications((current) =>
      current.map((item) => (item.id === notification.id ? { ...item, read: true } : item))
    )
    if (!notification.read) supabase.from('notifications').update({ read: true }).eq('id', notification.id).then()
    if (notification.threadId) openThreadInFeed(notification.threadId)
    else if (notification.noticeId) openNoticeInFeed(notification.noticeId)
    setNotifOpen(false)
  }

  const notifIconBg: Record<NotificationType, string> = {
    reply: 'bg-primary/15 text-primary',
    mention: 'bg-blue-100 dark:bg-blue-500/15 text-blue-700 dark:text-blue-400',
    notice: 'bg-amber-100 dark:bg-amber-500/15 text-amber-700 dark:text-amber-400',
    trending: 'bg-violet-100 dark:bg-violet-500/15 text-violet-700 dark:text-violet-400',
  }

  const renderNotifIcon = (type: NotificationType) => {
    switch (type) {
      case 'reply':
        return <MessageCircle size={15} />
      case 'mention':
        return <AtSign size={15} />
      case 'notice':
        return <Megaphone size={15} />
      case 'trending':
        return <TrendingUp size={15} />
    }
  }

  // Sube un archivo a <bucket>/<id del usuario>/... y devuelve su URL pública
  const uploadFile = async (bucket: 'thread-images' | 'materials', file: File) => {
    const extension = file.name.includes('.') ? file.name.split('.').pop()!.toLowerCase() : ''
    const path = `${user.id}/${crypto.randomUUID()}${extension ? `.${extension}` : ''}`
    const { error } = await supabase.storage.from(bucket).upload(path, file, { contentType: file.type })
    if (error) throw error
    return supabase.storage.from(bucket).getPublicUrl(path).data.publicUrl
  }

  const handleAddThread = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newTitle.trim() || !newBody.trim() || publishing) return
    setPublishing(true)

    try {
      const imageUrl = newImage ? await uploadFile('thread-images', newImage.file) : null
      const pdfUrl = newPdf ? await uploadFile('materials', newPdf) : null

      const { data: inserted, error } = await supabase
        .from('threads')
        .insert({
          category: newCategory,
          title: newTitle.trim(),
          body: newBody.trim(),
          tags: newTags,
          image_url: imageUrl,
          attachment_url: pdfUrl,
          attachment_name: newPdf?.name ?? null,
          attachment_size: newPdf ? formatSize(newPdf.size) : null,
        })
        .select('id')
        .single()
      if (error) throw error

      const { data: created, error: feedError } = await supabase
        .from('feed_threads').select('*').eq('id', inserted.id).single()
      if (feedError) throw feedError
      setThreads((current) => [toThread(created as FeedThreadRow), ...current])
    } catch {
      setPublishing(false)
      showToast('No se pudo publicar el hilo')
      return
    }

    setPublishing(false)
    setNewTitle('')
    setNewBody('')
    removeNewImage()
    setNewPdf(null)
    setNewTags([])
    setTagDraft('')
    setShowTagInput(false)
    setModal(false)
    selectTab('Para ti')
    showToast('Hilo publicado')
  }

  const handlePdfSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    if (file.type !== 'application/pdf') {
      showToast('Selecciona un archivo PDF')
      return
    }
    if (file.size > PDF_MAX_MB * 1024 * 1024) {
      showToast(`El PDF supera los ${PDF_MAX_MB} MB`)
      return
    }
    setNewPdf(file)
  }

  const handleImageSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    if (!file.type.startsWith('image/')) {
      showToast('Selecciona un archivo de imagen')
      return
    }
    if (file.size > IMAGE_MAX_MB * 1024 * 1024) {
      showToast(`La imagen supera los ${IMAGE_MAX_MB} MB`)
      return
    }
    if (newImage) URL.revokeObjectURL(newImage.url)
    setNewImage({ url: URL.createObjectURL(file), name: file.name, file })
  }

  const removeNewImage = () => {
    if (newImage) URL.revokeObjectURL(newImage.url)
    setNewImage(null)
  }

  const addTag = () => {
    const tag = tagDraft.replace(/^#+/, '').replace(/[\s,]+/g, '').trim()
    setTagDraft('')
    if (!tag || newTags.some((t) => t.toLowerCase() === tag.toLowerCase())) return
    if (newTags.length >= TAGS_MAX) {
      showToast(`Máximo ${TAGS_MAX} etiquetas por hilo`)
      return
    }
    setNewTags([...newTags, tag])
  }

  const handleAddComment = async (threadId: number) => {
    const text = newCommentText[threadId]?.trim()
    if (!text) return

    setNewCommentText((current) => ({ ...current, [threadId]: '' }))
    const { data, error } = await supabase
      .from('comments')
      .insert({ thread_id: threadId, content: text })
      .select('id')
      .single()
    if (error) {
      setNewCommentText((current) => ({ ...current, [threadId]: text }))
      showToast('No se pudo enviar tu respuesta')
      return
    }

    setThreads((current) => current.map((t) => t.id === threadId ? { ...t, replies: t.replies + 1 } : t))
    setComments((current) => ({
      ...current,
      [threadId]: [...(current[threadId] || []), { id: data.id, author: displayName, initials: displayInitials, text }],
    }))
  }

  const isCareersView = activeNav === 'categories'

  const toggleCategory = (category: string) =>
    setSelectedCategories((current) =>
      current.includes(category) ? current.filter((item) => item !== category) : [...current, category]
    )

  const threadScore = (t: Thread) => t.score
  const isNoticesTab = !isCareersView && activeTab === 'Avisos del campus'

  const filteredThreads = threads.filter((t) => {
    // Vista Carreras: sin selección se muestran todas; con selección, cualquiera de las elegidas
    if (isCareersView && selectedCategories.length > 0 && !selectedCategories.includes(t.category)) return false
    if (!isCareersView && activeTab === 'Mis guardados' && !saved.includes(t.id)) return false
    const q = searchQuery.trim().replace(/^#/, '').toLowerCase()
    if (!q) return true
    return (
      t.title.toLowerCase().includes(q) ||
      t.body.toLowerCase().includes(q) ||
      t.category.toLowerCase().includes(q) ||
      t.author.toLowerCase().includes(q) ||
      (t.tags || []).some((tag) => tag.toLowerCase().includes(q))
    )
  })

  if (!isCareersView && activeTab === 'Para ti') {
    // Primero los hilos de la carrera del usuario, conservando el orden cronológico
    const own = careerCategory[user.career]
    filteredThreads.sort((a, b) => Number(b.category === own) - Number(a.category === own))
  } else if (!isCareersView && activeTab === 'En tendencia') {
    filteredThreads.sort((a, b) => threadScore(b) - threadScore(a))
  }

  // Temas populares: las etiquetas más usadas en los hilos publicados
  const tagCounts = new Map<string, number>()
  threads.forEach((t) => t.tags?.forEach((tag) => tagCounts.set(tag, (tagCounts.get(tag) || 0) + 1)))
  const popularTags = [...tagCounts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8).map(([tag]) => tag)

  const today = new Date().toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long' })


  // Cierra el menú móvil con Escape (diálogos, menús y popovers ya lo gestionan solos)
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMobileMenu(false)
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])

  const activeItemClass = 'bg-primary/10 text-primary hover:bg-primary/15 hover:text-primary'

  return (
    <div className="min-h-screen bg-muted/40 text-foreground">
      {/* Header */}
      <header className="sticky top-0 z-20 border-b bg-background/95 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-[1440px] items-center gap-4 px-4 lg:px-8">
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden"
            onClick={() => setMobileMenu(!mobileMenu)}
            aria-label="Abrir menú"
            aria-expanded={mobileMenu}
          >
            <Menu />
          </Button>

          <a
            href="#feed"
            onClick={() => goToSection('feed')}
            className="flex min-w-fit items-center rounded-lg outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
            aria-label="Ir al inicio de Wiki UTOM"
          >
            <img src="/media/fontico.webp" alt="UTOM" className="h-9 w-auto object-contain sm:h-10" />
          </a>

          {/* Navegación central: icono sobre texto */}
          <nav className="hidden flex-1 items-center justify-center gap-4 md:flex lg:gap-8">
            {navItems.map(({ id, label, icon: Icon }) => {
              const active = activeNav === id
              return (
                <a
                  key={id}
                  href={`#${id}`}
                  onClick={() => goToSection(id)}
                  aria-current={active ? 'page' : undefined}
                  className={cn(
                    buttonVariants({ variant: 'ghost' }),
                    'group relative h-auto flex-col gap-1 px-3.5 py-1 text-xs text-muted-foreground [&_svg:not([class*=size-])]:size-[19px]',
                    active && activeItemClass
                  )}
                >
                  <Icon className="transition-transform group-hover:scale-110" />
                  <span>{label}</span>
                  {active && (
                    <span className="absolute -bottom-2 left-1/2 h-0.5 w-8 -translate-x-1/2 rounded-full bg-primary" />
                  )}
                </a>
              )
            })}
          </nav>

          <div className="ml-auto flex items-center gap-2">
            {/* Notificaciones */}
            <Popover open={notifOpen} onOpenChange={setNotifOpen}>
              <PopoverTrigger
                render={<Button variant="ghost" size="icon" className="relative" aria-label="Notificaciones" />}
              >
                <Bell className="size-5" />
                {unreadCount > 0 && (
                  <Badge className="absolute -top-1 -right-1 h-4 min-w-4 border-background px-1 text-[10px] tabular-nums">
                    {unreadCount}
                  </Badge>
                )}
              </PopoverTrigger>
              <PopoverContent align="end" className="w-[360px] max-w-[calc(100vw-2rem)] gap-0 p-0">
                <div className="flex items-center justify-between px-4 py-3">
                  <PopoverHeader className="flex-row items-center gap-2">
                    <PopoverTitle>Notificaciones</PopoverTitle>
                    {unreadCount > 0 && <Badge variant="secondary">{unreadCount} nuevas</Badge>}
                  </PopoverHeader>
                  {unreadCount > 0 && (
                    <Button variant="link" size="xs" onClick={markAllNotificationsRead} className="px-0">
                      <CheckCheck /> Marcar leídas
                    </Button>
                  )}
                </div>
                <Separator />

                <div className="flex gap-1 px-3 pt-3">
                  {(['all', 'unread'] as const).map((filter) => (
                    <Button
                      key={filter}
                      variant={notifFilter === filter ? 'secondary' : 'ghost'}
                      size="xs"
                      aria-pressed={notifFilter === filter}
                      onClick={() => setNotifFilter(filter)}
                    >
                      {filter === 'all' ? 'Todas' : `No leídas${unreadCount > 0 ? ` (${unreadCount})` : ''}`}
                    </Button>
                  ))}
                </div>

                <div className="mt-2 max-h-[340px] overflow-y-auto">
                  {visibleNotifications.length === 0 ? (
                    <div className="flex flex-col items-center justify-center px-6 py-10 text-center">
                      <BellOff className="mb-2 size-6 text-muted-foreground/60" />
                      <p className="text-sm font-medium">Sin notificaciones</p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {notifFilter === 'unread'
                          ? 'Ya leíste todas tus notificaciones.'
                          : 'Aquí verás la actividad de la comunidad.'}
                      </p>
                    </div>
                  ) : (
                    visibleNotifications.map((notification) => (
                      <div key={notification.id} className="group relative">
                        <button
                          type="button"
                          onClick={() => handleNotificationClick(notification)}
                          className={cn(
                            'flex w-full cursor-pointer gap-3 px-4 py-3 pr-9 text-left outline-none transition-colors hover:bg-accent focus-visible:bg-accent',
                            !notification.read && 'bg-primary/5'
                          )}
                        >
                          <div className={cn('flex size-8 shrink-0 items-center justify-center rounded-full', notifIconBg[notification.type])}>
                            {renderNotifIcon(notification.type)}
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <p className="text-xs font-medium">{notification.title}</p>
                              {!notification.read && <span className="size-1.5 shrink-0 rounded-full bg-primary" />}
                            </div>
                            <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">{notification.description}</p>
                            <span className="mt-1 block text-[11px] text-muted-foreground">{timeAgo(notification.createdAt)}</span>
                          </div>
                        </button>
                        <Button
                          variant="ghost"
                          size="icon-xs"
                          onClick={() => dismissNotification(notification.id)}
                          className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 focus-visible:opacity-100"
                          aria-label="Descartar notificación"
                        >
                          <X />
                        </Button>
                      </div>
                    ))
                  )}
                </div>

                <Separator />
                <Button
                  variant="ghost"
                  className="h-10 rounded-none text-xs text-muted-foreground"
                  onClick={() => {
                    setCurrentView('settings')
                    setNotifOpen(false)
                    setTimeout(() => {
                      document.getElementById('settings-notifications')?.scrollIntoView({ behavior: 'smooth', block: 'center' })
                    }, 60)
                  }}
                >
                  <Settings /> Configurar notificaciones
                </Button>
              </PopoverContent>
            </Popover>

            {/* Menú de perfil */}
            <DropdownMenu>
              <DropdownMenuTrigger
                render={<Button variant="ghost" size="icon" className="rounded-full" aria-label="Menú de perfil" />}
              >
                <Avatar>
                  <AvatarFallback className="bg-primary/15 text-xs font-semibold text-primary">{displayInitials}</AvatarFallback>
                </Avatar>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-64">
                <div className="flex items-center gap-3 px-2 py-2">
                  <Avatar size="lg">
                    <AvatarFallback className="bg-primary/15 font-semibold text-primary">{displayInitials}</AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{displayName}</p>
                    <p className="truncate text-xs text-muted-foreground">{user.email}</p>
                    <Badge variant="secondary" className="mt-1.5">{user.career} · {user.role}</Badge>
                  </div>
                </div>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => setCurrentView('settings')}>
                  <Settings /> Ajustes de cuenta
                </DropdownMenuItem>
                <DropdownMenuItem variant="destructive" onClick={onLogout}>
                  <LogOut /> Cerrar sesión
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Menú móvil */}
        {mobileMenu && (
          <div className="border-t bg-background px-4 py-3 lg:hidden">
            <div className="flex flex-col gap-1">
              {navItems.map(({ id, label, icon: Icon }) => {
                const active = activeNav === id
                return (
                  <a
                    key={id}
                    href={`#${id}`}
                    onClick={() => {
                      setMobileMenu(false)
                      goToSection(id)
                    }}
                    aria-current={active ? 'page' : undefined}
                    className={cn(buttonVariants({ variant: 'ghost', size: 'lg' }), 'justify-start gap-2.5', active && activeItemClass)}
                  >
                    <Icon /> {label}
                  </a>
                )
              })}
              <Button
                variant="ghost"
                size="lg"
                className={cn('justify-start gap-2.5', currentView === 'settings' && activeItemClass)}
                onClick={() => {
                  setMobileMenu(false)
                  setCurrentView('settings')
                }}
              >
                <Settings /> Ajustes
              </Button>
              <Button
                variant="ghost"
                size="lg"
                className="justify-start gap-2.5"
                onClick={() => {
                  setMobileMenu(false)
                  setModal(true)
                }}
              >
                <Sparkles className="text-primary" /> Crear hilo
              </Button>
              <Separator className="my-1" />
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">Conectado como {displayName}</span>
                <Button variant="destructive" size="sm" onClick={onLogout}>
                  Cerrar sesión
                </Button>
              </div>
            </div>
          </div>
        )}
      </header>

      {/* Main body */}
      <main className="mx-auto grid max-w-[1440px] grid-cols-1 gap-6 px-4 py-6 lg:grid-cols-[220px_minmax(0,1fr)] lg:px-8 xl:grid-cols-[220px_minmax(0,1fr)_280px]">

        {/* Barra lateral izquierda */}
        <aside className="hidden lg:block" aria-labelledby="sidebar-title">
          <div className="sticky top-24">
            <h2 id="sidebar-title" className="mb-2 px-2 text-xs font-medium text-muted-foreground">
              Accesos rápidos
            </h2>
            <div className="flex flex-col gap-1">
              <Button
                variant="ghost"
                size="lg"
                onClick={() => selectTab('Mis guardados')}
                aria-current={activeNav === 'feed' && activeTab === 'Mis guardados' ? 'page' : undefined}
                className={cn('justify-start gap-3 text-muted-foreground', activeNav === 'feed' && activeTab === 'Mis guardados' && activeItemClass)}
              >
                <Bookmark /> Mis guardados
                <Badge variant="secondary" className="ml-auto tabular-nums">{saved.length}</Badge>
              </Button>
              <Button
                variant="ghost"
                size="lg"
                onClick={() => setCurrentView('settings')}
                aria-current={currentView === 'settings' ? 'page' : undefined}
                className={cn('justify-start gap-3 text-muted-foreground', currentView === 'settings' && activeItemClass)}
              >
                <Settings /> Ajustes
              </Button>
              <Button
                variant="ghost"
                size="lg"
                onClick={() => selectTab('En tendencia')}
                aria-current={activeNav === 'feed' && activeTab === 'En tendencia' ? 'page' : undefined}
                className={cn('justify-start gap-3 text-muted-foreground', activeNav === 'feed' && activeTab === 'En tendencia' && activeItemClass)}
              >
                <TrendingUp /> Hilos populares
              </Button>
            </div>
          </div>
        </aside>

        {/* Contenido central: Ajustes o Feed */}
        {currentView === 'settings' ? (
          <section id="settings" className="min-w-0">
            <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <Button variant="link" size="sm" onClick={handleCancelSettings} className="mb-1 px-0">
                  <ArrowLeft /> Volver al Feed
                </Button>
                <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">Ajustes</h1>
                <p className="mt-1 text-sm text-muted-foreground">
                  Administra tu perfil institucional, preferencias de la comunidad y seguridad.
                </p>
              </div>

              {savedSuccess && (
                <div className="flex items-center gap-2 rounded-lg border border-primary/30 bg-primary/10 px-3.5 py-2 text-xs font-medium text-primary animate-in fade-in">
                  <Check className="size-4" />
                  <span>Ajustes guardados con éxito</span>
                </div>
              )}
            </div>

            {user.mustChangePassword && (
              <div role="alert" className="mb-6 flex items-start gap-2.5 rounded-lg border border-amber-500/30 bg-amber-50 p-3.5 text-xs text-amber-800 dark:bg-amber-500/10 dark:text-amber-300">
                <AlertCircle className="mt-0.5 size-4 shrink-0" />
                <span>
                  Estás usando tu matrícula como contraseña temporal. Cámbiala en la sección{' '}
                  <span className="font-medium">Cambiar contraseña</span> para proteger tu cuenta.
                </span>
              </div>
            )}

            <div className="flex flex-col gap-6">
              {/* Tarjeta 1: Perfil del estudiante */}
              <Card>
                <CardHeader className="border-b">
                  <div className="flex items-center gap-3">
                    <div className="flex size-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                      <User className="size-[18px]" />
                    </div>
                    <div className="grid gap-1">
                      <CardTitle>Perfil del estudiante</CardTitle>
                      <CardDescription>Información visible para la comunidad UTOM</CardDescription>
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="flex flex-col gap-6">
                  <div className="flex flex-col items-start gap-4 sm:flex-row" aria-live="polite">
                    <Avatar className="size-14 rounded-xl after:rounded-xl">
                      <AvatarFallback className="rounded-xl bg-primary/15 text-lg font-semibold text-primary">
                        {getInitials(settingsName) || user.initials}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1 space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="truncate text-base font-medium">{settingsName.trim() || 'Sin nombre'}</span>
                        <Badge variant="secondary">{user.career}</Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">Vista previa de cómo te verán en la comunidad</p>
                    </div>
                  </div>

                  <fieldset className="grid grid-cols-1 gap-x-4 gap-y-5 sm:grid-cols-2">
                    <legend className="sr-only">Datos editables del perfil</legend>

                    <div className="grid gap-2">
                      <Label htmlFor="profile-name">
                        Nombre para mostrar <span className="text-destructive" aria-hidden="true">*</span>
                      </Label>
                      <Input
                        id="profile-name"
                        name="displayName"
                        type="text"
                        autoComplete="name"
                        required
                        maxLength={NAME_MAX}
                        value={settingsName}
                        onChange={(e) => setSettingsName(e.target.value)}
                        aria-invalid={nameError ? true : undefined}
                        aria-describedby="profile-name-hint"
                      />
                      <p id="profile-name-hint" className={cn('text-xs', nameError ? 'text-destructive' : 'text-muted-foreground')}>
                        {nameError || 'Así aparecerás en tus hilos y comentarios.'}
                      </p>
                    </div>

                    <div className="grid gap-2 sm:col-span-2">
                      <div className="flex items-baseline justify-between">
                        <Label htmlFor="profile-bio">Biografía / Estado</Label>
                        <span
                          className={cn('text-xs tabular-nums', settingsBio.length >= BIO_MAX ? 'text-destructive' : 'text-muted-foreground')}
                          aria-hidden="true"
                        >
                          {settingsBio.length}/{BIO_MAX}
                        </span>
                      </div>
                      <Textarea
                        id="profile-bio"
                        name="bio"
                        rows={3}
                        maxLength={BIO_MAX}
                        value={settingsBio}
                        onChange={(e) => setSettingsBio(e.target.value)}
                        aria-describedby="profile-bio-hint"
                        className="resize-none"
                        placeholder="Escribe una breve presentación o materias de tu interés..."
                      />
                      <p id="profile-bio-hint" className="text-xs text-muted-foreground">
                        Opcional · máximo {BIO_MAX} caracteres.
                      </p>
                    </div>
                  </fieldset>

                  <Separator />

                  <fieldset className="grid grid-cols-1 gap-x-4 gap-y-5 sm:grid-cols-2">
                    <legend className="mb-4 text-xs font-medium text-muted-foreground">
                      Gestionado por la institución · no editable
                    </legend>

                    <div className="grid gap-2">
                      <Label htmlFor="profile-full-name">Nombre oficial</Label>
                      <Input id="profile-full-name" name="fullName" type="text" readOnly value={user.fullName} className={readOnlyInputClass} />
                    </div>

                    <div className="grid gap-2">
                      <Label htmlFor="profile-student-id">Matrícula</Label>
                      <Input id="profile-student-id" name="studentId" type="text" readOnly value={user.studentId} className={readOnlyInputClass} />
                    </div>

                    <div className="grid gap-2">
                      <Label htmlFor="profile-email">Correo institucional</Label>
                      <Input id="profile-email" name="email" type="email" readOnly value={user.email} className={readOnlyInputClass} />
                    </div>

                    <div className="grid gap-2">
                      <Label htmlFor="profile-role">Rol institucional</Label>
                      <Input id="profile-role" name="role" type="text" readOnly value={user.role} className={readOnlyInputClass} />
                    </div>

                    <div className="grid gap-2 sm:col-span-2">
                      <Label htmlFor="profile-career">Carrera actual</Label>
                      <Input
                        id="profile-career"
                        name="career"
                        type="text"
                        readOnly
                        value={careerOptions.find((career) => career.value === user.career)?.label || user.career}
                        aria-describedby="profile-career-hint"
                        className={readOnlyInputClass}
                      />
                      <p id="profile-career-hint" className="text-xs text-muted-foreground">
                        Para un cambio de carrera acude a Servicios Escolares.
                      </p>
                    </div>
                  </fieldset>
                </CardContent>
              </Card>

              {/* Tarjeta 2: Cambio de contraseña */}
              <form onSubmit={handleChangePassword} noValidate>
              <Card>
                <CardHeader className="border-b">
                  <div className="flex items-center gap-3">
                    <div className="flex size-9 items-center justify-center rounded-lg bg-destructive/10 text-destructive">
                      <KeyRound className="size-[18px]" />
                    </div>
                    <div className="grid gap-1">
                      <CardTitle>Cambiar contraseña</CardTitle>
                      <CardDescription>Verificamos el formato y que ambas contraseñas coincidan</CardDescription>
                    </div>
                  </div>
                  <CardAction>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowPasswords(!showPasswords)}
                      aria-pressed={showPasswords}
                    >
                      {showPasswords ? <EyeOff /> : <Eye />}
                      {showPasswords ? 'Ocultar' : 'Mostrar'}
                    </Button>
                  </CardAction>
                </CardHeader>

                <CardContent>
                  {/* Campo oculto para que los gestores de contraseñas asocien la cuenta */}
                  <input type="email" name="username" autoComplete="username" value={user.email} readOnly hidden />

                  <div className="grid grid-cols-1 gap-x-4 gap-y-5 sm:grid-cols-2">
                    <div className="grid gap-2 sm:col-span-2 sm:max-w-[calc(50%-0.5rem)]">
                      <Label htmlFor="password-current">Contraseña actual</Label>
                      <Input
                        id="password-current"
                        name="currentPassword"
                        type={showPasswords ? 'text' : 'password'}
                        autoComplete="current-password"
                        required
                        value={currentPassword}
                        onChange={(e) => setCurrentPassword(e.target.value)}
                      />
                    </div>

                    <div className="grid gap-2">
                      <Label htmlFor="password-new">Nueva contraseña</Label>
                      <Input
                        id="password-new"
                        name="newPassword"
                        type={showPasswords ? 'text' : 'password'}
                        autoComplete="new-password"
                        required
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        aria-invalid={newPassword && (!passwordSyntaxValid || passwordReused) ? true : undefined}
                        aria-describedby="password-rules password-reused"
                        className={cn(newPassword && passwordSyntaxValid && !passwordReused && 'border-primary/60')}
                      />
                      <p id="password-reused" className="min-h-4 text-xs text-destructive" aria-live="polite">
                        {passwordReused ? 'La nueva contraseña debe ser distinta a la actual.' : ''}
                      </p>
                    </div>

                    <div className="grid gap-2">
                      <Label htmlFor="password-confirm">Confirmar nueva contraseña</Label>
                      <Input
                        id="password-confirm"
                        name="confirmPassword"
                        type={showPasswords ? 'text' : 'password'}
                        autoComplete="new-password"
                        required
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        onPaste={(e) => e.preventDefault()}
                        aria-invalid={confirmPassword && !passwordsMatch ? true : undefined}
                        aria-describedby="password-confirm-hint"
                        className={cn(passwordsMatch && 'border-primary/60')}
                      />
                      <p
                        id="password-confirm-hint"
                        aria-live="polite"
                        className={cn(
                          'flex min-h-4 items-center gap-1 text-xs [&_svg]:size-3',
                          !confirmPassword ? 'text-muted-foreground' : passwordsMatch ? 'text-primary' : 'text-destructive'
                        )}
                      >
                        {!confirmPassword
                          ? 'Escríbela de nuevo (no se permite pegar).'
                          : passwordsMatch
                            ? <><Check /> Las contraseñas coinciden</>
                            : <><X /> Las contraseñas no coinciden</>}
                      </p>
                    </div>

                    <ul
                      id="password-rules"
                      className="grid grid-cols-1 gap-x-4 gap-y-1.5 rounded-lg border bg-muted/40 p-3.5 sm:col-span-2 sm:grid-cols-3"
                    >
                      {passwordChecks.map((rule) => (
                        <li
                          key={rule.id}
                          className={cn('flex items-center gap-1.5 text-xs', rule.passed ? 'text-primary' : 'text-muted-foreground')}
                        >
                          {rule.passed ? <Check className="size-3.5" /> : <Circle className="size-3" />}
                          {rule.label}
                          <span className="sr-only">{rule.passed ? '(cumplido)' : '(pendiente)'}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </CardContent>

                <CardFooter className="justify-end gap-3">
                  {passwordSuccess && (
                    <span className="flex items-center gap-1.5 text-xs font-medium text-primary" role="status">
                      <Check className="size-4" /> Contraseña actualizada
                    </span>
                  )}
                  {passwordError && (
                    <span className="flex items-center gap-1.5 text-xs font-medium text-destructive" role="alert">
                      <AlertCircle className="size-4" /> {passwordError}
                    </span>
                  )}
                  <Button type="submit" disabled={!canChangePassword}>
                    {changingPassword ? <Loader2 className="animate-spin" /> : <KeyRound />} Actualizar contraseña
                  </Button>
                </CardFooter>
              </Card>
              </form>

              {/* Tarjeta 3: Notificaciones y alertas */}
              <Card id="settings-notifications" className="scroll-mt-24">
                <CardHeader className="border-b">
                  <div className="flex items-center gap-3">
                    <div className="flex size-9 items-center justify-center rounded-lg bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400">
                      <Bell className="size-[18px]" />
                    </div>
                    <div className="grid gap-1">
                      <CardTitle>Notificaciones y alertas</CardTitle>
                      <CardDescription>Controla cuándo recibes alertas sobre actividades del foro</CardDescription>
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="flex flex-col gap-3">
                  {[
                    { id: 'notif-replies', title: 'Respuestas a mis hilos', hint: 'Notificarme inmediatamente cuando un compañero comente', checked: notifReplies, onChange: setNotifReplies },
                    { id: 'notif-notices', title: 'Avisos urgentes del campus', hint: 'Convocatorias, becas y calendarios de reinscripción', checked: notifNotices, onChange: setNotifNotices },
                    { id: 'notif-digest', title: 'Boletín semanal de mi carrera', hint: 'Hilos con mejores aportes y material descargable', checked: notifDigest, onChange: setNotifDigest },
                  ].map((pref) => (
                    <Label
                      key={pref.id}
                      className="cursor-pointer justify-between gap-4 rounded-lg border p-3.5 leading-normal font-normal transition-colors hover:bg-accent/50"
                    >
                      <span className="grid gap-0.5">
                        <span className="text-sm font-medium">{pref.title}</span>
                        <span className="text-xs text-muted-foreground">{pref.hint}</span>
                      </span>
                      <Switch id={pref.id} checked={pref.checked} onCheckedChange={(checked) => pref.onChange(checked)} />
                    </Label>
                  ))}
                </CardContent>
              </Card>

              {/* Tarjeta 4: Apariencia */}
              <Card>
                <CardHeader className="border-b">
                  <div className="flex items-center gap-3">
                    <div className="flex size-9 items-center justify-center rounded-lg bg-violet-50 text-violet-600 dark:bg-violet-500/10 dark:text-violet-400">
                      <Sliders className="size-[18px]" />
                    </div>
                    <div className="grid gap-1">
                      <CardTitle>Tema y visualización</CardTitle>
                      <CardDescription>Se aplica de inmediato y se guarda en este equipo</CardDescription>
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="flex flex-col gap-3">
                  <Tabs value={themePreference} onValueChange={(value) => handleThemeChange(value as 'light' | 'system' | 'dark')}>
                    <TabsList className="w-full" aria-label="Tema">
                      <TabsTrigger value="light">Modo claro</TabsTrigger>
                      <TabsTrigger value="system">Automático</TabsTrigger>
                      <TabsTrigger value="dark">Modo oscuro</TabsTrigger>
                    </TabsList>
                  </Tabs>
                  <p className="text-xs text-muted-foreground">
                    Tema en uso: <span className="font-medium text-foreground">{resolvedDark ? 'Modo oscuro' : 'Modo claro'}</span>
                    {themePreference === 'system' ? ' · siguiendo tu sistema' : ' · guardado en este equipo'}
                  </p>
                </CardContent>
              </Card>

              {/* Botones de acción */}
              <div className="flex items-center justify-end gap-2 pt-2 pb-6">
                <Button type="button" variant="outline" size="lg" onClick={handleCancelSettings}>
                  Cancelar
                </Button>
                <Button type="button" size="lg" disabled={!!nameError || savingSettings} onClick={handleSaveSettings}>
                  {savingSettings ? <Loader2 className="animate-spin" /> : <Save />} Guardar ajustes
                </Button>
              </div>
            </div>
          </section>
        ) : (
          <section id={isCareersView ? 'categories' : isNoticesTab ? 'notices' : 'feed'} className="min-w-0">
          {isCareersView ? (
            <div className="mb-5">
              <p className="text-sm font-medium text-primary">Carreras</p>
              <h1 className="mt-1 text-2xl font-semibold tracking-tight sm:text-3xl">Explora por carrera</h1>
              <p className="mt-1 text-sm text-muted-foreground">
                Selecciona una o varias categorías para combinar sus hilos.
              </p>

              <Card size="sm" className="mt-4">
                <CardHeader>
                  <CardDescription id="careers-filter-label" className="text-xs font-medium">Explorar</CardDescription>
                  {selectedCategories.length > 0 && (
                    <CardAction>
                      <Button variant="link" size="xs" className="px-0" onClick={() => setSelectedCategories([])}>
                        <X /> Limpiar filtros ({selectedCategories.length})
                      </Button>
                    </CardAction>
                  )}
                </CardHeader>
                <CardContent className="flex flex-col gap-3">
                  <div role="group" aria-labelledby="careers-filter-label" className="flex flex-wrap gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setSelectedCategories([])}
                      aria-pressed={selectedCategories.length === 0}
                      className={cn('rounded-full', selectedCategories.length === 0 && 'border-primary bg-primary/10 text-primary hover:bg-primary/15 hover:text-primary')}
                    >
                      Todas
                    </Button>
                    {initialCategories.map((category) => {
                      const selected = selectedCategories.includes(category)
                      const count = threads.filter((t) => t.category === category).length
                      return (
                        <Button
                          key={category}
                          variant="outline"
                          size="sm"
                          onClick={() => toggleCategory(category)}
                          aria-pressed={selected}
                          className={cn('rounded-full', selected && 'border-primary bg-primary/10 text-primary hover:bg-primary/15 hover:text-primary')}
                        >
                          {selected ? <Check /> : <span className={cn('size-2 rounded-full', categoryDot[category])} />}
                          {category}
                          <span className={cn('tabular-nums', selected ? 'text-primary' : 'text-muted-foreground')}>{count}</span>
                        </Button>
                      )
                    })}
                  </div>
                  <p className="text-xs text-muted-foreground" aria-live="polite">
                    {filteredThreads.length} {filteredThreads.length === 1 ? 'hilo' : 'hilos'} ·{' '}
                    {selectedCategories.length === 0 ? 'todas las categorías' : selectedCategories.join(', ')}
                  </p>
                </CardContent>
              </Card>
            </div>
          ) : (
          <>
          <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-sm font-medium text-primary first-letter:uppercase">{today}</p>
              <h1 className="mt-1 text-2xl font-semibold tracking-tight sm:text-3xl">Tu comunidad, al día.</h1>
              <p className="mt-1 text-sm text-muted-foreground">Descubre lo que está pasando en UTOM.</p>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">Conectado:</span>
              <Badge variant="secondary">{user.career}</Badge>
            </div>
          </div>

          {/* Vista filtrada abierta desde la barra lateral o la navbar */}
          {activeTab !== 'Para ti' && (
            <div className="mb-5 flex items-center justify-between gap-3 rounded-lg border bg-card px-4 py-2.5">
              <span className="text-sm font-medium">{feedModeLabel[activeTab]}</span>
              <Button variant="link" size="sm" className="px-0" onClick={() => selectTab('Para ti')}>
                <ArrowLeft /> Ver todo el feed
              </Button>
            </div>
          )}
          </>
          )}

          {isNoticesTab ? (
          /* Avisos oficiales del campus */
          <div className="flex flex-col gap-3">
            {!loading && campusNotices.length === 0 && (
              <Card>
                <CardContent className="flex flex-col items-center py-8 text-center">
                  <Megaphone className="mb-2 size-7 text-muted-foreground/60" />
                  <p className="font-medium">Sin avisos oficiales</p>
                  <p className="mt-1 text-xs text-muted-foreground">Aquí aparecerán los avisos que publique la administración.</p>
                </CardContent>
              </Card>
            )}
            {campusNotices.map((notice) => {
              const expanded = openNotice === notice.id
              return (
                <Card key={notice.id} className="gap-0 py-0">
                  <button
                    type="button"
                    onClick={() => setOpenNotice(expanded ? null : notice.id)}
                    aria-expanded={expanded}
                    aria-controls={`notice-body-${notice.id}`}
                    className="flex w-full cursor-pointer items-start gap-3 p-4 text-left outline-none transition-colors hover:bg-accent/40 focus-visible:bg-accent/40"
                  >
                    <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400">
                      <Megaphone className="size-[18px]" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h2 className="text-sm font-medium sm:text-base">{notice.title}</h2>
                        <Badge className="bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400">OFICIAL</Badge>
                      </div>
                      <span className="mt-0.5 block text-xs text-muted-foreground">{timeAgo(notice.publishedAt)}</span>
                    </div>
                    <ChevronDown className={cn('mt-1 size-[18px] shrink-0 text-muted-foreground transition-transform', expanded && 'rotate-180')} />
                  </button>
                  {expanded && (
                    <CardContent id={`notice-body-${notice.id}`} className="border-t py-4 leading-6 whitespace-pre-line text-muted-foreground">
                      {notice.body}
                    </CardContent>
                  )}
                </Card>
              )
            })}
          </div>
          ) : (
          <>
          {/* Búsqueda */}
          <div className="relative mb-3">
            <Label htmlFor="thread-search" className="sr-only">Buscar hilos</Label>
            <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              id="thread-search"
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar por título, autor, categoría o #etiqueta..."
              className="h-10 bg-card pr-10 pl-9 shadow-xs"
            />
            {searchQuery && (
              <Button
                variant="ghost"
                size="icon-xs"
                onClick={() => setSearchQuery('')}
                className="absolute top-1/2 right-2 -translate-y-1/2"
                aria-label="Limpiar búsqueda"
              >
                <X />
              </Button>
            )}
          </div>

          {/* Barra rápida para crear hilo */}
          <button
            type="button"
            onClick={() => setModal(true)}
            className="mb-5 flex w-full cursor-pointer items-center gap-3 rounded-xl bg-card p-3 text-left ring-1 ring-foreground/10 outline-none transition hover:ring-primary/40 focus-visible:ring-3 focus-visible:ring-ring/50"
          >
            <Avatar>
              <AvatarFallback className="bg-primary/15 text-xs font-semibold text-primary">{displayInitials}</AvatarFallback>
            </Avatar>
            <span className="text-sm text-muted-foreground">
              Hola {displayName.split(' ')[0]}, ¿qué quieres compartir con la comunidad?
            </span>
            <span className={cn(buttonVariants({ variant: 'secondary', size: 'sm' }), 'ml-auto hidden sm:inline-flex')}>
              Crear hilo
            </span>
          </button>

          {/* Lista de hilos */}
          <div className="flex flex-col gap-4">
            {loading && (
              <div className="flex items-center justify-center gap-2 py-10 text-sm text-muted-foreground">
                <Loader2 className="size-4 animate-spin" /> Cargando hilos...
              </div>
            )}
            {loadError && (
              <Card>
                <CardContent className="flex flex-col items-center py-8 text-center">
                  <AlertCircle className="mb-2 size-7 text-destructive" />
                  <p className="font-medium">No se pudieron cargar los datos</p>
                  <Button variant="link" size="sm" className="mt-2" onClick={loadData}>Reintentar</Button>
                </CardContent>
              </Card>
            )}
            {!loading && !loadError && filteredThreads.map((thread) => (
              <Card key={thread.id} id={`thread-${thread.id}`} className="scroll-mt-24 transition-shadow hover:shadow-sm">
                <CardHeader>
                  <div className="flex items-start gap-3">
                    <Avatar size="lg">
                      <AvatarFallback className="text-xs font-semibold text-foreground">{thread.initials}</AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                        <span className="text-sm font-medium">{thread.author}</span>
                        <Badge variant="secondary" className={cn('rounded-md', thread.accent)}>{thread.career}</Badge>
                        <span className="text-xs text-muted-foreground">· {timeAgo(thread.createdAt)}</span>
                      </div>
                      <div className="mt-0.5 text-xs text-muted-foreground">{thread.role}</div>
                    </div>
                  </div>
                  <CardAction>
                    <DropdownMenu>
                      <DropdownMenuTrigger render={<Button variant="ghost" size="icon-sm" aria-label="Más opciones" />}>
                        <MoreHorizontal />
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-48">
                        <DropdownMenuItem onClick={() => copyThreadLink(thread.id)}>
                          <Link2 /> Copiar enlace
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => toggleSave(thread.id)}>
                          <Bookmark /> {saved.includes(thread.id) ? 'Quitar de guardados' : 'Guardar hilo'}
                        </DropdownMenuItem>
                        {(thread.authorId === user.id || user.isAdmin) && (
                          <>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem variant="destructive" onClick={() => deleteThread(thread)}>
                              <Trash2 /> Eliminar hilo
                            </DropdownMenuItem>
                          </>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </CardAction>
                </CardHeader>

                <CardContent>
                  <div className="mb-2 flex items-center gap-2">
                    <Badge variant="outline" className="rounded-md text-muted-foreground">{thread.category}</Badge>
                    {threadScore(thread) >= TRENDING_SCORE && (
                      <span className="flex items-center gap-1 text-xs font-medium text-amber-600 dark:text-amber-400">
                        <TrendingUp className="size-3.5" /> En tendencia
                      </span>
                    )}
                  </div>
                  <h2 className="text-base leading-snug font-semibold sm:text-lg">{thread.title}</h2>
                  <p className="mt-2 text-sm leading-6 whitespace-pre-line text-muted-foreground">{thread.body}</p>

                  {thread.image && (
                    <img
                      src={thread.image.url}
                      alt={thread.image.name}
                      className="mt-3 max-h-80 w-full rounded-lg border object-cover"
                    />
                  )}

                  {thread.tags && (
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {thread.tags.map((tag) => (
                        <Button key={tag} variant="secondary" size="xs" className="rounded-full text-primary" onClick={() => searchFor(tag)}>
                          #{tag}
                        </Button>
                      ))}
                    </div>
                  )}

                  {thread.attachment && (
                    <div className="mt-3 flex items-center gap-3 rounded-lg border bg-muted/40 p-3">
                      <div className="flex size-9 items-center justify-center rounded-lg bg-violet-100 text-violet-600 dark:bg-violet-500/15 dark:text-violet-400">
                        <FileText className="size-[18px]" />
                      </div>
                      <div className="min-w-0">
                        <div className="truncate text-sm font-medium">{thread.attachment.name}</div>
                        <div className="text-xs text-muted-foreground">
                          {thread.attachment.size ? `${thread.attachment.size} · ` : ''}Documento de estudio
                        </div>
                      </div>
                      <a
                        href={thread.attachment.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        download={thread.attachment.name}
                        className={cn(buttonVariants({ variant: 'ghost', size: 'icon-sm' }), 'ml-auto')}
                        aria-label={`Descargar ${thread.attachment.name}`}
                      >
                        <Download />
                      </a>
                    </div>
                  )}
                </CardContent>

                <CardFooter className="flex-col items-stretch gap-0 bg-transparent p-0">
                  {/* Barra de acciones */}
                  <div className="flex items-center gap-1 px-4 py-2">
                    <div className="flex items-center rounded-lg border bg-muted/40">
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => toggleVote(thread.id, 1)}
                        aria-pressed={votes[thread.id] === 1}
                        className={cn('rounded-r-none', votes[thread.id] === 1 ? 'bg-primary/10 text-primary' : 'text-muted-foreground')}
                        aria-label="Votar a favor"
                      >
                        <ThumbsUp />
                      </Button>
                      <span className="min-w-7 text-center text-xs font-medium tabular-nums">{threadScore(thread)}</span>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => toggleVote(thread.id, -1)}
                        aria-pressed={votes[thread.id] === -1}
                        className={cn('rounded-l-none', votes[thread.id] === -1 ? 'bg-destructive/10 text-destructive' : 'text-muted-foreground')}
                        aria-label="Votar en contra"
                      >
                        <ThumbsDown />
                      </Button>
                    </div>

                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-muted-foreground"
                      onClick={() => setOpenThread(openThread === thread.id ? null : thread.id)}
                      aria-expanded={openThread === thread.id}
                    >
                      <MessageCircle /> {thread.replies} respuestas
                    </Button>

                    <Button
                      variant="ghost"
                      size="icon-sm"
                      onClick={() => toggleSave(thread.id)}
                      className={cn('ml-auto', saved.includes(thread.id) ? 'bg-primary/10 text-primary' : 'text-muted-foreground')}
                      aria-label={saved.includes(thread.id) ? 'Quitar de guardados' : 'Guardar hilo'}
                      aria-pressed={saved.includes(thread.id)}
                    >
                      <Bookmark fill={saved.includes(thread.id) ? 'currentColor' : 'none'} />
                    </Button>
                    <Button variant="ghost" size="icon-sm" className="text-muted-foreground" onClick={() => shareThread(thread)} aria-label="Compartir">
                      <Share2 />
                    </Button>
                  </div>

                  {/* Comentarios */}
                  {openThread === thread.id && (
                    <div className="border-t bg-muted/40 px-4 py-4">
                      <div className="flex flex-col gap-3">
                        {!comments[thread.id] && thread.replies > 0 && (
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <Loader2 className="size-3.5 animate-spin" /> Cargando respuestas...
                          </div>
                        )}
                        {(comments[thread.id] || []).map((comment) => (
                          <div key={comment.id} className="flex gap-3">
                            <Avatar>
                              <AvatarFallback className="bg-card text-[10px] font-semibold">{comment.initials}</AvatarFallback>
                            </Avatar>
                            <div className="flex-1 rounded-lg bg-card p-3 ring-1 ring-foreground/10">
                              <div className="text-xs font-medium">{comment.author}</div>
                              <p className="mt-1 text-xs leading-5 text-muted-foreground">{comment.text}</p>
                              <Button variant="link" size="xs" className="mt-1 h-auto px-0" onClick={() => replyToComment(thread.id, comment.author)}>
                                Responder
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>

                      <div className={cn('flex items-center gap-2', (comments[thread.id]?.length || thread.replies > 0) && 'mt-4')}>
                        <Label htmlFor={`reply-input-${thread.id}`} className="sr-only">Responder a este hilo</Label>
                        <Input
                          id={`reply-input-${thread.id}`}
                          value={newCommentText[thread.id] || ''}
                          onChange={(e) => setNewCommentText({ ...newCommentText, [thread.id]: e.target.value })}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleAddComment(thread.id)
                          }}
                          className="bg-card"
                          placeholder="Responder a este hilo..."
                        />
                        <Button size="icon" onClick={() => handleAddComment(thread.id)} aria-label="Enviar respuesta">
                          <Send />
                        </Button>
                      </div>
                    </div>
                  )}
                </CardFooter>
              </Card>
            ))}

            {!loading && !loadError && filteredThreads.length === 0 && (
              <Card>
                <CardContent className="flex flex-col items-center py-8 text-center">
                  <Search className="mb-2 size-7 text-muted-foreground/60" />
                  <p className="font-medium">No se encontraron hilos</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {searchQuery.trim()
                      ? `Ningún hilo coincide con "${searchQuery.trim()}".`
                      : isCareersView && selectedCategories.length > 0
                        ? 'Aún no hay hilos en las categorías seleccionadas.'
                        : !isCareersView && activeTab === 'Mis guardados'
                          ? 'Usa el ícono de marcador en un hilo para guardarlo aquí.'
                          : 'Crea una nueva publicación para iniciar la conversación.'}
                  </p>
                  {searchQuery.trim() ? (
                    <Button variant="link" size="sm" className="mt-2" onClick={() => setSearchQuery('')}>
                      Limpiar búsqueda
                    </Button>
                  ) : isCareersView && selectedCategories.length > 0 ? (
                    <Button variant="link" size="sm" className="mt-2" onClick={() => setSelectedCategories([])}>
                      Ver todas las categorías
                    </Button>
                  ) : null}
                </CardContent>
              </Card>
            )}
          </div>
          </>
          )}
        </section>
      )}

        {/* Barra lateral derecha: avisos y temas */}
        <aside className="hidden xl:block">
          <div className="sticky top-24 flex flex-col gap-4">
            <Card size="sm">
              <CardHeader>
                <CardTitle>Avisos importantes</CardTitle>
                <CardAction>
                  <Badge className="bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400">OFICIAL</Badge>
                </CardAction>
              </CardHeader>
              <CardContent className="flex flex-col gap-1">
                {campusNotices.length === 0 && (
                  <p className="text-xs text-muted-foreground">Todavía no hay avisos publicados.</p>
                )}
                {campusNotices.slice(0, 3).map((notice, i) => (
                  <button
                    key={notice.id}
                    type="button"
                    onClick={() => openNoticeInFeed(notice.id)}
                    className="group -mx-2 flex cursor-pointer items-start gap-2 rounded-md px-2 py-1.5 text-left outline-none transition-colors hover:bg-accent focus-visible:ring-3 focus-visible:ring-ring/50"
                  >
                    <span className={cn('mt-1.5 size-1.5 shrink-0 rounded-full', i === 0 ? 'bg-amber-500' : 'bg-muted-foreground/40')} />
                    <span className="text-xs leading-5 font-medium">
                      {notice.title}
                      <span className="block text-[11px] font-normal text-muted-foreground">{timeAgo(notice.publishedAt)}</span>
                    </span>
                    <ChevronRight className="mt-1 ml-auto size-3.5 shrink-0 text-muted-foreground/60 group-hover:text-primary" />
                  </button>
                ))}
                <Button variant="link" size="xs" className="mt-1 self-start px-0" onClick={() => openNoticeInFeed(null)}>
                  Ver todos los avisos →
                </Button>
              </CardContent>
            </Card>

            {popularTags.length > 0 && (
              <Card size="sm">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="size-4 text-primary" /> Temas populares
                  </CardTitle>
                </CardHeader>
                <CardContent className="flex flex-wrap gap-2">
                  {popularTags.map((tag) => (
                    <Button key={tag} variant="secondary" size="xs" className="rounded-full" onClick={() => searchFor(tag)}>
                      #{tag}
                    </Button>
                  ))}
                </CardContent>
              </Card>
            )}
          </div>
        </aside>
      </main>

      {/* Diálogo: Crear nuevo hilo */}
      <Dialog open={modal} onOpenChange={(open) => setModal(open)}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Crear nuevo hilo</DialogTitle>
            <DialogDescription>
              Publicando como <span className="font-medium text-primary">{displayName}</span> ({user.career})
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleAddThread} className="grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="new-thread-title">Título</Label>
              <Input
                id="new-thread-title"
                required
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                placeholder="¿De qué quieres hablar?"
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="new-thread-category">Categoría</Label>
              <NativeSelect
                id="new-thread-category"
                value={newCategory}
                onChange={(e) => setNewCategory(e.target.value)}
                className="w-full"
              >
                {initialCategories.map((category) => (
                  <NativeSelectOption key={category} value={category}>{category}</NativeSelectOption>
                ))}
              </NativeSelect>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="new-thread-body">Cuerpo del hilo</Label>
              <Textarea
                id="new-thread-body"
                required
                value={newBody}
                onChange={(e) => setNewBody(e.target.value)}
                className="min-h-28 resize-none"
                placeholder="Escribe tu publicación con detalles para que la comunidad te pueda ayudar..."
              />
            </div>

            {newImage && (
              <div className="relative">
                <img
                  src={newImage.url}
                  alt={`Vista previa de ${newImage.name}`}
                  className="max-h-48 w-full rounded-lg border object-cover"
                />
                <Button
                  type="button"
                  variant="secondary"
                  size="icon-sm"
                  onClick={removeNewImage}
                  className="absolute top-2 right-2 shadow-sm"
                  aria-label="Quitar imagen"
                >
                  <X />
                </Button>
              </div>
            )}

            {newPdf && (
              <div className="flex items-center gap-3 rounded-lg border bg-muted/40 p-3">
                <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-violet-100 text-violet-600 dark:bg-violet-500/15 dark:text-violet-400">
                  <FileText className="size-[18px]" />
                </div>
                <div className="min-w-0">
                  <div className="truncate text-sm font-medium">{newPdf.name}</div>
                  <div className="text-xs text-muted-foreground">{formatSize(newPdf.size)}</div>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => setNewPdf(null)}
                  className="ml-auto"
                  aria-label="Quitar PDF"
                >
                  <X />
                </Button>
              </div>
            )}

            {showTagInput && (
              <div className="grid gap-2">
                <Label htmlFor="new-thread-tag">
                  Etiquetas <span className="font-normal text-muted-foreground">({newTags.length}/{TAGS_MAX})</span>
                </Label>
                <div className="flex min-h-8 flex-wrap items-center gap-1.5 rounded-lg border border-input px-2 py-1.5 transition-colors focus-within:border-ring focus-within:ring-3 focus-within:ring-ring/50 dark:bg-input/30">
                  {newTags.map((tag) => (
                    <Badge key={tag} variant="secondary" className="gap-0.5 pr-1">
                      #{tag}
                      <button
                        type="button"
                        onClick={() => setNewTags(newTags.filter((t) => t !== tag))}
                        className="cursor-pointer rounded-full p-0.5 hover:text-destructive"
                        aria-label={`Quitar etiqueta ${tag}`}
                      >
                        <X />
                      </button>
                    </Badge>
                  ))}
                  <input
                    id="new-thread-tag"
                    value={tagDraft}
                    onChange={(e) => setTagDraft(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ',') {
                        e.preventDefault()
                        addTag()
                      } else if (e.key === 'Backspace' && !tagDraft && newTags.length) {
                        setNewTags(newTags.slice(0, -1))
                      }
                    }}
                    onBlur={addTag}
                    className="min-w-24 flex-1 bg-transparent px-1 text-sm outline-none placeholder:text-muted-foreground"
                    placeholder={newTags.length ? '' : 'Escribe y pulsa Enter'}
                  />
                </div>
              </div>
            )}

            <div className="flex flex-wrap items-center gap-2">
              <input
                ref={imageInputRef}
                type="file"
                accept="image/png,image/jpeg,image/webp,image/gif"
                onChange={handleImageSelected}
                className="hidden"
              />
              <input ref={pdfInputRef} type="file" accept="application/pdf" onChange={handlePdfSelected} className="hidden" />
              <Button type="button" variant="outline" size="sm" className="border-dashed" onClick={() => imageInputRef.current?.click()}>
                <ImagePlus /> {newImage ? 'Cambiar imagen' : 'Adjuntar imagen'}
              </Button>
              <Button type="button" variant="outline" size="sm" className="border-dashed" onClick={() => pdfInputRef.current?.click()}>
                <Paperclip /> {newPdf ? 'Cambiar PDF' : 'Adjuntar PDF'}
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                aria-expanded={showTagInput}
                className={cn('border-dashed', showTagInput && 'border-primary/60 text-primary')}
                onClick={() => {
                  setShowTagInput(true)
                  requestAnimationFrame(() => document.getElementById('new-thread-tag')?.focus())
                }}
              >
                <Hash /> Añadir etiquetas
              </Button>
            </div>

            <DialogFooter>
              <DialogClose render={<Button type="button" variant="outline" />}>Cancelar</DialogClose>
              <Button type="submit" disabled={publishing}>
                {publishing ? <Loader2 className="animate-spin" /> : <Send />} Publicar hilo
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Aviso flotante de confirmación */}
      <div
        role="status"
        aria-live="polite"
        className="pointer-events-none fixed inset-x-0 bottom-6 z-[60] flex justify-center px-4"
      >
        {toast && (
          <div className="flex items-center gap-2 rounded-lg bg-popover px-4 py-3 text-sm font-medium text-popover-foreground shadow-lg ring-1 ring-foreground/10">
            <Check className="size-4 text-primary" />
            {toast}
          </div>
        )}
      </div>
    </div>
  )
}
