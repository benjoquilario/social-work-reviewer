import { cva, type VariantProps } from "class-variance-authority"
import { Platform, Pressable } from "react-native"

import { cn } from "@/lib/utils"
import { TextClassContext } from "@/components/ui/text"

const buttonVariants = cva(
  cn(
    "group shrink-0 flex-row items-center justify-center gap-2 rounded-md border border-transparent shadow-sm shadow-black/5",
    Platform.select({
      web: "aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive whitespace-nowrap outline-none transition-all focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:pointer-events-none [&_svg:not([class*='size-'])]:size-4 [&_svg]:pointer-events-none [&_svg]:shrink-0",
    })
  ),
  {
    variants: {
      variant: {
        default: cn(
          "border-primary/10 bg-primary active:opacity-95",
          Platform.select({ web: "hover:opacity-95" })
        ),
        destructive: cn(
          "border-destructive/10 bg-destructive active:opacity-95 dark:bg-destructive/75",
          Platform.select({
            web: "hover:opacity-95 focus-visible:ring-destructive/20 dark:focus-visible:ring-destructive/40",
          })
        ),
        outline: cn(
          "border-border/80 bg-card active:bg-muted/80 dark:border-input dark:bg-card dark:active:bg-input/60",
          Platform.select({
            web: "hover:bg-muted/80 dark:hover:bg-input/60",
          })
        ),
        secondary: cn(
          "border-secondary bg-secondary active:opacity-90",
          Platform.select({ web: "hover:opacity-95" })
        ),
        ghost: cn(
          "shadow-none active:bg-primary/10 dark:active:bg-primary/15",
          Platform.select({
            web: "hover:bg-primary/10 dark:hover:bg-primary/15",
          })
        ),
        link: "border-transparent bg-transparent px-0 shadow-none",
      },
      size: {
        default: cn(
          "h-11 px-5 py-3",
          Platform.select({ web: "has-[>svg]:px-4" })
        ),
        sm: cn(
          "h-10 gap-1.5 px-4",
          Platform.select({ web: "has-[>svg]:px-3.5" })
        ),
        lg: cn("h-12 px-6", Platform.select({ web: "has-[>svg]:px-5" })),
        /** Full-width primary CTA — the "Submit answer" / "Continue" slot. */
        xl: cn("h-14 px-6", Platform.select({ web: "has-[>svg]:px-5" })),
        icon: "h-11 w-11",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

const buttonTextVariants = cva(
  cn(
    "font-semibold text-foreground",
    Platform.select({ web: "pointer-events-none transition-colors" })
  ),
  {
    variants: {
      variant: {
        default: "text-primary-foreground",
        destructive: "text-destructive-foreground",
        outline: cn(
          "text-card-foreground group-active:text-card-foreground",
          Platform.select({ web: "group-hover:text-accent-foreground" })
        ),
        secondary: "text-secondary-foreground",
        ghost: "text-primary group-active:text-primary",
        link: cn(
          "text-primary group-active:underline",
          Platform.select({
            web: "underline-offset-4 hover:underline group-hover:underline",
          })
        ),
      },
      // Label size tracks the control size. These were all empty, so an `sm`
      // button and an `lg` button rendered identical 14px labels.
      size: {
        default: "text-sm",
        sm: "text-xs",
        lg: "text-base",
        xl: "text-base",
        icon: "text-sm",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

type ButtonProps = React.ComponentProps<typeof Pressable> &
  React.RefAttributes<typeof Pressable> &
  VariantProps<typeof buttonVariants>

function Button({ className, variant, size, ...props }: ButtonProps) {
  return (
    <TextClassContext.Provider value={buttonTextVariants({ variant, size })}>
      <Pressable
        className={cn(
          props.disabled && "opacity-50",
          buttonVariants({ variant, size }),
          className
        )}
        role="button"
        {...props}
      />
    </TextClassContext.Provider>
  )
}

export { Button, buttonTextVariants, buttonVariants }
export type { ButtonProps }
