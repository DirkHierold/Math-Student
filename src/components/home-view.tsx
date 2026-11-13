import { Check } from "lucide-react"
import { useEffect, useMemo } from "react"

import { recommendedTopic } from "../../session.js"
import { overallLevel, topicLevel } from "../../skills.js"
import { buildChart, levelChange } from "../../level-series.js"
import { AppHeader, ThemeToggle } from "@/components/app-header"
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
const PETAL_DISTANCE = 37

const celebrated = new WeakSet<object>()

// One decision per day: the big button. The ring shows the total level (sum of all category levels) as an incomplete circle (full = every category at 100).
export function HomeView({ feed }: { feed: Feed }) {
  const { state, beginRun, summary } = feed
  const today = berlinDateKey()
  const { rewards, session, skills } = state
  const doneToday = rewards.lastDay === today && !session
  const levelKey = TYPE_KEYS.map(type => `${skills[type].level}:${skills[type].tasks > 0}`).join()
  const suggested = useMemo(() => recommendedTopic(skills) as string | null, [levelKey])
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

  return (
    <div className="flex h-full min-h-0 flex-col">
    <AppHeader>
      <span className="text-lg font-semibold">{t("appName")}</span>
      <ThemeToggle />
    </AppHeader>
    <section className="grid min-h-0 flex-1 grid-rows-[minmax(0,1fr)] gap-4 px-4 pt-6 pb-4 short:items-center">
      <div className="flex min-h-0 flex-col items-center justify-center gap-3 short:gap-2">
        <header className="flex min-h-40 flex-col items-center justify-center text-center short:min-h-0">
          <Check
            className={cn(
              "mx-auto size-9 rounded-full bg-success/15 p-1.5 text-success short:size-7 short:p-1",
              !doneToday && "invisible"
            )}
            aria-hidden="true"
          />
          <h1 className="mt-1 text-xl font-semibold short:text-base">
            {summary ? t("sumTitle") : t("homeMotivation")}
          </h1>
          <p className="mx-auto mt-1 max-w-64 text-xs text-muted-foreground">
            {rewards.runs === 0 && !summary ? t("homeHint") : t("sumChallenge")}
          </p>
        </header>
        <div className="relative aspect-square w-[min(92vw,22rem)] short:w-[min(calc(100dvh-8rem),20rem)]">
          <button
            type="button"
            onClick={() => beginRun(null)}
            aria-label={t("homeMixedStart")}
            className={cn("absolute top-1/2 left-1/2 grid aspect-square w-[32%] -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full outline-none transition-transform active:scale-95 focus-visible:ring-2 focus-visible:ring-ring")}
          >
            {!suggested && <span aria-hidden="true" className="animate-halo pointer-events-none absolute inset-0 rounded-full border-2 border-primary" />}
            <Ring
              fraction={fraction}
              previous={Math.min(1, Math.max(0, (level - (change?.delta ?? 0)) / (TYPE_KEYS.length * 100)))}
              label={t("homeRingLabel", { level })}
            />
            <div className="text-center">
              <p className="relative inline-block text-xl leading-none font-semibold tabular-nums">
                {level}
                {change && change.delta !== 0 && (
                  <span
                    className={cn(
                      "absolute bottom-0 left-full ml-0.5 text-[10px] font-semibold",
                      change.delta > 0 ? "text-success" : "text-destructive"
                    )}
                  >
                    {signed(change.delta)}
                  </span>
                )}
              </p>
              <p className="mt-0.5 max-w-[5.5rem] truncate text-[10px] leading-none text-muted-foreground">
                {t("homeRechenLevel")}
              </p>
            </div>
          </button>
          {TYPE_KEYS.map((type, index) => {
            const angle = (index * 2 * Math.PI) / TYPE_KEYS.length
            const topic = topicLevel(skills[type]) as number
            const topicChange = levelChange((chart.topics[type] ?? []).slice(-2))
            return (
              <button
                key={type}
                type="button"
                onClick={() => beginRun(type)}
                aria-label={t("homeTopicStart", { topic: topicName(type), level: topic })}
                className={cn("absolute grid aspect-square w-[32%] -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full outline-none transition-transform active:scale-95 focus-visible:ring-2 focus-visible:ring-ring")}
                style={{
                  left: `${50 + PETAL_DISTANCE * Math.sin(angle)}%`,
                  top: `${50 - PETAL_DISTANCE * Math.cos(angle)}%`,
                }}
              >
                {type === suggested && (
                <span
                  aria-hidden="true"
                  className="animate-halo pointer-events-none absolute inset-0 rounded-full border-2 border-primary [--halo-scale:1.07]"
                />
                )}
                <Ring
                  fraction={Math.min(1, topic / 100)}
                  previous={Math.min(1, Math.max(0, (topic - (topicChange?.delta ?? 0)) / 100))}
                  label={t("homeTopicRingLabel", {
                    topic: topicName(type),
                    level: topic,
                  })}
                />
                {type === suggested && (
                  <span className="absolute -top-3 rounded-full bg-primary px-2 py-0.5 text-[11px] leading-none font-semibold text-primary-foreground">
                    {t("homeRecommended")}
                  </span>
                )}
                <div className="text-center">
                  <p className="relative inline-block text-xl leading-none font-semibold tabular-nums">
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
                  <p className="mt-0.5 max-w-[5.5rem] truncate text-[10px] leading-none text-muted-foreground">
                    {topicName(type)}
                  </p>
                </div>
              </button>
            )
          })}
        </div>
      </div>
    </section>
    </div>
  )
}

function Ring({
  fraction,
  previous,
  label,
}: {
  fraction: number
  previous: number
  label: string
}) {
  const base = Math.min(fraction, previous)
  const arc = (from: number, to: number, className: string, round = false) =>
    to > from && (
      <circle
        cx="60"
        cy="60"
        r={RADIUS}
        fill="none"
        strokeWidth="9"
        strokeLinecap={round ? "round" : "butt"}
        strokeDasharray={`${(to - from) * CIRCUMFERENCE} ${CIRCUMFERENCE}`}
        strokeDashoffset={-from * CIRCUMFERENCE}
        className={className}
      />
    )
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
      {arc(0, base, "stroke-foreground/70", fraction === previous)}
      {arc(base, Math.max(fraction, previous), fraction >= previous ? "stroke-success" : "stroke-destructive")}
    </svg>
  )
}
