import { View, type ViewProps } from "react-native"

import { cn } from "@/lib/utils"

export function Skeleton({ className, ...props }: ViewProps) {
  return (
    <View
      className={cn("animate-pulse rounded-xl bg-muted", className)}
      {...props}
    />
  )
}
