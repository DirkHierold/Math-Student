import { useCallback, useMemo, useRef, useState } from "react"

import {
  applyNextStep,
  generateTask,
  getNextStep,
  isTaskComplete,
} from "../../math-engine.js"
import {
  completeTask,
  createSession,
  finishSession,
  isSessionDone,
  nextSlot,
} from "../../session.js"
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

export type Mode = "idle" | "run"
export type Slot = ReturnType<typeof nextSlot> & { number: number; length: number }
export type Summary = ReturnType<typeof finishSession>
type Task = ReturnType<typeof generateTask>

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

export function useMathFeed() {
  const [initial] = useState(boot)
  const startupError = initial.error
  const stateRef = useRef(initial.state)
  const [, setRevision] = useState(0)
  const rerender = useCallback(() => setRevision((value) => value + 1), [])

  const [mode, setMode] = useState<Mode>("idle")
  const [summary, setSummary] = useState<Summary | null>(null)
  const [task, setTask] = useState<Task | null>(null)
  const [slot, setSlot] = useState<Slot | null>(null)
  const [locked, setLocked] = useState(false)
  const [selected, setSelected] = useState<string | null>(null)
  const [appError, setAppError] = useState("")
  const [streakBonus, setStreakBonus] = useState(false)

  const taskErrors = useRef(0)
  const stepShownAt = useRef(0)
  const completion = useRef(false)
  const pendingTask = useRef<Task | null>(null)
  const pendingSummary = useRef<Summary | null>(null)
  const slotRef = useRef<Slot | null>(null)

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

  useActiveTimer(stateRef, mode === "run" && !startupError, save, rerender)

  const currentStep = useMemo(() => (task ? getNextStep(task) : null), [task])

  const resetStep = useCallback(() => {
    setSelected(null)
    setLocked(false)
    stepShownAt.current = Date.now()
  }, [])

  const loadSlot = useCallback(() => {
    const state = stateRef.current
    if (!state.session) return
    const next = {
      ...nextSlot(state.session, state.skills, berlinDateKey()),
      number: state.session.index + 1,
      length: state.session.length,
    }
    slotRef.current = next
    setSlot(next)
    setTask(generateTask(next.type, next.level))
    taskErrors.current = 0
    completion.current = false
    pendingTask.current = null
    setStreakBonus(false)
    resetStep()
  }, [resetStep])

  const advance = useCallback(() => {
    setStreakBonus(false)
    if (completion.current) {
      completion.current = false
      if (pendingSummary.current) {
        setSummary(pendingSummary.current)
        pendingSummary.current = null
        setMode("idle")
        setTask(null)
        setSlot(null)
        resetStep()
      } else {
        loadSlot()
      }
    } else {
      if (pendingTask.current) setTask(pendingTask.current)
      pendingTask.current = null
      resetStep()
    }
  }, [loadSlot, resetStep])

  const beginRun = useCallback(() => {
    const state = stateRef.current
    const day = berlinDateKey()
    if (!state.session || state.session.date !== day) {
      state.session = createSession({
        date: day,
        kind: state.rewards.lastDay === day ? "bonus" : "main",
        skills: state.skills,
      })
    }
    save()
    setSummary(null)
    setMode("run")
    loadSlot()
  }, [loadSlot, save])

  const exitRun = useCallback(() => {
    save()
    setMode("idle")
    setTask(null)
    setSlot(null)
    resetStep()
  }, [resetStep, save])

  const answer = useCallback(
    (choiceId: string) => {
      const current = slotRef.current
      const state = stateRef.current
      if (!task || !currentStep || locked || !current || !state.session) return
      const correct = choiceId === currentStep.answerId
      let paused = false
      setLocked(true)
      setSelected(choiceId)
      if (!correct) {
        taskErrors.current++
      }
      recordStepAnswer(dailyFor(state), task.type, correct)

      const nextTask = applyNextStep(task)
      if (isTaskComplete(nextTask)) {
        completion.current = true
        const day = berlinDateKey()
        const session = state.session
        const outcome = completeTask(
          session,
          state.skills,
          current,
          { errors: taskErrors.current },
          day
        )
        paused = outcome.bonus
        setStreakBonus(outcome.bonus)
        if (isSessionDone(session)) {
          pendingSummary.current = finishSession(state, session, day)
          state.session = null
        }
        save()
      } else {
        pendingTask.current = nextTask
      }
      rerender()

      if (correct && !paused) {
        window.setTimeout(advance, 450)
      } else if (navigator.vibrate) {
        navigator.vibrate(80)
      }
    },
    [task, currentStep, locked, save, advance, rerender]
  )

  const state = stateRef.current
  return {
    state,
    daily: dailyFor(state, berlinDateKey()),
    mode,
    summary,
    task,
    slot,
    currentStep,
    locked,
    selected,
    appError,
    streakBonus,
    startupError,
    answer,
    advance,
    mathError,
    beginRun,
    exitRun,
  }
}
