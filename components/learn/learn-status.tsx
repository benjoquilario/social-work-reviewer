import BookOpenText from "lucide-react-native/icons/book-open-text"
import CirclePlay from "lucide-react-native/icons/circle-play"
import FileText from "lucide-react-native/icons/file-text"
import Link2 from "lucide-react-native/icons/link-2"
import NotebookPen from "lucide-react-native/icons/notebook-pen"
import type { LearningMaterialStatusSnapshot } from "@/lib/progress"
import type { Tone } from "@/lib/tone"

export type MaterialStatusPresentation = {
  tone: Tone
  label: string
  isCompleted: boolean
}

/**
 * One reading of a material's progress.
 *
 * The topic list, the lesson header and the profile timeline each used to
 * build this chip themselves out of raw `withOpacity(theme.success, 0.16)`
 * calls — which is how "paused" came out amber in one place, grey in another,
 * and how the same state got three different labels. Returning a `Tone` hands
 * the coloring to `Badge`, so a status reads identically everywhere.
 */
export function getMaterialStatusPresentation(
  status: LearningMaterialStatusSnapshot | null | undefined
): MaterialStatusPresentation {
  if (!status) {
    return { tone: "muted", label: "Not started", isCompleted: false }
  }

  if (status.status === "completed") {
    return { tone: "success", label: "Completed", isCompleted: true }
  }

  const percent = Math.round(status.progressPercent)

  if (status.status === "paused") {
    return {
      tone: "warning",
      label: `Paused · ${percent}%`,
      isCompleted: false,
    }
  }

  return {
    tone: "primary",
    label: `In progress · ${percent}%`,
    isCompleted: false,
  }
}

const MATERIAL_TYPE_META: Record<
  string,
  { label: string; Icon: typeof NotebookPen }
> = {
  note: { label: "Note", Icon: NotebookPen },
  video: { label: "Video", Icon: CirclePlay },
  pdf: { label: "PDF", Icon: FileText },
  link: { label: "Link", Icon: Link2 },
}

const FALLBACK_TYPE = { label: "Material", Icon: BookOpenText }

/** Keyed by string, not by the union — the type column is CMS-authored. */
export function getMaterialTypeMeta(type: string) {
  return MATERIAL_TYPE_META[type] ?? FALLBACK_TYPE
}

export function MaterialTypeIcon({
  type,
  color,
  size = 16,
}: {
  type: string
  color: string
  size?: number
}) {
  const { Icon } = getMaterialTypeMeta(type)

  return <Icon size={size} color={color} />
}
