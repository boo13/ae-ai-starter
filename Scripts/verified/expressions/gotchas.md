# AE Expression Gotchas

## Expression and scripting engines are different

Expressions cannot call the After Effects scripting DOM. Do not use `app`, `setValue()`, `addProperty()`, `File`, or `Folder` inside an expression. Assign expression source as a string from ExtendScript.

Use `var` and broadly compatible syntax when a project may use the Legacy ExtendScript expression engine. The JavaScript expression engine is named `javascript-1.0`; the legacy engine is named `extendscript`.

## Random values

`seedRandom(offset, timeless)` controls the random stream. Pass `true` for `timeless` when the result must remain static across frames. Calling `random()` without a stable seed produces time-varying results.

## Keyframe loops

`loopIn()`, `loopOut()`, and their duration variants require at least two keyframes. Check `numKeys` and return `value` when there are not enough keys.

## sourceRectAtTime

`sourceRectAtTime()` can be expensive when repeated. Call it once in an expression and reuse the returned rectangle. Include extents only when stroke and paragraph-text bounds are required.

## Property dimensions

Expression results must match the host property dimension. Position may be 2D or 3D; colors require four values; scalar properties require a number. Preserve extra dimensions when adding vectors.

## Time and frames

Expression time values are seconds. Use `framesToTime()` and `timeToFrames()` instead of assuming a frame rate.

## Errors and disabled expressions

Setting `.expression` can succeed while evaluation fails. Force evaluation with `valueAtTime()` and read `.expressionError`. Never treat assignment alone as proof that the expression works.
