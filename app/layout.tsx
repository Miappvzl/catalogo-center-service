import type { Metadata } from "next";
import { Geist, Geist_Mono, Playfair_Display } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const playfair = Playfair_Display({
  variable: "--font-serif",
  subsets: ["latin"],
  style: ['normal', 'italic'],
});

export const metadata: Metadata = {
  metadataBase: new URL('https://preziso.vercel.app'),
  
  title: {
    default: "Preziso | E-commerce Automatizado para Venezuela",
    template: "%s | Preziso"
  },
  description: "Sistema de ventas inteligente que actualiza tus precios a Tasa BCV automáticamente. Vende en dólares, cobra en bolívares y gestiona pedidos por WhatsApp.",
  keywords: ["catalogo digital", "venezuela", "tasa bcv", "automatizacion", "tienda online", "ventas whatsapp", "dolar monitor"],
  
  // --- CONFIGURACIÓN DE REDES SOCIALES (WhatsApp, Facebook, LinkedIn) ---
  openGraph: {
    title: "Preziso - Deja de ser esclavo de la tasa",
    description: "Tu tienda online que calcula el dólar sola. Prueba gratis hoy.",
    siteName: "Preziso",
    locale: "es_VE",
    type: "website",
    url: 'https://preziso.vercel.app',
    images: [
      {
        url: '/opengraph-image.jpg', // AQUI estaba el error, ahora coinciden
        width: 1200,
        height: 630,
        alt: 'Preziso Dashboard Preview',
      },
    ],
  },

  // --- CONFIGURACIÓN PARA TWITTER / X ---
  twitter: {
    card: 'summary_large_image',
    title: 'Preziso - Sistema Operativo para Venezuela',
    description: 'Automatiza tu tienda con tasa BCV en tiempo real.',
    images: ['/opengraph-image.jpg'], // Coincide con la de arriba
  },

  // --- CONFIGURACIÓN DE ICONOS (FAVICON) ---
  icons: {
    icon: [
      // MODO CLARO (Navegador Blanco) -> Necesitas la Z NEGRA (favicon-light.png)
      {
        media: '(prefers-color-scheme: light)',
        url: '/favicon-light.png',
        href: '/favicon-light.png',
      },
      // MODO OSCURO (Navegador Negro) -> Necesitas la Z BLANCA (favicon-dark.png)
      {
        media: '(prefers-color-scheme: dark)',
        url: '/favicon-dark.png',
        href: '/favicon-dark.png',
      },
    ],
  },

  // Bloqueo de traducción automática (Correcto)
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
    // 2. SEGUNDA DEFENSA: lang="es" para SEO local y translate="no" HTML5 estándar
    <html lang="es" translate="no">
      <body
        // 3. TERCERA DEFENSA: Clase 'notranslate' que bloquea la acción en el DOM
        className={`${geistSans.variable} ${geistMono.variable} ${playfair.variable} antialiased notranslate`}
      >
        {children}
      </body>
    </html>
  );
}