import BookOpenText from "lucide-react-native/icons/book-open-text"
import ChartColumnIncreasing from "lucide-react-native/icons/chart-column-increasing"
import ListChecks from "lucide-react-native/icons/list-checks"
import MessagesSquare from "lucide-react-native/icons/messages-square"
import Newspaper from "lucide-react-native/icons/newspaper"
import type { QuickAccessItem } from "@/lib/home-types"

export const QUICK_ACCESS_ITEMS: QuickAccessItem[] = [
  {
    Icon: BookOpenText,
    eyebrow: "Study flow",
    label: "Review Content",
    sub: "Open concise topic-based materials",
    actionLabel: "Start learning",
    path: "/learn",
    tone: "primary",
  },
  {
    Icon: ChartColumnIncreasing,
    eyebrow: "Progress view",
    label: "Dashboard",
    sub: "Track momentum and weaker areas",
    actionLabel: "View insights",
    path: "/dashboard",
    tone: "support",
  },
  {
    Icon: MessagesSquare,
    eyebrow: "Peer space",
    label: "Community",
    sub: "Ask, reply, and learn with peers",
    actionLabel: "Join the feed",
    path: "/community",
    tone: "primary",
  },
  {
    Icon: ListChecks,
    eyebrow: "Exam prep",
    label: "Board Exams",
    sub: "Select a set and enter timed mode",
    actionLabel: "Practice now",
    path: "/board-exams",
    tone: "accent",
  },
  {
    Icon: Newspaper,
    eyebrow: "Fresh updates",
    label: "Latest News",
    sub: "Catch fresh releases and updates",
    actionLabel: "Read headlines",
    path: "/news",
    tone: "support",
  },
]
