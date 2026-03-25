# Premium Material Access Function

This Appwrite Function is scaffolded inside the same repository so premium checks can live beside the mobile app without needing a separate repository.

## Purpose

- Accept a `materialId`
- Read the signed-in user's `user_profiles` document
- Check `isPremium`
- Return the learning material only when access is allowed

## Expected Environment Variables

- `APPWRITE_API_ENDPOINT`
- `APPWRITE_PROJECT_ID`
- `APPWRITE_API_KEY`
- `APPWRITE_DATABASE_ID`
- `USER_PROFILES_COLLECTION_ID` (optional, defaults to `user_profiles`)
- `LEARNING_MATERIALS_COLLECTION_ID` (optional, defaults to `learning_materials`)

## Invocation Shape

Use `POST` with a JSON body:

```json
{
  "materialId": "learning-material-document-id"
}
```

The function expects Appwrite to pass the authenticated user id through the request headers.

## Suggested Next Step

After deploying this function, the mobile app can stop reading premium material bodies directly from the collection and call this function instead.
