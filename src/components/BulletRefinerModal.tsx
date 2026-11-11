import React, { useState, useEffect } from 'react';
import { X, Sparkles, Check, RefreshCw } from 'lucide-react';

interface BulletVariant {
  text: string;
  label: string;
}

interface BulletRefinerModalProps {
  isOpen: boolean;
  onClose: () => void;
  originalBullet: string;
  roleContext: string;
  onSelectVariant: (newBullet: string) => void;
  language?: 'fr' | 'en';
}

export const BulletRefinerModal: React.FC<BulletRefinerModalProps> = ({
  isOpen,
  onClose,
  originalBullet,
  roleContext,
  onSelectVariant,
  language = 'fr',
}) => {
  const isEn = language === 'en';
  const defaultInstruction = isEn
    ? "More impactful with executive STAR action verb and quantified metrics"
    : "Plus percutant avec verbe d'action et métrique STAR";

  const [instruction, setInstruction] = useState(defaultInstruction);
  const [loading, setLoading] = useState(false);
  const [variants, setVariants] = useState<BulletVariant[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setInstruction(defaultInstruction);
    setVariants([]);
  }, [language, originalBullet]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const fetchVariants = async (customInstruction?: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/refine-bullet', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          originalBullet,
          jobContext: roleContext,
          instruction: customInstruction || instruction,
          language,
        }),
      });

      const contentType = res.headers.get('content-type') || '';
      if (!contentType.includes('application/json')) {
        throw new Error(isEn ? "Service temporarily reconnecting. Please retry." : "Service temporairement indisponible. Veuillez réessayer.");
      }

      const data = await res.json().catch(() => null);
      if (data && data.variants && Array.isArray(data.variants)) {
        setVariants(data.variants);
      } else {
        throw new Error(isEn ? "Unexpected response format." : "Format inattendu reçu.");
      }
    } catch (err: any) {
      setError(err.message || (isEn ? "Error generating variants." : "Erreur de génération des variantes."));
    } finally {
      setLoading(false);
    }
  };

  // Pre-load on open if empty
  useEffect(() => {
    if (variants.length === 0 && originalBullet && isOpen) {
      fetchVariants();
    }
  }, [originalBullet, isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-[#050A17]/80 light:bg-slate-900/40 backdrop-blur-md animate-fade-in">
      <div className="bg-[#0B1530] light:bg-white text-white light:text-slate-900 rounded-2xl max-w-xl w-full p-4 sm:p-6 shadow-2xl border border-amber-400/30 light:border-slate-200 space-y-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-700/70 light:border-slate-200">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-amber-400/15 border border-amber-400/30 light:border-amber-400/40 text-amber-300 light:text-amber-700 flex items-center justify-center">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white light:text-slate-900">
                {isEn ? "Refine Experience Bullet (STAR Method)" : "Affiner cette puce d'expérience (Méthode STAR)"}
              </h3>
              <p className="text-xs text-slate-400 light:text-slate-600">
                {isEn ? `Context: ${roleContext}` : `Contexte : ${roleContext}`}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-white light:text-slate-500 light:hover:text-slate-900 p-1 rounded-md transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Original Bullet */}
        <div className="p-3.5 bg-slate-950/70 light:bg-slate-50 border border-slate-800 light:border-slate-200 rounded-xl text-xs space-y-1">
          <div className="font-semibold text-slate-400 light:text-slate-500 uppercase text-[10px] tracking-wider">
            {isEn ? "Current Resume Bullet:" : "Puce actuelle du CV :"}
          </div>
          <p className="text-slate-200 light:text-slate-800 italic">« {originalBullet} »</p>
        </div>

        {/* Quick Style presets */}
        <div>
          <label className="block text-xs font-semibold text-slate-300 light:text-slate-700 mb-1.5">
            {isEn ? "Refinement Angle:" : "Angle de reformulation :"}
          </label>
          <div className="flex flex-wrap gap-1.5">
            {(isEn
              ? [
                  "Executive STAR action verb & metrics",
                  "Strategic scaling & high impact",
                  "Cross-functional leadership & alignment",
                  "Concise & high-density for ATS",
                ]
              : [
                  "Plus percutant avec verbe d'action",
                  "Méthode STAR avec impact mesurable",
                  "Axé sur le leadership et la collaboration",
                  "Synthétique et direct pour ATS",
                ]
            ).map((preset, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => {
                  setInstruction(preset);
                  fetchVariants(preset);
                }}
                className={`text-[11px] px-2.5 py-1 rounded-lg transition-all cursor-pointer border ${
                  instruction === preset
                    ? 'bg-amber-400 text-slate-950 font-bold border-amber-400 shadow-xs'
                    : 'bg-slate-900/80 light:bg-slate-100 text-slate-300 light:text-slate-700 border-slate-700 light:border-slate-300 hover:bg-slate-800 light:hover:bg-slate-200 hover:text-white light:hover:text-slate-900'
                }`}
              >
                {preset}
              </button>
            ))}
          </div>
        </div>

        {/* Variants list */}
        <div className="space-y-2.5 pt-1">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-300 light:text-slate-700">
            <span>{isEn ? "Suggested Variants (Zero Hallucination):" : "Variantes proposées (Zéro hallucination) :"}</span>
            <button
              type="button"
              disabled={loading}
              onClick={() => fetchVariants()}
              className="text-amber-400 light:text-amber-800 hover:text-amber-300 light:hover:text-amber-900 flex items-center gap-1 text-[11px] font-medium cursor-pointer"
            >
              <RefreshCw className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`} />
              <span>{isEn ? "Regenerate" : "Régénérer"}</span>
            </button>
          </div>

          {loading ? (
            <div className="py-8 text-center text-xs text-slate-400 light:text-slate-500">
              <div className="w-5 h-5 border-2 border-slate-600 border-t-amber-400 rounded-full animate-spin mx-auto mb-2" />
              <span>{isEn ? "Refining with STAR method..." : "Optimisation sémantique en cours..."}</span>
            </div>
          ) : error ? (
            <div className="p-3 bg-rose-950/60 light:bg-rose-50 border border-rose-500/30 light:border-rose-200 text-rose-200 light:text-rose-800 rounded-xl text-xs">
              {error}
            </div>
          ) : (
            variants.map((variant, index) => (
              <div
                key={index}
                className="p-3.5 bg-slate-900/80 light:bg-slate-50 hover:bg-slate-850 light:hover:bg-slate-100 border border-slate-700/80 light:border-slate-200 hover:border-amber-400/40 rounded-xl transition-all text-xs space-y-2"
              >
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold text-amber-300 light:text-amber-800 uppercase tracking-wider">
                    {variant.label}
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      onSelectVariant(variant.text);
                      onClose();
                    }}
                    className="flex items-center gap-1 px-3 py-1 bg-gradient-to-r from-amber-400 to-yellow-500 hover:from-amber-300 hover:to-yellow-400 text-slate-950 font-bold rounded-lg text-[11px] shadow-xs cursor-pointer transition-transform hover:scale-[1.02]"
                  >
                    <Check className="w-3 h-3" />
                    <span>{isEn ? "Apply" : "Appliquer"}</span>
                  </button>
                </div>
                <p className="text-slate-100 light:text-slate-800 font-medium leading-relaxed">
                  • {variant.text}
                </p>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
