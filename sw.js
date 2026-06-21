const CACHE_NAME = 'v1_cache_red_social';
const urlsToCache = [
  '/',
  '/index.html',
  '/manifest.json',
  '/style.css',
  // Agregá acá tus archivos CSS o imágenes principales si querés que carguen al toque
];

// Instalar el Service Worker
self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        return cache.addAll(urlsToCache);
      })
      .then(() => self.skipWaiting())
  );
});

// Activar
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cache => {
          if (cache !== CACHE_NAME) {
            return caches.delete(cache);
          }
        })
      );
    })
  );
});

// Responder cuando no hay internet o cargar desde cache
self.addEventListener('fetch', e => {
  e.respondWith(
    fetch(e.request).catch(() => caches.match(e.request))
  );
});


// sw.js - Este archivo maneja la notificación en segundo plano
self.addEventListener('push', function(event) {
    const data = event.data ? event.data.json() : { title: 'KofyKoi', body: '¡Nuevo mensaje!' };
    
    const options = {
        body: data.body,
        icon: 'https://i.pravatar.cc/150?u=kofy', // Aquí puedes poner el logo de tu app
        badge: 'https://i.pravatar.cc/150?u=kofy', // Icono pequeño de la barra
        vibrate: [100, 50, 100]
    };

    event.waitUntil(
        self.registration.showNotification(data.title, options)
    );
});
