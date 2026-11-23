const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const repoRoot = path.resolve(__dirname, '..', '..');
const appFile = path.join(repoRoot, 'index.html');
const evidenceDir = path.join(repoRoot, 'docs', 'testing', 'evidence');

function ensureDir(p) {
  fs.mkdirSync(p, { recursive: true });
}

function nowStamp() {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}_${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`;
}

function sanitize(name) {
  return name.replace(/[^a-z0-9\-_.]/gi, '_');
}

async function screenshot(page, testId, label) {
  ensureDir(evidenceDir);
  const fileName = `${sanitize(testId)}__${sanitize(label)}__${nowStamp()}.png`;
  const full = path.join(evidenceDir, fileName);
  await page.screenshot({ path: full, fullPage: true });
  return full;
}

async function getSummaryText(page) {
  return (await page.locator('#task-summary').innerText()).trim();
}

async function getCountsFromSummary(summaryText) {
  const m = summaryText.match(/Total:\s*(\d+)\s*\|\s*Active:\s*(\d+)\s*\|\s*Completed:\s*(\d+)/i);
  if (!m) return null;
  return { total: Number(m[1]), active: Number(m[2]), completed: Number(m[3]) };
}

async function setLocalStorageTasks(page, tasks) {
  const payload = JSON.stringify(tasks);
  await page.evaluate((v) => {
    localStorage.setItem('taskflow.tasks', v);
  }, payload);
}

async function getLocalStorageTasks(page) {
  const raw = await page.evaluate(() => localStorage.getItem('taskflow.tasks'));
  if (!raw) return null;
  try { return JSON.parse(raw); } catch { return '__PARSE_ERROR__'; }
}

async function clearLocalStorage(page) {
  await page.evaluate(() => localStorage.removeItem('taskflow.tasks'));
}

async function gotoApp(page) {
  await page.goto(`file:///${appFile.replace(/\\/g, '/')}`);
  await page.waitForLoadState('domcontentloaded');
}

async function addTaskUI(page, text) {
  const input = page.locator('#task-input');
  await input.fill(text);
  await input.press('Enter');
}

// Selector mapping layer: keep app code untouched; align harness to actual DOM.
const SELECTORS = {
  filterButton: '.filters__button',
  taskRow: '.task',
  taskText: '.task__text',
  editButton: '.task__button--edit',
  deleteButton: '.task__button--delete',
  editInput: '.task__edit-input',
};

async function setFilter(page, filter) {
  await page.locator(`${SELECTORS.filterButton}[data-filter="${filter}"]`).click();
}

async function setSearch(page, query) {
  await page.locator('#search-input').fill(query);
}

async function getVisibleTaskTexts(page) {
  const items = page.locator(`${SELECTORS.taskRow} ${SELECTORS.taskText}`);
  const count = await items.count();
  const out = [];
  for (let i = 0; i < count; i++) out.push((await items.nth(i).innerText()).trim());
  return out;
}

async function clickClearCompleted(page) {
  await page.locator('#clear-completed').click();
}

async function toggleTaskByText(page, text) {
  const row = page.locator(SELECTORS.taskRow, { has: page.locator(SELECTORS.taskText, { hasText: text }) }).first();
  await row.locator('input[type="checkbox"]').click();
}

async function editTaskByText(page, oldText, newText) {
  const row = page.locator(SELECTORS.taskRow, { has: page.locator(SELECTORS.taskText, { hasText: oldText }) }).first();
  await row.locator(SELECTORS.editButton).click();
  const editInput = row.locator(SELECTORS.editInput);
  await editInput.waitFor({ state: 'visible', timeout: 5000 });
  await editInput.fill(newText);
  await editInput.press('Enter');
}

async function deleteTaskByText(page, text) {
  const row = page.locator(SELECTORS.taskRow, { has: page.locator(SELECTORS.taskText, { hasText: text }) }).first();
  await row.locator(SELECTORS.deleteButton).click();
}

async function emptyStateText(page) {
  const el = page.locator('#empty-state');
  const hidden = await el.getAttribute('hidden');
  if (hidden !== null) return null;
  return (await el.innerText()).trim();
}

function recordResult(results, r) {
  results.push(r);
}

async function run() {
  ensureDir(evidenceDir);
  const results = [];
  const defects = [];

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  const baseTasks = [
    { id: 't1', text: 'Buy milk', completed: false, createdAt: Date.now() - 10000 },
    { id: 't2', text: 'Call Alice', completed: true, createdAt: Date.now() - 9000 },
    { id: 't3', text: 'Write report', completed: false, createdAt: Date.now() - 8000 },
    { id: 't4', text: 'Email Bob', completed: true, createdAt: Date.now() - 7000 },
    { id: 't5', text: 'Plan weekend', completed: false, createdAt: Date.now() - 6000 },
  ];

  async function withFreshState(fn) {
    await gotoApp(page);
    await clearLocalStorage(page);
    await gotoApp(page);
    await fn();
  }

  // Helper: runs a test and records FAIL (not blocked) on thrown errors.
  async function runTest({ id, scenario, expected, fn }) {
    try {
      await fn();
    } catch (e) {
      const shot = await screenshot(page, id, 'exception');
      recordResult(results, { id, scenario, expected, actual: `Exception: ${e && e.stack ? e.stack : String(e)}`, status: 'FAIL', evidence: shot });
      defects.push({ id: `DEF-${id}`, severity: 'High', title: `Test exception in ${id}`, repro: scenario, evidence: shot });
    }
  }

  // --- ENH1 (13) ---
  await runTest({
    id: 'TF-ENH1-001',
    scenario: 'Summary shows 0/0/0 and Clear completed disabled when no tasks',
    expected: 'Total=0 Active=0 Completed=0; Clear completed disabled',
    fn: async () => withFreshState(async () => {
      const summary = await getSummaryText(page);
      const counts = await getCountsFromSummary(summary);
      const disabled = await page.locator('#clear-completed').isDisabled();
      const shot = await screenshot(page, 'TF-ENH1-001', 'empty');
      const pass = counts && counts.total === 0 && counts.active === 0 && counts.completed === 0 && disabled;
      recordResult(results, { id: 'TF-ENH1-001', scenario: 'Summary shows 0/0/0 and Clear completed disabled when no tasks', expected: 'Total=0 Active=0 Completed=0; button disabled', actual: `${summary}; disabled=${disabled}`, status: pass ? 'PASS' : 'FAIL', evidence: shot });
      if (!pass) defects.push({ id: 'DEF-001', severity: 'High', title: 'Initial summary/clear state incorrect', repro: 'Load app with empty storage', evidence: shot });
    })
  });

  await runTest({
    id: 'TF-ENH1-002',
    scenario: 'Counts reflect dataset after adding tasks',
    expected: 'Total=2 Active=2 Completed=0',
    fn: async () => withFreshState(async () => {
      await addTaskUI(page, 'Task A');
      await addTaskUI(page, 'Task B');
      const summary = await getSummaryText(page);
      const counts = await getCountsFromSummary(summary);
      const shot = await screenshot(page, 'TF-ENH1-002', 'after_add');
      const pass = counts && counts.total === 2 && counts.active === 2 && counts.completed === 0;
      recordResult(results, { id: 'TF-ENH1-002', scenario: 'Counts reflect dataset after adding tasks', expected: 'Total=2 Active=2 Completed=0', actual: summary, status: pass ? 'PASS' : 'FAIL', evidence: shot });
    })
  });

  await runTest({
    id: 'TF-ENH1-003',
    scenario: 'Toggling completion updates counts (dataset-based)',
    expected: 'Total=2 Active=1 Completed=1',
    fn: async () => withFreshState(async () => {
      await addTaskUI(page, 'Task A');
      await addTaskUI(page, 'Task B');
      await toggleTaskByText(page, 'Task A');
      const summary = await getSummaryText(page);
      const counts = await getCountsFromSummary(summary);
      const shot = await screenshot(page, 'TF-ENH1-003', 'after_toggle');
      const pass = counts && counts.total === 2 && counts.active === 1 && counts.completed === 1;
      recordResult(results, { id: 'TF-ENH1-003', scenario: 'Toggling completion updates counts (dataset-based)', expected: 'Total=2 Active=1 Completed=1', actual: summary, status: pass ? 'PASS' : 'FAIL', evidence: shot });
    })
  });

  await runTest({
    id: 'TF-ENH1-004',
    scenario: 'Clear completed button enabled when there is at least one completed task',
    expected: 'Clear completed enabled',
    fn: async () => withFreshState(async () => {
      await addTaskUI(page, 'Task A');
      await toggleTaskByText(page, 'Task A');
      const disabled = await page.locator('#clear-completed').isDisabled();
      const shot = await screenshot(page, 'TF-ENH1-004', 'enabled');
      const pass = disabled === false;
      recordResult(results, { id: 'TF-ENH1-004', scenario: 'Clear completed button enabled when there is at least one completed task', expected: 'button enabled', actual: `disabled=${disabled}`, status: pass ? 'PASS' : 'FAIL', evidence: shot });
    })
  });

  await runTest({
    id: 'TF-ENH1-005',
    scenario: 'Clear completed removes all completed tasks globally',
    expected: 'No completed tasks remain in storage',
    fn: async () => withFreshState(async () => {
      await setLocalStorageTasks(page, baseTasks);
      await gotoApp(page);
      await clickClearCompleted(page);
      const stored = await getLocalStorageTasks(page);
      const remainingCompleted = Array.isArray(stored) ? stored.filter(t => t.completed).length : null;
      const shot = await screenshot(page, 'TF-ENH1-005', 'after_clear');
      const pass = Array.isArray(stored) && remainingCompleted === 0;
      recordResult(results, { id: 'TF-ENH1-005', scenario: 'Clear completed removes all completed tasks globally', expected: 'No completed tasks remain in storage', actual: `remainingCompleted=${remainingCompleted}`, status: pass ? 'PASS' : 'FAIL', evidence: shot });
      if (!pass) defects.push({ id: 'DEF-002', severity: 'High', title: 'Clear completed does not remove all completed tasks', repro: 'Seed tasks with completed and click Clear completed', evidence: shot });
    })
  });

  await runTest({
    id: 'TF-ENH1-006',
    scenario: 'Clear completed works regardless of current filter (Active)',
    expected: 'No completed tasks remain',
    fn: async () => withFreshState(async () => {
      await setLocalStorageTasks(page, baseTasks);
      await gotoApp(page);
      await setFilter(page, 'active');
      await clickClearCompleted(page);
      const stored = await getLocalStorageTasks(page);
      const remainingCompleted = Array.isArray(stored) ? stored.filter(t => t.completed).length : null;
      const shot = await screenshot(page, 'TF-ENH1-006', 'active_filter_after_clear');
      const pass = Array.isArray(stored) && remainingCompleted === 0;
      recordResult(results, { id: 'TF-ENH1-006', scenario: 'Clear completed works regardless of current filter (Active)', expected: 'No completed tasks remain', actual: `remainingCompleted=${remainingCompleted}`, status: pass ? 'PASS' : 'FAIL', evidence: shot });
    })
  });

  await runTest({
    id: 'TF-ENH1-007',
    scenario: 'Clear completed works regardless of search query',
    expected: 'No completed tasks remain',
    fn: async () => withFreshState(async () => {
      await setLocalStorageTasks(page, baseTasks);
      await gotoApp(page);
      await setSearch(page, 'buy');
      await clickClearCompleted(page);
      const stored = await getLocalStorageTasks(page);
      const remainingCompleted = Array.isArray(stored) ? stored.filter(t => t.completed).length : null;
      const shot = await screenshot(page, 'TF-ENH1-007', 'search_after_clear');
      const pass = Array.isArray(stored) && remainingCompleted === 0;
      recordResult(results, { id: 'TF-ENH1-007', scenario: 'Clear completed works regardless of search query', expected: 'No completed tasks remain', actual: `remainingCompleted=${remainingCompleted}`, status: pass ? 'PASS' : 'FAIL', evidence: shot });
    })
  });

  await runTest({
    id: 'TF-ENH1-008',
    scenario: 'Counts do not change when applying filter/search (dataset-based counts)',
    expected: 'Summary unchanged by filter/search',
    fn: async () => withFreshState(async () => {
      await setLocalStorageTasks(page, baseTasks);
      await gotoApp(page);
      const summary1 = await getSummaryText(page);
      await setFilter(page, 'completed');
      await setSearch(page, 'call');
      const summary2 = await getSummaryText(page);
      const shot = await screenshot(page, 'TF-ENH1-008', 'filter_search_counts');
      const pass = summary1 === summary2;
      recordResult(results, { id: 'TF-ENH1-008', scenario: 'Counts do not change when applying filter/search (dataset-based counts)', expected: 'Summary unchanged by filter/search', actual: `before="${summary1}" after="${summary2}"`, status: pass ? 'PASS' : 'FAIL', evidence: shot });
    })
  });

  await runTest({
    id: 'TF-ENH1-009',
    scenario: 'After clearing completed, button becomes disabled',
    expected: 'button disabled',
    fn: async () => withFreshState(async () => {
      await setLocalStorageTasks(page, baseTasks);
      await gotoApp(page);
      await clickClearCompleted(page);
      const disabled = await page.locator('#clear-completed').isDisabled();
      const shot = await screenshot(page, 'TF-ENH1-009', 'disabled_after_clear');
      const pass = disabled === true;
      recordResult(results, { id: 'TF-ENH1-009', scenario: 'After clearing completed, button becomes disabled', expected: 'button disabled', actual: `disabled=${disabled}`, status: pass ? 'PASS' : 'FAIL', evidence: shot });
    })
  });

  await runTest({
    id: 'TF-ENH1-010',
    scenario: 'Deleting a completed task updates counts',
    expected: 'Total=0 Active=0 Completed=0',
    fn: async () => withFreshState(async () => {
      await addTaskUI(page, 'Task A');
      await toggleTaskByText(page, 'Task A');
      await deleteTaskByText(page, 'Task A');
      const summary = await getSummaryText(page);
      const counts = await getCountsFromSummary(summary);
      const shot = await screenshot(page, 'TF-ENH1-010', 'after_delete');
      const pass = counts && counts.total === 0 && counts.completed === 0 && counts.active === 0;
      recordResult(results, { id: 'TF-ENH1-010', scenario: 'Deleting a completed task updates counts', expected: 'Total=0 Active=0 Completed=0', actual: summary, status: pass ? 'PASS' : 'FAIL', evidence: shot });
    })
  });

  await runTest({
    id: 'TF-ENH1-011',
    scenario: 'Editing a task does not alter counts',
    expected: 'Summary unchanged',
    fn: async () => withFreshState(async () => {
      await setLocalStorageTasks(page, baseTasks);
      await gotoApp(page);
      const before = await getSummaryText(page);
      await editTaskByText(page, 'Buy milk', 'Buy oat milk');
      const after = await getSummaryText(page);
      const shot = await screenshot(page, 'TF-ENH1-011', 'after_edit');
      const pass = before === after;
      recordResult(results, { id: 'TF-ENH1-011', scenario: 'Editing a task does not alter counts', expected: 'Summary unchanged', actual: `before="${before}" after="${after}"`, status: pass ? 'PASS' : 'FAIL', evidence: shot });
    })
  });

  await runTest({
    id: 'TF-ENH1-012',
    scenario: 'Summary is visible and has text (not empty)',
    expected: 'Non-empty summary',
    fn: async () => withFreshState(async () => {
      const txt = await getSummaryText(page);
      const shot = await screenshot(page, 'TF-ENH1-012', 'summary_visible');
      const pass = txt.length > 0;
      recordResult(results, { id: 'TF-ENH1-012', scenario: 'Summary is visible and has text (not empty)', expected: 'Non-empty summary', actual: txt, status: pass ? 'PASS' : 'FAIL', evidence: shot });
    })
  });

  await runTest({
    id: 'TF-ENH1-013',
    scenario: 'Clear completed button remains visible even when disabled',
    expected: 'Visible=true, disabled=true when no completed',
    fn: async () => withFreshState(async () => {
      const btn = page.locator('#clear-completed');
      const visible = await btn.isVisible();
      const disabled = await btn.isDisabled();
      const shot = await screenshot(page, 'TF-ENH1-013', 'visible_disabled');
      const pass = visible && disabled;
      recordResult(results, { id: 'TF-ENH1-013', scenario: 'Clear completed button remains visible even when disabled', expected: 'Visible=true, disabled=true when no completed', actual: `visible=${visible} disabled=${disabled}`, status: pass ? 'PASS' : 'FAIL', evidence: shot });
    })
  });

  // --- ENH2 (10) ---
  await runTest({
    id: 'TF-ENH2-001',
    scenario: 'Search is case-insensitive substring',
    expected: 'Only “Buy milk” visible for query buy',
    fn: async () => withFreshState(async () => {
      await setLocalStorageTasks(page, baseTasks);
      await gotoApp(page);
      await setSearch(page, 'buy');
      const vis = await getVisibleTaskTexts(page);
      const shot = await screenshot(page, 'TF-ENH2-001', 'search_buy');
      const pass = vis.length === 1 && /buy milk/i.test(vis[0]);
      recordResult(results, { id: 'TF-ENH2-001', scenario: 'Search is case-insensitive substring', expected: 'Only “Buy milk” visible', actual: JSON.stringify(vis), status: pass ? 'PASS' : 'FAIL', evidence: shot });
    })
  });

  await runTest({
    id: 'TF-ENH2-002',
    scenario: 'Search matches substring in middle',
    expected: 'Only “Write report” visible for query port',
    fn: async () => withFreshState(async () => {
      await setLocalStorageTasks(page, baseTasks);
      await gotoApp(page);
      await setSearch(page, 'port');
      const vis = await getVisibleTaskTexts(page);
      const shot = await screenshot(page, 'TF-ENH2-002', 'search_port');
      const pass = vis.length === 1 && /write report/i.test(vis[0]);
      recordResult(results, { id: 'TF-ENH2-002', scenario: 'Search matches substring in middle', expected: 'Only “Write report” visible', actual: JSON.stringify(vis), status: pass ? 'PASS' : 'FAIL', evidence: shot });
    })
  });

  await runTest({
    id: 'TF-ENH2-003',
    scenario: 'Search trims whitespace',
    expected: 'Query "  buy  " behaves like "buy"',
    fn: async () => withFreshState(async () => {
      await setLocalStorageTasks(page, baseTasks);
      await gotoApp(page);
      await setSearch(page, '  buy  ');
      const vis = await getVisibleTaskTexts(page);
      const shot = await screenshot(page, 'TF-ENH2-003', 'search_trim');
      const pass = vis.length === 1 && /buy milk/i.test(vis[0]);
      recordResult(results, { id: 'TF-ENH2-003', scenario: 'Search trims whitespace', expected: 'Whitespace-trimmed search works', actual: JSON.stringify(vis), status: pass ? 'PASS' : 'FAIL', evidence: shot });
    })
  });

  await runTest({
    id: 'TF-ENH2-004',
    scenario: 'No matches shows “No matching tasks.” when dataset non-empty',
    expected: 'Empty state “No matching tasks.”',
    fn: async () => withFreshState(async () => {
      await setLocalStorageTasks(page, baseTasks);
      await gotoApp(page);
      await setSearch(page, 'zzzz');
      const txt = await emptyStateText(page);
      const shot = await screenshot(page, 'TF-ENH2-004', 'no_matches');
      const pass = txt === 'No matching tasks.';
      recordResult(results, { id: 'TF-ENH2-004', scenario: 'No matches shows “No matching tasks.” when dataset non-empty', expected: 'Empty state “No matching tasks.”', actual: txt, status: pass ? 'PASS' : 'FAIL', evidence: shot });
    })
  });

  await runTest({
    id: 'TF-ENH2-005',
    scenario: 'Search intersects with filter: Completed + query returns only completed matches',
    expected: 'Only completed “Call Alice” visible',
    fn: async () => withFreshState(async () => {
      await setLocalStorageTasks(page, baseTasks);
      await gotoApp(page);
      await setFilter(page, 'completed');
      await setSearch(page, 'call');
      const vis = await getVisibleTaskTexts(page);
      const shot = await screenshot(page, 'TF-ENH2-005', 'completed_call');
      const pass = vis.length === 1 && /call alice/i.test(vis[0]);
      recordResult(results, { id: 'TF-ENH2-005', scenario: 'Search intersects with filter: Completed + query returns only completed matches', expected: 'Only completed “Call Alice”', actual: JSON.stringify(vis), status: pass ? 'PASS' : 'FAIL', evidence: shot });
    })
  });

  await runTest({
    id: 'TF-ENH2-006',
    scenario: 'Search intersects with filter: Active + query excludes completed matches',
    expected: 'No visible tasks; empty state No matching tasks.',
    fn: async () => withFreshState(async () => {
      await setLocalStorageTasks(page, baseTasks);
      await gotoApp(page);
      await setFilter(page, 'active');
      await setSearch(page, 'call');
      const vis = await getVisibleTaskTexts(page);
      const txt = await emptyStateText(page);
      const shot = await screenshot(page, 'TF-ENH2-006', 'active_call');
      const pass = vis.length === 0 && txt === 'No matching tasks.';
      recordResult(results, { id: 'TF-ENH2-006', scenario: 'Search intersects with filter: Active + query excludes completed matches', expected: 'No visible tasks; empty state No matching tasks.', actual: `vis=${JSON.stringify(vis)} emptyState=${txt}`, status: pass ? 'PASS' : 'FAIL', evidence: shot });
    })
  });

  await runTest({
    id: 'TF-ENH2-007',
    scenario: 'Clearing search restores view under current filter',
    expected: 'After clearing search, all tasks show under All',
    fn: async () => withFreshState(async () => {
      await setLocalStorageTasks(page, baseTasks);
      await gotoApp(page);
      await setFilter(page, 'all');
      await setSearch(page, 'buy');
      const vis1 = await getVisibleTaskTexts(page);
      await setSearch(page, '');
      const vis2 = await getVisibleTaskTexts(page);
      const shot = await screenshot(page, 'TF-ENH2-007', 'clear_search');
      const pass = vis1.length === 1 && vis2.length === baseTasks.length;
      recordResult(results, { id: 'TF-ENH2-007', scenario: 'Clearing search restores view under current filter', expected: 'After clearing search, all tasks show', actual: `before=${vis1.length} after=${vis2.length}`, status: pass ? 'PASS' : 'FAIL', evidence: shot });
    })
  });

  await runTest({
    id: 'TF-ENH2-008',
    scenario: 'Editing a task while search active refreshes results',
    expected: 'Edited item still matches and remains visible',
    fn: async () => withFreshState(async () => {
      await setLocalStorageTasks(page, baseTasks);
      await gotoApp(page);
      await setSearch(page, 'buy');
      const vis1 = await getVisibleTaskTexts(page);
      await editTaskByText(page, 'Buy milk', 'Buy almond milk');
      const vis2 = await getVisibleTaskTexts(page);
      const shot = await screenshot(page, 'TF-ENH2-008', 'edit_under_search');
      const pass = vis1.length === 1 && vis2.length === 1 && /buy almond milk/i.test(vis2[0]);
      recordResult(results, { id: 'TF-ENH2-008', scenario: 'Editing a task while search active refreshes results', expected: 'Edited item still matches and is visible', actual: `before=${JSON.stringify(vis1)} after=${JSON.stringify(vis2)}`, status: pass ? 'PASS' : 'FAIL', evidence: shot });
    })
  });

  await runTest({
    id: 'TF-ENH2-009',
    scenario: 'Search query not persisted after reload',
    expected: 'Search input empty after reload',
    fn: async () => withFreshState(async () => {
      await setLocalStorageTasks(page, baseTasks);
      await gotoApp(page);
      await setSearch(page, 'buy');
      await page.reload();
      await page.waitForLoadState('domcontentloaded');
      const val = await page.locator('#search-input').inputValue();
      const shot = await screenshot(page, 'TF-ENH2-009', 'after_reload');
      const pass = val === '';
      recordResult(results, { id: 'TF-ENH2-009', scenario: 'Search query not persisted after reload', expected: 'Search input empty after reload', actual: `value="${val}"`, status: pass ? 'PASS' : 'FAIL', evidence: shot });
    })
  });

  await runTest({
    id: 'TF-ENH2-010',
    scenario: 'Summary counts unaffected by search',
    expected: 'Summary unchanged',
    fn: async () => withFreshState(async () => {
      await setLocalStorageTasks(page, baseTasks);
      await gotoApp(page);
      const before = await getSummaryText(page);
      await setSearch(page, 'buy');
      const after = await getSummaryText(page);
      const shot = await screenshot(page, 'TF-ENH2-010', 'summary_unchanged');
      const pass = before === after;
      recordResult(results, { id: 'TF-ENH2-010', scenario: 'Summary counts unaffected by search', expected: 'Summary unchanged', actual: `before="${before}" after="${after}"`, status: pass ? 'PASS' : 'FAIL', evidence: shot });
    })
  });

  // --- REG (8) ---
  await runTest({
    id: 'TF-REG-001',
    scenario: 'Add task via Enter creates a task item',
    expected: 'Task appears in list',
    fn: async () => withFreshState(async () => {
      await addTaskUI(page, 'New task');
      const vis = await getVisibleTaskTexts(page);
      const shot = await screenshot(page, 'TF-REG-001', 'add');
      const pass = vis.includes('New task');
      recordResult(results, { id: 'TF-REG-001', scenario: 'Add task via Enter creates a task item', expected: 'Task appears in list', actual: JSON.stringify(vis), status: pass ? 'PASS' : 'FAIL', evidence: shot });
    })
  });

  await runTest({
    id: 'TF-REG-002',
    scenario: 'Toggle completion via checkbox updates UI and storage',
    expected: 'Storage completed=true',
    fn: async () => withFreshState(async () => {
      await addTaskUI(page, 'New task');
      await toggleTaskByText(page, 'New task');
      const stored = await getLocalStorageTasks(page);
      const completed = Array.isArray(stored) ? stored.find(t => t.text === 'New task')?.completed : null;
      const shot = await screenshot(page, 'TF-REG-002', 'toggle');
      const pass = completed === true;
      recordResult(results, { id: 'TF-REG-002', scenario: 'Toggle completion via checkbox updates UI and storage', expected: 'Storage completed=true', actual: `completed=${completed}`, status: pass ? 'PASS' : 'FAIL', evidence: shot });
    })
  });

  await runTest({
    id: 'TF-REG-003',
    scenario: 'Edit task updates text',
    expected: 'Text updated',
    fn: async () => withFreshState(async () => {
      await addTaskUI(page, 'Old');
      await editTaskByText(page, 'Old', 'New');
      const vis = await getVisibleTaskTexts(page);
      const shot = await screenshot(page, 'TF-REG-003', 'edit');
      const pass = vis.includes('New') && !vis.includes('Old');
      recordResult(results, { id: 'TF-REG-003', scenario: 'Edit task updates text', expected: 'Text updated', actual: JSON.stringify(vis), status: pass ? 'PASS' : 'FAIL', evidence: shot });
    })
  });

  await runTest({
    id: 'TF-REG-004',
    scenario: 'Delete task removes it from list',
    expected: 'Task removed',
    fn: async () => withFreshState(async () => {
      await addTaskUI(page, 'To delete');
      await deleteTaskByText(page, 'To delete');
      const vis = await getVisibleTaskTexts(page);
      const shot = await screenshot(page, 'TF-REG-004', 'delete');
      const pass = !vis.includes('To delete');
      recordResult(results, { id: 'TF-REG-004', scenario: 'Delete task removes it from list', expected: 'Task removed', actual: JSON.stringify(vis), status: pass ? 'PASS' : 'FAIL', evidence: shot });
    })
  });

  await runTest({
    id: 'TF-REG-005',
    scenario: 'Filter Active shows only active tasks',
    expected: 'Only active tasks visible',
    fn: async () => withFreshState(async () => {
      await setLocalStorageTasks(page, baseTasks);
      await gotoApp(page);
      await setFilter(page, 'active');
      const vis = await getVisibleTaskTexts(page);
      const shot = await screenshot(page, 'TF-REG-005', 'filter_active');
      const pass = vis.length === baseTasks.filter(t => !t.completed).length && vis.every(t => !/call alice|email bob/i.test(t));
      recordResult(results, { id: 'TF-REG-005', scenario: 'Filter Active shows only active tasks', expected: 'Only active tasks visible', actual: JSON.stringify(vis), status: pass ? 'PASS' : 'FAIL', evidence: shot });
    })
  });

  await runTest({
    id: 'TF-REG-006',
    scenario: 'Filter Completed shows only completed tasks',
    expected: 'Only completed tasks visible',
    fn: async () => withFreshState(async () => {
      await setLocalStorageTasks(page, baseTasks);
      await gotoApp(page);
      await setFilter(page, 'completed');
      const vis = await getVisibleTaskTexts(page);
      const shot = await screenshot(page, 'TF-REG-006', 'filter_completed');
      const pass = vis.length === baseTasks.filter(t => t.completed).length && vis.every(t => /call alice|email bob/i.test(t));
      recordResult(results, { id: 'TF-REG-006', scenario: 'Filter Completed shows only completed tasks visible', expected: 'Only completed tasks visible', actual: JSON.stringify(vis), status: pass ? 'PASS' : 'FAIL', evidence: shot });
    })
  });

  await runTest({
    id: 'TF-REG-007',
    scenario: 'Empty dataset shows “No tasks yet. Add one above.”',
    expected: 'No tasks yet. Add one above.',
    fn: async () => withFreshState(async () => {
      const txt = await emptyStateText(page);
      const shot = await screenshot(page, 'TF-REG-007', 'empty_dataset');
      const pass = txt === 'No tasks yet. Add one above.';
      recordResult(results, { id: 'TF-REG-007', scenario: 'Empty dataset shows “No tasks yet. Add one above.”', expected: 'No tasks yet. Add one above.', actual: txt, status: pass ? 'PASS' : 'FAIL', evidence: shot });
    })
  });

  await runTest({
    id: 'TF-REG-008',
    scenario: 'Adding then deleting last task returns to empty dataset message',
    expected: 'No tasks yet. Add one above.',
    fn: async () => withFreshState(async () => {
      await addTaskUI(page, 'Temp');
      await deleteTaskByText(page, 'Temp');
      const txt = await emptyStateText(page);
      const shot = await screenshot(page, 'TF-REG-008', 'back_to_empty');
      const pass = txt === 'No tasks yet. Add one above.';
      recordResult(results, { id: 'TF-REG-008', scenario: 'Adding then deleting last task returns to empty dataset message', expected: 'No tasks yet. Add one above.', actual: txt, status: pass ? 'PASS' : 'FAIL', evidence: shot });
    })
  });

  // --- LS (6) ---
  await runTest({
    id: 'TF-LS-001',
    scenario: 'Tasks persist across reload',
    expected: 'Task still visible after reload',
    fn: async () => withFreshState(async () => {
      await addTaskUI(page, 'Persist me');
      await page.reload();
      await page.waitForLoadState('domcontentloaded');
      const vis = await getVisibleTaskTexts(page);
      const shot = await screenshot(page, 'TF-LS-001', 'after_reload');
      const pass = vis.includes('Persist me');
      recordResult(results, { id: 'TF-LS-001', scenario: 'Tasks persist across reload', expected: 'Task still visible after reload', actual: JSON.stringify(vis), status: pass ? 'PASS' : 'FAIL', evidence: shot });
    })
  });

  await runTest({
    id: 'TF-LS-002',
    scenario: 'Storage key is taskflow.tasks',
    expected: 'taskflow.tasks contains data',
    fn: async () => withFreshState(async () => {
      await addTaskUI(page, 'Key check');
      const raw = await page.evaluate(() => localStorage.getItem('taskflow.tasks'));
      const shot = await screenshot(page, 'TF-LS-002', 'key');
      const pass = typeof raw === 'string' && raw.includes('Key check');
      recordResult(results, { id: 'TF-LS-002', scenario: 'Storage key is taskflow.tasks', expected: 'taskflow.tasks contains data', actual: raw ? raw.slice(0, 80) + (raw.length > 80 ? '...' : '') : String(raw), status: pass ? 'PASS' : 'FAIL', evidence: shot });
    })
  });

  await runTest({
    id: 'TF-LS-003',
    scenario: 'Back-compat: tasks without createdAt still render',
    expected: 'Legacy task visible',
    fn: async () => withFreshState(async () => {
      const tasks = [{ id: 'x1', text: 'Legacy task', completed: false }];
      await setLocalStorageTasks(page, tasks);
      await gotoApp(page);
      const vis = await getVisibleTaskTexts(page);
      const shot = await screenshot(page, 'TF-LS-003', 'legacy');
      const pass = vis.includes('Legacy task');
      recordResult(results, { id: 'TF-LS-003', scenario: 'Back-compat: tasks without createdAt still render', expected: 'Legacy task visible', actual: JSON.stringify(vis), status: pass ? 'PASS' : 'FAIL', evidence: shot });
    })
  });

  await runTest({
    id: 'TF-LS-004',
    scenario: 'Extra unknown fields in task objects are tolerated',
    expected: 'Task visible',
    fn: async () => withFreshState(async () => {
      const tasks = [{ id: 'x2', text: 'Extra fields', completed: false, createdAt: Date.now(), foo: 'bar' }];
      await setLocalStorageTasks(page, tasks);
      await gotoApp(page);
      const vis = await getVisibleTaskTexts(page);
      const shot = await screenshot(page, 'TF-LS-004', 'extra_fields');
      const pass = vis.includes('Extra fields');
      recordResult(results, { id: 'TF-LS-004', scenario: 'Extra unknown fields in task objects are tolerated', expected: 'Task visible', actual: JSON.stringify(vis), status: pass ? 'PASS' : 'FAIL', evidence: shot });
    })
  });

  await runTest({
    id: 'TF-LS-005',
    scenario: 'Corrupted JSON in storage does not crash and resets to empty',
    expected: 'App loads; shows empty dataset message',
    fn: async () => withFreshState(async () => {
      await page.evaluate(() => localStorage.setItem('taskflow.tasks', '{not valid json'));
      await gotoApp(page);
      const txt = await emptyStateText(page);
      const shot = await screenshot(page, 'TF-LS-005', 'corrupt');
      const pass = txt === 'No tasks yet. Add one above.';
      recordResult(results, { id: 'TF-LS-005', scenario: 'Corrupted JSON in storage does not crash and resets to empty', expected: 'App loads; shows empty dataset message', actual: txt, status: pass ? 'PASS' : 'FAIL', evidence: shot });
      if (!pass) defects.push({ id: 'DEF-003', severity: 'Medium', title: 'Corrupted storage not handled as expected', repro: 'Set taskflow.tasks to invalid JSON and reload', evidence: shot });
    })
  });

  await runTest({
    id: 'TF-LS-006',
    scenario: 'Search query is not persisted in localStorage',
    expected: 'No search.* keys present',
    fn: async () => withFreshState(async () => {
      await setLocalStorageTasks(page, baseTasks);
      await gotoApp(page);
      await setSearch(page, 'buy');
      const keys = await page.evaluate(() => Object.keys(localStorage));
      const shot = await screenshot(page, 'TF-LS-006', 'keys');
      const pass = Array.isArray(keys) && keys.every(k => !/search/i.test(k));
      recordResult(results, { id: 'TF-LS-006', scenario: 'Search query is not persisted in localStorage', expected: 'No search.* keys present', actual: JSON.stringify(keys), status: pass ? 'PASS' : 'FAIL', evidence: shot });
    })
  });

  const total = results.length;
  const passed = results.filter(r => r.status === 'PASS').length;
  const failed = results.filter(r => r.status === 'FAIL').length;

  const execReport = [
    '# Test Execution Report (Automated)',
    '',
    `Run Timestamp: ${new Date().toISOString()}`,
    `Environment: Node ${process.version}; Playwright chromium headless`,
    `App: file:///${appFile.replace(/\\/g, '/')}`,
    '',
    `Total: ${total}`,
    `Passed: ${passed}`,
    `Failed: ${failed}`,
    '',
    '## Notes',
    '- This run uses a selector-mapping layer in the harness to match the current app DOM/CSS classes.',
    '- Failures are recorded per-case with evidence screenshots.',
    ''
  ].join('\n');

  const caseResultsMd = [
    '# Test Case Results',
    '',
    '| Test ID | Status | Scenario | Expected | Actual | Evidence |',
    '|---|---|---|---|---|---|',
    ...results.map(r => `| ${r.id} | ${r.status} | ${r.scenario.replace(/\|/g, '\\|')} | ${r.expected.replace(/\|/g, '\\|')} | ${(r.actual || '').toString().replace(/\|/g, '\\|')} | ${r.evidence ? r.evidence.replace(/\\/g, '/') : ''} |`)
  ].join('\n');

  const defectsMd = [
    '# Defect Report (from automation)',
    '',
    'Important: entries here are generated from automation failures/exceptions and must be triaged to distinguish app defects vs harness issues.',
    '',
    '| Defect ID | Severity | Title | Repro | Evidence |',
    '|---|---|---|---|---|',
    ...defects.map(d => `| ${d.id} | ${d.severity} | ${d.title.replace(/\|/g, '\\|')} | ${d.repro.replace(/\|/g, '\\|')} | ${d.evidence ? d.evidence.replace(/\\/g, '/') : ''} |`)
  ].join('\n');

  fs.writeFileSync(path.join(repoRoot, 'docs', 'testing', 'TestExecutionReport.md'), execReport, 'utf8');
  fs.writeFileSync(path.join(repoRoot, 'docs', 'testing', 'TestCaseResults.md'), caseResultsMd, 'utf8');
  fs.writeFileSync(path.join(repoRoot, 'docs', 'testing', 'DefectReport.md'), defectsMd, 'utf8');

  const log = [
    `RUN ${new Date().toISOString()}`,
    `TOTAL ${total}`,
    `PASS ${passed}`,
    `FAIL ${failed}`
  ].join('\n');
  fs.writeFileSync(path.join(repoRoot, 'docs', 'testing', 'test-run-log.txt'), log, 'utf8');

  await browser.close();
  console.log(log);
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
