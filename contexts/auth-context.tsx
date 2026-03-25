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
  createAccount,
  ensureUserProfileSetup,
  getCurrentUser,
  login,
  logout,
  type AuthUser,
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
    }),
    [authState, handleLogin, handleRegister, handleLogout, refreshProfile]
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
