# Community Post Like Toggle Function

This Appwrite Function moves community post like/unlike mutations to the server side so the app no longer relies on a client-side read-modify-write cycle.

## What this fixes

- Removes the client race where two devices can both read stale `posts.likesCount`
- Enforces one logical like per `(postId, userId)` by using a deterministic like row id
- Returns the canonical `likesCount` from `post_likes`, so the app can reconcile optimistic UI with server truth

Important nuance: the true source of truth is `post_likes`. The function still updates `posts.likesCount` as a best-effort snapshot, but feed reads should derive counts from `post_likes` for visible posts.

## Expected Environment Variables

- `APPWRITE_API_ENDPOINT`
- `APPWRITE_PROJECT_ID`
- `APPWRITE_API_KEY`
- `APPWRITE_DATABASE_ID`
- `POSTS_COLLECTION_ID` (optional, defaults to `posts`)
- `POST_LIKES_COLLECTION_ID` (optional, defaults to `post_likes`)

## Invocation Shape

Use `POST` with a JSON body:

```json
{
  "postId": "community-post-document-id",
  "currentlyLiked": false
}
```

The authenticated Appwrite user id is taken from the function request headers.

## Response Shape

```json
{
  "ok": true,
  "postId": "community-post-document-id",
  "userId": "appwrite-user-id",
  "isLiked": true,
  "likesCount": 14
}
```

## Appwrite Console Settings

- Trigger: `HTTP`
- Execution method: `POST`
- Path: `/`
- Execute asynchronously: `false`
- Entrypoint: `main.js`

## Mobile App Configuration

Set this Expo public env var after deployment:

- `EXPO_PUBLIC_APPWRITE_COMMUNITY_POST_LIKE_FUNCTION_ID`

## Recommended Appwrite Indexes

- `post_likes`: `postId + userId` with uniqueness if your Appwrite version supports it
- `post_likes`: `postId`
- `posts`: `$id`

Even with the function in place, the unique `(postId, userId)` constraint is still worth adding as a database guarantee.
