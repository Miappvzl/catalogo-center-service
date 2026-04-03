import type { Metadata, Viewport } from "next";
import { Inter, Playfair_Display, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from 'sonner';

// 🚀 FUENTE PRINCIPAL: Inter (El estándar de oro para UI Premium y Legibilidad)
const inter = Inter({
  variable: "--font-sans",
  subsets: ["latin"],
});

// 🚀 FUENTE SECUNDARIA: Elegancia Boutique (Para Títulos y Nombres de Tienda)
const playfair = Playfair_Display({
  variable: "--font-serif",
  subsets: ["latin"],
  style: ['normal', 'italic'],
});

// 🚀 FUENTE MONOESPACIADA: Precisión Financiera (Para Tasa BCV y Datos Duros)
const jetbrains = JetBrains_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
});

export const viewport: Viewport = {
  themeColor: "#000000",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export const metadata: Metadata = {
  metadataBase: new URL('https://preziso.vercel.app'),
  
  title: {
    default: "Preziso | E-commerce Automatizado para Venezuela",
    template: "%s | Preziso"
  },
  description: "Sistema de ventas inteligente que actualiza tus precios a Tasa BCV automáticamente. Vende en dólares, cobra en bolívares y gestiona pedidos por WhatsApp.",
  keywords: ["catalogo digital", "venezuela", "tasa bcv", "automatizacion", "tienda online", "ventas whatsapp", "dolar monitor"],

  verification: {
    google: "M4XhHoatLNpxW7arB9a6LWkdKCUYm4u9UCZ5UOPK3ok", 
  },
  
  openGraph: {
    title: "Preziso - Deja de ser esclavo de la tasa",
    description: "Tu tienda online que calcula el dólar sola. Prueba gratis hoy.",
    siteName: "Preziso",
    locale: "es_VE",
    type: "website",
    url: 'https://preziso.vercel.app',
    images: [
      {
        url: '/opengraph-image.jpg', 
        width: 1200,
        height: 630,
        alt: 'Preziso Dashboard Preview',
      },
    ],
  },

  twitter: {
    card: 'summary_large_image',
    title: 'Preziso - Sistema Operativo para Venezuela',
    description: 'Automatiza tu tienda con tasa BCV en tiempo real.',
    images: ['/opengraph-image.jpg'], 
  },

  icons: {
    icon: [
      {
        media: '(prefers-color-scheme: light)',
        url: '/favicon-light.png',
        href: '/favicon-light.png',
      },
      {
        media: '(prefers-color-scheme: dark)',
        url: '/favicon-dark.png',
        href: '/favicon-dark.png',
      },
    ],
  },

  other: {
    google: "notranslate",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" translate="no">
      <body
        // 🚀 Inyectamos las 3 variables tipográficas al DOM
        className={`${inter.variable} ${playfair.variable} ${jetbrains.variable} font-sans antialiased notranslate`}
      >
        {children}
        <Toaster position="bottom-right" theme="light" closeButton richColors />
      </body>
    </html>
  );
}