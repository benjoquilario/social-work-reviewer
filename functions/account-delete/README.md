# Account Delete Function

This Appwrite Function handles permanent account deletion from the mobile app danger zone.

## Purpose

- Accept the authenticated Appwrite user context
- Delete user-owned data from the main reviewer collections
- Delete the Appwrite Auth user using the server-side Users API

## Expected Environment Variables

- `APPWRITE_API_ENDPOINT`
- `APPWRITE_PROJECT_ID`
- `APPWRITE_API_KEY`
- `APPWRITE_DATABASE_ID`
- `USER_PROFILES_COLLECTION_ID` (optional, defaults to `user_profiles`)
- `USER_ROLES_COLLECTION_ID` (optional, defaults to `user_roles`)
- `EXAM_ATTEMPTS_COLLECTION_ID` (optional, defaults to `exam_attempts`)
- `USER_ANSWERS_COLLECTION_ID` (optional, defaults to `user_answers`)
- `USER_PROGRESS_COLLECTION_ID` (optional, defaults to `user_progress`)
- `POSTS_COLLECTION_ID` (optional, defaults to `posts`)
- `COMMENTS_COLLECTION_ID` (optional, defaults to `comments`)
- `REPLIES_COLLECTION_ID` (optional, defaults to `replies`)
- `POST_LIKES_COLLECTION_ID` (optional, defaults to `post_likes`)
- `COMMENT_LIKES_COLLECTION_ID` (optional, defaults to `comment_likes`)
- `FLAGGED_CONTENT_COLLECTION_ID` (optional, defaults to `flagged_content`)

## Invocation Shape

Use `POST` with any JSON body. The function uses the authenticated Appwrite user id from the request headers.

Example body:

```json
{
  "action": "delete-account"
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

- `EXPO_PUBLIC_APPWRITE_ACCOUNT_DELETE_FUNCTION_ID`

## Best Practice Note

This function deletes obvious user-owned data, then removes the Appwrite Auth user. If you later add more user-owned collections, extend this cleanup list before shipping.
