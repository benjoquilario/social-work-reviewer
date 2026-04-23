import { useEffect, type PropsWithChildren } from "react"
import { create } from "zustand"

import {
  changeCurrentUserPassword,
  completeCurrentUserEmailVerification,
  createAccount,
  deleteCurrentAccount,
  ensureUserProfileSetup,
  getCurrentUser,
  login as loginWithPassword,
  logout as logoutSession,
  sendCurrentUserVerificationEmail,
  updateCurrentEmail,
  updateCurrentProfile,
  uploadCurrentUserProfilePhoto,
  type AuthUser,
  type UpdateEmailInput,
  type UpdateProfileInput,
  type UploadProfilePhotoInput,
  type UserProfile,
} from "@/lib/auth"

// ─── Types ────────────────────────────────────────────────────────────────────

type AuthState =
  | { status: "loading" }
  | { status: "unauthenticated" }
  | { status: "authenticated"; user: AuthUser; profile: UserProfile | null }

type AuthStore = {
  authState: AuthState
  isLoading: boolean
  isAuthenticated: boolean
  user: AuthUser | null
  profile: UserProfile | null
  initialize: () => Promise<void>
  login: (email: string, password: string) => Promise<void>
  register: (email: string, password: string, fullName: string) => Promise<void>
  logout: () => Promise<void>
  refreshProfile: () => Promise<void>
  updateProfile: (input: UpdateProfileInput) => Promise<void>
  updateEmail: (input: UpdateEmailInput) => Promise<void>
  uploadProfilePhoto: (input: UploadProfilePhotoInput) => Promise<string>
  sendVerificationEmail: () => Promise<void>
  completeEmailVerification: (userId: string, secret: string) => Promise<void>
  changePassword: (
    currentPassword: string,
    nextPassword: string
  ) => Promise<void>
  deleteAccount: () => Promise<void>
}

function toAuthSnapshot(authState: AuthState) {
  return {
    authState,
    isLoading: authState.status === "loading",
    isAuthenticated: authState.status === "authenticated",
    user: authState.status === "authenticated" ? authState.user : null,
    profile: authState.status === "authenticated" ? authState.profile : null,
  }
}

function canApplyProfileSnapshot(state: AuthStore, userId: string) {
  return (
    state.authState.status === "authenticated" && state.user?.$id === userId
  )
}

async function bootstrapProfileSafely(
  user: AuthUser,
  fullName?: string,
  email?: string
): Promise<UserProfile | null> {
  try {
    return await ensureUserProfileSetup(user, fullName, email)
  } catch (error) {
    console.warn("[Auth] Profile bootstrap failed:", error)
    return null
  }
}

let initializePromise: Promise<void> | null = null
const MAX_INIT_RETRIES = 2

export const useAuthStore = create<AuthStore>((set, get) => ({
  ...toAuthSnapshot({ status: "loading" }),
  initialize: async () => {
    if (get().authState.status !== "loading") {
      return
    }

    if (initializePromise) {
      return initializePromise
    }

    initializePromise = (async () => {
      let lastError: unknown

      for (let attempt = 0; attempt <= MAX_INIT_RETRIES; attempt++) {
        try {
          const user = await getCurrentUser()

          if (!user) {
            set(toAuthSnapshot({ status: "unauthenticated" }))
            return
          }

          // Show authenticated immediately, load profile in background
          set(toAuthSnapshot({ status: "authenticated", user, profile: null }))

          const profile = await bootstrapProfileSafely(user)
          if (!canApplyProfileSnapshot(get(), user.$id)) {
            return
          }
          set(toAuthSnapshot({ status: "authenticated", user, profile }))
          return
        } catch (error) {
          lastError = error

          if (attempt < MAX_INIT_RETRIES) {
            const delay = 1000 * Math.pow(2, attempt)
            await new Promise((r) => setTimeout(r, delay))
            continue
          }
        }
      }

      console.warn("[Auth] Session check failed after retries:", lastError)
      set(toAuthSnapshot({ status: "unauthenticated" }))
    })()

    return initializePromise.finally(() => {
      initializePromise = null
    })
  },
  login: async (email, password) => {
    try {
      const user = await loginWithPassword({ email, password })
      // Show authenticated immediately — profile loads in background
      set(toAuthSnapshot({ status: "authenticated", user, profile: null }))

      bootstrapProfileSafely(user, undefined, email).then((profile) => {
        if (profile && canApplyProfileSnapshot(get(), user.$id)) {
          set(
            toAuthSnapshot({
              status: "authenticated",
              user,
              profile,
            })
          )
        }
      })
    } catch (error) {
      console.warn("[Auth] Login failed:", error)
      throw error
    }
  },
  register: async (email, password, fullName) => {
    const user = await createAccount({ email, password, fullName })
    const profile = await bootstrapProfileSafely(user, fullName, email)
    set(toAuthSnapshot({ status: "authenticated", user, profile }))
  },
  logout: async () => {
    await logoutSession()
    set(toAuthSnapshot({ status: "unauthenticated" }))
  },
  refreshProfile: async () => {
    const user = get().user

    if (!user) {
      return
    }

    const profile = await bootstrapProfileSafely(user)
    if (!canApplyProfileSnapshot(get(), user.$id)) {
      return
    }
    set(toAuthSnapshot({ status: "authenticated", user, profile }))
  },
  updateProfile: async (input) => {
    if (get().authState.status !== "authenticated") {
      throw new Error("You need to sign in again to update your profile.")
    }

    const result = await updateCurrentProfile(input)
    set(
      toAuthSnapshot({
        status: "authenticated",
        user: result.user,
        profile: result.profile,
      })
    )
  },
  updateEmail: async (input) => {
    if (get().authState.status !== "authenticated") {
      throw new Error("You need to sign in again to update your email.")
    }

    const result = await updateCurrentEmail(input)
    set(
      toAuthSnapshot({
        status: "authenticated",
        user: result.user,
        profile: result.profile,
      })
    )
  },
  uploadProfilePhoto: async (input) => {
    if (get().authState.status !== "authenticated") {
      throw new Error("You need to sign in again to upload a profile photo.")
    }

    return uploadCurrentUserProfilePhoto(input)
  },
  sendVerificationEmail: async () => {
    if (get().authState.status !== "authenticated") {
      throw new Error("You need to sign in again to verify your email.")
    }

    await sendCurrentUserVerificationEmail()
  },
  completeEmailVerification: async (userId, secret) => {
    const user = await completeCurrentUserEmailVerification({ userId, secret })
    const profile = await bootstrapProfileSafely(user)
    set(toAuthSnapshot({ status: "authenticated", user, profile }))
  },
  changePassword: async (currentPassword, nextPassword) => {
    if (get().authState.status !== "authenticated") {
      throw new Error("You need to sign in again to change your password.")
    }

    await changeCurrentUserPassword({ currentPassword, nextPassword })
  },
  deleteAccount: async () => {
    if (get().authState.status !== "authenticated") {
      throw new Error("You need to sign in again to delete your account.")
    }

    await deleteCurrentAccount()
    set(toAuthSnapshot({ status: "unauthenticated" }))
  },
}))

export function AuthProvider({ children }: PropsWithChildren) {
  const initialize = useAuthStore((state) => state.initialize)

  useEffect(() => {
    void initialize()
  }, [initialize])

  return <>{children}</>
}

const selectAuthStore = (state: AuthStore) => state

export function useAuth(): AuthStore
export function useAuth<T>(selector: (state: AuthStore) => T): T
export function useAuth<T = AuthStore>(selector?: (state: AuthStore) => T) {
  return useAuthStore((selector ?? selectAuthStore) as (state: AuthStore) => T)
}
