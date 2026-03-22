import * as React from "react"
import { Modal, Pressable, View, type ViewProps } from "react-native"

import { cn } from "@/lib/utils"
import { Text, TextClassContext } from "@/components/ui/text"

function Dialog({
  open,
  onOpenChange,
  children,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  children: React.ReactNode
}) {
  return (
    <Modal
      animationType="fade"
      transparent
      visible={open}
      onRequestClose={() => onOpenChange(false)}
    >
      <View className="flex-1 items-center justify-center bg-black/45 px-5">
        <Pressable
          className="absolute inset-0"
          onPress={() => onOpenChange(false)}
        />
        {children}
      </View>
    </Modal>
  )
}

function DialogContent({
  className,
  ...props
}: ViewProps & React.RefAttributes<View>) {
  return (
    <TextClassContext.Provider value="text-card-foreground">
      <View
        className={cn(
          "w-full max-w-[520px] rounded-[28px] border border-border bg-card p-5 shadow-lg shadow-black/20",
          className
        )}
        {...props}
      />
    </TextClassContext.Provider>
  )
}

function DialogHeader({
  className,
  ...props
}: ViewProps & React.RefAttributes<View>) {
  return <View className={cn("gap-1.5", className)} {...props} />
}

function DialogTitle({
  className,
  ...props
}: React.ComponentProps<typeof Text>) {
  return (
    <Text
      className={cn("text-xl font-black text-card-foreground", className)}
      {...props}
    />
  )
}

function DialogDescription({
  className,
  ...props
}: React.ComponentProps<typeof Text>) {
  return (
    <Text
      className={cn("text-sm leading-6 text-muted-foreground", className)}
      {...props}
    />
  )
}

function DialogFooter({
  className,
  ...props
}: ViewProps & React.RefAttributes<View>) {
  return <View className={cn("mt-4 gap-2", className)} {...props} />
}

export {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
}
