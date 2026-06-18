'use client'

import { useState, useEffect, useRef } from 'react'
import { Save, Loader2, Phone, Globe, Store, Upload, AlertTriangle, Percent, Receipt, LogOut, Users, FileText, CheckCircle, CheckCircle2, Zap } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { getSupabase } from '@/lib/supabase-client'
import { compressImage } from '@/utils/imageOptimizer'
import Swal from 'sweetalert2'
import { motion } from 'framer-motion'
import { revalidateStoreCache } from '@/app/admin/actions'
import PaymentSettings from '@/components/admin/PaymentSettings'
import ShippingSettings from '@/components/admin/ShippingSettings'
import AdminHeader from '@/components/admin/AdminHeader'
import SecuritySettings from '@/components/admin/SecuritySettings'
import PushNotificationManager from '@/components/admin/PushNotificationManager'
import CategorySorter from '@/components/admin/CategorySorter'
import Image from 'next/image'
import { getOptimizedUrl } from '@/utils/cdn'
import { NumberInput } from '@/components/NumberInput'
import PayPalSetupCard from '@/components/admin/PayPalSetupCard'

const AnimatedSwitch = ({ active, activeColor = 'bg-black' }: { active: boolean, activeColor?: string }) => (
    <div className={`w-11 h-6 rounded-full border flex items-center px-1 shrink-0 transition-colors duration-300 ${active ? `${activeColor} border-transparent justify-end shadow-subtle` : 'bg-white border-gray-200 justify-start shadow-sm'}`}>
        <motion.div layout transition={{ type: "spring", stiffness: 500, damping: 30 }} className={`w-4 h-4 rounded-full ${active ? 'bg-white' : 'bg-gray-300'}`} />
    </div>
)

export default function SettingsPage() {
    const supabase = getSupabase()
    const router = useRouter()
    const [loading, setLoading] = useState(true)
    const [store, setStore] = useState<any>(null)

    // Estados de Configuración
    const [identity, setIdentity] = useState({ phone: '', name: '', hero_url: '' })
    const [wholesale, setWholesale] = useState({ active: false, min_items: 6, discount_percentage: 15 })
    const [receipt, setReceipt] = useState({ strict_mode: false })

    // 🚀 NUEVO: Estado del Programa de Afiliados
    const [affiliate, setAffiliate] = useState({ active: false, global_commission_pct: 5, buyer_discount_pct: 5 })
    // 🚀 NUEVO: Estado Fiscal
    // 🚀 CORRECCIÓN TYPESCRIPT: Declaramos 'fiscal_profile' en el estado inicial
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

    // 🚀 NUEVO: Mantenemos el backup de shipping_config para no sobreescribir métodos de envío
    const [shippingRaw, setShippingRaw] = useState<any>({})

    // 🚀 NUEVO: Estado aislado para la UI de Servicios
    const [serviceConfig, setServiceConfig] = useState({
        service_badge: '',
        service_title: '',
        service_desc: ''
    })

    useEffect(() => {
        const fetchSettings = async () => {
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) return

            const { data } = await supabase.from('stores').select('*').eq('user_id', user.id).single()
            if (data) {
                setStore(data)
                setIdentity({ phone: data.phone || '', name: data.name, hero_url: data.hero_url || '' })
                setWholesale(data.wholesale_config || { active: false, min_items: 6, discount_percentage: 15 })
                setReceipt(data.receipt_config || { strict_mode: false })
                // 🚀 NUEVO: Inicializamos el estado desde la BD
                setAffiliate(data.affiliate_config || { active: false, global_commission_pct: 5, buyer_discount_pct: 5 })
                setShippingRaw(data.shipping_config || {})
                setServiceConfig({
                    service_badge: data.shipping_config?.service_badge || 'Se consume en tienda',
                    service_title: data.shipping_config?.service_title || 'Servicio / Experiencia',
                    service_desc: data.shipping_config?.service_desc || 'Los artículos de tu carrito corresponden a servicios. No requieren logística de envío.'
                })

                // 🚀 NUEVO: Cargar datos fiscales (Actualizado)
                setFiscal({
                    legal_name: data.legal_name || '',
                    legal_id: data.legal_id || '',
                    fiscal_address: data.fiscal_address || '',
                    fiscal_profile: data.fiscal_profile || 'informal', // 🚀 NUEVO
                    default_tax_percentage: data.default_tax_percentage ?? 16
                })
            }
            setLoading(false)
        }
        fetchSettings()
    }, [supabase])

    const handleIdentityChange = (field: string, value: string) => {
        const finalValue = field === 'phone' ? value.replace(/\D/g, '') : value
        setIdentity(prev => ({ ...prev, [field]: finalValue }))
        setIsDirty(true)
    }

    const handleWholesaleChange = (field: string, value: any) => {
        setWholesale(prev => ({ ...prev, [field]: value }))
        setIsDirty(true)
    }

    // 🚀 NUEVO: Manejador de cambios para Afiliados
    const handleAffiliateChange = (field: string, value: any) => {
        setAffiliate(prev => ({ ...prev, [field]: value }))
        setIsDirty(true)
    }

    const handleHeroUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files || e.target.files.length === 0) return

        const file = e.target.files[0]
        if (!file.type.startsWith('image/')) return Swal.fire('Error', 'Solo imágenes', 'error')

        // 🚀 ELITE GATEKEEPER: Validación estricta de dimensiones físicas en memoria
        try {
            const dimensions = await new Promise<{ width: number, height: number }>((resolve, reject) => {
                const img = new window.Image();
                img.onload = () => {
                    URL.revokeObjectURL(img.src); // Limpiamos la memoria del navegador inmediatamente
                    resolve({ width: img.width, height: img.height });
                };
                img.onerror = () => reject('Error al leer la imagen');
                img.src = URL.createObjectURL(file);
            });

            // Validación innegociable de la regla de diseño
            if (dimensions.width !== 1920 || dimensions.height !== 600) {
                if (heroInputRef.current) heroInputRef.current.value = ''; // Reseteamos el input para evitar bloqueos
                return Swal.fire({
                    title: 'Arquitectura Comprometida',
                    html: `El diseño de la tienda exige que el banner mida exactamente <b>1920x600 píxeles</b>.<br><br>Tu imagen mide <b style="color: #ef4444;">${dimensions.width}x${dimensions.height}</b>.`,
                    icon: 'warning',
                    confirmButtonColor: '#000',
                    confirmButtonText: 'Corregir diseño'
                });
            }
        } catch (error) {
            return Swal.fire('Error', 'El archivo de imagen está corrupto o no se puede leer.', 'error');
        }

        // Si pasa el Gatekeeper, iniciamos la carga
        setUploadingHero(true)
        try {
            // Se mantiene el compresor para optimizar el peso (KBs), aunque las dimensiones ya son correctas
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

    const saveSettings = async () => {
        if (!isDirty) return
        setSaving(true)

        // 🚀 EMPAQUETADO SEGURO: Fusionamos lo visual con lo logístico sin destruir datos
        const updatedShippingConfig = {
            ...shippingRaw,
            service_badge: serviceConfig.service_badge,
            service_title: serviceConfig.service_title,
            service_desc: serviceConfig.service_desc
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
                shipping_config: updatedShippingConfig // 🚀 GUARDAMOS LA FUSIÓN
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
                customClass: { popup: 'bg-black text-white rounded-xl text-sm font-bold' }
            })
            Toast.fire({ icon: 'success', title: 'Configuración Guardada' })
        }
    }

    if (loading) return <div className="h-screen flex items-center justify-center"><Loader2 className="animate-spin text-gray-400" size={32} /></div>

    const handleLogout = async () => {
        await supabase.auth.signOut()
        router.push('/login')
    }

    return (
        <div className="pb-32 font-sans text-gray-900 bg-[#F6F6F6] min-h-screen overflow-x-hidden w-full max-w-[100vw]">
            <AdminHeader store={store} title="Configuración" />

            <div className="max-w-5xl mx-auto px-4 md:px-6 space-y-6 md:space-y-8 mt-6 md:mt-8">

                <div className="space-y-6">
                    <section className="bg-white p-4 md:p-8 rounded-[var(--radius-card)] card-interactive">
                        <div className="mb-6">
                            <h3 className="text-lg font-black text-gray-900 flex items-center gap-2"><Globe size={20} className="text-black" /> Identidad de Marca</h3>
                            <p className="text-sm text-gray-500 mt-1">La información pública que verán tus clientes.</p>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                            <div>
                                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2 ml-1 flex items-center gap-1"><Store size={12} /> Nombre de la Tienda</label>
                                <input
                                    value={identity.name}
                                    onChange={e => handleIdentityChange('name', e.target.value)}
                                    className="w-full bg-[#f6f6f6] border border-transparent rounded-[var(--radius-btn)] px-4 py-3 font-bold text-gray-900 focus:bg-white focus:border-black focus:shadow-subtle outline-none transition-all"
                                />
                            </div>
                            <div>
                                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2 ml-1 flex items-center gap-1"><Phone size={12} /> WhatsApp Oficial</label>
                                <input
                                    type="tel"
                                    inputMode="numeric"
                                    value={identity.phone}
                                    onChange={e => handleIdentityChange('phone', e.target.value.replace(/[^0-9]/g, ''))}
                                    placeholder="Ej: 584120000000"
                                    className="w-full bg-[#f6f6f6] border border-transparent rounded-[var(--radius-btn)] px-4 py-3 font-mono font-medium text-gray-900 focus:bg-white focus:border-black focus:shadow-subtle outline-none transition-all"
                                />
                            </div>
                        </div>

                        <div className="border-t border-gray-100 pt-6">
                            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3 flex items-center gap-1"> Banner Principal (Hero)</label>
                            <input type="file" ref={heroInputRef} className="hidden" accept="image/*" onChange={handleHeroUpload} />

                            {identity.hero_url ? (
                                <div className="relative w-full h-40 md:h-48 rounded-[var(--radius-card)] overflow-hidden group border border-transparent hover:border-black transition-colors cursor-pointer" onClick={() => heroInputRef.current?.click()}>
                                    <Image src={getOptimizedUrl(identity.hero_url)} alt="Hero Banner" fill sizes="(max-width: 768px) 100vw, 896px" className="object-cover" />
                                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button className="bg-white text-black px-4 py-2.5 rounded-full text-xs font-bold shadow-subtle hover:scale-105 transition-all flex items-center gap-2">
                                            {uploadingHero ? <Loader2 className="animate-spin" size={14} /> : <Upload size={14} />} Cambiar Banner
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                <div onClick={() => heroInputRef.current?.click()} className={`w-full h-32 rounded-[var(--radius-card)] border-2 border-dashed flex flex-col items-center justify-center cursor-pointer transition-colors ${uploadingHero ? 'border-gray-300 animate-pulse bg-gray-50' : 'border-gray-200 hover:border-black bg-gray-50 hover:bg-white'}`}>
                                    {uploadingHero ? <Loader2 className="animate-spin text-gray-400 mb-2" size={24} /> : <Upload className="text-gray-400 mb-2" size={24} />}
                                    <span className="text-xs font-bold text-gray-900">Subir un Banner (1920x1080px)</span>
                                </div>
                            )}
                        </div>
                    </section>

                    {/* 🚀 NUEVA SECCIÓN: DATOS FISCALES */}
                    <section className="bg-white p-4 md:p-8 rounded-[var(--radius-card)] card-interactive">
                        <div className="mb-6">
                            <h3 className="text-lg font-black text-gray-900 flex items-center gap-2"><FileText size={20} className="text-black" /> Datos Fiscales y Facturación</h3>
                            <p className="text-sm text-gray-500 mt-1">Información legal que aparecerá en los encabezados de tus PDF (Facturas y Presupuestos).</p>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                            <div>
                                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2 ml-1 block">Razón Social Legal (Opcional)</label>
                                <input
                                    value={fiscal.legal_name}
                                    onChange={e => { setFiscal({ ...fiscal, legal_name: e.target.value }); setIsDirty(true) }}
                                    placeholder="Ej: Inversiones Preziso C.A."
                                    className="w-full bg-[#f6f6f6] border border-transparent rounded-[var(--radius-btn)] px-4 py-3 font-bold text-gray-900 focus:bg-white focus:border-black outline-none transition-all"
                                />
                            </div>
                            <div>
                                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2 ml-1 block">RIF / Documento Identidad</label>
                                <input
                                    value={fiscal.legal_id}
                                    onChange={e => { setFiscal({ ...fiscal, legal_id: e.target.value.toUpperCase() }); setIsDirty(true) }}
                                    placeholder="Ej: J-123456789"
                                    className="w-full bg-[#f6f6f6] border border-transparent rounded-[var(--radius-btn)] px-4 py-3 font-mono font-bold text-gray-900 focus:bg-white focus:border-black outline-none transition-all"
                                />
                            </div>
                            <div className="md:col-span-2">
                                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2 ml-1 block">Dirección Fiscal Exacta</label>
                                <input
                                    value={fiscal.fiscal_address}
                                    onChange={e => { setFiscal({ ...fiscal, fiscal_address: e.target.value }); setIsDirty(true) }}
                                    placeholder="Ej: Av. Principal, Edificio X, Local 4, Caracas"
                                    className="w-full bg-[#f6f6f6] border border-transparent rounded-[var(--radius-btn)] px-4 py-3 font-bold text-gray-900 focus:bg-white focus:border-black outline-none transition-all"
                                />
                            </div>
                        </div>
                        {/* 🚀 SELECTOR DE PERFIL FISCAL (Clean Look) */}
                        <div className="mt-6 pt-6 border-t border-black/5">
                            <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-4 block">Perfil de Facturación (Providencia 0071)</label>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                {[
                                    { id: 'informal', title: 'No Formalizado', desc: '0% IVA. Órdenes de Pedido sin exigencia de RIF.' },
                                    { id: 'ordinary', title: 'Ordinario', desc: 'Cobro de 16% obligatorio al comprador.' },
                                    { id: 'special', title: 'Especial', desc: '16% obligatorio + Módulo de Retenciones.' }
                                ].map(p => {
                                    const isSelected = fiscal.fiscal_profile === p.id;
                                    return (
                                        <div
                                            key={p.id}
                                            onClick={() => { setFiscal({ ...fiscal, fiscal_profile: p.id }); setIsDirty(true) }}
                                            className={`cursor-pointer p-4 rounded-xl border transition-all active:scale-95 flex flex-col gap-1 ${isSelected ? 'bg-zinc-900 border-zinc-900 text-white' : 'bg-zinc-50 border-black/5 hover:bg-zinc-100 text-zinc-900'}`}
                                        >
                                            <div className="flex justify-between items-start mb-1">
                                                <h3 className={`font-black text-xs uppercase tracking-widest ${isSelected ? 'text-white' : 'text-zinc-900'}`}>{p.title}</h3>
                                                {isSelected && <CheckCircle2 size={14} className="text-white" />}
                                            </div>
                                            <p className={`text-[10px] leading-relaxed ${isSelected ? 'text-zinc-400' : 'text-zinc-500'}`}>{p.desc}</p>
                                        </div>
                                    )
                                })}
                            </div>

                            {/* El input del porcentaje solo se muestra si NO son informales (Garantía matemática) */}
                            {fiscal.fiscal_profile !== 'informal' && (
                                <div className="mt-4 p-4 bg-zinc-50 border border-black/5 rounded-xl flex items-center justify-between animate-in fade-in slide-in-from-top-2">
                                    <div>
                                        <p className="text-xs font-bold text-zinc-900">Impuesto al Valor Agregado (IVA)</p>
                                        <p className="text-[10px] text-zinc-500 mt-0.5">Tasa general obligatoria según el BCV.</p>
                                    </div>
                                    <div className="relative w-24">
                                        <NumberInput
                                            value={fiscal.default_tax_percentage}
                                            onChangeValue={val => {
                                                let num = Number(val);
                                                // 🚀 BLINDAJE LEGAL SENIAT: No permitimos menos de 16% ni más de 16.5%
                                                if (num < 16) num = 16;
                                                if (num > 16.5) num = 16.5;

                                                setFiscal({ ...fiscal, default_tax_percentage: num });
                                                setIsDirty(true);
                                            }}
                                            className="w-full bg-white border border-black/5 rounded-lg py-2 pl-3 pr-6 text-xs font-black text-zinc-900 text-center focus:border-zinc-300 outline-none transition-colors"
                                        />
                                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-zinc-400 font-black pointer-events-none">%</span>
                                    </div>
                                </div>
                            )}
                        </div>
                    </section>

                    {/* 🚀 NUEVA SECCIÓN: PERSONALIZACIÓN DE SERVICIOS */}
                    <section className="bg-white p-4 md:p-8 rounded-[var(--radius-card)] card-interactive">
                        <div className="mb-6">
                            <h3 className="text-lg font-black text-gray-900 flex items-center gap-2">
                                <Zap size={20} className="text-black" /> Textos de Servicios / Experiencias
                            </h3>
                            <p className="text-sm text-gray-500 mt-1">
                                Personaliza cómo se le muestra al cliente los productos que no requieren logística de envío.
                            </p>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2 ml-1 flex justify-between">
                                    <span>Etiqueta en Carrito Mixto</span>
                                    <span className={serviceConfig.service_badge.length >= 20 ? 'text-red-500' : ''}>
                                        {serviceConfig.service_badge.length}/20
                                    </span>
                                </label>
                                <input
                                    maxLength={20}
                                    value={serviceConfig.service_badge}
                                    onChange={e => { setServiceConfig({ ...serviceConfig, service_badge: e.target.value }); setIsDirty(true) }}
                                    placeholder="Ej: Se consume en tienda"
                                    className="w-full bg-[#f6f6f6] border border-transparent rounded-[var(--radius-btn)] px-4 py-3 font-bold text-gray-900 focus:bg-white focus:border-black outline-none transition-all"
                                />
                            </div>
                            <div>
                                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2 ml-1 flex justify-between">
                                    <span>Título de Aviso en Checkout</span>
                                    <span className={serviceConfig.service_title.length >= 30 ? 'text-red-500' : ''}>
                                        {serviceConfig.service_title.length}/30
                                    </span>
                                </label>
                                <input
                                    maxLength={30}
                                    value={serviceConfig.service_title}
                                    onChange={e => { setServiceConfig({ ...serviceConfig, service_title: e.target.value }); setIsDirty(true) }}
                                    placeholder="Ej: Taller en Vivo"
                                    className="w-full bg-[#f6f6f6] border border-transparent rounded-[var(--radius-btn)] px-4 py-3 font-bold text-gray-900 focus:bg-white focus:border-black outline-none transition-all"
                                />
                            </div>
                            <div className="md:col-span-2">
                                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2 ml-1 flex justify-between">
                                    <span>Descripción en Checkout</span>
                                    <span className={serviceConfig.service_desc.length >= 120 ? 'text-red-500' : ''}>
                                        {serviceConfig.service_desc.length}/120
                                    </span>
                                </label>
                                <textarea
                                    maxLength={120}
                                    rows={2}
                                    value={serviceConfig.service_desc}
                                    onChange={e => { setServiceConfig({ ...serviceConfig, service_desc: e.target.value }); setIsDirty(true) }}
                                    placeholder="Ej: Has reservado una experiencia. Te esperamos en nuestras instalaciones."
                                    className="w-full bg-[#f6f6f6] border border-transparent rounded-[var(--radius-btn)] px-4 py-3 font-medium text-gray-900 focus:bg-white focus:border-black outline-none transition-all resize-none"
                                />
                            </div>
                        </div>
                    </section>

                    <section className="bg-white p-4 md:p-8 rounded-[var(--radius-card)] card-interactive">
                        <div className="mb-6">
                            <h3 className="text-lg font-black text-gray-900 flex items-center gap-2"><Percent size={20} className="text-black" /> Reglas de Negocio</h3>
                            <p className="text-sm text-gray-500 mt-1">Gamifica tus ventas y asegura tus pagos.</p>
                        </div>

                        {/* 🚀 NUEVO: PROGRAMA DE AFILIADOS */}
                        <div className="bg-[#f6f6f6] p-5 rounded-[var(--radius-card)] mb-6 border border-transparent">
                            <div
                                className="flex items-center justify-between mb-4 cursor-pointer active:scale-[0.99] transition-transform"
                                onClick={() => handleAffiliateChange('active', !affiliate.active)}
                            >
                                <div>
                                    <p className="font-bold text-gray-900 text-sm flex items-center gap-1.5"><Users size={16} className="text-gray-700" /> Red de Promotores</p>
                                    <p className="text-xs text-gray-500 mt-0.5 pr-4">Permite que tus clientes ganen comisión por recomendar tus productos.</p>
                                </div>
                                <AnimatedSwitch active={affiliate.active} activeColor="bg-black" />
                            </div>

                            {affiliate.active && (
                                <div className="grid grid-cols-2 gap-4 animate-in fade-in slide-in-from-top-2 pt-4 border-t border-gray-100">
                                    <div>
                                        <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5 block">% Que gana el Promotor</label>
                                        <div className="relative">
                                            <NumberInput
                                                value={affiliate.global_commission_pct}
                                                onChangeValue={(val) => handleAffiliateChange('global_commission_pct', val)}
                                                className="w-full bg-white border border-transparent focus:border-black focus:shadow-subtle rounded-[var(--radius-btn)] pl-3 pr-8 py-2.5 font-bold outline-none transition-all"
                                            />
                                            <Percent size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5 block">% Descuento al Comprador</label>
                                        <div className="relative">
                                            <NumberInput

                                                value={affiliate.buyer_discount_pct}
                                                onChangeValue={(val) => handleAffiliateChange('buyer_discount_pct', val)}
                                                className="w-full bg-white border border-transparent focus:border-black focus:shadow-subtle rounded-[var(--radius-btn)] pl-3 pr-8 py-2.5 font-bold outline-none transition-all"
                                            />
                                            <Percent size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" />
                                        </div>
                                    </div>
                                    <div className="col-span-2 mt-1">
                                        <p className="text-[10px] font-medium text-gray-500">
                                            💡 <strong className="text-gray-700">Tip Estratégico:</strong> Dales un descuento a los compradores para forzarlos a usar el link del promotor en lugar de comprar directamente.
                                        </p>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Mayorista Gamificado */}
                        <div className="bg-[#f6f6f6] p-5 rounded-[var(--radius-card)] mb-6 border border-transparent">
                            <div
                                className="flex items-center justify-between mb-4 cursor-pointer active:scale-[0.99] transition-transform"
                                onClick={() => handleWholesaleChange('active', !wholesale.active)}
                            >
                                <div>
                                    <p className="font-bold text-gray-900 text-sm">Descuento Mayorista Automático</p>
                                    <p className="text-xs text-gray-500 mt-0.5 pr-4">Aplica un descuento global a toda la orden si superan X piezas.</p>
                                </div>
                                <AnimatedSwitch active={wholesale.active} />
                            </div>

                            {wholesale.active && (
                                <div className="grid grid-cols-2 gap-4 animate-in fade-in slide-in-from-top-2 pt-4 border-t border-gray-100">
                                    <div>
                                        <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5 block">Piezas Mínimas</label>
                                        <NumberInput

                                            value={wholesale.min_items}
                                            onChangeValue={(val) => handleWholesaleChange('min_items', val)}
                                            className="w-full bg-white border border-transparent focus:border-black focus:shadow-subtle rounded-[var(--radius-btn)] px-3 py-2.5 font-bold outline-none transition-all"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5 block">% Descuento</label>
                                        <NumberInput

                                            value={wholesale.discount_percentage}
                                            onChangeValue={(val) => handleWholesaleChange('discount_percentage', val)}
                                            className="w-full bg-white border border-transparent focus:border-black focus:shadow-subtle rounded-[var(--radius-btn)] px-3 py-2.5 font-bold outline-none transition-all"
                                        />
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Comprobantes Estrictos */}
                        <div className="bg-[#f6f6f6] p-5 rounded-[var(--radius-card)] border border-transparent">
                            <div className="flex items-center justify-between cursor-pointer active:scale-[0.99] transition-transform" onClick={() => { setReceipt({ strict_mode: !receipt.strict_mode }); setIsDirty(true) }}>
                                <div className="pr-4">
                                    <p className="font-bold text-gray-900 text-sm flex items-center gap-1.5"><Receipt size={16} /> Comprobante Obligatorio</p>
                                    <p className="text-xs text-gray-500 mt-1">El cliente NO podrá enviar el pedido a WhatsApp sin subir una captura del pago.</p>
                                </div>
                                <AnimatedSwitch active={receipt.strict_mode} />
                            </div>
                        </div>

                        <div className="mt-8 pt-5 border-t border-gray-100 flex flex-col sm:flex-row justify-between items-center gap-4">
                            <div className={`flex items-center gap-1.5 text-xs font-bold transition-colors ${isDirty ? 'text-yellow-600' : 'text-gray-400'}`}>
                                {isDirty ? <><AlertTriangle size={14} strokeWidth={2.5} /><span>Tienes cambios sin guardar aquí.</span></> : <span>Todo guardado correctamente.</span>}
                            </div>
                            <button onClick={saveSettings} disabled={saving || !isDirty} className={`w-full sm:w-auto px-6 py-3 rounded-[var(--radius-btn)] text-sm font-bold flex items-center justify-center gap-2 transition-all ${isDirty ? 'bg-black text-white hover:bg-gray-800 shadow-subtle active:scale-95' : 'bg-gray-50 border border-transparent text-gray-400 cursor-not-allowed'}`}>
                                {saving ? <Loader2 className="animate-spin" size={16} /> : <Save size={16} />} Guardar Identidad y Reglas
                            </button>
                        </div>
                    </section>
                </div>

                <PayPalSetupCard storeId={store.id} />
                <PaymentSettings storeId={store.id} initialData={store.payment_config} />
                <ShippingSettings storeId={store.id} initialData={store.shipping_config} />
                <CategorySorter storeId={store.id} initialOrder={store.categories_order} />
                <PushNotificationManager storeId={store.id} />
                <SecuritySettings />

                <button onClick={handleLogout} className="flex items-center justify-center gap-3 px-4 py-3 rounded-[var(--radius-btn)] text-[0.9rem] font-bold bg-white active:bg-red-50 active:text-red-700 text-red-500 hover:bg-red-50 hover:text-red-700 transition-all w-full text-left">
                    <LogOut size={18} /> Cerrar Sesión
                </button>
            </div>
        </div>
    )
}