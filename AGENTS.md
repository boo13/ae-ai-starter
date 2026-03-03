# {{PROJECT_NAME}}

{{PROJECT_DESCRIPTION}}

> If you see `{{placeholders}}` above, the user hasn't run `Scripts/setup.jsx` yet. Ask them to run it in After Effects first.

## AI Workflow

1. Read `Scripts/reports/analysis.md` to understand the AE project
2. Write ES3 scripts using `Scripts/lib/` helpers and `Scripts/recipes/` patterns
3. User runs scripts in AE via File > Scripts > Run Script File
4. If using the panel: user clicks panel buttons to run AI-authored actions
5. After AE template changes, ask user to re-run `Scripts/analyze/run_analysis.jsx`

## ExtendScript (ES3) Language Constraints

**CRITICAL**: All scripts must be compatible with ExtendScript, which is based on ECMAScript 3.

- Use `var` for all variable declarations (no `let` or `const`)
- Use `function` keyword syntax (no arrow functions)
- Use traditional `for` loops (no `for...of`, `for...in` is limited)
- Use string concatenation with `+` (no template literals)
- Use `Array.prototype` methods explicitly or loops (limited array methods)
- No spread operator, destructuring, or modern JS features
- File I/O uses Adobe's `File` and `Folder` objects

## Scripting Patterns

- Wrap all changes in `app.beginUndoGroup("Label"); ... app.endUndoGroup()`
- Use `#include "lib/helpers.jsxinc"` -- NOT `import` or `require`
- Access layers: `comp.layer(index)` (1-based) or `comp.layer("Name")`
- Access properties: `layer.property("Transform").property("Position")`
- File paths: use `new File(path)` and `new Folder(path)`, not Node.js APIs

## Project Structure

- `Scripts/analyze/` -- Project analysis system (generates reports)
- `Scripts/lib/` -- Shared ES3 utilities
- `Scripts/recipes/` -- Optional automation patterns
- `Scripts/panel/` -- ScriptUI panel (if enabled)
- `Scripts/reports/` -- Generated analysis reports (committed to git)
- `Scripts/tests/` -- Unit tests (run in AE via File > Scripts)
- `Input/` -- Data files (JSON, etc.)
- `docs/` -- Workflow guides and recipe reference
- `example/` -- Complete working example project

## Shared Libraries (`Scripts/lib/`)

Include with `#include "lib/helpers.jsxinc"` at top of scripts.

- **io.jsxinc** -- `readJsonFile(file)`, `writeTextFile(file, content)`, `ensureFolder(path)`, `nowTimestamp()`
- **helpers.jsxinc** -- `setTextPropertyValue(prop, text)`, `isSupportedImage(ext)`, `countWords(str)`, `findNestedProperty(layer, name)`
- **report_writer.jsxinc** -- `ReportWriter(reportsDir, baseName)` for dual MD/JSON output

## Recipes (`Scripts/recipes/`)

Copy and adapt these patterns instead of writing from scratch:

- **repeating-elements** -- Populate N layers from a data array
- **image-swap** -- Import images, replace layer sources with fit/fill scaling
- **data-timing** -- Calculate display durations from word counts

Each recipe has a README with usage instructions.

## AE Project Analysis

The file `Scripts/reports/analysis.md` contains a snapshot of the AE project structure
including all compositions, layers, properties, and expressions. **Read this file to
understand the project.** If it seems out of date, ask the user to re-run analysis
(`Scripts/analyze/run_analysis.jsx`).

## Main Compositions

The primary composition is **{{MAIN_COMP}}**.

{{MAIN_COMP_DETAILS}}

## After Effects Scripting Reference

- **Community Scripting Guide**: <https://ae-scripting.docsforadobe.dev/>
- **Adobe AE User Guide**: <https://helpx.adobe.com/after-effects/user-guide.html>
