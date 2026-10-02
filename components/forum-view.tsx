'use client'

import { useState } from 'react'
import {
  Bell, Bookmark, ChevronDown, ChevronRight, FileText, Hash, ImagePlus,
  LogOut, Menu, MessageCircle, MoreHorizontal, Search, Send, Share2,
  ShieldCheck, Sparkles, ThumbsDown, ThumbsUp, TrendingUp, Upload, X, User
} from 'lucide-react'
import { UserProfile } from './login-view'

const initialCategories = [
  'TI', 'Biotecnología', 'Mercadotecnia', 'Gastronomía',
  'Convocatorias', 'Preguntas Frecuentes',
]

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
  const [searchQuery, setSearchQuery] = useState('')

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

  const filteredThreads = threads.filter((t) => {
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
    <div className="min-h-screen bg-[#f6f8f8] text-slate-900">
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
              src="/media/logo.webp"
              alt="UTOM"
              className="h-9 sm:h-10 w-auto object-contain"
            />
          </div>

          <div className="relative hidden max-w-md flex-1 lg:block">
            <Search className="absolute left-3 top-2.5 text-slate-400" size={18} />
            <input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50 pl-10 pr-16 text-sm outline-none transition focus:border-emerald-500 focus:bg-white focus:ring-2 focus:ring-emerald-500/20"
              placeholder="Buscar en hilos, materias, avisos..."
            />
            <kbd className="absolute right-3 top-2 rounded bg-white px-1.5 py-0.5 text-[10px] text-slate-400 shadow-sm border border-slate-200">
              ⌘ K
            </kbd>
          </div>

          <nav className="hidden items-center gap-6 text-sm font-medium text-slate-500 xl:flex">
            <a className="text-emerald-700 font-semibold" href="#feed">Feed</a>
            <a href="#categories" className="hover:text-slate-900 transition">Carreras</a>
            <a href="#notices" className="hover:text-slate-900 transition">Avisos oficiales</a>
          </nav>

          <div className="ml-auto flex items-center gap-2">
            <button
              className="relative rounded-lg p-2 text-slate-500 hover:bg-slate-100 transition cursor-pointer"
              aria-label="Notificaciones"
            >
              <Bell size={20} />
              <span className="absolute right-1.5 top-1.5 size-2 rounded-full border border-white bg-emerald-500" />
            </button>

            <button
              onClick={() => setModal(true)}
              className="hidden items-center gap-2 rounded-xl bg-emerald-600 px-3.5 py-2 text-sm font-semibold text-white shadow-sm hover:bg-emerald-700 transition sm:flex cursor-pointer"
            >
              <Sparkles size={16} /> Crear hilo
            </button>

            {/* User Profile dropdown menu */}
            <div className="relative">
              <button
                onClick={() => setUserDropdown(!userDropdown)}
                className="flex items-center gap-2 rounded-full border border-slate-200 p-1 pr-2.5 hover:bg-slate-50 transition cursor-pointer"
              >
                <div className="flex size-8 items-center justify-center rounded-full bg-emerald-100 text-xs font-bold text-emerald-800">
                  {user.initials}
                </div>
                <div className="hidden sm:block text-left text-xs">
                  <div className="font-semibold text-slate-800 leading-tight truncate max-w-[120px]">
                    {user.name}
                  </div>
                  <div className="text-[10px] text-slate-400 leading-tight">
                    {user.career}
                  </div>
                </div>
                <ChevronDown size={14} className="text-slate-400" />
              </button>

              {userDropdown && (
                <div className="absolute right-0 mt-2 w-56 rounded-2xl bg-white p-2 shadow-xl border border-slate-100 z-30">
                  <div className="px-3 py-2 border-b border-slate-100 mb-1">
                    <p className="text-xs font-bold text-slate-800">{user.name}</p>
                    <p className="text-[11px] text-slate-400 truncate">{user.email}</p>
                    <span className="mt-1 inline-block rounded-md bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700">
                      Carrera: {user.career}
                    </span>
                  </div>
                  <button
                    onClick={() => {
                      setUserDropdown(false)
                      onLogout()
                    }}
                    className="w-full flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-semibold text-rose-600 hover:bg-rose-50 transition cursor-pointer"
                  >
                    <LogOut size={15} />
                    Cerrar sesión
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Mobile menu */}
        {mobileMenu && (
          <div className="border-t border-slate-100 px-5 py-3 text-sm lg:hidden bg-white">
            <div className="relative mb-3">
              <Search className="absolute left-3 top-2.5 text-slate-400" size={18} />
              <input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-10 w-full rounded-xl border border-slate-200 pl-10 pr-3 text-sm"
                placeholder="Buscar en Wiki UTOM"
              />
            </div>
            <div className="flex flex-col gap-2 font-medium">
              <a href="#feed" className="py-1 text-emerald-700 font-semibold">Feed</a>
              <a href="#categories" className="py-1 text-slate-700">Carreras</a>
              <button
                onClick={() => {
                  setMobileMenu(false)
                  setModal(true)
                }}
                className="py-1 text-left text-slate-700 font-semibold"
              >
                + Crear hilo
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
      <main className="mx-auto grid max-w-[1440px] grid-cols-1 gap-6 px-4 py-6 lg:grid-cols-[220px_minmax(0,1fr)_280px] lg:px-8">
        
        {/* Left Sidebar */}
        <aside id="categories" className="hidden lg:block">
          <div className="sticky top-24">
            <div className="mb-3 flex items-center justify-between px-2">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Explorar
              </span>
              <button className="text-slate-400 hover:text-slate-600">
                <MoreHorizontal size={16} />
              </button>
            </div>
            <div className="flex flex-col gap-1">
              {initialCategories.map((item, index) => (
                <button
                  key={item}
                  className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm transition cursor-pointer ${
                    index === 0
                      ? 'bg-emerald-50 font-semibold text-emerald-700'
                      : 'text-slate-600 hover:bg-white hover:shadow-xs'
                  }`}
                >
                  <span
                    className={`size-2 rounded-full ${
                      [
                        'bg-emerald-500',
                        'bg-violet-500',
                        'bg-blue-500',
                        'bg-amber-500',
                        'bg-pink-500',
                        'bg-slate-400'
                      ][index]
                    }`}
                  />
                  <span className="truncate">{item}</span>
                </button>
              ))}
            </div>

            <div className="my-5 h-px bg-slate-200" />

            <div className="flex flex-col gap-1 text-sm text-slate-600">
              <button className="flex items-center gap-3 rounded-xl px-3 py-2.5 hover:bg-white hover:shadow-xs transition cursor-pointer">
                <Bookmark size={17} /> Mis guardados ({saved.length})
              </button>
              <button className="flex items-center gap-3 rounded-xl px-3 py-2.5 hover:bg-white hover:shadow-xs transition cursor-pointer">
                <TrendingUp size={17} /> Hilos populares
              </button>
            </div>

            <div className="mt-8 rounded-2xl border border-emerald-100 bg-emerald-50 p-4">
              <ShieldCheck className="mb-2 text-emerald-600" size={20} />
              <p className="text-xs font-semibold text-emerald-900">Un espacio de todos</p>
              <p className="mt-1 text-xs leading-5 text-emerald-700">
                Comparte con respeto y ayuda a construir una mejor comunidad para la UTOM.
              </p>
            </div>
          </div>
        </aside>

        {/* Central Feed Section */}
        <section id="feed" className="min-w-0">
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
                      <div className="flex items-center gap-2">
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
                  Intenta buscar con otros términos o crea una nueva publicación.
                </p>
              </div>
            )}
          </div>
        </section>

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

            <div className="rounded-2xl bg-slate-900 p-4 text-white shadow-md">
              <div className="mb-2 flex items-center gap-2">
                <ShieldCheck size={17} className="text-emerald-400" />
                <h2 className="text-sm font-bold">Guía de convivencia</h2>
              </div>
              <p className="text-xs leading-5 text-slate-300">
                Sé amable, aporta valor y respeta la privacidad de los demás. Esta es una comunidad para aprender juntos.
              </p>
              <button className="mt-3 text-xs font-semibold text-emerald-400 hover:underline cursor-pointer">
                Leer las reglas →
              </button>
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
