# Low-Level Design (LLD) — CodeMie-TaskFlow Enhancements

**Project:** CodeMie-TaskFlow  
**Scope (Approved):** ENH-1 (Task Summary + Clear Completed), ENH-2 (Search Tasks)  
**Jira Epic:** CTF-1  
**Jira Stories:** CTF-2, CTF-3, CTF-4  
**Jira Tasks:** CTF-5 … CTF-15  

## 1. Purpose
This document specifies implementation-level design details for adding:
- Dataset-based summary counts
- Global clear completed action
- Live, case-insensitive search that intersects with existing status filters

No changes to persisted schema or existing behavior outside scope.

## 2. Target Files (Impacted)
- `index.html`
  - Add summary line
  - Add clear completed button (placed near summary line)
  - Add search input above filters
- `script.js`
  - Add `searchQuery` state
  - Add combined filtering pipeline (status filter ∩ search)
  - Add dataset-based counts and summary rendering
  - Add clear completed action
  - Update empty state logic
- `style.css`
  - Add styles for summary/search/clear completed and disabled state

## 3. DOM Changes (index.html)
### 3.1 New elements (required IDs)
Add a summary block near the top of the task controls (after Add form):
- Summary line: `#task-summary`
- Clear completed button: `#clear-completed`

Add search input **above** the status filters:
- `#search-input`

### 3.2 As-built selectors (implementation aligned)
The application uses the following selectors (these are important for automation and documentation consistency):
- Filter buttons: `.filters__button[data-filter="all"|"active"|"completed"]`
- Task row container: `.task`
- Task text: `.task__text`
- Edit button: `.task__button--edit`
- Delete button: `.task__button--delete`
- Inline edit input: `.task__edit-input`
- Empty state: `#empty-state`

Example conceptual structure (IDs must remain consistent; class names reflect as-built):
```html
<div class="summary-bar">
  <div id="task-summary" class="summary" aria-live="polite"></div>
  <button id="clear-completed" class="clear-completed" type="button" disabled>
    Clear completed
  </button>
</div>

<input id="search-input" class="search__input" type="text" placeholder="Search tasks..." autocomplete="off" />

<div class="filters">
  <button class="filters__button" data-filter="all">All</button>
  <button class="filters__button" data-filter="active">Active</button>
  <button class="filters__button" data-filter="completed">Completed</button>
</div>
```

### 3.3 Empty state element
Reuse existing empty state element (`#empty-state`) and update text dynamically in `render()`.

## 4. State Model (script.js)
### 4.1 Existing state (unchanged)
- `tasks` (array of task objects) loaded from localStorage key `taskflow.tasks`
- `currentFilter` string: `"all" | "active" | "completed"`

### 4.2 New state
- `searchQuery: string` (in-memory; default `""`; not persisted)

## 5. Functions & Behaviors

### 5.1 DOM references (new)
At init time:
- `summaryEl = document.getElementById("task-summary")`
- `searchInputEl = document.getElementById("search-input")`
- `clearCompletedEl = document.getElementById("clear-completed")`

### 5.2 Dataset counts (CTF-2)
#### `getCounts()`
Computes counts from the full `tasks` dataset (independent of filter/search).

Algorithm:
- `total = tasks.length`
- `completed = count where task.completed === true`
- `active = total - completed`

#### `renderSummary()`
- Calls `getCounts()`
- Updates summary line:
  - `Total: X | Active: Y | Completed: Z`
- Sets clear button disabled state:
  - `clearCompletedEl.disabled = (counts.completed === 0)`

### 5.3 Search (CTF-4)
Attach an `input` event listener:
- On each keystroke:
  - `searchQuery = searchInputEl.value`
  - `render()`

Search matching rules:
- `q = searchQuery.trim()`
- If `q === ""`, search filter is not applied
- Else case-insensitive substring match:
  - `task.text.toLowerCase().includes(q.toLowerCase())`

#### Filtering pipeline (intersection)
Visible tasks satisfy both:
1) status filter
2) search match (if query non-empty)

Recommended shape:
- `visibleTasks = applySearchFilter(applyStatusFilter(tasks, currentFilter), searchQuery)`

### 5.4 Clear completed (CTF-3)
`clearCompleted()`
- Removes all tasks with `completed === true` from the full dataset
- Updates storage via `saveTasks()`
- Calls `render()`
- Works regardless of current filter/search

Suggested implementation:
- `tasks = tasks.filter(t => !t.completed)`

### 5.5 Edit behavior clarification
After editing and saving a task, the displayed list must refresh according to current search query and status filter.

Implementation expectation:
- Existing edit-save path must end in `saveTasks(); render();`

### 5.6 Empty state rules
Update `render()` empty-state logic using both dataset and view lengths:
- If `tasks.length === 0`: show **"No tasks yet. Add one above."**
- Else if `visibleTasks.length === 0`: show **"No matching tasks."**
- Else: hide empty state

## 6. Render Orchestration
`render()` responsibilities:
1. `visibleTasks = getVisibleTasks()`
2. Render list items from `visibleTasks`
3. Update empty state based on dataset vs visible list
4. Call `renderSummary()`

## 7. Styling (style.css)
Add styles consistent with existing patterns:
- `.summary-bar` layout (summary + button)
- `.search__input` spacing above filters
- `.clear-completed:disabled` muted style

## 8. Traceability to Jira
- **CTF-2 (Summary counts)**: CTF-5, CTF-6, CTF-7
- **CTF-3 (Clear completed)**: CTF-8, CTF-9, CTF-10, CTF-11
- **CTF-4 (Search)**: CTF-12, CTF-13, CTF-14, CTF-15

## 9. Technical Risks & Notes
- Clear completed disabled state must be dataset-based.
- Editing while search is active may remove item from view if it no longer matches; expected if render refreshes correctly.
- Automated suite currently has 3 edit-mode failures (see `docs/testing/DefectReport.md`).
