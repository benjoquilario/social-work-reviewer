import { memo } from "react"

import type { MemberSettings } from "@/lib/member/settings"
import { Text } from "@/components/ui/text"
import { SettingsStepperRow, SettingsSwitchRow } from "./settings-rows"
import { SettingsSection } from "./settings-section"

/**
 * Goals and reminders.
 *
 * `reminderTime` is stored as `"19:00"` **text** with a `timezone` beside it,
 * because it is a wall-clock time rather than an instant — 7pm should still be
 * 7pm when the member travels. The local notification is scheduled from those
 * two; nothing is converted to UTC.
 */

type ReminderSectionProps = {
  settings: MemberSettings
  onChange: (patch: Partial<MemberSettings>) => void
}

function parseHour(reminderTime: string) {
  const [hour] = reminderTime.split(":")
  const parsed = Number(hour)

  return Number.isFinite(parsed) ? Math.min(Math.max(parsed, 0), 23) : 19
}

function formatHour(hour: number) {
  const suffix = hour < 12 ? "am" : "pm"
  const display = hour % 12 === 0 ? 12 : hour % 12

  return `${display}${suffix}`
}

export const ReminderSection = memo(function ReminderSection({
  settings,
  onChange,
}: ReminderSectionProps) {
  const hour = parseHour(settings.reminderTime)

  return (
    <SettingsSection
      title="Goals and reminders"
      description="A daily target, and a nudge if you want one."
      footer={
        settings.reminderEnabled ? (
          <Text variant="caption">
            Reminders use your local time ({settings.timezone}).
          </Text>
        ) : null
      }
    >
      <SettingsStepperRow
        label="Daily goal"
        description="Questions to answer each day."
        value={settings.dailyGoalQuestions}
        min={0}
        max={200}
        step={5}
        formatValue={(value) => (value === 0 ? "Off" : String(value))}
        onChange={(dailyGoalQuestions) => onChange({ dailyGoalQuestions })}
      />

      <SettingsSwitchRow
        label="Daily reminder"
        description="One notification if you have not studied yet."
        value={settings.reminderEnabled}
        onChange={(reminderEnabled) => onChange({ reminderEnabled })}
      />

      {settings.reminderEnabled ? (
        <SettingsStepperRow
          label="Remind me at"
          value={hour}
          min={5}
          max={23}
          step={1}
          formatValue={formatHour}
          onChange={(nextHour) =>
            onChange({
              reminderTime: `${String(nextHour).padStart(2, "0")}:00`,
            })
          }
        />
      ) : null}
    </SettingsSection>
  )
})

type NotificationSectionProps = ReminderSectionProps

export const NotificationSection = memo(function NotificationSection({
  settings,
  onChange,
}: NotificationSectionProps) {
  return (
    <SettingsSection
      title="Notifications"
      description="What we may send you."
    >
      <SettingsSwitchRow
        label="Announcements"
        description="Board exam dates, new papers, results."
        value={settings.notifyAnnouncements}
        onChange={(notifyAnnouncements) => onChange({ notifyAnnouncements })}
      />

      <SettingsSwitchRow
        label="Streak reminders"
        description="A nudge before a streak lapses."
        value={settings.notifyStreak}
        onChange={(notifyStreak) => onChange({ notifyStreak })}
      />

      <SettingsSwitchRow
        label="Community replies"
        description="When somebody answers your post."
        value={settings.notifyCommunity}
        onChange={(notifyCommunity) => onChange({ notifyCommunity })}
      />

      <SettingsSwitchRow
        label="Show me on the leaderboard"
        description="Your name and score alongside other members."
        value={settings.showOnLeaderboard}
        onChange={(showOnLeaderboard) => onChange({ showOnLeaderboard })}
      />
    </SettingsSection>
  )
})
