import { Platform } from "react-native"
import * as Notifications from "expo-notifications"

let isNotificationHandlerConfigured = false

export async function configureNotifications() {
  if (!isNotificationHandlerConfigured) {
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldPlaySound: true,
        shouldSetBadge: false,
        shouldShowBanner: true,
        shouldShowList: true,
      }),
    })
    isNotificationHandlerConfigured = true
  }

  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync("study-reminders", {
      name: "Study reminders",
      importance: Notifications.AndroidImportance.DEFAULT,
      vibrationPattern: [0, 180, 120, 180],
      lightColor: "#38BDF8",
      // `sound` is deliberately absent. On a channel this field names a sound
      // *file* that must be bundled through the expo-notifications config
      // plugin - there is no magic "default" value. Omitting the key is what
      // selects the system default; passing the string "default" sends Android
      // looking for a resource by that name, which logs
      // "Custom sound 'default' not found in native app" and leaves the channel
      // without the sound it was asking for.
    })
  }
}

export async function getNotificationPermissionStatus() {
  const settings = await Notifications.getPermissionsAsync()
  return settings.status
}

export async function requestNotificationPermissions() {
  const settings = await Notifications.requestPermissionsAsync()
  return settings.status
}

export async function scheduleDailyStudyReminder(params?: {
  hour?: number
  minute?: number
}) {
  const hour = params?.hour ?? 19
  const minute = params?.minute ?? 0

  await cancelDailyStudyReminders()

  return Notifications.scheduleNotificationAsync({
    content: {
      title: "Ready for today’s review?",
      body: "Open Reviewer and finish a quick board exam drill.",
      sound: true,
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DAILY,
      hour,
      minute,
      channelId: Platform.OS === "android" ? "study-reminders" : undefined,
    },
  })
}

export async function cancelDailyStudyReminders() {
  const scheduled = await Notifications.getAllScheduledNotificationsAsync()
  await Promise.all(
    scheduled
      .filter((item) => item.content.title === "Ready for today’s review?")
      .map((item) => Notifications.cancelScheduledNotificationAsync(item.identifier))
  )
}

export async function hasScheduledStudyReminder() {
  const scheduled = await Notifications.getAllScheduledNotificationsAsync()
  return scheduled.some(
    (item) => item.content.title === "Ready for today’s review?"
  )
}
