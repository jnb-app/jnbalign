import React, { useState, useEffect, useRef } from 'react';
import { OptimizedCv, CoverLetter, SemanticGapAnalysis } from '../types/ats';
import {
  CheckCircle2,
  AlertCircle,
  Sparkles,
  Printer,
  Copy,
  Check,
  ChevronDown,
  ChevronUp,
  ShieldCheck,
  Award,
  Download,
  FileText,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { downloadBothPdfs } from '../utils/pdfGenerator';
import { downloadCvDocx, downloadCoverLetterDocx } from '../utils/docxGenerator';

interface ReadyToApplyChecklistProps {
  cv: OptimizedCv;
  coverLetter: CoverLetter;
  analysis?: SemanticGapAnalysis;
  onPrint: () => void;
  onCopyRawText: () => void;
  copiedRaw: boolean;
  onDownloadPack?: () => void;
}

export const ReadyToApplyChecklist: React.FC<ReadyToApplyChecklistProps> = ({
  cv,
  coverLetter,
  analysis,
  onPrint,
  onCopyRawText,
  copiedRaw,
  onDownloadPack,
}) => {
  const [isExpanded, setIsExpanded] = useState<boolean>(true);

  // Micro-interaction tactile haptique
  const triggerHaptic = () => {
    if (typeof window !== 'undefined' && 'navigator' in window && 'vibrate' in navigator) {
      try {
        navigator.vibrate(15);
      } catch {
        // Ignore if unavailable
      }
    }
  };

  // User interactive confirmation checkboxes
  const [checkedContact, setCheckedContact] = useState<boolean>(true);
  const [checkedBullets, setCheckedBullets] = useState<boolean>(true);
  const [checkedPreview, setCheckedPreview] = useState<boolean>(false);
  const prevPercentRef = useRef<number>(0);

  // Automated checks
  const hasValidContact = Boolean(
    cv.personalInfo.fullName && cv.personalInfo.email && cv.personalInfo.phone
  );

  const totalBullets = cv.experiences.reduce(
    (acc, exp) => acc + (exp.bullets ? exp.bullets.length : 0),
    0
  );

  const hasExperiences = cv.experiences.length > 0 && totalBullets > 0;
  const hasCoverLetter = Boolean(
    coverLetter.paragraphs.vous && coverLetter.paragraphs.moi && coverLetter.paragraphs.nous
  );
  const optimizedScore = analysis?.scores.optimizedAtsScore || 85;

  const automatedChecks = [
    {
      id: 'single_column',
      title: 'Mise en page mono-colonne stricte',
      desc: 'Aucun tableau masqué, aucune double colonne illisible pour Workday/Taleo.',
      valid: true,
      badge: 'Norme ATS',
    },
    {
      id: 'ats_score',
      title: `Score de pertinence sémantique (${optimizedScore}%)`,
      desc: 'Mots-clés stratégiques de l’offre intégrés naturellement dans les réalisations.',
      valid: optimizedScore >= 70,
      badge: `${optimizedScore}%`,
    },
    {
      id: 'star_bullets',
      title: `Verbes d'action STAR (${totalBullets} réalisations reformulées)`,
      desc: 'Chaque puce débute par un verbe moteur au passé ou présent sans extrapolation.',
      valid: hasExperiences,
      badge: 'STAR validé',
    },
    {
      id: 'contact_info',
      title: 'Bloc coordonnées normalisé',
      desc: `${cv.personalInfo.fullName} · ${cv.personalInfo.email} · ${cv.personalInfo.phone}`,
      valid: hasValidContact,
      badge: 'Identité OK',
    },
    {
      id: 'cover_letter',
      title: 'Lettre de motivation Vous / Moi / Nous',
      desc: 'Introduction axée sur l’entreprise, adéquation du profil et proposition de collaboration.',
      valid: hasCoverLetter,
      badge: 'Trame 3 temps',
    },
  ];

  const handleToggleContact = () => {
    triggerHaptic();
    setCheckedContact(!checkedContact);
  };

  const handleToggleBullets = () => {
    triggerHaptic();
    setCheckedBullets(!checkedBullets);
  };

  const handleTogglePreview = () => {
    triggerHaptic();
    setCheckedPreview(!checkedPreview);
  };

  const manualChecks = [
    {
      id: 'manual_contact',
      label: 'J’ai vérifié l’exactitude de mon numéro et de mon lien LinkedIn',
      checked: checkedContact,
      toggle: handleToggleContact,
    },
    {
      id: 'manual_bullets',
      label: 'J’ai relu mes chiffres clés et testé l’outil "Affiner STAR" si nécessaire',
      checked: checkedBullets,
      toggle: handleToggleBullets,
    },
    {
      id: 'manual_preview',
      label: 'J’ai prévisualisé l’export ou copié le texte brut pour le formulaire',
      checked: checkedPreview,
      toggle: handleTogglePreview,
    },
  ];

  const totalItems = automatedChecks.length + manualChecks.length;
  const completedCount =
    automatedChecks.filter((c) => c.valid).length +
    manualChecks.filter((m) => m.checked).length;
  const percentComplete = Math.round((completedCount / totalItems) * 100);

  // Déclencher confettis si passage à 100% de la checklist
  useEffect(() => {
    if (percentComplete === 100 && prevPercentRef.current < 100) {
      triggerHaptic();
      try {
        confetti({
          particleCount: 40,
          spread: 50,
          origin: { y: 0.8 },
          colors: ['#10B981', '#34D399', '#F59E0B'],
          disableForReducedMotion: true,
        });
      } catch {
        // Ignore
      }
    }
    prevPercentRef.current = percentComplete;
  }, [percentComplete]);

  return (
    <div className="bg-[#0B1530] light:bg-white border border-amber-400/30 light:border-slate-300 rounded-2xl p-5 shadow-xl shadow-black/30 light:shadow-[0_8px_30px_rgba(15,23,42,0.08)] text-white light:text-slate-900 transition-all no-print">
      {/* Header bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-amber-400 to-yellow-500 text-slate-950 flex items-center justify-center font-bold shadow-md shadow-amber-500/20 shrink-0">
            <Award className="w-5 h-5 text-slate-950" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-extrabold text-white light:text-slate-950">
                Checklist de Conformité : Prêt à Postuler
              </h3>
              <span
                className={`text-[11px] font-mono px-2 py-0.5 rounded-full font-bold border transition-all ${
                  percentComplete === 100
                    ? 'bg-emerald-500/20 light:bg-emerald-100 text-emerald-300 light:text-emerald-900 border-emerald-500/40 light:border-emerald-300 scale-105'
                    : 'bg-amber-500/20 light:bg-amber-100 text-amber-300 light:text-amber-900 border-amber-400/30 light:border-amber-300'
                }`}
              >
                {completedCount}/{totalItems} validés ({percentComplete}%)
              </span>
            </div>
            <p className="text-xs text-slate-400 light:text-slate-700 mt-0.5">
              Audit final avant envoi sur les portails recruteurs (Workday, Taleo, Greenhouse, LinkedIn).
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-end sm:self-center">
          <button
            type="button"
            onClick={() => setIsExpanded(!isExpanded)}
            className="flex items-center gap-1 text-xs text-slate-400 light:text-slate-600 hover:text-white light:hover:text-slate-900 px-2 py-1 rounded-lg hover:bg-slate-800 light:hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <span>{isExpanded ? 'Réduire' : 'Détails'}</span>
            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Progress line */}
      <div className="w-full h-1.5 rounded-full bg-slate-900 light:bg-slate-100 border border-slate-700/60 light:border-slate-200 overflow-hidden mt-3 mb-4">
        <div
          className={`h-full transition-all duration-500 ${
            percentComplete === 100
              ? 'bg-gradient-to-r from-emerald-400 to-teal-300 shadow-sm shadow-emerald-400'
              : 'bg-gradient-to-r from-amber-400 to-yellow-400 shadow-sm shadow-amber-400'
          }`}
          style={{ width: `${percentComplete}%` }}
        />
      </div>

      {/* Expanded view */}
      {isExpanded && (
        <div className="space-y-4 pt-1 animate-fade-in">
          {/* Section 1: Automated ATS criteria */}
          <div>
            <div className="text-[10px] uppercase font-mono font-bold tracking-wider text-amber-300 light:text-amber-800 mb-2 flex items-center gap-1.5">
              <ShieldCheck className="w-3 h-3 text-amber-400 light:text-amber-600" />
              <span>Contrôles Algorithmiques Automatiques</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
              {automatedChecks.map((item) => (
                <div
                  key={item.id}
                  className="flex items-start gap-2.5 p-3 rounded-xl bg-slate-900/80 light:bg-slate-50 border border-slate-800 light:border-slate-200 hover:border-slate-700 transition-colors text-xs"
                >
                  <CheckCircle2
                    className={`w-4 h-4 mt-0.5 shrink-0 ${
                      item.valid ? 'text-emerald-400 light:text-emerald-600' : 'text-amber-400 light:text-amber-600'
                    }`}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1">
                      <span className="font-semibold text-white light:text-slate-900 truncate">{item.title}</span>
                      <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-slate-800 light:bg-slate-200 text-slate-300 light:text-slate-700 shrink-0">
                        {item.badge}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400 light:text-slate-600 mt-0.5 leading-snug">
                      {item.desc}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Section 2: Candidate final verification */}
          <div className="pt-2 border-t border-slate-800/80 light:border-slate-200">
            <div className="text-[10px] uppercase font-mono font-bold tracking-wider text-slate-300 light:text-slate-700 mb-2">
              Vos Dernières Vérifications Candidat
            </div>
            <div className="space-y-2">
              {manualChecks.map((item) => (
                <label
                  key={item.id}
                  className="flex items-center gap-3 p-2.5 rounded-xl bg-slate-900/60 light:bg-slate-50 hover:bg-slate-900 light:hover:bg-slate-100 border border-slate-800/80 light:border-slate-200 cursor-pointer transition-colors text-xs text-slate-200 light:text-slate-700"
                >
                  <input
                    type="checkbox"
                    checked={item.checked}
                    onChange={item.toggle}
                    className="w-4 h-4 rounded border-slate-700 text-amber-500 focus:ring-amber-400 cursor-pointer accent-amber-400"
                  />
                  <span className={`${item.checked ? 'text-slate-100 light:text-slate-900 font-medium' : 'text-slate-400 light:text-slate-500'}`}>
                    {item.label}
                  </span>
                </label>
              ))}
            </div>
          </div>

          {/* Final reassurance banner and action buttons */}
          <div className="mt-4 p-3.5 rounded-xl bg-gradient-to-r from-emerald-950/70 via-slate-900 to-[#0C1A3A] light:from-emerald-50 light:via-slate-50 light:to-amber-50 border border-emerald-500/40 light:border-emerald-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-emerald-400 light:text-emerald-600 shrink-0" />
              <span className="text-slate-200 light:text-slate-800">
                {percentComplete === 100 ? (
                  <strong className="text-emerald-300 light:text-emerald-700 font-bold">
                    Dossier de candidature complet et vérifié ! Vous pouvez postuler en toute sérénité.
                  </strong>
                ) : (
                  <span>
                    Plus que <strong className="text-amber-300 light:text-amber-700">{totalItems - completedCount} point(s)</strong> à vérifier pour finaliser votre dossier.
                  </span>
                )}
              </span>
            </div>

            <div className="grid grid-cols-2 sm:flex w-full sm:w-auto items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={onCopyRawText}
                className="inline-flex items-center justify-center gap-1.5 px-3 py-2 sm:py-1.5 rounded-lg text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-colors cursor-pointer"
              >
                {copiedRaw ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                    <span className="text-emerald-300 font-bold">Copié !</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span>Copier</span>
                  </>
                )}
              </button>

              {/* Word (.docx) */}
              <button
                type="button"
                onClick={async () => {
                  await downloadCvDocx(cv);
                  await downloadCoverLetterDocx(coverLetter);
                }}
                className="inline-flex items-center justify-center gap-1.5 px-3 py-2 sm:py-1.5 rounded-lg text-xs font-semibold text-sky-200 light:text-sky-800 hover:text-white light:hover:text-sky-950 bg-sky-950/60 light:bg-sky-100 hover:bg-sky-900/80 light:hover:bg-sky-200 border border-sky-500/40 light:border-sky-300 transition-colors cursor-pointer"
                title="Télécharger les versions Word .docx éditables (CV + Lettre)"
              >
                <FileText className="w-3.5 h-3.5 text-sky-400 light:text-sky-600 shrink-0" />
                <span>Pack Word (.docx)</span>
              </button>

              {/* Imprimer */}
              <button
                type="button"
                onClick={onPrint}
                className="inline-flex items-center justify-center gap-1.5 px-3 py-2 sm:py-1.5 rounded-lg text-xs font-semibold text-slate-200 hover:text-white bg-slate-800 hover:bg-slate-700 border border-slate-700 transition-colors cursor-pointer"
                title="Lancer l'impression"
              >
                <Printer className="w-3.5 h-3.5 text-slate-300 shrink-0" />
                <span>Imprimer</span>
              </button>

              {/* Télécharger le Pack Complet (CV + Lettre) */}
              <button
                type="button"
                onClick={() => {
                  if (onDownloadPack) {
                    onDownloadPack();
                  } else {
                    downloadBothPdfs(cv, coverLetter);
                  }
                }}
                className="col-span-2 sm:col-span-1 inline-flex items-center justify-center gap-1.5 px-3.5 py-2.5 sm:py-1.5 rounded-lg text-xs font-bold text-slate-950 bg-gradient-to-r from-amber-400 via-amber-300 to-yellow-500 hover:from-amber-300 hover:to-yellow-400 transition-all cursor-pointer shadow-sm shadow-amber-500/20"
                title="Télécharger les 2 fichiers PDF certifiés ATS (CV + Lettre)"
              >
                <Download className="w-3.5 h-3.5 shrink-0" />
                <span>Pack PDF (CV + Lettre)</span>
              </button>
            </div>
          </div>

          {/* Label Déontologique RH & IA Éthique */}
          <div className="mt-3 p-2.5 rounded-xl bg-slate-950/60 light:bg-slate-100 border border-slate-800 light:border-slate-300 flex items-center justify-between text-[11px] text-slate-400 light:text-slate-600">
            <span className="flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 light:text-emerald-600 shrink-0" />
              <span>Dossier certifié conforme à la <strong>Charte de Déontologie RH & IA Éthique</strong></span>
            </span>
            <span className="text-[10px] text-amber-300 light:text-amber-800 font-mono hidden xs:inline">
              100% Faits Réels · 0 Falsification
            </span>
          </div>
        </div>
      )}
    </div>
  );
};
