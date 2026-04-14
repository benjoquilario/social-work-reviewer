import { Image } from "expo-image"
import { Send } from "lucide-react-native"
import { Pressable, TextInput, View } from "react-native"

import { THEME, withOpacity } from "@/lib/theme"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
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
  onChangePhotoUrlDraft: (value: string) => void
  onChangeTitleDraft: (value: string) => void
  onSelectCategory: (category: string) => void
  onSelectSubject: (subjectId: string | null) => void
  onSubmit: () => void
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
  onChangePhotoUrlDraft,
  onChangeTitleDraft,
  onSelectCategory,
  onSelectSubject,
  onSubmit,
  photoUrlDraft,
  selectedCategory,
  selectedSubjectId,
  subjects,
  theme,
  titleDraft,
}: CommunityComposerDialogProps) {
  const inputBackground = withOpacity(theme.background, 0.9)
  const previewUri = photoUrlDraft.trim()

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <View className="gap-4">
          <DialogHeader>
            <DialogTitle>Start a thread</DialogTitle>
            <DialogDescription>
              Write one precise question, discussion, or study tip so replies
              stay useful and easy to scan.
            </DialogDescription>
          </DialogHeader>

          <View className="gap-2">
            <Text className="text-[11px] font-bold uppercase tracking-[1.2px] text-muted-foreground">
              Thread type
            </Text>
            <View className="flex-row flex-wrap gap-2">
              {categories.map((category) => {
                const isActive = selectedCategory === category

                return (
                  <Pressable
                    key={category}
                    className={
                      isActive
                        ? "rounded-full border border-primary bg-primary px-3 py-2"
                        : "rounded-full border border-border bg-background px-3 py-2"
                    }
                    onPress={() => onSelectCategory(category)}
                  >
                    <Text
                      className={
                        isActive
                          ? "text-xs font-bold uppercase tracking-wide text-primary-foreground"
                          : "text-xs font-bold uppercase tracking-wide text-muted-foreground"
                      }
                    >
                      {category}
                    </Text>
                  </Pressable>
                )
              })}
            </View>
          </View>

          <View className="gap-2">
            <Text className="text-[11px] font-bold uppercase tracking-[1.2px] text-muted-foreground">
              Subject lane
            </Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View className="flex-row gap-2 pr-2">
                <Pressable
                  className={
                    selectedSubjectId === null
                      ? "rounded-full border border-primary bg-primary px-3 py-2"
                      : "rounded-full border border-border bg-background px-3 py-2"
                  }
                  onPress={() => onSelectSubject(null)}
                >
                  <Text
                    className={
                      selectedSubjectId === null
                        ? "text-xs font-bold uppercase tracking-wide text-primary-foreground"
                        : "text-xs font-bold uppercase tracking-wide text-muted-foreground"
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
                      className={
                        isActive
                          ? "rounded-full border border-primary bg-primary px-3 py-2"
                          : "rounded-full border border-border bg-background px-3 py-2"
                      }
                      onPress={() => onSelectSubject(subject.id)}
                    >
                      <Text
                        className={
                          isActive
                            ? "text-xs font-bold uppercase tracking-wide text-primary-foreground"
                            : "text-xs font-bold uppercase tracking-wide text-muted-foreground"
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

          <View className="gap-2 rounded-[24px] border border-border bg-background p-3.5">
            <Text className="text-[11px] font-bold uppercase tracking-[1.2px] text-muted-foreground">
              Title
            </Text>
            <TextInput
              value={titleDraft}
              onChangeText={onChangeTitleDraft}
              placeholder="Write a clear, searchable thread title"
              placeholderTextColor={theme.mutedForeground}
              className="text-base text-foreground"
              style={{
                minHeight: 24,
                color: theme.foreground,
                backgroundColor: inputBackground,
              }}
            />
          </View>

          <View className="gap-2 rounded-[24px] border border-border bg-background p-3.5">
            <Text className="text-[11px] font-bold uppercase tracking-[1.2px] text-muted-foreground">
              Photo URL
            </Text>
            <TextInput
              value={photoUrlDraft}
              onChangeText={onChangePhotoUrlDraft}
              placeholder="Optional photo URL (https://...)"
              placeholderTextColor={theme.mutedForeground}
              className="text-sm text-foreground"
              autoCapitalize="none"
              autoCorrect={false}
              style={{
                color: theme.foreground,
                backgroundColor: inputBackground,
              }}
            />
          </View>

          {previewUri ? (
            <View className="overflow-hidden rounded-[24px] border border-border bg-background">
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

          <View className="gap-2 rounded-[24px] border border-border bg-background p-3.5">
            <Text className="text-[11px] font-bold uppercase tracking-[1.2px] text-muted-foreground">
              Thread body
            </Text>
            <TextInput
              value={contentDraft}
              onChangeText={onChangeContentDraft}
              placeholder="Add the details, what you already checked, and the answer or feedback you need."
              placeholderTextColor={theme.mutedForeground}
              className="min-h-[120px] text-sm text-foreground"
              multiline
              textAlignVertical="top"
              style={{
                color: theme.foreground,
                backgroundColor: inputBackground,
              }}
            />
          </View>

          <DialogFooter className="mt-0 flex-row justify-end">
            <Button
              className="h-11 rounded-2xl px-5"
              disabled={isPending}
              onPress={onSubmit}
            >
              <Send size={14} color={theme.primaryForeground} />
              <Text className="font-bold text-primary-foreground">Post</Text>
            </Button>
          </DialogFooter>
        </View>
      </DialogContent>
    </Dialog>
  )
}
