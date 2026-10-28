'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { 
  Send, 
  Users, 
  ArrowUpRight, 
  Clock, 
  CheckCheck, 
  Boxes,
  Activity,
  Layers,
  Wrench,
  Car,
  PackageCheck,
  Building,
  Sparkles
} from 'lucide-react';

interface ProspectLead {
  id: string;
  phone: string;
  businessName: string;
  category: string;
  skus: string;
  timeAgo: string;
  icon: React.ElementType;
}

export default function MarketingProofDashboard() {
  // Datos simulados de alta fidelidad para la prueba de tracción
  const leads: ProspectLead[] = [
    {
      id: 'lead-1',
      phone: '+58 412 ••• 8821',
      businessName: 'Ferretería El Tornillo Central C.A.',
      category: 'Ferretería y Construcción',
      skus: '4.850 SKUs',
      timeAgo: 'Hace 3 min',
      icon: Wrench,
    },
    {
      id: 'lead-2',
      phone: '+58 414 ••• 1904',
      businessName: 'Distribuidora Automotriz Caracas',
      category: 'Repuestos y Filtros',
      skus: '6.200 SKUs',
      timeAgo: 'Hace 18 min',
      icon: Car,
    },
    {
      id: 'lead-3',
      phone: '+58 424 ••• 7312',
      businessName: 'Mayorista Oriente Vzla',
      category: 'Consumo Masivo',
      skus: '9.400 SKUs',
      timeAgo: 'Hace 45 min',
      icon: PackageCheck,
    },
    {
      id: 'lead-4',
      phone: '+58 412 ••• 3390',
      businessName: 'Agroinsumos & Maquinaria del Centro',
      category: 'Equipos y Agro',
      skus: '3.700 SKUs',
      timeAgo: 'Hace 1 hora',
      icon: Building,
    },
    {
      id: 'lead-5',
      phone: '+58 416 ••• 9945',
      businessName: 'Ferre-Materiales La Candelaria',
      category: 'Herramientas y Acero',
      skus: '5.120 SKUs',
      timeAgo: 'Hace 2 horas',
      icon: Layers,
    },
  ];

  return (
    <div className="w-full max-w-5xl mx-auto bg-[#090a0d] p-6 sm:p-10 rounded-lg text-white selection:bg-neutral-800">
      
      {/* ================= CABECERA CON INTELIGENCIA OPERATIVA ================= */}
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-8">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="w-1.5 h-1.5 rounded-full bg-neutral-400" />
            <span className="text-[10px] font-mono uppercase tracking-[0.2em] text-neutral-400">
              Telemetría de Captación
            </span>
          </div>
          <h2 className="text-xl sm:text-2xl font-light tracking-tight text-white">
            Tracción del Programa Piloto
          </h2>
        </div>

        <div className="flex items-center gap-2 bg-[#12141a] px-3.5 py-2 rounded-md self-start sm:self-auto">
          <div className="w-1.5 h-1.5 rounded-full bg-emerald-500/80" />
          <span className="text-[11px] font-mono text-neutral-300">
            Sincronización en vivo
          </span>
        </div>
      </header>

      {/* ================= GRILLA DE MÉTRICAS PRINCIPALES ================= */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-3.5 mb-8">
        
        {/* TARJETA 1: MENSAJES ENVIADOS A WHATSAPP */}
        <div className="md:col-span-4 bg-[#111318] p-6 rounded-lg flex flex-col justify-between">
          <div className="flex items-center justify-between mb-8">
            <span className="text-[10px] font-mono uppercase tracking-widest text-neutral-400">
              Formularios Enviados
            </span>
            <div className="w-8 h-8 rounded-md bg-[#181a22] flex items-center justify-center text-neutral-300">
              <Send size={14} strokeWidth={1.8} />
            </div>
          </div>
          <div>
            <div className="text-4xl sm:text-5xl font-light tracking-tighter text-white mb-2">
              51
            </div>
            <div className="flex items-center gap-1.5 text-[11px] text-neutral-400 font-mono">
              <CheckCheck size={13} className="text-neutral-300" />
              <span>Despachos directos a WhatsApp</span>
            </div>
          </div>
        </div>

        {/* TARJETA 2: CLIENTES POTENCIALES CALIFICADOS */}
        <div className="md:col-span-4 bg-[#111318] p-6 rounded-lg flex flex-col justify-between">
          <div className="flex items-center justify-between mb-8">
            <span className="text-[10px] font-mono uppercase tracking-widest text-neutral-400">
              Leads Calificados
            </span>
            <div className="w-8 h-8 rounded-md bg-[#181a22] flex items-center justify-center text-neutral-300">
              <Users size={14} strokeWidth={1.8} />
            </div>
          </div>
          <div>
            <div className="text-4xl sm:text-5xl font-light tracking-tighter text-white mb-2">
              32
            </div>
            <div className="flex items-center gap-1.5 text-[11px] text-neutral-400 font-mono">
              <Boxes size={13} className="text-neutral-300" />
              <span>Inventarios mayores a 3.000 SKUs</span>
            </div>
          </div>
        </div>

        {/* TARJETA 3: EFECTIVIDAD DE CONVERSIÓN */}
        <div className="md:col-span-4 bg-[#111318] p-6 rounded-lg flex flex-col justify-between">
          <div className="flex items-center justify-between mb-8">
            <span className="text-[10px] font-mono uppercase tracking-widest text-neutral-400">
              Tasa de Calificación
            </span>
            <div className="w-8 h-8 rounded-md bg-[#181a22] flex items-center justify-center text-neutral-300">
              <Activity size={14} strokeWidth={1.8} />
            </div>
          </div>
          <div>
            <div className="text-4xl sm:text-5xl font-light tracking-tighter text-white mb-2">
              62.7%
            </div>
            <div className="flex items-center gap-1.5 text-[11px] text-neutral-400 font-mono">
              <Sparkles size={13} className="text-neutral-300" />
              <span>Alta densidad de stock masivo</span>
            </div>
          </div>
        </div>

      </div>

      {/* ================= PANEL INFERIOR: REGISTROS Y NÚMEROS RECIENTES ================= */}
      <div className="bg-[#111318] p-6 sm:p-8 rounded-lg">
        
        {/* Cabecera de la Tabla / Feed */}
        <div className="flex items-center justify-between pb-6 mb-4">
          <div>
            <h3 className="text-sm font-medium text-white tracking-tight">
              Actividad Reciente del Piloto
            </h3>
            <p className="text-xs text-neutral-400 font-light mt-0.5">
              Empresas en proceso de evaluación para carga de catálogo asistida.
            </p>
          </div>
          
          <div className="hidden sm:flex items-center gap-1.5 text-[10px] font-mono text-neutral-400">
            <Clock size={12} />
            <span>Últimas 24 horas</span>
          </div>
        </div>

        {/* Lista de Registros (Sin líneas ni bordes, solo tonalidades sutiles) */}
        <div className="space-y-2">
          {leads.map((lead) => {
            const IconComponent = lead.icon;

            return (
              <div
                key={lead.id}
                className="bg-[#15171e] hover:bg-[#1a1d26] transition-colors p-3.5 sm:p-4 rounded-md flex flex-col sm:flex-row sm:items-center justify-between gap-3 group"
              >
                {/* Lado Izquierdo: Miniatura y Datos */}
                <div className="flex items-center gap-3.5">
                  {/* Miniatura Escultórica Plana */}
                  <div className="w-10 h-10 rounded-md bg-[#1f222b] flex items-center justify-center text-neutral-300 shrink-0">
                    <IconComponent size={17} strokeWidth={1.7} />
                  </div>

                  {/* Información del Comercio */}
                  <div className="flex flex-col min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs sm:text-sm font-medium text-white tracking-tight truncate">
                        {lead.businessName}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-[11px] text-neutral-400 font-light truncate">
                        {lead.category}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Lado Derecho: Teléfono Enmascarado, SKUs y Tiempo */}
                <div className="flex items-center justify-between sm:justify-end gap-4 pl-13 sm:pl-0">
                  {/* Badge de SKUs */}
                  <span className="text-[11px] font-mono text-neutral-300 bg-[#1e212b] px-2.5 py-1 rounded-md">
                    {lead.skus}
                  </span>

                  {/* Número de Teléfono (Marketing Proof) */}
                  <span className="text-xs font-mono font-medium text-white tracking-wide">
                    {lead.phone}
                  </span>

                  {/* Antigüedad */}
                  <span className="text-[10px] font-mono text-neutral-500 min-w-[65px] text-right">
                    {lead.timeAgo}
                  </span>

                  <ArrowUpRight 
                    size={13} 
                    className="text-neutral-500 group-hover:text-white transition-colors hidden sm:block" 
                  />
                </div>
              </div>
            );
          })}
        </div>

        {/* Resumen de Cierre */}
        <div className="pt-6 mt-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-[10px] font-mono text-neutral-400">
          <span>Identificadores cifrados para privacidad comercial</span>
          <span>Arquitectura de Base de Datos • Preziso Bulk Core</span>
        </div>

      </div>

    </div>
  );
}