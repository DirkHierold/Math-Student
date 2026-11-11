import { Suspense, lazy, useState } from "react"
import { TriangleAlert } from "lucide-react"

import { BottomNav, type View } from "@/components/bottom-nav"
import { FeedView } from "@/components/feed-view"
import { HomeView } from "@/components/home-view"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { useMathFeed } from "@/hooks/use-mathfeed"
import { useThemeColorMeta } from "@/hooks/use-theme-color-meta"
import { t } from "@/lib/i18n"
import { cn } from "@/lib/utils"

const StatsView = lazy(() => import("@/components/stats-view"))

function Shell({
  className,
  children,
}: {
  className?: string
  children: React.ReactNode
}) {
  return (
    <div className={cn("h-dvh w-full overflow-hidden", className)}>
      <div className="mx-auto flex h-full w-full max-w-3xl flex-col pt-[env(safe-area-inset-top)]">
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
            <StatsView feed={feed} />
          </Suspense>
        )}
      </main>
      {feed.mode === "idle" && <BottomNav view={view} onChange={setView} />}
    </Shell>
  )
}

export default App
