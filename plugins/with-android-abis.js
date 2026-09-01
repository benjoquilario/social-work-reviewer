const { withGradleProperties } = require("@expo/config-plugins")

/**
 * ─── Which CPU architectures to compile ───────────────────────────────────
 *
 * The template builds four: `armeabi-v7a,arm64-v8a,x86,x86_64`. Two of those
 * exist only for emulators — no Android phone or tablet on sale has an x86
 * CPU — and each one carries its own full copy of every native library, which
 * for React Native means `libreactnative.so` and friends several times over.
 *
 * **This does not change what a user downloads.** An AAB is split by Play, so a
 * phone only ever fetches the slice matching its own CPU. What it changes is
 * the artifact you upload and the time you wait for it: roughly half the AAB
 * and a large chunk of the build, on every EAS build, forever.
 *
 * The cost is that a release build will not install on an x86_64 emulator.
 * Debug builds are unaffected, and arm64 emulator images exist on Apple
 * silicon and in recent Android Studio. If you need release-on-x86 emulator
 * testing back, add the two entries here.
 *
 * It lives in a plugin because `android/gradle.properties` is generated:
 * editing it directly works until the next `expo prebuild` — which EAS runs on
 * every single build — and then silently reverts.
 */

const ARCHITECTURES = "armeabi-v7a,arm64-v8a"

module.exports = function withAndroidAbis(config) {
  return withGradleProperties(config, (cfg) => {
    const key = "reactNativeArchitectures"
    const existing = cfg.modResults.find(
      (item) => item.type === "property" && item.key === key
    )

    if (existing) {
      existing.value = ARCHITECTURES
    } else {
      cfg.modResults.push({ type: "property", key, value: ARCHITECTURES })
    }

    return cfg
  })
}
