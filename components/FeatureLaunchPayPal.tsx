'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { Icon } from '@iconify/react';

export default function FeatureLaunchPayPal() {
    const [isOpen, setIsOpen] = useState(false);
    const router = useRouter();

    useEffect(() => {
        // Verificamos si el usuario ya vio el anuncio
        const hasSeen = localStorage.getItem('preziso_paypal_launched');
        if (!hasSeen) {
            // Un ligero retraso para no ser agresivos con la carga inicial
            const timer = setTimeout(() => setIsOpen(true), 1200);
            return () => clearTimeout(timer);
        }
    }, []);

    const PayPalIcon = ({ className, size }: any) => (
        <Icon
            icon="simple-icons:paypal"
            className={className}
            width={size}
            height={size}
        />
    );

    const handleClose = () => {
        localStorage.setItem('preziso_paypal_launched', 'true');
        setIsOpen(false);
    };

    const handleGo = () => {
        localStorage.setItem('preziso_paypal_launched', 'true');
        setIsOpen(false);
        // Redirigimos al panel de configuración
        router.push('/admin/settings');
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
                    {/* Fondo oscuro desenfocado */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
                        onClick={handleClose}
                    />

                    {/* Contenedor principal: Cero bordes, cero sombras, fondo blanco */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 20 }}
                        className="relative bg-white w-full max-w-sm rounded-[32px] p-10 flex flex-col items-center text-center border-none shadow-none overflow-hidden"
                    >
                        <button
                            onClick={handleClose}
                            className="absolute top-6 right-6 text-gray-400 hover:text-black transition-colors"
                        >
                            <X size={20} />
                        </button>

                        {/* Logo Oficial PayPal */}
<div className="mb-6 flex justify-center">
                            <PayPalIcon size={48} />
</div>

                        <h2 className="text-2xl font-black text-black tracking-tight mb-3">
                            Ahora PayPal integrado en Preziso
                        </h2>
                        
                        <p className="text-sm font-medium text-gray-500 mb-8 leading-relaxed px-2">
                            Ingresa aquí para configurar tus llaves y activar los pagos internacionales automáticos en tu tienda.
                        </p>

                        <button 
                            onClick={handleGo}
                            className="w-full bg-black text-white text-lg font-black tracking-wide py-4 rounded-2xl hover:scale-[0.98] active:scale-95 transition-transform"
                        >
                            IR
                        </button>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
}