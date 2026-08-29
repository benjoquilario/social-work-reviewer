import { useMemo } from "react"
import { useQuery, useQueryClient } from "@tanstack/react-query"

import { useAuth } from "@/contexts/auth-context"
import {
  getUnreadAnnouncementIds,
  listAnnouncements,
  listReadAnnouncementIds,
  markAnnouncementsRead,
  type Announcement,
} from "@/lib/announcements"
import { useAppPreferences } from "@/lib/app-preferences"
import { queryKeys } from "@/lib/query-keys"
import { useMembership } from "@/hooks/use-membership"

/**
 * The Updates feed, and the dot on the bell.
 *
 * Both come from one query so they can never disagree — a badge that lights up
 * for an item the list does not show is worse than no badge, because the member
 * taps it, finds nothing, and stops trusting it.
 *
 * The audience filter runs on the member's current membership, so the answer
 * changes the moment their subscription does. It is cached for five minutes:
 * announcements are the definition of low-frequency content, and refetching
 * them on every Home render would be the most wasteful read in the app.
 */

export function useAnnouncements() {
  const profile = useAuth((state) => state.profile)
  const { membership, isPremium } = useMembership()
  const seenIds = useAppPreferences((state) => state.preferences.seenNewsIds)
  const queryClient = useQueryClient()
  const setPreference = useAppPreferences((state) => state.setPreference)

  const viewer = useMemo(
    () => ({
      membershipState: membership.state,
      isPremium,
      memberType: profile?.memberType ?? "",
    }),
    [isPremium, membership.state, profile?.memberType]
  )

  const userId = useAuth((state) => state.user?.$id) ?? ""

  const query = useQuery({
    queryKey: queryKeys.announcements.list(
      `${userId}:${viewer.membershipState}:${viewer.memberType}`
    ),
    queryFn: async () => {
      // Read state comes from the server as of v4, so the badge survives a
      // reinstall and agrees across devices. Backed by the local preference,
      // because an unread dot is not worth failing a screen over.
      const [announcements, readIds] = await Promise.all([
        listAnnouncements({ viewer }),
        listReadAnnouncementIds(userId),
      ])

      return { announcements, readIds }
    },
    staleTime: 5 * 60 * 1000,
  })

  const announcements: Announcement[] = query.data?.announcements ?? []

  // The union of both, so a device that marked something read offline does not
  // light the dot again once the server answer arrives.
  const readIds = useMemo(() => {
    const merged = new Set(seenIds)
    for (const id of query.data?.readIds ?? []) {
      merged.add(id)
    }
    return merged
  }, [query.data?.readIds, seenIds])

  const unreadIds = getUnreadAnnouncementIds(announcements, [...readIds])

  return {
    announcements,
    isLoading: query.isLoading,
    error: query.error,
    unreadIds,
    hasUnread: unreadIds.length > 0,
    /** Called when the list is opened — this is what turns the dot off. */
    markAllSeen: () => {
      if (unreadIds.length === 0) {
        return
      }

      // Local first so the dot clears immediately, then the durable record.
      setPreference("seenNewsIds", [...readIds, ...unreadIds])
      void markAnnouncementsRead({ userId, announcementIds: unreadIds }).then(
        () => queryClient.invalidateQueries({ queryKey: queryKeys.announcements.all })
      )
    },
  }
}
