type ContentBlock =
  | { kind: "heading"; text: string; level: number }
  | { kind: "image"; alt: string; src: string }
  | { kind: "paragraph"; text: string }
  | { kind: "bullet-list"; items: string[] }
  | { kind: "numbered-list"; items: string[] }
  | { kind: "quote"; text: string }
  | { kind: "code"; text: string }

const TextNormalizer = {
  decodeHtmlEntities(value: string) {
    return value
      .replace(/&nbsp;/gi, " ")
      .replace(/&amp;/gi, "&")
      .replace(/&lt;/gi, "<")
      .replace(/&gt;/gi, ">")
      .replace(/&quot;/gi, '"')
      .replace(/&#39;/gi, "'")
  },

  normalizeInlineText(value: string) {
    return this.decodeHtmlEntities(value).replace(/\s+/g, " ").trim()
  },

  isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === "object" && value !== null
  },

  getMeaningfulImageAltText(alt: string) {
    const trimmed = alt.trim()
    if (!trimmed) return ""
    if (/\.(png|jpe?g|gif|webp|svg|bmp|heic)$/i.test(trimmed)) return ""
    return trimmed
  }
}

class NodeType {
  constructor(public readonly value: string) {}

  get isParagraph(): boolean { return this.value.includes("paragraph") || this.value === "p" }
  get isCode(): boolean { return this.value.includes("code") }
  get isQuote(): boolean { return this.value.includes("quote") }
  get isImage(): boolean { return this.value.includes("image") || this.value === "img" }
  get isHeading(): boolean { return this.value.includes("heading") || /^h[1-6]$/.test(this.value) }
  get isNumberedList(): boolean { return this.value.includes("ordered") || this.value === "ol" || this.value === "numbered-list" }
  get isBulletList(): boolean { return this.value.includes("bullet") || this.value === "ul" || this.value === "unordered-list" }

  get headingLevel(): number {
    const match = this.value.match(/(?:heading[-_]?|h)([1-6])/)
    return match ? Number(match[1]) : 2
  }
}

class RichNode {
  public readonly type: NodeType

  constructor(
    rawType: string,
    public readonly node: Record<string, unknown>,
    public readonly children: unknown
  ) {
    this.type = new NodeType(rawType.toLowerCase())
  }

  extractText(): string {
    return this.extractNodeText(this.node)
  }

  toListItems(): string[] {
    return Array.isArray(this.children)
      ? this.children.map((item) => this.extractNodeText(item)).filter(Boolean)
      : []
  }

  getImageSrc(): string {
    const srcCandidates = [this.node.src, this.node.url, this.node.href, this.node.source].filter(
      (candidate): candidate is string => typeof candidate === "string"
    )
    return srcCandidates.find(Boolean)?.trim() ?? ""
  }

  getImageAlt(): string {
    return typeof this.node.alt === "string" ? this.node.alt.trim() : ""
  }

  private extractNodeText(target: unknown): string {
    if (typeof target === "string") {
      return TextNormalizer.normalizeInlineText(target)
    }

    if (typeof target === "number" || typeof target === "boolean") {
      return String(target)
    }

    if (Array.isArray(target)) {
      return target
        .map((entry) => this.extractNodeText(entry))
        .filter(Boolean)
        .join(" ")
        .trim()
    }

    if (!TextNormalizer.isRecord(target)) {
      return ""
    }

    const textCandidates = [
      target.text,
      target.value,
      target.alt,
      target.label,
      target.name,
    ]
      .filter((candidate): candidate is string => typeof candidate === "string")
      .map((candidate) => TextNormalizer.normalizeInlineText(candidate))
      .filter(Boolean)

    const childText = [target.children, target.content, target.items, target.blocks]
      .map((candidate) => this.extractNodeText(candidate))
      .filter(Boolean)

    return [...textCandidates, ...childText].join(" ").trim()
  }
}

function tryParseRichTextNode(node: RichNode, isMatch: boolean, kind: "quote" | "code" | "paragraph"): ContentBlock[] | null {
  if (!isMatch) return null
  const text = node.extractText()
  return text ? [{ kind, text }] : []
}

type RichNodeParser = (node: RichNode) => ContentBlock[] | null

const RICH_NODE_PARSERS: RichNodeParser[] = [
  (node) => node.type.isBulletList ? [{ kind: "bullet-list", items: node.toListItems() }] : null,
  (node) => node.type.isNumberedList ? [{ kind: "numbered-list", items: node.toListItems() }] : null,
  (node) => {
    if (!node.type.isHeading) return null
    const text = node.extractText()
    return text ? [{ kind: "heading", text, level: node.type.headingLevel }] : []
  },
  (node) => {
    if (!node.type.isImage) return null
    const src = node.getImageSrc()
    return src ? [{ kind: "image", alt: node.getImageAlt(), src }] : []
  },
  (node) => tryParseRichTextNode(node, node.type.isQuote, "quote"),
  (node) => tryParseRichTextNode(node, node.type.isCode, "code"),
  (node) => tryParseRichTextNode(node, node.type.isParagraph, "paragraph"),
]

function parseRichNodeByType(node: RichNode): ContentBlock[] | null {
  for (const parseNode of RICH_NODE_PARSERS) {
    const parsed = parseNode(node)
    if (parsed !== null) {
      return parsed
    }
  }
  return null
}

function blocksFromRichJson(node: unknown): ContentBlock[] {
  if (typeof node === "string") {
    return MarkdownDocument.parseBlocksFromSections(node)
  }

  if (Array.isArray(node)) {
    return node.flatMap((entry) => blocksFromRichJson(entry))
  }

  if (!TextNormalizer.isRecord(node)) {
    return []
  }

  const rawType = String(node.type ?? node.nodeType ?? "")
  const children = node.children ?? node.content ?? node.blocks ?? node.items
  
  const richNode = new RichNode(rawType, node, children)

  const typedBlocks = parseRichNodeByType(richNode)
  if (typedBlocks !== null) {
    return typedBlocks
  }

  const nestedBlocks = blocksFromRichJson(children)
  if (nestedBlocks.length > 0) {
    return nestedBlocks
  }

  const fallbackText = richNode.extractText()
  return fallbackText ? [{ kind: "paragraph", text: fallbackText }] : []
}

const BULLET_LIST_ITEM_PREFIX = /^[-*•]\s+/
const NUMBERED_LIST_ITEM_PREFIX = /^\d+[.)]\s+/
const MARKDOWN_HEADING_PATTERN = /^(#{1,6})\s+(.*)$/

class MarkdownSection {
  constructor(public readonly lines: string[]) {}

  get isEmpty(): boolean {
    return this.lines.length === 0
  }

  get isFencedCode(): boolean {
    return Boolean(
      this.lines[0]?.startsWith("```") && this.lines[this.lines.length - 1]?.startsWith("```")
    )
  }

  tryParseImage(): ContentBlock[] | null {
    if (this.lines.length !== 1) return null
    const match = this.lines[0].trim().match(/^!\[([^\]]*)\]\(([^)]+)\)$/)
    if (!match) return null
    return [
      {
        kind: "image",
        alt: match[1].trim(),
        src: match[2].trim().replace(/^<|>$/g, ""),
      },
    ]
  }

  tryParseCode(): ContentBlock[] | null {
    if (!this.isFencedCode) return null
    return [
      {
        kind: "code",
        text: this.lines.slice(1, -1).join("\n").trim(),
      },
    ]
  }

  tryParseList(kind: "bullet-list" | "numbered-list", prefix: RegExp): ContentBlock[] | null {
    if (!this.lines.every((line) => prefix.test(line))) return null
    return [
      {
        kind,
        items: this.lines.map((line) => line.replace(prefix, "").trim()),
      },
    ]
  }

  tryParseQuote(): ContentBlock[] | null {
    if (!this.lines.every((line) => line.startsWith(">"))) return null
    return [
      {
        kind: "quote",
        text: this.lines
          .map((line) => line.replace(/^>\s?/, "").trim())
          .join("\n")
          .trim(),
      },
    ]
  }

  tryParseHeading(): ContentBlock[] | null {
    const headingMatch = this.lines[0].match(MARKDOWN_HEADING_PATTERN)
    if (!headingMatch) return null

    const [, hashes, headingText] = headingMatch
    const rest = this.lines.slice(1).join(" ").trim()
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
}

type SectionParser = (section: MarkdownSection) => ContentBlock[] | null

const SECTION_PARSERS: SectionParser[] = [
  (section) => section.tryParseImage(),
  (section) => section.tryParseCode(),
  (section) => section.tryParseList("bullet-list", BULLET_LIST_ITEM_PREFIX),
  (section) => section.tryParseList("numbered-list", NUMBERED_LIST_ITEM_PREFIX),
  (section) => section.tryParseQuote(),
  (section) => section.tryParseHeading(),
]

class MarkdownDocument {
  constructor(private readonly rawInput: string) {}

  getSections(): MarkdownSection[] {
    return this.rawInput
      .replace(/\r\n/g, "\n")
      .split(/\n\s*\n/g)
      .map((section) => section.trim())
      .filter(Boolean)
      .map((sectionText) => {
        const lines = sectionText
          .split("\n")
          .map((line) => line.trim())
          .filter(Boolean)
        return new MarkdownSection(lines)
      })
  }

  parseBlocks(): ContentBlock[] {
    return this.getSections().flatMap((section) => {
      if (section.isEmpty) return []

      for (const parseSection of SECTION_PARSERS) {
        const parsed = parseSection(section)
        if (parsed !== null) return parsed
      }

      return [
        {
          kind: "paragraph",
          text: section.lines.join(" ").trim(),
        },
      ]
    })
  }

  static parseBlocksFromSections(input: string): ContentBlock[] {
    return new MarkdownDocument(input).parseBlocks()
  }

  static stripFormatting(markdown: string): string {
    return markdown
      .replace(/```([\s\S]*?)```/g, "$1")
      .replace(/`([^`]+)`/g, "$1")
      .replace(/!\[([^\]]*)\]\([^\)]+\)/g, (_match, alt: string) => {
        return TextNormalizer.getMeaningfulImageAltText(alt)
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
}

class HtmlDocument {
  constructor(private readonly rawHtml: string) {}

  toMarkdown(): string {
    return TextNormalizer.decodeHtmlEntities(
      this.rawHtml
        .replace(/\r\n/g, "\n")
        .replace(/<img\b([^>]*)>/gi, (_match, attributes: string) => {
          const src = attributes.match(/\bsrc=["']([^"']+)["']/i)?.[1]?.trim() ?? ""
          const alt = attributes.match(/\balt=["']([^"']*)["']/i)?.[1]?.trim() ?? ""
          if (!src) return ""
          return `\n![${alt}](${src})\n`
        })
        .replace(
          /<a\b[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi,
          (_match, href: string, label: string) => {
            const text = TextNormalizer.normalizeInlineText(label.replace(/<[^>]+>/g, " "))
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
}

const BlockSerializer = {
  serialize(block: ContentBlock): string {
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
  },

  serializeAll(blocks: ContentBlock[]): string {
    return blocks
      .map((block) => this.serialize(block))
      .filter(Boolean)
      .join("\n\n")
      .trim()
  }
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
      return BlockSerializer.serializeAll(jsonBlocks)
    }
  } catch {
    // Fall through to HTML/markdown/plain-text parsing.
  }

  if (/<\/?[a-z][\s\S]*>/i.test(trimmed)) {
    return new HtmlDocument(trimmed).toMarkdown()
  }

  return trimmed
}

export function getMaterialContentPreview(content: string, maxLength = 140) {
  const markdown = normalizeMaterialContentToMarkdown(content)
  const hadImage = /!\[[^\]]*\]\([^\)]+\)/.test(markdown)
  const plainText = MarkdownDocument.stripFormatting(markdown)
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
