import React from 'react';
import { AlertTriangle, CheckCircle2, ScanSearch } from 'lucide-react';
import {
  categoriesFromVerification,
  chipClassForDetection,
  confidenceToPercent,
  minConfidencePercent,
  mixedConfidencePercent,
} from '../utils/groupAiDetections';

export type AiVerificationPayload = {
  passed?: boolean;
  ai_result?: string;
  ai_confidence?: number;
  peak_confidence?: number;
  min_confidence_required?: number;
  min_confidence_percent?: number;
  mixed_min_confidence_percent?: number;
  mixed_min_confidence_required?: number;
  pass_mode?: 'strong' | 'mixed' | null;
  pass_reason?: string;
  is_mixed_waste?: boolean;
  model_class_names?: string[];
  waste_type?: string | null;
  below_threshold?: boolean;
  top_detections?: { class?: string; confidence?: number }[];
  waste_categories?: {
    class?: string;
    confidence?: number;
    region_count?: number;
  }[];
  detection_boxes?: {
    class?: string;
    confidence?: number;
    bbox?: { x1: number; y1: number; x2: number; y2: number };
  }[];
  image_width?: number | null;
  image_height?: number | null;
};

type Props = {
  mode: 'rejected' | 'passed';
  title: string;
  message: string;
  verification: AiVerificationPayload | null;
  imagePreview?: string;
  onDismiss: () => void;
  onRemoveImage?: () => void;
};

const pct = confidenceToPercent;

export function AdminAiVerificationDialog({
  mode,
  title,
  message,
  verification,
  imagePreview,
  onDismiss,
  onRemoveImage,
}: Props) {
  const minPct = minConfidencePercent(verification);
  const mixedPct = mixedConfidencePercent(verification);
  const confPct = pct(
    verification?.ai_confidence ?? verification?.peak_confidence,
  );
  const isRejected = mode === 'rejected';
  const barColor = isRejected
    ? confPct >= minPct
      ? 'bg-amber-400'
      : 'bg-red-500'
    : 'bg-emerald-400';

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
      <div
        className={`bg-gradient-to-br from-slate-900 via-slate-900 to-slate-950 border rounded-2xl max-w-md w-full p-8 shadow-2xl ${
          isRejected
            ? 'border-red-500/40 shadow-red-950/40'
            : 'border-emerald-500/40 shadow-emerald-950/30'
        }`}
      >
        <div
          className={`w-[4.5rem] h-[4.5rem] mx-auto mb-5 rounded-2xl flex items-center justify-center border-2 shadow-lg ${
            isRejected
              ? 'bg-red-500/15 border-red-400/50 text-red-300'
              : 'bg-emerald-500/15 border-emerald-400/50 text-emerald-300'
          }`}
        >
          {isRejected ? (
            <AlertTriangle className="w-9 h-9" strokeWidth={2.2} />
          ) : (
            <CheckCircle2 className="w-9 h-9" strokeWidth={2.2} />
          )}
        </div>

        <h3 className="text-xl font-bold text-white text-center mb-2 tracking-tight">
          {title}
        </h3>
        <p className="text-sm text-slate-300 text-center leading-relaxed mb-5">
          {message}
        </p>

        {imagePreview ? (
          <div className="relative mx-auto w-full max-w-[220px] mb-5 rounded-xl overflow-hidden border border-slate-700 ring-2 ring-slate-800">
            <img
              src={imagePreview}
              alt="Uploaded"
              className="w-full h-36 object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 to-transparent pointer-events-none" />
          </div>
        ) : null}

        <div className="rounded-xl border border-slate-700/80 bg-slate-900/60 p-4 mb-4">
          <div className="flex items-center justify-between text-xs mb-2">
            <span className="text-slate-400 font-medium">AI confidence</span>
            <span
              className={`font-bold ${isRejected ? 'text-red-300' : 'text-emerald-300'}`}
            >
              {minPct}%+ one type or {mixedPct}%+ on 2+ types
            </span>
          </div>
          <div className="relative h-3 rounded-full bg-slate-800 overflow-hidden mb-2">
            <div
              className={`h-full rounded-full transition-all duration-500 ${barColor}`}
              style={{ width: `${Math.min(100, confPct)}%` }}
            />
            <div
              className="absolute top-0 bottom-0 w-0.5 bg-amber-400/90 z-10"
              style={{ left: `${minPct}%` }}
              title={`${minPct}% threshold`}
            />
          </div>
          <p className="text-xs text-slate-500 text-center">
            {isRejected
              ? confPct > 0
                ? `Detected ${confPct}% — need at least ${minPct}% to approve`
                : `No waste detected at ${minPct}%+ confidence`
              : verification?.pass_mode === 'mixed'
                ? `Mixed waste verified (avg ${confPct}%; peak ${pct(verification?.peak_confidence)}%)`
                : `Verified at ${confPct}% (single-type ${minPct}%+)`}
          </p>
        </div>

        {verification?.pass_reason && !isRejected ? (
          <p className="text-xs text-emerald-400/90 text-center mb-3 leading-relaxed px-1">
            {verification.pass_reason}
          </p>
        ) : null}

        {verification?.waste_type && !isRejected ? (
          <p className="text-sm text-emerald-300 text-center font-semibold mb-3">
            Type: {verification.waste_type}
          </p>
        ) : null}

        {verification ? (
          <div className="rounded-xl border border-slate-700/60 bg-slate-950/50 p-3 mb-5 max-h-36 overflow-y-auto">
            <p className="text-[10px] uppercase tracking-wider text-slate-500 font-bold mb-1 flex items-center gap-1.5">
              <ScanSearch className="w-3.5 h-3.5" />
              All waste types on image
            </p>
            <p className="text-[10px] text-slate-500 mb-2 leading-snug">
              Green ≥{minPct}% (strong pass); amber ≥{mixedPct}% (counts toward mixed pass).
            </p>
            {categoriesFromVerification(verification).length > 0 ? (
              <ul className="space-y-1.5">
                {categoriesFromVerification(verification).map((g) => {
                  const c = pct(g.confidence);
                  const ok = c >= minPct;
                  return (
                    <li
                      key={g.class}
                      className="flex items-center justify-between text-xs gap-2"
                    >
                      <span className="text-slate-300 truncate">
                        {g.class}
                        {g.regionCount > 1
                          ? ` (${g.regionCount} areas in photo)`
                          : ''}
                      </span>
                      <span
                        className={`font-mono font-semibold shrink-0 px-1.5 py-0.5 rounded border ${chipClassForDetection(
                          g.confidence,
                          minPct,
                          mixedPct,
                        )}`}
                      >
                        {c}%
                      </span>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <p className="text-xs text-amber-400/90 text-center">
                No waste regions detected
              </p>
            )}
          </div>
        ) : null}

        <div className="flex gap-3">
          <button
            type="button"
            onClick={onDismiss}
            className="flex-1 py-3 rounded-xl border border-slate-600 text-slate-200 font-semibold hover:bg-slate-800 transition-colors"
          >
            {isRejected ? 'Try another image' : 'Continue'}
          </button>
          {isRejected && onRemoveImage ? (
            <button
              type="button"
              onClick={onRemoveImage}
              className="flex-1 py-3 rounded-xl bg-gradient-to-r from-red-600 to-red-700 text-white font-semibold hover:from-red-500 hover:to-red-600 shadow-lg shadow-red-900/30 transition-all"
            >
              Remove image
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
