import React, { useState } from 'react';
import { SavedCandidatureSession, deleteSavedSession, clearAllSavedSessions } from '../services/historyStorage';
import {
  Clock,
  X,
  Trash2,
  ArrowRight,
  Sparkles,
  Building2,
  User,
  ShieldCheck,
  RotateCcw,
} from 'lucide-react';

interface HistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  sessions: SavedCandidatureSession[];
  onRestoreSession: (session: SavedCandidatureSession) => void;
  onSessionsUpdated: (sessions: SavedCandidatureSession[]) => void;
}

export const HistoryModal: React.FC<HistoryModalProps> = ({
  isOpen,
  onClose,
  sessions,
  onRestoreSession,
  onSessionsUpdated,
}) => {
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleDelete = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = deleteSavedSession(id);
    onSessionsUpdated(updated);
    setConfirmDeleteId(null);
  };

  const handleClearAll = () => {
    clearAllSavedSessions();
    onSessionsUpdated([]);
  };

  const formatDate = (isoString: string) => {
    try {
      const d = new Date(isoString);
      return new Intl.DateTimeFormat('fr-FR', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      }).format(d);
    } catch {
      return isoString;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#050A17]/85 light:bg-slate-900/40 backdrop-blur-md animate-fade-in">
      <div className="bg-[#0B1530] light:bg-white border border-amber-400/30 light:border-slate-200 rounded-2xl max-w-2xl w-full p-6 sm:p-7 shadow-2xl text-white light:text-slate-900 space-y-5 max-h-[85vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-700/60 light:border-slate-200 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-400/15 border border-amber-400/30 light:border-amber-400/40 text-amber-300 light:text-amber-700 flex items-center justify-center shadow-md">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-white light:text-slate-900">Mes Candidatures Sauvegardées</h3>
                <span className="text-xs bg-amber-500/20 light:bg-amber-100 text-amber-300 light:text-amber-800 border border-amber-400/30 light:border-amber-300 px-2 py-0.5 rounded-full font-mono font-bold">
                  {sessions.length}
                </span>
              </div>
              <p className="text-xs text-slate-400 light:text-slate-600 mt-0.5">
                Historique confidentiel stocké exclusivement dans votre navigateur (local).
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white light:text-slate-500 light:hover:text-slate-900 rounded-lg hover:bg-slate-800 light:hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content list */}
        <div className="flex-1 overflow-y-auto space-y-3 pr-1">
          {sessions.length === 0 ? (
            <div className="text-center py-12 px-4 space-y-3">
              <div className="w-12 h-12 rounded-full bg-slate-900 border border-slate-800 text-slate-500 flex items-center justify-center mx-auto">
                <Clock className="w-6 h-6" />
              </div>
              <p className="text-sm font-semibold text-slate-300">
                Aucune candidature enregistrée pour le moment
              </p>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                Chaque analyse lancée dans le Studio est automatiquement sauvegardée ici afin que vous puissiez retrouver vos CVs et lettres personnalisées à tout moment.
              </p>
            </div>
          ) : (
            sessions.map((item) => (
              <div
                key={item.id}
                onClick={() => onRestoreSession(item)}
                className="group p-4 rounded-xl bg-slate-900/80 light:bg-slate-50 hover:bg-slate-800/90 light:hover:bg-slate-100 border border-slate-700/80 light:border-slate-200 hover:border-amber-400/50 transition-all cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-4"
              >
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-sm text-white light:text-slate-900 group-hover:text-amber-300 light:group-hover:text-amber-700 transition-colors">
                      {item.roleTitle || 'Poste Cible'}
                    </span>
                    {item.companyName && (
                      <span className="inline-flex items-center gap-1 text-xs text-slate-300 light:text-slate-700 bg-slate-800 light:bg-slate-200 px-2 py-0.5 rounded font-medium">
                        <Building2 className="w-3 h-3 text-slate-400 light:text-slate-500" />
                        {item.companyName}
                      </span>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center gap-3 text-xs text-slate-400 light:text-slate-600">
                    <span className="flex items-center gap-1">
                      <User className="w-3 h-3 text-slate-500 light:text-slate-400" />
                      {item.candidateName || 'Candidat'}
                    </span>
                    <span>·</span>
                    <span className="text-[11px] font-mono text-slate-400 light:text-slate-500">
                      {formatDate(item.savedAt)}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-3 shrink-0 self-end sm:self-center">
                  <div className="text-right">
                    <div className="text-[10px] uppercase tracking-wider text-slate-400 light:text-slate-500 font-mono">
                      Score ATS
                    </div>
                    <div className="flex items-center gap-1.5 font-mono text-xs">
                      <span className="text-slate-500 line-through">
                        {item.initialAtsScore}%
                      </span>
                      <ArrowRight className="w-3 h-3 text-amber-400 light:text-amber-700" />
                      <span className="font-bold text-emerald-400 light:text-emerald-700 text-sm">
                        {item.atsScore}%
                      </span>
                    </div>
                  </div>

                  {confirmDeleteId === item.id ? (
                    <div className="flex items-center gap-1.5 bg-rose-950/80 light:bg-rose-100 p-1 rounded-lg border border-rose-500/40 light:border-rose-300">
                      <button
                        type="button"
                        onClick={(e) => handleDelete(item.id, e)}
                        className="px-2 py-1 text-[11px] font-bold text-rose-300 hover:text-white bg-rose-600 rounded cursor-pointer"
                      >
                        Supprimer
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setConfirmDeleteId(null);
                        }}
                        className="px-1.5 py-1 text-[11px] text-slate-300 light:text-slate-700 hover:text-white cursor-pointer"
                      >
                        Annuler
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setConfirmDeleteId(item.id);
                      }}
                      className="p-2 text-slate-500 hover:text-rose-400 light:text-slate-400 light:hover:text-rose-600 rounded-lg hover:bg-slate-800 light:hover:bg-slate-200 transition-colors cursor-pointer"
                      title="Supprimer cet historique"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => onRestoreSession(item)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-slate-950 bg-gradient-to-r from-amber-400 to-yellow-500 hover:from-amber-300 hover:to-yellow-400 rounded-lg shadow-sm transition-all group-hover:scale-105 cursor-pointer"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Restaurer</span>
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer info & actions */}
        <div className="pt-3 border-t border-slate-700/60 light:border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-400 light:text-slate-600 shrink-0">
          <div className="flex items-center gap-1.5 text-[11px]">
            <ShieldCheck className="w-3.5 h-3.5 text-amber-400 light:text-amber-700" />
            <span>Aucune donnée n'est envoyée à des tiers. Vos documents restent privés.</span>
          </div>

          {sessions.length > 0 && (
            <button
              type="button"
              onClick={handleClearAll}
              className="text-xs text-rose-400 hover:text-rose-300 transition-colors cursor-pointer underline underline-offset-2"
            >
              Effacer tout l'historique
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
