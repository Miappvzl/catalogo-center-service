'use client'

import { useState, useEffect, useRef } from 'react'
import { Bell, ShoppingBag, CheckCheck, Info } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { getSupabase } from '@/lib/supabase-client'
import { toast } from 'sonner'
import Link from 'next/link'

// Función utilitaria limpia para el tiempo relativo
const timeAgo = (dateStr: string) => {
    const seconds = Math.floor((new Date().getTime() - new Date(dateStr).getTime()) / 1000)
    if (seconds < 60) return 'Hace un momento'
    const minutes = Math.floor(seconds / 60)
    if (minutes < 60) return `Hace ${minutes} min`
    const hours = Math.floor(minutes / 60)
    if (hours < 24) return `Hace ${hours} h`
    return `Hace ${Math.floor(hours / 24)} días`
}

export default function NotificationBell({ storeId }: { storeId: string }) {
    const [isOpen, setIsOpen] = useState(false)
    const [notifications, setNotifications] = useState<any[]>([])
    const [unreadCount, setUnreadCount] = useState(0)
    const dropdownRef = useRef<HTMLDivElement>(null)
    const supabase = getSupabase()

    // Cerrar al hacer clic fuera del menú
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) setIsOpen(false)
        }
        document.addEventListener('mousedown', handleClickOutside)
        return () => document.removeEventListener('mousedown', handleClickOutside)
    }, [])

    // 🚀 EL MOTOR REALTIME
    useEffect(() => {
        if (!storeId) return

        // 1. Cargar historial inicial
        const fetchNotifications = async () => {
            const { data } = await supabase
                .from('notifications')
                .select('*')
                .eq('store_id', storeId)
                .order('created_at', { ascending: false })
                .limit(20)
            
            if (data) {
                setNotifications(data)
                setUnreadCount(data.filter((n: any) => !n.is_read).length)
            }
        }
        fetchNotifications()

        // 2. Escuchar la base de datos en tiempo real (Supabase WebSockets)
        const channel = supabase.channel('realtime_store_notifications')
            .on('postgres_changes', { 
                event: 'INSERT', 
                schema: 'public', 
                table: 'notifications', 
                filter: `store_id=eq.${storeId}` 
           }, (payload: any) => {
                const newNotif = payload.new
                
                // Actualizar UI
                setNotifications(prev => [newNotif, ...prev])
                setUnreadCount(prev => prev + 1)
                
               // 🚀 GATILLO DE SONIDO (Nivel DOM)
                try {
                    const audioEl = document.getElementById('notification-sound') as HTMLAudioElement;
                    if (audioEl) {
                        audioEl.currentTime = 0; // Reinicia el audio por si llegan 2 alertas seguidas
                        const playPromise = audioEl.play();
                        if (playPromise !== undefined) {
                            playPromise.catch(err => console.warn('Silenciado por el navegador (Requiere interacción previa)', err));
                        }
                    }
                } catch (error) {}
                
                // Disparar Sonner Toast fluido
                toast.success(newNotif.title, {
                    description: newNotif.message,
                    duration: 5000,
                    icon: <ShoppingBag size={18} className="text-emerald-600" />
                })
            }).subscribe()

        return () => { supabase.removeChannel(channel) }
    }, [storeId])

    // Marcar como leídas
    const markAllAsRead = async () => {
        if (unreadCount === 0) return
        setUnreadCount(0)
        setNotifications(prev => prev.map(n => ({ ...n, is_read: true })))
        await supabase.from('notifications').update({ is_read: true }).eq('store_id', storeId).eq('is_read', false)
    }

    const toggleOpen = () => {
        if (!isOpen) markAllAsRead()
        setIsOpen(!isOpen)
    }

    return (
        <div className="relative" ref={dropdownRef}>
            {/* El Gatillo (La Campana) */}
            <button 
                onClick={toggleOpen}
                className="relative w-12 h-12 rounded-full bg-white  flex items-center justify-center text-gray-600 hover:text-black hover:border-black active:scale-95 transition-all "
            >
                <Bell size={22} strokeWidth={2} />
                {unreadCount > 0 && (
                    <motion.div 
                        initial={{ scale: 0 }} animate={{ scale: 1 }}
                        className="absolute top-2 right-2.5 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-white"
                    />
                )}
            </button>

            {/* El Menú Desplegable (Framer Motion Físicas de Resorte) */}
            <AnimatePresence>
                {isOpen && (
                   <motion.div
                        initial={{ opacity: 0, y: 12, scale: 0.96 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 8, scale: 0.96 }}
                        transition={{ type: "spring", stiffness: 400, damping: 30 }}
                        // 🚀 ARQUITECTURA RESPONSIVA DE ÉLITE:
                        // En móvil (fixed): Se centra en la pantalla, con un margen seguro a los lados y arriba.
                        // En PC (sm:absolute): Se ancla debajo de la campana (origin-top-right).
                        className="fixed inset-x-4 top-24 sm:inset-auto sm:absolute sm:-right-2 sm:mt-3 sm:w-80 md:w-96 bg-white border border-gray-100 rounded-[var(--radius-card)] shadow-2xl z-50 overflow-hidden sm:origin-top-right flex flex-col max-h-[75vh]"
                    >
                        {/* Cabecera del menú */}
                        <div className="p-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
                            <h3 className="font-black text-gray-900 tracking-tight">Notificaciones</h3>
                            {notifications.length > 0 && (
                                <button onClick={markAllAsRead} className="text-[10px] font-bold text-gray-400 hover:text-black transition-colors flex items-center gap-1 uppercase tracking-wider">
                                    <CheckCheck size={12} /> Marcar Leídas
                                </button>
                            )}
                        </div>

                        {/* Lista con scroll invisible */}
                        <div className="overflow-y-auto no-scrollbar flex-1">
                            {notifications.length === 0 ? (
                                <div className="p-8 text-center flex flex-col items-center justify-center text-gray-400">
                                    <Bell size={32} strokeWidth={1} className="mb-3 opacity-20" />
                                    <p className="text-sm font-medium">No tienes notificaciones aún</p>
                                    <p className="text-xs mt-1">Aquí aparecerán tus nuevas ventas.</p>
                                </div>
                            ) : (
                                <div className="divide-y divide-gray-50">
                                    {notifications.map((notif) => (
                                        <Link 
                                            key={notif.id} 
                                            href={notif.link || '#'}
                                            onClick={() => setIsOpen(false)}
                                            className={`block p-4 hover:bg-gray-50 transition-colors ${!notif.is_read ? 'bg-blue-50/30' : ''}`}
                                        >
                                            <div className="flex gap-3">
                                                <div className="mt-0.5 w-8 h-8 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center shrink-0">
                                                    {notif.type === 'order' ? <ShoppingBag size={14} strokeWidth={2.5} /> : <Info size={14} />}
                                                </div>
                                                <div>
                                                    <p className="text-sm font-bold text-gray-900 leading-tight">{notif.title}</p>
                                                    <p className="text-xs text-gray-500 mt-1">{notif.message}</p>
                                                    <p className="text-[10px] font-bold text-gray-400 mt-2 tracking-wide uppercase">{timeAgo(notif.created_at)}</p>
                                                </div>
                                                {!notif.is_read && <div className="w-1.5 h-1.5 bg-blue-500 rounded-full mt-1.5 shrink-0" />}
                                            </div>
                                        </Link>
                                    ))}
                                </div>
                            )}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
            {/* Reproductor Oculto Pre-cargado */}
            <audio id="notification-sound" src="/notification.mp3" preload="auto" className="hidden" />
        </div>
    )
}
  