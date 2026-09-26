// components/admin/StoreHoursSettings.tsx
'use client'

import { useState } from 'react'
import { getSupabase } from '@/lib/supabase-client'
import { Clock, AlertTriangle, Save, Loader2, CheckCircle2, AlertCircle } from 'lucide-react'
import Swal from 'sweetalert2'
import { revalidateStoreCache } from '@/app/admin/actions'
import { motion } from 'framer-motion'

const AnimatedSwitch = ({ active, activeColor = 'bg-neutral-900' }: { active: boolean, activeColor?: string }) => (
  <div className={`w-10 h-5.5 rounded-full border flex items-center px-0.5 shrink-0 transition-colors duration-200 cursor-pointer ${active ? `${activeColor} border-transparent justify-end` : 'bg-neutral-100 border-neutral-200 justify-start'}`}>
    <motion.div 
      layout 
      transition={{ type: "spring", stiffness: 600, damping: 30 }} 
      className="w-4.5 h-4.5 rounded-full bg-white shadow-xs" 
    />
  </div>
)

const DAYS = [
  { key: 'monday', label: 'Lunes' },
  { key: 'tuesday', label: 'Martes' },
  { key: 'wednesday', label: 'Miércoles' },
  { key: 'thursday', label: 'Jueves' },
  { key: 'friday', label: 'Viernes' },
  { key: 'saturday', label: 'Sábado' },
  { key: 'sunday', label: 'Domingo' }
] as const;

export default function StoreHoursSettings({ storeId, initialData }: { storeId: string, initialData: any }) {
  const supabase = getSupabase()
  const [saving, setSaving] = useState(false)
  const [isDirty, setIsDirty] = useState(false)

  const defaultSchedule = {
    monday: { isOpen: true, open: '09:00', close: '22:00' },
    tuesday: { isOpen: true, open: '09:00', close: '22:00' },
    wednesday: { isOpen: true, open: '09:00', close: '22:00' },
    thursday: { isOpen: true, open: '09:00', close: '22:00' },
    friday: { isOpen: true, open: '09:00', close: '23:59' },
    saturday: { isOpen: true, open: '09:00', close: '23:59' },
    sunday: { isOpen: false, open: '00:00', close: '00:00' }
  }

  const [hoursConfig, setHoursConfig] = useState({
    timezone: initialData?.timezone || 'America/Caracas',
    is_temporarily_closed: initialData?.is_temporarily_closed || false,
    schedule: initialData?.schedule || defaultSchedule
  })

  const handlePauseToggle = (value: boolean) => {
    setIsDirty(true)
    setHoursConfig(prev => ({ ...prev, is_temporarily_closed: value }))
  }

  const handleDayToggle = (day: string, value: boolean) => {
    setIsDirty(true)
    setHoursConfig(prev => ({
      ...prev,
      schedule: {
        ...prev.schedule,
        [day]: { ...prev.schedule[day], isOpen: value }
      }
    }))
  }

  const handleTimeChange = (day: string, field: 'open' | 'close', value: string) => {
    setIsDirty(true)
    setHoursConfig(prev => ({
      ...prev,
      schedule: {
        ...prev.schedule,
        [day]: { ...prev.schedule[day], [field]: value }
      }
    }))
  }

  const handleSave = async () => {
    if (!isDirty) return
    setSaving(true)

    const { error } = await supabase
      .from('stores')
      .update({ store_hours: hoursConfig })
      .eq('id', storeId)

    setSaving(false)

    if (error) {
      Swal.fire({
        title: 'Error',
        text: 'No se pudieron actualizar los horarios.',
        icon: 'error',
        confirmButtonColor: '#171717'
      })
    } else {
      await revalidateStoreCache()
      setIsDirty(false)
      Swal.fire({
        toast: true,
        position: 'top-end',
        icon: 'success',
        title: 'Horarios Actualizados',
        showConfirmButton: false,
        timer: 3000,
        customClass: { popup: 'bg-neutral-900 text-white rounded-xl text-xs font-semibold border border-neutral-800' }
      })
    }
  }

  return (
    <section className="bg-white p-6 md:p-8 rounded-xl shadow-[0_1px_3px_rgba(0,0,0,0.01)] space-y-6">
      <div>
        <div className="flex items-center gap-2 text-neutral-900">
          <Clock size={18} className="text-neutral-500" />
          <h2 className="text-base font-bold tracking-tight">Horario de Operaciones y Apertura</h2>
        </div>
        <p className="text-xs text-neutral-400 mt-1">
          Establezca las horas en que su cocina o establecimiento acepta pedidos en línea.
        </p>
      </div>

      {/* BOTÓN DE PAUSA DE EMERGENCIA */}
      <div className={`p-4.5 rounded-lg border transition-all ${
        hoursConfig.is_temporarily_closed 
          ? 'bg-rose-50/70 border-rose-200' 
          : 'bg-neutral-50/60 border-neutral-200/50'
      }`}>
        <div
          className="flex items-center justify-between cursor-pointer"
          onClick={() => handlePauseToggle(!hoursConfig.is_temporarily_closed)}
        >
          <div className="space-y-0.5">
            <p className={`font-semibold text-xs flex items-center gap-1.5 ${
              hoursConfig.is_temporarily_closed ? 'text-rose-900' : 'text-neutral-900'
            }`}>
              {hoursConfig.is_temporarily_closed && <AlertTriangle size={14} className="text-rose-600" />}
              Pausa Operativa de Emergencia
            </p>
            <p className="text-xs text-neutral-400 pr-4">
              Cierra inmediatamente el catálogo para nuevos pedidos sin alterar su horario semanal programado.
            </p>
          </div>
          <AnimatedSwitch active={hoursConfig.is_temporarily_closed} activeColor="bg-rose-600" />
        </div>
      </div>

      {/* MATRIZ DE DÍAS Y HORAS */}
      <div className="divide-y divide-neutral-100 border border-neutral-200/60 rounded-xl overflow-hidden">
        {DAYS.map(({ key, label }) => {
          const current = hoursConfig.schedule[key] || { isOpen: false, open: '09:00', close: '22:00' };

          return (
            <div 
              key={key} 
              className={`p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-colors ${
                current.isOpen ? 'bg-white' : 'bg-neutral-50/40 opacity-70'
              }`}
            >
              <div 
                className="flex items-center gap-3 cursor-pointer select-none"
                onClick={() => handleDayToggle(key, !current.isOpen)}
              >
                <AnimatedSwitch active={current.isOpen} activeColor="bg-neutral-900" />
                <span className="text-xs font-bold text-neutral-800 w-24">{label}</span>
                <span className={`text-[10px] font-semibold uppercase tracking-wider ${
                  current.isOpen ? 'text-emerald-700' : 'text-neutral-400'
                }`}>
                  {current.isOpen ? 'Laborable' : 'Cerrado'}
                </span>
              </div>

              {current.isOpen && (
                <div className="flex items-center gap-2 pl-12 sm:pl-0">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] text-neutral-400 uppercase font-mono">De:</span>
                    <input
                      type="time"
                      value={current.open}
                      onChange={(e) => handleTimeChange(key, 'open', e.target.value)}
                      className="bg-neutral-50 border border-neutral-200 rounded-lg px-2.5 py-1.5 text-xs font-bold font-mono text-neutral-900 outline-none focus:border-neutral-400"
                    />
                  </div>

                  <span className="text-neutral-300">-</span>

                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] text-neutral-400 uppercase font-mono">A:</span>
                    <input
                      type="time"
                      value={current.close}
                      onChange={(e) => handleTimeChange(key, 'close', e.target.value)}
                      className="bg-neutral-50 border border-neutral-200 rounded-lg px-2.5 py-1.5 text-xs font-bold font-mono text-neutral-900 outline-none focus:border-neutral-400"
                    />
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* FOOTER DE ACCIÓN */}
      <div className="pt-4 border-t border-neutral-100 flex flex-col sm:flex-row justify-between items-center gap-4">
        <div className="flex items-center gap-2 text-xs font-medium">
          {isDirty ? (
            <span className="inline-flex items-center gap-1.5 text-amber-700 bg-amber-50 px-2.5 py-1 rounded">
              <AlertCircle size={12} />
              Hay cambios de horario pendientes de guardar
            </span>
          ) : (
            <span className="text-neutral-400">Horarios sincronizados con el servidor.</span>
          )}
        </div>

        <button
          onClick={handleSave}
          disabled={saving || !isDirty}
          className={`w-full sm:w-auto px-5 py-2.5 rounded-lg text-xs font-semibold flex items-center justify-center gap-2 transition-all ${
            isDirty
              ? 'bg-neutral-950 text-white hover:bg-black active:scale-[0.98]'
              : 'bg-neutral-100 text-neutral-400 cursor-not-allowed'
          }`}
        >
          {saving ? <Loader2 className="animate-spin" size={13} /> : <Save size={13} />}
          Guardar Horarios
        </button>
      </div>
    </section>
  );
}