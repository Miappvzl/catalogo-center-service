'use client'

import { useState } from 'react'
import { getSupabase } from '@/lib/supabase-client'
import { Clock, AlertTriangle, Save, Loader2, AlertCircle, Globe, Plus, Trash2, Moon, ChevronDown } from 'lucide-react'
import Swal from 'sweetalert2'
import { revalidateStoreCache } from '@/app/admin/actions'
import { motion, AnimatePresence } from 'framer-motion'

const AnimatedSwitch = ({ active, activeColor = 'bg-neutral-900' }: { active: boolean, activeColor?: string }) => (
  <div className={`w-9 h-5 rounded-full border flex items-center px-0.5 shrink-0 transition-colors duration-200 cursor-pointer ${active ? `${activeColor} border-transparent justify-end` : 'bg-neutral-100 border-neutral-200 justify-start'}`}>
    <motion.div 
      layout 
      transition={{ type: "spring", stiffness: 600, damping: 30 }} 
      className="w-4 h-4 rounded-full bg-white shadow-xs" 
    />
  </div>
)

const TIMEZONES = [
  { value: 'America/Caracas', label: 'Venezuela (Caracas - GMT-4)' },
  { value: 'America/Bogota', label: 'Colombia (Bogotá - GMT-5)' },
  { value: 'America/New_York', label: 'Estados Unidos (Miami / NY - GMT-4/5)' },
  { value: 'America/Panama', label: 'Panamá (GMT-5)' },
  { value: 'America/Santo_Domingo', label: 'Rep. Dominicana (GMT-4)' },
  { value: 'America/Mexico_City', label: 'México (CDMX - GMT-6)' },
  { value: 'America/Argentina/Buenos_Aires', label: 'Argentina (Buenos Aires - GMT-3)' },
  { value: 'America/Santiago', label: 'Chile (Santiago - GMT-3/4)' },
  { value: 'Europe/Madrid', label: 'España (Madrid - GMT+1/2)' },
]

const DAYS = [
  { key: 'monday', label: 'Lunes' },
  { key: 'tuesday', label: 'Martes' },
  { key: 'wednesday', label: 'Miércoles' },
  { key: 'thursday', label: 'Jueves' },
  { key: 'friday', label: 'Viernes' },
  { key: 'saturday', label: 'Sábado' },
  { key: 'sunday', label: 'Domingo' }
] as const

// Generador de intervalos de 30 minutos (Formato 24h comercial)
const BASE_TIMES = [
  '00:00', '00:30', '01:00', '01:30', '02:00', '02:30', '03:00', '03:30',
  '04:00', '04:30', '05:00', '05:30', '06:00', '06:30', '07:00', '07:30',
  '08:00', '08:30', '09:00', '09:30', '10:00', '10:30', '11:00', '11:30',
  '12:00', '12:30', '13:00', '13:30', '14:00', '14:30', '15:00', '15:30',
  '16:00', '16:30', '17:00', '17:30', '18:00', '18:30', '19:00', '19:30',
  '20:00', '20:30', '21:00', '21:30', '22:00', '22:30', '23:00', '23:30',
  '23:59'
]

function formatTime12h(timeStr?: string): string {
  if (!timeStr) return '00:00'
  const [hStr, mStr] = timeStr.split(':')
  let h = parseInt(hStr, 10)
  const m = mStr || '00'
  const ampm = h >= 12 ? 'PM' : 'AM'
  h = h % 12
  h = h ? h : 12
  return `${h}:${m} ${ampm}`
}

// 🚀 COMPONENTE CAPSULA DE TIEMPO CON RELOJ DE ALTO CONTRASTE (CERO POPUP NATIVO ROTO)
function TimeSelector({
  value,
  onChange,
  prefix
}: {
  value: string
  onChange: (val: string) => void
  prefix: string
}) {
  const options = Array.from(new Set([...BASE_TIMES, value])).sort()

  return (
    <div className="relative inline-flex items-center bg-white hover:bg-neutral-50 border border-neutral-200/80 rounded-xl px-2.5 py-1.5 shadow-2xs transition-colors group/time cursor-pointer">
      {/* 🚀 ICONO RELOJ CON CONTRASTE ABSOLUTO (NEGRO SÓLIDO) */}
      <Clock size={13} className="text-neutral-900 shrink-0 mr-1.5" strokeWidth={2.5} />
      
      <span className="text-[10px] font-mono text-neutral-400 font-bold uppercase mr-1">
        {prefix}:
      </span>
      
      <span className="text-xs font-mono font-bold text-neutral-900 tracking-tight">
        {formatTime12h(value)}
      </span>

      <ChevronDown size={11} className="text-neutral-400 ml-1.5 shrink-0 group-hover/time:text-neutral-900 transition-colors" />

      {/* Selector invisible superpuesto: Da experiencia nativa impecable en iOS/Android y lista limpia en Desktop */}
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer text-xs"
      >
        {options.map((t) => (
          <option key={t} value={t}>
            {formatTime12h(t)} ({t})
          </option>
        ))}
      </select>
    </div>
  )
}

export default function StoreHoursSettings({ storeId, initialData }: { storeId: string, initialData: any }) {
  const supabase = getSupabase()
  const [saving, setSaving] = useState(false)
  const [isDirty, setIsDirty] = useState(false)

  const defaultSchedule = {
    monday: { isOpen: true, open: '00:00', close: '23:59', hasSecondShift: false },
    tuesday: { isOpen: true, open: '00:00', close: '23:59', hasSecondShift: false },
    wednesday: { isOpen: true, open: '00:00', close: '23:59', hasSecondShift: false },
    thursday: { isOpen: true, open: '00:00', close: '23:59', hasSecondShift: false },
    friday: { isOpen: true, open: '00:00', close: '23:59', hasSecondShift: false },
    saturday: { isOpen: true, open: '00:00', close: '23:59', hasSecondShift: false },
    sunday: { isOpen: true, open: '00:00', close: '23:59', hasSecondShift: false }
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

  const handleTimezoneChange = (tz: string) => {
    setIsDirty(true)
    setHoursConfig(prev => ({ ...prev, timezone: tz }))
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

  const handleTimeChange = (day: string, field: 'open' | 'close' | 'open2' | 'close2', value: string) => {
    setIsDirty(true)
    setHoursConfig(prev => ({
      ...prev,
      schedule: {
        ...prev.schedule,
        [day]: { ...prev.schedule[day], [field]: value }
      }
    }))
  }

  const handleToggleSecondShift = (day: string) => {
    setIsDirty(true)
    setHoursConfig(prev => {
      const current = prev.schedule[day]
      const willHave = !current?.hasSecondShift
      return {
        ...prev,
        schedule: {
          ...prev.schedule,
          [day]: {
            ...current,
            hasSecondShift: willHave,
            open2: willHave ? (current.open2 || '18:30') : undefined,
            close2: willHave ? (current.close2 || '23:00') : undefined
          }
        }
      }
    })
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
    <section className="bg-white p-4 sm:p-6 md:p-8 rounded-2xl border border-neutral-200/70 shadow-xs space-y-5 w-full min-w-0">
      {/* HEADER DE SECCIÓN */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-neutral-100">
        <div>
          <div className="flex items-center gap-2 text-neutral-900">
            <Clock size={16} className="text-neutral-900" strokeWidth={2.5} />
            <h2 className="text-sm sm:text-base font-bold tracking-tight">Horario de Operaciones y Apertura</h2>
          </div>
          <p className="text-[11px] text-neutral-400 font-medium mt-0.5">
            Define cuándo tu cocina acepta pedidos en línea.
          </p>
        </div>

        {/* SELECTOR DE ZONA HORARIA */}
        <div className="flex items-center gap-2 bg-neutral-50 border border-neutral-200/70 px-2.5 py-1.5 rounded-xl shrink-0">
          <Globe size={13} className="text-neutral-600 shrink-0" />
          <select
            value={hoursConfig.timezone}
            onChange={(e) => handleTimezoneChange(e.target.value)}
            className="bg-transparent text-[11px] font-bold text-neutral-900 outline-none cursor-pointer"
          >
            {TIMEZONES.map(tz => (
              <option key={tz.value} value={tz.value}>
                {tz.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* PAUSA DE EMERGENCIA */}
      <div className={`p-3.5 sm:p-4 rounded-xl border transition-all ${
        hoursConfig.is_temporarily_closed 
          ? 'bg-rose-50/70 border-rose-200' 
          : 'bg-neutral-50/50 border-neutral-200/60'
      }`}>
        <div
          className="flex items-center justify-between cursor-pointer gap-2"
          onClick={() => handlePauseToggle(!hoursConfig.is_temporarily_closed)}
        >
          <div className="space-y-0.5 min-w-0 pr-2">
            <p className={`text-xs font-bold flex items-center gap-1.5 ${
              hoursConfig.is_temporarily_closed ? 'text-rose-900' : 'text-neutral-900'
            }`}>
              {hoursConfig.is_temporarily_closed && <AlertTriangle size={13} className="text-rose-600 shrink-0" />}
              Pausa de Emergencia (Cerrar tienda ahora)
            </p>
            <p className="text-[10px] text-neutral-400 leading-snug truncate sm:whitespace-normal">
              Detiene la recepción de pedidos temporalmente sin borrar tus horas semanales.
            </p>
          </div>
          <AnimatedSwitch active={hoursConfig.is_temporarily_closed} activeColor="bg-rose-600" />
        </div>
      </div>

      {/* 🚀 MATRIZ DE DÍAS Y HORAS (RESPONSIVE SIN OVERFLOW EN MÓVIL) */}
      <div className="divide-y divide-neutral-100 border border-neutral-200/60 rounded-2xl overflow-hidden bg-neutral-50/20">
        {DAYS.map(({ key, label }) => {
          const current = hoursConfig.schedule[key] || { isOpen: false, open: '00:00', close: '23:59' }
          const isOvernight1 = current.isOpen && current.close < current.open
          const isOvernight2 = current.isOpen && current.hasSecondShift && current.close2 && current.open2 && current.close2 < current.open2

          return (
            <div 
              key={key} 
              className={`p-3 sm:p-4 flex flex-col gap-2.5 transition-colors ${
                current.isOpen ? 'bg-white' : 'bg-neutral-50/30 opacity-60'
              }`}
            >
              {/* FILA 1: DÍA, ESTADO Y BOTÓN SEGUNDO TURNO */}
              <div className="flex items-center justify-between gap-2 w-full">
                <div 
                  className="flex items-center gap-2.5 cursor-pointer select-none"
                  onClick={() => handleDayToggle(key, !current.isOpen)}
                >
                  <AnimatedSwitch active={current.isOpen} activeColor="bg-neutral-900" />
                  <span className="text-xs font-bold text-neutral-900 w-20">{label}</span>
                  <span className={`text-[9px] font-mono font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                    current.isOpen ? 'text-emerald-700 bg-emerald-50' : 'text-neutral-400 bg-neutral-100'
                  }`}>
                    {current.isOpen ? 'Abierto' : 'Cerrado'}
                  </span>
                </div>

                {current.isOpen && !current.hasSecondShift && (
                  <button
                    type="button"
                    onClick={() => handleToggleSecondShift(key)}
                    className="text-[10px] font-bold text-neutral-500 hover:text-neutral-950 underline px-1 py-0.5 cursor-pointer shrink-0"
                    title="Agregar turno partido (ej. cena)"
                  >
                    + 2do Turno
                  </button>
                )}
              </div>

              {/* FILA 2: CONTROLES DE HORA EN CÁPSULAS (CERO OVERFLOW) */}
              {current.isOpen && (
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-1 sm:pt-0 w-full">
                  {/* Turno 1 */}
                  <div className="flex items-center gap-1.5 flex-wrap sm:flex-nowrap">
                    <TimeSelector value={current.open} onChange={(val) => handleTimeChange(key, 'open', val)} prefix="De" />
                    <span className="text-neutral-300 font-bold">-</span>
                    <TimeSelector value={current.close} onChange={(val) => handleTimeChange(key, 'close', val)} prefix="A" />

                    {isOvernight1 && (
                      <span className="inline-flex items-center gap-1 text-[9px] font-mono font-bold text-indigo-700 bg-indigo-50 border border-indigo-200 px-1.5 py-0.5 rounded shrink-0">
                        <Moon size={10} /> Madrugada
                      </span>
                    )}
                  </div>

                  {/* Turno 2 (Si está activo) */}
                  {current.hasSecondShift && (
                    <div className="flex items-center gap-1.5 pt-1.5 sm:pt-0 border-t sm:border-t-0 border-neutral-100 flex-wrap sm:flex-nowrap">
                      <span className="text-[10px] font-mono font-bold text-neutral-400 shrink-0">T2:</span>
                      <TimeSelector value={current.open2 || '18:30'} onChange={(val) => handleTimeChange(key, 'open2', val)} prefix="De" />
                      <span className="text-neutral-300 font-bold">-</span>
                      <TimeSelector value={current.close2 || '23:00'} onChange={(val) => handleTimeChange(key, 'close2', val)} prefix="A" />

                      {isOvernight2 && (
                        <span className="inline-flex items-center gap-1 text-[9px] font-mono font-bold text-indigo-700 bg-indigo-50 border border-indigo-200 px-1.5 py-0.5 rounded shrink-0">
                          <Moon size={10} /> Madrugada
                        </span>
                      )}

                      <button
                        type="button"
                        onClick={() => handleToggleSecondShift(key)}
                        className="p-1 text-neutral-400 hover:text-rose-600 rounded cursor-pointer"
                        title="Quitar 2do turno"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* FOOTER */}
      <div className="pt-3 border-t border-neutral-100 flex flex-col sm:flex-row justify-between items-center gap-3">
        <div className="flex items-center gap-2 text-xs font-medium">
          {isDirty ? (
            <span className="inline-flex items-center gap-1.5 text-amber-700 bg-amber-50 px-2.5 py-1 rounded-md text-[11px] font-semibold">
              <AlertCircle size={12} />
              Hay cambios de horario pendientes de guardar
            </span>
          ) : (
            <span className="text-neutral-400 font-mono text-[10px]">Horarios sincronizados.</span>
          )}
        </div>

        <button
          onClick={handleSave}
          disabled={saving || !isDirty}
          className={`w-full sm:w-auto px-5 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 transition-all cursor-pointer ${
            isDirty
              ? 'bg-neutral-950 text-white hover:bg-black active:scale-[0.98] shadow-xs'
              : 'bg-neutral-100 text-neutral-400 cursor-not-allowed'
          }`}
        >
          {saving ? <Loader2 className="animate-spin" size={13} /> : <Save size={13} />}
          Guardar Horarios
        </button>
      </div>
    </section>
  )
}