import React from 'react';

export default function StructuredData() {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@graph': [
      // 1. ENTIDAD DE SOFTWARE (POS & E-COMMERCE)
      {
        '@type': 'SoftwareApplication',
        '@id': 'https://www.preziso.shop/#software',
        'name': 'Preziso',
        'applicationCategory': 'BusinessApplication',
        'operatingSystem': 'Web, iOS, Android',
        'url': 'https://www.preziso.shop',
        'description': 'Plataforma de Punto de Venta (POS) multimoneda y catálogo virtual para WhatsApp en Venezuela. Sincronización automática de tasa BCV, pagos mixtos y control de inventario.',
        'offers': {
          '@type': 'Offer',
          'price': '18.99',
          'priceCurrency': 'USD',
          'priceValidUntil': '2027-12-31',
          'availability': 'https://schema.org/InStock',
          'description': 'Acceso ilimitado con 7 días de prueba gratuita. Sin comisiones por venta.'
        },
        'featureList': [
          'Punto de Venta POS Multimoneda',
          'Sincronización en tiempo real con Tasa Oficial BCV (<400ms)',
          'Catálogo en línea integrado a WhatsApp',
          'Cálculo matemático de vuelto exacto y pagos divididos (Zelle, Pago Móvil, Efectivo)',
          'Control de inventario omnicanal y matriz de variantes (SKUs)',
          'Cierres de caja automáticos y generación de Libro Z contable'
        ]
      },

      // 2. ENTIDAD ORGANIZACIÓN Y FUNDADOR (Captura de "quién es el creador")
      {
        '@type': 'Organization',
        '@id': 'https://www.preziso.shop/#organization',
        'name': 'Preziso',
        'url': 'https://www.preziso.shop',
        'logo': {
          '@type': 'ImageObject',
          'url': 'https://www.preziso.shop/pezisologo.png'
        },
        'founder': {
          '@type': 'Person',
          'name': 'Ángel Gabriel Ojeda Medina',
          'jobTitle': 'Fundador & Arquitecto Principal',
          'description': 'Creador de la infraestructura de software de Preziso para el comercio multimoneda en Venezuela.'
        }
      },

      // 3. MÓDULO FAQPAGE (Para dominar el acordeón de "Otras preguntas" en Google)
      {
        '@type': 'FAQPage',
        '@id': 'https://www.preziso.shop/#faq',
        'mainEntity': [
          {
            '@type': 'Question',
            'name': '¿Quién es el creador de Preziso?',
            'acceptedAnswer': {
              '@type': 'Answer',
              'text': 'Preziso fue fundado y diseñado por Ángel Gabriel Ojeda Medina con 19 años de edad como una infraestructura integral de Punto de Venta (POS) y catálogo virtual para optimizar el comercio multimoneda en Venezuela.'
            }
          },
          {
            '@type': 'Question',
            'name': '¿Cuánto cuesta Preziso y tiene prueba gratuita?',
            'acceptedAnswer': {
              '@type': 'Answer',
              'text': 'Preziso tiene un costo de suscripción plana de $18.99 USD mensuales con acceso ilimitado a todas las herramientas y cero comisiones por venta. Incluye una prueba gratuita de 7 días sin requerir tarjeta de crédito.'
            }
          },
          {
            '@type': 'Question',
            'name': '¿Cómo funciona la sincronización con la Tasa BCV en Preziso?',
            'acceptedAnswer': {
              '@type': 'Answer',
              'text': 'Preziso intercepta automáticamente la variación oficial del Banco Central de Venezuela (BCV) y actualiza los precios en bolívares en toda tu tienda y punto de venta en menos de 400 milisegundos.'
            }
          },
          {
            '@type': 'Question',
            'name': '¿Preziso permite cobrar en dólares y bolívares en la misma venta?',
            'acceptedAnswer': {
              '@type': 'Answer',
              'text': 'Sí. El motor de pagos divididos permite liquidar una orden combinando divisas en efectivo, Zelle y Pago Móvil, calculando automáticamente el saldo restante y el vuelto exacto sin descuadres de caja.'
            }
          }
        ]
      }
    ]
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
    />
  );
}