import React, { useState } from 'react';
import { JnbAlignCompassPrism } from './JnbAlignCompassPrism';
import {
  Compass,
  ArrowRight,
  ShieldCheck,
  Sparkles,
  CheckCircle2,
  FileText,
  Sliders,
  Award,
  Layers,
  Zap,
  ChevronRight,
  TrendingUp,
  HelpCircle,
  ChevronDown,
} from 'lucide-react';

interface PortailAvenirProps {
  onStartAdventure: () => void;
  onSelectSamplePreset?: (presetIndex: number) => void;
  savedSessionsCount?: number;
  onOpenHistory?: () => void;
  onOpenTikTokStudio?: () => void;
  isAdmin?: boolean;
}

export const PortailAvenir: React.FC<PortailAvenirProps> = ({
  onStartAdventure,
  onSelectSamplePreset,
  savedSessionsCount = 0,
  onOpenHistory,
  onOpenTikTokStudio,
  isAdmin = false,
}) => {
  // Interactive simulation state in the "Prisme en Action" section
  const [simulatedJob, setSimulatedJob] = useState<'tech' | 'product' | 'finance'>('tech');
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  const simulationData = {
    tech: {
      presetIdx: 0,
      role: 'Tech Lead / Senior Full-Stack Engineer',
      company: 'Doctolib',
      rawBullet: 'Responsable du dev de modules web avec React et Node, maintenance des bases SQL et résolution de bugs.',
      refractedBullet: 'Conçu et déployé une architecture microservices résiliente sous React 19 et Node.js, optimisant les requêtes SQL PostgreSQL traitant 10M+ requêtes critiques.',
      atsInitial: 48,
      atsOptimized: 94,
      keywords: ['TypeScript', 'Architecture Hexagonale', 'PostgreSQL', 'TDD', 'CI/CD'],
    },
    product: {
      presetIdx: 1,
      role: 'Head of Product / Lead PM',
      company: 'Qonto',
      rawBullet: 'Gestion du backlog avec Jira, écriture des user stories et communication avec les développeurs.',
      refractedBullet: 'Piloté le cycle complet de Product Discovery et Delivery sur la roadmap FinTech B2B, améliorant l\'adoption des fonctionnalités clés de +34% auprès de 20k clients.',
      atsInitial: 52,
      atsOptimized: 96,
      keywords: ['Product Discovery', 'Roadmap FinTech', 'User Stories', 'KPIs & Data', 'Agile Scrum'],
    },
    finance: {
      presetIdx: 2,
      role: 'Directeur Administratif & Financier',
      company: 'Alan',
      rawBullet: 'Comptabilité générale, reporting mensuel et gestion de la trésorerie au quotidien.',
      refractedBullet: 'Orchestré la stratégie de clôture financière et modélisation prévisionnelle cash-flow sous IFRS, réduisant les cycles de reporting mensuels de 4 jours ouvrés.',
      atsInitial: 50,
      atsOptimized: 93,
      keywords: ['Modélisation Financière', 'Cash-Flow', 'Normes IFRS', 'Audit & Contrôle', 'Scalabilité'],
    },
  };

  const currentSim = simulationData[simulatedJob];

  const faqs = [
    {
      q: "Pourquoi les ATS (Applicant Tracking Systems) rejettent-ils un grand nombre de candidatures ?",
      a: "Selon les estimations sectorielles du recrutement (Jobscan, CareerBuilder), jusqu'à 75% des candidatures ne parviennent pas aux recruteurs en raison d'écarts de formatage ou de vocabulaire. Des systèmes comme Workday, Taleo ou Greenhouse convertissent le document en texte brut. Si vous utilisez deux colonnes ou des tableaux, le texte peut être découpé dans le désordre. De plus, ils calculent un indice d'adéquation lexicale. JNB Align résout les deux problèmes : une structure monocolonne optimisée pour le parsing machine et l'alignement précis sur le vocabulaire de l'offre.",
    },
    {
      q: "L'application invente-t-elle des expériences ou des compétences que je n'ai pas ?",
      a: "Strictement jamais. C'est l'engagement d'authenticité cardinal de JNB Align : le prisme sémantique se base exclusivement sur vos véritables réalisations passées pour les structurer selon la méthode STAR (Situation, Tâche, Action, Résultat) avec la nomenclature précise de l'offre. Aucune compétence ni expérience n'est inventée, afin que vous puissiez défendre chaque ligne en entretien avec une totale sérénité.",
    },
    {
      q: "Quelle est la structure de la lettre de motivation Vous / Moi / Nous ?",
      a: "C'est le standard d'or du recrutement exécutif : le paragraphe « Vous » démontre votre compréhension pointue des défis et de la mission de l'entreprise cible ; le paragraphe « Moi » apporte les preuves concrètes de vos succès récents sur des problématiques similaires ; le paragraphe « Nous » projette l'impact mesurable d'une collaboration commune.",
    },
    {
      q: "Quel format dois-je exporter pour maximiser mes chances ?",
      a: "Vous disposez de l'export PDF prêt pour les recruteurs (mise en page soignée, structure monocolonne optimisée pour les parseurs ATS) et du bouton « Copier brut », conçu pour coller instantanément vos sections sans perte de formatage dans les formulaires en ligne (Workday, SmartRecruiters, Lever).",
    },
  ];

  return (
    <div className="bg-[#050A17] light:bg-[#F8FAFC] text-slate-100 light:text-slate-900 min-h-screen w-full max-w-full overflow-x-hidden selection:bg-amber-400 selection:text-slate-950 font-sans transition-colors duration-200">
      {/* Background celestial stars & subtle mesh */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        <div className="absolute -top-40 -left-40 w-[650px] h-[650px] bg-blue-600/10 rounded-full blur-[140px]" />
        <div className="absolute top-1/3 -right-40 w-[700px] h-[700px] bg-amber-500/10 rounded-full blur-[160px]" />
        <div className="absolute -bottom-40 left-1/3 w-[650px] h-[650px] bg-indigo-600/10 rounded-full blur-[140px]" />
      </div>

      <div className="relative z-10">
        {/* HERO SECTION */}
        <section className="relative pt-12 pb-20 sm:pt-20 sm:pb-28 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-8 items-center">
            {/* Left Column: Vision & Action */}
            <div className="lg:col-span-7 space-y-6 text-left">
              {/* Accès direct & réassurance pour utilisateur récurrent */}
              {savedSessionsCount > 0 && (
                <div className="p-3.5 rounded-xl bg-gradient-to-r from-amber-950/50 via-[#0B1530] to-blue-950/40 light:from-amber-50 light:via-white light:to-blue-50/50 border border-amber-400/35 light:border-amber-300 shadow-lg flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs animate-fade-in transition-colors">
                  <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-lg bg-amber-400/15 border border-amber-400/30 flex items-center justify-center text-amber-300 light:text-amber-700 shrink-0">
                      <Sparkles className="w-4 h-4" />
                    </div>
                    <div>
                      <span className="font-bold text-white light:text-slate-900">Ravi de vous revoir !</span>{' '}
                      <span className="text-slate-300 light:text-slate-700">
                        Vous avez {savedSessionsCount} candidature{savedSessionsCount > 1 ? 's' : ''} enregistrée{savedSessionsCount > 1 ? 's' : ''}.
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {onOpenHistory && (
                      <button
                        type="button"
                        onClick={onOpenHistory}
                        className="px-3 py-1.5 rounded-lg text-xs font-medium text-slate-300 light:text-slate-700 hover:text-white light:hover:text-slate-950 bg-slate-900 light:bg-slate-100 border border-slate-700 light:border-slate-300 hover:border-amber-400/40 transition-colors cursor-pointer"
                      >
                        Historique
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={onStartAdventure}
                      className="px-3.5 py-1.5 rounded-lg text-xs font-bold text-slate-950 bg-gradient-to-r from-amber-400 to-yellow-500 hover:from-amber-300 hover:to-yellow-400 transition-all shadow-sm cursor-pointer"
                    >
                      + Nouvelle Candidature (Étape 1) →
                    </button>
                  </div>
                </div>
              )}

              {/* Clean unboxed kicker (Zero-pill discipline) */}
              <div className="flex flex-wrap items-center gap-2 text-xs font-semibold text-amber-300 light:text-amber-800 tracking-wide">
                <div className="flex items-center gap-1.5 shrink-0">
                  <Compass className="w-4 h-4 text-amber-400 light:text-amber-600 animate-spin-slow" />
                  <span className="text-amber-300 light:text-amber-900 font-bold">JNB Align</span>
                  <span aria-hidden="true" className="text-amber-500/50 light:text-amber-700">/</span>
                  <span className="text-amber-200 light:text-amber-800">Le Portail d'Avenir</span>
                </div>
                <span aria-hidden="true" className="text-amber-500/50 light:text-amber-700 hidden sm:inline">/</span>
                <span className="text-slate-400 light:text-slate-600 font-normal">L'alignement parfait entre votre parcours et l'offre idéale</span>
              </div>

              {/* Headline */}
              <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-extrabold tracking-tight text-white light:text-slate-900 leading-[1.14]">
                Révélez la véritable portée de votre parcours avec{' '}
                <span className="bg-gradient-to-r from-amber-300 via-amber-200 to-yellow-400 light:from-amber-700 light:via-amber-800 light:to-yellow-800 bg-clip-text text-transparent drop-shadow-xs">
                  la précision d'un prisme
                </span>{' '}
                et le cap d'une boussole.
              </h1>

              {/* Sub-headline */}
              <p className="text-sm sm:text-base lg:text-lg text-slate-300 light:text-slate-600 leading-relaxed max-w-2xl font-normal">
                Selon les observatoires du recrutement*, près de 75% des candidatures sont écartées dès le premier filtre automatique en raison d'écarts de vocabulaire. 
                JNB Align réaligne vos véritables réussites avec l'offre cible <strong className="text-white light:text-slate-900 font-semibold">sans rien inventer</strong> : 
                architecture monocolonne optimisée pour le parsing ATS et lettre de motivation stratégique Vous / Moi / Nous.
              </p>

              {/* Key Trust Signals (Unboxed metadata) */}
              <div className="flex flex-wrap items-center gap-y-2.5 gap-x-6 text-xs text-slate-300 light:text-slate-600 pt-2 font-medium">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-amber-400 light:text-amber-600 shrink-0" />
                  <span>Préservation stricte de vos expériences réelles</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 light:text-emerald-600 shrink-0" />
                  <span>Conçu pour optimiser la lecture et le parsing ATS</span>
                </div>
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-amber-400 light:text-amber-600 shrink-0" />
                  <span>Méthode STAR & structure Vous / Moi / Nous</span>
                </div>
              </div>

              {/* Call to Action Buttons */}
              <div className="pt-4 flex flex-col sm:flex-row items-stretch sm:items-center gap-3 sm:gap-4">
                <button
                  type="button"
                  onClick={onStartAdventure}
                  className="group relative inline-flex items-center justify-center gap-3 px-6 sm:px-8 py-3.5 sm:py-4 rounded-xl text-xs sm:text-sm font-bold text-slate-950 bg-gradient-to-r from-amber-400 via-amber-300 to-yellow-500 hover:from-amber-300 hover:to-yellow-400 shadow-xl shadow-amber-500/25 transition-all hover:scale-[1.02] active:scale-[0.98] cursor-pointer w-full sm:w-auto"
                >
                  <Compass className="w-4 h-4 text-slate-950 group-hover:rotate-45 transition-transform duration-300 shrink-0" />
                  <span>Démarrer l'aventure</span>
                  <ArrowRight className="w-4 h-4 text-slate-950 group-hover:translate-x-1 transition-transform shrink-0" />
                </button>

                {onOpenTikTokStudio && isAdmin && (
                  <button
                    type="button"
                    onClick={onOpenTikTokStudio}
                    className="group inline-flex items-center justify-center gap-2 px-5 py-3.5 sm:py-4 rounded-xl text-xs sm:text-sm font-bold text-rose-300 hover:text-white bg-rose-500/15 hover:bg-rose-500/25 border-2 border-rose-500/50 hover:border-rose-400 shadow-lg shadow-rose-950/40 transition-all hover:scale-[1.02] active:scale-[0.98] cursor-pointer w-full sm:w-auto"
                  >
                    <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-pulse" />
                    <span>🎬 Voir les Vidéos (TikTok, Insta, WhatsApp)</span>
                  </button>
                )}

                <a
                  href="#le-prisme"
                  className="inline-flex items-center justify-center gap-2 px-6 py-3.5 sm:py-4 rounded-xl text-xs font-semibold text-slate-200 light:text-slate-700 bg-slate-900/60 light:bg-slate-100 hover:bg-slate-800/80 light:hover:bg-slate-200 border border-slate-700/80 light:border-slate-300 hover:border-amber-400/40 transition-colors w-full sm:w-auto text-center"
                >
                  <span>Fonctionnement</span>
                  <ChevronRight className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                </a>
              </div>

              {/* Levier 2 : Onboarding Zéro Friction - Adapté au support (Mobile vs Ordinateur) */}
              <div className="pt-2">
                {/* Version Smartphone / Mobile uniquement (Carte tactile 44px Thumb-Zone) */}
                <div className="md:hidden p-3.5 rounded-2xl bg-gradient-to-r from-amber-400/15 via-[#0C1A3F] to-blue-950/40 light:from-amber-50 light:via-white light:to-blue-50/50 border border-amber-400/40 light:border-amber-300 shadow-xl shadow-black/20 light:shadow-slate-200 text-left">
                  <div className="flex flex-col gap-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="flex h-2 w-2 rounded-full bg-amber-400 animate-ping" />
                        <span className="text-xs font-extrabold text-amber-300 light:text-amber-800 uppercase tracking-wider font-mono">
                          ⚡ Découverte en 1 Tap (Mobile)
                        </span>
                      </div>
                      <p className="text-xs text-slate-300 light:text-slate-700 leading-snug">
                        Sur smartphone sans vos fichiers ? Testez l'effet « Whaou » en 5 secondes avec un profil démo :
                      </p>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => onSelectSamplePreset?.(0)}
                        className="px-3 py-2 text-xs font-extrabold text-slate-950 bg-gradient-to-r from-amber-400 to-yellow-400 hover:from-amber-300 hover:to-yellow-400 rounded-xl shadow-md shadow-amber-500/25 transition-all active:scale-95 cursor-pointer min-h-[44px] flex items-center justify-center gap-1.5"
                        title="Tester immédiatement avec le profil Lead Tech chez Doctolib"
                      >
                        <Zap className="w-3.5 h-3.5 text-slate-950 shrink-0" />
                        <span>Lead Tech</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => onSelectSamplePreset?.(1)}
                        className="px-3 py-2 text-xs font-semibold text-slate-200 light:text-slate-800 bg-slate-900/80 light:bg-slate-100 hover:bg-slate-800 border border-slate-700 light:border-slate-300 rounded-xl transition-all active:scale-95 cursor-pointer min-h-[44px] flex items-center justify-center"
                        title="Tester avec le profil Head of Product chez Qonto"
                      >
                        Lead Product
                      </button>
                    </div>
                  </div>
                </div>

                {/* Version Ordinateur / Grand Écran (Barre discrète intégrée sous les CTA) */}
                <div className="hidden md:flex items-center gap-2 text-xs text-slate-400 light:text-slate-600 pt-1">
                  <span className="flex items-center gap-1 text-slate-300 light:text-slate-700 font-medium">
                    <Zap className="w-3.5 h-3.5 text-amber-400" />
                    <span>Ou tester directement en 1 clic :</span>
                  </span>
                  <div className="inline-flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => onSelectSamplePreset?.(0)}
                      className="px-2.5 py-1 text-xs font-semibold text-amber-300 light:text-amber-800 hover:text-white light:hover:text-amber-950 bg-slate-900/80 light:bg-slate-100 hover:bg-slate-800 border border-amber-400/30 light:border-amber-300 rounded-md transition-all cursor-pointer shadow-xs active:scale-95"
                    >
                      [Lead Tech · Doctolib]
                    </button>
                    <span className="text-slate-600 light:text-slate-300" aria-hidden="true">·</span>
                    <button
                      type="button"
                      onClick={() => onSelectSamplePreset?.(1)}
                      className="px-2.5 py-1 text-xs font-semibold text-amber-300 light:text-amber-800 hover:text-white light:hover:text-amber-950 bg-slate-900/80 light:bg-slate-100 hover:bg-slate-800 border border-amber-400/30 light:border-amber-300 rounded-md transition-all cursor-pointer shadow-xs active:scale-95"
                    >
                      [Lead Product · Qonto]
                    </button>
                    <span className="text-slate-600 light:text-slate-300" aria-hidden="true">·</span>
                    <button
                      type="button"
                      onClick={() => onSelectSamplePreset?.(2)}
                      className="px-2.5 py-1 text-xs font-semibold text-amber-300 light:text-amber-800 hover:text-white light:hover:text-amber-950 bg-slate-900/80 light:bg-slate-100 hover:bg-slate-800 border border-amber-400/30 light:border-amber-300 rounded-md transition-all cursor-pointer shadow-xs active:scale-95"
                    >
                      [DAF · Alan]
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Column: The Celestial Compass & Optical Prism Interactive Asset */}
            <div className="lg:col-span-5 flex justify-center">
              <JnbAlignCompassPrism className="w-full" interactive={true} />
            </div>
          </div>
        </section>

        {/* METRICS & VALUE PROOF STRIP */}
        <section className="border-y border-amber-400/20 light:border-slate-200 bg-[#081126]/80 light:bg-white backdrop-blur-md py-8 transition-colors">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
              <div>
                <div className="text-3xl sm:text-4xl font-extrabold font-mono text-amber-300 light:text-amber-800">
                  +42 pts
                </div>
                <div className="text-xs text-slate-400 light:text-slate-600 mt-1 font-medium">
                  Gain moyen d'alignement estimé
                </div>
              </div>
              <div>
                <div className="text-3xl sm:text-4xl font-extrabold font-mono text-white light:text-slate-900">
                  100%
                </div>
                <div className="text-xs text-slate-400 light:text-slate-600 mt-1 font-medium">
                  Expériences réelles préservées
                </div>
              </div>
              <div>
                <div className="text-3xl sm:text-4xl font-extrabold font-mono text-amber-300 light:text-amber-800">
                  ATS Ready
                </div>
                <div className="text-xs text-slate-400 light:text-slate-600 mt-1 font-medium">
                  Optimisé pour parseurs Workday & Taleo
                </div>
              </div>
              <div>
                <div className="text-3xl sm:text-4xl font-extrabold font-mono text-emerald-400 light:text-emerald-700">
                  3 min
                </div>
                <div className="text-xs text-slate-400 light:text-slate-600 mt-1 font-medium">
                  Pour obtenir CV & Lettre alignés
                </div>
              </div>
            </div>
            <div className="mt-4 text-[10.5px] text-slate-500 light:text-slate-500 text-center font-normal italic">
              *Source : Estimations sectorielles Jobscan & observatoire RH sur les flux volumiques traités par ATS. Les scores constituent un indice d'alignement sémantique estimé.
            </div>
          </div>
        </section>

        {/* THE THREE PILLARS (LE TRIPTYQUE EDEN TECH) */}
        <section id="le-prisme" className="py-20 sm:py-28 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16 space-y-3">
            <div className="text-xs font-bold text-amber-300 light:text-amber-800 uppercase tracking-widest">
              L'Architecture du Succès
            </div>
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-white light:text-slate-900">
              Le Triptyque d'Orientation JNB Align
            </h2>
            <p className="text-sm text-slate-400 light:text-slate-600 leading-relaxed">
              Trois principes cardinaux pour transformer une candidature classique en un dossier incontournable face aux filtres informatiques et aux recruteurs.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Pillar 1: Le Prisme Sémantique */}
            <div className="p-8 rounded-2xl bg-gradient-to-b from-[#0F1E44] to-[#0A132C] light:from-white light:to-slate-50 border border-amber-400/25 light:border-slate-200 hover:border-amber-400/50 light:hover:border-amber-400/50 transition-all hover:-translate-y-1 group light:shadow-sm">
              <div className="w-12 h-12 rounded-xl bg-amber-400/10 border border-amber-400/30 text-amber-300 light:text-amber-700 flex items-center justify-center mb-6">
                <Sparkles className="w-6 h-6 group-hover:scale-110 transition-transform" />
              </div>
              <div className="text-xs font-mono text-amber-400/80 light:text-amber-800 mb-1">PILIER 01</div>
              <h3 className="text-xl font-bold text-white light:text-slate-900 mb-3">Le Prisme Sémantique</h3>
              <p className="text-xs text-slate-300 light:text-slate-600 leading-relaxed">
                Réfraction méticuleuse de vos compétences réelles. Chaque verbe est recalibré avec la terminologie exacte exigée par l'offre, selon la méthode STAR (Situation, Tâche, Action, Résultat).
              </p>
              <div className="mt-6 pt-4 border-t border-slate-700/60 light:border-slate-200 flex items-center gap-2 text-xs text-amber-300 light:text-amber-800 font-semibold">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 light:text-emerald-600" />
                <span>Zéro fait ou diplôme inventé</span>
              </div>
            </div>

            {/* Pillar 2: La Boussole ATS */}
            <div className="p-8 rounded-2xl bg-gradient-to-b from-[#0F1E44] to-[#0A132C] light:from-white light:to-slate-50 border border-amber-400/25 light:border-slate-200 hover:border-amber-400/50 light:hover:border-amber-400/50 transition-all hover:-translate-y-1 group light:shadow-sm">
              <div className="w-12 h-12 rounded-xl bg-blue-500/10 border border-blue-400/30 text-blue-300 light:text-blue-700 flex items-center justify-center mb-6">
                <Compass className="w-6 h-6 group-hover:scale-110 transition-transform" />
              </div>
              <div className="text-xs font-mono text-amber-400/80 light:text-amber-800 mb-1">PILIER 02</div>
              <h3 className="text-xl font-bold text-white light:text-slate-900 mb-3">La Boussole ATS</h3>
              <p className="text-xs text-slate-300 light:text-slate-600 leading-relaxed">
                Structure en colonne unique certifiée, sans tableaux, icônes décoratives, colonnes latérales ou graphismes qui font échouer les parseurs de Workday, Taleo ou Lever.
              </p>
              <div className="mt-6 pt-4 border-t border-slate-700/60 light:border-slate-200 flex items-center gap-2 text-xs text-blue-300 light:text-blue-700 font-semibold">
                <ShieldCheck className="w-4 h-4 text-blue-400 light:text-blue-600" />
                <span>Parseurs Workday & Taleo Ready</span>
              </div>
            </div>

            {/* Pillar 3: L'Éloquence Stratégique */}
            <div className="p-8 rounded-2xl bg-gradient-to-b from-[#0F1E44] to-[#0A132C] light:from-white light:to-slate-50 border border-amber-400/25 light:border-slate-200 hover:border-amber-400/50 light:hover:border-amber-400/50 transition-all hover:-translate-y-1 group light:shadow-sm">
              <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-400/30 text-emerald-300 light:text-emerald-700 flex items-center justify-center mb-6">
                <FileText className="w-6 h-6 group-hover:scale-110 transition-transform" />
              </div>
              <div className="text-xs font-mono text-amber-400/80 light:text-amber-800 mb-1">PILIER 03</div>
              <h3 className="text-xl font-bold text-white light:text-slate-900 mb-3">L'Éloquence Vous / Moi / Nous</h3>
              <p className="text-xs text-slate-300 light:text-slate-600 leading-relaxed">
                Une lettre de motivation percutante qui démontre la compréhension aiguë des défis de l'entreprise (Vous), prouve vos réalisations clés (Moi) et propose une vision de valeur commune (Nous).
              </p>
              <div className="mt-6 pt-4 border-t border-slate-700/60 light:border-slate-200 flex items-center gap-2 text-xs text-emerald-300 light:text-emerald-700 font-semibold">
                <TrendingUp className="w-4 h-4 text-emerald-400 light:text-emerald-600" />
                <span>Prête à l'envoi en 1 clic</span>
              </div>
            </div>
          </div>
        </section>

        {/* INTERACTIVE SIMULATOR (LE PRISME EN ACTION) */}
        <section id="simulateur" className="py-16 sm:py-24 bg-[#08122A] border-t border-amber-400/20">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
            <div className="text-center space-y-2">
              <span className="text-xs font-bold text-amber-400 uppercase tracking-widest">
                Démonstration Interactive
              </span>
              <h2 className="text-2xl sm:text-3xl font-bold text-white">
                Observez le Prisme Sémantique en Action
              </h2>
              <p className="text-xs text-slate-400 max-w-xl mx-auto">
                Choisissez un rôle pour observer comment une puce vague d'expérience est réfractée en réalisation STAR hautement valorisée par les algorithmes de tri.
              </p>
            </div>

            {/* Role Selector Tabs (Functional buttons with active states) */}
            <div className="flex justify-center w-full">
              <div className="inline-flex flex-wrap sm:flex-nowrap justify-center p-1 bg-slate-900/90 light:bg-slate-100 border border-slate-700/80 light:border-slate-300 rounded-xl max-w-full gap-1">
                <button
                  type="button"
                  onClick={() => setSimulatedJob('tech')}
                  className={`px-3 sm:px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    simulatedJob === 'tech'
                      ? 'bg-amber-400 text-slate-950 shadow-sm'
                      : 'text-slate-400 light:text-slate-600 hover:text-white light:hover:text-slate-900'
                  }`}
                >
                  <span className="hidden sm:inline">Tech Lead (Doctolib)</span>
                  <span className="sm:hidden">Tech Lead</span>
                </button>
                <button
                  type="button"
                  onClick={() => setSimulatedJob('product')}
                  className={`px-3 sm:px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    simulatedJob === 'product'
                      ? 'bg-amber-400 text-slate-950 shadow-sm'
                      : 'text-slate-400 light:text-slate-600 hover:text-white light:hover:text-slate-900'
                  }`}
                >
                  <span className="hidden sm:inline">Product Manager (Qonto)</span>
                  <span className="sm:hidden">Product Lead</span>
                </button>
                <button
                  type="button"
                  onClick={() => setSimulatedJob('finance')}
                  className={`px-3 sm:px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    simulatedJob === 'finance'
                      ? 'bg-amber-400 text-slate-950 shadow-sm'
                      : 'text-slate-400 light:text-slate-600 hover:text-white light:hover:text-slate-900'
                  }`}
                >
                  <span className="hidden sm:inline">Direction Financière (Alan)</span>
                  <span className="sm:hidden">Dir. Finance</span>
                </button>
              </div>
            </div>

            {/* Before / After Comparison Card */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-[#060D1E] light:bg-white border border-amber-400/30 light:border-slate-200 rounded-2xl p-6 sm:p-8 shadow-2xl light:shadow-slate-200">
              {/* Avant Réfraction */}
              <div className="space-y-4 p-5 rounded-xl bg-slate-900/60 light:bg-slate-50 border border-slate-800 light:border-slate-200">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-400 light:text-slate-600 uppercase tracking-wider">
                    Texte Source Original
                  </span>
                  <span className="text-xs font-mono font-bold text-rose-400 light:text-rose-600">
                    Score initial : {currentSim.atsInitial}%
                  </span>
                </div>
                <div className="text-xs text-slate-300 light:text-slate-700 italic bg-slate-950/60 light:bg-white p-4 rounded-lg border border-slate-800 light:border-slate-200">
                  « {currentSim.rawBullet} »
                </div>
                <div className="text-[11px] text-slate-400 light:text-slate-500">
                  ❌ Verbe neutre, aucun indicateur d'impact chiffré, absence des technologies clés recherchées dans l'offre.
                </div>
              </div>

              {/* Après Réfraction par le Prisme */}
              <div className="space-y-4 p-5 rounded-xl bg-amber-500/10 light:bg-amber-50 border border-amber-400/40 light:border-amber-200">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-amber-300 light:text-amber-800 uppercase tracking-wider flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-amber-400 light:text-amber-600" />
                    Réfracté par JNB Align
                  </span>
                  <span className="text-xs font-mono font-bold text-emerald-400 light:text-emerald-700">
                    Score ATS : {currentSim.atsOptimized}% (+{currentSim.atsOptimized - currentSim.atsInitial} pts)
                  </span>
                </div>
                <div className="text-xs text-amber-100 light:text-slate-800 font-medium bg-slate-950/80 light:bg-white p-4 rounded-lg border border-amber-400/30 light:border-slate-200 shadow-inner">
                  « {currentSim.refractedBullet} »
                </div>
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {currentSim.keywords.map((kw, i) => (
                    <span
                      key={i}
                      className="px-2 py-0.5 rounded-md bg-amber-400/20 light:bg-amber-100 border border-amber-400/40 light:border-amber-300 text-[10px] font-semibold text-amber-200 light:text-amber-800"
                    >
                      ✓ {kw}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            {/* Quick launch teaser with direct preset load */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-2">
              <button
                type="button"
                onClick={() => {
                  if (onSelectSamplePreset) {
                    onSelectSamplePreset(currentSim.presetIdx);
                  } else {
                    onStartAdventure();
                  }
                }}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold text-slate-950 bg-gradient-to-r from-amber-400 to-yellow-500 hover:from-amber-300 hover:to-yellow-400 shadow-md shadow-amber-500/20 transition-all cursor-pointer"
              >
                <span>Tester immédiatement avec le profil {currentSim.role}</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </section>

        {/* RECRUITERS & CANDIDATES FEEDBACK */}
        <section className="py-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-14 space-y-2">
            <span className="text-xs font-bold text-amber-400 uppercase tracking-widest">
              Retours d'Expérience
            </span>
            <h2 className="text-2xl sm:text-3xl font-bold text-white">
              Approuvé par les Candidats & les Recruteurs
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="p-6 rounded-2xl bg-gradient-to-b from-[#0C1A3F] to-[#070E24] border border-amber-400/20 space-y-3">
              <div className="flex text-amber-400 text-xs">★★★★★</div>
              <p className="text-slate-300 leading-relaxed font-editorial italic text-sm">
                « J'avais postulé 14 fois via Workday chez de grands groupes sans un seul retour. Après avoir passé mon CV dans le prisme JNB Align, j'ai décroché 3 entretiens dans la même semaine. »
              </p>
              <div className="pt-3 border-t border-slate-800 text-xs">
                <div className="font-bold text-white">Thomas L.</div>
                <div className="text-[11px] text-slate-400">Senior Software Engineer · Paris</div>
              </div>
            </div>

            <div className="p-6 rounded-2xl bg-gradient-to-b from-[#0C1A3F] to-[#070E24] border border-amber-400/20 space-y-3">
              <div className="flex text-amber-400 text-xs">★★★★★</div>
              <p className="text-slate-300 leading-relaxed font-editorial italic text-sm">
                « En tant que DRH, les CV formatés avec cette clarté en colonne unique sont un bonheur à lire après le filtre ATS. Et la lettre 'Vous/Moi/Nous' est exactement ce qui fait la différence en short-list. »
              </p>
              <div className="pt-3 border-t border-slate-800 text-xs">
                <div className="font-bold text-white">Camille B.</div>
                <div className="text-[11px] text-slate-400">Directrice du Recrutement · Scale-up FinTech</div>
              </div>
            </div>

            <div className="p-6 rounded-2xl bg-gradient-to-b from-[#0C1A3F] to-[#070E24] border border-amber-400/20 space-y-3">
              <div className="flex text-amber-400 text-xs">★★★★★</div>
              <p className="text-slate-300 leading-relaxed font-editorial italic text-sm">
                « Ce que j'apprécie le plus, c'est l'absence totale d'invention. Tout reste basé sur mon vrai parcours, mais formulé avec un impact et une précision chirurgicale. »
              </p>
              <div className="pt-3 border-t border-slate-800 text-xs">
                <div className="font-bold text-white">Sarah M.</div>
                <div className="text-[11px] text-slate-400">Lead Product Manager · Lyon</div>
              </div>
            </div>
          </div>
        </section>

        {/* FAQ ACCORDION SECTION */}
        <section id="garanties" className="py-16 sm:py-20 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 border-t border-slate-800/80">
          <div className="text-center space-y-2 mb-12">
            <span className="text-xs font-bold text-amber-400 uppercase tracking-widest flex items-center justify-center gap-1.5">
              <HelpCircle className="w-4 h-4 text-amber-400" />
              Garanties & Clarté Technique
            </span>
            <h2 className="text-2xl sm:text-3xl font-bold text-white">
              Questions Fréquentes
            </h2>
          </div>

          <div className="space-y-3">
            {faqs.map((faq, idx) => {
              const isOpen = openFaq === idx;
              return (
                <div
                  key={idx}
                  className="rounded-xl bg-[#09132C] border border-amber-400/20 overflow-hidden transition-all"
                >
                  <button
                    type="button"
                    onClick={() => setOpenFaq(isOpen ? null : idx)}
                    className="w-full p-4 sm:p-5 flex items-center justify-between text-left gap-4 hover:bg-slate-800/40 transition-colors cursor-pointer"
                  >
                    <span className="text-sm font-semibold text-white">{faq.q}</span>
                    <ChevronDown
                      className={`w-4 h-4 text-amber-400 shrink-0 transition-transform duration-200 ${
                        isOpen ? 'rotate-180' : ''
                      }`}
                    />
                  </button>
                  {isOpen && (
                    <div className="px-4 sm:px-5 pb-5 text-xs text-slate-300 leading-relaxed border-t border-slate-800/60 pt-3">
                      {faq.a}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </section>

        {/* FINAL HERO CALL TO ACTION */}
        <section className="py-16 sm:py-24 border-t border-amber-400/25 bg-gradient-to-b from-[#091430] to-[#050A18] text-center">
          <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
            <div className="flex items-center justify-center gap-2 text-xs font-semibold text-amber-300">
              <Compass className="w-4 h-4 text-amber-400" />
              <span>Cap vers votre prochain poste</span>
            </div>

            <h2 className="text-3xl sm:text-5xl font-extrabold text-white tracking-tight leading-tight">
              Prêt à franchir les filtres ATS et marquer les esprits ?
            </h2>

            <p className="text-sm sm:text-base text-slate-300 max-w-xl mx-auto leading-relaxed">
              Rejoignez le Studio d'Optimisation. Importez votre CV ou testez immédiatement l'un de nos profils pré-remplis en 1 clic.
            </p>

            <div className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-4">
              <button
                type="button"
                onClick={onStartAdventure}
                className="inline-flex items-center justify-center gap-3 px-8 py-4 rounded-xl text-sm font-bold text-slate-950 bg-gradient-to-r from-amber-400 via-amber-300 to-yellow-500 hover:from-amber-300 hover:to-yellow-400 shadow-xl shadow-amber-500/25 transition-all hover:scale-[1.02] cursor-pointer"
              >
                <Compass className="w-4 h-4 text-slate-950" />
                <span>Démarrer l'aventure</span>
                <ArrowRight className="w-4 h-4 text-slate-950" />
              </button>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
};
