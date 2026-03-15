import type { PostVariant } from "./variant.js";
import { hotTakeVariant } from "./hot-take.js";
import { deepInsightVariant } from "./deep-insight.js";

export type { PostVariant } from "./variant.js";

const VARIANT_REGISTRY: Record<string, PostVariant> = {
  [hotTakeVariant.id]: hotTakeVariant,
  [deepInsightVariant.id]: deepInsightVariant,
};

export const DEFAULT_VARIANTS = [hotTakeVariant.id, deepInsightVariant.id];

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
