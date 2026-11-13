import { getRollingDateKeys } from "../../stats-data.js";
import { AppHeader, ThemeToggle } from "@/components/app-header";
import { Card, CardContent } from "@/components/ui/card";
import { type useMathFeed } from "@/hooks/use-mathfeed";
import { locale, t } from "@/lib/i18n";
import { TYPE_KEYS, berlinDateKey, dailyFor } from "@/lib/mathfeed-state";
import { topicColor } from "@/lib/series";
import { cn } from "@/lib/utils";

type Feed = ReturnType<typeof useMathFeed>;

const weekday = new Intl.DateTimeFormat(locale, {
  weekday: "narrow",
  timeZone: "UTC",
});
const dayLabel = (key: string) => weekday.format(new Date(`${key}T12:00:00Z`));

// The level card is one shared time chart; below it come the answers of the last seven days, coloured by topic.
export default function StatsView({ feed }: { feed: Feed }) {
  const { state } = feed;
  const today = berlinDateKey();

  const sumSteps = (
    stats: ReturnType<typeof dailyFor>,
    field: "correct" | "errors",
  ) => TYPE_KEYS.reduce((sum, type) => sum + stats.steps[type][field], 0);
  const last7 = getRollingDateKeys(today).map((key: string) => {
    const stats = dailyFor(state, key);
    const correct = sumSteps(stats, "correct");
    const errors = sumSteps(stats, "errors");
    const byType = Object.fromEntries(
      TYPE_KEYS.map((type) => [
        type,
        stats.steps[type].correct + stats.steps[type].errors,
      ]),
    );
    return { key, correct, total: correct + errors, byType };
  });

  return (
    <div className="flex h-full min-h-0 flex-col">
      <AppHeader>
        <h1 className="text-lg font-semibold">{t("navStats")}</h1>
        <ThemeToggle />
      </AppHeader>
      <div className="flex min-h-0 flex-1 flex-col gap-3 px-4 pt-2 pb-3 short:grid short:grid-cols-[1.5fr_1fr] short:grid-rows-[minmax(0,1fr)] short:gap-x-3">
        <Card className="min-h-0 flex-1 gap-0 py-0 short:col-start-2">
        <CardContent className="flex min-h-0 flex-1 flex-col gap-2 p-4 short:p-3">
          <h2 className="text-sm font-medium">{t("statsWeek")}</h2>
          <Bars entries={last7} today={today} />
        </CardContent>
        </Card>
      </div>
    </div>
  );
}

function Bars({
  entries,
  today,
}: {
  entries: {
    key: string;
    correct: number;
    total: number;
    byType: Record<string, number>;
  }[];
  today: string;
}) {
  const max = Math.max(1, ...entries.map((entry) => entry.total));
  return (
    <div
      role="img"
      aria-label={t("statsWeekLabel")}
      className="grid min-h-0 flex-1 grid-cols-7 gap-2"
    >
      {entries.map((entry) => (
        <div
          key={entry.key}
          className="flex min-h-0 flex-col items-center justify-end gap-1"
        >
          <div
            className="flex min-h-0 w-full flex-1 items-end pt-5"
            aria-hidden="true"
          >
            {entry.total > 0 ? (
              <div
                className="relative w-full"
                style={{
                  height: `${Math.max(6, (entry.total / max) * 100)}%`,
                }}
              >
                <span className="absolute bottom-full mb-0.5 left-1/2 -translate-x-1/2 text-[11px] leading-none whitespace-nowrap text-muted-foreground tabular-nums">
                  {`${entry.correct}/${entry.total}`}
                </span>
                <div className="flex h-full w-full flex-col-reverse gap-px overflow-hidden rounded-md">
                  {TYPE_KEYS.filter((type) => entry.byType[type] > 0).map(
                    (type) => (
                      <span
                        key={type}
                        className="min-h-px"
                        style={{
                          flex: `${entry.byType[type]} 1 0`,
                          background: topicColor(type),
                        }}
                      />
                    ),
                  )}
                </div>
              </div>
            ) : (
              <span className="h-[3px] w-full rounded-md bg-muted" />
            )}
          </div>
          <span
            className={cn(
              "text-[11px]",
              entry.key === today
                ? "font-semibold text-foreground"
                : "text-muted-foreground",
            )}
          >
            {dayLabel(entry.key)}
          </span>
        </div>
      ))}
    </div>
  );
}
