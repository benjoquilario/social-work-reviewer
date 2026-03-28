import { memo, useCallback, useMemo, useState } from "react"
import { useAuth } from "@/contexts/auth-context"
import { FlashList, type ListRenderItemInfo } from "@shopify/flash-list"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import {
  CornerDownRight,
  Heart,
  MessageSquare,
  Plus,
  Send,
  Sparkles,
  Tag,
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

import {
  createCommunityComment,
  createCommunityPost,
  createCommunityReply,
  listCommunityFeed,
  toggleCommunityPostLike,
  type CommunityCommentItem,
  type CommunityPostItem,
  type CommunityReplyItem,
} from "@/lib/community"
import { listLearningSubjects } from "@/lib/learning-content"
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
import { Skeleton } from "@/components/ui/skeleton"
import { Text } from "@/components/ui/text"
import { AppShellHeader } from "@/components/app-shell-header"

const COMMUNITY_CATEGORIES = ["question", "discussion", "tip"] as const
const COMMUNITY_FEED_FILTERS = ["all", ...COMMUNITY_CATEGORIES] as const

const ThreadSeparator = memo(function ThreadSeparator() {
  return <View className="h-4" />
})

const CommunityLoading = memo(function CommunityLoading() {
  return (
    <View className="gap-4">
      <Skeleton className="h-56 rounded-[30px]" />
      <View className="flex-row gap-3">
        <Skeleton className="h-24 flex-1 rounded-2xl" />
        <Skeleton className="h-24 flex-1 rounded-2xl" />
        <Skeleton className="h-24 flex-1 rounded-2xl" />
      </View>
      <Skeleton className="h-14 rounded-full" />
      <Skeleton className="h-56 rounded-2xl" />
      <Skeleton className="h-56 rounded-2xl" />
    </View>
  )
})

const ReplyRow = memo(function ReplyRow({
  reply,
}: {
  reply: CommunityReplyItem
}) {
  return (
    <View className="ml-6 rounded-2xl border border-border bg-background px-3 py-3">
      <View className="flex-row items-center gap-2">
        <View className="h-8 w-8 items-center justify-center rounded-full bg-primary/10">
          <Text className="text-xs font-bold uppercase text-primary">
            {reply.author.avatarSeed}
          </Text>
        </View>
        <View className="flex-1">
          <Text className="text-sm font-bold text-card-foreground">
            {reply.author.name}
          </Text>
          <Text className="text-xs text-muted-foreground">
            {reply.author.subtitle} · {reply.createdAtLabel}
          </Text>
        </View>
      </View>
      <Text className="mt-2 text-sm leading-6 text-muted-foreground">
        {reply.content}
      </Text>
    </View>
  )
})

const CommentRow = memo(function CommentRow({
  comment,
  disabled,
  onSubmitReply,
}: {
  comment: CommunityCommentItem
  disabled: boolean
  onSubmitReply: (commentId: string, content: string) => void
}) {
  const [replyDraft, setReplyDraft] = useState("")
  const [isReplying, setIsReplying] = useState(false)

  const submitReply = useCallback(() => {
    const trimmed = replyDraft.trim()

    if (!trimmed) {
      return
    }

    onSubmitReply(comment.id, trimmed)
    setReplyDraft("")
    setIsReplying(false)
  }, [comment.id, onSubmitReply, replyDraft])

  return (
    <View className="gap-3 rounded-[24px] border border-border bg-card px-3.5 py-3.5">
      <View className="flex-row items-start gap-3">
        <View className="h-10 w-10 items-center justify-center rounded-full bg-primary/10">
          <Text className="text-xs font-bold uppercase text-primary">
            {comment.author.avatarSeed}
          </Text>
        </View>
        <View className="flex-1 gap-1">
          <Text className="text-sm font-bold text-card-foreground">
            {comment.author.name}
          </Text>
          <Text className="text-xs text-muted-foreground">
            {comment.author.subtitle} · {comment.createdAtLabel}
          </Text>
          <Text className="text-sm leading-6 text-muted-foreground">
            {comment.content}
          </Text>
          <Pressable
            className="self-start rounded-full border border-border px-3 py-1.5"
            disabled={disabled}
            onPress={() => setIsReplying((current) => !current)}
            style={{ opacity: disabled ? 0.6 : 1 }}
          >
            <View className="flex-row items-center gap-1">
              <CornerDownRight size={14} color="#6b7280" />
              <Text className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
                Reply
              </Text>
            </View>
          </Pressable>
        </View>
      </View>

      {comment.replies.map((reply) => (
        <ReplyRow key={reply.id} reply={reply} />
      ))}

      {isReplying ? (
        <View className="ml-6 gap-2 rounded-2xl border border-border bg-background p-3">
          <TextInput
            value={replyDraft}
            onChangeText={setReplyDraft}
            placeholder="Write a respectful reply"
            placeholderTextColor="#8b8b93"
            className="min-h-[72px] text-sm text-foreground"
            multiline
            textAlignVertical="top"
          />
          <View className="flex-row justify-end">
            <Button className="h-10 px-4" onPress={submitReply}>
              <Send size={14} color="#ffffff" />
              <Text className="font-bold text-primary-foreground">Reply</Text>
            </Button>
          </View>
        </View>
      ) : null}
    </View>
  )
})

const ThreadCard = memo(function ThreadCard({
  post,
  liking,
  onLike,
  onOpen,
}: {
  post: CommunityPostItem
  liking: boolean
  onLike: (post: CommunityPostItem) => void
  onOpen: (postId: string) => void
}) {
  const [imageFailed, setImageFailed] = useState(false)
  const hasPhoto = Boolean(post.photoUrl) && !imageFailed

  return (
    <Card className="overflow-hidden rounded-[30px] border-border/80">
      <CardContent className="gap-4 px-4 py-4">
        {hasPhoto ? (
          <View className="overflow-hidden rounded-[24px] border border-border bg-background">
            <Image
              source={{ uri: post.photoUrl as string }}
              className="h-44 w-full"
              resizeMode="cover"
              onError={() => setImageFailed(true)}
            />
          </View>
        ) : null}

        <View className="gap-3 rounded-[24px] border border-primary/15 bg-primary/5 p-3.5">
          <View className="flex-row flex-wrap items-center gap-2">
            <View className="rounded-full border border-border bg-background px-2.5 py-1">
              <Text className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
                {post.category}
              </Text>
            </View>
            {post.subjectName ? (
              <View className="rounded-full border border-primary/40 bg-primary/10 px-2.5 py-1">
                <Text className="text-[10px] font-bold uppercase tracking-wide text-primary">
                  {post.subjectName}
                </Text>
              </View>
            ) : null}
            <View className="ml-auto rounded-full bg-card px-2.5 py-1">
              <Text className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
                {post.createdAtLabel}
              </Text>
            </View>
          </View>

          <View className="gap-2">
            <Text className="text-lg font-black leading-7 text-card-foreground">
              {post.title}
            </Text>
            <Text
              className="text-sm leading-6 text-muted-foreground"
              numberOfLines={4}
            >
              {post.content}
            </Text>
          </View>
        </View>

        <View className="flex-row items-center gap-3 rounded-[24px] border border-border bg-background px-3.5 py-3">
          <View className="h-11 w-11 items-center justify-center rounded-full bg-primary/10">
            <Text className="text-xs font-bold uppercase text-primary">
              {post.author.avatarSeed}
            </Text>
          </View>
          <View className="flex-1">
            <Text className="text-sm font-bold text-card-foreground">
              {post.author.name}
            </Text>
            <Text className="text-xs text-muted-foreground">
              {post.author.subtitle}
            </Text>
          </View>
        </View>

        <View className="flex-row gap-2.5">
          <View className="flex-1 gap-1 rounded-[22px] border border-border bg-background px-3 py-3">
            <Text className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
              Comments
            </Text>
            <Text className="text-sm font-black text-card-foreground">
              {post.commentsCount}
            </Text>
          </View>
          <View className="flex-1 gap-1 rounded-[22px] border border-border bg-background px-3 py-3">
            <Text className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
              Replies
            </Text>
            <Text className="text-sm font-black text-card-foreground">
              {post.repliesCount}
            </Text>
          </View>
          <View className="flex-1 gap-1 rounded-[22px] border border-border bg-background px-3 py-3">
            <Text className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
              Likes
            </Text>
            <Text className="text-sm font-black text-card-foreground">
              {post.likesCount}
            </Text>
          </View>
        </View>

        <View className="flex-row gap-3">
          <Button
            variant="outline"
            className="h-11 flex-1"
            onPress={() => onOpen(post.id)}
          >
            <MessageSquare size={16} color="#6b7280" />
            <Text className="text-[10px] font-bold">Open discussion</Text>
          </Button>
          <Button
            variant={post.isLiked ? "default" : "outline"}
            className="h-11 flex-1"
            disabled={liking}
            onPress={() => onLike(post)}
          >
            <Heart size={16} color={post.isLiked ? "#ffffff" : "#6b7280"} />
            <Text
              className={
                post.isLiked
                  ? "text-[10px] font-bold text-primary-foreground"
                  : "text-[10px] font-bold"
              }
            >
              {post.isLiked ? "Liked" : "Like"}
            </Text>
          </Button>
        </View>
      </CardContent>
    </Card>
  )
})

export default function CommunityScreen() {
  const { user } = useAuth()
  const colorScheme = useColorScheme()
  const primaryColor =
    colorScheme === "dark" ? THEME.dark.primary : THEME.light.primary
  const queryClient = useQueryClient()
  const [isComposerOpen, setIsComposerOpen] = useState(false)
  const [activePostId, setActivePostId] = useState<string | null>(null)
  const [selectedCategory, setSelectedCategory] =
    useState<(typeof COMMUNITY_CATEGORIES)[number]>("discussion")
  const [selectedSubjectId, setSelectedSubjectId] = useState<string | null>(
    null
  )
  const [activeFeedFilter, setActiveFeedFilter] =
    useState<(typeof COMMUNITY_FEED_FILTERS)[number]>("all")
  const [titleDraft, setTitleDraft] = useState("")
  const [contentDraft, setContentDraft] = useState("")
  const [photoUrlDraft, setPhotoUrlDraft] = useState("")
  const [commentDraft, setCommentDraft] = useState("")

  const subjectsQuery = useQuery({
    queryKey: ["community-subjects"],
    queryFn: () => listLearningSubjects({ viewerIsPremium: true }),
  })

  const feedQuery = useQuery({
    queryKey: ["community-feed", user?.$id],
    enabled: Boolean(user?.$id),
    queryFn: () => listCommunityFeed(user?.$id),
  })

  const createPostMutation = useMutation({
    mutationFn: createCommunityPost,
    onSuccess: async () => {
      setIsComposerOpen(false)
      setTitleDraft("")
      setContentDraft("")
      setPhotoUrlDraft("")
      await queryClient.invalidateQueries({ queryKey: ["community-feed"] })
    },
  })

  const createCommentMutation = useMutation({
    mutationFn: createCommunityComment,
    onSuccess: async () => {
      setCommentDraft("")
      await queryClient.invalidateQueries({ queryKey: ["community-feed"] })
    },
  })

  const createReplyMutation = useMutation({
    mutationFn: createCommunityReply,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["community-feed"] })
    },
  })

  const likeMutation = useMutation({
    mutationFn: toggleCommunityPostLike,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["community-feed"] })
    },
  })

  const activePost = useMemo(
    () => feedQuery.data?.posts.find((post) => post.id === activePostId),
    [activePostId, feedQuery.data?.posts]
  )

  const filteredPosts = useMemo(() => {
    const posts = feedQuery.data?.posts ?? []

    if (activeFeedFilter === "all") {
      return posts
    }

    return posts.filter((post) => post.category === activeFeedFilter)
  }, [activeFeedFilter, feedQuery.data?.posts])

  const featuredSubjects = useMemo(() => {
    return (subjectsQuery.data ?? []).slice(0, 6)
  }, [subjectsQuery.data])

  const submitPost = useCallback(() => {
    if (!user?.$id) {
      Alert.alert(
        "Sign in required",
        "You need to be signed in to create a post."
      )
      return
    }

    const title = titleDraft.trim()
    const content = contentDraft.trim()

    if (!title || !content) {
      Alert.alert("Incomplete post", "Add a title and content before posting.")
      return
    }

    createPostMutation.mutate({
      userId: user.$id,
      title,
      content,
      category: selectedCategory,
      ...(selectedSubjectId ? { subjectId: selectedSubjectId } : {}),
      ...(photoUrlDraft.trim() ? { photoUrl: photoUrlDraft.trim() } : {}),
    })
  }, [
    contentDraft,
    createPostMutation,
    photoUrlDraft,
    selectedCategory,
    selectedSubjectId,
    titleDraft,
    user?.$id,
  ])

  const submitComment = useCallback(() => {
    if (!user?.$id || !activePost) {
      return
    }

    const content = commentDraft.trim()
    if (!content) {
      return
    }

    createCommentMutation.mutate({
      userId: user.$id,
      postId: activePost.id,
      content,
    })
  }, [activePost, commentDraft, createCommentMutation, user?.$id])

  const submitReply = useCallback(
    (commentId: string, content: string) => {
      if (!user?.$id) {
        return
      }

      createReplyMutation.mutate({
        userId: user.$id,
        commentId,
        content,
      })
    },
    [createReplyMutation, user?.$id]
  )

  const toggleLike = useCallback(
    (post: CommunityPostItem) => {
      if (!user?.$id) {
        return
      }

      likeMutation.mutate({
        userId: user.$id,
        postId: post.id,
        currentlyLiked: post.isLiked,
      })
    },
    [likeMutation, user?.$id]
  )

  const header = useMemo(
    () => (
      <View className="gap-4 pb-4">
        <AppShellHeader
          compact
          eyebrow="Reviewer Community"
          title="Study Threads That Stay Useful"
          subtitle="Focused questions, cleaner replies, and discussions filtered for active review sessions."
        />

        <Card className="overflow-hidden rounded-[30px] border-primary/20 bg-primary/5">
          <CardContent className="gap-4 px-4 py-2">
            <View className="flex-row gap-3">
              <Button
                className="h-11 flex-1"
                onPress={() => setIsComposerOpen(true)}
              >
                <Plus size={15} color="#ffffff" />
                <Text className="text-[10px] font-bold text-primary-foreground">
                  Start a thread
                </Text>
              </Button>
              <Button
                variant="outline"
                className="h-11 flex-1"
                onPress={() => feedQuery.refetch()}
              >
                <Sparkles size={15} color="#6b7280" />
                <Text className="text-[10px] font-bold">Refresh board</Text>
              </Button>
            </View>
          </CardContent>
        </Card>

        <View className="gap-3 rounded-[28px] border border-border bg-card px-4 py-4">
          <View className="flex-row items-center gap-2">
            <Tag size={16} color={primaryColor} />
            <Text className="text-sm font-black text-card-foreground">
              Filter the board
            </Text>
          </View>

          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View className="flex-row gap-2 pr-2">
              {COMMUNITY_FEED_FILTERS.map((filter) => {
                const isActive = activeFeedFilter === filter

                return (
                  <Pressable
                    key={filter}
                    className={
                      isActive
                        ? "rounded-full border border-primary bg-primary px-3 py-2"
                        : "rounded-full border border-border bg-background px-3 py-2"
                    }
                    onPress={() => setActiveFeedFilter(filter)}
                  >
                    <Text
                      className={
                        isActive
                          ? "text-xs font-bold uppercase tracking-wide text-primary-foreground"
                          : "text-xs font-bold uppercase tracking-wide text-muted-foreground"
                      }
                    >
                      {filter}
                    </Text>
                  </Pressable>
                )
              })}
            </View>
          </ScrollView>

          {featuredSubjects.length > 0 ? (
            <View className="gap-2">
              <Text className="text-[11px] font-bold uppercase tracking-[1.2px] text-muted-foreground">
                Popular subject lanes
              </Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View className="flex-row gap-2 pr-2">
                  {featuredSubjects.map((subject) => (
                    <View
                      key={subject.id}
                      className="rounded-full border border-border bg-background px-3 py-2"
                    >
                      <Text className="text-xs font-bold uppercase tracking-wide text-card-foreground">
                        {subject.name}
                      </Text>
                    </View>
                  ))}
                </View>
              </ScrollView>
            </View>
          ) : null}
        </View>
      </View>
    ),
    [activeFeedFilter, featuredSubjects, feedQuery, primaryColor]
  )

  const renderItem = useCallback(
    ({ item }: ListRenderItemInfo<CommunityPostItem>) => (
      <ThreadCard
        post={item}
        liking={likeMutation.isPending}
        onLike={toggleLike}
        onOpen={setActivePostId}
      />
    ),
    [likeMutation.isPending, toggleLike]
  )

  return (
    <SafeAreaView className="flex-1 bg-background">
      {feedQuery.isLoading ? (
        <ScrollView
          contentContainerClassName="gap-4 px-5 pb-8 pt-5"
          contentInsetAdjustmentBehavior="automatic"
        >
          <CommunityLoading />
        </ScrollView>
      ) : feedQuery.error ? (
        <ScrollView
          contentContainerClassName="gap-4 px-5 pb-8 pt-5"
          contentInsetAdjustmentBehavior="automatic"
        >
          {header}
          <Card>
            <CardContent className="gap-2 px-4 py-4">
              <Text className="text-sm font-black text-destructive">
                Community unavailable
              </Text>
              <Text className="text-[13px] leading-5 text-muted-foreground">
                {feedQuery.error instanceof Error
                  ? feedQuery.error.message
                  : "Unable to load community feed from Appwrite."}
              </Text>
            </CardContent>
          </Card>
        </ScrollView>
      ) : (
        <FlashList
          data={filteredPosts}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          ListHeaderComponent={header}
          ListEmptyComponent={
            <Card className="rounded-[28px]">
              <CardContent className="gap-2 px-4 py-5">
                <Text className="text-base font-black text-card-foreground">
                  {activeFeedFilter === "all"
                    ? "No discussions yet"
                    : `No ${activeFeedFilter} posts yet`}
                </Text>
                <Text className="text-[13px] leading-5 text-muted-foreground">
                  {activeFeedFilter === "all"
                    ? "Your community collections are live, but there are no posts yet."
                    : `Nothing in the ${activeFeedFilter} lane matches the current board. Try another filter or start the first thread.`}
                </Text>
              </CardContent>
            </Card>
          }
          contentContainerStyle={{
            paddingHorizontal: 20,
            paddingTop: 20,
            paddingBottom: 32,
          }}
          ItemSeparatorComponent={ThreadSeparator}
          showsVerticalScrollIndicator={false}
          initialNumToRender={4}
        />
      )}

      <Dialog open={isComposerOpen} onOpenChange={setIsComposerOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Start a thread</DialogTitle>
            <DialogDescription>
              Post one clear question, discussion, or study tip so replies stay
              focused and useful.
            </DialogDescription>
          </DialogHeader>

          <View className="gap-3">
            <View className="flex-row flex-wrap gap-2">
              {COMMUNITY_CATEGORIES.map((category) => {
                const isActive = selectedCategory === category

                return (
                  <Pressable
                    key={category}
                    className={
                      isActive
                        ? "rounded-full border border-primary bg-primary px-3 py-2"
                        : "rounded-full border border-border bg-background px-3 py-2"
                    }
                    onPress={() => setSelectedCategory(category)}
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

            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View className="flex-row gap-2">
                <Pressable
                  className={
                    selectedSubjectId === null
                      ? "rounded-full border border-primary bg-primary px-3 py-2"
                      : "rounded-full border border-border bg-background px-3 py-2"
                  }
                  onPress={() => setSelectedSubjectId(null)}
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
                {(subjectsQuery.data ?? []).map((subject) => {
                  const isActive = selectedSubjectId === subject.id

                  return (
                    <Pressable
                      key={subject.id}
                      className={
                        isActive
                          ? "rounded-full border border-primary bg-primary px-3 py-2"
                          : "rounded-full border border-border bg-background px-3 py-2"
                      }
                      onPress={() => setSelectedSubjectId(subject.id)}
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

            <View className="rounded-2xl border border-border bg-background p-3">
              <TextInput
                value={titleDraft}
                onChangeText={setTitleDraft}
                placeholder="Write a precise thread title"
                placeholderTextColor="#8b8b93"
                className="text-base text-foreground"
              />
            </View>

            <View className="rounded-2xl border border-border bg-background p-3">
              <TextInput
                value={photoUrlDraft}
                onChangeText={setPhotoUrlDraft}
                placeholder="Optional photo URL (https://...)"
                placeholderTextColor="#8b8b93"
                className="text-sm text-foreground"
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>

            {photoUrlDraft.trim() ? (
              <View className="overflow-hidden rounded-2xl border border-border bg-background">
                <Image
                  source={{ uri: photoUrlDraft.trim() }}
                  className="h-36 w-full"
                  resizeMode="cover"
                />
              </View>
            ) : null}

            <View className="rounded-2xl border border-border bg-background p-3">
              <TextInput
                value={contentDraft}
                onChangeText={setContentDraft}
                placeholder="Add the details, what you already checked, and the answer or feedback you need"
                placeholderTextColor="#8b8b93"
                className="min-h-[112px] text-sm text-foreground"
                multiline
                textAlignVertical="top"
              />
            </View>

            <DialogFooter className="flex-row justify-end">
              <Button
                className="h-11 px-5"
                disabled={createPostMutation.isPending}
                onPress={submitPost}
              >
                <Send size={14} color="#ffffff" />
                <Text className="font-bold text-primary-foreground">Post</Text>
              </Button>
            </DialogFooter>
          </View>
        </DialogContent>
      </Dialog>

      <Dialog
        open={Boolean(activePost)}
        onOpenChange={(open) => !open && setActivePostId(null)}
      >
        <DialogContent className="p-0">
          {activePost ? (
            <ScrollView
              style={{ maxHeight: 680 }}
              contentContainerStyle={{ padding: 20, gap: 16 }}
              contentInsetAdjustmentBehavior="automatic"
            >
              <DialogHeader>
                <DialogTitle>{activePost.title}</DialogTitle>
                <DialogDescription>
                  {activePost.category} · {activePost.author.name} ·{" "}
                  {activePost.createdAtLabel}
                </DialogDescription>
              </DialogHeader>

              <View className="gap-3 rounded-2xl border border-border bg-background p-4">
                {activePost.photoUrl ? (
                  <View className="overflow-hidden rounded-2xl border border-border bg-card">
                    <Image
                      source={{ uri: activePost.photoUrl }}
                      className="h-44 w-full"
                      resizeMode="cover"
                    />
                  </View>
                ) : null}

                {activePost.subjectName ? (
                  <Text className="text-[11px] font-bold uppercase tracking-[1.2px] text-primary">
                    {activePost.subjectName}
                  </Text>
                ) : null}
                <Text className="text-sm leading-6 text-muted-foreground">
                  {activePost.content}
                </Text>
                <Button
                  variant={activePost.isLiked ? "default" : "outline"}
                  className="h-10 self-start px-4"
                  disabled={likeMutation.isPending}
                  onPress={() => toggleLike(activePost)}
                >
                  <Heart
                    size={14}
                    color={activePost.isLiked ? "#ffffff" : "#6b7280"}
                  />
                  <Text
                    className={
                      activePost.isLiked
                        ? "font-bold text-primary-foreground"
                        : "font-bold"
                    }
                  >
                    {activePost.likesCount}{" "}
                    {activePost.isLiked ? "liked" : "likes"}
                  </Text>
                </Button>
              </View>

              <View className="gap-3">
                {activePost.comments.map((comment) => (
                  <CommentRow
                    key={comment.id}
                    comment={comment}
                    disabled={createReplyMutation.isPending}
                    onSubmitReply={submitReply}
                  />
                ))}
              </View>

              <View className="gap-2 rounded-2xl border border-border bg-background p-3">
                <Text className="text-sm font-bold text-card-foreground">
                  Add a comment
                </Text>
                <TextInput
                  value={commentDraft}
                  onChangeText={setCommentDraft}
                  placeholder="Share a clear answer, tip, or follow-up question"
                  placeholderTextColor="#8b8b93"
                  className="min-h-[88px] text-sm text-foreground"
                  multiline
                  textAlignVertical="top"
                />
                <DialogFooter className="flex-row justify-end">
                  <Button
                    className="h-10 px-4"
                    disabled={createCommentMutation.isPending}
                    onPress={submitComment}
                  >
                    <MessageSquare size={14} color="#ffffff" />
                    <Text className="font-bold text-primary-foreground">
                      Comment
                    </Text>
                  </Button>
                </DialogFooter>
              </View>
            </ScrollView>
          ) : null}
        </DialogContent>
      </Dialog>
    </SafeAreaView>
  )
}
