import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type PropsWithChildren,
} from "react"

import {
  changeCurrentUserPassword,
  completeCurrentUserEmailVerification,
  createAccount,
  deleteCurrentAccount,
  ensureUserProfileSetup,
  getCurrentUser,
  login,
  logout,
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

type AuthContextValue = {
  authState: AuthState
  isLoading: boolean
  isAuthenticated: boolean
  user: AuthUser | null
  profile: UserProfile | null
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

// ─── Context ──────────────────────────────────────────────────────────────────

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

export function AuthProvider({ children }: PropsWithChildren) {
  const [authState, setAuthState] = useState<AuthState>({ status: "loading" })

  const bootstrapProfileSafely = useCallback(
    async (
      user: AuthUser,
      fullName?: string,
      email?: string
    ): Promise<UserProfile | null> => {
      try {
        return await ensureUserProfileSetup(user, fullName, email)
      } catch (error) {
        console.warn("[Auth] Profile bootstrap failed:", error)
        return null
      }
    },
    []
  )

  // On mount: check for an existing session.
  useEffect(() => {
    let cancelled = false

    async function checkSession() {
      try {
        const user = await getCurrentUser()

        if (cancelled) return

        if (!user) {
          setAuthState({ status: "unauthenticated" })
          return
        }

        const profile = await bootstrapProfileSafely(user)

        if (cancelled) return
        setAuthState({ status: "authenticated", user, profile })
      } catch (err) {
        console.warn("[Auth] Session check failed:", err)
        if (!cancelled) {
          setAuthState({ status: "unauthenticated" })
        }
      }
    }

    checkSession()
    return () => {
      cancelled = true
    }
  }, [])

  const handleLogin = useCallback(
    async (email: string, password: string) => {
      try {
        const user = await login(email, password)
        const profile = await bootstrapProfileSafely(user, undefined, email)
        setAuthState({ status: "authenticated", user, profile })
      } catch (err) {
        console.warn("[Auth] Login failed:", err)
        throw err // Re-throw so the login screen can display the error
      }
    },
    [bootstrapProfileSafely]
  )

  const handleRegister = useCallback(
    async (email: string, password: string, fullName: string) => {
      const user = await createAccount(email, password, fullName)
      const profile = await bootstrapProfileSafely(user, fullName, email)
      setAuthState({ status: "authenticated", user, profile })
    },
    [bootstrapProfileSafely]
  )

  const handleLogout = useCallback(async () => {
    await logout()
    setAuthState({ status: "unauthenticated" })
  }, [])

  const handleUpdateProfile = useCallback(
    async (input: UpdateProfileInput) => {
      if (authState.status !== "authenticated") {
        throw new Error("You need to sign in again to update your profile.")
      }

      const result = await updateCurrentProfile(input)
      setAuthState({
        status: "authenticated",
        user: result.user,
        profile: result.profile,
      })
    },
    [authState]
  )

  const handleUpdateEmail = useCallback(
    async (input: UpdateEmailInput) => {
      if (authState.status !== "authenticated") {
        throw new Error("You need to sign in again to update your email.")
      }

      const result = await updateCurrentEmail(input)
      setAuthState({
        status: "authenticated",
        user: result.user,
        profile: result.profile,
      })
    },
    [authState]
  )

  const handleUploadProfilePhoto = useCallback(
    async (input: UploadProfilePhotoInput) => {
      if (authState.status !== "authenticated") {
        throw new Error("You need to sign in again to upload a profile photo.")
      }

      return uploadCurrentUserProfilePhoto(input)
    },
    [authState]
  )

  const handleSendVerificationEmail = useCallback(async () => {
    if (authState.status !== "authenticated") {
      throw new Error("You need to sign in again to verify your email.")
    }

    await sendCurrentUserVerificationEmail()
  }, [authState])

  const handleCompleteEmailVerification = useCallback(
    async (userId: string, secret: string) => {
      const freshUser = await completeCurrentUserEmailVerification(
        userId,
        secret
      )
      const profile = await bootstrapProfileSafely(freshUser)
      setAuthState({ status: "authenticated", user: freshUser, profile })
    },
    [bootstrapProfileSafely]
  )

  const handleChangePassword = useCallback(
    async (currentPassword: string, nextPassword: string) => {
      if (authState.status !== "authenticated") {
        throw new Error("You need to sign in again to change your password.")
      }

      await changeCurrentUserPassword(currentPassword, nextPassword)
    },
    [authState]
  )

  const handleDeleteAccount = useCallback(async () => {
    if (authState.status !== "authenticated") {
      throw new Error("You need to sign in again to delete your account.")
    }

    await deleteCurrentAccount()
    setAuthState({ status: "unauthenticated" })
  }, [authState])

  const refreshProfile = useCallback(async () => {
    if (authState.status !== "authenticated") return
    const profile = await bootstrapProfileSafely(authState.user)
    setAuthState((prev) =>
      prev.status === "authenticated" ? { ...prev, profile } : prev
    )
  }, [authState, bootstrapProfileSafely])

  const value = useMemo<AuthContextValue>(
    () => ({
      authState,
      isLoading: authState.status === "loading",
      isAuthenticated: authState.status === "authenticated",
      user: authState.status === "authenticated" ? authState.user : null,
      profile: authState.status === "authenticated" ? authState.profile : null,
      login: handleLogin,
      register: handleRegister,
      logout: handleLogout,
      refreshProfile,
      updateProfile: handleUpdateProfile,
      updateEmail: handleUpdateEmail,
      uploadProfilePhoto: handleUploadProfilePhoto,
      sendVerificationEmail: handleSendVerificationEmail,
      completeEmailVerification: handleCompleteEmailVerification,
      changePassword: handleChangePassword,
      deleteAccount: handleDeleteAccount,
    }),
    [
      authState,
      handleChangePassword,
      handleCompleteEmailVerification,
      handleDeleteAccount,
      handleLogin,
      handleLogout,
      handleRegister,
      handleSendVerificationEmail,
      handleUploadProfilePhoto,
      handleUpdateEmail,
      handleUpdateProfile,
      refreshProfile,
    ]
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext)

  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider")
  }

  return context
}
