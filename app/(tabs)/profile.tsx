import { useEffect, useMemo, useState } from "react"
import { useAuth } from "@/contexts/auth-context"
import * as ImagePicker from "expo-image-picker"
import { useRouter } from "expo-router"
import {
  BadgeCheck,
  BookOpen,
  Calendar,
  Camera,
  Flame,
  GraduationCap,
  Settings,
  Star,
  UserRoundPen,
} from "lucide-react-native"
import { Alert, Image, Pressable, TextInput, View } from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"

import { getAvatarUrl, getInitials } from "@/lib/auth"
import { THEME, withOpacity } from "@/lib/theme"
import { useColorScheme } from "@/hooks/use-color-scheme"
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

function formatMemberSince(value: string | undefined) {
  if (!value) return "Not available"
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return "Not available"
  return new Intl.DateTimeFormat("en-PH", {
    year: "numeric",
    month: "long",
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
  const user = useAuth((state) => state.user)
  const profile = useAuth((state) => state.profile)
  const refreshProfile = useAuth((state) => state.refreshProfile)
  const uploadProfilePhoto = useAuth((state) => state.uploadProfilePhoto)
  const updateProfile = useAuth((state) => state.updateProfile)
  const sendVerificationEmail = useAuth((state) => state.sendVerificationEmail)
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
  const [activeTab, setActiveTab] = useState<"details" | "activity">("details")

  useEffect(() => {
    if (!profile) void refreshProfile()
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
    if (result.canceled || result.assets.length === 0) return
    const asset = result.assets[0]
    const fileSize = asset.fileSize ?? 0
    const fileName =
      asset.fileName ??
      `profile-${Date.now()}.${asset.mimeType?.split("/")[1] ?? "jpg"}`
    const mimeType = asset.mimeType ?? "image/jpeg"
    if (!fileSize) {
      Alert.alert(
        "Upload failed",
        "The selected image did not include a readable file size."
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
      await updateProfile({ fullName, schoolName, reviewType, avatarUrl })
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
        "Check your inbox and open the verification link on this device."
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
    <SafeAreaView className="flex-1 bg-background" edges={["bottom"]}>
      <ScrollView
        contentContainerClassName="pb-32"
        contentInsetAdjustmentBehavior="automatic"
        showsVerticalScrollIndicator={false}
      >
        {/* Cover area */}
        <View
          style={{
            height: 160,
            backgroundColor: withOpacity(theme.primary, 0.15),
          }}
        >
          {/* Top bar icons */}
          <SafeAreaView
            edges={["top"]}
            className="flex-row items-center justify-between px-4 pt-2"
          >
            <View />
            <Pressable
              className="h-10 w-10 items-center justify-center rounded-full"
              style={{ backgroundColor: withOpacity(theme.background, 0.7) }}
              onPress={() => router.push("/settings")}
            >
              <Settings size={18} color={theme.foreground} strokeWidth={2.2} />
            </Pressable>
          </SafeAreaView>
        </View>

        {/* Avatar overlapping cover */}
        <View className="items-center" style={{ marginTop: -50 }}>
          <View className="relative">
            <View
              className="overflow-hidden rounded-full border-4"
              style={{ borderColor: theme.background }}
            >
              {avatarSource && !imageFailed ? (
                <Image
                  source={{ uri: avatarSource }}
                  style={{ width: 100, height: 100 }}
                  resizeMode="cover"
                  onError={() => setImageFailed(true)}
                />
              ) : (
                <View
                  className="items-center justify-center bg-primary"
                  style={{ width: 100, height: 100 }}
                >
                  <Text className="text-3xl font-black text-primary-foreground">
                    {initials}
                  </Text>
                </View>
              )}
            </View>
            <Pressable
              className="absolute -bottom-1 -right-1 h-9 w-9 items-center justify-center rounded-full border-2 bg-primary"
              style={{ borderColor: theme.background }}
              onPress={openEditDialog}
            >
              <Camera
                size={14}
                color={theme.primaryForeground}
                strokeWidth={2.4}
              />
            </Pressable>
          </View>

          {/* Name & subtitle */}
          <View className="mt-3 items-center gap-1">
            <Text className="text-[20px] font-black text-foreground">
              {displayName}
            </Text>
            <Text className="text-[13px] text-muted-foreground">
              @{email.split("@")[0]}
            </Text>
            <Text className="text-[12px] text-muted-foreground">
              Member since {memberSince}
            </Text>
          </View>
        </View>

        {/* Stats row */}
        <View className="mt-4 flex-row justify-center gap-8 border-b border-border/40 pb-4">
          <View className="items-center">
            <Text className="text-[17px] font-black text-foreground">
              {profile?.isPremium ? "Pro" : "Free"}
            </Text>
            <Text className="text-[11px] text-muted-foreground">Plan</Text>
          </View>
          <View className="items-center">
            <Text className="text-[17px] font-black text-foreground">
              {emailVerified ? "Yes" : "No"}
            </Text>
            <Text className="text-[11px] text-muted-foreground">Verified</Text>
          </View>
          <View className="items-center">
            <Text className="text-[17px] font-black text-foreground">
              {profile?.schoolName ? "1" : "0"}
            </Text>
            <Text className="text-[11px] text-muted-foreground">School</Text>
          </View>
        </View>

        {/* Action buttons */}
        <View className="flex-row gap-2.5 px-4 pt-4">
          <Button className="h-11 flex-1 rounded-xl" onPress={openEditDialog}>
            <UserRoundPen
              size={15}
              color={theme.primaryForeground}
              strokeWidth={2.3}
            />
            <Text className="text-[13px] font-bold text-primary-foreground">
              Edit Profile
            </Text>
          </Button>
          <Button
            variant="outline"
            className="h-11 flex-1 rounded-xl"
            onPress={() => router.push("/settings")}
          >
            <Settings size={15} color={theme.primary} strokeWidth={2.2} />
            <Text className="text-[13px] font-bold">Settings</Text>
          </Button>
        </View>

        {/* Tabs */}
        <View className="mt-4 flex-row border-b border-border/40">
          <Pressable
            className="flex-1 items-center pb-3"
            onPress={() => setActiveTab("details")}
          >
            <Text
              className="text-[13px] font-bold"
              style={{
                color:
                  activeTab === "details"
                    ? theme.primary
                    : theme.mutedForeground,
              }}
            >
              Details
            </Text>
            {activeTab === "details" ? (
              <View
                className="absolute bottom-0 h-0.5 w-12 rounded-full"
                style={{ backgroundColor: theme.primary }}
              />
            ) : null}
          </Pressable>
          <Pressable
            className="flex-1 items-center pb-3"
            onPress={() => setActiveTab("activity")}
          >
            <Text
              className="text-[13px] font-bold"
              style={{
                color:
                  activeTab === "activity"
                    ? theme.primary
                    : theme.mutedForeground,
              }}
            >
              Activity
            </Text>
            {activeTab === "activity" ? (
              <View
                className="absolute bottom-0 h-0.5 w-12 rounded-full"
                style={{ backgroundColor: theme.primary }}
              />
            ) : null}
          </Pressable>
        </View>

        {/* Tab content */}
        <View className="gap-3 px-4 pt-4">
          {activeTab === "details" ? (
            <>
              {/* Info rows */}
              <View className="flex-row items-center gap-3 py-2">
                <View
                  className="h-9 w-9 items-center justify-center rounded-full"
                  style={{ backgroundColor: withOpacity(theme.primary, 0.1) }}
                >
                  <GraduationCap size={16} color={theme.primary} />
                </View>
                <View className="flex-1">
                  <Text className="text-[12px] text-muted-foreground">
                    Review Focus
                  </Text>
                  <Text className="text-[14px] font-semibold text-foreground">
                    {profile?.reviewType || "Not set yet"}
                  </Text>
                </View>
              </View>

              <View className="flex-row items-center gap-3 py-2">
                <View
                  className="h-9 w-9 items-center justify-center rounded-full"
                  style={{ backgroundColor: withOpacity(theme.primary, 0.1) }}
                >
                  <BookOpen size={16} color={theme.primary} />
                </View>
                <View className="flex-1">
                  <Text className="text-[12px] text-muted-foreground">
                    School
                  </Text>
                  <Text className="text-[14px] font-semibold text-foreground">
                    {profile?.schoolName || "Not added yet"}
                  </Text>
                </View>
              </View>

              <View className="flex-row items-center gap-3 py-2">
                <View
                  className="h-9 w-9 items-center justify-center rounded-full"
                  style={{ backgroundColor: withOpacity(theme.primary, 0.1) }}
                >
                  <Calendar size={16} color={theme.primary} />
                </View>
                <View className="flex-1">
                  <Text className="text-[12px] text-muted-foreground">
                    Joined
                  </Text>
                  <Text className="text-[14px] font-semibold text-foreground">
                    {memberSince}
                  </Text>
                </View>
              </View>

              <View className="flex-row items-center gap-3 py-2">
                <View
                  className="h-9 w-9 items-center justify-center rounded-full"
                  style={{ backgroundColor: withOpacity(theme.primary, 0.1) }}
                >
                  <Star size={16} color={theme.primary} />
                </View>
                <View className="flex-1">
                  <Text className="text-[12px] text-muted-foreground">
                    Plan
                  </Text>
                  <Text className="text-[14px] font-semibold text-foreground">
                    {profile?.isPremium ? "Premium Member" : "Free Plan"}
                  </Text>
                </View>
              </View>

              {/* Email verification */}
              <View
                className="mt-2 flex-row items-center gap-3 rounded-2xl px-3.5 py-3"
                style={{
                  backgroundColor: emailVerified
                    ? withOpacity(theme.success, 0.08)
                    : withOpacity(theme.warning, 0.08),
                  borderWidth: 1,
                  borderColor: emailVerified
                    ? withOpacity(theme.success, 0.2)
                    : withOpacity(theme.warning, 0.2),
                }}
              >
                <BadgeCheck
                  size={18}
                  color={emailVerified ? theme.success : theme.warning}
                />
                <View className="flex-1">
                  <Text className="text-[13px] font-bold text-foreground">
                    {emailVerified ? "Email Verified" : "Email Not Verified"}
                  </Text>
                  {!emailVerified ? (
                    <Pressable
                      onPress={() => void handleSendVerification()}
                      disabled={isSendingVerification}
                    >
                      <Text className="mt-0.5 text-[12px] font-semibold text-primary">
                        {isSendingVerification ? "Sending..." : "Verify now"}
                      </Text>
                    </Pressable>
                  ) : null}
                </View>
              </View>
            </>
          ) : (
            /* Activity tab */
            <View className="items-center gap-3 py-8">
              <View
                className="h-14 w-14 items-center justify-center rounded-full"
                style={{ backgroundColor: withOpacity(theme.primary, 0.1) }}
              >
                <Flame size={24} color={theme.primary} />
              </View>
              <Text className="text-center text-[14px] font-bold text-foreground">
                Activity Coming Soon
              </Text>
              <Text className="text-center text-[13px] text-muted-foreground">
                Your quiz history, streaks, and study activity will appear here.
              </Text>
              <Button
                className="mt-2 h-11 rounded-xl px-6"
                onPress={() => router.push("/dashboard")}
              >
                <Text className="text-[13px] font-bold text-primary-foreground">
                  View Dashboard
                </Text>
              </Button>
            </View>
          )}
        </View>
      </ScrollView>

      {/* Edit Profile Dialog */}
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
                      className="h-16 w-16 rounded-full"
                      resizeMode="cover"
                      onError={() => setImageFailed(true)}
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
