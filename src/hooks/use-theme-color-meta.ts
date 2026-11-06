import { useEffect } from "react"

const COLORS = { light: "#ffffff", dark: "#0a0a0a" }

// Keeps the browser UI colour in sync with the theme class set by ThemeProvider.
export function useThemeColorMeta() {
  useEffect(() => {
    const root = document.documentElement
    const sync = () => {
      document
        .querySelector('meta[name="theme-color"]')
        ?.setAttribute(
          "content",
          root.classList.contains("dark") ? COLORS.dark : COLORS.light
        )
    }
    sync()
    const observer = new MutationObserver(sync)
    observer.observe(root, { attributes: true, attributeFilter: ["class"] })
    return () => observer.disconnect()
  }, [])
}
