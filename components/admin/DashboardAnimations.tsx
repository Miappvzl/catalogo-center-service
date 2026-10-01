'use client';

import { motion } from 'framer-motion';
import { ReactNode } from 'react';

export function BentoGridWrapper({ children }: { children: ReactNode }) {
    return (
        <motion.div
            initial="hidden"
            animate="show"
            variants={{
                hidden: { opacity: 0 },
                show: {
                    opacity: 1,
                    transition: {
                        staggerChildren: 0.08, // Efecto cascada entre tarjetas
                        delayChildren: 0.1,
                    }
                }
            }}
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4"
        >
            {children}
        </motion.div>
    );
}

export function FadeInBlock({ children, className }: { children: ReactNode, className?: string }) {
    return (
        <motion.div
            variants={{
                hidden: { opacity: 0, y: 30, scale: 0.98 },
                show: {
                    opacity: 1,
                    y: 0,
                    scale: 1,
                    transition: { type: "spring", stiffness: 350, damping: 25 }
                }
            }}
            className={className}
        >
            {children}
        </motion.div>
    );
}