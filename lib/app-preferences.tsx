import { useEffect, type PropsWithChildren } from "react"
import { colorScheme } from "nativewind"
import {
  NativeModules,
  TurboModuleRegistry,
  useColorScheme as useNativeColorScheme,
} from "react-native"
import { create } from "zustand"

export type ThemeMode = "system" | "light" | "dark"

export type AppPreferences = {
  themeMode: ThemeMode
  showExplanations: boolean
  soundEffects: boolean
  hapticsEnabled: boolean
  animationsEnabled: boolean
  dailyReminder: boolean
  strictMode: boolean
  hasCompletedOnboarding: boolean
}

const STORAGE_KEY = "@reviewer/app-preferences"

export const DEFAULT_APP_PREFERENCES: AppPreferences = {
  themeMode: "system",
  showExplanations: true,
  soundEffects: false,
  hapticsEnabled: true,
  animationsEnabled: true,
  dailyReminder: true,
  strictMode: false,
  hasCompletedOnboarding: false,
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

type AppPreferencesStore = {
  isReady: boolean
  systemColorScheme: "light" | "dark"
  preferences: AppPreferences
  resolvedColorScheme: "light" | "dark"
  initialize: (systemColorScheme: "light" | "dark") => Promise<void>
  setSystemColorScheme: (systemColorScheme: "light" | "dark") => void
  setThemeMode: (themeMode: ThemeMode) => void
  setPreference: <K extends keyof AppPreferences>(
    key: K,
    value: AppPreferences[K]
  ) => void
  resetPreferences: () => void
}

function resolveColorScheme(
  preferences: AppPreferences,
  systemColorScheme: "light" | "dark"
) {
  return preferences.themeMode === "system"
    ? systemColorScheme
    : preferences.themeMode
}

async function loadStoredPreferences() {
  try {
    const stored = await appStorage.getItem(STORAGE_KEY)

    if (!stored) {
      return DEFAULT_APP_PREFERENCES
    }

    const parsed = JSON.parse(stored) as Partial<AppPreferences>

    return {
      ...DEFAULT_APP_PREFERENCES,
      ...parsed,
    }
  } catch {
    return DEFAULT_APP_PREFERENCES
  }
}

function persistPreferences(preferences: AppPreferences) {
  appStorage
    .setItem(STORAGE_KEY, JSON.stringify(preferences))
    .catch(() => undefined)
}

let initializePromise: Promise<void> | null = null

export const useAppPreferencesStore = create<AppPreferencesStore>(
  (set, get) => ({
    isReady: false,
    systemColorScheme: "light",
    preferences: DEFAULT_APP_PREFERENCES,
    resolvedColorScheme: "light",
    initialize: async (systemColorScheme) => {
      if (get().isReady) {
        get().setSystemColorScheme(systemColorScheme)
        return
      }

      if (initializePromise) {
        return initializePromise
      }

      initializePromise = (async () => {
        const preferences = await loadStoredPreferences()
        colorScheme.set(preferences.themeMode)

        set({
          isReady: true,
          systemColorScheme,
          preferences,
          resolvedColorScheme: resolveColorScheme(
            preferences,
            systemColorScheme
          ),
        })

        initializePromise = null
      })()

      return initializePromise
    },
    setSystemColorScheme: (systemColorScheme) => {
      set((state) => ({
        systemColorScheme,
        resolvedColorScheme: resolveColorScheme(
          state.preferences,
          systemColorScheme
        ),
      }))
    },
    setThemeMode: (themeMode) => {
      colorScheme.set(themeMode)

      set((state) => {
        const preferences = {
          ...state.preferences,
          themeMode,
        }

        if (state.isReady) {
          persistPreferences(preferences)
        }

        return {
          preferences,
          resolvedColorScheme: resolveColorScheme(
            preferences,
            state.systemColorScheme
          ),
        }
      })
    },
    setPreference: (key, value) => {
      set((state) => {
        const preferences = {
          ...state.preferences,
          [key]: value,
        }

        if (state.isReady) {
          persistPreferences(preferences)
        }

        return {
          preferences,
          resolvedColorScheme: resolveColorScheme(
            preferences,
            state.systemColorScheme
          ),
        }
      })
    },
    resetPreferences: () => {
      colorScheme.set(DEFAULT_APP_PREFERENCES.themeMode)

      set((state) => {
        if (state.isReady) {
          persistPreferences(DEFAULT_APP_PREFERENCES)
        }

        return {
          preferences: DEFAULT_APP_PREFERENCES,
          resolvedColorScheme: resolveColorScheme(
            DEFAULT_APP_PREFERENCES,
            state.systemColorScheme
          ),
        }
      })
    },
  })
)

export function AppPreferencesProvider({ children }: PropsWithChildren) {
  const systemColorScheme = useNativeColorScheme() ?? "light"
  const initialize = useAppPreferencesStore((state) => state.initialize)
  const setSystemColorScheme = useAppPreferencesStore(
    (state) => state.setSystemColorScheme
  )

  useEffect(() => {
    void initialize(systemColorScheme)
  }, [initialize, systemColorScheme])

  useEffect(() => {
    setSystemColorScheme(systemColorScheme)
  }, [setSystemColorScheme, systemColorScheme])

  return <>{children}</>
}

const selectAppPreferencesStore = (state: AppPreferencesStore) => state

export function useAppPreferences(): AppPreferencesStore
export function useAppPreferences<T>(
  selector: (state: AppPreferencesStore) => T
): T
export function useAppPreferences<T = AppPreferencesStore>(
  selector?: (state: AppPreferencesStore) => T
) {
  return useAppPreferencesStore(
    (selector ?? selectAppPreferencesStore) as (state: AppPreferencesStore) => T
  )
}
