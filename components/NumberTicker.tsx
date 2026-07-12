"use client";
import { motion } from "framer-motion";
import { useMemo } from "react";

// Micro-componente que controla un solo dígito (Alineación tipográfica pura)
function Digit({ char }: { char: string }) {
  // Si es un punto o una coma, se queda fijo
  if (isNaN(Number(char))) {
    return <span className="inline-block opacity-80">{char}</span>;
  }

  // Si es un número, creamos una columna del 0 al 9 y la deslizamos
  return (
    <span 
      className="inline-block relative overflow-hidden" 
      style={{ height: "1em", width: "1ch", lineHeight: "1em" }}
    >
      <motion.span
        initial={false}
        // y: -10% = 1, -20% = 2, etc. (La columna tiene 10 números, cada uno mide 10% del total)
        animate={{ y: `-${Number(char) * 10}%` }}
        transition={{ type: "spring", stiffness: 300, damping: 30, mass: 0.8 }}
        // 🚀 MEJORA: Eliminamos 'flex flex-col' para evitar colisiones de alineamiento
        className="absolute top-0 left-0 block w-full will-change-transform"
      >
        {Array.from({ length: 10 }).map((_, i) => (
          // 🚀 MEJORA: Centrado por línea de texto nativa (leading-[1em]), alineando los baselines
          <span 
            key={i} 
            className="h-[1em] block text-center leading-[1em] select-none"
          >
            {i}
          </span>
        ))}
      </motion.span>
    </span>
  );
}

export default function NumberTicker({ value }: { value: number }) {
  // Formateamos el número UNA sola vez cuando cambia el valor real
  const formatted = useMemo(() => {
    return Intl.NumberFormat("es-VE", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);
  }, [value]);

  return (
    <span className="font-mono tabular-nums tracking-tight inline-flex items-center leading-none" style={{ height: "1em" }}>
      {formatted.split("").map((char, i) => (
        // Usamos (length - i) como key. Así, si el número pasa de 99.00 a 100.00, 
        // los decimales mantienen su instancia y no hacen cortes extraños.
        <Digit key={`${formatted.length - i}`} char={char} />
      ))}
    </span>
  );
}