# CodeMie-TaskFlow (TaskFlow)

CodeMie‑TaskFlow is a lightweight, **front‑end‑only** task manager (capstone) implemented with vanilla HTML/CSS/JavaScript and persisted using **browser localStorage**.

This repository includes the approved capstone enhancements:
- **ENH‑1:** dataset-based task summary (Total/Active/Completed) + **Clear completed**
- **ENH‑2:** live, case-insensitive **Search** that intersects with the status filter

---

## Features
- Add tasks
- Edit tasks (inline)
- Delete tasks
- Toggle completion
- Filter by status: All / Active / Completed
- **Task Summary**: Total / Active / Completed (**dataset-based**, not affected by filter/search)
- **Clear Completed**: removes all completed tasks globally; disabled when none
- **Search**: live, case-insensitive substring search; intersects with current filter
- Empty states:
  - Dataset empty: **"No tasks yet. Add one above."**
  - No matches: **"No matching tasks."**

## Technology stack
- HTML, CSS, JavaScript (vanilla)
- Node.js (only required for automated testing / optional local static server)
- Playwright (automation via custom runner)

## Prerequisites
- A modern browser (Chrome/Edge/Firefox)
- Optional for tests: **Node.js** + npm

## Installation / Setup
Clone the repository and install dependencies for testing:
```bash
npm install
```

> Note: `node_modules/` must not be committed. See `.gitignore`.

## Build instructions
No build step is required (static SPA).

## Local deployment (run locally)
### Option A — Open directly
Open `index.html` in a browser.

### Option B — Serve locally (recommended)
Use any static web server. Example with Node:
```bash
npx http-server . -p 8080
```
Open: `http://localhost:8080/`

## Automated tests
Run:
```bash
npm test
```

### Test evidence outputs
- `docs/testing/TestExecutionReport.md`
- `docs/testing/TestCaseResults.md`
- `docs/testing/DefectReport.md`
- Screenshots under `docs/testing/evidence/`

### Latest verified test run (do not treat as fully passing)
- Timestamp: **2026-11-23T20:28:29.527Z**
- Total: **37**
- Passed: **34**
- Failed: **3** (edit-mode related; unresolved pending confirmation)

See: `docs/testing/test-run-log.txt` and `docs/testing/TestExecutionReport.md`.

## Project documentation
- Requirements: `docs/requirements/FRD.md`
- Architecture: `docs/architecture/Architecture.md`
- Design: `docs/design/HLD.md`, `docs/design/LLD.md`
- Wireframes: `docs/wireframes/Wireframes.md`
- Planning: `docs/planning/ImplementationPlan.md`
- Testing: `docs/testing/`
- Deployment: `docs/deployment/`
- Code review summary: `docs/review/CodeReviewSummary.md`

## Storage compatibility
- localStorage key: `taskflow.tasks`
- Task schema compatibility: `{ id, text, completed, createdAt? }` (missing `createdAt` tolerated for back-compat)

## Known limitations / open issues
- Automated suite has **3 failing cases**, all related to entering edit mode and detecting the inline edit input in headless automation:
  - TF‑REG‑003
  - TF‑ENH1‑011
  - TF‑ENH2‑008

These are tracked as unresolved in `docs/testing/DefectReport.md`.
