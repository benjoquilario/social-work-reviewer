import { View, type ViewProps } from "react-native"

import { cn } from "@/lib/utils"

export function Skeleton({ className, ...props }: ViewProps) {
  return (
    <View
      className={cn("animate-pulse rounded-[20px] bg-muted/80", className)}
      {...props}
    />
  )
}
