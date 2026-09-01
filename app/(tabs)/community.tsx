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
import { prepareImageForUpload } from "@/lib/image-upload"
import { listLearningSubjects } from "@/lib/learning-content"
import { THEME } from "@/lib/theme"
import { useColorScheme } from "@/hooks/use-color-scheme"
import { EmptyState } from "@/components/ui/empty-state"
import { Text } from "@/components/ui/text"
import { ScrollView } from "@/components/ui/virtualized-scroll-view"
import { CommunityComposerDialog } from "@/components/community/community-composer-dialog"
import { CommunityFeedHeader } from "@/components/community/community-feed-header"
import { CommunityLoading } from "@/components/community/community-loading"
import { useIsPremium } from "@/hooks/use-membership"
import { useCommunityModeration } from "@/hooks/use-community-moderation"
import { useReport } from "@/hooks/use-report"
import {
  PostActionsMenu,
  type PostAction,
} from "@/components/community/post-actions-menu"
import { CommunityThreadCard } from "@/components/community/community-thread-card"
import { ReportDialog } from "@/components/report"
import { getMemberByline } from "@/lib/member/profile"

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

  // This used to pass `viewerIsPremium: true` outright, which unlocked every
  // premium subject for every member in the composer's subject picker.
  const isPremiumUser = useIsPremium()

  const subjectsQuery = useQuery({
    queryKey: ["community-subjects", isPremiumUser],
    queryFn: () => listLearningSubjects({ viewerIsPremium: isPremiumUser }),
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
      subtitle: getMemberByline(profile, user.email ?? "Community member"),
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
      quality: 1,
      selectionLimit: 1,
    })

    if (result.canceled || result.assets.length === 0) {
      return
    }

    const asset = result.assets[0]

    setIsUploadingPhoto(true)
    try {
      // Wider than an avatar because thread images are read full-width, but
      // still far below the camera roll original.
      const prepared = await prepareImageForUpload(asset, {
        maxEdge: 1440,
        compress: 0.8,
        baseName: "thread",
      })

      const uploadedUrl = await uploadCommunityPostPhoto(prepared)
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

  // Filing a report, and saying so. The confirmation has to be explicit
  // because nothing else will change: `flagged_content` is create-only from a
  // client, so the post stays exactly where it was until the team acts on it.
  const report = useReport()

  // Report, block and delete all hang off one sheet. They are different
  // promises — see `useCommunityModeration` — so the sheet names each of them
  // rather than offering a single ambiguous "…".
  const [actionsPost, setActionsPost] = useState<CommunityPostItem | null>(null)
  const moderation = useCommunityModeration({
    // With the user id, or the refreshed feed comes back without this member's
    // own like state and every heart appears to reset.
    onChanged: () => void refreshFeed(user?.$id),
  })

  const handleAction = useCallback(
    (action: PostAction) => {
      const post = actionsPost
      setActionsPost(null)

      if (!post) {
        return
      }

      if (action === "report") {
        report.open({ contentType: "post", contentId: post.id })
        return
      }

      if (action === "block") {
        moderation.confirmBlock({ userId: post.userId, name: post.author.name })
        return
      }

      moderation.confirmDelete({ table: "posts", rowId: post.id })
    },
    [actionsPost, moderation, report]
  )

  const renderItem = useCallback(
    ({ item }: ListRenderItemInfo<CommunityPostItem>) => (
      <CommunityThreadCard
        post={item}
        liking={togglingLikePostId === item.id}
        onLike={handleLike}
        onOpen={handleOpenPost}
        onOpenActions={setActionsPost}
        theme={theme}
      />
    ),
    [handleLike, handleOpenPost, theme, togglingLikePostId]
  )

  const emptyState = useMemo(
    () => (
      <View className="items-center px-8 py-12">
        <Text className="text-center text-sm text-muted-foreground">
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
          <Text className="text-xs text-muted-foreground">
            Scroll for more discussions
          </Text>
        </View>
      )
    }

    return <View className="h-6" />
  }, [activeFeedFilter, hasMoreFeed, isLoadingMore, theme.primary])

  return (
    <SafeAreaView className="flex-1 bg-background" edges={["top", "left", "right"]}>
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
          <EmptyState
            tone="destructive"
            title="Community unavailable"
            description={error}
          />
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

      <PostActionsMenu
        open={actionsPost !== null}
        onOpenChange={(open) => {
          if (!open) {
            setActionsPost(null)
          }
        }}
        isOwn={moderation.isOwn(actionsPost?.userId ?? "")}
        authorName={actionsPost?.author.name ?? "This member"}
        onSelect={handleAction}
      />

      <ReportDialog
        open={report.isOpen}
        contentType={report.contentType}
        onOpenChange={(open) => {
          if (!open) {
            report.close()
          }
        }}
        onSubmit={report.submit}
      />
    </SafeAreaView>
  )
}
