type ContentBlock =
  | { kind: "heading"; text: string; level: number }
  | { kind: "image"; alt: string; src: string }
  | { kind: "paragraph"; text: string }
  | { kind: "bullet-list"; items: string[] }
  | { kind: "numbered-list"; items: string[] }
  | { kind: "quote"; text: string }
  | { kind: "code"; text: string }

function parseMarkdownImage(value: string) {
  const match = value.trim().match(/^!\[([^\]]*)\]\(([^)]+)\)$/)

  if (!match) {
    return null
  }

  return {
    alt: match[1].trim(),
    src: match[2].trim().replace(/^<|>$/g, ""),
  }
}

function getMeaningfulImageAltText(alt: string) {
  const trimmed = alt.trim()

  if (!trimmed) {
    return ""
  }

  if (/\.(png|jpe?g|gif|webp|svg|bmp|heic)$/i.test(trimmed)) {
    return ""
  }

  return trimmed
}

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

    if (lines.length === 1) {
      const image = parseMarkdownImage(lines[0])

      if (image) {
        blocks.push({
          kind: "image",
          alt: image.alt,
          src: image.src,
        })
        return blocks
      }
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
          .join("\n")
          .trim(),
      })
      return blocks
    }

    const headingMatch = lines[0].match(/^(#{1,6})\s+(.*)$/)
    if (headingMatch) {
      const [, hashes, headingText] = headingMatch
      const rest = lines.slice(1).join(" ").trim()

      blocks.push({
        kind: "heading",
        text: headingText.trim(),
        level: hashes.length,
      })

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

function getHeadingLevel(nodeType: string) {
  const headingMatch = nodeType.match(/(?:heading[-_]?|h)([1-6])/)
  return headingMatch ? Number(headingMatch[1]) : 2
}

function htmlToMarkdown(input: string) {
  return decodeHtmlEntities(
    input
      .replace(/\r\n/g, "\n")
      .replace(/<img\b([^>]*)>/gi, (_match, attributes: string) => {
        const src =
          attributes.match(/\bsrc=["']([^"']+)["']/i)?.[1]?.trim() ?? ""
        const alt =
          attributes.match(/\balt=["']([^"']*)["']/i)?.[1]?.trim() ?? ""

        if (!src) {
          return ""
        }

        return `\n![${alt}](${src})\n`
      })
      .replace(
        /<a\b[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi,
        (_match, href: string, label: string) => {
          const text = normalizeInlineText(label.replace(/<[^>]+>/g, " "))
          return text ? `[${text}](${href.trim()})` : href.trim()
        }
      )
      .replace(/<br\s*\/?>/gi, "\n")
      .replace(/<(strong|b)[^>]*>/gi, "**")
      .replace(/<\/(strong|b)>/gi, "**")
      .replace(/<(em|i)[^>]*>/gi, "*")
      .replace(/<\/(em|i)>/gi, "*")
      .replace(/<code[^>]*>/gi, "`")
      .replace(/<\/code>/gi, "`")
      .replace(/<pre[^>]*>/gi, "\n```\n")
      .replace(/<\/pre>/gi, "\n```\n")
      .replace(/<li[^>]*>/gi, "- ")
      .replace(/<\/li>/gi, "\n")
      .replace(/<blockquote[^>]*>/gi, "> ")
      .replace(/<\/blockquote>/gi, "\n\n")
      .replace(/<h1[^>]*>/gi, "# ")
      .replace(/<h2[^>]*>/gi, "## ")
      .replace(/<h3[^>]*>/gi, "### ")
      .replace(/<h4[^>]*>/gi, "#### ")
      .replace(/<h5[^>]*>/gi, "##### ")
      .replace(/<h6[^>]*>/gi, "###### ")
      .replace(/<\/(h[1-6]|p|div|section|article|ul|ol)>/gi, "\n\n")
      .replace(/<(p|div|section|article|ul|ol)[^>]*>/gi, "")
      .replace(/<[^>]+>/g, " ")
  )
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/[ \t]{2,}/g, " ")
    .trim()
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

    return text
      ? [
          {
            kind: "heading",
            text,
            level: getHeadingLevel(nodeType),
          },
        ]
      : []
  }

  if (nodeType.includes("image") || nodeType === "img") {
    const srcCandidates = [node.src, node.url, node.href, node.source].filter(
      (candidate): candidate is string => typeof candidate === "string"
    )
    const src = srcCandidates.find(Boolean)?.trim() ?? ""
    const alt = typeof node.alt === "string" ? node.alt.trim() : ""

    return src ? [{ kind: "image", alt, src }] : []
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

function serializeContentBlock(block: ContentBlock) {
  if (block.kind === "heading") {
    return `${"#".repeat(Math.min(Math.max(block.level, 1), 6))} ${block.text}`
  }

  if (block.kind === "image") {
    return `![${block.alt}](${block.src})`
  }

  if (block.kind === "quote") {
    return block.text
      .split(/\n+/)
      .map((line) => `> ${line.trim()}`)
      .join("\n")
  }

  if (block.kind === "code") {
    return `\`\`\`\n${block.text}\n\`\`\``
  }

  if (block.kind === "bullet-list") {
    return block.items.map((item) => `- ${item}`).join("\n")
  }

  if (block.kind === "numbered-list") {
    return block.items.map((item, index) => `${index + 1}. ${item}`).join("\n")
  }

  return block.text
}

function serializeContentBlocks(blocks: ContentBlock[]) {
  return blocks
    .map((block) => serializeContentBlock(block))
    .filter(Boolean)
    .join("\n\n")
    .trim()
}

function stripMarkdownFormatting(markdown: string) {
  return markdown
    .replace(/```([\s\S]*?)```/g, "$1")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/!\[([^\]]*)\]\([^\)]+\)/g, (_match, alt: string) => {
      return getMeaningfulImageAltText(alt)
    })
    .replace(/\[([^\]]+)\]\([^\)]+\)/g, "$1")
    .replace(/^#{1,6}\s+/gm, "")
    .replace(/^>\s?/gm, "")
    .replace(/^[-*+]\s+/gm, "")
    .replace(/^\d+[.)]\s+/gm, "")
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/__([^_]+)__/g, "$1")
    .replace(/~~([^~]+)~~/g, "$1")
    .replace(/[~*_]/g, "")
}

export function normalizeMaterialContentToMarkdown(content: string) {
  const trimmed = content.trim()

  if (!trimmed) {
    return ""
  }

  try {
    const parsed = JSON.parse(trimmed) as unknown

    if (typeof parsed === "string") {
      return parsed.trim()
    }

    const jsonBlocks = blocksFromRichJson(parsed)
    if (jsonBlocks.length > 0) {
      return serializeContentBlocks(jsonBlocks)
    }
  } catch {
    // Fall through to HTML/markdown/plain-text parsing.
  }

  if (/<\/?[a-z][\s\S]*>/i.test(trimmed)) {
    return htmlToMarkdown(trimmed)
  }

  return trimmed
}

export function getMaterialContentPreview(content: string, maxLength = 140) {
  const markdown = normalizeMaterialContentToMarkdown(content)
  const hadImage = /!\[[^\]]*\]\([^\)]+\)/.test(markdown)
  const plainText = stripMarkdownFormatting(markdown)
    .replace(/\r\n/g, "\n")
    .replace(/\n+/g, " ")
    .replace(/\s+/g, " ")
    .trim()

  if (!plainText) {
    return hadImage ? "Contains image attachment." : ""
  }

  if (plainText.length <= maxLength) {
    return plainText
  }

  return `${plainText.slice(0, maxLength).trimEnd()}...`
}
