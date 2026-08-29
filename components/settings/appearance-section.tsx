import { memo } from "react"

import type { ThemeMode } from "@/lib/app-preferences"
import type {
  AppLanguage,
  FontScale,
  MemberSettings,
} from "@/lib/member/settings"
import {
  SettingsOptionRow,
  SettingsSwitchRow,
  type SettingsOption,
} from "./settings-rows"
import { SettingsSection } from "./settings-section"

/**
 * Appearance and feel.
 *
 * `theme` lives on `user_settings` so it follows the member to a new device,
 * *and* in the local preference store so the app can paint the right colours on
 * the very first frame — before any network call. The screen writes both; the
 * local one is the render source and the stored one is the source of truth on a
 * fresh install.
 */

const THEME_OPTIONS: SettingsOption<ThemeMode>[] = [
  { value: "system", label: "System", description: "Follow your device." },
  { value: "light", label: "Light", description: "Bright, for daytime." },
  { value: "dark", label: "Dark", description: "Lower glare, for evenings." },
]

const FONT_SCALE_OPTIONS: SettingsOption<FontScale>[] = [
  { value: "small", label: "Small" },
  { value: "medium", label: "Default" },
  { value: "large", label: "Large" },
  { value: "xlarge", label: "Largest" },
]

const LANGUAGE_OPTIONS: SettingsOption<AppLanguage>[] = [
  { value: "en", label: "English" },
  { value: "fil", label: "Filipino" },
]

type AppearanceSectionProps = {
  settings: MemberSettings
  themeMode: ThemeMode
  onChangeSettings: (patch: Partial<MemberSettings>) => void
  onChangeThemeMode: (mode: ThemeMode) => void
}

export const AppearanceSection = memo(function AppearanceSection({
  settings,
  themeMode,
  onChangeSettings,
  onChangeThemeMode,
}: AppearanceSectionProps) {
  return (
    <SettingsSection
      title="Appearance"
      description="How the app looks and feels."
    >
      <SettingsOptionRow
        label="Theme"
        options={THEME_OPTIONS}
        value={themeMode}
        onChange={(mode) => {
          onChangeThemeMode(mode)
          onChangeSettings({ theme: mode })
        }}
      />

      <SettingsOptionRow
        label="Text size"
        options={FONT_SCALE_OPTIONS}
        value={settings.fontScale}
        onChange={(fontScale) => onChangeSettings({ fontScale })}
      />

      <SettingsOptionRow
        label="Language"
        options={LANGUAGE_OPTIONS}
        value={settings.language}
        onChange={(language) => onChangeSettings({ language })}
      />

      <SettingsSwitchRow
        label="Sound"
        description="A short tone when an answer is marked."
        value={settings.soundEnabled}
        onChange={(soundEnabled) => onChangeSettings({ soundEnabled })}
      />

      <SettingsSwitchRow
        label="Haptics"
        description="A tap you can feel when you choose."
        value={settings.hapticsEnabled}
        onChange={(hapticsEnabled) => onChangeSettings({ hapticsEnabled })}
      />
    </SettingsSection>
  )
})
