import * as React from "react"
import { Pressable, View, type PressableProps } from "react-native"

import { cn } from "@/lib/utils"

type SwitchProps = Omit<PressableProps, "onPress"> & {
  checked: boolean
  onCheckedChange: (checked: boolean) => void
}

function Switch({
  checked,
  onCheckedChange,
  className,
  disabled,
  ...props
}: SwitchProps) {
  return (
    <Pressable
      accessibilityRole="switch"
      accessibilityState={{ checked, disabled }}
      className={cn(
        "h-7 w-12 rounded-full border px-0.5 py-0.5",
        checked ? "border-primary bg-primary" : "border-border bg-muted",
        disabled ? "opacity-50" : "opacity-100",
        className
      )}
      disabled={disabled}
      onPress={() => onCheckedChange(!checked)}
      {...props}
    >
      <View
        className={cn(
          "h-[22px] w-[22px] rounded-full bg-white shadow-sm shadow-black/20",
          checked ? "self-end" : "self-start"
        )}
      />
    </Pressable>
  )
}

export { Switch }
