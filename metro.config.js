const { getDefaultConfig } = require("expo/metro-config")
const { withNativeWind } = require("nativewind/metro")

const config = getDefaultConfig(__dirname)

/**
 * ─── Worker count ─────────────────────────────────────────────────────────
 *
 * Metro transforms modules in a `jest-worker` pool of child processes. On
 * Node 24 those children die on an IPC error partway through a large bundle,
 * and the failure is reported as a **SyntaxError naming whichever file the
 * dead worker happened to hold**:
 *
 *   SyntaxError: components/ui/button.tsx: Jest worker encountered 4 child
 *   process exceptions, exceeding retry limit
 *
 * The named file is arbitrary and changes between runs — it is not the
 * problem, and hours can go into "fixing" a file that was never broken. The
 * giveaway is the second line: a syntax error does not exhaust a retry limit.
 *
 * With one worker Metro transforms in-band and spawns no child processes, so
 * there is no IPC to fail. It is slower, which is why it is scoped to the
 * Node versions that need it rather than applied to everyone.
 *
 * Remove this once Metro ships a jest-worker that survives Node 24 — the test
 * is simply to delete it and run `npx expo export --platform android`.
 */
const nodeMajor = Number(process.versions.node.split(".")[0])

if (nodeMajor >= 24) {
  config.maxWorkers = 1
}

module.exports = withNativeWind(config, {
  input: "./global.css",
  inlineRem: 16,
})
