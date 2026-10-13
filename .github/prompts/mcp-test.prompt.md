---
name: MCP Test
description: "Use Playwright MCP to inspect a scenario, then create and run a data-driven Playwright test in e2e/."
argument-hint: "URL, scenario, input values or variants, and expected behavior"
agent: agent
---

Explore the requested browser scenario with the configured Playwright MCP, then implement and run it as an automated Playwright test in `e2e/`.

## Input

${input:scenario:Provide the target URL, scenario, any input values or variants to cover, and expected behavior}

## Procedure

1. Inspect `playwright.config.ts` and existing tests in `e2e/` first. Follow the repository's Playwright conventions and choose a new, descriptive `*.spec.ts` filename. Do not overwrite an existing test unless asked.
2. Open the supplied URL with Playwright MCP. Reuse an already open page only to inspect its state; the automated test must navigate to the URL itself and must not depend on that browser session's cookies, local storage, or prior actions.
3. Inspect the page and identify controls through accessibility snapshots and reliable roles, labels, or placeholders. Perform the requested scenario with MCP only when its actions are explicitly authorized by the user. Avoid repeating completed actions.
4. Translate the observed flow into a deterministic Playwright Test using `@playwright/test`. Keep test inputs and expected outcomes together in a test-case object or data set; make assertions compare the UI with that case's values, not unrelated hard-coded literals. If the user requests several input variations, cover them as separate data-driven test cases with the appropriate expected outcome for each. Derive values from runtime defaults or available options when appropriate, and use generated values only when they improve isolation without making the test flaky.
5. Keep meaningful assertions. Do not remove `expect` just because test inputs vary: assert the behavior or displayed values against the current case's expected data. A click or form submission alone is not proof. If the user asks only to fill a form, assert the current case's field values and leave it unsubmitted; do not assert a successful saved record.
6. Create the spec under `e2e/` (create the directory if necessary). Do not change application code or reset persistent data as part of this task unless explicitly requested.
7. Run the new spec using the project's Playwright setup, preferably in Chromium for a focused check. If execution fails, diagnose and fix issues in the test itself when appropriate, then rerun it. Do not claim it passes unless the test runner confirms success.
8. If the expected behavior is unclear, the scenario would perform an irreversible or consequential action, or the MCP/browser cannot safely complete the flow, ask one focused question or stop and explain the limitation before proceeding.

## Report

Respond in the user's language with:
- the path to the generated `e2e/*.spec.ts` file;
- the scenario and assertions covered;
- the command used and actual test result;
- any errors, limitations, or externally visible state changes.

Link to files when mentioning them. Keep the summary concise and distinguish the MCP browser observations from the automated test result.
