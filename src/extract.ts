import * as fs from 'fs';
import { chromium, Page } from 'playwright';
import { config, destSlug } from './config';
import { SavedPlace } from './types';

function isInBounds(lat: number, lng: number): boolean {
  const { latMin, latMax, lngMin, lngMax } = config.bounds;
  return lat >= latMin && lat <= latMax && lng >= lngMin && lng <= lngMax;
}

function parsePlaces(responseText: string): SavedPlace[] {
  const data = JSON.parse(responseText.replace(/^\)\]\}'/, '').trim());
  const entries: unknown[] = data?.[0]?.[8] ?? [];
  const places: SavedPlace[] = [];

  for (const entry of entries) {
    if (!Array.isArray(entry)) continue;
    const inner = entry[1];
    if (!Array.isArray(inner)) continue;

    const name: string = entry[2] ?? inner[1] ?? '';
    const note: string = entry[3] ?? '';
    const address: string = inner[2] ?? '';
    const coords = inner[5];

    if (!Array.isArray(coords) || coords.length < 4) continue;
    const lat: number = coords[2];
    const lng: number = coords[3];
    if (typeof lat !== 'number' || typeof lng !== 'number') continue;

    places.push({
      name, note, address,
      url: `https://www.google.com/maps/search/${encodeURIComponent(name)}/@${lat},${lng},18z`,
      coordinates: { lat, lng },
    });
  }

  return places;
}

function extractNextCursor(responseText: string): string | null {
  const data = JSON.parse(responseText.replace(/^\)\]\}'/, '').trim());
  const cursor = data?.[1];
  return typeof cursor === 'string' && cursor.length > 10 ? cursor : null;
}

async function captureGetlistUrls(page: Page, count: number): Promise<string[]> {
  const urls: string[] = [];
  return new Promise((resolve) => {
    page.on('request', (req) => {
      if (!req.url().includes('entitylist/getlist')) return;
      urls.push(req.url());
      if (urls.length >= count) resolve(urls);
    });
  });
}

async function fetchWithNextToken(page: Page, baseUrl: string, nextToken: string, limit: number): Promise<string> {
  // data[1] is standard base64 (+, /) but the URL uses URL-safe base64 (-, _)
  const urlSafeToken = nextToken.replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
  const next = baseUrl.replace(/!4i\d+/, `!4i${limit}!5B${urlSafeToken}`);
  return page.evaluate(async (u) => {
    const res = await fetch(u);
    return res.text();
  }, next);
}

async function main() {
  const browser = await chromium.connectOverCDP('http://127.0.0.1:9222');
  const context = browser.contexts()[0];
  const page = context.pages()[0] ?? await context.newPage();

  // Navigate to saved list and intercept the getlist request to get base URL + initial cursor
  // Collect ALL getlist requests fired by Maps as we scroll through the list
  const capturedUrls: string[] = [];
  page.on('request', (req) => {
    if (req.url().includes('entitylist/getlist')) capturedUrls.push(req.url());
  });

  console.log(`Navigating to "${config.sourceList}" to capture initial API request...`);
  await page.goto('https://www.google.com/maps', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(2000);
  await page.getByRole('button', { name: 'Saved' }).click();
  await page.waitForTimeout(2000);
  await page.getByText(config.sourceList, { exact: false }).first().click();
  await page.waitForTimeout(3000);

  await page.waitForTimeout(2000);

  // Snapshot after initial load
  const pageUrls = [...capturedUrls];
  if (pageUrls.length === 0) throw new Error('No getlist request captured — make sure you are logged into Google Maps');

  const baseUrl = pageUrls[0];
  const allPlaces: SavedPlace[] = [];
  let pageNum = 1;
  let nextToken: string | null = null;

  while (true) {
    console.log(`Fetching page ${pageNum}...`);
    const text = pageNum === 1
      ? await page.evaluate(async (u) => { const r = await fetch(u); return r.text(); }, baseUrl)
      : await fetchWithNextToken(page, baseUrl, nextToken!, config.pageSize);

    const places = parsePlaces(text);
    if (places.length === 0) break;
    allPlaces.push(...places);

    nextToken = extractNextCursor(text);
    console.log(`  Got ${places.length} (total: ${allPlaces.length})`);

    if (!nextToken) break;
    pageNum++;
  }

  // Deduplicate by URL (same name + coords = true duplicate)
  const seen = new Set<string>();
  const uniquePlaces = allPlaces.filter(p => {
    if (!p.name) return false; // drop entries with no name
    if (seen.has(p.url)) return false;
    seen.add(p.url);
    return true;
  });

  const dupeCount = allPlaces.length - uniquePlaces.length;
  if (dupeCount > 0) console.log(`Removed ${dupeCount} duplicates/unnamed entries`);

  const destPlaces = uniquePlaces.filter(p => isInBounds(p.coordinates.lat, p.coordinates.lng));

  fs.mkdirSync('tmp', { recursive: true });
  fs.writeFileSync('tmp/places.json', JSON.stringify(uniquePlaces, null, 2));
  fs.writeFileSync(`tmp/${destSlug}-places.json`, JSON.stringify(destPlaces, null, 2));

  console.log(`\nTotal: ${uniquePlaces.length} places`);
  console.log(`${config.destList}: ${destPlaces.length} places`);
  console.log('→ tmp/places.json');
  console.log(`→ tmp/${destSlug}-places.json`);

  await browser.close();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
