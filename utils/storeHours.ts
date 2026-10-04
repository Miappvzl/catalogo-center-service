// utils/storeHours.ts

export interface DayShift {
  isOpen: boolean
  open: string  // "HH:mm"
  close: string // "HH:mm"
  hasSecondShift?: boolean
  open2?: string
  close2?: string
}

export interface StoreHoursConfig {
  timezone?: string
  is_temporarily_closed?: boolean
  schedule?: Record<string, DayShift>
}

export interface StoreHoursEvaluation {
  isOpen: boolean
  detailLabel: string
}

const DAYS_ORDER = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday']

const DAY_LABELS: Record<string, string> = {
  monday: 'Lunes',
  tuesday: 'Martes',
  wednesday: 'Miércoles',
  thursday: 'Jueves',
  friday: 'Viernes',
  saturday: 'Sábado',
  sunday: 'Domingo'
}

function timeToMinutes(timeStr?: string): number {
  if (!timeStr) return 0
  const [h, m] = timeStr.split(':').map(Number)
  return (h || 0) * 60 + (m || 0)
}

function formatTime12h(timeStr?: string): string {
  if (!timeStr) return ''
  const [hStr, mStr] = timeStr.split(':')
  let h = parseInt(hStr, 10)
  const m = mStr || '00'
  const ampm = h >= 12 ? 'PM' : 'AM'
  h = h % 12
  h = h ? h : 12 // la hora '0' debe ser '12'
  return `${h}:${m} ${ampm}`
}

export function evaluateStoreHours(storeHours?: StoreHoursConfig): StoreHoursEvaluation {
  if (!storeHours) {
    return { isOpen: true, detailLabel: 'Abierto 24/7' }
  }

  // 1. Interruptor de Pausa de Emergencia
  if (storeHours.is_temporarily_closed) {
    return { isOpen: false, detailLabel: 'Pausado temporalmente' }
  }

  const schedule = storeHours.schedule
  if (!schedule) {
    return { isOpen: true, detailLabel: 'Horario continuo' }
  }

  const timezone = storeHours.timezone || 'America/Caracas'
  const now = new Date()

  // 2. Extraemos el tiempo local exacto según la Zona Horaria configurada
  let currentDayKey = 'monday'
  let currentMinutes = 0

  try {
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      weekday: 'long',
      hour: '2-digit',
      minute: '2-digit',
      hourCycle: 'h23'
    }).formatToParts(now)

    const rawWeekday = (parts.find(p => p.type === 'weekday')?.value || 'Monday').toLowerCase()
    currentDayKey = rawWeekday
    const hour = parseInt(parts.find(p => p.type === 'hour')?.value || '0', 10)
    const minute = parseInt(parts.find(p => p.type === 'minute')?.value || '0', 10)
    currentMinutes = hour * 60 + minute
  } catch (err) {
    console.error('Error calculando zona horaria, fallback a local:', err)
    currentDayKey = DAYS_ORDER[now.getDay()]
    currentMinutes = now.getHours() * 60 + now.getMinutes()
  }

  const currentDayIndex = DAYS_ORDER.indexOf(currentDayKey)
  const prevDayIndex = (currentDayIndex - 1 + 7) % 7
  const prevDayKey = DAYS_ORDER[prevDayIndex]

  const todaySchedule = schedule[currentDayKey]
  const yesterdaySchedule = schedule[prevDayKey]

  // 3. 🌙 COMPROBACIÓN 1: ¿Estamos en la madrugada del turno de ayer que cruzó medianoche?
  if (yesterdaySchedule && yesterdaySchedule.isOpen) {
    // Turno 1 de ayer
    const yOpen = timeToMinutes(yesterdaySchedule.open)
    const yClose = timeToMinutes(yesterdaySchedule.close)
    if (yClose < yOpen && currentMinutes < yClose) {
      return { isOpen: true, detailLabel: `Cierra a las ${formatTime12h(yesterdaySchedule.close)}` }
    }
    // Turno 2 de ayer (si aplica)
    if (yesterdaySchedule.hasSecondShift && yesterdaySchedule.open2 && yesterdaySchedule.close2) {
      const yOpen2 = timeToMinutes(yesterdaySchedule.open2)
      const yClose2 = timeToMinutes(yesterdaySchedule.close2)
      if (yClose2 < yOpen2 && currentMinutes < yClose2) {
        return { isOpen: true, detailLabel: `Cierra a las ${formatTime12h(yesterdaySchedule.close2)}` }
      }
    }
  }

  // 4. COMPROBACIÓN 2: ¿Estamos dentro de los turnos de hoy?
  if (todaySchedule && todaySchedule.isOpen) {

    // 🚀 REGLA DE ORO 24/7: Si está configurado de 00:00 a 23:59, está abierto siempre
    if (todaySchedule.open === '00:00' && (todaySchedule.close === '23:59' || todaySchedule.close === '00:00')) {
      return { isOpen: true, detailLabel: 'Abierto 24 horas' }
    }
    // Turno 1 de hoy
    const tOpen = timeToMinutes(todaySchedule.open)
    const tClose = timeToMinutes(todaySchedule.close)

    if (tClose > tOpen) {
      // Horario normal (ej: 09:00 a 22:00)
      if (currentMinutes >= tOpen && currentMinutes < tClose) {
        return { isOpen: true, detailLabel: `Cierra a las ${formatTime12h(todaySchedule.close)}` }
      }
    } else if (tClose < tOpen) {
      // 🌙 Horario trasnochador que cruza medianoche (ej: 18:00 a 03:00)
      if (currentMinutes >= tOpen) {
        return { isOpen: true, detailLabel: `Cierra a las ${formatTime12h(todaySchedule.close)}` }
      }
    }

    // Turno 2 de hoy (si aplica)
    if (todaySchedule.hasSecondShift && todaySchedule.open2 && todaySchedule.close2) {
      const tOpen2 = timeToMinutes(todaySchedule.open2)
      const tClose2 = timeToMinutes(todaySchedule.close2)

      if (tClose2 > tOpen2) {
        if (currentMinutes >= tOpen2 && currentMinutes < tClose2) {
          return { isOpen: true, detailLabel: `Cierra a las ${formatTime12h(todaySchedule.close2)}` }
        }
      } else if (tClose2 < tOpen2) {
        if (currentMinutes >= tOpen2) {
          return { isOpen: true, detailLabel: `Cierra a las ${formatTime12h(todaySchedule.close2)}` }
        }
      }
    }

    // Si aún no abre hoy
    if (currentMinutes < tOpen) {
      return { isOpen: false, detailLabel: `Abre hoy a las ${formatTime12h(todaySchedule.open)}` }
    }

    // Si hay segundo turno y estamos en el intermedio
    if (todaySchedule.hasSecondShift && todaySchedule.open2) {
      const tOpen2 = timeToMinutes(todaySchedule.open2)
      if (currentMinutes < tOpen2 && currentMinutes >= tClose) {
        return { isOpen: false, detailLabel: `Abre de nuevo a las ${formatTime12h(todaySchedule.open2)}` }
      }
    }
  }

  // 5. COMPROBACIÓN 3: Determinar cuándo vuelve a abrir en los próximos días
  for (let i = 1; i <= 7; i++) {
    const nextDayIndex = (currentDayIndex + i) % 7
    const nextDayKey = DAYS_ORDER[nextDayIndex]
    const nextSchedule = schedule[nextDayKey]

    if (nextSchedule && nextSchedule.isOpen) {
      const dayName = i === 1 ? 'mañana' : `el ${DAY_LABELS[nextDayKey]}`
      return { isOpen: false, detailLabel: `Abre ${dayName} a las ${formatTime12h(nextSchedule.open)}` }
    }
  }

  return { isOpen: false, detailLabel: 'Cerrado' }
}