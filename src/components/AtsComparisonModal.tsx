import React, { useEffect } from 'react';
import { X, CheckCircle2, ShieldCheck, ArrowRight, Sparkles } from 'lucide-react';
import { OptimizedCv } from '../types/ats';

interface AtsComparisonModalProps {
  isOpen: boolean;
  onClose: () => void;
  originalText: string;
  optimizedCv: OptimizedCv;
}

export const AtsComparisonModal: React.FC<AtsComparisonModalProps> = ({
  isOpen,
  onClose,
  originalText,
  optimizedCv,
}) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#050A17]/80 light:bg-slate-900/40 backdrop-blur-md animate-fade-in">
      <div className="bg-[#0B1530] light:bg-white text-white light:text-slate-900 rounded-2xl max-w-4xl w-full p-6 shadow-2xl border border-amber-400/30 light:border-slate-200 flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-700/70 light:border-slate-200 shrink-0">
          <div>
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-emerald-400 light:text-emerald-600" />
              <h3 className="text-base font-bold text-white light:text-slate-900">
                Comparatif Sémantique : Avant vs Après
              </h3>
            </div>
            <p className="text-xs text-slate-300 light:text-slate-600 mt-0.5">
              Vérifiez la préservation intégrale de vos véritables faits avec renforcement de l'impact ATS.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-white light:text-slate-500 light:hover:text-slate-900 p-1 rounded-md transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Comparison columns */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-4 overflow-y-auto flex-1">
          {/* Left: Original CV */}
          <div className="bg-slate-900/70 light:bg-slate-50 border border-slate-800 light:border-slate-200 rounded-xl p-4 flex flex-col">
            <div className="text-xs font-bold text-slate-300 light:text-slate-700 uppercase tracking-wider mb-2 flex items-center justify-between">
              <span>Votre CV d'origine</span>
              <span className="text-[10px] text-slate-400 light:text-slate-500 font-mono">Texte source</span>
            </div>
            <div className="text-xs font-mono text-slate-300 light:text-slate-800 leading-relaxed whitespace-pre-wrap flex-1 overflow-y-auto max-h-[55vh] bg-slate-950/70 light:bg-white p-3.5 rounded-lg border border-slate-800 light:border-slate-200 shadow-inner">
              {originalText || "Aucun texte source direct disponible (import fichier binaire)."}
            </div>
          </div>

          {/* Right: Optimized ATS CV */}
          <div className="bg-emerald-950/20 light:bg-emerald-50/50 border border-emerald-500/30 light:border-emerald-200 rounded-xl p-4 flex flex-col">
            <div className="text-xs font-bold text-emerald-300 light:text-emerald-800 uppercase tracking-wider mb-2 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                Version Optimisée ATS
              </span>
              <span className="text-[10px] font-semibold text-emerald-400 light:text-emerald-700 font-mono">
                Faits Réels Préservés
              </span>
            </div>
            <div className="text-xs text-slate-200 light:text-slate-800 leading-relaxed overflow-y-auto max-h-[55vh] bg-slate-950/80 light:bg-white p-4 rounded-lg border border-emerald-500/20 light:border-emerald-100 space-y-4 shadow-inner">
              <div>
                <div className="font-bold text-white light:text-slate-900 text-sm uppercase tracking-tight">{optimizedCv.personalInfo.fullName}</div>
                <div className="font-bold text-amber-300 light:text-amber-800">{optimizedCv.personalInfo.professionalTitle}</div>
              </div>

              <div>
                <div className="font-bold text-slate-300 light:text-slate-700 text-[11px] uppercase tracking-wider border-b border-slate-800 light:border-slate-200 pb-0.5 mb-1">
                  Profil reformulé
                </div>
                <p className="text-slate-300 light:text-slate-700 text-[11px] leading-relaxed">
                  {optimizedCv.professionalSummary}
                </p>
              </div>

              <div>
                <div className="font-bold text-slate-300 light:text-slate-700 text-[11px] uppercase tracking-wider border-b border-slate-800 light:border-slate-200 pb-0.5 mb-2">
                  Expériences (Verbes d'action STAR)
                </div>
                <div className="space-y-3">
                  {optimizedCv.experiences.map((exp, idx) => (
                    <div key={idx} className="text-[11px]">
                      <div className="font-bold text-white light:text-slate-900">
                        {exp.role} <span className="text-slate-500 font-normal">|</span> {exp.company}
                      </div>
                      <ul className="list-disc list-inside mt-1 space-y-1 text-slate-300 light:text-slate-700">
                        {exp.bullets.map((b, bIdx) => (
                          <li key={bIdx} className="leading-relaxed">{b}</li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="pt-3 border-t border-slate-700/70 light:border-slate-200 flex items-center justify-between text-xs text-slate-400 light:text-slate-600 shrink-0">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 light:text-emerald-600" />
            <span>Faits réels strictement préservés · Alignement lexical ciblé</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 text-xs font-semibold text-slate-950 bg-amber-400 hover:bg-amber-300 rounded-lg transition-colors cursor-pointer"
          >
            Fermer le comparatif
          </button>
        </div>
      </div>
    </div>
  );
};
