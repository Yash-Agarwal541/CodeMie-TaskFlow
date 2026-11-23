# Deployment Runbook — CodeMie‑TaskFlow

## 1. Overview
CodeMie‑TaskFlow is a static SPA. Deployment consists of serving static files.

## 2. Quick Start (Local)
### Serve locally
```bash
npx http-server . -p 8080
```
Open `http://localhost:8080/`.

### Run automated tests
```bash
npm install
npm test
```

## 3. Troubleshooting
- If `npx http-server` is not available, install Node.js or use any alternative static server.
- If running tests fails due to missing browsers:
  - `npx playwright install`

## 4. Rollback
- Revert to a previous Git commit:
  - `git revert <bad_commit>` (preferred)
  - redeploy static files

## 5. Known Limitations
- Automated tests are not fully passing: **3 edit-mode cases fail** in headless automation (unresolved).
