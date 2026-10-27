'use client'

import { useEffect, useRef, useState } from 'react'
import {
  ArrowLeft, AtSign, Bell, BellOff, Bookmark, Check, CheckCheck, ChevronDown, ChevronRight, Circle,
  Download, Eye, EyeOff, FileText, GraduationCap, Hash, Home, ImagePlus, KeyRound, Link2, LogOut,
  Megaphone, Menu, MessageCircle, MoreHorizontal, Save, Search, Send, Settings, Share2,
  Sliders, Sparkles, ThumbsDown, ThumbsUp, Trash2, TrendingUp,
  X, User
} from 'lucide-react'
import { cn } from '@/lib/utils'
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
  time: string
  read: boolean
  threadId?: number | null
  noticeId?: number
}

interface ThreadComment {
  author: string
  initials: string
  text: string
}

interface Thread {
  id: number
  author: string
  initials: string
  career: string
  time: string
  category: string
  title: string
  body: string
  score: number
  replies: number
  accent: string
  comments: ThreadComment[]
  mine?: boolean
  image?: { url: string; name: string }
  tags?: string[]
  attachment?: { name: string; size: string }
}

const campusNotices = [
  {
    id: 1, title: 'Periodo de reinscripciones', date: 'Publicado hoy',
    body: 'Del 30 de septiembre al 4 de octubre. Revisa el calendario de tu carrera y confirma tu carga académica en el portal escolar.',
  },
  {
    id: 2, title: 'Becas de movilidad 2025', date: 'Hace 2 días',
    body: 'Abierta la convocatoria de movilidad estudiantil. Consulta requisitos y fechas de entrega en Servicios Escolares.',
  },
  {
    id: 3, title: 'Cierre temporal de biblioteca', date: 'Hace 2 días',
    body: 'La biblioteca permanecerá cerrada por mantenimiento. Los préstamos vigentes se extienden automáticamente.',
  },
]

// El feed ya no muestra pestañas: "Para ti" es la vista normal y las demás
// se abren desde la barra lateral (guardados, populares) o la navbar (avisos)
type FeedTab = 'Para ti' | 'En tendencia' | 'Mis guardados' | 'Avisos del campus'

const feedModeLabel: Record<Exclude<FeedTab, 'Para ti'>, string> = {
  'En tendencia': 'Hilos populares',
  'Mis guardados': 'Mis guardados',
  'Avisos del campus': 'Avisos oficiales',
}

const popularTags = ['Inscripciones', 'Residencias', 'Hackathon', 'Cafetería', 'ServicioSocial']

// Categoría del foro asociada a cada carrera (para priorizar "Para ti")
const careerCategory: Record<string, string> = {
  TI: 'TI', BIO: 'Biotecnología', MKT: 'Mercadotecnia', GAST: 'Gastronomía',
}

const TRENDING_SCORE = 60
const IMAGE_MAX_MB = 5
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
  onLogout: () => void
}

export default function ForumView({ user, onLogout }: ForumViewProps) {
  const [activeTab, setActiveTab] = useState<FeedTab>('Para ti')
  const [openThread, setOpenThread] = useState<number | null>(1)
  const [saved, setSaved] = useState<number[]>([])
  const [votes, setVotes] = useState<Record<number, number>>({})
  const [modal, setModal] = useState(false)
  const [mobileMenu, setMobileMenu] = useState(false)
  const [currentView, setCurrentView] = useState<'feed' | 'settings'>('feed')
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
  const [settingsBio, setSettingsBio] = useState('Estudiante activo en la comunidad Wiki UTOM')
  const [notifReplies, setNotifReplies] = useState(true)
  const [notifNotices, setNotifNotices] = useState(true)
  const [notifDigest, setNotifDigest] = useState(false)
  const [themePreference, setThemePreference] = useState<'light' | 'system' | 'dark'>('system')
  const [savedSuccess, setSavedSuccess] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')

  // Últimos ajustes guardados: "Guardar" los confirma y "Cancelar" vuelve a ellos
  const [savedSettings, setSavedSettings] = useState({
    name: user.name,
    bio: 'Estudiante activo en la comunidad Wiki UTOM',
    notifReplies: true,
    notifNotices: true,
    notifDigest: false,
  })
  const displayName = savedSettings.name
  const displayInitials = getInitials(displayName) || user.initials

  const handleSaveSettings = () => {
    if (nameError) return
    setSettingsName(trimmedName)
    setSavedSettings({ name: trimmedName, bio: settingsBio.trim(), notifReplies, notifNotices, notifDigest })
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

  const passwordChecks = passwordRules.map((rule) => ({ ...rule, passed: rule.test(newPassword) }))
  const passwordSyntaxValid = passwordChecks.every((rule) => rule.passed)
  const passwordReused = newPassword.length > 0 && newPassword === currentPassword
  const passwordsMatch = confirmPassword.length > 0 && confirmPassword === newPassword
  const canChangePassword =
    currentPassword.length > 0 && passwordSyntaxValid && !passwordReused && passwordsMatch

  const handleChangePassword = (e: React.FormEvent) => {
    e.preventDefault()
    if (!canChangePassword) return
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
  const [notifications, setNotifications] = useState<Notification[]>([
    {
      id: 1, type: 'reply', title: 'Nueva respuesta en tu hilo',
      description: 'Diego Ramírez comentó: "La recomiendo mucho, el proyecto final es una app completa."',
      time: 'hace 12 min', read: false, threadId: 1,
    },
    {
      id: 2, type: 'notice', title: 'Aviso: Periodo de reinscripciones',
      description: 'Del 30 de septiembre al 4 de octubre. Revisa el calendario de tu carrera.',
      time: 'hace 1 h', read: false, threadId: null, noticeId: 1,
    },
    {
      id: 3, type: 'mention', title: 'Te mencionaron en un hilo',
      description: 'Carlos Méndez te etiquetó en "Hackathon UTOM 2025".',
      time: 'hace 3 h', read: false, threadId: 2,
    },
    {
      id: 4, type: 'trending', title: 'Tu hilo está en tendencia',
      description: '"Material para el examen de microbiología" superó los 50 votos.',
      time: 'ayer', read: true, threadId: 3,
    },
    {
      id: 5, type: 'reply', title: 'Nueva respuesta en material de estudio',
      description: 'Paola Vega preguntó por las prácticas previas de la muestra.',
      time: 'ayer', read: true, threadId: 4,
    },
  ])

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
  const [newImage, setNewImage] = useState<{ url: string; name: string } | null>(null)
  const [newTags, setNewTags] = useState<string[]>([])
  const [tagDraft, setTagDraft] = useState('')
  const [showTagInput, setShowTagInput] = useState(false)
  const imageInputRef = useRef<HTMLInputElement>(null)

  const [threads, setThreads] = useState<Thread[]>([
    {
      id: 1, author: 'Mariana López', initials: 'ML', career: 'TI', time: 'hace 2h', category: 'TI',
      title: '¿Alguien ya tomó la materia de Desarrollo Web?',
      body: 'Estoy armando mi horario para el próximo cuatrimestre y me gustaría conocer su experiencia con la materia. ¿Qué proyectos hacen y qué tan pesada es la carga?',
      score: 38, replies: 14, accent: 'bg-primary/15 text-primary',
      comments: [
        { author: 'Diego Ramírez', initials: 'DR', text: 'La recomiendo mucho. El proyecto final es una app completa y el profe explica súper bien.' },
        { author: 'Sofía Cruz', initials: 'SC', text: 'Lleva tiempo, pero aprendes muchísimo. Ve preparando JavaScript desde antes.' }
      ],
    },
    {
      id: 2, author: 'Carlos Méndez', initials: 'CM', career: 'MKT', time: 'hace 4h', category: 'Mercadotecnia',
      title: 'Campaña y pitch para el Hackathon UTOM 2025',
      body: 'Buscamos integrar al equipo a compañeros de Mercadotecnia y diseño para la estrategia de difusión y pitch comercial. El registro cierra este viernes.',
      score: 72, replies: 21, accent: 'bg-blue-100 dark:bg-blue-500/15 text-blue-700 dark:text-blue-400',
      comments: [
        { author: 'Ana Torres', initials: 'AT', text: '¡Me interesa colaborar en la propuesta de valor y presentación!' }
      ],
    },
    {
      id: 3, author: 'Valeria Núñez', initials: 'VN', career: 'BIO', time: 'ayer', category: 'Biotecnología',
      title: 'Material para el examen de microbiología',
      body: 'Subí mis apuntes y una guía de estudio que nos compartió la maestra. Ojalá les sirva para repasar antes del examen del jueves.',
      score: 54, replies: 9, accent: 'bg-violet-100 dark:bg-violet-500/15 text-violet-700 dark:text-violet-400',
      comments: [],
      attachment: { name: 'Guía_microbiología.pdf', size: '2.4 MB' },
    },
    {
      id: 4, author: 'Rodrigo Morales', initials: 'RM', career: 'GAST', time: 'ayer', category: 'Gastronomía',
      title: 'Muestra gastronómica regional UTOM: bases y registro',
      body: 'Comparto las bases para participar en la muestra de cocina tradicional del próximo mes. Pueden registrar equipos de hasta 3 alumnos.',
      score: 46, replies: 8, accent: 'bg-amber-100 dark:bg-amber-500/15 text-amber-700 dark:text-amber-400',
      comments: [
        { author: 'Paola Vega', initials: 'PV', text: '¿En qué cocina-taller se realizarán las prácticas previas?' }
      ],
    },
  ])

  const [newCommentText, setNewCommentText] = useState<Record<number, string>>({})

  const toggleVote = (id: number, amount: number) =>
    setVotes((current) => ({ ...current, [id]: current[id] === amount ? 0 : amount }))

  const toggleSave = (id: number) => {
    showToast(saved.includes(id) ? 'Hilo quitado de tus guardados' : 'Hilo guardado')
    setSaved((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id])
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

  const deleteThread = (thread: Thread) => {
    if (!window.confirm(`¿Eliminar el hilo "${thread.title}"? Esta acción no se puede deshacer.`)) return
    if (thread.image) URL.revokeObjectURL(thread.image.url)
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

  const markAllNotificationsRead = () =>
    setNotifications((current) =>
      current.map((n) => (n.read || !notificationEnabled[n.type] ? n : { ...n, read: true }))
    )

  const dismissNotification = (id: number) =>
    setNotifications((current) => current.filter((n) => n.id !== id))

  const handleNotificationClick = (notification: Notification) => {
    setNotifications((current) =>
      current.map((item) => (item.id === notification.id ? { ...item, read: true } : item))
    )
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

  const handleAddThread = (e: React.FormEvent) => {
    e.preventDefault()
    if (!newTitle.trim() || !newBody.trim()) return

    const careerAccentMap: Record<string, string> = {
      'TI': 'bg-primary/15 text-primary',
      'MKT': 'bg-blue-100 dark:bg-blue-500/15 text-blue-700 dark:text-blue-400',
      'BIO': 'bg-violet-100 dark:bg-violet-500/15 text-violet-700 dark:text-violet-400',
      'GAST': 'bg-amber-100 dark:bg-amber-500/15 text-amber-700 dark:text-amber-400'
    }

    const created: Thread = {
      id: Date.now(),
      author: displayName,
      initials: displayInitials,
      career: user.career || 'UTOM',
      time: 'justo ahora',
      category: newCategory,
      title: newTitle.trim(),
      body: newBody.trim(),
      score: 1,
      replies: 0,
      accent: careerAccentMap[user.career] || 'bg-primary/15 text-primary',
      comments: [],
      mine: true,
      image: newImage || undefined,
      tags: newTags.length ? newTags : undefined,
    }

    setThreads([created, ...threads])
    setNewTitle('')
    setNewBody('')
    setNewImage(null)
    setNewTags([])
    setTagDraft('')
    setShowTagInput(false)
    setModal(false)
    selectTab('Para ti')
    showToast('Hilo publicado')
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
    setNewImage({ url: URL.createObjectURL(file), name: file.name })
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

  const handleAddComment = (threadId: number) => {
    const text = newCommentText[threadId]?.trim()
    if (!text) return

    setThreads((current) =>
      current.map((t) => {
        if (t.id === threadId) {
          return {
            ...t,
            replies: t.replies + 1,
            comments: [
              ...t.comments,
              {
                author: displayName,
                initials: displayInitials,
                text
              }
            ]
          }
        }
        return t
      })
    )

    setNewCommentText((current) => ({ ...current, [threadId]: '' }))
  }

  const isCareersView = activeNav === 'categories'

  const toggleCategory = (category: string) =>
    setSelectedCategories((current) =>
      current.includes(category) ? current.filter((item) => item !== category) : [...current, category]
    )

  const threadScore = (t: Thread) => t.score + (votes[t.id] || 0)
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
                            <span className="mt-1 block text-[11px] text-muted-foreground">{notification.time}</span>
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
                    <Badge variant="secondary" className="mt-1.5">{user.career} · Estudiante UTOM</Badge>
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
                      <Label htmlFor="profile-email">Correo institucional</Label>
                      <Input id="profile-email" name="email" type="email" readOnly value={user.email} className={readOnlyInputClass} />
                    </div>

                    <div className="grid gap-2">
                      <Label htmlFor="profile-role">Rol institucional</Label>
                      <Input id="profile-role" name="role" type="text" readOnly value={user.role || 'Estudiante UTOM'} className={readOnlyInputClass} />
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
                  <Button type="submit" disabled={!canChangePassword}>
                    <KeyRound /> Actualizar contraseña
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
                <Button type="button" size="lg" disabled={!!nameError} onClick={handleSaveSettings}>
                  <Save /> Guardar ajustes
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
              <p className="text-sm font-medium text-primary">Miércoles, 12 de marzo</p>
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
                      <span className="mt-0.5 block text-xs text-muted-foreground">{notice.date}</span>
                    </div>
                    <ChevronDown className={cn('mt-1 size-[18px] shrink-0 text-muted-foreground transition-transform', expanded && 'rotate-180')} />
                  </button>
                  {expanded && (
                    <CardContent id={`notice-body-${notice.id}`} className="border-t py-4 leading-6 text-muted-foreground">
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
            {filteredThreads.map((thread) => (
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
                        <span className="text-xs text-muted-foreground">· {thread.time}</span>
                      </div>
                      <div className="mt-0.5 text-xs text-muted-foreground">Estudiante UTOM</div>
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
                        {(thread.mine || thread.author === user.name) && (
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
                      <div>
                        <div className="text-sm font-medium">{thread.attachment.name}</div>
                        <div className="text-xs text-muted-foreground">{thread.attachment.size} · Documento de estudio</div>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        className="ml-auto"
                        onClick={() => showToast('Archivo de demostración: aún no hay un documento real para descargar')}
                        aria-label={`Descargar ${thread.attachment.name}`}
                      >
                        <Download />
                      </Button>
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
                        {thread.comments.map((comment, idx) => (
                          <div key={idx} className="flex gap-3">
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

                      <div className="mt-4 flex items-center gap-2">
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

            {filteredThreads.length === 0 && (
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
                {campusNotices.map((notice, i) => (
                  <button
                    key={notice.id}
                    type="button"
                    onClick={() => openNoticeInFeed(notice.id)}
                    className="group -mx-2 flex cursor-pointer items-start gap-2 rounded-md px-2 py-1.5 text-left outline-none transition-colors hover:bg-accent focus-visible:ring-3 focus-visible:ring-ring/50"
                  >
                    <span className={cn('mt-1.5 size-1.5 shrink-0 rounded-full', i === 0 ? 'bg-amber-500' : 'bg-muted-foreground/40')} />
                    <span className="text-xs leading-5 font-medium">
                      {notice.title}
                      <span className="block text-[11px] font-normal text-muted-foreground">{notice.date}</span>
                    </span>
                    <ChevronRight className="mt-1 ml-auto size-3.5 shrink-0 text-muted-foreground/60 group-hover:text-primary" />
                  </button>
                ))}
                <Button variant="link" size="xs" className="mt-1 self-start px-0" onClick={() => openNoticeInFeed(null)}>
                  Ver todos los avisos →
                </Button>
              </CardContent>
            </Card>

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

            <div className="flex items-center gap-2">
              <input ref={imageInputRef} type="file" accept="image/*" onChange={handleImageSelected} className="hidden" />
              <Button type="button" variant="outline" size="sm" className="border-dashed" onClick={() => imageInputRef.current?.click()}>
                <ImagePlus /> {newImage ? 'Cambiar imagen' : 'Adjuntar imagen'}
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
              <Button type="submit">
                <Send /> Publicar hilo
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
