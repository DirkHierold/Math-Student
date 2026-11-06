import { useCallback, useMemo, useRef, useState } from "react"

import {
  applyNextStep,
  generateTask,
  getNextStep,
  isTaskComplete,
} from "../../math-engine.js"
import { chooseNextType, recordReview } from "../../progress.js"
import { recordStepAnswer } from "../../stats-data.js"
import { useActiveTimer } from "@/hooks/use-active-timer"
import {
  STORAGE_KEY,
  berlinDateKey,
  createState,
  dailyFor,
  loadState,
  type MathFeedState,
} from "@/lib/mathfeed-state"
import { t } from "@/lib/i18n"

export type Flash = "" | "success" | "error"

type Boot = { state: MathFeedState; error: string }

function boot(): Boot {
  try {
    return { state: loadState(), error: "" }
  } catch (error) {
    console.error("MathFeed konnte nicht gestartet werden:", error)
    return {
      state: createState(),
      error: `${t("errStart")} ${(error as Error).message}`,
    }
  }
}

const startTask = (state: MathFeedState) =>
  generateTask(chooseNextType(state.types, state.lastType))

export function useMathFeed(timerEnabled: boolean) {
  const [initial] = useState(boot)
  const startupError = initial.error
  const stateRef = useRef(initial.state)
  const [, setRevision] = useState(0)
  const rerender = useCallback(() => setRevision((value) => value + 1), [])

  const [task, setTask] = useState(() =>
    startupError ? null : startTask(initial.state)
  )
  const [locked, setLocked] = useState(false)
  const [selected, setSelected] = useState<string | null>(null)
  const [flash, setFlash] = useState<Flash>("")
  const [appError, setAppError] = useState("")

  const taskHadError = useRef(false)
  const completion = useRef(false)
  const pendingTask = useRef<typeof task>(null)

  const reportError = useCallback((message: string, error: unknown) => {
    console.error(message, error)
    setAppError(`${message} ${(error as Error).message}`)
  }, [])
  const mathError = useCallback(
    (error: Error) => reportError(t("errMath"), error),
    [reportError]
  )
  const save = useCallback(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(stateRef.current))
    } catch (error) {
      reportError(t("errSave"), error)
    }
  }, [reportError])

  useActiveTimer(stateRef, timerEnabled && !startupError, save, rerender)

  const currentStep = useMemo(() => (task ? getNextStep(task) : null), [task])

  const startNext = useCallback(() => {
    setTask(startTask(stateRef.current))
    taskHadError.current = false
    completion.current = false
    pendingTask.current = null
    setSelected(null)
    setLocked(false)
    setFlash("")
  }, [])

  const advance = useCallback(() => {
    if (completion.current) {
      startNext()
    } else {
      if (pendingTask.current) setTask(pendingTask.current)
      pendingTask.current = null
      setLocked(false)
      setSelected(null)
      setFlash("")
    }
  }, [startNext])

  const answer = useCallback(
    (choiceId: string) => {
      if (!task || !currentStep || locked) return
      const state = stateRef.current
      const correct = choiceId === currentStep.answerId
      setLocked(true)
      setSelected(choiceId)
      if (!correct) taskHadError.current = true
      recordStepAnswer(dailyFor(state), task.type, correct)
      setFlash(correct ? "success" : "error")

      const nextTask = applyNextStep(task)
      if (isTaskComplete(nextTask)) {
        completion.current = true
        state.lastType = task.type
        recordReview(state.types, task.type, !taskHadError.current)
        save()
      } else {
        pendingTask.current = nextTask
      }
      rerender()

      if (correct) {
        window.setTimeout(advance, 450)
      } else {
        if (navigator.vibrate) navigator.vibrate(80)
      }
    },
    [task, currentStep, locked, save, advance, rerender]
  )

  const state = stateRef.current
  return {
    state,
    daily: dailyFor(state, berlinDateKey()),
    task,
    currentStep,
    locked,
    selected,
    flash,
    appError,
    startupError,
    answer,
    advance,
    mathError,
  }
}
