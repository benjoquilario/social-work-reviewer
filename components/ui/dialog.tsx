import * as React from "react"
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  View,
  type ViewProps,
} from "react-native"
import { useSafeAreaInsets } from "react-native-safe-area-context"

import { cn } from "@/lib/utils"
import { useKeyboardInset } from "@/hooks/use-keyboard-inset"
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
  const insets = useSafeAreaInsets()
  const keyboardInset = useKeyboardInset()

  return (
    <Modal
      animationType="fade"
      transparent
      visible={open}
      onRequestClose={() => onOpenChange(false)}
    >
      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={Math.max(insets.top, 12)}
      >
        <View
          className="flex-1 items-center justify-center bg-black/30 px-5"
          style={{
            justifyContent: keyboardInset > 0 ? "flex-end" : "center",
            paddingTop: insets.top + 12,
            paddingBottom: Math.max(insets.bottom, 12) + keyboardInset,
          }}
        >
          <Pressable
            className="absolute inset-0"
            onPress={() => onOpenChange(false)}
          />
          {children}
        </View>
      </KeyboardAvoidingView>
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
          "w-full max-w-[520px] rounded-[32px] border border-border/70 bg-card p-5 shadow-lg shadow-black/15",
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
  return <View className={cn("mt-5 gap-2", className)} {...props} />
}

export {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
}
