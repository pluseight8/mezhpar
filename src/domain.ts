export type Page = 'home' | 'schedule' | 'tasks' | 'feed' | 'materials' | 'people' | 'events' | 'settings'
export type WeekParity = 'odd' | 'even'
export type LessonKind = 'Лекция' | 'Практика' | 'Семинар' | 'Зачёт'

export interface Lesson {
  id: string
  weekday: number
  start: string
  end: string
  subject: string
  teacher: string
  room: string
  kind: LessonKind
  parity: WeekParity | 'all'
  note?: string
}

export interface Assignment {
  id: string
  subject: string
  title: string
  due: string
  kind: 'Домашнее задание' | 'Чтение' | 'Подготовка'
  done: boolean
  details?: string
}

export interface Comment {
  id: string
  author: string
  initials: string
  text: string
  time: string
}

export interface Post {
  id: string
  author: string
  initials: string
  role?: string
  text: string
  time: string
  likes: number
  liked: boolean
  pinned?: boolean
  comments: Comment[]
  topic?: string
  own?: boolean
}

export interface Material {
  id: string
  title: string
  subject: string
  type: 'Конспект' | 'Ссылка' | 'Документ'
  author: string
  updated: string
  url?: string
}

export interface Student {
  name: string
  initials: string
  major: string
  online?: boolean
  status?: string
}

export interface EventItem {
  id: string
  title: string
  date: string
  time: string
  place: string
  people: number
  accent: 'violet' | 'orange' | 'blue'
  own?: boolean
}

export interface Snapshot {
  version: 1
  lessons: Lesson[]
  assignments: Assignment[]
  posts: Post[]
  materials: Material[]
  events: EventItem[]
}

export const STORAGE_KEY = 'mezhpar.snapshot.v1'
export const GROUP_NAME = 'РСО-212'
export const GROUP_UNIVERSITY = 'РГЭУ (РИНХ)'

const dateInDays = (days: number) => {
  const date = new Date()
  date.setDate(date.getDate() + days)
  return new Date(date.getTime() - date.getTimezoneOffset() * 60_000).toISOString().slice(0, 10)
}

export function createDemoSnapshot(): Snapshot {
  return {
    version: 1,
    lessons: [
      { id: 'l1', weekday: 1, start: '09:00', end: '10:30', subject: 'Введение в коммуникации', teacher: 'Е. А. Левина', room: '207', kind: 'Лекция', parity: 'all' },
      { id: 'l2', weekday: 1, start: '10:45', end: '12:15', subject: 'Академическое письмо', teacher: 'М. И. Соколова', room: '314', kind: 'Практика', parity: 'all' },
      { id: 'l3', weekday: 2, start: '10:10', end: '11:40', subject: 'Социология', teacher: 'А. С. Орлов', room: '520', kind: 'Семинар', parity: 'all' },
      { id: 'l4', weekday: 3, start: '08:30', end: '10:00', subject: 'Медиакоммуникации', teacher: 'О. П. Белова', room: '411', kind: 'Практика', parity: 'even' },
      { id: 'l5', weekday: 3, start: '10:10', end: '11:40', subject: 'Английский для учёбы', teacher: 'Д. В. Семёнова', room: '206', kind: 'Практика', parity: 'all' },
      { id: 'l6', weekday: 4, start: '12:30', end: '14:00', subject: 'Основы рекламы', teacher: 'И. В. Климова', room: '118', kind: 'Лекция', parity: 'all' },
      { id: 'l7', weekday: 5, start: '10:10', end: '11:40', subject: 'Социология', teacher: 'А. С. Орлов', room: '520', kind: 'Семинар', parity: 'odd' },
    ],
    assignments: [
      { id: 'a1', subject: 'Социология', title: 'Подготовить вопрос к семинару', due: dateInDays(1), kind: 'Домашнее задание', done: false, details: 'Выбрать понятие из лекции и подготовить короткий пример.' },
      { id: 'a2', subject: 'Английский для учёбы', title: 'Прочитать текст и выписать новые слова', due: dateInDays(2), kind: 'Подготовка', done: false, details: 'Отметить ключевые выражения для обсуждения в паре.' },
      { id: 'a3', subject: 'Основы рекламы', title: 'Собрать три примера кампаний', due: dateInDays(4), kind: 'Домашнее задание', done: false, details: 'Выбрать разные форматы и кратко объяснить аудиторию.' },
      { id: 'a4', subject: 'Академическое письмо', title: 'Повторить структуру аргумента', due: dateInDays(5), kind: 'Чтение', done: true },
    ],
    posts: [
      { id: 'p1', author: 'Мария Сафина', initials: 'МС', role: 'староста', text: 'Всем привет! Обновила пример расписания на среду. Если заметите переносы или неточности, напишите сюда — всё можно поправить.', time: '12 мин назад', likes: 8, liked: false, pinned: true, topic: 'Объявление', comments: [{ id: 'c1', author: 'Даниил Чернов', initials: 'ДЧ', text: 'Спасибо, уже увидел!', time: '8 мин' }] },
      { id: 'p2', author: 'Алиса Белова', initials: 'АБ', text: 'Кто хочет вечером вместе повторить новые слова? Могу собрать небольшой созвон на 15 минут.', time: '1 ч назад', likes: 4, liked: true, comments: [], topic: 'Учёба' },
      { id: 'p3', author: 'Роман Волков', initials: 'РВ', text: 'Добавил в материалы короткий конспект по видам рекламных кампаний. Там есть примеры и таблица для повторения ✨', time: '3 ч назад', likes: 6, liked: false, comments: [], topic: 'Материалы' },
    ],
    materials: [
      { id: 'm1', title: 'Виды рекламных кампаний · конспект', subject: 'Основы рекламы', type: 'Конспект', author: 'Роман Волков', updated: 'сегодня' },
      { id: 'm2', title: 'Аргумент и тезис · памятка', subject: 'Академическое письмо', type: 'Документ', author: 'Мария Сафина', updated: 'вчера' },
      { id: 'm3', title: 'English vocabulary practice', subject: 'Английский для учёбы', type: 'Ссылка', author: 'Алиса Белова', updated: '10 окт', url: 'https://dictionary.cambridge.org/' },
      { id: 'm4', title: 'Вопросы к семинару', subject: 'Социология', type: 'Конспект', author: 'Даниил Чернов', updated: '9 окт' },
    ],
    events: [
      { id: 'e1', title: 'Кофе после пар', date: dateInDays(1), time: '15:00', place: 'кофейня у корпуса', people: 6, accent: 'orange' },
      { id: 'e2', title: 'Вместе готовимся к семинару', date: dateInDays(3), time: '17:30', place: 'библиотека, 2 этаж', people: 4, accent: 'violet' },
      { id: 'e3', title: 'Открытый микрофон факультета', date: dateInDays(7), time: '18:00', place: 'акт. зал', people: 12, accent: 'blue' },
    ],
  }
}

function isSnapshot(value: unknown): value is Snapshot {
  if (!value || typeof value !== 'object') return false
  const candidate = value as Partial<Snapshot>
  return candidate.version === 1 && Array.isArray(candidate.lessons) && Array.isArray(candidate.assignments) && Array.isArray(candidate.posts) && Array.isArray(candidate.materials) && Array.isArray(candidate.events)
}

export function loadSnapshot(storage?: Pick<Storage, 'getItem'>): Snapshot {
  if (!storage) return createDemoSnapshot()
  try {
    const saved = storage.getItem(STORAGE_KEY)
    if (saved) {
      const parsed: unknown = JSON.parse(saved)
      if (isSnapshot(parsed)) return parsed
    }
  } catch {
    // A damaged or unavailable browser store should never block the preview.
  }
  return createDemoSnapshot()
}

export function saveSnapshot(snapshot: Snapshot, storage?: Pick<Storage, 'setItem'>): boolean {
  if (!storage) return false
  try {
    storage.setItem(STORAGE_KEY, JSON.stringify(snapshot))
    return true
  } catch {
    return false
  }
}

export function lessonsForDay(lessons: Lesson[], weekday: number, parity: WeekParity): Lesson[] {
  return lessons
    .filter((lesson) => lesson.weekday === weekday && (lesson.parity === 'all' || lesson.parity === parity))
    .sort((a, b) => a.start.localeCompare(b.start))
}

export function toggleAssignment(assignments: Assignment[], id: string): Assignment[] {
  return assignments.map((assignment) => assignment.id === id ? { ...assignment, done: !assignment.done } : assignment)
}

export function toggleReaction(posts: Post[], id: string): Post[] {
  return posts.map((post) => post.id === id ? { ...post, liked: !post.liked, likes: post.likes + (post.liked ? -1 : 1) } : post)
}

export function searchSnapshot(snapshot: Snapshot, query: string): { lessons: Lesson[]; assignments: Assignment[]; posts: Post[]; materials: Material[] } {
  const normalized = query.trim().toLocaleLowerCase('ru')
  if (!normalized) return { lessons: snapshot.lessons, assignments: snapshot.assignments, posts: snapshot.posts, materials: snapshot.materials }
  const includes = (...values: string[]) => values.some((value) => value.toLocaleLowerCase('ru').includes(normalized))
  return {
    lessons: snapshot.lessons.filter((item) => includes(item.subject, item.teacher, item.room)),
    assignments: snapshot.assignments.filter((item) => includes(item.title, item.subject, item.kind)),
    posts: snapshot.posts.filter((item) => includes(item.text, item.author, item.topic ?? '')),
    materials: snapshot.materials.filter((item) => includes(item.title, item.subject, item.author)),
  }
}

export function toDateLabel(value: string, options: Intl.DateTimeFormatOptions = { weekday: 'short', day: 'numeric', month: 'short' }): string {
  return new Intl.DateTimeFormat('ru-RU', options).format(new Date(`${value}T12:00:00`))
}

export function createId(prefix: string): string {
  return `${prefix}-${globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(16).slice(2)}`}`
}
