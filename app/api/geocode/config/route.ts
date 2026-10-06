import { NextRequest, NextResponse } from 'next/server';

// 🚀 OBLIGA A NEXT.JS A EJECUTAR LA FUNCIÓN EN VIVO EN CADA PETICIÓN (CERO JSON ESTÁTICO)
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(request: NextRequest) {
  const key = (
    process.env.GOOGLE_MAPS_API_KEY || 
    process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || 
    ''
  ).trim();

  return NextResponse.json(
    { key },
    {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
        'CDN-Cache-Control': 'no-store',
        'Vercel-CDN-Cache-Control': 'no-store',
      },
    }
  );
}