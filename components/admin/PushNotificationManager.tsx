'use client'

import { useState, useEffect } from 'react'
import { Bell, BellRing, Loader2, CheckCircle2, AlertCircle } from 'lucide-react'
import Swal from 'sweetalert2'

// Función utilitaria para decodificar la llave VAPID pública
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
            
            if (!publicVapidKey) throw new Error("Llave VAPID pública no encontrada en el archivo de entorno");

            const sub = await registration.pushManager.subscribe({
                userVisibleOnly: true,
                applicationServerKey: urlBase64ToUint8Array(publicVapidKey)
            });

            const response = await fetch('/api/web-push/subscribe', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ subscription: sub, storeId })
            });

            if (!response.ok) throw new Error('Falló el guardado en el servidor');

            setSubscription(sub);
            
            Swal.fire({
                title: 'Alertas habilitadas',
                text: 'Recibirás avisos de venta en tiempo real en este dispositivo.',
                icon: 'success',
                confirmButtonColor: '#171717',
                customClass: { popup: 'rounded-xl font-sans text-xs' }
            });

        } catch (error: any) {
            console.error(error);
            if (Notification.permission === 'denied') {
                Swal.fire({
                    title: 'Permiso restringido',
                    text: 'Debes conceder permisos de notificación en los ajustes de tu explorador.',
                    icon: 'warning',
                    confirmButtonColor: '#171717',
                    customClass: { popup: 'rounded-xl font-sans text-xs' }
                });
            } else {
                Swal.fire({
                    title: 'Error de activación',
                    text: 'No se pudo dar de alta este dispositivo en el servicio de alertas.',
                    icon: 'error',
                    confirmButtonColor: '#171717',
                    customClass: { popup: 'rounded-xl font-sans text-xs' }
                });
            }
        } finally {
            setLoading(false);
        }
    }

    if (!isSupported) return null;

    return (
        <div className="bg-white p-5 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 border border-neutral-200/50 hover:border-neutral-300/60 transition-colors shadow-[0_1px_2px_rgba(0,0,0,0.01)]">
            <div className="flex items-center gap-3.5">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center border transition-colors ${subscription ? 'bg-emerald-50 border-emerald-100/40 text-emerald-700' : 'bg-neutral-50 border-neutral-200/50 text-neutral-400'}`}>
                    {subscription ? <BellRing size={16} /> : <Bell size={16} />}
                </div>
                <div className="space-y-0.5">
                    <p className="font-bold text-xs text-neutral-900 tracking-tight flex items-center gap-1.5">
                        Alertas en Tiempo Real
                        {subscription && (
                            <span className="inline-flex items-center gap-0.5 bg-emerald-50 text-emerald-700 text-[9px] font-semibold px-1.5 py-0.5 rounded border border-emerald-100/30">
                                <CheckCircle2 size={9} /> Vinculado
                            </span>
                        )}
                    </p>
                    <p className="text-xs text-neutral-400">
                        {subscription ? 'Este navegador web está registrado para alertas instantáneas.' : 'Reciba una notificación al instante en su pantalla con cada venta procesada.'}
                    </p>
                </div>
            </div>
            
            {!subscription && (
                <button 
                    onClick={subscribeToPush}
                    disabled={loading}
                    className="shrink-0 px-4 py-2 bg-neutral-950 hover:bg-black text-white text-xs font-semibold rounded-lg transition-all active:scale-[0.98] shadow-xs flex items-center justify-center gap-1.5"
                >
                    {loading ? <Loader2 size={13} className="animate-spin" /> : 'Activar Alertas'}
                </button>
            )}
        </div>
    )
}