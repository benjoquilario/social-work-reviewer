import { memo } from "react"
import { Camera } from "lucide-react-native"
import { View } from "react-native"

import type { ThemePalette } from "@/lib/theme"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { FormField, Input } from "@/components/ui/input"
import { Text } from "@/components/ui/text"
import { CommunityAvatar } from "@/components/community/avatar"

export const ProfileEditDialog = memo(function ProfileEditDialog({
  open,
  theme,
  initials,
  avatarPreview,
  fullName,
  schoolName,
  reviewType,
  isUploadingAvatar,
  isSubmitting,
  onOpenChange,
  onPickPhoto,
  onClearAvatar,
  onChangeFullName,
  onChangeSchoolName,
  onChangeReviewType,
  onSave,
}: {
  open: boolean
  theme: ThemePalette
  initials: string
  avatarPreview: string
  fullName: string
  schoolName: string
  reviewType: string
  isUploadingAvatar: boolean
  isSubmitting: boolean
  onOpenChange: (open: boolean) => void
  onPickPhoto: () => void
  onClearAvatar: () => void
  onChangeFullName: (value: string) => void
  onChangeSchoolName: (value: string) => void
  onChangeReviewType: (value: string) => void
  onSave: () => void
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit profile</DialogTitle>
          <DialogDescription>
            Update the details shown across your reviewer account.
          </DialogDescription>
        </DialogHeader>

        <View className="gap-3">
          <FormField label="Profile photo">
            <View className="flex-row items-center gap-3 rounded-md border border-border bg-muted px-3.5 py-3">
              <CommunityAvatar
                label={initials}
                sourceUri={avatarPreview}
                theme={theme}
                size="lg"
              />

              <View className="flex-1 flex-row gap-2">
                <Button
                  size="sm"
                  className="flex-1"
                  disabled={isUploadingAvatar}
                  accessibilityLabel="Choose a profile photo"
                  onPress={onPickPhoto}
                >
                  <Camera size={14} color={theme.primaryForeground} />
                  <Text numberOfLines={1}>
                    {isUploadingAvatar ? "Uploading…" : "Choose"}
                  </Text>
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="flex-1"
                  accessibilityLabel="Use initials instead of a photo"
                  onPress={onClearAvatar}
                >
                  <Text numberOfLines={1}>Use initials</Text>
                </Button>
              </View>
            </View>
          </FormField>

          <FormField label="Full name">
            <Input
              value={fullName}
              onChangeText={onChangeFullName}
              placeholder="Enter your full name"
              autoCapitalize="words"
              accessibilityLabel="Full name"
            />
          </FormField>

          <FormField label="School">
            <Input
              value={schoolName}
              onChangeText={onChangeSchoolName}
              placeholder="Add your school or review center"
              accessibilityLabel="School"
            />
          </FormField>

          <FormField
            label="Review focus"
            hint="Example: Social Work Board Exam"
          >
            <Input
              value={reviewType}
              onChangeText={onChangeReviewType}
              placeholder="Your board exam or study track"
              accessibilityLabel="Review focus"
            />
          </FormField>
        </View>

        {/* DialogFooter stacks by default; these two are a paired choice. */}
        <DialogFooter className="flex-row">
          <Button
            variant="outline"
            className="flex-1"
            onPress={() => onOpenChange(false)}
          >
            <Text>Cancel</Text>
          </Button>
          <Button className="flex-1" disabled={isSubmitting} onPress={onSave}>
            <Text>{isSubmitting ? "Saving…" : "Save changes"}</Text>
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
})
