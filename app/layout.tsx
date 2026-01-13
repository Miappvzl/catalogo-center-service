import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});
export const metadata: Metadata = {
  metadataBase: new URL('https://preziso.vercel.app'),
  title: {
    default: "Preziso | E-commerce Automatizado para Venezuela",
    template: "%s | Preziso"
  },
  description: "Sistema de ventas inteligente que actualiza tus precios a Tasa BCV automáticamente. Vende en dólares, cobra en bolívares y gestiona pedidos por WhatsApp.",
  keywords: ["catalogo digital", "venezuela", "tasa bcv", "automatizacion", "tienda online", "ventas whatsapp", "dolar monitor"],
  openGraph: {
    title: "Preziso - Deja de ser esclavo de la tasa",
    description: "Tu tienda online que calcula el dólar sola. Prueba gratis hoy.",
    siteName: "Preziso",
    locale: "es_VE",
    type: "website",
  }
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
