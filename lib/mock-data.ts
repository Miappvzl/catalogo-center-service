// lib/mock-data.ts

export const MOCK_DATA: Record<string, { logo: string, hero_desktop: string, hero_mobile: string, products: any[], promotion?: any }> = {
    general: {
        logo: '/tu-logo-transparente-claro.webp', // 👈 REEMPLAZA AQUÍ
        hero_desktop: '/tu-banner-desktop-roboto.webp', // 👈 REEMPLAZA AQUÍ
        hero_mobile: '/tu-banner-mobile-roboto.webp', // 👈 REEMPLAZA AQUÍ
        promotion: { title: 'OFERTA DE TEMPORADA', tagline: 'SOLO POR HOY', bg_color: '#000000', text_color: '#ffffff' },
        products: [
            { id: 'm1', name: 'Zapatillas Urbanas Minimal', category: 'Calzado', usd_cash_price: 45, usd_penalty: 5, stock: 12, image_url: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=600&q=80' },
            { id: 'm2', name: 'Reloj Clásico Acero', category: 'Accesorios', usd_cash_price: 120, usd_penalty: 0, stock: 5, image_url: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=600&q=80' },
            { id: 'm3', name: 'Gafas de Sol Premium', category: 'Accesorios', usd_cash_price: 35, usd_penalty: 2, stock: 0, image_url: 'https://images.unsplash.com/photo-1511499767150-a48a237f0083?w=600&q=80' },
            { id: 'm4', name: 'Bolso de Cuero Sintético', category: 'Bolsos', usd_cash_price: 65, usd_penalty: 0, stock: 3, image_url: 'https://images.unsplash.com/photo-1584916201218-f4242ceb4809?w=600&q=80' },
        ]
    },
    hardware: {
        logo: '/tu-logo-transparente-oscuro.webp', // 👈 REEMPLAZA AQUÍ
        hero_desktop: '/tu-banner-desktop-roboto.webp', // 👈 REEMPLAZA AQUÍ
        hero_mobile: '/tu-banner-mobile-roboto.webp', // 👈 REEMPLAZA AQUÍ
        promotion: { title: 'LIQUIDACIÓN DE INVENTARIO', tagline: 'ALERTA DE STOCK', bg_color: '#ffbb00', text_color: '#1f1f1f' },
        products: [
            { id: 'h1', name: 'Taladro Percutor Inalámbrico 20V', category: 'Herramientas', usd_cash_price: 85, usd_penalty: 10, stock: 8, image_url: 'https://images.unsplash.com/photo-1504148455328-c376907d081c?w=600&q=80' },
            { id: 'h2', name: 'Set de Llaves de Vaso (40 pzas)', category: 'Mecánica', usd_cash_price: 45, usd_penalty: 0, stock: 2, image_url: 'https://images.unsplash.com/photo-1619765617659-f3dcb700c27f?q=80&w=1170&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D' },
            { id: 'h3', name: 'Aceite Sintético 5W-30', category: 'Repuestos', usd_cash_price: 22, usd_penalty: 3, stock: 25, image_url: 'https://images.unsplash.com/photo-1615906655593-ad0386982a0f?w=600&q=80' },
            { id: 'h4', name: 'Filtro de Aire Alto Flujo', category: 'Repuestos', usd_cash_price: 15, usd_penalty: 0, stock: 0, image_url: 'https://images.unsplash.com/photo-1688385274085-a009a3c5d4b7?q=80&w=687&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D' },
        ]
    },
    luxury: {
        logo: '/tu-logo-transparente-claro.webp', // 👈 REEMPLAZA AQUÍ (Preferiblemente blanco/claro para fondos oscuros)
        hero_desktop: '/tu-banner-desktop-montserrat.webp', // 👈 REEMPLAZA AQUÍ
        hero_mobile: '/tu-banner-mobile-montserrat.webp', // 👈 REEMPLAZA AQUÍ
        promotion: { title: 'COLECCIÓN PRIVADA', tagline: 'ACCESO EXCLUSIVO', bg_color: '#18181B', text_color: '#ffffff' },
        products: [
            { id: 'l1', name: 'Eau de Parfum N° 5 - 100ml', category: 'Fragancias', usd_cash_price: 150, usd_penalty: 0, stock: 4, image_url: 'https://images.unsplash.com/photo-1594035910387-fea47794261f?w=600&q=80' },
            { id: 'l2', name: 'Collar de Perlas Cultivadas', category: 'Joyería', usd_cash_price: 280, usd_penalty: 0, stock: 1, image_url: 'https://images.unsplash.com/photo-1654699991520-aaaf4dd2608b?q=80&w=1170&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D' },
            { id: 'l3', name: 'Anillo Solitario Oro Blanco', category: 'Joyería', usd_cash_price: 450, usd_penalty: 0, stock: 0, image_url: 'https://images.unsplash.com/photo-1605100804567-1ffe942b5cd6?q=80&w=880&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D' },
            { id: 'l4', name: 'Suero Facial Revitalizante', category: 'Skincare', usd_cash_price: 85, usd_penalty: 5, stock: 12, image_url: 'https://images.unsplash.com/photo-1620916566398-39f1143ab7be?w=600&q=80' },
        ]
    },
    beauty: {
        logo: '/tu-logo-transparente-claro.webp',
        hero_desktop: '/tu-banner-desktop-roboto.webp',
        hero_mobile: '/tu-banner-mobile-roboto.webp',
        promotion: {
            title: 'GLOW DE TEMPORADA',
            tagline: 'HASTA 20% OFF',
            bg_color: '#E11D48',
            text_color: '#ffffff'
        },
        products: [
            {
                id: 'b1',
                name: 'Lip Oil Hidratante Cherry Glow',
                category: 'Labios',
                usd_cash_price: 14,
                usd_penalty: 0,
                stock: 25,
                image_url: 'https://images.unsplash.com/photo-1586495777744-4413f21062fa?w=600&q=80'
            },
            {
                id: 'b2',
                name: 'Sérum Facial Vitamina C Iluminador',
                category: 'Cuidado Facial',
                usd_cash_price: 24,
                usd_penalty: 0,
                stock: 15,
                image_url: 'https://images.unsplash.com/photo-1620916566398-39f1143ab7be?w=600&q=80'
            },
             { 
                id: 'b3', 
                name: 'Crema Hidratante Velvet Glow', 
                category: 'Cuidado Facial', 
                usd_cash_price: 18, 
                usd_penalty: 0, 
                stock: 8, 
                // 🚀 URL ACTIVA DE ALTA DEFINICIÓN (Reemplaza la imagen rota en blanco)
                image_url: 'https://images.unsplash.com/photo-1556228720-195a672e8a03?w=600&q=80' 
            },
            {
                id: 'b4',
                name: 'Blush Líquido Velvet Berry',
                category: 'Maquillaje',
                usd_cash_price: 16,
                usd_penalty: 0,
                stock: 12,
                image_url: 'https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=600&q=80'
            },
        ]
    },
    streetwear: {
        logo: '/tu-logo-transparente-oscuro.webp', // 👈 REEMPLAZA AQUÍ
        hero_desktop: '/tu-banner-desktop-roboto.webp', // 👈 REEMPLAZA AQUÍ
        hero_mobile: '/tu-banner-mobile-roboto.webp', // 👈 REEMPLAZA AQUÍ
        promotion: { title: 'DROP EXCLUSIVO', tagline: 'CANTIDADES LIMITADAS', bg_color: '#0D0D0D', text_color: '#F5F5F5' },
        products: [
            { id: 's1', name: 'Hoodie Oversize Heavyweight', category: 'Sudaderas', usd_cash_price: 55, usd_penalty: 5, stock: 15, image_url: 'https://images.unsplash.com/photo-1556821840-3a63f95609a7?w=600&q=80' },
            { id: 's2', name: 'Cargo Pants Multi-Pocket', category: 'Pantalones', usd_cash_price: 65, usd_penalty: 0, stock: 3, image_url: 'https://images.unsplash.com/photo-1624378439575-d8705ad7ae80?w=600&q=80' },
            { id: 's3', name: 'Sneakers Chunky Retro', category: 'Calzado', usd_cash_price: 110, usd_penalty: 0, stock: 0, image_url: 'https://images.unsplash.com/photo-1657194002304-ecc87a34340a?w=600&auto=format&fit=crop&q=60&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxzZWFyY2h8MTR8fFNuZWFrZXJzJTIwQ2h1bmt5JTIwUmV0cm98ZW58MHx8MHx8fDA%3D' },
            { id: 's4', name: 'Beanie Logo Bordado', category: 'Accesorios', usd_cash_price: 25, usd_penalty: 0, stock: 8, image_url: 'https://images.unsplash.com/photo-1576871337622-98d48d1cf531?w=600&q=80' },
        ]
    },
    tech: {
        logo: '/tu-logo-transparente-claro.webp', // 👈 REEMPLAZA AQUÍ
        hero_desktop: '/tu-banner-desktop-roboto.webp', // 👈 REEMPLAZA AQUÍ
        hero_mobile: '/tu-banner-mobile-roboto.webp', // 👈 REEMPLAZA AQUÍ
        promotion: { title: 'TECH DEALS DE LA SEMANA', tagline: 'ENVÍO GRATIS APLICADO', bg_color: '#111827', text_color: '#FFFFFF' },
        products: [
            { id: 't1', name: 'Laptop Pro 14" M3 Chip 512GB', category: 'Laptops', usd_cash_price: 1299, usd_penalty: 0, stock: 5, image_url: 'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=600&q=80', description: 'Procesador: Chip M3\nMemoria: 16GB Unificada\nAlmacenamiento: 512GB SSD\nPantalla: Liquid Retina XDR' },
            { id: 't2', name: 'Auriculares Inalámbricos Noise Cancelling Max', category: 'Audio', usd_cash_price: 349, usd_penalty: 15, stock: 12, image_url: 'https://images.unsplash.com/photo-1618366712010-f4ae9c647dcb?w=600&q=80', description: 'Autonomía: 30 Horas\nCancelación de ruido: Activa (ANC)\nConectividad: Bluetooth 5.3' },
            { id: 't3', name: 'Smartphone Serie 15 Pro Titanium', category: 'Smartphones', usd_cash_price: 999, usd_penalty: 0, stock: 2, image_url: 'https://images.unsplash.com/photo-1695048132854-8d9e119f957b?w=600&auto=format&fit=crop&q=60&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxzZWFyY2h8MTJ8fFNtYXJ0cGhvbmUlMjBTZXJpZSUyMDE1JTIwUHJvJTIwVGl0YW5pdW18ZW58MHx8MHx8fDA%3D', description: 'Material: Titanio Grado 5\nPantalla: 6.1" ProMotion 120Hz\nCámara: Triple 48MP\nCapacidad: 256GB' },
            { id: 't4', name: 'Smartwatch Series 9 Aluminio', category: 'Wearables', usd_cash_price: 399, usd_penalty: 10, stock: 0, image_url: 'https://images.unsplash.com/photo-1434493789847-2f02dc6ca35d?w=600&q=80', description: 'Caja: 45mm Aluminio\nResistencia al agua: 50m\nSensores: ECG, Oxígeno, Temperatura' },
        ]
    }
};