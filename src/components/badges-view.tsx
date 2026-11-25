import { BADGE_GROUPS, BADGES, badgeProgress } from "../../badges.js"
import { AppHeader, ThemeToggle } from "@/components/app-header"
import type { UserMilestone } from "@/components/ui/milestone-badge"
import { MilestoneGrid } from "@/components/ui/milestone-grid"
import { type useMathFeed } from "@/hooks/use-mathfeed"
import {
  BADGE_ICONS,
  badgeColor,
  badgeName,
  groupTitle,
  type Badge,
} from "@/lib/badge-display"
import { t } from "@/lib/i18n"
import { berlinDateKey } from "@/lib/mathfeed-state"

type Feed = ReturnType<typeof useMathFeed>

// One scrollable page of badge groups: earned badges are coloured, open ones grey with their progress ring.
export default function BadgesView({ feed }: { feed: Feed }) {
  const { state } = feed
  const today = berlinDateKey()
  const earned = BADGES.filter((badge) => state.rewards.badges[badge.id]).length

  const toMilestone = (badge: Badge, title: string): UserMilestone => {
    const name = badgeName(badge)
    const achievedAt = state.rewards.badges[badge.id] ?? null
    const progress = Math.round(badgeProgress(badge, state, today) * 100)
    return {
      id: badge.id,
      name,
      icon: BADGE_ICONS[badge.metric],
      color: badgeColor(badge),
      progress,
      achievedAt,
      label: t(achievedAt ? "badgeEarnedLabel" : "badgeLockedLabel", {
        group: title,
        name,
        progress,
      }),
    }
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      <AppHeader>
        <h1 className="flex items-baseline gap-2 text-lg font-semibold">
          {t("navBadges")}
          <span className="text-xs font-medium tabular-nums text-muted-foreground">
            {t("badgesCount", { earned, total: BADGES.length })}
          </span>
        </h1>
        <ThemeToggle />
      </AppHeader>
      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 pt-2 pb-4">
        {BADGE_GROUPS.map((group) => {
          const title = groupTitle(group)
          return (
            <section key={group.id} className="mb-5 last:mb-0">
              <h2 className="mb-2 text-sm font-medium text-muted-foreground">{title}</h2>
              <MilestoneGrid
                aria-label={title}
                className="short:grid-cols-5"
                milestones={BADGES.filter((badge) => badge.group === group.id).map(
                  (badge) => toMilestone(badge, title)
                )}
              />
            </section>
          )
        })}
      </div>
    </div>
  )
}
