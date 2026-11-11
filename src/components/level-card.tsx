import * as React from "react"

import { buildChart, levelChange, levelRange } from "../../level-series.js"
import { Card, CardContent } from "@/components/ui/card"
import { locale, signed, t } from "@/lib/i18n"
import { topicColor, topicName } from "@/lib/series"
import { cn } from "@/lib/utils"

export type LevelPoint = { day: string; level: number }
export type TopicLevel = {
  type: string
  level: number | undefined
  history: LevelPoint[]
}

type ChartPoint = { x: number; level: number; day: string }

type Series = {
  key: string
  name: string
  level: number | undefined
  color: string
  delta: number
  points: ChartPoint[]
}

const dayFormat = new Intl.DateTimeFormat(locale, {
  day: "numeric",
  month: "short",
  timeZone: "UTC",
})
export const dayLabel = (key: string) =>
  dayFormat.format(new Date(`${key}T12:00:00Z`))

// One time chart with a curve per topic; all curves span the full width. The legend shows level and gain per topic.
export function LevelCard({
  history,
  topics,
  today,
}: {
  history: LevelPoint[]
  topics: TopicLevel[]
  today: string
}) {
  const [focus, setFocus] = React.useState<string | null>(null)

  const chart = buildChart(
    history,
    Object.fromEntries(topics.map((topic) => [topic.type, topic.history])),
    today
  ) as {
    days: number
    start: string
    total: ChartPoint[]
    topics: Record<string, ChartPoint[]>
  }

  const series: Series[] = topics.map((topic) => {
    const points = chart.topics[topic.type] ?? []
    return {
      key: topic.type,
      name: topicName(topic.type),
      level: topic.level,
      color: topicColor(topic.type),
      delta: levelChange(points.slice(-2))?.delta ?? 0,
      points,
    }
  })
  const enough = chart.total.length > 1
  const range = levelRange(series.map((entry) => entry.points))
  const xPercent = (x: number) => ((x + 0.5) / chart.days) * 100
  const yPercent = (value: number) =>
    100 - ((value - range.floor) / range.span) * 100
  const dim = (key: string) => focus !== null && focus !== key

  return (
    <Card className="shrink-0 gap-0 py-0 short:col-start-1 short:row-start-2 short:min-h-0 short:overflow-hidden">
      <CardContent className="grid gap-2 p-4 short:flex short:h-full short:flex-col short:gap-1.5 short:p-3">
        <h2 className="text-sm font-medium">{t("statsLevel")}</h2>
        {enough ? (
          <div className="grid gap-1 short:min-h-0 short:flex-1 short:grid-rows-[minmax(0,1fr)_auto]">
            <div
              role="img"
              aria-label={t("statsCurveLabel")}
              className="relative h-28 border-b border-dashed short:h-auto short:min-h-0"
            >
              <svg
                viewBox="0 0 100 100"
                preserveAspectRatio="none"
                className="absolute inset-0 size-full overflow-visible"
                aria-hidden="true"
              >
                {[...series].reverse().map((entry) =>
                  entry.points.slice(1).map((point, index) => {
                    const from = entry.points[index]
                    return (
                      <line
                        key={`${entry.key}-${index}`}
                        x1={xPercent(from.x)}
                        y1={yPercent(from.level)}
                        x2={xPercent(point.x)}
                        y2={yPercent(point.level)}
                        strokeWidth={2}
                        strokeLinecap="round"
                        vectorEffect="non-scaling-stroke"
                        style={{
                          stroke: entry.color,
                          opacity: dim(entry.key) ? 0.12 : 0.95,
                        }}
                      />
                    )
                  })
                )}
              </svg>
              {series.map((entry) => {
                const last = entry.points.at(-1)
                if (!last) return null
                return (
                  <span
                    key={`${entry.key}-dot`}
                    aria-hidden="true"
                    className="absolute size-2 -translate-x-1/2 -translate-y-1/2 rounded-full"
                    style={{
                      left: `${xPercent(last.x)}%`,
                      top: `${yPercent(last.level)}%`,
                      background: entry.color,
                      opacity: dim(entry.key) ? 0.12 : 1,
                    }}
                  />
                )
              })}
            </div>
            <div
              aria-hidden="true"
              className="flex justify-between text-[10px] text-muted-foreground"
            >
              <span>{dayLabel(chart.start)}</span>
              <span>{t("statsAxisEnd")}</span>
            </div>
          </div>
        ) : (
          <p className="text-xs text-muted-foreground">{t("statsCurveEmpty")}</p>
        )}

        <ul
          aria-label={t("statsTopicsLabel")}
          className="grid grid-cols-[0.625rem_minmax(0,max-content)_auto_auto_minmax(0.5rem,1fr)_0.625rem_minmax(0,max-content)_auto_auto] gap-x-1"
        >
          {series.map((entry, i) => (
            <li
              key={entry.key}
              className={cn(
                "col-span-4 grid grid-cols-subgrid",
                i % 2 === 1 && "col-start-6"
              )}
            >
              <button
                type="button"
                aria-pressed={focus === entry.key}
                onClick={() => setFocus(focus === entry.key ? null : entry.key)}
                className={cn(
                  "col-span-4 grid h-8 w-full grid-cols-subgrid items-center rounded-md text-left text-xs transition-opacity short:h-6",
                  dim(entry.key) && "opacity-40"
                )}
              >
                <span
                  aria-hidden="true"
                  className="h-0.5 w-2.5 rounded-full"
                  style={{ background: entry.color }}
                />
                <span className="truncate">{entry.name}</span>
                <span
                  className={cn(
                    "pl-2 text-right font-semibold tabular-nums",
                    entry.level === undefined &&
                      "font-normal text-muted-foreground"
                  )}
                >
                  {entry.level ?? "–"}
                </span>
                <span
                  className={cn(
                    "min-w-[2.5ch] pl-0.5 text-left font-medium tabular-nums",
                    entry.delta > 0 ? "text-success" : "text-destructive"
                  )}
                >
                  {enough && entry.delta !== 0 ? signed(entry.delta) : ""}
                </span>
              </button>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  )
}
