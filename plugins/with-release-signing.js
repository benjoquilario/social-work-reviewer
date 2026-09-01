const { withAppBuildGradle } = require("@expo/config-plugins")

/**
 * ─── Release signing that survives `expo prebuild` ────────────────────────
 *
 * The Expo template ships this:
 *
 *   release {
 *       // Caution! In production, you need to generate your own keystore file.
 *       signingConfig signingConfigs.debug
 *   }
 *
 * A release build therefore comes out signed with `debug.keystore` — the one
 * every React Native project ships, password `android`. It installs fine, which
 * is exactly what makes it dangerous: nothing fails until Play rejects the
 * upload with "You uploaded an APK signed with a debug certificate."
 *
 * Editing `android/app/build.gradle` by hand fixes it until the next
 * `expo prebuild`, which regenerates the file from the template and silently
 * puts the debug key back. That is a bug that reappears months later, on the
 * one build you did not check. Hence a plugin: prebuild re-applies it every
 * time.
 *
 * **No secrets live here.** The keystore path and both passwords are read from
 * Gradle properties, which are set in `~/.gradle/gradle.properties` on the
 * machine that signs. This file is safe to commit; that one is not, and is
 * outside the repo precisely so it cannot be.
 *
 * When those properties are absent — a fresh clone, CI, a teammate — the build
 * falls back to the debug key and still works. It just cannot be published,
 * which is the correct outcome for a machine holding no signing key.
 */

const SIGNING_CONFIG = `
        release {
            // Set in ~/.gradle/gradle.properties on the signing machine.
            // Absent elsewhere, and the buildType below falls back to debug.
            if (project.hasProperty('SUREWIN_UPLOAD_STORE_FILE')) {
                storeFile file(SUREWIN_UPLOAD_STORE_FILE)
                storePassword SUREWIN_UPLOAD_STORE_PASSWORD
                keyAlias SUREWIN_UPLOAD_KEY_ALIAS
                keyPassword SUREWIN_UPLOAD_KEY_PASSWORD
            }
        }`

const BUILD_TYPE = `            signingConfig project.hasProperty('SUREWIN_UPLOAD_STORE_FILE') ? signingConfigs.release : signingConfigs.debug`

function addReleaseSigningConfig(contents) {
  if (contents.includes("SUREWIN_UPLOAD_STORE_FILE")) {
    return contents
  }

  // 1. Declare the release signingConfig alongside the template's debug one.
  const debugConfigEnd = `            keyPassword 'android'
        }`

  if (!contents.includes(debugConfigEnd)) {
    throw new Error(
      "[with-release-signing] Could not find the debug signingConfig in " +
        "app/build.gradle. The Expo template changed — update this plugin " +
        "rather than editing the generated file, or the next prebuild will " +
        "sign your release with the debug key."
    )
  }

  let next = contents.replace(debugConfigEnd, debugConfigEnd + SIGNING_CONFIG)

  // 2. Point the release buildType at it.
  const templateLine = `            // Caution! In production, you need to generate your own keystore file.
            // see https://reactnative.dev/docs/signed-apk-android.
            signingConfig signingConfigs.debug`

  if (!next.includes(templateLine)) {
    throw new Error(
      "[with-release-signing] Could not find the release buildType's debug " +
        "signingConfig line in app/build.gradle."
    )
  }

  next = next.replace(templateLine, BUILD_TYPE)

  return next
}

module.exports = function withReleaseSigning(config) {
  return withAppBuildGradle(config, (cfg) => {
    if (cfg.modResults.language !== "groovy") {
      throw new Error(
        "[with-release-signing] Expected a Groovy build.gradle; got " +
          cfg.modResults.language
      )
    }

    cfg.modResults.contents = addReleaseSigningConfig(cfg.modResults.contents)
    return cfg
  })
}
