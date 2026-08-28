import { memo } from "react"
import { Check, ChevronRight, LockKeyhole } from "lucide-react-native"
import { Pressable, View } from "react-native"

import type { LearningMaterial } from "@/lib/learning-content"
import type { LearningMaterialStatusSnapshot } from "@/lib/progress"
import type { ThemePalette } from "@/lib/theme"
import { getToneColor } from "@/lib/tone"
import { cn } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"
import { Text } from "@/components/ui/text"

import { getMaterialStatusPresentation, MaterialTypeIcon } from "./learn-status"

/**
 * One material inside a topic, as a row in a divided list.
 *
 * Materials are a sequence, so the leading tile carries the position — or a
 * check once the material is done, which is the fastest way to read "where am
 * I up to" without parsing four progress chips.
 */
export const MaterialRow = memo(function MaterialRow({
  material,
  position,
  preview,
  status,
  showStatus,
  isFirst,
  theme,
  onPress,
}: {
  material: LearningMaterial
  position: number
  preview: string
  status: LearningMaterialStatusSnapshot | null | undefined
  /** Statuses are per-user; hidden while signed out or still loading. */
  showStatus: boolean
  isFirst: boolean
  theme: ThemePalette
  onPress: (material: LearningMaterial) => void
}) {
  const presentation = getMaterialStatusPresentation(status)
  const isLocked = material.isLocked
  const isDone = showStatus && presentation.isCompleted
  const typeColor = isLocked ? theme.accentText : theme.primary

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${position}. ${material.title}.${isLocked ? " Premium." : showStatus ? ` ${presentation.label}.` : ""}`}
      className={cn(
        "flex-row items-start gap-3 px-4 py-3.5 active:bg-muted/50",
        !isFirst && "border-t border-border/70"
      )}
      onPress={() => onPress(material)}
    >
      <View
        className={
          isDone
            ? "h-9 w-9 items-center justify-center rounded-lg bg-success/15"
            : "h-9 w-9 items-center justify-center rounded-lg bg-muted"
        }
      >
        {isDone ? (
          <Check size={16} color={theme.success} strokeWidth={3} />
        ) : isLocked ? (
          <LockKeyhole size={15} color={theme.accentText} />
        ) : (
          <Text className="text-xs font-black text-muted-foreground">
            {position}
          </Text>
        )}
      </View>

      <View className="flex-1 gap-1">
        <Text variant="callout" className="font-bold" numberOfLines={2}>
          {material.title}
        </Text>

        <View className="flex-row items-center gap-1.5">
          <MaterialTypeIcon size={12} type={material.type} color={typeColor} />
          <Text variant="label">{material.type}</Text>

          {showStatus && !isLocked && status ? (
            <>
              <Text variant="label">·</Text>
              <Text
                variant="label"
                style={{ color: getToneColor(theme, presentation.tone) }}
              >
                {presentation.label}
              </Text>
            </>
          ) : null}
        </View>

        <Text variant="caption" numberOfLines={2}>
          {preview}
        </Text>
      </View>

      {isLocked ? (
        <Badge tone="accent" size="sm">
          Premium
        </Badge>
      ) : (
        <ChevronRight
          size={18}
          color={theme.mutedForeground}
          style={{ marginTop: 8 }}
        />
      )}
    </Pressable>
  )
})
