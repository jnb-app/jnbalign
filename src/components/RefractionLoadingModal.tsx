import React, { useEffect, useState } from 'react';
import {
  Compass,
  Sparkles,
  CheckCircle2,
  ShieldCheck,
  Lightbulb,
  ChevronRight,
  ChevronLeft,
} from 'lucide-react';

interface RefractionLoadingModalProps {
  isOpen: boolean;
  phaseText: string;
}

const ATS_TIPS = [
  {
    title: "Format Mono-Colonne Strict",
    content: "98% des parseurs ATS (Workday, Taleo, Greenhouse) échouent à lire correctement les CVs à double colonne ou avec tableaux imbriqués.",
    tag: "Norme ATS",
  },
  {
    title: "La Puissance des Verbes STAR",
    content: "Remplacer 'Responsable de la vente' par 'Négocié et déployé 12 contrats stratégiques (+24% de CA)' double le taux de passage aux entretiens.",
    tag: "Impact Recruteur",
  },
  {
    title: "Zéro Graphiques & Barres de Niveau",
    content: "Les jauges de compétences 'Photoshop 85%' sont invisibles pour les robots et perçues comme purement subjectives par les recruteurs.",
    tag: "Algorithmes",
  },
  {
    title: "Standardisation des Titres de Poste",
    content: "Un intitulé reconnu (ex: 'Lead Developer' plutôt que 'Artisan du Code') garantit une indexation immédiate dans les taxonomies RH.",
    tag: "Indexation",
  },
  {
    title: "La Trame Vous / Moi / Nous",
    content: "Dans votre lettre, débuter par les enjeux de l'entreprise (Vous) avant de parler de vous (Moi) retient 4x plus l'attention du hiring manager.",
    tag: "Lettre de Motivation",
  },
  {
    title: "Zéro Hallucination & Authenticité",
    content: "JNB Align ne rajoute aucun mensonge à votre parcours : l'IA aligne strictement le vocabulaire et les synonymes sur vos vraies réalisations.",
    tag: "Éthique JNB Align",
  },
  {
    title: "Chiffrage des Résultats",
    content: "Inclure au moins 1 métrique concrète (% gagné, montant, volume géré, temps économisé) par expérience augmente le score de pertinence.",
    tag: "Méthode STAR",
  },
  {
    title: "Format Texte & PDF A4",
    content: "Les recruteurs favorisent les PDFs texte épurés sans fioritures pour extraire instantanément le profil dans leur CRM de recrutement.",
    tag: "Bonne Pratique",
  },
];

export const RefractionLoadingModal: React.FC<RefractionLoadingModalProps> = ({
  isOpen,
  phaseText,
}) => {
  const [progress, setProgress] = useState(15);
  const [currentStage, setCurrentStage] = useState(1);
  const [activeTipIndex, setActiveTipIndex] = useState(0);

  // Dynamic progress animation
  useEffect(() => {
    if (!isOpen) {
      setProgress(15);
      setCurrentStage(1);
      setActiveTipIndex(0);
      return;
    }

    const t1 = setTimeout(() => {
      setProgress(42);
      setCurrentStage(2);
    }, 1400);

    const t2 = setTimeout(() => {
      setProgress(76);
      setCurrentStage(3);
    }, 3200);

    const t3 = setTimeout(() => {
      setProgress(94);
    }, 4800);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
    };
  }, [isOpen]);

  // Rotate tips automatically every 3.2 seconds
  useEffect(() => {
    if (!isOpen) return;
    const interval = setInterval(() => {
      setActiveTipIndex((prev) => (prev + 1) % ATS_TIPS.length);
    }, 3200);
    return () => clearInterval(interval);
  }, [isOpen]);

  if (!isOpen) return null;

  const currentTip = ATS_TIPS[activeTipIndex];

  const handleNextTip = () => {
    setActiveTipIndex((prev) => (prev + 1) % ATS_TIPS.length);
  };

  const handlePrevTip = () => {
    setActiveTipIndex((prev) => (prev - 1 + ATS_TIPS.length) % ATS_TIPS.length);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-[#040814]/90 light:bg-slate-900/60 backdrop-blur-xl animate-fade-in select-none">
      <div className="relative w-full max-w-lg p-4 sm:p-7 rounded-2xl sm:rounded-3xl bg-gradient-to-b from-[#0F1E42] via-[#0B1533] to-[#070D22] light:from-white light:via-slate-50 light:to-slate-100 border border-amber-400/35 light:border-slate-300 shadow-2xl shadow-black/90 light:shadow-slate-400/30 text-white light:text-slate-900 max-h-[92vh] overflow-y-auto text-center">
        {/* Ambient celestial lights */}
        <div className="absolute -top-24 -left-24 w-60 h-60 bg-amber-500/15 light:bg-amber-400/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -right-24 w-60 h-60 bg-blue-600/15 light:bg-blue-400/10 rounded-full blur-3xl pointer-events-none" />

        {/* Rotating Compass & Prism Vector Emblem (Compact for mobile screen real estate) */}
        <div className="relative w-16 h-16 sm:w-20 sm:h-20 mx-auto mb-3 sm:mb-4 flex items-center justify-center shrink-0">
          <div className="absolute inset-0 rounded-full border border-amber-400/30 light:border-amber-500/40 animate-spin-slow" />
          <div className="absolute inset-1.5 rounded-full border border-blue-400/20 light:border-blue-400/30 border-dashed animate-spin-reverse" />
          <div className="absolute inset-0 bg-amber-400/10 rounded-full blur-md animate-pulse" />
          <div className="relative z-10 w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-gradient-to-br from-amber-400 via-amber-300 to-yellow-500 text-slate-950 flex items-center justify-center shadow-md shadow-amber-500/30">
            <Compass className="w-5 h-5 sm:w-7 sm:h-7 animate-spin-slow text-slate-950" />
          </div>
        </div>

        {/* Badge & Title */}
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/15 light:bg-amber-100/90 border border-amber-400/30 light:border-amber-400 text-amber-200 light:text-amber-950 text-[11px] sm:text-xs font-bold mb-2">
          <Sparkles className="w-3.5 h-3.5 text-amber-400 light:text-amber-700 shrink-0" />
          <span>La Chambre de Réfraction · JNB Align</span>
        </div>

        <h3 className="text-lg sm:text-2xl font-bold tracking-tight text-white light:text-slate-950 mb-1.5">
          Alignement Sémantique en cours
        </h3>

        <p className="text-xs text-slate-300 light:text-slate-700 min-h-[30px] sm:min-h-[34px] max-w-sm mx-auto leading-relaxed">
          {phaseText || "Réfraction de vos véritables expériences vers les exigences ATS de l'offre..."}
        </p>

        {/* Progress Bar with Golden Laser Glow */}
        <div className="mt-3.5 sm:mt-5 mb-4 sm:mb-5">
          <div className="flex items-center justify-between text-xs text-slate-400 light:text-slate-600 mb-1.5 font-mono font-semibold">
            <span>CALCUL DU VECTEUR ATS</span>
            <span className="text-amber-300 light:text-amber-800 font-bold">{progress}%</span>
          </div>
          <div className="w-full h-2 rounded-full bg-slate-900 light:bg-slate-200 border border-slate-700/80 light:border-slate-300 overflow-hidden p-0.5">
            <div
              className="h-full rounded-full bg-gradient-to-r from-blue-500 via-amber-300 to-yellow-400 shadow-sm shadow-amber-400 transition-all duration-700 ease-out"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {/* Dynamic Micro-Tips Box ("Le saviez-vous ?" - Optimized contrast for Light & Dark) */}
        <div className="mb-3 sm:mb-4 text-left p-3.5 sm:p-4 rounded-xl sm:rounded-2xl bg-gradient-to-br from-slate-900/95 via-slate-950/95 to-[#0B1530] light:from-white light:via-amber-50/40 light:to-slate-50 border border-amber-400/30 light:border-amber-300 shadow-inner light:shadow-sm relative group">
          <div className="flex items-center justify-between gap-2 mb-1.5">
            <div className="flex items-center gap-1.5 text-xs font-bold text-amber-300 light:text-amber-900">
              <Lightbulb className="w-3.5 h-3.5 text-amber-400 light:text-amber-700 animate-bounce shrink-0" />
              <span>Le saviez-vous ? Astuce #{activeTipIndex + 1}</span>
            </div>
            <div className="flex items-center gap-1 shrink-0">
              <span className="text-[10px] uppercase font-mono font-bold px-1.5 py-0.5 rounded bg-amber-500/20 light:bg-amber-100 text-amber-200 light:text-amber-900 border border-amber-400/20 light:border-amber-300">
                {currentTip.tag}
              </span>
              <div className="flex items-center gap-0.5 ml-1">
                <button
                  type="button"
                  onClick={handlePrevTip}
                  className="p-1 text-slate-400 light:text-slate-600 hover:text-white light:hover:text-slate-950 rounded hover:bg-slate-800 light:hover:bg-slate-200 transition-colors cursor-pointer"
                  title="Astuce précédente"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={handleNextTip}
                  className="p-1 text-slate-400 light:text-slate-600 hover:text-white light:hover:text-slate-950 rounded hover:bg-slate-800 light:hover:bg-slate-200 transition-colors cursor-pointer"
                  title="Astuce suivante"
                >
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>

          <h4 className="text-xs sm:text-sm font-bold text-white light:text-slate-900 mb-1 mt-1">
            {currentTip.title}
          </h4>
          <p className="text-[11.5px] text-slate-300 light:text-slate-700 leading-relaxed min-h-[36px]">
            {currentTip.content}
          </p>

          {/* Dots Indicator */}
          <div className="flex items-center justify-center gap-1.5 mt-2.5">
            {ATS_TIPS.map((_, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => setActiveTipIndex(idx)}
                className={`h-1.5 rounded-full transition-all cursor-pointer ${
                  activeTipIndex === idx
                    ? 'w-4 bg-amber-400 light:bg-amber-600'
                    : 'w-1.5 bg-slate-700 light:bg-slate-300 hover:bg-slate-500 light:hover:bg-slate-400'
                }`}
                title={`Aller à l'astuce ${idx + 1}`}
              />
            ))}
          </div>
        </div>

        {/* Real-time Checklist Stages */}
        <div className="space-y-1.5 sm:space-y-2 text-left bg-slate-950/60 light:bg-white border border-slate-800/80 light:border-slate-200 p-3 sm:p-3.5 rounded-xl text-xs shadow-xs light:shadow-slate-200/50">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5 text-slate-200 light:text-slate-800 font-medium">
              <CheckCircle2 className={`w-4 h-4 shrink-0 ${currentStage >= 1 ? 'text-emerald-400 light:text-emerald-700' : 'text-slate-600 light:text-slate-400'}`} />
              <span>1. Extraction textuelle & cartographie sémantique</span>
            </div>
            {currentStage > 1 && <span className="text-[10px] text-emerald-400 light:text-emerald-700 font-bold font-mono">OK</span>}
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5 text-slate-200 light:text-slate-800 font-medium">
              <CheckCircle2 className={`w-4 h-4 shrink-0 ${currentStage >= 2 ? 'text-amber-400 light:text-amber-700' : 'text-slate-600 light:text-slate-400'}`} />
              <span>2. Reformulation STAR avec verbes d'action</span>
            </div>
            {currentStage > 2 && <span className="text-[10px] text-emerald-400 light:text-emerald-700 font-bold font-mono">OK</span>}
            {currentStage === 2 && <span className="text-[10px] text-amber-300 light:text-amber-800 animate-pulse font-mono font-bold">CALCUL...</span>}
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5 text-slate-200 light:text-slate-800 font-medium">
              <CheckCircle2 className={`w-4 h-4 shrink-0 ${currentStage >= 3 ? 'text-amber-400 light:text-amber-700' : 'text-slate-600 light:text-slate-400'}`} />
              <span>3. Calibrage Workday, Taleo & synthèse de la lettre</span>
            </div>
            {currentStage === 3 && <span className="text-[10px] text-amber-300 light:text-amber-800 animate-pulse font-mono font-bold">FINALISATION...</span>}
          </div>
        </div>

        {/* Security badge */}
        <div className="mt-3 sm:mt-4 flex items-center justify-center gap-1.5 text-[10.5px] sm:text-[11px] text-slate-400 light:text-slate-600 text-center">
          <ShieldCheck className="w-3.5 h-3.5 text-amber-400 light:text-amber-700 shrink-0" />
          <span>Engagement éthique : Préservation stricte et intégrale de vos réalisations réelles</span>
        </div>
      </div>
    </div>
  );
};
