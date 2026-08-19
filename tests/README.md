# Bug Hunt tests

Headless smoke tests for `game.html`. No dependencies — plain node.

    node tests/smoke.js

`harness.js` stubs the browser (window/document/canvas/localStorage), appends
the debug hooks from `hooks.js` inside the game IIFE, and evals the game
script. The hooks never ship: production `game.html` is untouched.

History: earlier versioned suites (v19–v31) lived in the session scratchpad
and were repeatedly destroyed by container recycles — this in-repo suite is
the consolidated, durable replacement.
