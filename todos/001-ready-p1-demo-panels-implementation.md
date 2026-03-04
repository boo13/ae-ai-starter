---
status: ready
priority: p1
issue_id: "001"
tags: [after-effects, demos, scriptui, expressions]
dependencies: []
---

# Demo Panels Implementation

## Problem Statement

The template project needs two standout demo panels that prove AE automation can create advanced generative graphics and data-driven motion graphics, not just helper utilities.

## Findings

- The base panel pattern is [`Scripts/panel/automation_lab_panel.jsx`](/Users/randy/Git/ae-ai-starter/.worktrees/feat-demo-panels/Scripts/panel/automation_lab_panel.jsx), which provides the current IIFE structure, `runAction()` wrapper, status text, and dockable ScriptUI window setup.
- The current repo has no prior shape-layer builder helpers, no slider-based ScriptUI controls, and no demo directories yet.
- The referenced plan and design docs were untracked in the main checkout, so they were copied into this worktree to keep plan updates and commits isolated on the feature branch.

## Proposed Solutions

### Option 1

Implement both demos directly from the plan with shared helpers extracted only if duplication becomes real.

Pros: Matches plan scope, keeps abstractions honest, minimizes premature shared code.
Cons: Requires careful coordination across several new files.

### Option 2

Extract a generic shape/path library first, then build both demos on top of it.

Pros: Potentially less duplication later.
Cons: Higher upfront abstraction risk without enough usage evidence.

## Recommended Action

Follow Option 1. Build the foundation first, then the Flow Field demo, then the Stock Ticker demo, extracting shared helpers only if both implementations prove the duplication is substantial.

## Acceptance Criteria

- [x] Foundation files exist and match the implementation plan.
- [ ] Flow Field panel generates and updates live controls as specified.
- [ ] Stock Ticker panel builds from bundled data and updates live controls as specified.
- [x] AE-side test scripts exist for shape layers, Perlin math, and both integrations.
- [x] README/docs updates describe how to install and use the new demos.

## Technical Details

- Worktree branch: `feat-demo-panels`
- Source plan: `docs/plans/2026-03-04-feat-demo-panels-implementation-plan.md`
- Supporting docs: `docs/brainstorms/2026-03-03-demo-panels-brainstorm.md`, `docs/plans/2026-03-03-demo-panels-design.md`

## Work Log

### 2026-03-04 - Setup and plan intake

**By:** Codex

**Actions:**
- Created isolated worktree branch `feat-demo-panels` using the `git-worktree` manager skill.
- Copied the untracked plan/design/brainstorm docs into the worktree so they can be updated and committed here.
- Reviewed the existing panel and test patterns to anchor the implementation to current project conventions.

**Learnings:**
- The template project is intentionally generic, so the demo work should treat it as a template rather than waiting for AE-specific setup output.
- The existing repo pattern is simple and direct; new abstractions should stay minimal unless both demos clearly need them.

### 2026-03-04 - Implemented demo panel code

**By:** Codex

**Actions:**
- Added the Flow Field engine, builder, dockable panel, and AE integration tests under [`Scripts/demos/flow_field/`](/Users/randy/Git/ae-ai-starter/.worktrees/feat-demo-panels/Scripts/demos/flow_field/README.md).
- Added the Stock Ticker data loader, builder, dockable panel, bundled JSON dataset, and AE integration tests under [`Scripts/demos/stock_ticker/`](/Users/randy/Git/ae-ai-starter/.worktrees/feat-demo-panels/Scripts/demos/stock_ticker/README.md).
- Updated [`README.md`](/Users/randy/Git/ae-ai-starter/.worktrees/feat-demo-panels/README.md) and [`docs/recipes.md`](/Users/randy/Git/ae-ai-starter/.worktrees/feat-demo-panels/docs/recipes.md) so the demos are discoverable from the template docs.
- Ran local parse-only sanity checks with Node against the new `.jsx` and `.jsxinc` files after stripping `#include` lines.

**Learnings:**
- The biggest risk now is AE-runtime behavior, not syntax: shape-layer match names, text animator wiring, and expression evaluation still need manual confirmation in After Effects.
- The implementation keeps the core math isolated from AE wiring, which should make AE-side debugging narrower if any runtime issue appears.
