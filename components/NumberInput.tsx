// Archivo: components/NumberInput.tsx
'use client';

import { useState, useEffect } from 'react';

// 🚀 CAMBIO CLAVE: Hacemos Omit a 'value' y le decimos que acepte números O strings vacíos
interface Props extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange' | 'value'> {
  value?: number | ''; 
  onChangeValue?: (value: number) => void;
}

export const NumberInput = ({ value, onChangeValue, className, ...props }: Props) => {
  // 1. ESTADO VISUAL: Evaluamos tanto el 0 matemático como el string vacío de tu formulario
  const [displayValue, setDisplayValue] = useState<string | number>(
    value === 0 || value === '' ? '' : (value ?? '')
  );

  // 2. SINCRONIZACIÓN MAESTRA
  useEffect(() => {
    // Si viene un string vacío de tu estado, lo tratamos como 0 matemáticamente
    const numericValue = value === '' ? 0 : Number(value);
    
    if (value !== undefined && numericValue !== Number(displayValue)) {
      setDisplayValue(numericValue === 0 ? '' : numericValue);
    }
  }, [value, displayValue]);

  // 3. INTERCEPTOR DE EVENTOS
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawValue = e.target.value;
    
    setDisplayValue(rawValue);

    if (onChangeValue) {
      onChangeValue(rawValue === '' ? 0 : Number(rawValue));
    }
  };

  return (
    <input
      {...props}
      type="number"
      value={displayValue}
      onChange={handleChange}
      onWheel={(e) => e.currentTarget.blur()}
      onKeyDown={(e) => (e.key === 'ArrowUp' || e.key === 'ArrowDown') && e.preventDefault()}
      className={`[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none ${className || ''}`}
    />
  );
};