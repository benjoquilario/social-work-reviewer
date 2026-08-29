import { useCallback } from "react"
import { useAuth } from "@/contexts/auth-context"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"

import {
  DEFAULT_MEMBER_SETTINGS,
  loadMemberSettings,
  saveMemberSettings,
  type MemberSettings,
} from "@/lib/member/settings"
import { queryKeys } from "@/lib/query-keys"

/**
 * The member's settings, with the schema defaults standing in until they load.
 *
 * A missing `user_settings` row is normal — most members never open the
 * screen — so this never blocks and never shows a spinner for it. The defaults
 * come from the schema, so a value changed in the CMS reaches the app without
 * an app change.
 */
export function useMemberSettings() {
  const userId = useAuth((state) => state.user?.$id) ?? ""
  const queryClient = useQueryClient()

  const query = useQuery({
    queryKey: queryKeys.member.settings(userId),
    enabled: Boolean(userId),
    queryFn: () => loadMemberSettings(userId),
    // Settings change rarely and are read on every session start.
    staleTime: 5 * 60 * 1000,
  })

  const mutation = useMutation({
    mutationFn: (patch: Partial<MemberSettings>) =>
      saveMemberSettings(userId, patch),
    // Optimistic: a switch that waits for a round trip to move reads as broken.
    onMutate: async (patch) => {
      const key = queryKeys.member.settings(userId)
      await queryClient.cancelQueries({ queryKey: key })

      const previous = queryClient.getQueryData<MemberSettings>(key)

      queryClient.setQueryData<MemberSettings>(key, (current) => ({
        ...(current ?? DEFAULT_MEMBER_SETTINGS),
        ...patch,
      }))

      return { previous }
    },
    onError: (_error, _patch, context) => {
      if (context?.previous) {
        queryClient.setQueryData(
          queryKeys.member.settings(userId),
          context.previous
        )
      }
    },
    onSuccess: (settings) => {
      queryClient.setQueryData(queryKeys.member.settings(userId), settings)
    },
  })

  const update = useCallback(
    (patch: Partial<MemberSettings>) => {
      if (!userId) {
        return
      }

      mutation.mutate(patch)
    },
    [mutation, userId]
  )

  return {
    settings: query.data ?? DEFAULT_MEMBER_SETTINGS,
    isLoading: query.isLoading,
    isSaving: mutation.isPending,
    error: mutation.error,
    update,
  }
}
