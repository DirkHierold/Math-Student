import { CircleCheck, Moon, Sun, Timer, type LucideIcon } from "lucide-react"

import { formatDuration } from "../../format.js"
import { useTheme } from "@/components/theme-provider"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { t } from "@/lib/i18n"
import { dailyTotals, type DailyStats as Daily } from "@/lib/mathfeed-state"
import { cn } from "@/lib/utils"

// One fixed-height, opaque bar for every screen, so switching views never shifts the layout and nothing shows through (iOS glass).
// Three columns: the screen's own item on the left, today's answers and time exactly centred, the theme toggle on the right.
export function AppHeader({
  start,
  end = <ThemeToggle />,
  daily,
  className,
}: {
  start: React.ReactNode
  end?: React.ReactNode
  daily: Daily
  className?: string
}) {
  return (
    <header
      className={cn(
        "grid h-11 shrink-0 grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-2 bg-background px-4 short:h-9",
        className
      )}
    >
      <div className="flex min-w-0 items-center justify-start">{start}</div>
      <DailyStats daily={daily} />
      <div className="flex min-w-0 items-center justify-end">{end}</div>
    </header>
  )
}

// Today's correct/answered count and practice time.
export function DailyStats({ daily }: { daily: Daily }) {
  const { correct, total } = dailyTotals(daily)
  const time = formatDuration(daily.seconds)
  return (
    <div className="flex items-center gap-2">
      <HeaderStat
        icon={CircleCheck}
        value={`${correct}/${total}`}
        label={t("homeTodayStats", { time, correct, total })}
      />
      <HeaderStat role="timer" icon={Timer} value={time} label={t("timerLabel", { time })} />
    </div>
  )
}

// A small icon + number in the header (practice time, answers, streak); same look and place on every screen.
export function HeaderStat({
  icon: Icon,
  value,
  label,
  className,
  role,
}: {
  icon: LucideIcon
  value: React.ReactNode
  label: string
  className?: string
  role?: React.AriaRole
}) {
  return (
    <span
      role={role}
      aria-label={label}
      className={cn(
        "flex h-9 shrink-0 items-center gap-0.5 text-xs font-semibold tabular-nums text-muted-foreground",
        className
      )}
    >
      <Icon className="size-4" aria-hidden="true" />
      {value}
    </span>
  )
}

export function ThemeToggle() {
  const { theme, setTheme } = useTheme()
  const options = [
    { value: "light", icon: Sun, label: t("themeLight") },
    { value: "dark", icon: Moon, label: t("themeDark") },
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
          className="size-9 short:size-8"
        >
          <Icon className="size-4" />
        </ToggleGroupItem>
      ))}
    </ToggleGroup>
  )
}
