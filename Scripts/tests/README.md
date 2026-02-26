# Tests

ExtendScript tests that run inside After Effects.

## Running Tests

1. Open After Effects (any project or no project)
2. File > Scripts > Run Script File...
3. Select the test file you want to run

## Test Files

- `test_helpers.jsx` — Tests for `Scripts/lib/helpers.jsxinc`

## Writing Tests

Follow the pattern in `test_helpers.jsx`:
- Use the `addTest(name, fn)` / `assert(condition, message)` pattern
- `#include` or `$.evalFile` the module under test
- Pure functions can be tested without an open AEP
- AE-dependent functions require a project to be open
