import {
  APPWRITE_CONFIG,
  COLLECTIONS,
  createAppwriteContentError,
  createAppwritePermissionMessage,
  DB_ID,
  ExecutionMethod,
  functions,
  getAppwriteConfigurationError,
  isAppwriteContentError,
  isAppwriteUnauthorizedError,
  Query,
  tablesDB,
} from "./appwrite"
import { getReviewLibraryByCategoryId } from "../data/review-content-data"
import { CATEGORIES } from "../data/reviewer-data"
import {
  type LearningMaterialDocument,
  type LearningMaterialType,
  type SubjectDocument,
  type TopicDocument,
} from "./schema"

const CONTENT_QUERY_LIMIT = 500
const CONTENT_IN_QUERY_CHUNK_SIZE = 50
const LEARNING_RESOURCES = [
  COLLECTIONS.SUBJECTS,
  COLLECTIONS.TOPICS,
  COLLECTIONS.LEARNING_MATERIALS,
]

export type LearningSubject = {
  id: string
  name: string
  description: string
  iconUrl: string | null
  order: number
  topicCount: number
  materialCount: number
  freeMaterialCount: number
  premiumMaterialCount: number
  hasPremiumContent: boolean
  isLocked: boolean
}

export type LearningTopicSummary = {
  id: string
  subjectId: string
  title: string
  description: string
  order: number
  materialCount: number
  freeMaterialCount: number
  premiumMaterialCount: number
  hasPremiumContent: boolean
  isLocked: boolean
  firstMaterialId: string | null
}

export type LearningMaterial = {
  id: string
  topicId: string
  title: string
  order: number
  type: LearningMaterialType
  fileUrl: string | null
  content: string
  isPremium: boolean
  isLocked: boolean
  createdAt: string
}

export type LearningTopicDetail = {
  subject: LearningSubject
  topic: LearningTopicSummary
  materials: LearningMaterial[]
}

export type LearningMaterialDetail = {
  subject: LearningSubject
  topic: LearningTopicSummary
  material: LearningMaterial
}

type MaterialStats = {
  total: number
  free: number
  premium: number
  visible: number
}

type PremiumMaterialFunctionResponse = {
  ok: boolean
  message?: string
  material?: {
    id: string
    topicId: string
    title: string
    order?: number
    type: LearningMaterialType
    fileUrl: string | null
    content: string
    isPremium: boolean
    createdAt: string
  }
}

type MaterialAccessResolution =
  | {
      kind: "success"
      material: LearningMaterial
    }
  | {
      kind: "denied"
      message: string
    }

function ensureLearningContentConfigured() {
  const configError = getAppwriteConfigurationError()

  if (configError) {
    throw createAppwriteContentError(
      "config",
      `${configError} Learning content now loads only from Appwrite.`
    )
  }
}

function mapSubjectDocument(
  subject: SubjectDocument,
  topicCount: number,
  stats: MaterialStats,
  viewerIsPremium: boolean
): LearningSubject {
  return {
    id: subject.$id,
    name: subject.name,
    description: subject.description ?? "",
    iconUrl: subject.iconUrl ?? null,
    order: subject.order,
    topicCount,
    materialCount: stats.total,
    freeMaterialCount: stats.free,
    premiumMaterialCount: stats.premium,
    hasPremiumContent: stats.premium > 0,
    isLocked: !viewerIsPremium && stats.total > 0 && stats.free === 0,
  }
}

function mapTopicDocument(
  topic: TopicDocument,
  stats: MaterialStats,
  viewerIsPremium: boolean,
  primaryMaterialId: string | null
): LearningTopicSummary {
  return {
    id: topic.$id,
    subjectId: topic.subjectId,
    title: topic.title,
    description: topic.description ?? "",
    order: topic.order,
    materialCount: stats.total,
    freeMaterialCount: stats.free,
    premiumMaterialCount: stats.premium,
    hasPremiumContent: stats.premium > 0,
    isLocked: !viewerIsPremium && stats.total > 0 && stats.free === 0,
    firstMaterialId: primaryMaterialId,
  }
}

function mapMaterialDocument(
  material: LearningMaterialDocument,
  viewerIsPremium: boolean
): LearningMaterial {
  const isLocked = material.isPremium && !viewerIsPremium

  return {
    id: material.$id,
    topicId: material.topicId,
    title: material.title,
    order: material.order,
    type: material.type,
    fileUrl: isLocked ? null : (material.fileUrl ?? null),
    content: isLocked ? "" : (material.content ?? ""),
    isPremium: material.isPremium,
    isLocked,
    createdAt: material.createdAt,
  }
}

function mapPremiumMaterialPayload(
  material: NonNullable<PremiumMaterialFunctionResponse["material"]>
): LearningMaterial {
  return {
    id: material.id,
    topicId: material.topicId,
    title: material.title,
    order: material.order ?? 1,
    type: material.type,
    fileUrl: material.fileUrl,
    content: material.content,
    isPremium: material.isPremium,
    isLocked: false,
    createdAt: material.createdAt,
  }
}

type LearningAccessOptions = {
  viewerIsPremium?: boolean
}

function buildFallbackLearningSubjects(): LearningSubject[] {
  return CATEGORIES.map((category, index) => ({
    id: category.id,
    name: category.title,
    description: category.description,
    iconUrl: null,
    order: index + 1,
    topicCount: category.topicCount,
    materialCount: category.itemCount,
    freeMaterialCount: 0,
    premiumMaterialCount: category.itemCount,
    hasPremiumContent: true,
    isLocked: true,
  }))
}

function buildFallbackLearningTopicsBySubjectId(
  subjectId: string
): LearningTopicSummary[] {
  const library = getReviewLibraryByCategoryId(subjectId)

  if (!library) {
    return []
  }

  return library.topics.map((topic, index) => ({
    id: topic.id,
    subjectId,
    title: topic.title,
    description: topic.summary,
    order: index + 1,
    materialCount: topic.lessonIds.length,
    freeMaterialCount: 0,
    premiumMaterialCount: topic.lessonIds.length,
    hasPremiumContent: topic.lessonIds.length > 0,
    isLocked: true,
    firstMaterialId: null,
  }))
}

function shouldUseFreeCatalogFallback(
  error: unknown,
  viewerIsPremium: boolean
) {
  return !viewerIsPremium && isAppwriteUnauthorizedError(error)
}

function sortTopics(topics: TopicDocument[]) {
  return [...topics].sort((left, right) => left.order - right.order)
}

function sortMaterials(materials: LearningMaterialDocument[]) {
  return [...materials].sort((left, right) => {
    if (left.order !== right.order) {
      return left.order - right.order
    }

    return (
      new Date(left.createdAt).getTime() - new Date(right.createdAt).getTime()
    )
  })
}

function getMaterialStats(
  materials: LearningMaterialDocument[],
  viewerIsPremium: boolean
): MaterialStats {
  const free = materials.filter((material) => !material.isPremium).length
  const premium = materials.length - free
  const visible = viewerIsPremium ? materials.length : free

  return {
    total: materials.length,
    free,
    premium,
    visible,
  }
}

async function executeMaterialAccessFunction(materialId: string) {
  const functionId = APPWRITE_CONFIG.premiumMaterialAccessFunctionId

  if (!functionId) {
    return null
  }

  try {
    return await functions.createExecution({
      functionId,
      body: JSON.stringify({ materialId }),
      async: false,
      xpath: "/",
      method: ExecutionMethod.POST,
      headers: {
        "content-type": "application/json",
      },
    })
  } catch {
    // Keep lesson loading resilient while function deployment/config is still stabilizing.
    return null
  }
}

function parseFunctionPayload(responseBody: string): PremiumMaterialFunctionResponse | null {
  if (!responseBody) return null
  try {
    return JSON.parse(responseBody) as PremiumMaterialFunctionResponse
  } catch {
    return null
  }
}

function isAccessDenied(statusCode: number, payload: PremiumMaterialFunctionResponse | null) {
  return statusCode >= 400 || !payload?.ok || !payload?.material
}

function isUnauthorized(statusCode: number) {
  return statusCode === 401 || statusCode === 403
}

async function resolveMaterialAccessViaFunction(
  materialId: string
): Promise<MaterialAccessResolution | null> {
  const execution = await executeMaterialAccessFunction(materialId)

  if (!execution) {
    return null
  }

  const statusCode = execution.responseStatusCode ?? 500
  const payload = parseFunctionPayload(execution.responseBody ?? "")

  if (isAccessDenied(statusCode, payload)) {
    if (isUnauthorized(statusCode)) {
      return {
        kind: "denied",
        message:
          payload?.message ??
          "Premium subscription required for this material.",
      }
    }

    throw createAppwriteContentError(
      "request",
      payload?.message ??
        "Unable to resolve premium material access. Check the premium Appwrite Function deployment, environment variables, and execute/scopes settings."
    )
  }

  return {
    kind: "success",
    material: mapPremiumMaterialPayload(payload!.material!),
  }
}

// ---------------------------------------------------------------------------
// Internal data-fetching helpers
// ---------------------------------------------------------------------------

async function listContentDocuments<T>(tableId: string, queries: string[]): Promise<T[]> {
  ensureLearningContentConfigured()

  const { rows } = await tablesDB.listRows({
    databaseId: DB_ID,
    tableId,
    queries,
  })

  return rows as unknown as T[]
}

async function getLearningSnapshot() {
  ensureLearningContentConfigured()

  const [subjects, topics, materials] = await Promise.all([
    listRemoteSubjects(),
    tablesDB
      .listRows({
        databaseId: DB_ID,
        tableId: COLLECTIONS.TOPICS,
        queries: [Query.orderAsc("order"), Query.limit(CONTENT_QUERY_LIMIT)],
      })
      .then((result) => result.rows as unknown as TopicDocument[]),
    listRemoteMaterials(),
  ])

  const topicsBySubjectId = new Map<string, TopicDocument[]>()
  for (const topic of topics) {
    const current = topicsBySubjectId.get(topic.subjectId) ?? []
    current.push(topic)
    topicsBySubjectId.set(topic.subjectId, current)
  }

  const materialsByTopicId = new Map<string, LearningMaterialDocument[]>()
  for (const material of materials) {
    const current = materialsByTopicId.get(material.topicId) ?? []
    current.push(material)
    materialsByTopicId.set(material.topicId, current)
  }

  return { subjects, topicsBySubjectId, materialsByTopicId }
}

function listRemoteSubjects() {
  return listContentDocuments<SubjectDocument>(COLLECTIONS.SUBJECTS, [
    Query.orderAsc("order"),
    Query.limit(CONTENT_QUERY_LIMIT),
  ])
}

function listRemoteTopicsBySubjectId(subjectId: string) {
  return listContentDocuments<TopicDocument>(COLLECTIONS.TOPICS, [
    Query.equal("subjectId", subjectId),
    Query.orderAsc("order"),
    Query.limit(CONTENT_QUERY_LIMIT),
  ])
}

function listRemoteMaterials() {
  return listContentDocuments<LearningMaterialDocument>(COLLECTIONS.LEARNING_MATERIALS, [
    Query.orderAsc("order"),
    Query.orderAsc("createdAt"),
    Query.limit(CONTENT_QUERY_LIMIT),
  ])
}

function listRemoteMaterialsByTopicId(topicId: string) {
  return listContentDocuments<LearningMaterialDocument>(COLLECTIONS.LEARNING_MATERIALS, [
    Query.equal("topicId", topicId),
    Query.orderAsc("order"),
    Query.orderAsc("createdAt"),
    Query.limit(CONTENT_QUERY_LIMIT),
  ])
}

/**
 * Fetches materials for multiple topic IDs using chunked parallel queries.
 * Replaces the global listRemoteMaterials() call in topic-list screens so
 * only relevant materials are loaded instead of the entire collection.
 * Impact: reduces data transferred per subject screen by ~(N-1)/N where N
 * is the total number of subjects.
 */
async function listRemoteMaterialsByTopicIds(
  topicIds: string[]
): Promise<LearningMaterialDocument[]> {
  const uniqueTopicIds = Array.from(new Set(topicIds.filter(Boolean)))

  if (uniqueTopicIds.length === 0) {
    return []
  }

  const chunks: string[][] = []

  for (let i = 0; i < uniqueTopicIds.length; i += CONTENT_IN_QUERY_CHUNK_SIZE) {
    chunks.push(uniqueTopicIds.slice(i, i + CONTENT_IN_QUERY_CHUNK_SIZE))
  }

  const results = await Promise.all(
    chunks.map((chunk) =>
      listContentDocuments<LearningMaterialDocument>(
        COLLECTIONS.LEARNING_MATERIALS,
        [
          Query.equal("topicId", chunk),
          Query.orderAsc("order"),
          Query.orderAsc("createdAt"),
          Query.limit(CONTENT_QUERY_LIMIT),
        ]
      )
    )
  )

  return results.flat()
}

function toContentError(error: unknown, fallback: string) {
  if (isAppwriteContentError(error)) {
    return error
  }

  if (isAppwriteUnauthorizedError(error)) {
    return createAppwriteContentError(
      "request",
      createAppwritePermissionMessage(LEARNING_RESOURCES)
    )
  }

  if (error instanceof Error && error.message) {
    return createAppwriteContentError("request", error.message)
  }

  return createAppwriteContentError("request", fallback)
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export async function listLearningSubjects(
  options: LearningAccessOptions = {}
): Promise<LearningSubject[]> {
  const viewerIsPremium = options.viewerIsPremium === true

  try {
    const { subjects, topicsBySubjectId, materialsByTopicId } =
      await getLearningSnapshot()

    return subjects.map((subject) => {
      const subjectTopics = sortTopics(topicsBySubjectId.get(subject.$id) ?? [])
      const subjectMaterials = subjectTopics.flatMap(
        (topic) => materialsByTopicId.get(topic.$id) ?? []
      )
      const stats = getMaterialStats(subjectMaterials, viewerIsPremium)

      return mapSubjectDocument(
        subject,
        subjectTopics.length,
        stats,
        viewerIsPremium
      )
    })
  } catch (error) {
    if (shouldUseFreeCatalogFallback(error, viewerIsPremium)) {
      return buildFallbackLearningSubjects()
    }

    throw toContentError(error, "Unable to load subjects from Appwrite.")
  }
}

export async function getLearningSubjectById(
  subjectId: string,
  options: LearningAccessOptions = {}
): Promise<LearningSubject | null> {
  try {
    const subjects = await listLearningSubjects(options)

    return subjects.find((subject) => subject.id === subjectId) ?? null
  } catch (error) {
    if (shouldUseFreeCatalogFallback(error, options.viewerIsPremium === true)) {
      return (
        buildFallbackLearningSubjects().find((subject) => subject.id === subjectId) ??
        null
      )
    }

    throw error
  }
}

export async function getLearningTopicById(
  topicId: string,
  options: LearningAccessOptions = {}
): Promise<LearningTopicSummary | null> {
  const viewerIsPremium = options.viewerIsPremium === true

  try {
    const topic = (await tablesDB.getRow({
      databaseId: DB_ID,
      tableId: COLLECTIONS.TOPICS,
      rowId: topicId,
    })) as unknown as TopicDocument
    const materials = sortMaterials(await listRemoteMaterialsByTopicId(topicId))
    const stats = getMaterialStats(materials, viewerIsPremium)
    const visibleMaterials = viewerIsPremium
      ? materials
      : materials.filter((material) => !material.isPremium)

    return mapTopicDocument(
      topic,
      stats,
      viewerIsPremium,
      visibleMaterials[0]?.$id ?? null
    )
  } catch (error) {
    if (isAppwriteContentError(error)) {
      throw error
    }

    if (isAppwriteUnauthorizedError(error)) {
      throw createAppwriteContentError(
        "request",
        createAppwritePermissionMessage(LEARNING_RESOURCES)
      )
    }

    return null
  }
}

export async function listLearningTopicsBySubjectId(
  subjectId: string,
  options: LearningAccessOptions = {}
): Promise<LearningTopicSummary[]> {
  const viewerIsPremium = options.viewerIsPremium === true

  try {
    const topics = sortTopics(await listRemoteTopicsBySubjectId(subjectId))

    if (topics.length === 0) {
      return []
    }

    // Fetch only materials that belong to this subject's topics —
    // previously this called listRemoteMaterials() which loaded the
    // entire collection regardless of subject.
    const topicIds = topics.map((topic) => topic.$id)
    const subjectMaterials = await listRemoteMaterialsByTopicIds(topicIds)
    const materialsByTopicId = new Map<string, LearningMaterialDocument[]>()

    for (const material of subjectMaterials) {
      const current = materialsByTopicId.get(material.topicId) ?? []
      current.push(material)
      materialsByTopicId.set(material.topicId, current)
    }

    return topics.map((topic) => {
      const materials = sortMaterials(materialsByTopicId.get(topic.$id) ?? [])
      const stats = getMaterialStats(materials, viewerIsPremium)
      const visibleMaterials = viewerIsPremium
        ? materials
        : materials.filter((material) => !material.isPremium)

      return mapTopicDocument(
        topic,
        stats,
        viewerIsPremium,
        visibleMaterials[0]?.$id ?? null
      )
    })
  } catch (error) {
    if (shouldUseFreeCatalogFallback(error, viewerIsPremium)) {
      return buildFallbackLearningTopicsBySubjectId(subjectId)
    }

    throw toContentError(error, "Unable to load topics from Appwrite.")
  }
}

export async function listLearningMaterialsByTopicId(
  topicId: string,
  options: LearningAccessOptions = {}
): Promise<LearningMaterial[]> {
  const viewerIsPremium = options.viewerIsPremium === true

  try {
    const materials = await listRemoteMaterialsByTopicId(topicId)

    return sortMaterials(materials).map((material) =>
      mapMaterialDocument(material, viewerIsPremium)
    )
  } catch (error) {
    throw toContentError(
      error,
      "Unable to load learning materials from Appwrite."
    )
  }
}

export async function getLearningTopicDetail(
  topicId: string,
  options: LearningAccessOptions = {}
): Promise<LearningTopicDetail | null> {
  const viewerIsPremium = options.viewerIsPremium === true

  try {
    const topic = (await tablesDB.getRow({
      databaseId: DB_ID,
      tableId: COLLECTIONS.TOPICS,
      rowId: topicId,
    })) as unknown as TopicDocument

    const subject = (await tablesDB.getRow({
      databaseId: DB_ID,
      tableId: COLLECTIONS.SUBJECTS,
      rowId: topic.subjectId,
    })) as unknown as SubjectDocument

    const materials = await listRemoteMaterialsByTopicId(topic.$id)
    const orderedMaterials = sortMaterials(materials)
    const stats = getMaterialStats(orderedMaterials, viewerIsPremium)
    const visibleMaterials = viewerIsPremium
      ? orderedMaterials
      : orderedMaterials.filter((material) => !material.isPremium)

    return {
      subject: mapSubjectDocument(subject, 1, stats, viewerIsPremium),
      topic: mapTopicDocument(
        topic,
        stats,
        viewerIsPremium,
        visibleMaterials[0]?.$id ?? null
      ),
      materials: orderedMaterials.map((material) =>
        mapMaterialDocument(material, viewerIsPremium)
      ),
    }
  } catch (error) {
    throw toContentError(error, "Unable to load topic detail from Appwrite.")
  }
}

export async function getLearningMaterialDetail(
  materialId: string,
  options: LearningAccessOptions = {}
): Promise<LearningMaterialDetail | null> {
  const viewerIsPremium = options.viewerIsPremium === true

  try {
    // Step 1: fetch material
    const material = (await tablesDB.getRow({
      databaseId: DB_ID,
      tableId: COLLECTIONS.LEARNING_MATERIALS,
      rowId: materialId,
    })) as unknown as LearningMaterialDocument

    // Step 2: fetch topic + sibling materials in parallel (both only need material.topicId)
    const [topic, topicMaterials] = await Promise.all([
      tablesDB
        .getRow({
          databaseId: DB_ID,
          tableId: COLLECTIONS.TOPICS,
          rowId: material.topicId,
        })
        .then((row) => row as unknown as TopicDocument),
      listRemoteMaterialsByTopicId(material.topicId),
    ])

    // Step 3: fetch subject (depends on topic.subjectId from step 2)
    const subject = (await tablesDB.getRow({
      databaseId: DB_ID,
      tableId: COLLECTIONS.SUBJECTS,
      rowId: topic.subjectId,
    })) as unknown as SubjectDocument

    const orderedTopicMaterials = sortMaterials(topicMaterials)
    const stats = getMaterialStats(orderedTopicMaterials, viewerIsPremium)
    const visibleMaterials = viewerIsPremium
      ? orderedTopicMaterials
      : orderedTopicMaterials.filter((item) => !item.isPremium)

    let resolvedMaterial = mapMaterialDocument(material, viewerIsPremium)
    const functionMaterial = await resolveMaterialAccessViaFunction(material.$id)

    if (functionMaterial?.kind === "success") {
      resolvedMaterial = functionMaterial.material
    } else if (functionMaterial?.kind === "denied") {
      resolvedMaterial = {
        ...mapMaterialDocument(material, false),
        isPremium: material.isPremium,
      }
    }

    return {
      subject: mapSubjectDocument(subject, 1, stats, viewerIsPremium),
      topic: mapTopicDocument(
        topic,
        stats,
        viewerIsPremium,
        visibleMaterials[0]?.$id ?? null
      ),
      material: resolvedMaterial,
    }
  } catch (error) {
    throw toContentError(
      error,
      "Unable to load learning material detail from Appwrite."
    )
  }
}
