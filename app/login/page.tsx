'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import { Lock, Mail, Loader2, ArrowRight } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false); // Switch entre Login y Registro
  const [msg, setMsg] = useState('');
  
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMsg('');

    try {
      if (isSignUp) {
        // --- LÓGICA DE REGISTRO ---
        const { error } = await supabase.auth.signUp({
          email: formData.email,
          password: formData.password,
        });
        if (error) throw error;
        setMsg('✅ ¡Cuenta creada! Revisa tu correo para confirmar (o inicia sesión si desactivaste confirmación).');
      } else {
        // --- LÓGICA DE LOGIN ---
        const { error } = await supabase.auth.signInWithPassword({
          email: formData.email,
          password: formData.password,
        });
        if (error) throw error;
        router.push('/admin'); // Si entra, lo mandamos al Admin
      }
    } catch (error: any) {
      setMsg(`❌ ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-zinc-50 p-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl border border-zinc-100 overflow-hidden">
        
        {/* Header Visual */}
        <div className="bg-zinc-900 p-8 text-center">
          <div className="inline-flex bg-zinc-800 p-3 rounded-full mb-4">
            <Lock className="text-blue-400" size={24} />
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Center Service Admin</h1>
          <p className="text-zinc-400 text-sm mt-2">Acceso exclusivo para administradores</p>
        </div>

        {/* Formulario */}
        <div className="p-8">
          
          {/* Tabs Login/Registro */}
          <div className="flex bg-zinc-100 p-1 rounded-lg mb-6">
            <button 
              onClick={() => setIsSignUp(false)}
              className={`flex-1 py-2 text-sm font-medium rounded-md transition-all ${!isSignUp ? 'bg-white shadow text-zinc-900' : 'text-zinc-500 hover:text-zinc-700'}`}
            >
              Iniciar Sesión
            </button>
            <button 
              onClick={() => setIsSignUp(true)}
              className={`flex-1 py-2 text-sm font-medium rounded-md transition-all ${isSignUp ? 'bg-white shadow text-zinc-900' : 'text-zinc-500 hover:text-zinc-700'}`}
            >
              Crear Cuenta
            </button>
          </div>

          <form onSubmit={handleAuth} className="space-y-4">
            <div className="space-y-2">
              <label className="text-xs font-bold text-zinc-500 uppercase">Email Corporativo</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" size={18} />
                <input 
                  type="email" 
                  required
                  placeholder="admin@centerservice.com"
                  className="w-full pl-10 p-3 bg-zinc-50 border border-zinc-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 transition"
                  value={formData.email}
                  onChange={(e) => setFormData({...formData, email: e.target.value})}
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-zinc-500 uppercase">Contraseña</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" size={18} />
                <input 
                  type="password" 
                  required
                  placeholder="••••••••"
                  className="w-full pl-10 p-3 bg-zinc-50 border border-zinc-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 transition"
                  value={formData.password}
                  onChange={(e) => setFormData({...formData, password: e.target.value})}
                />
              </div>
            </div>

            {msg && (
              <p className={`text-sm text-center p-2 rounded ${msg.includes('✅') ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-600'}`}>
                {msg}
              </p>
            )}

            <button 
              disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-xl transition flex items-center justify-center gap-2 mt-4"
            >
              {loading ? <Loader2 className="animate-spin" /> : (isSignUp ? 'Registrarse Gratis' : 'Entrar al Panel')}
              {!loading && <ArrowRight size={18} />}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}