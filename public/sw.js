// public/sw.js

self.addEventListener('push', function (event) {
    if (event.data) {
        const data = event.data.json();
        
        // Configuración visual de la notificación en la pantalla de bloqueo
        const options = {
            body: data.body,
            icon: data.icon || '/favicon-light.png',
            badge: '/favicon-light.png', // El icono pequeñito en la barra de estado de Android
            vibrate: [200, 100, 200], // Patrón de vibración (B2B Feel)
            data: {
                dateOfArrival: Date.now(),
                url: data.url || '/admin' // A dónde ir al hacer clic
            }
        };

        event.waitUntil(self.registration.showNotification(data.title, options));
    }
});

self.addEventListener('notificationclick', function (event) {
    event.notification.close(); // Cerramos la notificación visual
    
    // Le decimos al sistema operativo que abra la PWA en la URL específica
    event.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function (clientList) {
            // Si la app ya está abierta en segundo plano, la enfocamos
            for (let i = 0; i < clientList.length; i++) {
                let client = clientList[i];
                if (client.url.includes(event.notification.data.url) && 'focus' in client) {
                    return client.focus();
                }
            }
            // Si estaba cerrada, abrimos una nueva ventana
            if (clients.openWindow) {
                return clients.openWindow(event.notification.data.url);
            }
        })
    );
});