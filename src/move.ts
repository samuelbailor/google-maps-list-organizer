import * as fs from 'fs';
import { chromium, Page } from 'playwright';
import { config } from './config';
import { SavedPlace } from './types';

const PROGRESS_FILE = 'tmp/progress.json';
const FAILED_FILE = 'tmp/failed.json';
const PAUSE_MS = 2000;
const BETWEEN_PLACES_MS = () => 3000 + Math.random() * 2000; // 3–5s between places

// CLI flags: --limit=N to process only N places, --dry-run to navigate without clicking, --retry to retry failed places
const args = process.argv.slice(2);
const limit = parseInt(args.find(a => a.startsWith('--limit='))?.split('=')[1] ?? 'Infinity');
const dryRun = args.includes('--dry-run');
const retryFailed = args.includes('--retry');

function placeKey(p: SavedPlace): string {
  return `${p.name}|||${p.address}`;
}

function loadProgress(): Set<string> {
  if (!fs.existsSync(PROGRESS_FILE)) return new Set();
  const data = JSON.parse(fs.readFileSync(PROGRESS_FILE, 'utf-8')) as string[];
  return new Set(data);
}

function saveProgress(done: Set<string>) {
  fs.writeFileSync(PROGRESS_FILE, JSON.stringify([...done], null, 2));
}

function loadFailed(): Set<string> {
  if (!fs.existsSync(FAILED_FILE)) return new Set();
  const data = JSON.parse(fs.readFileSync(FAILED_FILE, 'utf-8')) as SavedPlace[];
  return new Set(data.map(placeKey));
}

function saveFailed(failed: SavedPlace[]) {
  fs.writeFileSync(FAILED_FILE, JSON.stringify(failed, null, 2));
}

async function removeFromAllLists(page: Page): Promise<void> {
  const saveBtn = page.locator('button[data-value^="Saved"]');
  await saveBtn.click();
  await page.waitForTimeout(PAUSE_MS);
  const listItems = page.locator('div[role="menuitemradio"]');
  if (!await listItems.first().isVisible().catch(() => false)) return;
  const checkedItems = listItems.filter({ has: page.locator('[aria-checked="true"]') });
  const count = await checkedItems.count();
  for (let i = 0; i < count; i++) {
    await checkedItems.nth(0).click();
    await page.waitForTimeout(500);
  }
  await page.keyboard.press('Escape');
}

async function movePlaceToList(page: Page, place: SavedPlace): Promise<boolean> {
  await page.goto(place.url, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(PAUSE_MS);

  if (dryRun) return true;

  // If the search returned multiple results, find and click the saved one
  const saveBtn = page.locator('button[data-value^="Saved"]');
  if (!await saveBtn.isVisible().catch(() => false)) {
    // Single wrong result (e.g. different city) — unsaved button present, bail fast
    const unsavedBtn = page.locator('button[data-value="Save"]');
    if (await unsavedBtn.isVisible().catch(() => false)) {
      console.log(`  ✗ Place not saved in source list (wrong search result) — skipping`);
      return false;
    }

    const resultsList = page.locator('div[role="article"]');
    const resultsCount = await resultsList.count().catch(() => 0);
    if (resultsCount > 0) {
      // Find the article containing "Saved in Want to go"
      const savedArticle = resultsList.filter({ hasText: `Saved in ${config.sourceList}` }).first();
      if (await savedArticle.isVisible().catch(() => false)) {
        await savedArticle.click();
        await page.waitForTimeout(PAUSE_MS);
      } else {
        // No result is saved in our source list — place may have been deleted/renamed
        console.log(`  ✗ No result found with "Saved in ${config.sourceList}" — skipping`);
        return false;
      }
    }
  }

  // Wait for the save button to appear (place card may slide in after a click)
  const saveBtnFound = await saveBtn.waitFor({ state: 'visible', timeout: 8000 }).then(() => true).catch(() => false);

  if (saveBtnFound && await page.locator('text=Permanently closed').isVisible().catch(() => false)) {
    console.log(`  ✦ Permanently closed — removing from all lists`);
    await removeFromAllLists(page);
    return true;
  }
  if (!saveBtnFound) {
    const screenshotSlug = place.name.replace(/[^a-z0-9]+/gi, '-').toLowerCase().slice(0, 40);
    const screenshotPath = `tmp/screenshots/failure-${screenshotSlug}.png`;
    fs.mkdirSync('tmp/screenshots', { recursive: true });
    await page.screenshot({ path: screenshotPath });
    console.log(`  ✗ Save button not found (screenshot → ${screenshotPath})`);
    return false;
  }

  await saveBtn.click();
  await page.waitForTimeout(PAUSE_MS);

  // List items use role="menuitemradio" with aria-checked
  const listItems = page.locator('div[role="menuitemradio"]');
  if (!await listItems.first().isVisible().catch(() => false)) {
    console.log(`  ✗ List picker did not open`);
    await page.keyboard.press('Escape');
    return false;
  }

  const destItem = listItems.filter({ hasText: config.destList }).first();
  if (!await destItem.isVisible().catch(() => false)) {
    console.log(`  ✗ "${config.destList}" not found in list picker`);
    await page.keyboard.press('Escape');
    return false;
  }

  // Check current state
  const destChecked = await destItem.getAttribute('aria-checked');
  const sourceItem0 = listItems.filter({ hasText: config.sourceList }).first();
  const sourceChecked0 = await sourceItem0.getAttribute('aria-checked').catch(() => 'false');

  // Already fully moved — close picker and count as success (will be added to progress)
  if (destChecked === 'true' && sourceChecked0 !== 'true') {
    await page.keyboard.press('Escape');
    console.log(`  (already in ${config.destList})`);
    return true;
  }

  // Step 1: add to dest list (close picker first if already in both lists)
  if (destChecked !== 'true') {
    await destItem.click();
    // Wait for save to register — check for failure toast
    await page.waitForTimeout(PAUSE_MS * 2);
    const failedToast = page.locator('text=Failed to save');
    if (await failedToast.isVisible().catch(() => false)) {
      console.log(`  ✗ Google reported "Failed to save" — skipping`);
      await page.keyboard.press('Escape');
      return false;
    }
  } else {
    // Already in dest — picker is still open, close it before re-opening
    await page.keyboard.press('Escape');
    await page.waitForTimeout(PAUSE_MS);
  }

  // Step 2: re-open picker — wait for button to update to "Saved (2)" then click
  await page.waitForSelector('button[data-value="Saved (2)"]', { timeout: 5000 }).catch(() => {});
  const saveBtn2 = page.locator('button[data-value^="Saved"]');
  await saveBtn2.click();
  await page.waitForTimeout(PAUSE_MS);

  const listItems2 = page.locator('div[role="menuitemradio"]');
  if (!await listItems2.first().isVisible().catch(() => false)) {
    console.log(`  ✗ Picker did not re-open`);
    return false;
  }

  const sourceItem = listItems2.filter({ hasText: config.sourceList }).first();
  const sourceChecked = await sourceItem.getAttribute('aria-checked').catch(() => 'false');
  if (sourceChecked === 'true') {
    await sourceItem.click();
    await page.waitForTimeout(500);
  }

  await page.keyboard.press('Escape');

  // Write note to the dest list entry if one exists
  // The textarea with aria-label="Add note" appears under the Seoul WTG row;
  // focus is automatic after adding to the list so we just wait and type.
  if (place.note) {
    await page.waitForTimeout(PAUSE_MS);
    const noteInput = page.locator('div[aria-label="Saved in Your Places"] textarea');
    if (await noteInput.isVisible().catch(() => false)) {
      await noteInput.fill(place.note);
      await page.waitForTimeout(500);
    } else {
      console.log(`  ⚠ Note not written (input not found): "${place.note}"`);
    }
  }

  return true;
}

async function main() {
  const seoulPlaces: SavedPlace[] = JSON.parse(
    fs.readFileSync('tmp/seoul-places.json', 'utf-8')
  );

  const done = loadProgress();
  const previouslyFailed = retryFailed ? new Set<string>() : loadFailed();
  const remaining = seoulPlaces
    .filter(p => !done.has(placeKey(p)) && !previouslyFailed.has(placeKey(p)))
    .slice(0, isFinite(limit) ? limit : undefined);

  const skippedFailed = retryFailed ? 0 : previouslyFailed.size;
  console.log(`Seoul places: ${seoulPlaces.length} total, ${done.size} moved, ${skippedFailed > 0 ? `${skippedFailed} skipped (failed), ` : ''}${remaining.length} to process`);
  if (dryRun) console.log('DRY RUN — navigating only, no changes\n');
  else console.log('');

  if (remaining.length === 0) {
    console.log('All done!');
    return;
  }

  const browser = await chromium.connectOverCDP('http://127.0.0.1:9222');
  const context = browser.contexts()[0];
  const page = context.pages()[0] ?? await context.newPage();

  let moved = 0;
  // When retrying, start with the full prior failed list so unretried failures are preserved
  const failedPlaces: SavedPlace[] = retryFailed && fs.existsSync(FAILED_FILE)
    ? JSON.parse(fs.readFileSync(FAILED_FILE, 'utf-8'))
    : [];

  for (const place of remaining) {
    process.stdout.write(`[${moved + failedPlaces.length + 1}/${remaining.length}] "${place.name}" ... `);
    const ok = await movePlaceToList(page, place);
    if (ok) {
      if (!dryRun) {
        done.add(placeKey(place));
        saveProgress(done);
      }
      moved++;
      console.log('✓');
    } else {
      failedPlaces.push(place);
      saveFailed(failedPlaces);
    }
    await page.waitForTimeout(BETWEEN_PLACES_MS());
  }

  console.log(`\nDone. ${dryRun ? 'Navigated' : 'Moved'}: ${moved}, Failed: ${failedPlaces.length}`);
  if (failedPlaces.length > 0) console.log(`Failed places → ${FAILED_FILE}`);
  await browser.close();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
