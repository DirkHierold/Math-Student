import { t } from "@/lib/i18n"
import { TASK_TYPES } from "../../math-engine.js"
import {
  createTypeProgress,
  normalizeTypeProgress,
} from "../../progress.js"
import {
  createDailyStats,
  normalizeDailyStats,
  pruneDailyStats,
} from "../../stats-data.js"

export const STORAGE_KEY = "mathfeed-state-v1"
export const THEME_STORAGE_KEY = "mathfeed-theme"
export const TYPE_KEYS = Object.keys(TASK_TYPES)

export type MathFeedState = ReturnType<typeof createState>

export function berlinDateKey(date = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Berlin",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date)
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]))
  return `${values.year}-${values.month}-${values.day}`
}

export function createState() {
  return {
    version: 1,
    lastType: null as string | null,
    types: Object.fromEntries(
      TYPE_KEYS.map((type) => [type, createTypeProgress()])
    ) as Record<string, ReturnType<typeof createTypeProgress>>,
    daily: {} as Record<string, ReturnType<typeof createDailyStats>>,
  }
}

export function loadState(): MathFeedState {
  const raw = localStorage.getItem(STORAGE_KEY)
  if (!raw) return createState()
  const state = JSON.parse(raw)
  if (state.version !== 1 || !state.types || !state.daily) {
    throw new Error(t("errStorageFormat"))
  }
  state.types = normalizeTypeProgress(state.types, TYPE_KEYS)
  if (!TYPE_KEYS.includes(state.lastType)) state.lastType = null
  delete state.totalAnswered
  state.daily = normalizeDailyStats(state.daily, TYPE_KEYS)
  pruneDailyStats(state.daily, berlinDateKey())
  return state
}

export function dailyFor(state: MathFeedState, key = berlinDateKey()) {
  return (state.daily[key] ||= createDailyStats(TYPE_KEYS))
}
