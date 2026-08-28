import { useState, type ReactNode } from "react"
import {
  TextInput,
  View,
  type TextInputProps,
  type ViewProps,
} from "react-native"

import { APP_FONTS } from "@/lib/fonts"
import { cn } from "@/lib/utils"
import { useThemePalette } from "@/hooks/use-theme"
import { Text } from "@/components/ui/text"

type InputProps = TextInputProps & {
  /** Element rendered before the text input (usually a 16px lucide icon). */
  leading?: ReactNode
  /** Element rendered after the text input (visibility toggle, clear button, …). */
  trailing?: ReactNode
  /** Classes for the outer field container. */
  containerClassName?: string
}

/**
 * Themed text field: rounded container + optional leading/trailing adornments.
 *
 * ```tsx
 * <Input
 *   leading={<Mail size={16} color={theme.mutedForeground} />}
 *   placeholder="your@email.com"
 *   value={email}
 *   onChangeText={setEmail}
 * />
 * ```
 */
function Input({
  leading,
  trailing,
  containerClassName,
  className,
  style,
  editable,
  onFocus,
  onBlur,
  ...props
}: InputProps) {
  const theme = useThemePalette()
  const [isFocused, setIsFocused] = useState(false)
  const isDisabled = editable === false

  return (
    <View
      className={cn(
        // h-12 matches Button size="lg", so a field and the button that
        // submits it line up exactly. Was an off-scale h-[52px].
        "h-12 flex-row items-center gap-3 rounded-md border bg-input px-4",
        isFocused ? "border-ring" : "border-border",
        isDisabled && "opacity-50",
        containerClassName
      )}
    >
      {leading}
      <TextInput
        className={cn("flex-1 text-sm text-foreground", className)}
        placeholderTextColor={theme.mutedForeground}
        editable={editable}
        onFocus={(event) => {
          setIsFocused(true)
          onFocus?.(event)
        }}
        onBlur={(event) => {
          setIsFocused(false)
          onBlur?.(event)
        }}
        style={[
          { fontFamily: APP_FONTS.medium, color: theme.foreground },
          style,
        ]}
        {...props}
      />
      {trailing}
    </View>
  )
}

/**
 * Field label used above inputs. Pair with `nativeID` / `accessibilityLabel`
 * on the input when the label text is not descriptive enough.
 */
function InputLabel({
  className,
  ...props
}: React.ComponentProps<typeof Text>) {
  return <Text variant="label" className={className} {...props} />
}

type FormFieldProps = ViewProps & {
  label?: string
  /** Error message shown under the field; also switches the label to destructive. */
  error?: string | null
  /** Helper text shown under the field when there is no error. */
  hint?: string
}

/**
 * Label + control + hint/error stack:
 *
 * ```tsx
 * <FormField label="Email" error={emailError}>
 *   <Input … />
 * </FormField>
 * ```
 */
function FormField({
  label,
  error,
  hint,
  className,
  children,
  ...props
}: FormFieldProps) {
  return (
    <View className={cn("gap-1.5", className)} {...props}>
      {label ? (
        <InputLabel className={cn(error && "text-destructive")}>
          {label}
        </InputLabel>
      ) : null}
      {children}
      {error ? (
        <Text className="text-xs text-destructive">{error}</Text>
      ) : hint ? (
        <Text className="text-xs text-muted-foreground">{hint}</Text>
      ) : null}
    </View>
  )
}

export { FormField, Input, InputLabel }
export type { FormFieldProps, InputProps }
