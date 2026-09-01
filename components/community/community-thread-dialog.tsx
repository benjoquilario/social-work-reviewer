import { memo, useCallback, useState } from "react"
import { Image } from "expo-image"
import CornerDownRight from "lucide-react-native/icons/corner-down-right"
import Heart from "lucide-react-native/icons/heart"
import MessageSquare from "lucide-react-native/icons/message-square"
import Send from "lucide-react-native/icons/send"
import { Pressable, TextInput, View } from "react-native"
import { useSafeAreaInsets } from "react-native-safe-area-context"

import {
  type CommunityCommentItem,
  type CommunityPostItem,
  type CommunityReplyItem,
} from "@/lib/community"
import { THEME, withOpacity } from "@/lib/theme"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { useKeyboardInset } from "@/hooks/use-keyboard-inset"
import { Text } from "@/components/ui/text"
import { ScrollView } from "@/components/ui/virtualized-scroll-view"
import { CommunityAvatar } from "@/components/community/avatar"

type ThemePalette = (typeof THEME)["light"] | (typeof THEME)["dark"]

const ReplyRow = memo(function ReplyRow({
  reply,
  theme,
}: {
  reply: CommunityReplyItem
  theme: ThemePalette
}) {
  return (
    <View className="ml-6 gap-2 rounded-xl border border-border bg-background px-3 py-3">
      <View className="flex-row items-center gap-2.5">
        <CommunityAvatar
          label={reply.author.avatarSeed}
          sourceUri={reply.author.avatarUrl}
          theme={theme}
          size="sm"
        />
        <View className="flex-1">
          <Text className="text-sm font-bold text-card-foreground">
            {reply.author.name}
          </Text>
          <Text className="text-xs text-muted-foreground">
            {reply.author.subtitle} · {reply.createdAtLabel}
          </Text>
        </View>
      </View>
      <Text className="text-sm leading-6 text-muted-foreground">
        {reply.content}
      </Text>
    </View>
  )
})

const CommentRow = memo(function CommentRow({
  comment,
  disabled,
  onSubmitReply,
  theme,
}: {
  comment: CommunityCommentItem
  disabled: boolean
  onSubmitReply: (commentId: string, content: string) => void
  theme: ThemePalette
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
    <View className="gap-3 rounded-2xl border border-border bg-card px-3.5 py-3.5">
      <View className="flex-row items-start gap-3">
        <CommunityAvatar
          label={comment.author.avatarSeed}
          sourceUri={comment.author.avatarUrl}
          theme={theme}
          size="md"
        />
        <View className="flex-1 gap-1.5">
          <Text className="text-sm font-bold text-card-foreground">
            {comment.author.name}
          </Text>
          <Text className="text-xs text-muted-foreground">
            {comment.author.subtitle} · {comment.createdAtLabel}
          </Text>
          <View className="rounded-lg border border-border bg-background px-3.5 py-3">
            <Text className="text-sm leading-6 text-muted-foreground">
              {comment.content}
            </Text>
          </View>
          <Pressable
            className="self-start rounded-full border border-border px-3 py-1.5"
            disabled={disabled}
            onPress={() => setIsReplying((current) => !current)}
            style={{ opacity: disabled ? 0.6 : 1 }}
          >
            <View className="flex-row items-center gap-1.5">
              <CornerDownRight size={14} color={theme.mutedForeground} />
              <Text className="text-xs font-bold uppercase tracking-[1px] text-muted-foreground">
                Reply
              </Text>
            </View>
          </Pressable>
        </View>
      </View>

      {comment.replies.map((reply) => (
        <ReplyRow key={reply.id} reply={reply} theme={theme} />
      ))}

      {isReplying ? (
        <View className="ml-6 gap-2 rounded-xl border border-border bg-background p-3">
          <TextInput
            value={replyDraft}
            onChangeText={setReplyDraft}
            placeholder="Write a focused reply"
            placeholderTextColor={theme.mutedForeground}
            className="min-h-[72px] text-sm text-foreground"
            multiline
            textAlignVertical="top"
            style={{ color: theme.foreground }}
          />
          <View className="flex-row justify-end">
            <Button className="h-10 rounded-md px-4" onPress={submitReply}>
              <Send size={14} color={theme.primaryForeground} />
              <Text className="font-bold text-primary-foreground">Reply</Text>
            </Button>
          </View>
        </View>
      ) : null}
    </View>
  )
})

type CommunityThreadDialogProps = {
  commentDraft: string
  isCommentPending: boolean
  isLikePending: boolean
  isReplyPending: boolean
  onChangeCommentDraft: (value: string) => void
  onOpenChange: (open: boolean) => void
  onSubmitComment: () => void
  onSubmitReply: (commentId: string, content: string) => void
  onToggleLike: (post: CommunityPostItem) => void
  open: boolean
  post: CommunityPostItem | null
  theme: ThemePalette
}

export function CommunityThreadDialog({
  commentDraft,
  isCommentPending,
  isLikePending,
  isReplyPending,
  onChangeCommentDraft,
  onOpenChange,
  onSubmitComment,
  onSubmitReply,
  onToggleLike,
  open,
  post,
  theme,
}: CommunityThreadDialogProps) {
  const insets = useSafeAreaInsets()
  const keyboardInset = useKeyboardInset()

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="p-0">
        {post ? (
          <ScrollView
            style={{ maxHeight: 720 }}
            contentContainerStyle={{
              padding: 20,
              paddingBottom: 20 + Math.max(insets.bottom, 12) + keyboardInset,
              gap: 16,
            }}
            contentInsetAdjustmentBehavior="automatic"
            automaticallyAdjustKeyboardInsets
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="interactive"
          >
            <DialogHeader>
              <DialogTitle>{post.title}</DialogTitle>
              <DialogDescription>
                {post.category} · {post.author.name} · {post.createdAtLabel}
              </DialogDescription>
            </DialogHeader>

            <View className="gap-4 rounded-2xl border border-border bg-background p-4">
              <View className="flex-row items-start gap-3">
                <CommunityAvatar
                  label={post.author.avatarSeed}
                  sourceUri={post.author.avatarUrl}
                  theme={theme}
                  size="lg"
                />
                <View className="flex-1 gap-1.5">
                  <Text className="text-sm font-black text-card-foreground">
                    {post.author.name}
                  </Text>
                  <Text className="text-xs text-muted-foreground">
                    {post.author.subtitle}
                  </Text>
                  {post.subjectName ? (
                    <View className="self-start rounded-full border border-border px-3 py-1.5">
                      <Text variant="eyebrow">
                        {post.subjectName}
                      </Text>
                    </View>
                  ) : null}
                </View>
              </View>

              {post.photoUrl ? (
                <View className="overflow-hidden rounded-xl border border-border bg-card">
                  <Image
                    source={{ uri: post.photoUrl }}
                    style={{
                      width: "100%",
                      height: 200,
                      backgroundColor: withOpacity(theme.muted, 0.6),
                    }}
                    contentFit="cover"
                    transition={120}
                  />
                </View>
              ) : null}

              <Text className="text-sm leading-6 text-muted-foreground">
                {post.content}
              </Text>

              <View className="flex-row items-center justify-between rounded-xl border border-border bg-card px-3.5 py-3">
                <Text className="text-xs text-muted-foreground">
                  {post.commentsCount} comments · {post.repliesCount} replies
                </Text>
                <Button
                  variant={post.isLiked ? "default" : "outline"}
                  className="h-10 rounded-md px-4"
                  disabled={isLikePending}
                  onPress={() => onToggleLike(post)}
                >
                  <Heart
                    size={14}
                    color={
                      post.isLiked ? theme.primaryForeground : theme.primary
                    }
                  />
                  <Text
                    className={
                      post.isLiked
                        ? "font-bold text-primary-foreground"
                        : "font-bold"
                    }
                  >
                    {post.likesCount} {post.isLiked ? "liked" : "likes"}
                  </Text>
                </Button>
              </View>
            </View>

            <View className="gap-3">
              {post.comments.length > 0 ? (
                post.comments.map((comment) => (
                  <CommentRow
                    key={comment.id}
                    comment={comment}
                    disabled={isReplyPending}
                    onSubmitReply={onSubmitReply}
                    theme={theme}
                  />
                ))
              ) : (
                <View className="rounded-xl border border-border bg-card px-4 py-4">
                  <Text className="text-sm font-black text-card-foreground">
                    No comments yet
                  </Text>
                  <Text className="mt-1 text-sm leading-6 text-muted-foreground">
                    Start the discussion with a clear answer, follow-up, or
                    study tip.
                  </Text>
                </View>
              )}
            </View>

            <View className="gap-2 rounded-xl border border-border bg-background p-3.5">
              <Text className="text-sm font-bold text-card-foreground">
                Add a comment
              </Text>
              <TextInput
                value={commentDraft}
                onChangeText={onChangeCommentDraft}
                placeholder="Share a useful answer, correction, or follow-up question"
                placeholderTextColor={theme.mutedForeground}
                className="min-h-[88px] text-sm text-foreground"
                multiline
                textAlignVertical="top"
                style={{ color: theme.foreground }}
              />
              <DialogFooter className="mt-0 flex-row justify-end">
                <Button
                  className="h-10 rounded-md px-4"
                  disabled={isCommentPending}
                  onPress={onSubmitComment}
                >
                  <MessageSquare size={14} color={theme.primaryForeground} />
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
  )
}
