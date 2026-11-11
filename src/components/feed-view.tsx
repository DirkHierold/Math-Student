import { useEffect, useRef } from "react"
import { Check, Flame, Pause, RotateCcw, X } from "lucide-react"

import { currentLine, explanationKey } from "../../math-engine.js"
import { MathBlock } from "@/components/math-block"
import { EXPLAIN } from "@/components/task-types"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { useMathFit } from "@/hooks/use-math-fit"
import { type useMathFeed } from "@/hooks/use-mathfeed"
import { STREAK_BONUS, STREAK_LENGTH } from "../../adaptive.js"
import { celebrate } from "@/lib/celebrate"
import { t } from "@/lib/i18n"
import { topicName } from "@/lib/series"
import { cn } from "@/lib/utils"

type Feed = ReturnType<typeof useMathFeed>

export function FeedView({ feed }: { feed: Feed }) {
  const { state, streakBonus, task, slot, currentStep, locked, selected, answer, advance, mathError, exitRun } =
    feed
  const practiceRef = useRef<HTMLElement>(null)
  useMathFit(practiceRef, true, [task, currentStep], mathError)
  useEffect(() => {
    if (!streakBonus) return
    let active = true
    celebrate(() => active)
    return () => {
      active = false
    }
  }, [streakBonus])

  if (!task || !currentStep || !slot) return null
  const answeredWrong = locked && selected !== currentStep.answerId
  const streak = streakBonus ? STREAK_LENGTH : (state.skills[slot.type].streak as number)
  const explanation = EXPLAIN[explanationKey(task)]

  return (
    <section
      ref={practiceRef}
      // The click ends the tap; consuming it keeps it from answering the next step.
      onClickCapture={
        answeredWrong || streakBonus
          ? (event) => {
              event.stopPropagation()
              advance()
            }
          : undefined
      }
      className="relative grid h-full min-h-0 grid-rows-[auto_minmax(0,3fr)_auto_minmax(0,4fr)] gap-2 px-4 pt-2 pb-3 short:grid-cols-2 short:grid-rows-[auto_auto_minmax(0,1fr)] short:gap-x-4"
    >
      <div className="short:col-span-2">
        <header className="grid h-9 grid-cols-[2.25rem_minmax(0,1fr)_3.5rem] items-center gap-2">
          <button
            type="button"
            onClick={exitRun}
            aria-label={t("runExit")}
            className="grid size-9 shrink-0 place-items-center rounded-full text-muted-foreground outline-none focus-visible:bg-accent"
          >
            <Pause className="size-5" aria-hidden="true" />
          </button>
          <div className="flex min-w-0 items-center justify-center gap-2">
            <span className="truncate text-sm font-semibold">{topicName(slot.type)}</span>
            <span className="shrink-0 text-xs font-medium tabular-nums text-muted-foreground">
              {t("levelShort", { n: state.skills[slot.type].level })}
            </span>
            {slot.rematch && (
              <span className="flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
                <RotateCcw className="size-3" aria-hidden="true" />
                {t("rematchBadge")}
              </span>
            )}
          </div>
          <span
            className={cn(
              "flex h-9 items-center justify-end gap-0.5 text-xs font-semibold tabular-nums",
              streakBonus ? "text-success" : streak > 0 ? "text-orange-500" : "text-muted-foreground/50"
            )}
            aria-label={t("streakLabel", { n: streak, total: STREAK_LENGTH })}
          >
            <Flame className="size-4" aria-hidden="true" />
            {streakBonus ? t("streakBonus", { n: STREAK_BONUS }) : `${streak}/${STREAK_LENGTH}`}
          </span>
        </header>
        <div
          role="progressbar"
          aria-label={t("runProgressLabel", { n: slot.number, total: slot.length })}
          aria-valuemin={0}
          aria-valuemax={slot.length}
          aria-valuenow={slot.number - 1}
          className="mt-1.5 flex h-2 items-center justify-center gap-1.5"
        >
          {Array.from({ length: slot.length }, (_, index) => (
            <span
              key={index}
              className={cn(
                "h-2 rounded-full transition-all duration-300",
                index + 1 === slot.number
                  ? "w-6 bg-foreground"
                  : index + 1 < slot.number
                    ? "w-2 bg-foreground/50"
                    : "w-2 bg-muted"
              )}
            />
          ))}
        </div>
      </div>

      {streakBonus ? (
        <div
          role="status"
          className="relative z-[110] row-span-3 grid min-h-0 place-items-center text-center text-success short:col-span-2 short:row-span-2"
        >
          <div className="animate-pop">
            <Flame className="mx-auto size-14" aria-hidden="true" />
            <p className="mt-2 text-lg font-semibold">{t("streakBonusTitle")}</p>
            <p className="text-lg font-semibold">{topicName(slot.type)}</p>
            <p className="text-6xl font-bold">{t("streakBonus", { n: STREAK_BONUS })}</p>
          </div>
          <p className="absolute inset-x-0 bottom-2 text-sm font-medium">
            {t("continueHint")} →
          </p>
        </div>
      ) : (
        <>
      <Card className="min-h-0 gap-0 py-0 short:col-start-1 short:row-span-2 short:row-start-2">
        <CardContent className="relative min-h-0 flex-1 px-0">
          <div className="absolute inset-3">
            <MathBlock tex={currentLine(task)} kind="task" onError={mathError} />
          </div>
        </CardContent>
      </Card>

      <p
        className={cn(
          "flex h-10 items-center justify-center gap-1.5 text-center text-xs leading-tight short:col-start-2 short:row-start-2 sm:text-sm",
          answeredWrong
            ? "font-medium text-destructive"
            : "text-muted-foreground"
        )}
      >
        {answeredWrong ? (
          <span>
            {explanation && `${t(explanation)} `}
            <span className="whitespace-nowrap">{t("continueHint")} →</span>
          </span>
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
        </>
      )}
    </section>
  )
}
