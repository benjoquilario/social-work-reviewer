#!/usr/bin/env node
/**
 * Creates Appwrite tables, columns and indexes from `lib/schema.ts`.
 *
 *   node scripts/migrate-schema.mjs                       # dry run (default)
 *   node scripts/migrate-schema.mjs --apply
 *   node scripts/migrate-schema.mjs --apply --only questions,questionnaires
 *
 * `lib/schema.ts` is already a machine-readable description of every table, so
 * the migration is generated from it rather than clicked into the console.
 * That keeps the code and the database from drifting, and makes a schema
 * change reviewable as a diff.
 *
 * Node 24 reads the TypeScript directly (type stripping), and the schema file
 * has no imports — so this needs no build step and no dependencies.
 *
 * Safety properties:
 *
 *   - dry run by default; nothing is written without --apply
 *   - idempotent: existing tables, columns and indexes are skipped, so it is
 *     safe to re-run after a partial failure
 *   - additive only: it never drops or alters an existing column, because a
 *     migration tool that can delete data is one bad flag away from deleting
 *     data
 *   - waits for columns to report `available` before creating indexes, which
 *     Appwrite requires and which is the usual cause of a half-migrated table
 *
 * Environment (reads .env if the matching EXPO_PUBLIC_* names are set):
 *
 *   APPWRITE_ENDPOINT       https://…/v1
 *   APPWRITE_PROJECT_ID
 *   APPWRITE_DATABASE_ID
 *   APPWRITE_API_KEY        server key, scoped to tables.read + tables.write
 *
 * The first three fall back to the EXPO_PUBLIC_* names already in .env. The
 * key does not, and the script refuses to start if it finds one there — see
 * the note beside API_KEY below. Pass it for a single command, or let the
 * script prompt for it.
 */

import fs from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..")

// ─── Config ─────────────────────────────────────────────────────────────────

/** Minimal .env reader — enough for KEY=value, no interpolation. */
function readEnvFile() {
  const envPath = path.join(projectRoot, ".env")

  if (!fs.existsSync(envPath)) {
    return {}
  }

  const values = {}

  for (const line of fs.readFileSync(envPath, "utf8").split(/\r?\n/)) {
    const match = /^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/.exec(line)

    if (match) {
      values[match[1]] = match[2].trim().replace(/^["']|["']$/g, "")
    }
  }

  return values
}

const fileEnv = readEnvFile()

function readConfig(name, publicName) {
  return (
    process.env[name] ||
    fileEnv[name] ||
    (publicName ? process.env[publicName] || fileEnv[publicName] : "") ||
    ""
  )
}

const ENDPOINT = readConfig(
  "APPWRITE_ENDPOINT",
  "EXPO_PUBLIC_APPWRITE_ENDPOINT"
).replace(/\/+$/, "")
const PROJECT_ID = readConfig(
  "APPWRITE_PROJECT_ID",
  "EXPO_PUBLIC_APPWRITE_PROJECT_ID"
)
const DATABASE_ID = readConfig(
  "APPWRITE_DATABASE_ID",
  "EXPO_PUBLIC_APPWRITE_DATABASE_ID"
)
/**
 * The API key is read from the process environment only — never from `.env`.
 *
 * `.env` belongs to the mobile app. An Appwrite server key bypasses every
 * permission in the project: it can read every learner's rows, delete users
 * and drop tables. Keeping it in the same file the app reads invites exactly
 * one mistake — naming it `EXPO_PUBLIC_APPWRITE_API_KEY`, which Expo would
 * then inline into the shipped bundle, where anyone can pull it out of the APK.
 *
 * So the fallback is deliberately absent, and the prompt below means it does
 * not have to touch shell history either.
 */
let API_KEY = process.env.APPWRITE_API_KEY ?? ""

if (fileEnv.APPWRITE_API_KEY) {
  console.error(
    "Refusing to run: APPWRITE_API_KEY is set in .env.\n" +
      "That file is the mobile app's, and a server key does not belong in it.\n" +
      "Remove the line, then pass the key for one command instead:\n" +
      "  APPWRITE_API_KEY=... node scripts/migrate-schema.mjs --apply\n" +
      "or leave it unset and this script will prompt for it."
  )
  process.exit(1)
}

const args = process.argv.slice(2)
const APPLY = args.includes("--apply")
/**
 * Prints the full intended plan, including request bodies, without contacting
 * the server. A dry run that needs credentials cannot be reviewed by whoever
 * is approving the change, which is exactly when you want it readable.
 */
const OFFLINE = args.includes("--offline") && !APPLY
const onlyArg = args.find((arg) => arg.startsWith("--only="))
const ONLY = onlyArg
  ? new Set(onlyArg.slice("--only=".length).split(",").map((v) => v.trim()))
  : null

// ─── HTTP ───────────────────────────────────────────────────────────────────

async function call(method, endpointPath, body) {
  const response = await fetch(`${ENDPOINT}${endpointPath}`, {
    method,
    headers: {
      "content-type": "application/json",
      "x-appwrite-project": PROJECT_ID,
      "x-appwrite-key": API_KEY,
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  })

  const text = await response.text()
  let payload = null

  try {
    payload = text ? JSON.parse(text) : null
  } catch {
    payload = { message: text }
  }

  return { ok: response.ok, status: response.status, payload }
}

function tablePath(tableId) {
  return `/tablesdb/${DATABASE_ID}/tables/${tableId}`
}

// ─── Column mapping ─────────────────────────────────────────────────────────

/**
 * One schema field becomes one Appwrite column request.
 *
 * `text` and `richtext` are strings with a larger size; the distinction only
 * matters to the dashboard's editor, not to storage.
 */
function toColumnRequest(field) {
  const shared = {
    key: field.key,
    required: field.required === true,
    array: field.kind === "string[]",
  }

  // Appwrite rejects a default on a required column, and on arrays.
  const hasDefault =
    field.defaultValue !== undefined && !shared.required && !shared.array
  const withDefault = hasDefault ? { default: field.defaultValue } : {}

  switch (field.kind) {
    case "string":
    case "text":
    case "richtext":
    case "string[]":
      return {
        suffix: "/columns/string",
        body: { ...shared, ...withDefault, size: field.size ?? 255 },
      }
    case "integer":
      return {
        suffix: "/columns/integer",
        body: {
          ...shared,
          ...withDefault,
          min: field.min,
          max: field.max,
        },
      }
    case "float":
      return {
        suffix: "/columns/float",
        body: { ...shared, ...withDefault, min: field.min, max: field.max },
      }
    case "boolean":
      return { suffix: "/columns/boolean", body: { ...shared, ...withDefault } }
    case "datetime":
      return { suffix: "/columns/datetime", body: { ...shared, ...withDefault } }
    case "enum":
      return {
        suffix: "/columns/enum",
        body: { ...shared, ...withDefault, elements: [...(field.options ?? [])] },
      }
    default:
      throw new Error(`Unmapped field kind "${field.kind}" on "${field.key}"`)
  }
}

// ─── Access model ───────────────────────────────────────────────────────────

/**
 * Table permissions, derived from the schema's own grouping.
 *
 * Two shapes, because this app has exactly two kinds of table:
 *
 *   content    published material every signed-in learner reads and nobody
 *              writes from the app. Read granted at the table level; writes
 *              happen from the dashboard with an API key, which bypasses
 *              permissions entirely. Row security stays OFF — per-row rules
 *              would be dead weight on rows that are all equally public.
 *
 *   user-owned rows belonging to one learner. Row security ON, and the table
 *              grants `create` only: the app stamps read/update/delete onto
 *              each row for its owner (see getUserOwnedPermissions in
 *              lib/auth.ts). Granting table-level read here would let any
 *              signed-in user read every other user's rows.
 *
 * Printed in the plan rather than applied silently — this is the security
 * boundary, and it should be reviewed before it is created, not after.
 */
const CONTENT_GROUPS = new Set(["content", "assessment", "cms"])

function toAccessModel(table) {
  if (CONTENT_GROUPS.has(table.group)) {
    return {
      rowSecurity: false,
      permissions: ['read("users")'],
      note: "public to signed-in learners; written by the dashboard API key",
    }
  }

  return {
    rowSecurity: true,
    permissions: ['create("users")'],
    note: "per-row ownership; the app stamps read/update/delete per row",
  }
}

// ─── Steps ──────────────────────────────────────────────────────────────────

const planned = []
let failed = 0

function record(action, detail) {
  planned.push(`${action}  ${detail}`)
}

async function ensureTable(table) {
  const access = toAccessModel(table)

  if (OFFLINE) {
    record(
      "CREATE table ",
      `${table.tableId} — ${table.name}\n                 access: rowSecurity=${access.rowSecurity}, ${access.permissions.join(", ")}  (${access.note})`
    )
    return true
  }

  const existing = await call("GET", tablePath(table.tableId))

  if (existing.ok) {
    record("skip  table ", `${table.tableId} (exists)`)
    return true
  }

  if (existing.status !== 404) {
    console.error(
      `  ! could not read table ${table.tableId}: ${existing.status} ${existing.payload?.message ?? ""}`
    )
    failed += 1
    return false
  }

  record(
    "CREATE table ",
    `${table.tableId} — ${table.name}\n                 access: rowSecurity=${access.rowSecurity}, ${access.permissions.join(", ")}  (${access.note})`
  )

  if (!APPLY) {
    return true
  }

  const created = await call("POST", `/tablesdb/${DATABASE_ID}/tables`, {
    tableId: table.tableId,
    name: table.name,
    rowSecurity: access.rowSecurity,
    permissions: access.permissions,
    enabled: true,
  })

  if (!created.ok) {
    console.error(
      `  ! create table ${table.tableId}: ${created.status} ${created.payload?.message ?? ""}`
    )
    failed += 1
    return false
  }

  return true
}

async function ensureColumns(table) {
  const listed = OFFLINE
    ? { ok: false }
    : await call("GET", `${tablePath(table.tableId)}/columns`)
  const existingKeys = new Set(
    listed.ok ? (listed.payload?.columns ?? []).map((c) => c.key) : []
  )

  for (const field of table.fields) {
    if (existingKeys.has(field.key)) {
      record("skip  column", `${table.tableId}.${field.key} (exists)`)
      continue
    }

    const request = toColumnRequest(field)
    record(
      "CREATE column",
      OFFLINE
        ? `POST ${tablePath(table.tableId)}${request.suffix} ${JSON.stringify(request.body)}`
        : `${table.tableId}.${field.key} (${field.kind}${field.required ? ", required" : ""})`
    )

    if (!APPLY) {
      continue
    }

    const created = await call(
      "POST",
      `${tablePath(table.tableId)}${request.suffix}`,
      request.body
    )

    if (!created.ok) {
      console.error(
        `  ! create column ${table.tableId}.${field.key}: ${created.status} ${created.payload?.message ?? ""}`
      )
      failed += 1
    }
  }
}

/**
 * Appwrite creates columns asynchronously. An index built against a column
 * still in `processing` fails, and that failure is the usual reason a table
 * ends up with its columns but none of its indexes.
 */
async function waitForColumns(table, timeoutMs = 60_000) {
  const deadline = Date.now() + timeoutMs

  while (Date.now() < deadline) {
    const listed = await call("GET", `${tablePath(table.tableId)}/columns`)

    if (!listed.ok) {
      return false
    }

    const columns = listed.payload?.columns ?? []
    const pending = columns.filter(
      (column) => column.status && column.status !== "available"
    )

    if (pending.length === 0) {
      return true
    }

    await new Promise((resolve) => setTimeout(resolve, 1000))
  }

  console.error(`  ! columns on ${table.tableId} did not become available in time`)
  return false
}

async function ensureIndexes(table) {
  const indexes = table.indexes ?? []

  if (indexes.length === 0) {
    return
  }

  const listed = OFFLINE
    ? { ok: false }
    : await call("GET", `${tablePath(table.tableId)}/indexes`)
  const existingKeys = new Set(
    listed.ok ? (listed.payload?.indexes ?? []).map((i) => i.key) : []
  )

  for (const index of indexes) {
    if (existingKeys.has(index.key)) {
      record("skip  index ", `${table.tableId}.${index.key} (exists)`)
      continue
    }

    record(
      "CREATE index ",
      `${table.tableId}.${index.key} (${index.type}: ${index.columns.join(" + ")})`
    )

    if (!APPLY) {
      continue
    }

    const created = await call("POST", `${tablePath(table.tableId)}/indexes`, {
      key: index.key,
      type: index.type,
      columns: [...index.columns],
      ...(index.orders ? { orders: [...index.orders] } : {}),
    })

    if (!created.ok) {
      console.error(
        `  ! create index ${table.tableId}.${index.key}: ${created.status} ${created.payload?.message ?? ""}`
      )
      failed += 1
    }
  }
}

// ─── Main ───────────────────────────────────────────────────────────────────

/** Reads a secret from the terminal without echoing it. */
async function promptForApiKey() {
  if (!process.stdin.isTTY) {
    return ""
  }

  const { createInterface } = await import("node:readline")
  const rl = createInterface({ input: process.stdin, output: process.stdout })

  // Suppress the echo so the key does not end up on screen or in a scrollback
  // buffer someone later screenshots.
  const asMutable = rl
  asMutable._writeToOutput = function (chunk) {
    if (chunk.endsWith("Appwrite API key: ")) {
      asMutable.output.write(chunk)
    }
  }

  const answer = await new Promise((resolve) => {
    rl.question("Appwrite API key: ", (value) => {
      rl.close()
      resolve(value)
    })
  })

  process.stdout.write("\n")
  return answer.trim()
}

async function main() {
  if (!OFFLINE && !API_KEY) {
    API_KEY = await promptForApiKey()
  }

  const missing = [
    ["APPWRITE_ENDPOINT", ENDPOINT],
    ["APPWRITE_PROJECT_ID", PROJECT_ID],
    ["APPWRITE_DATABASE_ID", DATABASE_ID],
    ["APPWRITE_API_KEY", API_KEY],
  ].filter(([, value]) => !value)

  if (missing.length > 0 && !OFFLINE) {
    console.error(
      `Missing config: ${missing.map(([name]) => name).join(", ")}\n` +
        "Endpoint, project and database fall back to the EXPO_PUBLIC_* names in .env.\n" +
        "The API key never does. Create a server key scoped to tables.read and\n" +
        "tables.write only, give it a short expiry, and delete it once the\n" +
        "migration is done — it bypasses every permission while it exists."
    )
    process.exit(1)
  }

  const { reviewerCmsSchema } = await import("../lib/schema.ts")

  const tables = Object.values(reviewerCmsSchema).filter(
    (table) => !ONLY || ONLY.has(table.tableId)
  )

  if (tables.length === 0) {
    console.error("No tables matched --only.")
    process.exit(1)
  }

  console.log(
    `${APPLY ? "Applying" : "Dry run"} — ${tables.length} table(s) against ${ENDPOINT} / ${DATABASE_ID}\n`
  )

  for (const table of tables) {
    const ready = await ensureTable(table)

    if (!ready) {
      continue
    }

    await ensureColumns(table)

    if (APPLY && (table.indexes ?? []).length > 0) {
      await waitForColumns(table)
    }

    await ensureIndexes(table)
  }

  console.log(planned.map((line) => `  ${line}`).join("\n"))

  const creates = planned.filter((line) => line.startsWith("CREATE")).length
  console.log(
    `\n${creates} change(s) ${APPLY ? "applied" : "pending"}, ${planned.length - creates} already in place.`
  )

  if (failed > 0) {
    console.error(`\n${failed} operation(s) failed — re-run to retry; it is idempotent.`)
    process.exit(1)
  }

  if (!APPLY && creates > 0) {
    console.log("\nRe-run with --apply to execute.")
  }
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
