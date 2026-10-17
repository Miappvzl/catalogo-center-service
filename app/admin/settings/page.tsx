'use client'

import { useState, useEffect, useRef } from 'react'
import { 
    Save, 
    Loader2, 
    Phone, 
    Globe, 
    Store, 
    Percent, 
    Receipt, 
    LogOut, 
    Users, 
    CheckCircle2, 
    Zap, 
    ShoppingBag,
    Building2,
    MapPin,
    AlertCircle,
    Truck,
    ShieldCheck,
    EyeOff,
    Eye,
    KeyRound,
    Lock,
    Search,
    CreditCard,
    SlidersHorizontal,
    X,
    Clock
} from 'lucide-react'
import { useRouter } from 'next/navigation'
import { getSupabase } from '@/lib/supabase-client'
import { compressImage } from '@/utils/imageOptimizer'
import Swal from 'sweetalert2'
import { motion, AnimatePresence } from 'framer-motion'
import { revalidateStoreCache, switchStoreTypeAction } from '@/app/admin/actions'
import PaymentSettings from '@/components/admin/PaymentSettings'
import ShippingSettings from '@/components/admin/ShippingSettings'
import AdminHeader from '@/components/admin/AdminHeader'
import SecuritySettings from '@/components/admin/SecuritySettings'
import PushNotificationManager from '@/components/admin/PushNotificationManager'
import CategorySorter from '@/components/admin/CategorySorter'
import Image from 'next/image'
import { getOptimizedUrl } from '@/utils/cdn'
import { NumberInput } from '@/components/NumberInput'
import StoreHoursSettings from '@/components/admin/StoreHoursSettings'
import PayPalSetupCard from '@/components/admin/PayPalSetupCard'
import SwitchStoreTypeModal from '@/components/admin/SwitchStoreTypeModal' // 🚀 NUEVO MODAL NATIVO
import { toast } from 'sonner' // Para notificaciones limpias

// Switch Premium Flat Design (Cero Sombras)
const AnimatedSwitch = ({ active, activeColor = 'bg-neutral-950' }: { active: boolean, activeColor?: string }) => (
    <div className={`w-10 h-5.5 rounded-full border flex items-center px-0.5 shrink-0 transition-colors duration-200 cursor-pointer ${active ? `${activeColor} border-transparent justify-end` : 'bg-neutral-100 border-neutral-200/80 justify-start'}`}>
        <motion.div 
            layout 
            transition={{ type: "spring", stiffness: 600, damping: 30 }} 
            className="w-4 h-4 rounded-full bg-white border border-neutral-200/40" 
        />
    </div>
)
export default function SettingsPage() {
    const supabase = getSupabase()
    const router = useRouter()
    const [loading, setLoading] = useState(true)
 const [store, setStore] = useState<any>(null)

 // Arquitectura Master-Detail: Definición de Macro-Categorías y Búsqueda
    type SettingsTabId = 'store' | 'finance' | 'logistics' | 'rules'

    const SETTINGS_TABS = [
        {
            id: 'store' as SettingsTabId,
            label: 'Tienda y Perfil',
            description: 'Identidad comercial, modelo de negocio y credenciales de acceso',
            icon: Store,
            keywords: ['nombre', 'telefono', 'whatsapp', 'retail', 'restaurante', 'seguridad', 'contraseña', 'clave', 'sesion']
        },
        {
            id: 'finance' as SettingsTabId,
            label: 'Finanzas y Pagos',
            description: 'Pasarelas electrónicas, cuentas bancarias y facturación fiscal',
            icon: CreditCard,
            keywords: ['pagos', 'paypal', 'pago movil', 'zelle', 'binance', 'transferencia', 'zinli', 'wally', 'efectivo', 'seniat', 'rif', 'iva', 'comprobante']
        },
        {
            id: 'logistics' as SettingsTabId,
            label: 'Logística y Despacho',
            description: 'Zonas de entrega, delivery por radar, agencias y horarios',
            icon: Truck,
            keywords: ['envios', 'delivery', 'pickup', 'mrw', 'zoom', 'tealca', 'radar', 'zonas', 'horarios', 'apertura', 'servicios', 'intangibles']
        },
        {
            id: 'rules' as SettingsTabId,
            label: 'Reglas de Negocio',
            description: 'Estructura del catálogo, descuentos mayoristas y red de afiliados',
            icon: SlidersHorizontal,
            keywords: ['catalogo', 'categorias', 'pasillo', 'orden', 'mayorista', 'afiliados', 'promotores', 'comisiones', 'descuento']
        }
    ]

        const [isDirty, setIsDirty] = useState(false)

    const [activeTab, setActiveTab] = useState<SettingsTabId>('store')
    const [searchQuery, setSearchQuery] = useState('')

  // PROTECCIÓN CENTRALIZADA CONTRA PÉRDIDA DE CAMBIOS
    const [childDirtySources, setChildDirtySources] = useState<Record<string, boolean>>({})
    const [showUnsavedModal, setShowUnsavedModal] = useState(false)
    const [pendingAction, setPendingAction] = useState<(() => void) | null>(null)

    // VERDAD ABSOLUTA: Hay cambios si la página está sucia O cualquiera de los 4 componentes hijos lo está
    const hasUnsavedChanges = isDirty || Object.values(childDirtySources).some(Boolean)

    // Escucha activa de todos los componentes hijos (Pagos, Envíos, Horarios, Categorías)
    useEffect(() => {
        const handleChildDirtyEvent = (e: Event) => {
            const customEvent = e as CustomEvent<{ id: string; isDirty: boolean }>
            if (customEvent.detail) {
                setChildDirtySources(prev => ({
                    ...prev,
                    [customEvent.detail.id]: customEvent.detail.isDirty
                }))
            }
        }
        window.addEventListener('preziso:dirty-state', handleChildDirtyEvent)
        return () => window.removeEventListener('preziso:dirty-state', handleChildDirtyEvent)
    }, [])

    // 🟢 REEMPLÁZALO POR ESTE:
    // Función que garantiza el cierre inmediato del menú móvil si está desplegado
    const closeMobileSidebar = () => {
        document.dispatchEvent(new CustomEvent('closeMobileAdminSidebar'))
        const closeBtn = document.querySelector('button[aria-label="Cerrar menú"]') as HTMLButtonElement | null
        if (closeBtn) closeBtn.click()
    }

    const requestTabChange = (targetTab: SettingsTabId) => {
        if (targetTab === activeTab) return
        if (hasUnsavedChanges) {
            setPendingAction(() => () => setActiveTab(targetTab))
            closeMobileSidebar()
            setShowUnsavedModal(true)
        } else {
            setActiveTab(targetTab)
        }
    }

    // Interceptor 1: Alerta nativa si intenta recargar la página o cerrar la pestaña del navegador
    useEffect(() => {
        const handleBeforeUnload = (e: BeforeUnloadEvent) => {
            if (hasUnsavedChanges) {
                e.preventDefault()
                e.returnValue = ''
            }
        }
        window.addEventListener('beforeunload', handleBeforeUnload)
        return () => window.removeEventListener('beforeunload', handleBeforeUnload)
    }, [hasUnsavedChanges])

    // Interceptor 2: Captura cualquier clic saliente del menú lateral global (Pedidos, Inventario, Clientes, etc.)
    useEffect(() => {
        const handleAnchorClick = (e: MouseEvent) => {
            if (!hasUnsavedChanges) return
            const target = e.target as HTMLElement
            const anchor = target.closest('a')
            if (!anchor) return

            const href = anchor.getAttribute('href')
            if (!href || href.startsWith('#') || anchor.target === '_blank' || href.startsWith('mailto:') || href.startsWith('tel:')) return

            e.preventDefault()
            e.stopPropagation()
            setPendingAction(() => () => router.push(href))
            closeMobileSidebar()
            setShowUnsavedModal(true)
        }

        document.addEventListener('click', handleAnchorClick, true)
        return () => document.removeEventListener('click', handleAnchorClick, true)
    }, [hasUnsavedChanges, router])

  // Estados de Configuración Operacional
    const [identity, setIdentity] = useState({ phone: '', name: '' }) // 🚀 Logo y Hero removidos de aquí
    const [wholesale, setWholesale] = useState({ active: false, min_items: 6, discount_percentage: 15 })
    const [receipt, setReceipt] = useState({ strict_mode: false })

    // Estado del Programa de Afiliados
    const [affiliate, setAffiliate] = useState({ active: false, global_commission_pct: 5, buyer_discount_pct: 5 })
    
    // Estado Fiscal
    const [fiscal, setFiscal] = useState({
        legal_name: '',
        legal_id: '',
        fiscal_address: '',
        default_tax_percentage: 16,
        fiscal_profile: 'informal'
    })
    

    const [saving, setSaving] = useState(false)
  const [uploadingHero, setUploadingHero] = useState(false)
    const heroInputRef = useRef<HTMLInputElement>(null)

const [shippingRaw, setShippingRaw] = useState<any>({})
    const [nationalShippingFree, setNationalShippingFree] = useState(false) // 🚀 NUEVO ESTADO LOGÍSTICO

    // Estado aislado para la UI de Servicios
    const [serviceConfig, setServiceConfig] = useState({
        service_badge: '',
        service_title: '',
        service_desc: ''
    })

    // 🚀 ESTADOS DE SEGURIDAD (Cambio de Contraseña Blindado)
    const [passwords, setPasswords] = useState({ current: '', new: '', confirm: '' })
    const [showPasswords, setShowPasswords] = useState({ current: false, new: false })
    const [updatingPassword, setUpdatingPassword] = useState(false)

    useEffect(() => {
        const fetchSettings = async () => {
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) return

            const { data } = await supabase.from('stores').select('*').eq('user_id', user.id).single()
       if (data) {
                setStore(data)
                setIdentity({ phone: data.phone || '', name: data.name }) // 🚀 Logo y Hero removidos
                setWholesale(data.wholesale_config || { active: false, min_items: 6, discount_percentage: 15 })
                setReceipt(data.receipt_config || { strict_mode: false })
              setAffiliate(data.affiliate_config || { active: false, global_commission_pct: 5, buyer_discount_pct: 5 })
                setShippingRaw(data.shipping_config || {})
                setNationalShippingFree(data.shipping_config?.national_shipping_is_free || false) // 🚀 LECTURA DE BD
                setServiceConfig({
                    service_badge: data.shipping_config?.service_badge || 'Se consume en tienda',
                    service_title: data.shipping_config?.service_title || 'Servicio / Experiencia',
                    service_desc: data.shipping_config?.service_desc || 'Los artículos de tu carrito corresponden a servicios. No requieren logística de envío.'
                })

                setFiscal({
                    legal_name: data.legal_name || '',
                    legal_id: data.legal_id || '',
                    fiscal_address: data.fiscal_address || '',
                    fiscal_profile: data.fiscal_profile || 'informal', 
                    default_tax_percentage: data.default_tax_percentage ?? 16
                })
            }
            setLoading(false)
        }
        fetchSettings()
    }, [supabase])

  
    // 🚀 ESTADO DEL MODAL NATIVO DE CAMBIO DE GIRO
    const [isSwitchModalOpen, setIsSwitchModalOpen] = useState(false)
    const [switchingType, setSwitchingType] = useState(false)

    const handleConfirmSwitchStoreType = async () => {
        const isCurrentlyRestaurant = store?.store_type === 'restaurant';
        const targetType = isCurrentlyRestaurant ? 'retail' : 'restaurant';

        setSwitchingType(true);
        const res = await switchStoreTypeAction(store.id, targetType);
        setSwitchingType(false);

        if (res.success) {
            setIsSwitchModalOpen(false);
            toast.success(res.message);
            setTimeout(() => window.location.reload(), 600);
        } else {
            toast.error(res.message || 'Error al cambiar de modelo');
        }
    };

    const handleIdentityChange = (field: string, value: string) => {
        const finalValue = field === 'phone' ? value.replace(/\D/g, '') : value
        setIdentity(prev => ({ ...prev, [field]: finalValue }))
        setIsDirty(true)
    }

    const handleWholesaleChange = (field: string, value: any) => {
        setWholesale(prev => ({ ...prev, [field]: value }))
        setIsDirty(true)
    }

    const handleAffiliateChange = (field: string, value: any) => {
        setAffiliate(prev => ({ ...prev, [field]: value }))
        setIsDirty(true)
    }

    

    const handleHeroUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files || e.target.files.length === 0) return

        const file = e.target.files[0]
        if (!file.type.startsWith('image/')) return Swal.fire('Error', 'Solo imágenes', 'error')

        try {
            const dimensions = await new Promise<{ width: number, height: number }>((resolve, reject) => {
                const img = new window.Image();
                img.onload = () => {
                    URL.revokeObjectURL(img.src);
                    resolve({ width: img.width, height: img.height });
                };
                img.onerror = () => reject('Error al leer la imagen');
                img.src = URL.createObjectURL(file);
            });

            if (dimensions.width !== 1920 || dimensions.height !== 600) {
                if (heroInputRef.current) heroInputRef.current.value = '';
                return Swal.fire({
                    title: 'Dimensiones incorrectas',
                    html: `El diseño óptimo de la tienda requiere que el banner mida exactamente <b>1920x600 píxeles</b>.<br><br>Tu imagen mide <b class="text-rose-600">${dimensions.width}x${dimensions.height}</b>.`,
                    icon: 'warning',
                    confirmButtonColor: '#171717',
                    confirmButtonText: 'Ajustar imagen',
                    customClass: { popup: 'rounded-xl font-sans text-xs' }
                });
            }
        } catch (error) {
            return Swal.fire('Error', 'La imagen no se pudo leer correctamente.', 'error');
        }

        setUploadingHero(true)
        try {
            const compressedFile = await compressImage(file, 1920, 0.8)
            const fileName = `hero-${store.id}-${Date.now()}.jpg`

            const { error: uploadError } = await supabase.storage.from('variants').upload(fileName, compressedFile)
            if (uploadError) throw uploadError

            const { data: { publicUrl } } = supabase.storage.from('variants').getPublicUrl(fileName)

            setIdentity(prev => ({ ...prev, hero_url: publicUrl }))
            await supabase.from('stores').update({ hero_url: publicUrl }).eq('id', store.id)
            await revalidateStoreCache()
        } catch (error) {
            Swal.fire('Error', 'Falló la comunicación con el servidor al subir la imagen', 'error')
        } finally {
            setUploadingHero(false)
            if (heroInputRef.current) heroInputRef.current.value = ''
        }
    }

    // 🚀 PROTOCOLO DE SEGURIDAD: Re-autenticación preventiva y mutación de clave
    const handleUpdatePassword = async (e: React.FormEvent) => {
        e.preventDefault()

        if (!passwords.current || !passwords.new || !passwords.confirm) {
            return Swal.fire('Campos requeridos', 'Por favor completa todos los campos de contraseña.', 'warning')
        }
        if (passwords.new.length < 8) {
            return Swal.fire('Contraseña insegura', 'La nueva contraseña debe contener al menos 8 caracteres.', 'warning')
        }
        if (passwords.new !== passwords.confirm) {
            return Swal.fire('Discrepancia', 'La confirmación no coincide con la nueva contraseña.', 'error')
        }
        if (passwords.current === passwords.new) {
            return Swal.fire('Contraseña duplicada', 'La nueva contraseña debe ser diferente a la actual.', 'info')
        }

        setUpdatingPassword(true)
        try {
            // 1. Re-autenticación preventiva: valida que la clave actual sea real
            const { data: { user } } = await supabase.auth.getUser()
            if (!user?.email) throw new Error('Sesión no válida')

            const { error: authError } = await supabase.auth.signInWithPassword({
                email: user.email,
                password: passwords.current
            })

            if (authError) {
                throw new Error('La contraseña actual ingresada es incorrecta.')
            }

            // 2. Mutación de clave en Supabase Auth
            const { error: updateError } = await supabase.auth.updateUser({
                password: passwords.new
            })

            if (updateError) throw updateError

            // 3. Limpieza de inputs y notificación silent delight
            setPasswords({ current: '', new: '', confirm: '' })
            const Toast = Swal.mixin({
                toast: true, position: 'top-end', showConfirmButton: false, timer: 2500,
                customClass: { popup: 'bg-neutral-900 text-white rounded-xl text-xs font-semibold shadow-sm' }
            })
            Toast.fire({ icon: 'success', title: 'Contraseña actualizada con éxito' })
        } catch (error: any) {
            Swal.fire({
                title: 'Error de autenticación',
                text: error.message || 'No se pudo actualizar la contraseña.',
                icon: 'error',
                confirmButtonColor: '#171717',
                customClass: { popup: 'rounded-xl font-sans text-xs' }
            })
        } finally {
            setUpdatingPassword(false)
        }
    }

   const saveSettings = async (): Promise<boolean> => {
        if (!isDirty) return true
        setSaving(true)

        const updatedShippingConfig = {
            ...shippingRaw,
            service_badge: serviceConfig.service_badge,
            service_title: serviceConfig.service_title,
            service_desc: serviceConfig.service_desc,
            national_shipping_is_free: nationalShippingFree
        }

        const { error } = await supabase
            .from('stores')
            .update({
                phone: identity.phone,
                name: identity.name,
                wholesale_config: wholesale,
                receipt_config: receipt,
                affiliate_config: affiliate,
                legal_name: fiscal.legal_name,
                legal_id: fiscal.legal_id,
                fiscal_address: fiscal.fiscal_address,
                fiscal_profile: fiscal.fiscal_profile,
                default_tax_percentage: fiscal.default_tax_percentage,
                shipping_config: updatedShippingConfig
            })
            .eq('id', store.id)

        setSaving(false)

        if (error) {
            Swal.fire('Error', 'No se pudo guardar la configuración', 'error')
            return false
        } else {
            await revalidateStoreCache()
            setIsDirty(false)
            const Toast = Swal.mixin({
                toast: true, position: 'top-end', showConfirmButton: false, timer: 2000,
                customClass: { popup: 'bg-neutral-900 text-white rounded-xl text-xs font-semibold' }
            })
            Toast.fire({ icon: 'success', title: 'Cambios guardados con éxito' })
            return true
        }
    }

    const handleSaveAndProceed = async () => {
        const success = await saveSettings()
        if (success) {
            setShowUnsavedModal(false)
            if (pendingAction) {
                pendingAction()
                setPendingAction(null)
            }
        }
    }

    const handleDiscardAndProceed = () => {
        setIsDirty(false)
        setShowUnsavedModal(false)
        if (pendingAction) {
            pendingAction()
            setPendingAction(null)
        }
    }

    const handleStay = () => {
        setShowUnsavedModal(false)
        setPendingAction(null)
    }

    if (loading) return <div className="h-screen flex items-center justify-center bg-[#FAFAFC]"><Loader2 className="animate-spin text-neutral-300" size={24} /></div>

    const handleLogout = async () => {
        await supabase.auth.signOut()
        router.push('/login')
    }

   return (
        <div className="pb-32 font-sans text-neutral-950 bg-[#FAFAFC] min-h-screen overflow-x-clip w-full max-w-[100vw] antialiased">
            <AdminHeader store={store} title="Configuración" />

           {/* CONTENEDOR EXPANDIDO A 1400PX PARA MÁXIMA ERGONOMÍA DESKTOP */}
            <div className="max-w-[1400px] w-full mx-auto px-4 sm:px-6 lg:px-8 mt-6 space-y-6">

            {/* 1. CABECERA EDITORIAL (FLUJO NATURAL: HACE SCROLL Y NO ENSUCIA EL STICKY MÓVIL) */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-lg font-semibold text-neutral-950 tracking-tight">Centro de Control</h1>
                        <p className="text-xs text-neutral-500 font-normal mt-0.5">Administra la operatividad, métodos de cobro, logística y reglas de tu tienda.</p>
                    </div>

                    {/* BUSCADOR COMPACTO PARA ESCRITORIO (ALINEADO A LA DERECHA) */}
                    <div className="hidden lg:flex items-center gap-3">
                        <div className="relative w-80 group">
                            <Search size={14} strokeWidth={1.5} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-400 group-focus-within:text-neutral-950 transition-colors pointer-events-none" />
                            <input
                                type="text"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                placeholder="Buscar en ajustes..."
                                className="w-full bg-white border border-neutral-200/80 focus:border-neutral-950 rounded-xl pl-9 pr-9 py-2 text-xs font-medium text-neutral-950 placeholder:text-neutral-400 outline-none transition-all"
                            />
                            {searchQuery ? (
                                <button
                                    type="button"
                                    onClick={() => setSearchQuery('')}
                                    className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-neutral-400 hover:text-neutral-950 rounded-md hover:bg-neutral-100 transition-colors"
                                >
                                    <X size={12} strokeWidth={1.5} />
                                </button>
                            ) : (
                                <kbd className="inline-flex absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] font-mono text-neutral-400 bg-neutral-100 border border-neutral-200/70 px-1.5 py-0.5 rounded font-medium select-none pointer-events-none">
                                    /
                                </kbd>
                            )}
                        </div>

                   
                            {/* Guardar Cambios Contextual (Desktop) */}
                            {hasUnsavedChanges && (
                                <button
                                    onClick={async () => {
                                        if (isDirty) await saveSettings()
                                        window.dispatchEvent(new CustomEvent('preziso:trigger-save'))
                                        setChildDirtySources({})
                                    }}
                                    disabled={saving}
                                    className="bg-neutral-950 hover:bg-black text-white px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all active:scale-[0.98] disabled:opacity-50 shrink-0"
                                >
                                    {saving ? <Loader2 size={12} className="animate-spin" /> : <Save size={12} strokeWidth={1.5} />}
                                    <span>Guardar</span>
                                </button>
                            )}
                    </div>
                </div>

                {/* 2. HEADER FIJO EXCLUSIVO PARA MÓVIL (SIN TEXTOS SOBRANTES, COMIENZA EN TOP-0) */}
                <div className="lg:hidden sticky top-4 z-30 -mx-4 px-4 sm:-mx-6 sm:px-6 pt-2 pb-0 bg-[#FAFAFC]/95 backdrop-blur-md border-b border-neutral-200/60 transition-all space-y-2.5">
                    {/* Buscador Móvil Flush */}
                    <div className="flex items-center gap-2">
                        <div className="relative flex-1 group">
                            <Search size={14} strokeWidth={1.5} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-400 group-focus-within:text-neutral-950 transition-colors pointer-events-none" />
                            <input
                                type="text"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                placeholder="Buscar en ajustes..."
                                className="w-full bg-white border border-neutral-200/80 focus:border-neutral-950 rounded-xl pl-9 pr-8 py-2 text-xs font-medium text-neutral-950 placeholder:text-neutral-400 outline-none transition-all"
                            />
                            {searchQuery && (
                                <button
                                    type="button"
                                    onClick={() => setSearchQuery('')}
                                    className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-neutral-400 hover:text-neutral-950 rounded-md hover:bg-neutral-100 transition-colors"
                                >
                                    <X size={12} strokeWidth={1.5} />
                                </button>
                            )}
                        </div>

                        {hasUnsavedChanges && (
                            <button
                                onClick={async () => {
                                    if (isDirty) await saveSettings()
                                    window.dispatchEvent(new CustomEvent('preziso:trigger-save'))
                                    setChildDirtySources({})
                                }}
                                disabled={saving}
                                className="bg-neutral-950 hover:bg-black text-white px-3.5 py-2 rounded-xl text-xs font-semibold flex items-center gap-1 transition-all active:scale-[0.98] disabled:opacity-50 shrink-0"
                            >
                                {saving ? <Loader2 size={12} className="animate-spin" /> : <Save size={12} strokeWidth={1.5} />}
                            </button>
                        )}
                    </div>

                    {/* NAVEGACIÓN MÓVIL: PESTAÑAS MINIMALISTAS CON LÍNEA INFERIOR SPRING */}
                    <div className="flex items-center gap-6 overflow-x-auto no-scrollbar pt-2">
                        {SETTINGS_TABS.map((tab) => {
                            const Icon = tab.icon
                            const isActive = activeTab === tab.id
                            const hasSearchMatch = searchQuery.trim() !== '' && tab.keywords.some(k => k.toLowerCase().includes(searchQuery.toLowerCase().trim()))

                            return (
                                <button
                                    key={tab.id}
                                    type="button"
                                    onClick={() => requestTabChange(tab.id)}
                                    className={`relative pb-3 text-xs tracking-tight flex items-center gap-2 whitespace-nowrap transition-colors select-none ${
                                        isActive
                                            ? 'text-neutral-950 font-semibold'
                                            : 'text-neutral-400 hover:text-neutral-700 font-medium'
                                    }`}
                                >
                                    <Icon size={14} strokeWidth={isActive ? 2 : 1.5} className={isActive ? 'text-neutral-950' : 'text-neutral-400'} />
                                    <span>{tab.label}</span>
                                    
                                    {hasSearchMatch && !isActive && (
                                        <span className="w-1.5 h-1.5 rounded-full bg-neutral-950 shrink-0" />
                                    )}

                                    {/* LÍNEA INDICADORA INFERIOR FLUIDA */}
                                    {isActive && (
                                        <motion.div
                                            layoutId="mobileActiveUnderline"
                                            className="absolute bottom-0 left-0 right-0 h-[2px] bg-neutral-950 rounded-full"
                                            transition={{ type: "spring", stiffness: 500, damping: 35 }}
                                        />
                                    )}
                                </button>
                            )
                        })}
                    </div>
                </div>

                {/* 3. ESTRUCTURA MAESTRO-DETALLE */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">

                    {/* COLUMNA MAESTRA: SIDEBAR ELEVADO (ESTILO LINEAR / RAYCAST) */}
                    <aside className="hidden lg:block lg:col-span-4 xl:col-span-3 sticky top-6 self-start space-y-1">
                        <div className="bg-white rounded-2xl border border-neutral-200/70 p-2 space-y-1">
                            {SETTINGS_TABS.map((tab) => {
                                const Icon = tab.icon
                                const isActive = activeTab === tab.id
                                const isSearchMatch = searchQuery.trim() !== '' && tab.keywords.some(k => k.toLowerCase().includes(searchQuery.toLowerCase().trim()))

                                return (
                                    <button
                                        key={tab.id}
                                        type="button"
                                        onClick={() => requestTabChange(tab.id)}
                                        className={`relative w-full text-left p-3.5 rounded-xl transition-all flex items-start gap-3.5 select-none group ${
                                            isActive ? 'text-neutral-950' : 'text-neutral-600 hover:text-neutral-950 hover:bg-neutral-50/80'
                                        }`}
                                    >
                                        {/* FONDO TITANIO CLARO SUTIL (ADIÓS AL BLOQUE NEGRO PESADO) */}
                                        {isActive && (
                                            <motion.div
                                                layoutId="activeSettingsTabPill"
                                                className="absolute inset-0 bg-neutral-100/70 border border-neutral-200/70 rounded-xl"
                                                transition={{ type: "spring", stiffness: 450, damping: 32 }}
                                            />
                                        )}

                                        {/* MICRO-RIEL OBSIDIAN LATERAL INDICADOR */}
                                        {isActive && (
                                            <motion.div
                                                layoutId="activeSettingsTabRail"
                                                className="absolute left-1.5 top-3.5 bottom-3.5 w-[3px] bg-neutral-950 rounded-full z-20"
                                                transition={{ type: "spring", stiffness: 500, damping: 35 }}
                                            />
                                        )}

                                        <Icon 
                                            size={17} 
                                            strokeWidth={isActive ? 2 : 1.5} 
                                            className={`mt-0.5 shrink-0 relative z-10 transition-colors ${
                                                isActive ? 'text-neutral-950' : 'text-neutral-400 group-hover:text-neutral-800'
                                            }`} 
                                        />

                                        <div className="min-w-0 flex-1 relative z-10 pl-0.5">
                                            <div className="flex items-center justify-between gap-1.5">
                                                <span className={`text-xs tracking-tight ${
                                                    isActive ? 'font-semibold text-neutral-950' : 'font-medium text-neutral-700 group-hover:text-neutral-950'
                                                }`}>
                                                    {tab.label}
                                                </span>
                                                {isSearchMatch && (
                                                    <span className="text-[9px] font-mono font-medium px-1.5 py-0.2 rounded bg-neutral-200/80 text-neutral-800 border border-neutral-300/80">
                                                        Match
                                                    </span>
                                                )}
                                            </div>
                                            <p className={`text-[11px] font-normal leading-relaxed mt-0.5 transition-colors ${
                                                isActive ? 'text-neutral-500' : 'text-neutral-400 group-hover:text-neutral-500'
                                            }`}>
                                                {tab.description}
                                            </p>
                                        </div>
                                    </button>
                                )
                            })}
                        </div>
                    </aside>

                    {/* COLUMNA DETALLE: CONTENIDO DINÁMICO */}
                    <div className="lg:col-span-8 xl:col-span-9 min-w-0">
                        <AnimatePresence mode="wait">
                            <motion.div
                                key={activeTab}
                                initial={{ opacity: 0, y: 8 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -8 }}
                                transition={{ duration: 0.16, ease: "easeOut" }}
                                className="space-y-6"
                            >
                                {/* ========================================== */}
                                {/* PESTAÑA 1: TIENDA Y PERFIL                 */}
                                {/* ========================================== */}
                                {activeTab === 'store' && (
                                    <>
                                        {/* IDENTIDAD DE MARCA */}
                                        <section className="bg-white p-6 md:p-8 rounded-xl border border-neutral-200/60 space-y-6">
                                            <div>
                                                <div className="flex items-center gap-2 text-neutral-950">
                                                    <Globe size={18} strokeWidth={1.5} className="text-neutral-500" />
                                                    <h2 className="text-base font-semibold tracking-tight">Identidad de Marca</h2>
                                                </div>
                                                <p className="text-xs text-neutral-500 mt-1 font-normal">Defina el nombre oficial y canal de contacto de su comercio.</p>
                                            </div>

                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                                <div>
                                                    <label className="text-[11px] font-semibold text-neutral-500 uppercase tracking-wider mb-2 block flex items-center gap-1">
                                                        <Store size={12} strokeWidth={1.5} className="text-neutral-400" /> Nombre Comercial
                                                    </label>
                                                    <input
                                                        value={identity.name}
                                                        onChange={e => handleIdentityChange('name', e.target.value)}
                                                        className="w-full bg-neutral-50/50 border border-neutral-200/75 rounded-lg px-3.5 py-2.5 text-xs font-semibold text-neutral-950 focus:bg-white focus:border-neutral-950 outline-none transition-all"
                                                    />
                                                </div>
                                                <div>
                                                    <label className="text-[11px] font-semibold text-neutral-500 uppercase tracking-wider mb-2 block flex items-center gap-1">
                                                        <Phone size={12} strokeWidth={1.5} className="text-neutral-400" /> WhatsApp de Atención
                                                    </label>
                                                    <input
                                                        type="tel"
                                                        inputMode="numeric"
                                                        value={identity.phone}
                                                        onChange={e => handleIdentityChange('phone', e.target.value.replace(/[^0-9]/g, ''))}
                                                        placeholder="Ej: 584120000000"
                                                        className="w-full bg-neutral-50/50 border border-neutral-200/75 rounded-lg px-3.5 py-2.5 text-xs font-mono font-medium text-neutral-950 focus:bg-white focus:border-neutral-950 outline-none transition-all"
                                                    />
                                                </div>
                                            </div>
                                        </section>

                                        {/* MODELO DE OPERACIÓN */}
                                        <section className="bg-white p-6 md:p-8 rounded-xl border border-neutral-200/60 space-y-5">
                                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-neutral-100">
                                                <div>
                                                    <div className="flex items-center gap-2 text-neutral-950">
                                                        <Store size={18} strokeWidth={1.5} className="text-neutral-500" />
                                                        <h2 className="text-base font-semibold tracking-tight">Modelo de Operación</h2>
                                                    </div>
                                                    <p className="text-xs text-neutral-500 mt-1 font-normal">
                                                        Define la arquitectura de catálogo, editor de productos y logística de compra.
                                                    </p>
                                                </div>

                                                <button
                                                    type="button"
                                                    onClick={() => setIsSwitchModalOpen(true)}
                                                    disabled={saving || switchingType}
                                                    className="px-4 py-2 bg-neutral-50 hover:bg-neutral-100 border border-neutral-200/80 text-neutral-950 rounded-lg text-xs font-semibold tracking-wide transition-all self-start sm:self-auto shrink-0 active:scale-95"
                                                >
                                                    {store?.store_type === 'restaurant' 
                                                        ? 'Cambiar a Comercio General' 
                                                        : 'Cambiar a Modo Restaurante'}
                                                </button>
                                            </div>

                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                <div className={`p-4.5 rounded-xl border flex flex-col justify-between transition-all ${
                                                    store?.store_type !== 'restaurant' 
                                                        ? 'bg-neutral-950 text-white border-neutral-950' 
                                                        : 'bg-neutral-50/50 border-neutral-200/60 text-neutral-600'
                                                }`}>
                                                    <div>
                                                        <span className="text-[10px] font-mono font-semibold uppercase tracking-wider block mb-1 opacity-70">
                                                            Modo Actual
                                                        </span>
                                                        <h3 className="text-sm font-semibold tracking-tight">Comercio General (Retail)</h3>
                                                        <p className="text-xs mt-1.5 opacity-80 leading-relaxed font-normal">
                                                            Optimizado para ropa, calzado, tecnología y artículos con gestión de stock unitario, tallas y envíos por agencias nacionales.
                                                        </p>
                                                    </div>
                                                </div>

                                                <div className={`p-4.5 rounded-xl border flex flex-col justify-between transition-all ${
                                                    store?.store_type === 'restaurant' 
                                                        ? 'bg-neutral-950 text-white border-neutral-950' 
                                                        : 'bg-neutral-50/50 border-neutral-200/60 text-neutral-600'
                                                }`}>
                                                    <div>
                                                        <span className="text-[10px] font-mono font-semibold uppercase tracking-wider block mb-1 opacity-70">
                                                            Modo Especializado
                                                        </span>
                                                        <h3 className="text-sm font-semibold tracking-tight">Gastronomía & Restaurantes</h3>
                                                        <p className="text-xs mt-1.5 opacity-80 leading-relaxed font-normal">
                                                            Menú líquido vertical continuo, modificadores de platos (términos, extras), control de horarios en vivo, pedidos en mesa y propinas.
                                                        </p>
                                                    </div>
                                                </div>
                                            </div>
                                        </section>

                                        {/* SEGURIDAD DE LA CUENTA */}
                                        <section className="bg-white p-6 md:p-8 rounded-xl border border-neutral-200/60 space-y-6">
                                            <div>
                                                <div className="flex items-center gap-2 text-neutral-950">
                                                    <Lock size={18} strokeWidth={1.5} className="text-neutral-500" />
                                                    <h2 className="text-base font-semibold tracking-tight">Seguridad de la Cuenta</h2>
                                                </div>
                                                <p className="text-xs text-neutral-500 mt-1 font-normal">Actualice la contraseña de acceso a su panel administrativo de manera segura.</p>
                                            </div>

                                            <form onSubmit={handleUpdatePassword} className="space-y-4 max-w-2xl">
                                                <div>
                                                    <label className="text-[11px] font-semibold text-neutral-500 uppercase tracking-wider mb-2 block flex items-center gap-1">
                                                        <KeyRound size={12} strokeWidth={1.5} className="text-neutral-400" /> Contraseña Actual
                                                    </label>
                                                    <div className="relative">
                                                        <input
                                                            type={showPasswords.current ? "text" : "password"}
                                                            value={passwords.current}
                                                            onChange={e => setPasswords({ ...passwords, current: e.target.value })}
                                                            placeholder="Ingrese su clave actual para verificar identidad"
                                                            className="w-full bg-neutral-50/50 border border-neutral-200/75 rounded-lg pl-3.5 pr-10 py-2.5 text-xs font-semibold text-neutral-950 focus:bg-white focus:border-neutral-950 outline-none transition-all"
                                                        />
                                                        <button
                                                            type="button"
                                                            onClick={() => setShowPasswords(prev => ({ ...prev, current: !prev.current }))}
                                                            className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600 transition-colors"
                                                        >
                                                            {showPasswords.current ? <EyeOff size={14} strokeWidth={1.5} /> : <Eye size={14} strokeWidth={1.5} />}
                                                        </button>
                                                    </div>
                                                </div>

                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                    <div>
                                                        <label className="text-[11px] font-semibold text-neutral-500 uppercase tracking-wider mb-2 block">
                                                            Nueva Contraseña
                                                        </label>
                                                        <div className="relative">
                                                            <input
                                                                type={showPasswords.new ? "text" : "password"}
                                                                value={passwords.new}
                                                                onChange={e => setPasswords({ ...passwords, new: e.target.value })}
                                                                placeholder="Mínimo 8 caracteres"
                                                                className="w-full bg-neutral-50/50 border border-neutral-200/75 rounded-lg pl-3.5 pr-10 py-2.5 text-xs font-semibold text-neutral-950 focus:bg-white focus:border-neutral-950 outline-none transition-all"
                                                            />
                                                            <button
                                                                type="button"
                                                                onClick={() => setShowPasswords(prev => ({ ...prev, new: !prev.new }))}
                                                                className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600 transition-colors"
                                                            >
                                                                {showPasswords.new ? <EyeOff size={14} strokeWidth={1.5} /> : <Eye size={14} strokeWidth={1.5} />}
                                                            </button>
                                                        </div>
                                                    </div>
                                                    <div>
                                                        <label className="text-[11px] font-semibold text-neutral-500 uppercase tracking-wider mb-2 block">
                                                            Confirmar Nueva Contraseña
                                                        </label>
                                                        <input
                                                            type="password"
                                                            value={passwords.confirm}
                                                            onChange={e => setPasswords({ ...passwords, confirm: e.target.value })}
                                                            placeholder="Repita su nueva contraseña"
                                                            className="w-full bg-neutral-50/50 border border-neutral-200/75 rounded-lg px-3.5 py-2.5 text-xs font-semibold text-neutral-950 focus:bg-white focus:border-neutral-950 outline-none transition-all"
                                                        />
                                                    </div>
                                                </div>

                                                <div className="pt-2 flex justify-end">
                                                    <button 
                                                        type="submit" 
                                                        disabled={updatingPassword || !passwords.current || !passwords.new || !passwords.confirm} 
                                                        className={`w-full sm:w-auto px-5 py-2.5 rounded-lg text-xs font-semibold flex items-center justify-center gap-2 transition-all ${
                                                            passwords.current && passwords.new && passwords.confirm
                                                                ? 'bg-neutral-950 text-white hover:bg-black active:scale-[0.98]' 
                                                                : 'bg-neutral-100 text-neutral-400 cursor-not-allowed'
                                                        }`}
                                                    >
                                                        {updatingPassword ? <Loader2 className="animate-spin" size={13} strokeWidth={1.5} /> : <ShieldCheck size={13} strokeWidth={1.5} />} 
                                                        <span>Actualizar Contraseña</span>
                                                    </button>
                                                </div>
                                            </form>
                                        </section>

                                        {/* CIERRE DE SESIÓN */}
                                        <button 
                                            onClick={handleLogout} 
                                            className="flex items-center justify-center gap-2 px-4 py-3 rounded-lg text-xs font-semibold bg-white border border-neutral-200/60 text-rose-600 hover:bg-rose-50/50 hover:border-rose-200 transition-colors w-full text-center"
                                        >
                                            <LogOut size={13} strokeWidth={1.5} /> 
                                            <span>Finalizar sesión actual</span>
                                        </button>
                                    </>
                                )}

                                {/* ========================================== */}
                                {/* PESTAÑA 2: FINANZAS Y PAGOS                */}
                                {/* ========================================== */}
                                {activeTab === 'finance' && (
                                    <>
                                        <PayPalSetupCard storeId={store.id} />
                                        <PaymentSettings storeId={store.id} initialData={store.payment_config} />

                                        {/* COMPROBANTES DE PAGO */}
                                        <section className="bg-white p-6 md:p-8 rounded-xl border border-neutral-200/60 space-y-4">
                                            <div 
                                                className="flex items-center justify-between cursor-pointer" 
                                                onClick={() => { setReceipt({ strict_mode: !receipt.strict_mode }); setIsDirty(true) }}
                                            >
                                                <div className="space-y-0.5 pr-4">
                                                    <p className="font-semibold text-xs text-neutral-950 flex items-center gap-1.5">
                                                        <Receipt size={14} strokeWidth={1.5} className="text-neutral-500" /> Comprobante de Pago Obligatorio
                                                    </p>
                                                    <p className="text-xs text-neutral-500 font-normal">Restringe el envío de solicitudes de orden si no se adjunta el comprobante bancario correspondiente.</p>
                                                </div>
                                                <AnimatedSwitch active={receipt.strict_mode} />
                                            </div>
                                        </section>

                                        {/* DATOS FISCALES */}
                                        <section className="bg-white p-6 md:p-8 rounded-xl border border-neutral-200/60 space-y-6">
                                            <div>
                                                <div className="flex items-center gap-2 text-neutral-950">
                                                    <Building2 size={18} strokeWidth={1.5} className="text-neutral-500" />
                                                    <h2 className="text-base font-semibold tracking-tight">Datos Fiscales y Facturación</h2>
                                                </div>
                                                <p className="text-xs text-neutral-500 mt-1 font-normal">Información jurídica para facturas electrónicas y órdenes de compra.</p>
                                            </div>

                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                                <div>
                                                    <label className="text-[11px] font-semibold text-neutral-500 uppercase tracking-wider mb-2 block">Razón Social Jurídica</label>
                                                    <input
                                                        value={fiscal.legal_name}
                                                        onChange={e => { setFiscal({ ...fiscal, legal_name: e.target.value }); setIsDirty(true) }}
                                                        placeholder="Ej: Inversiones Preziso C.A."
                                                        className="w-full bg-neutral-50/50 border border-neutral-200/75 rounded-lg px-3.5 py-2.5 text-xs font-semibold text-neutral-950 focus:bg-white focus:border-neutral-950 outline-none transition-all"
                                                    />
                                                </div>
                                                <div>
                                                    <label className="text-[11px] font-semibold text-neutral-500 uppercase tracking-wider mb-2 block">Identificación Fiscal (RIF)</label>
                                                    <input
                                                        value={fiscal.legal_id}
                                                        onChange={e => { setFiscal({ ...fiscal, legal_id: e.target.value.toUpperCase() }); setIsDirty(true) }}
                                                        placeholder="Ej: J-123456789"
                                                        className="w-full bg-neutral-50/50 border border-neutral-200/75 rounded-lg px-3.5 py-2.5 text-xs font-mono font-semibold text-neutral-950 focus:bg-white focus:border-neutral-950 outline-none transition-all"
                                                    />
                                                </div>
                                                <div className="md:col-span-2">
                                                    <label className="text-[11px] font-semibold text-neutral-500 uppercase tracking-wider mb-2 block flex items-center gap-1">
                                                        <MapPin size={12} strokeWidth={1.5} className="text-neutral-400" /> Dirección de Domicilio Fiscal
                                                    </label>
                                                    <input
                                                        value={fiscal.fiscal_address}
                                                        onChange={e => { setFiscal({ ...fiscal, fiscal_address: e.target.value }); setIsDirty(true) }}
                                                        placeholder="Ej: Av. Francisco de Miranda, Torre Este, Local 2, Caracas"
                                                        className="w-full bg-neutral-50/50 border border-neutral-200/75 rounded-lg px-3.5 py-2.5 text-xs font-semibold text-neutral-950 focus:bg-white focus:border-neutral-950 outline-none transition-all"
                                                    />
                                                </div>
                                            </div>

                                            {/* CLASIFICACIÓN CONTRIBUTIVA */}
                                            <div className="pt-4 border-t border-neutral-100">
                                                <label className="text-[11px] font-semibold text-neutral-500 uppercase tracking-wider mb-3.5 block">Clasificación Contributiva</label>
                                                
                                                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                                    {[
                                                        { id: 'informal', title: 'Persona Natural / Informal', desc: 'Sujeto exento de IVA. Transacciones directas sin retenciones.' },
                                                        { id: 'ordinary', title: 'Contribuyente Ordinario', desc: 'Aplica alícuota fiscal obligatoria en todas sus transacciones.' },
                                                        { id: 'special', title: 'Contribuyente Especial', desc: 'Sujeto a alícuota base con módulo avanzado de retenciones.' }
                                                    ].map(p => {
                                                        const isSelected = fiscal.fiscal_profile === p.id;
                                                        return (
                                                            <div
                                                                key={p.id}
                                                                onClick={() => { setFiscal({ ...fiscal, fiscal_profile: p.id }); setIsDirty(true) }}
                                                                className={`cursor-pointer p-4 rounded-lg border transition-all flex flex-col justify-between min-h-[90px] ${
                                                                    isSelected 
                                                                        ? 'bg-neutral-950 border-neutral-950 text-white' 
                                                                        : 'bg-neutral-50/50 border-neutral-200/80 hover:bg-neutral-50 text-neutral-900'
                                                                }`}
                                                            >
                                                                <div className="flex justify-between items-start w-full gap-2 mb-2">
                                                                    <h3 className="font-semibold text-[11px] uppercase tracking-wider leading-tight">{p.title}</h3>
                                                                    {isSelected && <CheckCircle2 size={13} strokeWidth={1.5} className="text-white shrink-0" />}
                                                                </div>
                                                                <p className={`text-[10px] leading-relaxed ${isSelected ? 'text-neutral-400' : 'text-neutral-500'}`}>{p.desc}</p>
                                                            </div>
                                                        )
                                                    })}
                                                </div>

                                                {/* IVA */}
                                                {fiscal.fiscal_profile !== 'informal' && (
                                                    <div className="mt-4 p-4 bg-neutral-50/60 border border-neutral-200/80 rounded-lg flex items-center justify-between">
                                                        <div className="space-y-0.5">
                                                            <p className="text-xs font-semibold text-neutral-950">Impuesto al Valor Agregado (IVA)</p>
                                                            <p className="text-[10px] text-neutral-500">Rango legal general aplicable.</p>
                                                        </div>
                                                        <div className="relative w-24">
                                                            <NumberInput
                                                                value={fiscal.default_tax_percentage}
                                                                onChangeValue={val => {
                                                                    let num = Number(val);
                                                                    if (num < 16) num = 16;
                                                                    if (num > 16.5) num = 16.5;

                                                                    setFiscal({ ...fiscal, default_tax_percentage: num });
                                                                    setIsDirty(true);
                                                                }}
                                                                className="w-full bg-white border border-neutral-200/80 rounded-md py-1.5 pl-2 pr-7 text-xs font-semibold text-neutral-950 text-center focus:border-neutral-950 outline-none transition-colors"
                                                            />
                                                            <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] text-neutral-400 font-semibold pointer-events-none">%</span>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        </section>
                                    </>
                                )}

                                {/* ========================================== */}
                                {/* PESTAÑA 3: LOGÍSTICA Y OPERACIONES         */}
                                {/* ========================================== */}
                                {activeTab === 'logistics' && (
                                    <>
                                        {store?.store_type === 'restaurant' && (
                                            <StoreHoursSettings storeId={store.id} initialData={store.store_hours} />
                                        )}

                                        <ShippingSettings storeId={store.id} initialData={store.shipping_config} storeType={store.store_type} />

                                        {store?.store_type !== 'restaurant' && (
                                            <section className="bg-white p-6 md:p-8 rounded-xl border border-neutral-200/60 space-y-6">
                                                <div>
                                                    <div className="flex items-center gap-2 text-neutral-950">
                                                        <Zap size={18} strokeWidth={1.5} className="text-neutral-500" />
                                                        <h2 className="text-base font-semibold tracking-tight">Servicios e Intangibles</h2>
                                                    </div>
                                                    <p className="text-xs text-neutral-500 mt-1 font-normal">Ajuste indicaciones para ítems que no requieren despacho físico.</p>
                                                </div>

                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                                    <div>
                                                        <label className="text-[11px] font-semibold text-neutral-500 uppercase tracking-wider mb-2 flex justify-between">
                                                            <span>Etiqueta del carrito</span>
                                                            <span className="text-[10px] font-mono text-neutral-400">
                                                                {serviceConfig.service_badge.length}/20
                                                            </span>
                                                        </label>
                                                        <input
                                                            maxLength={20}
                                                            value={serviceConfig.service_badge}
                                                            onChange={e => { setServiceConfig({ ...serviceConfig, service_badge: e.target.value }); setIsDirty(true) }}
                                                            placeholder="Ej: Se consume en tienda"
                                                            className="w-full bg-neutral-50/50 border border-neutral-200/75 rounded-lg px-3.5 py-2.5 text-xs font-semibold text-neutral-950 focus:bg-white focus:border-neutral-950 outline-none transition-all"
                                                        />
                                                    </div>
                                                    <div>
                                                        <label className="text-[11px] font-semibold text-neutral-500 uppercase tracking-wider mb-2 flex justify-between">
                                                            <span>Título de aviso en checkout</span>
                                                            <span className="text-[10px] font-mono text-neutral-400">
                                                                {serviceConfig.service_title.length}/30
                                                            </span>
                                                        </label>
                                                        <input
                                                            maxLength={30}
                                                            value={serviceConfig.service_title}
                                                            onChange={e => { setServiceConfig({ ...serviceConfig, service_title: e.target.value }); setIsDirty(true) }}
                                                            placeholder="Ej: Taller en Vivo"
                                                            className="w-full bg-neutral-50/50 border border-neutral-200/75 rounded-lg px-3.5 py-2.5 text-xs font-semibold text-neutral-950 focus:bg-white focus:border-neutral-950 outline-none transition-all"
                                                        />
                                                    </div>
                                                    <div className="md:col-span-2">
                                                        <label className="text-[11px] font-semibold text-neutral-500 uppercase tracking-wider mb-2 flex justify-between">
                                                            <span>Indicaciones del Servicio</span>
                                                            <span className="text-[10px] font-mono text-neutral-400">
                                                                {serviceConfig.service_desc.length}/120
                                                            </span>
                                                        </label>
                                                        <textarea
                                                            maxLength={120}
                                                            rows={2}
                                                            value={serviceConfig.service_desc}
                                                            onChange={e => { setServiceConfig({ ...serviceConfig, service_desc: e.target.value }); setIsDirty(true) }}
                                                            placeholder="Ej: Los artículos de su carrito corresponden a servicios. Nos comunicaremos al procesar la orden."
                                                            className="w-full bg-neutral-50/50 border border-neutral-200/75 rounded-lg px-3.5 py-2.5 text-xs font-normal text-neutral-950 focus:bg-white focus:border-neutral-950 outline-none transition-all resize-none"
                                                        />
                                                    </div>
                                                </div>
                                            </section>
                                        )}
                                    </>
                                )}

                                {/* ========================================== */}
                                {/* PESTAÑA 4: REGLAS DE NEGOCIO Y CATÁLOGO    */}
                                {/* ========================================== */}
                                {activeTab === 'rules' && (
                                    <>
                                        <CategorySorter storeId={store.id} initialOrder={store.categories_order} />

                                        {/* DESCUENTO MAYORISTA */}
                                        {store?.store_type !== 'restaurant' && (
                                            <section className="bg-white p-6 md:p-8 rounded-xl border border-neutral-200/60 space-y-4">
                                                <div
                                                    className="flex items-center justify-between cursor-pointer"
                                                    onClick={() => handleWholesaleChange('active', !wholesale.active)}
                                                >
                                                    <div className="space-y-0.5">
                                                        <p className="font-semibold text-xs text-neutral-950 flex items-center gap-1.5">
                                                            <ShoppingBag size={14} strokeWidth={1.5} className="text-neutral-500" /> Descuento Mayorista Automático
                                                        </p>
                                                        <p className="text-xs text-neutral-500 font-normal pr-4">Aplica reducciones globales inmediatas en el checkout según el volumen de compra.</p>
                                                    </div>
                                                    <AnimatedSwitch active={wholesale.active} />
                                                </div>

                                                {wholesale.active && (
                                                    <div className="grid grid-cols-2 gap-4 pt-4 mt-4 border-t border-neutral-100">
                                                        <div>
                                                            <label className="text-[10px] font-semibold text-neutral-500 uppercase tracking-wider mb-1.5 block">Cantidad Mínima</label>
                                                            <div className="max-w-[150px]">
                                                                <NumberInput
                                                                    value={wholesale.min_items}
                                                                    onChangeValue={(val) => handleWholesaleChange('min_items', val)}
                                                                    className="w-full bg-white border border-neutral-200/80 rounded-md py-1.5 px-2.5 text-xs font-semibold text-neutral-950 focus:border-neutral-950 outline-none"
                                                                />
                                                            </div>
                                                        </div>
                                                        <div>
                                                            <label className="text-[10px] font-semibold text-neutral-500 uppercase tracking-wider mb-1.5 block">Tasa de Descuento</label>
                                                            <div className="relative max-w-[150px]">
                                                                <NumberInput
                                                                    value={wholesale.discount_percentage}
                                                                    onChangeValue={(val) => handleWholesaleChange('discount_percentage', val)}
                                                                    className="w-full bg-white border border-neutral-200/80 rounded-md py-1.5 pl-2.5 pr-7 text-xs font-semibold text-neutral-950 focus:border-neutral-950 outline-none"
                                                                />
                                                                <Percent size={11} strokeWidth={1.5} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-neutral-400" />
                                                            </div>
                                                        </div>
                                                    </div>
                                                )}
                                            </section>
                                        )}

                                        {/* RED DE PROMOTORES */}
                                        <section className="bg-white p-6 md:p-8 rounded-xl border border-neutral-200/60 space-y-4">
                                            <div
                                                className="flex items-center justify-between cursor-pointer"
                                                onClick={() => handleAffiliateChange('active', !affiliate.active)}
                                            >
                                                <div className="space-y-0.5">
                                                    <p className="font-semibold text-xs text-neutral-950 flex items-center gap-1.5">
                                                        <Users size={14} strokeWidth={1.5} className="text-neutral-500" /> Red de Promotores (Afiliación)
                                                    </p>
                                                    <p className="text-xs text-neutral-500 font-normal pr-4">Habilite comisiones para colaboradores que recomienden formalmente su negocio.</p>
                                                </div>
                                                <AnimatedSwitch active={affiliate.active} />
                                            </div>

                                            {affiliate.active && (
                                                <div className="grid grid-cols-2 gap-4 pt-4 mt-4 border-t border-neutral-100">
                                                    <div>
                                                        <label className="text-[10px] font-semibold text-neutral-500 uppercase tracking-wider mb-1.5 block">Comisión del Promotor</label>
                                                        <div className="relative max-w-[150px]">
                                                            <NumberInput
                                                                value={affiliate.global_commission_pct}
                                                                onChangeValue={(val) => handleAffiliateChange('global_commission_pct', val)}
                                                                className="w-full bg-white border border-neutral-200/80 rounded-md py-1.5 pl-2.5 pr-7 text-xs font-semibold text-neutral-950 focus:border-neutral-950 outline-none"
                                                            />
                                                            <Percent size={11} strokeWidth={1.5} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-neutral-400" />
                                                        </div>
                                                    </div>
                                                    <div>
                                                        <label className="text-[10px] font-semibold text-neutral-500 uppercase tracking-wider mb-1.5 block">Descuento al Comprador</label>
                                                        <div className="relative max-w-[150px]">
                                                            <NumberInput
                                                                value={affiliate.buyer_discount_pct}
                                                                onChangeValue={(val) => handleAffiliateChange('buyer_discount_pct', val)}
                                                                className="w-full bg-white border border-neutral-200/80 rounded-md py-1.5 pl-2.5 pr-7 text-xs font-semibold text-neutral-950 focus:border-neutral-950 outline-none"
                                                            />
                                                            <Percent size={11} strokeWidth={1.5} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-neutral-400" />
                                                        </div>
                                                    </div>
                                                </div>
                                            )}
                                        </section>
                                    </>
                                )}
                            </motion.div>
                        </AnimatePresence>
                    </div>

                </div>

            </div>

            {/* MODAL DE CAMBIO DE MODELO */}
            <SwitchStoreTypeModal
                isOpen={isSwitchModalOpen}
                onClose={() => setIsSwitchModalOpen(false)}
                onConfirm={handleConfirmSwitchStoreType}
                currentType={store?.store_type || 'retail'}
                loading={switchingType}
            />

        {/* MODAL EDITORIAL DE CAMBIOS SIN GUARDAR (ESTILO JIRON DESIGN / CERO SOMBRAS) */}
            <AnimatePresence>
                {showUnsavedModal && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="absolute inset-0 bg-neutral-950/40 backdrop-blur-xs"
                            onClick={handleStay}
                        />

                        <motion.div
                            initial={{ opacity: 0, scale: 0.98, y: 10 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.98, y: 10 }}
                            transition={{ duration: 0.16, ease: "easeOut" }}
                            className="relative w-full max-w-sm sm:max-w-md bg-white border border-neutral-200/80 rounded-2xl overflow-hidden z-10"
                        >
                            {/* 1. CABECERA: ACCIÓN CONCRETA + BOTÓN CERRAR */}
                            <div className="flex items-center justify-between px-5 py-4 border-b border-neutral-100">
                                <h3 className="text-sm sm:text-base font-bold text-neutral-950 tracking-tight">
                                    ¿Descartar cambios?
                                </h3>
                                <button
                                    type="button"
                                    onClick={handleStay}
                                    className="p-1 text-neutral-400 hover:text-neutral-950 rounded-lg hover:bg-neutral-100 transition-colors"
                                    title="Cerrar y seguir editando"
                                >
                                    <X size={15} strokeWidth={1.75} />
                                </button>
                            </div>

                            {/* 2. CUERPO: CONSECUENCIA DIRECTA E IRREVERSIBLE */}
                            <div className="px-5 py-5 sm:py-6">
                                <p className="text-xs sm:text-sm text-neutral-600 leading-relaxed font-normal">
                                    Se perderán las modificaciones recientes realizadas en esta sección. No se puede deshacer.
                                </p>
                            </div>

                            {/* 3. LÍNEA DIVISORIA Y ACCIONES CON VERBOS CLAROS */}
                            <div className="px-5 py-3.5 border-t border-neutral-100 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2 bg-neutral-50/30">
                                <button
                                    type="button"
                                    onClick={handleStay}
                                    className="order-3 sm:order-1 px-4 py-2.5 rounded-xl text-xs font-semibold text-neutral-500 hover:text-neutral-950 hover:bg-neutral-100 transition-colors text-center"
                                >
                                    Cancelar
                                </button>

                                <div className="order-1 sm:order-2 flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                                    <button
                                        type="button"
                                        onClick={handleDiscardAndProceed}
                                        className="px-4 py-2.5 rounded-xl text-xs font-semibold bg-white border border-neutral-200/90 text-neutral-800 hover:bg-neutral-50 hover:border-neutral-300 transition-all active:scale-[0.98] text-center"
                                    >
                                        Descartar
                                    </button>

                                    <button
                                        type="button"
                                        onClick={handleSaveAndProceed}
                                        disabled={saving}
                                        className="px-4.5 py-2.5 rounded-xl text-xs font-semibold bg-neutral-950 text-white hover:bg-black transition-all active:scale-[0.98] flex items-center justify-center gap-1.5 disabled:opacity-50"
                                    >
                                        {saving ? <Loader2 size={12} className="animate-spin" /> : null}
                                        <span>Guardar y salir</span>
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    )
}