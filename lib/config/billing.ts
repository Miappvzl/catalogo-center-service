// lib/config/billing.ts

export const PREZISO_BILLING = {
    planName: "Preziso Ilimitado",
    priceUSD: 18.99,
    
    // Cuentas Receptoras Nacionales
    pagoMovil: {
        banco: "Venezuela (0102)",
        telefono: "0414-5809864",
        cedula: "V-34075886",
    },
    
    // Cuentas Receptoras Internacionales
    wallets: {
        binanceId: "1135326432", // ⚠️ Recuerda poner tu ID real de Binance
        zinliEmail: "miappvzl@gmail.com", // ⚠️ Recuerda poner tu correo real de Zinli/Wally
    },
    
    // Canal de Soporte y Facturación
    whatsappContact: "584145811936",
    
    // Generador dinámico de mensajes para trazabilidad absoluta
    generateReportMessage: (storeName: string, storeId: string, amountBs: string | number) => {
        return `Hola, quiero activar/renovar la suscripción de mi tienda en Preziso.\n\n*Tienda:* ${storeName}\n*ID:* ${storeId}\n\nHe realizado el pago de la suscripción mensual ($18.99 / Bs ${amountBs}).\n\nAdjunto comprobante de pago:`
    }
}