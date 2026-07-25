import { useState } from "react"
import { useAuth } from "@/contexts/auth-context"
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
  View,
} from "react-native"
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context"

import { useTheme } from "@/hooks/use-theme"
import { Button } from "@/components/ui/button"
import { IconButton } from "@/components/ui/icon-button"
import { FormField, Input } from "@/components/ui/input"
import { Text } from "@/components/ui/text"
import { ScrollView } from "@/components/ui/virtualized-scroll-view"

export default function RegisterScreen() {
  const router = useRouter()
  const register = useAuth((state) => state.register)
  const insets = useSafeAreaInsets()
  const { theme } = useTheme()

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

  return (
    <SafeAreaView className="flex-1 bg-background">
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={Math.max(insets.top, 12)}
        className="flex-1"
      >
        <ScrollView
          automaticallyAdjustKeyboardInsets
          contentInsetAdjustmentBehavior="automatic"
          contentContainerClassName="px-6 gap-6"
          contentContainerStyle={{
            flexGrow: 1,
            justifyContent: "center",
            paddingTop: 24,
            paddingBottom: Math.max(insets.bottom, 24) + 24,
          }}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="interactive"
        >
          {/* Brand + heading */}
          <View className="gap-5">
            <View
              className="h-16 w-16 items-center justify-center rounded-[22px]"
              style={{ backgroundColor: theme.primary }}
            >
              <BookOpenText
                size={28}
                color={theme.primaryForeground}
                strokeWidth={2.5}
              />
            </View>
            <View className="gap-1.5">
              <Text className="text-[12px] font-black uppercase tracking-[2px] text-primary">
                Reviewer
              </Text>
              <Text className="text-[30px] font-black leading-10 text-foreground">
                Create your account
              </Text>
              <Text className="text-[15px] leading-6 text-muted-foreground">
                Set up your review path, practice with board-exam drills, and
                track your progress as you go.
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

            {/* Full name field */}
            <FormField label="Full Name">
              <Input
                leading={<User size={16} color={theme.mutedForeground} />}
                placeholder="Maria Santos"
                value={fullName}
                onChangeText={setFullName}
                returnKeyType="next"
              />
            </FormField>

            {/* Email field */}
            <FormField label="Email">
              <Input
                leading={<Mail size={16} color={theme.mutedForeground} />}
                placeholder="your@email.com"
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
                keyboardType="email-address"
                returnKeyType="next"
              />
            </FormField>

            {/* Password field */}
            <FormField label="Password">
              <Input
                leading={<Lock size={16} color={theme.mutedForeground} />}
                trailing={
                  <IconButton
                    label={showPassword ? "Hide password" : "Show password"}
                    size="sm"
                    className="-mr-2 h-9 w-9"
                    onPress={() => setShowPassword((prev) => !prev)}
                  >
                    {showPassword ? (
                      <EyeOff size={16} color={theme.mutedForeground} />
                    ) : (
                      <Eye size={16} color={theme.mutedForeground} />
                    )}
                  </IconButton>
                }
                placeholder="At least 8 characters"
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
                returnKeyType="done"
                onSubmitEditing={handleRegister}
              />
            </FormField>

            {/* Create account button */}
            <Button
              size="lg"
              className="mt-1"
              onPress={handleRegister}
              disabled={isLoading}
            >
              {isLoading ? (
                <ActivityIndicator color={theme.primaryForeground} />
              ) : (
                <Text>Start Exploring</Text>
              )}
            </Button>
          </View>

          {/* Login link */}
          <View className="flex-row items-center justify-center gap-1">
            <Text className="text-sm text-muted-foreground">
              Already have an account?
            </Text>
            <Pressable onPress={() => router.push("/(auth)/login")}>
              <Text className="text-sm font-bold text-primary">Sign in</Text>
            </Pressable>
          </View>

          <Pressable
            onPress={() => router.push("/diagnostics")}
            className="items-center"
          >
            <Text className="text-sm font-bold text-primary">
              Open diagnostics
            </Text>
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}
