import { useState } from "react"
import { useAuth } from "@/contexts/auth-context"
import { useRouter } from "expo-router"
import { BookOpenText, Eye, EyeOff, Lock, Mail } from "lucide-react-native"
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  TextInput,
  View,
} from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"

import { THEME } from "@/lib/theme"
import { useColorScheme } from "@/hooks/use-color-scheme"
import { Text } from "@/components/ui/text"

export default function LoginScreen() {
  const router = useRouter()
  const { login } = useAuth()
  const colorScheme = useColorScheme()
  const isDark = colorScheme === "dark"
  const theme = isDark ? THEME.dark : THEME.light

  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleLogin() {
    if (!email.trim() || !password.trim()) {
      setError("Please enter your email and password.")
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      await login(email.trim(), password)
      router.replace("/(tabs)")
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Login failed. Please try again."
      setError(message)
    } finally {
      setIsLoading(false)
    }
  }

  const inputBg = isDark ? "hsl(240 10% 14%)" : "hsl(243 30% 97%)"
  const borderColor = isDark ? "hsl(243 20% 22%)" : "hsl(243 20% 88%)"
  const iconColor = isDark ? theme.mutedForeground : "hsl(243 30% 60%)"

  return (
    <SafeAreaView className="flex-1 bg-background">
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        className="flex-1"
      >
        <ScrollView
          contentContainerClassName="flex-1 px-6 justify-center gap-6"
          keyboardShouldPersistTaps="handled"
        >
          {/* Logo + branding */}
          <View className="items-center gap-3">
            <View
              className="h-16 w-16 items-center justify-center rounded-3xl"
              style={{ backgroundColor: theme.primary }}
            >
              <BookOpenText size={32} color={theme.primaryForeground} />
            </View>
            <View className="items-center gap-1">
              <Text className="text-2xl font-black text-foreground">
                Welcome back
              </Text>
              <Text className="text-sm text-muted-foreground">
                Sign in to continue your review
              </Text>
            </View>
          </View>

          {/* Form */}
          <View className="gap-3">
            {error ? (
              <View className="rounded-2xl border border-destructive/30 bg-destructive/10 px-4 py-3">
                <Text className="text-sm text-destructive">{error}</Text>
              </View>
            ) : null}

            {/* Email field */}
            <View className="gap-1.5">
              <Text className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
                Email
              </Text>
              <View
                className="flex-row items-center gap-3 rounded-2xl border px-4"
                style={{
                  borderColor,
                  backgroundColor: inputBg,
                  height: 52,
                }}
              >
                <Mail size={16} color={iconColor} />
                <TextInput
                  className="flex-1 text-sm font-medium text-foreground"
                  placeholder="your@email.com"
                  placeholderTextColor={theme.mutedForeground}
                  value={email}
                  onChangeText={setEmail}
                  autoCapitalize="none"
                  keyboardType="email-address"
                  returnKeyType="next"
                  style={{
                    fontFamily: "PlusJakartaSans_500Medium",
                    color: theme.foreground,
                  }}
                />
              </View>
            </View>

            {/* Password field */}
            <View className="gap-1.5">
              <Text className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
                Password
              </Text>
              <View
                className="flex-row items-center gap-3 rounded-2xl border px-4"
                style={{
                  borderColor,
                  backgroundColor: inputBg,
                  height: 52,
                }}
              >
                <Lock size={16} color={iconColor} />
                <TextInput
                  className="flex-1 text-sm font-medium"
                  placeholder="Enter your password"
                  placeholderTextColor={theme.mutedForeground}
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={!showPassword}
                  returnKeyType="done"
                  onSubmitEditing={handleLogin}
                  style={{
                    fontFamily: "PlusJakartaSans_500Medium",
                    color: theme.foreground,
                  }}
                />
                <Pressable
                  onPress={() => setShowPassword((prev) => !prev)}
                  hitSlop={8}
                >
                  {showPassword ? (
                    <EyeOff size={16} color={iconColor} />
                  ) : (
                    <Eye size={16} color={iconColor} />
                  )}
                </Pressable>
              </View>
            </View>

            {/* Sign in button */}
            <Pressable
              onPress={handleLogin}
              disabled={isLoading}
              className="mt-1 items-center justify-center rounded-2xl"
              style={{
                height: 52,
                backgroundColor: theme.primary,
                opacity: isLoading ? 0.7 : 1,
              }}
            >
              {isLoading ? (
                <ActivityIndicator color={theme.primaryForeground} />
              ) : (
                <Text
                  className="text-sm font-black uppercase tracking-wider"
                  style={{ color: theme.primaryForeground }}
                >
                  Sign In
                </Text>
              )}
            </Pressable>
          </View>

          {/* Register link */}
          <View className="flex-row items-center justify-center gap-1">
            <Text className="text-sm text-muted-foreground">
              Don&apos;t have an account?
            </Text>
            <Pressable onPress={() => router.push("/(auth)/register")}>
              <Text
                className="text-sm font-bold"
                style={{ color: theme.primary }}
              >
                Create one
              </Text>
            </Pressable>
          </View>

          <Pressable
            onPress={() => router.push("/diagnostics")}
            className="items-center"
          >
            <Text
              className="text-sm font-bold"
              style={{ color: theme.primary }}
            >
              Open diagnostics
            </Text>
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}
