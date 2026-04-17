# google-maps-list-organizer

Bulk-move saved places between Google Maps lists by city.

**Use case:** You have thousands of places in "Want to go" and want to split them into city-specific lists like "Seoul WTG", "Taipei WTG", etc. — without clicking through each one manually.

## How it works

1. Connects to your real Chrome via remote debugging (no credentials stored)
2. Intercepts Google Maps' internal API request to fetch all your saved places
3. Filters by city using a configurable lat/lng bounding box
4. Automates moving matching places to a destination list via the Maps UI

## Prerequisites

- Node.js 18+
- pnpm
- Google Chrome

## Setup

```bash
pnpm install
```

## Usage

**Step 1 — Launch Chrome with remote debugging:**
```bash
pnpm run launch-chrome
```
Chrome must be fully quit first. Sign into Google Maps in the window that opens — session is saved to `.chrome-session/` for future runs.

**Step 2 — Create your destination list** manually in Google Maps (e.g. "Seoul WTG").

**Step 3 — Extract:**
```bash
pnpm extract
```
Navigates to your source list, captures all places via the internal API, and writes:
- `tmp/places.json` — all saved places with coordinates and notes
- `tmp/seoul-places.json` — places within the configured bounding box

**Step 4 — Move:**
```bash
pnpm move
```
Moves each matching place from the source list to the destination list via the Maps UI. Progress is saved to `tmp/progress.json` after each move — safe to interrupt and resume. Failed places are written to `tmp/failed.json`.

**Options:**
```bash
pnpm move --limit=5      # process only 5 places (for testing)
pnpm move --dry-run      # navigate without making changes
```

## Configuration

Edit `src/config.ts`:

```ts
export const config = {
  sourceList: 'Want to go',       // your source list name
  destList: 'Seoul WTG',          // destination list (must exist in Maps)
  bounds: {                        // lat/lng bounding box for your target city
    latMin: 37.40, latMax: 37.72,
    lngMin: 126.75, lngMax: 127.25
  },
  pageSize: 500,
};
```

## Project status

See [PROJECT.md](PROJECT.md) for full architecture details.
