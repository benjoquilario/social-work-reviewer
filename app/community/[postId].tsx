import { memo, useCallback, useMemo, useState } from "react"
import { useAuth } from "@/contexts/auth-context"
import { useCommunity } from "@/contexts/community-context"
import { Image } from "expo-image"
import { useLocalSearchParams } from "expo-router"
import { Heart, MessageSquare, Send, Share2 } from "lucide-react-native"
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  TextInput,
  View,
} from "react-native"
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context"

import {
  type CommunityCommentItem,
  type CommunityReplyItem,
} from "@/lib/community"
import { getCommunityCategoryColor, THEME, withOpacity } from "@/lib/theme"
import { useColorScheme } from "@/hooks/use-color-scheme"
import { useKeyboardInset } from "@/hooks/use-keyboard-inset"
import { Text } from "@/components/ui/text"
import { ScrollView } from "@/components/ui/virtualized-scroll-view"
import { CommunityAvatar } from "@/components/community/avatar"
import { ScreenHeader } from "@/components/screen-header"

type ThemePalette = (typeof THEME)["light"] | (typeof THEME)["dark"]

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

// ─── Reply Row ────────────────────────────────────────────────────────────────

const ReplyRow = memo(function ReplyRow({
  reply,
  theme,
}: {
  reply: CommunityReplyItem
  theme: ThemePalette
}) {
  return (
    <View className="ml-12 flex-row gap-2.5 py-2">
      <CommunityAvatar
        label={reply.author.avatarSeed}
        sourceUri={reply.author.avatarUrl}
        theme={theme}
        size="sm"
      />
      <View className="flex-1">
        <View
          className="rounded-xl bg-muted/50 px-3 py-2.5"
          style={{ borderWidth: 1, borderColor: theme.border }}
        >
          <Text className="text-sm font-bold text-foreground">
            {reply.author.name}
          </Text>
          <Text className="mt-0.5 text-sm leading-5 text-muted-foreground">
            {reply.content}
          </Text>
        </View>
        <Text className="mt-1 px-3 text-2xs text-muted-foreground">
          {reply.createdAtLabel}
        </Text>
      </View>
    </View>
  )
})

// ─── Comment Row ──────────────────────────────────────────────────────────────

const CommentRow = memo(function CommentRow({
  comment,
  onSubmitReply,
  disabled,
  theme,
}: {
  comment: CommunityCommentItem
  onSubmitReply: (commentId: string, content: string) => void
  disabled: boolean
  theme: ThemePalette
}) {
  const [replyDraft, setReplyDraft] = useState("")
  const [isReplying, setIsReplying] = useState(false)

  const toggleReplying = useCallback(() => {
    setIsReplying((current) => !current)
  }, [])

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
          sourceUri={comment.author.avatarUrl}
          theme={theme}
          size="md"
        />
        <View className="flex-1">
          <View
            className="rounded-xl bg-muted/50 px-3.5 py-3"
            style={{ borderWidth: 1, borderColor: theme.border }}
          >
            <Text className="text-sm font-bold text-foreground">
              {comment.author.name}
            </Text>
            <Text className="mt-0.5 text-sm leading-5 text-foreground">
              {comment.content}
            </Text>
          </View>
          <View className="mt-1 flex-row items-center gap-4 px-3">
            <Text className="text-2xs text-muted-foreground">
              {comment.createdAtLabel}
            </Text>
            <Pressable onPress={toggleReplying} disabled={disabled}>
              <Text className="text-2xs font-bold text-primary">Reply</Text>
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
            className="flex-1 rounded-full bg-muted/60 px-4 py-2.5 text-sm text-foreground"
            style={{ color: theme.foreground }}
            selectionColor={theme.primary}
            returnKeyType="send"
            onSubmitEditing={submitReply}
          />
          <Pressable
            onPress={submitReply}
            disabled={disabled || !replyDraft.trim()}
            className="h-9 w-9 items-center justify-center rounded-full bg-primary"
            style={{ opacity: replyDraft.trim() ? 1 : 0.4 }}
          >
            <Send size={14} color={theme.primaryForeground} />
          </Pressable>
        </View>
      ) : null}
    </View>
  )
})

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function CommunityDiscussionScreen() {
  const insets = useSafeAreaInsets()
  const keyboardInset = useKeyboardInset()
  const colorScheme = useColorScheme()
  const isDark = colorScheme === "dark"
  const theme = isDark ? THEME.dark : THEME.light
  const user = useAuth((s) => s.user)
  const profile = useAuth((s) => s.profile)

  const { postId } = useLocalSearchParams<{ postId: string }>()

  const feed = useCommunity((s) => s.feed)
  const isCreatingComment = useCommunity((s) => s.isCreatingComment)
  const isCreatingReply = useCommunity((s) => s.isCreatingReply)
  const togglingLikePostId = useCommunity((s) => s.togglingLikePostId)
  const toggleLike = useCommunity((s) => s.toggleLike)
  const submitReplyAction = useCommunity((s) => s.submitReply)

  const post = useMemo(
    () => feed?.posts.find((p) => p.id === postId) ?? null,
    [feed?.posts, postId]
  )

  const [commentText, setCommentText] = useState("")

  const currentAvatarSeed = useMemo(
    () => toAvatarSeed(profile?.fullName ?? user?.name ?? "RV"),
    [profile?.fullName, user?.name]
  )
  const currentAvatarUrl = profile?.avatarUrl?.trim() || null

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
      avatarUrl: profile?.avatarUrl?.trim() || null,
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

  const categoryColor = getCommunityCategoryColor(theme, post?.category ?? "")

  if (!post) {
    return (
      <SafeAreaView className="flex-1 bg-background">
        <View className="px-4">
          <ScreenHeader title="Discussion" />
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
      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={Math.max(insets.top, 12)}
      >
        {/* Header */}
        <View className="border-b border-border/50 px-4">
          <ScreenHeader title={`${post.author.name}'s Post`} />
        </View>

        <ScrollView
          automaticallyAdjustKeyboardInsets
          contentContainerClassName="pb-20"
          contentContainerStyle={{
            paddingBottom: Math.max(insets.bottom, 20) + 80,
          }}
          contentInsetAdjustmentBehavior="automatic"
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="interactive"
        >
          {/* Post content */}
          <View className="gap-3 px-4 pt-4">
            <View
              className="gap-3 rounded-xl bg-card px-3.5 py-3.5"
              style={{ borderWidth: 1, borderColor: theme.border }}
            >
              {/* Author row */}
              <View className="flex-row items-center gap-3">
                <CommunityAvatar
                  label={post.author.avatarSeed}
                  sourceUri={post.author.avatarUrl}
                  theme={theme}
                  size="lg"
                />
                <View className="flex-1">
                  <Text className="text-sm font-bold text-foreground">
                    {post.author.name}
                  </Text>
                  <View className="flex-row items-center gap-1.5">
                    <Text className="text-xs text-muted-foreground">
                      {post.createdAtLabel}
                    </Text>
                    <View className="h-1 w-1 rounded-full bg-muted-foreground/40" />
                    <View
                      className="rounded-full px-2 py-0.5"
                      style={{
                        backgroundColor: withOpacity(categoryColor, 0.12),
                      }}
                    >
                      <Text
                        className="text-2xs font-bold uppercase tracking-[1px]"
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
                  <Text className="text-2xs font-bold text-primary">
                    {post.subjectName}
                  </Text>
                </View>
              ) : null}

              {/* Title & content */}
              <Text className="text-lg font-black leading-6 text-foreground">
                {post.title}
              </Text>
              <Text className="text-sm leading-6 text-foreground/80">
                {post.content}
              </Text>

              {/* Photo */}
              {post.photoUrl ? (
                <View
                  className="overflow-hidden rounded-xl"
                  style={{ borderWidth: 1, borderColor: theme.border }}
                >
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
              <View
                className="flex-row items-center justify-between py-2.5"
                style={{
                  borderTopWidth: 1,
                  borderBottomWidth: 1,
                  borderColor: theme.border,
                }}
              >
                <View className="flex-row items-center gap-1.5">
                  <View
                    className="h-5 w-5 items-center justify-center rounded-full"
                    style={{
                      backgroundColor: withOpacity(theme.primary, 0.15),
                    }}
                  >
                    <Heart size={10} color={theme.primary} />
                  </View>
                  <Text className="text-xs text-muted-foreground">
                    {post.likesCount}
                  </Text>
                </View>
                <Text className="text-xs text-muted-foreground">
                  {post.commentsCount} comments · {post.repliesCount} replies
                </Text>
              </View>

              {/* Action buttons */}
              <View className="flex-row pb-1">
                <Pressable
                  className="flex-1 flex-row items-center justify-center gap-2 py-1.5"
                  onPress={handleToggleLike}
                  disabled={togglingLikePostId === post.id}
                >
                  <Heart
                    size={18}
                    color={post.isLiked ? theme.primary : theme.mutedForeground}
                    fill={post.isLiked ? theme.primary : "transparent"}
                  />
                  <Text
                    className="text-sm font-semibold"
                    style={{
                      color: post.isLiked
                        ? theme.primary
                        : theme.mutedForeground,
                    }}
                  >
                    Like
                  </Text>
                </Pressable>
                <Pressable className="flex-1 flex-row items-center justify-center gap-2 py-1.5">
                  <MessageSquare size={18} color={theme.mutedForeground} />
                  <Text className="text-sm font-semibold text-muted-foreground">
                    Comment
                  </Text>
                </Pressable>
                <Pressable className="flex-1 flex-row items-center justify-center gap-2 py-1.5">
                  <Share2 size={18} color={theme.mutedForeground} />
                  <Text className="text-sm font-semibold text-muted-foreground">
                    Share
                  </Text>
                </Pressable>
              </View>
            </View>
          </View>

          {/* Comments section */}
          <View className="px-4 pt-2">
            {post.comments.length === 0 ? (
              <View className="items-center py-8">
                <Text className="text-sm text-muted-foreground">
                  Be the first to comment
                </Text>
              </View>
            ) : (
              post.comments.map((comment: CommunityCommentItem) => (
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
          className="flex-row items-center gap-2 border-t border-border/40 px-4 py-2.5"
          style={{
            backgroundColor: theme.card,
            paddingBottom: Math.max(insets.bottom, 10),
            marginBottom: keyboardInset,
          }}
        >
          <CommunityAvatar
            label={currentAvatarSeed}
            sourceUri={currentAvatarUrl}
            theme={theme}
            size="sm"
          />
          <TextInput
            value={commentText}
            onChangeText={setCommentText}
            placeholder="Write a comment..."
            placeholderTextColor={theme.mutedForeground}
            className="flex-1 rounded-full border bg-muted/50 px-4 py-2.5 text-sm text-foreground"
            style={{ color: theme.foreground, borderColor: theme.border }}
            selectionColor={theme.primary}
            returnKeyType="send"
            onSubmitEditing={() => void handleSubmitComment()}
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
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}
