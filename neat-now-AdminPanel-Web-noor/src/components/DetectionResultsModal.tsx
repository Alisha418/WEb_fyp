import React from 'react';
import { X, Loader } from 'lucide-react';
import { Detection } from '../services/aiDetectionService';

interface DetectionResultsModalProps {
  isOpen: boolean;
  imageSrc: string;
  detections: Detection[];
  isLoading: boolean;
  onClose: () => void;
  resultImage?: string;
}

export function DetectionResultsModal({
  isOpen,
  imageSrc,
  detections,
  isLoading,
  onClose,
  resultImage,
}: DetectionResultsModalProps) {
  if (!isOpen) return null;

  // Group detections by waste type and keep highest confidence of each type
  const groupedDetections = detections.reduce((acc, detection) => {
    const wasteType = detection.class;
    const existing = acc.find(d => d.class === wasteType);
    
    if (!existing) {
      acc.push({ ...detection, count: 1 });
    } else {
      // Keep the one with higher confidence, but increment count
      if (detection.confidence > existing.confidence) {
        existing.x1 = detection.x1;
        existing.y1 = detection.y1;
        existing.x2 = detection.x2;
        existing.y2 = detection.y2;
        existing.confidence = detection.confidence;
      }
      existing.count = (existing.count || 1) + 1;
    }
    return acc;
  }, [] as (Detection & { count?: number })[]);

  // Calculate statistics
  const stats = {
    total: detections.length,
    avgConfidence: detections.length > 0 
      ? (detections.reduce((sum, d) => sum + d.confidence, 0) / detections.length * 100).toFixed(1)
      : 0,
    classes: groupedDetections.length,
  };

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center p-4 bg-black/90 backdrop-blur-md">
      <div className="relative max-w-6xl w-full bg-gradient-to-b from-slate-900 via-slate-900/95 to-slate-950 rounded-2xl overflow-hidden shadow-2xl border border-slate-700/80 max-h-[92vh] overflow-y-auto">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-6 right-6 z-10 p-2.5 bg-gradient-to-br from-emerald-500/25 to-teal-500/25 hover:from-emerald-500/50 hover:to-teal-500/50 text-emerald-300 hover:text-emerald-200 rounded-lg transition-all border border-emerald-500/40 hover:border-emerald-500/80 hover:shadow-lg hover:shadow-emerald-500/20 group"
        >
          <X className="w-5 h-5 group-hover:rotate-90 transition-transform duration-300" />
        </button>

        <div className="p-10">
          {/* Header */}
          <div className="mb-10">
            <div className="flex items-center gap-4 mb-4">
              <div className="p-3 bg-gradient-to-br from-emerald-500/20 to-teal-500/20 rounded-lg border border-emerald-500/40 group">
                <span className="text-3xl">🤖</span>
              </div>
              <div>
                <h2 className="text-4xl font-bold text-white mb-1">AI Detection Results</h2>
                <p className="text-slate-400 text-sm font-medium">Advanced YOLOv8 waste classification & object detection analysis</p>
              </div>
            </div>
            <div className="h-1 w-32 bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-500 rounded-full"></div>
          </div>

          {isLoading ? (
            // Loading State
            <div className="flex flex-col items-center justify-center py-16">
              <div className="relative mb-6">
                <div className="absolute inset-0 bg-emerald-500/20 rounded-full blur-2xl animate-pulse"></div>
                <Loader className="w-10 h-10 text-emerald-400 animate-spin relative" />
              </div>
              <p className="text-slate-200 font-medium text-lg">Processing image with AI model...</p>
              <p className="text-slate-400 text-sm mt-2">⏳ Please wait while YOLOv8 analyzes the waste</p>
            </div>
          ) : (
            <>
              {/* Statistics */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                <div className="bg-gradient-to-br from-emerald-500/15 to-emerald-500/5 border border-emerald-500/40 rounded-xl p-5 shadow-lg shadow-emerald-500/10 hover:shadow-emerald-500/20 hover:border-emerald-500/60 transition-all">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-slate-400 text-xs font-semibold uppercase tracking-wider mb-2">📊 Total Detected</p>
                      <p className="text-3xl font-bold text-emerald-300">{stats.total}</p>
                    </div>
                    <div className="text-4xl opacity-20">📦</div>
                  </div>
                </div>
                <div className="bg-gradient-to-br from-teal-500/15 to-teal-500/5 border border-teal-500/40 rounded-xl p-5 shadow-lg shadow-teal-500/10 hover:shadow-teal-500/20 hover:border-teal-500/60 transition-all">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-slate-400 text-xs font-semibold uppercase tracking-wider mb-2">✅ Avg Confidence</p>
                      <p className="text-3xl font-bold text-teal-300">{stats.avgConfidence}%</p>
                    </div>
                    <div className="text-4xl opacity-20">🎯</div>
                  </div>
                </div>
                <div className="bg-gradient-to-br from-emerald-500/10 to-teal-500/10 border border-emerald-500/30 rounded-xl p-5 shadow-lg shadow-emerald-500/5 hover:shadow-emerald-500/15 hover:border-emerald-500/50 transition-all">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-slate-400 text-xs font-semibold uppercase tracking-wider mb-2">🏆 Waste Types</p>
                      <p className="text-3xl font-bold text-emerald-300">{stats.classes}</p>
                    </div>
                    <div className="text-4xl opacity-20">🗑️</div>
                  </div>
                </div>
              </div>

              {/* Image with Detections */}
              {resultImage && (
                <div className="mb-10">
                  <div className="flex items-center gap-3 mb-4">
                    <svg className="w-5 h-5 text-emerald-400" fill="currentColor" viewBox="0 0 20 20"><path d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z"/></svg>
                    <h3 className="text-lg font-bold text-slate-200">Detection Visualization</h3>
                    <span className="ml-auto text-xs bg-emerald-500/20 text-emerald-300 px-3 py-1 rounded-full border border-emerald-500/40">Live Inference</span>
                  </div>
                  <div className="border-2 border-emerald-500/40 rounded-xl overflow-hidden shadow-2xl shadow-emerald-500/20 bg-slate-900/80 hover:border-emerald-500/60 transition-all">
                    <img
                      src={resultImage}
                      alt="Detection Results"
                      className="w-full max-h-[500px] object-contain p-3 hover:p-2 transition-all"
                    />
                  </div>
                </div>
              )}

              {/* Detections List */}
              {groupedDetections.length > 0 ? (
                <div>
                  <h3 className="text-lg font-bold text-white mb-5 flex items-center gap-2">
                    <span>🎯</span>Detected Objects
                    <span className="ml-auto text-sm bg-gradient-to-r from-emerald-500/30 to-teal-500/30 text-emerald-200 px-3 py-1 rounded-full border border-emerald-500/40">
                      {stats.classes} types • {stats.total} total
                    </span>
                  </h3>
                  <div className="space-y-3 max-h-[350px] overflow-y-auto pr-2 custom-scrollbar">
                    {groupedDetections.map((detection, index) => {
                      const confidencePercent = detection.confidence * 100;
                      const isHighConfidence = confidencePercent >= 70;
                      const isMediumConfidence = confidencePercent >= 50;
                      
                      return (
                        <div
                          key={index}
                          className="flex items-center justify-between p-4 bg-gradient-to-r from-slate-800/40 to-slate-900/20 border border-slate-700/50 rounded-xl hover:border-emerald-500/50 hover:from-slate-800/60 hover:to-slate-900/40 transition-all hover:shadow-lg hover:shadow-emerald-500/10 group"
                        >
                          <div className="flex items-center gap-4 flex-1">
                            {/* Count Badge */}
                            <div className="flex-shrink-0">
                              <span className="inline-flex items-center justify-center w-10 h-10 bg-gradient-to-br from-emerald-500/40 to-teal-500/30 rounded-lg border border-emerald-500/40 text-sm font-bold text-emerald-200 group-hover:from-emerald-500/60 group-hover:to-teal-500/50 transition-all">
                                x{detection.count}
                              </span>
                            </div>
                            
                            {/* Waste Type Info */}
                            <div className="flex-1 min-w-0">
                              <p className="font-semibold text-white capitalize text-base group-hover:text-emerald-200 transition-colors">
                                {detection.class.replace(/_/g, ' ')}
                              </p>
                              <p className="text-xs text-slate-400 group-hover:text-slate-300 transition-colors mt-1">
                                📍 X: {detection.x1.toFixed(0)}-{detection.x2.toFixed(0)} | Y: {detection.y1.toFixed(0)}-{detection.y2.toFixed(0)}
                              </p>
                            </div>
                          </div>
                          
                          {/* Confidence Bar & Percentage */}
                          <div className="text-right ml-4 flex-shrink-0">
                            <div className="flex items-center gap-3">
                              {/* Confidence Bar */}
                              <div className="w-20 h-3 bg-slate-700 rounded-full overflow-hidden shadow-inner">
                                <div
                                  className={`h-full rounded-full shadow-lg transition-all ${
                                    isHighConfidence
                                      ? 'bg-gradient-to-r from-emerald-500 to-teal-500 shadow-emerald-500/50'
                                      : isMediumConfidence
                                      ? 'bg-gradient-to-r from-amber-500 to-orange-500 shadow-amber-500/50'
                                      : 'bg-gradient-to-r from-red-500 to-orange-500 shadow-red-500/50'
                                  }`}
                                  style={{
                                    width: `${confidencePercent}%`,
                                  }}
                                />
                              </div>
                              
                              {/* Percentage Text */}
                              <span className={`text-sm font-bold w-14 text-right ${
                                isHighConfidence
                                  ? 'text-emerald-300'
                                  : isMediumConfidence
                                  ? 'text-amber-300'
                                  : 'text-red-300'
                              }`}>
                                {confidencePercent.toFixed(1)}%
                              </span>
                            </div>
                            
                            {/* Confidence Badge */}
                            <div className="mt-2">
                              <span className={`text-xs font-semibold px-2 py-1 rounded-full border ${
                                isHighConfidence
                                  ? 'bg-emerald-500/20 text-emerald-200 border-emerald-500/40'
                                  : isMediumConfidence
                                  ? 'bg-amber-500/20 text-amber-200 border-amber-500/40'
                                  : 'bg-red-500/20 text-red-200 border-red-500/40'
                              }`}>
                                {isHighConfidence ? '✅ High' : isMediumConfidence ? '⚠️ Medium' : '❌ Low'}
                              </span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : (
                <div className="text-center py-12 bg-gradient-to-b from-slate-800/30 to-slate-900/20 border-2 border-dashed border-slate-700/50 rounded-xl">
                  <p className="text-slate-300 text-lg font-semibold">✅ No Objects Detected</p>
                  <p className="text-slate-400 text-sm mt-2">The image appears to be clean with no waste detected</p>
                </div>
              )}
            </>
          )}

          {/* Footer */}
          <div className="mt-10 pt-8 border-t border-slate-700/50">
            <button
              onClick={onClose}
              className="w-full px-6 py-4 bg-gradient-to-br from-emerald-600 via-emerald-500 to-teal-600 hover:from-emerald-500 hover:via-emerald-400 hover:to-teal-500 text-white font-semibold rounded-xl transition-all duration-300 shadow-lg shadow-emerald-500/30 hover:shadow-emerald-500/50 border border-emerald-500/60 hover:border-emerald-400/80 hover:scale-105 relative overflow-hidden group"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-emerald-400/0 via-white/0 to-emerald-400/0 group-hover:via-white/15 transition-all duration-300"></div>
              <span className="relative flex items-center justify-center gap-2 font-semibold text-lg">
                <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"/></svg>
                Close Analysis
              </span>
            </button>
          </div>
          
          {/* Custom scrollbar styles */}
          <style>{`
            .custom-scrollbar::-webkit-scrollbar {
              width: 6px;
            }
            .custom-scrollbar::-webkit-scrollbar-track {
              background: transparent;
            }
            .custom-scrollbar::-webkit-scrollbar-thumb {
              background: rgba(16, 185, 129, 0.3);
              border-radius: 3px;
            }
            .custom-scrollbar::-webkit-scrollbar-thumb:hover {
              background: rgba(16, 185, 129, 0.5);
            }
          `}</style>
        </div>
      </div>
    </div>
  );
}
