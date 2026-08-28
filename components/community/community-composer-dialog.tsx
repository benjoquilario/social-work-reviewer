import { Image } from "expo-image"
import { ImagePlus, Send, Trash2, X } from "lucide-react-native"
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  TextInput,
  View,
} from "react-native"
import { useSafeAreaInsets } from "react-native-safe-area-context"

import { THEME, withOpacity } from "@/lib/theme"
import { useKeyboardInset } from "@/hooks/use-keyboard-inset"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog"
import { Text } from "@/components/ui/text"
import { ScrollView } from "@/components/ui/virtualized-scroll-view"

type ThemePalette = (typeof THEME)["light"] | (typeof THEME)["dark"]

type CommunityComposerDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  categories: readonly string[]
  contentDraft: string
  isPending: boolean
  onChangeContentDraft: (value: string) => void
  onChangeTitleDraft: (value: string) => void
  onPickPhoto: () => void
  onRemovePhoto: () => void
  onSelectCategory: (category: string) => void
  onSelectSubject: (subjectId: string | null) => void
  onSubmit: () => void
  isUploadingPhoto: boolean
  photoUrlDraft: string
  selectedCategory: string
  selectedSubjectId: string | null
  subjects: { id: string; name: string }[]
  theme: ThemePalette
  titleDraft: string
}

export function CommunityComposerDialog({
  open,
  onOpenChange,
  categories,
  contentDraft,
  isPending,
  onChangeContentDraft,
  onChangeTitleDraft,
  onPickPhoto,
  onRemovePhoto,
  onSelectCategory,
  onSelectSubject,
  onSubmit,
  isUploadingPhoto,
  photoUrlDraft,
  selectedCategory,
  selectedSubjectId,
  subjects,
  theme,
  titleDraft,
}: CommunityComposerDialogProps) {
  const insets = useSafeAreaInsets()
  const keyboardInset = useKeyboardInset()
  const inputBackground = withOpacity(theme.background, 0.9)
  const previewUri = photoUrlDraft.trim()

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={Math.max(insets.top, 12)}
        style={{ width: "100%" }}
      >
        <DialogContent className="overflow-hidden p-0">
          <View
            className="flex-row items-start justify-between border-b px-4 pb-3 pt-3.5"
            style={{ borderColor: theme.border }}
          >
            <View className="flex-1 pr-3">
              <DialogTitle className="text-lg">Start a thread</DialogTitle>
              <DialogDescription className="mt-0.5 text-xs leading-5">
                Ask clearly, attach one image if needed, and keep details
                concise so replies stay useful.
              </DialogDescription>
            </View>

            <Pressable
              className="h-9 w-9 items-center justify-center rounded-full border"
              style={{
                borderColor: theme.border,
                backgroundColor: theme.background,
              }}
              onPress={() => onOpenChange(false)}
              accessibilityRole="button"
              accessibilityLabel="Close thread composer"
            >
              <X size={16} color={theme.mutedForeground} />
            </Pressable>
          </View>

          <ScrollView
            automaticallyAdjustKeyboardInsets
            style={{ maxHeight: 560 }}
            contentContainerStyle={{
              paddingHorizontal: 14,
              paddingTop: 12,
              paddingBottom:
                Math.max(insets.bottom, 18) + keyboardInset + 8,
              gap: 10,
            }}
            contentInsetAdjustmentBehavior="automatic"
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="interactive"
            showsVerticalScrollIndicator={false}
          >
            <View className="gap-1.5">
              <Text variant="label">
                Thread type
              </Text>
              <View className="flex-row flex-wrap gap-2">
                {categories.map((category) => {
                  const isActive = selectedCategory === category

                  return (
                    <Pressable
                      key={category}
                      className="rounded-full border px-3 py-1.5"
                      style={{
                        borderColor: isActive ? theme.primary : theme.border,
                        backgroundColor: isActive
                          ? theme.primary
                          : theme.background,
                      }}
                      onPress={() => onSelectCategory(category)}
                    >
                      <Text
                        className={
                          isActive
                            ? "text-2xs font-bold uppercase tracking-wide text-primary-foreground"
                            : "text-2xs font-bold uppercase tracking-wide text-muted-foreground"
                        }
                      >
                        {category}
                      </Text>
                    </Pressable>
                  )
                })}
              </View>
            </View>

            <View className="gap-1.5">
              <Text variant="label">
                Subject lane
              </Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View className="flex-row gap-2 pr-2">
                  <Pressable
                    className="rounded-full border px-3 py-1.5"
                    style={{
                      borderColor:
                        selectedSubjectId === null
                          ? theme.primary
                          : theme.border,
                      backgroundColor:
                        selectedSubjectId === null
                          ? theme.primary
                          : theme.background,
                    }}
                    onPress={() => onSelectSubject(null)}
                  >
                    <Text
                      className={
                        selectedSubjectId === null
                          ? "text-2xs font-bold uppercase tracking-wide text-primary-foreground"
                          : "text-2xs font-bold uppercase tracking-wide text-muted-foreground"
                      }
                    >
                      General
                    </Text>
                  </Pressable>
                  {subjects.map((subject) => {
                    const isActive = selectedSubjectId === subject.id

                    return (
                      <Pressable
                        key={subject.id}
                        className="rounded-full border px-3 py-1.5"
                        style={{
                          borderColor: isActive ? theme.primary : theme.border,
                          backgroundColor: isActive
                            ? theme.primary
                            : theme.background,
                        }}
                        onPress={() => onSelectSubject(subject.id)}
                      >
                        <Text
                          className={
                            isActive
                              ? "text-2xs font-bold uppercase tracking-wide text-primary-foreground"
                              : "text-2xs font-bold uppercase tracking-wide text-muted-foreground"
                          }
                        >
                          {subject.name}
                        </Text>
                      </Pressable>
                    )
                  })}
                </View>
              </ScrollView>
            </View>

            <View className="gap-1.5 rounded-lg border border-border bg-background p-3">
              <Text variant="label">
                Title
              </Text>
              <TextInput
                value={titleDraft}
                onChangeText={onChangeTitleDraft}
                placeholder="Write a clear, searchable thread title"
                placeholderTextColor={theme.mutedForeground}
                className="rounded-sm border px-3 py-2.5 text-sm text-foreground"
                style={{
                  minHeight: 44,
                  color: theme.foreground,
                  borderColor: theme.border,
                  backgroundColor: inputBackground,
                }}
                selectionColor={theme.primary}
              />
            </View>

            <View className="gap-1.5 rounded-lg border border-border bg-background p-3">
              <Text variant="label">
                Image
              </Text>
              <View className="flex-row gap-2">
                <Pressable
                  className="h-10 flex-1 flex-row items-center justify-center gap-2 rounded-md border"
                  style={{
                    borderColor: theme.border,
                    backgroundColor: withOpacity(theme.primary, 0.06),
                  }}
                  onPress={onPickPhoto}
                  disabled={isUploadingPhoto}
                >
                  <ImagePlus size={16} color={theme.primary} />
                  <Text
                    className="text-xs font-bold"
                    style={{ color: theme.primary }}
                  >
                    {photoUrlDraft ? "Replace" : "Upload"}
                  </Text>
                </Pressable>
                {photoUrlDraft ? (
                  <Pressable
                    className="h-10 w-10 items-center justify-center rounded-md border"
                    style={{
                      borderColor: theme.border,
                      backgroundColor: theme.background,
                    }}
                    onPress={onRemovePhoto}
                    disabled={isUploadingPhoto}
                  >
                    <Trash2 size={15} color={theme.mutedForeground} />
                  </Pressable>
                ) : null}
              </View>
              <Text className="text-2xs leading-5 text-muted-foreground">
                {isUploadingPhoto
                  ? "Uploading image..."
                  : photoUrlDraft
                    ? "Image uploaded and attached to this thread."
                    : "Optional. Upload one image from your gallery."}
              </Text>
            </View>

            {previewUri ? (
              <View className="overflow-hidden rounded-lg border border-border bg-background">
                <Image
                  source={{ uri: previewUri }}
                  style={{
                    width: "100%",
                    height: 160,
                    backgroundColor: withOpacity(theme.muted, 0.6),
                  }}
                  contentFit="cover"
                  transition={120}
                />
              </View>
            ) : null}

            <View className="gap-1.5 rounded-lg border border-border bg-background p-3">
              <Text variant="label">
                Thread body
              </Text>
              <TextInput
                value={contentDraft}
                onChangeText={onChangeContentDraft}
                placeholder="Add details, what you already checked, and the exact help you need."
                placeholderTextColor={theme.mutedForeground}
                className="min-h-[132px] rounded-sm border px-3 py-2.5 text-sm leading-6 text-foreground"
                multiline
                textAlignVertical="top"
                style={{
                  color: theme.foreground,
                  borderColor: theme.border,
                  backgroundColor: inputBackground,
                }}
                selectionColor={theme.primary}
              />
            </View>

            <Button
              className="h-11 rounded-md"
              disabled={
                isPending ||
                isUploadingPhoto ||
                !titleDraft.trim() ||
                !contentDraft.trim()
              }
              onPress={onSubmit}
            >
              <Send size={14} color={theme.primaryForeground} />
              <Text className="font-bold text-primary-foreground">
                Post Thread
              </Text>
            </Button>
          </ScrollView>
        </DialogContent>
      </KeyboardAvoidingView>
    </Dialog>
  )
}
