import { cva, type VariantProps } from "class-variance-authority"
import { View, type ViewProps } from "react-native"

import { cn } from "@/lib/utils"
import { Text, TextClassContext } from "@/components/ui/text"

const badgeVariants = cva(
  "flex-row items-center gap-1 self-start rounded-full border",
  {
    variants: {
      variant: {
        default: "border-primary/25 bg-primary/10",
        secondary: "border-transparent bg-secondary",
        muted: "border-transparent bg-muted",
        success: "border-success/25 bg-success/10",
        warning: "border-warning/30 bg-warning/15",
        destructive: "border-destructive/25 bg-destructive/10",
        accent: "border-accent/30 bg-accent/15",
        outline: "border-border bg-transparent",
      },
      size: {
        default: "px-2.5 py-1",
        sm: "px-2 py-0.5",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

const badgeTextVariants = cva("font-semibold", {
  variants: {
    variant: {
      default: "text-primary",
      secondary: "text-secondary-foreground",
      muted: "text-muted-foreground",
      success: "text-success",
      // Yellow reads fine on dark surfaces but fails contrast on light ones,
      // so light mode falls back to foreground.
      warning: "text-foreground dark:text-warning",
      destructive: "text-destructive",
      accent: "text-foreground dark:text-accent",
      outline: "text-foreground",
    },
    size: {
      default: "text-[11px]",
      sm: "text-[10px]",
    },
  },
  defaultVariants: {
    variant: "default",
    size: "default",
  },
})

type BadgeProps = ViewProps & VariantProps<typeof badgeVariants>

/**
 * Pill badge for statuses, counts, and tags.
 * String children are wrapped in a styled Text automatically;
 * element children inherit the text style via TextClassContext.
 *
 * ```tsx
 * <Badge variant="success">Completed</Badge>
 * <Badge variant="accent" size="sm"><Crown size={10} … /><Text>Premium</Text></Badge>
 * ```
 */
function Badge({ className, variant, size, children, ...props }: BadgeProps) {
  return (
    <TextClassContext.Provider value={badgeTextVariants({ variant, size })}>
      <View
        className={cn(badgeVariants({ variant, size }), className)}
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
