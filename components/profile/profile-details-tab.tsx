import { memo } from "react"
import { View } from "react-native"

import { cn } from "@/lib/utils"
import { Card, CardContent } from "@/components/ui/card"
import { Text } from "@/components/ui/text"

import type { ProfileDetailCard } from "./types"

/**
 * The identity list, as one divided card.
 *
 * Each row used to be its own bordered, filled card nested inside another
 * bordered, filled card — two border weights and two surface colors stacked
 * for what is a four-item list. Hairline dividers say the same thing with one.
 */
export const ProfileDetailsTab = memo(function ProfileDetailsTab({
  detailCards,
}: {
  detailCards: ProfileDetailCard[]
}) {
  return (
    <Card>
      <CardContent size="none">
        {detailCards.map((item, index) => (
          <View
            key={item.key}
            className={cn(
              "flex-row items-center gap-3 px-4 py-3.5",
              index > 0 && "border-t border-border/70"
            )}
          >
            <View className="h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
              {item.icon}
            </View>

            <View className="flex-1 gap-0.5">
              <Text variant="label">{item.label}</Text>
              <Text
                variant="callout"
                className={cn(
                  item.isPlaceholder
                    ? "text-muted-foreground"
                    : "font-semibold text-card-foreground"
                )}
                numberOfLines={2}
              >
                {item.value}
              </Text>
            </View>
          </View>
        ))}
      </CardContent>
    </Card>
  )
})
