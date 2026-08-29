import { memo, type ReactNode } from "react"
import { View } from "react-native"

import { Card, CardContent } from "@/components/ui/card"
import { Text } from "@/components/ui/text"

/**
 * One group of settings.
 *
 * Every section carries a one-line description. A switch labelled "Strict
 * mode" is a guess for the member to make; a switch labelled "Strict mode /
 * lock an answer once you move on" is a decision.
 */

type SettingsSectionProps = {
  title: string
  description?: string
  children: ReactNode
  footer?: ReactNode
}

export const SettingsSection = memo(function SettingsSection({
  title,
  description,
  children,
  footer,
}: SettingsSectionProps) {
  return (
    <Card>
      <CardContent className="gap-3">
        <View className="gap-0.5">
          <Text variant="subheading">{title}</Text>
          {description ? <Text variant="caption">{description}</Text> : null}
        </View>

        <View className="gap-1">{children}</View>

        {footer ? <View className="pt-1">{footer}</View> : null}
      </CardContent>
    </Card>
  )
})
