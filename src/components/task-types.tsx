import { t, type MessageKey } from "@/lib/i18n"
import { cn } from "@/lib/utils"

// Math notation is language-independent; colour only reinforces the type.
export const TYPE_META: Record<
  string,
  { glyph: string; name: MessageKey; text: string; tint: string; bar: string }
> = {
  linear: {
    glyph: "a/b",
    name: "typeLinear",
    text: "text-type-linear",
    tint: "bg-type-linear/15",
    bar: "bg-type-linear",
  },
  terms: {
    glyph: "( )",
    name: "typeTerms",
    text: "text-type-terms",
    tint: "bg-type-terms/15",
    bar: "bg-type-terms",
  },
  powers: {
    glyph: "√",
    name: "typePowers",
    text: "text-type-powers",
    tint: "bg-type-powers/15",
    bar: "bg-type-powers",
  },
  quadratic: {
    glyph: "x²",
    name: "typeQuadratic",
    text: "text-type-quadratic",
    tint: "bg-type-quadratic/15",
    bar: "bg-type-quadratic",
  },
}

export const typeName = (type: string) => t(TYPE_META[type].name)

export function TypeGlyph({
  type,
  className,
}: {
  type: string
  className?: string
}) {
  const meta = TYPE_META[type]
  return (
    <span
      aria-hidden="true"
      className={cn(
        "grid h-7 min-w-8 place-items-center rounded-md px-1.5 font-mono text-sm font-semibold",
        meta.text,
        meta.tint,
        className
      )}
    >
      {meta.glyph}
    </span>
  )
}

export function TypeChip({ type }: { type: string }) {
  const meta = TYPE_META[type]
  return (
    <span className="flex min-w-0 items-center gap-2">
      <TypeGlyph type={type} />
      <span className={cn("truncate text-sm font-medium", meta.text)}>
        {typeName(type)}
      </span>
    </span>
  )
}
