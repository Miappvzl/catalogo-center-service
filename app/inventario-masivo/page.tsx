import React from 'react';
import MassiveInventoryForm from '@/components/MassiveInventoryForm';
import Link from 'next/link';

export const metadata = {
  title: 'Programa Piloto de Inventario Masivo | Preziso',
  description: 'Digitaliza tu catálogo de más de 3.000 productos con acompañamiento técnico directo.',
};

export default function InventarioMasivoPage() {
  return (
    <main className="min-h-screen bg-black flex flex-col justify-center items-center px-4 py-16 sm:py-24">
      <Link href="/" className="mb-8 block">
        <img src="/pezisologow.png" alt="Preziso" className="h-8 w-auto object-contain" />
      </Link>
      
      {/* 🚀 Reemplaza con tu número de WhatsApp real */}
      <MassiveInventoryForm whatsappNumber="584145811936" />
    </main>
  );
}