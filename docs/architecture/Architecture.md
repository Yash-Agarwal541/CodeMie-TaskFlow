# Architecture — CodeMie‑TaskFlow (Static SPA)

**Project:** CodeMie‑TaskFlow  
**Scope:** Static client-only task app + ENH‑1 and ENH‑2 enhancements  

## 1. System Context
CodeMie‑TaskFlow is a **single‑page application** (SPA) implemented with vanilla **HTML/CSS/JavaScript**.

- **Users** interact via a browser.
- The app persists tasks to **browser localStorage**.
- There is **no backend** and no network/API dependency.

### Context Diagram (text)
```
+------------------+        (DOM events)        +-----------------------------+
|      User        | -------------------------> |   Browser (HTML/CSS/JS)     |
| (keyboard/mouse) |                           |   CodeMie‑TaskFlow SPA      |
+------------------+                           +--------------+--------------+
                                                                |
                                                                | localStorage API
                                                                v
                                                     +------------------------+
                                                     | localStorage           |
                                                     | key: taskflow.tasks    |
                                                     +------------------------+
```

## 2. Key Architectural Constraints
- Persisted storage key: `taskflow.tasks`
- Persisted schema must remain compatible: `{ id, text, completed, createdAt? }`
- Search query is **not persisted**.

## 3. Component View
Although implemented as a single script, the solution can be viewed as conceptual components:

1. **UI Layer (DOM)**
   - Markup in `index.html`
   - Styling in `style.css`
   - Core UI selectors (as-built):
     - Summary: `#task-summary`
     - Clear completed: `#clear-completed`
     - Search input: `#search-input`
     - Filter buttons: `.filters__button[data-filter="all|active|completed"]`
     - Task item: `.task`
     - Task text: `.task__text`
     - Edit/Delete buttons: `.task__button--edit`, `.task__button--delete`

2. **State Layer (in-memory)**
   - `tasks`: array
   - `currentFilter`: `all|active|completed`
   - `searchQuery`: string

3. **Storage Layer**
   - `loadTasks()` reads `taskflow.tasks`
   - `saveTasks()` writes `taskflow.tasks`

4. **Rendering/Derivation Layer**
   - `getCounts()` computes dataset-based totals
   - `getVisibleTasks()` applies status filter then search filter (intersection)
   - `render()` orchestrates list rendering, empty state, and summary

## 4. Data Flow
### 4.1 High-level flow
1. **Startup**
   - `tasks = loadTasks()`
   - initialize listeners
   - `render()`

2. **User action** (add/edit/toggle/delete/filter/search/clear completed)
   - update in-memory state (`tasks`, `currentFilter`, `searchQuery`)
   - for dataset mutations: `saveTasks()`
   - call `render()`

### 4.2 Visible tasks derivation (intersection)
```
visibleTasks = applySearchFilter(applyStatusFilter(tasks, currentFilter), searchQuery)
```

### 4.3 Empty state decision
- `tasks.length === 0` -> "No tasks yet. Add one above."
- else if `visibleTasks.length === 0` -> "No matching tasks."

## 5. Architecture Diagram (Mermaid)
> If Mermaid is not enabled where rendered, use the text diagram above.

```mermaid
graph TD
  U[User] -->|click/type| DOM[UI / DOM]
  DOM -->|event handlers| STATE[In-memory State\n(tasks, currentFilter, searchQuery)]
  STATE -->|saveTasks()| LS[(localStorage\nkey: taskflow.tasks)]
  LS -->|loadTasks()| STATE
  STATE -->|derived data\ncounts + visibleTasks| RENDER[render()]
  RENDER --> DOM
```

## 6. Deployment Architecture
- **Deployable artifact:** static files (`index.html`, `script.js`, `style.css`)
- **Runtime:** any static HTTP server or opening `index.html` directly (file://)
- **No build step** required.

## 7. Security & Privacy Notes
- Uses localStorage for task text; do not store secrets.
- No external calls; no credentials.
