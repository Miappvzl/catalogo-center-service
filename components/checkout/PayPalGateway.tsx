"use client";

import { useState } from "react";
import { PayPalScriptProvider, PayPalButtons } from "@paypal/react-paypal-js";
import { Loader2 } from "lucide-react";
import Swal from "sweetalert2";

interface PayPalGatewayProps {
    storeId: string;
    clientId: string;
    amount: number;
    onSuccess: (transactionId: string) => void;
}

export default function PayPalGateway({ storeId, clientId, amount, onSuccess }: PayPalGatewayProps) {
    const [isProcessing, setIsProcessing] = useState(false);

    if (!clientId) {
        return <div className="text-sm font-bold text-red-500">PayPal no está configurado correctamente.</div>;
    }

    return (
        <div className="w-full relative min-h-[150px] flex items-center justify-center bg-[var(--store-bg)] rounded-xl border border-[var(--store-border)] p-4">
            {isProcessing && (
                <div className="absolute inset-0 z-10 bg-[var(--store-surface)]/80 backdrop-blur-sm flex flex-col items-center justify-center rounded-xl">
                    <Loader2 className="animate-spin text-[var(--store-primary)] mb-2" size={32} />
                    <span className="text-xs font-bold text-[var(--store-text-main)] animate-pulse">Procesando pago seguro...</span>
                </div>
            )}
            
            <div className="w-full z-0">
                <PayPalScriptProvider options={{ clientId: clientId, currency: "USD", intent: "capture" }}>
                    <PayPalButtons 
                        style={{ layout: "vertical", shape: "rect", color: "gold" }}
                        disabled={isProcessing}
                        createOrder={async () => {
                            try {
                                const response = await fetch('/api/checkout/paypal/create-order', {
                                    method: 'POST',
                                    headers: { 'Content-Type': 'application/json' },
                                    body: JSON.stringify({ storeId, amount })
                                });
                                const responseData = await response.json();
                                if (!responseData.success) throw new Error(responseData.error);
                                return responseData.id; 
                            } catch (error: any) {
                                Swal.fire('Error', error.message, 'error');
                                throw error;
                            }
                        }}
                        /* 🚀 Tipado explícito de data para satisfacer a TypeScript estricto */
                        onApprove={async (data: { orderID: string }) => {
                            setIsProcessing(true);
                            try {
                                const response = await fetch('/api/checkout/paypal/capture-order', {
                                    method: 'POST',
                                    headers: { 'Content-Type': 'application/json' },
                                    body: JSON.stringify({ storeId, orderId: data.orderID })
                                });
                                const captureData = await response.json();
                                
                                if (captureData.success) {
                                    onSuccess(captureData.transactionId);
                                } else {
                                    throw new Error(captureData.error);
                                }
                            } catch (error: any) {
                                Swal.fire('Pago Declinado', error.message, 'error');
                            } finally {
                                setIsProcessing(false);
                            }
                        }}
                        onCancel={() => {
                            setIsProcessing(false);
                        }}
                        /* 🚀 Tipado explícito de err */
                        onError={(err: any) => {
                            console.error("PayPal Frontend Error:", err);
                            setIsProcessing(false);
                            Swal.fire('Interrupción', 'El panel de PayPal se cerró inesperadamente o hubo un error de red.', 'warning');
                        }}
                    />
                </PayPalScriptProvider>
            </div>
        </div>
    );
}