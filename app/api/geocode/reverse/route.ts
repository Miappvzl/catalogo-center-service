import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const lat = searchParams.get('lat');
  const lon = searchParams.get('lon');

  if (!lat || !lon) {
    return NextResponse.json({ address: '' });
  }

  const apiKey = process.env.TOMTOM_API_KEY;

  if (apiKey) {
    try {
      const url = `https://api.tomtom.com/search/2/reverseGeocode/${lat},${lon}.json?key=${apiKey}&language=es-ES`;
      const res = await fetch(url, { cache: 'no-store' });

      if (res.ok) {
        const data = await res.json();
        if (data.addresses && data.addresses.length > 0) {
          const addr = data.addresses[0].address;
          const label = addr.freeformAddress || [addr.municipalitySubdivision, addr.municipality].filter(Boolean).join(', ');
          return NextResponse.json({ address: label.replace(', Venezuela', '') });
        }
      }
    } catch (err) {
      console.warn('[TomTom Reverse] Error:', err);
    }
  }

  // Fallback con Photon libre
  try {
    const photonUrl = `https://photon.komoot.io/reverse?lon=${lon}&lat=${lat}&lang=es`;
    const res = await fetch(photonUrl);
    if (res.ok) {
      const data = await res.json();
      if (data.features && data.features.length > 0) {
        const p = data.features[0].properties || {};
        const district = p.district || p.suburb || p.neighbourhood || p.street || '';
        const city = p.city || p.municipality || p.state || '';
        return NextResponse.json({ address: [district, city].filter(Boolean).join(', ') });
      }
    }
  } catch {
    // Ignorar
  }

  return NextResponse.json({ address: '' });
}