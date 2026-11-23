# Test Case Results (Latest Verified Run)

**Run timestamp:** 2026-11-23T20:28:29.527Z  
**Total:** 37  
**Passed:** 34  
**Failed:** 3  

> Source of truth for totals: `docs/testing/test-run-log.txt`.

## Failed Tests (3)
All failures are edit-mode related and remain **unresolved pending confirmation** (application defect vs automation timing/assumption).

| ID | Scenario | Status | Error / Notes | Evidence |
|---|---|---|---|---|
| TF-REG-003 | Edit task updates text | FAIL | Timeout waiting for edit input to become visible in headless run. | docs/testing/evidence/TF-REG-003__exception__*.png |
| TF-ENH1-011 | Editing a task does not alter counts | FAIL | Timeout waiting for edit input to become visible (edit mode). | docs/testing/evidence/TF-ENH1-011__exception__*.png |
| TF-ENH2-008 | Editing a task while search active refreshes results | FAIL | Timeout waiting for edit input to become visible while search active. | docs/testing/evidence/TF-ENH2-008__exception__*.png |

## Passed Tests (34)
The remaining 34 cases passed in the latest verified run.

| ID Range / Area | Included Test IDs | Status |
|---|---|---|
| ENH‑1 Summary/Clear | TF‑ENH1‑001 … TF‑ENH1‑010, TF‑ENH1‑012, TF‑ENH1‑013 | PASS |
| ENH‑2 Search | TF‑ENH2‑001 … TF‑ENH2‑007, TF‑ENH2‑009, TF‑ENH2‑010 | PASS |
| Regression/Core | TF‑REG‑001, TF‑REG‑002, TF‑REG‑004 … TF‑REG‑008 | PASS |
| localStorage | TF‑LS‑001 … TF‑LS‑006 | PASS |

---

## Historical Results (Superseded)
An earlier `TestCaseResults.md` version contained failures caused by selector mismatches (e.g., `.task-item`, `.task-text`, `.filter-btn`).
Those results are **superseded** by the latest verified run summarized above.
