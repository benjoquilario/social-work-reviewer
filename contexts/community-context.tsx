import { create } from "zustand"

import {
  createCommunityComment,
  createCommunityPost,
  createCommunityReply,
  listCommunityFeed,
  toggleCommunityPostLike,
  type CommunityAuthor,
  type CommunityFeed,
  type CommunityPostItem,
  type CreateCommunityPostInput,
} from "@/lib/community"

// ─── Types ────────────────────────────────────────────────────────────────────

const COMMUNITY_CATEGORIES = ["question", "discussion", "tip"] as const
const COMMUNITY_FEED_FILTERS = ["all", ...COMMUNITY_CATEGORIES] as const

type CommunityCategory = (typeof COMMUNITY_CATEGORIES)[number]
type CommunityFeedFilter = (typeof COMMUNITY_FEED_FILTERS)[number]

type CommunityStore = {
  // Data
  feed: CommunityFeed | null
  isLoading: boolean
  error: string | null

  // UI state
  activeFeedFilter: CommunityFeedFilter
  activePostId: string | null
  isComposerOpen: boolean

  // Composer drafts
  selectedCategory: CommunityCategory
  selectedSubjectId: string | null
  titleDraft: string
  contentDraft: string
  photoUrlDraft: string
  commentDraft: string

  // Mutation flags
  isCreatingPost: boolean
  isCreatingComment: boolean
  isCreatingReply: boolean
  isTogglingLike: boolean
  togglingLikePostId: string | null

  // Actions
  loadFeed: (userId?: string) => Promise<void>
  refreshFeed: (userId?: string) => Promise<void>
  setActiveFeedFilter: (filter: CommunityFeedFilter) => void
  setActivePostId: (postId: string | null) => void
  setIsComposerOpen: (open: boolean) => void

  // Composer actions
  setSelectedCategory: (category: CommunityCategory) => void
  setSelectedSubjectId: (subjectId: string | null) => void
  setTitleDraft: (value: string) => void
  setContentDraft: (value: string) => void
  setPhotoUrlDraft: (value: string) => void
  setCommentDraft: (value: string) => void
  resetComposer: () => void

  // Mutations
  submitPost: (
    userId: string,
    author: CommunityAuthor,
    subjectName: string | null
  ) => Promise<void>
  submitComment: (userId: string, author: CommunityAuthor) => Promise<void>
  submitReply: (
    userId: string,
    commentId: string,
    content: string,
    author: CommunityAuthor
  ) => Promise<void>
  toggleLike: (userId: string, post: CommunityPostItem) => Promise<void>
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function recalculateStats(posts: CommunityPostItem[]): CommunityFeed["stats"] {
  return {
    activeLearners: new Set(posts.map((p) => p.userId)).size,
    openTopics: posts.length,
    answeredToday: posts.filter((p) => p.commentsCount > 0).length,
  }
}

function updateFeedPostById(
  feed: CommunityFeed | null,
  postId: string,
  updater: (post: CommunityPostItem) => CommunityPostItem
) {
  if (!feed) {
    return null
  }

  let didChange = false
  const posts = feed.posts.map((post) => {
    if (post.id !== postId) {
      return post
    }

    const nextPost = updater(post)
    didChange = didChange || nextPost !== post
    return nextPost
  })

  if (!didChange) {
    return feed
  }

  return { posts, stats: recalculateStats(posts) }
}

function updateFeedPostByCommentId(
  feed: CommunityFeed | null,
  commentId: string,
  updater: (post: CommunityPostItem) => CommunityPostItem
) {
  if (!feed) {
    return null
  }

  let didChange = false
  const posts = feed.posts.map((post) => {
    const hasComment = post.comments.some((comment) => comment.id === commentId)

    if (!hasComment) {
      return post
    }

    const nextPost = updater(post)
    didChange = didChange || nextPost !== post
    return nextPost
  })

  if (!didChange) {
    return feed
  }

  return { posts, stats: recalculateStats(posts) }
}

// ─── Store ────────────────────────────────────────────────────────────────────

export const useCommunityStore = create<CommunityStore>((set, get) => ({
  // Data
  feed: null,
  isLoading: false,
  error: null,

  // UI state
  activeFeedFilter: "all",
  activePostId: null,
  isComposerOpen: false,

  // Composer drafts
  selectedCategory: "discussion",
  selectedSubjectId: null,
  titleDraft: "",
  contentDraft: "",
  photoUrlDraft: "",
  commentDraft: "",

  // Mutation flags
  isCreatingPost: false,
  isCreatingComment: false,
  isCreatingReply: false,
  isTogglingLike: false,
  togglingLikePostId: null,

  // ── Data loading ──────────────────────────────────────────────────────────

  loadFeed: async (userId) => {
    if (get().feed || get().isLoading) return
    set({ isLoading: true, error: null })
    try {
      const feed = await listCommunityFeed(userId)
      set({ feed, isLoading: false })
    } catch (e) {
      set({
        error: e instanceof Error ? e.message : "Failed to load community",
        isLoading: false,
      })
    }
  },

  refreshFeed: async (userId) => {
    set({ isLoading: true, error: null })
    try {
      const feed = await listCommunityFeed(userId)
      set({ feed, isLoading: false })
    } catch (e) {
      set({
        error: e instanceof Error ? e.message : "Failed to refresh community",
        isLoading: false,
      })
    }
  },

  // ── UI state setters ─────────────────────────────────────────────────────

  setActiveFeedFilter: (filter) => set({ activeFeedFilter: filter }),
  setActivePostId: (postId) => set({ activePostId: postId }),
  setIsComposerOpen: (open) => set({ isComposerOpen: open }),

  // ── Composer setters ──────────────────────────────────────────────────────

  setSelectedCategory: (category) => set({ selectedCategory: category }),
  setSelectedSubjectId: (subjectId) => set({ selectedSubjectId: subjectId }),
  setTitleDraft: (value) => set({ titleDraft: value }),
  setContentDraft: (value) => set({ contentDraft: value }),
  setPhotoUrlDraft: (value) => set({ photoUrlDraft: value }),
  setCommentDraft: (value) => set({ commentDraft: value }),

  resetComposer: () =>
    set({
      titleDraft: "",
      contentDraft: "",
      photoUrlDraft: "",
      selectedCategory: "discussion",
      selectedSubjectId: null,
    }),

  // ── Mutations ─────────────────────────────────────────────────────────────

  submitPost: async (userId, author, subjectName) => {
    const {
      titleDraft,
      contentDraft,
      selectedCategory,
      selectedSubjectId,
      photoUrlDraft,
      feed,
    } = get()
    const title = titleDraft.trim()
    const content = contentDraft.trim()
    if (!title || !content) return

    // Optimistic update
    const now = new Date().toISOString()
    const optimisticPost: CommunityPostItem = {
      id: `optimistic-post-${now}`,
      userId,
      title,
      content,
      category: selectedCategory,
      subjectId: selectedSubjectId,
      subjectName,
      photoUrl: photoUrlDraft.trim() || null,
      createdAt: now,
      createdAtLabel: "Just now",
      likesCount: 0,
      commentsCount: 0,
      repliesCount: 0,
      isLiked: false,
      author,
      comments: [],
    }

    const posts = [optimisticPost, ...(feed?.posts ?? [])]
    set({
      isCreatingPost: true,
      feed: { posts, stats: recalculateStats(posts) },
    })

    try {
      const input: CreateCommunityPostInput = {
        userId,
        title,
        content,
        category: selectedCategory,
        author,
        ...(selectedSubjectId ? { subjectId: selectedSubjectId } : {}),
        ...(photoUrlDraft.trim() ? { photoUrl: photoUrlDraft.trim() } : {}),
      }
      await createCommunityPost(input)
      get().resetComposer()
      set({ isComposerOpen: false, isCreatingPost: false })
      // Refresh to get server-generated IDs
      void get().refreshFeed(userId)
    } catch {
      // Revert optimistic update
      const currentFeed = get().feed
      if (currentFeed) {
        const revertedPosts = currentFeed.posts.filter(
          (p) => p.id !== optimisticPost.id
        )
        set({
          feed: {
            posts: revertedPosts,
            stats: recalculateStats(revertedPosts),
          },
          isCreatingPost: false,
        })
      } else {
        set({ isCreatingPost: false })
      }
    }
  },

  submitComment: async (userId, author) => {
    const { commentDraft, activePostId, feed } = get()
    const content = commentDraft.trim()
    if (!content || !activePostId) return

    const now = new Date().toISOString()
    const optimisticComment = {
      id: `optimistic-comment-${now}`,
      postId: activePostId,
      content,
      createdAt: now,
      createdAtLabel: "Just now",
      author,
      replies: [],
    }

    // Optimistic update
    if (feed) {
      const nextFeed = updateFeedPostById(feed, activePostId, (post) => ({
        ...post,
        commentsCount: post.commentsCount + 1,
        comments: [...post.comments, optimisticComment],
      }))
      set({
        isCreatingComment: true,
        feed: nextFeed,
        commentDraft: "",
      })
    }

    try {
      await createCommunityComment({
        userId,
        postId: activePostId,
        content,
        author,
      })
      set({ isCreatingComment: false })
    } catch {
      set({ isCreatingComment: false })
    }
  },

  submitReply: async (userId, commentId, content, author) => {
    const { feed } = get()
    const trimmed = content.trim()
    if (!trimmed) return

    const now = new Date().toISOString()
    const optimisticReply = {
      id: `optimistic-reply-${now}`,
      commentId,
      content: trimmed,
      createdAt: now,
      createdAtLabel: "Just now",
      author,
    }

    if (feed) {
      const nextFeed = updateFeedPostByCommentId(feed, commentId, (post) => {
        let didUpdate = false
        const comments = post.comments.map((comment) => {
          if (comment.id !== commentId) {
            return comment
          }

          didUpdate = true
          return {
            ...comment,
            replies: [...comment.replies, optimisticReply],
          }
        })

        if (!didUpdate) {
          return post
        }

        return { ...post, repliesCount: post.repliesCount + 1, comments }
      })
      set({
        isCreatingReply: true,
        feed: nextFeed,
      })
    }

    try {
      await createCommunityReply({
        userId,
        commentId,
        content: trimmed,
        author,
      })
      set({ isCreatingReply: false })
    } catch {
      set({ isCreatingReply: false })
    }
  },

  toggleLike: async (userId, post) => {
    const { feed } = get()
    if (!feed) return

    // Optimistic toggle
    const nextFeed = updateFeedPostById(feed, post.id, (currentPost) => ({
      ...currentPost,
      isLiked: !post.isLiked,
      likesCount: Math.max(0, currentPost.likesCount + (post.isLiked ? -1 : 1)),
    }))
    set({
      isTogglingLike: true,
      togglingLikePostId: post.id,
      feed: nextFeed,
    })

    try {
      const result = await toggleCommunityPostLike({
        userId,
        postId: post.id,
        currentlyLiked: post.isLiked,
      })

      const reconciledFeed = updateFeedPostById(get().feed, post.id, (currentPost) => ({
        ...currentPost,
        isLiked: result.isLiked,
        likesCount: result.likesCount,
      }))

      set({
        isTogglingLike: false,
        togglingLikePostId: null,
        feed: reconciledFeed,
      })
    } catch {
      // Revert
      set({ isTogglingLike: false, togglingLikePostId: null, feed })
    }
  },
}))

export { COMMUNITY_CATEGORIES, COMMUNITY_FEED_FILTERS }
export type { CommunityCategory, CommunityFeedFilter }

// Selector shorthand
export const useCommunity = useCommunityStore
