'use client'

import { useState, useEffect } from 'react'
import { Bell, Loader2, X, Smartphone } from 'lucide-react'
import Swal from 'sweetalert2'

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

interface PushNotificationManagerProps {
    storeId: string;
    mode?: 'banner' | 'settings';
}

const getPushTutorialHtml = (isIOS: boolean, isPWA: boolean) => {
    const ua = typeof window !== 'undefined' ? window.navigator.userAgent.toLowerCase() : '';
    const isSafari = ua.includes('safari') && !ua.includes('chrome');
    const isFirefox = ua.includes('firefox');

    if (isIOS) {
        return `
            <div class="text-left font-sans text-neutral-900 space-y-4 p-1">
                <p class="text-xs text-neutral-500 leading-relaxed mb-4">
                    En iPhone, debes autorizar alertas desde los Ajustes del Sistema:
                </p>
                <div class="space-y-4">
                    <div class="flex items-start gap-3">
                        <div class="w-5 h-5 rounded-full bg-neutral-950 text-white flex items-center justify-center text-[10px] font-black shrink-0 mt-0.5">1</div>
                        <div>
                          <h4 class="text-xs font-bold text-neutral-900">Abre la app "Ajustes"</h4>
                          <p class="text-[11px] text-neutral-400 mt-0.5">Configuración de tu iPhone.</p>
                        </div>
                    </div>
                    <div class="flex items-start gap-3">
                        <div class="w-5 h-5 rounded-full bg-neutral-950 text-white flex items-center justify-center text-[10px] font-black shrink-0 mt-0.5">2</div>
                        <div>
                          <h4 class="text-xs font-bold text-neutral-900">Ve a "Notificaciones"</h4>
                          <p class="text-[11px] text-neutral-400 mt-0.5">Busca la aplicación <strong class="text-neutral-950 font-bold">"Preziso"</strong>.</p>
                        </div>
                    </div>
                    <div class="flex items-start gap-3">
                        <div class="w-5 h-5 rounded-full bg-neutral-950 text-white flex items-center justify-center text-[10px] font-black shrink-0 mt-0.5">3</div>
                        <div>
                          <h4 class="text-xs font-bold text-neutral-900">Permitir Notificaciones</h4>
                          <p class="text-[11px] text-neutral-400 mt-0.5">Activa el interruptor.</p>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    if (isPWA) {
        return `
            <div class="text-left font-sans text-neutral-900 space-y-4 p-1">
                <p class="text-xs text-neutral-500 leading-relaxed mb-4">
                    En la app instalada gestiona tus alertas así:
                </p>
                <div class="space-y-4">
                    <div class="flex items-start gap-3">
                        <div class="w-5 h-5 rounded-full bg-neutral-950 text-white flex items-center justify-center text-[10px] font-black shrink-0 mt-0.5">1</div>
                        <div><h4 class="text-xs font-bold text-neutral-900">Haz clic en los tres puntos (...)</h4><p class="text-[11px] text-neutral-400 mt-0.5">Superior derecha de la ventana.</p></div>
                    </div>
                    <div class="flex items-start gap-3">
                        <div class="w-5 h-5 rounded-full bg-neutral-950 text-white flex items-center justify-center text-[10px] font-black shrink-0 mt-0.5">2</div>
                        <div><h4 class="text-xs font-bold text-neutral-900">Información de la App</h4><p class="text-[11px] text-neutral-400 mt-0.5">Abre Notificaciones.</p></div>
                    </div>
                    <div class="flex items-start gap-3">
                        <div class="w-5 h-5 rounded-full bg-neutral-950 text-white flex items-center justify-center text-[10px] font-black shrink-0 mt-0.5">3</div>
                        <div><h4 class="text-xs font-bold text-neutral-900">Permite y reinicia</h4><p class="text-[11px] text-neutral-400 mt-0.5">Cambia a "Permitir" y recarga.</p></div>
                    </div>
                </div>
            </div>
        `;
    }

    if (isSafari) {
        return `
            <div class="text-left font-sans text-neutral-900 space-y-4 p-1">
                <p class="text-xs text-neutral-500 leading-relaxed mb-4">Ajustes en Safari (macOS):</p>
                <div class="space-y-4">
                    <div class="flex items-start gap-3">
                        <div class="w-5 h-5 rounded-full bg-neutral-950 text-white flex items-center justify-center text-[10px] font-black shrink-0 mt-0.5">1</div>
                        <div><h4 class="text-xs font-bold text-neutral-900">Safari > Ajustes...</h4><p class="text-[11px] text-neutral-400 mt-0.5">En la barra superior.</p></div>
                    </div>
                    <div class="flex items-start gap-3">
                        <div class="w-5 h-5 rounded-full bg-neutral-950 text-white flex items-center justify-center text-[10px] font-black shrink-0 mt-0.5">2</div>
                        <div><h4 class="text-xs font-bold text-neutral-900">Pestaña "Sitios web" > Notificaciones</h4><p class="text-[11px] text-neutral-400 mt-0.5">En la barra lateral izquierda.</p></div>
                    </div>
                    <div class="flex items-start gap-3">
                        <div class="w-5 h-5 rounded-full bg-neutral-950 text-white flex items-center justify-center text-[10px] font-black shrink-0 mt-0.5">3</div>
                        <div><h4 class="text-xs font-bold text-neutral-900">Cambia a "Permitir"</h4><p class="text-[11px] text-neutral-400 mt-0.5">Y recarga la página.</p></div>
                    </div>
                </div>
            </div>
        `;
    }

    if (isFirefox) {
        return `
            <div class="text-left font-sans text-neutral-900 space-y-4 p-1">
                <p class="text-xs text-neutral-500 leading-relaxed mb-4">Ajustes en Firefox:</p>
                <div class="space-y-4">
                    <div class="flex items-start gap-3">
                        <div class="w-5 h-5 rounded-full bg-neutral-950 text-white flex items-center justify-center text-[10px] font-black shrink-0 mt-0.5">1</div>
                        <div><h4 class="text-xs font-bold text-neutral-900">Icono de permisos</h4><p class="text-[11px] text-neutral-400 mt-0.5">A la izquierda de la barra de direcciones.</p></div>
                    </div>
                    <div class="flex items-start gap-3">
                        <div class="w-5 h-5 rounded-full bg-neutral-950 text-white flex items-center justify-center text-[10px] font-black shrink-0 mt-0.5">2</div>
                        <div><h4 class="text-xs font-bold text-neutral-900">Remueve el bloqueo</h4><p class="text-[11px] text-neutral-400 mt-0.5">Presiona la 'X' en Bloqueado.</p></div>
                    </div>
                    <div class="flex items-start gap-3">
                        <div class="w-5 h-5 rounded-full bg-neutral-950 text-white flex items-center justify-center text-[10px] font-black shrink-0 mt-0.5">3</div>
                        <div><h4 class="text-xs font-bold text-neutral-900">Recarga e intenta de nuevo</h4><p class="text-[11px] text-neutral-400 mt-0.5">Refresca y pulsa Activar.</p></div>
                    </div>
                </div>
            </div>
        `;
    }

    return `
        <div class="text-left font-sans text-neutral-900 space-y-4 p-1">
            <p class="text-xs text-neutral-500 leading-relaxed mb-4">Sigue estos pasos rápidos:</p>
            <div class="space-y-4">
                <div class="flex items-start gap-3">
                    <div class="w-5 h-5 rounded-full bg-neutral-950 text-white flex items-center justify-center text-[10px] font-black shrink-0 mt-0.5">1</div>
                    <div><h4 class="text-xs font-bold text-neutral-900">Icono de candado / ajustes</h4><p class="text-[11px] text-neutral-400 mt-0.5">A la izquierda de la URL de Preziso.</p></div>
                </div>
                <div class="flex items-start gap-3">
                    <div class="w-5 h-5 rounded-full bg-neutral-950 text-white flex items-center justify-center text-[10px] font-black shrink-0 mt-0.5">2</div>
                    <div><h4 class="text-xs font-bold text-neutral-900">Activa "Notificaciones"</h4><p class="text-[11px] text-neutral-400 mt-0.5">Cambia a "Permitir".</p></div>
                </div>
                <div class="flex items-start gap-3">
                    <div class="w-5 h-5 rounded-full bg-neutral-950 text-white flex items-center justify-center text-[10px] font-black shrink-0 mt-0.5">3</div>
                    <div><h4 class="text-xs font-bold text-neutral-900">Recarga la página</h4><p class="text-[11px] text-neutral-400 mt-0.5">Para sincronizar tu sesión.</p></div>
                </div>
            </div>
        </div>
    `;
};

export default function PushNotificationManager({ storeId, mode = 'banner' }: PushNotificationManagerProps) {
    const [isSupported, setIsSupported] = useState(false);
    const [subscription, setSubscription] = useState<PushSubscription | null>(null);
    const [loading, setLoading] = useState(false);
    const [isDismissed, setIsDismissed] = useState(false);
    const [isIOS, setIsIOS] = useState(false);
    const [isPWA, setIsPWA] = useState(false);

    useEffect(() => {
        if (typeof window !== 'undefined') {
            const userAgent = window.navigator.userAgent.toLowerCase();
            const ios = /iphone|ipad|ipod/.test(userAgent);
            setIsIOS(ios);

            const pwa = window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone === true;
            setIsPWA(pwa);

            if ('serviceWorker' in navigator && 'PushManager' in window) {
                setIsSupported(true);
                registerServiceWorker();
            }

            if (mode === 'settings') {
                setIsDismissed(false);
                return;
            }

            const dismissedTime = localStorage.getItem('preziso_push_v1');
            if (dismissedTime) {
                const diffTime = Date.now() - parseInt(dismissedTime, 10);
                const thirtyDays = 30 * 24 * 60 * 60 * 1000;
                if (diffTime < thirtyDays) {
                    setIsDismissed(true);
                    return;
                }
            }
            setIsDismissed(false);
        }
    }, [mode]);

    const registerServiceWorker = async () => {
        try {
            const registration = await navigator.serviceWorker.register('/sw.js', { scope: '/' });
            const sub = await registration.pushManager.getSubscription();
            setSubscription(sub);
        } catch (error) {
            console.error('Error registrando Service Worker:', error);
        }
    }

    const subscribeToPush = async () => {
        setLoading(true);
        try {
            const registration = await navigator.serviceWorker.ready;
            const publicVapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
            
            if (!publicVapidKey) throw new Error("Configuración incompleta.");

            const sub = await registration.pushManager.subscribe({
                userVisibleOnly: true,
                applicationServerKey: urlBase64ToUint8Array(publicVapidKey)
            });

            const response = await fetch('/api/web-push/subscribe', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ subscription: sub, storeId })
            });

            if (!response.ok) throw new Error('Falló el guardado');

            setSubscription(sub);
            
            Swal.fire({
                title: 'Alertas habilitadas',
                text: 'Recibirás avisos de ventas en tiempo real.',
                icon: 'success',
                confirmButtonColor: '#0a0a0a',
                customClass: { popup: 'rounded-xl font-sans text-xs' }
            });
        } catch (error: any) {
            console.error(error);
            if (Notification.permission === 'denied' || error.name === 'NotAllowedError') {
                Swal.fire({
                    title: 'Activar Alertas 🔔',
                    html: getPushTutorialHtml(isIOS, isPWA),
                    confirmButtonColor: '#0a0a0a',
                    confirmButtonText: 'Entendido',
                    customClass: {
                        popup: 'rounded-xl font-sans p-6 shadow-md border border-neutral-200/60',
                        confirmButton: 'rounded-lg text-xs font-semibold px-4 py-2 bg-neutral-950 text-white w-full mt-2'
                    }
                });
            }
        } finally {
            setLoading(false);
        }
    }

    const handleDismiss = () => {
        localStorage.setItem('preziso_push_v1', Date.now().toString());
        setIsDismissed(true);
    }

    if (!isSupported) return null;
    if (mode === 'banner' && (subscription || isDismissed)) return null;

return (
        /* 🚀 CONTENCIÓN TOTAL: max-w-full con ancho estrictamente respetado */
        <div className="w-full max-w-full bg-white px-3 py-2 sm:px-4 sm:py-2.5 rounded-xl border border-neutral-200/60 shadow-[0_2px_8px_rgba(0,0,0,0.02)] flex items-center justify-between gap-2 text-neutral-900 overflow-hidden">
            
            {/* LADO IZQUIERDO: truncate forzado a nivel CSS */}
            <div className="flex items-center gap-2 min-w-0 flex-1 overflow-hidden">
                <div className="w-6 h-6 rounded-md bg-[#F6F6F6] text-neutral-900 flex items-center justify-center shrink-0 border border-neutral-100">
                    <Bell size={12} strokeWidth={2.2} />
                </div>
                
                <div className="min-w-0 flex-1 overflow-hidden">
                    <div className="flex items-center gap-1.5 min-w-0">
                        <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-neutral-900 shrink-0">
                            Alertas
                        </span>
                        
                        <span className="w-1 h-1 rounded-full bg-neutral-300 shrink-0" />
                        
                        <p className="text-[11px] sm:text-xs text-neutral-500 font-normal truncate max-w-[150px] xs:max-w-[210px] sm:max-w-none">
                            {isIOS && !isPWA 
                                ? 'Añade a inicio para alertas en iPhone.' 
                                : 'Avisos en tiempo real en tu pantalla.'}
                        </p>
                    </div>
                </div>
            </div>
            
            {/* LADO DERECHO: Botones con shrink-0 estricto */}
            <div className="flex items-center gap-1.5 shrink-0">
                {(!isIOS || isPWA) ? (
                    <button 
                        onClick={subscribeToPush}
                        disabled={loading}
                        className="h-7 px-2.5 sm:px-3 bg-[#0C0D0E] hover:bg-black text-white text-[10px] font-mono font-bold uppercase tracking-wider rounded-md transition-all active:scale-[0.98] flex items-center gap-1 cursor-pointer disabled:opacity-50 shrink-0"
                    >
                        {loading ? <Loader2 size={11} className="animate-spin" /> : 'Activar'}
                    </button>
                ) : (
                    <div className="flex items-center gap-1 text-neutral-500 font-mono text-[9px] uppercase tracking-wider bg-neutral-50 px-2 py-1 rounded border border-neutral-100 shrink-0">
                        <Smartphone size={10} />
                        <span className="hidden xs:inline">PWA</span>
                    </div>
                )}

                {mode === 'banner' && (
                    <button 
                        onClick={handleDismiss}
                        className="p-1 text-neutral-400 hover:text-neutral-900 transition-colors rounded hover:bg-neutral-100 cursor-pointer shrink-0"
                        title="Descartar"
                    >
                        <X size={13} />
                    </button>
                )}
            </div>
        </div>
    )
}