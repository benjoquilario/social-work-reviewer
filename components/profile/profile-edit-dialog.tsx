import { memo } from "react"
import { Image, View } from "react-native"
import { Camera } from "lucide-react-native"

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

import { ProfileInput, type ThemePalette } from "./profile-primitives"

export const ProfileEditDialog = memo(function ProfileEditDialog({
  open,
  theme,
  nestedBorderColor,
  nestedSurfaceColor,
  initials,
  imageFailed,
  avatarPreview,
  fullName,
  schoolName,
  reviewType,
  isUploadingAvatar,
  isSubmitting,
  onOpenChange,
  onImageError,
  onPickPhoto,
  onClearAvatar,
  onChangeFullName,
  onChangeSchoolName,
  onChangeReviewType,
  onSave,
}: {
  open: boolean
  theme: ThemePalette
  nestedBorderColor: string
  nestedSurfaceColor: string
  initials: string
  imageFailed: boolean
  avatarPreview: string
  fullName: string
  schoolName: string
  reviewType: string
  isUploadingAvatar: boolean
  isSubmitting: boolean
  onOpenChange: (open: boolean) => void
  onImageError: () => void
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
          <DialogTitle>Edit Profile</DialogTitle>
          <DialogDescription>
            Update the profile details shown across your reviewer account.
          </DialogDescription>
        </DialogHeader>

        <View className="gap-3">
          <View className="gap-2">
            <Text className="text-[11px] font-bold uppercase tracking-[1.2px] text-muted-foreground">
              Profile photo
            </Text>
            <View
              className="flex-row items-center gap-3 rounded-2xl border px-3.5 py-3"
              style={{
                borderColor: nestedBorderColor,
                backgroundColor: nestedSurfaceColor,
              }}
            >
              <View className="relative">
                {avatarPreview && !imageFailed ? (
                  <Image
                    source={{ uri: avatarPreview }}
                    className="h-16 w-16 rounded-full"
                    resizeMode="cover"
                    onError={onImageError}
                  />
                ) : (
                  <View className="h-16 w-16 items-center justify-center rounded-full bg-primary">
                    <Text className="text-lg font-black text-primary-foreground">
                      {initials}
                    </Text>
                  </View>
                )}
              </View>
              <View className="flex-1 gap-2">
                <Text className="text-sm font-bold text-card-foreground">
                  Upload from device
                </Text>
                <Text className="text-[12px] leading-5 text-muted-foreground">
                  Square photos work best. Max size: 5 MB.
                </Text>
                <View className="flex-row gap-2">
                  <Button
                    className="h-10 flex-1 rounded-2xl"
                    onPress={onPickPhoto}
                    disabled={isUploadingAvatar}
                  >
                    <Camera
                      size={15}
                      color={theme.primaryForeground}
                      strokeWidth={2.3}
                    />
                    <Text className="font-bold text-primary-foreground">
                      {isUploadingAvatar ? "Uploading…" : "Choose photo"}
                    </Text>
                  </Button>
                  <Button
                    variant="outline"
                    className="h-10 rounded-2xl"
                    onPress={onClearAvatar}
                  >
                    <Text className="font-bold">Clear</Text>
                  </Button>
                </View>
              </View>
            </View>
          </View>
          <ProfileInput
            label="Full name"
            value={fullName}
            onChangeText={onChangeFullName}
            placeholder="Enter your full name"
          />
          <ProfileInput
            label="School"
            value={schoolName}
            onChangeText={onChangeSchoolName}
            placeholder="Add your school or organization"
          />
          <ProfileInput
            label="Review focus"
            value={reviewType}
            onChangeText={onChangeReviewType}
            placeholder="Example: Social Work Board Exam"
          />
        </View>

        <DialogFooter>
          <Button
            variant="outline"
            className="h-11 rounded-2xl"
            onPress={onClearAvatar}
          >
            <Text className="font-bold">Use initials avatar</Text>
          </Button>
          <Button className="h-11 rounded-2xl" onPress={onSave} disabled={isSubmitting}>
            <Text className="font-bold text-primary-foreground">
              {isSubmitting ? "Saving…" : "Save changes"}
            </Text>
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
})
