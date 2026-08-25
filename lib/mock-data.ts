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
   food: {
        logo: '/tu-logo-transparente-oscuro.webp', // 👈 REEMPLAZA AQUÍ
        hero_desktop: '/tu-banner-desktop-roboto.webp', // 👈 REEMPLAZA AQUÍ
        hero_mobile: '/tu-banner-mobile-roboto.webp', // 👈 REEMPLAZA AQUÍ
        promotion: { title: 'COMBO FIN DE SEMANA', tagline: 'AHORRA 20%', bg_color: '#E11D48', text_color: '#ffffff' },
        products: [
            { id: 'f1', name: 'Hamburguesa Doble Smash', category: 'Principales', usd_cash_price: 12, usd_penalty: 0, stock: 99, image_url: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=600&q=80' },
            { id: 'f2', name: 'Pizza Margherita Artesanal', category: 'Principales', usd_cash_price: 14, usd_penalty: 0, stock: 99, image_url: 'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=600&q=80' },
            { id: 'f3', name: 'Papas Fritas Trufadas', category: 'Acompañantes', usd_cash_price: 6, usd_penalty: 0, stock: 99, image_url: 'https://images.unsplash.com/photo-1576107232684-1279f390859f?w=600&q=80' },
            { id: 'f4', name: 'Cheesecake de Nutella', category: 'Postres', usd_cash_price: 7, usd_penalty: 0, stock: 5, image_url: 'https://images.unsplash.com/photo-1533134242443-d4fd215305ad?w=600&q=80' },
        ]
    },
    streetwear: {
        logo: '/tu-logo-transparente-claro.webp', // 👈 REEMPLAZA AQUÍ
        hero_desktop: '/tu-banner-desktop-roboto.webp', // 👈 REEMPLAZA AQUÍ
        hero_mobile: '/tu-banner-mobile-roboto.webp', // 👈 REEMPLAZA AQUÍ
        promotion: { title: 'DROP EXCLUSIVO', tagline: 'CANTIDADES LIMITADAS', bg_color: '#0D0D0D', text_color: '#F5F5F5' },
        products: [
            { id: 's1', name: 'Hoodie Oversize Heavyweight', category: 'Sudaderas', usd_cash_price: 55, usd_penalty: 5, stock: 15, image_url: 'https://images.unsplash.com/photo-1556821840-3a63f95609a7?w=600&q=80' },
            { id: 's2', name: 'Cargo Pants Multi-Pocket', category: 'Pantalones', usd_cash_price: 65, usd_penalty: 0, stock: 3, image_url: 'https://images.unsplash.com/photo-1624378439575-d8705ad7ae80?w=600&q=80' },
            { id: 's3', name: 'Sneakers Chunky Retro', category: 'Calzado', usd_cash_price: 110, usd_penalty: 0, stock: 0, image_url: 'https://images.unsplash.com/photo-1523398002811-999aa8d9512e?w=600&q=80' },
            { id: 's4', name: 'Beanie Logo Bordado', category: 'Accesorios', usd_cash_price: 25, usd_penalty: 0, stock: 8, image_url: 'https://images.unsplash.com/photo-1576871337622-98d48d1cf531?w=600&q=80' },
        ]
    }
};