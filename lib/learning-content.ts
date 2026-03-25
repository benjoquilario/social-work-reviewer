import {
  COLLECTIONS,
  createAppwriteContentError,
  createAppwritePermissionMessage,
  databases,
  DB_ID,
  getAppwriteConfigurationError,
  isAppwriteContentError,
  isAppwriteUnauthorizedError,
  Query,
} from "./appwrite"
import {
  type LearningMaterialDocument,
  type LearningMaterialType,
  type SubjectDocument,
  type TopicDocument,
} from "./schema"

const CONTENT_QUERY_LIMIT = 500
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
  materialCount: number,
  freeMaterialCount: number,
  premiumMaterialCount: number,
  viewerIsPremium: boolean
): LearningSubject {
  return {
    id: subject.$id,
    name: subject.name,
    description: subject.description ?? "",
    iconUrl: subject.iconUrl ?? null,
    order: subject.order,
    topicCount,
    materialCount,
    freeMaterialCount,
    premiumMaterialCount,
    hasPremiumContent: premiumMaterialCount > 0,
    isLocked: !viewerIsPremium && materialCount > 0 && freeMaterialCount === 0,
  }
}

function mapTopicDocument(
  topic: TopicDocument,
  materialCount: number,
  freeMaterialCount: number,
  premiumMaterialCount: number,
  viewerIsPremium: boolean,
  primaryMaterialId: string | null
): LearningTopicSummary {
  return {
    id: topic.$id,
    subjectId: topic.subjectId,
    title: topic.title,
    description: topic.description ?? "",
    order: topic.order,
    materialCount,
    freeMaterialCount,
    premiumMaterialCount,
    hasPremiumContent: premiumMaterialCount > 0,
    isLocked: !viewerIsPremium && materialCount > 0 && freeMaterialCount === 0,
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
    type: material.type,
    fileUrl: isLocked ? null : (material.fileUrl ?? null),
    content: isLocked ? "" : (material.content ?? ""),
    isPremium: material.isPremium,
    isLocked,
    createdAt: material.createdAt,
  }
}

type LearningAccessOptions = {
  viewerIsPremium?: boolean
}

function sortTopics(topics: TopicDocument[]) {
  return [...topics].sort((left, right) => left.order - right.order)
}

function sortMaterials(materials: LearningMaterialDocument[]) {
  return [...materials].sort((left, right) => {
    return (
      new Date(left.createdAt).getTime() - new Date(right.createdAt).getTime()
    )
  })
}

function getMaterialStats(
  materials: LearningMaterialDocument[],
  viewerIsPremium: boolean
) {
  const freeMaterialCount = materials.filter(
    (material) => !material.isPremium
  ).length
  const premiumMaterialCount = materials.length - freeMaterialCount
  const visibleMaterialCount = viewerIsPremium
    ? materials.length
    : freeMaterialCount

  return {
    freeMaterialCount,
    premiumMaterialCount,
    visibleMaterialCount,
  }
}

async function getLearningSnapshot() {
  ensureLearningContentConfigured()

  const [subjects, topics, materials] = await Promise.all([
    listRemoteSubjects(),
    databases
      .listDocuments(DB_ID, COLLECTIONS.TOPICS, [
        Query.orderAsc("order"),
        Query.limit(CONTENT_QUERY_LIMIT),
      ])
      .then((result) => result.documents as unknown as TopicDocument[]),
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

async function listRemoteSubjects() {
  ensureLearningContentConfigured()

  const { documents } = await databases.listDocuments(
    DB_ID,
    COLLECTIONS.SUBJECTS,
    [Query.orderAsc("order"), Query.limit(CONTENT_QUERY_LIMIT)]
  )

  return documents as unknown as SubjectDocument[]
}

async function listRemoteTopicsBySubjectId(subjectId: string) {
  ensureLearningContentConfigured()

  const { documents } = await databases.listDocuments(
    DB_ID,
    COLLECTIONS.TOPICS,
    [
      Query.equal("subjectId", subjectId),
      Query.orderAsc("order"),
      Query.limit(CONTENT_QUERY_LIMIT),
    ]
  )

  return documents as unknown as TopicDocument[]
}

async function listRemoteMaterials() {
  ensureLearningContentConfigured()

  const { documents } = await databases.listDocuments(
    DB_ID,
    COLLECTIONS.LEARNING_MATERIALS,
    [Query.orderAsc("createdAt"), Query.limit(CONTENT_QUERY_LIMIT)]
  )

  return documents as unknown as LearningMaterialDocument[]
}

async function listRemoteMaterialsByTopicId(topicId: string) {
  ensureLearningContentConfigured()

  const { documents } = await databases.listDocuments(
    DB_ID,
    COLLECTIONS.LEARNING_MATERIALS,
    [
      Query.equal("topicId", topicId),
      Query.orderAsc("createdAt"),
      Query.limit(CONTENT_QUERY_LIMIT),
    ]
  )

  return documents as unknown as LearningMaterialDocument[]
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
        subjectMaterials.length,
        stats.freeMaterialCount,
        stats.premiumMaterialCount,
        viewerIsPremium
      )
    })
  } catch (error) {
    throw toContentError(error, "Unable to load subjects from Appwrite.")
  }
}

export async function getLearningSubjectById(
  subjectId: string,
  options: LearningAccessOptions = {}
): Promise<LearningSubject | null> {
  const subjects = await listLearningSubjects(options)

  return subjects.find((subject) => subject.id === subjectId) ?? null
}

export async function getLearningTopicById(
  topicId: string,
  options: LearningAccessOptions = {}
): Promise<LearningTopicSummary | null> {
  const viewerIsPremium = options.viewerIsPremium === true

  try {
    const topic = (await databases.getDocument(
      DB_ID,
      COLLECTIONS.TOPICS,
      topicId
    )) as unknown as TopicDocument
    const materials = sortMaterials(await listRemoteMaterialsByTopicId(topicId))
    const stats = getMaterialStats(materials, viewerIsPremium)
    const visibleMaterials = viewerIsPremium
      ? materials
      : materials.filter((material) => !material.isPremium)

    return mapTopicDocument(
      topic,
      materials.length,
      stats.freeMaterialCount,
      stats.premiumMaterialCount,
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
    const allMaterials = await listRemoteMaterials()
    const materialsByTopicId = new Map<string, LearningMaterialDocument[]>()

    for (const material of allMaterials) {
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
        materials.length,
        stats.freeMaterialCount,
        stats.premiumMaterialCount,
        viewerIsPremium,
        visibleMaterials[0]?.$id ?? null
      )
    })
  } catch (error) {
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
    const topic = (await databases.getDocument(
      DB_ID,
      COLLECTIONS.TOPICS,
      topicId
    )) as unknown as TopicDocument

    const subject = (await databases.getDocument(
      DB_ID,
      COLLECTIONS.SUBJECTS,
      topic.subjectId
    )) as unknown as SubjectDocument

    const materials = await listRemoteMaterialsByTopicId(topic.$id)
    const orderedMaterials = sortMaterials(materials)
    const stats = getMaterialStats(orderedMaterials, viewerIsPremium)
    const visibleMaterials = viewerIsPremium
      ? orderedMaterials
      : orderedMaterials.filter((material) => !material.isPremium)

    return {
      subject: mapSubjectDocument(
        subject,
        1,
        orderedMaterials.length,
        stats.freeMaterialCount,
        stats.premiumMaterialCount,
        viewerIsPremium
      ),
      topic: mapTopicDocument(
        topic,
        orderedMaterials.length,
        stats.freeMaterialCount,
        stats.premiumMaterialCount,
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
    const material = (await databases.getDocument(
      DB_ID,
      COLLECTIONS.LEARNING_MATERIALS,
      materialId
    )) as unknown as LearningMaterialDocument

    const topic = (await databases.getDocument(
      DB_ID,
      COLLECTIONS.TOPICS,
      material.topicId
    )) as unknown as TopicDocument

    const subject = (await databases.getDocument(
      DB_ID,
      COLLECTIONS.SUBJECTS,
      topic.subjectId
    )) as unknown as SubjectDocument

    const topicMaterials = await listRemoteMaterialsByTopicId(topic.$id)
    const orderedTopicMaterials = sortMaterials(topicMaterials)
    const stats = getMaterialStats(orderedTopicMaterials, viewerIsPremium)
    const visibleMaterials = viewerIsPremium
      ? orderedTopicMaterials
      : orderedTopicMaterials.filter((item) => !item.isPremium)

    return {
      subject: mapSubjectDocument(
        subject,
        1,
        orderedTopicMaterials.length,
        stats.freeMaterialCount,
        stats.premiumMaterialCount,
        viewerIsPremium
      ),
      topic: mapTopicDocument(
        topic,
        orderedTopicMaterials.length,
        stats.freeMaterialCount,
        stats.premiumMaterialCount,
        viewerIsPremium,
        visibleMaterials[0]?.$id ?? null
      ),
      material: mapMaterialDocument(material, viewerIsPremium),
    }
  } catch (error) {
    throw toContentError(
      error,
      "Unable to load learning material detail from Appwrite."
    )
  }
}
