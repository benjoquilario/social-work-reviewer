import { memo } from "react"
import { View } from "react-native"

import {
  formatAnnouncementDate,
  type Announcement,
} from "@/lib/announcements"
import { withOpacity } from "@/lib/theme"
import { useThemePalette } from "@/hooks/use-theme"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { MarkdownContent } from "@/components/ui/markdown-content"
import { Text } from "@/components/ui/text"

/**
 * One announcement.
 *
 * `content` is richtext from the dashboard, so it renders through the markdown
 * component rather than as a plain string — an editor who writes a bulleted
 * list should get a bulleted list, not asterisks.
 *
 * Unread is marked with a dot rather than a "NEW" badge. The badge competed
 * with the audience chip beside it, and two badges on one card means neither
 * reads as important.
 */

const AUDIENCE_LABELS: Partial<Record<Announcement["audience"], string>> = {
  premium: "For members",
  free: "Free plan",
  expired: "Your access ended",
}

type AnnouncementCardProps = {
  announcement: Announcement
  isUnread: boolean
}

export const AnnouncementCard = memo(function AnnouncementCard({
  announcement,
  isUnread,
}: AnnouncementCardProps) {
  const theme = useThemePalette()
  const audienceLabel = AUDIENCE_LABELS[announcement.audience]

  return (
    <Card
      style={
        isUnread
          ? { borderColor: withOpacity(theme.primary, 0.35) }
          : undefined
      }
    >
      <CardContent className="gap-3">
        <View className="flex-row items-center justify-between gap-2">
          <View className="flex-1 flex-row items-center gap-2">
            {isUnread ? (
              <View
                accessibilityElementsHidden
                importantForAccessibility="no-hide-descendants"
                className="h-2 w-2 rounded-full"
                style={{ backgroundColor: theme.primary }}
              />
            ) : null}

            {audienceLabel ? (
              <Badge tone="muted" size="sm">
                {audienceLabel}
              </Badge>
            ) : null}
          </View>

          <Text variant="caption">
            {formatAnnouncementDate(announcement.publishedAt)}
          </Text>
        </View>

        <Text variant="subheading">{announcement.title}</Text>

        <MarkdownContent markdown={announcement.content} />
      </CardContent>
    </Card>
  )
})
