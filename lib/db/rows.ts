import {
  createAppwriteContentError,
  DB_ID,
  getAppwriteConfigurationError,
  ID,
  isAppwriteConflictError,
  isAppwriteNotFoundError,
  Query,
  tablesDB,
} from "../appwrite"
import {
  newRowDefaults,
  ownedRowPermissions,
  reviewerCmsSchema,
  type CmsFieldDefinition,
  type ReviewerCreateInput,
  type ReviewerTableDocument,
  type ReviewerTableKey,
  type ReviewerUpdateInput,
} from "../schema"
import {
  isAppWritableTable,
  tableNeedsRowPermissions,
  TABLES,
} from "./tables"

/**
 * ─── Row access ───────────────────────────────────────────────────────────
 *
 * One place every read and write in the app goes through, so the four rules
 * that are easy to forget become impossible to skip:
 *
 *   1. Every create on a row-security table carries its own permissions.
 *      Appwrite grants a new row nothing unless the create says so — not the
 *      creator's access, not the table's — and the row is then invisible to
 *      the member who just wrote it, with no error to search for (gotcha 1).
 *   2. Every list carries a `Query.limit`. Appwrite's default page is 25 rows
 *      and warns about nothing past it, so an unpaged read of a 183-item paper
 *      silently hands back the first quarter (gotcha 2).
 *   3. Long reads page by cursor, never by offset — an offset re-scans
 *      everything it skips.
 *   4. Every create spreads `newRowDefaults`, because Appwrite refuses to hold
 *      a default on a required column and `user_progress` has fourteen of them
 *      (gotcha 3).
 *   5. Read-only columns are stripped from writes. `isPremium` and the rollup
 *      counts are the server's answer, not the app's claim (section 6).
 */

/** Appwrite's own ceiling for a single page. */
export const MAX_PAGE_SIZE = 100

/** 100 × 40 = 4,000 rows — far above any real paper or history window. */
const MAX_PAGES = 40

export type ListOptions = {
  /** Rows per request. Capped at Appwrite's 100. */
  pageSize?: number
  /** Stop after this many rows. */
  maxRows?: number
  /** Only used to make the truncation warning name the caller. */
  label?: string
}

function toContentError(error: unknown, fallback: string) {
  if (error instanceof Error && error.message) {
    return createAppwriteContentError("request", error.message)
  }

  return createAppwriteContentError("request", fallback)
}

/** Throws a `config` content error when the project is not wired up yet. */
export function assertContentConfigured() {
  const configError = getAppwriteConfigurationError()

  if (configError) {
    throw createAppwriteContentError("config", configError)
  }
}

/**
 * Read + update + delete for one member. Used on every row the app owns.
 *
 * Delegates to the schema's own helper, so the permission strings live beside
 * the access models that require them. It returns wire-format strings rather
 * than `Permission.read(...)` — `schema.ts` has no imports and has to stay
 * that way, and both SDKs accept them as written.
 */
export function ownedPermissions(userId: string) {
  return ownedRowPermissions(userId)
}

function readOnlyKeysFor(tableKey: ReviewerTableKey) {
  return (reviewerCmsSchema[tableKey].fields as readonly CmsFieldDefinition[])
    .filter((field) => field.readOnly)
    .map((field) => field.key)
}

/**
 * Drops the columns the server maintains.
 *
 * Rollup counts (`setCount`, `questionCount`, `topicCount`) and the cached
 * membership fields are both `readOnly` in the schema. Sending one is rejected
 * at best and, where permissions allow it, quietly overwrites a number the CMS
 * recomputes — so it never leaves the app.
 */
export function stripReadOnly<K extends ReviewerTableKey>(
  tableKey: K,
  data: Record<string, unknown>
) {
  const readOnly = new Set(readOnlyKeysFor(tableKey))
  const clean: Record<string, unknown> = {}

  for (const [key, value] of Object.entries(data)) {
    if (!readOnly.has(key) && value !== undefined) {
      clean[key] = value
    }
  }

  return clean
}

function assertWritable(tableKey: ReviewerTableKey) {
  if (!isAppWritableTable(tableKey)) {
    throw new Error(
      `[db] "${tableKey}" grants a client no write access. ` +
        "CMS content, money and roles are owned elsewhere — see sections 10 and 11 of MOBILE-SCHEMA-NOTES-v2.md."
    )
  }
}

/**
 * The permissions a create must carry, decided by the table's access model.
 *
 * Two failure modes, both silent, both handled here rather than at thirty call
 * sites:
 *
 * **Missing.** On a row-security table, a create with no permissions succeeds
 * and writes a row nobody — including its author — can ever read. There is no
 * error to notice, so this throws instead: a failed write is a far better
 * outcome than an orphaned one.
 *
 * **Unwanted.** `flagged_content` has row security switched off, and Appwrite
 * rejects a create that sends permissions to a table like that. Adding them
 * "just in case" turns the report button into a 400.
 */
function resolveCreatePermissions(
  tableKey: ReviewerTableKey,
  options: CreateOptions
): string[] | undefined {
  if (!tableNeedsRowPermissions(tableKey)) {
    if (options.permissions || options.ownerId) {
      console.warn(
        `[db] "${tableKey}" has row security disabled; the permissions passed ` +
          "to this create were dropped, because Appwrite rejects a create that carries them."
      )
    }

    return undefined
  }

  if (options.permissions) {
    return options.permissions
  }

  if (options.ownerId) {
    return ownedRowPermissions(options.ownerId)
  }

  throw new Error(
    `[db] A create on "${tableKey}" needs row permissions. Pass ` +
      "`ownerId` (or explicit `permissions`) — without them Appwrite writes a row " +
      "that is invisible to the member who created it. See gotcha 1 in MOBILE-SCHEMA-NOTES-v2.md."
  )
}

// ─── Reads ──────────────────────────────────────────────────────────────────

/** One page. Always limited, so the 25-row default can never apply. */
export async function listPage<K extends ReviewerTableKey>(
  tableKey: K,
  queries: string[],
  pageSize = MAX_PAGE_SIZE
): Promise<{ rows: ReviewerTableDocument<K>[]; total: number }> {
  const response = await tablesDB.listRows({
    databaseId: DB_ID,
    tableId: TABLES[tableKey],
    queries: [...queries, Query.limit(Math.min(pageSize, MAX_PAGE_SIZE))],
  })

  return {
    rows: response.rows as unknown as ReviewerTableDocument<K>[],
    total: response.total ?? response.rows.length,
  }
}

/**
 * Every matching row, gathered by cursor.
 *
 * Cursor rather than `Query.offset`: an offset re-scans the rows it skips and
 * gets slower the deeper it goes, which matters on a bank measured in
 * thousands of questions.
 */
export async function listAll<K extends ReviewerTableKey>(
  tableKey: K,
  queries: string[],
  options: ListOptions = {}
): Promise<ReviewerTableDocument<K>[]> {
  const pageSize = Math.min(options.pageSize ?? MAX_PAGE_SIZE, MAX_PAGE_SIZE)
  const rows: ReviewerTableDocument<K>[] = []
  let cursor: string | null = null

  for (let page = 0; page < MAX_PAGES; page += 1) {
    const response = await tablesDB.listRows({
      databaseId: DB_ID,
      tableId: TABLES[tableKey],
      queries: [
        ...queries,
        Query.limit(pageSize),
        ...(cursor ? [Query.cursorAfter(cursor)] : []),
      ],
    })

    const pageRows = response.rows as unknown as ReviewerTableDocument<K>[]
    rows.push(...pageRows)

    if (pageRows.length < pageSize) {
      return rows
    }

    if (options.maxRows && rows.length >= options.maxRows) {
      return rows.slice(0, options.maxRows)
    }

    const nextCursor = pageRows[pageRows.length - 1]?.$id ?? null

    // A cursor that does not advance would loop forever.
    if (!nextCursor || nextCursor === cursor) {
      return rows
    }

    cursor = nextCursor
  }

  console.warn(
    `[db] ${options.label ?? tableKey} hit the ${MAX_PAGES}-page ceiling ` +
      `(${MAX_PAGES * pageSize} rows); the result is truncated.`
  )

  return rows
}

/** First match, or null. Never throws on an empty result. */
export async function findFirst<K extends ReviewerTableKey>(
  tableKey: K,
  queries: string[]
): Promise<ReviewerTableDocument<K> | null> {
  const { rows } = await listPage(tableKey, queries, 1)
  return rows[0] ?? null
}

/** One row by ID, or null when it is gone. */
export async function getRowSafe<K extends ReviewerTableKey>(
  tableKey: K,
  rowId: string
): Promise<ReviewerTableDocument<K> | null> {
  try {
    const row = await tablesDB.getRow({
      databaseId: DB_ID,
      tableId: TABLES[tableKey],
      rowId,
    })

    return row as unknown as ReviewerTableDocument<K>
  } catch (error) {
    if (isAppwriteNotFoundError(error)) {
      return null
    }

    throw toContentError(error, `Unable to load ${tableKey} row ${rowId}.`)
  }
}

/**
 * How many rows match, without fetching them.
 *
 * `total` on a `limit(1)` response is the count Appwrite computed for the
 * whole filter, which is why this costs one row rather than all of them.
 */
export async function countRows<K extends ReviewerTableKey>(
  tableKey: K,
  queries: string[]
) {
  const { total } = await listPage(tableKey, queries, 1)
  return total
}

// ─── Writes ─────────────────────────────────────────────────────────────────

export type CreateOptions = {
  /** Defaults to `ID.unique()`. Pass one for a deterministic row. */
  rowId?: string
  /**
   * Owner of the row.
   *
   * Required on every row-security table — which is every table the app writes
   * except `flagged_content`. `tableNeedsRowPermissions` answers that from the
   * schema, so nothing here keeps a list.
   */
  ownerId?: string
  /** Explicit permission strings, when ownership is not the whole story. */
  permissions?: string[]
}

/**
 * A create with every required column filled in.
 *
 * `newRowDefaults` supplies the fourteen values `user_progress` demands and
 * the twelve `user_daily_activity` does, so a caller passes only what it
 * actually knows. Appwrite reports one missing column per round trip, which is
 * what makes a hand-written create so expensive to debug.
 */
export async function createRow<K extends ReviewerTableKey>(
  tableKey: K,
  data: Partial<ReviewerCreateInput<K>>,
  options: CreateOptions = {}
): Promise<ReviewerTableDocument<K>> {
  assertWritable(tableKey)

  const payload = stripReadOnly(tableKey, {
    ...newRowDefaults(tableKey),
    ...(data as Record<string, unknown>),
  })

  const row = await tablesDB.createRow({
    databaseId: DB_ID,
    tableId: TABLES[tableKey],
    rowId: options.rowId ?? ID.unique(),
    data: payload,
    permissions: resolveCreatePermissions(tableKey, options),
  })

  return row as unknown as ReviewerTableDocument<K>
}

/**
 * A create where a duplicate is an expected answer, not a failure.
 *
 * Four tables now refuse a second write at the database rather than trusting
 * the app not to send one (gotcha 10): `post_likes`, `comment_likes`,
 * `user_bookmarks` and `flagged_content`. That is the point — it settles the
 * race between two taps, which no amount of app-side checking can, because the
 * check and the write are not atomic.
 *
 * The consequence is that a create can come back 409 for a reason that is not
 * a failure. `null` means the row was already there, and every caller of this
 * should treat that as success.
 *
 * It matters most on `flagged_content`, which the app may write and may never
 * read. A 409 is the *only* channel through which the app can ever learn a
 * report already exists, so turning it into a red error would tell a member who
 * did exactly the right thing that they did something wrong.
 */
export async function tryCreateRow<K extends ReviewerTableKey>(
  tableKey: K,
  data: Partial<ReviewerCreateInput<K>>,
  options: CreateOptions = {}
): Promise<ReviewerTableDocument<K> | null> {
  try {
    return await createRow(tableKey, data, options)
  } catch (error) {
    if (isAppwriteConflictError(error)) {
      return null
    }

    throw error
  }
}

/**
 * An update carries only what changed — defaults are a create-time problem.
 *
 * No permissions argument, by design: an update is authorised by what the row
 * already carries. An update that 401s on a row the member owns means the
 * *create* was wrong, not this call.
 */
export async function updateRow<K extends ReviewerTableKey>(
  tableKey: K,
  rowId: string,
  data: ReviewerUpdateInput<K>
): Promise<ReviewerTableDocument<K>> {
  assertWritable(tableKey)

  const row = await tablesDB.updateRow({
    databaseId: DB_ID,
    tableId: TABLES[tableKey],
    rowId,
    data: stripReadOnly(tableKey, data as Record<string, unknown>),
  })

  return row as unknown as ReviewerTableDocument<K>
}

export async function deleteRow<K extends ReviewerTableKey>(
  tableKey: K,
  rowId: string
) {
  assertWritable(tableKey)

  await tablesDB.deleteRow({
    databaseId: DB_ID,
    tableId: TABLES[tableKey],
    rowId,
  })
}

/**
 * Update the row at `rowId`, creating it when it is not there yet.
 *
 * Update-first because the steady state is an existing row: a member answers
 * many questions per session and changes one setting many times, so the create
 * path runs once and the update path runs forever after.
 */
export async function upsertRowById<K extends ReviewerTableKey>(
  tableKey: K,
  rowId: string,
  data: Partial<ReviewerCreateInput<K>>,
  options: Omit<CreateOptions, "rowId"> & {
    /**
     * Try the create first. Pass this where a row is usually new — an answer
     * row, say — so the common path is one request rather than a wasted 404
     * followed by a create.
     */
    createFirst?: boolean
  } = {}
): Promise<ReviewerTableDocument<K>> {
  if (options.createFirst) {
    try {
      return await createRow(tableKey, data, { ...options, rowId })
    } catch (error) {
      if (!isAppwriteConflictError(error)) {
        throw error
      }

      return updateRow(tableKey, rowId, data as ReviewerUpdateInput<K>)
    }
  }

  try {
    return await updateRow(tableKey, rowId, data as ReviewerUpdateInput<K>)
  } catch (error) {
    if (!isAppwriteNotFoundError(error)) {
      throw error
    }

    return createRow(tableKey, data, { ...options, rowId })
  }
}
