---
status: ready
priority: p1
issue_id: "001"
tags: [after-effects, lcd-screen, scriptui, visual-effects]
dependencies: []
---

# Build Perfect Screen v2 Example

## Problem Statement

The existing `examples/lcd-screen/` project is a broad LCD mockup, but it does not recreate the defining macro-photography look or expose the full Perfect Screen-style control surface live.

## Findings

- Four camera controls are rebuild-only and there is no roll or target/focus-point control.
- Auto zoom is baked and cannot follow live handheld motion.
- Dust density, exposure, auto exposure, base/radial blur, live density, real chromatic aberration, quality modes, and four presets are missing.
- The cleaner deletes comps by name without an ownership marker.
- No rendered acceptance-frame loop has been completed.

## Proposed Solutions

### Option 1: Incremental v1 Patch

**Approach:** Add the missing controls around the current four-comp architecture.

**Pros:**
- Smaller code diff
- Reuses the existing bake path

**Cons:**
- Preserves self-referential auto-zoom limitations
- Keeps lens-space effects mixed into panel space

**Effort:** High

**Risk:** High

### Option 2: Visual-First v2 Rebuild

**Approach:** Rebuild around an oversampled 3D scene, an outer 2D lens stack, table-driven live links, state renders, and marker-safe cleanup.

**Pros:**
- Matches the target visual and control model
- Supports live motion and auto zoom
- Produces objective preview evidence

**Cons:**
- Larger refactor
- Requires staged After Effects validation

**Effort:** High

**Risk:** Medium

## Recommended Action

Execute `docs/plans/2026-07-25-feat-perfect-screen-v2.md` milestone by milestone, stopping for After Effects preview inspection and user confirmation at each visual acceptance gate.

## Technical Details

**Affected files:**
- `examples/lcd-screen/`
- `Scripts/analyze/lib/actions_indexer.jsxinc`
- `Scripts/lib/actions/index.json`
- `Scripts/verified/gotchas.md`
- Example documentation and install skill

**Database changes:** None.

## Resources

- `docs/plans/2026-07-25-feat-perfect-screen-v2.md`
- `Scripts/verified/gotchas.md`
- `Scripts/lib/actions/index.json`

## Acceptance Criteria

- [x] Baseline working tree committed before rebuild work
- [x] M0 infrastructure and safety complete
- [ ] M1 macro core, live camera, and live auto zoom accepted
- [ ] M2 lens realism accepted
- [ ] M3 exposure, auto exposure, and tint accepted
- [ ] M4 animated movement under live auto zoom accepted
- [ ] M5 twenty live presets and panel v2 accepted
- [ ] M6 quality modes, optional extras, docs, and contact sheet accepted
- [ ] Static checks and After Effects validation pass
- [ ] All plan checkboxes are complete

## Work Log

### 2026-07-25 - Execution Started

**By:** Codex

**Actions:**
- Renamed the plan to its dated filename.
- Created feature branch `feat-perfect-screen-v2`.
- Committed the full v1 working tree baseline as `2d0f0c5`.
- Began repository and action-catalog inventory.

**Learnings:**
- The default branch was clean at `c994f42`; all pre-existing LCD work is preserved in the baseline commit.
- Visual acceptance requires user-run After Effects scripts and rendered PNG inspection.

### 2026-07-25 - M0 Infrastructure and Safety

**By:** Codex

**Actions:**
- Replaced name-only cleanup with ownership-marker and exact-name checks.
- Added structured result data for cleanup, probes, and state renders.
- Made the action index Unix-line-ending, two-space formatted, and category-order stable.
- Added runner metadata for all 14 LCD actions and registered runnable actions in the Actions Runner panel.
- Added the acceptance state renderer and M1 capability probes.

**Learnings:**
- The generated index was indented but used carriage-return line endings, making it appear as one line to Unix tooling.
- Cross-comp `toComp()` and the exact Channel Mixer/Exposure schemas remain gated on the first M1 After Effects run.

## Notes

- Optional Perfect Screen reference stills may be placed in `Scripts/runs/reference/`.
- Project setup placeholders must be resolved with `Scripts/setup.jsx` before AE validation.
