
'use client';

import Link from 'next/link';
import { useState } from 'react';
import { Search, ShoppingBag, Filter, AlertTriangle, ArrowRight } from 'lucide-react';

// Tipos de datos
interface Product {
    Name: string;
    Category: string;
    Image_Url: string;
    USD_Cash_Price: string;
    USD_Penalty: string;
    Sizes: string;
}

interface StoreProps {
    initialProducts: Product[];
    dolarRate: number;
}

export default function Store({ initialProducts, dolarRate }: StoreProps) {
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedCategory, setSelectedCategory] = useState('Todos');

    // 1. Extraer categorías únicas automáticamente
    const categories = ['Todos', ...Array.from(new Set(initialProducts.map(p => p.Category).filter(Boolean)))];

    // 2. Filtrar productos en tiempo real
    const filteredProducts = initialProducts.filter(product => {
        const matchesSearch = product.Name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            product.Category?.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesCategory = selectedCategory === 'Todos' || product.Category === selectedCategory;
        return matchesSearch && matchesCategory;
    });

    return (
        <div className="min-h-screen bg-zinc-50 text-zinc-900 font-sans">
            {/* --- NAVBAR STICKY --- */}
            <nav className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-zinc-200">
                <div className="max-w-6xl mx-auto px-4 py-4">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">

                        {/* Logo y Tasa */}
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <div className="bg-blue-600 p-2 rounded-lg text-white">
                                    <ShoppingBag size={20} />
                                </div>
                                <h1 className="text-xl font-bold tracking-tight">CENTER SERVICE</h1>
                            </div>
                            <span className="md:hidden text-xs font-medium bg-zinc-100 px-2 py-1 rounded-full text-zinc-600">
                                ${dolarRate.toFixed(2)} Bs
                            </span>
                        </div>

                        {/* Buscador */}
                        <div className="relative w-full md:max-w-md">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" size={18} />
                            <input
                                type="text"
                                placeholder="Buscar Nike, Adidas, tallas..."
                                className="w-full pl-10 pr-4 py-2 bg-zinc-100 border-transparent focus:bg-white focus:ring-2 focus:ring-blue-500 rounded-xl outline-none transition-all text-sm"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>

                        {/* Tasa Desktop */}
                        <div className="hidden md:block text-right">
                            <p className="text-xs text-zinc-500 uppercase font-semibold">Tasa BCV</p>
                            <p className="text-sm font-bold text-blue-600">{dolarRate.toFixed(2)} Bs/USD</p>
                        </div>
                    </div>

                    {/* Categorías (Scroll Horizontal en móvil) */}
                    <div className="flex gap-2 mt-4 overflow-x-auto pb-2 no-scrollbar">
                        {categories.map(cat => (
                            <button
                                key={cat}
                                onClick={() => setSelectedCategory(cat)}
                                className={`whitespace-nowrap px-4 py-1.5 rounded-full text-xs font-medium transition-all ${selectedCategory === cat
                                        ? 'bg-zinc-900 text-white shadow-lg'
                                        : 'bg-white border border-zinc-200 text-zinc-600 hover:bg-zinc-50'
                                    }`}
                            >
                                {cat}
                            </button>
                        ))}
                    </div>
                </div>
            </nav>

            {/* --- GRID DE PRODUCTOS --- */}
            <main className="max-w-6xl mx-auto px-4 py-8">

                {/* Contador de resultados */}
                <p className="text-sm text-zinc-500 mb-6">Mostrando {filteredProducts.length} productos</p>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredProducts.map((product, index) => {
                        // Cálculos de precio
                        const priceUSD = parseFloat(product.USD_Cash_Price || '0');
                        const penalty = parseFloat(product.USD_Penalty || '0');
                        const priceBS = (priceUSD + penalty) * dolarRate;
                        const wsMsg = `Hola Center Service, me interesa el modelo: ${product.Name} (Talla: ${product.Sizes || 'N/A'})`;
                        const wsLink = `https://wa.me/584121234567?text=${encodeURIComponent(wsMsg)}`; // ⚠️ CAMBIAR NÚMERO

                        return (
                            <article key={index} className="group bg-white rounded-2xl border border-zinc-100 shadow-sm hover:shadow-xl transition-all duration-300 overflow-hidden flex flex-col">

                                {/* Imagen con efecto Zoom */}
                                <div className="relative aspect-square overflow-hidden bg-zinc-50">
                                    <img
                                        src={product.Image_Url || 'https://via.placeholder.com/400'}
                                        alt={product.Name}
                                        className="object-cover w-full h-full group-hover:scale-105 transition-transform duration-500"
                                    />
                                    {penalty > 0 && (
                                        <div className="absolute top-3 left-3 bg-yellow-400 text-yellow-900 text-[10px] font-bold px-2 py-1 rounded-full flex items-center gap-1 shadow-sm">
                                            <AlertTriangle size={12} />
                                            OFERTA SOLO DIVISAS
                                        </div>
                                    )}
                                </div>

                                {/* Info */}
                                <div className="p-5 flex-1 flex flex-col">
                                    <div className="flex-1">
                                        <p className="text-xs font-bold text-blue-600 mb-1 tracking-wide uppercase">{product.Category}</p>
                                        <h3 className="text-lg font-bold text-zinc-900 leading-tight mb-2">{product.Name}</h3>
                                        <p className="text-xs text-zinc-500 mb-4">Tallas: {product.Sizes || 'Consultar'}</p>
                                    </div>

                                    {/* Precios */}
                                    <div className="flex items-end justify-between border-t border-zinc-100 pt-4 mt-2">
                                        <div>
                                            <span className="block text-2xl font-extrabold text-zinc-900">
                                                {priceBS.toLocaleString('es-VE', { maximumFractionDigits: 2 })} <span className="text-sm font-normal text-zinc-500">Bs</span>
                                            </span>
                                            <span className="text-sm font-medium text-green-600 bg-green-50 px-2 py-0.5 rounded-md">
                                                Ref: ${priceUSD}
                                            </span>
                                        </div>
                                        <Link
                                            href={`/product/${encodeURIComponent(product.Name)}`}
                                            className="bg-zinc-900 hover:bg-zinc-800 text-white p-3 rounded-full transition-colors shadow-lg shadow-zinc-200"
                                        >
                                            <ArrowRight size={20} />
                                        </Link>
                                    </div>
                                </div>
                            </article>
                        );
                    })}
                </div>

                {filteredProducts.length === 0 && (
                    <div className="text-center py-20">
                        <div className="inline-flex bg-zinc-100 p-4 rounded-full mb-4 text-zinc-400">
                            <Search size={32} />
                        </div>
                        <h3 className="text-lg font-medium text-zinc-900">No encontramos ese zapato</h3>
                        <p className="text-zinc-500">Intenta con otra búsqueda o categoría.</p>
                    </div>
                )}
            </main>
        </div>
    );
}