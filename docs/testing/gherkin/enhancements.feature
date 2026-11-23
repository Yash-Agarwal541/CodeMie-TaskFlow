Feature: CodeMie‑TaskFlow Enhancements (ENH‑1 Summary/Clear, ENH‑2 Search)

  Background:
    Given the TaskFlow application is open
    And localStorage key "taskflow.tasks" is cleared

  # ENH‑1
  Scenario: Summary shows 0 counts and Clear completed disabled when there are no tasks
    When the application loads
    Then the summary shows "Total: 0"
    And the summary shows "Active: 0"
    And the summary shows "Completed: 0"
    And the "Clear completed" button is disabled

  Scenario: Summary counts are dataset-based and update after add/toggle/delete
    When I add tasks "Task A" and "Task B"
    Then the summary shows Total 2 and Active 2 and Completed 0
    When I mark "Task A" as completed
    Then the summary shows Total 2 and Active 1 and Completed 1
    When I delete "Task B"
    Then the summary shows Total 1 and Active 0 and Completed 1

  Scenario: Clear completed removes all completed tasks globally
    Given I have tasks:
      | text      | completed |
      | Buy milk  | false     |
      | Call Alice| true      |
      | Write rep | true      |
    When I click "Clear completed"
    Then only active tasks remain in the dataset
    And the "Clear completed" button is disabled

  Scenario: Empty dataset message is shown when there are no tasks
    Given the dataset is empty
    Then I see "No tasks yet. Add one above."

  Scenario: No matching tasks message is shown when filter/search yields nothing
    Given I have tasks:
      | text      | completed |
      | Buy milk  | false     |
    When I search for "zzz"
    Then I see "No matching tasks."

  # ENH‑2
  Scenario: Search is live, trims whitespace, and is case-insensitive
    Given I have tasks:
      | text        | completed |
      | Buy milk    | false     |
      | Write report| false     |
    When I search for "  MIL  "
    Then only tasks containing "mil" are visible

  Scenario: Search intersects with status filter
    Given I have tasks:
      | text       | completed |
      | Call Alice | true      |
      | Call Bob   | false     |
    When I select the "Completed" filter
    And I search for "call"
    Then only completed tasks containing "call" are visible

  Scenario: Search query is not persisted
    Given I search for "milk"
    When I reload the page
    Then the search input is empty
