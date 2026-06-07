'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Zap, ExternalLink, KeyRound, Eye, EyeOff, Loader2, CheckCircle2, ShieldCheck, X } from 'lucide-react';
import Swal from 'sweetalert2';

interface PayPalSetupCardProps {
    storeId: string;
    // Si ya tiene PayPal activo, puedes pasar esto como true
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
            return Swal.fire('Campos vacíos', 'Debes pegar ambas credenciales para continuar.', 'warning');
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
                    isActive: true // Al configurarlo, lo activamos por defecto
                })
            });

            const data = await response.json();

            if (!data.success) {
                throw new Error(data.error);
            }

            setIsActive(true);
            setIsOpen(false);
            setClientId(''); // Limpiamos memoria
            setSecretKey('');
            
            const Toast = Swal.mixin({ toast: true, position: 'top-end', showConfirmButton: false, timer: 3000, customClass: { popup: 'bg-black text-white rounded-xl' }});
            Toast.fire({ icon: 'success', title: 'PayPal activado exitosamente' });

        } catch (error: any) {
            Swal.fire('Error de Configuración', error.message, 'error');
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <>
            {/* LA TARJETA EN EL PANEL DE MÉTODOS DE PAGO */}
            <div className="bg-zinc-50 border border-zinc-200 p-5 rounded-[var(--radius-card)] flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-colors hover:border-zinc-300 relative overflow-hidden">
                {/* Decoración sutil Dark Tech */}
                <div className="absolute -right-10 -top-10 w-32 h-32 bg-blue-500/5 blur-3xl rounded-full pointer-events-none"></div>

                <div className="flex items-center gap-4 relative z-10">
                    <div className={`p-3 rounded-xl border ${isActive ? 'bg-black border-black text-white' : 'bg-white border-zinc-200 text-zinc-900 shadow-sm'}`}>
                        <Zap size={24} className={isActive ? 'fill-white' : ''} />
                    </div>
                    <div>
                        <div className="flex items-center gap-2 mb-0.5">
                            <h3 className="font-black text-sm text-zinc-900 tracking-tight">Pasarela Automática: PayPal</h3>
                            {isActive && <span className="bg-emerald-100 text-emerald-700 text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full">Activo</span>}
                        </div>
                        <p className="text-xs font-medium text-zinc-500">Recibe pagos internacionales con confirmación instantánea.</p>
                    </div>
                </div>

                <button 
                    onClick={() => setIsOpen(true)}
                    className={`shrink-0 px-5 py-2.5 rounded-[var(--radius-btn)] text-xs font-bold transition-all shadow-sm active:scale-95 ${isActive ? 'bg-white border border-zinc-200 text-zinc-900 hover:bg-zinc-100' : 'bg-black text-white hover:bg-zinc-800'}`}
                >
                    {isActive ? 'Actualizar Credenciales' : 'Configurar'}
                </button>
            </div>

            {/* EL MODAL "SLIDE-OVER" (GLASSMORPHISM & DARK TECH) */}
            <AnimatePresence>
                {isOpen && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6">
                        <motion.div 
                            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} 
                            onClick={() => !isSaving && setIsOpen(false)}
                            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
                        />
                        
                        <motion.div 
                            initial={{ scale: 0.95, opacity: 0, y: 20 }} 
                            animate={{ scale: 1, opacity: 1, y: 0 }} 
                            exit={{ scale: 0.95, opacity: 0, y: 20 }}
                            className="relative bg-white w-full max-w-4xl rounded-[32px] overflow-hidden shadow-2xl flex flex-col md:flex-row max-h-[90vh]"
                        >
                            {/* LADO IZQUIERDO: EL TUTORIAL EDITORIAL */}
                            <div className="bg-zinc-900 w-full md:w-5/12 p-8 md:p-10 flex flex-col justify-between relative overflow-hidden shrink-0">
                                {/* Decoración de fondo */}
                                <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/10 blur-3xl rounded-full pointer-events-none translate-x-1/2 -translate-y-1/2"></div>
                                
                                <div className="relative z-10">
                                    <div className="bg-white/10 w-fit p-2 rounded-xl mb-6 border border-white/5">
                                        <ShieldCheck size={24} className="text-white" />
                                    </div>
                                    <h2 className="text-2xl font-black text-white tracking-tight mb-2">Conecta tu cuenta</h2>
                                    <p className="text-sm text-zinc-400 font-medium leading-relaxed mb-8">
                                        Para habilitar pagos automáticos sin intermediarios, vincularemos tu cuenta de PayPal Business directamente a tu tienda.
                                    </p>

                                    <div className="space-y-6">
                                        <div className="flex gap-4 items-start">
                                            <div className="w-6 h-6 rounded-full bg-white text-black flex items-center justify-center text-xs font-black shrink-0 mt-0.5">1</div>
                                            <p className="text-xs text-zinc-300 leading-relaxed">
                                                Abre el <a href="https://developer.paypal.com/dashboard/applications" target="_blank" rel="noreferrer" className="text-white font-bold underline decoration-zinc-600 hover:decoration-white transition-colors">Panel de Desarrollador de PayPal <ExternalLink size={10} className="inline mb-0.5"/></a> e inicia sesión.
                                            </p>
                                        </div>
                                        <div className="flex gap-4 items-start">
                                            <div className="w-6 h-6 rounded-full bg-white text-black flex items-center justify-center text-xs font-black shrink-0 mt-0.5">2</div>
                                            <p className="text-xs text-zinc-300 leading-relaxed">
                                                Asegúrate de estar en la pestaña <strong className="text-white">Live</strong> (no Sandbox) y haz clic en "Create App".
                                            </p>
                                        </div>
                                        <div className="flex gap-4 items-start">
                                            <div className="w-6 h-6 rounded-full bg-white text-black flex items-center justify-center text-xs font-black shrink-0 mt-0.5">3</div>
                                            <p className="text-xs text-zinc-300 leading-relaxed">
                                                Copia tu <strong className="text-white">Client ID</strong> y tu <strong className="text-white">Secret Key 1</strong> y pégalos aquí a la derecha.
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* LADO DERECHO: LA ACCIÓN */}
                            <div className="flex-1 p-8 md:p-10 flex flex-col bg-white overflow-y-auto">
                                <div className="flex justify-between items-center mb-8">
                                    <h3 className="font-black text-lg text-zinc-900 tracking-tight">Credenciales API</h3>
                                    <button onClick={() => !isSaving && setIsOpen(false)} className="p-2 text-zinc-400 hover:text-zinc-900 bg-zinc-50 hover:bg-zinc-100 rounded-full transition-colors">
                                        <X size={18} />
                                    </button>
                                </div>

                                <div className="space-y-5 flex-1">
                                    <div>
                                        <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-2 block ml-1">Client ID (Público)</label>
                                        <input 
                                            type="text" 
                                            value={clientId}
                                            onChange={(e) => setClientId(e.target.value)}
                                            placeholder="Ej: AW4x_R1..." 
                                            className="w-full bg-zinc-50 border border-zinc-200 focus:bg-white focus:border-black focus:ring-1 focus:ring-black rounded-xl px-4 py-3.5 text-sm font-mono font-medium text-zinc-900 outline-none transition-all placeholder:text-zinc-300"
                                        />
                                    </div>

                                    <div>
                                        <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-2 block ml-1 flex items-center gap-1.5">
                                            <KeyRound size={12} /> Secret Key (Privado)
                                        </label>
                                        <div className="relative group">
                                            <input 
                                                type={showSecret ? "text" : "password"} 
                                                value={secretKey}
                                                onChange={(e) => setSecretKey(e.target.value)}
                                                placeholder="Pega tu clave secreta aquí" 
                                                className="w-full bg-zinc-50 border border-zinc-200 focus:bg-white focus:border-black focus:ring-1 focus:ring-black rounded-xl pl-4 pr-12 py-3.5 text-sm font-mono font-medium text-zinc-900 outline-none transition-all placeholder:text-zinc-300"
                                            />
                                            <button 
                                                onClick={() => setShowSecret(!showSecret)}
                                                className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-900 transition-colors p-1"
                                            >
                                                {showSecret ? <EyeOff size={16} /> : <Eye size={16} />}
                                            </button>
                                        </div>
                                        <p className="text-[10px] text-zinc-400 mt-2 ml-1 font-medium">Esta clave será encriptada con grado militar antes de guardarse. Ni siquiera nosotros podremos verla.</p>
                                    </div>
                                </div>

                                <div className="mt-8 pt-6 border-t border-zinc-100 flex justify-end gap-3">
                                    <button 
                                        onClick={() => setIsOpen(false)} 
                                        disabled={isSaving}
                                        className="px-5 py-3 rounded-xl text-xs font-bold text-zinc-500 hover:bg-zinc-50 transition-colors disabled:opacity-50"
                                    >
                                        Cancelar
                                    </button>
                                    <button 
                                        onClick={handleSave}
                                        disabled={isSaving}
                                        className="bg-black text-white px-8 py-3 rounded-xl text-xs font-bold hover:opacity-90 active:scale-95 transition-all shadow-xl shadow-black/10 flex items-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
                                    >
                                        {isSaving ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle2 size={16} />}
                                        {isSaving ? 'Validando...' : 'Guardar y Activar'}
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