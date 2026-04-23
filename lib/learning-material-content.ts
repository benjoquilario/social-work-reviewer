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

type SectionParser = (lines: string[]) => ContentBlock[] | null

const BULLET_LIST_ITEM_PREFIX = /^[-*•]\s+/
const NUMBERED_LIST_ITEM_PREFIX = /^\d+[.)]\s+/
const MARKDOWN_HEADING_PATTERN = /^(#{1,6})\s+(.*)$/

function splitMarkdownSections(input: string) {
  return input
    .replace(/\r\n/g, "\n")
    .split(/\n\s*\n/g)
    .map((section) => section.trim())
    .filter(Boolean)
}

function toSectionLines(section: string) {
  return section
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
}

function isFencedCodeSection(lines: string[]) {
  return Boolean(
    lines[0]?.startsWith("```") && lines[lines.length - 1]?.startsWith("```")
  )
}

function tryParseImageSection(lines: string[]): ContentBlock[] | null {
  if (lines.length !== 1) {
    return null
  }

  const image = parseMarkdownImage(lines[0])
  if (!image) {
    return null
  }

  return [
    {
      kind: "image",
      alt: image.alt,
      src: image.src,
    },
  ]
}

function tryParseCodeSection(lines: string[]): ContentBlock[] | null {
  if (!isFencedCodeSection(lines)) {
    return null
  }

  return [
    {
      kind: "code",
      text: lines.slice(1, -1).join("\n").trim(),
    },
  ]
}

function tryParseBulletListSection(lines: string[]): ContentBlock[] | null {
  if (!lines.every((line) => BULLET_LIST_ITEM_PREFIX.test(line))) {
    return null
  }

  return [
    {
      kind: "bullet-list",
      items: lines.map((line) =>
        line.replace(BULLET_LIST_ITEM_PREFIX, "").trim()
      ),
    },
  ]
}

function tryParseNumberedListSection(lines: string[]): ContentBlock[] | null {
  if (!lines.every((line) => NUMBERED_LIST_ITEM_PREFIX.test(line))) {
    return null
  }

  return [
    {
      kind: "numbered-list",
      items: lines.map((line) =>
        line.replace(NUMBERED_LIST_ITEM_PREFIX, "").trim()
      ),
    },
  ]
}

function tryParseQuoteSection(lines: string[]): ContentBlock[] | null {
  if (!lines.every((line) => line.startsWith(">"))) {
    return null
  }

  return [
    {
      kind: "quote",
      text: lines
        .map((line) => line.replace(/^>\s?/, "").trim())
        .join("\n")
        .trim(),
    },
  ]
}

function tryParseHeadingSection(lines: string[]): ContentBlock[] | null {
  const headingMatch = lines[0].match(MARKDOWN_HEADING_PATTERN)
  if (!headingMatch) {
    return null
  }

  const [, hashes, headingText] = headingMatch
  const rest = lines.slice(1).join(" ").trim()
  const blocks: ContentBlock[] = [
    {
      kind: "heading",
      text: headingText.trim(),
      level: hashes.length,
    },
  ]

  if (rest) {
    blocks.push({ kind: "paragraph", text: rest })
  }

  return blocks
}

const SECTION_PARSERS: SectionParser[] = [
  tryParseImageSection,
  tryParseCodeSection,
  tryParseBulletListSection,
  tryParseNumberedListSection,
  tryParseQuoteSection,
  tryParseHeadingSection,
]

function parseSectionBlocks(section: string): ContentBlock[] {
  const lines = toSectionLines(section)
  if (lines.length === 0) {
    return []
  }

  for (const parseSection of SECTION_PARSERS) {
    const parsed = parseSection(lines)
    if (parsed !== null) {
      return parsed
    }
  }

  return [
    {
      kind: "paragraph",
      text: lines.join(" ").trim(),
    },
  ]
}

function parseBlocksFromSections(input: string): ContentBlock[] {
  return splitMarkdownSections(input).flatMap((section) =>
    parseSectionBlocks(section)
  )
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

type RichNodeParserContext = {
  nodeType: string
  node: Record<string, unknown>
  children: unknown
}

type RichNodeParser = (context: RichNodeParserContext) => ContentBlock[] | null

function isBulletListNodeType(nodeType: string) {
  return (
    nodeType.includes("bullet") ||
    nodeType === "ul" ||
    nodeType === "unordered-list"
  )
}

function isNumberedListNodeType(nodeType: string) {
  return (
    nodeType.includes("ordered") ||
    nodeType === "ol" ||
    nodeType === "numbered-list"
  )
}

function isHeadingNodeType(nodeType: string) {
  return nodeType.includes("heading") || /^h[1-6]$/.test(nodeType)
}

function isImageNodeType(nodeType: string) {
  return nodeType.includes("image") || nodeType === "img"
}

function isQuoteNodeType(nodeType: string) {
  return nodeType.includes("quote")
}

function isCodeNodeType(nodeType: string) {
  return nodeType.includes("code")
}

function isParagraphNodeType(nodeType: string) {
  return nodeType.includes("paragraph") || nodeType === "p"
}

function toListItems(children: unknown) {
  return Array.isArray(children)
    ? children.map((item) => extractNodeText(item)).filter(Boolean)
    : []
}

function getImageSrc(node: Record<string, unknown>) {
  const srcCandidates = [node.src, node.url, node.href, node.source].filter(
    (candidate): candidate is string => typeof candidate === "string"
  )

  return srcCandidates.find(Boolean)?.trim() ?? ""
}

function getImageAlt(node: Record<string, unknown>) {
  return typeof node.alt === "string" ? node.alt.trim() : ""
}

function parseBulletListNode({
  nodeType,
  children,
}: RichNodeParserContext): ContentBlock[] | null {
  if (!isBulletListNodeType(nodeType)) {
    return null
  }

  const items = toListItems(children)
  return items.length ? [{ kind: "bullet-list", items }] : []
}

function parseNumberedListNode({
  nodeType,
  children,
}: RichNodeParserContext): ContentBlock[] | null {
  if (!isNumberedListNodeType(nodeType)) {
    return null
  }

  const items = toListItems(children)
  return items.length ? [{ kind: "numbered-list", items }] : []
}

function parseHeadingNode({
  nodeType,
  node,
}: RichNodeParserContext): ContentBlock[] | null {
  if (!isHeadingNodeType(nodeType)) {
    return null
  }

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

function parseImageNode({
  nodeType,
  node,
}: RichNodeParserContext): ContentBlock[] | null {
  if (!isImageNodeType(nodeType)) {
    return null
  }

  const src = getImageSrc(node)
  const alt = getImageAlt(node)

  return src ? [{ kind: "image", alt, src }] : []
}

function parseQuoteNode({
  nodeType,
  node,
}: RichNodeParserContext): ContentBlock[] | null {
  if (!isQuoteNodeType(nodeType)) {
    return null
  }

  const text = extractNodeText(node)
  return text ? [{ kind: "quote", text }] : []
}

function parseCodeNode({
  nodeType,
  node,
}: RichNodeParserContext): ContentBlock[] | null {
  if (!isCodeNodeType(nodeType)) {
    return null
  }

  const text = extractNodeText(node)
  return text ? [{ kind: "code", text }] : []
}

function parseParagraphNode({
  nodeType,
  node,
}: RichNodeParserContext): ContentBlock[] | null {
  if (!isParagraphNodeType(nodeType)) {
    return null
  }

  const text = extractNodeText(node)
  return text ? [{ kind: "paragraph", text }] : []
}

const RICH_NODE_PARSERS: RichNodeParser[] = [
  parseBulletListNode,
  parseNumberedListNode,
  parseHeadingNode,
  parseImageNode,
  parseQuoteNode,
  parseCodeNode,
  parseParagraphNode,
]

function parseRichNodeByType(
  context: RichNodeParserContext
): ContentBlock[] | null {
  for (const parseNode of RICH_NODE_PARSERS) {
    const parsed = parseNode(context)
    if (parsed !== null) {
      return parsed
    }
  }

  return null
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

  const typedBlocks = parseRichNodeByType({ nodeType, node, children })
  if (typedBlocks !== null) {
    return typedBlocks
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
