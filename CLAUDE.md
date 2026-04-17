# CLAUDE.md

## Project

Playwright + TypeScript CLI that bulk-organizes Google Maps saved places by city. See PROJECT.md for full architecture and roadmap.

## Commands

```bash
pnpm install          # install deps
pnpm extract          # extract places → tmp/places.json + tmp/seoul-places.json
pnpm move             # move Seoul places to "Seoul WTG" list
pnpm run typecheck    # type-check without running
pnpm run launch-chrome  # open Chrome with CDP debug port (run before pnpm start)
```

## Architecture

- `src/main.ts` — entry point: fetches all places, parses, filters, writes to tmp/
- `src/config.ts` — all hardcoded values (list names, bounding box, getlist URL, total count)
- `src/types.ts` — `SavedPlace` interface

## Key technical decisions

**CDP over launchPersistentContext:** Google blocks sign-in from Playwright-launched browsers (detects `--enable-automation` flag). We instead launch real Chrome manually with `--remote-debugging-port=9222` and connect via `chromium.connectOverCDP()`. The user signs in once; session persists in `.chrome-session/`.

**getlist API over DOM scraping:** Map pins render on an HTML5 canvas — no DOM selectors work. Google's internal `getlist` endpoint returns all 2,974 places with coordinates in ~6 paginated fetches. URL captured from browser network tab; contains a session token that may expire.

**Bounding box over address matching:** Seoul coordinates check (lat 37.40–37.72, lng 126.75–127.25) is faster and more reliable than string-matching Korean/English address variants.

**tsx for execution:** esbuild-based, fast startup (~0.3s). No separate compilation step needed.

## What's NOT built yet (Phase 2)

Moving pins: open each Seoul place from the "Wanna Go" sidebar list, click the bookmark button, uncheck "Wanna Go", check "Seoul WTG". Needs resume support (save progress after each move).

## Config that needs updating per-user

- `config.getlistUrl` — re-capture from network tab if it stops working (session token expires)
- `config.totalPlaces` — update if the list size changes
- `config.destList` — must be created manually in Google Maps before running Phase 2

## tmp/ directory

Gitignored. Used for output files (`places.json`, `seoul-places.json`) and any debug dumps. Created automatically by the script.
