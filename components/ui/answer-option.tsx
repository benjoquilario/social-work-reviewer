import { Text } from "@/components/ui/text";
import { cn } from "@/lib/utils";
import { Pressable, type PressableProps, View } from "react-native";

interface AnswerOptionProps extends Omit<PressableProps, "onPress"> {
  isSelected: boolean;
  isCorrect?: boolean;
  isWrong?: boolean;
  onPress: () => void;
  children: string;
}

export function AnswerOption({
  isSelected,
  isCorrect,
  isWrong,
  onPress,
  children,
  className,
  ...props
}: AnswerOptionProps) {
  const stateClass = isWrong
    ? "border-destructive bg-destructive/10"
    : isCorrect || isSelected
      ? "border-primary bg-primary/10"
      : "border-border bg-card";

  const textClass = isWrong
    ? "text-destructive"
    : isCorrect || isSelected
      ? "text-foreground"
      : "text-card-foreground";

  return (
    <Pressable
      onPress={onPress}
      className={cn("rounded-2xl border-2 px-4 py-3.5", stateClass, className)}
      {...props}
    >
      <View className="flex-row items-center gap-3">
        <View
          className={cn(
            "h-2.5 w-2.5 rounded-full",
            isCorrect || isSelected
              ? "bg-primary"
              : isWrong
                ? "bg-destructive"
                : "bg-muted-foreground/60",
          )}
        />
        <Text
          className={cn(
            "text-base",
            isCorrect || isSelected || isWrong
              ? "font-semibold"
              : "font-medium",
            textClass,
          )}
        >
          {children}
        </Text>
      </View>
    </Pressable>
  );
}
