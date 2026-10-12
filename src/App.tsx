import { useEffect, useMemo, useState, type FormEvent, type ReactNode } from 'react'
import {
  ArrowDownToLine, ArrowRight, ArrowUpRight, Bell, BookOpen, CalendarCheck2, CalendarDays,
  CalendarPlus, Check, CheckCircle2, ChevronDown, ChevronRight, CircleHelp,
  Clock3, Coffee, FileText, FolderOpen, Heart, Home, Link as LinkIcon, ListTodo, MapPin,
  MessageCircle, MessageSquare, Moon, MoreHorizontal, Pencil, Pin, Plus, Search, Send, Settings,
  ShieldCheck, Sparkles, Sun, UsersRound, X, type LucideIcon,
  Trash2,
} from 'lucide-react'
import {
  createDemoSnapshot, createId, GROUP_NAME, GROUP_UNIVERSITY, lessonsForDay, loadSnapshot,
  saveSnapshot, searchSnapshot, toDateLabel, toggleAssignment, toggleReaction,
  type Assignment, type EventItem, type Lesson, type Material, type Page, type Post, type Snapshot,
  type WeekParity,
} from './domain'

type Theme = 'light' | 'dark' | 'system'
type ModalState =
  | { type: 'lesson'; lesson?: Lesson }
  | { type: 'task' }
  | { type: 'post'; post?: Post }
  | { type: 'material' }
  | { type: 'event' }
  | null

const navItems: Array<{ id: Page; label: string; icon: LucideIcon; mobile?: boolean }> = [
  { id: 'home', label: 'Обзор', icon: Home, mobile: true },
  { id: 'schedule', label: 'Расписание', icon: CalendarDays, mobile: true },
  { id: 'tasks', label: 'Задания', icon: ListTodo, mobile: true },
  { id: 'feed', label: 'Лента', icon: MessageCircle, mobile: true },
  { id: 'materials', label: 'Материалы', icon: FolderOpen },
  { id: 'people', label: 'Группа', icon: UsersRound },
  { id: 'events', label: 'Встречи', icon: Sparkles },
]

const students = [
  { name: 'Мария Сафина', initials: 'МС', major: 'маркетинговые коммуникации', online: true, status: 'сейчас в сети' },
  { name: 'Даниил Чернов', initials: 'ДЧ', major: 'маркетинговые коммуникации', online: true, status: 'сейчас в сети' },
  { name: 'Алиса Белова', initials: 'АБ', major: 'маркетинговые коммуникации', status: 'была недавно' },
  { name: 'Роман Волков', initials: 'РВ', major: 'маркетинговые коммуникации', status: 'был 20 мин назад' },
  { name: 'Ева Ким', initials: 'ЕК', major: 'маркетинговые коммуникации', status: 'была сегодня' },
  { name: 'Саша Нестеров', initials: 'СН', major: 'маркетинговые коммуникации', status: 'был сегодня' },
]

const pageText: Record<Page, { title: string; description: string }> = {
  home: { title: 'Твоя группа', description: 'Расписание, дела и люди — в одном месте.' },
  schedule: { title: 'Расписание', description: 'Пары, аудитории и изменения на неделю.' },
  tasks: { title: 'Задания', description: 'Дедлайны, которые проще держать под контролем.' },
  feed: { title: 'Лента группы', description: 'Объявления, вопросы и то, что происходит между парами.' },
  materials: { title: 'Материалы', description: 'Конспекты и полезные ссылки по предметам.' },
  people: { title: 'Люди', description: 'Те, с кем ты проводишь эту учебную неделю.' },
  events: { title: 'Встречи', description: 'Небольшие поводы увидеться за пределами расписания.' },
  settings: { title: 'Настройки', description: 'Внешний вид, данные и режим работы приложения.' },
}

function safeGet(key: string): string | null {
  try { return localStorage.getItem(key) } catch { return null }
}

function browserStorage(): Storage | undefined {
  try { return window.localStorage } catch { return undefined }
}

function loadAttendance(): Record<string, boolean> {
  try {
    const stored = safeGet('mezhpar.rsvp.v1')
    const parsed: unknown = stored ? JSON.parse(stored) : {}
    return parsed && typeof parsed === 'object' ? parsed as Record<string, boolean> : {}
  } catch { return {} }
}

function saveAttendance(value: Record<string, boolean>) {
  try { localStorage.setItem('mezhpar.rsvp.v1', JSON.stringify(value)) } catch { /* RSVP stays active until the page closes. */ }
}

function weekStart(date: Date): Date {
  const result = new Date(date)
  result.setHours(12, 0, 0, 0)
  const offset = (result.getDay() + 6) % 7
  result.setDate(result.getDate() - offset)
  return result
}

function weekParity(date: Date): WeekParity {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()))
  const day = d.getUTCDay() || 7
  d.setUTCDate(d.getUTCDate() + 4 - day)
  const firstDay = new Date(Date.UTC(d.getUTCFullYear(), 0, 1))
  const week = Math.ceil((((d.getTime() - firstDay.getTime()) / 86400000) + 1) / 7)
  return week % 2 === 0 ? 'even' : 'odd'
}

function findNextLesson(lessons: Lesson[], now: Date): { lesson: Lesson; date: Date } | null {
  for (let offset = 0; offset < 14; offset += 1) {
    const date = new Date(now)
    date.setHours(12, 0, 0, 0)
    date.setDate(date.getDate() + offset)
    const weekday = date.getDay()
    if (weekday < 1 || weekday > 6) continue
    const dayIso = new Date(date.getTime() - date.getTimezoneOffset() * 60_000).toISOString().slice(0, 10)
    const candidate = lessonsForDay(lessons, weekday, weekParity(date)).find((lesson) => {
      const startsAt = new Date(`${dayIso}T${lesson.start}:00`)
      return startsAt.getTime() >= now.getTime()
    })
    if (candidate) return { lesson: candidate, date }
  }
  return null
}

function initials(name: string): string {
  return name.trim().split(/\s+/).slice(0, 2).map((part) => part[0]?.toLocaleUpperCase('ru') ?? '').join('') || 'Я'
}

function displayDate(date: Date, options: Intl.DateTimeFormatOptions = { weekday: 'long', day: 'numeric', month: 'long' }): string {
  return new Intl.DateTimeFormat('ru-RU', options).format(date)
}

function IconButton({ label, children, onClick, className = '' }: { label: string; children: ReactNode; onClick: () => void; className?: string }) {
  return <button type="button" className={`icon-button ${className}`} aria-label={label} title={label} onClick={onClick}>{children}</button>
}

function Avatar({ name, text, tone = '' }: { name: string; text?: string; tone?: string }) {
  return <span className={`avatar ${tone}`} aria-label={name} title={name}>{text ?? initials(name)}</span>
}

function Tag({ children, tone = '' }: { children: ReactNode; tone?: string }) {
  return <span className={`tag ${tone}`}>{children}</span>
}

function Modal({ title, onClose, children, wide = false }: { title: string; onClose: () => void; children: ReactNode; wide?: boolean }) {
  useEffect(() => {
    const handle = (event: KeyboardEvent) => { if (event.key === 'Escape') onClose() }
    document.addEventListener('keydown', handle)
    return () => document.removeEventListener('keydown', handle)
  }, [onClose])
  return (
    <div className="modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose() }}>
      <section className={`modal-card ${wide ? 'modal-wide' : ''}`} role="dialog" aria-modal="true" aria-labelledby="modal-title" tabIndex={-1}>
        <div className="modal-heading"><h2 id="modal-title">{title}</h2><IconButton label="Закрыть" onClick={onClose}><X size={19} /></IconButton></div>
        {children}
      </section>
    </div>
  )
}

function LessonForm({ initial, onClose, onSave, onDelete }: { initial?: Lesson; onClose: () => void; onSave: (lesson: Lesson) => void; onDelete?: () => void }) {
  const [subject, setSubject] = useState(initial?.subject ?? '')
  const [teacher, setTeacher] = useState(initial?.teacher ?? '')
  const [room, setRoom] = useState(initial?.room ?? '')
  const [weekday, setWeekday] = useState(String(initial?.weekday ?? 1))
  const [start, setStart] = useState(initial?.start ?? '09:00')
  const [end, setEnd] = useState(initial?.end ?? '10:30')
  const [kind, setKind] = useState<Lesson['kind']>(initial?.kind ?? 'Лекция')
  const [parity, setParity] = useState<Lesson['parity']>(initial?.parity ?? 'all')
  const submit = (event: FormEvent) => {
    event.preventDefault()
    if (!subject.trim()) return
    onSave({ id: initial?.id ?? createId('lesson'), subject: subject.trim(), teacher: teacher.trim() || 'Преподаватель не указан', room: room.trim() || '—', weekday: Number(weekday), start, end, kind, parity })
  }
  return <form className="form-stack" onSubmit={submit}>
    <label>Предмет<input autoFocus required value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="Например, история России" /></label>
    <div className="form-row"><label>День<select value={weekday} onChange={(e) => setWeekday(e.target.value)}>{['Понедельник', 'Вторник', 'Среда', 'Четверг', 'Пятница', 'Суббота'].map((day, i) => <option key={day} value={i + 1}>{day}</option>)}</select></label><label>Тип<select value={kind} onChange={(e) => setKind(e.target.value as Lesson['kind'])}>{['Лекция', 'Практика', 'Семинар', 'Зачёт'].map((item) => <option key={item}>{item}</option>)}</select></label></div>
    <div className="form-row"><label>Начало<input type="time" value={start} onChange={(e) => setStart(e.target.value)} /></label><label>Окончание<input type="time" value={end} onChange={(e) => setEnd(e.target.value)} /></label></div>
    <div className="form-row"><label>Преподаватель<input value={teacher} onChange={(e) => setTeacher(e.target.value)} placeholder="Имя преподавателя" /></label><label>Аудитория<input value={room} onChange={(e) => setRoom(e.target.value)} placeholder="Например, 207" /></label></div>
    <label>Неделя<select value={parity} onChange={(e) => setParity(e.target.value as Lesson['parity'])}><option value="all">Каждую неделю</option><option value="odd">Нечётная</option><option value="even">Чётная</option></select></label>
    <div className="modal-actions">{onDelete && <button type="button" className="button button-quiet danger-text push-left" onClick={onDelete}>Удалить</button>}<button type="button" className="button button-soft" onClick={onClose}>Отмена</button><button className="button button-primary" type="submit">Сохранить пару</button></div>
  </form>
}

function TaskForm({ onClose, onSave }: { onClose: () => void; onSave: (task: Assignment) => void }) {
  const [subject, setSubject] = useState('')
  const [title, setTitle] = useState('')
  const [due, setDue] = useState(() => new Date(Date.now() + 86400000).toISOString().slice(0, 10))
  const [kind, setKind] = useState<Assignment['kind']>('Домашнее задание')
  const [details, setDetails] = useState('')
  const submit = (event: FormEvent) => { event.preventDefault(); if (subject.trim() && title.trim()) onSave({ id: createId('task'), subject: subject.trim(), title: title.trim(), due, kind, done: false, details: details.trim() }) }
  return <form className="form-stack" onSubmit={submit}>
    <label>Предмет<input autoFocus required value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="К какому предмету относится?" /></label>
    <label>Что нужно сделать?<input required value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Например, подготовить вопросы" /></label>
    <div className="form-row"><label>Дедлайн<input type="date" required value={due} onChange={(e) => setDue(e.target.value)} /></label><label>Тип<select value={kind} onChange={(e) => setKind(e.target.value as Assignment['kind'])}>{['Домашнее задание', 'Чтение', 'Подготовка'].map((item) => <option key={item}>{item}</option>)}</select></label></div>
    <label>Комментарий<textarea rows={3} value={details} onChange={(e) => setDetails(e.target.value)} placeholder="Страница, ссылка или короткая подсказка" /></label>
    <div className="modal-actions"><button type="button" className="button button-soft" onClick={onClose}>Отмена</button><button className="button button-primary" type="submit">Добавить задание</button></div>
  </form>
}

function PostForm({ initial, authorName, onClose, onSave }: { initial?: Post; authorName: string; onClose: () => void; onSave: (post: Post) => void }) {
  const [text, setText] = useState(initial?.text ?? '')
  const [topic, setTopic] = useState(initial?.topic ?? 'Обсуждение')
  const submit = (event: FormEvent) => {
    event.preventDefault()
    if (!text.trim()) return
    const author = initial?.author ?? authorName
    onSave({ id: initial?.id ?? createId('post'), author, initials: initials(author), role: 'участник', text: text.trim(), time: 'только что', likes: initial?.likes ?? 0, liked: initial?.liked ?? false, own: true, comments: initial?.comments ?? [], topic })
  }
  return <form className="form-stack" onSubmit={submit}>
    <label>О чём поговорим?<textarea autoFocus required rows={5} maxLength={1200} value={text} onChange={(e) => setText(e.target.value)} placeholder="Задай вопрос, поделись новостью или найди компанию…" /></label>
    <div className="form-row"><label>Тема<select value={topic} onChange={(e) => setTopic(e.target.value)}>{['Обсуждение', 'Объявление', 'Учёба', 'Материалы', 'Опрос'].map((item) => <option key={item}>{item}</option>)}</select></label><div className="field-hint align-end">Будет видно участникам демо-группы в этом браузере.</div></div>
    <div className="modal-actions"><button type="button" className="button button-soft" onClick={onClose}>Отмена</button><button className="button button-primary" type="submit"><Send size={16} /> Опубликовать</button></div>
  </form>
}

function MaterialForm({ onClose, onSave }: { onClose: () => void; onSave: (material: Material) => void }) {
  const [title, setTitle] = useState('')
  const [subject, setSubject] = useState('')
  const [url, setUrl] = useState('')
  const submit = (event: FormEvent) => { event.preventDefault(); if (!title.trim() || !subject.trim()) return; let safeUrl = ''; try { const parsed = new URL(url); if (parsed.protocol === 'https:' || parsed.protocol === 'http:') safeUrl = parsed.href } catch { /* A URL is optional. */ } onSave({ id: createId('material'), title: title.trim(), subject: subject.trim(), type: safeUrl ? 'Ссылка' : 'Конспект', author: 'Ты', updated: 'только что', url: safeUrl || undefined }) }
  return <form className="form-stack" onSubmit={submit}>
    <label>Название<input autoFocus required value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Название конспекта или ссылки" /></label>
    <label>Предмет<input required value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="Например, английский язык" /></label>
    <label>Ссылка, если есть<input type="url" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://…" /></label>
    <p className="field-hint">В офлайн-режиме файлы не загружаются: сохраняются только название и ссылка.</p>
    <div className="modal-actions"><button type="button" className="button button-soft" onClick={onClose}>Отмена</button><button className="button button-primary" type="submit">Добавить материал</button></div>
  </form>
}

function EventForm({ onClose, onSave }: { onClose: () => void; onSave: (event: EventItem) => void }) {
  const [title, setTitle] = useState('')
  const [date, setDate] = useState(() => new Date(Date.now() + 86400000).toISOString().slice(0, 10))
  const [time, setTime] = useState('16:00')
  const [place, setPlace] = useState('')
  const submit = (e: FormEvent) => { e.preventDefault(); if (title.trim() && place.trim()) onSave({ id: createId('event'), title: title.trim(), date, time, place: place.trim(), people: 1, accent: 'violet' }) }
  return <form className="form-stack" onSubmit={submit}>
    <label>Название встречи<input autoFocus required value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Например, вместе повторяем английский" /></label>
    <div className="form-row"><label>Дата<input type="date" required value={date} onChange={(e) => setDate(e.target.value)} /></label><label>Время<input type="time" value={time} onChange={(e) => setTime(e.target.value)} /></label></div>
    <label>Место или ссылка<input required value={place} onChange={(e) => setPlace(e.target.value)} placeholder="Кафе, библиотека или онлайн" /></label>
    <div className="modal-actions"><button type="button" className="button button-soft" onClick={onClose}>Отмена</button><button className="button button-primary" type="submit">Создать встречу</button></div>
  </form>
}

function App() {
  const [page, setPage] = useState<Page>('home')
  const [snapshot, setSnapshot] = useState<Snapshot>(() => loadSnapshot(browserStorage()))
  const [theme, setTheme] = useState<Theme>(() => (safeGet('mezhpar.theme') as Theme | null) ?? 'system')
  const [selectedDay, setSelectedDay] = useState(() => new Date().getDay() || 1)
  const [parity, setParity] = useState<WeekParity>(() => weekParity(new Date()))
  const [modal, setModal] = useState<ModalState>(null)
  const [toast, setToast] = useState('')
  const [query, setQuery] = useState('')
  const [searchOpen, setSearchOpen] = useState(false)
  const [commentsOpen, setCommentsOpen] = useState<string | null>(null)
  const [commentText, setCommentText] = useState<Record<string, string>>({})
  const [studentSearch, setStudentSearch] = useState('')
  const [attendingEvents, setAttendingEvents] = useState<Record<string, boolean>>(loadAttendance)
  const [installPrompt, setInstallPrompt] = useState<Event & { prompt?: () => Promise<void>; userChoice?: Promise<{ outcome: string }> } | null>(null)
  const [displayName, setDisplayName] = useState(() => safeGet('mezhpar.name') ?? 'Студент')
  const [notificationState, setNotificationState] = useState(() => typeof Notification === 'undefined' ? 'unsupported' : Notification.permission)

  const now = new Date()
  const dateLine = displayDate(now)
  const days = useMemo(() => {
    const monday = weekStart(new Date())
    return Array.from({ length: 6 }, (_, index) => {
      const date = new Date(monday)
      date.setDate(monday.getDate() + index)
      return date
    })
  }, [])
  const todayIso = new Date(now.getTime() - now.getTimezoneOffset() * 60_000).toISOString().slice(0, 10)
  const todayWeekday = now.getDay()
  const todayLessons = lessonsForDay(snapshot.lessons, todayWeekday, weekParity(new Date()))
  const selectedLessons = lessonsForDay(snapshot.lessons, selectedDay, parity)
  const openAssignments = snapshot.assignments.filter((assignment) => !assignment.done).sort((a, b) => a.due.localeCompare(b.due))
  const upcomingAssignments = openAssignments.slice(0, 3)
  const queryResults = useMemo(() => searchSnapshot(snapshot, query), [snapshot, query])
  const shownStudents = students.filter((student) => `${student.name} ${student.major} ${student.status}`.toLocaleLowerCase('ru').includes(studentSearch.toLocaleLowerCase('ru')))
  const nextOccurrence = findNextLesson(snapshot.lessons, now)
  const nextLesson = nextOccurrence?.lesson

  useEffect(() => {
    document.documentElement.dataset.theme = theme
    const themeColor = document.querySelector('meta[name="theme-color"]')
    themeColor?.setAttribute('content', theme === 'dark' ? '#15151a' : '#f5f5f2')
    try { localStorage.setItem('mezhpar.theme', theme) } catch { /* Theme remains active for this session. */ }
  }, [theme])

  useEffect(() => {
    const onInstall = (event: Event) => { event.preventDefault(); setInstallPrompt(event as Event & { prompt?: () => Promise<void>; userChoice?: Promise<{ outcome: string }> }) }
    window.addEventListener('beforeinstallprompt', onInstall)
    return () => window.removeEventListener('beforeinstallprompt', onInstall)
  }, [])

  useEffect(() => {
    if (!toast) return
    const timer = window.setTimeout(() => setToast(''), 2800)
    return () => window.clearTimeout(timer)
  }, [toast])

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') { event.preventDefault(); setSearchOpen(true) }
      if (event.key === 'Escape') setSearchOpen(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  const commit = (next: Snapshot, message = 'Сохранено в этом браузере') => {
    setSnapshot(next)
    if (!saveSnapshot(next, browserStorage())) setToast('Браузер не разрешил сохранить изменения')
    else setToast(message)
  }

  const addLesson = (lesson: Lesson) => {
    const exists = snapshot.lessons.some((item) => item.id === lesson.id)
    const lessons = exists ? snapshot.lessons.map((item) => item.id === lesson.id ? lesson : item) : [...snapshot.lessons, lesson]
    commit({ ...snapshot, lessons }, 'Пара сохранена')
    setSelectedDay(lesson.weekday)
    setModal(null)
  }

  const addTask = (task: Assignment) => { commit({ ...snapshot, assignments: [...snapshot.assignments, task] }, 'Задание добавлено'); setModal(null) }
  const addPost = (post: Post) => {
    const exists = snapshot.posts.some((item) => item.id === post.id)
    const posts = exists ? snapshot.posts.map((item) => item.id === post.id ? post : item) : [post, ...snapshot.posts]
    commit({ ...snapshot, posts }, exists ? 'Публикация обновлена' : 'Публикация появилась в ленте')
    setModal(null)
    setPage('feed')
  }
  const addMaterial = (material: Material) => { commit({ ...snapshot, materials: [material, ...snapshot.materials] }, 'Материал добавлен'); setModal(null) }
  const addEvent = (event: EventItem) => {
    const attendance = { ...attendingEvents, [event.id]: true }
    setAttendingEvents(attendance)
    saveAttendance(attendance)
    commit({ ...snapshot, events: [...snapshot.events, { ...event, own: true }].sort((a, b) => a.date.localeCompare(b.date)) }, 'Встреча добавлена')
    setModal(null)
  }

  const toggleAttendance = (event: EventItem) => {
    const isGoing = Boolean(attendingEvents[event.id])
    const events = snapshot.events.map((item) => item.id === event.id ? { ...item, people: Math.max(0, item.people + (isGoing ? -1 : 1)) } : item)
    const attendance = { ...attendingEvents, [event.id]: !isGoing }
    setAttendingEvents(attendance)
    saveAttendance(attendance)
    commit({ ...snapshot, events }, isGoing ? 'Ты больше не идёшь на встречу' : 'Ты отметился на встречу')
  }

  const exportData = () => {
    const blob = new Blob([JSON.stringify({ exportedAt: new Date().toISOString(), group: GROUP_NAME, data: snapshot, myAttendance: attendingEvents }, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = 'mezhpar-my-data.json'
    link.click()
    URL.revokeObjectURL(url)
    setToast('Файл с данными скачан')
  }

  const resetDemo = () => {
    const next = createDemoSnapshot()
    setAttendingEvents({})
    saveAttendance({})
    commit(next, 'Демо-данные восстановлены')
  }

  const setPageAndClose = (next: Page) => { setPage(next); setSearchOpen(false); window.scrollTo({ top: 0, behavior: 'smooth' }) }

  const enableNotifications = async () => {
    if (typeof Notification === 'undefined') { setToast('Этот браузер не поддерживает уведомления'); return }
    const permission = await Notification.requestPermission()
    setNotificationState(permission)
    if (permission === 'granted') setToast('Разрешение включено. Push-уведомления с сервера пока не подключены.')
    else setToast('Разрешение на уведомления не выдано')
  }

  const installApp = async () => {
    if (installPrompt?.prompt) {
      await installPrompt.prompt()
      const choice = await installPrompt.userChoice
      if (choice?.outcome === 'accepted') setToast('МЕЖПАР добавлен на главный экран')
      setInstallPrompt(null)
    } else {
      setToast('Открой меню браузера и выбери «Установить приложение» или «Добавить на главный экран»')
    }
  }

  const renderLessonCard = (lesson: Lesson, compact = false) => (
    <button type="button" className={`lesson-card ${compact ? 'lesson-compact' : ''}`} key={lesson.id} onClick={() => setModal({ type: 'lesson', lesson })}>
      <span className="lesson-time">{lesson.start}<small>{lesson.end}</small></span>
      <span className="lesson-main"><span className="lesson-title">{lesson.subject}</span><span className="lesson-meta">{lesson.kind} <span className="dot-separator">·</span> {lesson.teacher}</span></span>
      <span className="lesson-room"><MapPin size={14} /> {lesson.room}</span>
      <ChevronRight className="lesson-chevron" size={16} />
    </button>
  )

  const renderTask = (task: Assignment, compact = false) => {
    const diff = Math.round((new Date(`${task.due}T12:00:00`).getTime() - new Date(`${todayIso}T12:00:00`).getTime()) / 86400000)
    const dueLabel = diff < 0 ? 'Просрочено' : diff === 0 ? 'Сегодня' : diff === 1 ? 'Завтра' : toDateLabel(task.due, { day: 'numeric', month: 'short' })
    return <article className={`task-row ${task.done ? 'task-done' : ''} ${compact ? 'task-row-compact' : ''}`} key={task.id}>
      <button type="button" className="task-check" aria-label={task.done ? `Снять отметку: ${task.title}` : `Отметить выполненным: ${task.title}`} onClick={() => commit({ ...snapshot, assignments: toggleAssignment(snapshot.assignments, task.id) }, task.done ? 'Задание снова активно' : 'Задание отмечено выполненным')}><Check size={15} /></button>
      <div className="task-copy"><span className="task-subject">{task.subject}</span><h3>{task.title}</h3>{task.details && !compact && <p>{task.details}</p>}<div className="task-meta"><Tag>{task.kind}</Tag><span className={`due-label ${diff <= 1 && !task.done ? 'due-soon' : ''}`}><Clock3 size={13} /> {dueLabel}</span></div></div>
      {task.done && <CheckCircle2 className="done-mark" size={17} />}
    </article>
  }

  const renderPost = (post: Post) => (
    <article className="post-card" key={post.id}>
      <div className="post-heading"><Avatar name={post.author} tone={post.own ? 'avatar-self' : ''} /><div className="post-author"><strong>{post.author}</strong><span>{post.role ?? 'участник'} <i>·</i> {post.time}</span></div>{post.pinned && <Tag tone="tag-pin"><Pin size={12} /> Важно</Tag>}{post.own && <><IconButton label="Редактировать свою публикацию" onClick={() => setModal({ type: 'post', post })}><Pencil size={16} /></IconButton><IconButton label="Удалить свою публикацию" onClick={() => commit({ ...snapshot, posts: snapshot.posts.filter((item) => item.id !== post.id) }, 'Публикация удалена')}><Trash2 size={16} /></IconButton></>}</div>
      {post.topic && <Tag tone="tag-topic">{post.topic}</Tag>}
      <p className="post-text">{post.text}</p>
      <div className="post-actions"><button type="button" className={`text-action ${post.liked ? 'liked' : ''}`} onClick={() => commit({ ...snapshot, posts: toggleReaction(snapshot.posts, post.id) }, post.liked ? 'Реакция убрана' : 'Реакция добавлена')}><Heart size={16} fill={post.liked ? 'currentColor' : 'none'} /> {post.likes || 'Нравится'}</button><button type="button" className="text-action" onClick={() => setCommentsOpen(commentsOpen === post.id ? null : post.id)}><MessageSquare size={16} /> {post.comments.length || 'Ответить'}</button><button type="button" className="text-action post-share" onClick={() => { void navigator.clipboard?.writeText(post.text); setToast('Текст скопирован') }}><ArrowUpRight size={16} /> Поделиться</button></div>
      {commentsOpen === post.id && <div className="comment-section"><div className="comment-list">{post.comments.map((comment) => <div className="comment" key={comment.id}><Avatar name={comment.author} text={comment.initials} tone="avatar-small" /><div><strong>{comment.author}</strong><p>{comment.text}</p><span>{comment.time}</span></div></div>)}{post.comments.length === 0 && <p className="empty-inline">Пока тихо. Напиши первым.</p>}</div><form className="comment-form" onSubmit={(event) => { event.preventDefault(); const value = commentText[post.id]?.trim(); if (!value) return; const nextPost = { ...post, comments: [...post.comments, { id: createId('comment'), author: displayName, initials: initials(displayName), text: value, time: 'только что' }] }; commit({ ...snapshot, posts: snapshot.posts.map((item) => item.id === post.id ? nextPost : item) }, 'Комментарий добавлен'); setCommentText({ ...commentText, [post.id]: '' }) }}><input aria-label="Написать комментарий" value={commentText[post.id] ?? ''} onChange={(e) => setCommentText({ ...commentText, [post.id]: e.target.value })} placeholder="Написать ответ…" /><button className="icon-button send-button" type="submit" aria-label="Отправить ответ"><Send size={16} /></button></form></div>}
    </article>
  )

  const sidebar = <aside className="sidebar">
    <button className="brand-lockup" type="button" onClick={() => setPageAndClose('home')} aria-label="МЕЖПАР — на главную"><span className="brand-mark"><span /><span /><span /><span /></span><span className="brand-word">МЕЖПАР<span className="brand-dot">.</span></span></button>
    <button className="group-switcher" type="button" onClick={() => setToast('Сменить группу можно после подключения учётной записи')}><span className="group-avatar">Р</span><span className="group-copy"><strong>{GROUP_NAME}</strong><small>{GROUP_UNIVERSITY}</small></span><ChevronDown size={15} /></button>
    <div className="sidebar-caption">ПРОСТРАНСТВО</div>
    <nav className="sidebar-nav" aria-label="Основная навигация">{navItems.map((item) => <button type="button" className={`nav-item ${page === item.id ? 'nav-active' : ''}`} key={item.id} onClick={() => setPageAndClose(item.id)}><item.icon size={18} strokeWidth={1.8} /><span>{item.label}</span>{item.id === 'tasks' && openAssignments.length > 0 && <span className="nav-count">{openAssignments.length}</span>}</button>)}</nav>
    <div className="sidebar-divider" />
    <button type="button" className={`nav-item ${page === 'settings' ? 'nav-active' : ''}`} onClick={() => setPageAndClose('settings')}><Settings size={18} strokeWidth={1.8} /><span>Настройки</span></button>
    <div className="sidebar-bottom"><div className="sidebar-mode"><span className="mode-live-dot" /><span>Локальный предпросмотр</span></div><button type="button" className="profile-switcher" onClick={() => setPageAndClose('settings')}><Avatar name={displayName} tone="avatar-self" /><span><strong>{displayName}</strong><small>профиль на устройстве</small></span><MoreHorizontal size={17} /></button></div>
  </aside>

  const pageHeader = pageText[page]
  const setParityFromDate = (date: Date) => setParity(weekParity(date))

  return <div className="app-shell">
    <a className="skip-link" href="#main-content">Перейти к содержимому</a>
    {sidebar}
    <main className="main-column" id="main-content">
      <header className="topbar"><div className="mobile-brand"><span className="brand-mark"><span /><span /><span /><span /></span><span>МЕЖПАР<span className="brand-dot">.</span></span></div><div className="topbar-context"><span className="topbar-date">{dateLine}</span><span className="topbar-divider" /><span className="preview-label"><span className="mode-live-dot" /> демо-режим</span></div><div className="topbar-actions"><button type="button" className="search-trigger" onClick={() => setSearchOpen(true)}><Search size={16} /><span>Поиск</span><kbd>⌘ K</kbd></button><IconButton label="Настройки уведомлений" onClick={() => setPageAndClose('settings')}><Bell size={18} /></IconButton><button type="button" className="top-avatar" onClick={() => setPageAndClose('settings')}><Avatar name={displayName} tone="avatar-self" /></button></div></header>
      <div className="content-wrap">
        <div className="page-heading"><div><div className="breadcrumb">{GROUP_UNIVERSITY}<span>/</span>{GROUP_NAME}</div><h1>{pageHeader.title}</h1><p>{pageHeader.description}</p></div><div className="heading-action">{page === 'schedule' && <button className="button button-primary" type="button" onClick={() => setModal({ type: 'lesson' })}><Plus size={17} /> Добавить пару</button>}{page === 'tasks' && <button className="button button-primary" type="button" onClick={() => setModal({ type: 'task' })}><Plus size={17} /> Новое задание</button>}{page === 'feed' && <button className="button button-primary" type="button" onClick={() => setModal({ type: 'post' })}><Plus size={17} /> Написать</button>}{page === 'materials' && <button className="button button-primary" type="button" onClick={() => setModal({ type: 'material' })}><Plus size={17} /> Добавить</button>}{page === 'events' && <button className="button button-primary" type="button" onClick={() => setModal({ type: 'event' })}><Plus size={17} /> Создать встречу</button>}</div></div>
        <div className="demo-notice"><span className="demo-badge">ДЕМО</span><span>Вымышленные примеры. Изменения остаются только в этом браузере и не видны другим.</span><button type="button" onClick={() => setPageAndClose('settings')}>Как подключить группу <ArrowRight size={14} /></button></div>

        {page === 'home' && <div className="home-grid">
          <div className="home-main-stack">
            <section className="welcome-card"><div className="welcome-copy"><Tag tone="tag-welcome"><Sparkles size={12} /> НЕДЕЛЯ В ФОКУСЕ</Tag><h2>Привет, {displayName === 'Студент' ? 'будущий студент' : displayName.split(' ')[0]}<span className="welcome-mark">.</span></h2><p>Всё важное в группе — без поисков в десятках чатов.</p></div><div className="welcome-stats"><div><span>{todayLessons.length}</span><small>пары сегодня</small></div><i /><div><span>{openAssignments.length}</span><small>дела впереди</small></div></div><div className="welcome-orb orb-one" /><div className="welcome-orb orb-two" /></section>
            <section className="panel schedule-panel"><div className="panel-heading"><div><span className="eyebrow">{displayDate(now, { weekday: 'long', day: 'numeric', month: 'long' }).toLocaleUpperCase('ru')}</span><h2>Расписание на сегодня</h2></div><button type="button" className="link-button" onClick={() => setPageAndClose('schedule')}>Вся неделя <ArrowRight size={15} /></button></div>{todayLessons.length ? <div className="lesson-list">{todayLessons.slice(0, 3).map((lesson) => renderLessonCard(lesson, true))}</div> : <EmptyState icon={CalendarDays} title="Свободный день" text="Сегодня пар нет. Можно выдохнуть или добавить расписание." action="Добавить пару" onClick={() => setModal({ type: 'lesson' })} />}</section>
            <section className="panel feed-preview"><div className="panel-heading"><div><span className="eyebrow">ОБЩЕНИЕ</span><h2>Что происходит</h2></div><button type="button" className="link-button" onClick={() => setPageAndClose('feed')}>Открыть ленту <ArrowRight size={15} /></button></div><div className="post-stack">{snapshot.posts.slice(0, 2).map(renderPost)}</div><button type="button" className="composer-inline" onClick={() => setModal({ type: 'post' })}><Avatar name={displayName} tone="avatar-self" /><span>Есть вопрос или новость для группы?</span><span className="composer-inline-plus"><Plus size={16} /></span></button></section>
          </div>
          <aside className="home-aside">
            <section className="next-class-card"><div className="aside-card-top"><span><span className="pulse-dot" /> БЛИЖАЙШАЯ ПАРА{nextOccurrence && <small> · {(nextOccurrence.date.toISOString().slice(0, 10) === todayIso ? "СЕГОДНЯ" : displayDate(nextOccurrence.date, { weekday: "short", day: "numeric", month: "short" })).toLocaleUpperCase("ru")}</small>}</span><CalendarCheck2 size={17} /></div>{nextLesson ? <><div className="next-time">{nextLesson.start}<span>—</span>{nextLesson.end}</div><h2>{nextLesson.subject}</h2><div className="next-meta"><span><MapPin size={15} /> ауд. {nextLesson.room}</span><span>{nextLesson.kind}</span></div><div className="next-footer"><Avatar name={nextLesson.teacher} text={initials(nextLesson.teacher)} tone="avatar-teacher" /><span>{nextLesson.teacher}</span><button type="button" onClick={() => setModal({ type: 'lesson', lesson: nextLesson })} aria-label="Подробнее о паре"><ArrowUpRight size={17} /></button></div></> : <div className="no-next"><h2>Сегодня без пар</h2><p>Можно использовать это время для себя.</p></div>}</section>
            <section className="panel tasks-panel"><div className="panel-heading"><div><span className="eyebrow">ДЕДЛАЙНЫ</span><h2>На подходе</h2></div><button type="button" className="round-add" aria-label="Добавить задание" onClick={() => setModal({ type: 'task' })}><Plus size={17} /></button></div>{upcomingAssignments.length ? <div className="compact-task-list">{upcomingAssignments.map((task) => renderTask(task, true))}</div> : <EmptyState icon={CheckCircle2} title="Всё сделано" text="Новых дедлайнов пока нет." />}</section>
            <section className="event-peek"><div className="event-peek-icon"><Coffee size={19} /></div><div><span className="eyebrow">СКОРО · {snapshot.events[0] ? toDateLabel(snapshot.events[0].date, { day: 'numeric', month: 'short' }).toUpperCase() : 'НОВАЯ ВСТРЕЧА'}</span><strong>{snapshot.events[0]?.title ?? 'Создай свою встречу'}</strong><small>{snapshot.events[0]?.time ?? 'позови одногруппников'}</small></div><button type="button" onClick={() => setPageAndClose('events')} aria-label="Все встречи"><ArrowRight size={16} /></button></section>
            <section className="community-card"><div className="community-avatars">{students.slice(0, 4).map((person) => <Avatar key={person.initials} name={person.name} text={person.initials} />)}</div><span><strong>18 человек</strong><small>в группе РСО-212</small></span><button type="button" onClick={() => setPageAndClose('people')}>Все <ArrowRight size={14} /></button></section>
          </aside>
        </div>}

        {page === 'schedule' && <section className="panel page-panel schedule-page">
          <div className="schedule-toolbar"><div className="day-selector" role="tablist" aria-label="День недели">{days.map((date, index) => { const day = index + 1; const active = day === selectedDay; const count = lessonsForDay(snapshot.lessons, day, weekParity(date)).length; return <button type="button" role="tab" aria-selected={active} key={day} className={`day-tab ${active ? 'day-tab-active' : ''}`} onClick={() => { setSelectedDay(day); setParityFromDate(date) }}><span>{new Intl.DateTimeFormat('ru-RU', { weekday: 'short' }).format(date).replace('.', '')}</span><strong>{date.getDate()}</strong>{count > 0 && <i>{count}</i>}</button> })}</div><div className="week-switch"><button type="button" className={parity === 'odd' ? 'selected' : ''} onClick={() => setParity('odd')}>Нечётная</button><button type="button" className={parity === 'even' ? 'selected' : ''} onClick={() => setParity('even')}>Чётная</button></div></div>
          <div className="selected-day-heading"><div><span className="eyebrow">{new Intl.DateTimeFormat('ru-RU', { weekday: 'long' }).format(days[selectedDay - 1])}</span><h2>{displayDate(days[selectedDay - 1], { day: 'numeric', month: 'long' })}</h2></div><Tag tone="tag-neutral">{selectedLessons.length} {selectedLessons.length === 1 ? 'пара' : 'пары'}</Tag></div>
          {selectedLessons.length ? <div className="lesson-timeline">{selectedLessons.map((lesson, index) => <div className="timeline-item" key={lesson.id}><div className="timeline-rail"><span className={index === 0 ? 'timeline-dot timeline-dot-active' : 'timeline-dot'} /><i /></div><div className="timeline-content"><div className="timeline-label"><span>{lesson.start} — {lesson.end}</span><Tag>{lesson.parity === 'all' ? 'каждую неделю' : lesson.parity === 'even' ? 'чётная' : 'нечётная'}</Tag></div>{renderLessonCard(lesson)}</div></div>)}</div> : <EmptyState icon={CalendarDays} title="На этот день пар пока нет" text="Добавь пару, и группа увидит её в расписании." action="Добавить пару" onClick={() => setModal({ type: 'lesson' })} />}
          <div className="schedule-footnote"><ShieldCheck size={15} /> Изменения здесь — только в локальном предпросмотре.</div>
        </section>}

        {page === 'tasks' && <div className="task-page-grid"><section className="panel page-panel"><div className="panel-heading"><div><span className="eyebrow">ПЛАН НА НЕДЕЛЮ</span><h2>В работе <span className="heading-count">{openAssignments.length}</span></h2></div><button type="button" className="round-add" aria-label="Добавить задание" onClick={() => setModal({ type: 'task' })}><Plus size={17} /></button></div>{openAssignments.length ? <div className="full-task-list">{openAssignments.map((task) => renderTask(task))}</div> : <EmptyState icon={CheckCircle2} title="Заданий нет" text="Добавь первое дело или отметь демо-задания выполненными." action="Добавить задание" onClick={() => setModal({ type: 'task' })} />}</section><section className="panel page-panel done-panel"><span className="eyebrow">ГОТОВО</span><h2>Уже сделано <span className="heading-count">{snapshot.assignments.filter((task) => task.done).length}</span></h2>{snapshot.assignments.filter((task) => task.done).length ? snapshot.assignments.filter((task) => task.done).map((task) => renderTask(task, true)) : <p className="muted-copy">Здесь появятся задания, которые ты отметишь готовыми.</p>}</section></div>}

        {page === 'feed' && <div className="feed-layout"><div className="feed-column"><button type="button" className="feed-composer" onClick={() => setModal({ type: 'post' })}><Avatar name={displayName} tone="avatar-self" /><span>Поделись новостью или задай вопрос группе…</span><span className="composer-attach"><Plus size={18} /></span></button><div className="feed-filter"><button className="filter-active" type="button"><Sparkles size={15} /> Свежее</button><button type="button" onClick={() => setToast('В демо-предпросмотре закреплена одна важная публикация')}><Pin size={15} /> Важное</button><button type="button" onClick={() => setPageAndClose('materials')}><FolderOpen size={15} /> Материалы</button></div><div className="post-stack">{snapshot.posts.length ? snapshot.posts.map(renderPost) : <EmptyState icon={MessageCircle} title="Лента пока пустая" text="Напиши первым — начни разговор в группе." action="Создать публикацию" onClick={() => setModal({ type: 'post' })} />}</div></div><aside className="feed-aside"><section className="panel"><div className="panel-heading"><div><span className="eyebrow">ГРУППА</span><h2>{GROUP_NAME}</h2></div><span className="group-status-dot" /></div><p className="muted-copy">Учебное пространство для расписания, вопросов и общих материалов.</p><div className="mini-divider" /><div className="group-stat-line"><span>Участников</span><strong>18</strong></div><div className="group-stat-line"><span>Публикаций</span><strong>{snapshot.posts.length}</strong></div><button className="button button-soft button-full" onClick={() => setPageAndClose('people')}>О группе <ArrowRight size={15} /></button></section><section className="community-prompt"><span className="prompt-icon"><Sparkles size={18} /></span><strong>Хорошие вещи случаются между парами</strong><p>Позови группу на кофе, совместную учёбу или прогулку.</p><button className="link-button" onClick={() => setPageAndClose('events')}>Создать встречу <ArrowRight size={15} /></button></section></aside></div>}

        {page === 'materials' && <section className="panel page-panel"><div className="materials-toolbar"><div><span className="eyebrow">БИБЛИОТЕКА ГРУППЫ</span><h2>Всё, что пригодится</h2></div><label className="materials-search"><Search size={15} /><input aria-label="Поиск по материалам" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Найти конспект или предмет" /></label></div><div className="material-grid">{queryResults.materials.map((material) => <article className="material-card" key={material.id}><div className={`material-icon ${material.type === 'Ссылка' ? 'material-link' : ''}`}>{material.type === 'Ссылка' ? <LinkIcon size={19} /> : material.type === 'Документ' ? <FileText size={19} /> : <BookOpen size={19} />}</div><div className="material-content"><Tag>{material.subject}</Tag><h3>{material.title}</h3><p>{material.type} <i>·</i> от {material.author}</p><small>Обновлено {material.updated}</small></div>{material.url ? <a className="material-open" href={material.url} target="_blank" rel="noreferrer" aria-label={`Открыть: ${material.title}`}><ArrowUpRight size={18} /></a> : <span className="material-open muted-icon" title="В этом предпросмотре файл не загружен"><ArrowUpRight size={18} /></span>}</article>)}</div>{queryResults.materials.length === 0 && <EmptyState icon={FolderOpen} title="Ничего не нашлось" text="Попробуй изменить запрос или добавь первый материал." action="Добавить материал" onClick={() => setModal({ type: 'material' })} />}</section>}

        {page === 'people' && <div className="people-layout"><section className="panel page-panel"><div className="members-toolbar"><div><span className="eyebrow">ОДНОКУРСНИКИ</span><h2>Участники <span className="heading-count">18</span></h2></div><label className="materials-search"><Search size={15} /><input aria-label="Поиск участников" value={studentSearch} onChange={(e) => setStudentSearch(e.target.value)} placeholder="Найти человека" /></label></div><div className="people-grid">{shownStudents.map((student) => <article className="person-card" key={student.initials}><div className="person-photo"><Avatar name={student.name} text={student.initials} tone={student.online ? 'avatar-online' : ''} /><span className={`presence-dot ${student.online ? 'online' : ''}`} /></div><div className="person-info"><strong>{student.name}</strong><span>{student.major}</span><small>{student.status}</small></div><button type="button" className="person-action" onClick={() => setToast('Личные сообщения появятся после подключения общей учётной записи')} aria-label={`Написать ${student.name}`}><MessageCircle size={17} /></button></article>)}</div>{shownStudents.length === 0 && <EmptyState icon={UsersRound} title="Никого не нашли" text="Проверь имя или очисти поиск." />}</section><aside className="panel page-panel admin-panel"><span className="eyebrow">ДЛЯ СТАРОСТЫ</span><div className="admin-icon"><ShieldCheck size={20} /></div><h2>Управление группой</h2><p>В настоящем пространстве староста сможет обновлять пары, добавлять задания и закреплять важные объявления.</p><div className="admin-shortcuts"><button type="button" onClick={() => { setPageAndClose('schedule'); setModal({ type: 'lesson' }) }}><CalendarPlus size={16} /> Изменить расписание</button><button type="button" onClick={() => { setPageAndClose('tasks'); setModal({ type: 'task' }) }}><ListTodo size={16} /> Добавить задание</button><button type="button" onClick={() => { setPageAndClose('feed'); setModal({ type: 'post' }) }}><Pin size={16} /> Написать объявление</button></div><div className="admin-footnote"><LockKeyholeIcon /> Для реального управления потребуется вход и серверная проверка роли старосты.</div></aside></div>}

        {page === 'events' && <section className="page-panel events-page"><div className="events-intro"><div className="events-icon"><Coffee size={22} /></div><div><span className="eyebrow">ЖИЗНЬ ВНЕ ПАР</span><h2>Увидеться — тоже план</h2><p>Создавай небольшие встречи и зови одногруппников.</p></div><button type="button" className="button button-primary" onClick={() => setModal({ type: 'event' })}><Plus size={17} /> Новая встреча</button></div><div className="event-grid">{snapshot.events.map((event) => <article className={`event-card event-${event.accent}`} key={event.id}><div className="event-date"><strong>{new Date(`${event.date}T12:00:00`).getDate()}</strong><span>{new Intl.DateTimeFormat('ru-RU', { month: 'short' }).format(new Date(`${event.date}T12:00:00`)).replace('.', '')}</span></div><div className="event-copy"><Tag>{toDateLabel(event.date, { weekday: 'long' })}</Tag><h3>{event.title}</h3><p><Clock3 size={14} /> {event.time} <i>·</i> <MapPin size={14} /> {event.place}</p><div className="event-attendees"><div className="community-avatars">{students.slice(0, Math.min(3, event.people)).map((person) => <Avatar key={person.initials} name={person.name} text={person.initials} />)}</div><span>{event.people} {event.people === 1 ? 'человек идёт' : 'человека идут'}</span><button type="button" onClick={() => toggleAttendance(event)}>{attendingEvents[event.id] ? 'Иду' : 'Пойду'}</button></div></div><button className="event-menu" type="button" aria-label="Удалить встречу" onClick={() => { if (event.own) commit({ ...snapshot, events: snapshot.events.filter((item) => item.id !== event.id) }, 'Встреча удалена'); else setToast('Удалить можно только свою встречу') }}><MoreHorizontal size={18} /></button></article>)}</div>{snapshot.events.length === 0 && <EmptyState icon={Coffee} title="Пока ничего не запланировано" text="Создай встречу и предложи одногруппникам провести время вместе." action="Создать встречу" onClick={() => setModal({ type: 'event' })} />}</section>}

        {page === 'settings' && <div className="settings-layout"><section className="panel page-panel settings-panel"><span className="eyebrow">ПРОФИЛЬ НА ЭТОМ УСТРОЙСТВЕ</span><h2>Как к тебе обращаться?</h2><p className="muted-copy">Имя используется только в локальном предпросмотре публикаций и комментариев.</p><form className="name-form" onSubmit={(e) => { e.preventDefault(); try { localStorage.setItem('mezhpar.name', displayName.trim()) } catch { /* keep in memory */ } setToast('Имя сохранено на этом устройстве') }}><label>Отображаемое имя<input value={displayName} maxLength={40} onChange={(e) => setDisplayName(e.target.value)} /></label><button className="button button-primary" type="submit">Сохранить</button></form><div className="settings-divider" /><span className="eyebrow">ВНЕШНИЙ ВИД</span><h2>Тема приложения</h2><div className="theme-options">{([{ value: 'system', label: 'Как в системе', icon: Sparkles }, { value: 'light', label: 'Светлая', icon: Sun }, { value: 'dark', label: 'Тёмная', icon: Moon }] as const).map((item) => <button type="button" className={`theme-option ${theme === item.value ? 'theme-selected' : ''}`} onClick={() => setTheme(item.value)} key={item.value}><item.icon size={18} /><span>{item.label}</span>{theme === item.value && <Check size={15} />}</button>)}</div><div className="settings-divider" /><span className="eyebrow">УСТРОЙСТВО</span><h2>Установить МЕЖПАР</h2><p className="muted-copy">Добавь приложение на главный экран, чтобы открывать его отдельно от браузера.</p><button className="button button-soft" onClick={() => void installApp()}><ArrowDownToLine size={16} /> Установить приложение</button><div className="settings-divider" /><span className="eyebrow">УВЕДОМЛЕНИЯ</span><h2>Напоминания в браузере</h2><p className="muted-copy">Браузерные уведомления доступны только после разрешения. Серверная доставка пока не подключена.</p><div className="notification-line"><span>{notificationState === 'granted' ? 'Разрешение включено' : notificationState === 'denied' ? 'Разрешение заблокировано в браузере' : notificationState === 'unsupported' ? 'Не поддерживается этим браузером' : 'Пока выключены'}</span><button type="button" className="button button-soft" onClick={() => void enableNotifications()} disabled={notificationState === 'unsupported' || notificationState === 'granted'}>{notificationState === 'granted' ? 'Включено' : 'Разрешить'}</button></div></section>
          <aside className="settings-side"><section className="panel page-panel"><span className="eyebrow">РЕЖИМ РАБОТЫ</span><div className="connection-status"><span className="connection-icon"><Sparkles size={17} /></span><div><strong>Локальный предпросмотр</strong><small>без регистрации и сервера</small></div><span className="status-pill">активен</span></div><p>Это рабочая демо-версия: расписание, задания и публикации сохраняются только в этом браузере.</p><button type="button" className="button button-soft button-full" onClick={() => setToast('Общий backend пока не подключён. Ограничения и план смотри в README.')}>О плане общего backend <ArrowUpRight size={15} /></button></section><section className="panel page-panel"><span className="eyebrow">ТВОИ ДАННЫЕ</span><h2>Сохранность и перенос</h2><p className="muted-copy">Выведи локальные данные в JSON или восстанови демо-набор.</p><div className="data-actions"><button type="button" onClick={exportData}><ArrowDownToLine size={16} /> Скачать мои данные</button><button type="button" onClick={resetDemo}><Sparkles size={16} /> Вернуть демо-данные</button></div><div className="data-note"><ShieldCheck size={15} /><span>На сервер ничего не отправляется. Очистка данных доступна через кнопку внизу.</span></div><button type="button" className="danger-zone" onClick={() => { try { localStorage.removeItem('mezhpar.snapshot.v1') } catch { /* no-op */ } resetDemo(); setToast('Локальные правки очищены; показан исходный демо-набор') }}>Сбросить локальные изменения</button></section><section className="legal-note"><CircleHelp size={17} /><p>Для запуска реальной группы потребуются российский backend, политика обработки персональных данных и настройка доступа.</p></section></aside>
        </div>}
      </div>
      <footer className="app-footer"><span>МЕЖПАР<span className="brand-dot">.</span> <i>пространство группы</i></span><span>Открытый проект · <a href="https://github.com/pluseight8/mezhpar" target="_blank" rel="noreferrer">GitHub <ArrowUpRight size={12} /></a></span></footer>
    </main>
    <nav className="mobile-nav" aria-label="Нижняя навигация">{navItems.filter((item) => item.mobile).map((item) => <button type="button" key={item.id} aria-current={page === item.id ? 'page' : undefined} className={page === item.id ? 'mobile-active' : ''} onClick={() => setPageAndClose(item.id)}><item.icon size={20} strokeWidth={1.8} /><span>{item.id === 'home' ? 'Обзор' : item.id === 'schedule' ? 'Пары' : item.label}</span>{item.id === 'tasks' && openAssignments.length > 0 && <i className="mobile-count">{openAssignments.length}</i>}</button>)}</nav>

    {searchOpen && <div className="search-backdrop" onMouseDown={(e) => { if (e.target === e.currentTarget) setSearchOpen(false) }}><section className="search-dialog" role="dialog" aria-modal="true" aria-label="Поиск в группе"><div className="search-dialog-input"><Search size={18} /><input autoFocus value={query} onChange={(e) => { setQuery(e.target.value) }} placeholder="Найти пару, задание, публикацию…" /><kbd>ESC</kbd></div><div className="search-results">{query.trim() ? <>{queryResults.lessons.slice(0, 3).map((lesson) => <button type="button" key={lesson.id} onClick={() => { setSelectedDay(lesson.weekday); setPageAndClose('schedule') }}><CalendarDays size={17} /><span><strong>{lesson.subject}</strong><small>Пара · {lesson.start} · ауд. {lesson.room}</small></span><ArrowUpRight size={15} /></button>)}{queryResults.assignments.slice(0, 3).map((task) => <button type="button" key={task.id} onClick={() => setPageAndClose('tasks')}><ListTodo size={17} /><span><strong>{task.title}</strong><small>Задание · {task.subject}</small></span><ArrowUpRight size={15} /></button>)}{queryResults.posts.slice(0, 3).map((post) => <button type="button" key={post.id} onClick={() => setPageAndClose('feed')}><MessageCircle size={17} /><span><strong>{post.text.slice(0, 70)}{post.text.length > 70 ? '…' : ''}</strong><small>Публикация · {post.author}</small></span><ArrowUpRight size={15} /></button>)}{queryResults.materials.slice(0, 3).map((material) => <button type="button" key={material.id} onClick={() => setPageAndClose('materials')}><FolderOpen size={17} /><span><strong>{material.title}</strong><small>Материал · {material.subject}</small></span><ArrowUpRight size={15} /></button>)}{queryResults.lessons.length + queryResults.assignments.length + queryResults.posts.length + queryResults.materials.length === 0 && <p className="search-empty">Совпадений не нашлось. Попробуй другой запрос.</p>}</> : <div className="search-hint"><Sparkles size={17} /><span>Ищи по предметам, заданиям и публикациям группы.</span></div>}</div><div className="search-dialog-footer"><span><kbd>↵</kbd> открыть раздел</span><span><kbd>↑</kbd><kbd>↓</kbd> выбрать</span><span><kbd>esc</kbd> закрыть</span></div></section></div>}

    {modal?.type === 'lesson' && <Modal title={modal.lesson ? 'Изменить пару' : 'Добавить пару'} onClose={() => setModal(null)}><LessonForm initial={modal.lesson} onClose={() => setModal(null)} onSave={addLesson} onDelete={modal.lesson ? () => { commit({ ...snapshot, lessons: snapshot.lessons.filter((lesson) => lesson.id !== modal.lesson?.id) }, 'Пара удалена'); setModal(null) } : undefined} /></Modal>}
    {modal?.type === 'task' && <Modal title="Новое задание" onClose={() => setModal(null)}><TaskForm onClose={() => setModal(null)} onSave={addTask} /></Modal>}
    {modal?.type === 'post' && <Modal title={modal.post ? 'Редактировать публикацию' : 'Новая публикация'} onClose={() => setModal(null)} wide><PostForm initial={modal.post} authorName={displayName} onClose={() => setModal(null)} onSave={addPost} /></Modal>}
    {modal?.type === 'material' && <Modal title="Добавить материал" onClose={() => setModal(null)}><MaterialForm onClose={() => setModal(null)} onSave={addMaterial} /></Modal>}
    {modal?.type === 'event' && <Modal title="Создать встречу" onClose={() => setModal(null)}><EventForm onClose={() => setModal(null)} onSave={addEvent} /></Modal>}
    {toast && <div className="toast" role="status"><CheckCircle2 size={17} /> {toast}</div>}
  </div>
}

function EmptyState({ icon: Icon, title, text, action, onClick }: { icon: LucideIcon; title: string; text: string; action?: string; onClick?: () => void }) {
  return <div className="empty-state"><span className="empty-icon"><Icon size={20} /></span><strong>{title}</strong><p>{text}</p>{action && onClick && <button type="button" className="button button-soft" onClick={onClick}>{action} <ArrowRight size={15} /></button>}</div>
}

function LockKeyholeIcon() { return <ShieldCheck size={15} /> }

export default App
