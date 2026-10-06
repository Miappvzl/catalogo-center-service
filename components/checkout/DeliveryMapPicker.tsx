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
  Check,
  Compass
} from 'lucide-react';

const LIBRARIES: [] = [];

interface DeliveryMapPickerProps {
  config: DeliveryConfig | null;
  currencySymbol?: string;
  className?: string;
}

// =========================================================================
// 🚀 COMPONENTE HIJO PROTEGIDO (Solo se monta cuando la clave es 100% real)
// =========================================================================
const GoogleMapInnerPicker: React.FC<{
  apiKey: string;
  config: DeliveryConfig | null;
  currencySymbol: string;
  onCloseModal: () => void;
  isFullscreen: boolean;
}> = ({ apiKey, config, currencySymbol, onCloseModal, isFullscreen }) => {
  const mapRef = useRef<google.maps.Map | null>(null);

  const {
    customerCoords,
    gpsAccuracyMeters,
    resolution,
    isLocatingGPS,
    gpsError,
    setCustomerCoords,
    detectCurrentGPSLocation,
  } = useDeliveryStore();

  const { isLoaded, loadError } = useJsApiLoader({
    id: 'preziso-google-maps-checkout',
    googleMapsApiKey: apiKey,
    libraries: LIBRARIES,
    language: 'es',
    region: 'VE',
  });

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

  if (loadError) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center p-6 text-center bg-zinc-50 dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 gap-2">
        <AlertCircle size={28} className="text-rose-500" />
        <p className="text-xs font-bold">Error cargando Google Maps ({loadError.message})</p>
      </div>
    );
  }

  return (
    <div className="relative w-full h-full flex flex-col">
      {/* Buscador y Botón GPS Superiores */}
      <div className="p-3.5 sm:p-4 bg-[var(--store-bg)] border-b border-[var(--store-border)] flex flex-col sm:flex-row gap-2.5 shrink-0 z-20">
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

      {/* Lienzo del Mapa */}
      <div className="relative flex-1 w-full bg-[var(--store-surface)] overflow-hidden">
        {!isLoaded ? (
          <div className="w-full h-full flex flex-col items-center justify-center bg-zinc-100 dark:bg-zinc-900 animate-pulse gap-2">
            <Loader2 className="animate-spin text-zinc-400" size={28} />
            <span className="text-[11px] font-mono text-zinc-400">Descargando mapa satelital...</span>
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
            {/* Anillos Radiales */}
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

            {/* Marcador de la Tienda (Punto Negro) */}
            {storeLoc && (
              <Marker
                position={{ lat: storeLoc.lat, lng: storeLoc.lng }}
                icon={{
                  path: 0,
                  scale: 8,
                  fillColor: "#000000",
                  fillOpacity: 1,
                  strokeWeight: 2,
                  strokeColor: "#ffffff",
                }}
              />
            )}

            {/* Marcador del Cliente (Draggable) */}
            {customerCoords && (
              <Marker
                position={{ lat: customerCoords.lat, lng: customerCoords.lng }}
                draggable={true}
                onDragEnd={onMarkerDragEnd}
                animation={window.google.maps.Animation.DROP}
              />
            )}

            {/* Círculo de Precisión GPS */}
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

        {/* Tarjeta de Telemetría Inferior */}
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
                    A {resolution.distance_km} km de distancia de la tienda
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

      {/* Botón Inferior de Fijación */}
      <div className="p-4 bg-[var(--store-surface)] border-t border-[var(--store-border)] flex items-center justify-between gap-4 shrink-0 z-20">
        <div className="hidden sm:flex flex-col">
          <span className="text-xs font-bold text-[var(--store-text-main)]">
            {customerCoords ? 'Ubicación seleccionada' : 'Fija tu punto en el mapa'}
          </span>
          <span className="text-[10px] text-[var(--store-surface-text)]">
            {resolution.status === 'in_zone' ? 'Listo para procesar tu orden' : 'Arrastra el pin al área de cobertura'}
          </span>
        </div>

        <button
          type="button"
          onClick={onCloseModal}
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
  );
};

// =========================================================================
// 🚀 COMPONENTE PRINCIPAL (GESTIÓN DE LLAVE FAIL-SAFE & PORTAL)
// =========================================================================
export const DeliveryMapPicker: React.FC<DeliveryMapPickerProps> = ({
  config,
  currencySymbol = '$',
  className = '',
}) => {
  const [isOpenModal, setIsOpenModal] = useState(false);
  const [mounted, setMounted] = useState(false);

  const {
    customerCoords,
    resolution,
    gpsError,
  } = useDeliveryStore();

  const [googleApiKey, setGoogleApiKey] = useState<string>(
    config?.google_maps_api_key || process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || ''
  );

  // 🚀 TELEMETRÍA DE DIAGNÓSTICO EN TIEMPO REAL
  const [diagnostic, setDiagnostic] = useState<{
    envKey: string;
    ssrPropKey: string;
    endpointStatus: string;
    endpointKeyPreview: string;
    errorMessage: string;
  }>({
    envKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ? 'Presente en Bundle' : 'Vacía / No inyectada',
    ssrPropKey: config?.google_maps_api_key ? 'Presente en SSR' : 'Vacía en Props',
    endpointStatus: 'Consultando...',
    endpointKeyPreview: '',
    errorMessage: '',
  });

  useEffect(() => {
    setMounted(true);
    
    // Si ya la tiene por variable o SSR, la fijamos de inmediato
    const existing = config?.google_maps_api_key || process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || '';
    if (existing) {
      setGoogleApiKey(existing);
      return;
    }

    // Consulta activa con diagnóstico detallado
    fetch('/api/geocode/config')
      .then(async (res) => {
        const status = `${res.status} ${res.statusText}`;
        if (!res.ok) {
          setDiagnostic((prev) => ({
            ...prev,
            endpointStatus: status,
            errorMessage: `El endpoint respondió con error HTTP ${res.status}`,
          }));
          return;
        }

        const data = await res.json();
        const serverKey = data.key || '';

        setDiagnostic((prev) => ({
          ...prev,
          endpointStatus: status,
          endpointKeyPreview: serverKey ? `${serverKey.slice(0, 8)}... (${serverKey.length} chars)` : 'VACÍA (El servidor no tiene la variable)',
        }));

        if (serverKey) {
          setGoogleApiKey(serverKey);
        }
      })
      .catch((err) => {
        setDiagnostic((prev) => ({
          ...prev,
          endpointStatus: 'Fallo de Conexión',
          errorMessage: err.message || 'No se pudo conectar con el servidor',
        }));
      });
  }, [config?.google_maps_api_key]);

  useEffect(() => {
    if (isOpenModal) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpenModal]);

  // =========================================================================
  // MODAL FLOTANTE PORTAL (Con Panel de Telemetría Integrado)
  // =========================================================================
  const modalContent = isOpenModal && mounted ? createPortal(
    <div className="fixed inset-0 z-999999 flex items-center justify-center p-0 md:p-6 lg:p-8 animate-in fade-in duration-200">
      
      <div 
        className="absolute inset-0 bg-black/70 backdrop-blur-md transition-opacity"
        onClick={() => setIsOpenModal(false)}
      />

      <div className="relative w-full h-[100dvh] md:h-[88vh] md:max-w-5xl bg-[var(--store-bg)] md:rounded-3xl shadow-2xl flex flex-col overflow-hidden border border-white/10 z-10">
        
        {/* Barra Superior */}
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

        {/* 🚀 CONDICIÓN: Si la clave está lista muestra el mapa; si no, muestra el Inspector de Diagnóstico */}
        {googleApiKey ? (
          <GoogleMapInnerPicker
            apiKey={googleApiKey}
            config={config}
            currencySymbol={currencySymbol}
            onCloseModal={() => setIsOpenModal(false)}
            isFullscreen={true}
          />
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center p-6 text-center bg-zinc-50 dark:bg-zinc-900 gap-4">
            <div className="w-full max-w-md bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-5 text-left font-mono text-xs space-y-3 shadow-lg">
              <div className="flex items-center justify-between border-b border-zinc-100 dark:border-zinc-800 pb-2.5">
                <span className="font-bold text-xs text-zinc-900 dark:text-zinc-100 flex items-center gap-1.5 font-sans">
                  🔍 Telemetría de Diagnóstico de Credenciales
                </span>
                <span className="text-[10px] text-zinc-400">Preziso Engine</span>
              </div>

              <div className="space-y-2 text-[11px] leading-relaxed">
                <p className="flex justify-between">
                  <span className="text-zinc-500">1. Client Bundle Env:</span>
                  <strong className={diagnostic.envKey.includes('Presente') ? 'text-emerald-600' : 'text-rose-600'}>
                    {diagnostic.envKey}
                  </strong>
                </p>

                <p className="flex justify-between">
                  <span className="text-zinc-500">2. Server SSR Prop:</span>
                  <strong className={diagnostic.ssrPropKey.includes('Presente') ? 'text-emerald-600' : 'text-rose-600'}>
                    {diagnostic.ssrPropKey}
                  </strong>
                </p>

                <p className="flex justify-between">
                  <span className="text-zinc-500">3. Ruta /api/geocode/config:</span>
                  <strong className={diagnostic.endpointStatus.includes('200') ? 'text-emerald-600' : 'text-amber-600'}>
                    {diagnostic.endpointStatus}
                  </strong>
                </p>

                <p className="flex justify-between">
                  <span className="text-zinc-500">4. Clave devuelta por Servidor:</span>
                  <strong className={diagnostic.endpointKeyPreview.includes('...') ? 'text-emerald-600' : 'text-rose-600'}>
                    {diagnostic.endpointKeyPreview || 'Sin datos'}
                  </strong>
                </p>

                {diagnostic.errorMessage && (
                  <p className="p-2 bg-rose-50 text-rose-700 rounded-lg text-[10px] border border-rose-200">
                    ⚠️ {diagnostic.errorMessage}
                  </p>
                )}
              </div>
            </div>

            <button
              type="button"
              onClick={() => window.location.reload()}
              className="px-5 py-2.5 bg-zinc-950 text-white rounded-xl text-xs font-bold font-sans hover:bg-black transition-all"
            >
              Reintentar Conexión
            </button>
          </div>
        )}

      </div>
    </div>,
    document.body
  ) : null;

  // =========================================================================
  // TARJETA INLINE EN EL CHECKOUT
  // =========================================================================
  return (
    <div className={`space-y-3 ${className}`}>
      
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