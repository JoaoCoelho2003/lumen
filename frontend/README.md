# Lumen Portugal Navigation

Waze-style navigation web app for Portugal built with Next.js App Router, TypeScript, Tailwind CSS, Mapbox GL JS through `react-map-gl`, Mapbox Geocoding, and Mapbox Directions.

## Install

```bash
npm install next@16.2.4 react@19.2.4 react-dom@19.2.4 react-map-gl@^7.1.7 mapbox-gl@^3.9.2 @mapbox/mapbox-gl-geocoder@^5.1.0 lucide-react@^0.468.0 tailwindcss@^4 @tailwindcss/postcss@^4 typescript@^5 eslint@^9 eslint-config-next@16.2.4 @types/node@^20 @types/react@^19 @types/react-dom@^19
```

The app reads the public Mapbox token from `.env.local`:

```bash
NEXT_PUBLIC_MAPBOX_TOKEN=pk.your_mapbox_public_token_here
```

Restart the dev server after changing `.env.local`.

## Mapbox Token

1. Create or sign in to a Mapbox account at https://account.mapbox.com/.
2. Open **Tokens**.
3. Create a public token or copy the default public token.
4. Make sure the token can use Maps, Geocoding, and Directions APIs.
5. Add it to `.env.local` as `NEXT_PUBLIC_MAPBOX_TOKEN`.

## Development

Run the development server:

```bash
npm run dev
```

Open http://localhost:3000.

## Features

- Real Mapbox map with Portugal bounds.
- Origin and destination autocomplete using Mapbox Geocoding API.
- Browser geolocation for origin.
- Driving and walking route calculation using Mapbox Directions API.
- Route preview with distance, ETA, and turn-by-turn steps.
- Simulated navigation that follows the route, updates bearing, travelled path, active instruction, and remaining distance.
- Satellite layer toggle plus placeholder heatmap and lighting state toggles.

## Notes

Mapbox API calls happen directly in the browser because the token is public and supplied through `NEXT_PUBLIC_MAPBOX_TOKEN`.
