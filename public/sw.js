// public/sw.js

// 🚀 1. BLINDAJE DE ACTUALIZACIÓN: Obligamos al teléfono a matar el SW viejo e instalar este de inmediato.
self.addEventListener('install', function (event) {
    self.skipWaiting();
});

self.addEventListener('activate', function (event) {
    event.waitUntil(clients.claim());
});

// 🚀 2. TU LÓGICA DE PUSH INTACTA (Con manejo de errores extra)
self.addEventListener('push', function (event) {
    if (!event.data) return;

    try {
        const data = event.data.json();
        
        // Configuración visual de la notificación
        const options = {
            body: data.body,
            icon: data.icon || '/favicon-light.png',
            badge: '/favicon-light.png', // El icono monocromático para Android
            vibrate: [200, 100, 200], // Patrón de vibración
            data: {
                dateOfArrival: Date.now(),
                url: data.url || '/admin' 
            }
        };

        event.waitUntil(self.registration.showNotification(data.title, options));
    } catch (error) {
        console.error('Error procesando el payload del push:', error);
    }
});

// 🚀 3. TU LÓGICA DE NAVEGACIÓN ÉLITE
self.addEventListener('notificationclick', function (event) {
    event.notification.close(); 
    
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