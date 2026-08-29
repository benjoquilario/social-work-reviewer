import { memo } from "react"
import { Flag, Trash2, UserX } from "lucide-react-native"
import { Pressable, View } from "react-native"

import { withOpacity } from "@/lib/theme"
import { useThemePalette } from "@/hooks/use-theme"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Text } from "@/components/ui/text"

/**
 * What you can do about somebody else's post — or your own.
 *
 * One sheet rather than three icons on the card. The card is already carrying
 * a title, a body, a subject chip, a like count and a comment count; a third
 * row of controls would compete with the thing people came to read.
 *
 * The options differ by ownership, and deliberately do not overlap:
 * your own post offers Delete and nothing else, because reporting or blocking
 * yourself is not a thing anybody means to do.
 */

export type PostAction = "report" | "block" | "delete"

type PostActionsMenuProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Changes the whole option set. */
  isOwn: boolean
  authorName: string
  onSelect: (action: PostAction) => void
}

type ActionRowProps = {
  icon: React.ReactNode
  label: string
  detail: string
  tone?: "default" | "destructive"
  onPress: () => void
}

function ActionRow({ icon, label, detail, tone, onPress }: ActionRowProps) {
  const theme = useThemePalette()
  const color = tone === "destructive" ? theme.destructive : theme.foreground

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityHint={detail}
      className="min-h-[56px] flex-row items-center gap-3 rounded-md px-3 py-2.5 active:opacity-80"
    >
      <View
        className="h-9 w-9 items-center justify-center rounded-full"
        style={{ backgroundColor: withOpacity(color, 0.1) }}
      >
        {icon}
      </View>

      <View className="flex-1 gap-0.5">
        <Text variant="callout" className="font-semibold" style={{ color }}>
          {label}
        </Text>
        {/* The difference between these three is the entire point, so each
            one says what it does rather than relying on the verb. */}
        <Text variant="caption">{detail}</Text>
      </View>
    </Pressable>
  )
}

export const PostActionsMenu = memo(function PostActionsMenu({
  open,
  onOpenChange,
  isOwn,
  authorName,
  onSelect,
}: PostActionsMenuProps) {
  const theme = useThemePalette()

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isOwn ? "Your post" : authorName}</DialogTitle>
        </DialogHeader>

        <View className="gap-1">
          {isOwn ? (
            <ActionRow
              icon={
                <Trash2 size={16} color={theme.destructive} strokeWidth={2.2} />
              }
              label="Delete"
              detail="Removes it for everyone, along with its replies."
              tone="destructive"
              onPress={() => onSelect("delete")}
            />
          ) : (
            <>
              <ActionRow
                icon={
                  <Flag
                    size={16}
                    color={theme.foreground}
                    strokeWidth={2.2}
                  />
                }
                label="Report"
                detail="Sends it to the team. Nothing changes here."
                onPress={() => onSelect("report")}
              />
              <ActionRow
                icon={
                  <UserX
                    size={16}
                    color={theme.destructive}
                    strokeWidth={2.2}
                  />
                }
                label={`Block ${authorName}`}
                detail="You stop seeing their posts. They are not told."
                tone="destructive"
                onPress={() => onSelect("block")}
              />
            </>
          )}
        </View>
      </DialogContent>
    </Dialog>
  )
})
