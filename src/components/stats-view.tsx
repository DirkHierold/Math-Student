import { CalendarDays, Check, Monitor, Moon, Sun, Timer } from "lucide-react"
import {
  Bar,
  BarChart,
  CartesianGrid,
  LabelList,
  XAxis,
  YAxis,
} from "recharts"

import { formatCompactDuration } from "../../format.js"
import { getRollingDateKeys } from "../../stats-data.js"
import { useTheme } from "@/components/theme-provider"
import { TypeGlyph, typeName } from "@/components/task-types"
import { Card, CardContent } from "@/components/ui/card"
import { ChartContainer, type ChartConfig } from "@/components/ui/chart"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { type useMathFeed } from "@/hooks/use-mathfeed"
import { locale, t } from "@/lib/i18n"
import { TYPE_KEYS, berlinDateKey, dailyFor } from "@/lib/mathfeed-state"
import { cn } from "@/lib/utils"

type StatsViewProps = {
  feed: ReturnType<typeof useMathFeed>
}

const chartConfig = {
  correct: { label: t("correct"), color: "var(--success)" },
  errors: { label: t("errors"), color: "var(--destructive)" },
} satisfies ChartConfig

const weekday = new Intl.DateTimeFormat(locale, {
  weekday: "short",
  timeZone: "UTC",
})

export default function StatsView({ feed }: StatsViewProps) {
  const { state, daily } = feed
  const todayKey = berlinDateKey()

  const sumSteps = (stats: typeof daily, field: "correct" | "errors") =>
    TYPE_KEYS.reduce((sum, type) => sum + stats.steps[type][field], 0)

  const weekData = getRollingDateKeys(todayKey).map((key: string) => {
    const [year, month, day] = key.split("-").map(Number)
    const stats = dailyFor(state, key)
    const correct = sumSteps(stats, "correct")
    const errors = sumSteps(stats, "errors")
    return {
      key,
      label: weekday
        .format(new Date(Date.UTC(year, month - 1, day)))
        .replace(".", ""),
      correct,
      errors,
      total: correct + errors,
    }
  })

  const typeData = TYPE_KEYS.map((type) => ({
    type,
    correct: daily.steps[type].correct,
    errors: daily.steps[type].errors,
  }))
  const typeMax = Math.max(1, ...typeData.map((row) => row.correct + row.errors))
  const totalSteps = sumSteps(daily, "correct") + sumSteps(daily, "errors")
  const weekMax = Math.max(0, ...weekData.map((entry) => entry.total))

  return (
    <div className="flex h-full min-h-0 flex-col gap-2 px-4 pt-2 pb-3 short:grid short:grid-cols-2 short:grid-rows-[auto_auto_minmax(0,1fr)] short:gap-x-4">
      <header className="flex h-11 shrink-0 short:col-start-1 items-center justify-between gap-3">
        <div className="flex items-center gap-3 text-sm text-muted-foreground">
          <LegendItem color="bg-success" label={t("correct")} />
          <LegendItem color="bg-destructive" label={t("errors")} />
        </div>
        <ThemeToggle />
      </header>

      <div className="grid shrink-0 grid-cols-2 gap-2 short:col-start-1">
        <SummaryCard
          icon={<Check />}
          value={String(totalSteps)}
          label={t("kpiAnswers")}
        />
        <SummaryCard
          icon={<Timer />}
          value={formatCompactDuration(daily.seconds)}
          label={t("kpiTime")}
        />
      </div>

      <Card className="min-h-0 flex-1 gap-0 py-0 short:col-start-2 short:row-span-3 short:row-start-1">
        <CardTitleRow icon={<CalendarDays />} title={t("statsWeek")} />
        <CardContent className="relative min-h-0 flex-1 px-2 pb-2">
          <ChartContainer
            config={chartConfig}
            className="absolute inset-x-2 top-0 bottom-2 aspect-auto h-auto w-[calc(100%-1rem)]"
            role="img"
            aria-label={t("statsWeekLabel")}
          >
            <BarChart
              data={weekData}
              margin={{ top: 18, right: 4, bottom: 0, left: 4 }}
              accessibilityLayer
            >
              <CartesianGrid vertical={false} />
              <XAxis
                dataKey="key"
                tickLine={false}
                axisLine={false}
                tickMargin={6}
                interval={0}
                tick={({ x, y, payload }) => {
                  const entry = weekData.find((item) => item.key === payload.value)
                  const today = payload.value === todayKey
                  return (
                    <text
                      x={x}
                      y={Number(y) + 10}
                      textAnchor="middle"
                      className={cn(
                        "text-xs",
                        today
                          ? "fill-foreground font-semibold"
                          : "fill-muted-foreground"
                      )}
                    >
                      {entry?.label}
                    </text>
                  )
                }}
              />
              <YAxis
                hide
                allowDecimals={false}
                domain={[0, Math.max(4, Math.ceil(weekMax * 1.15))]}
              />
              <Bar
                dataKey="correct"
                stackId="steps"
                fill="var(--color-correct)"
                radius={[0, 0, 4, 4]}
                isAnimationActive={false}
              />
              <Bar
                dataKey="errors"
                stackId="steps"
                fill="var(--color-errors)"
                radius={[4, 4, 0, 0]}
                isAnimationActive={false}
              >
                <LabelList
                  dataKey="total"
                  position="top"
                  className="fill-foreground text-xs font-medium"
                  formatter={(value: unknown) => (Number(value) > 0 ? String(value) : "")}
                />
              </Bar>
            </BarChart>
          </ChartContainer>
        </CardContent>
      </Card>

      <Card className="shrink-0 gap-0 py-0 short:col-start-1 short:row-start-3">
        <CardTitleRow icon={<Check />} title={t("statsToday")} />
        <CardContent
          className="flex min-h-0 flex-1 flex-col justify-around gap-2 px-4 pb-3 short:gap-1"
          role="list"
          aria-label={t("statsTypeLabel")}
        >
          {typeData.map(({ type, correct, errors }) => (
            <div
              key={type}
              role="listitem"
              className="flex items-center gap-3"
            >
              <TypeGlyph type={type} className="w-11 shrink-0" />
              <span className="sr-only">
                {typeName(type)}: {correct} {t("correct")}, {errors} {t("errors")}
              </span>
              <div
                className="flex h-3 flex-1 overflow-hidden rounded-full bg-muted"
                aria-hidden="true"
              >
                <span
                  className="bg-success"
                  style={{ width: `${(correct / typeMax) * 100}%` }}
                />
                <span
                  className="bg-destructive"
                  style={{ width: `${(errors / typeMax) * 100}%` }}
                />
              </div>
              <span
                className="w-6 text-right text-sm font-medium tabular-nums"
                aria-hidden="true"
              >
                {correct + errors}
              </span>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  )
}

function ThemeToggle() {
  const { theme, setTheme } = useTheme()
  const options = [
    { value: "light", icon: Sun, label: t("themeLight") },
    { value: "dark", icon: Moon, label: t("themeDark") },
    { value: "system", icon: Monitor, label: t("themeSystem") },
  ] as const
  return (
    <ToggleGroup
      type="single"
      variant="outline"
      spacing={0}
      value={theme}
      onValueChange={(value) => value && setTheme(value as typeof theme)}
      aria-label={t("themeLabel")}
    >
      {options.map(({ value, icon: Icon, label }) => (
        <ToggleGroupItem
          key={value}
          value={value}
          aria-label={label}
          className="size-11"
        >
          <Icon className="size-5" />
        </ToggleGroupItem>
      ))}
    </ToggleGroup>
  )
}

function LegendItem({ color, label }: { color: string; label: string }) {
  return (
    <span className="flex items-center gap-1.5">
      <span className={cn("size-2.5 rounded-full", color)} aria-hidden="true" />
      {label}
    </span>
  )
}

function CardTitleRow({
  icon,
  title,
}: {
  icon: React.ReactNode
  title: string
}) {
  return (
    <h2 className="flex shrink-0 items-center gap-2 px-4 pt-3 pb-1 text-sm font-medium [&_svg]:size-4 [&_svg]:text-muted-foreground">
      {icon}
      {title}
    </h2>
  )
}

function SummaryCard({
  icon,
  value,
  label,
}: {
  icon: React.ReactNode
  value: string
  label: string
}) {
  return (
    <Card size="sm" className="py-2">
      <CardContent className="flex-row items-center gap-3">
        <span className="grid size-9 place-items-center rounded-lg bg-muted text-muted-foreground [&_svg]:size-4">
          {icon}
        </span>
        <div className="flex flex-col leading-tight">
          <strong className="text-xl font-semibold tabular-nums">{value}</strong>
          <span className="text-xs text-muted-foreground">{label}</span>
        </div>
      </CardContent>
    </Card>
  )
}
