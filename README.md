# google-maps-list-organizer

Bulk-move saved places between Google Maps lists by city.

**Use case:** You have 3,000 places in "Wanna Go" and want to split them into city-specific lists like "Seoul WTG", "Taipei WTG", etc. — without clicking through each one manually.

## How it works

1. Connects to your real Chrome via remote debugging (no credentials stored)
2. Fetches all your saved places from Google Maps' internal API in seconds
3. Filters by city using a lat/lng bounding box
4. *(Phase 2)* Automates moving matching pins to a destination list via the Maps UI

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
Sign into Google Maps in the window that opens. This only needs to happen once — the session is saved to `.chrome-session/`.

**Step 2 — Extract:**
```bash
pnpm extract
```

Outputs:
- `tmp/places.json` — all saved places with coordinates
- `tmp/seoul-places.json` — Seoul-only places

**Step 3 — Move:**
```bash
pnpm move
```

Moves each Seoul place from "Want to go" to "Seoul WTG" via the Maps UI. Saves progress to `tmp/progress.json` after each move — safe to interrupt and resume.

## Configuration

Edit `src/config.ts` to change the source list, destination list, city bounding box, or total place count.

The `getlistUrl` in config contains a session token captured from the browser network tab. If it stops working, re-capture it: open Chrome DevTools → Network tab → navigate to your saved list → find the `getlist` request → copy the full URL into `config.ts`.

## Project status

See [PROJECT.md](PROJECT.md) for architecture details and roadmap.
