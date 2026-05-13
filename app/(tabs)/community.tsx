import { useCallback, useEffect, useMemo, useState } from "react"
import { useAuth } from "@/contexts/auth-context"
import {
  COMMUNITY_FEED_FILTERS,
  useCommunity,
  type CommunityFeedFilter,
} from "@/contexts/community-context"
import { FlashList, type ListRenderItemInfo } from "@shopify/flash-list"
import { useQuery } from "@tanstack/react-query"
import * as ImagePicker from "expo-image-picker"
import { useRouter } from "expo-router"
import { ActivityIndicator, Alert, View } from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"

import {
  uploadCommunityPostPhoto,
  type CommunityPostItem,
} from "@/lib/community"
import { listLearningSubjects } from "@/lib/learning-content"
import { THEME } from "@/lib/theme"
import { useColorScheme } from "@/hooks/use-color-scheme"
import { Card, CardContent } from "@/components/ui/card"
import { Text } from "@/components/ui/text"
import { ScrollView } from "@/components/ui/virtualized-scroll-view"
import { CommunityComposerDialog } from "@/components/community/community-composer-dialog"
import { CommunityFeedHeader } from "@/components/community/community-feed-header"
import { CommunityLoading } from "@/components/community/community-loading"
import { CommunityThreadCard } from "@/components/community/community-thread-card"

function ThreadSeparator() {
  return <View className="h-2 bg-muted/30" />
}

function toCommunityAvatarSeed(name: string) {
  return (
    name
      .split(/\s+/)
      .map((part) => part[0])
      .filter(Boolean)
      .join("")
      .toUpperCase()
      .slice(0, 2) || "RV"
  )
}

export default function CommunityScreen() {
  const router = useRouter()
  const user = useAuth((s) => s.user)
  const profile = useAuth((s) => s.profile)
  const isAuthenticated = useAuth((s) => s.isAuthenticated)
  const refreshProfile = useAuth((s) => s.refreshProfile)
  const colorScheme = useColorScheme()
  const theme = colorScheme === "dark" ? THEME.dark : THEME.light
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false)

  // Zustand store
  const feed = useCommunity((s) => s.feed)
  const isLoading = useCommunity((s) => s.isLoading)
  const error = useCommunity((s) => s.error)
  const isLoadingMore = useCommunity((s) => s.isLoadingMore)
  const hasMoreFeed = useCommunity((s) => s.hasMoreFeed)
  const activeFeedFilter = useCommunity((s) => s.activeFeedFilter)
  const isComposerOpen = useCommunity((s) => s.isComposerOpen)
  const selectedCategory = useCommunity((s) => s.selectedCategory)
  const selectedSubjectId = useCommunity((s) => s.selectedSubjectId)
  const titleDraft = useCommunity((s) => s.titleDraft)
  const contentDraft = useCommunity((s) => s.contentDraft)
  const photoUrlDraft = useCommunity((s) => s.photoUrlDraft)
  const isCreatingPost = useCommunity((s) => s.isCreatingPost)
  const togglingLikePostId = useCommunity((s) => s.togglingLikePostId)

  const loadFeed = useCommunity((s) => s.loadFeed)
  const refreshFeed = useCommunity((s) => s.refreshFeed)
  const loadMoreFeed = useCommunity((s) => s.loadMoreFeed)
  const setActiveFeedFilter = useCommunity((s) => s.setActiveFeedFilter)
  const setIsComposerOpen = useCommunity((s) => s.setIsComposerOpen)
  const setSelectedCategory = useCommunity((s) => s.setSelectedCategory)
  const setSelectedSubjectId = useCommunity((s) => s.setSelectedSubjectId)
  const setTitleDraft = useCommunity((s) => s.setTitleDraft)
  const setContentDraft = useCommunity((s) => s.setContentDraft)
  const setPhotoUrlDraft = useCommunity((s) => s.setPhotoUrlDraft)
  const submitPost = useCommunity((s) => s.submitPost)
  const toggleLike = useCommunity((s) => s.toggleLike)

  // Load feed on mount
  useEffect(() => {
    void loadFeed(user?.$id)
  }, [loadFeed, user?.$id])

  useEffect(() => {
    if (isAuthenticated && !profile) {
      void refreshProfile()
    }
  }, [isAuthenticated, profile, refreshProfile])

  const subjectsQuery = useQuery({
    queryKey: ["community-subjects"],
    queryFn: () => listLearningSubjects({ viewerIsPremium: true }),
  })

  const currentAvatarSeed = useMemo(() => {
    const name = profile?.fullName ?? user?.name ?? "Reviewer"
    return toCommunityAvatarSeed(name)
  }, [profile?.fullName, user?.name])
  const currentAvatarUrl = profile?.avatarUrl?.trim() || null

  const totalPosts = feed?.posts.length ?? 0

  const filteredPosts = useMemo(() => {
    const posts = feed?.posts ?? []
    if (activeFeedFilter === "all") return posts
    return posts.filter((post) => post.category === activeFeedFilter)
  }, [activeFeedFilter, feed?.posts])

  const featuredSubjects = useMemo(
    () => (subjectsQuery.data ?? []).slice(0, 6),
    [subjectsQuery.data]
  )

  const handleRefreshFeed = useCallback(() => {
    void refreshFeed(user?.$id)
  }, [refreshFeed, user?.$id])

  const handleLoadMoreFeed = useCallback(() => {
    if (activeFeedFilter !== "all") {
      return
    }

    void loadMoreFeed(user?.$id)
  }, [activeFeedFilter, loadMoreFeed, user?.$id])

  const handleOpenPost = useCallback(
    (postId: string) => {
      router.push({ pathname: "/community/[postId]", params: { postId } })
    },
    [router]
  )

  const handleLike = useCallback(
    (post: CommunityPostItem) => {
      if (!user?.$id) return
      void toggleLike(user.$id, post)
    },
    [toggleLike, user?.$id]
  )

  const handleSubmitPost = useCallback(() => {
    if (!user?.$id) {
      Alert.alert(
        "Sign in required",
        "You need to be signed in to create a post."
      )
      return
    }
    const name = profile?.fullName ?? user.name ?? "Reviewer"
    const author = {
      id: user.$id,
      name,
      subtitle:
        profile?.reviewType ??
        profile?.email ??
        user.email ??
        "Community member",
      avatarSeed: toCommunityAvatarSeed(name),
      avatarUrl: profile?.avatarUrl?.trim() || null,
    }
    const subjectName = selectedSubjectId
      ? ((subjectsQuery.data ?? []).find((s) => s.id === selectedSubjectId)
          ?.name ?? null)
      : null
    void submitPost(user.$id, author, subjectName)
  }, [profile, selectedSubjectId, submitPost, subjectsQuery.data, user])

  const handlePickComposerPhoto = useCallback(async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync()

    if (!permission.granted) {
      Alert.alert(
        "Permission needed",
        "Allow photo library access to upload a thread image."
      )
      return
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      quality: 0.75,
      selectionLimit: 1,
    })

    if (result.canceled || result.assets.length === 0) {
      return
    }

    const asset = result.assets[0]
    const fileSize = asset.fileSize ?? 0
    const mimeType = asset.mimeType ?? "image/jpeg"
    const fileName =
      asset.fileName ??
      `thread-${Date.now()}.${mimeType.split("/")[1] ?? "jpg"}`

    if (!fileSize) {
      Alert.alert(
        "Upload failed",
        "The selected image does not include a readable file size."
      )
      return
    }

    setIsUploadingPhoto(true)
    try {
      const uploadedUrl = await uploadCommunityPostPhoto({
        uri: asset.uri,
        name: fileName,
        type: mimeType,
        size: fileSize,
      })
      setPhotoUrlDraft(uploadedUrl)
    } catch (error) {
      Alert.alert(
        "Upload failed",
        error instanceof Error
          ? error.message
          : "Unable to upload your thread image right now."
      )
    } finally {
      setIsUploadingPhoto(false)
    }
  }, [setPhotoUrlDraft])

  const handleRemoveComposerPhoto = useCallback(() => {
    setPhotoUrlDraft("")
  }, [setPhotoUrlDraft])

  const header = useMemo(
    () => (
      <CommunityFeedHeader
        activeFeedFilter={activeFeedFilter}
        featuredSubjects={featuredSubjects}
        filters={COMMUNITY_FEED_FILTERS}
        onChangeFeedFilter={(f) =>
          setActiveFeedFilter(f as CommunityFeedFilter)
        }
        onOpenComposer={() => setIsComposerOpen(true)}
        onRefresh={handleRefreshFeed}
        totalPosts={totalPosts}
        stats={feed?.stats}
        theme={theme}
        currentUserAvatarLabel={currentAvatarSeed}
        currentUserAvatarUrl={currentAvatarUrl}
      />
    ),
    [
      activeFeedFilter,
      currentAvatarSeed,
      currentAvatarUrl,
      featuredSubjects,
      feed?.stats,
      handleRefreshFeed,
      setActiveFeedFilter,
      setIsComposerOpen,
      theme,
      totalPosts,
    ]
  )

  const renderItem = useCallback(
    ({ item }: ListRenderItemInfo<CommunityPostItem>) => (
      <CommunityThreadCard
        post={item}
        liking={togglingLikePostId === item.id}
        onLike={handleLike}
        onOpen={handleOpenPost}
        theme={theme}
      />
    ),
    [handleLike, handleOpenPost, theme, togglingLikePostId]
  )

  const emptyState = useMemo(
    () => (
      <View className="items-center px-8 py-12">
        <Text className="text-center text-[14px] text-muted-foreground">
          {activeFeedFilter === "all"
            ? "No discussions yet. Start the first thread!"
            : `No ${activeFeedFilter} posts yet.`}
        </Text>
      </View>
    ),
    [activeFeedFilter]
  )

  const footer = useMemo(() => {
    if (activeFeedFilter !== "all") {
      return <View className="h-6" />
    }

    if (isLoadingMore) {
      return (
        <View className="items-center py-4">
          <ActivityIndicator color={theme.primary} />
        </View>
      )
    }

    if (hasMoreFeed) {
      return (
        <View className="items-center py-4">
          <Text className="text-[12px] text-muted-foreground">
            Scroll for more discussions
          </Text>
        </View>
      )
    }

    return <View className="h-6" />
  }, [activeFeedFilter, hasMoreFeed, isLoadingMore, theme.primary])

  return (
    <SafeAreaView className="flex-1 bg-background">
      {isLoading && !feed ? (
        <ScrollView
          contentContainerClassName="gap-4 px-4 pb-8 pt-5"
          contentInsetAdjustmentBehavior="automatic"
        >
          {header}
          <CommunityLoading />
        </ScrollView>
      ) : error && !feed ? (
        <ScrollView
          contentContainerClassName="gap-4 px-4 pb-8 pt-5"
          contentInsetAdjustmentBehavior="automatic"
        >
          {header}
          <Card>
            <CardContent className="gap-2 px-4 py-4">
              <Text className="text-sm font-black text-destructive">
                Community unavailable
              </Text>
              <Text className="text-[13px] leading-5 text-muted-foreground">
                {error}
              </Text>
            </CardContent>
          </Card>
        </ScrollView>
      ) : (
        <FlashList
          data={filteredPosts}
          extraData={theme}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          ListHeaderComponent={header}
          ListEmptyComponent={emptyState}
          ListFooterComponent={footer}
          contentContainerStyle={{
            paddingHorizontal: 16,
            paddingTop: 16,
            paddingBottom: 128,
          }}
          ItemSeparatorComponent={ThreadSeparator}
          keyboardShouldPersistTaps="handled"
          onEndReached={handleLoadMoreFeed}
          onEndReachedThreshold={0.35}
          removeClippedSubviews
          showsVerticalScrollIndicator={false}
        />
      )}

      <CommunityComposerDialog
        open={isComposerOpen}
        onOpenChange={setIsComposerOpen}
        categories={["question", "discussion", "tip"]}
        contentDraft={contentDraft}
        isPending={isCreatingPost}
        isUploadingPhoto={isUploadingPhoto}
        onChangeContentDraft={setContentDraft}
        onChangeTitleDraft={setTitleDraft}
        onPickPhoto={handlePickComposerPhoto}
        onRemovePhoto={handleRemoveComposerPhoto}
        onSelectCategory={(c) =>
          setSelectedCategory(c as "question" | "discussion" | "tip")
        }
        onSelectSubject={setSelectedSubjectId}
        onSubmit={handleSubmitPost}
        photoUrlDraft={photoUrlDraft}
        selectedCategory={selectedCategory}
        selectedSubjectId={selectedSubjectId}
        subjects={subjectsQuery.data ?? []}
        theme={theme}
        titleDraft={titleDraft}
      />
    </SafeAreaView>
  )
}
