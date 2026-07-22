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

    if (!passwords.newPassword || !passwords.confirmPassword) {
      return Swal.fire({
          title: 'Campos vacíos', 
          text: 'Complete todos los campos del formulario.', 
          icon: 'warning',
          confirmButtonColor: '#171717',
          customClass: { popup: 'rounded-xl font-sans text-xs' }
      })
    }
    if (passwords.newPassword.length < 6) {
      return Swal.fire({
          title: 'Seguridad baja', 
          text: 'La contraseña de administrador requiere mínimo 6 caracteres.', 
          icon: 'warning',
          confirmButtonColor: '#171717',
          customClass: { popup: 'rounded-xl font-sans text-xs' }
      })
    }
    if (passwords.newPassword !== passwords.confirmPassword) {
      return Swal.fire({
          title: 'Incompatibilidad', 
          text: 'Las claves ingresadas no coinciden entre sí.', 
          icon: 'error',
          confirmButtonColor: '#171717',
          customClass: { popup: 'rounded-xl font-sans text-xs' }
      })
    }

    setLoading(true)

    try {
      const { error } = await supabase.auth.updateUser({
        password: passwords.newPassword
      })

      if (error) throw error

      setPasswords({ newPassword: '', confirmPassword: '' })
      
      const Toast = Swal.mixin({ 
        toast: true, position: 'top-end', showConfirmButton: false, timer: 3000, 
        customClass: { popup: 'bg-neutral-900 text-white rounded-xl text-xs font-semibold border border-neutral-800' } 
      })
      Toast.fire({ icon: 'success', title: 'Clave de seguridad actualizada' })

    } catch (error: any) {
      Swal.fire({
          title: 'Error de servidor',
          text: error?.message || 'No se pudo registrar la nueva contraseña.',
          icon: 'error',
          confirmButtonColor: '#171717',
          customClass: { popup: 'rounded-xl font-sans text-xs' }
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <section className="bg-white p-6 md:p-8 rounded-xl border border-neutral-200/50 shadow-[0_1px_3px_rgba(0,0,0,0.01)] flex flex-col h-full">
        
        {/* Cabecera de Seguridad */}
        <div className="mb-6">
            <div className="flex items-center gap-2 text-neutral-900">
                <ShieldCheck size={18} className="text-neutral-500" /> 
                <h3 className="text-base font-bold tracking-tight">Seguridad de la Cuenta</h3>
            </div>
            <p className="text-xs text-neutral-400 mt-1">Actualice los parámetros de acceso para proteger el acceso administrativo al panel.</p>
        </div>

        <form onSubmit={handleUpdatePassword} className="space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                
                {/* Nueva Contraseña */}
                <div>
                    <label className="text-[11px] font-semibold text-neutral-400 uppercase tracking-wider mb-2 block">
                        Nueva Contraseña
                    </label>
                    <div className="relative">
                        <input 
                            type={showPassword ? "text" : "password"}
                            value={passwords.newPassword}
                            onChange={e => setPasswords({...passwords, newPassword: e.target.value})}
                            placeholder="Mínimo 6 caracteres"
                            className="w-full bg-neutral-50/50 border border-neutral-200/50 rounded-lg px-3.5 py-2.5 text-xs font-semibold text-neutral-900 focus:bg-white focus:border-neutral-400 outline-none transition-all placeholder:text-neutral-300"
                        />
                        <button 
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-700 transition-colors p-1"
                        >
                            {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                        </button>
                    </div>
                </div>

                {/* Confirmar Contraseña */}
                <div>
                    <label className="text-[11px] font-semibold text-neutral-400 uppercase tracking-wider mb-2 block">
                        Confirmar Contraseña
                    </label>
                    <div className="relative">
                        <input 
                            type={showPassword ? "text" : "password"}
                            value={passwords.confirmPassword}
                            onChange={e => setPasswords({...passwords, confirmPassword: e.target.value})}
                            placeholder="Repita la nueva contraseña"
                            className="w-full bg-neutral-50/50 border border-neutral-200/50 rounded-lg px-3.5 py-2.5 text-xs font-semibold text-neutral-900 focus:bg-white focus:border-neutral-400 outline-none transition-all placeholder:text-neutral-300"
                        />
                    </div>
                </div>

            </div>

            {/* Botón de Acción */}
            <div className="pt-4 border-t border-neutral-100 flex justify-end">
                <button 
                    type="submit"
                    disabled={loading || !passwords.newPassword || !passwords.confirmPassword} 
                    className="w-full sm:w-auto px-5 py-2.5 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all bg-neutral-950 text-white hover:bg-black active:scale-[0.98] disabled:bg-neutral-100 disabled:text-neutral-400 disabled:cursor-not-allowed shadow-xs"
                >
                    {loading ? <Loader2 className="animate-spin" size={13}/> : <Save size={13}/>} 
                    <span>Actualizar Contraseña</span>
                </button>
            </div>
        </form>
    </section>
  )
}