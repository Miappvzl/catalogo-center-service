'use client';

import { useState } from 'react';
import { getSupabase } from '@/lib/supabase-client';
import { motion, AnimatePresence } from 'framer-motion';
import { MapPin, Check, Edit2, Loader2, X } from 'lucide-react';
import Swal from 'sweetalert2';

interface ShippingProfileFormProps {
  customerId: string;
  initialData: {
    full_name: string;
    phone?: string | null;
    dni?: string | null;
    shipping_details?: any;
  };
}

export default function ShippingProfileForm({ customerId, initialData }: ShippingProfileFormProps) {
  const supabase = getSupabase();
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsProcessing] = useState(false);

  // Estados locales del perfil
  const [fullName, setFullName] = useState(initialData.full_name);
  const [phone, setPhone] = useState(initialData.phone || '');
  const [dni, setDni] = useState(initialData.dni || '');
  
  // Logística unificada estrictamente para Envío Nacional (Courier)
  const [courier, setCourier] = useState(initialData.shipping_details?.courier || 'MRW');
  const [state, setState] = useState(initialData.shipping_details?.state || '');
  const [city, setCity] = useState(initialData.shipping_details?.city || '');
  const [addressDetail, setAddressDetail] = useState(initialData.shipping_details?.addressDetail || '');
  const [reference, setReference] = useState(initialData.shipping_details?.reference || '');

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsProcessing(true);

    try {
      const shippingDetailsPayload = {
        deliveryType: 'courier', // Forzado a courier para Envío Nacional
        courier,
        state,
        city,
        addressDetail,
        reference
      };

      const { error } = await supabase
        .from('customers')
        .update({
          full_name: fullName,
          phone: phone,
          dni: dni,
          shipping_details: shippingDetailsPayload
        })
        .eq('id', customerId);

      if (error) throw error;

      Swal.fire({
        toast: true, position: 'top-end', icon: 'success', title: 'Datos guardados', 
        showConfirmButton: false, timer: 1500, customClass: { popup: 'rounded-xl bg-black text-white' }
      });
      setIsEditing(false);
    } catch (err: any) {
      Swal.fire({ icon: 'error', title: 'Error al actualizar', text: err.message, confirmButtonColor: '#000' });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="bg-white p-8 rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] flex flex-col gap-6 border border-gray-50">
      <div className="flex justify-between items-center border-b border-gray-100 pb-4">
        <div className="flex items-center gap-3 text-black">
          <MapPin size={20} strokeWidth={2} />
          <h3 className="font-semibold tracking-tight">Datos de Envío</h3>
        </div>
        {!isEditing && (
          <button 
            onClick={() => setIsEditing(true)}
            className="p-2 hover:bg-gray-50 rounded-xl text-black transition-colors flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider"
          >
            <Edit2 size={12} /> Editar
          </button>
        )}
      </div>

      <AnimatePresence mode="wait">
        {!isEditing ? (
          // 🚀 VISTA DE VISUALIZACIÓN MINIMALISTA
          <motion.div key="display" initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 5 }} className="space-y-4">
            {fullName ? (
              <div className="space-y-3 text-sm">
                <div className="grid grid-cols-2 gap-2 border-b border-gray-50 pb-2">
                  <span className="text-gray-400 font-medium">Nombre Completo:</span>
                  <span className="text-black font-semibold text-right truncate">{fullName}</span>
                </div>
                {dni && (
                  <div className="grid grid-cols-2 gap-2 border-b border-gray-50 pb-2">
                    <span className="text-gray-400 font-medium">Cédula / RIF:</span>
                    <span className="text-black font-semibold text-right">{dni}</span>
                  </div>
                )}
                {phone && (
                  <div className="grid grid-cols-2 gap-2 border-b border-gray-50 pb-2">
                    <span className="text-gray-400 font-medium">WhatsApp:</span>
                    <span className="text-black font-semibold text-right">{phone}</span>
                  </div>
                )}
                {addressDetail ? (
                  <div className="flex flex-col gap-1 pt-1">
                    <span className="text-gray-400 font-medium">Agencia de Envío Nacional:</span>
                    <span className="text-black font-semibold leading-relaxed">
                      {courier} (Cobro en Destino) - {addressDetail}, {city}, {state}. {reference && `Ref: ${reference}`}
                    </span>
                  </div>
                ) : (
                  <p className="text-xs text-gray-400 font-medium italic pt-2">No has configurado una agencia de despacho aún.</p>
                )}
              </div>
            ) : (
              <p className="text-sm text-gray-500 font-medium">Configura tu perfil nacional para comprar en 1-Click la próxima vez.</p>
            )}
          </motion.div>
        ) : (
          // 🚀 FORMULARIO REACTIVO DE EDICIÓN (PLACEHOLDERS ESPECÍFICOS)
          <motion.form key="edit" onSubmit={handleSave} initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -5 }} className="flex flex-col gap-5">
            <div className="grid grid-cols-1 gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Nombre Completo</label>
                <input 
                  type="text" required value={fullName} onChange={e => setFullName(e.target.value)} placeholder="Nombre Completo *"
                  className="w-full bg-gray-50 text-xs font-semibold rounded-xl py-3.5 px-4 outline-none border border-transparent focus:border-black focus:bg-white transition-all"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Cédula / RIF</label>
                  <input 
                    type="text" required value={dni} onChange={e => setDni(e.target.value)} placeholder="Cédula o RIF: V-12345678-9 *"
                    className="w-full bg-gray-50 text-xs font-semibold rounded-xl py-3.5 px-4 outline-none border border-transparent focus:border-black focus:bg-white transition-all"
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">WhatsApp</label>
                  <input 
                    type="text" required value={phone} onChange={e => setPhone(e.target.value.replace(/[^\d+]/g, ''))} placeholder="WhatsApp: 04141234567 *"
                    className="w-full bg-gray-50 text-xs font-semibold rounded-xl py-3.5 px-4 outline-none border border-transparent focus:border-black focus:bg-white transition-all"
                  />
                </div>
              </div>
            </div>

            <div className="border-t border-gray-100 pt-4 flex flex-col gap-4">
              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Envío Nacional (Preferencia)</label>
              
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Agencia de Envíos</label>
                <select 
                  value={courier} onChange={e => setCourier(e.target.value)}
                  className="w-full bg-gray-50 text-xs font-semibold rounded-xl py-3.5 px-4 outline-none border border-transparent focus:border-black focus:bg-white transition-all cursor-pointer"
                >
                  <option value="MRW">MRW (Cobro en Destino)</option>
                  <option value="Zoom">Zoom (Cobro en Destino)</option>
                  <option value="Tealca">Tealca (Cobro en Destino)</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Estado</label>
                  <input 
                    type="text" required value={state} onChange={e => setState(e.target.value)} placeholder="Estado (Ej: Distrito Capital) *"
                    className="w-full bg-gray-50 text-xs font-semibold rounded-xl py-3.5 px-4 outline-none border border-transparent focus:border-black focus:bg-white transition-all"
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Ciudad</label>
                  <input 
                    type="text" required value={city} onChange={e => setCity(e.target.value)} placeholder="Ciudad (Ej: Caracas) *"
                    className="w-full bg-gray-50 text-xs font-semibold rounded-xl py-3.5 px-4 outline-none border border-transparent focus:border-black focus:bg-white transition-all"
                  />
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Dirección de la Agencia</label>
                <input 
                  type="text" required value={addressDetail} onChange={e => setAddressDetail(e.target.value)} placeholder="Dirección exacta de la agencia de retiro *"
                  className="w-full bg-gray-50 text-xs font-semibold rounded-xl py-3.5 px-4 outline-none border border-transparent focus:border-black focus:bg-white transition-all"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Punto de Referencia</label>
                <input 
                  type="text" value={reference} onChange={e => setReference(e.target.value)} placeholder="Punto de referencia de la agencia (Opcional)"
                  className="w-full bg-gray-50 text-xs font-semibold rounded-xl py-3.5 px-4 outline-none border border-transparent focus:border-black focus:bg-white transition-all"
                />
              </div>
            </div>

            <div className="flex gap-2 mt-2 pt-2 border-t border-gray-100">
              <button 
                type="button" onClick={() => setIsEditing(false)} disabled={isSaving}
                className="flex-1 bg-gray-100 text-gray-700 font-bold uppercase tracking-widest text-[10px] py-3.5 rounded-xl hover:bg-gray-200 transition-all flex items-center justify-center gap-1.5"
              >
                <X size={12} /> Cancelar
              </button>
              <button 
                type="submit" disabled={isSaving}
                className="flex-1 bg-black text-white font-black uppercase tracking-widest text-[10px] py-3.5 rounded-xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:bg-gray-900 transition-all flex items-center justify-center gap-1.5"
              >
                {isSaving ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} />} Guardar
              </button>
            </div>
          </motion.form>
        )}
      </AnimatePresence>
    </div>
  );
}