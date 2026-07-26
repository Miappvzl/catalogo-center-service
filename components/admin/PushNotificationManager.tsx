'use client'

import { useState, useEffect } from 'react'
import { Bell, BellRing, Loader2, CheckCircle2, X, Smartphone, AlertCircle } from 'lucide-react'
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

// 🚀 GENERADOR DINÁMICO DE TUTORIALES DE NOTIFICACIÓN SEGÚN ENTORNO Y NAVEGADOR (V1 Producción)
const getPushTutorialHtml = (isIOS: boolean, isPWA: boolean) => {
    const ua = typeof window !== 'undefined' ? window.navigator.userAgent.toLowerCase() : '';
    const isSafari = ua.includes('safari') && !ua.includes('chrome');
    const isFirefox = ua.includes('firefox');

    // CASO 1: iPhone / iPad (iOS requiere desbloquear desde los Ajustes del Sistema de Apple)
    if (isIOS) {
        return `
            <div class="text-left font-sans text-neutral-900 space-y-4 p-1">
                <p class="text-xs text-neutral-500 leading-relaxed mb-4">
                    En iPhone, una vez bloqueadas las alertas, debes activarlas desde los ajustes del sistema de Apple:
                </p>
                <div class="space-y-4">
                    <div class="flex items-start gap-3">
                        <div class="w-5 h-5 rounded-full bg-neutral-950 text-white flex items-center justify-center text-[10px] font-black shrink-0 mt-0.5">1</div>
                        <div>
                          <h4 class="text-xs font-bold text-neutral-900">Abre la app "Ajustes" de tu iPhone</h4>
                          <p class="text-[11px] text-neutral-400 mt-0.5">La aplicación gris de configuración del sistema de tu dispositivo Apple.</p>
                        </div>
                    </div>
                    <div class="flex items-start gap-3">
                        <div class="w-5 h-5 rounded-full bg-neutral-950 text-white flex items-center justify-center text-[10px] font-black shrink-0 mt-0.5">2</div>
                        <div>
                          <h4 class="text-xs font-bold text-neutral-900">Ve a "Notificaciones"</h4>
                          <p class="text-[11px] text-neutral-400 mt-0.5">Busca la aplicación <strong class="text-neutral-950 font-bold">"Preziso"</strong> en la lista.</p>
                        </div>
                    </div>
                    <div class="flex items-start gap-3">
                        <div class="w-5 h-5 rounded-full bg-neutral-950 text-white flex items-center justify-center text-[10px] font-black shrink-0 mt-0.5">3</div>
                        <div>
                          <h4 class="text-xs font-bold text-neutral-900">Permitir Notificaciones</h4>
                          <p class="text-[11px] text-neutral-400 mt-0.5">Activa el interruptor para autorizar al dispositivo a recibir las alertas de venta.</p>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    // CASO 2: Aplicación Instalada (PWA) en Escritorio (Chrome / Edge / Brave)
    if (isPWA) {
        return `
            <div class="text-left font-sans text-neutral-900 space-y-4 p-1">
                <p class="text-xs text-neutral-500 leading-relaxed mb-4">
                    Al usar la aplicación instalada, la barra de direcciones está oculta. Gestiona tus alertas así:
                </p>
                <div class="space-y-4">
                    <div class="flex items-start gap-3">
                        <div class="w-5 h-5 rounded-full bg-neutral-950 text-white flex items-center justify-center text-[10px] font-black shrink-0 mt-0.5">1</div>
                        <div>
                          <h4 class="text-xs font-bold text-neutral-900">Haz clic en los tres puntos (...)</h4>
                          <p class="text-[11px] text-neutral-400 mt-0.5">Ubicados en la esquina superior derecha de la ventana de la aplicación.</p>
                        </div>
                    </div>
                    <div class="flex items-start gap-3">
                        <div class="w-5 h-5 rounded-full bg-neutral-950 text-white flex items-center justify-center text-[10px] font-black shrink-0 mt-0.5">2</div>
                        <div>
                          <h4 class="text-xs font-bold text-neutral-900">Ve a "Información de la App"</h4>
                          <p class="text-[11px] text-neutral-400 mt-0.5">Selecciona "Configuración" o "Ajustes de la app" y busca <strong class="text-neutral-950 font-bold">Notificaciones</strong>.</p>
                        </div>
                    </div>
                    <div class="flex items-start gap-3">
                        <div class="w-5 h-5 rounded-full bg-neutral-950 text-white flex items-center justify-center text-[10px] font-black shrink-0 mt-0.5">3</div>
                        <div>
                          <h4 class="text-xs font-bold text-neutral-900">Permite y reinicia</h4>
                          <p class="text-[11px] text-neutral-400 mt-0.5">Cambia el interruptor a "Permitir" y cierra la app para aplicar la sincronización al volver a abrirla.</p>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    // CASO 3: Safari de Escritorio (macOS)
    if (isSafari) {
        return `
            <div class="text-left font-sans text-neutral-900 space-y-4 p-1">
                <p class="text-xs text-neutral-500 leading-relaxed mb-4">
                    En Safari para Mac, las notificaciones se gestionan desde el menú de la aplicación superior:
                </p>
                <div class="space-y-4">
                    <div class="flex items-start gap-3">
                        <div class="w-5 h-5 rounded-full bg-neutral-950 text-white flex items-center justify-center text-[10px] font-black shrink-0 mt-0.5">1</div>
                        <div>
                          <h4 class="text-xs font-bold text-neutral-900">Haz clic en "Safari" en la barra de menú superior</h4>
                          <p class="text-[11px] text-neutral-400 mt-0.5">Selecciona la opción "Ajustes..." (o Preferencias).</p>
                        </div>
                    </div>
                    <div class="flex items-start gap-3">
                        <div class="w-5 h-5 rounded-full bg-neutral-950 text-white flex items-center justify-center text-[10px] font-black shrink-0 mt-0.5">2</div>
                        <div>
                          <h4 class="text-xs font-bold text-neutral-900">Ve a la pestaña "Sitios web"</h4>
                          <p class="text-[11px] text-neutral-400 mt-0.5">Selecciona "Notificaciones" en la lista de la izquierda.</p>
                        </div>
                    </div>
                    <div class="flex items-start gap-3">
                        <div class="w-5 h-5 rounded-full bg-neutral-950 text-white flex items-center justify-center text-[10px] font-black shrink-0 mt-0.5">3</div>
                        <div>
                          <h4 class="text-xs font-bold text-neutral-900">Busca tu tienda y cámbiala a "Permitir"</h4>
                          <p class="text-[11px] text-neutral-400 mt-0.5">Recarga la página para que la consola se sincronice.</p>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    // CASO 4: Firefox de Escritorio
    if (isFirefox) {
        return `
            <div class="text-left font-sans text-neutral-900 space-y-4 p-1">
                <p class="text-xs text-neutral-500 leading-relaxed mb-4">
                    En Firefox, los permisos se gestionan desde la barra de direcciones:
                </p>
                <div class="space-y-4">
                    <div class="flex items-start gap-3">
                        <div class="w-5 h-5 rounded-full bg-neutral-950 text-white flex items-center justify-center text-[10px] font-black shrink-0 mt-0.5">1</div>
                        <div>
                          <h4 class="text-xs font-bold text-neutral-900">Haz clic en el icono de permisos</h4>
                          <p class="text-[11px] text-neutral-400 mt-0.5">Ubicado justo a la izquierda de la barra de direcciones de Firefox.</p>
                        </div>
                    </div>
                    <div class="flex items-start gap-3">
                        <div class="w-5 h-5 rounded-full bg-neutral-950 text-white flex items-center justify-center text-[10px] font-black shrink-0 mt-0.5">2</div>
                        <div>
                          <h4 class="text-xs font-bold text-neutral-900">Remueve el bloqueo de Notificaciones</h4>
                          <p class="text-[11px] text-neutral-400 mt-0.5">Haz clic en la 'X' junto a "Bloqueado temporalmente" o "Bloqueado".</p>
                        </div>
                    </div>
                    <div class="flex items-start gap-3">
                        <div class="w-5 h-5 rounded-full bg-neutral-950 text-white flex items-center justify-center text-[10px] font-black shrink-0 mt-0.5">3</div>
                        <div>
                          <h4 class="text-xs font-bold text-neutral-900">Recarga e intenta de nuevo</h4>
                          <p class="text-[11px] text-neutral-400 mt-0.5 font-medium">Recarga la página y vuelve a pulsar el botón "Habilitar Notificaciones".</p>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    // FALLBACK: Navegador Estándar de Escritorio (Chrome, Brave, Edge, Opera)
    return `
        <div class="text-left font-sans text-neutral-900 space-y-4 p-1">
            <p class="text-xs text-neutral-500 leading-relaxed mb-4">
                Tu navegador ha bloqueado las alertas. Sigue estos 3 pasos rápidos para activarlas:
            </p>
            <div class="space-y-4">
                <div class="flex items-start gap-3">
                    <div class="w-5 h-5 rounded-full bg-neutral-950 text-white flex items-center justify-center text-[10px] font-black shrink-0 mt-0.5">1</div>
                    <div>
                      <h4 class="text-xs font-bold text-neutral-900">Haz clic en el icono del Candado / Ajustes</h4>
                      <p class="text-[11px] text-neutral-400 mt-0.5">Ubicado en la barra de direcciones, justo a la izquierda de la URL de Preziso.</p>
                    </div>
                </div>
                <div class="flex items-start gap-3">
                    <div class="w-5 h-5 rounded-full bg-neutral-950 text-white flex items-center justify-center text-[10px] font-black shrink-0 mt-0.5">2</div>
                    <div>
                      <h4 class="text-xs font-bold text-neutral-900">Busca "Notificaciones"</h4>
                      <p class="text-[11px] text-neutral-400 mt-0.5">Cambia el interruptor de "Bloquear" a <strong class="text-neutral-950 font-bold">"Permitir"</strong>.</p>
                    </div>
                </div>
                <div class="flex items-start gap-3">
                    <div class="w-5 h-5 rounded-full bg-neutral-950 text-white flex items-center justify-center text-[10px] font-black shrink-0 mt-0.5">3</div>
                    <div>
                      <h4 class="text-xs font-bold text-neutral-900">Recarga la página</h4>
                      <p class="text-[11px] text-neutral-400 mt-0.5">Refresca la pestaña para sincronizar tu consola administrativa.</p>
                    </div>
                </div>
            </div>
        </div>
    `;
};


export default function PushNotificationManager({ storeId, mode = 'banner' }: PushNotificationManagerProps) {
    const [isSupported, setIsSupported] = useState(false);
    const [subscription, setSubscription] = useState<PushSubscription | null>(null);
    const [loading, setLoading] = useState(false);
    
    // 🚀 CAMBIA ESTA LÍNEA DE TRUE A FALSE:
    const [isDismissed, setIsDismissed] = useState(false); // 👈 Ahora inicia en false
    
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

            // 🚀 CAMBIO DE CLAVE: Forzamos un reset del descarte local usando 'preziso_push_v1'
            const dismissedTime = localStorage.getItem('preziso_push_v1');
            
            // 🔍 CONSOLE LOG DE DIAGNÓSTICO: Abre tu consola F12 en el Inicio y mira qué imprime
            console.log('Preziso Push Debug:', {
                isSupported: 'serviceWorker' in navigator && 'PushManager' in window,
                subscription: !!subscription,
                isDismissed: dismissedTime ? true : false,
                mode,
                dismissedTime
            });

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
    }, [mode]); // 👈 CORRECCIÓN: Deja únicamente 'mode'. Remueve 'subscription'.

    const registerServiceWorker = async () => {
        try {
            const registration = await navigator.serviceWorker.register('/sw.js', { scope: '/' });
            const sub = await registration.pushManager.getSubscription();
            setSubscription(sub);
        } catch (error) {
            console.error('Error registrando el Service Worker:', error);
        }
    }

   // Busca tu función 'subscribeToPush' y actualiza la sección del 'catch' con este tutorial enriquecido:
    const subscribeToPush = async () => {
        setLoading(true);
        try {
            const registration = await navigator.serviceWorker.ready;
            const publicVapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
            
            if (!publicVapidKey) {
                console.warn("Falta la variable de entorno NEXT_PUBLIC_VAPID_PUBLIC_KEY");
                throw new Error("Configuración del servidor incompleta.");
            }

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

       // ... (Conserva tu lógica de try igual) ...
        } catch (error: any) {
            console.error(error);
            
            if (Notification.permission === 'denied' || error.name === 'NotAllowedError') {
                Swal.fire({
                    title: 'Cómo Activar las Alertas 🔔',
                    html: getPushTutorialHtml(isIOS, isPWA), // 🚀 LLAMADA AL MOTOR INTELIGENTE
                    confirmButtonColor: '#171717',
                    confirmButtonText: 'Entendido',
                    customClass: {
                        popup: 'rounded-xl font-sans p-6 shadow-[0_4px_20px_rgba(0,0,0,0.03)] border border-neutral-200/50',
                        confirmButton: 'rounded-lg text-xs font-semibold px-4 py-2.5 bg-neutral-950 hover:bg-black text-white transition-all w-full mt-2'
                    }
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
 const handleDismiss = () => {
        // 🚀 CAMBIO DE CLAVE: Debe coincidir con la del useEffect
        localStorage.setItem('preziso_push_v1', Date.now().toString());
        setIsDismissed(true);
    }

    // 2. CORRECCIÓN DE LA GUARDIA: 
    // Si no es soportado, retorna null. 
    // Si ya está suscrito o descartado, SOLO retorna null si estamos en modo "banner".
    if (!isSupported) return null;
    if (mode === 'banner' && (subscription || isDismissed)) return null;

    return (
        <div className="relative bg-white p-6 rounded-[var(--radius-card)] flex flex-col md:flex-row md:items-center justify-between gap-5 border border-neutral-100 shadow-[0_1px_3px_rgba(0,0,0,0.01)] transition-all animate-in fade-in duration-500 overflow-hidden">
            
            {/* 3. SOLO mostramos la 'X' si estamos en modo banner */}
            {mode === 'banner' && (
                <button 
                    onClick={handleDismiss}
                    className="absolute top-4 right-4 text-neutral-400 hover:text-neutral-900 transition-colors p-1 bg-neutral-50 rounded-full border border-neutral-150"
                >
                    <X size={13} />
                </button>
            )}


            <div className="flex items-start md:items-center gap-4 max-w-2xl">
                <div className="w-11 h-11 rounded-[var(--radius-btn)] bg-neutral-50 border border-neutral-150 text-neutral-900 flex items-center justify-center shrink-0">
                    <Bell size={18} strokeWidth={2.2} className="animate-bounce" />
                </div>
                <div>
                    <h3 className="text-xs font-black text-neutral-900 uppercase tracking-widest leading-none mb-1.5 flex items-center gap-1.5">
                        Alertas en Tiempo Real
                    </h3>
                    <p className="text-xs text-neutral-400 leading-relaxed pr-6 md:pr-0">
                        {isIOS && !isPWA 
                            ? 'Para activar alertas en tu iPhone, añade Preziso a tu pantalla de inicio primero (Compartir -> Añadir a pantalla de inicio).' 
                            : 'Entérate de tus ventas e hitos importantes al instante en tu pantalla de bloqueo.'}
                    </p>
                </div>
            </div>
            
            {(!isIOS || isPWA) ? (
                <button 
                    onClick={subscribeToPush}
                    disabled={loading}
                    className="shrink-0 h-11 px-5 bg-neutral-950 hover:bg-black text-white text-xs font-semibold rounded-lg transition-all active:scale-[0.98] shadow-xs flex items-center justify-center gap-1.5"
                >
                    {loading ? <Loader2 size={13} className="animate-spin" /> : 'Habilitar Notificaciones'}
                </button>
            ) : (
                <div className="shrink-0 flex items-center gap-1.5 text-neutral-500 font-semibold text-[10px] bg-neutral-50 px-3 py-2 rounded-lg border border-neutral-150">
                    <Smartphone size={13} />
                    <span>Requiere PWA en iOS</span>
                </div>
            )}
        </div>
    )
}