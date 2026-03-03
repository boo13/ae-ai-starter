---
title: "feat: Template Clarity and Onboarding Improvements"
type: feat
status: completed
date: 2026-03-03
brainstorm: docs/brainstorms/2026-03-03-template-clarity-brainstorm.md
---

# Template Clarity and Onboarding Improvements

## Overview

A documentation and hygiene pass that answers the fundamental question every new user has: "What does this project actually do, and what do I do next?" The template's core mechanics are solid, but the story around them is muddled. A motion designer who clones this repo and runs setup should immediately understand the value and know their next step.

## Problem Statement / Motivation

The ae-ai-starter template works well technically but fails at first-contact clarity. Three specific problems:

1. **The README mixes "why" with "how"** — implementation details compete with the value proposition. A motion designer sees library function signatures before understanding what the project does for them.
2. **AGENTS.md has stale function names** — AI assistants reading it will generate scripts that fail at runtime because documented function names don't match the actual code.
3. **No bridge from "setup complete" to "productive"** — the quickstart ends at "start talking to AI" without explaining how to actually do that. The existing `example/` directory shows a complex multi-recipe workflow, which is too advanced for a first automation.

## Proposed Solution

Four targeted work streams, executed in dependency order:

1. Verify repo hygiene (confirm .gitignore correctness)
2. Fix AGENTS.md accuracy and discoverability
3. Create a first-automation walkthrough
4. Rewrite README for narrative clarity

## Technical Approach

### Work Stream 1: Repo Hygiene Verification

**Status: All items confirmed as no-ops by research.** Documenting for completeness.

Research verified:
- `WorkReelGraphics (converted).aep` — exists on disk, NOT tracked in git (`.gitignore` covers `*.aep`)
- `Scripts/config.jsxinc` — NOT tracked, correctly gitignored
- `Scripts/panel/project_panel.jsx` — NOT tracked, covered by `Scripts/panel/*_panel.jsx` glob

**Action:** Verify `.gitignore` is correct and sufficient. No `git rm --cached` needed.

**Decision needed:** Should `docs/brainstorms/` be committed? Currently untracked. Recommend committing — design decision documentation has value for future contributors.

---

### Work Stream 2: AGENTS.md Fixes

Edit `AGENTS.md` (the source file — `CLAUDE.md` and `GEMINI.md` are symlinks to it).

#### 2a. Fix function name mismatches (line 51-52)

| Current in AGENTS.md | Actual function name | File:line |
|---|---|---|
| `nowTimestamp()` | `formatTimestamp()` | `Scripts/lib/io.jsxinc:101` |
| `isSupportedImage(ext)` | `isSupportedImageExtension(ext)` | `Scripts/lib/helpers.jsxinc:31` |
| `findNestedProperty(layer, name)` | `findNestedPropertyByName(group, targetName)` | `Scripts/lib/helpers.jsxinc:124` |
| `ReportWriter(reportsDir, baseName)` | `createReportWriter()` (factory, no args) | `Scripts/lib/report_writer.jsxinc:34` |

#### 2b. Add missing function documentation

Three functions exist in the libraries but are not listed in AGENTS.md:

- **helpers.jsxinc** — `safeTrim(s)` (line 49), `getNumericValue(prop)` (line 97)
- **io.jsxinc** — `writeJsonFile(file, data)` (line 42)

Updated library documentation should read:

```markdown
## Shared Libraries (`Scripts/lib/`)

- **io.jsxinc** -- `readJsonFile(file)`, `writeJsonFile(file, data)`, `writeTextFile(file, content)`, `ensureFolder(path)`, `formatTimestamp()`
  - Include with `#include "lib/io.jsxinc"`
- **helpers.jsxinc** -- `setTextPropertyValue(prop, text)`, `isSupportedImageExtension(ext)`, `countWords(str)`, `safeTrim(s)`, `getNumericValue(prop)`, `findNestedPropertyByName(group, targetName)`
  - Include with `#include "lib/helpers.jsxinc"`
- **report_writer.jsxinc** -- `createReportWriter()` returns a builder with `addMarkdown`, `addSection`, `addSubsection`, `addList`, `addTable`, `setJson`, `build` methods
  - Include with `#include "lib/report_writer.jsxinc"`
```

Note the per-library `#include` instructions — the current AGENTS.md has a single include instruction that implies one include covers all three libraries. This causes AI assistants to generate scripts that fail with "function not defined" errors.

#### 2c. Add "When to use" guidance for recipes

Add a usage hint to each recipe entry. Content condensed from the existing recipe READMEs (`Scripts/recipes/*/README.md`):

```markdown
## Recipes (`Scripts/recipes/`)

Copy and adapt these patterns instead of writing from scratch:

- **repeating-elements** -- Populate N layers from a data array
  - *Use when:* You need to populate multiple similar layers from a data array (list items, cards, slides, credits)
- **image-swap** -- Import images, replace layer sources with fit/fill scaling
  - *Use when:* You need to import external images and replace layer sources with proper scaling (photo galleries, thumbnails, product shots)
- **data-timing** -- Calculate display durations from word counts
  - *Use when:* Display duration should vary based on text length (subtitle timing, auto-paced slideshows, narration sync)

Each recipe has a README with usage instructions.
```

---

### Work Stream 3: First Automation Walkthrough

**New file:** `docs/first-automation.md`

#### Structure

```
# Your First Automation

## Before You Start
- Prerequisites: setup.jsx has been run, analysis report exists
- What you'll learn: the describe → AI writes → run in AE loop

## Setting Up Your AI Assistant

### Claude Code (recommended)
- Open terminal in project directory
- Claude Code reads CLAUDE.md automatically
- Point it to the analysis report: "Read Scripts/reports/analysis.md"

### Other AI Assistants (ChatGPT, Gemini, etc.)
- Copy the contents of AGENTS.md into your conversation
- Copy the contents of Scripts/reports/analysis.md
- The AI now has the same context as Claude Code

## Example Prompts

### Example 1: Read your project structure
- Prompt: "What compositions are in my project and what layers do they contain?"
- Expected: AI reads analysis.md and summarizes the structure
- No script needed — this validates the AI has context

### Example 2: Change text on a layer
- Prompt: "Write a script that changes the text on [layer name] to [new text]"
- Expected output: ~15-line script using setTextPropertyValue from helpers
- How to run: File > Scripts > Run Script File

### Example 3: Batch update multiple layers
- Prompt: "Write a script that reads data from Input/data.json and updates [layers]"
- Expected output: script using readJsonFile + setTextPropertyValue
- How to run: same as above

## When Things Go Wrong
- How to read ExtendScript error dialogs
- Describing errors back to the AI
- When to re-run analysis (after changing your AE template)
- Common issues: wrong include path, layer name mismatch, ES6 syntax in ES3

## Where to Save Scripts
- Save AI-generated scripts in `Scripts/` at the project root
- This is where `#include` paths resolve from
- Name them descriptively: `update_headlines.jsx`, `swap_photos.jsx`

## Next Steps
- Explore the recipes in `Scripts/recipes/` for common patterns
- See `example/` for a complete multi-recipe workflow
- Read `docs/ai-workflow.md` for advanced tips
```

#### Key decisions:
- **Examples are generic** — reference `[layer name]` patterns, not the example project's specific layers. The user's own analysis report provides the real layer names.
- **Claude Code is the primary path** with a sidebar for paste-based assistants.
- **Includes error recovery** — "When Things Go Wrong" section covers the most common failure modes.
- **Includes "Where to Save Scripts"** — one-liner guidance that prevents confusion.

---

### Work Stream 4: README Rewrite

**File:** `README.md` (89 lines currently)

#### Target structure:

```markdown
# ae-ai-starter

Use AI assistants to automate your After Effects projects.

## What This Does

[2-3 sentences: this template gives AI assistants the context they need
to write ExtendScript automation for your AE projects. You describe what
you want, the AI writes the script, you run it in After Effects.]

## Quick Start

1. Clone this repo (or click "Use this template" on GitHub)
2. Open your After Effects project (.aep)
3. Run `Scripts/setup.jsx` via File > Scripts > Run Script File
4. Follow the setup dialog to configure your project
5. [New] Open your AI assistant and follow `docs/first-automation.md`

## How It Works

[Concise explanation of the workflow loop:]
- **Analyze**: setup.jsx scans your AE project and produces a plain-text
  report the AI can read
- **Describe**: Tell the AI what you want to automate
- **Run**: The AI writes an ExtendScript, you run it in AE
- **Iterate**: Change your template, re-analyze, keep going

## What's Included

- `Scripts/analyze/` — Project analysis system
- `Scripts/lib/` — Shared ES3 utilities for AI-generated scripts
- `Scripts/recipes/` — Copy-and-adapt patterns for common tasks
- `Scripts/panel/` — Optional ScriptUI panel (configured during setup)
- `docs/` — Workflow guides and reference
- `example/` — Complete working example

## Requirements

- After Effects (any recent version)
- An AI assistant (Claude Code, ChatGPT, Cursor, etc.)

## Learn More

- [Your First Automation](docs/first-automation.md) — Step-by-step walkthrough
- [AI Workflow Guide](docs/ai-workflow.md) — Advanced tips and patterns
- [Recipes Reference](docs/recipes.md) — When to use each recipe
- [Complete Example](example/README.md) — Multi-recipe workflow
```

#### Key changes from current README:
- **Value proposition leads** — "Use AI assistants to automate your After Effects projects" replaces the generic "AI-friendly starter kit"
- **Quickstart step 5 bridges to walkthrough** — no more "start talking to AI" without guidance
- **"How It Works" is the workflow loop**, not implementation components
- **"What's Included" replaces "File Structure"** — directory purpose over tree diagram
- **Requirements adds "An AI assistant"** — the most important requirement, currently implicit
- **"Learn More" section with clear links** — replaces scattered references
- **Removed**: detailed library function listings, scripting pattern examples, AE scripting reference links (all belong in AGENTS.md or docs/)

---

## Acceptance Criteria

### Work Stream 1: Hygiene
- [x] `.gitignore` verified as correct and sufficient
- [x] No files are tracked that shouldn't be
- [x] Decision made on `docs/brainstorms/` tracking

### Work Stream 2: AGENTS.md
- [x] All 4 function name mismatches fixed
- [x] All 3 missing functions added
- [x] Per-library `#include` instructions added
- [x] Recipe "when to use" guidance added
- [x] `report_writer.jsxinc` description matches actual `createReportWriter()` API

### Work Stream 3: Walkthrough
- [x] `docs/first-automation.md` created
- [x] Covers Claude Code setup (primary) and paste-based assistants (secondary)
- [x] Includes 2-3 generic example prompts with expected outputs
- [x] Includes error recovery section
- [x] Includes "where to save scripts" guidance
- [x] Points to recipes and advanced patterns for next steps

### Work Stream 4: README
- [x] Value proposition is clear in first 2 lines
- [x] Quickstart includes link to walkthrough as step 5
- [x] "How It Works" explains the workflow loop, not implementation details
- [x] "What's Included" is a directory-purpose list, not a full tree
- [x] Requirements lists "An AI assistant" explicitly
- [x] "Learn More" section links to walkthrough, ai-workflow, recipes, example

## Success Metrics

- A motion designer with no coding experience can go from `git clone` to running their first AI-generated script by following only the README and walkthrough
- An AI assistant reading AGENTS.md generates scripts that work on the first attempt (no function-not-found errors from stale names or missing includes)

## Dependencies & Risks

**Dependencies:**
- Work Stream 2 before 3 (walkthrough needs correct function names)
- Work Stream 3 before 4 (README links to walkthrough by filename)
- Work Stream 1 is independent

**Risks:**
- Low: walkthrough examples may not cover every AE project structure. Mitigated by using generic patterns that reference the user's analysis report.
- Low: README may lose SEO/discoverability by removing technical detail. Mitigated by keeping all detail in AGENTS.md and docs/ where it's more useful.

## References & Research

### Internal References
- Brainstorm: `docs/brainstorms/2026-03-03-template-clarity-brainstorm.md`
- Solutions doc: `docs/solutions/integration-issues/extracting-ae-automation-starter-kit-from-project-codebase.md`
- Current AGENTS.md function docs: `AGENTS.md:49-53`
- Actual function definitions: `Scripts/lib/helpers.jsxinc`, `Scripts/lib/io.jsxinc`, `Scripts/lib/report_writer.jsxinc`
- Recipe READMEs: `Scripts/recipes/*/README.md`
- Current README: `README.md`
- AI workflow guide: `docs/ai-workflow.md`

### External References
- Community AE Scripting Guide: https://ae-scripting.docsforadobe.dev/
- Adobe AE User Guide: https://helpx.adobe.com/after-effects/user-guide.html
