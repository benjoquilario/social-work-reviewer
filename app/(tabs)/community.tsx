import React, { memo, useCallback, useMemo, useState } from "react"
import {
  COMMUNITY_CURRENT_USER,
  COMMUNITY_GUIDELINES,
  COMMUNITY_STATS,
  COMMUNITY_THREADS,
  COMMUNITY_TOPICS,
  type CommunityComment,
  type CommunityReply,
  type CommunityThread,
} from "@/data/community-data"
import {
  BookOpenText,
  CornerDownRight,
  Eye,
  MessageSquare,
  MessagesSquare,
  Pin,
  Plus,
  Send,
  ShieldCheck,
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

function createId(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

const COMMENT_PREVIEW_LIMIT = 2
const REPLY_PREVIEW_LIMIT = 2

const GuideItem = memo(function GuideItem({ rule }: { rule: string }) {
  return (
    <View className="flex-row items-start gap-2">
      <View className="mt-1 h-2 w-2 rounded-full bg-primary" />
      <Text className="flex-1 text-sm leading-6 text-muted-foreground">
        {rule}
      </Text>
    </View>
  )
})

const ReplyRow = memo(function ReplyRow({ reply }: { reply: CommunityReply }) {
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
            {reply.createdAtLabel}
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
  onAddReply,
  compact = false,
}: {
  comment: CommunityComment
  onAddReply: (commentId: string, content: string) => void
  compact?: boolean
}) {
  const [replyDraft, setReplyDraft] = useState("")
  const [isReplying, setIsReplying] = useState(false)
  const [showAllReplies, setShowAllReplies] = useState(false)

  const visibleReplies =
    compact && !showAllReplies
      ? comment.replies.slice(0, REPLY_PREVIEW_LIMIT)
      : comment.replies

  const submitReply = useCallback(() => {
    const trimmed = replyDraft.trim()

    if (!trimmed) {
      return
    }

    onAddReply(comment.id, trimmed)
    setReplyDraft("")
    setIsReplying(false)
  }, [comment.id, onAddReply, replyDraft])

  return (
    <View className="gap-3 rounded-2xl border border-border bg-card px-3 py-3">
      <View className="flex-row items-start gap-3">
        <View className="h-10 w-10 items-center justify-center rounded-full bg-primary/10">
          <Text className="text-xs font-bold uppercase text-primary">
            {comment.author.avatarSeed}
          </Text>
        </View>
        <View className="flex-1 gap-1">
          <View className="flex-row items-center justify-between gap-2">
            <View className="flex-1">
              <Text className="text-sm font-bold text-card-foreground">
                {comment.author.name}
              </Text>
              <Text className="text-xs text-muted-foreground">
                {comment.author.role}
              </Text>
            </View>
            <Text className="text-xs text-muted-foreground">
              {comment.createdAtLabel}
            </Text>
          </View>

          <Text className="text-sm leading-6 text-muted-foreground">
            {comment.content}
          </Text>

          {!compact ? (
            <Pressable
              className="self-start rounded-full border border-border px-3 py-1.5"
              onPress={() => setIsReplying((current) => !current)}
            >
              <View className="flex-row items-center gap-1">
                <CornerDownRight size={14} color="#6b7280" />
                <Text className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
                  Reply
                </Text>
              </View>
            </Pressable>
          ) : null}
        </View>
      </View>

      {visibleReplies.map((reply) => (
        <ReplyRow key={reply.id} reply={reply} />
      ))}

      {compact && comment.replies.length > REPLY_PREVIEW_LIMIT ? (
        <Pressable
          className="ml-6 self-start rounded-full border border-border px-3 py-1.5"
          onPress={() => setShowAllReplies((current) => !current)}
        >
          <Text className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
            {showAllReplies
              ? "Show fewer replies"
              : `View all ${comment.replies.length} replies`}
          </Text>
        </Pressable>
      ) : null}

      {isReplying && !compact ? (
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
  thread,
  onOpenThread,
}: {
  thread: CommunityThread
  onOpenThread: (threadId: string) => void
}) {
  const totalReplies = useMemo(
    () =>
      thread.comments.reduce(
        (count, comment) => count + comment.replies.length,
        0
      ),
    [thread.comments]
  )

  const previewComments = useMemo(
    () => thread.comments.slice(0, COMMENT_PREVIEW_LIMIT),
    [thread.comments]
  )

  return (
    <Card>
      <CardContent className="gap-4 px-4 py-4">
        <View className="flex-row items-start justify-between gap-3">
          <View className="flex-1 gap-2">
            <View className="flex-row flex-wrap items-center gap-2">
              {thread.isPinned ? (
                <View className="flex-row items-center gap-1 rounded-full border border-primary/40 bg-primary/10 px-2.5 py-1">
                  <Pin size={12} color="#111827" />
                  <Text className="text-[10px] font-bold uppercase tracking-wide text-primary">
                    Pinned
                  </Text>
                </View>
              ) : null}
              <View className="rounded-full border border-border bg-background px-2.5 py-1">
                <Text className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
                  {thread.topic}
                </Text>
              </View>
              <View
                className={
                  thread.status === "Answered"
                    ? "border-chart2/40 bg-chart2/10 rounded-full border px-2.5 py-1"
                    : "rounded-full border border-border bg-background px-2.5 py-1"
                }
              >
                <Text className="text-[10px] font-bold uppercase tracking-wide text-card-foreground">
                  {thread.status}
                </Text>
              </View>
            </View>

            <Text className="text-lg font-black leading-7 text-card-foreground">
              {thread.title}
            </Text>
            <Text className="text-sm leading-6 text-muted-foreground">
              {thread.content}
            </Text>
          </View>
        </View>

        <View className="flex-row items-center gap-3">
          <View className="h-11 w-11 items-center justify-center rounded-full bg-primary/10">
            <Text className="text-xs font-bold uppercase text-primary">
              {thread.author.avatarSeed}
            </Text>
          </View>
          <View className="flex-1">
            <Text className="text-sm font-bold text-card-foreground">
              {thread.author.name}
            </Text>
            <Text className="text-xs text-muted-foreground">
              {thread.author.role} · {thread.createdAtLabel}
            </Text>
          </View>
        </View>

        <View className="flex-row gap-3 rounded-2xl border border-border bg-background px-3 py-3">
          <View className="flex-1 gap-1">
            <Text className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
              Comments
            </Text>
            <Text className="text-base font-black text-card-foreground">
              {thread.comments.length}
            </Text>
          </View>
          <View className="h-full w-px bg-border" />
          <View className="flex-1 gap-1">
            <Text className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
              Replies
            </Text>
            <Text className="text-base font-black text-card-foreground">
              {totalReplies}
            </Text>
          </View>
        </View>

        <View className="gap-3">
          {previewComments.map((comment) => (
            <CommentRow
              key={comment.id}
              comment={comment}
              onAddReply={() => undefined}
              compact
            />
          ))}
        </View>

        <Button
          variant="outline"
          className="h-11"
          onPress={() => onOpenThread(thread.id)}
        >
          <Eye size={16} color="#6b7280" />
          <Text className="font-bold">Open discussion</Text>
        </Button>
      </CardContent>
    </Card>
  )
})

const CommunityComposer = memo(function CommunityComposer({
  onCreateThread,
  onClose,
}: {
  onCreateThread: (payload: {
    topic: string
    title: string
    content: string
  }) => void
  onClose: () => void
}) {
  const [selectedTopic, setSelectedTopic] = useState<
    (typeof COMMUNITY_TOPICS)[number]
  >(COMMUNITY_TOPICS[0])
  const [title, setTitle] = useState("")
  const [content, setContent] = useState("")

  const submitThread = useCallback(() => {
    const trimmedTitle = title.trim()
    const trimmedContent = content.trim()

    if (!trimmedTitle || !trimmedContent) {
      Alert.alert(
        "Incomplete post",
        "Add a title and a question before posting."
      )
      return
    }

    onCreateThread({
      topic: selectedTopic,
      title: trimmedTitle,
      content: trimmedContent,
    })

    setTitle("")
    setContent("")
    onClose()
  }, [content, onClose, onCreateThread, selectedTopic, title])

  return (
    <View className="gap-3">
      <View className="flex-row items-center justify-between gap-3">
        <View>
          <Text className="text-base font-black text-card-foreground">
            Start a discussion
          </Text>
          <Text className="text-sm leading-6 text-muted-foreground">
            Post one focused question so peers can answer precisely.
          </Text>
        </View>
        <View className="rounded-full border border-primary/40 bg-primary/10 px-3 py-1.5">
          <Text className="text-[10px] font-bold uppercase tracking-wide text-primary">
            Demo Account
          </Text>
        </View>
      </View>

      <View className="flex-row flex-wrap gap-2">
        {COMMUNITY_TOPICS.map((topic) => {
          const isActive = selectedTopic === topic

          return (
            <Pressable
              key={topic}
              className={
                isActive
                  ? "rounded-full border border-primary bg-primary px-3 py-2"
                  : "rounded-full border border-border bg-background px-3 py-2"
              }
              onPress={() => setSelectedTopic(topic)}
            >
              <Text
                className={
                  isActive
                    ? "text-xs font-bold uppercase tracking-wide text-primary-foreground"
                    : "text-xs font-bold uppercase tracking-wide text-muted-foreground"
                }
              >
                {topic}
              </Text>
            </Pressable>
          )
        })}
      </View>

      <View className="gap-2 rounded-2xl border border-border bg-background p-3">
        <TextInput
          value={title}
          onChangeText={setTitle}
          placeholder="Title your question clearly"
          placeholderTextColor="#8b8b93"
          className="text-base text-foreground"
        />
      </View>

      <View className="gap-2 rounded-2xl border border-border bg-background p-3">
        <TextInput
          value={content}
          onChangeText={setContent}
          placeholder="Explain what you already know, what choice confuses you, and what kind of help you need"
          placeholderTextColor="#8b8b93"
          className="min-h-[112px] text-sm text-foreground"
          multiline
          textAlignVertical="top"
        />
      </View>

      <View className="flex-row items-center justify-between gap-3">
        <Text className="flex-1 text-xs leading-5 text-muted-foreground">
          Your post is local-only for now. This UI is ready to connect to a
          backend API later.
        </Text>
        <Button className="h-11 px-5" onPress={submitThread}>
          <Send size={14} color="#ffffff" />
          <Text className="font-bold text-primary-foreground">Post</Text>
        </Button>
      </View>
    </View>
  )
})

const ThreadDialog = memo(function ThreadDialog({
  thread,
  open,
  onOpenChange,
  onAddComment,
  onAddReply,
}: {
  thread: CommunityThread | undefined
  open: boolean
  onOpenChange: (open: boolean) => void
  onAddComment: (threadId: string, content: string) => void
  onAddReply: (threadId: string, commentId: string, content: string) => void
}) {
  const [commentDraft, setCommentDraft] = useState("")

  const submitComment = useCallback(() => {
    const trimmed = commentDraft.trim()

    if (!thread || !trimmed) {
      return
    }

    onAddComment(thread.id, trimmed)
    setCommentDraft("")
  }, [commentDraft, onAddComment, thread])

  const handleReply = useCallback(
    (commentId: string, content: string) => {
      if (!thread) {
        return
      }

      onAddReply(thread.id, commentId, content)
    },
    [onAddReply, thread]
  )

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="p-0">
        {thread ? (
          <ScrollView
            style={{ maxHeight: 640 }}
            contentContainerStyle={{ padding: 20, gap: 16 }}
          >
            <DialogHeader>
              <DialogTitle>{thread.title}</DialogTitle>
              <DialogDescription>
                {thread.topic} · {thread.author.name} · {thread.createdAtLabel}
              </DialogDescription>
            </DialogHeader>

            <View className="rounded-2xl border border-border bg-background p-4">
              <Text className="text-sm leading-6 text-muted-foreground">
                {thread.content}
              </Text>
            </View>

            <View className="gap-3">
              {thread.comments.map((comment) => (
                <CommentRow
                  key={comment.id}
                  comment={comment}
                  onAddReply={handleReply}
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
                <Button className="h-10 px-4" onPress={submitComment}>
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
  )
})

export default function CommunityScreen() {
  const colorScheme = useColorScheme()
  const primaryColor =
    colorScheme === "dark" ? THEME.dark.primary : THEME.light.primary
  const [threads, setThreads] = useState(COMMUNITY_THREADS)
  const [isGuideOpen, setIsGuideOpen] = useState(false)
  const [isComposerOpen, setIsComposerOpen] = useState(false)
  const [activeThreadId, setActiveThreadId] = useState<string | null>(null)

  const activeThread = useMemo(
    () => threads.find((thread) => thread.id === activeThreadId),
    [activeThreadId, threads]
  )

  const createThread = useCallback(
    (payload: { topic: string; title: string; content: string }) => {
      const nextThread: CommunityThread = {
        id: createId("thread"),
        topic: payload.topic,
        title: payload.title,
        content: payload.content,
        author: COMMUNITY_CURRENT_USER,
        createdAtLabel: "Just now",
        status: "Open",
        comments: [],
      }

      setThreads((current) => [nextThread, ...current])
    },
    []
  )

  const addComment = useCallback((threadId: string, content: string) => {
    const nextComment: CommunityComment = {
      id: createId("comment"),
      author: COMMUNITY_CURRENT_USER,
      content,
      createdAtLabel: "Just now",
      replies: [],
    }

    setThreads((current) =>
      current.map((thread) =>
        thread.id === threadId
          ? { ...thread, comments: [...thread.comments, nextComment] }
          : thread
      )
    )
  }, [])

  const addReply = useCallback(
    (threadId: string, commentId: string, content: string) => {
      const nextReply: CommunityReply = {
        id: createId("reply"),
        author: COMMUNITY_CURRENT_USER,
        content,
        createdAtLabel: "Just now",
      }

      setThreads((current) =>
        current.map((thread) => {
          if (thread.id !== threadId) {
            return thread
          }

          return {
            ...thread,
            comments: thread.comments.map((comment) =>
              comment.id === commentId
                ? { ...comment, replies: [...comment.replies, nextReply] }
                : comment
            ),
          }
        })
      )
    },
    []
  )

  const openThread = useCallback((threadId: string) => {
    setActiveThreadId(threadId)
  }, [])

  const header = useMemo(
    () => (
      <View className="gap-4 pb-4">
        <View className="relative overflow-hidden rounded-3xl border border-border bg-card px-5 py-5">
          <View className="absolute -right-8 -top-8 h-28 w-28 rounded-full bg-primary/10" />
          <View className="bg-chart2/20 absolute -bottom-10 -left-6 h-24 w-24 rounded-full" />

          <View className="flex-row items-center gap-2">
            <MessagesSquare size={16} color={primaryColor} />
            <Text className="text-xs font-black uppercase tracking-[1.8px] text-primary">
              Reviewer Community
            </Text>
          </View>

          <Text className="mt-2 text-2xl font-black leading-8 text-card-foreground">
            Ask better questions. Get sharper answers.
          </Text>
          <Text className="mt-2 text-sm leading-6 text-muted-foreground">
            A focused discussion space for reviewer strategies, confusing
            topics, and peer support.
          </Text>
        </View>

        <View className="flex-row gap-3">
          <Card className="flex-1">
            <CardContent className="gap-2 px-4 py-4">
              <Users size={16} color={primaryColor} />
              <Text className="text-xs font-bold uppercase tracking-wide text-primary">
                Active Learners
              </Text>
              <Text className="text-lg font-black text-card-foreground">
                {COMMUNITY_STATS.activeLearners}
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
                {COMMUNITY_STATS.openTopics}
              </Text>
            </CardContent>
          </Card>
          <Card className="flex-1">
            <CardContent className="gap-2 px-4 py-4">
              <ShieldCheck size={16} color={primaryColor} />
              <Text className="text-xs font-bold uppercase tracking-wide text-primary">
                Answered Today
              </Text>
              <Text className="text-lg font-black text-card-foreground">
                {COMMUNITY_STATS.answeredToday}
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
            onPress={() => setIsGuideOpen(true)}
          >
            <BookOpenText size={16} color="#6b7280" />
            <Text className="font-bold">Community guide</Text>
          </Button>
        </View>

        <View className="flex-row items-center justify-between gap-3 pt-1">
          <Text className="text-lg font-black text-foreground">
            Active Discussions
          </Text>
          <Text className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
            {threads.length} threads
          </Text>
        </View>
      </View>
    ),
    [primaryColor, threads.length]
  )

  const renderItem = useCallback(
    ({ item }: ListRenderItemInfo<CommunityThread>) => (
      <ThreadCard thread={item} onOpenThread={openThread} />
    ),
    [openThread]
  )

  return (
    <SafeAreaView className="flex-1 bg-background">
      <FlatList
        data={threads}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        ListHeaderComponent={header}
        contentContainerClassName="gap-4 px-5 pb-8 pt-5"
        ItemSeparatorComponent={() => <View className="h-4" />}
        showsVerticalScrollIndicator={false}
        initialNumToRender={4}
        maxToRenderPerBatch={4}
        windowSize={5}
        removeClippedSubviews
      />

      <Dialog open={isGuideOpen} onOpenChange={setIsGuideOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Community Guide</DialogTitle>
            <DialogDescription>
              Keep discussions focused, respectful, and useful for exam review.
            </DialogDescription>
          </DialogHeader>
          <View className="mt-4 gap-3">
            {COMMUNITY_GUIDELINES.map((rule) => (
              <GuideItem key={rule} rule={rule} />
            ))}
          </View>
        </DialogContent>
      </Dialog>

      <Dialog open={isComposerOpen} onOpenChange={setIsComposerOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Write a discussion</DialogTitle>
            <DialogDescription>
              Ask one focused question and provide enough context for strong
              replies.
            </DialogDescription>
          </DialogHeader>
          <View className="mt-4">
            <CommunityComposer
              onCreateThread={createThread}
              onClose={() => setIsComposerOpen(false)}
            />
          </View>
        </DialogContent>
      </Dialog>

      <ThreadDialog
        thread={activeThread}
        open={Boolean(activeThread)}
        onOpenChange={(open) => {
          if (!open) {
            setActiveThreadId(null)
          }
        }}
        onAddComment={addComment}
        onAddReply={addReply}
      />
    </SafeAreaView>
  )
}
