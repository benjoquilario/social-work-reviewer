import { View, type ViewProps } from "react-native"

import { cn } from "@/lib/utils"
import { Text, TextClassContext } from "@/components/ui/text"

function Card({ className, ...props }: ViewProps & React.RefAttributes<View>) {
  return (
    <TextClassContext.Provider value="text-card-foreground">
      <View
        className={cn(
          "flex flex-col gap-4 rounded-xl border border-border bg-card py-4 shadow-sm shadow-black/5",
          className
        )}
        {...props}
      />
    </TextClassContext.Provider>
  )
}

function CardHeader({
  className,
  ...props
}: ViewProps & React.RefAttributes<View>) {
  return (
    <View className={cn("flex flex-col gap-1 px-4", className)} {...props} />
  )
}

function CardTitle({
  className,
  ...props
}: React.ComponentProps<typeof Text> & React.RefAttributes<Text>) {
  return (
    <Text
      role="heading"
      aria-level={3}
      className={cn("font-semibold leading-none", className)}
      {...props}
    />
  )
}

function CardDescription({
  className,
  ...props
}: React.ComponentProps<typeof Text> & React.RefAttributes<Text>) {
  return (
    <Text
      className={cn("text-xs leading-5 text-muted-foreground", className)}
      {...props}
    />
  )
}

function CardContent({
  className,
  ...props
}: ViewProps & React.RefAttributes<View>) {
  return <View className={cn("px-4", className)} {...props} />
}

function CardFooter({
  className,
  ...props
}: ViewProps & React.RefAttributes<View>) {
  return (
    <View
      className={cn("flex flex-row items-center px-4", className)}
      {...props}
    />
  )
}

export { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle }
