const CACHE = 'mezhpar-shell-v1'
const BASE = new URL(self.registration.scope).pathname
const CORE = [BASE, `${BASE}manifest.webmanifest`, `${BASE}icon.svg`]

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(CORE)).then(() => self.skipWaiting()))
})

self.addEventListener('activate', (event) => {
  event.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((key) => key.startsWith('mezhpar-') && key !== CACHE).map((key) => caches.delete(key)))).then(() => self.clients.claim()))
})

self.addEventListener('fetch', (event) => {
  const request = event.request
  const url = new URL(request.url)
  if (request.method !== 'GET' || url.origin !== self.location.origin || !url.pathname.startsWith(BASE)) return

  if (request.mode === 'navigate') {
    event.respondWith((async () => {
      try {
        const response = await fetch(request)
        if (response.ok) await (await caches.open(CACHE)).put(BASE, response.clone())
        return response
      } catch {
        return (await caches.match(BASE)) || Response.error()
      }
    })())
    return
  }

  if (url.pathname.startsWith(`${BASE}assets/`) || CORE.includes(url.pathname)) {
    event.respondWith((async () => {
      const cached = await caches.match(request)
      if (cached) return cached
      const response = await fetch(request)
      if (response.ok) await (await caches.open(CACHE)).put(request, response.clone())
      return response
    })())
  }
})
