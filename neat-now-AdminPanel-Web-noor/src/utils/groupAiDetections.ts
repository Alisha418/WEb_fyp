/** Minimum confidence for pass (matches backend WASTE_MIN_CONFIDENCE). */
export const DEFAULT_MIN_WASTE_CONFIDENCE_PERCENT = 20;

/** One row per waste type (merged from multiple YOLO bounding boxes). */
export type GroupedDetection = {
  class: string;
  confidence: number;
  regionCount: number;
};

export type WasteCategoryPayload = {
  class?: string;
  confidence?: number;
  region_count?: number;
};

export function confidenceToPercent(value: number | undefined | null): number {
  if (value == null || Number.isNaN(Number(value))) return 0;
  const n = Number(value);
  return n <= 1 ? Math.round(n * 100) : Math.round(n);
}

/**
 * YOLO returns one detection per bounding box. The same class (e.g. Plastic)
 * can appear many times if the model sees several regions in one photo.
 */
export function groupDetectionsByClass(
  items: { class?: string; confidence?: number }[],
): GroupedDetection[] {
  const map = new Map<string, { max: number; count: number }>();

  for (const d of items) {
    const name = (d.class || 'Unknown').trim();
    const raw = d.confidence ?? 0;
    const conf = raw <= 1 ? raw : raw / 100;
    const prev = map.get(name);
    if (!prev) {
      map.set(name, { max: conf, count: 1 });
    } else {
      prev.count += 1;
      prev.max = Math.max(prev.max, conf);
    }
  }

  return [...map.entries()]
    .map(([className, { max, count }]) => ({
      class: className,
      confidence: max,
      regionCount: count,
    }))
    .sort((a, b) => b.confidence - a.confidence);
}

export function detectionMeetsPass(
  confidence: number | undefined | null,
  minPct: number,
): boolean {
  return confidenceToPercent(confidence) >= minPct;
}

/** Green when pass threshold met; amber when below — always visible, never hidden. */
export function mixedConfidencePercent(verification: {
  mixed_min_confidence_percent?: number;
  mixed_min_confidence_required?: number;
} | null | undefined): number {
  if (verification?.mixed_min_confidence_percent != null) {
    return verification.mixed_min_confidence_percent;
  }
  if (verification?.mixed_min_confidence_required != null) {
    return confidenceToPercent(verification.mixed_min_confidence_required);
  }
  return DEFAULT_MIN_WASTE_CONFIDENCE_PERCENT;
}

export function chipClassForDetection(
  confidence: number | undefined | null,
  minPct: number,
  mixedMinPct?: number,
): string {
  const c = confidenceToPercent(confidence);
  if (c >= minPct) {
    return 'border-emerald-500/40 text-emerald-200 bg-emerald-500/10';
  }
  const mixed = mixedMinPct ?? DEFAULT_MIN_WASTE_CONFIDENCE_PERCENT;
  if (c >= mixed) {
    return 'border-amber-500/50 text-amber-200 bg-amber-500/15';
  }
  return 'border-slate-600 text-slate-400 bg-slate-800/80';
}

export function categoriesFromVerification(verification: {
  waste_categories?: WasteCategoryPayload[];
  top_detections?: { class?: string; confidence?: number }[];
  detection_boxes?: { class?: string; confidence?: number }[];
} | null | undefined): GroupedDetection[] {
  const boxes = verification?.detection_boxes ?? [];
  if (verification?.waste_categories?.length) {
    return verification.waste_categories.map((c) => ({
      class: (c.class || 'Unknown').trim(),
      confidence: c.confidence ?? 0,
      regionCount: c.region_count ?? 1,
    }));
  }
  if (boxes.length > 0) {
    return groupDetectionsByClass(boxes);
  }
  const merged = [...(verification?.top_detections ?? [])];
  return groupDetectionsByClass(merged);
}

export function minConfidencePercent(verification: {
  min_confidence_percent?: number;
  min_confidence_required?: number;
} | null | undefined): number {
  if (verification?.min_confidence_percent != null) {
    return verification.min_confidence_percent;
  }
  if (verification?.min_confidence_required != null) {
    return confidenceToPercent(verification.min_confidence_required);
  }
  return DEFAULT_MIN_WASTE_CONFIDENCE_PERCENT;
}

export function formatGroupedDetectionLabel(
  g: GroupedDetection,
  showPercent = true,
): string {
  if (!showPercent) {
    return g.regionCount > 1
      ? `${g.class} (${g.regionCount} areas)`
      : g.class;
  }
  const p = confidenceToPercent(g.confidence);
  if (g.regionCount > 1) {
    return `${g.class} · ${p}% (${g.regionCount} areas in photo)`;
  }
  return `${g.class} · ${p}%`;
}
