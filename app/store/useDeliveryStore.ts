import { create } from 'zustand';
import { 
  Coordinates, 
  DeliveryConfig, 
  ZoneResolutionResult, 
  evaluateDeliveryZone,
  generateNavigationUrls,
  OrderDeliveryDetails
} from '@/utils/geoUtils';

// Función interna para usar el Geocoder Nativo de Google
const reverseGeocodeGoogle = async (lat: number, lng: number): Promise<string> => {
  if (typeof window === 'undefined' || !window.google) return '';
  const geocoder = new window.google.maps.Geocoder();
  try {
    const response = await geocoder.geocode({ location: { lat, lng } });
    if (response.results && response.results.length > 0) {
      // Tomamos la dirección formateada más relevante y le quitamos el país
      return response.results[0].formatted_address.replace(', Venezuela', '');
    }
  } catch (error) {
    console.warn('[Google Geocoder] Error:', error);
  }
  return '';
};

interface DeliveryState {
  customerCoords: Coordinates | null;
  gpsAccuracyMeters: number | null;
  sectorName: string;
  addressLine: string;
  referencePoint: string;
  resolution: ZoneResolutionResult;
  isLocatingGPS: boolean;
  isReverseGeocoding: boolean;
  gpsError: string | null;

  setCustomerCoords: (coords: Coordinates, config: DeliveryConfig | null) => Promise<void>;
  setGpsAccuracyMeters: (meters: number | null) => void;
  setSectorName: (sector: string) => void;
  setAddressLine: (address: string) => void;
  setReferencePoint: (reference: string) => void;
  detectCurrentGPSLocation: (config: DeliveryConfig | null) => Promise<boolean>;
  recalculateResolution: (config: DeliveryConfig | null) => void;
  resetDeliveryState: () => void;
  getOrderDeliveryPayload: () => OrderDeliveryDetails | null;
}

const DEFAULT_RESOLUTION: ZoneResolutionResult = {
  status: 'out_of_coverage',
  ring: null,
  zone: null,
  price_usd: 0,
  distance_km: null,
  message: 'Toca el mapa o usa el GPS para calcular tu tarifa de delivery.',
};

export const useDeliveryStore = create<DeliveryState>((set, get) => ({
  customerCoords: null,
  gpsAccuracyMeters: null,
  sectorName: '',
  addressLine: '',
  referencePoint: '',
  resolution: DEFAULT_RESOLUTION,
  isLocatingGPS: false,
  isReverseGeocoding: false,
  gpsError: null,

  setGpsAccuracyMeters: (meters: number | null) => set({ gpsAccuracyMeters: meters }),

  setCustomerCoords: async (coords: Coordinates, config: DeliveryConfig | null) => {
    const resolution = evaluateDeliveryZone(coords, config);
    
    set({
      customerCoords: coords,
      resolution,
      gpsError: null,
    });

    if (resolution.ring?.name) {
      set({ sectorName: resolution.ring.name });
    } else {
      set({ isReverseGeocoding: true });
      const detectedSector = await reverseGeocodeGoogle(coords.lat, coords.lng);
      set({
        isReverseGeocoding: false,
        sectorName: detectedSector || get().sectorName,
      });
    }
  },

  detectCurrentGPSLocation: async (config: DeliveryConfig | null): Promise<boolean> => {
    if (typeof window === 'undefined' || !navigator.geolocation) {
      set({ gpsError: 'Geolocalización no soportada en este navegador.' });
      return false;
    }

    set({ isLocatingGPS: true, gpsError: null });

    return new Promise((resolve) => {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const coords: Coordinates = {
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          };
          const accuracy = Math.round(position.coords.accuracy || 0);

          set({ gpsAccuracyMeters: accuracy });
          await get().setCustomerCoords(coords, config);

          // Si el margen de error es mayor a 50m (típico en PC o señal débil), avisar
          if (accuracy > 50) {
            set({
              gpsError: `Señal GPS aproximada (±${accuracy} m). Arrastra el pin rojo hasta la puerta de tu casa o garita.`,
            });
          }

          set({ isLocatingGPS: false });
          resolve(true);
        },
        (error) => {
          let msg = 'No pudimos obtener la señal GPS. Arrastra el marcador manualmente.';
          if (error.code === error.PERMISSION_DENIED) {
            msg = 'Permiso de ubicación denegado. Toca el mapa para ubicarte.';
          }
          set({ isLocatingGPS: false, gpsError: msg });
          resolve(false);
        },
        { enableHighAccuracy: true, timeout: 12000, maximumAge: 0 }
      );
    });
  },

  setSectorName: (sectorName: string) => set({ sectorName }),
  setAddressLine: (addressLine: string) => set({ addressLine }),
  setReferencePoint: (referencePoint: string) => set({ referencePoint }),

  

  recalculateResolution: (config: DeliveryConfig | null) => {
    const { customerCoords } = get();
    if (!customerCoords) return;
    const resolution = evaluateDeliveryZone(customerCoords, config);
    set({ resolution });
  },

  resetDeliveryState: () => {
    set({
      customerCoords: null,
      sectorName: '',
      addressLine: '',
      referencePoint: '',
      resolution: DEFAULT_RESOLUTION,
      isLocatingGPS: false,
      isReverseGeocoding: false,
      gpsError: null,
    });
  },

  getOrderDeliveryPayload: (): OrderDeliveryDetails | null => {
    const { customerCoords, sectorName, addressLine, referencePoint, resolution } = get();
    if (!customerCoords) return null;

    const navUrls = generateNavigationUrls(customerCoords);

    return {
      lat: customerCoords.lat,
      lng: customerCoords.lng,
      sector_name: sectorName || resolution.ring?.name || 'Zona de Entrega',
      address_line: addressLine,
      reference_point: referencePoint,
      zone_id: resolution.ring?.id || null,
      shipping_cost_usd: resolution.price_usd,
      distance_km: resolution.distance_km,
      navigation_url: navUrls.googleMaps,
      waze_url: navUrls.waze,
    };
  },
}));