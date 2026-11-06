import { useRef } from "react"
import { ArrowRight, Check, Timer, X } from "lucide-react"

import { TASK_STEP_COUNTS, currentLine } from "../../math-engine.js"
import { formatDuration } from "../../format.js"
import { getDurationColorClass } from "../../stats-data.js"
import { MathBlock } from "@/components/math-block"
import { TYPE_META, TypeChip } from "@/components/task-types"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { useMathFit } from "@/hooks/use-math-fit"
import { type useMathFeed } from "@/hooks/use-mathfeed"
import { t } from "@/lib/i18n"
import { cn } from "@/lib/utils"

type Feed = ReturnType<typeof useMathFeed>

export function FeedView({ feed }: { feed: Feed }) {
  const { task, currentStep, locked, selected, daily, answer, mathError } = feed
  const practiceRef = useRef<HTMLElement>(null)
  useMathFit(practiceRef, true, [task, currentStep], mathError)

  if (!task || !currentStep) return null
  const stepCount = TASK_STEP_COUNTS[task.type as keyof typeof TASK_STEP_COUNTS]
  const answeredWrong = locked && selected !== currentStep.answerId
  const duration =
    getDurationColorClass(daily.seconds) === "duration-high"
      ? "text-success"
      : "text-muted-foreground"

  return (
    <section
      ref={practiceRef}
      className="grid h-full min-h-0 grid-rows-[auto_minmax(0,3fr)_auto_minmax(0,4fr)] gap-2 px-4 pt-2 pb-3 short:grid-cols-2 short:grid-rows-[auto_auto_minmax(0,1fr)] short:gap-x-4"
    >
      <header className="flex h-9 items-center justify-between gap-3 short:col-span-2">
        <TypeChip type={task.type} />
        <StepDots type={task.type} stage={task.stage} total={stepCount} />
        <span
          className={cn(
            "flex items-center gap-1 text-sm font-medium tabular-nums",
            duration
          )}
          aria-label={t("timerLabel", { time: formatDuration(daily.seconds) })}
        >
          <Timer className="size-4" aria-hidden="true" />
          {formatDuration(daily.seconds)}
        </span>
      </header>

      <Card className="min-h-0 gap-0 py-0 short:col-start-1 short:row-span-2 short:row-start-2">
        <CardContent className="relative min-h-0 flex-1 px-0">
          <div className="absolute inset-3">
            <MathBlock tex={currentLine(task)} kind="task" onError={mathError} />
          </div>
        </CardContent>
      </Card>

      <p
        className={cn(
          "flex h-5 items-center justify-center gap-1.5 text-sm short:col-start-2 short:row-start-2",
          answeredWrong
            ? "font-medium text-destructive"
            : "text-muted-foreground"
        )}
      >
        {answeredWrong ? (
          <>
            {t("continueHint")}
            <ArrowRight className="size-4 animate-pulse" aria-hidden="true" />
          </>
        ) : (
          t("instruction")
        )}
      </p>

      <div className="grid min-h-0 grid-cols-2 grid-rows-2 gap-2 short:col-start-2 short:row-start-3">
        {currentStep.choices.map(
          (choice: { id: string; tex: string }, index: number) => {
            const correct = locked && choice.id === currentStep.answerId
            const wrong =
              locked &&
              choice.id === selected &&
              selected !== currentStep.answerId
            return (
              <Button
                key={choice.id}
                variant="outline"
                disabled={locked}
                onClick={() => answer(choice.id)}
                aria-label={t("answerLabel", { n: index + 1 })}
                className={cn(
                  "relative h-full min-h-11 overflow-hidden rounded-xl",
                  locked && "opacity-45",
                  correct &&
                    "border-success bg-success/10 text-success opacity-100 disabled:opacity-100 dark:border-success dark:bg-success/10",
                  wrong &&
                    "animate-shake border-destructive bg-destructive/10 text-destructive opacity-100 disabled:opacity-100 dark:border-destructive dark:bg-destructive/10"
                )}
              >
                <span className="absolute inset-x-2 inset-y-3">
                  <MathBlock tex={choice.tex} kind="choice" onError={mathError} />
                </span>
                {correct && (
                  <Check
                    className="absolute top-1.5 right-1.5 size-5"
                    aria-hidden="true"
                  />
                )}
                {wrong && (
                  <X
                    className="absolute top-1.5 right-1.5 size-5"
                    aria-hidden="true"
                  />
                )}
              </Button>
            )
          }
        )}
      </div>
    </section>
  )
}

// Discrete steps read faster than a bar and need no words.
function StepDots({
  type,
  stage,
  total,
}: {
  type: string
  stage: number
  total: number
}) {
  return (
    <div
      role="img"
      aria-label={t("stepLabel", { step: stage + 1, total })}
      className="flex items-center gap-1.5"
    >
      {Array.from({ length: total }, (_, index) => (
        <span
          key={index}
          className={cn(
            "h-2 rounded-full transition-all",
            index === stage
              ? cn("w-5", TYPE_META[type].bar)
              : index < stage
                ? "w-2 bg-foreground/60"
                : "w-2 bg-muted-foreground/25"
          )}
        />
      ))}
    </div>
  )
}
