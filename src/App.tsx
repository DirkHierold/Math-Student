import { Suspense, lazy, useState } from "react"
import { TriangleAlert } from "lucide-react"

import { AppHeader, ThemeToggle } from "@/components/app-header"
import { BottomNav, type View } from "@/components/bottom-nav"
import { CelebrationContent } from "@/components/celebration"
import { FeedView } from "@/components/feed-view"
import { HomeView } from "@/components/home-view"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { useMathFeed } from "@/hooks/use-mathfeed"
import { useThemeColorMeta } from "@/hooks/use-theme-color-meta"
import { t } from "@/lib/i18n"
import { cn } from "@/lib/utils"

const BadgesView = lazy(() => import("@/components/badges-view"))

function Shell({
  className,
  children,
}: {
  className?: string
  children: React.ReactNode
}) {
  return (
    <div className={cn("h-dvh w-full overflow-hidden", className)}>
      <div className="mx-auto flex h-full w-full max-w-3xl flex-col pt-safe-top">
        {children}
      </div>
    </div>
  )
}

export function App() {
  useThemeColorMeta()
  const [view, setView] = useState<View>("home")
  const feed = useMathFeed()

  if (feed.startupError) {
    return (
      <Shell>
        <div className="m-auto w-full p-4">
          <Alert variant="destructive">
            <TriangleAlert />
            <AlertTitle>{t("errStartTitle")}</AlertTitle>
            <AlertDescription>{feed.startupError}</AlertDescription>
          </Alert>
        </div>
      </Shell>
    )
  }

  // Badges not celebrated yet (e.g. left the run mid-queue, or reached when the run ended) come first,
  // one by one, with only "Weiter" to move on and no navigation, so nothing passes unseen.
  const unseenBadge = feed.mode === "idle" ? feed.state.rewards.unseenBadges[0] : undefined
  if (unseenBadge) {
    return (
      <Shell>
        <AppHeader>
          <span className="text-lg font-semibold">{t("appName")}</span>
          <ThemeToggle />
        </AppHeader>
        <main className="grid min-h-0 flex-1 grid-rows-[minmax(0,1fr)_auto] gap-2 px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
          <div role="status" className="relative z-[110] grid min-h-0 place-items-center">
            <CelebrationContent key={unseenBadge} celebration={{ kind: "badge", id: unseenBadge }} />
          </div>
          <Button
            size="lg"
            onClick={feed.dismissBadge}
            className="h-12 w-full rounded-2xl text-base font-semibold short:h-10"
          >
            {t("runNext")}
          </Button>
        </main>
      </Shell>
    )
  }

  return (
    <Shell>
      {feed.appError && (
        <Alert variant="destructive" className="mx-4 mt-2 w-auto shrink-0">
          <TriangleAlert />
          <AlertTitle>{t("errNoticeTitle")}</AlertTitle>
          <AlertDescription>{feed.appError}</AlertDescription>
        </Alert>
      )}
      <main className="min-h-0 flex-1">
        {feed.mode === "run" ? (
          <FeedView feed={feed} />
        ) : view === "home" ? (
          <HomeView feed={feed} />
        ) : (
          <Suspense fallback={null}>
            <BadgesView feed={feed} />
          </Suspense>
        )}
      </main>
      {feed.mode === "idle" && <BottomNav view={view} onChange={setView} />}
    </Shell>
  )
}

export default App
