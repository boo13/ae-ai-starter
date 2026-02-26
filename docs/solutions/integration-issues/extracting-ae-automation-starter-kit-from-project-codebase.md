---
title: Generalize After Effects Automation Project into Reusable AI-Friendly Starter Kit
date: 2026-02-26
category: integration-issues
tags: [extendscript, after-effects, automation, project-extraction, generalization, ai-integration, es3-compatibility, github-starter-kit, analysis-reports, setup-workflow]
component: Send-GFX to ae-ai-starter (full codebase extraction and redesign)
severity: high
symptoms:
  - Project-specific references scattered throughout codebase
  - Binary AEP files inaccessible to AI analysis
  - No setup/onboarding workflow for new users
  - Hardcoded layer/property names prevent reuse
  - Missing generated analysis reports for AI consumption
  - Empty directories not persisting through git clone
root_cause: Original codebase built for single freelance project with project-specific templates and naming conventions; required architectural redesign to support generic AE compositions while maintaining ES3 compatibility and AI-assistant usability
resolution: Implemented config-driven workflow with placeholder token system, analysis report generation, and setup.jsx-driven initialization enabling both human modification and AI-assisted development
time_to_resolve: ~2 weeks (design + implementation + multi-phase review)
---

## Problem Statement

Motion designers working in After Effects often need to automate repetitive template tasks — populating text layers from a data file, swapping images, timing animations to match spoken content. The natural solution is to write ExtendScript automation. The problem: ExtendScript is a niche, poorly-documented dialect of ECMAScript 3, and AI coding assistants that could help write it have a fundamental limitation — they cannot open After Effects or inspect a project file. They are writing blind.

This creates a painful loop: the designer knows the layer names and comp structure; the AI knows how to write code. Getting that structural knowledge to the AI requires either painstaking manual documentation or a systematic way to extract and communicate it. Without that bridge, every AI-assisted script involves significant back-and-forth to discover things that are directly visible in the AE project panel.

A second problem is that even experienced developers starting a new AE automation project have no established starting point. Every project re-invents file I/O utilities, JSON parsing, report generation, and the pattern for walking a composition to collect layer references. The ES3 constraint means you cannot use npm or any modern JS tooling, so these utilities must be hand-rolled each time, and AI assistants writing ES3 without guidance will routinely produce ES6+ code that fails silently in ExtendScript.

The `ae-ai-starter` repo was extracted from a real production project (Send GFX) that had organically developed solutions to both problems. The goal was to generalize those solutions into a cloneable starting point that any motion designer could use immediately on any AE project.

## Investigation & Design

The design phase considered several key trade-offs:

**Timestamped files vs. stable filenames.** Timestamped reports (`analysis-2026-02-25.md`) would preserve history but complicate AI lookups. Stable filenames (`analysis.md`, `analysis.json`) were chosen — the AI always knows exactly where to look. History belongs in git, not filenames. `git diff Scripts/reports/` provides change history.

**Selective vs. exhaustive analysis.** The analysis system captures everything in the project (with a carve-out for items inside `z_OLD` folders, a universal AE archiving convention). An exhaustive snapshot means the AI can understand the full composition hierarchy, not just the main template.

**JSON only vs. dual Markdown + JSON.** Dual output was chosen because the Markdown report is human-readable in editors and GitHub, while the JSON report is available for scripts that need programmatic access. Both are produced from a single accumulated data structure via the report writer.

**Framework vs. reference patterns for recipes.** Recipes are working, documented code that you copy and adapt — not a library to `#include` without modification. This avoids tight coupling and matches how ExtendScript projects actually work (no package manager, no versioning infrastructure).

**Panel: always-on vs. opt-in.** Panel generation is opt-in via a checkbox in the setup dialog. Not every automation project needs an interactive panel.

## Root Cause / Core Insight

The fundamental challenge is that After Effects projects are binary files (`.aep`). Git can track them, but it cannot diff them. An AI assistant with access to the repo has no way to read the project's composition structure, layer names, property paths, or expressions.

The insight is that this is a **context problem**, not a code problem. The AI is fully capable of writing correct ExtendScript given accurate structural information. The bottleneck is getting that information out of After Effects and into a form the AI can consume.

Analysis reports are the solution: a plain-text, diffable, AI-readable proxy for the binary AEP. By running `run_analysis.jsx` with the project open, the designer produces a complete structural snapshot. The report is committed to git alongside the scripts. When the template changes, re-running analysis updates the report, and `git diff` shows exactly what changed.

This pattern — extract structure from a tool that AIs cannot open, commit the extraction as plain text, use it as AI context — is broadly applicable beyond After Effects.

## Solution Architecture

Four main components work together:

### 1. Analysis System (`Scripts/analyze/`)

Five snapshot modules run sequentially under a single entry point. Each receives a shared `context` object and writes to a dual Markdown+JSON report writer:

```javascript
var context = {
    project: project,
    writer: writer,
    isInOldFolder: isInOldFolder,
    timestamp: timestamp
};

var resProject    = SnapshotProject.capture(context);
var resComps      = SnapshotComps.capture(context);
var resLayers     = SnapshotLayers.capture(context);
var resProperties = SnapshotProperties.capture(context);
var resExpressions = SnapshotExpressions.capture(context);
```

### 2. Report Writer (`Scripts/lib/report_writer.jsxinc`)

A factory function that accumulates Markdown and JSON in parallel:

```javascript
function createReportWriter() {
    var md = [];
    var json = {};
    return {
        addSection: function (title) { md.push("\n## " + title + "\n"); },
        setJson: function (path, value) {
            var target = json;
            for (var i = 0; i < path.length - 1; i++) {
                if (!target[path[i]]) { target[path[i]] = {}; }
                target = target[path[i]];
            }
            target[path[path.length - 1]] = value;
        },
        build: function () { return { markdown: md.join(""), json: json }; }
    };
}
```

### 3. Setup Script (`Scripts/setup.jsx`)

Probes the open AEP, presents a ScriptUI dialog, generates config, fills CLAUDE.md placeholders using ES3-safe `split().join()`:

```javascript
claudeContent = claudeContent.split("{{PROJECT_NAME}}").join(projectName);
claudeContent = claudeContent.split("{{MAIN_COMP}}").join(mainCompName);
claudeContent = claudeContent.split("{{PROJECT_DESCRIPTION}}").join("After Effects automation project");
claudeContent = claudeContent.split("{{MAIN_COMP_DETAILS}}").join(compDetails);
```

### 4. Recipes (`Scripts/recipes/`)

Three self-contained automation patterns:
- **repeating-elements** — Registry pattern: walk a comp once to cache layer/property references, then iterate data against the cache
- **image-swap** — Footage import, source replacement, and fit/fill scaling
- **data-timing** — Word-count-based duration calculation with bidirectional sync

## Key Implementation Details

**The ES3 constraint** shapes every line: `var` only, `function` keyword only, string concatenation with `+`, indexed `for` loops, no modern array methods. The CLAUDE.md template dedicates a prominent CRITICAL section to these constraints so AI assistants apply them from the first line.

**The `{{TOKEN}}` placeholder system** in CLAUDE.md lets `setup.jsx` produce a project-specific AI context file from a single setup run. Tokens are replaced via `split().join()` (no regex, safer under ES3).

**Symlink development workflow** keeps the ScriptUI panel in the git repo while AE reads it via symlink. `setup.jsx` offers to create this automatically.

**Analysis reports as committed sync layer** — reports in `Scripts/reports/` are intentionally tracked in git (not gitignored). They are the AI's "eyes" into the binary AEP. `git diff Scripts/reports/` shows how the project has changed over time.

## Issues Found During Review

### Missing `{{MAIN_COMP}}` placeholder

`setup.jsx` expected `{{MAIN_COMP}}` in CLAUDE.md but the initial template omitted it. The `split().join()` replacement pattern silently does nothing when the token isn't found — no error, no warning.

**Fix:** Added `The primary composition is **{{MAIN_COMP}}**.` to the Main Compositions section.

**Prevention:** Validate all expected tokens exist before performing replacements:

```javascript
function validateTokens(content, expectedTokens) {
    var missing = [];
    for (var i = 0; i < expectedTokens.length; i++) {
        if (content.indexOf(expectedTokens[i]) === -1) {
            missing.push(expectedTokens[i]);
        }
    }
    if (missing.length > 0) {
        throw new Error("Missing tokens: " + missing.join(", "));
    }
}
```

### Falsy-default bug with `base_start = 0`

`var baseStart = settings.base_start || Config.DEFAULT_BASE_START` treats `0` as falsy, overriding a valid `base_start` of 0.

**Fix:** Use explicit type check:

```javascript
var baseStart = (typeof settings.base_start === "number")
    ? settings.base_start : Config.DEFAULT_BASE_START;
```

**Prevention:** Always use `typeof` checks for config defaults where falsy values are legitimate.

### Empty `Input/` directory not surviving clone

Git does not track empty directories.

**Fix:** Added `Input/.gitkeep`.

### Generated files not gitignored

`Scripts/config.jsxinc` and `Scripts/panel/project_panel.jsx` are generated per-project by setup.jsx but were not in `.gitignore`.

**Fix:** Added both patterns to `.gitignore` with a comment explaining why.

## Prevention Strategies

### For Template Token Systems
- Implement explicit token validation before performing replacements
- Log or warn when expected tokens are not found
- Add tests verifying each expected token is present in template files

### For Configuration Defaults
- Always use `typeof` checks, not `||`, when falsy values (0, false, "") are valid
- Document which config values can legitimately be falsy
- Add boundary-case tests (0, false, empty arrays) for configuration handling

### For Repository Publishing
- Add `.gitkeep` files to all required empty directories
- Add all generated file patterns to `.gitignore` when setup scripts are created
- Add comments in `.gitignore` explaining intentionally-tracked generated files (like analysis reports)

## Checklist for Publishing Starter Repos

- [ ] All template tokens validated before replacement; missing tokens raise errors
- [ ] Config defaults use `typeof` checks, not `||`, to handle falsy values
- [ ] Required empty folders contain `.gitkeep` files
- [ ] All auto-generated file patterns in `.gitignore`
- [ ] Setup script tested on clean directory; generates working project
- [ ] README clearly states which files are generated vs. version-controlled
- [ ] All file paths use absolute or well-defined relative paths
- [ ] Setup provides clear error messages for common failures
- [ ] Config values tested with boundary cases (0, false, empty strings)
- [ ] LICENSE file included
- [ ] No project-specific references remain in any file

## Related Documentation

- **GitHub:** [https://github.com/boo13/ae-ai-starter](https://github.com/boo13/ae-ai-starter)
- **AI Workflow Guide:** `docs/ai-workflow.md`
- **Recipes Guide:** `docs/recipes.md`
- **Design Doc:** (in Send-GFX repo) `docs/plans/2026-02-25-ae-ai-starter-design.md`
- **Implementation Plan:** (in Send-GFX repo) `docs/plans/2026-02-25-ae-ai-starter-implementation.md`

### Related Concepts

- **ExtendScript/ES3 Development** — All code must be ECMAScript 3 compatible; file I/O uses Adobe's `File`/`Folder` objects; no standard test framework exists
- **AI-Assisted Motion Design** — Analysis reports serve as AI's "window" into AE projects; the development loop is: analyze, share report, AI writes scripts, test in AE, iterate
- **After Effects Scripting** — Key patterns include Essential Properties for layer control, registry patterns to avoid repeated lookups, and marker-based animation timing
