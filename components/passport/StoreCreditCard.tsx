// components/passport/StoreCreditCard.tsx
'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';

interface StoreCreditLedger {
  id: string;
  amount_usd: number;
  description: string;
  created_at: string;
}

interface StoreCreditCardProps {
  storeName: string;
  balanceUsd: number;
  ledger: StoreCreditLedger[];
  customerId: string;
  storeId: string;
}

export default function StoreCreditCard({
  storeName,
  balanceUsd,
  ledger,
  customerId,
  storeId,
}: StoreCreditCardProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  
  // Optimistic UI State para compensar latencia de red
  const [optimisticBalance, setOptimisticBalance] = useState<number>(balanceUsd);

  const handleApplyCredit = async () => {
    if (optimisticBalance <= 0) return;

    // 1. Mutación Optimista (Respuesta inmediata en UI)
    const previousBalance = optimisticBalance;
    setOptimisticBalance(0);

    // 2. Resolución en Background
    startTransition(async () => {
      try {
        // Nota: Esta ruta de API deberá crearse en app/api/passport/apply-credit/route.ts
        const response = await fetch('/api/passport/apply-credit', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ customerId, storeId, amount: -previousBalance }),
        });

        if (!response.ok) throw new Error('Fallo al procesar el saldo');
        
        router.refresh();
      } catch (error) {
        // Rollback silencioso en caso de fallo de red
        setOptimisticBalance(previousBalance);
        console.error('Error aplicando crédito de tienda:', error);
      }
    });
  };

  return (
    <div className="bg-white p-8 rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] flex flex-col gap-8 max-w-md w-full">
      {/* Header de la Tarjeta */}
      <div className="flex flex-col gap-2">
        <span className="text-sm font-medium text-gray-400 uppercase tracking-widest">
          Crédito de Tienda
        </span>
        <h2 className="text-xl font-semibold text-black tracking-tight">
          {storeName}
        </h2>
      </div>

      {/* Display de Saldo */}
      <div className="flex flex-col gap-1">
        <span className="text-6xl font-light text-black tracking-tighter">
          ${optimisticBalance.toFixed(2)}
        </span>
        <span className="text-sm text-gray-500 font-medium">
          Saldo a favor disponible
        </span>
      </div>

      {/* Botón de Acción (Sin bordes, alto contraste) */}
      <button
        onClick={handleApplyCredit}
        disabled={optimisticBalance <= 0 || isPending}
        className="w-full bg-black text-white py-4 px-6 rounded-xl font-medium tracking-wide shadow-[0_8px_30px_rgb(0,0,0,0.08)] hover:bg-gray-900 active:scale-[0.98] transition-all disabled:opacity-50 disabled:pointer-events-none"
      >
        {isPending ? 'Procesando...' : 'Usar en próxima compra'}
      </button>

      {/* Historial de Movimientos (Minimalista) */}
      {ledger.length > 0 && (
        <div className="flex flex-col gap-4 mt-4">
          <h3 className="text-sm font-semibold text-black">Últimos movimientos</h3>
          <div className="flex flex-col gap-4">
            {ledger.slice(0, 3).map((tx) => (
              <div key={tx.id} className="flex justify-between items-center">
                <div className="flex flex-col">
                  <span className="text-sm font-medium text-black">
                    {tx.description}
                  </span>
                  <span className="text-xs text-gray-400">
                    {new Date(tx.created_at).toLocaleDateString('es-VE')}
                  </span>
                </div>
                <span
                  className={`text-sm font-semibold ${
                    tx.amount_usd > 0 ? 'text-green-600' : 'text-black'
                  }`}
                >
                  {tx.amount_usd > 0 ? '+' : ''}{tx.amount_usd.toFixed(2)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}