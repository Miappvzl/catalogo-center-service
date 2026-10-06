import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get('q');
  const lat = searchParams.get('lat');
  const lon = searchParams.get('lon');

  if (!query || query.trim().length < 2) {
    return NextResponse.json({ results: [] });
  }

  // Soporta tanto GOOGLE_MAPS_API_KEY como NEXT_PUBLIC_GOOGLE_MAPS_API_KEY
  const apiKey = process.env.GOOGLE_MAPS_API_KEY || process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

  if (!apiKey) {
    console.error('[Preziso Google API] Falta la API Key en .env.local');
    return NextResponse.json({ results: [] });
  }

  try {
    const requestBody: any = {
      textQuery: query.trim(),
      languageCode: 'es',
      regionCode: 'VE',
    };

    // Sesgo geográfico si hay coordenadas
    if (lat && lon) {
      requestBody.locationBias = {
        circle: {
          center: {
            latitude: parseFloat(lat),
            longitude: parseFloat(lon),
          },
          radius: 50000.0,
        },
      };
    }

    // 🚀 PETICIÓN A "PLACES API (NEW)" - La API moderna que tienes habilitada
    const res = await fetch('https://places.googleapis.com/v1/places:searchText', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': apiKey,
        'X-Goog-FieldMask': 'places.id,places.displayName.text,places.formattedAddress,places.location',
      },
      body: JSON.stringify(requestBody),
      cache: 'no-store',
    });

    const data = await res.json();

    if (data.error) {
      console.error('🚨 [GOOGLE PLACES (NEW) ERROR]:', data.error.message);
      return NextResponse.json({ results: [] });
    }

    if (data.places && data.places.length > 0) {
      const formatted = data.places.map((place: any) => {
        const cleanAddress = (place.formattedAddress || '').replace(', Venezuela', '');
        const name = place.displayName?.text || '';
        const label = cleanAddress.includes(name) ? cleanAddress : `${name}, ${cleanAddress}`;

        return {
          id: place.id,
          label: label,
          city: 'Venezuela',
          state: '',
          coordinates: {
            lat: place.location?.latitude,
            lng: place.location?.longitude,
          },
        };
      });

      return NextResponse.json({ results: formatted });
    }

    return NextResponse.json({ results: [] });
  } catch (error) {
    console.error('[Preziso Backend] Error de red:', error);
    return NextResponse.json({ results: [] });
  }
}