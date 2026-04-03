# Tests

ExtendScript tests that run inside After Effects.

## Running Tests

1. Open After Effects (any project or no project)
2. File > Scripts > Run Script File...
3. Select the test file you want to run

## Test Files

- `test_helpers.jsx` — Tests for `Scripts/lib/helpers.jsxinc`
- `test_shape_layer.jsx` — Verifies shape-layer helper behavior
- `test_perlin.jsx` — Validates the Flow Field Perlin-noise engine
- `test_flow_field_integration.jsx` — End-to-end Flow Field builder validation

`test_stock_ticker_integration.jsx` still targets the legacy `stock_ticker` demo path and should be treated as historical until that test is migrated to `examples/ticker-data`.

## Writing Tests

Follow the pattern in `test_helpers.jsx`:
- Use the `addTest(name, fn)` / `assert(condition, message)` pattern
- `#include` or `$.evalFile` the module under test
- Pure functions can be tested without an open AEP
- AE-dependent functions require a project to be open
