'use client'

import { useEffect, useState } from 'react'
import {
  ArrowLeft, AtSign, Bell, BellOff, Bookmark, Check, CheckCheck, ChevronDown, ChevronRight, Circle,
  Eye, EyeOff, FileText, GraduationCap, Hash, Home, ImagePlus, KeyRound, LogOut, Megaphone, Menu,
  MessageCircle, MoreHorizontal, Save, Search, Send, Settings, Share2,
  Sliders, Sparkles, ThumbsDown, ThumbsUp, TrendingUp, Upload,
  X, User
} from 'lucide-react'
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
}

const initialCategories = [
  'TI', 'Biotecnología', 'Mercadotecnia', 'Gastronomía',
  'Convocatorias', 'Preguntas Frecuentes',
]

const categoryDot: Record<string, string> = {
  'TI': 'bg-emerald-500',
  'Biotecnología': 'bg-violet-500',
  'Mercadotecnia': 'bg-blue-500',
  'Gastronomía': 'bg-amber-500',
  'Convocatorias': 'bg-pink-500',
  'Preguntas Frecuentes': 'bg-slate-400',
}

const careerOptions = [
  { value: 'TI', label: 'Tecnologías de la Información (TI)' },
  { value: 'BIO', label: 'Biotecnología (BIO)' },
  { value: 'MKT', label: 'Mercadotecnia (MKT)' },
  { value: 'GAST', label: 'Gastronomía (GAST)' },
]

const NAME_MAX = 40
const BIO_MAX = 160

const fieldLabelClass = 'block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5 cursor-pointer'
const fieldInputClass = 'w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 px-3.5 text-sm text-slate-900 outline-none transition focus:border-emerald-500 focus:bg-white focus:ring-2 focus:ring-emerald-500/20'
const readOnlyInputClass = 'w-full rounded-xl border border-slate-200 bg-slate-100/70 py-2.5 px-3.5 text-sm text-slate-500 outline-none focus:ring-2 focus:ring-slate-300/40'

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
  const [activeTab, setActiveTab] = useState('Para ti')
  const [openThread, setOpenThread] = useState<number | null>(1)
  const [saved, setSaved] = useState<number[]>([])
  const [votes, setVotes] = useState<Record<number, number>>({})
  const [modal, setModal] = useState(false)
  const [mobileMenu, setMobileMenu] = useState(false)
  const [userDropdown, setUserDropdown] = useState(false)
  const [currentView, setCurrentView] = useState<'feed' | 'settings'>('feed')
  const [navSection, setNavSection] = useState<NavSection>('feed')
  const [selectedCategories, setSelectedCategories] = useState<string[]>([])

  // En Ajustes ninguna sección de la navbar queda marcada
  const activeNav: NavSection | null = currentView === 'settings' ? null : navSection

  const goToSection = (section: NavSection) => {
    setCurrentView('feed')
    setNavSection(section)
  }

  // Sincroniza la sección activa con el hash (enlaces directos y botón atrás/adelante)
  useEffect(() => {
    const syncFromHash = () => {
      const hash = window.location.hash.slice(1)
      if (isNavSection(hash)) goToSection(hash)
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
      time: 'hace 1 h', read: false, threadId: null,
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

  const handleThemeChange = (preference: 'light' | 'system' | 'dark') => {
    setThemePreference(preference)
    window.localStorage.setItem('wiki-utom-theme', preference)
  }

  // Modal new thread fields
  const [newTitle, setNewTitle] = useState('')
  const [newCategory, setNewCategory] = useState(initialCategories[0])
  const [newBody, setNewBody] = useState('')

  const [threads, setThreads] = useState([
    {
      id: 1, author: 'Mariana López', initials: 'ML', career: 'TI', time: 'hace 2h', category: 'TI',
      title: '¿Alguien ya tomó la materia de Desarrollo Web?',
      body: 'Estoy armando mi horario para el próximo cuatrimestre y me gustaría conocer su experiencia con la materia. ¿Qué proyectos hacen y qué tan pesada es la carga?',
      score: 38, replies: 14, accent: 'bg-emerald-100 text-emerald-700',
      comments: [
        { author: 'Diego Ramírez', initials: 'DR', text: 'La recomiendo mucho. El proyecto final es una app completa y el profe explica súper bien.' },
        { author: 'Sofía Cruz', initials: 'SC', text: 'Lleva tiempo, pero aprendes muchísimo. Ve preparando JavaScript desde antes.' }
      ],
    },
    {
      id: 2, author: 'Carlos Méndez', initials: 'CM', career: 'MKT', time: 'hace 4h', category: 'Mercadotecnia',
      title: 'Campaña y pitch para el Hackathon UTOM 2025',
      body: 'Buscamos integrar al equipo a compañeros de Mercadotecnia y diseño para la estrategia de difusión y pitch comercial. El registro cierra este viernes.',
      score: 72, replies: 21, accent: 'bg-blue-100 text-blue-700',
      comments: [
        { author: 'Ana Torres', initials: 'AT', text: '¡Me interesa colaborar en la propuesta de valor y presentación!' }
      ],
    },
    {
      id: 3, author: 'Valeria Núñez', initials: 'VN', career: 'BIO', time: 'ayer', category: 'Biotecnología',
      title: 'Material para el examen de microbiología',
      body: 'Subí mis apuntes y una guía de estudio que nos compartió la maestra. Ojalá les sirva para repasar antes del examen del jueves.',
      score: 54, replies: 9, accent: 'bg-violet-100 text-violet-700',
      comments: [],
    },
    {
      id: 4, author: 'Rodrigo Morales', initials: 'RM', career: 'GAST', time: 'ayer', category: 'Gastronomía',
      title: 'Muestra gastronómica regional UTOM: bases y registro',
      body: 'Comparto las bases para participar en la muestra de cocina tradicional del próximo mes. Pueden registrar equipos de hasta 3 alumnos.',
      score: 46, replies: 8, accent: 'bg-amber-100 text-amber-700',
      comments: [
        { author: 'Paola Vega', initials: 'PV', text: '¿En qué cocina-taller se realizarán las prácticas previas?' }
      ],
    },
  ])

  const [newCommentText, setNewCommentText] = useState<Record<number, string>>({})

  const toggleVote = (id: number, amount: number) =>
    setVotes((current) => ({ ...current, [id]: current[id] === amount ? 0 : amount }))

  const toggleSave = (id: number) =>
    setSaved((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id])

  const unreadCount = notifications.filter((n) => !n.read).length
  const visibleNotifications = notifFilter === 'unread'
    ? notifications.filter((n) => !n.read)
    : notifications

  const markAllNotificationsRead = () =>
    setNotifications((current) => current.map((n) => (n.read ? n : { ...n, read: true })))

  const dismissNotification = (id: number) =>
    setNotifications((current) => current.filter((n) => n.id !== id))

  const handleNotificationClick = (notification: Notification) => {
    setNotifications((current) =>
      current.map((item) => (item.id === notification.id ? { ...item, read: true } : item))
    )
    if (notification.threadId) {
      goToSection('feed')
      setOpenThread(notification.threadId)
    }
    setNotifOpen(false)
  }

  const notifIconBg: Record<NotificationType, string> = {
    reply: 'bg-emerald-100 text-emerald-700',
    mention: 'bg-blue-100 text-blue-700',
    notice: 'bg-amber-100 text-amber-700',
    trending: 'bg-violet-100 text-violet-700',
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
      'TI': 'bg-emerald-100 text-emerald-700',
      'MKT': 'bg-blue-100 text-blue-700',
      'BIO': 'bg-violet-100 text-violet-700',
      'GAST': 'bg-amber-100 text-amber-700'
    }

    const created = {
      id: Date.now(),
      author: user.name,
      initials: user.initials,
      career: user.career || 'UTOM',
      time: 'justo ahora',
      category: newCategory,
      title: newTitle.trim(),
      body: newBody.trim(),
      score: 1,
      replies: 0,
      accent: careerAccentMap[user.career] || 'bg-emerald-100 text-emerald-700',
      comments: []
    }

    setThreads([created, ...threads])
    setNewTitle('')
    setNewBody('')
    setModal(false)
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
                author: user.name,
                initials: user.initials,
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

  const filteredThreads = threads.filter((t) => {
    // Vista Carreras: sin selección se muestran todas; con selección, cualquiera de las elegidas
    if (isCareersView && selectedCategories.length > 0 && !selectedCategories.includes(t.category)) return false
    if (!searchQuery.trim()) return true
    const q = searchQuery.toLowerCase()
    return (
      t.title.toLowerCase().includes(q) ||
      t.body.toLowerCase().includes(q) ||
      t.category.toLowerCase().includes(q) ||
      t.author.toLowerCase().includes(q)
    )
  })

  return (
    <div className={`min-h-screen bg-[#f6f8f8] text-slate-900 ${resolvedDark ? 'theme-dark' : ''}`}>
      {/* Header */}
      <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/95 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-[1440px] items-center gap-4 px-4 lg:px-8">
          <button
            className="rounded-lg p-2 lg:hidden text-slate-600 hover:bg-slate-100 cursor-pointer"
            onClick={() => setMobileMenu(!mobileMenu)}
            aria-label="Abrir menú"
          >
            <Menu />
          </button>

          <div className="flex items-center min-w-fit">
            <img
              src="/media/fontico.webp"
              alt="UTOM"
              className="h-9 sm:h-10 w-auto object-contain"
            />
          </div>

          {/* Centered Navigation with icon above text */}
          <nav className="hidden md:flex flex-1 items-center justify-center gap-4 lg:gap-8">
            {navItems.map(({ id, label, icon: Icon }) => {
              const active = activeNav === id
              return (
                <a
                  key={id}
                  href={`#${id}`}
                  onClick={() => goToSection(id)}
                  aria-current={active ? 'page' : undefined}
                  className={`group relative flex flex-col items-center justify-center gap-1 rounded-xl px-3.5 py-1 text-xs transition ${
                    active
                      ? 'bg-emerald-50/70 font-semibold text-emerald-700'
                      : 'font-medium text-slate-500 hover:bg-slate-50 hover:text-emerald-700'
                  }`}
                >
                  <Icon
                    size={19}
                    className={`transition-transform group-hover:scale-110 ${
                      active ? 'text-emerald-600' : 'text-slate-400 group-hover:text-emerald-600'
                    }`}
                  />
                  <span>{label}</span>
                  {active && (
                    <span className="absolute -bottom-2 left-1/2 h-0.5 w-8 -translate-x-1/2 rounded-full bg-emerald-600" />
                  )}
                </a>
              )
            })}
          </nav>

          <div className="ml-auto flex items-center gap-2">
            <div className="relative">
              <button
                onClick={() => setNotifOpen(!notifOpen)}
                className="relative rounded-lg p-2 text-slate-500 hover:bg-slate-100 transition cursor-pointer"
                aria-label="Notificaciones"
                aria-expanded={notifOpen}
              >
                <Bell size={20} />
                {unreadCount > 0 && (
                  <span className="absolute -right-0.5 -top-0.5 flex min-w-[18px] items-center justify-center rounded-full border border-white bg-emerald-500 px-1 text-[10px] font-bold leading-4 text-white">
                    {unreadCount}
                  </span>
                )}
              </button>

              {notifOpen && (
                <>
                  <div className="fixed inset-0 z-20" onClick={() => setNotifOpen(false)} />
                  <div className="absolute right-0 z-30 mt-2 w-[360px] max-w-[calc(100vw-2rem)] overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-xl">
                    <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
                      <div className="flex items-center gap-2">
                        <h3 className="text-sm font-bold text-slate-900">Notificaciones</h3>
                        {unreadCount > 0 && (
                          <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-700">
                            {unreadCount} nuevas
                          </span>
                        )}
                      </div>
                      {unreadCount > 0 && (
                        <button
                          onClick={markAllNotificationsRead}
                          className="flex items-center gap-1 text-[11px] font-semibold text-emerald-700 hover:text-emerald-800 hover:underline cursor-pointer"
                        >
                          <CheckCheck size={14} /> Marcar leídas
                        </button>
                      )}
                    </div>

                    <div className="flex gap-1 px-3 pt-3">
                      {(['all', 'unread'] as const).map((filter) => (
                        <button
                          key={filter}
                          onClick={() => setNotifFilter(filter)}
                          className={`rounded-lg px-2.5 py-1 text-[11px] font-semibold transition cursor-pointer ${
                            notifFilter === filter
                              ? 'bg-emerald-50 text-emerald-700'
                              : 'text-slate-500 hover:bg-slate-50'
                          }`}
                        >
                          {filter === 'all' ? 'Todas' : `No leídas${unreadCount > 0 ? ` (${unreadCount})` : ''}`}
                        </button>
                      ))}
                    </div>

                    <div className="mt-2 max-h-[340px] overflow-y-auto">
                      {visibleNotifications.length === 0 ? (
                        <div className="flex flex-col items-center justify-center px-6 py-10 text-center">
                          <BellOff size={26} className="mb-2 text-slate-300" />
                          <p className="text-sm font-semibold text-slate-600">Sin notificaciones</p>
                          <p className="mt-1 text-xs text-slate-400">
                            {notifFilter === 'unread'
                              ? 'Ya leíste todas tus notificaciones.'
                              : 'Aquí verás la actividad de la comunidad.'}
                          </p>
                        </div>
                      ) : (
                        visibleNotifications.map((notification) => (
                          <div
                            key={notification.id}
                            onClick={() => handleNotificationClick(notification)}
                            className={`group relative flex cursor-pointer gap-3 px-4 py-3 transition ${
                              notification.read
                                ? 'hover:bg-slate-50'
                                : 'bg-emerald-50/40 hover:bg-emerald-50/70'
                            }`}
                          >
                            <div className={`flex size-8 shrink-0 items-center justify-center rounded-full ${notifIconBg[notification.type]}`}>
                              {renderNotifIcon(notification.type)}
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2">
                                <p className="text-xs font-bold text-slate-900">{notification.title}</p>
                                {!notification.read && (
                                  <span className="size-1.5 shrink-0 rounded-full bg-emerald-500" />
                                )}
                              </div>
                              <p className="mt-0.5 line-clamp-2 text-[11px] leading-4 text-slate-500">
                                {notification.description}
                              </p>
                              <span className="mt-1 block text-[10px] text-slate-400">{notification.time}</span>
                            </div>
                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                dismissNotification(notification.id)
                              }}
                              className="absolute right-2 top-2 rounded-md p-1 text-slate-300 opacity-0 transition hover:bg-slate-100 hover:text-slate-500 group-hover:opacity-100 cursor-pointer"
                              aria-label="Descartar notificación"
                            >
                              <X size={13} />
                            </button>
                          </div>
                        ))
                      )}
                    </div>

                    <button
                      onClick={() => {
                        setCurrentView('settings')
                        setNotifOpen(false)
                      }}
                      className="flex w-full items-center justify-center gap-1.5 border-t border-slate-100 px-4 py-2.5 text-[11px] font-semibold text-slate-500 transition hover:bg-slate-50 hover:text-emerald-700 cursor-pointer"
                    >
                      <Settings size={13} /> Configurar notificaciones
                    </button>
                  </div>
                </>
              )}
            </div>

            {/* User Profile dropdown menu */}
            <div className="relative">
              <button
                onClick={() => setUserDropdown(!userDropdown)}
                className="flex size-9 items-center justify-center rounded-full bg-emerald-100 text-xs font-bold text-emerald-800 border-2 border-emerald-500/20 hover:border-emerald-500/60 hover:shadow-sm transition cursor-pointer focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
                aria-label="Menú de perfil"
                aria-expanded={userDropdown}
              >
                {user.initials}
              </button>

              {userDropdown && (
                <>
                  <div
                    className="fixed inset-0 z-20"
                    onClick={() => setUserDropdown(false)}
                  />
                  <div className="absolute right-0 mt-2 w-64 rounded-2xl bg-white p-2.5 shadow-xl border border-slate-100 z-30">
                    <div className="flex items-center gap-3 p-2.5 border-b border-slate-100 mb-1.5">
                      <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-sm font-bold text-emerald-800 ring-2 ring-emerald-500/20">
                        {user.initials}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-bold text-slate-900 leading-tight truncate">{user.name}</p>
                        <p className="text-[11px] text-slate-400 truncate mt-0.5">{user.email}</p>
                        <span className="mt-1.5 inline-flex items-center rounded-md bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700">
                          {user.career} · Estudiante UTOM
                        </span>
                      </div>
                    </div>

                    <button
                      onClick={() => {
                        setUserDropdown(false)
                        setCurrentView('settings')
                      }}
                      className="w-full flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition cursor-pointer mb-1"
                    >
                      <Settings size={15} className="text-slate-500" />
                      Ajustes de cuenta
                    </button>

                    <button
                      onClick={() => {
                        setUserDropdown(false)
                        onLogout()
                      }}
                      className="w-full flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-semibold text-rose-600 hover:bg-rose-50 transition cursor-pointer"
                    >
                      <LogOut size={15} />
                      Cerrar sesión
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Mobile menu */}
        {mobileMenu && (
          <div className="border-t border-slate-100 px-5 py-3 text-sm lg:hidden bg-white">
            <div className="flex flex-col gap-1 font-medium">
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
                    className={`flex items-center gap-2.5 rounded-lg px-2.5 py-2 transition ${
                      active
                        ? 'bg-emerald-50/70 font-semibold text-emerald-700'
                        : 'text-slate-700 hover:bg-slate-50 hover:text-emerald-700'
                    }`}
                  >
                    <Icon size={18} className={active ? 'text-emerald-600' : 'text-slate-400'} />
                    <span>{label}</span>
                  </a>
                )
              })}
              <button
                onClick={() => {
                  setMobileMenu(false)
                  setCurrentView('settings')
                }}
                className={`flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-left transition cursor-pointer ${
                  currentView === 'settings'
                    ? 'text-emerald-700 bg-emerald-50/70 font-semibold'
                    : 'text-slate-700 hover:bg-slate-50 hover:text-emerald-700'
                }`}
              >
                <Settings size={18} className={currentView === 'settings' ? 'text-emerald-600' : 'text-slate-400'} />
                <span>Ajustes</span>
              </button>
              <button
                onClick={() => {
                  setMobileMenu(false)
                  setModal(true)
                }}
                className="flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-slate-700 hover:bg-slate-50 hover:text-emerald-700 font-semibold cursor-pointer"
              >
                <Sparkles size={18} className="text-emerald-600" />
                <span>+ Crear hilo</span>
              </button>
              <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
                <span className="text-slate-500 font-medium">Conectado como {user.name}</span>
                <button
                  onClick={onLogout}
                  className="text-rose-600 font-semibold"
                >
                  Cerrar sesión
                </button>
              </div>
            </div>
          </div>
        )}
      </header>

      {/* Main body */}
      <main className="mx-auto grid max-w-[1440px] grid-cols-1 gap-6 px-4 py-6 lg:grid-cols-[220px_minmax(0,1fr)] xl:grid-cols-[220px_minmax(0,1fr)_280px] lg:px-8">
        
        {/* Left Sidebar */}
        <aside className="hidden lg:block" aria-labelledby="sidebar-title">
          <div className="sticky top-24">
            <h2 id="sidebar-title" className="mb-3 px-2 text-xs font-bold uppercase tracking-wider text-slate-400">
              Accesos rápidos
            </h2>
            <div className="flex flex-col gap-1 text-sm text-slate-600">
              <button
                onClick={() => {
                  goToSection('feed')
                  setActiveTab('Para ti')
                }}
                className={`flex items-center gap-3 rounded-xl px-3 py-2.5 transition cursor-pointer ${
                  currentView === 'feed' && activeTab === 'Mis guardados'
                    ? 'bg-emerald-50 font-semibold text-emerald-700'
                    : 'hover:bg-white hover:shadow-xs'
                }`}
              >
                <Bookmark size={17} /> Mis guardados ({saved.length})
              </button>

              <button
                onClick={() => setCurrentView('settings')}
                className={`flex items-center gap-3 rounded-xl px-3 py-2.5 transition cursor-pointer ${
                  currentView === 'settings'
                    ? 'bg-emerald-50 font-semibold text-emerald-700'
                    : 'hover:bg-white hover:shadow-xs'
                }`}
              >
                <Settings size={17} className={currentView === 'settings' ? 'text-emerald-600' : 'text-slate-400'} />
                <span>Ajustes</span>
              </button>

              <button
                onClick={() => {
                  goToSection('feed')
                  setActiveTab('En tendencia')
                }}
                className="flex items-center gap-3 rounded-xl px-3 py-2.5 hover:bg-white hover:shadow-xs transition cursor-pointer"
              >
                <TrendingUp size={17} /> Hilos populares
              </button>
            </div>
          </div>
        </aside>

        {/* Central Content: Settings View or Normal Feed */}
        {currentView === 'settings' ? (
          <section id="settings" className="min-w-0">
            {/* Header de Ajustes */}
            <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <button
                  onClick={() => goToSection('feed')}
                  className="mb-2 inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-700 hover:text-emerald-800 hover:underline cursor-pointer"
                >
                  <ArrowLeft size={15} />
                  Volver al Feed
                </button>
                <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
                  Ajustes
                </h1>
                <p className="mt-1 text-sm text-slate-500">
                  Administra tu perfil institucional, preferencias de la comunidad y seguridad.
                </p>
              </div>

              {savedSuccess && (
                <div className="flex items-center gap-2 rounded-xl bg-emerald-50 border border-emerald-200 px-3.5 py-2 text-xs font-semibold text-emerald-800 animate-in fade-in">
                  <Check size={16} className="text-emerald-600" />
                  <span>Ajustes guardados con éxito</span>
                </div>
              )}
            </div>

            <div className="flex flex-col gap-6">
              {/* Tarjeta 1: Perfil Institucional */}
              <div className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6 shadow-sm">
                <div className="flex items-center gap-2.5 pb-4 border-b border-slate-100 mb-5">
                  <div className="flex size-9 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
                    <User size={19} />
                  </div>
                  <div>
                    <h2 className="text-base font-bold text-slate-900">Perfil del estudiante</h2>
                    <p className="text-xs text-slate-400">Información visible para la comunidad UTOM</p>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row items-start gap-4 mb-6" aria-live="polite">
                  <div className="flex size-14 shrink-0 items-center justify-center rounded-2xl bg-emerald-100 text-lg font-bold text-emerald-800 ring-4 ring-emerald-500/10">
                    {getInitials(settingsName) || user.initials}
                  </div>
                  <div className="min-w-0 flex-1 space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="truncate font-bold text-slate-900 text-base">
                        {settingsName.trim() || 'Sin nombre'}
                      </span>
                      <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-[10px] font-bold text-emerald-800">
                        {user.career}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500">Vista previa de cómo te verán en la comunidad</p>
                  </div>
                </div>

                <fieldset className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-5">
                  <legend className="sr-only">Datos editables del perfil</legend>

                  <div>
                    <label htmlFor="profile-name" className={fieldLabelClass}>
                      Nombre para mostrar <span className="text-rose-500" aria-hidden="true">*</span>
                    </label>
                    <input
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
                      className={`${fieldInputClass} ${nameError ? 'border-rose-400 focus:border-rose-500 focus:ring-rose-500/20' : ''}`}
                    />
                    <p id="profile-name-hint" className={`mt-1.5 text-[11px] ${nameError ? 'text-rose-600' : 'text-slate-400'}`}>
                      {nameError || 'Así aparecerás en tus hilos y comentarios.'}
                    </p>
                  </div>

                  <div className="sm:col-span-2">
                    <div className="flex items-baseline justify-between">
                      <label htmlFor="profile-bio" className={fieldLabelClass}>
                        Biografía / Estado
                      </label>
                      <span
                        className={`text-[11px] tabular-nums ${settingsBio.length >= BIO_MAX ? 'text-rose-600' : 'text-slate-400'}`}
                        aria-hidden="true"
                      >
                        {settingsBio.length}/{BIO_MAX}
                      </span>
                    </div>
                    <textarea
                      id="profile-bio"
                      name="bio"
                      rows={3}
                      maxLength={BIO_MAX}
                      value={settingsBio}
                      onChange={(e) => setSettingsBio(e.target.value)}
                      aria-describedby="profile-bio-hint"
                      className={`${fieldInputClass} resize-none`}
                      placeholder="Escribe una breve presentación o materias de tu interés..."
                    />
                    <p id="profile-bio-hint" className="mt-1.5 text-[11px] text-slate-400">
                      Opcional · máximo {BIO_MAX} caracteres.
                    </p>
                  </div>
                </fieldset>

                <fieldset className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-5 border-t border-slate-100 pt-5">
                  <legend className="mb-3 text-[11px] font-semibold text-slate-400">
                    Gestionado por la institución · no editable
                  </legend>

                  <div>
                    <label htmlFor="profile-email" className={fieldLabelClass}>
                      Correo institucional
                    </label>
                    <input
                      id="profile-email"
                      name="email"
                      type="email"
                      readOnly
                      value={user.email}
                      className={readOnlyInputClass}
                    />
                  </div>

                  <div>
                    <label htmlFor="profile-role" className={fieldLabelClass}>
                      Rol institucional
                    </label>
                    <input
                      id="profile-role"
                      name="role"
                      type="text"
                      readOnly
                      value={user.role || 'Estudiante UTOM'}
                      className={readOnlyInputClass}
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label htmlFor="profile-career" className={fieldLabelClass}>
                      Carrera actual
                    </label>
                    <input
                      id="profile-career"
                      name="career"
                      type="text"
                      readOnly
                      value={careerOptions.find((career) => career.value === user.career)?.label || user.career}
                      aria-describedby="profile-career-hint"
                      className={readOnlyInputClass}
                    />
                    <p id="profile-career-hint" className="mt-1.5 text-[11px] text-slate-400">
                      Para un cambio de carrera acude a Servicios Escolares.
                    </p>
                  </div>
                </fieldset>
              </div>

              {/* Tarjeta 2: Seguridad / Cambio de contraseña */}
              <form
                onSubmit={handleChangePassword}
                noValidate
                className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6 shadow-sm"
              >
                <div className="flex items-center gap-2.5 pb-4 border-b border-slate-100 mb-5">
                  <div className="flex size-9 items-center justify-center rounded-xl bg-rose-50 text-rose-600">
                    <KeyRound size={19} />
                  </div>
                  <div className="flex-1">
                    <h2 className="text-base font-bold text-slate-900">Cambiar contraseña</h2>
                    <p className="text-xs text-slate-400">Verificamos el formato y que ambas contraseñas coincidan</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowPasswords(!showPasswords)}
                    aria-pressed={showPasswords}
                    className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[11px] font-semibold text-slate-500 hover:bg-slate-100 transition cursor-pointer"
                  >
                    {showPasswords ? <EyeOff size={14} /> : <Eye size={14} />}
                    {showPasswords ? 'Ocultar' : 'Mostrar'}
                  </button>
                </div>

                {/* Campo oculto para que los gestores de contraseñas asocien la cuenta */}
                <input type="email" name="username" autoComplete="username" value={user.email} readOnly hidden />

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-5">
                  <div className="sm:col-span-2 sm:max-w-[calc(50%-0.5rem)]">
                    <label htmlFor="password-current" className={fieldLabelClass}>
                      Contraseña actual
                    </label>
                    <input
                      id="password-current"
                      name="currentPassword"
                      type={showPasswords ? 'text' : 'password'}
                      autoComplete="current-password"
                      required
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      className={fieldInputClass}
                    />
                  </div>

                  <div>
                    <label htmlFor="password-new" className={fieldLabelClass}>
                      Nueva contraseña
                    </label>
                    <input
                      id="password-new"
                      name="newPassword"
                      type={showPasswords ? 'text' : 'password'}
                      autoComplete="new-password"
                      required
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      aria-invalid={newPassword && (!passwordSyntaxValid || passwordReused) ? true : undefined}
                      aria-describedby="password-rules password-reused"
                      className={`${fieldInputClass} ${
                        newPassword && (!passwordSyntaxValid || passwordReused)
                          ? 'border-rose-400 focus:border-rose-500 focus:ring-rose-500/20'
                          : newPassword && passwordSyntaxValid
                            ? 'border-emerald-400'
                            : ''
                      }`}
                    />
                    <p id="password-reused" className="mt-1.5 text-[11px] text-rose-600" aria-live="polite">
                      {passwordReused ? 'La nueva contraseña debe ser distinta a la actual.' : ''}
                    </p>
                  </div>

                  <div>
                    <label htmlFor="password-confirm" className={fieldLabelClass}>
                      Confirmar nueva contraseña
                    </label>
                    <input
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
                      className={`${fieldInputClass} ${
                        confirmPassword && !passwordsMatch
                          ? 'border-rose-400 focus:border-rose-500 focus:ring-rose-500/20'
                          : passwordsMatch
                            ? 'border-emerald-400'
                            : ''
                      }`}
                    />
                    <p
                      id="password-confirm-hint"
                      aria-live="polite"
                      className={`mt-1.5 flex items-center gap-1 text-[11px] ${
                        !confirmPassword ? 'text-slate-400' : passwordsMatch ? 'text-emerald-600' : 'text-rose-600'
                      }`}
                    >
                      {!confirmPassword
                        ? 'Escríbela de nuevo (no se permite pegar).'
                        : passwordsMatch
                          ? <><Check size={12} /> Las contraseñas coinciden</>
                          : <><X size={12} /> Las contraseñas no coinciden</>}
                    </p>
                  </div>

                  <ul
                    id="password-rules"
                    className="sm:col-span-2 grid grid-cols-1 sm:grid-cols-3 gap-x-4 gap-y-1.5 rounded-xl border border-slate-100 bg-slate-50/50 p-3.5"
                  >
                    {passwordChecks.map((rule) => (
                      <li
                        key={rule.id}
                        className={`flex items-center gap-1.5 text-[11px] font-medium ${
                          rule.passed ? 'text-emerald-700' : 'text-slate-400'
                        }`}
                      >
                        {rule.passed ? <Check size={13} className="text-emerald-600" /> : <Circle size={11} />}
                        {rule.label}
                        <span className="sr-only">{rule.passed ? '(cumplido)' : '(pendiente)'}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="mt-5 flex flex-col-reverse sm:flex-row sm:items-center sm:justify-end gap-3">
                  {passwordSuccess && (
                    <span className="flex items-center gap-1.5 text-xs font-semibold text-emerald-700" role="status">
                      <Check size={15} /> Contraseña actualizada
                    </span>
                  )}
                  <button
                    type="submit"
                    disabled={!canChangePassword}
                    className="flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-slate-800 transition cursor-pointer disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-slate-900"
                  >
                    <KeyRound size={15} />
                    Actualizar contraseña
                  </button>
                </div>
              </form>

              {/* Tarjeta 3: Notificaciones y Alertas */}
              <div className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6 shadow-sm">
                <div className="flex items-center gap-2.5 pb-4 border-b border-slate-100 mb-5">
                  <div className="flex size-9 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                    <Bell size={19} />
                  </div>
                  <div>
                    <h2 className="text-base font-bold text-slate-900">Notificaciones y alertas</h2>
                    <p className="text-xs text-slate-400">Controla cuándo recibes alertas sobre actividades del foro</p>
                  </div>
                </div>

                <div className="space-y-3">
                  <label className="flex items-center justify-between p-3.5 rounded-xl border border-slate-100 bg-slate-50/50 hover:bg-slate-50 transition cursor-pointer">
                    <div>
                      <div className="text-sm font-semibold text-slate-800">Respuestas a mis hilos</div>
                      <div className="text-xs text-slate-400">Notificarme inmediatamente cuando un compañero comente</div>
                    </div>
                    <input
                      type="checkbox"
                      checked={notifReplies}
                      onChange={(e) => setNotifReplies(e.target.checked)}
                      className="size-4.5 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 accent-emerald-600 cursor-pointer"
                    />
                  </label>

                  <label className="flex items-center justify-between p-3.5 rounded-xl border border-slate-100 bg-slate-50/50 hover:bg-slate-50 transition cursor-pointer">
                    <div>
                      <div className="text-sm font-semibold text-slate-800">Avisos urgentes del campus</div>
                      <div className="text-xs text-slate-400">Convocatorias, becas y calendarios de reinscripción</div>
                    </div>
                    <input
                      type="checkbox"
                      checked={notifNotices}
                      onChange={(e) => setNotifNotices(e.target.checked)}
                      className="size-4.5 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 accent-emerald-600 cursor-pointer"
                    />
                  </label>

                  <label className="flex items-center justify-between p-3.5 rounded-xl border border-slate-100 bg-slate-50/50 hover:bg-slate-50 transition cursor-pointer">
                    <div>
                      <div className="text-sm font-semibold text-slate-800">Boletín semanal de mi carrera</div>
                      <div className="text-xs text-slate-400">Hilos con mejores aportes y material descargable</div>
                    </div>
                    <input
                      type="checkbox"
                      checked={notifDigest}
                      onChange={(e) => setNotifDigest(e.target.checked)}
                      className="size-4.5 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 accent-emerald-600 cursor-pointer"
                    />
                  </label>
                </div>
              </div>

              {/* Tarjeta 4: Apariencia */}
              <div className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6 shadow-sm">
                <div className="flex items-center gap-2.5 pb-4 border-b border-slate-100 mb-5">
                  <div className="flex size-9 items-center justify-center rounded-xl bg-violet-50 text-violet-600">
                    <Sliders size={19} />
                  </div>
                  <div>
                    <h2 className="text-base font-bold text-slate-900">Tema y visualización</h2>
                    <p className="text-xs text-slate-400">Se aplica de inmediato y se guarda en este equipo</p>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  {[
                    { id: 'light', label: 'Modo Claro' },
                    { id: 'system', label: 'Automático' },
                    { id: 'dark', label: 'Modo Oscuro' },
                  ].map((theme) => (
                    <button
                      key={theme.id}
                      type="button"
                      onClick={() => handleThemeChange(theme.id as 'light' | 'system' | 'dark')}
                      className={`flex flex-col items-center justify-center rounded-xl border p-3.5 text-center transition cursor-pointer ${
                        themePreference === theme.id
                          ? 'border-emerald-500 bg-emerald-50 font-semibold text-emerald-800 ring-1 ring-emerald-500'
                          : 'border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100'
                      }`}
                    >
                      <span className="text-xs font-semibold">{theme.label}</span>
                    </button>
                  ))}
                </div>
                <p className="mt-3 text-[11px] text-slate-400">
                  Tema en uso: <span className="font-semibold text-slate-600">{resolvedDark ? 'Modo oscuro' : 'Modo claro'}</span>
                  {themePreference === 'system' ? ' · siguiendo tu sistema' : ' · guardado en este equipo'}
                </p>
              </div>

              {/* Botones de acción */}
              <div className="flex items-center justify-end gap-3 pt-2 pb-6">
                <button
                  type="button"
                  onClick={() => goToSection('feed')}
                  className="rounded-xl px-4 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-200/60 transition cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  disabled={!!nameError}
                  onClick={() => {
                    setSavedSuccess(true)
                    setTimeout(() => setSavedSuccess(false), 3000)
                  }}
                  className="flex items-center gap-2 rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-emerald-700 transition cursor-pointer disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-emerald-600"
                >
                  <Save size={16} />
                  Guardar ajustes
                </button>
              </div>
            </div>
          </section>
        ) : (
          <section id={isCareersView ? 'categories' : 'feed'} className="min-w-0">
          {isCareersView ? (
            <div className="mb-5">
              <p className="text-sm font-medium text-emerald-600">Carreras</p>
              <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
                Explora por carrera
              </h1>
              <p className="mt-1 text-sm text-slate-500">
                Selecciona una o varias categorías para combinar sus hilos.
              </p>

              <div className="mt-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                <div className="mb-3 flex items-center justify-between">
                  <span id="careers-filter-label" className="text-xs font-bold uppercase tracking-wider text-slate-400">
                    Explorar
                  </span>
                  {selectedCategories.length > 0 && (
                    <button
                      onClick={() => setSelectedCategories([])}
                      className="flex items-center gap-1 text-[11px] font-semibold text-emerald-700 hover:underline cursor-pointer"
                    >
                      <X size={13} /> Limpiar filtros ({selectedCategories.length})
                    </button>
                  )}
                </div>

                <div role="group" aria-labelledby="careers-filter-label" className="flex flex-wrap gap-2">
                  <button
                    onClick={() => setSelectedCategories([])}
                    aria-pressed={selectedCategories.length === 0}
                    className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition cursor-pointer ${
                      selectedCategories.length === 0
                        ? 'border-emerald-500 bg-emerald-50 text-emerald-700'
                        : 'border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    Todas
                  </button>
                  {initialCategories.map((category) => {
                    const selected = selectedCategories.includes(category)
                    const count = threads.filter((t) => t.category === category).length
                    return (
                      <button
                        key={category}
                        onClick={() => toggleCategory(category)}
                        aria-pressed={selected}
                        className={`flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-semibold transition cursor-pointer ${
                          selected
                            ? 'border-emerald-500 bg-emerald-50 text-emerald-700'
                            : 'border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100'
                        }`}
                      >
                        {selected
                          ? <Check size={13} className="text-emerald-600" />
                          : <span className={`size-2 rounded-full ${categoryDot[category]}`} />}
                        {category}
                        <span className={`tabular-nums ${selected ? 'text-emerald-600' : 'text-slate-400'}`}>{count}</span>
                      </button>
                    )
                  })}
                </div>

                <p className="mt-3 text-[11px] text-slate-400" aria-live="polite">
                  {filteredThreads.length} {filteredThreads.length === 1 ? 'hilo' : 'hilos'} ·{' '}
                  {selectedCategories.length === 0 ? 'todas las categorías' : selectedCategories.join(', ')}
                </p>
              </div>
            </div>
          ) : (
          <>
          <div className="mb-5 flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
            <div>
              <p className="text-sm font-medium text-emerald-600">Miércoles, 12 de marzo</p>
              <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
                Tu comunidad, al día.
              </h1>
              <p className="mt-1 text-sm text-slate-500">
                Descubre lo que está pasando en UTOM.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-500">Conectado:</span>
              <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-semibold text-emerald-800">
                {user.career}
              </span>
            </div>
          </div>

          {/* Tabs */}
          <div className="mb-5 flex gap-1 overflow-x-auto border-b border-slate-200">
            {['Para ti', 'Más recientes', 'En tendencia', 'Avisos del campus'].map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`whitespace-nowrap border-b-2 px-3 pb-3 text-sm font-semibold transition cursor-pointer ${
                  activeTab === tab
                    ? 'border-emerald-600 text-emerald-700'
                    : 'border-transparent text-slate-400 hover:text-slate-700'
                }`}
              >
                {tab}
                {tab === 'Avisos del campus' && (
                  <span className="ml-2 rounded-full bg-amber-100 px-1.5 py-0.5 text-[10px] text-amber-700 font-bold">
                    3
                  </span>
                )}
              </button>
            ))}
          </div>
          </>
          )}

          {/* Quick Create Thread Bar */}
          <button
            onClick={() => setModal(true)}
            className="mb-5 flex w-full items-center gap-3 rounded-2xl border border-slate-200 bg-white p-3.5 text-left shadow-sm transition hover:border-emerald-300 hover:shadow cursor-pointer"
          >
            <div className="flex size-9 items-center justify-center rounded-full bg-emerald-100 text-xs font-bold text-emerald-800">
              {user.initials}
            </div>
            <span className="text-sm text-slate-400">
              Hola {user.name.split(' ')[0]}, ¿qué quieres compartir con la comunidad?
            </span>
            <span className="ml-auto hidden rounded-xl bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700 sm:block">
              Crear hilo
            </span>
          </button>

          {/* Threads List */}
          <div className="flex flex-col gap-4">
            {filteredThreads.map((thread) => (
              <article
                key={thread.id}
                className="rounded-2xl border border-slate-200 bg-white shadow-sm hover:shadow-md transition duration-200"
              >
                <div className="p-4 sm:p-5">
                  <div className="flex items-start gap-3">
                    <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-slate-100 text-xs font-bold text-slate-700">
                      {thread.initials}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                        <span className="text-sm font-bold text-slate-900">{thread.author}</span>
                        <span className={`rounded-md px-1.5 py-0.5 text-[10px] font-bold ${thread.accent}`}>
                          {thread.career}
                        </span>
                        <span className="text-xs text-slate-400">· {thread.time}</span>
                      </div>
                      <div className="mt-0.5 text-xs text-slate-400">Estudiante UTOM</div>
                    </div>
                    <button className="rounded-md p-1 text-slate-400 hover:bg-slate-100" aria-label="Más opciones">
                      <MoreHorizontal size={18} />
                    </button>
                  </div>

                  <div className="mt-4">
                    <div className="mb-2 flex items-center gap-2">
                      <span className="rounded-md bg-slate-100 px-2 py-1 text-[11px] font-semibold text-slate-500">
                        {thread.category}
                      </span>
                      {thread.id === 2 && (
                        <span className="flex items-center gap-1 text-[11px] font-medium text-amber-600">
                          <TrendingUp size={13} /> En tendencia
                        </span>
                      )}
                    </div>
                    <h2 className="text-base font-bold leading-snug text-slate-900 sm:text-lg">
                      {thread.title}
                    </h2>
                    <p className="mt-2 text-sm leading-6 text-slate-600">
                      {thread.body}
                    </p>

                    {thread.id === 3 && (
                      <div className="mt-3 flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3">
                        <div className="flex size-9 items-center justify-center rounded-lg bg-violet-100 text-violet-600">
                          <FileText size={18} />
                        </div>
                        <div>
                          <div className="text-sm font-semibold">Guía_microbiología.pdf</div>
                          <div className="text-xs text-slate-400">2.4 MB · Documento de estudio</div>
                        </div>
                        <button className="ml-auto text-slate-400 hover:text-emerald-600 p-1">
                          <Upload size={17} />
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Actions bar */}
                  <div className="mt-4 flex items-center gap-1 border-t border-slate-100 pt-3">
                    <div className="flex items-center rounded-xl bg-slate-50 border border-slate-200/60">
                      <button
                        onClick={() => toggleVote(thread.id, 1)}
                        className={`rounded-l-xl p-2 ${
                          votes[thread.id] === 1 ? 'text-emerald-600 bg-emerald-50' : 'text-slate-400'
                        } hover:bg-emerald-50 transition cursor-pointer`}
                        aria-label="Votar a favor"
                      >
                        <ThumbsUp size={16} />
                      </button>
                      <span className="min-w-7 text-center text-xs font-bold text-slate-600">
                        {thread.score + (votes[thread.id] || 0)}
                      </span>
                      <button
                        onClick={() => toggleVote(thread.id, -1)}
                        className={`rounded-r-xl p-2 ${
                          votes[thread.id] === -1 ? 'text-rose-500 bg-rose-50' : 'text-slate-400'
                        } hover:bg-rose-50 transition cursor-pointer`}
                        aria-label="Votar en contra"
                      >
                        <ThumbsDown size={16} />
                      </button>
                    </div>

                    <button
                      onClick={() => setOpenThread(openThread === thread.id ? null : thread.id)}
                      className="flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-semibold text-slate-500 hover:bg-slate-50 transition cursor-pointer"
                    >
                      <MessageCircle size={16} /> {thread.replies} respuestas
                    </button>

                    <button
                      onClick={() => toggleSave(thread.id)}
                      className={`ml-auto rounded-xl p-2 ${
                        saved.includes(thread.id) ? 'text-emerald-600 bg-emerald-50' : 'text-slate-400'
                      } hover:bg-slate-50 transition cursor-pointer`}
                      aria-label="Guardar hilo"
                    >
                      <Bookmark size={17} fill={saved.includes(thread.id) ? 'currentColor' : 'none'} />
                    </button>

                    <button
                      className="rounded-xl p-2 text-slate-400 hover:bg-slate-50 transition cursor-pointer"
                      aria-label="Compartir"
                    >
                      <Share2 size={17} />
                    </button>
                  </div>
                </div>

                {/* Comments dropdown accordion */}
                {openThread === thread.id && (
                  <div className="border-t border-slate-100 bg-slate-50/70 px-4 py-4 sm:px-5 rounded-b-2xl">
                    <div className="flex flex-col gap-3">
                      {thread.comments.map((comment, idx) => (
                        <div key={idx} className="flex gap-3">
                          <div className="relative pl-2">
                            <div className="absolute -left-3 top-0 h-full w-px bg-slate-200" />
                            <div className="flex size-8 items-center justify-center rounded-full bg-white text-[10px] font-bold text-slate-600 ring-1 ring-slate-200">
                              {comment.initials}
                            </div>
                          </div>
                          <div className="flex-1 rounded-xl bg-white p-3 ring-1 ring-slate-100 shadow-xs">
                            <div className="text-xs font-bold text-slate-800">{comment.author}</div>
                            <p className="mt-1 text-xs leading-5 text-slate-600">{comment.text}</p>
                            <button className="mt-2 text-[11px] font-semibold text-emerald-700 hover:underline">
                              Responder
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="mt-4 flex items-center gap-2">
                      <input
                        value={newCommentText[thread.id] || ''}
                        onChange={(e) =>
                          setNewCommentText({ ...newCommentText, [thread.id]: e.target.value })
                        }
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleAddComment(thread.id)
                        }}
                        className="h-9 min-w-0 flex-1 rounded-xl border border-slate-200 bg-white px-3 text-xs outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                        placeholder="Responder a este hilo..."
                      />
                      <button
                        onClick={() => handleAddComment(thread.id)}
                        className="flex size-9 items-center justify-center rounded-xl bg-emerald-600 text-white hover:bg-emerald-700 transition cursor-pointer"
                        aria-label="Enviar respuesta"
                      >
                        <Send size={15} />
                      </button>
                    </div>
                  </div>
                )}
              </article>
            ))}

            {filteredThreads.length === 0 && (
              <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center">
                <Search size={28} className="mx-auto text-slate-300 mb-2" />
                <p className="font-bold text-slate-700">No se encontraron hilos</p>
                <p className="text-xs text-slate-400 mt-1">
                  {isCareersView && selectedCategories.length > 0
                    ? 'Aún no hay hilos en las categorías seleccionadas.'
                    : 'Intenta buscar con otros términos o crea una nueva publicación.'}
                </p>
                {isCareersView && selectedCategories.length > 0 && (
                  <button
                    onClick={() => setSelectedCategories([])}
                    className="mt-3 text-xs font-semibold text-emerald-700 hover:underline cursor-pointer"
                  >
                    Ver todas las categorías
                  </button>
                )}
              </div>
            )}
          </div>
        </section>
      )}

        {/* Right Sidebar: Notices & Trends */}
        <aside className="hidden xl:block">
          <div className="sticky top-24 flex flex-col gap-4">
            
            <div id="notices" className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="mb-3 flex items-center justify-between">
                <h2 className="text-sm font-bold text-slate-900">Avisos importantes</h2>
                <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-700">
                  OFICIAL
                </span>
              </div>
              <div className="flex flex-col gap-3">
                {['Periodo de reinscripciones', 'Becas de movilidad 2025', 'Cierre temporal de biblioteca'].map(
                  (notice, i) => (
                    <button key={notice} className="group flex items-start gap-2 text-left cursor-pointer">
                      <span
                        className={`mt-1.5 size-1.5 shrink-0 rounded-full ${
                          i === 0 ? 'bg-amber-500' : 'bg-slate-300'
                        }`}
                      />
                      <span className="text-xs font-medium leading-5 text-slate-600 group-hover:text-emerald-700 transition">
                        {notice}
                        <span className="block text-[10px] font-normal text-slate-400">
                          {i === 0 ? 'Publicado hoy' : 'Hace 2 días'}
                        </span>
                      </span>
                      <ChevronRight size={14} className="ml-auto mt-1 shrink-0 text-slate-300 group-hover:text-emerald-600" />
                    </button>
                  )
                )}
              </div>
              <button className="mt-3 text-xs font-semibold text-emerald-700 hover:underline cursor-pointer">
                Ver todos los avisos →
              </button>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="mb-3 flex items-center gap-2">
                <TrendingUp size={17} className="text-emerald-600" />
                <h2 className="text-sm font-bold text-slate-900">Temas populares</h2>
              </div>
              <div className="flex flex-wrap gap-2">
                {['#Inscripciones', '#Residencias', '#Hackathon', '#Cafetería', '#ServicioSocial'].map((tag) => (
                  <button
                    key={tag}
                    className="rounded-full bg-slate-100 px-2.5 py-1.5 text-xs font-medium text-slate-600 hover:bg-emerald-50 hover:text-emerald-700 transition cursor-pointer"
                  >
                    {tag}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </aside>
      </main>

      {/* Modal: Crear nuevo hilo */}
      {modal && (
        <div
          className="fixed inset-0 z-30 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="modal-title"
        >
          <div className="max-h-[90vh] w-full max-w-lg overflow-auto rounded-2xl bg-white shadow-2xl border border-slate-100">
            <div className="flex items-center justify-between border-b border-slate-100 p-5">
              <div>
                <h2 id="modal-title" className="text-lg font-bold text-slate-900">
                  Crear nuevo hilo
                </h2>
                <p className="mt-1 text-xs text-slate-500">
                  Publicando como: <span className="font-semibold text-emerald-700">{user.name}</span> ({user.career})
                </p>
              </div>
              <button
                onClick={() => setModal(false)}
                className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 cursor-pointer"
                aria-label="Cerrar"
              >
                <X size={19} />
              </button>
            </div>

            <form onSubmit={handleAddThread} className="flex flex-col gap-4 p-5">
              <label className="text-sm font-semibold text-slate-800">
                Título
                <input
                  required
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className="mt-2 h-10 w-full rounded-xl border border-slate-200 px-3 text-sm outline-none transition focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                  placeholder="¿De qué quieres hablar?"
                />
              </label>

              <label className="text-sm font-semibold text-slate-800">
                Categoría
                <select
                  value={newCategory}
                  onChange={(e) => setNewCategory(e.target.value)}
                  className="mt-2 h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-normal outline-none transition focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                >
                  {initialCategories.map((category) => (
                    <option key={category} value={category}>{category}</option>
                  ))}
                </select>
              </label>

              <label className="text-sm font-semibold text-slate-800">
                Cuerpo del hilo
                <textarea
                  required
                  value={newBody}
                  onChange={(e) => setNewBody(e.target.value)}
                  className="mt-2 min-h-28 w-full resize-none rounded-xl border border-slate-200 p-3 text-sm font-normal outline-none transition focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                  placeholder="Escribe tu publicación con detalles para que la comunidad te pueda ayudar..."
                />
              </label>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  className="flex items-center gap-2 rounded-xl border border-dashed border-slate-300 px-3 py-2 text-xs font-semibold text-slate-500 hover:border-emerald-400 hover:text-emerald-600 transition"
                >
                  <ImagePlus size={16} /> Adjuntar imagen
                </button>
                <button
                  type="button"
                  className="flex items-center gap-2 rounded-xl border border-dashed border-slate-300 px-3 py-2 text-xs font-semibold text-slate-500 hover:border-emerald-400 hover:text-emerald-600 transition"
                >
                  <Hash size={16} /> Añadir etiquetas
                </button>
              </div>

              <div className="mt-2 flex justify-end gap-2 border-t border-slate-100 pt-4">
                <button
                  type="button"
                  onClick={() => setModal(false)}
                  className="rounded-xl px-4 py-2 text-sm font-semibold text-slate-500 hover:bg-slate-100 cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 shadow-sm cursor-pointer"
                >
                  <Send size={15} /> Publicar hilo
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
