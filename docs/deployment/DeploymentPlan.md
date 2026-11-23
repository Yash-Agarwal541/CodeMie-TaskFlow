# Deployment Plan — CodeMie‑TaskFlow (Static SPA)

## 1. Purpose
Define how to deploy and verify CodeMie‑TaskFlow locally (static site). This plan does **not** claim execution; see Deployment Execution Report for what was actually performed.

## 2. Deployable Artifact
Static files at repo root:
- `index.html`
- `script.js`
- `style.css`

No build step is required.

## 3. Prerequisites
- Modern browser (Chrome/Edge/Firefox)
- Optional: Node.js (only if using `npx http-server`)

## 4. Deployment Steps (Local)
### Option A — Serve via local static server (recommended)
1. From repository root:
   - `npx http-server . -p 8080`
2. Open: `http://localhost:8080/`

### Option B — Open directly
- Open `index.html` via file explorer (runs as `file://`).

## 5. Verification Checklist (Core)
1. Add task
2. Toggle completion
3. Delete task
4. Filters: All / Active / Completed
5. ENH‑1 summary counts update on add/toggle/delete/clear
6. ENH‑1 clear completed enabled/disabled behavior
7. ENH‑2 search is live, case-insensitive, trims whitespace
8. Search intersects with filter
9. Empty state messages:
   - dataset empty: "No tasks yet. Add one above."
   - no matches: "No matching tasks."

## 6. Risks
- Differences between `file://` and `http://` behavior; prefer local server for verification.
- Automated suite currently has 3 edit-mode related failures (unresolved).

## 7. Rollback
- Since the app is static, rollback is performed by reverting the deployed static files to a previous Git commit and redeploying.
- Storage compatibility: key `taskflow.tasks` preserved; schema compatible.
