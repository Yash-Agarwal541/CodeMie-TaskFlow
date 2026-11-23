# Defect Report — CodeMie‑TaskFlow

**Latest Verified Automation Run:** 2026-11-23T20:28:29.527Z  
**Suite Result:** 37 total / 34 passed / 3 failed  

> Important: The defects below reflect the **current open failures** from the latest verified run.
> Earlier failures caused by selector mismatches in the automation harness are considered **superseded** and are not listed as active defects.

---

## Open Defects (Unresolved)

### DEF-EDIT-001 — Edit mode input not detected / visible in headless automation
- **Related tests:** TF-REG-003
- **Severity:** Medium (blocks automation confidence; manual behavior not yet verified here)
- **Symptom:** Playwright times out waiting for the inline edit input to become visible after clicking Edit.
- **Status:** Unresolved — needs confirmation (application defect vs automation timing/assumption).
- **Evidence:** `docs/testing/evidence/TF-REG-003__exception__*.png`

### DEF-EDIT-002 — Editing a task does not alter counts (automation failure at edit step)
- **Related tests:** TF-ENH1-011
- **Severity:** Medium
- **Symptom:** Playwright times out waiting for the inline edit input to become visible; test cannot verify counts.
- **Status:** Unresolved — needs confirmation.
- **Evidence:** `docs/testing/evidence/TF-ENH1-011__exception__*.png`

### DEF-EDIT-003 — Editing while search active does not refresh results (automation failure at edit step)
- **Related tests:** TF-ENH2-008
- **Severity:** Medium
- **Symptom:** Playwright times out waiting for edit input to become visible under active search.
- **Status:** Unresolved — needs confirmation.
- **Evidence:** `docs/testing/evidence/TF-ENH2-008__exception__*.png`

---

## Superseded Defects (Closed as Automation Selector Mismatch)
A previous run produced many failures due to outdated selectors used by the test harness (e.g., `.filter-btn`, `.task-item`, `.task-text`, `.edit-btn`, `.delete-btn`).
After updating the harness to target the as-built DOM selectors, those failures no longer reproduce.

Superseded defect IDs from the previous report version included:
- DEF-TF-ENH1-003, DEF-TF-ENH1-004, DEF-TF-ENH1-006, DEF-TF-ENH1-008, DEF-TF-ENH1-010
- DEF-TF-ENH2-005, DEF-TF-ENH2-006, DEF-TF-ENH2-007
- DEF-TF-REG-002, DEF-TF-REG-004, DEF-TF-REG-005, DEF-TF-REG-006, DEF-TF-REG-008

These are retained here for history but are **not active**.
