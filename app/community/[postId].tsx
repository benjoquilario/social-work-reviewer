import { useCallback, useState } from "react"
import { useAuth } from "@/contexts/auth-context"
import { useCommunity } from "@/contexts/community-context"
import { Image } from "expo-image"
import { useLocalSearchParams, useRouter } from "expo-router"
import {
  ArrowLeft,
  Heart,
  MessageSquare,
  Send,
  Share2,
} from "lucide-react-native"
import { Pressable, TextInput, View } from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"

import {
  type CommunityCommentItem,
  type CommunityReplyItem,
} from "@/lib/community"
import { THEME, withOpacity } from "@/lib/theme"
import { useColorScheme } from "@/hooks/use-color-scheme"
import { Text } from "@/components/ui/text"
import { ScrollView } from "@/components/ui/virtualized-scroll-view"
import { CommunityAvatar } from "@/components/community/avatar"

// ─── Helpers ──────────────────────────────────────────────────────────────────

function toAvatarSeed(name: string) {
  return (
    name
      .split(/\s+/)
      .map((p) => p[0])
      .filter(Boolean)
      .join("")
      .toUpperCase()
      .slice(0, 2) || "RV"
  )
}

const CATEGORY_COLORS: Record<string, string> = {
  question: "hsl(199 89% 48%)",
  discussion: "hsl(151 55% 41%)",
  tip: "hsl(18 94% 62%)",
}

// ─── Reply Row ────────────────────────────────────────────────────────────────

function ReplyRow({
  reply,
  theme,
}: {
  reply: CommunityReplyItem
  theme: (typeof THEME)["light"] | (typeof THEME)["dark"]
}) {
  return (
    <View className="ml-12 flex-row gap-2.5 py-2">
      <CommunityAvatar
        label={reply.author.avatarSeed}
        theme={theme}
        size="sm"
      />
      <View className="flex-1">
        <View className="rounded-2xl bg-muted/50 px-3 py-2.5">
          <Text className="text-[13px] font-bold text-foreground">
            {reply.author.name}
          </Text>
          <Text className="mt-0.5 text-[13px] leading-5 text-muted-foreground">
            {reply.content}
          </Text>
        </View>
        <Text className="mt-1 px-3 text-[11px] text-muted-foreground">
          {reply.createdAtLabel}
        </Text>
      </View>
    </View>
  )
}

// ─── Comment Row ──────────────────────────────────────────────────────────────

function CommentRow({
  comment,
  onSubmitReply,
  disabled,
  theme,
}: {
  comment: CommunityCommentItem
  onSubmitReply: (commentId: string, content: string) => void
  disabled: boolean
  theme: (typeof THEME)["light"] | (typeof THEME)["dark"]
}) {
  const [replyDraft, setReplyDraft] = useState("")
  const [isReplying, setIsReplying] = useState(false)

  const submitReply = useCallback(() => {
    const trimmed = replyDraft.trim()
    if (!trimmed) return
    onSubmitReply(comment.id, trimmed)
    setReplyDraft("")
    setIsReplying(false)
  }, [comment.id, onSubmitReply, replyDraft])

  return (
    <View>
      <View className="flex-row gap-2.5 py-2">
        <CommunityAvatar
          label={comment.author.avatarSeed}
          theme={theme}
          size="md"
        />
        <View className="flex-1">
          <View className="rounded-2xl bg-muted/50 px-3.5 py-3">
            <Text className="text-[13px] font-bold text-foreground">
              {comment.author.name}
            </Text>
            <Text className="mt-0.5 text-[14px] leading-5 text-foreground">
              {comment.content}
            </Text>
          </View>
          <View className="mt-1 flex-row items-center gap-4 px-3">
            <Text className="text-[11px] text-muted-foreground">
              {comment.createdAtLabel}
            </Text>
            <Pressable
              onPress={() => setIsReplying((c) => !c)}
              disabled={disabled}
            >
              <Text className="text-[11px] font-bold text-primary">Reply</Text>
            </Pressable>
          </View>
        </View>
      </View>

      {comment.replies.map((reply) => (
        <ReplyRow key={reply.id} reply={reply} theme={theme} />
      ))}

      {isReplying ? (
        <View className="ml-12 flex-row items-center gap-2 py-2">
          <TextInput
            value={replyDraft}
            onChangeText={setReplyDraft}
            placeholder="Write a reply..."
            placeholderTextColor={theme.mutedForeground}
            className="flex-1 rounded-full bg-muted/60 px-4 py-2.5 text-[13px] text-foreground"
            style={{ color: theme.foreground }}
          />
          <Pressable
            onPress={submitReply}
            className="h-9 w-9 items-center justify-center rounded-full bg-primary"
          >
            <Send size={14} color={theme.primaryForeground} />
          </Pressable>
        </View>
      ) : null}
    </View>
  )
}

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function CommunityDiscussionScreen() {
  const router = useRouter()
  const colorScheme = useColorScheme()
  const isDark = colorScheme === "dark"
  const theme = isDark ? THEME.dark : THEME.light
  const user = useAuth((s) => s.user)
  const profile = useAuth((s) => s.profile)

  const { postId } = useLocalSearchParams<{ postId: string }>()

  const feed = useCommunity((s) => s.feed)
  const isCreatingComment = useCommunity((s) => s.isCreatingComment)
  const isCreatingReply = useCommunity((s) => s.isCreatingReply)
  const isTogglingLike = useCommunity((s) => s.isTogglingLike)
  const toggleLike = useCommunity((s) => s.toggleLike)
  const submitReplyAction = useCommunity((s) => s.submitReply)

  const post = feed?.posts.find((p) => p.id === postId) ?? null

  const [commentText, setCommentText] = useState("")

  const currentAuthor = useCallback(() => {
    if (!user) return null
    const name = profile?.fullName ?? user.name ?? "Reviewer"
    return {
      id: user.$id,
      name,
      subtitle:
        profile?.reviewType ??
        profile?.email ??
        user.email ??
        "Community member",
      avatarSeed: toAvatarSeed(name),
    }
  }, [profile, user])

  const handleSubmitComment = useCallback(async () => {
    if (!user?.$id || !post || !commentText.trim()) return
    const author = currentAuthor()
    if (!author) return

    // Use store mutation
    const store = useCommunity.getState()
    store.setActivePostId(post.id)
    store.setCommentDraft(commentText.trim())
    await store.submitComment(user.$id, author)
    setCommentText("")
  }, [commentText, currentAuthor, post, user?.$id])

  const handleSubmitReply = useCallback(
    (commentId: string, content: string) => {
      if (!user?.$id) return
      const author = currentAuthor()
      if (!author) return
      void submitReplyAction(user.$id, commentId, content, author)
    },
    [currentAuthor, submitReplyAction, user?.$id]
  )

  const handleToggleLike = useCallback(() => {
    if (!user?.$id || !post) return
    void toggleLike(user.$id, post)
  }, [post, toggleLike, user?.$id])

  const categoryColor = CATEGORY_COLORS[post?.category ?? ""] ?? theme.primary

  if (!post) {
    return (
      <SafeAreaView className="flex-1 bg-background">
        <View className="flex-row items-center gap-3 px-4 pb-3 pt-2">
          <Pressable
            onPress={() => router.back()}
            className="h-10 w-10 items-center justify-center rounded-full bg-muted/60"
          >
            <ArrowLeft size={20} color={theme.foreground} />
          </Pressable>
          <Text className="text-base font-bold text-foreground">
            Discussion
          </Text>
        </View>
        <View className="flex-1 items-center justify-center px-8">
          <Text className="text-center text-muted-foreground">
            This discussion is no longer available.
          </Text>
        </View>
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView className="flex-1 bg-background">
      {/* Header */}
      <View className="flex-row items-center gap-3 border-b border-border/50 px-4 pb-3 pt-2">
        <Pressable
          onPress={() => router.back()}
          className="h-10 w-10 items-center justify-center rounded-full bg-muted/60"
        >
          <ArrowLeft size={20} color={theme.foreground} />
        </Pressable>
        <View className="flex-1">
          <Text className="text-[15px] font-bold text-foreground">
            {post.author.name}&apos;s Post
          </Text>
          <Text className="text-[11px] text-muted-foreground">
            {post.category} · {post.createdAtLabel}
          </Text>
        </View>
      </View>

      <ScrollView
        contentContainerClassName="pb-28"
        contentInsetAdjustmentBehavior="automatic"
        showsVerticalScrollIndicator={false}
      >
        {/* Post content */}
        <View className="gap-3 px-4 pt-4">
          {/* Author row */}
          <View className="flex-row items-center gap-3">
            <CommunityAvatar
              label={post.author.avatarSeed}
              theme={theme}
              size="lg"
            />
            <View className="flex-1">
              <Text className="text-[15px] font-bold text-foreground">
                {post.author.name}
              </Text>
              <View className="flex-row items-center gap-1.5">
                <Text className="text-[12px] text-muted-foreground">
                  {post.createdAtLabel}
                </Text>
                <View className="h-1 w-1 rounded-full bg-muted-foreground/40" />
                <View
                  className="rounded-full px-2 py-0.5"
                  style={{ backgroundColor: withOpacity(categoryColor, 0.12) }}
                >
                  <Text
                    className="text-[10px] font-bold uppercase"
                    style={{ color: categoryColor }}
                  >
                    {post.category}
                  </Text>
                </View>
              </View>
            </View>
          </View>

          {/* Subject tag */}
          {post.subjectName ? (
            <View
              className="self-start rounded-full px-3 py-1"
              style={{ backgroundColor: withOpacity(theme.primary, 0.08) }}
            >
              <Text className="text-[11px] font-bold text-primary">
                {post.subjectName}
              </Text>
            </View>
          ) : null}

          {/* Title & content */}
          <Text className="text-[18px] font-black leading-6 text-foreground">
            {post.title}
          </Text>
          <Text className="text-[14px] leading-6 text-foreground/80">
            {post.content}
          </Text>

          {/* Photo */}
          {post.photoUrl ? (
            <View className="overflow-hidden rounded-2xl">
              <Image
                source={{ uri: post.photoUrl }}
                style={{
                  width: "100%",
                  aspectRatio: 1.5,
                  backgroundColor: withOpacity(theme.muted, 0.6),
                }}
                contentFit="cover"
                transition={120}
              />
            </View>
          ) : null}

          {/* Engagement stats */}
          <View className="flex-row items-center justify-between border-b border-t border-border/40 py-2.5">
            <View className="flex-row items-center gap-1.5">
              <View
                className="h-5 w-5 items-center justify-center rounded-full"
                style={{ backgroundColor: withOpacity(theme.primary, 0.15) }}
              >
                <Heart size={10} color={theme.primary} />
              </View>
              <Text className="text-[12px] text-muted-foreground">
                {post.likesCount}
              </Text>
            </View>
            <Text className="text-[12px] text-muted-foreground">
              {post.commentsCount} comments · {post.repliesCount} replies
            </Text>
          </View>

          {/* Action buttons */}
          <View className="flex-row border-b border-border/40 pb-3">
            <Pressable
              className="flex-1 flex-row items-center justify-center gap-2 py-1.5"
              onPress={handleToggleLike}
              disabled={isTogglingLike}
            >
              <Heart
                size={18}
                color={post.isLiked ? theme.primary : theme.mutedForeground}
                fill={post.isLiked ? theme.primary : "transparent"}
              />
              <Text
                className="text-[13px] font-semibold"
                style={{
                  color: post.isLiked ? theme.primary : theme.mutedForeground,
                }}
              >
                Like
              </Text>
            </Pressable>
            <Pressable className="flex-1 flex-row items-center justify-center gap-2 py-1.5">
              <MessageSquare size={18} color={theme.mutedForeground} />
              <Text className="text-[13px] font-semibold text-muted-foreground">
                Comment
              </Text>
            </Pressable>
            <Pressable className="flex-1 flex-row items-center justify-center gap-2 py-1.5">
              <Share2 size={18} color={theme.mutedForeground} />
              <Text className="text-[13px] font-semibold text-muted-foreground">
                Share
              </Text>
            </Pressable>
          </View>
        </View>

        {/* Comments section */}
        <View className="px-4 pt-2">
          {post.comments.length === 0 ? (
            <View className="items-center py-8">
              <Text className="text-[13px] text-muted-foreground">
                Be the first to comment
              </Text>
            </View>
          ) : (
            post.comments.map((comment) => (
              <CommentRow
                key={comment.id}
                comment={comment}
                onSubmitReply={handleSubmitReply}
                disabled={isCreatingReply}
                theme={theme}
              />
            ))
          )}
        </View>
      </ScrollView>

      {/* Bottom comment input */}
      <View
        className="flex-row items-center gap-2 border-t border-border/40 px-4 py-3"
        style={{ backgroundColor: theme.card }}
      >
        <CommunityAvatar
          label={toAvatarSeed(profile?.fullName ?? user?.name ?? "RV")}
          theme={theme}
          size="sm"
        />
        <TextInput
          value={commentText}
          onChangeText={setCommentText}
          placeholder="Write a comment..."
          placeholderTextColor={theme.mutedForeground}
          className="flex-1 rounded-full bg-muted/50 px-4 py-2.5 text-[13px] text-foreground"
          style={{ color: theme.foreground }}
        />
        <Pressable
          onPress={() => void handleSubmitComment()}
          disabled={isCreatingComment || !commentText.trim()}
          className="h-9 w-9 items-center justify-center rounded-full bg-primary"
          style={{ opacity: commentText.trim() ? 1 : 0.4 }}
        >
          <Send size={14} color={theme.primaryForeground} />
        </Pressable>
      </View>
    </SafeAreaView>
  )
}
