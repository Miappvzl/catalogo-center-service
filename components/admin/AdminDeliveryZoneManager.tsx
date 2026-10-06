'use client';

import React, { useState, useCallback, useRef, useEffect } from 'react';
import { useJsApiLoader, GoogleMap, Marker } from '@react-google-maps/api';
import { 
  Store, Plus, Trash2, DollarSign, Check, Navigation, Sliders, Crosshair, 
  AlertCircle, Search, Zap, Clock, ShieldCheck, ChevronRight, Loader2
} from 'lucide-react';
import { DeliveryConfig, DeliveryRing } from '@/utils/geoUtils';
import { AddressSearchAutocomplete } from '@/components/checkout/AddressSearchAutocomplete';
import { NumberInput } from '../NumberInput';

// Solo cargamos la base vectorial (Cero librerías legacy para evitar LegacyApiNotActivatedMapError)
const LIBRARIES: [] = [];

interface AdminDeliveryZoneManagerProps {
  deliveryConfig: DeliveryConfig;
  onChange: (updatedConfig: DeliveryConfig) => void;
}

// 🚀 ESTRATEGIAS EN PALETA NEUTRA / OBSIDIANA PREZISO
const LOGISTICS_STRATEGIES = [
  {
    id: 'food',
    name: 'Comida / Express',
    desc: 'Hasta 9 km • Preserva la temperatura del pedido',
    rings: [
      { id: 'r1', name: 'Zona Corta (0-3 km)', max_km: 3.0, price_usd: 1.50, color: '#3f3f46', is_active: true },
      { id: 'r2', name: 'Zona Media (3-6 km)', max_km: 6.0, price_usd: 3.00, color: '#52525b', is_active: true },
      { id: 'r3', name: 'Límite (6-9 km)', max_km: 9.0, price_usd: 4.50, color: '#71717a', is_active: true },
    ]
  },
  {
    id: 'retail',
    name: 'Retail / Ropa',
    desc: 'Hasta 16 km • Cobertura metropolitana amplia',
    rings: [
      { id: 'r1', name: 'Urbana (0-5 km)', max_km: 5.0, price_usd: 2.50, color: '#3f3f46', is_active: true },
      { id: 'r2', name: 'Metropolitana (5-10 km)', max_km: 10.0, price_usd: 4.00, color: '#52525b', is_active: true },
      { id: 'r3', name: 'Periférica (10-16 km)', max_km: 16.0, price_usd: 6.00, color: '#71717a', is_active: true },
    ]
  },
  {
    id: 'flat',
    name: 'Tarifa Plana',
    desc: 'Radio único • Precio estándar para la ciudad',
    rings: [
      { id: 'r1', name: 'Cobertura General (0-10 km)', max_km: 10.0, price_usd: 3.00, color: '#3f3f46', is_active: true },
    ]
  }
];

export const AdminDeliveryZoneManager: React.FC<AdminDeliveryZoneManagerProps> = ({
  deliveryConfig,
  onChange,
}) => {
  const mapRef = useRef<google.maps.Map | null>(null);
  const circlesRef = useRef<google.maps.Circle[]>([]);

  // Estados interactivos
  const [hoveredRingId, setHoveredRingId] = useState<string | null>(null);
  const [simDistanceKm, setSimDistanceKm] = useState<number | null>(null);
  const [simMatchedRing, setSimMatchedRing] = useState<DeliveryRing | null>(null);
  const [simulatorPos, setSimulatorPos] = useState<{lat: number, lng: number} | null>(null);

  const { isLoaded, loadError } = useJsApiLoader({
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY as string,
    libraries: LIBRARIES,
    language: 'es',
    region: 'VE'
  });

  const storeLocation = deliveryConfig.store_location;
  
  const rings: DeliveryRing[] = (deliveryConfig.rings && deliveryConfig.rings.length > 0)
    ? deliveryConfig.rings
    : LOGISTICS_STRATEGIES[1].rings;

  // Cálculo geodésico Haversine exacto
  const calculateDistanceKm = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371;
    const dLat = (lat2 - lat1) * (Math.PI / 180);
    const dLon = (lon2 - lon1) * (Math.PI / 180);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return Math.round(R * c * 10) / 10;
  };

  const updateSimulatorEvaluation = useCallback((simLat: number, simLng: number, currentStore: any, currentRings: DeliveryRing[]) => {
    if (!currentStore) return;
    const dist = calculateDistanceKm(currentStore.lat, currentStore.lng, simLat, simLng);
    setSimDistanceKm(dist);

    const sorted = [...currentRings].filter(r => r.is_active).sort((a, b) => a.max_km - b.max_km);
    const match = sorted.find(r => dist <= r.max_km) || null;
    setSimMatchedRing(match);
  }, []);

  // 🚀 RENDERIZADO IMPERATIVO LIMPIO (Destruye huérfanos antes de crear)
  const renderCirclesImperatively = useCallback((
    map: google.maps.Map | null, 
    loc: { lat: number; lng: number } | null, 
    activeRings: DeliveryRing[],
    highlightedId: string | null = null
  ) => {
    if (!window.google || !map) return;

    circlesRef.current.forEach(circle => circle.setMap(null));
    circlesRef.current = [];

    if (!loc) return;

    const sorted = [...activeRings].filter(r => r.is_active).sort((a, b) => b.max_km - a.max_km);

    circlesRef.current = sorted.map(ring => {
      const isHighlighted = highlightedId === ring.id;
      return new window.google.maps.Circle({
        map: map,
        center: { lat: loc.lat, lng: loc.lng },
        radius: ring.max_km * 1000,
        strokeColor: ring.color || '#3f3f46',
        strokeOpacity: isHighlighted ? 1 : 0.65,
        strokeWeight: isHighlighted ? 3.5 : 1.5,
        fillColor: ring.color || '#3f3f46',
        fillOpacity: isHighlighted ? 0.08 : 0.03,
        clickable: false,
      });
    });
  }, []);

  useEffect(() => {
    if (mapRef.current && storeLocation) {
      renderCirclesImperatively(mapRef.current, storeLocation, rings, hoveredRingId);
    }
  }, [rings, storeLocation, hoveredRingId, renderCirclesImperatively]);

  useEffect(() => {
    return () => {
      circlesRef.current.forEach(c => c.setMap(null));
      circlesRef.current = [];
    };
  }, []);

  const onLoad = useCallback((map: google.maps.Map) => {
    mapRef.current = map;
    if (storeLocation && rings.length > 0) {
      const maxKm = Math.max(...rings.map(r => r.max_km));
      const degreeRadius = maxKm / 111;
      const bounds = new window.google.maps.LatLngBounds();
      bounds.extend({ lat: storeLocation.lat + degreeRadius, lng: storeLocation.lng + degreeRadius });
      bounds.extend({ lat: storeLocation.lat - degreeRadius, lng: storeLocation.lng - degreeRadius });
      map.fitBounds(bounds);
      
      const initSimLat = storeLocation.lat;
      const initSimLng = storeLocation.lng + 0.02;
      setSimulatorPos({ lat: initSimLat, lng: initSimLng });
      updateSimulatorEvaluation(initSimLat, initSimLng, storeLocation, rings);
      renderCirclesImperatively(map, storeLocation, rings, null);
    }
  }, [storeLocation, rings, updateSimulatorEvaluation, renderCirclesImperatively]);

  const onUnmount = useCallback(() => {
    circlesRef.current.forEach(c => c.setMap(null));
    circlesRef.current = [];
    mapRef.current = null;
  }, []);

  const handleLocationChange = (newLoc: { lat: number; lng: number; address: string }, shouldFly = true) => {
    onChange({
      ...deliveryConfig,
      store_location: newLoc,
      rings,
    });

    if (shouldFly && mapRef.current) {
      mapRef.current.panTo({ lat: newLoc.lat, lng: newLoc.lng });
      mapRef.current.setZoom(13);
    }

    const freshSimLat = newLoc.lat + 0.015;
    const freshSimLng = newLoc.lng + 0.015;
    setSimulatorPos({ lat: freshSimLat, lng: freshSimLng });
    updateSimulatorEvaluation(freshSimLat, freshSimLng, newLoc, rings);

    if (mapRef.current) {
      renderCirclesImperatively(mapRef.current, newLoc, rings, null);
    }
  };

  const onMapClick = (e: google.maps.MapMouseEvent) => {
    if (e.latLng) {
      handleLocationChange({
        lat: e.latLng.lat(),
        lng: e.latLng.lng(),
        address: storeLocation?.address || 'Ubicación seleccionada en el mapa',
      }, false);
    }
  };

  const onStoreMarkerDragEnd = (e: google.maps.MapMouseEvent) => {
    if (e.latLng) {
      handleLocationChange({
        lat: e.latLng.lat(),
        lng: e.latLng.lng(),
        address: storeLocation?.address || 'Ubicación física de la tienda',
      }, false);
    }
  };

  const onSimulatorDrag = (e: google.maps.MapMouseEvent) => {
    if (e.latLng && storeLocation) {
      const lat = e.latLng.lat();
      const lng = e.latLng.lng();
      setSimulatorPos({ lat, lng });
      updateSimulatorEvaluation(lat, lng, storeLocation, rings);
    }
  };

  const handleUseCurrentLocation = () => {
    if (typeof window !== 'undefined' && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition((pos) => {
        handleLocationChange({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          address: 'Ubicación actual detectada por GPS',
        }, true);
      });
    }
  };

  // Sliders en cascada fluida
  const handleCascadingSliderChange = (index: number, newKm: number) => {
    const updated = [...rings];
    updated[index] = { ...updated[index], max_km: newKm };

    for (let i = index + 1; i < updated.length; i++) {
      if (updated[i].max_km <= updated[i - 1].max_km) {
        updated[i] = { ...updated[i], max_km: Number((updated[i - 1].max_km + 1.0).toFixed(1)) };
      }
    }

    for (let i = index - 1; i >= 0; i--) {
      if (updated[i].max_km >= updated[i + 1].max_km) {
        updated[i] = { ...updated[i], max_km: Math.max(0.5, Number((updated[i + 1].max_km - 1.0).toFixed(1))) };
      }
    }

    onChange({ ...deliveryConfig, rings: updated });

    if (simulatorPos && storeLocation) {
      updateSimulatorEvaluation(simulatorPos.lat, simulatorPos.lng, storeLocation, updated);
    }
  };

  const applyStrategy = (strategy: typeof LOGISTICS_STRATEGIES[0]) => {
    onChange({
      ...deliveryConfig,
      rings: strategy.rings,
    });
  };

  const updateRingField = (id: string, field: keyof DeliveryRing, val: any) => {
    const updated = rings.map(r => r.id === id ? { ...r, [field]: val } : r);
    onChange({ ...deliveryConfig, rings: updated });
  };

  const addRing = () => {
    const sorted = [...rings].sort((a, b) => a.max_km - b.max_km);
    const lastKm = sorted.length > 0 ? sorted[sorted.length - 1].max_km : 4.0;
    const lastPrice = sorted.length > 0 ? sorted[sorted.length - 1].price_usd : 2.50;

    const newRing: DeliveryRing = {
      id: `ring-${Date.now()}`,
      name: `Zona ${rings.length + 1}`,
      max_km: Math.min(25, Number((lastKm + 3.0).toFixed(1))),
      price_usd: Number((lastPrice + 1.50).toFixed(2)),
      color: '#71717a',
      is_active: true,
    };

    onChange({ ...deliveryConfig, rings: [...rings, newRing] });
  };

  const removeRing = (id: string) => {
    const updated = rings.filter(r => r.id !== id);
    onChange({ ...deliveryConfig, rings: updated });
  };

  const getTimeEstimateBadge = (km: number) => {
    if (km <= 4) return '~10-15 min';
    if (km <= 8) return '~20-30 min';
    return '~35-50 min';
  };

  const maxCoverageKm = rings.length > 0 ? Math.max(...rings.map(r => r.max_km)) : 0;
  const defaultCenterCoord = { lat: storeLocation?.lat || 10.1620, lng: storeLocation?.lng || -68.0077 };

  if (loadError) {
    return <div className="p-4 text-center text-zinc-950 font-bold bg-zinc-100 rounded-xl">Error cargando Google Maps. Verifica tu clave de API.</div>;
  }

  // =========================================================================
  // ARQUITECTURA MOBILE-FIRST / OBSIDIANA PREZISO
  // =========================================================================
  return (
    <div className="space-y-6 pt-1 antialiased text-zinc-900 dark:text-zinc-100">

      {/* 1. MODELOS DE DESPACHO (Micro-Píldoras Sobrias) */}
      <div className="bg-zinc-950 text-white p-4 rounded-2xl shadow-sm space-y-2.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-zinc-400" />
            <span className="text-xs font-bold tracking-tight uppercase">Piloto de Despacho</span>
          </div>
          <span className="text-[10px] font-mono text-zinc-400">1-Clic Setup</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          {LOGISTICS_STRATEGIES.map((strat) => (
            <button
              key={strat.id}
              type="button"
              onClick={() => applyStrategy(strat)}
              className="bg-zinc-900 hover:bg-zinc-800/80 active:scale-[0.99] border border-zinc-800 p-2.5 rounded-xl text-left transition-all group flex flex-col justify-between"
            >
              <div>
                <span className="text-xs font-bold text-zinc-100 block">{strat.name}</span>
                <span className="text-[10px] text-zinc-400 leading-snug line-clamp-1 mt-0.5">{strat.desc}</span>
              </div>
              <span className="text-[9px] font-mono text-zinc-300 group-hover:text-white mt-1.5 font-semibold flex items-center gap-0.5">
                Cargar ➔
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* 2. CONSOLA SPLIT (Sin muñecas rusas) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">

        {/* ========================================================= */}
        {/* COLUMNA IZQUIERDA: CONFIGURACIÓN DE SEDE Y ESCALONES      */}
        {/* ========================================================= */}
        <div className="lg:col-span-6 xl:col-span-5 space-y-4">
          
          {/* PASO 1: SEDE CENTRAL (Plana, limpia) */}
          <div className="border-b border-zinc-200 dark:border-zinc-800 pb-4 space-y-2.5">
            <div className="flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-zinc-950 dark:bg-white text-white dark:text-zinc-950 text-[10px] flex items-center justify-center font-mono font-bold">1</span>
              <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-950 dark:text-zinc-100">Sede de Despacho</h4>
            </div>

            <div className="flex gap-2">
              <div className="flex-1">
                {/* 🚀 BUSCADOR CONECTADO A PLACES API (NEW) - CERO ERROR LEGACY */}
                <AddressSearchAutocomplete
                  onSelectSuggestion={(coords, label) => {
                    handleLocationChange({ lat: coords.lat, lng: coords.lng, address: label }, true);
                  }}
                  placeholder="Buscar sede o dirección con Google..."
                />
              </div>

              <button 
                type="button" 
                onClick={handleUseCurrentLocation} 
                className="bg-zinc-900 text-white hover:bg-zinc-800 active:scale-95 px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 shrink-0 shadow-xs"
              >
                <Navigation size={12} className="text-zinc-300" />
                <span className="hidden sm:inline font-mono">GPS</span>
              </button>
            </div>

            {storeLocation ? (
              <div className="flex items-center justify-between text-xs py-1 px-0.5">
                <span className="font-medium text-zinc-700 dark:text-zinc-300 truncate text-[11px] flex items-center gap-1.5">
                  <Check size={13} className="text-zinc-950 dark:text-white shrink-0" />
                  {storeLocation.address}
                </span>
                <span className="text-[10px] font-mono text-zinc-400 shrink-0 ml-2">
                  {storeLocation.lat.toFixed(3)}, {storeLocation.lng.toFixed(3)}
                </span>
              </div>
            ) : (
              <p className="text-[11px] text-zinc-400">Fija el punto de salida en el buscador o toca el mapa.</p>
            )}
          </div>

          {/* PASO 2: MATRIZ DE ESCALONES CON SCROLL INTERNO */}
          <div className="space-y-3 pt-1">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-zinc-950 dark:bg-white text-white dark:text-zinc-950 text-[10px] flex items-center justify-center font-mono font-bold">2</span>
                <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-950 dark:text-zinc-100">Escalones de Tarifa</h4>
              </div>

              <button
                type="button"
                onClick={addRing}
                disabled={rings.length >= 5}
                className="text-zinc-900 dark:text-zinc-100 hover:text-black dark:hover:text-white px-2 py-1 text-xs font-bold transition-all flex items-center gap-1 border border-zinc-200 dark:border-zinc-800 rounded-lg disabled:opacity-30"
              >
                <Plus size={12} />
                <span>Agregar</span>
              </button>
            </div>

            {/* 🚀 CONTENEDOR CON SCROLL INTERNO INDEPENDIENTE */}
            <div className="max-h-[290px] overflow-y-auto overscroll-contain pr-1.5 space-y-2 divide-y-0 scrollbar-thin">
              {rings.map((ring, idx) => {
                const prevKm = idx === 0 ? 0 : rings[idx - 1]?.max_km || 0;
                const estimate = getTimeEstimateBadge(ring.max_km);
                const isHovered = hoveredRingId === ring.id;

                return (
                  <div
                    key={ring.id}
                    onMouseEnter={() => setHoveredRingId(ring.id)}
                    onMouseLeave={() => setHoveredRingId(null)}
                    className={`p-3 rounded-xl border transition-all space-y-2 ${
                      isHovered 
                        ? 'border-zinc-950 dark:border-zinc-100 bg-zinc-50/50 dark:bg-zinc-900/50 shadow-xs' 
                        : 'border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950'
                    }`}
                  >
                    {/* Fila 1: Color + Nombre + Tarifa + Delete */}
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        <input
                          type="color"
                          value={ring.color}
                          onChange={(e) => updateRingField(ring.id, 'color', e.target.value)}
                          className="w-4 h-4 rounded border-0 cursor-pointer p-0 bg-transparent shrink-0"
                          title="Tono en el mapa"
                        />
                        <div className="flex-1 min-w-0">
                          <input
                            type="text"
                            value={ring.name}
                            onChange={(e) => updateRingField(ring.id, 'name', e.target.value)}
                            className="w-full bg-transparent p-0 text-xs font-bold outline-none text-zinc-950 dark:text-zinc-50 border-0 focus:ring-0 truncate"
                          />
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        <div className="w-20 relative bg-zinc-50 dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800">
                          <span className="absolute left-2 top-1/2 -translate-y-1/2 text-zinc-400 font-bold text-[10px]">
                            $
                          </span>
                          <NumberInput
                            value={ring.price_usd}
                            onChangeValue={(val) => updateRingField(ring.id, 'price_usd', val)}
                            className="w-full bg-transparent pl-4 pr-1.5 py-1 text-xs font-bold outline-none text-zinc-900 dark:text-zinc-100 text-right font-mono"
                          />
                        </div>

                        <button
                          type="button"
                          onClick={() => removeRing(ring.id)}
                          disabled={rings.length <= 1}
                          className="p-1 text-zinc-400 hover:text-rose-600 transition-colors disabled:opacity-20"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>

                    {/* Fila 2: Slider de Kilómetros */}
                    <div className="flex items-center gap-2.5 pt-0.5">
                      <span className="text-[10px] font-mono text-zinc-400 uppercase shrink-0">
                        {prevKm} ➔ {ring.max_km.toFixed(1)} km
                      </span>
                      
                      <input
                        type="range"
                        min="1"
                        max="25"
                        step="0.5"
                        value={ring.max_km}
                        onChange={(e) => handleCascadingSliderChange(idx, parseFloat(e.target.value))}
                        className="flex-1 accent-zinc-950 dark:accent-white cursor-pointer h-1 bg-zinc-200 dark:bg-zinc-800 rounded-lg"
                      />

                      <span className="text-[10px] font-mono text-zinc-400 shrink-0">
                        {estimate}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Aviso de Límite Máximo */}
            {maxCoverageKm > 0 && (
              <div className="pt-1 flex items-center justify-between text-[11px] text-zinc-500 font-medium">
                <span className="flex items-center gap-1.5">
                  <ShieldCheck size={13} className="text-zinc-400" /> Cobertura máxima activa:
                </span>
                <span className="font-mono font-bold text-zinc-900 dark:text-zinc-100">
                  {maxCoverageKm} km (Fuera de rango se bloquea)
                </span>
              </div>
            )}
          </div>

        </div>

        {/* ========================================================= */}
        {/* COLUMNA DERECHA: MAPA DE GOOGLE STICKY CON RADAR SOBRIO   */}
        {/* ========================================================= */}
        <div className="lg:col-span-6 xl:col-span-7 lg:sticky lg:top-4 space-y-2">
          
          <div className="relative w-full h-[340px] sm:h-[420px] lg:h-[500px] rounded-2xl overflow-hidden border border-zinc-200 dark:border-zinc-800 shadow-sm bg-zinc-100 dark:bg-zinc-900">
            
            {/* 🚀 TELEMETRÍA FLOTANTE SOBRIA (Obsidiana) */}
            <div className="absolute top-3 left-3 right-3 z-10 pointer-events-none">
              <div className="bg-zinc-950/90 text-white p-2.5 px-3.5 rounded-xl shadow-lg flex items-center justify-between gap-3 text-xs border border-zinc-800 backdrop-blur-md pointer-events-auto">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="w-1.5 h-1.5 rounded-full bg-zinc-300 animate-ping shrink-0" />
                  <span className="font-bold text-[11px] truncate flex items-center gap-1.5 text-zinc-200">
                    <Crosshair size={12} className="text-zinc-400" />
                    {storeLocation ? 'Probador en Vivo (Mueve el pin amarillo)' : 'Fija tu sede primero'}
                  </span>
                </div>

                {storeLocation && simDistanceKm !== null && (
                  <div className="shrink-0">
                    {simMatchedRing ? (
                      <span className="bg-zinc-100 text-zinc-950 font-mono font-black px-2 py-0.5 rounded text-[11px]">
                        {simDistanceKm} km ➔ ${simMatchedRing.price_usd.toFixed(2)} USD
                      </span>
                    ) : (
                      <span className="bg-zinc-800 text-zinc-400 font-mono font-bold px-2 py-0.5 rounded text-[10px]">
                        {simDistanceKm} km ➔ Fuera de Rango
                      </span>
                    )}
                  </div>
                )}
              </div>
            </div>

        {/* Lienzo Google Maps Protegido por isLoaded */}
            {!isLoaded ? (
              <div className="w-full h-full flex flex-col items-center justify-center bg-zinc-100 dark:bg-zinc-900 animate-pulse gap-2">
                <Loader2 className="animate-spin text-zinc-400" size={26} />
                <span className="text-[11px] font-mono text-zinc-400">Cargando Google Maps...</span>
              </div>
            ) : (
              <GoogleMap
                mapContainerStyle={{ width: '100%', height: '100%' }}
                center={defaultCenterCoord}
                zoom={12}
                onLoad={onLoad}
                onUnmount={onUnmount}
                onClick={onMapClick}
                options={{ 
                  disableDefaultUI: true, 
                  zoomControl: true, 
                  streetViewControl: false,
                  mapTypeControl: false,
                }}
              >
                {/* Pin de Sede (Negro con borde blanco) */}
                {storeLocation && (
                  <Marker
                    position={{ lat: storeLocation.lat, lng: storeLocation.lng }}
                    draggable={true}
                    onDragEnd={onStoreMarkerDragEnd}
                    icon={{ 
                      path: 0, // 0 equivale a SymbolPath.CIRCLE (Inmune a undefined)
                      scale: 8, 
                      fillColor: "#09090b", 
                      fillOpacity: 1, 
                      strokeWeight: 2, 
                      strokeColor: "#ffffff" 
                    }}
                  />
                )}

                {/* Pin Simulador (Gris Claro / Grafito diferenciado) */}
                {simulatorPos && (
                  <Marker
                    position={{ lat: simulatorPos.lat, lng: simulatorPos.lng }}
                    draggable={true}
                    onDrag={onSimulatorDrag}
                    icon={{ 
                      path: 0, // 0 equivale a SymbolPath.CIRCLE (Inmune a undefined)
                      scale: 7, 
                      fillColor: "#e4e4e7", 
                      fillOpacity: 1, 
                      strokeWeight: 2, 
                      strokeColor: "#18181b" 
                    }}
                  />
                )}
              </GoogleMap>
            )}

          </div>

        </div>

      </div>

    </div>
  );
};