'use client'

import { useState, useEffect } from 'react'
import { Bell, BellRing, Loader2 } from 'lucide-react'
import Swal from 'sweetalert2'

// Función utilitaria obligatoria para decodificar la llave VAPID pública
const urlBase64ToUint8Array = (base64String: string) => {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding).replace(/\-/g, '+').replace(/_/g, '/');
    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);
    for (let i = 0; i < rawData.length; ++i) {
        outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
}

export default function PushNotificationManager({ storeId }: { storeId: string }) {
    const [isSupported, setIsSupported] = useState(false);
    const [subscription, setSubscription] = useState<PushSubscription | null>(null);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        // Verificamos si el navegador soporta Service Workers y Push API
        if ('serviceWorker' in navigator && 'PushManager' in window) {
            setIsSupported(true);
            registerServiceWorker();
        }
    }, []);

    const registerServiceWorker = async () => {
        try {
            const registration = await navigator.serviceWorker.register('/sw.js', { scope: '/' });
            const sub = await registration.pushManager.getSubscription();
            setSubscription(sub);
        } catch (error) {
            console.error('Error registrando el Service Worker:', error);
        }
    }

   const subscribeToPush = async () => {
        setLoading(true);
        try {
            const registration = await navigator.serviceWorker.ready;
            const publicVapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
            
            if (!publicVapidKey) throw new Error("Llave VAPID pública no encontrada en el .env.local");

            // 1. Le pedimos permiso al OS y generamos el token
            const sub = await registration.pushManager.subscribe({
                userVisibleOnly: true,
                applicationServerKey: urlBase64ToUint8Array(publicVapidKey)
            });

            // 2. 🚀 Enviamos la suscripción a nuestra base de datos
            const response = await fetch('/api/web-push/subscribe', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ subscription: sub, storeId })
            });

            if (!response.ok) throw new Error('Falló el guardado en la base de datos');

            setSubscription(sub);
            
            Swal.fire({
                title: '¡Notificaciones Activas!',
                text: 'Recibirás alertas de nuevas ventas en este dispositivo.',
                icon: 'success',
                confirmButtonColor: '#000'
            });

        } catch (error: any) {
            console.error(error);
            if (Notification.permission === 'denied') {
                Swal.fire('Permiso Denegado', 'Debes permitir las notificaciones en tu navegador.', 'warning');
            } else {
                Swal.fire('Error', 'No se pudo activar las notificaciones.', 'error');
            }
        } finally {
            setLoading(false);
        }
    }
    if (!isSupported) return null;

    return (
        <div className="bg-[#f6f6f6] p-4 rounded-[var(--radius-card)] flex items-center justify-between border border-transparent hover:border-gray-200 transition-colors">
            <div className="flex items-center gap-3">
                <div className={`p-2 rounded-full ${subscription ? 'bg-emerald-100 text-emerald-600' : 'bg-gray-200 text-gray-500'}`}>
                    {subscription ? <BellRing size={18} /> : <Bell size={18} />}
                </div>
                <div>
                    <p className="font-bold text-sm text-gray-900">Alertas en Tiempo Real</p>
                    <p className="text-xs text-gray-500 mt-0.5">
                        {subscription ? 'Este dispositivo está recibiendo alertas.' : 'Recibe una notificación al instante con cada venta.'}
                    </p>
                </div>
            </div>
            
            {!subscription && (
                <button 
                    onClick={subscribeToPush}
                    disabled={loading}
                    className="px-4 py-2 bg-black text-white text-xs font-bold rounded-md hover:bg-gray-800 active:scale-95 transition-all shadow-subtle flex items-center gap-2"
                >
                    {loading ? <Loader2 size={14} className="animate-spin" /> : 'Activar Alertas'}
                </button>
            )}
        </div>
    )
}