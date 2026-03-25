import { useEffect, useMemo, useState } from "react"
import { useAuth } from "@/contexts/auth-context"
import { useQuery } from "@tanstack/react-query"
import { useLocalSearchParams, useRouter } from "expo-router"
import { openBrowserAsync, WebBrowserPresentationStyle } from "expo-web-browser"
import {
  ArrowLeft,
  ArrowRight,
  ArrowUpRight,
  CirclePlay,
  FileText,
  Info,
} from "lucide-react-native"
import { Pressable, ScrollView, View } from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"

import { getLearningMaterialDetail } from "@/lib/learning-content"
import { THEME } from "@/lib/theme"
import { useColorScheme } from "@/hooks/use-color-scheme"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Skeleton } from "@/components/ui/skeleton"
import { Text } from "@/components/ui/text"

type ContentBlock =
  | { kind: "heading"; text: string }
  | { kind: "paragraph"; text: string }
  | { kind: "bullet-list"; items: string[] }
  | { kind: "numbered-list"; items: string[] }
  | { kind: "quote"; text: string }
  | { kind: "code"; text: string }

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null
}

function decodeHtmlEntities(value: string) {
  return value
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
}

function normalizeInlineText(value: string) {
  return decodeHtmlEntities(value).replace(/\s+/g, " ").trim()
}

function extractNodeText(node: unknown): string {
  if (typeof node === "string") {
    return normalizeInlineText(node)
  }

  if (typeof node === "number" || typeof node === "boolean") {
    return String(node)
  }

  if (Array.isArray(node)) {
    return node
      .map((entry) => extractNodeText(entry))
      .filter(Boolean)
      .join(" ")
      .trim()
  }

  if (!isRecord(node)) {
    return ""
  }

  const textCandidates = [
    node.text,
    node.value,
    node.alt,
    node.label,
    node.name,
  ]
    .filter((candidate): candidate is string => typeof candidate === "string")
    .map((candidate) => normalizeInlineText(candidate))
    .filter(Boolean)

  const childText = [node.children, node.content, node.items, node.blocks]
    .map((candidate) => extractNodeText(candidate))
    .filter(Boolean)

  return [...textCandidates, ...childText].join(" ").trim()
}

function parseBlocksFromSections(input: string): ContentBlock[] {
  const sections = input
    .replace(/\r\n/g, "\n")
    .split(/\n\s*\n/g)
    .map((section) => section.trim())
    .filter(Boolean)

  return sections.reduce<ContentBlock[]>((blocks, section) => {
    const lines = section
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean)

    if (lines.length === 0) {
      return blocks
    }

    if (
      lines[0].startsWith("```") &&
      lines[lines.length - 1]?.startsWith("```")
    ) {
      blocks.push({
        kind: "code",
        text: lines.slice(1, -1).join("\n").trim(),
      })
      return blocks
    }

    if (lines.every((line) => /^[-*•]\s+/.test(line))) {
      blocks.push({
        kind: "bullet-list",
        items: lines.map((line) => line.replace(/^[-*•]\s+/, "").trim()),
      })
      return blocks
    }

    if (lines.every((line) => /^\d+[.)]\s+/.test(line))) {
      blocks.push({
        kind: "numbered-list",
        items: lines.map((line) => line.replace(/^\d+[.)]\s+/, "").trim()),
      })
      return blocks
    }

    if (lines.every((line) => line.startsWith(">"))) {
      blocks.push({
        kind: "quote",
        text: lines
          .map((line) => line.replace(/^>\s?/, "").trim())
          .join(" ")
          .trim(),
      })
      return blocks
    }

    if (/^#{1,6}\s+/.test(lines[0])) {
      const heading = lines[0].replace(/^#{1,6}\s+/, "").trim()
      const rest = lines.slice(1).join(" ").trim()

      blocks.push({ kind: "heading", text: heading })

      if (rest) {
        blocks.push({ kind: "paragraph", text: rest })
      }

      return blocks
    }

    blocks.push({
      kind: "paragraph",
      text: lines.join(" ").trim(),
    })

    return blocks
  }, [])
}

function htmlToTextSections(input: string) {
  return decodeHtmlEntities(
    input
      .replace(/<br\s*\/?>/gi, "\n")
      .replace(
        /<\/(p|div|section|article|blockquote|pre|ul|ol|li|h[1-6])>/gi,
        "\n"
      )
      .replace(/<li[^>]*>/gi, "- ")
      .replace(/<blockquote[^>]*>/gi, "> ")
      .replace(/<h1[^>]*>/gi, "# ")
      .replace(/<h2[^>]*>/gi, "## ")
      .replace(/<h3[^>]*>/gi, "### ")
      .replace(/<h4[^>]*>/gi, "#### ")
      .replace(/<h5[^>]*>/gi, "##### ")
      .replace(/<h6[^>]*>/gi, "###### ")
      .replace(/<[^>]+>/g, " ")
  )
}

function blocksFromRichJson(node: unknown): ContentBlock[] {
  if (typeof node === "string") {
    return parseBlocksFromSections(node)
  }

  if (Array.isArray(node)) {
    return node.flatMap((entry) => blocksFromRichJson(entry))
  }

  if (!isRecord(node)) {
    return []
  }

  const nodeType = String(node.type ?? node.nodeType ?? "").toLowerCase()
  const children = node.children ?? node.content ?? node.blocks ?? node.items

  if (
    nodeType.includes("bullet") ||
    nodeType === "ul" ||
    nodeType === "unordered-list"
  ) {
    const items = Array.isArray(children)
      ? children.map((item) => extractNodeText(item)).filter(Boolean)
      : []

    return items.length ? [{ kind: "bullet-list", items }] : []
  }

  if (
    nodeType.includes("ordered") ||
    nodeType === "ol" ||
    nodeType === "numbered-list"
  ) {
    const items = Array.isArray(children)
      ? children.map((item) => extractNodeText(item)).filter(Boolean)
      : []

    return items.length ? [{ kind: "numbered-list", items }] : []
  }

  if (nodeType.includes("heading") || /^h[1-6]$/.test(nodeType)) {
    const text = extractNodeText(node)
    return text ? [{ kind: "heading", text }] : []
  }

  if (nodeType.includes("quote")) {
    const text = extractNodeText(node)
    return text ? [{ kind: "quote", text }] : []
  }

  if (nodeType.includes("code")) {
    const text = extractNodeText(node)
    return text ? [{ kind: "code", text }] : []
  }

  if (nodeType.includes("paragraph") || nodeType === "p") {
    const text = extractNodeText(node)
    return text ? [{ kind: "paragraph", text }] : []
  }

  const nestedBlocks = blocksFromRichJson(children)
  if (nestedBlocks.length > 0) {
    return nestedBlocks
  }

  const fallbackText = extractNodeText(node)
  return fallbackText ? [{ kind: "paragraph", text: fallbackText }] : []
}

function parseRichContentBlocks(content: string): ContentBlock[] {
  const trimmed = content.trim()

  if (!trimmed) {
    return []
  }

  try {
    const parsed = JSON.parse(trimmed) as unknown
    const jsonBlocks = blocksFromRichJson(parsed)

    if (jsonBlocks.length > 0) {
      return jsonBlocks
    }
  } catch {
    // Fall through to HTML/markdown/plain-text parsing.
  }

  const normalizedText = /<\/?[a-z][\s\S]*>/i.test(trimmed)
    ? htmlToTextSections(trimmed)
    : trimmed

  return parseBlocksFromSections(normalizedText)
}

function formatCreatedAt(value: string) {
  const parsed = new Date(value)

  if (Number.isNaN(parsed.getTime())) {
    return value || "Not provided"
  }

  return new Intl.DateTimeFormat("en-PH", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(parsed)
}

function getMaterialActionLabel(type: string) {
  if (type === "video") {
    return "Watch video"
  }

  if (type === "pdf") {
    return "Open PDF"
  }

  return "Open attachment"
}

function getMaterialActionIcon(type: string, color: string) {
  if (type === "video") {
    return <CirclePlay size={16} color={color} strokeWidth={2.2} />
  }

  return <FileText size={16} color={color} strokeWidth={2.2} />
}

function renderContentBlock(block: ContentBlock, index: number) {
  if (block.kind === "heading") {
    return (
      <Text
        key={`heading-${index}`}
        className="text-[17px] font-black leading-7 text-card-foreground"
      >
        {block.text}
      </Text>
    )
  }

  if (block.kind === "quote") {
    return (
      <View
        key={`quote-${index}`}
        className="rounded-2xl border border-primary/20 bg-primary/5 px-4 py-3"
      >
        <Text className="text-[13px] leading-6 text-card-foreground">
          {block.text}
        </Text>
      </View>
    )
  }

  if (block.kind === "code") {
    return (
      <View
        key={`code-${index}`}
        className="rounded-2xl border border-border bg-background px-4 py-3"
      >
        <Text className="font-mono text-[12px] leading-6 text-card-foreground">
          {block.text}
        </Text>
      </View>
    )
  }

  if (block.kind === "bullet-list" || block.kind === "numbered-list") {
    return (
      <View key={`list-${index}`} className="gap-2">
        {block.items.map((item, itemIndex) => (
          <View key={`${index}-${itemIndex}`} className="flex-row gap-3">
            <Text className="mt-0.5 text-[13px] font-bold text-primary">
              {block.kind === "bullet-list" ? "•" : `${itemIndex + 1}.`}
            </Text>
            <Text className="flex-1 text-[13px] leading-6 text-card-foreground">
              {item}
            </Text>
          </View>
        ))}
      </View>
    )
  }

  return (
    <Text
      key={`paragraph-${index}`}
      className="text-[14px] leading-7 text-card-foreground"
    >
      {block.text}
    </Text>
  )
}

export default function LessonDetailScreen() {
  const router = useRouter()
  const { isAuthenticated, profile, refreshProfile } = useAuth()
  const params = useLocalSearchParams<{ lessonId?: string }>()
  const [isDetailsOpen, setIsDetailsOpen] = useState(false)
  const colorScheme = useColorScheme()
  const primaryColor =
    colorScheme === "dark" ? THEME.dark.primary : THEME.light.primary

  const lessonId = params.lessonId ?? ""
  const isPremiumUser = profile?.isPremium === true

  useEffect(() => {
    if (isAuthenticated && !profile) {
      void refreshProfile()
    }
  }, [isAuthenticated, profile, refreshProfile])

  const materialQuery = useQuery({
    queryKey: ["learning-material-detail", lessonId, isPremiumUser],
    enabled: Boolean(lessonId),
    queryFn: () =>
      getLearningMaterialDetail(lessonId, { viewerIsPremium: isPremiumUser }),
  })

  const materialDetail = materialQuery.data ?? null

  const contentBlocks = useMemo<ContentBlock[]>(() => {
    return parseRichContentBlocks(materialDetail?.material.content ?? "")
  }, [materialDetail?.material.content])

  const hasRenderableNote = contentBlocks.length > 0
  const hasExternalResource = Boolean(materialDetail?.material.fileUrl)

  async function handleOpenResource() {
    const resourceUrl = materialDetail?.material.fileUrl

    if (!resourceUrl) {
      return
    }

    await openBrowserAsync(resourceUrl, {
      presentationStyle: WebBrowserPresentationStyle.AUTOMATIC,
    })
  }

  if (materialQuery.isLoading) {
    return (
      <SafeAreaView className="flex-1 bg-background">
        <ScrollView contentContainerClassName="gap-4 px-4 pb-7 pt-3">
          <Skeleton className="h-10 w-10 rounded-2xl" />
          <Skeleton className="h-28 rounded-2xl" />
          <Skeleton className="h-24 rounded-2xl" />
          <Skeleton className="h-32 rounded-2xl" />
        </ScrollView>
      </SafeAreaView>
    )
  }

  if (materialQuery.error) {
    return (
      <SafeAreaView className="flex-1 bg-background">
        <View className="flex-1 items-center justify-center gap-3 px-6">
          <Text className="text-2xl font-black text-foreground">
            Material unavailable
          </Text>
          <Text className="text-center text-sm leading-6 text-muted-foreground">
            {materialQuery.error instanceof Error
              ? materialQuery.error.message
              : "Unable to load learning material from Appwrite."}
          </Text>
          <Button
            className="h-11 w-full"
            onPress={() => router.replace("/learn")}
          >
            <Text className="font-bold text-primary-foreground">
              Back to Learning Center
            </Text>
          </Button>
        </View>
      </SafeAreaView>
    )
  }

  if (!materialDetail) {
    return (
      <SafeAreaView className="flex-1 bg-background">
        <View className="flex-1 items-center justify-center gap-3 px-6">
          <Text className="text-2xl font-black text-foreground">
            Material not found
          </Text>
          <Text className="text-center text-sm leading-6 text-muted-foreground">
            This learning material ID does not exist in Appwrite.
          </Text>
          <Button
            className="h-11 w-full"
            onPress={() => router.replace("/learn")}
          >
            <Text className="font-bold text-primary-foreground">
              Back to Learning Center
            </Text>
          </Button>
        </View>
      </SafeAreaView>
    )
  }

  if (materialDetail.material.isLocked) {
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
              className="h-10 w-10 items-center justify-center rounded-2xl border border-border bg-card"
              onPress={() => setIsDetailsOpen(true)}
            >
              <Info size={18} color={primaryColor} strokeWidth={2.3} />
            </Pressable>
          </View>

          <Card>
            <CardContent className="gap-3 px-3.5 py-4">
              <Text className="text-base font-black text-card-foreground">
                Premium Content Locked
              </Text>
              <Text className="text-[13px] leading-5 text-muted-foreground">
                {materialDetail.material.title} is available only to premium
                subscribers.
              </Text>
              <Text className="text-[12px] leading-5 text-muted-foreground">
                Subject: {materialDetail.subject.name}
              </Text>
              <Text className="text-[12px] leading-5 text-muted-foreground">
                Topic: {materialDetail.topic.title}
              </Text>
              <Button className="h-11" onPress={() => router.back()}>
                <Text className="font-bold text-primary-foreground">
                  Back to Topic Materials
                </Text>
              </Button>
            </CardContent>
          </Card>
        </ScrollView>
      </SafeAreaView>
    )
  }

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

          <View className="flex-row items-center gap-2">
            {hasExternalResource ? (
              <Button
                variant="outline"
                size="sm"
                className="h-10 rounded-2xl px-3"
                onPress={() => void handleOpenResource()}
              >
                {getMaterialActionIcon(
                  materialDetail.material.type,
                  primaryColor
                )}
                <Text className="text-xs font-bold">
                  {getMaterialActionLabel(materialDetail.material.type)}
                </Text>
              </Button>
            ) : null}
            <Pressable
              className="h-10 w-10 items-center justify-center rounded-2xl border border-border bg-card"
              onPress={() => setIsDetailsOpen(true)}
            >
              <Info size={18} color={primaryColor} strokeWidth={2.3} />
            </Pressable>
          </View>
        </View>

        <View className="gap-3 px-1">
          <Text className="text-[13px] font-black uppercase tracking-[1.4px] text-primary">
            {materialDetail.subject.name} · {materialDetail.topic.title} ·{" "}
            {materialDetail.material.type}
          </Text>

          <Text className="text-[17px] font-black leading-7 text-foreground">
            {materialDetail.material.title}
          </Text>
          <Text className="text-[13px] leading-6 text-muted-foreground">
            {materialDetail.material.type === "note"
              ? "Formatted directly from your Appwrite note content."
              : "This material is linked to an external learning resource."}
          </Text>
        </View>

        {hasExternalResource ? (
          <Card>
            <CardContent className="gap-3 px-3.5 py-3.5">
              <View className="flex-row items-center gap-2">
                {getMaterialActionIcon(
                  materialDetail.material.type,
                  primaryColor
                )}
                <Text className="text-sm font-black text-card-foreground">
                  External Resource
                </Text>
              </View>
              <Text className="text-[13px] leading-6 text-muted-foreground">
                This {materialDetail.material.type} is hosted from the attached
                file URL. Open it in-app to view the original resource.
              </Text>
              <Button
                className="h-11 rounded-2xl"
                onPress={() => void handleOpenResource()}
              >
                <ArrowUpRight
                  size={16}
                  color={THEME.light.primaryForeground}
                  strokeWidth={2.2}
                />
                <Text className="font-bold text-primary-foreground">
                  {getMaterialActionLabel(materialDetail.material.type)}
                </Text>
              </Button>
            </CardContent>
          </Card>
        ) : null}

        <Card className="border-none bg-background">
          <CardContent className="gap-3 bg-background px-3.5 py-3.5">
            {hasRenderableNote ? (
              <View className="gap-3">
                {contentBlocks.map((block, index) =>
                  renderContentBlock(block, index)
                )}
              </View>
            ) : (
              <Text className="text-[13px] leading-6 text-muted-foreground">
                {hasExternalResource
                  ? "No inline note body was provided for this material. Use the resource action above to view the original file."
                  : "No readable note content was provided for this material yet."}
              </Text>
            )}
          </CardContent>
        </Card>

        <Pressable
          className="mt-1 self-end rounded-full border border-border bg-card p-3.5"
          onPress={() => router.back()}
        >
          <ArrowRight size={22} color={primaryColor} strokeWidth={2.2} />
        </Pressable>
      </ScrollView>

      <Dialog open={isDetailsOpen} onOpenChange={setIsDetailsOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Material Details</DialogTitle>
            <DialogDescription>
              Metadata for this learning material and its source.
            </DialogDescription>
          </DialogHeader>

          <View className="gap-2.5">
            <Text className="text-[13px] leading-6 text-muted-foreground">
              Subject:{" "}
              <Text className="font-bold text-card-foreground">
                {materialDetail.subject.name}
              </Text>
            </Text>
            <Text className="text-[13px] leading-6 text-muted-foreground">
              Topic:{" "}
              <Text className="font-bold text-card-foreground">
                {materialDetail.topic.title}
              </Text>
            </Text>
            <Text className="text-[13px] leading-6 text-muted-foreground">
              Type:{" "}
              <Text className="font-bold uppercase text-card-foreground">
                {materialDetail.material.type}
              </Text>
            </Text>
            <Text className="text-[13px] leading-6 text-muted-foreground">
              Premium:{" "}
              <Text className="font-bold text-card-foreground">
                {materialDetail.material.isPremium ? "Yes" : "No"}
              </Text>
            </Text>
            <Text className="text-[13px] leading-6 text-muted-foreground">
              Created:{" "}
              <Text className="font-bold text-card-foreground">
                {formatCreatedAt(materialDetail.material.createdAt)}
              </Text>
            </Text>
            <Text className="text-[13px] leading-6 text-muted-foreground">
              Source file:{" "}
              <Text className="font-bold text-card-foreground">
                {hasExternalResource ? "Attached" : "None"}
              </Text>
            </Text>
          </View>

          <DialogFooter>
            {hasExternalResource ? (
              <Button
                className="h-11 rounded-2xl"
                onPress={() => void handleOpenResource()}
              >
                <ArrowUpRight
                  size={16}
                  color={THEME.light.primaryForeground}
                  strokeWidth={2.2}
                />
                <Text className="font-bold text-primary-foreground">
                  {getMaterialActionLabel(materialDetail.material.type)}
                </Text>
              </Button>
            ) : null}
            <Button
              variant="outline"
              className="h-11 rounded-2xl"
              onPress={() => setIsDetailsOpen(false)}
            >
              <Text className="font-bold">Close</Text>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </SafeAreaView>
  )
}
