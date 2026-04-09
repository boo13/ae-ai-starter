# GitHub Issue Templates Design

**Date:** 2026-04-09
**Issue:** boo13/ae-ai-starter#7

## Summary

Add two YAML form templates to `.github/ISSUE_TEMPLATE/` to guide contributors toward providing useful information when filing issues. No blank issue option; no `config.yml`.

## Files

### `.github/ISSUE_TEMPLATE/bug_report.yml`

Fields:
1. **AE version** — dropdown (2022, 2023, 2024, 2025, Other), required
2. **What happened** — textarea, required
3. **Steps to reproduce** — textarea, required
4. **`last_run.json` output** — textarea, optional (paste contents from `Scripts/runs/last_run.json`)

### `.github/ISSUE_TEMPLATE/feature_request.yml`

Fields:
1. **Problem / motivation** — textarea, required
2. **Proposed solution** — textarea, required
3. **AE version(s) this affects** — checkboxes (2022, 2023, 2024, 2025), optional
4. **Additional context** — textarea, optional

## Decisions

- YAML form templates (not markdown) — structured fields prevent empty submissions
- No `config.yml` — blank issues not explicitly disabled at repo level
- `last_run.json` field on bug report — aligns with project's diagnostic protocol
- OS field omitted — AE scripting issues are rarely OS-specific
