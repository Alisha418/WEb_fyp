import React from 'react';
import { Loader2, Upload, X } from 'lucide-react';
import type { AiVerificationPayload } from './AdminAiVerificationDialog';
import {
  categoriesFromVerification,
  chipClassForDetection,
  confidenceToPercent,
  groupDetectionsByClass,
  minConfidencePercent,
  mixedConfidencePercent,
} from '../utils/groupAiDetections';

const pct = confidenceToPercent;

type Props = {
  open: boolean;
  imagePreview: string;
  verification: AiVerificationPayload | null;
  loading?: boolean;
  passed?: boolean;
  onClose: () => void;
  onChangeImage?: () => void;
  /** Report details: class names only on image (no %). Default true for create-task. */
  showPercentOnImage?: boolean;
};

export function ReportAiDetectionModal({
  open,
  imagePreview,
  verification,
  loading = false,
  passed: passedProp,
  onClose,
  onChangeImage,
  showPercentOnImage = true,
}: Props) {
  if (!open) return null;

  const confPct = pct(
    verification?.ai_confidence ?? verification?.peak_confidence,
  );
  const wasteType = verification?.waste_type;
  const allBoxes = verification?.detection_boxes ?? [];
  const allowed = new Set(
    (verification?.model_class_names ?? []).map((c) => c.trim()),
  );
  const boxes =
    allowed.size > 0
      ? allBoxes.filter((b) => allowed.has((b.class || '').trim()))
      : allBoxes;
  const grouped = categoriesFromVerification(verification);
  const displayCategories =
    grouped.length > 0 ? grouped : groupDetectionsByClass(boxes);
  const minPct = minConfidencePercent(verification);
  const mixedPct = mixedConfidencePercent(verification);
  const passed = passedProp ?? verification?.passed ?? false;

  return (
    <div
      className="fixed inset-0 z-[85] flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="AI waste detection"
    >
      <div
        className="relative w-full max-w-3xl max-h-[90vh] flex flex-col rounded-2xl border border-slate-700 bg-slate-950 shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-800 bg-slate-900/90">
          <div>
            <p className="text-sm font-semibold text-white tracking-wide">
              AI waste detection
            </p>
            {!loading && wasteType && (
              <p className="text-xs text-slate-400 mt-0.5">
                <span className="text-slate-200 font-medium">{wasteType}</span>
                {' · '}
                {verification?.pass_mode === 'mixed'
                  ? `avg ${confPct}% (mixed pass)`
                  : `${confPct}% confidence`}
                {verification?.pass_reason ? ` — ${verification.pass_reason}` : ''}
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 disabled:opacity-50"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="relative flex-1 min-h-[240px] bg-black flex items-center justify-center p-3">
          {loading ? (
            <div className="flex flex-col items-center gap-3 py-16">
              <Loader2 className="w-10 h-10 text-emerald-400 animate-spin" />
              <p className="text-sm text-slate-300 font-medium">
                Analyzing image with YOLO...
              </p>
            </div>
          ) : (
            <div className="relative w-full max-h-[60vh] min-h-[200px]">
              <img
                src={imagePreview}
                alt="Report with AI detections"
                className="w-full max-h-[60vh] object-contain mx-auto"
              />
              {boxes.map((box, i) => (
                <BboxOverlay
                  key={`det-${box.class}-${i}`}
                  box={box}
                  minPct={minPct}
                  mixedPct={mixedPct}
                  showPercent={showPercentOnImage}
                  large
                />
              ))}
            </div>
          )}
        </div>

        {!loading && (
          <div className="px-4 py-3 border-t border-slate-800 bg-slate-900/90 max-h-40 overflow-y-auto">
            <p className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold mb-2">
              {showPercentOnImage
                ? `All types — green ≥${minPct}% · amber ≥${mixedPct}%`
                : 'Waste types detected (model classes)'}
            </p>
            {displayCategories.length > 0 ? (
            <ul className="flex flex-wrap gap-2">
              {displayCategories.map((g) => (
                <li
                  key={g.class}
                  className={`text-xs font-medium px-2.5 py-1 rounded-md border ${chipClassForDetection(
                    g.confidence,
                    minPct,
                    mixedPct,
                  )}`}
                >
                  {showPercentOnImage
                    ? `${g.class} · ${pct(g.confidence)}%${
                        g.regionCount > 1 ? ` (${g.regionCount} areas)` : ''
                      }`
                    : g.regionCount > 1
                      ? `${g.class} (${g.regionCount} areas)`
                      : g.class}
                </li>
              ))}
            </ul>
            ) : (
              <p className="text-xs text-amber-400/90 text-center">
                No waste regions detected on this image.
              </p>
            )}
          </div>
        )}

        <div className="flex gap-2 px-4 py-3 border-t border-slate-800 bg-slate-900/90">
          {onChangeImage && !loading && (
            <button
              type="button"
              onClick={() => {
                onClose();
                onChangeImage();
              }}
              className="flex-1 inline-flex items-center justify-center gap-1.5 text-sm font-medium py-2.5 rounded-lg bg-slate-800 border border-slate-600 text-slate-200 hover:bg-slate-700"
            >
              <Upload className="w-4 h-4" />
              Change image
            </button>
          )}
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="flex-1 text-sm font-medium py-2.5 rounded-lg border border-slate-600 text-slate-300 hover:bg-slate-800 disabled:opacity-50"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

function BboxOverlay({
  box,
  minPct,
  mixedPct,
  showPercent,
  large,
}: {
  box: NonNullable<AiVerificationPayload['detection_boxes']>[number];
  minPct: number;
  mixedPct: number;
  showPercent?: boolean;
  large?: boolean;
}) {
  const b = box.bbox;
  if (!b) return null;
  const c = pct(box.confidence);
  const meets = c >= minPct;
  const meetsMixed = c >= mixedPct;
  const color = meets
    ? 'border-emerald-400'
    : meetsMixed
      ? 'border-amber-400/90'
      : 'border-slate-500/80';
  const labelBg = meets
    ? 'bg-emerald-600/95'
    : meetsMixed
      ? 'bg-amber-600/95'
      : 'bg-slate-600/95';

  return (
    <div
      className={`absolute border-2 ${color} rounded-sm pointer-events-none ${
        large ? 'border-[3px]' : ''
      }`}
      style={{
        left: `${b.x1 * 100}%`,
        top: `${b.y1 * 100}%`,
        width: `${(b.x2 - b.x1) * 100}%`,
        height: `${(b.y2 - b.y1) * 100}%`,
      }}
    >
      <span
        className={`absolute left-0 whitespace-nowrap font-semibold text-white px-1.5 py-0.5 rounded ${labelBg} ${
          large ? 'text-xs -top-6' : 'text-[9px] -top-5'
        }`}
      >
        {showPercent ? `${box.class} ${c}%` : box.class}
      </span>
    </div>
  );
}
