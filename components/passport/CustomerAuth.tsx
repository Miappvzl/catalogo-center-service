// components/passport/CustomerAuth.tsx
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { getSupabase } from '@/lib/supabase-client';
import { Mail, ArrowRight, ShieldCheck, Loader2 } from 'lucide-react';

interface CustomerAuthProps {
  storeName: string;
  onSuccess?: () => void; // Callback opcional para cerrar un modal si se usa dentro de uno
}

export default function CustomerAuth({ storeName, onSuccess }: CustomerAuthProps) {
  const router = useRouter();
  const supabase = getSupabase();
  
  const [step, setStep] = useState<'email' | 'otp'>('email');
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // PASO 1: Solicitar el código de 6 dígitos
  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !email.includes('@')) {
      setError('Por favor ingresa un correo electrónico válido.');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const { error: authError } = await supabase.auth.signInWithOtp({
        email,
        options: {
          // Evitamos redirecciones, queremos que el usuario ingrese el código aquí mismo
          shouldCreateUser: true, 
        },
      });

      if (authError) throw authError;
      
      setStep('otp');
    } catch (err: any) {
      console.error('Error enviando OTP:', err);
      setError('Hubo un problema enviando el código. Intenta de nuevo.');
    } finally {
      setIsLoading(false);
    }
  };

  // PASO 2: Verificar el código y sincronizar identidad
  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (otp.length !== 6) {
      setError('El código debe tener 6 dígitos.');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // 1. Verificar el código con Supabase Auth
      const { data: authData, error: verifyError } = await supabase.auth.verifyOtp({
        email,
        token: otp,
        type: 'email',
      });

      if (verifyError) throw verifyError;
      if (!authData.user) throw new Error('No se pudo autenticar al usuario.');

      // 2. Sincronizar Identidad Unificada (Upsert en public.customers)
      // Esto garantiza que la tabla customers tenga el registro para las llaves foráneas
      const { error: customerError } = await supabase
        .from('customers')
        .upsert({
          id: authData.user.id,
          full_name: email.split('@')[0], // Nombre temporal basado en el email
        }, { onConflict: 'id' });

      if (customerError) {
        console.error('Error sincronizando perfil:', customerError);
        // No bloqueamos el flujo si esto falla, pero lo registramos.
      }

      // 3. Éxito: Refrescar estado y redirigir/cerrar
      router.refresh();
      if (onSuccess) {
        onSuccess();
      }
      
    } catch (err: any) {
      console.error('Error verificando OTP:', err);
      setError('Código incorrecto o expirado. Intenta de nuevo.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-white p-8 sm:p-10 rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] max-w-md w-full mx-auto flex flex-col gap-8">
      {/* Header */}
      <div className="flex flex-col items-center text-center gap-3">
        <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mb-2">
          {step === 'email' ? (
            <Mail size={28} className="text-black" strokeWidth={1.5} />
          ) : (
            <ShieldCheck size={28} className="text-black" strokeWidth={1.5} />
          )}
        </div>
        <h2 className="text-2xl font-semibold text-black tracking-tight">
          {step === 'email' ? 'Ingresa a tu cuenta' : 'Verifica tu correo'}
        </h2>
        <p className="text-sm text-gray-500 font-medium max-w-[280px]">
          {step === 'email' 
            ? `Accede a tu saldo a favor y favoritos en ${storeName}.` 
            : `Hemos enviado un código de 6 dígitos a ${email}.`}
        </p>
      </div>

      {/* Formularios */}
      {step === 'email' ? (
        <form onSubmit={handleSendOtp} className="flex flex-col gap-6">
          <div className="flex flex-col gap-2">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value.trim().toLowerCase())}
              placeholder="tu@correo.com"
              required
              disabled={isLoading}
              className="w-full bg-gray-50 text-black text-lg px-5 py-4 rounded-xl outline-none focus:ring-2 focus:ring-black transition-all placeholder:text-gray-400 font-medium"
            />
            {error && <span className="text-sm text-red-500 font-medium px-1">{error}</span>}
          </div>

          <button
            type="submit"
            disabled={isLoading || !email}
            className="w-full bg-black text-white py-4 px-6 rounded-xl font-medium tracking-wide shadow-[0_8px_30px_rgb(0,0,0,0.08)] hover:bg-gray-900 active:scale-[0.98] transition-all disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {isLoading ? (
              <Loader2 size={20} className="animate-spin" />
            ) : (
              <>
                Continuar <ArrowRight size={18} />
              </>
            )}
          </button>
        </form>
      ) : (
        <form onSubmit={handleVerifyOtp} className="flex flex-col gap-6">
          <div className="flex flex-col gap-2">
            <input
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={6}
              value={otp}
              onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
              placeholder="000000"
              required
              disabled={isLoading}
              className="w-full bg-gray-50 text-black text-center text-3xl tracking-[0.5em] px-5 py-4 rounded-xl outline-none focus:ring-2 focus:ring-black transition-all placeholder:text-gray-300 font-bold"
            />
            {error && <span className="text-sm text-red-500 font-medium px-1 text-center">{error}</span>}
          </div>

          <button
            type="submit"
            disabled={isLoading || otp.length !== 6}
            className="w-full bg-black text-white py-4 px-6 rounded-xl font-medium tracking-wide shadow-[0_8px_30px_rgb(0,0,0,0.08)] hover:bg-gray-900 active:scale-[0.98] transition-all disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {isLoading ? (
              <Loader2 size={20} className="animate-spin" />
            ) : (
              'Verificar y Entrar'
            )}
          </button>

          <button
            type="button"
            onClick={() => {
              setStep('email');
              setOtp('');
              setError(null);
            }}
            disabled={isLoading}
            className="text-sm text-gray-400 font-medium hover:text-black transition-colors"
          >
            Usar otro correo
          </button>
        </form>
      )}
    </div>
  );
}