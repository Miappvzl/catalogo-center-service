import type { Metadata, Viewport } from "next";
import { 
  Inter, 
  Outfit, 
  DM_Sans, 
  Space_Grotesk, 
  Archivo_Black, 
  Manrope, 
  Fredoka, 
  Quicksand, 
  Cormorant_Garamond, 
  Montserrat,
   Bebas_Neue       // 👈 Añadida

} from "next/font/google";
import "./globals.css";
import { Toaster } from 'sonner';

// 1. CLASSIC UNIVERSAL
const outfit = Outfit({ variable: "--font-outfit", subsets: ["latin"] });
const dmSans = DM_Sans({ variable: "--font-dm-sans", subsets: ["latin"] });


// 2. INDUSTRIAL PRO
const spaceGrotesk = Space_Grotesk({ variable: "--font-space", subsets: ["latin"] });
const inter = Inter({ variable: "--font-inter", subsets: ["latin"] });


// 3. STREETWEAR BRUTALIST (Actualizado con Bebas Neue)
const archivoBlack = Archivo_Black({ variable: "--font-archivo", weight: "400", subsets: ["latin"] });
const manrope = Manrope({ variable: "--font-manrope", subsets: ["latin"] }); // 👈 Corregido el nombre de la variable
const bebasNeue = Bebas_Neue({ variable: "--font-bebas-neue", weight: "400", subsets: ["latin"] }); // 👈 Añadida

// 4. BISTRO FAST FOOD
const fredoka = Fredoka({ variable: "--font-fredoka", subsets: ["latin"] });
const quicksand = Quicksand({ variable: "--font-quicksand", subsets: ["latin"] });

// 5. MINIMAL LUXURY
const cormorant = Cormorant_Garamond({ variable: "--font-cormorant", weight: ["400", "600", "700"], subsets: ["latin"] });
const montserrat = Montserrat({ variable: "--font-montserrat", subsets: ["latin"] });

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#FFFFFF" },
    { media: "(prefers-color-scheme: dark)", color: "#0d0d0d" }
  ],
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export const metadata: Metadata = {
  metadataBase: new URL('https://preziso.vercel.app'),
  title: { default: "Preziso | E-commerce Automatizado para Venezuela", template: "%s | Preziso" },
  description: "Sistema de ventas inteligente que actualiza tus precios a Tasa BCV automáticamente. Vende en dólares, cobra en bolívares y gestiona pedidos por WhatsApp.",
  keywords: ["catalogo digital", "venezuela", "tasa bcv", "automatizacion", "tienda online", "ventas whatsapp", "dolar monitor"],
  verification: { google: "M4XhHoatLNpxW7arB9a6LWkdKCUYm4u9UCZ5UOPK3ok" },
  openGraph: {
    title: "Preziso - Deja de ser esclavo de la tasa",
    description: "Tu tienda online que calcula el dólar sola. Prueba gratis hoy.",
    siteName: "Preziso",
    locale: "es_VE",
    type: "website",
    url: 'https://preziso.vercel.app',
    images: [{ url: '/opengraph-image.jpg', width: 1200, height: 630, alt: 'Preziso Dashboard Preview' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Preziso - Sistema Operativo para Venezuela',
    description: 'Automatiza tu tienda con tasa BCV en tiempo real.',
    images: ['/opengraph-image.jpg'], 
  },
  icons: {
    icon: [
      { media: '(prefers-color-scheme: light)', url: '/favicon-light.png', href: '/favicon-light.png' },
      { media: '(prefers-color-scheme: dark)', url: '/favicon-dark.png', href: '/favicon-dark.png' },
    ],
  },
  other: { google: "notranslate" },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es" translate="no">
      <body
        className={`
          ${outfit.variable} ${dmSans.variable} 
          ${spaceGrotesk.variable} ${inter.variable} 
          ${archivoBlack.variable} ${manrope.variable} 
          ${fredoka.variable} ${quicksand.variable} 
          ${cormorant.variable} ${montserrat.variable} 
          ${bebasNeue.variable} font-body antialiased notranslate
        `}
      >
        {children}
        <Toaster position="bottom-center" />
      </body>
    </html>
  );
}