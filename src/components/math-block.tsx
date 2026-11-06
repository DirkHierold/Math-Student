import { useLayoutEffect, useRef } from "react"
import katex from "katex"

import { cn } from "@/lib/utils"

type MathBlockProps = {
  tex: string
  kind: "task" | "choice"
  onError: (error: Error) => void
  className?: string
}

export function MathBlock({ tex, kind, onError, className }: MathBlockProps) {
  const ref = useRef<HTMLDivElement>(null)

  useLayoutEffect(() => {
    const element = ref.current
    if (!element) return
    try {
      element.classList.remove("math-ready")
      element.replaceChildren()
      katex.render(tex, element, {
        displayMode: true,
        throwOnError: true,
        trust: false,
      })
    } catch (error) {
      onError(error as Error)
    }
  }, [tex, onError])

  return (
    <div
      ref={ref}
      className={cn("math-fit", `math-${kind}`, className)}
      data-math-kind={kind}
    />
  )
}
