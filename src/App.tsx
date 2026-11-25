import React, { useState, useEffect, Suspense } from 'react';
import { Header } from './components/Header';
import { PortailAvenir } from './components/PortailAvenir';
import { ImportStep } from './components/ImportStep';
import { SemanticGapView } from './components/SemanticGapView';
import { DocumentsStudioView } from './components/DocumentsStudioView';
import { BulletRefinerModal } from './components/BulletRefinerModal';
import { RefractionLoadingModal } from './components/RefractionLoadingModal';
import { HistoryModal } from './components/HistoryModal';
import { ErrorBoundary } from './components/ErrorBoundary';
import { PipelineResult, SamplePreset, OptimizedCv, CoverLetter } from './types/ats';
import { SAMPLE_PRESETS } from './data/presets';
import {
  getSavedSessions,
  saveCandidatureSession,
  SavedCandidatureSession,
} from './services/historyStorage';
import {
  saveActiveDraft,
  loadActiveDraft,
  clearActiveDraft,
} from './services/draftStorage';
import { downloadCvPdf, downloadCoverLetterPdf, downloadBothPdfs } from './utils/pdfGenerator';
import { printDocument } from './utils/printHelper';
import { AlertCircle, Compass, Sparkles, Lock } from 'lucide-react';
import { ToastNotification, ToastMessage } from './components/ToastNotification';
import { AnalyticsModal } from './components/AnalyticsModal';
import { LegalTermsModal } from './components/LegalTermsModal';
import { FeedbackModal } from './components/FeedbackModal';
import { trackAppEvent } from './services/analyticsClient';
import { loadAndInitGa4FromConfig } from './services/ga4';
import { validateCvDocument, validateJobOfferDocument } from './utils/documentValidator';
import { detectLanguageFromText } from './utils/languageDetector';
import { isAiStudioMarketingEnvironment } from './utils/marketingStudioGate';

const LazyMarketingStudioHub = React.lazy(() =>
  import('./components/MarketingStudioHub').then((m) => ({ default: m.MarketingStudioHub }))
);

export default function App() {
  // Top-Level View Router: 'portail' (Vue 1) | 'studio' (Vue 2)
  // Routage intelligent : si un brouillon actif ou des sessions existent, ouvrir directement le Studio
  const [activeView, setActiveView] = useState<'portail' | 'studio'>(() => {
    try {
      const draft = loadActiveDraft();
      if (draft && (draft.cvText || draft.jobText || draft.result)) {
        return draft.activeView || 'studio';
      }
      const saved = getSavedSessions();
      if (saved && saved.length > 0) return 'studio';
      const hasVisited = localStorage.getItem('jnb_align_visited') || localStorage.getItem('eden_tech_visited');
      if (hasVisited) return 'studio';
    } catch {
      // Ignore if localStorage unavailable
    }
    return 'portail';
  });

  // Studio Workflow Steps: 1 (Importation), 2 (Boussole & Analyse), 3 (Documents & Export)
  const [currentStep, setCurrentStep] = useState<number>(() => {
    const draft = loadActiveDraft();
    return draft?.currentStep || 1;
  });

  // Input states & Tab modes (Initialisés depuis le brouillon pour survivre aux actualisations F5)
  const [cvText, setCvText] = useState<string>(() => {
    const draft = loadActiveDraft();
    return draft?.cvText || '';
  });
  const [cvFileName, setCvFileName] = useState<string | null>(() => {
    const draft = loadActiveDraft();
    return draft?.cvFileName || null;
  });
  const [cvBase64, setCvBase64] = useState<string | null>(null);
  const [cvTab, setCvTab] = useState<'upload' | 'text'>(() => {
    const draft = loadActiveDraft();
    return draft?.cvTab || (draft?.cvText ? 'text' : 'upload');
  });

  const [jobText, setJobText] = useState<string>(() => {
    const draft = loadActiveDraft();
    return draft?.jobText || '';
  });
  const [jobFileName, setJobFileName] = useState<string | null>(() => {
    const draft = loadActiveDraft();
    return draft?.jobFileName || null;
  });
  const [jobBase64, setJobBase64] = useState<string | null>(null);
  const [jobTab, setJobTab] = useState<'upload' | 'text' | 'url'>(() => {
    const draft = loadActiveDraft();
    return draft?.jobTab || (draft?.jobText ? 'text' : 'upload');
  });

  const [targetRoleTitle, setTargetRoleTitle] = useState<string>(() => {
    const draft = loadActiveDraft();
    return draft?.targetRoleTitle || '';
  });
  const [candidateNotes, setCandidateNotes] = useState<string>(() => {
    const draft = loadActiveDraft();
    return draft?.candidateNotes || '';
  });
  const [targetLanguage, setTargetLanguage] = useState<'auto' | 'fr' | 'en'>(() => {
    const draft = loadActiveDraft();
    return draft?.targetLanguage || 'auto';
  });

  // Execution states
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [loadingPhase, setLoadingPhase] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<PipelineResult | null>(() => {
    const draft = loadActiveDraft();
    return draft?.result || null;
  });
  const [copiedRaw, setCopiedRaw] = useState<boolean>(false);

  // Theme state (Axe 5 : Dark / Light mode)
  const [theme, setTheme] = useState<'dark' | 'light'>(() => {
    try {
      return (localStorage.getItem('jnb_theme') as 'dark' | 'light') || 'dark';
    } catch {
      return 'dark';
    }
  });

  // Micro-feedback Toasts (Axe 3)
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const addToast = (title: string, message?: string, type: 'success' | 'info' | 'copy' = 'success') => {
    const id = Date.now().toString() + Math.random().toString(36).substring(2, 5);
    setToasts((prev) => [...prev, { id, title, message, type }]);
  };

  const dismissToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  const handleToggleTheme = () => {
    const nextTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(nextTheme);
    try {
      localStorage.setItem('jnb_theme', nextTheme);
    } catch {
      // Ignore
    }
    if (nextTheme === 'light') {
      document.documentElement.classList.add('light');
      document.documentElement.classList.remove('dark');
      document.body.classList.add('light');
      document.body.classList.remove('dark');
      document.documentElement.setAttribute('data-theme', 'light');
    } else {
      document.documentElement.classList.remove('light');
      document.documentElement.classList.add('dark');
      document.body.classList.remove('light');
      document.body.classList.add('dark');
      document.documentElement.setAttribute('data-theme', 'dark');
    }
    addToast(
      nextTheme === 'light' ? 'Mode Clair activé ☀️' : 'Mode Sombre activé 🌙',
      'Affichage adapté au confort de vos yeux.',
      'info'
    );
  };

  useEffect(() => {
    if (theme === 'light') {
      document.documentElement.classList.add('light');
      document.documentElement.classList.remove('dark');
      document.body.classList.add('light');
      document.body.classList.remove('dark');
      document.documentElement.setAttribute('data-theme', 'light');
    } else {
      document.documentElement.classList.remove('light');
      document.documentElement.classList.add('dark');
      document.body.classList.remove('light');
      document.body.classList.add('dark');
      document.documentElement.setAttribute('data-theme', 'dark');
    }
  }, [theme]);

  // History state (Axe 4)
  const [savedSessions, setSavedSessions] = useState<SavedCandidatureSession[]>([]);
  const [isHistoryOpen, setIsHistoryOpen] = useState<boolean>(false);
  const [isStatsOpen, setIsStatsOpen] = useState<boolean>(false);
  const [isAdmin, setIsAdmin] = useState<boolean>(() => {
    try {
      return (
        localStorage.getItem('jnb_admin_authorized') === 'true' ||
        (typeof window !== 'undefined' && window.location.search.includes('admin=true'))
      );
    } catch {
      return false;
    }
  });

  const [isLegalOpen, setIsLegalOpen] = useState<boolean>(false);
  const [legalTab, setLegalTab] = useState<'cgu' | 'privacy' | 'mentions'>('cgu');
  const [isLogoStudioOpen, setIsLogoStudioOpen] = useState<boolean>(false);
  const [isMarketingDossierOpen, setIsMarketingDossierOpen] = useState<boolean>(false);
  const [isTikTokModalOpen, setIsTikTokModalOpen] = useState<boolean>(false);
  const [isScreencastJ5Open, setIsScreencastJ5Open] = useState<boolean>(false);
  const [isCarouselJ4Open, setIsCarouselJ4Open] = useState<boolean>(false);
  const [isVideoJ3Open, setIsVideoJ3Open] = useState<boolean>(false);
  const [isLaunchJ0Open, setIsLaunchJ0Open] = useState<boolean>(false);
  const [isPostLaunchJ1Open, setIsPostLaunchJ1Open] = useState<boolean>(false);
  const [isVideoJ2Open, setIsVideoJ2Open] = useState<boolean>(false);
  const [isKitJ3Open, setIsKitJ3Open] = useState<boolean>(false);
  const [isFeedbackOpen, setIsFeedbackOpen] = useState<boolean>(false);

  // Studios marketing réservés exclusivement à AI Studio / dev local (jamais chargés sur jnbalign.com)
  const marketingStudioEnabled = isAiStudioMarketingEnvironment();
  const hasAnyMarketingModalOpen =
    isLogoStudioOpen ||
    isMarketingDossierOpen ||
    isTikTokModalOpen ||
    isScreencastJ5Open ||
    isCarouselJ4Open ||
    isVideoJ3Open ||
    isLaunchJ0Open ||
    isPostLaunchJ1Open ||
    isVideoJ2Open ||
    isKitJ3Open;

  useEffect(() => {
    try {
      localStorage.setItem('jnb_align_visited', 'true');
    } catch {
      // Ignore
    }
    setSavedSessions(getSavedSessions());

    // Chargement optionnel Google Analytics 4 (si configuré dans l'Admin ou .env)
    void loadAndInitGa4FromConfig().finally(() => {
      // Enregistrement anonyme d'une visite pour le compteur persistant + GA4
      void trackAppEvent('visit', { language: targetLanguage });
    });

    // Vérifier si un brouillon a été restauré
    const draft = loadActiveDraft();
    if (draft && (draft.cvText || draft.jobText || draft.result)) {
      addToast(
        'Brouillon restauré automatiquement 💾',
        'Vos saisies et votre progression ont été préservées.',
        'info'
      );
    }

    // Écoute discrète de l'accès Admin par URL (#admin ou ?admin=true)
    const checkAdminQuery = () => {
      if (typeof window !== 'undefined') {
        if (
          window.location.hash === '#admin' ||
          window.location.search.includes('admin=true') ||
          window.location.search.includes('admin=1')
        ) {
          setIsStatsOpen(true);
        }
      }
    };
    checkAdminQuery();
    window.addEventListener('hashchange', checkAdminQuery);

    // Raccourci clavier secret universel Admin : Ctrl+Shift+A ou Cmd+Shift+A
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === 'a' || e.key === 'A')) {
        e.preventDefault();
        setIsStatsOpen((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('hashchange', checkAdminQuery);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  // Sauvegarde automatique continue du brouillon (Anti-perte au rechargement F5)
  useEffect(() => {
    const hasAnyDraftContent = Boolean(
      (cvText && cvText.trim().length > 0) ||
      (jobText && jobText.trim().length > 0) ||
      result ||
      (targetRoleTitle && targetRoleTitle.trim().length > 0)
    );
    if (!hasAnyDraftContent) {
      clearActiveDraft();
      return;
    }
    saveActiveDraft({
      cvText,
      cvFileName,
      cvTab,
      jobText,
      jobFileName,
      jobTab,
      targetRoleTitle,
      candidateNotes,
      targetLanguage,
      currentStep,
      result,
      activeView,
    });
  }, [
    cvText,
    cvFileName,
    cvTab,
    jobText,
    jobFileName,
    jobTab,
    targetRoleTitle,
    candidateNotes,
    targetLanguage,
    currentStep,
    result,
    activeView,
  ]);

  // Bullet Refiner Modal
  const [bulletRefinerData, setBulletRefinerData] = useState<{
    isOpen: boolean;
    bullet: string;
    roleContext: string;
    expIndex: number;
    bulletIndex: number;
  }>({
    isOpen: false,
    bullet: '',
    roleContext: '',
    expIndex: 0,
    bulletIndex: 0,
  });

  // Load a preset (switches both encarts to "Texte" and displays loaded data)
  const handleLoadPreset = (preset: SamplePreset) => {
    setCvText(preset.cvText);
    setCvFileName(null);
    setCvBase64(null);
    setCvTab('text');

    setJobText(preset.jobText);
    setJobFileName(null);
    setJobBase64(null);
    setJobTab('text');

    setTargetRoleTitle(preset.roleTarget);
    setCandidateNotes(`Ciblage prioritaire pour le poste chez ${preset.companyTarget}`);
    setResult(null);
    setError(null);
  };

  // Restore a saved session from localStorage (Axe 4)
  const handleRestoreSession = (session: SavedCandidatureSession) => {
    setCvText(session.cvText);
    setCvFileName(null);
    setCvBase64(null);
    setCvTab('text');

    setJobText(session.jobText);
    setJobFileName(null);
    setJobBase64(null);
    setJobTab('text');

    setTargetRoleTitle(session.targetRoleTitle || session.roleTitle);
    setCandidateNotes(session.candidateNotes || '');
    setResult(session.result);
    setActiveView('studio');
    setCurrentStep(3); // Restore directly to documents
    setIsHistoryOpen(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Launch pipeline
  const handleLaunchPipeline = async () => {
    // Garde-fous sémantiques client-side (Zéro hallucination)
    if (cvText && cvText.trim().length > 30) {
      const cvVal = validateCvDocument(cvText);
      if (!cvVal.isValid) {
        setError(cvVal.error || "Le document importé comme CV n'est pas conforme.");
        window.scrollTo({ top: 0, behavior: 'smooth' });
        return;
      }
    }

    if (jobText && jobText.trim().length > 30) {
      const jobVal = validateJobOfferDocument(jobText);
      if (!jobVal.isValid) {
        setError(jobVal.error || "Le document importé comme offre d'emploi n'est pas conforme.");
        window.scrollTo({ top: 0, behavior: 'smooth' });
        return;
      }
    }

    setIsLoading(true);
    setResult(null);
    setError(null);
    setLoadingPhase("Extraction et calibrage sémantique des documents...");

    try {
      const phaseTimer1 = setTimeout(() => {
        setLoadingPhase("Réfraction sémantique et analyse d'écart lexicale...");
      }, 1500);

      const phaseTimer2 = setTimeout(() => {
        setLoadingPhase("Reformulation STAR avec verbes d'action (préservation stricte de vos faits réels)...");
      }, 3500);

      const phaseTimer3 = setTimeout(() => {
        setLoadingPhase("Alignement aux parseurs ATS et synthèse de la lettre Vous/Moi/Nous...");
      }, 5500);

      // Vérifier si targetRoleTitle ou candidateNotes proviennent d'un préset sans rapport avec l'offre actuelle
      let effectiveRoleTitle = targetRoleTitle?.trim() || undefined;
      let effectiveCandidateNotes = candidateNotes?.trim() || undefined;

      const jobLower = (jobText || '').toLowerCase();
      if (effectiveRoleTitle) {
        const isPresetRole = SAMPLE_PRESETS.some((p) => p.roleTarget.toLowerCase() === effectiveRoleTitle?.toLowerCase());
        if (isPresetRole && !jobLower.includes(effectiveRoleTitle.toLowerCase().slice(0, 8))) {
          effectiveRoleTitle = undefined;
        }
      }
      if (effectiveCandidateNotes) {
        const isPresetNote = SAMPLE_PRESETS.some((p) => p.companyTarget && effectiveCandidateNotes?.includes(p.companyTarget) && !jobLower.includes(p.companyTarget.toLowerCase()));
        if (isPresetNote) {
          effectiveCandidateNotes = undefined;
        }
      }

      let res: Response | null = null;
      let lastFetchError: any = null;

      const effectiveLanguageToUse =
        targetLanguage === 'auto'
          ? detectLanguageFromText(jobText, cvText)
          : targetLanguage;

      // Fonction d'appel avec tentative de reconnexion automatique si le serveur redémarrait
      for (let attempt = 1; attempt <= 2; attempt++) {
        try {
          res = await fetch('/api/pipeline-tailor', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              cvText,
              cvBase64,
              jobText,
              jobBase64,
              targetRoleTitle: effectiveRoleTitle,
              candidateNotes: effectiveCandidateNotes,
              language: effectiveLanguageToUse,
            }),
          });

          const contentType = res.headers.get('content-type') || '';
          if (contentType.includes('application/json')) {
            break; // Réponse JSON valide reçue
          } else if (attempt === 1) {
            // Le serveur était probablement en cours de redémarrage (page HTML Vite)
            console.warn('[Pipeline] Réponse non-JSON reçue, nouvelle tentative de connexion...');
            await new Promise((r) => setTimeout(r, 1200));
          }
        } catch (fetchErr) {
          lastFetchError = fetchErr;
          if (attempt === 1) {
            await new Promise((r) => setTimeout(r, 1200));
          }
        }
      }

      clearTimeout(phaseTimer1);
      clearTimeout(phaseTimer2);
      clearTimeout(phaseTimer3);

      if (!res) {
        throw new Error(
          lastFetchError?.message || "Impossible de joindre le serveur. Vérifiez votre connexion."
        );
      }

      const contentType = res.headers.get('content-type') || '';
      if (!contentType.includes('application/json')) {
        const textSample = await res.text().catch(() => '');
        console.error('Réponse inattendue du serveur:', textSample.slice(0, 200));
        throw new Error(
          "Le serveur s'est reconnecté ou redémarrait. Veuillez cliquer à nouveau sur « Lancer l'alignement »."
        );
      }

      const responseData = await res.json().catch(() => null);

      if (!res.ok || !responseData) {
        throw new Error(responseData?.error || `Erreur serveur (${res.status})`);
      }

      if (!responseData.success || !responseData.data) {
        throw new Error("Réponse inattendue du pipeline ATS.");
      }

      // Normalisation stricte de la date de la lettre de motivation à la date du jour
      if (responseData.data.coverLetter?.header) {
        const isEn = responseData.data.languageMode === 'en';
        const todayDate = isEn
          ? new Date().toLocaleDateString('en-US', {
              month: 'long',
              day: 'numeric',
              year: 'numeric',
            })
          : new Date().toLocaleDateString('fr-FR', {
              day: 'numeric',
              month: 'long',
              year: 'numeric',
            });
        if (
          !responseData.data.coverLetter.header.date ||
          responseData.data.coverLetter.header.date === '22 mai 2024' ||
          responseData.data.coverLetter.header.date.includes('22 mai 2024') ||
          responseData.data.coverLetter.header.date === 'May 22, 2024'
        ) {
          responseData.data.coverLetter.header.date = todayDate;
        }
      }

      setResult(responseData.data);

      // Persistance Firestore + GA4 de l'analyse (skipServer car /api/pipeline-tailor l'a déjà enregistré côté serveur)
      void trackAppEvent('pipeline_launch', {
        language: responseData.data.languageMode || effectiveLanguageToUse,
        skipServer: true,
      });

      // Auto-save session in localStorage (Axe 4)
      try {
        saveCandidatureSession({
          roleTitle: targetRoleTitle || responseData.data.semanticGap.jobOverview.title || 'Poste Cible',
          companyName: responseData.data.semanticGap.jobOverview.company || '',
          candidateName: responseData.data.optimizedCv.personalInfo.fullName || 'Candidat',
          atsScore: responseData.data.semanticGap.scores.optimizedAtsScore,
          initialAtsScore: responseData.data.semanticGap.scores.initialAtsScore,
          cvText,
          jobText,
          targetRoleTitle,
          candidateNotes,
          result: responseData.data,
        });
        setSavedSessions(getSavedSessions());
      } catch (saveErr) {
        console.warn('Could not auto-save candidature session:', saveErr);
      }

      setCurrentStep(2); // Move to Step 2 (Boussole & Analyse Sémantique)
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err: any) {
      console.error("Erreur pipeline :", err);
      setError(err.message || "Une erreur est survenue lors du traitement.");
    } finally {
      setIsLoading(false);
      setLoadingPhase('');
    }
  };

  // Export direct PDF
  const handleExportPdf = (targetDoc?: 'cv' | 'coverLetter') => {
    if (!result) return;
    if (targetDoc === 'coverLetter') {
      downloadCoverLetterPdf(result.coverLetter);
    } else {
      downloadCvPdf(result.optimizedCv);
    }
    void trackAppEvent('download', {
      language: result.languageMode || 'fr',
      detail: targetDoc === 'coverLetter' ? 'letter_pdf' : 'cv_pdf',
    });
  };

  // Print triggered (resilient print dialog without sandbox issues)
  const handlePrint = (targetDoc?: 'cv' | 'coverLetter') => {
    if (!result) {
      window.print();
      return;
    }
    printDocument(targetDoc || 'cv', result.optimizedCv, result.coverLetter);
  };

  // Copy raw text for forms
  const handleCopyRawText = () => {
    if (!result) return;
    const cv = result.optimizedCv;
    let out = `${cv.personalInfo.fullName.toUpperCase()}\n`;
    out += `${cv.personalInfo.professionalTitle}\n`;
    out += `${cv.personalInfo.email} | ${cv.personalInfo.phone} | ${cv.personalInfo.location}\n\n`;
    out += `PROFIL PROFESSIONNEL\n${cv.professionalSummary}\n\n`;
    out += `EXPÉRIENCES PROFESSIONNELLES\n`;
    cv.experiences.forEach((exp) => {
      const s = (exp.startDate || '').trim();
      const e = (exp.endDate || '').trim();
      const dateRange = s && e && s !== e ? `${s} - ${e}` : s && exp.current ? `${s} - Présent` : s || e || '';
      out += `${exp.role} - ${exp.company} (${exp.location})${dateRange ? ` [${dateRange}]` : ''}\n`;
      exp.bullets.forEach((b) => (out += `• ${b}\n`));
      out += `\n`;
    });
    navigator.clipboard.writeText(out);
    setCopiedRaw(true);
    void trackAppEvent('copy_text', {
      language: result.languageMode || 'fr',
      detail: 'cv_raw',
    });
    addToast(
      'Texte brut copié !',
      'Votre CV est dans votre presse-papier, prêt à coller dans Workday, Indeed ou votre espace candidat.',
      'copy'
    );
    setTimeout(() => setCopiedRaw(false), 2500);
  };

  // Reset complet du Studio : efface les textes, supprime les fichiers et remet les onglets par défaut
  const handleReset = () => {
    clearActiveDraft();
    // 1. Remettre à zéro l'encart CV et replacer l'onglet par défaut "Fichier PDF"
    setCvText('');
    setCvFileName(null);
    setCvBase64(null);
    setCvTab('upload');

    // 2. Remettre à zéro l'encart Offre et replacer l'onglet par défaut "Fichier"
    setJobText('');
    setJobFileName(null);
    setJobBase64(null);
    setJobTab('upload');

    // 3. Remettre à zéro les métadonnées et résultats
    setTargetRoleTitle('');
    setCandidateNotes('');
    setResult(null);
    setError(null);
    setCurrentStep(1);
    window.scrollTo({ top: 0, behavior: 'smooth' });
    addToast('Brouillon effacé', 'Le Studio a été réinitialisé pour démarrer une nouvelle candidature.', 'info');
  };

  // Update CV in state
  const handleChangeCv = (updated: OptimizedCv) => {
    if (!result) return;
    setResult({
      ...result,
      optimizedCv: updated,
    });
  };

  // Update Cover Letter in state
  const handleChangeCoverLetter = (updated: CoverLetter) => {
    if (!result) return;
    setResult({
      ...result,
      coverLetter: updated,
    });
  };

  // Open Bullet Refiner Modal
  const handleOpenBulletRefiner = (
    bullet: string,
    roleContext: string,
    expIndex: number,
    bulletIndex: number
  ) => {
    setBulletRefinerData({
      isOpen: true,
      bullet,
      roleContext,
      expIndex,
      bulletIndex,
    });
  };

  // Replace bullet from refiner
  const handleSelectBulletVariant = (newBullet: string) => {
    if (!result) return;
    const newExps = [...result.optimizedCv.experiences];
    newExps[bulletRefinerData.expIndex].bullets[bulletRefinerData.bulletIndex] = newBullet;
    handleChangeCv({
      ...result.optimizedCv,
      experiences: newExps,
    });
  };

  const handleNewCandidature = () => {
    handleReset();
    setActiveView('studio');
    setCurrentStep(1);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div
      data-theme={theme}
      className={`min-h-screen w-full max-w-full overflow-x-hidden ${
        theme === 'light' ? 'bg-[#F8FAFC] text-slate-900 light' : 'bg-[#060B18] text-slate-100 dark'
      } flex flex-col selection:bg-amber-400 selection:text-slate-950 font-sans transition-colors duration-200`}
    >
      {/* Top Header Navigation (Unified for both views) */}
      <Header
        activeView={activeView}
        setActiveView={setActiveView}
        currentStep={currentStep}
        setCurrentStep={setCurrentStep}
        hasResult={Boolean(result)}
        hasInputs={Boolean(cvText || jobText || cvFileName || jobFileName)}
        onReset={handleReset}
        onNewCandidature={handleNewCandidature}
        onPrint={() => handlePrint()}
        onExportPdf={() => handleExportPdf()}
        onCopyRawText={handleCopyRawText}
        copiedRaw={copiedRaw}
        savedSessionsCount={savedSessions.length}
        onOpenHistory={() => setIsHistoryOpen(true)}
        onOpenStats={() => setIsStatsOpen(true)}
        isAdmin={isAdmin}
        theme={theme}
        onToggleTheme={handleToggleTheme}
      />

      {/* VIEW 1: LE PORTAIL D'AVENIR */}
      {activeView === 'portail' && (
        <PortailAvenir
          onStartAdventure={() => {
            setActiveView('studio');
            setCurrentStep(1);
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }}
          onSelectSamplePreset={(presetIdx) => {
            const selected = SAMPLE_PRESETS[presetIdx] || SAMPLE_PRESETS[0];
            handleLoadPreset(selected);
            setActiveView('studio');
            setCurrentStep(1);
            addToast(
              'Profil Démo Chargé !',
              `Données réelles de ${selected.candidateName} (${selected.roleTarget}) prêtes pour l'analyse.`,
              'info'
            );
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }}
          savedSessionsCount={savedSessions.length}
          onOpenHistory={() => setIsHistoryOpen(true)}
          isAdmin={isAdmin}
        />
      )}

      {/* VIEW 2: LE STUDIO D'OPTIMISATION (3-STEP WORKSPACE) */}
      {activeView === 'studio' && (
        <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Quick Studio Header Breadcrumb */}
          <div className="mb-6 pb-4 border-b border-slate-800/80 light:border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 no-print">
            <div className="flex items-center gap-2 text-xs text-slate-400 light:text-slate-600">
              <span className="font-semibold text-slate-200 light:text-slate-900 flex items-center gap-1.5">
                <Compass className="w-3.5 h-3.5 text-amber-400" />
                JNB Align Studio
              </span>
              <span aria-hidden="true" className="text-slate-600 light:text-slate-300">/</span>
              <span className="text-amber-300 light:text-amber-800 font-semibold">
                {currentStep === 1
                  ? 'Étape 1 : Importation & Alignement'
                  : currentStep === 2
                  ? 'Étape 2 : Boussole & Analyse Sémantique'
                  : 'Étape 3 : Documents & Export'}
              </span>
            </div>

            {result && (
              <div className="flex items-center gap-2 text-xs">
                <span className="text-slate-400 light:text-slate-600">Score ATS actuel :</span>
                <span className="font-bold font-mono tabular-nums text-emerald-400 light:text-emerald-700 bg-emerald-950/60 light:bg-emerald-50 border border-emerald-500/30 light:border-emerald-200 px-2.5 py-0.5 rounded-lg text-xs shadow-xs">
                  {result.semanticGap.scores.optimizedAtsScore}%
                </span>
              </div>
            )}
          </div>

          {/* Error notification banner */}
          {error && (
            <div className="mb-6 p-4 bg-rose-950/60 border border-rose-500/40 rounded-xl text-xs text-rose-200 flex items-center justify-between no-print">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                <span>{error}</span>
              </div>
              <button
                type="button"
                onClick={() => setError(null)}
                className="text-xs text-rose-400 hover:text-rose-200 font-bold cursor-pointer"
              >
                Fermer
              </button>
            </div>
          )}

          {/* ÉTAPE 1 : Importation & Alignement */}
          {currentStep === 1 && (
            <ImportStep
              cvText={cvText}
              setCvText={setCvText}
              cvFileName={cvFileName}
              setCvFileName={setCvFileName}
              cvBase64={cvBase64}
              setCvBase64={setCvBase64}
              cvTab={cvTab}
              setCvTab={setCvTab}
              jobText={jobText}
              setJobText={setJobText}
              jobFileName={jobFileName}
              setJobFileName={setJobFileName}
              jobBase64={jobBase64}
              setJobBase64={setJobBase64}
              jobTab={jobTab}
              setJobTab={setJobTab}
              targetRoleTitle={targetRoleTitle}
              setTargetRoleTitle={setTargetRoleTitle}
              candidateNotes={candidateNotes}
              setCandidateNotes={setCandidateNotes}
              targetLanguage={targetLanguage}
              setTargetLanguage={setTargetLanguage}
              isLoading={isLoading}
              loadingPhase={loadingPhase}
              onLaunchPipeline={handleLaunchPipeline}
              onLoadPreset={handleLoadPreset}
              onClearResult={() => setResult(null)}
              onReset={handleReset}
            />
          )}

          {/* ÉTAPE 2 : Boussole & Analyse Sémantique */}
          {currentStep === 2 && result && (
            <ErrorBoundary
              fallbackTitle="Anomalie lors de l'affichage de l'analyse sémantique"
              onNavigateForward={() => setCurrentStep(3)}
              onReset={handleReset}
            >
              <SemanticGapView
                analysis={result.semanticGap}
                onGoToDocuments={() => {
                  setCurrentStep(3);
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
                onExportPdf={() => handleExportPdf()}
                onPrint={() => handlePrint()}
              />
            </ErrorBoundary>
          )}

          {/* ÉTAPE 3 : Prévisualisation & Export des Documents (Axe 1, 3 & 4) */}
          {currentStep === 3 && result && (
            <ErrorBoundary
              fallbackTitle="Anomalie lors de l'affichage des documents"
              onReset={handleReset}
            >
              <DocumentsStudioView
                cv={result.optimizedCv}
                coverLetter={result.coverLetter}
                originalCvText={cvText}
                analysis={result.semanticGap}
                onChangeCv={handleChangeCv}
                onChangeCoverLetter={handleChangeCoverLetter}
                onOpenBulletRefiner={handleOpenBulletRefiner}
                onBackToAnalysis={() => {
                  setCurrentStep(2);
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
                onPrint={handlePrint}
                onCopyRawText={handleCopyRawText}
                copiedRaw={copiedRaw}
                onToast={addToast}
              />
            </ErrorBoundary>
          )}
        </main>
      )}

      {/* Cinematic Refraction Loading Modal */}
      <RefractionLoadingModal
        isOpen={isLoading}
        phaseText={loadingPhase}
      />

      {/* AI Bullet Refiner Modal */}
      <BulletRefinerModal
        isOpen={bulletRefinerData.isOpen}
        onClose={() => setBulletRefinerData({ ...bulletRefinerData, isOpen: false })}
        originalBullet={bulletRefinerData.bullet}
        roleContext={bulletRefinerData.roleContext}
        onSelectVariant={handleSelectBulletVariant}
        language={result?.languageMode || (targetLanguage === 'en' ? 'en' : 'fr')}
      />

      {/* Candidate History Drawer / Modal */}
      <HistoryModal
        isOpen={isHistoryOpen}
        onClose={() => setIsHistoryOpen(false)}
        sessions={savedSessions}
        onRestoreSession={handleRestoreSession}
        onSessionsUpdated={(updated) => setSavedSessions(updated)}
      />

      {/* Analytics & Fréquentation Live Modal (Admin Gated) */}
      <AnalyticsModal
        isOpen={isStatsOpen}
        onClose={() => setIsStatsOpen(false)}
        onAdminStateChange={(val) => setIsAdmin(val)}
        onOpenMarketingDossier={marketingStudioEnabled ? () => setIsMarketingDossierOpen(true) : undefined}
        onOpenLogoStudio={marketingStudioEnabled ? () => setIsLogoStudioOpen(true) : undefined}
        onOpenTikTokStudio={marketingStudioEnabled ? () => setIsTikTokModalOpen(true) : undefined}
        onOpenScreencastJ5={marketingStudioEnabled ? () => setIsScreencastJ5Open(true) : undefined}
        onOpenCarouselJ4={marketingStudioEnabled ? () => setIsCarouselJ4Open(true) : undefined}
        onOpenVideoJ3={marketingStudioEnabled ? () => setIsVideoJ3Open(true) : undefined}
        onOpenLaunchJ0={marketingStudioEnabled ? () => setIsLaunchJ0Open(true) : undefined}
        onOpenPostLaunchJ1={marketingStudioEnabled ? () => setIsPostLaunchJ1Open(true) : undefined}
        onOpenVideoJ2={marketingStudioEnabled ? () => setIsVideoJ2Open(true) : undefined}
        onOpenKitJ3={marketingStudioEnabled ? () => setIsKitJ3Open(true) : undefined}
      />

      {/* Legal & Terms Modal (CGU, RGPD, Mentions Légales) */}
      <LegalTermsModal
        isOpen={isLegalOpen}
        onClose={() => setIsLegalOpen(false)}
        defaultTab={legalTab}
      />

      {/* Support & Feedback In-App Modal */}
      <FeedbackModal
        isOpen={isFeedbackOpen}
        onClose={() => setIsFeedbackOpen(false)}
      />

      {/* Studios Marketing (Chargement dynamique strictement réservé à AI Studio — 0 Ko en production jnbalign.com) */}
      {marketingStudioEnabled && isAdmin && hasAnyMarketingModalOpen && (
        <Suspense fallback={null}>
          <LazyMarketingStudioHub
            isAdmin={isAdmin}
            isLogoStudioOpen={isLogoStudioOpen}
            onCloseLogoStudio={() => setIsLogoStudioOpen(false)}
            isMarketingDossierOpen={isMarketingDossierOpen}
            onCloseMarketingDossier={() => setIsMarketingDossierOpen(false)}
            isTikTokModalOpen={isTikTokModalOpen}
            onCloseTikTokModal={() => setIsTikTokModalOpen(false)}
            isScreencastJ5Open={isScreencastJ5Open}
            onCloseScreencastJ5={() => setIsScreencastJ5Open(false)}
            onTryScreencastDemoInStudio={() => {
              const demoPreset = SAMPLE_PRESETS[1] || SAMPLE_PRESETS[0];
              if (demoPreset) {
                handleLoadPreset(demoPreset);
              }
              setActiveView('studio');
              setCurrentStep(1);
              addToast(
                'Profil démo chargé dans le Studio',
                'Cliquez sur « Optimiser » pour reproduire la démonstration en direct.',
                'info'
              );
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            isCarouselJ4Open={isCarouselJ4Open}
            onCloseCarouselJ4={() => setIsCarouselJ4Open(false)}
            isVideoJ3Open={isVideoJ3Open}
            onCloseVideoJ3={() => setIsVideoJ3Open(false)}
            isLaunchJ0Open={isLaunchJ0Open}
            onCloseLaunchJ0={() => setIsLaunchJ0Open(false)}
            isPostLaunchJ1Open={isPostLaunchJ1Open}
            onClosePostLaunchJ1={() => setIsPostLaunchJ1Open(false)}
            isVideoJ2Open={isVideoJ2Open}
            onCloseVideoJ2={() => setIsVideoJ2Open(false)}
            isKitJ3Open={isKitJ3Open}
            onCloseKitJ3={() => setIsKitJ3Open(false)}
            onOpenScreencastJ5={() => setIsScreencastJ5Open(true)}
            onOpenCarouselJ4={() => setIsCarouselJ4Open(true)}
            onOpenVideoJ3={() => setIsVideoJ3Open(true)}
            onOpenLaunchJ0={() => setIsLaunchJ0Open(true)}
            onOpenPostLaunchJ1={() => setIsPostLaunchJ1Open(true)}
            onOpenVideoJ2={() => setIsVideoJ2Open(true)}
            onOpenKitJ3={() => setIsKitJ3Open(true)}
          />
        </Suspense>
      )}

      {/* Toast Notification Container (Axe 3: Micro-feedbacks) */}
      <ToastNotification toasts={toasts} onDismiss={dismissToast} />

      {/* Footer */}
      <footer className="mt-auto border-t border-slate-800 light:border-slate-200 bg-[#060B18] light:bg-white py-6 text-center text-xs text-slate-400 light:text-slate-600 no-print transition-colors">
        <div className="max-w-7xl mx-auto px-4 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex flex-col sm:flex-row items-center gap-2 text-center sm:text-left">
            <span
              onDoubleClick={() => setIsStatsOpen(true)}
              className="font-bold text-amber-300 light:text-amber-700 cursor-default select-none"
              title="JNB Align"
            >
              JNB Align
            </span>
            <span className="hidden sm:inline text-slate-600 light:text-slate-400">·</span>
            <span>L'alignement parfait entre votre parcours et l'offre idéale</span>
            <span className="hidden sm:inline text-slate-600 light:text-slate-400">·</span>
            <span className="text-slate-500 light:text-slate-600">Conforme parseurs ATS (Workday, Taleo, Greenhouse)</span>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-3 text-slate-400 light:text-slate-600">
            <button
              type="button"
              onClick={() => {
                setLegalTab('cgu');
                setIsLegalOpen(true);
              }}
              className="hover:text-amber-300 light:hover:text-amber-700 underline decoration-dotted cursor-pointer transition-colors"
            >
              CGU
            </button>
            <span aria-hidden="true" className="text-slate-600 light:text-slate-400">·</span>
            <button
              type="button"
              onClick={() => {
                setLegalTab('privacy');
                setIsLegalOpen(true);
              }}
              className="hover:text-emerald-400 light:hover:text-emerald-700 underline decoration-dotted cursor-pointer transition-colors flex items-center gap-1"
            >
              <span>RGPD & Confidentialité</span>
            </button>
            <span aria-hidden="true" className="text-slate-600 light:text-slate-400">·</span>
            <button
              type="button"
              onClick={() => {
                setLegalTab('mentions');
                setIsLegalOpen(true);
              }}
              className="hover:text-blue-400 light:hover:text-blue-700 underline decoration-dotted cursor-pointer transition-colors"
            >
              Mentions Légales
            </button>
            <span aria-hidden="true" className="text-slate-600 light:text-slate-400">·</span>
            <button
              type="button"
              onClick={() => setIsFeedbackOpen(true)}
              className="hover:text-amber-300 light:hover:text-amber-700 underline decoration-dotted cursor-pointer transition-colors"
              title="Contacter l'équipe JNB Align ou signaler un problème"
            >
              Support & Retours
            </button>

            {/* Barre Admin (visible uniquement sur le navigateur de l'administrateur connecté — mobile & ordinateur) */}
            {isAdmin && (
              <>
                <span aria-hidden="true" className="text-slate-600 light:text-slate-400">·</span>
                <div className="inline-flex flex-wrap items-center justify-center gap-2 px-2.5 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/30 text-[11px] text-amber-300 light:text-amber-800">
                  <button
                    type="button"
                    onClick={() => setIsStatsOpen(true)}
                    className="font-bold hover:text-amber-200 cursor-pointer flex items-center gap-1"
                    title="Ouvrir le panneau d'administration"
                  >
                    <span>⚙️ Espace Admin</span>
                  </button>
                  {marketingStudioEnabled && (
                    <>
                      <span className="text-amber-500/40">|</span>
                      <button
                        type="button"
                        onClick={() => setIsKitJ3Open(true)}
                        className="font-bold text-emerald-300 light:text-emerald-700 hover:text-emerald-200 cursor-pointer flex items-center gap-1"
                        title="Ouvrir le Kit complet J+3 — 1er CV Teardown (Carrousel PDF 6 slides + Vidéo 30s)"
                      >
                        <span>🎯 Kit J+3 (Teardown)</span>
                      </button>
                      <span className="text-amber-500/40">|</span>
                      <button
                        type="button"
                        onClick={() => setIsVideoJ2Open(true)}
                        className="font-bold text-amber-300 light:text-amber-800 hover:text-amber-200 cursor-pointer flex items-center gap-1"
                        title="Ouvrir la Vidéo J+2 — Astuce Test Ctrl+F en 5 secondes (MP4 25s)"
                      >
                        <span>⚡ Vidéo J+2 (Ctrl+F)</span>
                      </button>
                      <span className="text-amber-500/40">|</span>
                      <button
                        type="button"
                        onClick={() => setIsPostLaunchJ1Open(true)}
                        className="font-bold text-emerald-300 light:text-emerald-700 hover:text-emerald-200 cursor-pointer flex items-center gap-1"
                        title="Ouvrir le Studio Post-Lancement J+1 à J+30 (Vidéo 30s, Visuels HD & Plan 30j)"
                      >
                        <span>📈 Studio J+1→J+30</span>
                      </button>
                      <span className="text-amber-500/40">|</span>
                      <button
                        type="button"
                        onClick={() => setIsLaunchJ0Open(true)}
                        className="font-bold text-amber-300 light:text-amber-800 hover:text-amber-200 cursor-pointer flex items-center gap-1"
                        title="Ouvrir le Studio Jour J — Grand Lancement Public (Vidéo 35s, Visuels HD & Kit 6 plateformes)"
                      >
                        <span>🚀 Studio Jour J</span>
                      </button>
                      <span className="text-amber-500/40">|</span>
                      <button
                        type="button"
                        onClick={() => setIsVideoJ3Open(true)}
                        className="font-bold text-purple-300 light:text-purple-700 hover:text-purple-200 cursor-pointer flex items-center gap-1"
                        title="Ouvrir le studio Vidéo Mobile J-3 (30s Import URL)"
                      >
                        <span>Vidéo Mobile J-3</span>
                      </button>
                      <span className="text-amber-500/40">|</span>
                      <button
                        type="button"
                        onClick={() => setIsCarouselJ4Open(true)}
                        className="font-bold text-emerald-300 light:text-emerald-700 hover:text-emerald-200 cursor-pointer flex items-center gap-1"
                        title="Ouvrir le studio Carrousel PDF LinkedIn J-4 (Canva vs ATS)"
                      >
                        <span>Carrousel PDF J-4</span>
                      </button>
                      <span className="text-amber-500/40">|</span>
                      <button
                        type="button"
                        onClick={() => setIsScreencastJ5Open(true)}
                        className="font-bold text-amber-300 light:text-amber-800 hover:text-amber-200 cursor-pointer flex items-center gap-1"
                        title="Ouvrir le studio Vidéo Screencast J-5 (45s)"
                      >
                        <span>Démo Vidéo J-5 (45s)</span>
                      </button>
                      <span className="text-amber-500/40">|</span>
                      <button
                        type="button"
                        onClick={() => setIsTikTokModalOpen(true)}
                        className="font-bold text-rose-300 light:text-rose-700 hover:text-rose-200 cursor-pointer flex items-center gap-1"
                        title="Ouvrir le simulateur vidéo TikTok J-7"
                      >
                        <span>🎬 Vidéo TikTok J-7</span>
                      </button>
                    </>
                  )}
                  <span className="text-amber-500/40">|</span>
                  <button
                    type="button"
                    onClick={() => {
                      localStorage.removeItem('jnb_admin_authorized');
                      setIsAdmin(false);
                      setIsStatsOpen(false);
                      setIsKitJ3Open(false);
                      setIsVideoJ2Open(false);
                      setIsPostLaunchJ1Open(false);
                      setIsLaunchJ0Open(false);
                      setIsVideoJ3Open(false);
                      setIsCarouselJ4Open(false);
                      setIsScreencastJ5Open(false);
                      setIsTikTokModalOpen(false);
                      setIsMarketingDossierOpen(false);
                      setIsLogoStudioOpen(false);
                      addToast('Déconnexion Admin', 'Vous avez quitté le mode administrateur.', 'info');
                    }}
                    className="text-slate-400 hover:text-rose-400 cursor-pointer"
                    title="Verrouiller la session administrateur"
                  >
                    Verrouiller
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </footer>
    </div>
  );
}
