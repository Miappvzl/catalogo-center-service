"use client";

import React, { useState, useRef, useEffect, useMemo } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronDown, Check } from "lucide-react";

export interface CountryDialConfig {
    code: string;
    iso: string;
    label: string;
    stripLeadingZero: boolean;
    minLen: number;
    maxLen: number;
}

export const PHONE_COUNTRIES: CountryDialConfig[] = [
    { code: "+58", iso: "VE", label: "Venezuela (+58)", stripLeadingZero: true, minLen: 10, maxLen: 10 },
    { code: "+57", iso: "CO", label: "Colombia (+57)", stripLeadingZero: true, minLen: 10, maxLen: 10 },
    { code: "+1", iso: "US", label: "EE. UU. / Canadá (+1)", stripLeadingZero: true, minLen: 10, maxLen: 10 },
    { code: "+34", iso: "ES", label: "España (+34)", stripLeadingZero: true, minLen: 9, maxLen: 9 },
    { code: "+507", iso: "PA", label: "Panamá (+507)", stripLeadingZero: true, minLen: 7, maxLen: 8 },
    { code: "+56", iso: "CL", label: "Chile (+56)", stripLeadingZero: true, minLen: 9, maxLen: 9 },
    { code: "+54", iso: "AR", label: "Argentina (+54)", stripLeadingZero: true, minLen: 10, maxLen: 10 },
    { code: "+52", iso: "MX", label: "México (+52)", stripLeadingZero: true, minLen: 10, maxLen: 10 },
    { code: "+51", iso: "PE", label: "Perú (+51)", stripLeadingZero: true, minLen: 9, maxLen: 9 },
    { code: "+593", iso: "EC", label: "Ecuador (+593)", stripLeadingZero: true, minLen: 9, maxLen: 9 },
    { code: "+55", iso: "BR", label: "Brasil (+55)", stripLeadingZero: true, minLen: 10, maxLen: 11 },
];

// Ordenados de mayor a menor longitud de código (ej. +507 antes que +58) para parseo exacto
const SORTED_CODES = [...PHONE_COUNTRIES].sort((a, b) => b.code.length - a.code.length);

interface PhoneInputProps {
    value: string;
    onChange: (fullPhone: string) => void;
    error?: string;
    placeholder?: string;
    defaultCountryCode?: string;
    variant?: "underline" | "boxed";
    id?: string;
    disabled?: boolean;
}

export default function PhoneInput({
    value,
    onChange,
    error,
    placeholder = "Teléfono / WhatsApp *",
    defaultCountryCode = "+58",
    variant = "underline",
    id,
    disabled = false,
}: PhoneInputProps) {
    const [selectedCode, setSelectedCode] = useState<string>(defaultCountryCode);
    const [localDigits, setLocalDigits] = useState<string>("");
    const [isOpen, setIsOpen] = useState<boolean>(false);
    const [isFocused, setIsFocused] = useState<boolean>(false);

    const containerRef = useRef<HTMLDivElement>(null);

    const activeCountry = useMemo(
        () => PHONE_COUNTRIES.find((c) => c.code === selectedCode) || PHONE_COUNTRIES[0],
        [selectedCode]
    );

    // Sanitizador determinista que elimina ceros iniciales y prefijos duplicados por autocompletado móvil
    const sanitizeNationalDigits = (raw: string, country: CountryDialConfig): string => {
        let digits = raw.replace(/\D/g, "");
        const numericCode = country.code.replace(/\D/g, "");

        // Si el autocompletado del navegador inyectó el código de país (ej. 584141234567 o 5804141234567)
        if (digits.startsWith(numericCode) && digits.length > country.maxLen) {
            digits = digits.slice(numericCode.length);
        }

        // Bloqueo estricto de ceros iniciales (ej. 0414 -> 414)
        if (country.stripLeadingZero) {
            digits = digits.replace(/^0+/, "");
        }

        return digits.slice(0, country.maxLen);
    };

    // Sincronización con el valor externo (hidratación desde sessionStorage o perfil de cliente)
    useEffect(() => {
        if (!value) {
            setLocalDigits("");
            return;
        }

        const trimmed = value.trim();

        if (trimmed.startsWith("+")) {
            const matched = SORTED_CODES.find((c) => trimmed.startsWith(c.code));
            if (matched) {
                setSelectedCode(matched.code);
                const rest = trimmed.slice(matched.code.length);
                const cleanRest = sanitizeNationalDigits(rest, matched);
                setLocalDigits(cleanRest);
                return;
            }
        }

        // Si viene sin '+' (ej. un número guardado antiguamente como 04141234567)
        const cleanFallback = sanitizeNationalDigits(trimmed, activeCountry);
        setLocalDigits(cleanFallback);
    }, [value]);

    // Cierre del menú desplegable al hacer clic fuera o presionar Escape
    useEffect(() => {
        if (!isOpen) return;
        const handleOutside = (e: MouseEvent | TouchEvent) => {
            if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
                setIsOpen(false);
            }
        };
        const handleKey = (e: KeyboardEvent) => {
            if (e.key === "Escape") setIsOpen(false);
        };
        document.addEventListener("mousedown", handleOutside);
        document.addEventListener("touchstart", handleOutside);
        document.addEventListener("keydown", handleKey);
        return () => {
            document.removeEventListener("mousedown", handleOutside);
            document.removeEventListener("touchstart", handleOutside);
            document.removeEventListener("keydown", handleKey);
        };
    }, [isOpen]);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const clean = sanitizeNationalDigits(e.target.value, activeCountry);
        setLocalDigits(clean);
        onChange(clean.length > 0 ? `${activeCountry.code}${clean}` : "");
    };

    const handleSelectCountry = (country: CountryDialConfig) => {
        setSelectedCode(country.code);
        const reSanitized = sanitizeNationalDigits(localDigits, country);
        setLocalDigits(reSanitized);
        onChange(reSanitized.length > 0 ? `${country.code}${reSanitized}` : "");
        setIsOpen(false);
    };

    return (
        <div id={id} ref={containerRef} className="w-full relative">
            {/* CONTENEDOR DE UNA SOLA LÍNEA CON DIVISOR VERTICAL SUSPENDIDO */}
            <div
                className={
                    variant === "underline"
                        ? `w-full flex items-center border-0 border-b-2 transition-colors ${
                              error
                                  ? "border-red-500 text-red-600"
                                  : isFocused || isOpen
                                    ? "border-[var(--store-text-main,#09090b)]"
                                    : "border-[var(--store-text-main,#09090b)]/30"
                          }`
                        : `w-full flex items-center px-3 rounded-xl border bg-[var(--store-surface,#ffffff)] transition-colors ${
                              error
                                  ? "border-red-500 text-red-600"
                                  : isFocused || isOpen
                                    ? "border-[var(--store-text-main,#09090b)]"
                                    : "border-[var(--store-border,#e4e4e7)]"
                          }`
                }
            >
                {/* 1. GATILLO DE CÓDIGO DE ÁREA */}
                <button
                    type="button"
                    disabled={disabled}
                    onClick={() => setIsOpen((prev) => !prev)}
                    aria-expanded={isOpen}
                    aria-label="Seleccionar código de país"
                    className="shrink-0 py-3 pr-3 flex items-center gap-1.5 outline-none cursor-pointer select-none group active:scale-[0.98] transition-transform"
                >
                    <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-[var(--store-surface-text,#71717a)]">
                        {activeCountry.iso}
                    </span>
                   <span
                        className={`font-mono tabular-nums ${
                            variant === "underline"
                                ? "text-sm sm:text-base font-bold"
                                : "text-sm font-semibold"
                        } ${
                            error ? "text-red-600" : "text-[var(--store-text-main,#09090b)]"
                        }`}
                    >
                        {activeCountry.code}
                    </span>
                    <ChevronDown
                        size={14}
                        strokeWidth={2.2}
                        className={`text-[var(--store-surface-text,#71717a)] transition-transform duration-200 ${
                            isOpen ? "rotate-180 text-[var(--store-text-main,#09090b)]" : ""
                        }`}
                    />
                </button>

                {/* 2. LÍNEA VERTICAL SUSPENDIDA (NO TOCA LA BASE DEL INPUT) */}
                <div
                    aria-hidden="true"
                    className={`w-[1.5px] h-4 shrink-0 self-center rounded-full transition-colors ${
                        error
                            ? "bg-red-500/40"
                            : "bg-[var(--store-text-main,#09090b)]/20"
                    }`}
                />

             {/* 3. INPUT NUMÉRICO SIN CERO INICIAL */}
                <input
                    type="tel"
                    inputMode="numeric"
                    disabled={disabled}
                    value={localDigits}
                    onFocus={() => setIsFocused(true)}
                    onBlur={() => setIsFocused(false)}
                    onChange={handleInputChange}
                    placeholder={placeholder}
                    className={`flex-1 min-w-0 bg-transparent border-0 py-3 pl-3 font-mono tabular-nums outline-none focus:ring-0 focus:shadow-none rounded-none placeholder:font-sans ${
                        variant === "underline"
                            ? "text-base font-bold placeholder:font-bold placeholder:text-[var(--store-surface-text,#71717a)]/70"
                            : "text-sm font-medium placeholder:font-normal placeholder:text-neutral-400/70"
                    } ${
                        error ? "text-red-600" : "text-[var(--store-text-main,#09090b)]"
                    }`}
                />
            </div>

            {/* MENÚ DESPLEGABLE UNIFICADO ADAPTADO A VARIABLES DE LA TIENDA */}
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, y: 6, scale: 0.98 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 4, scale: 0.98 }}
                        transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
                        className="absolute left-0 top-full mt-2 w-60 max-h-60 overflow-y-auto no-scrollbar rounded-xl border border-[var(--store-border,#e4e4e7)] bg-[var(--store-surface,#ffffff)] p-1.5 shadow-[0_12px_32px_rgba(0,0,0,0.12)] z-50"
                    >
                        <div className="px-2.5 py-1.5 border-b border-[var(--store-border,#e4e4e7)]/50 mb-1 flex items-center justify-between">
                            <span className="text-[9px] font-mono font-bold uppercase tracking-[0.14em] text-[var(--store-surface-text,#71717a)]">
                                Código de país
                            </span>
                            <span className="text-[9px] font-mono text-[var(--store-surface-text,#71717a)]">
                                Sin 0 inicial
                            </span>
                        </div>

                        <div className="flex flex-col gap-0.5">
                            {PHONE_COUNTRIES.map((country) => {
                                const isSelected = country.code === activeCountry.code;
                                return (
                                    <button
                                        key={country.code}
                                        type="button"
                                        onClick={() => handleSelectCountry(country)}
                                        className={`w-full px-2.5 py-2 rounded-lg text-left text-xs flex items-center justify-between gap-2 transition-colors cursor-pointer ${
                                            isSelected
                                                ? "bg-[var(--store-text-main,#09090b)] text-[var(--store-surface,#ffffff)] font-semibold"
                                                : "text-[var(--store-text-main,#09090b)] hover:bg-[var(--store-text-main,#09090b)]/[0.05] font-medium"
                                        }`}
                                    >
                                        <div className="flex items-center gap-2 min-w-0">
                                            <span
                                                className={`text-[10px] font-mono font-bold uppercase w-5 shrink-0 ${
                                                    isSelected
                                                        ? "opacity-80"
                                                        : "text-[var(--store-surface-text,#71717a)]"
                                                }`}
                                            >
                                                {country.iso}
                                            </span>
                                            <span className="truncate">{country.label}</span>
                                        </div>
                                        {isSelected && (
                                            <Check size={13} strokeWidth={2.5} className="shrink-0" />
                                        )}
                                    </button>
                                );
                            })}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* MENSAJE DE ERROR ORGÁNICO */}
            <AnimatePresence>
                {error && (
                    <motion.p
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        className="text-red-500 text-[10px] font-bold mt-1.5 px-1"
                    >
                        {error}
                    </motion.p>
                )}
            </AnimatePresence>
        </div>
    );
}