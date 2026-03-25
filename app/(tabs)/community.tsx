import { memo, useCallback, useMemo, useState } from "react"
import { useAuth } from "@/contexts/auth-context"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import {
  CornerDownRight,
  Heart,
  MessageSquare,
  Plus,
  Send,
  ShieldCheck,
  Sparkles,
  Users,
} from "lucide-react-native"
import {
  Alert,
  FlatList,
  Pressable,
  ScrollView,
  TextInput,
  View,
  type ListRenderItemInfo,
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

const CommunityLoading = memo(function CommunityLoading() {
  return (
    <View className="gap-4">
      <Skeleton className="h-48 rounded-[26px]" />
      <View className="flex-row gap-3">
        <Skeleton className="h-24 flex-1 rounded-2xl" />
        <Skeleton className="h-24 flex-1 rounded-2xl" />
        <Skeleton className="h-24 flex-1 rounded-2xl" />
      </View>
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
    <View className="gap-3 rounded-2xl border border-border bg-card px-3 py-3">
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
  return (
    <Card>
      <CardContent className="gap-4 px-4 py-4">
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

        <View className="flex-row items-center gap-3">
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
              {post.author.subtitle} · {post.createdAtLabel}
            </Text>
          </View>
        </View>

        <View className="flex-row gap-3 rounded-2xl border border-border bg-background px-3 py-3">
          <View className="flex-1 gap-1">
            <Text className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
              Comments
            </Text>
            <Text className="text-base font-black text-card-foreground">
              {post.commentsCount}
            </Text>
          </View>
          <View className="h-full w-px bg-border" />
          <View className="flex-1 gap-1">
            <Text className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
              Replies
            </Text>
            <Text className="text-base font-black text-card-foreground">
              {post.repliesCount}
            </Text>
          </View>
          <View className="h-full w-px bg-border" />
          <View className="flex-1 gap-1">
            <Text className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
              Likes
            </Text>
            <Text className="text-base font-black text-card-foreground">
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
            <Text className="font-bold">Open discussion</Text>
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
                post.isLiked ? "font-bold text-primary-foreground" : "font-bold"
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
  const [titleDraft, setTitleDraft] = useState("")
  const [contentDraft, setContentDraft] = useState("")
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
    })
  }, [
    contentDraft,
    createPostMutation,
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
          title="Ask Better Questions"
          subtitle="Appwrite-backed discussions, replies, and likes with cached loading and lightweight refreshes."
          stats={[
            {
              label: "Learners",
              value: String(feedQuery.data?.stats.activeLearners ?? 0),
            },
            {
              label: "Open",
              value: String(feedQuery.data?.stats.openTopics ?? 0),
            },
            {
              label: "Answered",
              value: String(feedQuery.data?.stats.answeredToday ?? 0),
            },
          ]}
        />

        <View className="flex-row gap-3">
          <Card className="flex-1">
            <CardContent className="gap-2 px-4 py-4">
              <Users size={16} color={primaryColor} />
              <Text className="text-xs font-bold uppercase tracking-wide text-primary">
                Active Learners
              </Text>
              <Text className="text-lg font-black text-card-foreground">
                {feedQuery.data?.stats.activeLearners ?? 0}
              </Text>
            </CardContent>
          </Card>
          <Card className="flex-1">
            <CardContent className="gap-2 px-4 py-4">
              <MessageSquare size={16} color={primaryColor} />
              <Text className="text-xs font-bold uppercase tracking-wide text-primary">
                Open Topics
              </Text>
              <Text className="text-lg font-black text-card-foreground">
                {feedQuery.data?.stats.openTopics ?? 0}
              </Text>
            </CardContent>
          </Card>
          <Card className="flex-1">
            <CardContent className="gap-2 px-4 py-4">
              <ShieldCheck size={16} color={primaryColor} />
              <Text className="text-xs font-bold uppercase tracking-wide text-primary">
                Answered
              </Text>
              <Text className="text-lg font-black text-card-foreground">
                {feedQuery.data?.stats.answeredToday ?? 0}
              </Text>
            </CardContent>
          </Card>
        </View>

        <View className="flex-row gap-3">
          <Button
            className="h-11 flex-1"
            onPress={() => setIsComposerOpen(true)}
          >
            <Plus size={16} color="#ffffff" />
            <Text className="font-bold text-primary-foreground">
              Write discussion
            </Text>
          </Button>
          <Button
            variant="outline"
            className="h-11 flex-1"
            onPress={() => feedQuery.refetch()}
          >
            <Sparkles size={16} color="#6b7280" />
            <Text className="font-bold">Refresh feed</Text>
          </Button>
        </View>
      </View>
    ),
    [feedQuery, primaryColor]
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
        <ScrollView contentContainerClassName="gap-4 px-5 pb-8 pt-5">
          <CommunityLoading />
        </ScrollView>
      ) : feedQuery.error ? (
        <ScrollView contentContainerClassName="gap-4 px-5 pb-8 pt-5">
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
        <FlatList
          data={feedQuery.data?.posts ?? []}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          ListHeaderComponent={header}
          ListEmptyComponent={
            <Card>
              <CardContent className="gap-2 px-4 py-4">
                <Text className="text-sm font-black text-card-foreground">
                  No discussions yet
                </Text>
                <Text className="text-[13px] leading-5 text-muted-foreground">
                  Your Appwrite community collections are live, but there are no
                  posts yet.
                </Text>
              </CardContent>
            </Card>
          }
          contentContainerClassName="gap-4 px-5 pb-8 pt-5"
          ItemSeparatorComponent={() => <View className="h-4" />}
          showsVerticalScrollIndicator={false}
          initialNumToRender={4}
          maxToRenderPerBatch={4}
          windowSize={5}
          removeClippedSubviews
        />
      )}

      <Dialog open={isComposerOpen} onOpenChange={setIsComposerOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Write a discussion</DialogTitle>
            <DialogDescription>
              Create a lightweight Appwrite-backed post. Keep one focused
              question per thread.
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
                placeholder="Title your question clearly"
                placeholderTextColor="#8b8b93"
                className="text-base text-foreground"
              />
            </View>

            <View className="rounded-2xl border border-border bg-background p-3">
              <TextInput
                value={contentDraft}
                onChangeText={setContentDraft}
                placeholder="Explain the issue, what you already know, and what answer you need"
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
            >
              <DialogHeader>
                <DialogTitle>{activePost.title}</DialogTitle>
                <DialogDescription>
                  {activePost.category} · {activePost.author.name} ·{" "}
                  {activePost.createdAtLabel}
                </DialogDescription>
              </DialogHeader>

              <View className="gap-3 rounded-2xl border border-border bg-background p-4">
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
