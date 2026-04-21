import { memo, useState } from "react"
import { Image } from "expo-image"
import { Heart, MessageSquare, Share2 } from "lucide-react-native"
import { Pressable, View } from "react-native"

import { type CommunityPostItem } from "@/lib/community"
import { THEME, withOpacity } from "@/lib/theme"
import { Text } from "@/components/ui/text"
import { CommunityAvatar } from "@/components/community/avatar"

type ThemePalette = (typeof THEME)["light"] | (typeof THEME)["dark"]

type CommunityThreadCardProps = {
  post: CommunityPostItem
  liking: boolean
  onLike: (post: CommunityPostItem) => void
  onOpen: (postId: string) => void
  theme: ThemePalette
}

const CATEGORY_COLORS: Record<string, string> = {
  question: "hsl(199 89% 48%)",
  discussion: "hsl(151 55% 41%)",
  tip: "hsl(18 94% 62%)",
}

export const CommunityThreadCard = memo(function CommunityThreadCard({
  post,
  liking,
  onLike,
  onOpen,
  theme,
}: CommunityThreadCardProps) {
  const [imageFailed, setImageFailed] = useState(false)
  const hasPhoto = Boolean(post.photoUrl) && !imageFailed
  const categoryColor = CATEGORY_COLORS[post.category] ?? theme.primary

  return (
    <View
      className="overflow-hidden rounded-[24px] bg-card"
      style={{ borderWidth: 1, borderColor: theme.border }}
    >
      {/* Author header */}
      <Pressable className="gap-3 px-4 pt-3.5" onPress={() => onOpen(post.id)}>
        <View className="flex-row items-center gap-2.5">
          <CommunityAvatar
            label={post.author.avatarSeed}
            theme={theme}
            size="lg"
          />
          <View className="flex-1">
            <View className="flex-row items-center gap-2">
              <Text className="text-[14px] font-bold text-card-foreground">
                {post.author.name}
              </Text>
              <View
                className="rounded-full px-2 py-0.5"
                style={{ backgroundColor: withOpacity(categoryColor, 0.12) }}
              >
                <Text
                  className="text-[9px] font-bold uppercase"
                  style={{ color: categoryColor }}
                >
                  {post.category}
                </Text>
              </View>
            </View>
            <View className="flex-row items-center gap-1.5">
              <Text className="text-[11px] text-muted-foreground">
                {post.author.subtitle}
              </Text>
              <View className="h-0.5 w-0.5 rounded-full bg-muted-foreground/50" />
              <Text className="text-[11px] text-muted-foreground">
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
            <Text className="text-[10px] font-bold text-primary">
              {post.subjectName}
            </Text>
          </View>
        ) : null}

        {/* Post content */}
        <View className="gap-1.5">
          <Text className="text-[15px] font-bold leading-5 text-card-foreground">
            {post.title}
          </Text>
          <Text
            className="text-[13px] leading-5 text-muted-foreground"
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
          <Text className="text-[12px] text-muted-foreground">
            {post.likesCount}
          </Text>
        </View>
        <Text className="text-[12px] text-muted-foreground">
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
            className="text-[12px] font-semibold"
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
          <Text className="text-[12px] font-semibold text-muted-foreground">
            Comment
          </Text>
        </Pressable>
        <Pressable className="flex-1 flex-row items-center justify-center gap-2 py-2.5">
          <Share2 size={18} color={theme.mutedForeground} />
          <Text className="text-[12px] font-semibold text-muted-foreground">
            Share
          </Text>
        </Pressable>
      </View>
    </View>
  )
})
