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

## Appwrite Console Settings

- Trigger: `HTTP`
- Execution method: `POST`
- Path: `/`
- Schedule: leave empty
- Execute asynchronously: `false` for the mobile app flow, so the caller receives the material payload in the same request
- Entrypoint: `main.js`

The repository includes both `main.js` (root entrypoint) and `src/main.js` (implementation) so Appwrite deployments that expect a root entrypoint work without extra changes.

This function is meant to be executed on demand from the app, not on a cron schedule. The app should trigger an execution against the deployed function ID, so there is no separate public route you need to hardcode beyond the Appwrite execution endpoint. In Appwrite SDK terms, the request goes through:

```ts
functions.createExecution({
  functionId: "<YOUR_FUNCTION_ID>",
  body: JSON.stringify({ materialId: "<MATERIAL_ID>" }),
  async: false,
  xpath: "/",
  method: ExecutionMethod.POST,
})
```

If you add your own internal routing later, then `xpath` can change. With the current `src/main.js`, keep it at `/`.

## Mobile App Configuration

Set this Expo public env var so the app can call the deployed function:

- `EXPO_PUBLIC_APPWRITE_PREMIUM_MATERIAL_FUNCTION_ID`

## Suggested Next Step

After deploying this function and setting `EXPO_PUBLIC_APPWRITE_PREMIUM_MATERIAL_FUNCTION_ID`, premium lesson detail reads can flow through the function instead of directly exposing premium material bodies from the collection.
