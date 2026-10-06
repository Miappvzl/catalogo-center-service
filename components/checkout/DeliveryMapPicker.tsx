'use client';

import React, { useState, useCallback, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useJsApiLoader, GoogleMap, Marker, Circle } from '@react-google-maps/api';
import { Coordinates, DeliveryConfig } from '@/utils/geoUtils';
import { useDeliveryStore } from '@/app/store/useDeliveryStore';
import { AddressSearchAutocomplete } from './AddressSearchAutocomplete';
import {
  MapPin, 
  Navigation, 
  Loader2, 
  AlertCircle, 
  CheckCircle2, 
  Maximize2, 
  X, 
  Search,
  Check,
  Compass
} from 'lucide-react';

// 🚀 CERO LIBRERÍAS LEGACY (Elimina el LegacyApiNotActivatedMapError en el checkout)
const LIBRARIES: [] = [];

interface DeliveryMapPickerProps {
  config: DeliveryConfig | null;
  currencySymbol?: string;
  className?: string;
}

export const DeliveryMapPicker: React.FC<DeliveryMapPickerProps> = ({
  config,
  currencySymbol = '$',
  className = '',
}) => {
  const mapRef = useRef<google.maps.Map | null>(null);

  const [isOpenModal, setIsOpenModal] = useState(false);
  const [mounted, setMounted] = useState(false);

const {
    customerCoords,
    gpsAccuracyMeters,
    resolution,
    isLocatingGPS,
    gpsError,
    setCustomerCoords,
    detectCurrentGPSLocation,
  } = useDeliveryStore();

  // 🚀 FAIL-SAFE INGESTION: Si el bundle del cliente no tiene la clave, la obtiene del servidor
  const [googleApiKey, setGoogleApiKey] = useState<string>(
    process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || ''
  );

  useEffect(() => {
    setMounted(true);
    
    // Si la variable no vino en el build del cliente, consultamos al backend seguro
    if (!googleApiKey) {
      fetch('/api/geocode/config')
        .then((res) => res.json())
        .then((data) => {
          if (data.key) {
            setGoogleApiKey(data.key);
          }
        })
        .catch((err) => console.error('[Preziso Key Ingestion] Error:', err));
    }
  }, [googleApiKey]);

  const { isLoaded, loadError } = useJsApiLoader({
    googleMapsApiKey: googleApiKey,
    libraries: LIBRARIES,
    language: 'es',
    region: 'VE',
  });

  // Bloqueo de scroll cuando el modal está activo
  useEffect(() => {
    if (isOpenModal) {
      document.body.style.overflow = 'hidden';
      setTimeout(() => {
        if (mapRef.current) {
          const center = customerCoords || config?.store_location;
          if (center) {
            mapRef.current.panTo({ lat: center.lat, lng: center.lng });
          }
        }
      }, 300);
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpenModal, customerCoords, config?.store_location]);

  const storeLoc = config?.store_location;
  const defaultCenter = { 
    lat: customerCoords?.lat || storeLoc?.lat || 10.1620, 
    lng: customerCoords?.lng || storeLoc?.lng || -68.0077 
  };

  const onLoad = useCallback((map: google.maps.Map) => {
    mapRef.current = map;
    if (storeLoc && config?.rings && config.rings.length > 0 && !customerCoords) {
      const maxKm = Math.max(...config.rings.map(r => r.max_km));
      const degreeRadius = maxKm / 111;
      const bounds = new window.google.maps.LatLngBounds();
      bounds.extend({ lat: storeLoc.lat + degreeRadius, lng: storeLoc.lng + degreeRadius });
      bounds.extend({ lat: storeLoc.lat - degreeRadius, lng: storeLoc.lng - degreeRadius });
      map.fitBounds(bounds);
    }
  }, [config, customerCoords, storeLoc]);

  const onUnmount = useCallback(() => {
    mapRef.current = null;
  }, []);

  const onMapClick = (e: google.maps.MapMouseEvent) => {
    if (e.latLng) {
      const lat = e.latLng.lat();
      const lng = e.latLng.lng();
      setCustomerCoords({ lat, lng }, config);
    }
  };

const onMarkerDragEnd = (e: google.maps.MapMouseEvent) => {
    if (e.latLng) {
      const lat = e.latLng.lat();
      const lng = e.latLng.lng();
      setCustomerCoords({ lat, lng }, config);
    }
  };

  const handleSuggestionSelect = (coords: Coordinates) => {
    setCustomerCoords(coords, config);
    if (mapRef.current) {
      mapRef.current.panTo({ lat: coords.lat, lng: coords.lng });
      mapRef.current.setZoom(17);
    }
  };

  const handleGpsTrigger = async () => {
    const success = await detectCurrentGPSLocation(config);
    if (success && mapRef.current && customerCoords) {
      mapRef.current.panTo({ lat: customerCoords.lat, lng: customerCoords.lng });
      mapRef.current.setZoom(17);
    }
  };

  const maxConfiguredKm = config?.rings && config.rings.length > 0 
    ? Math.max(...config.rings.map(r => r.max_km)) 
    : 12;

  // =========================================================================
  // MODAL FLOTANTE PORTAL (Renderizado directo en document.body)
  // =========================================================================
  const modalContent = isOpenModal && mounted ? createPortal(
    <div className="fixed inset-0 z-999999 flex items-center justify-center p-0 md:p-6 lg:p-8 animate-in fade-in duration-200">
      
      {/* Backdrop con desenfoque de fondo */}
      <div 
        className="absolute inset-0 bg-black/70 backdrop-blur-md transition-opacity"
        onClick={() => setIsOpenModal(false)}
      />

      {/* Contenedor del Modal: Fullscreen en mobile, Caja panorámica en Desktop */}
      <div className="relative w-full h-[100dvh] md:h-[88vh] md:max-w-5xl bg-[var(--store-bg)] md:rounded-3xl shadow-2xl flex flex-col overflow-hidden border border-white/10 z-10">
        
        {/* Barra Superior del Modal */}
        <div className="px-5 py-4 border-b border-[var(--store-border)] flex items-center justify-between bg-[var(--store-surface)]/95 backdrop-blur-md shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl text-white shadow-sm" style={{ backgroundColor: 'var(--store-primary)' }}>
              <Compass size={18} />
            </div>
            <div>
              <h3 className="font-black text-sm md:text-base text-[var(--store-text-main)] tracking-tight">
                Ubica tu Entrega en el Mapa
              </h3>
              <p className="text-[11px] text-[var(--store-surface-text)] font-medium">
                Arrastra el pin rojo directamente sobre la entrada de tu casa o edificio
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setIsOpenModal(false)}
            className="p-2 rounded-full border border-[var(--store-border)] hover:bg-[var(--store-border)]/50 text-[var(--store-text-main)] transition-colors active:scale-95 shadow-sm"
          >
            <X size={18} />
          </button>
        </div>

  {/* Buscador y GPS Flotantes Superiores */}
        <div className="p-4 bg-[var(--store-bg)] border-b border-[var(--store-border)] flex flex-col sm:flex-row gap-2.5 shrink-0">
          <div className="flex-1">
            <AddressSearchAutocomplete
              onSelectSuggestion={handleSuggestionSelect}
              storeBiasCoords={config?.store_location}
              placeholder="Buscar urbanización, edificio o avenida..."
            />
          </div>

          <button
            type="button"
            onClick={handleGpsTrigger}
            disabled={isLocatingGPS}
            className="bg-[var(--store-surface)] text-[var(--store-text-main)] hover:bg-[var(--store-text-main)] hover:text-[var(--store-bg)] border border-[var(--store-border)] px-4 py-2.5 rounded-xl shadow-sm active:scale-95 transition-all flex items-center justify-center gap-2 text-xs font-bold shrink-0"
          >
            {isLocatingGPS ? (
              <Loader2 className="animate-spin text-blue-600" size={15} />
            ) : (
              <Navigation size={15} className="text-blue-600" />
            )}
            <span>Usar mi GPS</span>
          </button>
        </div>

       <div className="relative flex-1 w-full bg-[var(--store-surface)] overflow-hidden">
          {!googleApiKey ? (
            <div className="w-full h-full flex flex-col items-center justify-center p-6 text-center bg-zinc-50 dark:bg-zinc-900 gap-2">
              <AlertCircle size={28} className="text-amber-500" />
              <p className="text-xs font-bold text-zinc-800 dark:text-zinc-200">Clave de Google Maps no detectada en este despliegue</p>
              <p className="text-[11px] text-zinc-500 max-w-xs">Verifica que NEXT_PUBLIC_GOOGLE_MAPS_API_KEY esté activa en Vercel para todos los entornos.</p>
            </div>
          ) : !isLoaded ? (
            <div className="w-full h-full flex items-center justify-center bg-zinc-100 dark:bg-zinc-900 animate-pulse">
              <Loader2 className="animate-spin text-zinc-400" size={32} />
            </div>
          ) : (
            <GoogleMap
              mapContainerStyle={{ width: '100%', height: '100%' }}
              center={customerCoords ? { lat: customerCoords.lat, lng: customerCoords.lng } : defaultCenter}
              zoom={13}
              onLoad={onLoad}
              onUnmount={onUnmount}
              onClick={onMapClick}
              options={{
                disableDefaultUI: true,
                zoomControl: true,
                streetViewControl: false,
                mapTypeControl: false,
                fullscreenControl: false,
                clickableIcons: false,
              }}
            >
              {/* Anillos de Cobertura */}
              {storeLoc && config?.rings?.filter(r => r.is_active).map((ring) => (
                <Circle
                  key={ring.id}
                  center={{ lat: storeLoc.lat, lng: storeLoc.lng }}
                  radius={ring.max_km * 1000}
                  options={{
                    strokeColor: ring.color || '#3b82f6',
                    strokeOpacity: 0.8,
                    strokeWeight: 2,
                    fillColor: ring.color || '#3b82f6',
                    fillOpacity: 0.04,
                    clickable: false,
                  }}
                />
              ))}

            {/* Marcador de la Tienda */}
            {storeLoc && (
              <Marker
                position={{ lat: storeLoc.lat, lng: storeLoc.lng }}
                icon={{
                  path: 0, // Inmune a undefined durante la carga
                  scale: 8,
                  fillColor: "#000000",
                  fillOpacity: 1,
                  strokeWeight: 2,
                  strokeColor: "#ffffff",
                }}
              />
            )}
              {/* Pin del Cliente (Draggable) */}
              {customerCoords && (
                <Marker
                  position={{ lat: customerCoords.lat, lng: customerCoords.lng }}
                  draggable={true}
                  onDragEnd={onMarkerDragEnd}
                  animation={window.google.maps.Animation.DROP}
                />
              )}

              {/* Incertidumbre GPS */}
              {customerCoords && gpsAccuracyMeters && gpsAccuracyMeters > 40 && (
                <Circle
                  center={{ lat: customerCoords.lat, lng: customerCoords.lng }}
                  radius={gpsAccuracyMeters}
                  options={{
                    strokeColor: '#3b82f6',
                    strokeOpacity: 0.4,
                    strokeWeight: 1,
                    fillColor: '#3b82f6',
                    fillOpacity: 0.15,
                    clickable: false,
                  }}
                />
              )}
            </GoogleMap>
          )}

          {/* Globo Flotante Inferior de Tarifa / Estado */}
          <div className="absolute bottom-4 left-4 right-4 z-10 pointer-events-none">
            {resolution.status === 'in_zone' && (
              <div 
                className="mx-auto max-w-md w-full bg-[var(--store-surface)]/95 backdrop-blur-md p-3.5 rounded-2xl border-2 shadow-2xl flex items-center justify-between pointer-events-auto animate-in fade-in zoom-in-95 duration-150"
                style={{ borderColor: 'var(--store-incentive, #059669)' }}
              >
                <div className="flex items-center gap-2.5 min-w-0 pr-2">
                  <CheckCircle2 size={20} className="shrink-0" style={{ color: 'var(--store-incentive, #059669)' }} />
                  <div className="flex flex-col min-w-0">
                    <span className="text-xs font-black text-[var(--store-text-main)] uppercase tracking-wider truncate">
                      {resolution.ring?.name}
                    </span>
                    <span className="text-[10px] font-bold text-[var(--store-surface-text)] truncate">
                      A {resolution.distance_km} km de distancia del local
                    </span>
                  </div>
                </div>
                <span 
                  className="text-sm font-black px-3 py-1.5 rounded-xl shrink-0 text-white"
                  style={{ backgroundColor: 'var(--store-incentive, #059669)' }}
                >
                  +{currencySymbol}{resolution.price_usd.toFixed(2)}
                </span>
              </div>
            )}

            {resolution.status === 'out_of_coverage' && customerCoords && (
              <div className="mx-auto max-w-md w-full bg-rose-50 dark:bg-rose-950/90 backdrop-blur-md p-3.5 rounded-2xl border-2 border-rose-400 shadow-2xl pointer-events-auto space-y-1.5 animate-in fade-in zoom-in-95 duration-150">
                <div className="flex items-start gap-2.5 text-rose-800 dark:text-rose-200">
                  <AlertCircle size={17} className="shrink-0 mt-0.5 text-rose-600" />
                  <div>
                    <p className="text-xs font-black uppercase tracking-wider">
                      Fuera de Cobertura ({resolution.distance_km} km)
                    </p>
                    <p className="text-[11px] text-rose-700/80 dark:text-rose-300/80 font-medium">
                      La tienda despacha hasta un límite máximo de <strong>{maxConfiguredKm} km</strong>.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Barra Inferior de Confirmación */}
        <div className="p-4 bg-[var(--store-surface)] border-t border-[var(--store-border)] flex items-center justify-between gap-4 shrink-0">
          <div className="hidden sm:flex flex-col">
            <span className="text-xs font-bold text-[var(--store-text-main)]">
              {customerCoords ? 'Ubicación seleccionada' : 'Fija tu punto en el mapa'}
            </span>
            <span className="text-[10px] text-[var(--store-surface-text)]">
              {resolution.status === 'in_zone' ? 'Listo para calcular el despacho' : 'Arrastra el pin al área de cobertura'}
            </span>
          </div>

          <button
            type="button"
            onClick={() => setIsOpenModal(false)}
            disabled={!customerCoords || resolution.status === 'out_of_coverage'}
            className="w-full sm:w-auto px-6 py-3.5 rounded-xl font-black text-xs uppercase tracking-widest flex items-center justify-center gap-2 shadow-lg transition-all active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed"
            style={{ 
              backgroundColor: 'var(--store-primary)', 
              color: 'var(--store-primary-text)' 
            }}
          >
            <Check size={16} strokeWidth={3} />
            <span>Confirmar esta Ubicación</span>
          </button>
        </div>

      </div>
    </div>,
    document.body
  ) : null;

  // =========================================================================
  // TARJETA INLINE EN EL CHECKOUT (Compacta, elegante y sin sobrecargar)
  // =========================================================================
  return (
    <div className={`space-y-3 ${className}`}>
      
      {/* Tarjeta de Estado / Disparador del Modal */}
      <div 
        onClick={() => setIsOpenModal(true)}
        className="group relative cursor-pointer p-4 rounded-2xl border-2 border-[var(--store-border)] bg-[var(--store-surface)] hover:border-[var(--store-text-main)]/60 transition-all shadow-sm active:scale-[0.99] flex items-center justify-between gap-4"
      >
        <div className="flex items-center gap-3.5 min-w-0 flex-1">
          <div 
            className="p-3 rounded-xl shrink-0 transition-transform group-hover:scale-105 shadow-sm"
            style={{ 
              backgroundColor: customerCoords && resolution.status === 'in_zone' 
                ? 'var(--store-incentive, #059669)' 
                : 'var(--store-primary)',
              color: 'var(--store-primary-text)' 
            }}
          >
            <MapPin size={20} strokeWidth={2.5} />
          </div>

          <div className="flex flex-col min-w-0">
            {customerCoords && resolution.status === 'in_zone' ? (
              <>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-xs uppercase tracking-wider text-[var(--store-text-main)] truncate">
                    {resolution.ring?.name}
                  </span>
                  <span className="text-[10px] font-mono font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 px-1.5 py-0.5 rounded">
                    +{currencySymbol}{resolution.price_usd.toFixed(2)}
                  </span>
                </div>
                <span className="text-[11px] font-medium text-[var(--store-surface-text)] mt-0.5 truncate">
                  Ubicación fijada a {resolution.distance_km} km • Toca para editar
                </span>
              </>
            ) : customerCoords && resolution.status === 'out_of_coverage' ? (
              <>
                <span className="font-bold text-xs uppercase tracking-wider text-rose-600">
                  Fuera de Cobertura ({resolution.distance_km} km)
                </span>
                <span className="text-[11px] font-medium text-[var(--store-surface-text)] mt-0.5">
                  Toca para seleccionar un punto dentro del límite
                </span>
              </>
            ) : (
              <>
                <span className="font-bold text-xs uppercase tracking-wider text-[var(--store-text-main)]">
                  Seleccionar Ubicación de Entrega
                </span>
                <span className="text-[11px] font-medium text-[var(--store-surface-text)] mt-0.5">
                  Abre el mapa interactivo para marcar tu casa
                </span>
              </>
            )}
          </div>
        </div>

        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setIsOpenModal(true);
          }}
          className="shrink-0 px-3.5 py-2 rounded-xl text-xs font-bold uppercase tracking-wider border border-[var(--store-border)] bg-[var(--store-bg)] text-[var(--store-text-main)] group-hover:border-[var(--store-text-main)] transition-colors flex items-center gap-1.5"
        >
          <Maximize2 size={13} />
          <span className="hidden sm:inline">Ampliar</span>
        </button>
      </div>

      {/* Renderizado del Modal Flotante vía Portal */}
      {modalContent}

      {gpsError && (
        <p className="text-[11px] bg-amber-50 text-amber-800 border border-amber-200 px-3.5 py-2.5 rounded-xl font-medium animate-in fade-in flex items-center gap-2">
          <AlertCircle size={14} className="text-amber-600 shrink-0" />
          <span>{gpsError}</span>
        </p>
      )}
    </div>
  );
};