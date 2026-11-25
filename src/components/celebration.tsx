import { useEffect } from "react"
import { Flame } from "lucide-react"

import { STREAK_BONUS } from "../../adaptive.js"
import { badgeById } from "../../badges.js"
import { type Celebration } from "@/hooks/use-mathfeed"
import {
  BADGE_ICONS,
  badgeColor,
  badgeGroupTitle,
  badgeName,
} from "@/lib/badge-display"
import { celebrate } from "@/lib/celebrate"
import { t } from "@/lib/i18n"
import { topicName } from "@/lib/series"

// One party screen per praise (streak bonus or new badge), with confetti for as long as it is shown.
// Give it a `key` per item so the pop animation and confetti restart for the next one in the queue.
export function CelebrationContent({ celebration }: { celebration: Celebration }) {
  useEffect(() => {
    let active = true
    celebrate(() => active)
    return () => {
      active = false
    }
  }, [])

  if (celebration.kind === "streak") {
    return (
      <div className="animate-pop text-center text-success">
        <Flame className="mx-auto size-14" aria-hidden="true" />
        <p className="mt-2 text-lg font-semibold">{t("streakBonusTitle")}</p>
        <p className="text-lg font-semibold">{topicName(celebration.type)}</p>
        <p className="text-6xl font-bold">{t("streakBonus", { n: STREAK_BONUS })}</p>
      </div>
    )
  }

  const badge = badgeById(celebration.id)
  if (!badge) return null
  const Icon = BADGE_ICONS[badge.metric]
  const color = badgeColor(badge)
  const group = badgeGroupTitle(badge)
  const name = badgeName(badge)
  return (
    <div
      className="animate-pop text-center"
      aria-label={t("badgeNewLabel", { group, name })}
    >
      <p className="text-lg font-semibold" style={{ color }}>
        {t("badgeNewTitle")}
      </p>
      <div
        className="mx-auto mt-3 grid size-28 place-items-center rounded-full text-white ring-4 ring-offset-4 ring-offset-background short:size-20"
        style={{ backgroundColor: color, ["--tw-ring-color" as string]: color }}
        aria-hidden="true"
      >
        <Icon className="size-14 short:size-10" strokeWidth={2.2} />
      </div>
      <p className="mt-4 text-lg font-semibold text-muted-foreground short:mt-2">{group}</p>
      <p className="text-4xl font-bold text-balance short:text-3xl">{name}</p>
    </div>
  )
}
