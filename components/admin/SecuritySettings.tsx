'use client'

import { useState } from 'react'
import { getSupabase } from '@/lib/supabase-client'
import { Save, Loader2, Lock, Eye, EyeOff, ShieldCheck } from 'lucide-react'
import Swal from 'sweetalert2'

export default function SecuritySettings() {
  const supabase = getSupabase()
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  
  const [passwords, setPasswords] = useState({
    newPassword: '',
    confirmPassword: ''
  })

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault()

    // 1. Validaciones Locales (A prueba de tontos)
    if (!passwords.newPassword || !passwords.confirmPassword) {
      return Swal.fire('Faltan datos', 'Por favor completa ambos campos.', 'warning')
    }
    if (passwords.newPassword.length < 6) {
      return Swal.fire('Contraseña débil', 'La nueva contraseña debe tener al menos 6 caracteres.', 'warning')
    }
    if (passwords.newPassword !== passwords.confirmPassword) {
      return Swal.fire('Error', 'Las contraseñas no coinciden.', 'error')
    }

    setLoading(true)

    try {
      // 2. Petición a Supabase (Usa el token de la sesión activa)
      const { error } = await supabase.auth.updateUser({
        password: passwords.newPassword
      })

      if (error) throw error

      // 3. Éxito y Limpieza
      setPasswords({ newPassword: '', confirmPassword: '' })
      
      const Toast = Swal.mixin({ 
        toast: true, position: 'top-end', showConfirmButton: false, timer: 3000, 
        customClass: { popup: 'bg-black text-white rounded-[var(--radius-btn)] text-sm font-bold' } 
      })
      Toast.fire({ icon: 'success', title: 'Contraseña actualizada' })

    } catch (error: any) {
      Swal.fire('Error', error.message || 'No se pudo actualizar la contraseña.', 'error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <section className="bg-white p-4 md:p-8 rounded-[var(--radius-card)] card-interactive flex flex-col h-full mt-6 md:mt-8 border border-transparent">
        <div className="mb-6">
            <h3 className="text-lg font-black text-gray-900 flex items-center gap-2">
                <ShieldCheck size={20} className="text-black" /> Seguridad de la Cuenta
            </h3>
            <p className="text-sm text-gray-500 mt-1">Actualiza tu contraseña de acceso al panel de administración.</p>
        </div>

        <form onSubmit={handleUpdatePassword} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                
                {/* Nueva Contraseña */}
                <div>
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2 block ml-1 flex items-center gap-1">
                        <Lock size={12}/> Nueva Contraseña
                    </label>
                    <div className="relative group">
                        <input 
                            type={showPassword ? "text" : "password"}
                            value={passwords.newPassword}
                            onChange={e => setPasswords({...passwords, newPassword: e.target.value})}
                            placeholder="Mínimo 6 caracteres"
                            className="w-full bg-gray-50 border border-transparent focus:bg-white focus:border-black focus:shadow-subtle rounded-[var(--radius-btn)] px-4 py-3.5 font-bold text-sm text-gray-900 placeholder:text-gray-400 transition-all outline-none"
                        />
                        <button 
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-black transition-colors"
                        >
                            {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                        </button>
                    </div>
                </div>

                {/* Confirmar Contraseña */}
                <div>
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2 block ml-1 flex items-center gap-1">
                        <Lock size={12}/> Confirmar Contraseña
                    </label>
                    <div className="relative group">
                        <input 
                            type={showPassword ? "text" : "password"}
                            value={passwords.confirmPassword}
                            onChange={e => setPasswords({...passwords, confirmPassword: e.target.value})}
                            placeholder="Repite la contraseña"
                            className="w-full bg-gray-50 border border-transparent focus:bg-white focus:border-black focus:shadow-subtle rounded-[var(--radius-btn)] px-4 py-3.5 font-bold text-sm text-gray-900 placeholder:text-gray-400 transition-all outline-none"
                        />
                    </div>
                </div>

            </div>

            {/* Botón de Acción */}
            <div className="pt-4 border-t border-gray-100 flex justify-end">
                <button 
                    type="submit"
                    disabled={loading || !passwords.newPassword || !passwords.confirmPassword} 
                    className="w-full sm:w-auto px-6 py-3 rounded-[var(--radius-btn)] text-sm font-bold flex items-center justify-center gap-2 transition-all bg-black text-white hover:bg-gray-800 shadow-subtle active:scale-95 disabled:bg-gray-100 disabled:text-gray-400 disabled:shadow-none disabled:cursor-not-allowed"
                >
                    {loading ? <Loader2 className="animate-spin" size={16}/> : <Save size={16}/>} 
                    Actualizar Contraseña
                </button>
            </div>
        </form>
    </section>
  )
}