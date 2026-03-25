import { useEffect, useMemo, useState } from "react"
import { useRouter } from "expo-router"
import { ArrowLeft, RefreshCcw } from "lucide-react-native"
import { Pressable, ScrollView, View } from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"

import {
  runAppwriteDiagnostics,
  type AppwriteDiagnosticResult,
} from "@/lib/appwrite-diagnostics"
import { THEME } from "@/lib/theme"
import { useColorScheme } from "@/hooks/use-color-scheme"
import { Card, CardContent } from "@/components/ui/card"
import { Text } from "@/components/ui/text"

const STATUS_STYLES = {
  success: {
    label: "OK",
    className: "text-green-700",
    backgroundClassName: "bg-green-500/10",
  },
  warning: {
    label: "WARN",
    className: "text-amber-700",
    backgroundClassName: "bg-amber-500/10",
  },
  error: {
    label: "FAIL",
    className: "text-destructive",
    backgroundClassName: "bg-destructive/10",
  },
} as const

export default function DiagnosticsScreen() {
  const router = useRouter()
  const colorScheme = useColorScheme()
  const primaryColor =
    colorScheme === "dark" ? THEME.dark.primary : THEME.light.primary
  const [results, setResults] = useState<AppwriteDiagnosticResult[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    void loadDiagnostics()
  }, [])

  async function loadDiagnostics() {
    setIsLoading(true)
    try {
      const nextResults = await runAppwriteDiagnostics()
      setResults(nextResults)
    } finally {
      setIsLoading(false)
    }
  }

  const summary = useMemo(() => {
    const errors = results.filter((result) => result.status === "error").length
    const warnings = results.filter(
      (result) => result.status === "warning"
    ).length

    return { errors, warnings, total: results.length }
  }, [results])

  return (
    <SafeAreaView className="flex-1 bg-background">
      <ScrollView contentContainerClassName="gap-4 px-4 pb-7 pt-3">
        <View className="flex-row items-center justify-between gap-3">
          <Pressable
            className="h-10 w-10 items-center justify-center rounded-2xl"
            onPress={() => router.back()}
          >
            <ArrowLeft size={22} color={primaryColor} strokeWidth={2.5} />
          </Pressable>

          <Pressable
            className="h-10 w-10 items-center justify-center rounded-2xl"
            onPress={() => void loadDiagnostics()}
          >
            <RefreshCcw size={20} color={primaryColor} strokeWidth={2.2} />
          </Pressable>
        </View>

        <View className="gap-2 px-1">
          <Text className="text-[11px] font-black uppercase tracking-[1.6px] text-primary">
            Appwrite Diagnostics
          </Text>
          <Text className="text-[22px] font-black leading-tight text-foreground">
            Access Checks
          </Text>
          <Text className="text-[13px] leading-5 text-muted-foreground">
            Verify authentication, profile access, and collection permissions
            from the mobile app session.
          </Text>
        </View>

        <Card>
          <CardContent className="gap-2.5 px-3.5 py-3.5">
            <Text className="text-sm font-black text-card-foreground">
              Summary
            </Text>
            <Text className="text-[12px] leading-5 text-muted-foreground">
              {isLoading
                ? "Running diagnostics..."
                : `${summary.total} checks, ${summary.errors} errors, ${summary.warnings} warnings.`}
            </Text>
          </CardContent>
        </Card>

        {results.map((result) => {
          const statusStyle = STATUS_STYLES[result.status]

          return (
            <Card key={result.key}>
              <CardContent className="gap-2.5 px-3.5 py-3.5">
                <View className="flex-row items-center justify-between gap-3">
                  <Text className="text-sm font-black text-card-foreground">
                    {result.label}
                  </Text>
                  <View
                    className={`rounded-full px-2.5 py-1 ${statusStyle.backgroundClassName}`}
                  >
                    <Text
                      className={`text-[10px] font-black uppercase tracking-[1px] ${statusStyle.className}`}
                    >
                      {statusStyle.label}
                    </Text>
                  </View>
                </View>
                <Text className="text-[12px] leading-5 text-muted-foreground">
                  {result.message}
                </Text>
                {result.detail ? (
                  <Text className="text-[11px] leading-5 text-muted-foreground">
                    {result.detail}
                  </Text>
                ) : null}
              </CardContent>
            </Card>
          )
        })}
      </ScrollView>
    </SafeAreaView>
  )
}
