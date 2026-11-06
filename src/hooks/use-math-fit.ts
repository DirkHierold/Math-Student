import { useEffect } from "react"

import { t } from "@/lib/i18n"
import { fittedMathScale, sharedMathScale } from "../../math-layout.js"

// Scales every KaTeX block below `root` to its container; all answers share one scale.
export function useMathFit(
  root: React.RefObject<HTMLElement | null>,
  enabled: boolean,
  deps: unknown[],
  onError: (error: Error) => void
) {
  useEffect(() => {
    const element = root.current
    if (!enabled || !element) return undefined

    let frame = 0
    let disposed = false
    let fontsReady = false

    const fit = () => {
      cancelAnimationFrame(frame)
      frame = requestAnimationFrame(() => {
        if (disposed || !fontsReady) return
        if (document.fonts?.status === "loading") {
          document.fonts.ready.then(fit).catch(onError)
          return
        }
        const containers = [
          ...element.querySelectorAll<HTMLElement>("[data-math-kind]"),
        ]
        const measurements = containers.map((container) => {
          const content = container.querySelector<HTMLElement>(".katex")
          if (!content || !container.clientWidth || !container.clientHeight) {
            return null
          }
          const style = getComputedStyle(container)
          const width = Math.max(
            0,
            container.clientWidth -
              parseFloat(style.paddingLeft) -
              parseFloat(style.paddingRight)
          )
          const height = Math.max(
            0,
            container.clientHeight -
              parseFloat(style.paddingTop) -
              parseFloat(style.paddingBottom)
          )
          return {
            container,
            content,
            scale: fittedMathScale(
              width,
              height,
              content.offsetWidth,
              content.offsetHeight
            ),
          }
        })
        if (measurements.some((item) => !item || item.scale === null)) {
          onError(
            new Error(t("errFitSpace"))
          )
          return
        }
        const items = measurements as NonNullable<(typeof measurements)[number]>[]
        const answerScale = sharedMathScale(
          items
            .filter((item) => item.container.dataset.mathKind === "choice")
            .map((item) => item.scale)
        )
        if (answerScale === null) {
          onError(
            new Error(t("errFitShared"))
          )
          return
        }
        items.forEach(({ container, content, scale }) => {
          content.style.setProperty(
            "--math-scale",
            String(container.dataset.mathKind === "choice" ? answerScale : scale)
          )
          container.classList.add("math-ready")
        })
      })
    }

    const observer = new ResizeObserver(fit)
    observer.observe(element)
    if (document.fonts?.ready) {
      document.fonts.ready
        .then(() => {
          fontsReady = true
          fit()
        })
        .catch(onError)
    } else {
      fontsReady = true
      fit()
    }
    window.addEventListener("resize", fit)
    return () => {
      disposed = true
      cancelAnimationFrame(frame)
      observer.disconnect()
      window.removeEventListener("resize", fit)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [root, enabled, onError, ...deps])
}
