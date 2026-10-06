import { NextResponse } from 'next/server';

export async function GET() {
  // El servidor de Vercel siempre tiene acceso a estas variables en tiempo de ejecución
  const key = process.env.GOOGLE_MAPS_API_KEY || process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || '';
  
  return NextResponse.json({ key });
}