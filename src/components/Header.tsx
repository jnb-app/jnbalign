import React, { useState } from 'react';
import {
  Compass,
  RotateCcw,
  Printer,
  Copy,
  Check,
  ArrowRight,
  LayoutDashboard,
  Home,
  Sparkles,
  FileText,
  BarChart3,
  HelpCircle,
  X,
  Clock,
  Download,
  Sun,
  Moon,
  Film,
} from 'lucide-react';

interface HeaderProps {
  activeView: 'portail' | 'studio';
  setActiveView: (view: 'portail' | 'studio') => void;
  currentStep: number;
  setCurrentStep: (step: number) => void;
  hasResult: boolean;
  hasInputs?: boolean;
  onReset: () => void;
  onNewCandidature?: () => void;
  onPrint: () => void;
  onExportPdf?: () => void;
  onCopyRawText: () => void;
  copiedRaw: boolean;
  savedSessionsCount?: number;
  onOpenHistory?: () => void;
  onOpenStats?: () => void;
  onOpenTikTokStudio?: () => void;
  isAdmin?: boolean;
  theme?: 'dark' | 'light';
  onToggleTheme?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  activeView,
  setActiveView,
  currentStep,
  setCurrentStep,
  hasResult,
  hasInputs = false,
  onReset,
  onNewCandidature,
  onPrint,
  onExportPdf,
  onCopyRawText,
  copiedRaw,
  savedSessionsCount = 0,
  onOpenHistory,
  onOpenStats,
  onOpenTikTokStudio,
  isAdmin = false,
  theme = 'dark',
  onToggleTheme,
}) => {
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [downloadedPdf, setDownloadedPdf] = useState(false);

  const studioSteps = [
    { num: 1, label: 'Importation & Cible', short: 'Import' },
    { num: 2, label: 'Boussole & Analyse', short: 'Analyse' },
    { num: 3, label: 'Documents & Export', short: 'Documents' },
  ];

  const handleConfirmReset = () => {
    setShowResetConfirm(false);
    onReset();
  };

  return (
    <>
      <header
        className={`sticky top-0 z-40 backdrop-blur-xl border-b transition-colors duration-200 no-print ${
          theme === 'light'
            ? 'bg-white/95 border-slate-200 text-slate-900 shadow-lg shadow-slate-200/50'
            : 'bg-[#060B18]/90 border-amber-400/20 text-white shadow-lg shadow-black/40'
        }`}
      >
        <div className="w-full max-w-[1600px] mx-auto px-2 sm:px-4 lg:px-6">
          <div className="flex items-center justify-between h-16 gap-2 lg:gap-4 w-full min-w-0">
            {/* Zone 1: Brand Wordmark with JNB Align & Golden Compass Emblem */}
            <button
              type="button"
              onClick={() => setActiveView('portail')}
              className="flex items-center gap-2 sm:gap-2.5 text-left group cursor-pointer shrink-0"
              title="Retour à l'accueil JNB Align"
            >
              <div className="relative w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-gradient-to-br from-amber-400 via-amber-300 to-yellow-500 text-slate-950 flex items-center justify-center font-bold shadow-md shadow-amber-500/25 group-hover:scale-105 group-hover:shadow-amber-500/40 transition-all duration-200 shrink-0">
                <Compass className="w-4 h-4 sm:w-5 sm:h-5 text-slate-950 group-hover:rotate-45 transition-transform duration-300" />
                <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-amber-200 animate-ping" />
              </div>
              <div className="flex items-center gap-1 sm:gap-1.5">
                <span className="font-extrabold text-white light:text-slate-950 text-sm sm:text-base tracking-tight font-sans whitespace-nowrap">
                  JNB Align
                </span>
                <span className="text-slate-600 light:text-slate-400 text-xs hidden xs:inline" aria-hidden="true">·</span>
                <span className="text-[10px] sm:text-[11px] font-bold text-amber-300 light:text-amber-700 tracking-wider uppercase font-mono hidden xs:inline whitespace-nowrap">
                  Studio ATS
                </span>
              </div>
            </button>

            {/* Zone 2: Navigation (Portail vs Studio Steps) */}
            <nav aria-label="Navigation principale" className="hidden md:flex items-center shrink-0">
              {activeView === 'portail' ? (
                <div className="flex items-center gap-4 lg:gap-6 text-xs font-semibold text-slate-300 light:text-slate-600">
                  <a href="#le-prisme" className="hover:text-amber-300 light:hover:text-amber-600 transition-colors whitespace-nowrap">
                    Le Prisme
                  </a>
                  <a href="#boussole-analyse" className="hover:text-amber-300 light:hover:text-amber-600 transition-colors whitespace-nowrap">
                    Boussole ATS
                  </a>
                  <a href="#simulateur" className="hover:text-amber-300 light:hover:text-amber-600 transition-colors whitespace-nowrap">
                    Simulateur
                  </a>
                  <a href="#garanties" className="hover:text-amber-300 light:hover:text-amber-600 transition-colors whitespace-nowrap">
                    Authenticité & FAQ
                  </a>
                  <button
                    type="button"
                    onClick={() => setActiveView('studio')}
                    className="flex items-center gap-1.5 text-amber-300 light:text-amber-700 hover:text-amber-200 light:hover:text-amber-900 bg-amber-400/10 light:bg-amber-50 hover:bg-amber-400/20 border border-amber-400/30 light:border-amber-200 px-2.5 py-1.5 rounded-lg transition-all cursor-pointer font-medium whitespace-nowrap"
                  >
                    <LayoutDashboard className="w-3.5 h-3.5 text-amber-400 light:text-amber-600" />
                    <span>Ouvrir Studio</span>
                  </button>
                </div>
              ) : (
                /* Studio 3 Steps Controller */
                <div className="flex items-center gap-1 p-1 bg-slate-900/90 light:bg-slate-100 border border-slate-700/80 light:border-slate-200 rounded-xl shadow-inner">
                  {studioSteps.map((step) => {
                    const isActive = currentStep === step.num;
                    const isPassed = hasResult && currentStep > step.num;
                    const isClickable = hasResult || step.num === 1;

                    return (
                      <button
                        key={step.num}
                        type="button"
                        disabled={!isClickable}
                        onClick={() => isClickable && setCurrentStep(step.num)}
                        title={`Étape ${step.num} : ${step.label}`}
                        className={`flex items-center gap-1.5 px-2.5 lg:px-3 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap ${
                          isActive
                            ? 'bg-gradient-to-r from-amber-400 to-yellow-500 text-slate-950 font-bold shadow-sm shadow-amber-500/20'
                            : isPassed
                            ? 'text-amber-300 light:text-amber-700 hover:bg-slate-800/80 light:hover:bg-slate-200 hover:text-white cursor-pointer'
                            : isClickable
                            ? 'text-slate-300 light:text-slate-600 hover:bg-slate-800/80 light:hover:bg-slate-200 hover:text-white cursor-pointer'
                            : 'text-slate-500 light:text-slate-400 cursor-not-allowed opacity-50'
                        }`}
                      >
                        <span
                          className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] font-mono font-bold shrink-0 ${
                            isActive
                              ? 'bg-slate-950 text-amber-300'
                              : isPassed
                              ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                              : 'bg-slate-800 light:bg-slate-300 text-slate-400 light:text-slate-700'
                          }`}
                        >
                          {isPassed ? '✓' : step.num}
                        </span>
                        <span className="hidden xl:inline">{step.label}</span>
                        <span className="xl:hidden">{step.short}</span>
                      </button>
                    );
                  })}
                </div>
              )}
            </nav>

            {/* Mobile Studio Step Pill */}
            {activeView === 'studio' && (
              <div className="flex md:hidden items-center gap-1 px-2 py-1 bg-slate-900/90 light:bg-slate-100 border border-slate-700/80 light:border-slate-200 rounded-lg text-xs font-semibold text-amber-300 light:text-amber-800 shrink-0">
                <span className="w-4 h-4 rounded-full bg-amber-400 text-slate-950 flex items-center justify-center text-[10px] font-mono font-bold">
                  {currentStep}
                </span>
                <span className="text-slate-300 light:text-slate-700 text-[10px] font-medium hidden xs:inline">
                  {studioSteps[currentStep - 1]?.short}
                </span>
              </div>
            )}

            {/* Zone 3: Primary Action & Controls (Guaranteed to fit on ALL screens) */}
            <div className="flex items-center gap-1 sm:gap-1.5 lg:gap-2 shrink-0">
              {/* Theme Toggle (Axe 5) */}
              {onToggleTheme && (
                <button
                  type="button"
                  onClick={onToggleTheme}
                  className={`p-1.5 sm:px-2.5 sm:py-1.5 min-h-[36px] min-w-[36px] rounded-xl transition-all cursor-pointer shrink-0 border flex items-center justify-center gap-1.5 shadow-sm active:scale-95 ${
                    theme === 'light'
                      ? 'bg-amber-100/70 hover:bg-amber-200/80 text-amber-900 border-amber-300/80 shadow-amber-200/40'
                      : 'bg-slate-900/80 hover:bg-slate-800 text-amber-300 border-amber-400/30'
                  }`}
                  title={theme === 'dark' ? 'Passer en mode clair ☀️' : 'Passer en mode sombre 🌙'}
                  aria-label="Basculer le thème"
                >
                  {theme === 'dark' ? (
                    <>
                      <Sun className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-amber-400" />
                      <span className="hidden xl:inline text-[11px] font-semibold text-amber-300">Clair</span>
                    </>
                  ) : (
                    <>
                      <Moon className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-slate-800" />
                      <span className="hidden xl:inline text-[11px] font-semibold text-slate-800">Sombre</span>
                    </>
                  )}
                </button>
              )}

              {/* History Button */}
              {onOpenHistory && (
                <button
                  type="button"
                  onClick={onOpenHistory}
                  className="inline-flex items-center justify-center gap-1 px-2 sm:px-2.5 py-1.5 min-h-[36px] text-xs font-medium text-slate-300 light:text-slate-600 hover:text-white light:hover:text-slate-900 bg-slate-900/70 light:bg-slate-100 hover:bg-slate-800 light:hover:bg-slate-200 border border-slate-700/80 light:border-slate-300 rounded-lg transition-all cursor-pointer shrink-0"
                  title="Consulter l'historique de vos candidatures sauvegardées"
                >
                  <Clock className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                  <span className="hidden 2xl:inline">Historique</span>
                  {savedSessionsCount > 0 && (
                    <span className="text-[10px] font-mono font-bold bg-amber-400 text-slate-950 px-1.5 py-0.2 rounded-full">
                      {savedSessionsCount}
                    </span>
                  )}
                </button>
              )}

              {/* Stats / Fréquentation Button (Visible uniquement quand l'admin est déverrouillé) */}
              {onOpenStats && isAdmin && (
                <button
                  type="button"
                  onClick={onOpenStats}
                  className="inline-flex items-center justify-center gap-1.5 px-2.5 py-1.5 min-h-[36px] text-xs font-semibold text-emerald-300 light:text-emerald-800 bg-emerald-950/60 light:bg-emerald-50 hover:bg-emerald-900/60 light:hover:bg-emerald-100 border border-emerald-500/40 light:border-emerald-300 rounded-lg transition-all cursor-pointer shrink-0 shadow-xs"
                  title="Tableau de bord administrateur (Métriques et fréquentation)"
                >
                  <BarChart3 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  <span className="hidden xl:inline">Admin Stats</span>
                </button>
              )}

              {/* Studio Vidéos Réseaux & TikTok Button (Visible uniquement pour l'administrateur) */}
              {onOpenTikTokStudio && isAdmin && (
                <button
                  type="button"
                  onClick={onOpenTikTokStudio}
                  className="inline-flex items-center justify-center gap-1.5 px-2.5 sm:px-3 py-1.5 min-h-[36px] text-xs font-bold text-rose-300 light:text-rose-800 hover:text-white light:hover:text-rose-950 bg-rose-500/20 light:bg-rose-100 hover:bg-rose-500/30 light:hover:bg-rose-200 border border-rose-500/50 light:border-rose-300 rounded-xl transition-all cursor-pointer shrink-0 shadow-sm"
                  title="Studio Vidéos Officielles : 4 Vidéos (TikTok, Insta, WhatsApp) & Exports MP4"
                >
                  <Film className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                  <span className="inline">Vidéos Com</span>
                  <span className="text-[10px] font-mono font-bold bg-rose-500 text-white px-1.5 py-0.2 rounded-full">
                    4
                  </span>
                </button>
              )}

              {activeView === 'portail' ? (
                <div className="flex items-center gap-1.5 sm:gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      if (onNewCandidature) {
                        onNewCandidature();
                      } else {
                        setActiveView('studio');
                        setCurrentStep(1);
                      }
                    }}
                    className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-amber-300 light:text-amber-800 hover:text-white bg-slate-900/80 light:bg-slate-100 hover:bg-slate-800 border border-amber-400/40 light:border-amber-300 rounded-lg shadow-sm transition-all cursor-pointer whitespace-nowrap"
                    title="Démarrer directement une nouvelle candidature dans le Studio d'Importation"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                    <span>+ Nouvelle Candidature</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setActiveView('studio');
                      setCurrentStep(1);
                    }}
                    className="group inline-flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-1.5 sm:py-2 rounded-xl text-xs font-bold text-slate-950 bg-gradient-to-r from-amber-400 via-amber-300 to-yellow-500 hover:from-amber-300 hover:to-yellow-400 shadow-md shadow-amber-500/25 transition-all hover:scale-[1.02] cursor-pointer whitespace-nowrap"
                  >
                    <Compass className="w-3.5 h-3.5 group-hover:rotate-45 transition-transform duration-300 shrink-0" />
                    <span>Accéder au Studio</span>
                    <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform shrink-0" />
                  </button>
                </div>
              ) : (
                <>
                  {/* Bouton Nouvelle Candidature */}
                  <button
                    type="button"
                    onClick={onNewCandidature || onReset}
                    className="inline-flex items-center gap-1 px-2 sm:px-2.5 py-1.5 text-xs font-semibold text-amber-300 light:text-amber-800 hover:text-white bg-slate-900/80 light:bg-slate-100 hover:bg-slate-800 border border-amber-400/40 light:border-amber-300 rounded-lg shadow-sm transition-all cursor-pointer shrink-0 whitespace-nowrap"
                    title="Démarrer une nouvelle candidature à partir d'une page vierge"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                    <span className="hidden sm:inline">+ Nouveau</span>
                  </button>

                  {/* Switch back to portal */}
                  <button
                    type="button"
                    onClick={() => setActiveView('portail')}
                    className="flex items-center gap-1 px-2 sm:px-2.5 py-1.5 text-xs font-medium text-slate-300 light:text-slate-600 hover:text-white light:hover:text-slate-900 bg-slate-900/60 light:bg-slate-100 hover:bg-slate-800 border border-slate-700/80 light:border-slate-300 rounded-lg transition-colors cursor-pointer shrink-0 whitespace-nowrap"
                    title="Revenir au Portail d'Avenir"
                  >
                    <Home className="w-3.5 h-3.5 shrink-0" />
                    <span className="hidden 2xl:inline">Portail</span>
                  </button>

                  {/* Boutons d'export et d'impression */}
                  {hasResult && (
                    <>
                      {/* Exporter PDF */}
                      {onExportPdf && (
                        <button
                          type="button"
                          onClick={() => {
                            onExportPdf();
                            setDownloadedPdf(true);
                            setTimeout(() => setDownloadedPdf(false), 2500);
                          }}
                          title="Télécharger les documents en fichier PDF haute définition"
                          className="inline-flex items-center gap-1.5 px-2.5 sm:px-3.5 py-1.5 text-xs font-bold text-slate-950 bg-gradient-to-r from-amber-400 to-yellow-500 hover:from-amber-300 hover:to-yellow-400 rounded-lg shadow-sm shadow-amber-500/25 transition-all cursor-pointer shrink-0 whitespace-nowrap"
                        >
                          {downloadedPdf ? (
                            <>
                              <Check className="w-3.5 h-3.5 text-slate-950 shrink-0" />
                              <span className="hidden sm:inline">Téléchargé !</span>
                              <span className="sm:hidden text-[11px]">OK</span>
                            </>
                          ) : (
                            <>
                              <Download className="w-3.5 h-3.5 shrink-0" />
                              <span className="hidden sm:inline">Exporter PDF</span>
                              <span className="sm:hidden text-[11px]">PDF</span>
                            </>
                          )}
                        </button>
                      )}

                      {/* Imprimer (Visible sur tablette et desktop, accessible dans la vue studio sur mobile) */}
                      <button
                        type="button"
                        onClick={onPrint}
                        title="Lancer l'impression A4 des documents générés"
                        className="hidden sm:inline-flex items-center gap-1 px-2 sm:px-2.5 py-1.5 min-h-[36px] text-xs font-semibold text-slate-200 light:text-slate-700 hover:text-white bg-slate-900/80 light:bg-slate-100 hover:bg-slate-800 border border-slate-700/80 light:border-slate-300 rounded-lg transition-colors cursor-pointer shrink-0 whitespace-nowrap"
                      >
                        <Printer className="w-3.5 h-3.5 text-slate-300 light:text-slate-600 shrink-0" />
                        <span>Imprimer</span>
                      </button>
                    </>
                  )}

                  {/* Bouton de réinitialisation */}
                  {(hasResult || hasInputs) && (
                    <button
                      type="button"
                      onClick={() => setShowResetConfirm(true)}
                      title="Réinitialiser les données et recommencer sur une page vierge"
                      className="inline-flex items-center justify-center gap-1 p-2 sm:px-2.5 sm:py-1.5 min-h-[36px] text-xs font-semibold text-slate-300 light:text-slate-600 hover:text-amber-300 bg-slate-900/60 light:bg-slate-100 hover:bg-slate-800/80 border border-slate-700/80 light:border-slate-300 rounded-lg transition-colors cursor-pointer shrink-0 whitespace-nowrap"
                    >
                      <RotateCcw className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                      <span className="hidden md:inline">Réinitialiser</span>
                    </button>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Confirmation Modal */}
      {showResetConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in no-print">
          <div className="bg-[#0B1530] light:bg-white border border-amber-400/30 light:border-slate-300 rounded-2xl max-w-md w-full p-6 shadow-2xl text-white light:text-slate-900 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-700/60 light:border-slate-200">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-amber-400/15 text-amber-300 flex items-center justify-center">
                  <RotateCcw className="w-4 h-4" />
                </div>
                <h3 className="text-sm font-bold text-white light:text-slate-900">Réinitialiser l'analyse ?</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowResetConfirm(false)}
                className="text-slate-400 hover:text-white light:text-slate-500 light:hover:text-slate-900 p-1 rounded-md"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-300 light:text-slate-600 leading-relaxed">
              Cette action réinitialisera les données en cours pour vous permettre de configurer un nouveau profil ou charger un autre exemple.
            </p>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setShowResetConfirm(false)}
                className="px-3.5 py-1.5 text-xs font-medium text-slate-300 light:text-slate-600 hover:text-white bg-slate-800 light:bg-slate-100 hover:bg-slate-700 rounded-lg transition-colors"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={handleConfirmReset}
                className="px-4 py-1.5 text-xs font-bold text-slate-950 bg-gradient-to-r from-amber-400 to-yellow-500 hover:from-amber-300 hover:to-yellow-400 rounded-lg shadow-sm transition-all"
              >
                Confirmer la réinitialisation
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
