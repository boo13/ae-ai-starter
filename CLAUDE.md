# {{PROJECT_NAME}}

{{PROJECT_DESCRIPTION}}

## ExtendScript (ES3) Language Constraints

**CRITICAL**: All scripts must be compatible with ExtendScript, which is based on ECMAScript 3.

- Use `var` for all variable declarations (no `let` or `const`)
- Use `function` keyword syntax (no arrow functions)
- Use traditional `for` loops (no `for...of`, `for...in` is limited)
- Use string concatenation with `+` (no template literals)
- Use `Array.prototype` methods explicitly or loops (limited array methods)
- No spread operator, destructuring, or modern JS features
- File I/O uses Adobe's `File` and `Folder` objects

## Project Structure

- `Scripts/analyze/` -- Project analysis system (generates reports)
- `Scripts/lib/` -- Shared ES3 utilities
- `Scripts/recipes/` -- Optional automation patterns
- `Scripts/panel/` -- ScriptUI panel (if enabled)
- `Scripts/reports/` -- Generated analysis reports (committed to git)
- `Input/` -- Data files (JSON, etc.)

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
