# Functional Requirements Document (FRD) — CodeMie‑TaskFlow Enhancements

**Project:** CodeMie‑TaskFlow  
**Scope (Approved):** ENH‑1 (Task Summary + Clear Completed), ENH‑2 (Search Tasks)  
**Jira Epic:** CTF‑1  
**Jira Stories:** CTF‑2, CTF‑3, CTF‑4  
**Jira Tasks:** CTF‑5 … CTF‑15  

## 1. Purpose
Define the approved functional requirements and acceptance criteria for CodeMie‑TaskFlow enhancements, including edge cases and traceability to Jira.

## 2. In‑Scope Enhancements
- **ENH‑1:** Dataset-based summary counts (Total / Active / Completed) and a global **Clear completed** action.
- **ENH‑2:** A live, case‑insensitive **Search** that intersects with existing status filters.

## 3. Out of Scope / Non‑Goals
- No backend/API and no authentication.
- No new filter categories beyond **All / Active / Completed**.
- No persistence of search query across reload.
- No changes to the persisted task schema or storage key.

## 4. Assumptions & Constraints
- The application is a static, client‑only SPA (HTML/CSS/JS).
- Persisted storage key remains **`taskflow.tasks`**.
- Persisted task schema remains compatible with existing tasks:
  - Minimum supported fields: `{ id, text, completed }`
  - Current implementation also uses `createdAt` (optional for backward compatibility).

## 5. Functional Requirements and Acceptance Criteria

### ENH‑1 — Task Summary + Clear Completed

#### FR‑ENH1‑01 — Display dataset-based summary counts
**Description:** Display a summary line that shows the counts of tasks in the dataset.

**Acceptance Criteria:**
1. Summary displays **Total**, **Active**, and **Completed** counts in a single line (e.g., `Total: X | Active: Y | Completed: Z`).
2. Counts are derived from the full dataset, **not** from the current filtered/search view.
3. Counts update after each dataset mutation (add, toggle, edit, delete, clear completed).

**Traceability:** Jira Story **CTF‑2**; Tasks **CTF‑5, CTF‑6, CTF‑7**.

#### FR‑ENH1‑02 — Clear completed button visibility and state
**Description:** Provide a visible control to remove completed tasks in one action.

**Acceptance Criteria:**
1. A **Clear completed** button is visible near the summary.
2. The button is **disabled** when `Completed = 0` (dataset-based).
3. The button becomes enabled when at least one task in the dataset is completed.

**Traceability:** Jira Story **CTF‑3**; Tasks **CTF‑8, CTF‑10, CTF‑11**.

#### FR‑ENH1‑03 — Clear completed removes completed tasks globally
**Description:** Clear all completed tasks from the dataset.

**Acceptance Criteria:**
1. Clicking **Clear completed** removes all completed tasks from the dataset regardless of current filter/search.
2. The operation updates localStorage under the same key (`taskflow.tasks`).
3. No confirmation prompt is required.

**Traceability:** Jira Story **CTF‑3**; Task **CTF‑9**.

#### FR‑ENH1‑04 — Empty state messaging
**Description:** The application displays an appropriate empty state message.

**Acceptance Criteria:**
1. If the dataset is empty, show: **"No tasks yet. Add one above."**
2. If dataset has tasks but the current view is empty due to filter/search intersection, show: **"No matching tasks."**

**Traceability:** Covered by ENH‑1/ENH‑2 UI behavior; validated in tests.

**Edge Cases:**
- Clearing completed while viewing **Completed** filter results in an empty view; message should follow the rules above.

---

### ENH‑2 — Search Tasks

#### FR‑ENH2‑01 — Search input placement and behavior
**Description:** Provide a search input to filter tasks by text.

**Acceptance Criteria:**
1. Search input is placed **above** status filter buttons.
2. Search is **live** (results update as the user types).
3. Search is **case‑insensitive** and uses substring matching.
4. Leading/trailing whitespace in search query is ignored.

**Traceability:** Jira Story **CTF‑4**; Tasks **CTF‑12, CTF‑13, CTF‑15**.

#### FR‑ENH2‑02 — Search intersects with existing status filter
**Description:** Search results must satisfy both search criteria and the selected status filter.

**Acceptance Criteria:**
1. Visible tasks = **Status Filter ∩ Search Match**.
2. Changing filter updates results while keeping search query applied.
3. Clearing the search query restores the view for the current filter.

**Traceability:** Jira Story **CTF‑4**; Task **CTF‑14**.

#### FR‑ENH2‑03 — Search does not affect dataset-based counts
**Description:** Summary counts must remain dataset-based and not vary due to filter/search.

**Acceptance Criteria:**
1. Summary counts remain unchanged when user only changes filter or search query.

**Traceability:** Cross‑cutting; validated by tests.

#### FR‑ENH2‑04 — Search query is not persisted
**Description:** Search query must not be stored in localStorage.

**Acceptance Criteria:**
1. After reload, the search input is empty.
2. No additional localStorage keys are created for search.

**Traceability:** Jira Story **CTF‑4**.

## 6. Quality / Non‑Functional Requirements (NFRs)
- Must work in modern browsers (Chrome/Edge/Firefox).
- Must preserve localStorage compatibility with older tasks.
- No sensitive data stored.

## 7. Requirements-to-Test Traceability (High-Level)
- ENH‑1 summary/clear: TF‑ENH1‑001 … TF‑ENH1‑013
- ENH‑2 search: TF‑ENH2‑001 … TF‑ENH2‑010
- Regression/core: TF‑REG‑001 … TF‑REG‑008
- localStorage: TF‑LS‑001 … TF‑LS‑006

> Note: As of the latest verified run (2026‑11‑23T20:28:29.527Z), the automated suite reports **34 passed / 3 failed** (edit-mode related). See `docs/testing/TestExecutionReport.md`.
