import * as fs from 'fs';
import { chromium, Page } from 'playwright';
import { config } from './config';
import { SavedPlace } from './types';

function isSeoul(lat: number, lng: number): boolean {
  const { latMin, latMax, lngMin, lngMax } = config.seoulBounds;
  return lat >= latMin && lat <= latMax && lng >= lngMin && lng <= lngMax;
}

function parsePlaces(responseText: string): SavedPlace[] {
  // Strip the XSSI prefix ")]}'" that Google prepends to prevent JSON hijacking
  const data = JSON.parse(responseText.replace(/^\)\]\}'/, '').trim());

  // Response structure: data[0][8] = array of place entries
  // Each entry: [null, [null, null, address, null, null, [null, null, lat, lng], ..., placePath], name, ...]
  const entries: unknown[] = data?.[0]?.[8] ?? [];
  const places: SavedPlace[] = [];

  for (const entry of entries) {
    if (!Array.isArray(entry)) continue;
    const inner = entry[1];
    if (!Array.isArray(inner)) continue;

    const name: string = entry[2] ?? inner[1] ?? '';
    const address: string = inner[2] ?? '';
    const coords = inner[5];
    const placePath: string = inner[8] ?? '';

    if (!Array.isArray(coords) || coords.length < 4) continue;
    const lat: number = coords[2];
    const lng: number = coords[3];
    if (typeof lat !== 'number' || typeof lng !== 'number') continue;

    places.push({
      name,
      address,
      url: placePath ? `https://www.google.com${placePath}` : undefined,
      coordinates: { lat, lng },
    });
  }

  return places;
}

async function fetchPage(page: Page, offset: number): Promise<string> {
  const url = config.getlistUrl
    .replace('{LIMIT}', String(config.pageSize))
    .replace('{OFFSET}', String(offset));

  return page.evaluate(async (u) => {
    const res = await fetch(u);
    return res.text();
  }, url);
}

async function main() {
  const browser = await chromium.connectOverCDP('http://127.0.0.1:9222');
  const context = browser.contexts()[0];
  const page = context.pages()[0] ?? await context.newPage();

  const allPlaces: SavedPlace[] = [];
  let offset = 0;

  while (offset < config.totalPlaces) {
    console.log(`Fetching places ${offset}–${Math.min(offset + config.pageSize, config.totalPlaces)}...`);
    const text = await fetchPage(page, offset);
    const places = parsePlaces(text);
    if (places.length === 0) break;
    allPlaces.push(...places);
    console.log(`  Got ${places.length} (total: ${allPlaces.length})`);
    offset += config.pageSize;
  }

  const seoulPlaces = allPlaces.filter(p => isSeoul(p.coordinates.lat, p.coordinates.lng));

  fs.mkdirSync('tmp', { recursive: true });
  fs.writeFileSync('tmp/places.json', JSON.stringify(allPlaces, null, 2));
  fs.writeFileSync('tmp/seoul-places.json', JSON.stringify(seoulPlaces, null, 2));

  console.log(`\nTotal: ${allPlaces.length} places`);
  console.log(`Seoul: ${seoulPlaces.length} places`);
  console.log('→ tmp/places.json');
  console.log('→ tmp/seoul-places.json');

  await browser.close();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
