import { useEffect, useRef } from "react"

import {
  cancelDailyStudyReminders,
  getNotificationPermissionStatus,
  requestNotificationPermissions,
  scheduleDailyStudyReminder,
} from "@/lib/notifications"
import { useMemberSettings } from "./use-member-settings"

/**
 * ─── The daily reminder ───────────────────────────────────────────────────
 *
 * Keeps the scheduled local notification in step with
 * `user_settings.reminderEnabled` and `reminderTime`.
 *
 * `reminderTime` is stored as `"19:00"` **text**, with `timezone` beside it,
 * because it is a wall-clock time rather than an instant: 7pm should still be
 * 7pm after the member flies to Dubai. So the hour and minute are handed
 * straight to a DAILY trigger, which fires on device-local time — nothing is
 * converted to UTC and nothing is stored as one.
 */

function parseReminderTime(value: string) {
  const [rawHour, rawMinute] = value.split(":")
  const hour = Number(rawHour)
  const minute = Number(rawMinute)

  return {
    hour: Number.isFinite(hour) ? Math.min(Math.max(hour, 0), 23) : 19,
    minute: Number.isFinite(minute) ? Math.min(Math.max(minute, 0), 59) : 0,
  }
}

export function useStudyReminder() {
  const { settings, isLoading } = useMemberSettings()

  // The last state actually applied to the OS, so a re-render with unchanged
  // settings does not cancel and re-register the notification.
  const appliedRef = useRef<string | null>(null)

  useEffect(() => {
    if (isLoading) {
      return
    }

    const signature = settings.reminderEnabled
      ? `on:${settings.reminderTime}`
      : "off"

    if (appliedRef.current === signature) {
      return
    }

    appliedRef.current = signature

    void (async () => {
      try {
        if (!settings.reminderEnabled) {
          await cancelDailyStudyReminders()
          return
        }

        // Only ask when they have actually turned the reminder on. A
        // permission prompt on first launch, before anyone has asked for a
        // notification, is the fastest way to get it denied for good.
        const status = await getNotificationPermissionStatus()
        const granted =
          status === "granted" ||
          (await requestNotificationPermissions()) === "granted"

        if (!granted) {
          appliedRef.current = null
          return
        }

        await scheduleDailyStudyReminder(
          parseReminderTime(settings.reminderTime)
        )
      } catch (error) {
        appliedRef.current = null
        console.warn("[reminder] Could not update the daily reminder:", error)
      }
    })()
  }, [isLoading, settings.reminderEnabled, settings.reminderTime])
}
