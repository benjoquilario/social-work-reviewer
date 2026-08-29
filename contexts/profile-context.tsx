import { useEffect, type PropsWithChildren } from "react"
import { create } from "zustand"
import { useShallow } from "zustand/react/shallow"

import type { MemberType } from "@/lib/schema"

export const PROFILE_ACTIVITY_PAGE_SIZE = 6

export type ProfileTab = "details" | "activity" | "performance"

/**
 * The editable half of a profile.
 *
 * These are the schema's own names now. `reviewType` and `schoolName` were the
 * old ones: the first is not a column on `user_profiles` at all — it lives on
 * `learning_achievements` as a copied label — and the second has been
 * superseded by `schoolOrEmployer`, which the notes name and which says what
 * the field is actually for (a BSSW school *or* an agency).
 *
 * `memberType` is a closed enum, not free text. `null` means "not said", which
 * is a normal answer and never blocks saving.
 */
type ProfileDraftSnapshot = {
  fullName: string
  memberType: MemberType | null
  schoolOrEmployer: string
  licenseNumber: string
  avatarUrl: string
}

type ProfileStore = ProfileDraftSnapshot & {
  activeTab: ProfileTab
  isEditOpen: boolean
  isSubmitting: boolean
  isUploadingAvatar: boolean
  isSendingVerification: boolean
  sessionsLimit: number
  learningHistoryLimit: number
  achievementsLimit: number
  setActiveTab: (tab: ProfileTab) => void
  setIsEditOpen: (open: boolean) => void
  openEditDialog: (snapshot: ProfileDraftSnapshot) => void
  closeEditDialog: () => void
  setIsSubmitting: (value: boolean) => void
  setIsUploadingAvatar: (value: boolean) => void
  setIsSendingVerification: (value: boolean) => void
  setFullName: (value: string) => void
  setMemberType: (value: MemberType | null) => void
  setSchoolOrEmployer: (value: string) => void
  setLicenseNumber: (value: string) => void
  setAvatarUrl: (value: string) => void
  clearAvatarUrl: () => void
  incrementSessionsLimit: (step?: number) => void
  incrementLearningHistoryLimit: (step?: number) => void
  incrementAchievementsLimit: (step?: number) => void
  resetPagination: () => void
  resetScreen: () => void
}

const INITIAL_STATE = {
  activeTab: "details" as ProfileTab,
  isEditOpen: false,
  isSubmitting: false,
  isUploadingAvatar: false,
  isSendingVerification: false,
  fullName: "",
  memberType: null as MemberType | null,
  schoolOrEmployer: "",
  licenseNumber: "",
  avatarUrl: "",
  sessionsLimit: PROFILE_ACTIVITY_PAGE_SIZE,
  learningHistoryLimit: PROFILE_ACTIVITY_PAGE_SIZE,
  achievementsLimit: PROFILE_ACTIVITY_PAGE_SIZE,
}

export const useProfileStore = create<ProfileStore>((set) => ({
  ...INITIAL_STATE,
  setActiveTab: (activeTab) => set({ activeTab }),
  setIsEditOpen: (isEditOpen) => set({ isEditOpen }),
  openEditDialog: (snapshot) => set({ isEditOpen: true, ...snapshot }),
  closeEditDialog: () => set({ isEditOpen: false }),
  setIsSubmitting: (isSubmitting) => set({ isSubmitting }),
  setIsUploadingAvatar: (isUploadingAvatar) => set({ isUploadingAvatar }),
  setIsSendingVerification: (isSendingVerification) =>
    set({ isSendingVerification }),
  setFullName: (fullName) => set({ fullName }),
  setMemberType: (memberType) => set({ memberType }),
  setSchoolOrEmployer: (schoolOrEmployer) => set({ schoolOrEmployer }),
  setLicenseNumber: (licenseNumber) => set({ licenseNumber }),
  setAvatarUrl: (avatarUrl) => set({ avatarUrl }),
  clearAvatarUrl: () => set({ avatarUrl: "" }),
  incrementSessionsLimit: (step = PROFILE_ACTIVITY_PAGE_SIZE) =>
    set((state) => ({ sessionsLimit: state.sessionsLimit + step })),
  incrementLearningHistoryLimit: (step = PROFILE_ACTIVITY_PAGE_SIZE) =>
    set((state) => ({
      learningHistoryLimit: state.learningHistoryLimit + step,
    })),
  incrementAchievementsLimit: (step = PROFILE_ACTIVITY_PAGE_SIZE) =>
    set((state) => ({ achievementsLimit: state.achievementsLimit + step })),
  resetPagination: () =>
    set({
      sessionsLimit: PROFILE_ACTIVITY_PAGE_SIZE,
      learningHistoryLimit: PROFILE_ACTIVITY_PAGE_SIZE,
      achievementsLimit: PROFILE_ACTIVITY_PAGE_SIZE,
    }),
  resetScreen: () => set(INITIAL_STATE),
}))

export function ProfileProvider({ children }: PropsWithChildren) {
  const resetScreen = useProfileStore((state) => state.resetScreen)

  useEffect(() => {
    resetScreen()

    return () => {
      resetScreen()
    }
  }, [resetScreen])

  return <>{children}</>
}

const selectProfileStore = (state: ProfileStore) => state

export function useProfileScreen(): ProfileStore
export function useProfileScreen<T>(selector: (state: ProfileStore) => T): T
export function useProfileScreen<T = ProfileStore>(
  selector?: (state: ProfileStore) => T
) {
  return useProfileStore(
    (selector ?? selectProfileStore) as (state: ProfileStore) => T
  )
}

export function useProfileViewState() {
  return useProfileStore(
    useShallow((state) => ({
      activeTab: state.activeTab,
      setActiveTab: state.setActiveTab,
      isSendingVerification: state.isSendingVerification,
      setIsSendingVerification: state.setIsSendingVerification,
    }))
  )
}

export function useProfileEditState() {
  return useProfileStore(
    useShallow((state) => ({
      isEditOpen: state.isEditOpen,
      setIsEditOpen: state.setIsEditOpen,
      openEditDialog: state.openEditDialog,
      isSubmitting: state.isSubmitting,
      setIsSubmitting: state.setIsSubmitting,
      isUploadingAvatar: state.isUploadingAvatar,
      setIsUploadingAvatar: state.setIsUploadingAvatar,
      fullName: state.fullName,
      setFullName: state.setFullName,
      memberType: state.memberType,
      setMemberType: state.setMemberType,
      schoolOrEmployer: state.schoolOrEmployer,
      setSchoolOrEmployer: state.setSchoolOrEmployer,
      licenseNumber: state.licenseNumber,
      setLicenseNumber: state.setLicenseNumber,
      avatarUrl: state.avatarUrl,
      setAvatarUrl: state.setAvatarUrl,
      clearAvatarUrl: state.clearAvatarUrl,
    }))
  )
}

export function useProfilePaginationState() {
  return useProfileStore(
    useShallow((state) => ({
      sessionsLimit: state.sessionsLimit,
      learningHistoryLimit: state.learningHistoryLimit,
      achievementsLimit: state.achievementsLimit,
      incrementSessionsLimit: state.incrementSessionsLimit,
      incrementLearningHistoryLimit: state.incrementLearningHistoryLimit,
      incrementAchievementsLimit: state.incrementAchievementsLimit,
      resetPagination: state.resetPagination,
    }))
  )
}
