'use client'

import { useState, useEffect, useRef } from 'react'
import { 
    Save, 
    Loader2, 
    Phone, 
    Globe, 
    Store, 
    Upload, 
    AlertTriangle, 
    Percent, 
    Receipt, 
    LogOut, 
    Users, 
    FileText, 
    CheckCircle2, 
    Zap, 
    Edit2, 
    ShoppingBag,
    Image as ImageIcon,
    Building2,
    ShieldAlert,
    ChevronRight,
    MapPin,
    AlertCircle,
    Truck,
    ShieldCheck,
    EyeOff,
    Eye,
    KeyRound,
    Lock
} from 'lucide-react'
import { useRouter } from 'next/navigation'
import { getSupabase } from '@/lib/supabase-client'
import { compressImage } from '@/utils/imageOptimizer'
import Swal from 'sweetalert2'
import { motion } from 'framer-motion'
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

// Switch Premium con comportamiento elástico ultra-clean (tipo Stripe/Apple)
const AnimatedSwitch = ({ active, activeColor = 'bg-neutral-900' }: { active: boolean, activeColor?: string }) => (
    <div className={`w-10 h-5.5 rounded-full border flex items-center px-0.5 shrink-0 transition-colors duration-200 cursor-pointer ${active ? `${activeColor} border-transparent justify-end` : 'bg-neutral-100 border-neutral-200 justify-start'}`}>
        <motion.div 
            layout 
            transition={{ type: "spring", stiffness: 600, damping: 30 }} 
            className="w-4.5 h-4.5 rounded-full bg-white shadow-xs" 
        />
    </div>
)

export default function SettingsPage() {
    const supabase = getSupabase()
    const router = useRouter()
    const [loading, setLoading] = useState(true)
    const [store, setStore] = useState<any>(null)

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
    
    const [isDirty, setIsDirty] = useState(false)
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

    const saveSettings = async () => {
        if (!isDirty) return
        setSaving(true)

      const updatedShippingConfig = {
            ...shippingRaw,
            service_badge: serviceConfig.service_badge,
            service_title: serviceConfig.service_title,
            service_desc: serviceConfig.service_desc,
            national_shipping_is_free: nationalShippingFree // 🚀 GUARDADO EN BD
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
        } else {
            await revalidateStoreCache()
            setIsDirty(false)
            const Toast = Swal.mixin({
                toast: true, position: 'top-end', showConfirmButton: false, timer: 2000,
                customClass: { popup: 'bg-neutral-900 text-white rounded-xl text-xs font-semibold shadow-sm' }
            })
            Toast.fire({ icon: 'success', title: 'Cambios guardados con éxito' })
        }
    }

    if (loading) return <div className="h-screen flex items-center justify-center bg-[#FAFAFC]"><Loader2 className="animate-spin text-neutral-300" size={24} /></div>

    const handleLogout = async () => {
        await supabase.auth.signOut()
        router.push('/login')
    }

    return (
        // Se cambió max-w-5xl a max-w-6xl para acercar más los elementos a la pantalla
        <div className="pb-32 font-sans text-neutral-900 bg-[#FAFAFC] min-h-screen overflow-x-hidden w-full max-w-[100vw] antialiased">
            <AdminHeader store={store} title="Configuración" />

            <div className="max-w-6xl mx-auto px-4 md:px-8 space-y-8 mt-6">

                <div className="space-y-6">
                    
                    {/* BRAND IDENTITY */}
                    <section className="bg-white p-6 md:p-8 rounded-xl shadow-[0_1px_3px_rgba(0,0,0,0.01)] space-y-6">
                        <div>
                          <div className="flex items-center gap-2 text-neutral-900">
                              <Globe size={18} className="text-neutral-500" />
                              <h2 className="text-base font-bold tracking-tight">Identidad de Marca</h2>
                          </div>
                          <p className="text-xs text-neutral-400 mt-1">Defina el nombre oficial, logotipo y aspecto público de su comercio.</p>
                        </div>

                       

                        {/* BRAND FIELDS */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                            <div>
                                <label className="text-[11px] font-semibold text-neutral-400 uppercase tracking-wider mb-2 block flex items-center gap-1">
                                    <Store size={12} className="text-neutral-400" /> Nombre Comercial
                                </label>
                                <input
                                    value={identity.name}
                                    onChange={e => handleIdentityChange('name', e.target.value)}
                                    className="w-full bg-neutral-50/50 border border-neutral-200/75 rounded-lg px-3.5 py-2.5 text-xs font-semibold text-neutral-900 focus:bg-white focus:border-neutral-400 outline-none transition-all"
                                />
                            </div>
                            <div>
                                <label className="text-[11px] font-semibold text-neutral-400 uppercase tracking-wider mb-2 block flex items-center gap-1">
                                    <Phone size={12} className="text-neutral-400" /> WhatsApp de Atención
                                </label>
                                <input
                                    type="tel"
                                    inputMode="numeric"
                                    value={identity.phone}
                                    onChange={e => handleIdentityChange('phone', e.target.value.replace(/[^0-9]/g, ''))}
                                    placeholder="Ej: 584120000000"
                                    className="w-full bg-neutral-50/50 border border-neutral-200/75 rounded-lg px-3.5 py-2.5 text-xs font-mono font-medium text-neutral-900 focus:bg-white focus:border-neutral-400 outline-none transition-all"
                                />
                            </div>
                        </div>

                      
                    </section>

                    {/* MODELO DE OPERACIÓN Y ESPECIALIZACIÓN */}
                    <section className="bg-white p-6 md:p-8 rounded-xl shadow-[0_1px_3px_rgba(0,0,0,0.01)] space-y-5">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-neutral-100">
                            <div>
                                <div className="flex items-center gap-2 text-neutral-900">
                                    <Store size={18} className="text-neutral-500" />
                                    <h2 className="text-base font-bold tracking-tight">Modelo de Operación</h2>
                                </div>
                                <p className="text-xs text-neutral-400 mt-1">
                                    Define la arquitectura de catálogo, editor de productos y logística de compra.
                                </p>
                            </div>

                           <button
                                type="button"
                                onClick={() => setIsSwitchModalOpen(true)}
                                disabled={saving || switchingType}
                                className="px-4 py-2 bg-neutral-50 hover:bg-neutral-100 border border-neutral-200 text-neutral-900 rounded-lg text-xs font-bold tracking-wide transition-all self-start sm:self-auto shrink-0 active:scale-95"
                            >
                                {store?.store_type === 'restaurant' 
                                    ? 'Cambiar a Comercio General' 
                                    : 'Cambiar a Modo Restaurante'}
                            </button>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className={`p-4.5 rounded-xl border flex flex-col justify-between transition-all ${
                                store?.store_type !== 'restaurant' 
                                    ? 'bg-neutral-950 text-white border-neutral-950 shadow-xs' 
                                    : 'bg-neutral-50/50 border-neutral-200/60 text-neutral-600'
                            }`}>
                                <div>
                                    <span className="text-[10px] font-mono font-bold uppercase tracking-wider block mb-1 opacity-70">
                                        Modo Actual
                                    </span>
                                    <h3 className="text-sm font-bold tracking-tight">Comercio General (Retail)</h3>
                                    <p className="text-xs mt-1.5 opacity-80 leading-relaxed font-normal">
                                        Optimizado para ropa, calzado, tecnología y artículos con gestión de stock unitario, tallas y envíos por agencias nacionales.
                                    </p>
                                </div>
                            </div>

                            <div className={`p-4.5 rounded-xl border flex flex-col justify-between transition-all ${
                                store?.store_type === 'restaurant' 
                                    ? 'bg-neutral-950 text-white border-neutral-950 shadow-xs' 
                                    : 'bg-neutral-50/50 border-neutral-200/60 text-neutral-600'
                            }`}>
                                <div>
                                    <span className="text-[10px] font-mono font-bold uppercase tracking-wider block mb-1 opacity-70">
                                        Modo Especializado
                                    </span>
                                    <h3 className="text-sm font-bold tracking-tight">Gastronomía & Restaurantes</h3>
                                    <p className="text-xs mt-1.5 opacity-80 leading-relaxed font-normal">
                                        Menú líquido vertical continuo, modificadores de platos (términos, extras), control de horarios en vivo, pedidos en mesa y propinas.
                                    </p>
                                </div>
                            </div>
                        </div>
                    </section>

                    {/* DATOS FISCALES (CON ACENTOS MUTED) */}
                    <section className="bg-white p-6 md:p-8 rounded-xl shadow-[0_1px_3px_rgba(0,0,0,0.01)] space-y-6">
                        <div>
                          <div className="flex items-center gap-2 text-neutral-900">
                              <Building2 size={18} className="text-neutral-500" />
                              <h2 className="text-base font-bold tracking-tight">Datos Fiscales y Facturación</h2>
                          </div>
                          <p className="text-xs text-neutral-400 mt-1">Ajuste la información jurídica aplicable a las facturas electrónicas y órdenes de presupuesto.</p>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                            <div>
                                <label className="text-[11px] font-semibold text-neutral-400 uppercase tracking-wider mb-2 block">Razón Social Jurídica</label>
                                <input
                                    value={fiscal.legal_name}
                                    onChange={e => { setFiscal({ ...fiscal, legal_name: e.target.value }); setIsDirty(true) }}
                                    placeholder="Ej: Inversiones Preziso C.A."
                                    className="w-full bg-neutral-50/50 border border-neutral-200/75 rounded-lg px-3.5 py-2.5 text-xs font-semibold text-neutral-900 focus:bg-white focus:border-neutral-400 outline-none transition-all"
                                />
                            </div>
                            <div>
                                <label className="text-[11px] font-semibold text-neutral-400 uppercase tracking-wider mb-2 block">Identificación Fiscal (RIF)</label>
                                <input
                                    value={fiscal.legal_id}
                                    onChange={e => { setFiscal({ ...fiscal, legal_id: e.target.value.toUpperCase() }); setIsDirty(true) }}
                                    placeholder="Ej: J-123456789"
                                    className="w-full bg-neutral-50/50 border border-neutral-200/75 rounded-lg px-3.5 py-2.5 text-xs font-mono font-semibold text-neutral-900 focus:bg-white focus:border-neutral-400 outline-none transition-all"
                                />
                            </div>
                            <div className="md:col-span-2">
                                <label className="text-[11px] font-semibold text-neutral-400 uppercase tracking-wider mb-2 block flex items-center gap-1">
                                    <MapPin size={12} className="text-neutral-400" /> Dirección de Domicilio Fiscal
                                </label>
                                <input
                                    value={fiscal.fiscal_address}
                                    onChange={e => { setFiscal({ ...fiscal, fiscal_address: e.target.value }); setIsDirty(true) }}
                                    placeholder="Ej: Av. Francisco de Miranda, Torre Este, Local 2, Caracas"
                                    className="w-full bg-neutral-50/50 border border-neutral-200/75 rounded-lg px-3.5 py-2.5 text-xs font-semibold text-neutral-900 focus:bg-white focus:border-neutral-400 outline-none transition-all"
                                />
                            </div>
                        </div>

                        {/* SELECTOR DE PERFIL FISCAL (REDISEÑADO CLEAN) */}
                        <div className="pt-4 border-t border-neutral-100">
                            <label className="text-[11px] font-semibold text-neutral-400 uppercase tracking-wider mb-3.5 block">Clasificación Contributiva (Providencia SENIAT)</label>
                            
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
                                            className={`cursor-pointer p-4 rounded-lg border transition-all flex flex-col justify-between min-h-[90px] ${isSelected ? 'bg-neutral-900 border-neutral-900 text-white shadow-xs' : 'bg-neutral-50/50 border-neutral-200 hover:bg-neutral-50 text-neutral-800'}`}
                                        >
                                            <div className="flex justify-between items-start w-full gap-2 mb-2">
                                                <h3 className="font-bold text-[11px] uppercase tracking-wider leading-tight">{p.title}</h3>
                                                {isSelected && <CheckCircle2 size={13} className="text-white shrink-0" />}
                                            </div>
                                            <p className={`text-[10px] leading-relaxed ${isSelected ? 'text-neutral-400' : 'text-neutral-400'}`}>{p.desc}</p>
                                        </div>
                                    )
                                })}
                            </div>

                            {/* Alícuota Input con bloqueo de rango */}
                            {fiscal.fiscal_profile !== 'informal' && (
                                <div className="mt-4 p-4 bg-neutral-50/60 border border-neutral-200 rounded-lg flex items-center justify-between animate-in fade-in slide-in-from-top-2 duration-200">
                                    <div className="space-y-0.5">
                                        <p className="text-xs font-semibold text-neutral-800">Impuesto al Valor Agregado (IVA)</p>
                                        <p className="text-[10px] text-neutral-400">Rango legal general de acuerdo al marco legal venezolano.</p>
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
                                            className="w-full bg-white border border-neutral-200 rounded-md py-1.5 pl-2 pr-7 text-xs font-bold text-neutral-900 text-center focus:border-neutral-400 outline-none transition-colors"
                                        />
                                        <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] text-neutral-400 font-bold pointer-events-none">%</span>
                                    </div>
                                </div>
                            )}
                        </div>
                    </section>
{/* PERSONALIZACIÓN DE SERVICIOS (SOLO RETAIL / COMERCIO GENERAL) */}
                    {store?.store_type !== 'restaurant' && (
                        <section className="bg-white p-6 md:p-8 rounded-xl shadow-[0_1px_3px_rgba(0,0,0,0.01)] space-y-6">
                            <div>
                                <div className="flex items-center gap-2 text-neutral-900">
                                    <Zap size={18} className="text-neutral-500" />
                                    <h2 className="text-base font-bold tracking-tight">Servicios e Intangibles</h2>
                                </div>
                                <p className="text-xs text-neutral-400 mt-1">Configure las descripciones y mensajes para productos que no exigen entrega física o logística tradicional.</p>
                            </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                            <div>
                                <label className="text-[11px] font-semibold text-neutral-400 uppercase tracking-wider mb-2 flex justify-between">
                                    <span>Etiqueta del carrito</span>
                                    <span className={`text-[10px] font-mono ${serviceConfig.service_badge.length >= 20 ? 'text-rose-600' : 'text-neutral-300'}`}>
                                        {serviceConfig.service_badge.length}/20
                                    </span>
                                </label>
                                <input
                                    maxLength={20}
                                    value={serviceConfig.service_badge}
                                    onChange={e => { setServiceConfig({ ...serviceConfig, service_badge: e.target.value }); setIsDirty(true) }}
                                    placeholder="Ej: Se consume en tienda"
                                    className="w-full bg-neutral-50/50 border border-neutral-200/75 rounded-lg px-3.5 py-2.5 text-xs font-semibold text-neutral-900 focus:bg-white focus:border-neutral-400 outline-none transition-all"
                                />
                            </div>
                            <div>
                                <label className="text-[11px] font-semibold text-neutral-400 uppercase tracking-wider mb-2 flex justify-between">
                                    <span>Título de aviso en checkout</span>
                                    <span className={`text-[10px] font-mono ${serviceConfig.service_title.length >= 30 ? 'text-rose-600' : 'text-neutral-300'}`}>
                                        {serviceConfig.service_title.length}/30
                                    </span>
                                </label>
                                <input
                                    maxLength={30}
                                    value={serviceConfig.service_title}
                                    onChange={e => { setServiceConfig({ ...serviceConfig, service_title: e.target.value }); setIsDirty(true) }}
                                    placeholder="Ej: Taller en Vivo"
                                    className="w-full bg-neutral-50/50 border border-neutral-200/75 rounded-lg px-3.5 py-2.5 text-xs font-semibold text-neutral-900 focus:bg-white focus:border-neutral-400 outline-none transition-all"
                                />
                            </div>
                            <div className="md:col-span-2">
                                <label className="text-[11px] font-semibold text-neutral-400 uppercase tracking-wider mb-2 flex justify-between">
                                    <span>Indicaciones del Servicio</span>
                                    <span className={`text-[10px] font-mono ${serviceConfig.service_desc.length >= 120 ? 'text-rose-600' : 'text-neutral-300'}`}>
                                        {serviceConfig.service_desc.length}/120
                                    </span>
                                </label>
                                <textarea
                                    maxLength={120}
                                    rows={2}
                                    value={serviceConfig.service_desc}
                                    onChange={e => { setServiceConfig({ ...serviceConfig, service_desc: e.target.value }); setIsDirty(true) }}
                                    placeholder="Ej: El carrito contiene servicios. Una vez procesado el pago nos contactaremos para agendar."
                                    className="w-full bg-neutral-50/50 border border-neutral-200/75 rounded-lg px-3.5 py-2.5 text-xs font-medium text-neutral-900 focus:bg-white focus:border-neutral-400 outline-none transition-all resize-none"
                                />
                            </div>
                        </div>
                       </section>
                    )}

                    {/* REGLAS DE NEGOCIO (COLORES DIFERENCIADORES SUTILES) */}
                    <section className="bg-white p-6 md:p-8 rounded-xl shadow-[0_1px_3px_rgba(0,0,0,0.01)] space-y-6">
                        <div>
                          <div className="flex items-center gap-2 text-neutral-900">
                              <Percent size={18} className="text-neutral-500" />
                              <h2 className="text-base font-bold tracking-tight">Parámetros Operativos</h2>
                          </div>
                          <p className="text-xs text-neutral-400 mt-1">Configure incentivos automáticos, mayoristas y restricciones de validez de compra.</p>
                        </div>

                        {/* AFILIADOS (COLOR ACENTO: MUTED INDIGO/LAVENDER) */}
                        <div className="bg-neutral-50 p-4.5 rounded-lg border border-neutral-200/50">
                            <div
                                className="flex items-center justify-between cursor-pointer"
                                onClick={() => handleAffiliateChange('active', !affiliate.active)}
                            >
                                <div className="space-y-0.5">
                                    <p className="font-semibold text-xs text-neutral-900 flex items-center gap-1.5">
                                        <Users size={14} className="text-indigo-600" /> Red de Promotores (Afiliación)
                                    </p>
                                    <p className="text-xs text-neutral-400 pr-4">Habilite comisiones para terceros que recomienden formalmente su negocio.</p>
                                </div>
                                <AnimatedSwitch active={affiliate.active} activeColor="bg-indigo-600" />
                            </div>

                            {affiliate.active && (
                                <div className="grid grid-cols-2 gap-4 animate-in fade-in slide-in-from-top-2 duration-200 pt-4 mt-4 border-t border-neutral-200/60">
                                    <div>
                                        <label className="text-[10px] font-semibold text-neutral-400 uppercase tracking-wider mb-1.5 block">Comisión del Promotor</label>
                                        <div className="relative max-w-[150px]">
                                            <NumberInput
                                                value={affiliate.global_commission_pct}
                                                onChangeValue={(val) => handleAffiliateChange('global_commission_pct', val)}
                                                className="w-full bg-white border border-neutral-200 rounded-md py-1.5 pl-2.5 pr-7 text-xs font-bold text-neutral-900 focus:border-neutral-400 outline-none"
                                            />
                                            <Percent size={11} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-neutral-400" />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="text-[10px] font-semibold text-neutral-400 uppercase tracking-wider mb-1.5 block">Descuento al Comprador</label>
                                        <div className="relative max-w-[150px]">
                                            <NumberInput
                                                value={affiliate.buyer_discount_pct}
                                                onChangeValue={(val) => handleAffiliateChange('buyer_discount_pct', val)}
                                                className="w-full bg-white border border-neutral-200 rounded-md py-1.5 pl-2.5 pr-7 text-xs font-bold text-neutral-900 focus:border-neutral-400 outline-none"
                                            />
                                            <Percent size={11} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-neutral-400" />
                                        </div>
                                    </div>
                                    <div className="col-span-2 pt-1">
                                        <p className="text-[11px] text-indigo-700/80 bg-indigo-50/50 p-2 rounded-md border border-indigo-100/40">
                                            💡 <strong>Estrategia recomendada:</strong> Un descuento de cara al cliente final estimula el uso del código del promotor en lugar de una compra estándar directa.
                                        </p>
                                    </div>
                                </div>
                            )}
                        </div>

                       {/* MAYORISTA (SOLO RETAIL) */}
                        {store?.store_type !== 'restaurant' && (
                            <div className="bg-neutral-50 p-4.5 rounded-lg border border-neutral-200/50">
                                <div
                                    className="flex items-center justify-between cursor-pointer"
                                    onClick={() => handleWholesaleChange('active', !wholesale.active)}
                                >
                                    <div className="space-y-0.5">
                                        <p className="font-semibold text-xs text-neutral-900 flex items-center gap-1.5">
                                            <ShoppingBag size={14} className="text-emerald-600" /> Descuento Mayorista Automático
                                        </p>
                                        <p className="text-xs text-neutral-400 pr-4">Aplica reducciones globales inmediatas en el checkout según el volumen de compra.</p>
                                    </div>
                                    <AnimatedSwitch active={wholesale.active} activeColor="bg-emerald-600" />
                                </div>

                                {wholesale.active && (
                                    <div className="grid grid-cols-2 gap-4 animate-in fade-in slide-in-from-top-2 duration-200 pt-4 mt-4 border-t border-neutral-200/60">
                                        <div>
                                            <label className="text-[10px] font-semibold text-neutral-400 uppercase tracking-wider mb-1.5 block">Cantidad Mínima</label>
                                            <div className="max-w-[150px]">
                                                <NumberInput
                                                    value={wholesale.min_items}
                                                    onChangeValue={(val) => handleWholesaleChange('min_items', val)}
                                                    className="w-full bg-white border border-neutral-200 rounded-md py-1.5 px-2.5 text-xs font-bold text-neutral-900 focus:border-neutral-400 outline-none"
                                                />
                                            </div>
                                        </div>
                                        <div>
                                            <label className="text-[10px] font-semibold text-neutral-400 uppercase tracking-wider mb-1.5 block">Tasa de Descuento</label>
                                            <div className="relative max-w-[150px]">
                                                <NumberInput
                                                    value={wholesale.discount_percentage}
                                                    onChangeValue={(val) => handleWholesaleChange('discount_percentage', val)}
                                                    className="w-full bg-white border border-neutral-200 rounded-md py-1.5 pl-2.5 pr-7 text-xs font-bold text-neutral-900 focus:border-neutral-400 outline-none"
                                                />
                                                <Percent size={11} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-neutral-400" />
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}

                   

                        {/* COMPROBANTES (COLOR ACENTO: MUTED BLUE) */}
                        <div className="bg-neutral-50 p-4.5 rounded-lg border border-neutral-200/50">
                            <div 
                                className="flex items-center justify-between cursor-pointer" 
                                onClick={() => { setReceipt({ strict_mode: !receipt.strict_mode }); setIsDirty(true) }}
                            >
                                <div className="space-y-0.5 pr-4">
                                    <p className="font-semibold text-xs text-neutral-900 flex items-center gap-1.5">
                                        <Receipt size={14} className="text-blue-600" /> Comprobante de Pago Mandatario
                                    </p>
                                    <p className="text-xs text-neutral-400">Restringe el envío de solicitudes de orden en WhatsApp si no se carga el capture bancario correspondiente.</p>
                                </div>
                                <AnimatedSwitch active={receipt.strict_mode} activeColor="bg-blue-600" />
                            </div>
                        </div>
                        {/* GUARDADO DE CAMBIOS INTEGRADO (FLAT STYLE) */}
                        <div className="mt-6 pt-5 border-t border-neutral-100 flex flex-col sm:flex-row justify-between items-center gap-4">
                            <div className="flex items-center gap-2 text-xs font-medium">
                                {isDirty ? (
                                    <span className="inline-flex items-center gap-1.5 text-amber-700 bg-amber-50 px-2.5 py-1 rounded">
                                        <AlertCircle size={12} />
                                        Modificaciones pendientes de confirmar
                                    </span>
                                ) : (
                                    <span className="text-neutral-400">Alineación de datos en orden.</span>
                                )}
                            </div>
                            
                            <button 
                                onClick={saveSettings} 
                                disabled={saving || !isDirty} 
                                className={`w-full sm:w-auto px-5 py-2.5 rounded-lg text-xs font-semibold flex items-center justify-center gap-2 transition-all ${isDirty ? 'bg-neutral-950 text-white hover:bg-black active:scale-[0.98]' : 'bg-neutral-100 text-neutral-400 cursor-not-allowed'}`}
                            >
                                {saving ? <Loader2 className="animate-spin" size={13} /> : <Save size={13} />} 
                                <span>Guardar Identidad y Reglas</span>
                            </button>
                        </div>
                   </section>

                  
                </div>

      {/* COMPONENTES SECUNDARIOS */}
                {store?.store_type === 'restaurant' && (
    <StoreHoursSettings storeId={store.id} initialData={store.store_hours} />
)}
                <PayPalSetupCard storeId={store.id} />
                <PaymentSettings storeId={store.id} initialData={store.payment_config} />
                <ShippingSettings storeId={store.id} initialData={store.shipping_config} storeType={store.store_type} />
                <CategorySorter storeId={store.id} initialOrder={store.categories_order} />

                  {/* 🚀 SEGURIDAD Y ACCESO (CAMBIO DE CONTRASEÑA SEGURO) */}
                    <section className="bg-white p-6 md:p-8 rounded-xl shadow-[0_1px_3px_rgba(0,0,0,0.01)] space-y-6">
                        <div>
                            <div className="flex items-center gap-2 text-neutral-900">
                                <Lock size={18} className="text-neutral-500" />
                                <h2 className="text-base font-bold tracking-tight">Seguridad de la Cuenta</h2>
                            </div>
                            <p className="text-xs text-neutral-400 mt-1">Actualice la contraseña de acceso a su panel administrativo de manera segura.</p>
                        </div>

                        <form onSubmit={handleUpdatePassword} className="space-y-4 max-w-2xl">
                            {/* Clave Actual */}
                            <div>
                                <label className="text-[11px] font-semibold text-neutral-400 uppercase tracking-wider mb-2 block flex items-center gap-1">
                                    <KeyRound size={12} className="text-neutral-400" /> Contraseña Actual
                                </label>
                                <div className="relative">
                                    <input
                                        type={showPasswords.current ? "text" : "password"}
                                        value={passwords.current}
                                        onChange={e => setPasswords({ ...passwords, current: e.target.value })}
                                        placeholder="Ingrese su clave actual para verificar identidad"
                                        className="w-full bg-neutral-50/50 border border-neutral-200/75 rounded-lg pl-3.5 pr-10 py-2.5 text-xs font-semibold text-neutral-900 focus:bg-white focus:border-neutral-400 outline-none transition-all"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPasswords(prev => ({ ...prev, current: !prev.current }))}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600 transition-colors"
                                    >
                                        {showPasswords.current ? <EyeOff size={14} /> : <Eye size={14} />}
                                    </button>
                                </div>
                            </div>

                            {/* Nueva Clave y Confirmación en Grid */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="text-[11px] font-semibold text-neutral-400 uppercase tracking-wider mb-2 block">
                                        Nueva Contraseña
                                    </label>
                                    <div className="relative">
                                        <input
                                            type={showPasswords.new ? "text" : "password"}
                                            value={passwords.new}
                                            onChange={e => setPasswords({ ...passwords, new: e.target.value })}
                                            placeholder="Mínimo 8 caracteres"
                                            className="w-full bg-neutral-50/50 border border-neutral-200/75 rounded-lg pl-3.5 pr-10 py-2.5 text-xs font-semibold text-neutral-900 focus:bg-white focus:border-neutral-400 outline-none transition-all"
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowPasswords(prev => ({ ...prev, new: !prev.new }))}
                                            className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600 transition-colors"
                                        >
                                            {showPasswords.new ? <EyeOff size={14} /> : <Eye size={14} />}
                                        </button>
                                    </div>
                                </div>
                                <div>
                                    <label className="text-[11px] font-semibold text-neutral-400 uppercase tracking-wider mb-2 block">
                                        Confirmar Nueva Contraseña
                                    </label>
                                    <input
                                        type="password"
                                        value={passwords.confirm}
                                        onChange={e => setPasswords({ ...passwords, confirm: e.target.value })}
                                        placeholder="Repita su nueva contraseña"
                                        className="w-full bg-neutral-50/50 border border-neutral-200/75 rounded-lg px-3.5 py-2.5 text-xs font-semibold text-neutral-900 focus:bg-white focus:border-neutral-400 outline-none transition-all"
                                    />
                                </div>
                            </div>

                            {/* Botón de Acción Aislado */}
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
                                    {updatingPassword ? <Loader2 className="animate-spin" size={13} /> : <ShieldCheck size={13} />} 
                                    <span>Actualizar Contraseña</span>
                                </button>
                            </div>
                        </form>
                    </section>

                {/* BOTÓN CERRAR SESIÓN */}
                <button 
                    onClick={handleLogout} 
                    className="flex items-center justify-center gap-2 px-4 py-3 rounded-lg text-xs font-semibold bg-white border border-neutral-200/60 text-rose-600 hover:bg-rose-50 hover:border-rose-200 hover:text-rose-700 transition-colors w-full text-center"
                >
                    <LogOut size={13} /> 
                    <span>Finalizar sesión actual</span>
                </button>
            </div>
            {/* 🚀 MODAL NATIVO DE CONFIRMACIÓN DE CAMBIO DE MODELO */}
            <SwitchStoreTypeModal
                isOpen={isSwitchModalOpen}
                onClose={() => setIsSwitchModalOpen(false)}
                onConfirm={handleConfirmSwitchStoreType}
                currentType={store?.store_type || 'retail'}
                loading={switchingType}
            />
        </div>
    )
}