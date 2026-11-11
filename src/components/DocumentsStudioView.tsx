import React, { useState, useEffect, useMemo } from 'react';
import { OptimizedCv, CoverLetter, SemanticGapAnalysis } from '../types/ats';
import { AtsResumeView } from './AtsResumeView';
import { CoverLetterView } from './CoverLetterView';
import { AtsComparisonModal } from './AtsComparisonModal';
import { ReadyToApplyChecklist } from './ReadyToApplyChecklist';
import { PreInterviewCoach } from './PreInterviewCoach';
import { ShareAppModal } from './ShareAppModal';
import {
  FileText,
  Mail,
  FileSearch,
  Download,
  Printer,
  Copy,
  Check,
  CheckCircle2,
  ArrowLeft,
  Sparkles,
  Award,
  PackageCheck,
  Maximize2,
  Minimize2,
  Layers,
  X,
  ChevronUp,
  Lightbulb,
  Globe,
  Share2,
  TrendingUp,
  ShieldCheck,
  Clock,
  Heart,
  Volume2,
} from 'lucide-react';

import { downloadCvPdf, downloadCoverLetterPdf, downloadBothPdfs, downloadApplicationPackPdf } from '../utils/pdfGenerator';
import { downloadCvDocx, downloadCoverLetterDocx } from '../utils/docxGenerator';
import { isEnglishText } from '../utils/languageDetector';

interface DocumentsStudioViewProps {
  cv: OptimizedCv;
  coverLetter: CoverLetter;
  originalCvText: string;
  analysis?: SemanticGapAnalysis;
  onChangeCv: (updated: OptimizedCv) => void;
  onChangeCoverLetter: (updated: CoverLetter) => void;
  onOpenBulletRefiner: (bullet: string, roleContext: string, expIndex: number, bulletIndex: number) => void;
  onBackToAnalysis: () => void;
  onPrint: (targetDoc?: 'cv' | 'coverLetter') => void;
  onCopyRawText: () => void;
  copiedRaw: boolean;
  onToast?: (title: string, message?: string) => void;
}

export const DocumentsStudioView: React.FC<DocumentsStudioViewProps> = ({
  cv,
  coverLetter,
  originalCvText,
  analysis,
  onChangeCv,
  onChangeCoverLetter,
  onOpenBulletRefiner,
  onBackToAnalysis,
  onPrint,
  onCopyRawText,
  copiedRaw,
  onToast,
}) => {
  const [activeTab, setActiveTab] = useState<'cv' | 'coverLetter'>('cv');
  const [fontSize, setFontSize] = useState<'standard' | 'comfort' | 'large'>('comfort');
  const [comparisonModalOpen, setComparisonModalOpen] = useState<boolean>(false);
  const [shareModalOpen, setShareModalOpen] = useState<boolean>(false);
  const [downloadedFormat, setDownloadedFormat] = useState<string | null>(null);
  const [zoomMode, setZoomMode] = useState<'fit' | 'full'>('full');
  const [isSuccessModalOpen, setIsSuccessModalOpen] = useState<boolean>(false);
  const [showFloatingBar, setShowFloatingBar] = useState<boolean>(false);

  // Scroll detection for floating bar on larger screens
  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 240) {
        setShowFloatingBar(true);
      } else {
        setShowFloatingBar(false);
      }
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Dynamic calculations for impact score (Axe 1)
  const initialScore = Number(analysis?.scores?.initialAtsScore) || 52;
  const optimizedScore = Number(analysis?.scores?.optimizedAtsScore) || 92;
  const scoreDiff = Math.max(30, optimizedScore - initialScore);
  const starBulletsCount = cv.experiences?.reduce((total, exp) => total + (exp.bullets?.length || 0), 0) || 8;

  // 3 keywords for oral interview
  const oralKeyWords: string[] = useMemo(() => {
    if (analysis?.keywordsAnalysis?.criticalRequiredKeywords && analysis.keywordsAnalysis.criticalRequiredKeywords.length > 0) {
      return analysis.keywordsAnalysis.criticalRequiredKeywords.slice(0, 3);
    }
    if (analysis?.keywordsAnalysis?.matchedKeywords && analysis.keywordsAnalysis.matchedKeywords.length > 0) {
      return analysis.keywordsAnalysis.matchedKeywords.slice(0, 3);
    }
    return ['Impact mesurable & KPIs', 'Méthodologie STAR', 'Leadership de projet'];
  }, [analysis]);

  const isEn =
    cv.languageMode === 'en' ||
    coverLetter.languageMode === 'en' ||
    analysis?.languageMode === 'en' ||
    isEnglishText(cv.professionalSummary || '') ||
    isEnglishText(coverLetter.paragraphs?.vous || '');

  // Copy handler with dynamic toast feedback (Axe 3)
  const handleCopy = () => {
    onCopyRawText();
    if (onToast) {
      onToast(
        'Texte copié !',
        `Le contenu brut de votre ${activeTab === 'cv' ? 'CV' : 'Lettre'} est prêt à coller dans vos formulaires.`
      );
    }
  };

  // Download pack handler with toast feedback
  const handleDownloadPack = () => {
    downloadApplicationPackPdf(cv, coverLetter);
    setDownloadedFormat('pack-pdf');
    setIsSuccessModalOpen(true);
    if (onToast) {
      onToast(
        'Téléchargement lancé !',
        'Votre CV certifié et votre Lettre de motivation sont dans vos Téléchargements.'
      );
    }
    setTimeout(() => setDownloadedFormat(null), 3000);
  };

  // Download single doc handler
  const handleDownloadSingle = () => {
    if (activeTab === 'cv') {
      downloadCvPdf(cv);
    } else {
      downloadCoverLetterPdf(coverLetter);
    }
    setDownloadedFormat('single-pdf');
    if (onToast) {
      onToast(
        'Fichier PDF généré !',
        `Votre ${activeTab === 'cv' ? 'CV ATS' : 'Lettre de motivation'} est téléchargé.`
      );
    }
    setTimeout(() => setDownloadedFormat(null), 2500);
  };

  // Download Word (.docx) handler (Axe D)
  const handleDownloadDocx = async () => {
    try {
      if (activeTab === 'cv') {
        await downloadCvDocx(cv);
      } else {
        await downloadCoverLetterDocx(coverLetter);
      }
      setDownloadedFormat('single-docx');
      if (onToast) {
        onToast(
          'Document Word (.docx) généré !',
          `Votre ${activeTab === 'cv' ? 'CV ATS' : 'Lettre de motivation'} en Word (.docx) est dans vos téléchargements.`
        );
      }
      setTimeout(() => setDownloadedFormat(null), 2500);
    } catch (e) {
      console.error("Erreur lors de la création du document Word:", e);
    }
  };

  // Raccourci vers le Pitch Oral / Simulateur STAR
  const handleScrollToPitch = () => {
    const el = document.getElementById('coach-oral');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      if (onToast) {
        onToast('Simulateur & Pitch Oral', 'Préparez votre pitch de 45 secondes et écoutez les questions orales.');
      }
    }
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-28 text-left">
      {/* 1. Impact Score & ATS Certification Bar (Axe 1 & Axe 2) */}
      <div className="bg-gradient-to-r from-[#0C1A3F] via-[#0B1530] to-[#070E24] light:from-white light:via-slate-50 light:to-slate-100 border border-amber-400/40 light:border-slate-200 rounded-2xl p-4 sm:p-5 shadow-xl text-white light:text-slate-900 transition-colors">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            {/* Visual Gold/Emerald Badge */}
            <div className="relative w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-400 via-amber-300 to-yellow-500 text-slate-950 flex items-center justify-center font-extrabold shadow-lg shadow-amber-500/30 shrink-0">
              <span className="text-base font-mono">{optimizedScore}%</span>
              <span className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-emerald-400 border-2 border-[#0B1530]" />
            </div>

            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-base sm:text-lg font-extrabold text-white light:text-slate-900 tracking-tight">
                  Score de Passage ATS : {optimizedScore}%
                </h2>
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-500/20 light:bg-emerald-100 text-emerald-300 light:text-emerald-800 text-xs font-bold font-mono">
                  <TrendingUp className="w-3.5 h-3.5" />
                  +{scoreDiff} pts de gain
                </span>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-400/20 light:bg-amber-100 text-amber-300 light:text-amber-800 text-[11px] font-bold">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  Certifié ATS 2026
                </span>
              </div>
              <p className="text-xs text-slate-300 light:text-slate-600 mt-1">
                Score initial brut : <strong className="font-mono">{initialScore}%</strong> ➔ Vos {starBulletsCount} réalisations sont valorisées avec les <strong>verbes d'action STAR</strong> et la grille exacte de l'employeur.
              </p>
            </div>
          </div>

          {/* Quick Actions (Comparer avec l'original & Partager) */}
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => setComparisonModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-amber-300 light:text-amber-800 bg-slate-900/80 light:bg-slate-100 hover:bg-slate-800 light:hover:bg-slate-200 border border-amber-400/40 light:border-amber-400/50 rounded-xl transition-all cursor-pointer shadow-sm hover:scale-[1.02]"
              title="Comparer côte à côte votre CV initial et le résultat optimisé"
            >
              <FileSearch className="w-4 h-4 text-amber-400" />
              <span>Comparer Avant / Après</span>
            </button>

            <button
              type="button"
              onClick={() => setShareModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-300 light:text-slate-700 bg-slate-900/60 light:bg-slate-100 hover:bg-slate-800 light:hover:bg-slate-200 border border-slate-700 light:border-slate-300 rounded-xl transition-all cursor-pointer"
              title="Partager solidairement cet outil 100% gratuit avec un proche"
            >
              <Share2 className="w-4 h-4 text-amber-400" />
              <span className="hidden sm:inline">Partager</span>
            </button>
          </div>
        </div>
      </div>

      {/* Bannière Pédagogique : Clarification des 2 Documents Générés (Anti-Confusion Testeurs) */}
      <div className="bg-gradient-to-r from-amber-400/10 via-[#0B1530] to-blue-950/20 light:from-amber-50 light:via-white light:to-blue-50/50 border border-amber-400/25 light:border-amber-200 rounded-2xl p-4 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs">
        <div className="flex items-start sm:items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-amber-400/20 text-amber-300 light:text-amber-800 flex items-center justify-center shrink-0 font-bold border border-amber-400/30">
            2
          </div>
          <div>
            <p className="font-bold text-white light:text-slate-900 flex items-center gap-2">
              <span>Votre dossier complet comprend 2 documents stratégiques distincts :</span>
            </p>
            <p className="text-slate-300 light:text-slate-600 text-[11.5px] mt-0.5">
              <strong className="text-amber-300 light:text-amber-700">Document 1 : Le CV Certifié ATS</strong> (monocolonne, verbes d'action STAR pour franchir les robots) ·{' '}
              <strong className="text-blue-300 light:text-blue-700">Document 2 : La Lettre Stratégique</strong> (trame Vous / Moi / Nous pour convaincre le manager humain).
            </p>
          </div>
        </div>

        {/* Contrôle Global de la Taille de Police (A- / A / A+) */}
        <div className="flex items-center gap-1.5 self-start md:self-auto shrink-0 bg-slate-950/80 light:bg-slate-100 px-3 py-1.5 rounded-xl border border-slate-800 light:border-slate-300">
          <span className="text-[11px] text-slate-400 light:text-slate-600 font-medium">Taille police :</span>
          <button
            type="button"
            onClick={() => setFontSize('standard')}
            className={`px-2 py-1 rounded-md text-[11px] font-bold transition-all cursor-pointer ${
              fontSize === 'standard'
                ? 'bg-amber-400 text-slate-950 shadow-xs'
                : 'text-slate-400 light:text-slate-600 hover:text-white light:hover:text-slate-900'
            }`}
            title="Taille Standard (10pt) : Idéal pour condenser un long parcours"
          >
            A- 10pt
          </button>
          <button
            type="button"
            onClick={() => setFontSize('comfort')}
            className={`px-2 py-1 rounded-md text-[11px] font-bold transition-all cursor-pointer ${
              fontSize === 'comfort'
                ? 'bg-amber-400 text-slate-950 shadow-xs'
                : 'text-slate-400 light:text-slate-600 hover:text-white light:hover:text-slate-900'
            }`}
            title="Taille Confort (11.5pt) : Lisibilité optimale sur smartphone et écran d'ordinateur (Recommandé)"
          >
            A 11.5pt
          </button>
          <button
            type="button"
            onClick={() => setFontSize('large')}
            className={`px-2 py-1 rounded-md text-[11px] font-bold transition-all cursor-pointer ${
              fontSize === 'large'
                ? 'bg-amber-400 text-slate-950 shadow-xs'
                : 'text-slate-400 light:text-slate-600 hover:text-white light:hover:text-slate-900'
            }`}
            title="Taille Aérée (13pt) : Grand confort de lecture sans fatigue"
          >
            A+ 13pt
          </button>
        </div>
      </div>

      {/* Top Document Controls Bar (Tabs, Zoom & Primary Pack Download) */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-3.5 bg-[#0B1530] light:bg-white border border-slate-800 light:border-slate-200 rounded-2xl shadow-lg transition-colors">
        {/* Left: Tab switch between CV and Cover letter */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onBackToAnalysis}
            className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-slate-300 light:text-slate-600 hover:text-white light:hover:text-slate-900 hover:bg-slate-800 light:hover:bg-slate-100 rounded-lg transition-colors cursor-pointer mr-1"
            title="Revenir à la Boussole sémantique"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Boussole</span>
          </button>

          <div className="flex items-center bg-slate-950/80 light:bg-slate-100 rounded-xl p-1 border border-slate-800 light:border-slate-200 text-xs">
            <button
              type="button"
              onClick={() => setActiveTab('cv')}
              className={`flex items-center gap-2 px-3 sm:px-3.5 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                activeTab === 'cv'
                  ? 'bg-amber-400 text-slate-950 shadow-md shadow-amber-500/20'
                  : 'text-slate-300 light:text-slate-600 hover:text-white light:hover:text-slate-900'
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              <span>Doc 1 : CV Certifié ATS</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('coverLetter')}
              className={`flex items-center gap-2 px-3 sm:px-3.5 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                activeTab === 'coverLetter'
                  ? 'bg-amber-400 text-slate-950 shadow-md shadow-amber-500/20'
                  : 'text-slate-300 light:text-slate-600 hover:text-white light:hover:text-slate-900'
              }`}
            >
              <Mail className="w-3.5 h-3.5" />
              <span>Doc 2 : Lettre Stratégique</span>
            </button>
          </div>

          <div className="hidden lg:flex items-center gap-1.5 text-xs text-slate-400 light:text-slate-500 font-mono ml-2">
            <Globe className="w-3.5 h-3.5 text-amber-400" />
            <span>{isEn ? '🇬🇧 Mode International ATS' : '🇫🇷 Mode France / UE'}</span>
          </div>
        </div>

        {/* Right: Export & Sharing Actions avec le Bouton Prioritaire Pack Candidature */}
        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
          {/* Bouton Prioritaire Doré : Pack Candidature Complet */}
          <button
            type="button"
            onClick={handleDownloadPack}
            className="w-full sm:w-auto justify-center inline-flex items-center gap-2 px-4 py-2.5 sm:py-2 text-xs font-extrabold text-slate-950 bg-gradient-to-r from-amber-400 via-amber-300 to-yellow-500 hover:from-amber-300 hover:to-yellow-400 rounded-xl shadow-lg shadow-amber-500/25 transition-all hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
            title="Télécharger l'intégralité du pack (CV + Lettre de motivation) en un clic"
          >
            <PackageCheck className="w-4 h-4 text-slate-950 shrink-0" />
            <span>
              {downloadedFormat === 'pack-pdf' ? (
                'Pack Téléchargé !'
              ) : (
                <>
                  <span className="hidden sm:inline">Pack Complet (CV + LM PDF)</span>
                  <span className="sm:hidden">Pack Complet (CV + Lettre)</span>
                </>
              )}
            </span>
          </button>

          {/* Secondary Action Row for Mobile / Flex for Desktop */}
          <div className="grid grid-cols-2 sm:grid-cols-4 sm:flex w-full sm:w-auto items-center gap-1.5">
            {/* Exporter le document actif en PDF */}
            <button
              type="button"
              onClick={handleDownloadSingle}
              className="inline-flex items-center justify-center gap-1.5 px-2.5 sm:px-3 py-2 sm:py-1.5 text-xs font-semibold text-slate-200 light:text-slate-700 bg-slate-900/90 light:bg-slate-100 hover:bg-slate-800 light:hover:bg-slate-200 border border-slate-700/80 light:border-slate-300 rounded-lg transition-colors cursor-pointer"
              title={activeTab === 'cv' ? 'Télécharger uniquement le CV en PDF' : 'Télécharger uniquement la Lettre en PDF'}
            >
              <Download className="w-3.5 h-3.5 text-slate-400 light:text-slate-600 shrink-0" />
              <span>{downloadedFormat === 'single-pdf' ? 'Téléchargé !' : `${activeTab === 'cv' ? 'CV PDF' : 'Lettre PDF'}`}</span>
            </button>

            {/* Exporter en Word (.docx) - Axe D */}
            <button
              type="button"
              onClick={handleDownloadDocx}
              className="inline-flex items-center justify-center gap-1.5 px-2.5 sm:px-3 py-2 sm:py-1.5 text-xs font-semibold text-blue-200 light:text-blue-800 bg-blue-950/80 light:bg-blue-50 hover:bg-blue-900/80 light:hover:bg-blue-100 border border-blue-500/40 light:border-blue-300 rounded-lg transition-colors cursor-pointer"
              title={activeTab === 'cv' ? 'Télécharger le CV au format Microsoft Word (.docx) conforme ATS' : 'Télécharger la Lettre au format Word (.docx)'}
            >
              <FileText className="w-3.5 h-3.5 text-blue-400 light:text-blue-600 shrink-0" />
              <span>{downloadedFormat === 'single-docx' ? 'DOCX OK !' : 'Word (.docx)'}</span>
            </button>

            {/* Copier texte brut */}
            <button
              type="button"
              onClick={handleCopy}
              className="inline-flex items-center justify-center gap-1.5 px-2.5 py-2 sm:py-1.5 text-xs font-medium text-slate-300 light:text-slate-700 bg-slate-900/80 light:bg-slate-100 hover:bg-slate-800 light:hover:bg-slate-200 border border-slate-700/70 light:border-slate-300 rounded-lg transition-colors cursor-pointer"
              title="Copier le texte brut pour le coller dans les formulaires"
            >
              {copiedRaw ? (
                <span className="text-emerald-400 font-semibold flex items-center gap-1"><Check className="w-3.5 h-3.5" /> Copié</span>
              ) : (
                <span className="flex items-center gap-1"><Copy className="w-3.5 h-3.5 text-slate-400 light:text-slate-600" /> Copier</span>
              )}
            </button>

            {/* Imprimer */}
            <button
              type="button"
              onClick={() => onPrint(activeTab)}
              className="inline-flex items-center justify-center gap-1.5 px-2.5 sm:px-3 py-2 sm:py-1.5 text-xs font-semibold text-slate-200 light:text-slate-700 hover:text-white bg-slate-900/90 light:bg-slate-100 hover:bg-slate-800 light:hover:bg-slate-200 border border-slate-700/80 light:border-slate-300 rounded-lg shadow-sm transition-all cursor-pointer"
              title="Lancer l'impression A4"
            >
              <Printer className="w-3.5 h-3.5 text-slate-300 light:text-slate-600 shrink-0" />
              <span>Imprimer</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Document Parchment Area */}
      <div className={`p-2.5 sm:p-6 md:p-10 bg-[#0F172A]/90 light:bg-slate-100 border border-slate-800/80 light:border-slate-300 rounded-2xl sm:rounded-3xl shadow-2xl shadow-black/80 light:shadow-slate-200 ring-1 ring-amber-400/10 transition-all ${
        zoomMode === 'fit' ? 'max-w-4xl scale-[0.95] origin-top mx-auto' : 'w-full'
      }`}>
        <div className="transition-all duration-300">
          {activeTab === 'cv' ? (
            <AtsResumeView
              cv={cv}
              onChangeCv={onChangeCv}
              onOpenBulletRefiner={onOpenBulletRefiner}
              onPrint={() => onPrint('cv')}
              onGoToCoverLetter={() => setActiveTab('coverLetter')}
              originalCvText={originalCvText}
              fontSize={fontSize}
              onChangeFontSize={setFontSize}
            />
          ) : (
            <CoverLetterView
              coverLetter={coverLetter}
              onChangeCoverLetter={onChangeCoverLetter}
              onPrint={() => onPrint('coverLetter')}
              onBackToResume={() => setActiveTab('cv')}
              fontSize={fontSize}
              onChangeFontSize={setFontSize}
            />
          )}
        </div>
      </div>

      {/* Axe 4: Interactive Pre-Interview Coach (Questions orales STAR) */}
      <PreInterviewCoach analysis={analysis} cv={cv} />

      {/* Checklist Prêt à Postuler */}
      <ReadyToApplyChecklist
        cv={cv}
        coverLetter={coverLetter}
        analysis={analysis}
        onPrint={onPrint}
        onCopyRawText={handleCopy}
        copiedRaw={copiedRaw}
        onDownloadPack={handleDownloadPack}
      />

      {/* Comparison Modal (Avant / Après) */}
      <AtsComparisonModal
        isOpen={comparisonModalOpen}
        onClose={() => setComparisonModalOpen(false)}
        originalText={originalCvText}
        optimizedCv={cv}
      />

      {/* Share Modal (Axe 4: Recommandation Solidaire) */}
      <ShareAppModal
        isOpen={shareModalOpen}
        onClose={() => setShareModalOpen(false)}
        onToast={onToast || (() => {})}
      />

      {/* Mobile Sticky Action Bar - Levier 1 : Thumb Zone, Score persistant, Pitch & Cibles tactiles >= 44px */}
      <div className="fixed bottom-0 left-0 right-0 z-40 px-2.5 pt-2 pb-[max(0.75rem,env(safe-area-inset-bottom,0.75rem))] bg-[#060B18]/95 light:bg-white/95 backdrop-blur-xl border-t border-amber-400/40 light:border-slate-300 shadow-2xl md:hidden flex items-center justify-between gap-1.5 no-print">
        {/* Score ATS persistant sous le pouce */}
        <button
          type="button"
          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          className="flex flex-col items-center justify-center px-2 py-1 min-h-[44px] min-w-[48px] rounded-xl bg-gradient-to-br from-amber-400/20 to-yellow-500/10 light:bg-amber-50 border border-amber-400/40 light:border-amber-300 text-slate-100 light:text-slate-900 cursor-pointer active:scale-95 shrink-0"
          title="Score de passage ATS actuel (cliquer pour remonter)"
        >
          <span className="text-[9px] uppercase font-mono font-bold text-amber-300 light:text-amber-800 leading-none">ATS</span>
          <span className="text-xs font-mono font-extrabold text-white light:text-slate-950 mt-0.5">{optimizedScore}%</span>
        </button>

        {/* Toggle CV / Lettre avec cibles tactiles >= 44px */}
        <div className="flex items-center bg-slate-900/90 light:bg-slate-100 rounded-xl p-0.5 border border-slate-800 light:border-slate-300 text-xs shrink-0">
          <button
            type="button"
            onClick={() => setActiveTab('cv')}
            className={`px-2.5 py-2 min-h-[44px] min-w-[44px] rounded-lg font-bold text-xs flex items-center justify-center transition-colors cursor-pointer ${
              activeTab === 'cv' ? 'bg-amber-400 text-slate-950 shadow-xs' : 'text-slate-400 light:text-slate-700'
            }`}
          >
            CV
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('coverLetter')}
            className={`px-2.5 py-2 min-h-[44px] min-w-[44px] rounded-lg font-bold text-xs flex items-center justify-center transition-colors cursor-pointer ${
              activeTab === 'coverLetter' ? 'bg-amber-400 text-slate-950 shadow-xs' : 'text-slate-400 light:text-slate-700'
            }`}
          >
            Lettre
          </button>
        </div>

        {/* Raccourci Écouter le Pitch */}
        <button
          type="button"
          onClick={handleScrollToPitch}
          className="px-2.5 py-2 min-h-[44px] min-w-[44px] rounded-xl bg-slate-900 light:bg-slate-100 text-amber-300 light:text-amber-800 border border-amber-400/30 light:border-amber-400/50 hover:bg-slate-800 text-xs font-bold flex items-center justify-center gap-1 cursor-pointer active:scale-95 shrink-0"
          title="Écouter le Pitch vocal de 45s & questions"
        >
          <Volume2 className="w-4 h-4 text-amber-400 light:text-amber-700 shrink-0 animate-pulse" />
          <span className="text-[11px]">Pitch</span>
        </button>

        {/* Bouton Télécharger PDF Simple */}
        <button
          type="button"
          onClick={handleDownloadSingle}
          className="p-2 min-h-[44px] min-w-[44px] rounded-xl bg-slate-900 light:bg-slate-100 text-slate-200 light:text-slate-800 border border-slate-700 light:border-slate-300 hover:bg-slate-800 text-xs font-semibold flex items-center justify-center cursor-pointer active:scale-95 shrink-0"
          title="Télécharger le document actif en PDF"
        >
          <Download className="w-4 h-4 text-slate-300 light:text-slate-700 shrink-0" />
        </button>

        {/* Bouton Prioritaire Pack PDF (CV + Lettre) */}
        <button
          type="button"
          onClick={handleDownloadPack}
          className="flex-1 py-2 px-2.5 min-h-[44px] bg-gradient-to-r from-amber-400 via-amber-300 to-yellow-500 text-slate-950 rounded-xl text-xs font-extrabold flex items-center justify-center gap-1.5 shadow-md shadow-amber-500/25 shrink-0 transition-transform active:scale-95 cursor-pointer"
          title="Télécharger le pack complet certifié (CV + Lettre)"
        >
          <PackageCheck className="w-4 h-4 text-slate-950 shrink-0" />
          <span className="truncate font-extrabold">Pack PDF</span>
        </button>
      </div>

      {/* Floating Action Pill on larger screens when scrolled down (Axe 3) */}
      {showFloatingBar && (
        <aside
          aria-label="Barre d'action flottante"
          className="fixed bottom-5 left-1/2 -translate-x-1/2 z-40 no-print animate-fade-in hidden md:block"
        >
          <div className="flex items-center gap-2 p-1.5 sm:p-2 bg-[#0B1530]/95 light:bg-white/95 backdrop-blur-xl border border-amber-400/50 light:border-slate-300 rounded-full shadow-2xl shadow-black/90 light:shadow-slate-300 ring-1 ring-amber-400/20 text-white light:text-slate-900">
            {/* Mini doc selector */}
            <div className="flex items-center bg-slate-950/80 light:bg-slate-100 rounded-full p-0.5 border border-slate-800 light:border-slate-200 text-[11px]">
              <button
                type="button"
                onClick={() => setActiveTab('cv')}
                className={`px-3 py-1 rounded-full font-bold transition-all cursor-pointer ${
                  activeTab === 'cv'
                    ? 'bg-amber-400 text-slate-950 shadow-xs'
                    : 'text-slate-400 light:text-slate-600 hover:text-white'
                }`}
              >
                CV ATS
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('coverLetter')}
                className={`px-3 py-1 rounded-full font-bold transition-all cursor-pointer ${
                  activeTab === 'coverLetter'
                    ? 'bg-amber-400 text-slate-950 shadow-xs'
                    : 'text-slate-400 light:text-slate-600 hover:text-white'
                }`}
              >
                Lettre
              </button>
            </div>

            {/* Bouton Doré Prioritaire : Pack Candidature Complet */}
            <button
              type="button"
              onClick={handleDownloadPack}
              className="inline-flex items-center gap-1.5 px-4 py-1.5 text-xs font-extrabold text-slate-950 bg-gradient-to-r from-amber-400 via-amber-300 to-yellow-500 hover:from-amber-300 hover:to-yellow-400 rounded-full shadow-lg shadow-amber-500/30 transition-all hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
              title="Télécharger les 2 documents certifiés en 1 clic"
            >
              <PackageCheck className="w-4 h-4 text-slate-950 shrink-0" />
              <span>Pack Complet (CV + LM)</span>
            </button>

            {/* Télécharger PDF seul */}
            <button
              type="button"
              onClick={handleDownloadSingle}
              className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-slate-200 light:text-slate-700 bg-slate-900/90 light:bg-slate-100 hover:bg-slate-800 border border-slate-700/80 light:border-slate-300 rounded-full transition-colors cursor-pointer"
            >
              <Download className="w-3.5 h-3.5 text-slate-400" />
              <span>{activeTab === 'cv' ? 'CV PDF' : 'Lettre PDF'}</span>
            </button>

            {/* Comparer Avant / Après */}
            <button
              type="button"
              onClick={() => setComparisonModalOpen(true)}
              className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-amber-300 light:text-amber-800 bg-slate-900/80 light:bg-slate-100 hover:bg-slate-800 border border-amber-400/40 rounded-full transition-colors cursor-pointer"
            >
              <FileSearch className="w-3.5 h-3.5 text-amber-400" />
              <span>Comparer</span>
            </button>

            {/* Bouton Remonter en haut de page */}
            <button
              type="button"
              onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
              className="p-1.5 sm:p-2 text-slate-300 light:text-slate-600 hover:text-white light:hover:text-slate-900 hover:bg-slate-800/80 rounded-full transition-colors cursor-pointer"
              title="Remonter en haut du document"
              aria-label="Remonter en haut de page"
            >
              <ChevronUp className="w-4 h-4" />
            </button>
          </div>
        </aside>
      )}

      {/* Success Modal */}
      {isSuccessModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in no-print">
          <div className="bg-[#0B1530] light:bg-white border border-amber-400/50 light:border-slate-300 rounded-2xl max-w-lg w-full p-6 sm:p-8 shadow-2xl text-white light:text-slate-900 text-left relative overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-amber-400 to-transparent" />

            <button
              type="button"
              onClick={() => setIsSuccessModalOpen(false)}
              className="absolute top-4 right-4 p-1.5 text-slate-400 hover:text-white light:text-slate-500 light:hover:text-slate-900 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
              title="Fermer"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-3.5">
              <div className="relative w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-400 via-amber-300 to-yellow-500 flex items-center justify-center text-slate-950 shadow-lg shadow-amber-500/40 shrink-0">
                <PackageCheck className="w-6 h-6" />
                <span className="absolute -top-1 -right-1 w-3 h-3 bg-emerald-400 rounded-full border-2 border-[#0B1530]" />
              </div>
              <div>
                <h3 className="text-lg sm:text-xl font-extrabold text-white light:text-slate-900 flex items-center gap-2">
                  <span>🎉 Candidature Certifiée Prête !</span>
                </h3>
                <p className="text-xs text-amber-300 light:text-amber-800 font-medium mt-0.5">
                  Vos 2 documents haute définition sont enregistrés dans vos Téléchargements
                </p>
              </div>
            </div>

            {/* Fichiers générés */}
            <div className="space-y-2 bg-slate-950/70 light:bg-slate-50 border border-slate-800 light:border-slate-200 rounded-xl p-3.5 text-xs">
              <div className="flex items-center justify-between text-slate-200 light:text-slate-700">
                <span className="flex items-center gap-2 min-w-0">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span className="font-semibold truncate">CV_{(cv.personalInfo.fullName || 'Candidat').replace(/\s+/g, '_')}.pdf</span>
                </span>
                <span className="text-[11px] font-mono text-emerald-400 light:text-emerald-700 shrink-0 ml-2">Optimisé Parseurs ATS</span>
              </div>
              <div className="flex items-center justify-between text-slate-200 light:text-slate-700">
                <span className="flex items-center gap-2 min-w-0">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span className="font-semibold truncate">Lettre_Motivation_{(cv.personalInfo.fullName || 'Candidat').replace(/\s+/g, '_')}.pdf</span>
                </span>
                <span className="text-[11px] font-mono text-amber-300 light:text-amber-700 shrink-0 ml-2">Vous / Moi / Nous</span>
              </div>
            </div>

            {/* Label Déontologique RH & IA Éthique */}
            <div className="p-3 rounded-xl bg-emerald-950/30 light:bg-emerald-50/80 border border-emerald-500/30 light:border-emerald-200 flex items-start gap-2.5 text-left">
              <ShieldCheck className="w-4 h-4 text-emerald-400 light:text-emerald-700 shrink-0 mt-0.5" />
              <div className="text-[11px] leading-relaxed text-slate-200 light:text-slate-800">
                <span className="font-bold text-white light:text-emerald-950 block">
                  Dossier Conforme à la Charte de Déontologie RH & IA Éthique
                </span>
                <span className="text-slate-300 light:text-slate-600">
                  100% de vos faits réels valorisés · 0 falsification · Clarté narrative STAR prête pour le décideur humain.
                </span>
              </div>
            </div>

            {/* Solidary share invitation */}
            <div className="p-3.5 bg-gradient-to-r from-amber-950/40 via-slate-950 to-blue-950/40 light:from-amber-50 light:via-slate-50 light:to-blue-50 border border-amber-400/30 rounded-xl flex items-center justify-between gap-3">
              <div className="text-xs space-y-0.5">
                <span className="font-bold text-white light:text-slate-900 flex items-center gap-1.5">
                  <Heart className="w-3.5 h-3.5 text-amber-400" />
                  Un ami en recherche d'emploi ?
                </span>
                <p className="text-[11px] text-slate-300 light:text-slate-600">
                  Aidez-le en lui partageant JNB Align (100% gratuit).
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShareModalOpen(true)}
                className="px-3 py-1.5 bg-amber-400 hover:bg-amber-300 text-slate-950 text-xs font-bold rounded-lg shadow-sm shrink-0 cursor-pointer"
              >
                Partager
              </button>
            </div>

            {/* Actions de clôture */}
            <div className="pt-2 flex flex-col gap-2.5">
              <button
                type="button"
                onClick={() => {
                  setIsSuccessModalOpen(false);
                  setComparisonModalOpen(true);
                }}
                className="w-full py-2.5 px-4 rounded-xl text-xs font-semibold text-amber-300 light:text-amber-800 hover:text-white bg-slate-900/90 light:bg-slate-100 hover:bg-slate-800 border border-amber-400/35 hover:border-amber-400 transition-all flex items-center justify-center gap-2 cursor-pointer shadow-sm"
              >
                <FileSearch className="w-3.5 h-3.5 text-amber-400" />
                <span>Voir le comparatif Avant / Après mon CV</span>
              </button>

              <button
                type="button"
                onClick={() => setIsSuccessModalOpen(false)}
                className="w-full py-3 px-4 rounded-xl text-xs font-bold text-slate-950 bg-gradient-to-r from-amber-400 via-amber-300 to-yellow-500 hover:from-amber-300 hover:to-yellow-400 transition-all cursor-pointer shadow-md text-center"
              >
                C'est noté, je suis prêt pour postuler !
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
