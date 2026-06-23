// sw.js - Service Worker unificado (Caché + Notificaciones Push de Firebase)

const CACHE_NAME = 'v1_cache_red_social';
const urlsToCache = [
  '/',
  '/index.html',
  '/manifest.json',
  '/style.css'
];

// 1. Instalar el Service Worker e importar Firebase dentro del hilo
self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(urlsToCache))
      .then(() => self.skipWaiting())
  );
});

// 2. Activar y limpiar cachés viejos
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cache => {
          if (cache !== CACHE_NAME) return caches.delete(cache);
        })
      );
    })
  );
});

// 3. Estrategia de Fetch
self.addEventListener('fetch', e => {
  e.respondWith(
    fetch(e.request).catch(() => caches.match(e.request))
  );
});

// ==========================================
// INTEGRACIÓN DE FIREBASE MESSAGING
// ==========================================
importScripts('https://www.gstatic.com/firebasejs/9.1.3/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.1.3/firebase-messaging-compat.js');

const firebaseConfig = {
    apiKey: "AIzaSyBrUmok_QkwEdO2cmMRryu2GmvvSO5DZ1U",
    authDomain: "kofikoi.firebaseapp.com",
    databaseURL: "https://kofikoi-default-rtdb.firebaseio.com/",
    projectId: "kofikoi",
    storageBucket: "kofikoi.firebasestorage.app",
    messagingSenderId: "27280210890",
    appId: "1:27280210890:web:354c9bf51bfcb6b438ad33"
};

firebase.initializeApp(firebaseConfig);
const messaging = firebase.messaging();

// Capturar el mensaje cuando la pestaña está cerrada o en segundo plano
messaging.onBackgroundMessage((payload) => {
    console.log("Notificación en segundo plano recibida:", payload);
    
    // Control flexible por si los datos vienen estructurados bajo 'notification' o 'data'
    const title = payload.notification?.title || payload.data?.title || "Nuevo mensaje zen 🌸";
    const body = payload.notification?.body || payload.data?.mensaje || "¡Tienes novedades en KofyKoi!";
    
    const options = {
        body: body,
        icon: 'favicon.png', 
        badge: 'favicon.png',
        vibrate: [100, 50, 100],
        data: {
            url: '/chats.html' // URL de destino al pulsar la notificación
        }
    };
    
    return self.registration.showNotification(title, options);
});

// Interceptar el clic en la notificación del sistema para abrir o enfocar la app
self.addEventListener('notificationclick', (event) => {
    event.notification.close();
    
    event.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
            // Si la aplicación ya está abierta, poner el foco sobre ella
            for (let client of windowClients) {
                if (client.url.includes('/chats.html') && 'focus' in client) {
                    return client.focus();
                }
            }
            // Si no estaba abierta, abrir una nueva ventana con la vista de chats
            if (clients.openWindow) {
                return clients.openWindow(event.notification.data?.url || '/');
            }
        })
    );
});

