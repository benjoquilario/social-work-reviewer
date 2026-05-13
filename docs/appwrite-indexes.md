# Appwrite Index Checklist

Apply these indexes in the Appwrite Console (Database → select collection → Indexes tab).
Composite indexes should follow the **left-most column rule**: the first column listed is
the primary filter, subsequent columns refine and sort the result set.

> **Priority**: Add indexes in the order listed — the first group covers the most
> performance-critical queries in the codebase today.

---

## Highest priority

### `exam_attempts`
Used by: resume lookups, user history, activity feed

| Key | Type | Attributes | Direction |
|-----|------|-----------|-----------|
| `idx_attempts_user_status_resumable` | key | `userId`, `status`, `isResumable`, `$updatedAt` | ASC, ASC, ASC, DESC |
| `idx_attempts_user_exam_status_resumable` | key | `userId`, `examId`, `status`, `isResumable`, `$updatedAt` | ASC, ASC, ASC, ASC, DESC |
| `idx_attempts_user_created` | key | `userId`, `$createdAt` | ASC, DESC |

### `user_answers`
Used by: resume hydration, answer restoration

| Key | Type | Attributes | Direction |
|-----|------|-----------|-----------|
| `idx_answers_attempt_updated` | key | `attemptId`, `$updatedAt` | ASC, DESC |
| `idx_answers_attempt_question` | unique | `attemptId`, `questionId` | ASC, ASC |

### `user_progress`
Used by: progress upsert, dashboard, activity feed

| Key | Type | Attributes | Direction |
|-----|------|-----------|-----------|
| `idx_progress_user_subject_topic` | unique | `userId`, `subjectId`, `topicId` | ASC, ASC, ASC |
| `idx_progress_user_updated` | key | `userId`, `$updatedAt` | ASC, DESC |

### `user_daily_activity`
Used by: dashboard timeline, daily/monthly/yearly rollups

| Key | Type | Attributes | Direction |
|-----|------|-----------|-----------|
| `idx_daily_user_date` | unique | `userId`, `activityDate` | ASC, ASC |
| `idx_daily_user_week` | key | `userId`, `weekStartDate` | ASC, ASC |

### `user_weekly_reports`
Used by: weekly summaries, trend snapshots

| Key | Type | Attributes | Direction |
|-----|------|-----------|-----------|
| `idx_weekly_user_week` | unique | `userId`, `weekStartDate` | ASC, ASC |

### `post_likes`
Used by: like toggle, feed like counts

| Key | Type | Attributes | Direction |
|-----|------|-----------|-----------|
| `idx_likes_post_user` | unique | `postId`, `userId` | ASC, ASC |
| `idx_likes_post` | key | `postId` | ASC |

---

## High priority

### `posts`
Used by: community feed pagination

| Key | Type | Attributes | Direction |
|-----|------|-----------|-----------|
| `idx_posts_created` | key | `createdAt` | DESC |
| `idx_posts_subject_created` | key | `subjectId`, `createdAt` | ASC, DESC |
| `idx_posts_user_created` | key | `userId`, `createdAt` | ASC, DESC |

### `comments`
Used by: feed comment loading

| Key | Type | Attributes | Direction |
|-----|------|-----------|-----------|
| `idx_comments_post_created` | key | `postId`, `createdAt` | ASC, ASC |

### `replies`
Used by: feed reply loading

| Key | Type | Attributes | Direction |
|-----|------|-----------|-----------|
| `idx_replies_comment_created` | key | `commentId`, `createdAt` | ASC, ASC |

### `board_exam_questions`
Used by: board exam category listing (categoryId query), set detail (setId query)

| Key | Type | Attributes | Direction |
|-----|------|-----------|-----------|
| `idx_beq_category_order` | key | `categoryId`, `order` | ASC, ASC |
| `idx_beq_set_order` | key | `setId`, `order` | ASC, ASC |

---

## Medium priority

### `learning_history`
Used by: progress dashboard, material resume

| Key | Type | Attributes | Direction |
|-----|------|-----------|-----------|
| `idx_history_user_accessed` | key | `userId`, `lastAccessedAt` | ASC, DESC |
| `idx_history_user_status` | key | `userId`, `status` | ASC, ASC |
| `idx_history_user_material` | key | `userId`, `learningMaterialId` | ASC, ASC |

### `learning_achievements`
Used by: achievement feed, milestone deduplication

| Key | Type | Attributes | Direction |
|-----|------|-----------|-----------|
| `idx_achieve_user_earned` | key | `userId`, `earnedAt` | ASC, DESC |
| `idx_achieve_user_type_title` | key | `userId`, `achievementType`, `title` | ASC, ASC, ASC |

### `questions`
Used by: quiz content loading

| Key | Type | Attributes | Direction |
|-----|------|-----------|-----------|
| `idx_questions_subject_created` | key | `subjectId`, `createdAt` | ASC, ASC |

### `choices`
Used by: quiz question detail

| Key | Type | Attributes | Direction |
|-----|------|-----------|-----------|
| `idx_choices_question` | key | `questionId` | ASC |

### `exam_questions`
Used by: exam question ordering

| Key | Type | Attributes | Direction |
|-----|------|-----------|-----------|
| `idx_examq_exam_order` | key | `examId`, `order` | ASC, ASC |
| `idx_examq_exam_question` | key | `examId`, `questionId` | ASC, ASC |

### `board_exam_sets`
Used by: set listing per category

| Key | Type | Attributes | Direction |
|-----|------|-----------|-----------|
| `idx_bes_category_order` | key | `categoryId`, `order` | ASC, ASC |

### `board_exam_choices`
Used by: choice loading per question

| Key | Type | Attributes | Direction |
|-----|------|-----------|-----------|
| `idx_bec_question_order` | key | `questionId`, `order` | ASC, ASC |

### `user_profiles`
Used by: auth profile lookup

| Key | Type | Attributes | Direction |
|-----|------|-----------|-----------|
| `idx_profiles_user` | unique | `userId` | ASC |

---

## Notes

- **Unique indexes** also enforce data integrity at the DB level — add them even if
  the query doesn't require uniqueness, as they prevent duplicate rows under
  concurrent writes (the primary safety mechanism for `user_progress`, `post_likes`,
  and `user_answers`).
- Appwrite creates a `$id` index automatically — no need to add one.
- Review index usage in the Appwrite Console → Metrics after 1–2 weeks of traffic
  and remove any indexes that show zero reads.
