import { useEffect, useRef } from "react"

import { pruneDailyStats } from "../../stats-data.js"
import {
  berlinDateKey,
  dailyFor,
  type MathFeedState,
} from "@/lib/mathfeed-state"

const SAVE_INTERVAL_MS = 10_000
const MAX_TICK_MS = 3_000

// Counts active time per day: only while the page is visible and focused.
export function useActiveTimer(
  stateRef: React.RefObject<MathFeedState>,
  enabled: boolean,
  save: () => void,
  onTick: () => void
) {
  const lastTick = useRef(Date.now())
  const lastSave = useRef(Date.now())
  const saveRef = useRef(save)
  const tickRef = useRef(onTick)
  saveRef.current = save
  tickRef.current = onTick

  useEffect(() => {
    if (!enabled) return undefined

    const reset = () => {
      lastTick.current = Date.now()
    }
    const tick = () => {
      const now = Date.now()
      const elapsed = now - lastTick.current
      lastTick.current = now
      if (document.visibilityState !== "visible" || !document.hasFocus()) return
      const state = stateRef.current
      pruneDailyStats(state.daily, berlinDateKey())
      dailyFor(state).seconds += Math.max(0, Math.min(elapsed, MAX_TICK_MS)) / 1000
      tickRef.current()
      if (now - lastSave.current >= SAVE_INTERVAL_MS) {
        lastSave.current = now
        saveRef.current()
      }
    }
    const saveOnHide = () => saveRef.current()

    const id = window.setInterval(tick, 1000)
    document.addEventListener("visibilitychange", reset)
    window.addEventListener("focus", reset)
    window.addEventListener("blur", reset)
    window.addEventListener("pagehide", saveOnHide)
    return () => {
      window.clearInterval(id)
      document.removeEventListener("visibilitychange", reset)
      window.removeEventListener("focus", reset)
      window.removeEventListener("blur", reset)
      window.removeEventListener("pagehide", saveOnHide)
    }
  }, [enabled, stateRef])
}
