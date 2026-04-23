import { useEffect, type PropsWithChildren } from "react"
import { create } from "zustand"
import { useShallow } from "zustand/react/shallow"

export const PROFILE_ACTIVITY_PAGE_SIZE = 6

export type ProfileTab = "details" | "activity" | "performance"

type ProfileDraftSnapshot = {
  fullName: string
  schoolName: string
  reviewType: string
  avatarUrl: string
}

type ProfileStore = {
  activeTab: ProfileTab
  isEditOpen: boolean
  isSubmitting: boolean
  isUploadingAvatar: boolean
  isSendingVerification: boolean
  fullName: string
  schoolName: string
  reviewType: string
  avatarUrl: string
  imageFailed: boolean
  quizAttemptsLimit: number
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
  setSchoolName: (value: string) => void
  setReviewType: (value: string) => void
  setAvatarUrl: (value: string) => void
  clearAvatarUrl: () => void
  setImageFailed: (value: boolean) => void
  resetImageFailure: () => void
  incrementQuizAttemptsLimit: (step?: number) => void
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
  schoolName: "",
  reviewType: "",
  avatarUrl: "",
  imageFailed: false,
  quizAttemptsLimit: PROFILE_ACTIVITY_PAGE_SIZE,
  learningHistoryLimit: PROFILE_ACTIVITY_PAGE_SIZE,
  achievementsLimit: PROFILE_ACTIVITY_PAGE_SIZE,
}

export const useProfileStore = create<ProfileStore>((set) => ({
  ...INITIAL_STATE,
  setActiveTab: (activeTab) => set({ activeTab }),
  setIsEditOpen: (isEditOpen) => set({ isEditOpen }),
  openEditDialog: ({ fullName, schoolName, reviewType, avatarUrl }) =>
    set({
      isEditOpen: true,
      fullName,
      schoolName,
      reviewType,
      avatarUrl,
    }),
  closeEditDialog: () => set({ isEditOpen: false }),
  setIsSubmitting: (isSubmitting) => set({ isSubmitting }),
  setIsUploadingAvatar: (isUploadingAvatar) => set({ isUploadingAvatar }),
  setIsSendingVerification: (isSendingVerification) =>
    set({ isSendingVerification }),
  setFullName: (fullName) => set({ fullName }),
  setSchoolName: (schoolName) => set({ schoolName }),
  setReviewType: (reviewType) => set({ reviewType }),
  setAvatarUrl: (avatarUrl) => set({ avatarUrl }),
  clearAvatarUrl: () => set({ avatarUrl: "" }),
  setImageFailed: (imageFailed) => set({ imageFailed }),
  resetImageFailure: () => set({ imageFailed: false }),
  incrementQuizAttemptsLimit: (step = PROFILE_ACTIVITY_PAGE_SIZE) =>
    set((state) => ({ quizAttemptsLimit: state.quizAttemptsLimit + step })),
  incrementLearningHistoryLimit: (step = PROFILE_ACTIVITY_PAGE_SIZE) =>
    set((state) => ({
      learningHistoryLimit: state.learningHistoryLimit + step,
    })),
  incrementAchievementsLimit: (step = PROFILE_ACTIVITY_PAGE_SIZE) =>
    set((state) => ({ achievementsLimit: state.achievementsLimit + step })),
  resetPagination: () =>
    set({
      quizAttemptsLimit: PROFILE_ACTIVITY_PAGE_SIZE,
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
      imageFailed: state.imageFailed,
      setImageFailed: state.setImageFailed,
      resetImageFailure: state.resetImageFailure,
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
      schoolName: state.schoolName,
      setSchoolName: state.setSchoolName,
      reviewType: state.reviewType,
      setReviewType: state.setReviewType,
      avatarUrl: state.avatarUrl,
      setAvatarUrl: state.setAvatarUrl,
      clearAvatarUrl: state.clearAvatarUrl,
    }))
  )
}

export function useProfilePaginationState() {
  return useProfileStore(
    useShallow((state) => ({
      quizAttemptsLimit: state.quizAttemptsLimit,
      learningHistoryLimit: state.learningHistoryLimit,
      achievementsLimit: state.achievementsLimit,
      incrementQuizAttemptsLimit: state.incrementQuizAttemptsLimit,
      incrementLearningHistoryLimit: state.incrementLearningHistoryLimit,
      incrementAchievementsLimit: state.incrementAchievementsLimit,
      resetPagination: state.resetPagination,
    }))
  )
}
