'use client';

import React, { useState, useEffect, useRef, useTransition } from 'react';
import { Coordinates, GeocodingSuggestion, searchAddressPhoton } from '@/utils/geoUtils';

interface AddressSearchAutocompleteProps {
  onSelectSuggestion: (coords: Coordinates, label: string) => void;
  storeBiasCoords?: Coordinates | null;
  placeholder?: string;
  className?: string;
}

export const AddressSearchAutocomplete: React.FC<AddressSearchAutocompleteProps> = ({
  onSelectSuggestion,
  storeBiasCoords,
  placeholder = 'Buscar urbanización, sector o avenida (ej: La Esmeralda, San Diego)...',
  className = '',
}) => {
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState<GeocodingSuggestion[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [hasNoResults, setHasNoResults] = useState(false);
  const [isSearching, startTransition] = useTransition();
  const dropdownRef = useRef<HTMLDivElement>(null);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setHasNoResults(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Búsqueda automática mientras escribe (350ms debounce)
  useEffect(() => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    if (query.trim().length < 3) {
      setSuggestions([]);
      setIsOpen(false);
      setHasNoResults(false);
      return;
    }

    debounceTimerRef.current = setTimeout(() => {
      startTransition(async () => {
        const results = await searchAddressPhoton(query, storeBiasCoords);
        setSuggestions(results);
        setIsOpen(results.length > 0);
        setHasNoResults(results.length === 0);
      });
    }, 350);

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [query, storeBiasCoords]);

  const handleSelect = (suggestion: GeocodingSuggestion) => {
    setQuery(suggestion.label);
    setIsOpen(false);
    setHasNoResults(false);
    onSelectSuggestion(suggestion.coordinates, suggestion.label);
  };

  // Ejecución forzada al presionar ENTER o pulsar la lupa
  const handleForceSearch = async () => {
    if (!query || query.trim().length < 2) return;

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    startTransition(async () => {
      const results = await searchAddressPhoton(query, storeBiasCoords);
      if (results.length > 0) {
        handleSelect(results[0]);
      } else {
        setSuggestions([]);
        setIsOpen(false);
        setHasNoResults(true);
      }
    });
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (suggestions.length > 0 && isOpen) {
        handleSelect(suggestions[0]);
      } else {
        handleForceSearch();
      }
    } else if (e.key === 'Escape') {
      setIsOpen(false);
      setHasNoResults(false);
    }
  };

  const handleClear = () => {
    setQuery('');
    setSuggestions([]);
    setIsOpen(false);
    setHasNoResults(false);
  };

  return (
    <div ref={dropdownRef} className={`relative w-full ${className}`}>
      <div className="relative flex items-center">
        {/* Botón Lupa */}
        <button
          type="button"
          onClick={handleForceSearch}
          className="absolute left-3 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 transition-colors flex items-center"
          title="Presiona para buscar"
        >
          {isSearching ? (
            <svg className="animate-spin h-4 w-4 text-blue-600" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
          ) : (
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          )}
        </button>

        {/* Input */}
        <input
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            if (hasNoResults) setHasNoResults(false);
          }}
          onKeyDown={handleKeyDown}
          onFocus={() => {
            if (suggestions.length > 0) setIsOpen(true);
          }}
          placeholder={placeholder}
          className="w-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl pl-10 pr-16 py-2.5 text-xs sm:text-sm text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-900 dark:focus:ring-zinc-100 transition-all shadow-sm"
        />
        {/* Badge 'Enter' y Botón Limpiar */}
        <div className="absolute right-3 flex items-center gap-1.5">
          {query.length > 0 && (
            <button
              type="button"
              onClick={handleClear}
              className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 p-0.5 rounded-full transition-colors"
              title="Borrar"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
          <span className="hidden sm:inline-block text-[10px] font-mono text-zinc-400 bg-zinc-100 dark:bg-zinc-800 px-1.5 py-0.5 rounded border border-zinc-200 dark:border-zinc-700">
            ↵ Enter
          </span>
        </div>
      </div>

      {/* Menú Dropdown de Sugerencias */}
      {isOpen && suggestions.length > 0 && (
        <div className="absolute z-50 left-0 right-0 mt-1.5 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-xl overflow-hidden max-h-60 overflow-y-auto divide-y divide-zinc-100 dark:divide-zinc-800/60 animate-in fade-in slide-in-from-top-1 duration-150">
          {suggestions.map((suggestion) => (
            <button
              key={suggestion.id}
              type="button"
              onClick={() => handleSelect(suggestion)}
              className="w-full text-left px-3.5 py-2.5 hover:bg-zinc-50 dark:hover:bg-zinc-800/70 transition-colors flex items-start gap-2.5 group"
            >
              <span className="text-zinc-400 group-hover:text-zinc-900 dark:group-hover:text-zinc-100 mt-0.5 transition-colors">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-xs sm:text-sm font-medium text-zinc-800 dark:text-zinc-200 truncate">
                  {suggestion.label}
                </p>
                {(suggestion.city || suggestion.state) && (
                  <p className="text-[11px] text-zinc-400 truncate">
                    {[suggestion.city, suggestion.state].filter(Boolean).join(', ')}
                  </p>
                )}
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};