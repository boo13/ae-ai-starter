# Verified corpus tools

Run these scripts manually from After Effects with File > Scripts > Run Script File.

- `verify_expressions.jsx` evaluates docs-sourced expression examples and writes a versioned sidecar under `expressions/verification/`.
- `discover_global_enums.jsx` records enum labels and values in `properties/global-enums.json`.
- `verify_corpus.jsx` re-probes effect properties and writes a versioned drift report under `effects/`.
- `discover_effect.jsx` captures an individual effect, including scriptable min/max ranges when After Effects exposes them.

Review generated JSON before committing it. Verification reports are version-specific evidence, not a replacement for reviewing failures and skipped records.
