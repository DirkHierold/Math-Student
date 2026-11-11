import { type MessageKey } from "@/lib/i18n"

// Keys come from explanationKey() in the engine; each names the rule behind a step.
export const EXPLAIN: Record<string, MessageKey> = {
  "linear-0": "explainLinear0",
  "linear-1": "explainLinear1",
  "terms-expand": "explainTermsExpand",
  "terms-collect": "explainTermsCollect",
  "fractions-simplify": "explainFractionsSimplify",
  "fractions-add": "explainFractionsAdd",
  "fractions-multiply": "explainFractionsMultiply",
  "fractions-divide": "explainFractionsDivide",
  "fractions-percent": "explainFractionsPercent",
  "squares-square": "explainSquaresSquare",
  "squares-root": "explainSquaresRoot",
  "squares-binomial": "explainSquaresBinomial",
  "squares-product": "explainSquaresProduct",
  "powers-product": "explainPowersProduct",
  "powers-quotient": "explainPowersQuotient",
  "powers-power": "explainPowersPower",
  "powers-negative": "explainPowersNegative",
  "powers-fractional": "explainPowersFractional",
  "powers-negative-fractional": "explainPowersNegativeFractional",
  "powers-root": "explainPowersRoot",
}
