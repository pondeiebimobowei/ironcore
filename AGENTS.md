# IronCore Retain Agent Instructions

This file defines the execution contract for AI-assisted work in this repository.

## Task Alignment Protocol

Every completed task must align with `doc/implementation-plan.md`.

Before starting a task:

1. Identify the matching phase in `doc/implementation-plan.md`.
2. Confirm the task appears in that phase or is a clearly necessary subtask of it.
3. Check the phase dependencies, expected files, completion criteria, validation steps, and documented risks.
4. If the requested task is not represented in the implementation plan, pause and report the mismatch instead of inventing scope.
5. If the implementation plan conflicts with another document or the current repo state, surface the conflict before implementation.

During implementation:

- Execute one task at a time.
- Do not skip documented dependencies.
- Do not add features outside the documented MVP scope.
- Prefer the simplest implementation that satisfies the documented task.
- Keep changes scoped to the files and modules implied by the task.

After completing a task:

1. Summarize exactly what was implemented.
2. Explain important architectural decisions.
3. List modified files.
4. Mention anything questionable or incomplete.
5. Include an "Implementation plan alignment" note naming the phase/task satisfied.
6. Suggest the next logical task from `doc/implementation-plan.md`.
7. Create a git commit with a professional scoped message.

## Validation Standard

Each completed task should run the validation listed in `doc/implementation-plan.md` where possible.

If the documented validation cannot run yet, explain why and run the closest useful check.

Default checks for foundation work:

```bash
npm run typecheck
npm run lint
npm run build
```

## Scope Boundaries

Do not build these during the MVP unless the implementation plan is explicitly updated first:

- real WhatsApp integration before the mock flow works
- payment processor integration
- AI churn prediction
- drag-and-drop workflow builder
- mobile app
- attendance tracking
- class scheduling
- trainer management
- advanced analytics
- automated billing
- embedded finance

The MVP exists to prove the recovery loop:

```txt
detect revenue leakage -> recover overdue revenue -> verify payment -> show measurable value
```
