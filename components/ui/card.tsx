import { cva, type VariantProps } from "class-variance-authority"
import { View, type ViewProps } from "react-native"

import { cn } from "@/lib/utils"
import { Text, TextClassContext } from "@/components/ui/text"

function Card({ className, ...props }: ViewProps & React.RefAttributes<View>) {
  return (
    <TextClassContext.Provider value="text-card-foreground">
      <View
        className={cn(
          "shadow-black/6 overflow-hidden rounded-xl border border-border/80 bg-card shadow-sm",
          className
        )}
        {...props}
      />
    </TextClassContext.Provider>
  )
}

/**
 * Padding steps for a card's interior. `CardContent` used to ship `px-4` and
 * no vertical padding at all, so all 55 call sites hand-wrote their own —
 * across six different combinations of px-3/3.5/4 and py-3/3.5/4/5.
 */
const cardPaddingVariants = cva("", {
  variants: {
    size: {
      default: "px-4 py-4",
      compact: "px-3.5 py-3.5",
      loose: "px-4 py-5",
      /** Opt out entirely — for media, charts and edge-to-edge rows. */
      none: "",
    },
  },
  defaultVariants: {
    size: "default",
  },
})

type CardSectionProps = ViewProps &
  React.RefAttributes<View> &
  VariantProps<typeof cardPaddingVariants>

function CardHeader({ className, size, ...props }: CardSectionProps) {
  return (
    <View
      className={cn(
        "flex flex-col gap-1",
        cardPaddingVariants({ size }),
        "pb-0",
        className
      )}
      {...props}
    />
  )
}

function CardTitle({
  className,
  ...props
}: React.ComponentProps<typeof Text> & React.RefAttributes<Text>) {
  return <Text variant="subheading" className={className} {...props} />
}

function CardDescription({
  className,
  ...props
}: React.ComponentProps<typeof Text> & React.RefAttributes<Text>) {
  return <Text variant="caption" className={className} {...props} />
}

function CardContent({ className, size, ...props }: CardSectionProps) {
  return (
    <View
      className={cn(cardPaddingVariants({ size }), className)}
      {...props}
    />
  )
}

function CardFooter({ className, size, ...props }: CardSectionProps) {
  return (
    <View
      className={cn(
        "flex flex-row items-center",
        cardPaddingVariants({ size }),
        "pt-0",
        className
      )}
      {...props}
    />
  )
}

export {
  Card,
  cardPaddingVariants,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
}
export type { CardSectionProps }
