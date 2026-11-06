import { StrictMode } from "react"
import { createRoot } from "react-dom/client"
import "katex/dist/katex.min.css"

import "./index.css"
import App from "./App.tsx"
import { ThemeProvider } from "@/components/theme-provider.tsx"
import { applyLanguage } from "@/lib/i18n"
import { THEME_STORAGE_KEY } from "@/lib/mathfeed-state"

applyLanguage()

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ThemeProvider storageKey={THEME_STORAGE_KEY}>
      <App />
    </ThemeProvider>
  </StrictMode>
)
