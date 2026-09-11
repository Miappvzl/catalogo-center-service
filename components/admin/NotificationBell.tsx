'use client'

import { useState, useEffect, useRef } from 'react'
import { Bell, ShoppingBag, CheckCheck, Info } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { getSupabase } from '@/lib/supabase-client'
import { toast } from 'sonner'
import Link from 'next/link'

// Función utilitaria limpia para tiempo relativo
const timeAgo = (dateStr: string) => {
    const seconds = Math.floor((new Date().getTime() - new Date(dateStr).getTime()) / 1000)
    if (seconds < 60) return 'Hace un momento'
    const minutes = Math.floor(seconds / 60)
    if (minutes < 60) return `Hace ${minutes}m`
    const hours = Math.floor(minutes / 60)
    if (hours < 24) return `Hace ${hours}h`
    return `Hace ${Math.floor(hours / 24)}d`
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
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false)
            }
        }
        document.addEventListener('mousedown', handleClickOutside)
        return () => document.removeEventListener('mousedown', handleClickOutside)
    }, [])

    // Motor Realtime con WebSockets
    useEffect(() => {
        if (!storeId) return

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

        const channel = supabase.channel('realtime_store_notifications')
            .on('postgres_changes', { 
                event: 'INSERT', 
                schema: 'public', 
                table: 'notifications', 
                filter: `store_id=eq.${storeId}` 
            }, (payload: any) => {
                const newNotif = payload.new
                
                setNotifications(prev => [newNotif, ...prev])
                setUnreadCount(prev => prev + 1)
                
                try {
                    const audioEl = document.getElementById('notification-sound') as HTMLAudioElement;
                    if (audioEl) {
                        audioEl.currentTime = 0;
                        const playPromise = audioEl.play();
                        if (playPromise !== undefined) {
                            playPromise.catch(() => {});
                        }
                    }
                } catch (error) {}
                
                toast.success(newNotif.title, {
                    description: newNotif.message,
                    duration: 5000,
                    icon: <ShoppingBag size={16} className="text-emerald-600" />
                })
            }).subscribe()

        return () => { supabase.removeChannel(channel) }
    }, [storeId, supabase])

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
            {/* Gatillo de la Campana (Calibrado a w-9 h-9) */}
            <button 
                onClick={toggleOpen}
                className="relative w-9 h-9 rounded-full bg-white border border-neutral-200/50 hover:border-neutral-300 hover:bg-neutral-50 flex items-center justify-center text-neutral-600 hover:text-neutral-900 active:scale-95 transition-all shadow-xs"
                aria-label="Abrir notificaciones"
            >
                <Bell size={16} strokeWidth={2} />
                {unreadCount > 0 && (
                    <motion.span 
                        initial={{ scale: 0 }} 
                        animate={{ scale: 1 }}
                        className="absolute top-1.5 right-1.5 w-2 h-2 bg-rose-500 rounded-full shadow-[0_0_6px_rgba(244,63,94,0.6)]"
                    />
                )}
            </button>

            {/* Menú Desplegable de Notificaciones */}
            <AnimatePresence>
                {isOpen && (
                   <motion.div
                        initial={{ opacity: 0, scale: 0.97, y: 6 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.98, y: 4 }}
                        transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
                        className="fixed inset-x-4 top-20 sm:inset-auto sm:absolute sm:-right-2 sm:mt-2.5 sm:w-80 md:w-[360px] bg-white border border-neutral-200/50 rounded-xl shadow-[0_20px_50px_-10px_rgba(0,0,0,0.12)] z-50 overflow-hidden sm:origin-top-right flex flex-col max-h-[75vh] transform-gpu will-change-[transform,opacity]"
                    >
                        {/* Cabecera */}
                        <div className="px-4 py-3 border-b border-neutral-100 flex items-center justify-between bg-neutral-50/50">
                            <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-900 font-mono">Notificaciones</h3>
                            {notifications.length > 0 && (
                                <button 
                                    onClick={markAllAsRead} 
                                    className="text-[10px] font-mono font-bold text-neutral-400 hover:text-neutral-900 transition-colors flex items-center gap-1 uppercase tracking-wider"
                                >
                                    <CheckCheck size={12} strokeWidth={2.5} /> Marcar leídas
                                </button>
                            )}
                        </div>

                        {/* Lista de Notificaciones */}
                        <div className="overflow-y-auto no-scrollbar flex-1 divide-y divide-neutral-100/60">
                            {notifications.length === 0 ? (
                                <div className="p-8 text-center flex flex-col items-center justify-center text-neutral-400 space-y-1">
                                    <div className="w-9 h-9 rounded-lg bg-neutral-50 border border-neutral-100 flex items-center justify-center text-neutral-300 mb-1.5">
                                        <Bell size={16} strokeWidth={1.5} />
                                    </div>
                                    <p className="text-xs font-bold text-neutral-700">Sin notificaciones pendientes</p>
                                    <p className="text-[11px] text-neutral-400 font-medium">Aquí se registrarán tus nuevas órdenes de compra.</p>
                                </div>
                            ) : (
                                notifications.map((notif) => (
                                    <Link 
                                        key={notif.id} 
                                        href={notif.link || '#'}
                                        onClick={() => setIsOpen(false)}
                                        className={`block p-3.5 hover:bg-neutral-50/80 transition-colors ${!notif.is_read ? 'bg-neutral-50/60' : 'bg-white'}`}
                                    >
                                        <div className="flex gap-3 items-start">
                                            <div className={`mt-0.5 w-7 h-7 rounded-md flex items-center justify-center shrink-0 border ${
                                                notif.type === 'order' 
                                                    ? 'bg-emerald-50 text-emerald-700 border-emerald-100/60' 
                                                    : 'bg-neutral-100 text-neutral-700 border-neutral-200/60'
                                            }`}>
                                                {notif.type === 'order' ? <ShoppingBag size={13} strokeWidth={2.2} /> : <Info size={13} strokeWidth={2.2} />}
                                            </div>
                                            
                                            <div className="flex-1 min-w-0">
                                                <p className="text-xs font-bold text-neutral-900 leading-tight truncate">{notif.title}</p>
                                                <p className="text-[11px] text-neutral-500 font-medium mt-0.5 leading-relaxed line-clamp-2">{notif.message}</p>
                                                <p className="text-[9px] font-mono font-semibold text-neutral-400 mt-1 uppercase tracking-wider">{timeAgo(notif.created_at)}</p>
                                            </div>

                                            {!notif.is_read && (
                                                <span className="w-1.5 h-1.5 bg-neutral-900 rounded-full mt-1.5 shrink-0" />
                                            )}
                                        </div>
                                    </Link>
                                ))
                            )}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Audio nativo oculto */}
            <audio id="notification-sound" src="/notification.mp3" preload="auto" className="hidden" />
        </div>
    )
}