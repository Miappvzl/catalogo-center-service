'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Zap, ExternalLink, KeyRound, Eye, EyeOff, Loader2, CheckCircle2, ShieldCheck, X, ChevronRight } from 'lucide-react';
import Swal from 'sweetalert2';
import { Icon } from '@iconify/react';

interface PayPalSetupCardProps {
    storeId: string;
    initialIsActive?: boolean; 
}

export default function PayPalSetupCard({ storeId, initialIsActive = false }: PayPalSetupCardProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [isActive, setIsActive] = useState(initialIsActive);
    
    // Formulario
    const [clientId, setClientId] = useState('');
    const [secretKey, setSecretKey] = useState('');
    const [showSecret, setShowSecret] = useState(false);
    const [isSaving, setIsSaving] = useState(false);

    const handleSave = async () => {
        if (!clientId || !secretKey) {
            return Swal.fire({
                title: 'Campos vacíos', 
                text: 'Debes rellenar ambas credenciales para continuar.', 
                icon: 'warning',
                confirmButtonColor: '#171717',
                customClass: { popup: 'rounded-xl font-sans text-xs' }
            });
        }

        setIsSaving(true);
        try {
            const response = await fetch('/api/admin/settings/paypal', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    storeId, 
                    clientId, 
                    secretKey, 
                    isActive: true 
                })
            });

            const data = await response.json();

            if (!data.success) {
                throw new Error(data.error);
            }

            setIsActive(true);
            setIsOpen(false);
            setClientId(''); 
            setSecretKey('');
            
            const Toast = Swal.mixin({ 
                toast: true, 
                position: 'top-end', 
                showConfirmButton: false, 
                timer: 3000, 
                customClass: { popup: 'bg-neutral-900 text-white rounded-xl text-xs border border-neutral-800 font-semibold' }
            });
            Toast.fire({ icon: 'success', title: 'PayPal activado exitosamente' });

        } catch (error: any) {
            Swal.fire({
                title: 'Error de Configuración',
                text: error.message,
                icon: 'error',
                confirmButtonColor: '#171717',
                customClass: { popup: 'rounded-xl font-sans text-xs' }
            });
        } finally {
            setIsSaving(false);
        }
    };

    const PayPalIcon = ({ className, size }: any) => (
        <Icon
            icon="simple-icons:paypal"
            className={className}
            width={size}
            height={size}
        />
    );

    return (
        <>
            {/* TARJETA EN PANEL DE MÉTODOS DE PAGO */}
            <div className="bg-white border border-neutral-200/50 p-6 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-[0_1px_3px_rgba(0,0,0,0.01)] hover:border-neutral-300 transition-colors relative overflow-hidden">
                <div className="flex items-center gap-4 relative z-10">
                    {/* El color del contenedor del icono cambia sutilmente al estar activo */}
                    <div className={`w-11 h-11 rounded-lg flex items-center justify-center border transition-colors ${isActive ? 'bg-blue-50 border-blue-100 text-blue-600' : 'bg-neutral-50 border-neutral-200/60 text-neutral-400'}`}>
                        <PayPalIcon size={18} />
                    </div>
                    <div className="space-y-0.5">
                        <div className="flex items-center gap-2">
                            <h3 className="font-bold text-xs text-neutral-900 tracking-tight">Pasarela Automática: PayPal</h3>
                            {isActive && (
                                <span className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-700 border border-emerald-100/40 text-[10px] font-semibold px-2 py-0.5 rounded">
                                    <CheckCircle2 size={10} />
                                    Activo
                                </span>
                            )}
                        </div>
                        <p className="text-xs text-neutral-400">Reciba pagos internacionales con confirmación de orden instantánea.</p>
                    </div>
                </div>

                <button 
                    onClick={() => setIsOpen(true)}
                    className={`shrink-0 px-4 py-2 rounded-lg text-xs font-semibold transition-all shadow-xs active:scale-[0.98] ${isActive ? 'bg-white border border-neutral-200 text-neutral-700 hover:bg-neutral-50' : 'bg-neutral-950 text-white hover:bg-black'}`}
                >
                    {isActive ? 'Actualizar Credenciales' : 'Configurar Cuenta'}
                </button>
            </div>

            {/* MODAL "SLIDE-OVER" UNIFICADO MONOCROMÁTICO */}
            <AnimatePresence>
                {isOpen && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6">
                        <motion.div 
                            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} 
                            onClick={() => !isSaving && setIsOpen(false)}
                            className="absolute inset-0 bg-neutral-900/30 backdrop-blur-xs"
                        />
                        
                        <motion.div 
                            initial={{ scale: 0.98, opacity: 0, y: 10 }} 
                            animate={{ scale: 1, opacity: 1, y: 0 }} 
                            exit={{ scale: 0.98, opacity: 0, y: 10 }}
                            className="relative bg-white w-full max-w-4xl rounded-2xl overflow-hidden shadow-[0_15px_50px_-15px_rgba(0,0,0,0.1)] flex flex-col md:flex-row max-h-[90vh] border border-neutral-200/60"
                        >
                            {/* LADO IZQUIERDO: TUTORIAL EDITORIAL OFF-WHITE */}
                            <div className="bg-neutral-50/80 w-full md:w-5/12 p-8 md:p-10 flex flex-col justify-between border-b md:border-b-0 md:border-r border-neutral-200/60 shrink-0 relative">
                                <div className="space-y-6">
                                    <div className="bg-white border border-neutral-200 shadow-xs w-9 h-9 rounded-lg flex items-center justify-center text-neutral-700">
                                        <ShieldCheck size={16} />
                                    </div>
                                    <div className="space-y-1.5">
                                        <h2 className="text-base font-bold text-neutral-900 tracking-tight">Vincular cuenta PayPal</h2>
                                        <p className="text-xs text-neutral-400 leading-relaxed font-medium">
                                            Reciba pagos sin intermediarios. Los fondos se depositan de inmediato en su cuenta de PayPal Business.
                                        </p>
                                    </div>

                                    {/* Pasos de configuración */}
                                    <div className="space-y-5">
                                        <div className="flex gap-3 items-start">
                                            <div className="w-5 h-5 rounded-full bg-white border border-neutral-200 text-neutral-800 flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5">1</div>
                                            <p className="text-xs text-neutral-500 leading-relaxed font-medium">
                                                Inicie sesión en el <a href="https://developer.paypal.com/dashboard/applications" target="_blank" rel="noreferrer" className="text-neutral-800 font-semibold underline decoration-neutral-300 hover:decoration-neutral-800 transition-colors inline-flex items-center gap-0.5">Portal de desarrollador <ExternalLink size={10} /></a>.
                                            </p>
                                        </div>
                                        <div className="flex gap-3 items-start">
                                            <div className="w-5 h-5 rounded-full bg-white border border-neutral-200 text-neutral-800 flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5">2</div>
                                            <p className="text-xs text-neutral-500 leading-relaxed font-medium">
                                                Cambie el selector superior a la pestaña <strong className="text-neutral-800 font-semibold">Live</strong> (en producción) y presione "Create App".
                                            </p>
                                        </div>
                                        <div className="flex gap-3 items-start">
                                            <div className="w-5 h-5 rounded-full bg-white border border-neutral-200 text-neutral-800 flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5">3</div>
                                            <p className="text-xs text-neutral-500 leading-relaxed font-medium">
                                                Copie el <strong className="text-neutral-800 font-semibold">Client ID</strong> y su <strong className="text-neutral-800 font-semibold">Secret Key 1</strong> para completarlos en el formulario.
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* LADO DERECHO: FORMULARIO */}
                            <div className="flex-1 p-8 md:p-10 flex flex-col bg-white overflow-y-auto">
                                <div className="flex justify-between items-center mb-8">
                                    <h3 className="font-bold text-sm text-neutral-900 tracking-tight uppercase tracking-wider">Credenciales de Integración</h3>
                                    <button onClick={() => !isSaving && setIsOpen(false)} className="p-1.5 text-neutral-400 hover:text-neutral-900 bg-neutral-50 hover:bg-neutral-100 rounded-full transition-colors">
                                        <X size={15} />
                                    </button>
                                </div>

                                <div className="space-y-5 flex-1">
                                    <div>
                                        <label className="text-[11px] font-semibold text-neutral-400 uppercase tracking-wider mb-2 block">Client ID (Público)</label>
                                        <input 
                                            type="text" 
                                            value={clientId}
                                            onChange={(e) => setClientId(e.target.value)}
                                            placeholder="Ej: AW4x_R1..." 
                                            className="w-full bg-neutral-50/50 border border-neutral-200 rounded-lg px-3.5 py-2.5 text-xs font-mono font-medium text-neutral-900 focus:bg-white focus:border-neutral-400 outline-none transition-all placeholder:text-neutral-300"
                                        />
                                    </div>

                                    <div>
                                        <label className="text-[11px] font-semibold text-neutral-400 uppercase tracking-wider mb-2 block flex items-center gap-1">
                                            <KeyRound size={12} className="text-neutral-400" /> Secret Key (Privado)
                                        </label>
                                        <div className="relative">
                                            <input 
                                                type={showSecret ? "text" : "password"} 
                                                value={secretKey}
                                                onChange={(e) => setSecretKey(e.target.value)}
                                                placeholder="Pega tu clave secreta de producción aquí" 
                                                className="w-full bg-neutral-50/50 border border-neutral-200 rounded-lg pl-3.5 pr-10 py-2.5 text-xs font-mono font-medium text-neutral-900 focus:bg-white focus:border-neutral-400 outline-none transition-all placeholder:text-neutral-300"
                                            />
                                            <button 
                                                onClick={() => setShowSecret(!showSecret)}
                                                className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-900 transition-colors p-1"
                                            >
                                                {showSecret ? <EyeOff size={14} /> : <Eye size={14} />}
                                            </button>
                                        </div>
                                        <div className="flex items-center gap-1.5 text-[10px] text-neutral-400 mt-2 font-medium">
                                            <ShieldCheck size={12} className="text-neutral-400" />
                                            <span>La credencial secreta se almacena bajo encriptación de grado militar en la base de datos.</span>
                                        </div>
                                    </div>
                                </div>

                                <div className="mt-8 pt-6 border-t border-neutral-100 flex justify-end gap-2.5">
                                    <button 
                                        onClick={() => setIsOpen(false)} 
                                        disabled={isSaving}
                                        className="px-4 py-2 rounded-lg text-xs font-semibold text-neutral-500 hover:bg-neutral-50 transition-colors disabled:opacity-50"
                                    >
                                        Cancelar
                                    </button>
                                    <button 
                                        onClick={handleSave}
                                        disabled={isSaving}
                                        className="bg-neutral-950 text-white px-5 py-2 rounded-lg text-xs font-semibold hover:bg-black active:scale-[0.98] transition-all flex items-center gap-1.5 disabled:opacity-70 disabled:cursor-not-allowed shadow-xs"
                                    >
                                        {isSaving ? <Loader2 size={13} className="animate-spin" /> : <CheckCircle2 size={13} />}
                                        {isSaving ? 'Vinculando...' : 'Guardar e Integrar'}
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </>
    );
}