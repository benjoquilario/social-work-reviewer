import { cva, type VariantProps } from "class-variance-authority"
import { Pressable, type PressableProps } from "react-native"

import { cn } from "@/lib/utils"

const iconButtonVariants = cva(
  "items-center justify-center rounded-2xl active:opacity-80",
  {
    variants: {
      variant: {
        ghost: "bg-transparent active:bg-muted/70",
        soft: "bg-primary/10 active:bg-primary/15",
        outline: "border border-border bg-card active:bg-muted/70",
        muted: "bg-muted/60 active:bg-muted",
      },
      size: {
        // 44px — minimum comfortable touch target.
        default: "h-11 w-11",
        sm: "h-10 w-10",
      },
    },
    defaultVariants: {
      variant: "ghost",
      size: "default",
    },
  }
)

type IconButtonProps = PressableProps &
  VariantProps<typeof iconButtonVariants> & {
    /** Required: what the button does, read by screen readers. */
    label: string
  }

/**
 * Icon-only pressable with a guaranteed accessible name and touch target.
 * Use for back arrows, close buttons, bells, send buttons, etc.
 *
 * ```tsx
 * <IconButton label="Go back" onPress={router.back} variant="muted">
 *   <ArrowLeft size={20} color={theme.foreground} />
 * </IconButton>
 * ```
 */
function IconButton({
  label,
  variant,
  size,
  className,
  ...props
}: IconButtonProps) {
  return (
    <Pressable
      role="button"
      accessibilityLabel={label}
      hitSlop={size === "sm" ? 6 : 4}
      className={cn(
        props.disabled && "opacity-50",
        iconButtonVariants({ variant, size }),
        className
      )}
      {...props}
    />
  )
}

export { IconButton, iconButtonVariants }
export type { IconButtonProps }
