import { t, type MessageKey } from "@/lib/i18n"
import { TYPE_KEYS } from "@/lib/mathfeed-state"

// Each topic keeps one colour on every screen (progress chart, legend, seven-day bars).
export const topicColor = (type: string) =>
  `var(--series-${(TYPE_KEYS.indexOf(type) % 5) + 1})`

export const topicName = (type: string) =>
  t(`type${type[0].toUpperCase()}${type.slice(1)}` as MessageKey)
