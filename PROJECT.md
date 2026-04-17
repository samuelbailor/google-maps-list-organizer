# Google Maps Bulk List Organizer

## Problem Statement

You have thousands of saved places in a Google Maps list (e.g. "Want to go") and want to organize them by city — moving all Seoul places to "Seoul WTG", all Taipei places to "Taipei WTG", etc. — without clicking through each one manually. Google Maps has no bulk move feature or public API for this.

## Architecture

### Data Extraction — `getlist` API
Google Maps internally uses `/maps/preview/entitylist/getlist` to fetch saved list data. `pnpm extract` navigates to your source list in Chrome, intercepts the first API request automatically, then paginates through all places using a cursor token found at `data[1]` in each response.

Each place entry contains:
- Place name (`entry[2]`)
- Note (`entry[3]`)
- Full address (`entry[1][2]`)
- Lat/lng coordinates (`entry[1][5][2]`, `entry[1][5][3]`)

### Pagination
The API returns 500 places per page. Each response includes a next-page cursor at `data[1]` (standard base64, converted to URL-safe base64 for the `!5B` parameter). Pagination stops when no cursor is returned.

### City Filtering
Places are filtered using a lat/lng bounding box defined in `config.ts`. No geocoding API needed — coordinates come directly from the `getlist` response.

### Move Automation
`pnpm move` reads `tmp/{dest-list}-places.json` and for each place:
1. Navigates to its Maps search URL
2. If multiple results appear, clicks the one marked "Saved in Want to go"
3. Opens the save picker, adds to dest list, re-opens picker, removes from source list
4. Writes the note to the new list entry if one exists
5. Saves progress to `tmp/progress.json` after each success

### Authentication
Uses Chrome's remote debugging protocol (CDP) — `pnpm run launch-chrome` opens a dedicated Chrome window with `--remote-debugging-port=9222`. The script connects via `chromium.connectOverCDP()`. No credentials stored, no automation flag detection.

## Tech Stack

- **Runtime:** Node.js with TypeScript
- **Package manager:** pnpm
- **TS execution:** tsx (esbuild-based, fast startup)
- **Browser automation:** Playwright (CDP connection to real Chrome)
- **No external APIs** — coordinates come from the getlist response

## Current Status

### ✅ Phase 1: Data Extraction
- Navigates to source list and intercepts `getlist` request automatically
- Paginates via cursor token to fetch all places (~2,900+)
- Deduplicates by URL, drops unnamed entries
- Filters by configurable lat/lng bounding box
- Outputs `tmp/places.json` and `tmp/{dest-list}-places.json`

### ✅ Phase 2: Move Automation
- Navigates to each place, finds the correct result in multi-result pages
- Adds to dest list, removes from source list in two separate picker interactions
- Detects permanently closed places and removes them from all lists
- Transfers notes to the new list entry
- Resume support via `tmp/progress.json`, keyed by name+address (stable across re-extractions)
- Previously failed places skipped by default; `--retry` flag to attempt them again
- Per-place failure screenshots saved to `tmp/screenshots/`
- `--limit=N` and `--dry-run` flags for safe testing
- ~91% success rate on Taiwan (64 places); remaining failures are places renamed or deleted since saving

### Future
- CLI interface instead of editing `config.ts`
- Rate limiting detection and automatic backoff

## Known Constraints

- **Picker closes after each selection:** Google Maps closes the list picker after one click. Moving requires two separate open/click cycles — one to add to dest, one to remove from source.
- **Canvas rendering:** Map pins are drawn on an HTML5 canvas — can't be targeted by CSS selectors. All automation goes through search URLs and place cards.
- **`getlist` session token:** The `pb=` parameter in the intercepted URL encodes a session token that rotates. `pnpm extract` re-captures it automatically on each run.
- **Chrome must be running with debug port:** Run `pnpm run launch-chrome` before either script. Chrome must be fully quit first if it was previously open.

## Setup

1. `pnpm install`
2. `pnpm run launch-chrome` — opens Chrome with remote debugging on port 9222
3. Sign into Google Maps (one-time — session saved to `.chrome-session/`)
4. Create the destination list manually in Google Maps (e.g. "Tokyo WTG")
5. `pnpm extract` — fetches all places, writes `tmp/{dest-list}-places.json`
6. `pnpm move` — moves matching places to dest list
