import { memo } from "react"
import Camera from "lucide-react-native/icons/camera"
import { View } from "react-native"

import type { MemberType } from "@/lib/schema"
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
import { ScrollView } from "@/components/ui/virtualized-scroll-view"
import { Text } from "@/components/ui/text"
import { CommunityAvatar } from "@/components/community/avatar"
import { MemberTypePicker } from "@/components/member/member-type-picker"

/**
 * Editing the three optional facts plus the name and photo.
 *
 * Every field but the name may be left blank, and the member type is a chip
 * picker rather than a text box — "Retaker" is a value the database enforces,
 * and a free-text field would have let someone type something the write then
 * rejects. Ask once, let them skip, let them change it later: people graduate.
 */
export const ProfileEditDialog = memo(function ProfileEditDialog({
  open,
  theme,
  initials,
  avatarPreview,
  fullName,
  memberType,
  schoolOrEmployer,
  licenseNumber,
  isUploadingAvatar,
  isSubmitting,
  onOpenChange,
  onPickPhoto,
  onClearAvatar,
  onChangeFullName,
  onChangeMemberType,
  onChangeSchoolOrEmployer,
  onChangeLicenseNumber,
  onSave,
}: {
  open: boolean
  theme: ThemePalette
  initials: string
  avatarPreview: string
  fullName: string
  memberType: MemberType | null
  schoolOrEmployer: string
  licenseNumber: string
  isUploadingAvatar: boolean
  isSubmitting: boolean
  onOpenChange: (open: boolean) => void
  onPickPhoto: () => void
  onClearAvatar: () => void
  onChangeFullName: (value: string) => void
  onChangeMemberType: (value: MemberType | null) => void
  onChangeSchoolOrEmployer: (value: string) => void
  onChangeLicenseNumber: (value: string) => void
  onSave: () => void
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit profile</DialogTitle>
          <DialogDescription>
            Only your name is required. Everything else is optional.
          </DialogDescription>
        </DialogHeader>

        <ScrollView
          className="max-h-[60vh]"
          showsVerticalScrollIndicator={false}
        >
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

            <MemberTypePicker
              value={memberType}
              onChange={onChangeMemberType}
            />

            <FormField
              label="School or employer"
              hint="Your BSSW school, review centre, or agency."
            >
              <Input
                value={schoolOrEmployer}
                onChangeText={onChangeSchoolOrEmployer}
                placeholder="Optional"
                accessibilityLabel="School or employer"
              />
            </FormField>

            <FormField
              label="PRC licence number"
              hint="Only if you want it on your certificates."
            >
              <Input
                value={licenseNumber}
                onChangeText={onChangeLicenseNumber}
                placeholder="Optional"
                autoCapitalize="characters"
                accessibilityLabel="PRC licence number"
              />
            </FormField>
          </View>
        </ScrollView>

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
