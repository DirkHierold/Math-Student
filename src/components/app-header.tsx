import { Moon, Sun } from "lucide-react"

import { useTheme } from "@/components/theme-provider"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { t } from "@/lib/i18n"
import { cn } from "@/lib/utils"

// One fixed-height, opaque bar for every screen, so switching views never shifts the layout and nothing shows through (iOS glass).
export function AppHeader({
  children,
  className,
}: {
  children: React.ReactNode
  className?: string
}) {
  return (
    <header
      className={cn(
        "flex h-11 shrink-0 items-center justify-between gap-2 bg-background px-4 short:h-9",
        className
      )}
    >
      {children}
    </header>
  )
}

export function ThemeToggle() {
  const { theme, setTheme } = useTheme()
  const options = [
    { value: "light", icon: Sun, label: t("themeLight") },
    { value: "dark", icon: Moon, label: t("themeDark") },
  ] as const
  return (
    <ToggleGroup
      type="single"
      variant="outline"
      spacing={0}
      value={theme}
      onValueChange={(value) => value && setTheme(value as typeof theme)}
      aria-label={t("themeLabel")}
    >
      {options.map(({ value, icon: Icon, label }) => (
        <ToggleGroupItem
          key={value}
          value={value}
          aria-label={label}
          className="size-9 short:size-8"
        >
          <Icon className="size-4" />
        </ToggleGroupItem>
      ))}
    </ToggleGroup>
  )
}
