import * as React from "react"
import * as Slot from "@rn-primitives/slot"
import { cva, type VariantProps } from "class-variance-authority"
import { Platform, Text as RNText, type Role } from "react-native"

import { APP_FONTS } from "@/lib/fonts"
import { cn } from "@/lib/utils"

const textVariants = cva(
  cn(
    "text-base text-foreground",
    Platform.select({
      web: "select-text",
    })
  ),
  {
    /**
     * The app's typographic roles, each pinned to one step of the ramp in
     * tailwind.config.js.
     *
     * These replace the shadcn-for-web set (h1–h4, p, blockquote, code,
     * lead, …) the primitive shipped with, which was never used once — every
     * screen hand-rolled `text-[11px] font-black uppercase …` instead, which
     * is how 18 distinct font sizes ended up in the codebase.
     */
    variants: {
      variant: {
        /** Body copy. */
        default: "",
        /** Screen title — one per screen, beside the back arrow. */
        title: "text-xl font-extrabold leading-7",
        /** Section and card title. */
        heading: "text-lg font-extrabold leading-6",
        /** Row title inside a card or list item. */
        subheading: "text-base font-bold",
        /** Secondary body — list subtitles, descriptions. */
        callout: "text-sm leading-5",
        /** Supporting line under a value or title. */
        caption: "text-xs leading-[18px] text-muted-foreground",
        /** Uppercase micro label above a value (StatTile, form fields). */
        label:
          "text-2xs font-bold uppercase tracking-[1px] text-muted-foreground",
        /** Uppercase kicker above a section title, in brand teal. */
        eyebrow: "text-2xs font-black uppercase tracking-[1.4px] text-primary",
        /** Headline number — scores, streaks, percentages. */
        metric: "text-3xl font-extrabold leading-9",
        /** De-emphasised body. */
        muted: "text-sm text-muted-foreground",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

type TextVariantProps = VariantProps<typeof textVariants>

type TextVariant = NonNullable<TextVariantProps["variant"]>

const ROLE: Partial<Record<TextVariant, Role>> = {
  title: "heading",
  heading: "heading",
  subheading: "heading",
}

const ARIA_LEVEL: Partial<Record<TextVariant, string>> = {
  title: "1",
  heading: "2",
  subheading: "3",
}

const TextClassContext = React.createContext<string | undefined>(undefined)

function resolveFontFamily(className?: string) {
  if (!className) {
    return APP_FONTS.regular
  }

  if (className.includes("font-mono")) {
    return undefined
  }

  if (
    className.includes("font-black") ||
    className.includes("font-extrabold")
  ) {
    return APP_FONTS.extraBold
  }

  if (className.includes("font-bold")) {
    return APP_FONTS.bold
  }

  if (className.includes("font-semibold")) {
    return APP_FONTS.semiBold
  }

  if (className.includes("font-medium")) {
    return APP_FONTS.medium
  }

  return APP_FONTS.regular
}

function stripFontWeightClasses(className?: string) {
  if (!className) {
    return className
  }

  return className
    .replace(/\bfont-black\b/g, "")
    .replace(/\bfont-extrabold\b/g, "")
    .replace(/\bfont-bold\b/g, "")
    .replace(/\bfont-semibold\b/g, "")
    .replace(/\bfont-medium\b/g, "")
    .replace(/\s+/g, " ")
    .trim()
}

function Text({
  className,
  asChild = false,
  variant = "default",
  style,
  ...props
}: React.ComponentProps<typeof RNText> &
  TextVariantProps &
  React.RefAttributes<RNText> & {
    asChild?: boolean
  }) {
  const textClass = React.useContext(TextClassContext)
  const Component = asChild ? Slot.Text : RNText
  const mergedClassName = cn(textVariants({ variant }), textClass, className)
  const fontFamily = resolveFontFamily(mergedClassName)
  const normalizedClassName = stripFontWeightClasses(mergedClassName)

  return (
    <Component
      {...props}
      className={normalizedClassName}
      role={variant ? ROLE[variant] : undefined}
      aria-level={variant ? ARIA_LEVEL[variant] : undefined}
      style={[fontFamily ? { fontFamily } : undefined, style]}
    />
  )
}

export { Text, TextClassContext }
