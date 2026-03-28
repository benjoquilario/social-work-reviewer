import { useEffect, useMemo, useState } from "react"
import { useAuth } from "@/contexts/auth-context"
import * as ImagePicker from "expo-image-picker"
import { useRouter } from "expo-router"
import {
  BadgeCheck,
  Camera,
  MailCheck,
  MailWarning,
  Settings,
  ShieldCheck,
  UserRoundPen,
} from "lucide-react-native"
import {
  Alert,
  Image,
  Pressable,
  ScrollView,
  TextInput,
  View,
} from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"

import { getAvatarUrl, getInitials } from "@/lib/auth"
import { THEME } from "@/lib/theme"
import { useColorScheme } from "@/hooks/use-color-scheme"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Text } from "@/components/ui/text"

function formatMemberSince(value: string | undefined) {
  if (!value) {
    return "Not available"
  }

  const parsed = new Date(value)

  if (Number.isNaN(parsed.getTime())) {
    return "Not available"
  }

  return new Intl.DateTimeFormat("en-PH", {
    dateStyle: "medium",
  }).format(parsed)
}

function ProfileInput({
  label,
  value,
  onChangeText,
  placeholder,
  multiline = false,
}: {
  label: string
  value: string
  onChangeText: (value: string) => void
  placeholder: string
  multiline?: boolean
}) {
  const colorScheme = useColorScheme()
  const isDark = colorScheme === "dark"
  const theme = isDark ? THEME.dark : THEME.light

  return (
    <View className="gap-1.5">
      <Text className="text-[11px] font-bold uppercase tracking-[1.2px] text-muted-foreground">
        {label}
      </Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={theme.mutedForeground}
        multiline={multiline}
        textAlignVertical={multiline ? "top" : "center"}
        className="rounded-2xl border px-4 py-3 text-sm text-foreground"
        style={{
          minHeight: multiline ? 96 : 52,
          borderColor: theme.border,
          backgroundColor: isDark ? "hsl(240 10% 14%)" : "hsl(243 30% 97%)",
          fontFamily: "PlusJakartaSans_500Medium",
          color: theme.foreground,
        }}
      />
    </View>
  )
}

export default function ProfileScreen() {
  const router = useRouter()
  const {
    user,
    profile,
    refreshProfile,
    uploadProfilePhoto,
    updateProfile,
    sendVerificationEmail,
  } = useAuth()
  const colorScheme = useColorScheme()
  const isDark = colorScheme === "dark"
  const theme = isDark ? THEME.dark : THEME.light
  const [isEditOpen, setIsEditOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false)
  const [isSendingVerification, setIsSendingVerification] = useState(false)
  const [fullName, setFullName] = useState("")
  const [schoolName, setSchoolName] = useState("")
  const [reviewType, setReviewType] = useState("")
  const [avatarUrl, setAvatarUrl] = useState("")
  const [imageFailed, setImageFailed] = useState(false)

  useEffect(() => {
    if (!profile) {
      void refreshProfile()
    }
  }, [profile, refreshProfile])

  useEffect(() => {
    setImageFailed(false)
  }, [profile?.avatarUrl, user?.name])

  const displayName = profile?.fullName ?? user?.name ?? "Reviewer"
  const email = profile?.email ?? user?.email ?? ""
  const emailVerified = user?.emailVerification === true
  const avatarSource = useMemo(
    () => profile?.avatarUrl?.trim() || getAvatarUrl(displayName),
    [displayName, profile?.avatarUrl]
  )
  const memberSince = formatMemberSince(profile?.createdAt)
  const initials = getInitials(displayName)

  function openEditDialog() {
    setFullName(profile?.fullName ?? user?.name ?? "")
    setSchoolName(profile?.schoolName ?? "")
    setReviewType(profile?.reviewType ?? "")
    setAvatarUrl(profile?.avatarUrl ?? "")
    setIsEditOpen(true)
  }

  async function handlePickProfilePhoto() {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync()

    if (!permission.granted) {
      Alert.alert(
        "Permission needed",
        "Allow photo library access to choose a profile picture."
      )
      return
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
      selectionLimit: 1,
    })

    if (result.canceled || result.assets.length === 0) {
      return
    }

    const asset = result.assets[0]
    const fileSize = asset.fileSize ?? 0
    const fileName =
      asset.fileName ??
      `profile-${Date.now()}.${asset.mimeType?.split("/")[1] ?? "jpg"}`
    const mimeType = asset.mimeType ?? "image/jpeg"

    if (!fileSize) {
      Alert.alert(
        "Upload failed",
        "The selected image did not include a readable file size. Try another image."
      )
      return
    }

    setIsUploadingAvatar(true)

    try {
      const uploadedAvatarUrl = await uploadProfilePhoto({
        uri: asset.uri,
        name: fileName,
        type: mimeType,
        size: fileSize,
      })

      setAvatarUrl(uploadedAvatarUrl)
      setImageFailed(false)
      Alert.alert("Photo uploaded", "Your new profile photo is ready to save.")
    } catch (error) {
      Alert.alert(
        "Upload failed",
        error instanceof Error
          ? error.message
          : "Unable to upload your profile photo right now."
      )
    } finally {
      setIsUploadingAvatar(false)
    }
  }

  async function handleSaveProfile() {
    setIsSubmitting(true)

    try {
      await updateProfile({
        fullName,
        schoolName,
        reviewType,
        avatarUrl,
      })
      setIsEditOpen(false)
      Alert.alert("Profile updated", "Your profile details were saved.")
    } catch (error) {
      Alert.alert(
        "Update failed",
        error instanceof Error
          ? error.message
          : "Unable to update your profile right now."
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  async function handleSendVerification() {
    setIsSendingVerification(true)

    try {
      await sendVerificationEmail()
      Alert.alert(
        "Verification sent",
        "Check your inbox and open the verification link on this device to finish verifying your email."
      )
    } catch (error) {
      Alert.alert(
        "Unable to send verification",
        error instanceof Error
          ? error.message
          : "Verification email could not be sent."
      )
    } finally {
      setIsSendingVerification(false)
    }
  }

  return (
    <SafeAreaView className="flex-1 bg-background">
      <ScrollView
        contentContainerClassName="gap-4 px-4 pb-28 pt-5"
        contentInsetAdjustmentBehavior="automatic"
      >
        <View className="gap-4">
          <View className="flex-row items-start justify-between gap-3">
            <View className="flex-1 gap-1">
              <Text className="text-[11px] font-black uppercase tracking-[1.8px] text-primary">
                Account Hub
              </Text>
              <Text className="text-[24px] font-black leading-tight text-foreground">
                My Profile
              </Text>
              <Text className="text-[13px] leading-6 text-muted-foreground">
                Manage your study identity, contact details, and account status.
              </Text>
            </View>

            <Pressable
              className="h-11 w-11 items-center justify-center rounded-2xl border border-border bg-card"
              onPress={() => router.push("/settings")}
            >
              <Settings size={18} color={theme.primary} strokeWidth={2.3} />
            </Pressable>
          </View>

          <View className="flex-row items-center gap-4 rounded-[28px] border border-border bg-card px-4 py-4">
            <View className="relative">
              {avatarSource && !imageFailed ? (
                <Image
                  source={{ uri: avatarSource }}
                  className="h-20 w-20 rounded-[24px]"
                  resizeMode="cover"
                  onError={() => setImageFailed(true)}
                />
              ) : (
                <View className="h-20 w-20 items-center justify-center rounded-[24px] bg-primary">
                  <Text className="text-2xl font-black text-primary-foreground">
                    {initials}
                  </Text>
                </View>
              )}
              <Pressable
                className="absolute -bottom-2 -right-2 h-10 w-10 items-center justify-center rounded-2xl border border-border bg-background"
                onPress={openEditDialog}
              >
                <Camera size={16} color={theme.primary} strokeWidth={2.4} />
              </Pressable>
            </View>

            <View className="flex-1 gap-1.5">
              <Text className="text-[20px] font-black text-card-foreground">
                {displayName}
              </Text>
              <Text className="text-[13px] text-muted-foreground">{email}</Text>
              {profile?.schoolName ? (
                <Text className="text-[13px] text-muted-foreground">
                  {profile.schoolName}
                </Text>
              ) : null}

              <View className="mt-1 flex-row flex-wrap gap-2">
                <View className="rounded-full border border-border bg-background px-2.5 py-1">
                  <Text className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
                    {profile?.isPremium ? "Premium" : "Free plan"}
                  </Text>
                </View>
                <View
                  className={`rounded-full px-2.5 py-1 ${emailVerified ? "bg-success/15" : "bg-warning/15"}`}
                >
                  <Text
                    className={`text-[10px] font-bold uppercase tracking-wide ${emailVerified ? "text-primary" : "text-destructive"}`}
                  >
                    {emailVerified ? "Email verified" : "Verification needed"}
                  </Text>
                </View>
              </View>
            </View>
          </View>

          <View className="flex-row gap-2">
            <Button
              className="h-11 flex-1 rounded-2xl"
              onPress={openEditDialog}
            >
              <UserRoundPen
                size={16}
                color={theme.primaryForeground}
                strokeWidth={2.3}
              />
              <Text className="font-bold text-primary-foreground">
                Edit profile
              </Text>
            </Button>
            <Button
              variant="outline"
              className="h-11 flex-1 rounded-2xl"
              onPress={() => router.push("/settings")}
            >
              <ShieldCheck size={16} color={theme.primary} strokeWidth={2.2} />
              <Text className="font-bold">Settings</Text>
            </Button>
          </View>
        </View>

        <Card className="rounded-[28px]">
          <CardContent className="gap-3 px-4 py-4">
            <View className="flex-row items-start justify-between gap-3">
              <View className="flex-1 gap-1">
                <Text className="text-base font-black text-card-foreground">
                  Email Verification
                </Text>
                <Text className="text-[13px] leading-6 text-muted-foreground">
                  Verified email improves account recovery and keeps account
                  updates secure.
                </Text>
              </View>
              {emailVerified ? (
                <BadgeCheck size={18} color={theme.success} strokeWidth={2.3} />
              ) : (
                <MailWarning
                  size={18}
                  color={theme.warning}
                  strokeWidth={2.3}
                />
              )}
            </View>

            <View className="rounded-2xl border border-border bg-background px-3.5 py-3">
              <Text className="text-sm font-bold text-card-foreground">
                {emailVerified
                  ? "Your email is verified."
                  : "Your email is not verified yet."}
              </Text>
              <Text className="mt-1 text-[13px] leading-6 text-muted-foreground">
                {emailVerified
                  ? "No further action is needed unless you change your email address."
                  : "Tap the button below and complete the Appwrite verification link from the same device."}
              </Text>
            </View>

            {!emailVerified ? (
              <Button
                className="h-11 rounded-2xl"
                onPress={() => void handleSendVerification()}
                disabled={isSendingVerification}
              >
                <MailCheck
                  size={16}
                  color={theme.primaryForeground}
                  strokeWidth={2.3}
                />
                <Text className="font-bold text-primary-foreground">
                  {isSendingVerification
                    ? "Sending verification…"
                    : "Send verification email"}
                </Text>
              </Button>
            ) : null}
          </CardContent>
        </Card>

        <Card className="rounded-[28px]">
          <CardContent className="gap-3 px-4 py-4">
            <Text className="text-base font-black text-card-foreground">
              Profile Details
            </Text>
            <View className="gap-3">
              <View className="rounded-2xl border border-border bg-background px-3.5 py-3">
                <Text className="text-[11px] font-bold uppercase tracking-[1.2px] text-muted-foreground">
                  Review focus
                </Text>
                <Text className="mt-1 text-sm font-bold text-card-foreground">
                  {profile?.reviewType || "Not set yet"}
                </Text>
              </View>
              <View className="rounded-2xl border border-border bg-background px-3.5 py-3">
                <Text className="text-[11px] font-bold uppercase tracking-[1.2px] text-muted-foreground">
                  School
                </Text>
                <Text className="mt-1 text-sm font-bold text-card-foreground">
                  {profile?.schoolName || "Not added yet"}
                </Text>
              </View>
              <View className="rounded-2xl border border-border bg-background px-3.5 py-3">
                <Text className="text-[11px] font-bold uppercase tracking-[1.2px] text-muted-foreground">
                  Member since
                </Text>
                <Text className="mt-1 text-sm font-bold text-card-foreground">
                  {memberSince}
                </Text>
              </View>
            </View>
          </CardContent>
        </Card>
      </ScrollView>

      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
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
              <View className="flex-row items-center gap-3 rounded-2xl border border-border bg-background px-3.5 py-3">
                <View className="relative">
                  {(avatarUrl || profile?.avatarUrl || avatarSource) &&
                  !imageFailed ? (
                    <Image
                      source={{
                        uri: avatarUrl || profile?.avatarUrl || avatarSource,
                      }}
                      className="h-16 w-16 rounded-[20px]"
                      resizeMode="cover"
                      onError={() => setImageFailed(true)}
                    />
                  ) : (
                    <View className="h-16 w-16 items-center justify-center rounded-[20px] bg-primary">
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
                      onPress={() => void handlePickProfilePhoto()}
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
                      onPress={() => setAvatarUrl("")}
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
              onChangeText={setFullName}
              placeholder="Enter your full name"
            />
            <ProfileInput
              label="School"
              value={schoolName}
              onChangeText={setSchoolName}
              placeholder="Add your school or organization"
            />
            <ProfileInput
              label="Review focus"
              value={reviewType}
              onChangeText={setReviewType}
              placeholder="Example: Social Work Board Exam"
            />
          </View>

          <DialogFooter>
            <Button
              variant="outline"
              className="h-11 rounded-2xl"
              onPress={() => setAvatarUrl("")}
            >
              <Text className="font-bold">Use initials avatar</Text>
            </Button>
            <Button
              className="h-11 rounded-2xl"
              onPress={() => void handleSaveProfile()}
              disabled={isSubmitting}
            >
              <Text className="font-bold text-primary-foreground">
                {isSubmitting ? "Saving…" : "Save changes"}
              </Text>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </SafeAreaView>
  )
}
