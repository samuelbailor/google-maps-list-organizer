# Google Maps Bulk List Organizer

## Problem Statement

You have nearly 3,000 saved places in your "Wanna Go" list on Google Maps, which is hitting the platform's limit. You need to organize these pins by city (e.g., move all Seoul pins to a "Seoul WTG" list) without manually clicking through hundreds of times. Google Maps doesn't provide a bulk move feature or public API for this.

## Architecture

### Data Extraction — `getlist` API
Google Maps internally uses `/maps/preview/entitylist/getlist` to fetch saved list data. By capturing this URL from the browser network tab while viewing your saved list, we can fetch all 2,974 places (including coordinates and addresses) in seconds — paginated at 500 per request, 6 requests total.

The response is a JSON array prefixed with `)]}'` (XSSI protection). Each entry contains:
- Place name
- Full address
- Lat/lng coordinates at `entry[1][5][2]` and `entry[1][5][3]`
- Place path (`/g/...`) for constructing a Maps URL

### City Filtering
We identify Seoul places using a lat/lng bounding box (37.40–37.72N, 126.75–127.25E) rather than string-matching addresses. Covers the greater Seoul metro area.

### Authentication
Uses Chrome's remote debugging protocol (CDP) to connect to a real Chrome instance the user launched with `--remote-debugging-port=9222`. This reuses the user's existing Google session — no credentials stored, no bot detection.

### Move Automation (Phase 2 — not yet built)
Playwright UI automation to click through each Seoul place card and move it from "Wanna Go" to "Seoul WTG". Map pins render on an HTML5 canvas and can't be targeted by DOM selectors — moves must be driven through the sidebar list UI.

## Tech Stack

- **Runtime:** Node.js with TypeScript
- **Package manager:** pnpm
- **TS execution:** tsx (esbuild-based, fast)
- **Browser automation:** Playwright (CDP connection to real Chrome)
- **No external APIs needed** — coordinates come from the getlist response

## Current Status

### ✅ Phase 1 Complete: Data Extraction
- Fetches all 3,000 places from the `getlist` endpoint
- Parses coordinates and addresses from the protobuf-like JSON response
- Filters Seoul places by bounding box
- Outputs `tmp/places.json` (all places) and `tmp/seoul-places.json` (360 Seoul places)

### 🔜 Phase 2: UI Automation — Move Seoul Pins
- Open each item in the "Wanna Go" sidebar list
- Read the place card, confirm it's in Seoul (already known from Phase 1)
- Click the bookmark button → uncheck "Wanna Go" → check "Seoul WTG"
- Resume support: save progress after each move so crashes don't lose work

### Future
- Generalize for other cities (Taipei, Hong Kong, etc.) — just change the bounding box
- CLI arguments to accept source list, destination list, and city bounding box
- The `getlist` URL contains a session token that will expire — document re-capture steps

## Known Constraints

- **`getlist` URL is session-scoped:** The `pb=` parameter encodes your list ID and a session token. It works for the duration of a session but will need to be re-captured from the network tab if it stops working. Update `config.ts` with the new URL.
- **Canvas rendering:** Map pins are drawn on an HTML5 canvas — they can't be targeted by CSS selectors. All UI automation must go through the sidebar list view.
- **Chrome must be launched with debug port:** Run `pnpm run launch-chrome` before `pnpm start`. Only the `.chrome-session` profile window needs to be closed between runs.
- **Total count is hardcoded:** `config.totalPlaces = 2974` — update if your list grows or shrinks.

## Setup

1. `pnpm install`
2. `pnpm run launch-chrome` — opens Chrome with remote debugging on port 9222
3. Sign into Google Maps in that window (one-time — session is saved to `.chrome-session/`)
4. `pnpm start`
5. Check `tmp/seoul-places.json`
