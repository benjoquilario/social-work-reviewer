import { useCallback, useState } from "react"
import { Alert } from "react-native"

import { useAuth } from "@/contexts/auth-context"
import {
  blockMember,
  softDelete,
  unblockMember,
  type SoftDeletableTable,
} from "@/lib/community"

/**
 * ─── What a member can do about content ───────────────────────────────────
 *
 * Three verbs, deliberately kept apart because they answer different
 * questions and make different promises:
 *
 *   **Report** — somebody should look at this. Goes to the moderation queue,
 *   nothing on screen changes, and the author is never told who filed it.
 *
 *   **Block** — I do not want to see this person. Immediate, private to the
 *   blocker, and *not protection*: their posts are still readable by the SDK
 *   like everyone's. The confirmation says so, because a member who thinks
 *   blocking removes someone is being misled about their own safety.
 *
 *   **Delete** — take my own words down. Only ever your own rows, and it sets
 *   `isDeleted` rather than removing anything, because a hard delete would
 *   strand every comment other members left underneath (section 21).
 *
 * An app offering only one of these ends up with members using it for all
 * three, which is how a moderation queue fills with reports that are really
 * "please make this person go away".
 */

export function useCommunityModeration(options?: { onChanged?: () => void }) {
  const userId = useAuth((state) => state.user?.$id) ?? ""
  const [isWorking, setIsWorking] = useState(false)

  const notifyChanged = options?.onChanged

  const confirmBlock = useCallback(
    (target: { userId: string; name: string }) => {
      if (!userId || !target.userId || target.userId === userId) {
        return
      }

      Alert.alert(
        `Block ${target.name}?`,
        // Honest about what it is and is not. "You will not see" rather than
        // "they cannot", because the second would be a promise we cannot keep.
        "You will not see their posts, comments or replies. They are not told, and this does not report them — if something needs looking at, report it too.",
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Block",
            style: "destructive",
            onPress: () => {
              setIsWorking(true)
              void blockMember({ userId, blockedUserId: target.userId })
                .then(() => notifyChanged?.())
                .catch(() =>
                  Alert.alert(
                    "Could not block",
                    "Please try again in a moment."
                  )
                )
                .finally(() => setIsWorking(false))
            },
          },
        ]
      )
    },
    [notifyChanged, userId]
  )

  const unblock = useCallback(
    (blockedUserId: string) => {
      if (!userId || !blockedUserId) {
        return
      }

      setIsWorking(true)
      void unblockMember({ userId, blockedUserId })
        .then(() => notifyChanged?.())
        .finally(() => setIsWorking(false))
    },
    [notifyChanged, userId]
  )

  const confirmDelete = useCallback(
    (target: { table: SoftDeletableTable; rowId: string }) => {
      const label =
        target.table === "posts"
          ? "post"
          : target.table === "comments"
            ? "comment"
            : "reply"

      Alert.alert(
        `Delete this ${label}?`,
        target.table === "posts"
          ? "It disappears for everyone, along with its replies. This cannot be undone from the app."
          : "It disappears for everyone. This cannot be undone from the app.",
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Delete",
            style: "destructive",
            onPress: () => {
              setIsWorking(true)
              void softDelete(target.table, target.rowId)
                .then(() => notifyChanged?.())
                .catch(() =>
                  Alert.alert(
                    "Could not delete that",
                    "You can only remove your own posts. Please try again in a moment."
                  )
                )
                .finally(() => setIsWorking(false))
            },
          },
        ]
      )
    },
    [notifyChanged]
  )

  return {
    userId,
    isWorking,
    confirmBlock,
    unblock,
    confirmDelete,
    /** True when this row belongs to the signed-in member. */
    isOwn: useCallback(
      (authorId: string) => Boolean(userId) && authorId === userId,
      [userId]
    ),
  }
}
