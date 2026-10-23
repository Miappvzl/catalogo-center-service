'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Building2, 
  Layers, 
  Database, 
  User, 
  Phone, 
  ArrowUpRight, 
  Sparkles, 
  CheckCircle2, 
  AlertCircle 
} from 'lucide-react';

interface MassiveInventoryFormProps {
  // Número de WhatsApp al que llegará el reporte estructurado
  whatsappNumber?: string;
}

export default function MassiveInventoryForm({ whatsappNumber = "584120000000" }: MassiveInventoryFormProps) {
  // Estados del Formulario
  const [formData, setFormData] = useState({
    businessName: '',
    category: '',
    skuCount: '3.000 a 5.000 productos',
    currentSystem: 'Excel / Hojas de Cálculo',
    contactName: '',
    phone: '',
    city: ''
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitted, setIsSubmitted] = useState(false);

  // Opciones de Rubros Típicos de Alto Volumen
  const categories = [
    'Ferretería y Construcción',
    'Repuestos y Automotriz',
    'Farmacia y Salud',
    'Mayorista / Distribuidora',
    'Moda y Calzado (Con variantes)',
    'Cosméticos y Belleza',
    'Otro Rubro'
  ];

  // Opciones de Volúmenes de Productos
  const skuRanges = [
    '3.000 a 5.000 productos',
    '5.000 a 10.000 productos',
    'Más de 10.000 productos'
  ];

  // Sistemas actuales de inventario
  const systems = [
    'Excel / Hojas de Cálculo',
    'Saint / A2 / Profit Plus',
    'Software Administrativo Propio',
    'Inventario en Físico / Notas'
  ];

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => {
        const updated = { ...prev };
        delete updated[field];
        return updated;
      });
    }
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    if (!formData.businessName.trim()) newErrors.businessName = 'Indica el nombre de tu negocio.';
    if (!formData.category) newErrors.category = 'Selecciona tu rubro comercial.';
    if (!formData.contactName.trim()) newErrors.contactName = 'Indica tu nombre.';
    if (!formData.phone.trim()) newErrors.phone = 'Indica tu WhatsApp de contacto.';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    // Formateo del mensaje con estructura Markdown para WhatsApp
    const message = 
`*POSTULACIÓN: PROGRAMA PILOTO INVENTARIO MASIVO*
--------------------------------------------
*Negocio:* ${formData.businessName}
*Ciudad:* ${formData.city.trim() ? formData.city : 'No especificada'}
*Rubro:* ${formData.category}
*Volumen de SKUs:* ${formData.skuCount}
*Gestión Actual:* ${formData.currentSystem}
--------------------------------------------
*Contacto:* ${formData.contactName}
*WhatsApp:* ${formData.phone}
--------------------------------------------
_Solicito acceso preferencial y evaluación para migración asistida de inventario hacia Preziso._`;

    const encodedMessage = encodeURIComponent(message);
    const whatsappUrl = `https://wa.me/${whatsappNumber}?text=${encodedMessage}`;

    setIsSubmitted(true);

    setTimeout(() => {
      window.open(whatsappUrl, '_blank', 'noopener,noreferrer');
    }, 400);
  };

  return (
    <div className="w-full max-w-2xl mx-auto bg-[#0a0a0c] border border-neutral-800 rounded-3xl p-6 sm:p-10 text-white relative overflow-hidden shadow-2xl selection:bg-neutral-800">
      
      {/* Resplandor ambiental cenital */}
      <div className="absolute -top-24 left-1/2 -translate-x-1/2 w-96 h-48 bg-white/[0.04] rounded-full blur-3xl pointer-events-none" />

      {/* Cabecera del Formulario */}
      <header className="mb-8 relative z-10">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-neutral-900 border border-neutral-800 text-[10px] font-mono tracking-widest text-neutral-400 uppercase mb-4">
          <Sparkles size={12} className="text-white" />
          Programa Piloto Exclusivo
        </div>
        
        <h2 className="text-2xl sm:text-3xl font-light tracking-tight text-white leading-tight">
          Digitaliza tu inventario masivo en Preziso.
        </h2>
        
        <p className="text-xs sm:text-sm text-neutral-400 font-light mt-2 leading-relaxed">
          Buscamos negocios con más de 3.000 productos. Si calificas, nuestro equipo técnico migra tu inventario completo sin costo y te da acceso prioritario al nuevo motor masivo.
        </p>
      </header>

      {/* Formulario */}
      <form onSubmit={handleSubmit} className="space-y-6 relative z-10">
        
        {/* 1. Nombre del Comercio y Ciudad */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-[11px] font-mono text-neutral-400 uppercase tracking-wider flex items-center gap-2">
              <Building2 size={13} className="text-neutral-500" /> Nombre del Negocio
            </label>
            <input
              type="text"
              placeholder="Ej: Ferretería El Tornillo C.A."
              value={formData.businessName}
              onChange={(e) => handleInputChange('businessName', e.target.value)}
              className={`w-full bg-[#121318] border ${errors.businessName ? 'border-red-500' : 'border-neutral-800'} focus:border-neutral-400 rounded-xl px-4 py-3 text-xs sm:text-sm text-white placeholder:text-neutral-600 outline-none transition-colors`}
            />
            {errors.businessName && <p className="text-[10px] text-red-400 font-mono mt-1">{errors.businessName}</p>}
          </div>

          <div className="space-y-2">
            <label className="text-[11px] font-mono text-neutral-400 uppercase tracking-wider flex items-center gap-2">
              Ciudad / Estado
            </label>
            <input
              type="text"
              placeholder="Ej: Valencia, Carabobo"
              value={formData.city}
              onChange={(e) => handleInputChange('city', e.target.value)}
              className="w-full bg-[#121318] border border-neutral-800 focus:border-neutral-400 rounded-xl px-4 py-3 text-xs sm:text-sm text-white placeholder:text-neutral-600 outline-none transition-colors"
            />
          </div>
        </div>

        {/* 2. Selector de Rubro */}
        <div className="space-y-2">
          <label className="text-[11px] font-mono text-neutral-400 uppercase tracking-wider flex items-center gap-2">
            <Layers size={13} className="text-neutral-500" /> Rubro Comercial
          </label>
          <div className="flex flex-wrap gap-2">
            {categories.map((cat) => {
              const isSelected = formData.category === cat;
              return (
                <button
                  type="button"
                  key={cat}
                  onClick={() => handleInputChange('category', cat)}
                  className={`text-xs px-3.5 py-2 rounded-lg border transition-all cursor-pointer ${
                    isSelected 
                      ? 'bg-white text-black border-white font-medium' 
                      : 'bg-[#121318] text-neutral-400 border-neutral-800 hover:border-neutral-700 hover:text-white'
                  }`}
                >
                  {cat}
                </button>
              );
            })}
          </div>
          {errors.category && <p className="text-[10px] text-red-400 font-mono mt-1">{errors.category}</p>}
        </div>

        {/* 3. Volumen de SKUs */}
        <div className="space-y-2">
          <label className="text-[11px] font-mono text-neutral-400 uppercase tracking-wider flex items-center gap-2">
            <Database size={13} className="text-neutral-500" /> Cantidad Estimada de Productos (SKUs)
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
            {skuRanges.map((range) => {
              const isSelected = formData.skuCount === range;
              return (
                <button
                  type="button"
                  key={range}
                  onClick={() => handleInputChange('skuCount', range)}
                  className={`text-xs p-3 rounded-xl border text-center transition-all cursor-pointer ${
                    isSelected 
                      ? 'bg-white text-black border-white font-medium' 
                      : 'bg-[#121318] text-neutral-400 border-neutral-800 hover:border-neutral-700 hover:text-white'
                  }`}
                >
                  {range}
                </button>
              );
            })}
          </div>
        </div>

        {/* 4. Formato Actual de la Data */}
        <div className="space-y-2">
          <label className="text-[11px] font-mono text-neutral-400 uppercase tracking-wider flex items-center gap-2">
            ¿Dónde tienes tu inventario hoy?
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {systems.map((sys) => {
              const isSelected = formData.currentSystem === sys;
              return (
                <button
                  type="button"
                  key={sys}
                  onClick={() => handleInputChange('currentSystem', sys)}
                  className={`text-xs p-3 rounded-xl border text-left transition-all cursor-pointer ${
                    isSelected 
                      ? 'bg-white text-black border-white font-medium' 
                      : 'bg-[#121318] text-neutral-400 border-neutral-800 hover:border-neutral-700 hover:text-white'
                  }`}
                >
                  {sys}
                </button>
              );
            })}
          </div>
        </div>

        {/* 5. Contacto Personal */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-neutral-900">
          <div className="space-y-2">
            <label className="text-[11px] font-mono text-neutral-400 uppercase tracking-wider flex items-center gap-2">
              <User size={13} className="text-neutral-500" /> Tu Nombre
            </label>
            <input
              type="text"
              placeholder="Ej: Carlos Pérez"
              value={formData.contactName}
              onChange={(e) => handleInputChange('contactName', e.target.value)}
              className={`w-full bg-[#121318] border ${errors.contactName ? 'border-red-500' : 'border-neutral-800'} focus:border-neutral-400 rounded-xl px-4 py-3 text-xs sm:text-sm text-white placeholder:text-neutral-600 outline-none transition-colors`}
            />
            {errors.contactName && <p className="text-[10px] text-red-400 font-mono mt-1">{errors.contactName}</p>}
          </div>

          <div className="space-y-2">
            <label className="text-[11px] font-mono text-neutral-400 uppercase tracking-wider flex items-center gap-2">
              <Phone size={13} className="text-neutral-500" /> WhatsApp Directo
            </label>
            <input
              type="tel"
              placeholder="Ej: +58 412 1234567"
              value={formData.phone}
              onChange={(e) => handleInputChange('phone', e.target.value)}
              className={`w-full bg-[#121318] border ${errors.phone ? 'border-red-500' : 'border-neutral-800'} focus:border-neutral-400 rounded-xl px-4 py-3 text-xs sm:text-sm text-white placeholder:text-neutral-600 outline-none transition-colors`}
            />
            {errors.phone && <p className="text-[10px] text-red-400 font-mono mt-1">{errors.phone}</p>}
          </div>
        </div>

        {/* Botón de Envío Táctil a WhatsApp */}
        <div className="pt-4">
          <motion.button
            whileTap={{ scale: 0.98 }}
            type="submit"
            className="w-full bg-white hover:bg-neutral-200 text-black py-4 rounded-xl text-xs sm:text-sm font-semibold tracking-wide uppercase transition-all flex items-center justify-center gap-2 shadow-lg cursor-pointer"
          >
            <span>Postular mi negocio vía WhatsApp</span>
            <ArrowUpRight size={16} strokeWidth={2.5} />
          </motion.button>
          
          <div className="flex items-center justify-center gap-2 mt-3 text-neutral-500 text-[10px] font-mono">
            <CheckCircle2 size={12} className="text-neutral-400" />
            <span>Los datos se abrirán estructurados en tu chat sin intermediarios</span>
          </div>
        </div>
      </form>

    </div>
  );
}