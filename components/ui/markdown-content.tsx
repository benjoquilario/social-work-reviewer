import { useMemo, useState } from "react"
import { Image } from "expo-image"
import { openBrowserAsync, WebBrowserPresentationStyle } from "expo-web-browser"
import { Pressable, Text, View } from "react-native"
import Markdown, { type RenderRules } from "react-native-markdown-display"

import { APP_FONTS } from "@/lib/fonts"
import { THEME } from "@/lib/theme"
import { useColorScheme } from "@/hooks/use-color-scheme"

type MarkdownContentProps = {
  markdown: string
}

function getMeaningfulImageAltText(alt: string): string {
  const trimmed = alt.trim()
  if (!trimmed) return ""
  if (/\.(png|jpe?g|gif|webp|svg|bmp|heic)$/i.test(trimmed)) return ""
  return trimmed
}

async function openMarkdownLink(url: string) {
  await openBrowserAsync(url, {
    presentationStyle: WebBrowserPresentationStyle.AUTOMATIC,
  })
}

function MarkdownImageBlock({ alt, src }: { alt: string; src: string }) {
  const [aspectRatio, setAspectRatio] = useState<number | null>(null)
  const [hasError, setHasError] = useState(false)
  const scheme = useColorScheme()
  const colors = THEME[scheme ?? "light"]
  const caption = getMeaningfulImageAltText(alt)

  if (hasError) {
    return (
      <View style={{ gap: 6 }}>
        <Text
          style={{
            fontSize: 12,
            lineHeight: 20,
            color: colors.mutedForeground,
          }}
        >
          Image unavailable.
        </Text>
        <Text
          style={{
            fontSize: 12,
            fontWeight: "700",
            color: colors.primary,
            textDecorationLine: "underline",
          }}
          onPress={() => void openMarkdownLink(src)}
        >
          Open image
        </Text>
      </View>
    )
  }

  return (
    <Pressable style={{ gap: 8 }} onPress={() => void openMarkdownLink(src)}>
      <Image
        source={{ uri: src }}
        style={{
          width: "100%",
          minHeight: aspectRatio ? undefined : 180,
          maxHeight: 520,
          aspectRatio: aspectRatio ?? 1.35,
        }}
        contentFit="contain"
        transition={120}
        onError={() => setHasError(true)}
        onLoad={(event) => {
          const source = Array.isArray(event.source)
            ? event.source[0]
            : event.source
          const width = typeof source?.width === "number" ? source.width : 0
          const height = typeof source?.height === "number" ? source.height : 0
          if (width > 0 && height > 0) setAspectRatio(width / height)
        }}
      />
      {caption ? (
        <Text
          style={{
            fontSize: 11,
            lineHeight: 16,
            color: colors.mutedForeground,
          }}
        >
          {caption}
        </Text>
      ) : null}
    </Pressable>
  )
}

// Image rule is stable — MarkdownImageBlock manages its own theme state internally
const markdownRules: RenderRules = {
  image: (node) => {
    const src = String(node.attributes?.src ?? "")
    const alt = String(node.attributes?.alt ?? "")
    if (!src) return null
    return <MarkdownImageBlock key={node.key} alt={alt} src={src} />
  },
}

export function MarkdownContent({ markdown }: MarkdownContentProps) {
  const scheme = useColorScheme()
  const colors = THEME[scheme ?? "light"]

  // Re-create styles only when the color scheme changes
  const markdownStyles = useMemo(
    () => ({
      // Base body — default text color and font size inherited by all children
      body: {
        color: colors.cardForeground,
        fontSize: 13,
        lineHeight: 24,
        fontFamily: APP_FONTS.regular,
      },
      // Headings
      heading1: {
        fontSize: 17,
        fontFamily: APP_FONTS.extraBold,
        lineHeight: 28,
        letterSpacing: -0.2,
        color: colors.cardForeground,
        marginTop: 8,
        marginBottom: 2,
      },
      heading2: {
        fontSize: 17,
        fontFamily: APP_FONTS.extraBold,
        lineHeight: 28,
        letterSpacing: -0.2,
        color: colors.cardForeground,
        marginTop: 8,
        marginBottom: 2,
      },
      heading3: {
        fontSize: 15,
        fontFamily: APP_FONTS.extraBold,
        lineHeight: 24,
        color: colors.cardForeground,
        marginTop: 6,
        marginBottom: 2,
      },
      heading4: {
        fontSize: 14,
        fontFamily: APP_FONTS.bold,
        lineHeight: 24,
        color: colors.cardForeground,
        marginTop: 4,
        marginBottom: 2,
      },
      heading5: {
        fontSize: 13,
        fontFamily: APP_FONTS.bold,
        lineHeight: 24,
        color: colors.cardForeground,
        marginTop: 4,
        marginBottom: 2,
      },
      heading6: {
        fontSize: 13,
        fontFamily: APP_FONTS.bold,
        lineHeight: 24,
        color: colors.mutedForeground,
        marginTop: 4,
        marginBottom: 2,
      },
      // Paragraph
      paragraph: {
        fontSize: 13,
        lineHeight: 24,
        marginTop: 2,
        marginBottom: 2,
      },
      // Inline emphasis
      strong: {
        fontFamily: APP_FONTS.extraBold,
      },
      em: {
        fontFamily: APP_FONTS.medium,
        fontStyle: "italic" as const,
      },
      s: {
        textDecorationLine: "line-through" as const,
      },
      // Inline & block code
      code_inline: {
        fontFamily: "monospace",
        fontSize: 13,
        color: colors.primary,
        backgroundColor: "transparent",
        borderWidth: 0,
      },
      fence: {
        fontFamily: "monospace",
        fontSize: 11,
        lineHeight: 20,
        color: colors.cardForeground,
        backgroundColor: "transparent",
        borderWidth: 0,
        paddingHorizontal: 0,
        paddingVertical: 2,
        marginHorizontal: 0,
      },
      code_block: {
        fontFamily: "monospace",
        fontSize: 11,
        lineHeight: 20,
        color: colors.cardForeground,
        backgroundColor: "transparent",
        borderWidth: 0,
        paddingHorizontal: 0,
        paddingVertical: 2,
        marginHorizontal: 0,
      },
      // Blockquote — no border/background, keep italic
      blockquote: {
        fontStyle: "italic" as const,
        borderLeftWidth: 0,
        paddingHorizontal: 0,
        marginHorizontal: 0,
        backgroundColor: "transparent",
      },
      // Lists
      bullet_list: {
        marginVertical: 2,
      },
      ordered_list: {
        marginVertical: 2,
      },
      // Bullet icon — unicode bullet in primary color
      bullet_list_icon: {
        color: colors.primary,
        fontSize: 18,
        lineHeight: 24,
        marginRight: 8,
        marginTop: 1,
      },
      bullet_list_content: {
        flex: 1,
        fontSize: 13,
        lineHeight: 24,
        fontFamily: APP_FONTS.regular,
      },
      // Ordered list number in primary color
      ordered_list_icon: {
        color: colors.primary,
        fontFamily: APP_FONTS.extraBold,
        fontSize: 11,
        lineHeight: 24,
        marginRight: 8,
        minWidth: 20,
        textAlign: "right" as const,
      },
      ordered_list_content: {
        flex: 1,
        fontSize: 13,
        lineHeight: 24,
        fontFamily: APP_FONTS.regular,
      },
      // Links
      link: {
        color: colors.primary,
        fontFamily: APP_FONTS.bold,
        textDecorationLine: "underline" as const,
      },
      blocklink: {
        color: colors.primary,
        fontFamily: APP_FONTS.bold,
        textDecorationLine: "underline" as const,
      },
      // Horizontal rule
      hr: {
        backgroundColor: colors.border,
        height: 1,
        marginVertical: 6,
      },
      // Tables
      table: {
        marginVertical: 4,
        borderWidth: 1,
        borderColor: colors.border,
        borderRadius: 6,
        overflow: "hidden" as const,
      },
      thead: {
        backgroundColor: colors.muted,
      },
      th: {
        fontSize: 12,
        fontFamily: APP_FONTS.bold,
        padding: 8,
        color: colors.cardForeground,
      },
      td: {
        fontSize: 12,
        fontFamily: APP_FONTS.regular,
        padding: 8,
        color: colors.cardForeground,
      },
      tr: {
        borderBottomWidth: 1,
        borderColor: colors.border,
      },
    }),
    [colors]
  )

  if (!markdown.trim()) return null

  return (
    <Markdown
      style={markdownStyles}
      rules={markdownRules}
      mergeStyle
      onLinkPress={(url) => {
        void openMarkdownLink(url)
        // Return false — our handler fully replaces the default Linking.openURL
        return false
      }}
    >
      {markdown}
    </Markdown>
  )
}
