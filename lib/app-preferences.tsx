import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type PropsWithChildren,
} from "react"
import { colorScheme } from "nativewind"
import {
  NativeModules,
  TurboModuleRegistry,
  useColorScheme as useNativeColorScheme,
} from "react-native"

export type ThemeMode = "system" | "light" | "dark"

export type AppPreferences = {
  themeMode: ThemeMode
  showExplanations: boolean
  soundEffects: boolean
  hapticsEnabled: boolean
  dailyReminder: boolean
  strictMode: boolean
}

const STORAGE_KEY = "@reviewer/app-preferences"

export const DEFAULT_APP_PREFERENCES: AppPreferences = {
  themeMode: "system",
  showExplanations: true,
  soundEffects: false,
  hapticsEnabled: true,
  dailyReminder: true,
  strictMode: false,
}

type StorageLike = {
  getItem: (key: string) => Promise<string | null>
  setItem: (key: string, value: string) => Promise<void>
}

type NativeAsyncStorageModule = {
  multiGet: (
    keys: string[],
    callback: (errors?: { message?: string }[], result?: string[][]) => void
  ) => void
  multiSet: (
    entries: string[][],
    callback?: (errors?: { message?: string }[]) => void
  ) => void
}

const memoryStore = new Map<string, string>()

const fallbackStorage: StorageLike = {
  getItem: async (key) => memoryStore.get(key) ?? null,
  setItem: async (key, value) => {
    memoryStore.set(key, value)
  },
}

function getNativeAsyncStorageModule(): NativeAsyncStorageModule | null {
  const nativeModuleNames = [
    "PlatformLocalStorage",
    "RNC_AsyncSQLiteDBStorage",
    "RNCAsyncStorage",
    "AsyncSQLiteDBStorage",
    "AsyncLocalStorage",
  ]

  if (TurboModuleRegistry?.get) {
    for (const moduleName of nativeModuleNames) {
      const module = TurboModuleRegistry.get(
        moduleName
      ) as NativeAsyncStorageModule | null

      if (module) {
        return module
      }
    }
  }

  for (const moduleName of nativeModuleNames) {
    const module = NativeModules[moduleName] as
      | NativeAsyncStorageModule
      | undefined

    if (module) {
      return module
    }
  }

  return null
}

function createNativeStorage(
  module: NativeAsyncStorageModule | null
): StorageLike {
  if (!module) {
    return fallbackStorage
  }

  return {
    getItem: (key) =>
      new Promise((resolve, reject) => {
        module.multiGet([key], (errors, result) => {
          const error = errors?.[0]

          if (error) {
            reject(
              new Error(error.message ?? "Unable to read from AsyncStorage")
            )
            return
          }

          resolve(result?.[0]?.[1] ?? null)
        })
      }),
    setItem: (key, value) =>
      new Promise((resolve, reject) => {
        module.multiSet([[key, value]], (errors) => {
          const error = errors?.[0]

          if (error) {
            reject(
              new Error(error.message ?? "Unable to write to AsyncStorage")
            )
            return
          }

          resolve()
        })
      }),
  }
}

const appStorage = createNativeStorage(getNativeAsyncStorageModule())

type AppPreferencesContextValue = {
  isReady: boolean
  preferences: AppPreferences
  resolvedColorScheme: "light" | "dark"
  setThemeMode: (themeMode: ThemeMode) => void
  setPreference: <K extends keyof AppPreferences>(
    key: K,
    value: AppPreferences[K]
  ) => void
  resetPreferences: () => void
}

export const AppPreferencesContext = createContext<
  AppPreferencesContextValue | undefined
>(undefined)

export function AppPreferencesProvider({ children }: PropsWithChildren) {
  const systemColorScheme = useNativeColorScheme() ?? "light"
  const [preferences, setPreferences] = useState(DEFAULT_APP_PREFERENCES)
  const [isReady, setIsReady] = useState(false)

  useEffect(() => {
    let isMounted = true

    async function loadPreferences() {
      try {
        const stored = await appStorage.getItem(STORAGE_KEY)

        if (!stored) {
          return
        }

        const parsed = JSON.parse(stored) as Partial<AppPreferences>

        if (isMounted) {
          setPreferences((current) => ({
            ...current,
            ...parsed,
          }))
        }
      } catch {
      } finally {
        if (isMounted) {
          setIsReady(true)
        }
      }
    }

    loadPreferences()

    return () => {
      isMounted = false
    }
  }, [])

  useEffect(() => {
    if (!isReady) {
      return
    }

    appStorage
      .setItem(STORAGE_KEY, JSON.stringify(preferences))
      .catch(() => undefined)
  }, [isReady, preferences])

  useEffect(() => {
    colorScheme.set(preferences.themeMode)
  }, [preferences.themeMode])

  const resolvedColorScheme =
    preferences.themeMode === "system"
      ? systemColorScheme
      : preferences.themeMode

  const value = useMemo<AppPreferencesContextValue>(
    () => ({
      isReady,
      preferences,
      resolvedColorScheme,
      setThemeMode: (themeMode) => {
        setPreferences((current) => ({
          ...current,
          themeMode,
        }))
      },
      setPreference: (key, value) => {
        setPreferences((current) => ({
          ...current,
          [key]: value,
        }))
      },
      resetPreferences: () => {
        setPreferences(DEFAULT_APP_PREFERENCES)
      },
    }),
    [isReady, preferences, resolvedColorScheme]
  )

  return (
    <AppPreferencesContext.Provider value={value}>
      {children}
    </AppPreferencesContext.Provider>
  )
}

export function useAppPreferences() {
  const context = useContext(AppPreferencesContext)

  if (!context) {
    throw new Error(
      "useAppPreferences must be used within AppPreferencesProvider"
    )
  }

  return context
}
