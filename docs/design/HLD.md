# High-Level Design (HLD) — CodeMie-TaskFlow Enhancements

**Project:** CodeMie-TaskFlow  
**Scope (Approved):** ENH-1 (Task Summary + Clear Completed), ENH-2 (Search Tasks)  
**Jira Epic:** CTF-1  
**Jira Stories:** CTF-2, CTF-3, CTF-4  
**Jira Tasks:** CTF-5 … CTF-15  

## 1. Purpose
This document describes the high-level design for enhancing the existing CodeMie-TaskFlow single-page task app with:
- A dataset-based task summary line (Total / Active / Completed)
- A global “Clear completed” action
- A live, case-insensitive search that works together with existing status filters

The design preserves existing functionality and localStorage compatibility.

## 2. References
- FRD: `docs/requirements/FRD.md`
- Architecture: `docs/architecture/Architecture.md`
- Jira Epic/Stories/Tasks: CTF-1 … CTF-15

## 3. Constraints & Non-Goals
### Constraints
- Do not change persisted task schema in localStorage.
  - Storage key: `taskflow.tasks`
  - Compatible structure: `{ id, text, completed, createdAt? }`
- Preserve existing features: add, edit, delete, toggle complete, and filter (All/Active/Completed).

### Non-goals
- No backend/API.
- No new filtering categories.
- No persistence of search query.

## 4. Current System Overview
- **Type:** Client-only SPA built with vanilla HTML/CSS/JS
- **State:** In-memory `tasks` array loaded from localStorage
- **Render strategy:** Re-render list from state after each mutation (`saveTasks()` + `render()`)

## 5. Proposed Enhancements (High-Level)
### 5.1 UI Additions / Adjustments
1. **Summary line (new)**
   - Displays: `Total: X | Active: Y | Completed: Z`
   - Counts are computed from the full dataset and are not affected by filter/search.

2. **Clear completed button (new)**
   - Placed near the summary line.
   - Always visible.
   - Disabled when there are no completed tasks in the full dataset.
   - Clears all completed tasks regardless of filter/search.

3. **Search input (new)**
   - Placed above the status filters.
   - Live updates as user types.
   - Case-insensitive substring match on task text.
   - Combined with status filter via intersection.

4. **Empty state message (updated)**
   - If dataset is empty: `No tasks yet. Add one above.`
   - If dataset has tasks but current view is empty: `No matching tasks.`

### 5.2 State & Derived Data
**State**
- `tasks` (existing dataset)
- `currentFilter` (existing)
- `searchQuery` (new; in-memory only)

**Derived**
- `counts = { total, active, completed }` derived from full `tasks` dataset
- `visibleTasks` derived by applying status filter and search query intersection

### 5.3 Data Flow
1. Load tasks from localStorage → `tasks`
2. User interaction updates:
   - dataset state (`tasks`) via add/delete/toggle/edit/clearCompleted, or
   - UI state (`currentFilter`, `searchQuery`)
3. `render()` recomputes derived data (counts + visible tasks) and updates DOM.

## 6. Conceptual Components
- Storage: `loadTasks()`, `saveTasks()`
- State/derivations: `getCounts()`, `getVisibleTasks()`
- Rendering: list, empty state, summary
- Actions: add/toggle/delete/edit/clearCompleted

## 7. Key Design Decisions
- Dataset-based counts (CTF-2)
- Global clear completed (CTF-3)
- Live case-insensitive search that intersects with status filter (CTF-4)
- Preserve render/mutation pattern to minimize regressions

## 8. As-built Implementation Notes (alignment)
To keep design, tests, and implementation consistent, the UI uses the following selectors:
- Filters: `.filters__button[data-filter=...]`
- Tasks: `.task` and `.task__text`
- Edit/Delete: `.task__button--edit` / `.task__button--delete`

(Full list in `docs/architecture/Architecture.md` and `docs/design/LLD.md`.)

## 9. Risks & Mitigations
1. **Edit + search interaction** may cause items to disappear if edited text no longer matches
   - Mitigation: expected; render refresh after edit.
2. **Automation gaps**: current automated suite has 3 edit-mode failures
   - Mitigation: document as unresolved; perform manual confirmation before declaring full pass.

## 10. Acceptance Traceability
- **CTF-2:** Summary counts rendered from dataset; updates on each mutation.
- **CTF-3:** Clear completed button near summary; disabled when completed=0; clears completed globally.
- **CTF-4:** Search above filters; live; case-insensitive; intersects with status filter; does not affect counts.
