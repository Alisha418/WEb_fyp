import React, { useEffect, useState } from 'react';
import { X, Award } from 'lucide-react';
import dashboardService from '../services/dashboardService';
import { normalizeCitizenLeader, formatCitizenBadge, type DashboardCitizenLeader } from '../utils/leaderboardDisplay';

interface CitizensModalProps {
  onClose: () => void;
}

export function CitizensModal({ onClose }: CitizensModalProps) {
  const [citizens, setCitizens] = useState<DashboardCitizenLeader[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        setError('');
        const res = await dashboardService.getTopCitizens(0);
        if (res.success && Array.isArray(res.data)) {
          setCitizens(res.data.map((row: Record<string, unknown>) => normalizeCitizenLeader(row)));
        } else {
          setError('Failed to load leaderboard');
        }
      } catch {
        setError('Failed to load leaderboard');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-xl max-w-2xl w-full max-h-[80vh] flex flex-col">
        <div className="flex items-center justify-between p-6 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-yellow-500 to-orange-600 flex items-center justify-center">
              <Award className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-xl text-white">All Citizens Leaderboard</h2>
              <p className="text-sm text-slate-400">Ranked by reports submitted</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-800 rounded-lg transition-colors">
            <X className="w-5 h-5 text-slate-400" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <p className="text-slate-400 text-center py-8">Loading...</p>
          ) : error ? (
            <p className="text-red-400 text-center py-8">{error}</p>
          ) : citizens.length === 0 ? (
            <p className="text-slate-400 text-center py-8">No citizens found.</p>
          ) : (
            <div className="space-y-3">
              {citizens.map((citizen, index) => {
                const displayRank = citizen.rank;
                const rankLabel = displayRank != null ? displayRank : index + 1;
                return (
                  <div
                    key={citizen.id ?? `${citizen.name}-${index}`}
                    className="flex items-center gap-4 p-4 bg-slate-800/30 rounded-lg border border-slate-700/50 hover:border-slate-600 transition-all"
                  >
                    <div
                      className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-semibold ${
                        displayRank === 1
                          ? 'bg-yellow-500/20 text-yellow-500'
                          : displayRank === 2
                            ? 'bg-slate-500/20 text-slate-400'
                            : displayRank === 3
                              ? 'bg-orange-500/20 text-orange-500'
                              : 'bg-slate-700/20 text-slate-400'
                      }`}
                    >
                      {rankLabel}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-white truncate">{citizen.name}</p>
                      <p className="text-sm text-slate-400">{citizen.reports} reports submitted</p>
                    </div>
                    {citizen.badge ? (
                      <span className="text-xs px-2 py-1 rounded-full bg-yellow-500/15 text-yellow-400 border border-yellow-500/30 shrink-0">
                        {formatCitizenBadge(citizen.badge)}
                      </span>
                    ) : (
                      <span className="text-[10px] text-slate-500 shrink-0">—</span>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="p-4 border-t border-slate-800">
          <button
            onClick={onClose}
            className="w-full py-3 bg-slate-800 hover:bg-slate-700 text-white rounded-lg transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
