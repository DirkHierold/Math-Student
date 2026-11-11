import { t } from "@/lib/i18n"
import { TASK_TYPES } from "../../math-engine.js"
import { createRewards, normalizeRewards } from "../../rewards.js"
import { normalizeSkills } from "../../skills.js"
import type { createSession } from "../../session.js"
import {
  createDailyStats,
  normalizeDailyStats,
  pruneDailyStats,
} from "../../stats-data.js"

export const STORAGE_KEY = "mathfeed-state-v6"
const PREVIOUS_STORAGE_KEYS = ["mathfeed-state-v5", "mathfeed-state-v4", "mathfeed-state-v3", "mathfeed-state-v2"]
const LEGACY_STORAGE_KEY = "mathfeed-state-v1"
export const THEME_STORAGE_KEY = "mathfeed-theme"
export const TYPE_KEYS = Object.keys(TASK_TYPES)

export type Session = ReturnType<typeof createSession>
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
    version: 6,
    skills: normalizeSkills({}, TYPE_KEYS) as ReturnType<typeof normalizeSkills>,
    rewards: createRewards() as ReturnType<typeof createRewards>,
    session: null as Session | null,
    daily: {} as Record<string, ReturnType<typeof createDailyStats>>,
  }
}

const validSession = (value: Session | null, today: string): Session | null => {
  if (!value || typeof value !== "object") return null
  const known = (type: string) => TYPE_KEYS.includes(type)
  const ok =
    value.date === today &&
    (value.kind === "main" || value.kind === "bonus") &&
    Number.isInteger(value.index) &&
    value.index >= 0 &&
    value.index < value.length &&
    Array.isArray(value.results) &&
    Array.isArray(value.rematches) &&
    Array.isArray(value.recentTypes) &&
    !!value.levelBefore &&
    value.recentTypes.every(known) &&
    value.results.every((entry: { type: string }) => known(entry.type)) &&
    value.rematches.every((entry: { type: string }) => known(entry.type))
  return ok ? value : null
}

export function loadState(): MathFeedState {
  const today = berlinDateKey()
  const raw = localStorage.getItem(STORAGE_KEY)
  if (!raw) return migrateLegacy(today)
  const state = JSON.parse(raw)
  if (state.version !== 6 || !state.skills || !state.daily) {
    throw new Error(t("errStorageFormat"))
  }
  state.skills = normalizeSkills(state.skills, TYPE_KEYS)
  state.rewards = normalizeRewards(state.rewards)
  state.session = validSession(state.session, today)
  state.daily = normalizeDailyStats(state.daily, TYPE_KEYS)
  pruneDailyStats(state.daily, today)
  return state
}

// Older versions only keep their practice statistics; skills and level restart with the simple level model.
function migrateLegacy(today: string): MathFeedState {
  const state = createState()
  for (const key of [...PREVIOUS_STORAGE_KEYS, LEGACY_STORAGE_KEY]) {
    const raw = localStorage.getItem(key)
    if (!raw) continue
    try {
      const legacy = JSON.parse(raw)
      if (legacy.daily) {
        state.daily = normalizeDailyStats(legacy.daily, TYPE_KEYS)
        pruneDailyStats(state.daily, today)
        break
      }
    } catch (error) {
      console.error("Legacy MathFeed state ignored:", error)
    }
  }
  return state
}

export function dailyFor(state: MathFeedState, key = berlinDateKey()) {
  return (state.daily[key] ||= createDailyStats(TYPE_KEYS))
}
