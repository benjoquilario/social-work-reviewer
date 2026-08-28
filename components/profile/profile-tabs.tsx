import { memo } from "react"
import type { ProfileTab } from "@/contexts/profile-context"
import { Pressable, View } from "react-native"

import { cn } from "@/lib/utils"
import { Text } from "@/components/ui/text"

const TABS: { key: ProfileTab; label: string }[] = [
  { key: "details", label: "Details" },
  { key: "activity", label: "Activity" },
  { key: "performance", label: "Performance" },
]

/**
 * Segmented control, not three buttons in a box.
 *
 * The previous rail nested a bordered container around three bordered pills,
 * filled the active one with `primary`, and set its labels in 12px uppercase
 * with 1px tracking — which put "PERFORMANCE" over the width of a third of a
 * phone and truncated it. A single muted track with one raised pill is the
 * platform-native idiom, needs one border instead of four, and leaves the
 * labels in sentence case where they fit.
 *
 * `tablist`/`tab` roles plus `selected` state give screen readers the
 * "tab 2 of 3, selected" announcement the old Pressables had no way to make.
 */
export const ProfileTabs = memo(function ProfileTabs({
  activeTab,
  onChangeTab,
}: {
  activeTab: ProfileTab
  onChangeTab: (tab: ProfileTab) => void
}) {
  return (
    <View
      accessibilityRole="tablist"
      className="flex-row gap-1 rounded-lg border border-border/70 bg-muted p-1"
    >
      {TABS.map((tab) => {
        const isActive = tab.key === activeTab

        return (
          <Pressable
            key={tab.key}
            accessibilityRole="tab"
            accessibilityLabel={tab.label}
            accessibilityState={{ selected: isActive }}
            className={cn(
              "h-9 flex-1 items-center justify-center rounded-md",
              isActive && "bg-card shadow-sm shadow-black/5"
            )}
            onPress={() => onChangeTab(tab.key)}
          >
            <Text
              className={cn(
                "text-xs font-bold",
                isActive ? "text-primary" : "text-muted-foreground"
              )}
              numberOfLines={1}
            >
              {tab.label}
            </Text>
          </Pressable>
        )
      })}
    </View>
  )
})
