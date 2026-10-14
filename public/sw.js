// Minimal service worker so the app can be installed to the home screen.
// Data always comes live from Supabase (no offline caching).
self.addEventListener('install', () => self.skipWaiting())
self.addEventListener('activate', (e) => e.waitUntil(self.clients.claim()))
self.addEventListener('fetch', () => {})
