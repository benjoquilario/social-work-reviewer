import { useState } from "react"
import { useAuth } from "@/contexts/auth-context"
import { Image } from "expo-image"
import { useRouter } from "expo-router"
import {
  BookOpenText,
  Eye,
  EyeOff,
  Lock,
  Mail,
  User,
} from "lucide-react-native"
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  TextInput,
  View,
} from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"

import { THEME } from "@/lib/theme"
import { useColorScheme } from "@/hooks/use-color-scheme"
import { Text } from "@/components/ui/text"
import { ScrollView } from "@/components/ui/virtualized-scroll-view"

export default function RegisterScreen() {
  const router = useRouter()
  const register = useAuth((state) => state.register)
  const colorScheme = useColorScheme()
  const isDark = colorScheme === "dark"
  const theme = isDark ? THEME.dark : THEME.light

  const [fullName, setFullName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleRegister() {
    if (!fullName.trim() || !email.trim() || !password.trim()) {
      setError("Please fill in all fields.")
      return
    }
    if (password.length < 8) {
      setError("Password must be at least 8 characters.")
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      await register(email.trim(), password, fullName.trim())
      router.replace("/(tabs)")
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : "Registration failed. Please try again."
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
          contentInsetAdjustmentBehavior="automatic"
          contentContainerClassName="flex-1 px-6 justify-center gap-6"
          keyboardShouldPersistTaps="handled"
        >
          {/* Logo + branding */}
          <View
            className="overflow-hidden rounded-[30px] border px-5 py-5"
            style={{
              borderColor: borderColor,
              backgroundColor: isDark ? theme.card : "hsl(190 55% 97%)",
            }}
          >
            <View className="items-center gap-4">
              <View className="h-[170px] w-full items-center justify-center rounded-[26px]">
                <Image
                  source={require("@/assets/images/happy-graduation.png")}
                  style={{ width: 180, height: 180 }}
                  contentFit="contain"
                />
              </View>
              <View className="items-center gap-1.5">
                <View
                  className="rounded-full px-3 py-1"
                  style={{ backgroundColor: theme.primary }}
                >
                  <Text
                    className="text-[10px] font-black uppercase tracking-[1.2px]"
                    style={{ color: theme.primaryForeground }}
                  >
                    Start Exploring
                  </Text>
                </View>
                <Text className="text-center text-2xl font-black text-foreground">
                  Build your board exam momentum
                </Text>
                <Text className="text-center text-sm leading-6 text-muted-foreground">
                  Create your account, explore categories, and jump into guided
                  review sessions with a brighter first experience.
                </Text>
              </View>

              <View
                className="w-full flex-row items-center gap-2 rounded-2xl px-3.5 py-3"
                style={{
                  backgroundColor: isDark
                    ? theme.muted
                    : "hsl(0 0% 100% / 0.88)",
                }}
              >
                <View
                  className="h-10 w-10 items-center justify-center rounded-2xl"
                  style={{ backgroundColor: theme.primary }}
                >
                  <BookOpenText size={18} color={theme.primaryForeground} />
                </View>
                <View className="flex-1 gap-0.5">
                  <Text className="text-[13px] font-black text-foreground">
                    Personalized study start
                  </Text>
                  <Text className="text-[12px] leading-5 text-muted-foreground">
                    Sign up to unlock your review path, drills, and progress.
                  </Text>
                </View>
              </View>
            </View>
          </View>

          {/* Form */}
          <View className="gap-3">
            {error ? (
              <View className="rounded-2xl border border-destructive/30 bg-destructive/10 px-4 py-3">
                <Text className="text-sm text-destructive">{error}</Text>
              </View>
            ) : null}

            {/* Full name field */}
            <View className="gap-1.5">
              <Text className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
                Full Name
              </Text>
              <View
                className="flex-row items-center gap-3 rounded-2xl border px-4"
                style={{ borderColor, backgroundColor: inputBg, height: 52 }}
              >
                <User size={16} color={iconColor} />
                <TextInput
                  className="flex-1 text-sm"
                  placeholder="Maria Santos"
                  placeholderTextColor={theme.mutedForeground}
                  value={fullName}
                  onChangeText={setFullName}
                  returnKeyType="next"
                  style={{
                    fontFamily: "PlusJakartaSans_500Medium",
                    color: theme.foreground,
                  }}
                />
              </View>
            </View>

            {/* Email field */}
            <View className="gap-1.5">
              <Text className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
                Email
              </Text>
              <View
                className="flex-row items-center gap-3 rounded-2xl border px-4"
                style={{ borderColor, backgroundColor: inputBg, height: 52 }}
              >
                <Mail size={16} color={iconColor} />
                <TextInput
                  className="flex-1 text-sm"
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
                style={{ borderColor, backgroundColor: inputBg, height: 52 }}
              >
                <Lock size={16} color={iconColor} />
                <TextInput
                  className="flex-1 text-sm"
                  placeholder="At least 8 characters"
                  placeholderTextColor={theme.mutedForeground}
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={!showPassword}
                  returnKeyType="done"
                  onSubmitEditing={handleRegister}
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

            {/* Create account button */}
            <Pressable
              onPress={handleRegister}
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
                  Start Exploring
                </Text>
              )}
            </Pressable>
          </View>

          {/* Login link */}
          <View className="flex-row items-center justify-center gap-1">
            <Text className="text-sm text-muted-foreground">
              Already have an account?
            </Text>
            <Pressable onPress={() => router.push("/(auth)/login")}>
              <Text
                className="text-sm font-bold"
                style={{ color: theme.primary }}
              >
                Sign in
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
