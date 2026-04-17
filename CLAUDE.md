# CLAUDE.md

## Project

Playwright + TypeScript CLI that bulk-organizes Google Maps saved places by city. See PROJECT.md for full architecture and roadmap.

## Commands

```bash
pnpm install              # install deps
pnpm extract              # fetch all places → tmp/places.json + tmp/{dest-list}-places.json
pnpm move                 # move matching places to dest list
pnpm move --limit=N       # test with N places
pnpm move --dry-run       # navigate only, no changes
pnpm run typecheck        # type-check without running
pnpm run launch-chrome    # open Chrome with CDP debug port (must quit Chrome first)
```

## Source files

- `src/extract.ts` — navigates to source list, intercepts `getlist` API request, paginates via cursor token, filters by bounding box, writes `tmp/places.json` + `tmp/{dest-list}-places.json`
- `src/move.ts` — reads `tmp/{dest-list}-places.json`, moves each place via Maps UI with resume/progress support
- `src/config.ts` — all user-configurable values (list names, bounding box, page size)
- `src/types.ts` — `SavedPlace` interface

## Key technical decisions

**CDP over launchPersistentContext:** Google blocks sign-in from Playwright-launched browsers (detects `--enable-automation`). We launch real Chrome manually with `--remote-debugging-port=9222` and connect via `chromium.connectOverCDP()`.

**getlist API:** Map pins render on HTML5 canvas — no DOM selectors work. `pnpm extract` navigates to the source list, intercepts the `getlist` request fired by Maps, then paginates using the `!5B` cursor token found at `data[1]` in each response (standard base64 → URL-safe base64).

**Two-cycle picker interaction:** Google Maps closes the list picker after each click. Moving requires two open/click cycles — first to add to dest list (wait for button to change to "Saved (2)"), then re-open to remove from source.

**Bounding box filtering:** Faster and more reliable than address string matching for Korean/English variants.

## Config

```ts
sourceList: 'Want to go'   // must match Maps list name exactly
destList: 'Tokyo WTG'      // must be created manually in Maps first
bounds: BOUNDS.tokyo       // or custom { latMin, latMax, lngMin, lngMax }
pageSize: 500              // items per API page (Maps max)
```

## tmp/ directory

Gitignored. Created automatically.
- `places.json` — all extracted places
- `{dest-list}-places.json` — filtered places within bounds
- `progress.json` — successfully moved places (for resume)
- `failed.json` — places that failed to move (for manual review)
- `screenshots/failure-{name}.png` — screenshot when save button not found
