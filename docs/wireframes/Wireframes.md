# Wireframes — CodeMie‑TaskFlow (ENH‑1, ENH‑2)

**Note:** These are low‑fidelity wireframes for layout/intent. They reflect the as‑built UI structure and the approved enhancements.

## WF‑01 — Main screen (default / All filter)
```
+--------------------------------------------------+
| CodeMie‑TaskFlow                                 |
|--------------------------------------------------|
| [ Add a task...________________________ ] [Add]  |
|                                                  |
| Total: 3 | Active: 2 | Completed: 1   [Clear]    |
|                                                  |
| [ Search tasks...____________________________ ]  |
|                                                  |
|  (All)   (Active)   (Completed)                  |
|                                                  |
|  [ ] Buy milk                     [Edit] [Del]   |
|  [x] Call Alice                   [Edit] [Del]   |
|  [ ] Write report                 [Edit] [Del]   |
+--------------------------------------------------+
```

## WF‑02 — Clear completed disabled state
```
Total: 2 | Active: 2 | Completed: 0   [Clear completed (disabled)]
```

## WF‑03 — Search + Filter intersection
```
Search: "call"  + Filter: Completed

Visible list shows only tasks that are (completed == true) AND text includes "call".
```

## WF‑04 — Empty state: dataset empty
```
(no tasks in dataset)

[ Empty state banner / text ]
No tasks yet. Add one above.
```

## WF‑05 — Empty state: no matches (dataset non-empty)
```
(dataset has tasks)
Search: "zzz" (no matching tasks)

[ Empty state banner / text ]
No matching tasks.
```

## WF‑06 — Inline edit (conceptual)
```
Task row:
[ ] Buy milk     [Edit] [Del]

After clicking Edit:
[ ] [ Buy milk______________ ] [Save/Enter] [Cancel/Escape]

Note: Actual save mechanism is implemented in JS and may rely on Enter/blur depending on current app behavior.
```
