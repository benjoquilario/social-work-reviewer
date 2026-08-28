import { cva, type VariantProps } from "class-variance-authority"
import { View, type ViewProps } from "react-native"

import { TONE_SURFACE_CLASS, TONE_TEXT_CLASS, type Tone } from "@/lib/tone"
import { cn } from "@/lib/utils"
import { Text, TextClassContext } from "@/components/ui/text"

const badgeVariants = cva(
  "flex-row items-center gap-1 self-start rounded-full border",
  {
    variants: {
      tone: {
        ...TONE_SURFACE_CLASS,
        // A badge's neutral state is a hairline outline, not a filled card.
        default: "border-border bg-transparent",
      } satisfies Record<Tone, string>,
      size: {
        default: "px-2.5 py-1",
        sm: "px-2 py-0.5",
      },
    },
    defaultVariants: {
      tone: "primary",
      size: "default",
    },
  }
)

const badgeTextVariants = cva("font-semibold", {
  variants: {
    tone: TONE_TEXT_CLASS,
    size: {
      default: "text-2xs",
      sm: "text-2xs",
    },
  },
  defaultVariants: {
    tone: "primary",
    size: "default",
  },
})

type BadgeProps = ViewProps & VariantProps<typeof badgeVariants>

/**
 * Pill badge for statuses, counts, and tags.
 * String children are wrapped in a styled Text automatically;
 * element children inherit the text style via TextClassContext.
 *
 * `tone` is the shared vocabulary from `lib/tone.ts` — the same values
 * `StatTile` and `EmptyState` take.
 *
 * ```tsx
 * <Badge tone="success">Completed</Badge>
 * <Badge tone="accent" size="sm"><Crown size={10} … /><Text>Premium</Text></Badge>
 * ```
 */
function Badge({ className, tone, size, children, ...props }: BadgeProps) {
  return (
    <TextClassContext.Provider value={badgeTextVariants({ tone, size })}>
      <View
        className={cn(badgeVariants({ tone, size }), className)}
        {...props}
      >
        {typeof children === "string" || typeof children === "number" ? (
          <Text>{children}</Text>
        ) : (
          children
        )}
      </View>
    </TextClassContext.Provider>
  )
}

export { Badge, badgeTextVariants, badgeVariants }
export type { BadgeProps }
