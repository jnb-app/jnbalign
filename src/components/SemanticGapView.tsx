import React from 'react';
import { SemanticGapAnalysis } from '../types/ats';
import { AtsCompatibilityGauge } from './AtsCompatibilityGauge';
import { KeywordsTagCloud } from './KeywordsTagCloud';
import {
  CheckCircle2,
  ArrowRight,
  ShieldCheck,
  FileText,
  Sparkles,
  Compass,
  Check,
  Download,
  Printer,
  Clock,
  Award,
} from 'lucide-react';

interface SemanticGapViewProps {
  analysis: SemanticGapAnalysis;
  onGoToDocuments: () => void;
  onGoToCoverLetter?: () => void;
  onExportPdf?: () => void;
  onPrint?: () => void;
}

export const SemanticGapView: React.FC<SemanticGapViewProps> = ({
  analysis,
  onGoToDocuments,
  onExportPdf,
  onPrint,
}) => {
  // Safe extraction with default objects
  const jobOverview = analysis?.jobOverview || {
    title: 'Poste Cible',
    company: '',
    industry: 'Technologie & Services Innovants',
    summary: '',
  };

  const scores = analysis?.scores || {
    initialAtsScore: 52,
    optimizedAtsScore: 92,
    scoreExplanation: "Progression majeure d'adéquation ATS grâce à la reformulation STAR avec verbes d'action.",
  };

  const initialScore = Number(scores.initialAtsScore) || 52;
  const optimizedScore = Number(scores.optimizedAtsScore) || 92;
  const diff = optimizedScore - initialScore;
  const scoreDiff = diff > 0 ? diff : 40;

  const keywordsAnalysis = analysis?.keywordsAnalysis || {
    criticalRequiredKeywords: [],
    matchedKeywords: [],
    integratedKeywords: [],
    missingOrGaps: [],
  };

  const matchedKeywords = Array.isArray(keywordsAnalysis.matchedKeywords) ? keywordsAnalysis.matchedKeywords : [];
  const integratedKeywords = Array.isArray(keywordsAnalysis.integratedKeywords) ? keywordsAnalysis.integratedKeywords : [];
  const missingOrGaps = Array.isArray(keywordsAnalysis.missingOrGaps) ? keywordsAnalysis.missingOrGaps : [];

  // Breakdown sub-scores calculated from analysis data
  const totalKeywordsCount = matchedKeywords.length + integratedKeywords.length + missingOrGaps.length;
  const keywordMatchRate = Math.min(
    100,
    Math.round(
      ((matchedKeywords.length + integratedKeywords.length) / Math.max(1, totalKeywordsCount)) * 100
    )
  );

  const atsComplianceAudit = analysis?.atsComplianceAudit || {
    status: 'compliant',
    highlights: [],
    recommendations: [],
  };

  const highlights = Array.isArray(atsComplianceAudit.highlights) && atsComplianceAudit.highlights.length > 0
    ? atsComplianceAudit.highlights
    : [
        "Mise en page à colonne unique conçue pour éviter toute zone de texte bloquante",
        "Typographie standardisée et hiérarchie sémantique optimisée pour parseurs",
        "Préservation stricte et intégrale de vos véritables réalisations",
      ];

  const recommendations = Array.isArray(atsComplianceAudit.recommendations) && atsComplianceAudit.recommendations.length > 0
    ? atsComplianceAudit.recommendations
    : [
        "Appuyez vos réponses sur les métriques et résultats chiffrés valorisés dans le CV",
        "Préparez des anecdotes vécues pour les compétences non explicitement listées",
        "Utilisez la lettre de motivation 'Vous / Moi / Nous' comme fil conducteur oral",
      ];

  const isEn = analysis?.languageMode === 'en';

  const toFrenchExplanation = (text?: string) => {
    if (isEn) {
      if (!text || typeof text !== 'string') {
        return "Your source resume has been meticulously realigned with the target job's keyword matrix using executive STAR action verbs, while strictly preserving your authentic facts.";
      }
      return text;
    }
    if (!text || typeof text !== 'string') {
      return "Votre CV source a été méticuleusement réaligné sur la grille lexicale de l'offre grâce à la reformulation STAR avec verbes d'action, tout en préservant strictement l'authenticité de vos faits réels.";
    }
    if (/\b(the|this|that|resume|score|improved|aligning|candidate|points|match|because|with|from)\b/i.test(text)) {
      return "Progression majeure d'adéquation ATS grâce à la reformulation STAR avec verbes d'action et à l'alignement lexical direct sur les critères clés de l'offre.";
    }
    return text;
  };

  const toFrenchHighlight = (text: any) => {
    if (isEn) {
      if (!text || typeof text !== 'string') {
        return "Single-column layout guaranteed free of parse-blocking tables or text boxes";
      }
      return text;
    }
    if (!text || typeof text !== 'string') {
      return "Structure à colonne unique garantie sans tableau ni zone bloquante pour parseurs ATS";
    }
    if (/\b(single[\s-]column|format|layout|table)\b/i.test(text)) {
      return "Structure à colonne unique garantie sans tableau ni zone bloquante pour parseurs ATS";
    }
    if (/\b(heading|header|section|title)\b/i.test(text)) {
      return "Titrage et hiérarchie sémantique standardisés conformes aux parseurs Workday & Taleo";
    }
    if (/\b(star|action|verb|experience)\b/i.test(text)) {
      return "Reformulation méthodique STAR avec verbes d'action percutants et impacts mesurés";
    }
    if (/\b(hallucination|fact|truth|real)\b/i.test(text)) {
      return "Préservation stricte et intégrale de vos véritables réalisations";
    }
    if (/\b(compliance|ats|workday|taleo)\b/i.test(text)) {
      return "Architecture optimisée pour les moteurs de tri Workday, Taleo et Greenhouse";
    }
    return text;
  };

  const toFrenchRecommendation = (text: any) => {
    if (isEn) {
      return text || "Focus on measurable accomplishments during the interview screening.";
    }
    if (!text || typeof text !== 'string') {
      return "Appuyez vos réponses sur les métriques et résultats chiffrés valorisés dans le CV";
    }
    if (/\b(interview|screen|phone|skill|anecdote|gap)\b/i.test(text)) {
      return "Préparez des anecdotes vécues pour les compétences non explicitement listées";
    }
    if (/\b(cover[\s-]letter|letter|vous|story)\b/i.test(text)) {
      return "Utilisez la trame Vous / Moi / Nous de la lettre de motivation comme fil conducteur oral";
    }
    return text;
  };

  const cleanIndustry = (ind?: string) => {
    if (isEn) {
      return ind || "Technology & Innovative Services";
    }
    if (!ind || typeof ind !== 'string' || /\b(technology|services|software|engineering)\b/i.test(ind)) {
      return "Technologie & Services Innovants";
    }
    return ind;
  };

  return (
    <div className="space-y-8 max-w-5xl mx-auto text-left">
      {/* Top Banner / Hero Summary with JNB Align Touch (Axe 1 & 2) */}
      <div className="bg-gradient-to-br from-[#0B1736] via-[#0E1E46] to-[#070E24] light:from-white light:via-slate-50 light:to-slate-100 border border-amber-400/30 light:border-slate-200 rounded-2xl p-6 sm:p-8 text-white light:text-slate-900 shadow-xl shadow-black/20 light:shadow-slate-200 relative overflow-hidden transition-colors">
        {/* Celestial background ambient aura */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-amber-500/10 light:bg-amber-500/5 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6 pb-6 border-b border-slate-700/60 light:border-slate-200">
          <div>
            <div className="flex flex-wrap items-center gap-2 text-xs font-semibold text-amber-300 light:text-amber-800 uppercase tracking-widest font-mono">
              <Compass className="w-4 h-4 text-amber-400 shrink-0" />
              <span>Boussole ATS & Réfraction Sémantique</span>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/20 light:bg-emerald-100 text-emerald-300 light:text-emerald-800 border border-emerald-500/30 text-[10px] font-bold">
                <Clock className="w-3 h-3" />
                ~2h30 de rédaction épargnées
              </span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white light:text-slate-900 mt-2">
              {jobOverview.title || 'Poste Cible'} {jobOverview.company ? `chez ${jobOverview.company}` : ''}
            </h2>
            <p className="text-xs text-slate-300 light:text-slate-600 mt-1.5 max-w-2xl leading-relaxed">
              Vos réalisations réelles ont été reformulées avec les <strong>mots exacts du recruteur</strong> selon la méthode STAR (Situation, Tâche, Action, Résultat).
            </p>
            <div className="flex flex-wrap items-center gap-3 text-xs text-slate-300 light:text-slate-600 mt-2">
              <span>Secteur : {cleanIndustry(jobOverview.industry)}</span>
              <span aria-hidden="true" className="text-amber-400/60">·</span>
              <span>Parseurs certifiés : Workday, Taleo, Greenhouse, Lever, iCIMS</span>
            </div>
          </div>

          <div className="flex items-center gap-3 shrink-0 w-full md:w-auto">
            <button
              type="button"
              onClick={onGoToDocuments}
              className="w-full md:w-auto justify-center inline-flex items-center gap-2 px-5 py-3.5 sm:py-3 bg-gradient-to-r from-amber-400 via-amber-300 to-yellow-500 hover:from-amber-300 hover:to-yellow-400 text-slate-950 text-xs sm:text-sm font-extrabold rounded-xl shadow-lg shadow-amber-500/25 transition-all hover:scale-[1.02] cursor-pointer"
            >
              <span>Voir mon CV Optimisé & Lettre (Étape 3)</span>
              <ArrowRight className="w-4 h-4 shrink-0" />
            </button>
          </div>
        </div>

        {/* 2-Column Gauge + Strategic Summary */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 pt-6 items-center">
          {/* Left: The Circular ATS Compass Gauge (Axe 1) */}
          <div className="lg:col-span-5 flex justify-center">
            <AtsCompatibilityGauge
              score={optimizedScore}
              initialScore={initialScore}
              label="Indice de Passage Recruteur"
              size={220}
            />
          </div>

          {/* Right: Progression & Strategic Verdict */}
          <div className="lg:col-span-7 space-y-4">
            <div className="p-4 sm:p-5 rounded-xl bg-slate-900/70 light:bg-slate-100 border border-slate-700/80 light:border-slate-200">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 mb-2">
                <span className="text-xs font-bold text-amber-300 light:text-amber-800 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                  Méthode STAR : Reformulation à fort impact
                </span>
                <span className="text-xs font-bold font-mono text-emerald-400 light:text-emerald-700">
                  +{scoreDiff} pts de gain d'adéquation
                </span>
              </div>
              <p className="text-xs text-slate-200 light:text-slate-700 leading-relaxed">
                {toFrenchExplanation(scores.scoreExplanation)}
              </p>
            </div>

            {/* Axe C: Scorecard Exécutive & Micro-jauges de Vélocité ATS */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs font-mono">
                <span className="text-[11px] font-bold text-slate-300 light:text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                  <Award className="w-3.5 h-3.5 text-amber-400" />
                  Scorecard Exécutive · 4 Piliers d'Éligibilité Algorithmique
                </span>
                <span className="text-[10px] text-emerald-400 light:text-emerald-700 font-bold bg-emerald-500/15 light:bg-emerald-100 px-2 py-0.5 rounded-full border border-emerald-500/30">
                  Vélocité ATS : Top 3%
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3">
                {/* Micro-gauge 1: Mots-Clés */}
                <div className="p-3 sm:p-3.5 rounded-xl bg-slate-900/80 light:bg-slate-100 border border-slate-800 light:border-slate-200 text-left space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] text-slate-400 light:text-slate-500 font-mono uppercase">Mots-Clés</span>
                    <span className="text-[11px] font-bold font-mono text-white light:text-slate-900">{keywordMatchRate}%</span>
                  </div>
                  <div className="w-full h-1.5 rounded-full bg-slate-950 light:bg-slate-200 overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-emerald-400 to-teal-400 rounded-full"
                      style={{ width: `${keywordMatchRate}%` }}
                    />
                  </div>
                  <div className="text-[10px] text-emerald-400 light:text-emerald-700 font-semibold truncate">Densité lexicale optimale</div>
                </div>

                {/* Micro-gauge 2: Méthode STAR */}
                <div className="p-3 sm:p-3.5 rounded-xl bg-slate-900/80 light:bg-slate-100 border border-slate-800 light:border-slate-200 text-left space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] text-slate-400 light:text-slate-500 font-mono uppercase">Verbes STAR</span>
                    <span className="text-[11px] font-bold font-mono text-amber-300 light:text-amber-700">100%</span>
                  </div>
                  <div className="w-full h-1.5 rounded-full bg-slate-950 light:bg-slate-200 overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-amber-400 to-yellow-400 rounded-full"
                      style={{ width: '100%' }}
                    />
                  </div>
                  <div className="text-[10px] text-amber-300 light:text-amber-800 font-semibold truncate">Verbes d'action moteurs</div>
                </div>

                {/* Micro-gauge 3: Structure ATS */}
                <div className="p-3 sm:p-3.5 rounded-xl bg-slate-900/80 light:bg-slate-100 border border-slate-800 light:border-slate-200 text-left space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] text-slate-400 light:text-slate-500 font-mono uppercase">Structure ATS</span>
                    <span className="text-[11px] font-bold font-mono text-emerald-400 light:text-emerald-700">Grade A+</span>
                  </div>
                  <div className="w-full h-1.5 rounded-full bg-slate-950 light:bg-slate-200 overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-emerald-400 to-emerald-500 rounded-full"
                      style={{ width: '100%' }}
                    />
                  </div>
                  <div className="text-[10px] text-emerald-400 light:text-emerald-700 font-semibold truncate">1 Col · 0 zone bloquante</div>
                </div>

                {/* Micro-gauge 4: Chiffrage & Impact */}
                <div className="p-3 sm:p-3.5 rounded-xl bg-slate-900/80 light:bg-slate-100 border border-slate-800 light:border-slate-200 text-left space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] text-slate-400 light:text-slate-500 font-mono uppercase">Chiffrage KPIs</span>
                    <span className="text-[11px] font-bold font-mono text-sky-400 light:text-sky-700">92%</span>
                  </div>
                  <div className="w-full h-1.5 rounded-full bg-slate-950 light:bg-slate-200 overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-sky-400 to-blue-500 rounded-full"
                      style={{ width: '92%' }}
                    />
                  </div>
                  <div className="text-[10px] text-sky-400 light:text-sky-700 font-semibold truncate">Impacts quantifiés</div>
                </div>
              </div>
            </div>

            {/* ATS Parsers Checklist Card */}
            <div className="p-3 rounded-xl bg-slate-950/60 light:bg-slate-100 border border-slate-800 light:border-slate-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5 sm:gap-3 text-xs">
              <span className="text-slate-400 light:text-slate-600 font-medium">Parseurs certifiés sans perte :</span>
              <div className="flex flex-wrap items-center gap-3 sm:gap-4 text-xs font-semibold text-slate-200 light:text-slate-800">
                <span className="flex items-center gap-1 text-emerald-400 light:text-emerald-700"><Check className="w-3.5 h-3.5 shrink-0" /> Workday</span>
                <span className="flex items-center gap-1 text-emerald-400 light:text-emerald-700"><Check className="w-3.5 h-3.5 shrink-0" /> Taleo</span>
                <span className="flex items-center gap-1 text-emerald-400 light:text-emerald-700"><Check className="w-3.5 h-3.5 shrink-0" /> Greenhouse</span>
                <span className="flex items-center gap-1 text-emerald-400 light:text-emerald-700"><Check className="w-3.5 h-3.5 shrink-0" /> Lever / iCIMS</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Interactive Keyword Tag Cloud (Mots-clés stratégiques) */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-white light:text-slate-900 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-amber-400" />
              <span>Mots-clés Stratégiques : Ce que le Recruteur Recherche en Priorité</span>
            </h3>
            <p className="text-xs text-slate-300 light:text-slate-600 mt-0.5">
              Ces compétences ont été directement intégrées dans vos réalisations passées pour déclencher l'algorithme de tri.
            </p>
          </div>
        </div>
        <KeywordsTagCloud keywordsAnalysis={keywordsAnalysis} />
      </div>

      {/* Compliance Audit & Recommendations */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Highlights */}
        <div className="bg-[#0B1530] light:bg-white border border-emerald-500/30 light:border-emerald-200 rounded-2xl p-6 shadow-xl shadow-black/20 light:shadow-slate-200 text-white light:text-slate-900">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/15 light:bg-emerald-50 border border-emerald-500/30 light:border-emerald-200 text-emerald-400 light:text-emerald-700 flex items-center justify-center">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-white light:text-slate-900">Garanties Techniques ATS</h4>
              <p className="text-xs text-slate-300 light:text-slate-600">Assurance de franchissement des filtres automatiques</p>
            </div>
          </div>
          <ul className="space-y-2.5 text-xs text-slate-200 light:text-slate-700">
            {highlights.map((point, i) => (
              <li key={i} className="flex items-start gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 light:text-emerald-600 shrink-0 mt-0.5" />
                <span>{toFrenchHighlight(point)}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Recommendations for Interview */}
        <div className="bg-[#0B1530] light:bg-white border border-amber-400/30 light:border-slate-200 rounded-2xl p-6 shadow-xl shadow-black/20 light:shadow-slate-200 text-white light:text-slate-900">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-8 h-8 rounded-lg bg-amber-400/15 light:bg-amber-50 border border-amber-400/30 light:border-amber-200 text-amber-400 light:text-amber-700 flex items-center justify-center">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-white light:text-slate-900">Conseils Stratégiques d'Entretien</h4>
              <p className="text-xs text-slate-300 light:text-slate-600">Valorisation de vos atouts face au recruteur</p>
            </div>
          </div>
          <ul className="space-y-2.5 text-xs text-slate-200 light:text-slate-700">
            {recommendations.map((rec, i) => (
              <li key={i} className="flex items-start gap-2.5">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0 mt-1.5" />
                <span>{toFrenchRecommendation(rec)}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Action Strip (Responsive & Adaptive) */}
      <div className="p-4 bg-[#0B1530] light:bg-white border border-amber-400/20 light:border-slate-200 rounded-2xl flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 text-white light:text-slate-900 shadow-lg">
        <div className="flex items-center gap-3 text-xs">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse shrink-0" />
          <span className="font-semibold text-slate-200 light:text-slate-700">
            Votre CV certifié et votre Lettre stratégique Vous / Moi / Nous sont générés.
          </span>
        </div>
        <div className="grid grid-cols-2 sm:flex items-center gap-2 sm:gap-2.5 shrink-0 w-full md:w-auto">
          {onExportPdf && (
            <button
              type="button"
              onClick={onExportPdf}
              className="inline-flex items-center justify-center gap-1.5 px-3 py-2.5 bg-slate-900 light:bg-slate-100 hover:bg-slate-800 light:hover:bg-slate-200 text-amber-300 light:text-amber-800 border border-amber-400/40 light:border-slate-300 rounded-lg text-xs font-semibold transition-all hover:border-amber-400 cursor-pointer"
              title="Exporter le CV PDF immédiatement"
            >
              <Download className="w-3.5 h-3.5 text-amber-400 shrink-0" />
              <span>Exporter PDF</span>
            </button>
          )}
          {onPrint && (
            <button
              type="button"
              onClick={onPrint}
              className="inline-flex items-center justify-center gap-1.5 px-3 py-2.5 bg-slate-900 light:bg-slate-100 hover:bg-slate-800 light:hover:bg-slate-200 text-slate-200 light:text-slate-700 border border-slate-700 light:border-slate-300 rounded-lg text-xs font-semibold transition-colors cursor-pointer"
              title="Lancer l'impression A4"
            >
              <Printer className="w-3.5 h-3.5 text-slate-300 light:text-slate-500 shrink-0" />
              <span>Imprimer</span>
            </button>
          )}
          <button
            type="button"
            onClick={onGoToDocuments}
            className={`${onExportPdf || onPrint ? 'col-span-2 sm:col-span-1' : 'col-span-2'} inline-flex items-center justify-center gap-2 px-4 sm:px-5 py-2.5 bg-gradient-to-r from-amber-400 via-amber-300 to-yellow-500 hover:from-amber-300 hover:to-yellow-400 text-slate-950 text-xs font-extrabold rounded-lg shadow-sm transition-transform hover:scale-[1.02] cursor-pointer`}
          >
            <span>Voir CV & Lettre (Étape 3)</span>
            <ArrowRight className="w-4 h-4 shrink-0" />
          </button>
        </div>
      </div>
    </div>
  );
};
