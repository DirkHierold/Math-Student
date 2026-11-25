import * as React from "react"
import type { LucideIcon } from "lucide-react"

import { cn } from "@/lib/utils"

// Based on Trophy UI (github.com/trophyso/ui, MIT): earned badges are a coloured medal, locked ones grey with a progress ring.
interface Milestone {
  id: string
  name: string
  icon: LucideIcon
  /** CSS colour of the earned medal */
  color: string
  /** Progress towards the badge, 0–100 */
  progress: number
  /** Accessible description, e.g. group, name and status */
  label?: string
}

interface UserMilestone extends Milestone {
  /** Date when earned, or `null` if locked */
  achievedAt: string | null
}

interface MilestoneBadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  milestone: UserMilestone
  badgeSize?: "sm" | "default" | "lg"
}

const badgeSizeMap = {
  sm: "size-10",
  default: "size-14",
  lg: "size-16",
} as const

const iconSizeMap = {
  sm: "size-5",
  default: "size-7",
  lg: "size-8",
} as const

const progressRingSizeMap = {
  sm: 52,
  default: 72,
  lg: 84,
} as const

const MilestoneBadge = React.forwardRef<HTMLDivElement, MilestoneBadgeProps>(
  ({ className, milestone, badgeSize = "default", ...props }, ref) => {
    const isUnlocked = milestone.achievedAt !== null
    const progress = isUnlocked
      ? 100
      : Math.min(100, Math.max(0, milestone.progress))
    const ringSize = progressRingSizeMap[badgeSize]
    const ringStrokeWidth = 4
    const ringRadius = (ringSize - ringStrokeWidth) / 2
    const ringCircumference = 2 * Math.PI * ringRadius
    const ringDashoffset =
      ringCircumference - (progress / 100) * ringCircumference
    const Icon = milestone.icon

    return (
      <div
        ref={ref}
        role="listitem"
        aria-label={milestone.label ?? milestone.name}
        className={cn(
          "flex flex-col items-center justify-start gap-1.5 rounded-xl border bg-card p-3",
          className
        )}
        {...props}
      >
        <div
          className="relative flex shrink-0 items-center justify-center"
          style={{ width: ringSize, height: ringSize }}
        >
          <svg
            aria-hidden="true"
            className="absolute inset-0 size-full -rotate-90"
            viewBox={`0 0 ${ringSize} ${ringSize}`}
          >
            <circle
              cx={ringSize / 2}
              cy={ringSize / 2}
              r={ringRadius}
              fill="none"
              strokeWidth={ringStrokeWidth}
              className="stroke-muted"
            />
            {progress > 0 && (
              <circle
                cx={ringSize / 2}
                cy={ringSize / 2}
                r={ringRadius}
                fill="none"
                stroke={isUnlocked ? milestone.color : undefined}
                strokeLinecap="round"
                strokeWidth={ringStrokeWidth}
                strokeDasharray={ringCircumference}
                strokeDashoffset={ringDashoffset}
                className={cn(!isUnlocked && "stroke-muted-foreground/60")}
              />
            )}
          </svg>
          <div
            aria-hidden="true"
            className={cn(
              badgeSizeMap[badgeSize],
              "relative flex items-center justify-center rounded-full",
              isUnlocked ? "text-white" : "bg-muted text-muted-foreground/50"
            )}
            style={isUnlocked ? { backgroundColor: milestone.color } : undefined}
          >
            <Icon className={iconSizeMap[badgeSize]} strokeWidth={2.2} />
          </div>
        </div>

        <span
          className={cn(
            "text-center text-xs leading-tight font-semibold",
            !isUnlocked && "text-muted-foreground"
          )}
        >
          {milestone.name}
        </span>
      </div>
    )
  }
)
MilestoneBadge.displayName = "MilestoneBadge"

export { MilestoneBadge }
export type { MilestoneBadgeProps, Milestone, UserMilestone }
