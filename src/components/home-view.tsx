import { Check } from "lucide-react"
import { useEffect } from "react"

import { overallLevel, topicLevel } from "../../skills.js"
import { buildChart, levelChange } from "../../level-series.js"
import { Button } from "@/components/ui/button"
import { celebrate } from "@/lib/celebrate"
import { type useMathFeed } from "@/hooks/use-mathfeed"
import { berlinDateKey, TYPE_KEYS } from "@/lib/mathfeed-state"
import { signed, t } from "@/lib/i18n"
import { topicName } from "@/lib/series"
import { cn } from "@/lib/utils"

type Feed = ReturnType<typeof useMathFeed>

const RADIUS = 52
const CIRCUMFERENCE = 2 * Math.PI * RADIUS

// Centre distance of the topic rings from the middle, in % of the flower's width.
const PETAL_DISTANCE = 34

const celebrated = new WeakSet<object>()

// One decision per day: the big button. The ring shows the Rechen-Level (sum of all category levels) as an incomplete circle (full = every category at 100).
export function HomeView({ feed }: { feed: Feed }) {
  const { state, beginRun, summary } = feed
  const today = berlinDateKey()
  const { rewards, session, skills } = state
  const doneToday = rewards.lastDay === today && !session
  const inProgress = !!session && session.index > 0
  const level = overallLevel(skills) as number
  const fraction = Math.min(1, level / (TYPE_KEYS.length * 100))
  const chart = buildChart(
    rewards.levelHistory,
    rewards.topicHistory as Record<string, { day: string; level: number }[]>,
    today
  ) as {
    total: { level: number }[]
    topics: Record<string, { level: number }[]>
  }
  const change = levelChange(chart.total.slice(-2))
  useEffect(() => {
    if (!summary || celebrated.has(summary)) return
    celebrated.add(summary)
    celebrate()
  }, [summary])
  const label = inProgress
    ? t("homeContinue")
    : doneToday
      ? t("homeBonus")
      : t("homeStart")

  return (
    <section className="grid h-full min-h-0 grid-rows-[minmax(0,1fr)_auto] gap-4 px-4 pt-4 pb-4 short:grid-cols-2 short:grid-rows-1 short:items-center short:gap-x-6">
      <div className="flex min-h-0 flex-col items-center justify-center gap-3 short:gap-2">
        <header className="text-center">
          <Check
            className={cn(
              "mx-auto size-9 rounded-full bg-success/15 p-1.5 text-success short:size-7 short:p-1",
              !doneToday && "invisible"
            )}
            aria-hidden="true"
          />
          <h1 className="mt-1 text-xl font-semibold short:text-base">
            {doneToday
              ? summary?.kind === "bonus"
                ? t("sumBonusTitle")
                : t("sumTitle")
              : t("homeMotivation")}
          </h1>
          <p className="mx-auto mt-1 max-w-64 text-xs text-muted-foreground">
            {t("sumChallenge")}
          </p>
        </header>
        <div className="relative aspect-square w-[min(92vw,22rem)] short:w-[min(calc(100dvh-8rem),20rem)]">
          <div className="absolute top-1/2 left-1/2 grid aspect-square w-[40%] -translate-x-1/2 -translate-y-1/2 place-items-center">
            <Ring
              fraction={fraction}
              label={t("homeRingLabel", { level })}
            />
            <div className="text-center">
              <p className="text-[10px] text-muted-foreground sm:text-xs">
                {t("homeRechenLevel")}
              </p>
              <p className="relative inline-block text-4xl leading-none font-semibold tabular-nums">
                {level}
                {change && change.delta !== 0 && (
                  <span
                    className={cn(
                      "absolute bottom-0.5 left-full ml-0.5 text-sm font-semibold",
                      change.delta > 0 ? "text-success" : "text-destructive"
                    )}
                  >
                    {signed(change.delta)}
                  </span>
                )}
              </p>
              <p
                className={cn(
                  "mt-1 text-[10px] text-muted-foreground tabular-nums",
                  !(inProgress && session) && "invisible"
                )}
              >
                {session ? `${session.index}/${session.length}` : "0/0"}
              </p>
            </div>
          </div>
          {TYPE_KEYS.map((type, index) => {
            const angle = (index * 2 * Math.PI) / TYPE_KEYS.length
            const topic = topicLevel(skills[type]) as number
            const topicChange = levelChange((chart.topics[type] ?? []).slice(-2))
            return (
              <div
                key={type}
                className="absolute grid aspect-square w-[24%] -translate-x-1/2 -translate-y-1/2 place-items-center"
                style={{
                  left: `${50 + PETAL_DISTANCE * Math.sin(angle)}%`,
                  top: `${50 - PETAL_DISTANCE * Math.cos(angle)}%`,
                }}
              >
                <Ring
                  fraction={Math.min(1, topic / 100)}
                  label={t("homeTopicRingLabel", {
                    topic: topicName(type),
                    level: topic,
                  })}
                />
                <div className="text-center">
                  <p className="relative inline-block text-lg leading-none font-semibold tabular-nums">
                    {topic}
                    {topicChange && topicChange.delta !== 0 && (
                      <span
                        className={cn(
                          "absolute bottom-0 left-full ml-0.5 text-[10px] font-semibold",
                          topicChange.delta > 0 ? "text-success" : "text-destructive"
                        )}
                      >
                        {signed(topicChange.delta)}
                      </span>
                    )}
                  </p>
                  <p className="mt-0.5 max-w-[4.5rem] truncate text-[9px] leading-none text-muted-foreground">
                    {topicName(type)}
                  </p>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      <div>
        <Button
          size="lg"
          variant={doneToday ? "outline" : "default"}
          onClick={beginRun}
          className="animate-invite h-14 w-full rounded-2xl text-lg font-semibold"
        >
          {label}
        </Button>
      </div>
    </section>
  )
}

function Ring({ fraction, label }: { fraction: number; label: string }) {
  return (
    <svg
      viewBox="0 0 120 120"
      className="absolute inset-0 size-full -rotate-90"
      role="img"
      aria-label={label}
    >
      <circle
        cx="60"
        cy="60"
        r={RADIUS}
        fill="none"
        strokeWidth="9"
        className="stroke-muted"
      />
      <circle
        cx="60"
        cy="60"
        r={RADIUS}
        fill="none"
        strokeWidth="9"
        strokeLinecap="round"
        strokeDasharray={CIRCUMFERENCE}
        strokeDashoffset={CIRCUMFERENCE * (1 - fraction)}
        className="stroke-foreground/70 transition-[stroke-dashoffset] duration-500"
      />
    </svg>
  )
}
