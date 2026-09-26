// utils/storeHours.ts

export interface DaySchedule {
  isOpen: boolean;
  open: string;  // Formato "HH:mm" 24h
  close: string; // Formato "HH:mm" 24h
}

export interface StoreHoursConfig {
  timezone?: string;
  is_temporarily_closed?: boolean;
  schedule?: {
    monday?: DaySchedule;
    tuesday?: DaySchedule;
    wednesday?: DaySchedule;
    thursday?: DaySchedule;
    friday?: DaySchedule;
    saturday?: DaySchedule;
    sunday?: DaySchedule;
  };
}

export interface StoreScheduleStatus {
  isOpen: boolean;
  isTemporarilyClosed: boolean;
  statusLabel: string;
  detailLabel: string;
  nextScheduleMessage: string;
}

const DAYS_MAP = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'] as const;

const DAY_NAMES_ES: Record<string, string> = {
  sunday: 'domingo',
  monday: 'lunes',
  tuesday: 'martes',
  wednesday: 'miércoles',
  thursday: 'jueves',
  friday: 'viernes',
  saturday: 'sábado'
};

export function evaluateStoreHours(hoursConfig?: StoreHoursConfig | null): StoreScheduleStatus {
  // Valores por defecto seguros si no hay configuración
  if (!hoursConfig || !hoursConfig.schedule) {
    return {
      isOpen: true,
      isTemporarilyClosed: false,
      statusLabel: 'Abierto',
      detailLabel: 'Horario regular',
      nextScheduleMessage: 'Abierto en horario habitual'
    };
  }

  if (hoursConfig.is_temporarily_closed) {
    return {
      isOpen: false,
      isTemporarilyClosed: true,
      statusLabel: 'Pausado',
      detailLabel: 'No se reciben pedidos por el momento',
      nextScheduleMessage: 'Pausa operativa temporal'
    };
  }

  const timezone = hoursConfig.timezone || 'America/Caracas';
  const now = new Date();

  // Obtener día de la semana y hora exacta en la zona horaria del comercio
  const dayFormatter = new Intl.DateTimeFormat('en-US', { timeZone: timezone, weekday: 'long' });
  const timeFormatter = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  });

  const currentDayName = dayFormatter.format(now).toLowerCase();
  const currentTimeParts = timeFormatter.format(now).split(':');
  const currentMinutes = parseInt(currentTimeParts[0], 10) * 60 + parseInt(currentTimeParts[1], 10);

  const todaySchedule = hoursConfig.schedule[currentDayName as keyof typeof hoursConfig.schedule];

  if (todaySchedule && todaySchedule.isOpen) {
    const [openH, openM] = todaySchedule.open.split(':').map(Number);
    const [closeH, closeM] = todaySchedule.close.split(':').map(Number);

    const openMinutes = openH * 60 + openM;
    const closeMinutes = closeH * 60 + closeM;

    // Caso A: Turno diurno regular (ej. 09:00 a 22:00)
    if (closeMinutes > openMinutes) {
      if (currentMinutes >= openMinutes && currentMinutes < closeMinutes) {
        return {
          isOpen: true,
          isTemporarilyClosed: false,
          statusLabel: 'Abierto',
          detailLabel: `Cierra a las ${todaySchedule.close}`,
          nextScheduleMessage: `Abierto hoy hasta las ${todaySchedule.close}`
        };
      }
      if (currentMinutes < openMinutes) {
        return {
          isOpen: false,
          isTemporarilyClosed: false,
          statusLabel: 'Cerrado',
          detailLabel: `Abre hoy a las ${todaySchedule.open}`,
          nextScheduleMessage: `Apertura programada para las ${todaySchedule.open}`
        };
      }
    } 
    // Caso B: Turno nocturno que cruza medianoche (ej. 18:00 a 02:00)
    else {
      if (currentMinutes >= openMinutes || currentMinutes < closeMinutes) {
        return {
          isOpen: true,
          isTemporarilyClosed: false,
          statusLabel: 'Abierto',
          detailLabel: `Cierra a las ${todaySchedule.close}`,
          nextScheduleMessage: `Abierto hasta las ${todaySchedule.close}`
        };
      }
    }
  }

  // Si hoy no abre o ya cerró, buscar el siguiente día programado
  const currentDayIndex = DAYS_MAP.indexOf(currentDayName as typeof DAYS_MAP[number]);
  for (let i = 1; i <= 7; i++) {
    const nextDayIndex = (currentDayIndex + i) % 7;
    const nextDayKey = DAYS_MAP[nextDayIndex];
    const nextDaySchedule = hoursConfig.schedule[nextDayKey as keyof typeof hoursConfig.schedule];

    if (nextDaySchedule && nextDaySchedule.isOpen) {
      const dayLabel = i === 1 ? 'mañana' : `el ${DAY_NAMES_ES[nextDayKey]}`;
      return {
        isOpen: false,
        isTemporarilyClosed: false,
        statusLabel: 'Cerrado',
        detailLabel: `Abre ${dayLabel} a las ${nextDaySchedule.open}`,
        nextScheduleMessage: `Próxima apertura ${dayLabel} a las ${nextDaySchedule.open}`
      };
    }
  }

  return {
    isOpen: false,
    isTemporarilyClosed: false,
    statusLabel: 'Cerrado',
    detailLabel: 'Sin horarios configurados',
    nextScheduleMessage: 'Sin programación activa'
  };
}