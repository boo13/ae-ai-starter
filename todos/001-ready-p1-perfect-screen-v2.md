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
- [x] M1 macro core, live camera, and live auto zoom accepted
- [x] M2 lens realism accepted
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

### 2026-07-25 - M1 Ready for After Effects Validation

**By:** Codex

**Actions:**
- Rebuilt the comp chain as Content, macro Panel, oversampled 3D Scene, and outer Master.
- Added a live camera with distance, orbit, tilt, roll, zoom, target, focus, aperture, and seeded motion controls.
- Added table-driven expressions for camera, focus, Mosaic density, RGB pattern pitch, glow, tint, distortion, exposure, and live auto zoom.
- Added automatic M1 probes and six named acceptance-frame renders to `setup.jsx`.
- Ran static syntax, control-name consistency, expression-parser, and auto-zoom math checks.

**Learnings:**
- The vetted expression catalog supplied the established `toComp`, seeded `wiggle`, and auto-scale patterns; the cross-comp ray-exit solver remains project-specific.
- M1 must remain uncommitted until `last_run.json`, the six flushed PNGs, and the user’s visual confirmation pass the milestone criteria.

### 2026-07-26 - M1 First After Effects Run

**By:** Codex

**Actions:**
- Inspected `Scripts/runs/last_run.json` after the user ran the headless M1 builder.
- Traced the failure at `create live camera` to the camera Point of Interest lookup.
- Replaced the invalid `ADBE Point of Interest` lookup with the verified camera match name `ADBE Anchor Point` in both camera setup and live linking.

**Learnings:**
- In After Effects, a two-node camera displays this property as Point of Interest while exposing it to scripting under the `ADBE Anchor Point` match name.
- The dockable ScriptUI panel is intentionally scheduled for M5; `setup.jsx` is the staged builder and visual-validation entry point.

### 2026-07-26 - M1 Technical Validation Passed

**By:** Codex

**Actions:**
- Verified the rerun completed successfully with all 29 expected live links.
- Confirmed the cross-comp `toComp()` probe returned the expected value and captured the Channel Mixer and Exposure2 schemas.
- Inspected all six acceptance PNGs at full resolution and checked their alpha channels.
- Recorded the verified AE behavior in `Scripts/verified/gotchas.md`.

**Learnings:**
- RGB stripe triplets resolve at the frame center, density 3 and 12 produce visibly different pitch, and the orbit state shows perspective convergence with far-edge softness.
- Every M1 preview is fully opaque; the rendered alpha minimum and maximum are both 1.

### 2026-07-26 - M1 Visual Retune

**By:** Codex

**Actions:**
- Reopened M1 after the user found the previews too dark, unreadable, and dominated by vertical stripes.
- Reduced the live RGB pattern amount from 72% to 32%.
- Muted the pure-primary Multiply pattern, raised default exposure by 0.45 stops, and reduced glow intensity.

**Learnings:**
- Pure RGB in Multiply mode at 72% suppresses two channels on each stripe strongly enough to obscure the source image.
- M1 remains unaccepted pending a rerender and user review of the retuned six-state set.

### 2026-07-26 - M1 Visual Retune 2

**By:** Codex

**Actions:**
- Verified the first retune was present in the successful rerun, but treated the repeated user feedback as a design failure.
- Replaced the RGB pattern's Multiply blend with luminance-preserving Color blend.
- Reduced pixel amount to 10%, changed the readable default density to 3px, raised exposure to +1 stop, and reduced glow further.

**Learnings:**
- Opacity reduction alone cannot make a Multiply-based subpixel overlay preserve source legibility.
- Pixel structure should primarily alter chroma while leaving source luminance intact.

### 2026-07-26 - M1 Accepted

**By:** Codex

**Actions:**
- Verified the final rerun succeeded with all 29 live links and six fully opaque acceptance frames.
- Inspected the final front-close frame after the luminance-preserving pixel treatment.
- Recorded the user's visual approval and closed the M1 gate.

**Learnings:**
- The accepted baseline uses a 3px density, 10% Color-blended RGB structure, +1 stop exposure, and reduced glow.

### 2026-07-26 - M2 Ready for After Effects Validation

**By:** Codex

**Actions:**
- Replaced the single Master scene instance with channel-isolated Red, Green, and Blue instances that reconstruct through Normal plus Add blending.
- Added live edge-scaled chromatic aberration on the same auto-zoom solve.
- Added live base blur, radial blur, grain, lens-space dust strength/density, and a feathered elliptical vignette.
- Added six M2 acceptance states for CA, radial blur, dust density, and vignette.
- Passed ES3 syntax, state/control consistency, expression-parser, and whitespace checks.

**Learnings:**
- Channel Mixer diagonal gains are sufficient for exact zero-offset reconstruction; the live CA amount only changes Red and Blue scale around frame center.
- Dust density maps to the normalized Threshold level while dust strength remains independent layer opacity.

### 2026-07-26 - M2 First After Effects Run

**By:** Codex

**Actions:**
- Verified a successful six-state run with all 37 live links and no cleanup conflicts.
- Confirmed CA-0 matches the accepted M1 frame within a normalized RMSE of 0.000008.
- Confirmed CA-70, radial blur, vignette, and opacity coverage visually.
- Rejected the dust pair because density 10 and 80 differed by only 0.000094 normalized RMSE.
- Moved the dust source to middle gray and remapped density across the noise's usable threshold range.

**Learnings:**
- A black Noise HLS source with Threshold levels from 0.755 to 0.965 produces almost no visible lens dust.

### 2026-07-26 - M2 Numeric Validation Passed

**By:** Codex

**Actions:**
- Verified the corrected run completed with all 37 live links and no cleanup conflicts.
- Confirmed dust density 10 renders sparse motes while density 80 renders a dense field at the same 45% strength.
- Rechecked zero-offset CA fidelity, CA-70 edge fringing, radial blur, vignette, and full opacity.

**Learnings:**
- The corrected dust pair differs by 0.129 normalized RMSE while retaining the same per-speck layer strength.
- CA-0 remains within 0.000008 normalized RMSE of the accepted M1 baseline.

### 2026-07-26 - M2 Visual Review Reopened

**By:** Codex

**Actions:**
- Rejected the prior numeric pass after full-resolution review and direct user correction.
- Reduced CA displacement by 70%, reduced the radial test from 18 to 4 with only 0.35px base blur, and compressed the dust-density threshold range.
- Reduced dust acceptance-state strength from 45% to 30%.

**Learnings:**
- A large difference metric proves a control changes pixels, not that the result is plausible.
- Stress states still need to read as photographic extremes: CA-70 cannot become a prism split, radial blur cannot erase text, and dust-80 cannot become snowfall.

### 2026-07-26 - Preview Write Failure Detected

**By:** Codex

**Actions:**
- Detected that the retuned M2 run reported success while only two of six preview files existed.
- Confirmed both existing PNGs ended inside an IDAT chunk rather than with the required IEND trailer.
- Updated the renderer to remove stale output, wait for each PNG sequentially, verify IEND, and fail explicitly after 60 seconds.

**Learnings:**
- `saveFrameToPng()` can queue writes and let the success dialog appear even when low disk space leaves every output truncated.

### 2026-07-26 - Preview Poll Cache Fix

**By:** Codex

**Actions:**
- Diagnosed a false timeout after the first retuned frame completed with a valid IEND trailer.
- Changed every poll to construct a fresh ExtendScript `File` handle before checking length and reading the final chunk.

**Learnings:**
- An ExtendScript `File` object created before `saveFrameToPng()` can retain stale metadata even after the asynchronous write completes.

### 2026-07-26 - ExtendScript Seek Fix

**By:** Codex

**Actions:**
- Traced the second false timeout to `File.seek(-12, 2)`.
- Changed the call to `File.seek(12, 2)` and restored its return-value check.

**Learnings:**
- ExtendScript seek mode 2 interprets a positive offset as bytes backward from EOF; it is not POSIX `SEEK_END` arithmetic.

### 2026-07-26 - M2 Accepted

**By:** Codex

**Actions:**
- Verified the final run completed all six sequential PNG writes with valid IEND trailers.
- Inspected every frame at full resolution after retuning CA, radial blur, and dust.
- Confirmed all frames are fully opaque and CA-0 remains effectively identical to M1.

**Learnings:**
- The accepted CA coefficient is 0.00006 per slider point, radial stress is 4 with 0.35px base blur, and dust density maps only across Threshold 0.85-0.93.

## Notes

- Optional Perfect Screen reference stills may be placed in `Scripts/runs/reference/`.
- Project setup placeholders must be resolved with `Scripts/setup.jsx` before AE validation.
