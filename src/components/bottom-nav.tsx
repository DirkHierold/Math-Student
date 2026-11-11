import { BarChart3, Home } from "lucide-react"

import { t } from "@/lib/i18n"
import { cn } from "@/lib/utils"

export type View = "home" | "stats"

const ITEMS = [
  { view: "home", icon: Home, label: () => t("navHome") },
  { view: "stats", icon: BarChart3, label: () => t("navStats") },
] as const

// Two top-level views in the thumb zone; icon plus label keeps the icon unambiguous.
export function BottomNav({
  view,
  onChange,
}: {
  view: View
  onChange: (view: View) => void
}) {
  return (
    <nav
      aria-label={t("navLabel")}
      className="grid shrink-0 grid-cols-2 border-t bg-background pb-[env(safe-area-inset-bottom)]"
    >
      {ITEMS.map(({ view: target, icon: Icon, label }) => {
        const active = view === target
        return (
          <button
            key={target}
            type="button"
            aria-current={active ? "page" : undefined}
            onClick={() => onChange(target)}
            className={cn(
              "flex h-[49px] flex-col items-center justify-center gap-0.5 text-[11px] font-medium outline-none transition-colors focus-visible:bg-accent short:h-11 short:flex-row short:gap-2 short:text-xs",
              active ? "text-foreground" : "text-muted-foreground"
            )}
          >
            <Icon className={cn("size-[22px] short:size-5", active && "stroke-[2.4]")} />
            {label()}
          </button>
        )
      })}
    </nav>
  )
}
