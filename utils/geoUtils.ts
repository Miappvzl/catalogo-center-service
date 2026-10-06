import { point } from '@turf/helpers';
import distance from '@turf/distance';

// ==========================================
// 1. TIPOS Y CONTRATOS DE DATOS ESTRICTOS
// ==========================================

export interface Coordinates {
  lat: number;
  lng: number;
}

export interface DeliveryRing {
  id: string;
  name: string;        // Ej: "Zona Cercana", "Zona Media", "Zona Extendida"
  max_km: number;      // Límite en kilómetros desde la tienda (ej: 3.0, 7.0, 12.0)
  price_usd: number;   // Tarifa cobrada al cliente (ej: 1.50, 3.00, 5.00)
  color: string;       // Color del anillo en el mapa (hex)
  is_active: boolean;
}
export interface DeliveryConfig {
  enabled: boolean;
  mode?: 'radar' | 'manual';
  google_maps_api_key?: string; // 🚀 Inyección síncrona desde el servidor
  store_location: {
    lat: number;
    lng: number;
    address: string;
  } | null;
  rings: DeliveryRing[];
  // Campos de retrocompatibilidad
  zones?: any[];
  max_radius_km?: number;
  fallback_price_usd?: number;
  allow_outside_zones?: boolean;
}

export type ZoneResolutionStatus =
  | 'in_zone'
  | 'out_of_coverage'
  | 'disabled'
  | 'no_store_location';

export interface ZoneResolutionResult {
  status: ZoneResolutionStatus;
  ring: DeliveryRing | null;
  price_usd: number;
  distance_km: number | null;
  message: string;
  zone?: DeliveryRing | null; // Retrocompatibilidad
}

export interface GeocodingSuggestion {
  id: string;
  label: string;
  city?: string;
  state?: string;
  coordinates: Coordinates;
}

export interface OrderDeliveryDetails {
  lat: number;
  lng: number;
  sector_name: string;
  address_line: string;
  reference_point: string;
  zone_id: string | null;
  shipping_cost_usd: number;
  distance_km: number | null;
  navigation_url: string;
  waze_url: string;
}

// ==========================================
// 2. ENLACES DIRECTOS PARA EL MOTORIZADO
// ==========================================

export const generateNavigationUrls = (coords: Coordinates) => {
  const { lat, lng } = coords;
  return {
    googleMaps: `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`,
    waze: `https://waze.com/ul?ll=${lat},${lng}&navigate=yes`,
  };
};

// ==========================================
// 3. MOTOR DE CÁLCULO RADIAL EN TIEMPO REAL
// ==========================================

export const evaluateDeliveryZone = (
  customerCoords: Coordinates | null,
  config: DeliveryConfig | null
): ZoneResolutionResult => {
  if (!config || !config.enabled) {
    return {
      status: 'disabled',
      ring: null,
      zone: null,
      price_usd: 0,
      distance_km: null,
      message: 'El servicio de delivery no está activo para esta tienda.',
    };
  }

  if (!config.store_location || typeof config.store_location.lat !== 'number' || typeof config.store_location.lng !== 'number') {
    return {
      status: 'no_store_location',
      ring: null,
      zone: null,
      price_usd: 0,
      distance_km: null,
      message: 'La tienda no ha configurado su dirección de despacho.',
    };
  }

  if (!customerCoords || typeof customerCoords.lat !== 'number' || typeof customerCoords.lng !== 'number') {
    return {
      status: 'out_of_coverage',
      ring: null,
      zone: null,
      price_usd: 0,
      distance_km: null,
      message: 'Por favor selecciona tu ubicación en el mapa.',
    };
  }

  // Normalizar anillos activos (Retrocompatibilidad con zones)
  const rawRings: DeliveryRing[] = (config.rings && config.rings.length > 0)
    ? config.rings
    : (config.zones || []).map((z: any, idx: number) => ({
      id: z.id || `ring-${idx}`,
      name: z.name || `Zona ${idx + 1}`,
      max_km: Number(z.max_km || (idx + 1) * 4),
      price_usd: Number(z.price_usd || z.cost || 2.5),
      color: z.color || '#3b82f6',
      is_active: z.is_active ?? true,
    }));

  const activeRings = rawRings
    .filter(r => r.is_active && r.max_km > 0)
    .sort((a, b) => a.max_km - b.max_km);

  if (activeRings.length === 0) {
    return {
      status: 'out_of_coverage',
      ring: null,
      zone: null,
      price_usd: 0,
      distance_km: null,
      message: 'No hay zonas de delivery configuradas.',
    };
  }

  // Cálculo geodésico exacto con Turf.js
  const storePoint = point([config.store_location.lng, config.store_location.lat]);
  const customerPoint = point([customerCoords.lng, customerCoords.lat]);
  const calculatedDistanceKm = distance(storePoint, customerPoint, { units: 'kilometers' });
  const roundedDistance = Math.round(calculatedDistanceKm * 10) / 10;

  // Evaluar en qué anillo cae la distancia
  for (const ring of activeRings) {
    if (calculatedDistanceKm <= ring.max_km) {
      return {
        status: 'in_zone',
        ring,
        zone: ring,
        price_usd: Number(ring.price_usd) || 0,
        distance_km: roundedDistance,
        message: `${ring.name} (${roundedDistance} km de la tienda)`,
      };
    }
  }

  const maxCoverageKm = activeRings[activeRings.length - 1].max_km;
  return {
    status: 'out_of_coverage',
    ring: null,
    zone: null,
    price_usd: 0,
    distance_km: roundedDistance,
    message: `Tu ubicación (${roundedDistance} km) supera el límite máximo de entrega (${maxCoverageKm} km).`,
  };
};

// ==========================================
// 4. GEOCODIFICADOR CON DESCOMPOSICIÓN SEMÁNTICA ($0 USD)
// ==========================================

let activeSearchAbortController: AbortController | null = null;

export const searchAddressPhoton = async (
  query: string,
  storeBiasCoords?: Coordinates | null
): Promise<GeocodingSuggestion[]> => {
  if (!query || query.trim().length < 2) return [];

  if (activeSearchAbortController) {
    activeSearchAbortController.abort();
  }
  activeSearchAbortController = new AbortController();

  try {
    let url = `/api/geocode?q=${encodeURIComponent(query.trim())}`;
    if (storeBiasCoords) {
      url += `&lat=${storeBiasCoords.lat}&lon=${storeBiasCoords.lng}`;
    }

    const response = await fetch(url, {
      signal: activeSearchAbortController.signal,
      headers: { Accept: 'application/json' },
    });

    if (!response.ok) return [];
    const data = await response.json();
    return Array.isArray(data.results) ? data.results : [];
  } catch (err: any) {
    if (err.name === 'AbortError') return [];
    return [];
  }
};

export const reverseGeocodePhoton = async (coords: Coordinates): Promise<string> => {
  try {
    const url = `/api/geocode/reverse?lat=${coords.lat}&lon=${coords.lng}`;
    const response = await fetch(url, { headers: { Accept: 'application/json' } });
    if (!response.ok) return '';

    const data = await response.json();
    return data.address || '';
  } catch {
    return '';
  }
};
// ==========================================
// 5. PRESETS CON ANILLOS RADIALES PARA VENEZUELA
// ==========================================

export const VENEZUELA_CITY_PRESETS = [
  {
    city: "Caracas",
    state: "Distrito Capital / Miranda",
    defaultCoords: { lat: 10.4806, lng: -66.9036 },
    rings: [
      { id: "caracas-r1", name: "Zona Cercana (Hasta 3 km)", max_km: 3.0, price_usd: 1.50, color: "#10b981", is_active: true },
      { id: "caracas-r2", name: "Zona Media (3 a 7 km)", max_km: 7.0, price_usd: 3.00, color: "#3b82f6", is_active: true },
      { id: "caracas-r3", name: "Zona Extendida (7 a 12 km)", max_km: 12.0, price_usd: 5.00, color: "#f59e0b", is_active: true },
    ]
  },
  {
    city: "Valencia",
    state: "Carabobo",
    defaultCoords: { lat: 10.1620, lng: -68.0077 },
    rings: [
      { id: "valencia-r1", name: "Zona Urbana (Hasta 4 km)", max_km: 4.0, price_usd: 2.00, color: "#10b981", is_active: true },
      { id: "valencia-r2", name: "Zona Intermedia (4 a 8 km)", max_km: 8.0, price_usd: 3.50, color: "#3b82f6", is_active: true },
      { id: "valencia-r3", name: "Zona Periférica (8 a 14 km)", max_km: 14.0, price_usd: 5.00, color: "#f59e0b", is_active: true },
    ]
  },
  {
    city: "Maracaibo",
    state: "Zulia",
    defaultCoords: { lat: 10.6427, lng: -71.6125 },
    rings: [
      { id: "maracaibo-r1", name: "Casco Central (Hasta 4 km)", max_km: 4.0, price_usd: 2.00, color: "#10b981", is_active: true },
      { id: "maracaibo-r2", name: "Zona Norte / Sur (4 a 9 km)", max_km: 9.0, price_usd: 3.50, color: "#3b82f6", is_active: true },
      { id: "maracaibo-r3", name: "Zona San Francisco (9 a 15 km)", max_km: 15.0, price_usd: 5.50, color: "#f59e0b", is_active: true },
    ]
  }
];

export const sanitizePolygonCoordinates = (ring: number[][]): number[][] => ring;