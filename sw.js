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
