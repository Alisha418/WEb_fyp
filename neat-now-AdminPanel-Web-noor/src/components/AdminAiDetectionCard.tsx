import React, { useState } from 'react';
import { Loader2, Upload, X, ZoomIn } from 'lucide-react';
import type { AiVerificationPayload } from './AdminAiVerificationDialog';
import {
  categoriesFromVerification,
  chipClassForDetection,
  confidenceToPercent,
  formatGroupedDetectionLabel,
  minConfidencePercent,
  mixedConfidencePercent,
  type GroupedDetection,
} from '../utils/groupAiDetections';
import { ReportAiDetectionModal } from './ReportAiDetectionModal';

export type AiDetectionStatus = 'checking' | 'passed' | 'failed';

type Props = {
  status: AiDetectionStatus;
  verification: AiVerificationPayload | null;
  imagePreview: string;
  failMessage?: string;
  onChangeImage?: () => void;
  onRemoveImage?: () => void;
};

const pct = confidenceToPercent;

export function AdminAiDetectionCard({
  status,
  verification,
  imagePreview,
  failMessage,
  onChangeImage,
  onRemoveImage,
}: Props) {
  const [previewOpen, setPreviewOpen] = useState(false);
  const confPct = pct(
    verification?.ai_confidence ?? verification?.peak_confidence,
  );
  const wasteType = verification?.waste_type;
  const boxes = verification?.detection_boxes ?? [];
  const categories = categoriesFromVerification(verification);
  const minPct = minConfidencePercent(verification);
  const mixedPct = mixedConfidencePercent(verification);
  const border =
    status === 'checking'
      ? 'border-cyan-500/40'
      : status === 'passed'
        ? 'border-emerald-500/50'
        : 'border-red-500/40';

  const canOpenPreview = status !== 'checking';

  return (
    <>
      <div
        className={`rounded-2xl border-2 overflow-hidden bg-slate-950/80 shadow-lg ${border}`}
      >
        <button
          type="button"
          onClick={() => canOpenPreview && setPreviewOpen(true)}
          disabled={!canOpenPreview}
          className={`relative w-full aspect-[4/3] max-h-72 bg-black block ${
            canOpenPreview
              ? 'cursor-zoom-in group'
              : 'cursor-default'
          }`}
          title={canOpenPreview ? 'Click to view detections' : undefined}
        >
          <img
            src={imagePreview}
            alt="Upload preview"
            className="w-full h-full object-contain"
          />

          {status !== 'checking' &&
            boxes.map((box, i) => (
              <BboxOverlay
                key={`${box.class}-${i}`}
                box={box}
                minPct={minPct}
                mixedPct={mixedPct}
              />
            ))}

          {status === 'checking' && (
            <div className="absolute inset-0 bg-slate-950/75 flex flex-col items-center justify-center gap-3">
              <Loader2 className="w-10 h-10 text-cyan-400 animate-spin" />
              <p className="text-sm font-semibold text-cyan-200">AI verification...</p>
              <p className="text-xs text-slate-400">Scanning image for waste</p>
            </div>
          )}

          {canOpenPreview && (
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/35 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
              <span className="inline-flex items-center gap-2 text-xs font-semibold text-white bg-slate-900/80 px-3 py-2 rounded-lg border border-slate-600">
                <ZoomIn className="w-4 h-4" />
                View detections
              </span>
            </div>
          )}
        </button>

        <div className="px-4 py-3 border-t border-slate-800/80 bg-slate-900/90">
          {status === 'checking' && (
            <p className="text-xs text-slate-400 text-center">Please wait</p>
          )}

          {status === 'passed' && (
            <div className="text-center space-y-2">
              <p className="text-base font-bold text-emerald-400">
                {verification?.pass_mode === 'mixed' ? 'Mixed waste detected' : 'Waste detected'}
              </p>
              <p className="text-sm text-white">
                {verification?.pass_mode === 'mixed' ? 'Avg across types' : 'Confidence'}:{' '}
                <span className="font-bold text-emerald-300">{confPct}%</span>
              </p>
              {wasteType ? (
                <p className="text-sm text-slate-300">
                  {verification?.is_mixed_waste ? 'Types' : 'Primary type'}:{' '}
                  <span className="font-semibold text-white">{wasteType}</span>
                </p>
              ) : null}
              {verification?.pass_reason ? (
                <p className="text-[10px] text-emerald-400/90 leading-snug px-1">
                  {verification.pass_reason}
                </p>
              ) : null}
              <WasteCategoriesList
                categories={categories}
                minPct={minPct}
                mixedPct={mixedPct}
              />
              <ImageActions
                onChangeImage={onChangeImage}
                onRemoveImage={onRemoveImage}
              />
            </div>
          )}

          {status === 'failed' && (
            <div className="space-y-2">
              <WasteCategoriesList
                categories={categories}
                minPct={minPct}
                mixedPct={mixedPct}
              />
              <p className="text-base font-bold text-red-400 text-center">
                Waste not verified
              </p>
              <p className="text-xs text-slate-400 text-center leading-relaxed">
                {failMessage ||
                  `Need ${minPct}%+ on one type, or 2+ types at ${mixedPct}%+ with 2+ regions.`}
              </p>
              {confPct > 0 && (
                <p className="text-xs text-slate-500 text-center">
                  Peak: {pct(verification?.peak_confidence ?? confPct)}% · need {minPct}%+ or 2×{mixedPct}%+
                </p>
              )}
              <ImageActions
                onChangeImage={onChangeImage}
                onRemoveImage={onRemoveImage}
              />
            </div>
          )}
        </div>
      </div>

      <ReportAiDetectionModal
        open={previewOpen}
        imagePreview={imagePreview}
        verification={verification}
        passed={status === 'passed'}
        onClose={() => setPreviewOpen(false)}
        onChangeImage={onChangeImage}
      />
    </>
  );
}

function WasteCategoriesList({
  categories,
  minPct,
  mixedPct,
}: {
  categories: GroupedDetection[];
  minPct: number;
  mixedPct: number;
}) {
  return (
    <div className="pt-1">
      <p className="text-[10px] text-slate-500 text-center mb-1.5 leading-snug">
        Green ≥{minPct}% · amber ≥{mixedPct}% (mixed pass) · always shown
      </p>
      {categories.length > 0 ? (
        <div className="flex flex-wrap justify-center gap-1.5">
          {categories.map((g) => (
            <span
              key={g.class}
              className={`text-[10px] font-medium px-2 py-0.5 rounded border ${chipClassForDetection(
                g.confidence,
                minPct,
                mixedPct,
              )}`}
            >
              {formatGroupedDetectionLabel(g)}
            </span>
          ))}
        </div>
      ) : (
        <p className="text-[10px] text-amber-400/90 text-center">
          No waste regions detected on this image
        </p>
      )}
    </div>
  );
}

function ImageActions({
  onChangeImage,
  onRemoveImage,
}: {
  onChangeImage?: () => void;
  onRemoveImage?: () => void;
}) {
  if (!onChangeImage && !onRemoveImage) return null;
  return (
    <div className="flex justify-center gap-2 pt-1">
      {onChangeImage && (
        <button
          type="button"
          onClick={onChangeImage}
          className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-lg bg-slate-800 border border-slate-600 text-slate-200 hover:bg-slate-700"
        >
          <Upload className="w-3.5 h-3.5" />
          Change image
        </button>
      )}
      {onRemoveImage && (
        <button
          type="button"
          onClick={onRemoveImage}
          className="inline-flex items-center gap-1 text-xs font-semibold px-3 py-2 rounded-lg text-red-400 hover:text-red-300"
        >
          <X className="w-3.5 h-3.5" />
          Remove
        </button>
      )}
    </div>
  );
}


function BboxOverlay({
  box,
  minPct,
  mixedPct,
  large,
}: {
  box: NonNullable<AiVerificationPayload['detection_boxes']>[number];
  minPct: number;
  mixedPct: number;
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
      ? 'border-amber-400/80'
      : 'border-slate-500/70';
  const labelBg = meets
    ? 'bg-emerald-600'
    : meetsMixed
      ? 'bg-amber-600'
      : 'bg-slate-600';

  return (
    <div
      className={`absolute border-2 ${color} rounded-sm pointer-events-none shadow-sm ${
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
        className={`absolute left-0 whitespace-nowrap font-bold text-white px-1.5 py-0.5 rounded ${labelBg} ${
          large ? 'text-xs -top-6' : 'text-[9px] max-w-[120px] truncate -top-5'
        }`}
      >
        {box.class} {c}%
      </span>
    </div>
  );
}

