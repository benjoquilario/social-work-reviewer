import { memo, useState } from "react"
import { Image } from "expo-image"
import Heart from "lucide-react-native/icons/heart"
import MessageSquare from "lucide-react-native/icons/message-square"
import MoreHorizontal from "lucide-react-native/icons/ellipsis"
import { Pressable, View } from "react-native"

import { type CommunityPostItem } from "@/lib/community"
import { THEME, getCommunityCategoryColor, withOpacity } from "@/lib/theme"
import { Text } from "@/components/ui/text"
import { CommunityAvatar } from "@/components/community/avatar"

type ThemePalette = (typeof THEME)["light"] | (typeof THEME)["dark"]

type CommunityThreadCardProps = {
  post: CommunityPostItem
  liking: boolean
  onLike: (post: CommunityPostItem) => void
  onOpen: (postId: string) => void
  /** Opens the actions sheet — report, block, or delete when it is theirs. */
  onOpenActions: (post: CommunityPostItem) => void
  theme: ThemePalette
}

export const CommunityThreadCard = memo(function CommunityThreadCard({
  post,
  liking,
  onLike,
  onOpen,
  onOpenActions,
  theme,
}: CommunityThreadCardProps) {
  const [imageFailed, setImageFailed] = useState(false)
  const hasPhoto = Boolean(post.photoUrl) && !imageFailed
  const categoryColor = getCommunityCategoryColor(theme, post.category)

  return (
    <View
      className="overflow-hidden rounded-xl bg-card"
      style={{ borderWidth: 1, borderColor: theme.border }}
    >
      {/* Author header */}
      <Pressable className="gap-3 px-4 pt-3.5" onPress={() => onOpen(post.id)}>
        <View className="flex-row items-center gap-2.5">
          <CommunityAvatar
            label={post.author.avatarSeed}
            sourceUri={post.author.avatarUrl}
            theme={theme}
            size="lg"
          />
          <View className="flex-1">
            <View className="flex-row items-center gap-2">
              <Text className="text-sm font-bold text-card-foreground">
                {post.author.name}
              </Text>
              <View
                className="rounded-full px-2 py-0.5"
                style={{ backgroundColor: withOpacity(categoryColor, 0.12) }}
              >
                <Text
                  className="text-2xs font-bold uppercase tracking-[1px]"
                  style={{ color: categoryColor }}
                >
                  {post.category}
                </Text>
              </View>
            </View>
            <View className="flex-row items-center gap-1.5">
              <Text className="text-2xs text-muted-foreground">
                {post.author.subtitle}
              </Text>
              <View className="h-0.5 w-0.5 rounded-full bg-muted-foreground/50" />
              <Text className="text-2xs text-muted-foreground">
                {post.createdAtLabel}
              </Text>
            </View>
          </View>
        </View>

        {/* Subject tag */}
        {post.subjectName ? (
          <View
            className="self-start rounded-full px-2.5 py-1"
            style={{ backgroundColor: withOpacity(theme.primary, 0.08) }}
          >
            <Text className="text-2xs font-bold text-primary">
              {post.subjectName}
            </Text>
          </View>
        ) : null}

        {/* Post content */}
        <View className="gap-1.5">
          <Text className="text-sm font-bold leading-5 text-card-foreground">
            {post.title}
          </Text>
          <Text
            className="text-sm leading-5 text-muted-foreground"
            numberOfLines={hasPhoto ? 3 : 5}
          >
            {post.content}
          </Text>
        </View>
      </Pressable>

      {/* Photo */}
      {hasPhoto ? (
        <Pressable className="mt-3" onPress={() => onOpen(post.id)}>
          <Image
            source={{ uri: post.photoUrl as string }}
            style={{
              width: "100%",
              aspectRatio: 1.5,
              backgroundColor: withOpacity(theme.muted, 0.6),
              borderTopWidth: 1,
              borderBottomWidth: 1,
              borderColor: theme.border,
            }}
            contentFit="cover"
            transition={120}
            onError={() => setImageFailed(true)}
          />
        </Pressable>
      ) : null}

      {/* Engagement stats */}
      <View className="flex-row items-center justify-between px-4 py-2.5">
        <View className="flex-row items-center gap-1.5">
          <View
            className="h-5 w-5 items-center justify-center rounded-full"
            style={{ backgroundColor: withOpacity(theme.primary, 0.15) }}
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

      {/* Divider */}
      {/* <View className="mx-4 h-px" style={{ backgroundColor: theme.border+ }} /> */}

      {/* Action buttons row */}
      <View
        className="flex-row px-2 py-1"
        style={{
          borderTopWidth: 1,
          borderColor: theme.border,
        }}
      >
        <Pressable
          className="flex-1 flex-row items-center justify-center gap-2 py-2.5"
          onPress={() => onLike(post)}
          disabled={liking}
          style={{ opacity: liking ? 0.5 : 1 }}
        >
          <Heart
            size={18}
            color={post.isLiked ? theme.primary : theme.mutedForeground}
            fill={post.isLiked ? theme.primary : "transparent"}
          />
          <Text
            className="text-xs font-semibold"
            style={{
              color: post.isLiked ? theme.primary : theme.mutedForeground,
            }}
          >
            Like
          </Text>
        </Pressable>
        <Pressable
          className="flex-1 flex-row items-center justify-center gap-2 py-2.5"
          onPress={() => onOpen(post.id)}
        >
          <MessageSquare size={18} color={theme.mutedForeground} />
          <Text className="text-xs font-semibold text-muted-foreground">
            Comment
          </Text>
        </Pressable>
        <Pressable
          className="flex-1 flex-row items-center justify-center gap-2 py-2.5"
          onPress={() => onOpenActions(post)}
          accessibilityRole="button"
          accessibilityLabel="More actions for this post"
        >
          <MoreHorizontal size={18} color={theme.mutedForeground} />
          <Text className="text-xs font-semibold text-muted-foreground">
            More
          </Text>
        </Pressable>
      </View>
    </View>
  )
})
