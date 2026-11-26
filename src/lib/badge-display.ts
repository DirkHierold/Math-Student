import {
  CalendarCheck,
  Clock,
  Crown,
  Flame,
  ListChecks,
  Medal,
  Star,
  Zap,
  type LucideIcon,
} from "lucide-react"

import { BADGE_GROUPS, BADGES } from "../../badges.js"
import { locale, t, type MessageKey } from "@/lib/i18n"
import { topicColor, topicName } from "@/lib/series"

export type Badge = (typeof BADGES)[number]
export type BadgeGroup = (typeof BADGE_GROUPS)[number]

export const BADGE_ICONS: Record<Badge["metric"], LucideIcon> = {
  topic: Star,
  total: Crown,
  tasks: ListChecks,
  days: CalendarCheck,
  minutes: Clock,
  dayStreak: Flame,
  correctStreak: Zap,
  allLevel: Medal,
}

// Topic badges wear their topic colour; every other group has its own medal colour.
const GROUP_COLORS: Record<string, string> = {
  total: "oklch(0.55 0.22 293)",
  tasks: "oklch(0.6 0.17 250)",
  days: "oklch(0.62 0.15 165)",
  hours: "oklch(0.6 0.13 215)",
  dayStreak: "oklch(0.7 0.19 47)",
  taskStreak: "oklch(0.62 0.2 350)",
  all: "oklch(0.74 0.15 80)",
}

const GROUP_TITLES: Record<string, MessageKey> = {
  total: "badgeGroupTotal",
  tasks: "badgeGroupTasks",
  days: "badgeGroupDays",
  hours: "badgeGroupHours",
  dayStreak: "badgeGroupDayStreak",
  taskStreak: "badgeGroupTaskStreak",
  all: "badgeGroupAll",
}

const number = new Intl.NumberFormat(locale)

export const groupTitle = (group: BadgeGroup) =>
  group.type ? topicName(group.type) : t(GROUP_TITLES[group.id])

export const badgeGroupTitle = (badge: Badge) =>
  badge.type ? topicName(badge.type) : t(GROUP_TITLES[badge.group])

export const badgeName = (badge: Badge) =>
  t(badge.label as MessageKey, { n: number.format(badge.n) })

export const badgeColor = (badge: Badge) =>
  badge.type ? topicColor(badge.type) : GROUP_COLORS[badge.group]
