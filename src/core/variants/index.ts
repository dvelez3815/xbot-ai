import type { PostVariant } from "./variant.js";
import { PostVariants } from "../../constants.js";
import { quickInsightVariant } from "./quick-insight.js";
import { deepInsightVariant } from "./deep-insight.js";
import { spicyQuestionVariant } from "./spicy-question.js";

export type { PostVariant } from "./variant.js";

const VARIANT_REGISTRY: Record<string, PostVariant> = {
  [PostVariants.QUICK_INSIGHT]: quickInsightVariant,
  [PostVariants.DEEP_INSIGHT]: deepInsightVariant,
  [PostVariants.SPICY_QUESTION]: spicyQuestionVariant,
};

export const DEFAULT_VARIANTS = [PostVariants.QUICK_INSIGHT, PostVariants.DEEP_INSIGHT];

export function getVariant(id: string): PostVariant {
  const variant = VARIANT_REGISTRY[id];
  if (!variant) {
    const available = Object.keys(VARIANT_REGISTRY).join(", ");
    throw new Error(`Unknown post variant: "${id}". Available: ${available}`);
  }
  return variant;
}

export function getVariants(ids: string[]): PostVariant[] {
  return ids.map(getVariant);
}
