# Verified expression corpus

The JSON records in `functions/` are generated once from the docsforadobe After Effects Expression Reference and committed for offline use. `_provenance.json` records the exact source commit and CC BY 4.0 license.

Regenerate from a local clone:

```bash
node tools/parse_expression_docs.mjs --docs /path/to/after-effects-expression-reference
```

Docs-sourced records remain `docs-sourced` until `Scripts/verified/tools/verify_expressions.jsx` is run in After Effects. Commit its versioned sidecar under `verification/`, then regenerate AE AI Chat knowledge.

Records may include an optional `probe` string containing fixture-aware expression code used only by the verification harness. Probes are never user-facing examples. When no probe is present, the harness falls back to the docs `example`; records with neither are skipped.

The `Footage.dataKeyCount`, `Footage.dataKeyTimes`, `Footage.dataKeyValues`, and `Footage.dataValue` records intentionally have no probes. Verifying them cleanly requires imported data footage, which the self-contained fixture does not create, so the harness skips those methods instead of running their fixture-dependent docs examples.
