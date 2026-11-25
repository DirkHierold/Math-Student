import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"
import {
  MilestoneBadge,
  type UserMilestone,
} from "@/components/ui/milestone-badge"

// Based on Trophy UI (github.com/trophyso/ui, MIT).
const milestoneGridVariants = cva("grid", {
  variants: {
    columns: {
      2: "grid-cols-2",
      3: "grid-cols-3",
      4: "grid-cols-4",
      auto: "grid-cols-3 sm:grid-cols-4 md:grid-cols-5 short:grid-cols-5",
    },
    gap: {
      sm: "gap-2",
      default: "gap-3",
      lg: "gap-4",
    },
  },
  defaultVariants: {
    columns: "auto",
    gap: "default",
  },
})

interface MilestoneGridProps
  extends
    React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof milestoneGridVariants> {
  milestones: UserMilestone[]
  badgeSize?: "sm" | "default" | "lg"
}

const MilestoneGrid = React.forwardRef<HTMLDivElement, MilestoneGridProps>(
  (
    { className, columns, gap, milestones, badgeSize = "default", ...props },
    ref
  ) => (
    <div
      ref={ref}
      role="list"
      className={cn(milestoneGridVariants({ columns, gap }), className)}
      {...props}
    >
      {milestones.map((milestone) => (
        <MilestoneBadge
          key={milestone.id}
          milestone={milestone}
          badgeSize={badgeSize}
        />
      ))}
    </div>
  )
)
MilestoneGrid.displayName = "MilestoneGrid"

export { MilestoneGrid, milestoneGridVariants }
export type { MilestoneGridProps }
