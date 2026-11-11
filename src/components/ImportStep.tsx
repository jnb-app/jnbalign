import React, { useRef, useState, useMemo } from 'react';
import { SamplePreset } from '../types/ats';
import { SAMPLE_PRESETS } from '../data/presets';
import { detectLanguageFromText } from '../utils/languageDetector';
import { validateCvDocument, validateJobOfferDocument } from '../utils/documentValidator';
import { cleanCompanyName } from '../utils/coverLetterSanitizer';
import {
  UploadCloud,
  FileText,
  Briefcase,
  Check,
  AlertCircle,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  ChevronDown,
  Sliders,
  Zap,
  X,
  FileCheck2,
  RotateCcw,
  Globe,
  Clipboard,
  Link as LinkIcon,
  Loader2,
  ExternalLink,
  ShieldAlert,
  ArrowUpRight,
} from 'lucide-react';

interface ImportStepProps {
  cvText: string;
  setCvText: (t: string) => void;
  cvFileName: string | null;
  setCvFileName: (name: string | null) => void;
  cvBase64: string | null;
  setCvBase64: (data: string | null) => void;
  cvTab: 'upload' | 'text';
  setCvTab: (tab: 'upload' | 'text') => void;
  jobText: string;
  setJobText: (t: string) => void;
  jobFileName: string | null;
  setJobFileName: (name: string | null) => void;
  jobBase64: string | null;
  setJobBase64: (data: string | null) => void;
  jobTab: 'upload' | 'text' | 'url';
  setJobTab: (tab: 'upload' | 'text' | 'url') => void;
  targetRoleTitle: string;
  setTargetRoleTitle: (t: string) => void;
  candidateNotes: string;
  setCandidateNotes: (t: string) => void;
  targetLanguage?: 'auto' | 'fr' | 'en';
  setTargetLanguage?: (lang: 'auto' | 'fr' | 'en') => void;
  isLoading: boolean;
  loadingPhase: string;
  onLaunchPipeline: () => void;
  onLoadPreset: (preset: SamplePreset) => void;
  onReset?: () => void;
}

export const ImportStep: React.FC<ImportStepProps> = ({
  cvText,
  setCvText,
  cvFileName,
  setCvFileName,
  cvBase64,
  setCvBase64,
  cvTab,
  setCvTab,
  jobText,
  setJobText,
  jobFileName,
  setJobFileName,
  jobBase64,
  setJobBase64,
  jobTab,
  setJobTab,
  targetRoleTitle,
  setTargetRoleTitle,
  candidateNotes,
  setCandidateNotes,
  targetLanguage = 'auto',
  setTargetLanguage,
  isLoading,
  onLaunchPipeline,
  onLoadPreset,
  onReset,
}) => {
  const [cvIsDragging, setCvIsDragging] = useState<boolean>(false);
  const [jobIsDragging, setJobIsDragging] = useState<boolean>(false);
  const [extractingCv, setExtractingCv] = useState<boolean>(false);
  const [extractingJob, setExtractingJob] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [showAdvanced, setShowAdvanced] = useState<boolean>(false);

  // États pour l'extraction d'URL tolérante aux pannes
  const [jobUrl, setJobUrl] = useState<string>('');
  const [extractingUrl, setExtractingUrl] = useState<boolean>(false);
  const [urlExtractionError, setUrlExtractionError] = useState<string | null>(null);
  const [urlBlockedInfo, setUrlBlockedInfo] = useState<{
    siteName: string;
    reason: string;
    message: string;
    guidance: string;
  } | null>(null);
  const [urlExtractedMeta, setUrlExtractedMeta] = useState<{
    detectedRole: string;
    detectedCompany: string;
    detectedLanguage?: 'fr' | 'en';
    siteName: string;
    characterCount: number;
    url: string;
  } | null>(null);

  const detectedLanguage = useMemo(() => {
    return detectLanguageFromText(jobText, cvText);
  }, [jobText, cvText]);

  const effectiveLanguage = targetLanguage === 'auto' ? detectedLanguage : targetLanguage;

  const handleSelectPreset = (preset: SamplePreset) => {
    setCvTab('text');
    setJobTab('text');
    onLoadPreset(preset);
  };

  const cvFileInputRef = useRef<HTMLInputElement>(null);
  const jobFileInputRef = useRef<HTMLInputElement>(null);

  // Vérification de compatibilité de format avant ingestion
  const isSupportedFile = (file: File) => {
    const name = file.name.toLowerCase();
    const validExtensions = ['.pdf', '.docx', '.doc', '.txt', '.md', '.rtf', '.png', '.jpg', '.jpeg', '.webp'];
    return (
      validExtensions.some((ext) => name.endsWith(ext)) ||
      file.type.startsWith('image/') ||
      file.type.includes('pdf') ||
      file.type.includes('word') ||
      file.type.includes('officedocument') ||
      file.type.includes('text')
    );
  };

  // Process CV file
  const processCvFile = async (file: File) => {
    setErrorMsg(null);

    if (!isSupportedFile(file)) {
      setErrorMsg(
        `Le format du fichier "${file.name}" n'est pas pris en charge. Formats acceptés : PDF, Word (.docx), texte (.txt) ou image/scan (PNG, JPEG). Vous pouvez également copier-coller directement le texte dans l'onglet Texte.`
      );
      return;
    }

    setCvFileName(file.name);
    setCvText('');
    setCvBase64(null);

    if (file.type === 'text/plain') {
      const text = await file.text();
      setCvText(text);
      setCvBase64(null);
      return;
    }

    const reader = new FileReader();
    reader.onload = async () => {
      const base64Data = reader.result as string;
      setCvBase64(base64Data);

      setExtractingCv(true);
      try {
        const res = await fetch('/api/extract-text', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ base64Data, mimeType: file.type || 'application/pdf' }),
        });
        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          throw new Error(errData.error || `Erreur d'extraction (${res.status})`);
        }
        const data = await res.json();
        if (data.text) {
          setCvText(data.text);
          const val = validateCvDocument(data.text);
          if (!val.isValid) {
            setErrorMsg(val.error || "Document non conforme.");
          }
        }
      } catch (err: any) {
        console.warn('Extraction CV :', err);
        setErrorMsg(err.message || "Impossible d'extraire le texte de ce CV.");
      } finally {
        setExtractingCv(false);
      }
    };
    reader.readAsDataURL(file);
  };

  // Process Job file
  const processJobFile = async (file: File) => {
    setErrorMsg(null);

    if (!isSupportedFile(file)) {
      setErrorMsg(
        `Le format du fichier "${file.name}" n'est pas pris en charge. Formats acceptés : PDF, Word (.docx), texte (.txt) ou capture d'écran (PNG, JPEG). Vous pouvez également coller le descriptif dans l'onglet Texte.`
      );
      return;
    }

    setJobFileName(file.name);
    setJobText('');
    setJobBase64(null);
    setTargetRoleTitle('');
    setCandidateNotes('');

    if (file.type === 'text/plain') {
      const text = await file.text();
      setJobText(text);
      setJobBase64(null);
      const val = validateJobOfferDocument(text);
      if (!val.isValid) {
        setErrorMsg(val.error || "Document non conforme.");
      }
      return;
    }

    const reader = new FileReader();
    reader.onload = async () => {
      const base64Data = reader.result as string;
      setJobBase64(base64Data);

      setExtractingJob(true);
      try {
        const res = await fetch('/api/extract-text', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ base64Data, mimeType: file.type || 'application/pdf' }),
        });
        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          throw new Error(errData.error || `Erreur d'extraction (${res.status})`);
        }
        const data = await res.json();
        if (data.text) {
          setJobText(data.text);
          const val = validateJobOfferDocument(data.text);
          if (!val.isValid) {
            setErrorMsg(val.error || "Document non conforme.");
          }
        }
      } catch (err: any) {
        console.warn('Extraction offre :', err);
        setErrorMsg(err.message || "Impossible d'extraire le texte de cette offre.");
      } finally {
        setExtractingJob(false);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleCvFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processCvFile(file);
  };

  const handleJobFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processJobFile(file);
  };

  const clearCvFile = () => {
    setCvFileName(null);
    setCvBase64(null);
    setCvText('');
    if (cvFileInputRef.current) cvFileInputRef.current.value = '';
  };

  const clearJobFile = () => {
    setJobFileName(null);
    setJobBase64(null);
    setJobText('');
    setTargetRoleTitle('');
    setCandidateNotes('');
    if (jobFileInputRef.current) jobFileInputRef.current.value = '';
  };

  // Détection dynamique et transparente du poste et de l'entreprise cible
  const detectedRole = useMemo(() => {
    if (!jobText) return '';
    const m = jobText.match(/(?:Poste|Rôle|Intitulé|Titre|Recherche|Recrutement)\s*:\s*([^\n]+)/i);
    if (m && m[1]) return m[1].replace(/^[#*-\s]+/, '').trim().slice(0, 60);
    const firstLine = jobText.split('\n').map((l) => l.trim()).filter(Boolean)[0] || '';
    if (firstLine.length > 3 && firstLine.length < 55 && !firstLine.toLowerCase().includes('descriptif') && !firstLine.toLowerCase().includes('offre d')) {
      return firstLine.replace(/^[#*-\s]+/, '').trim();
    }
    return '';
  }, [jobText]);

  const detectedCompany = useMemo(() => {
    if (!jobText) return '';
    let found = '';
    const firstLine = jobText.split('\n').map((l) => l.trim()).filter(Boolean)[0] || '';
    const compMatch = firstLine.match(/^([A-Za-z0-9\s.-]+)\s*[-–:]\s*(?:Offre|Recherche|Poste|Recrute)/i);
    if (compMatch && compMatch[1]) {
      found = cleanCompanyName(compMatch[1].trim());
    }
    if (!found) {
      const atMatch = jobText.match(/chez\s+([A-Za-z0-9\s.-]+)/i);
      if (atMatch && atMatch[1]) {
        found = cleanCompanyName(atMatch[1].split(/[\n,.]/)[0].trim());
      }
    }
    return found;
  }, [jobText]);

  const effectiveRole = useMemo(() => {
    if (!jobText) return targetRoleTitle || '';
    if (targetRoleTitle) {
      const isPresetRole = SAMPLE_PRESETS.some((p) => p.roleTarget.toLowerCase() === targetRoleTitle.toLowerCase());
      if (isPresetRole && !jobText.toLowerCase().includes(targetRoleTitle.toLowerCase().slice(0, 8))) {
        return detectedRole;
      }
      return targetRoleTitle;
    }
    return detectedRole;
  }, [jobText, targetRoleTitle, detectedRole]);

  // Réinitialisation complète : efface les données dans les deux encarts et replace les onglets par défaut
  const handleResetAll = () => {
    setCvText('');
    setCvFileName(null);
    setCvBase64(null);
    setCvTab('upload');
    if (cvFileInputRef.current) cvFileInputRef.current.value = '';

    setJobText('');
    setJobFileName(null);
    setJobBase64(null);
    setJobTab('upload');
    if (jobFileInputRef.current) jobFileInputRef.current.value = '';

    setJobUrl('');
    setUrlExtractionError(null);
    setUrlBlockedInfo(null);
    setUrlExtractedMeta(null);

    setTargetRoleTitle('');
    setCandidateNotes('');
    setErrorMsg(null);
    if (onReset) onReset();
  };

  // Support direct du collage simplifié (Levier 2 : Zéro Friction Mobile)
  const handlePasteCvClipboard = async () => {
    try {
      if (typeof navigator !== 'undefined' && navigator.clipboard?.readText) {
        const text = await navigator.clipboard.readText();
        if (text && text.trim().length > 10) {
          setCvText(text);
          setCvFileName(null);
          setCvBase64(null);
          setCvTab('text');
          setErrorMsg(null);
          return;
        }
      }
    } catch {
      // Permission refusée ou non supportée
    }
    setCvTab('text');
  };

  const handlePasteJobClipboard = async () => {
    try {
      if (typeof navigator !== 'undefined' && navigator.clipboard?.readText) {
        const text = await navigator.clipboard.readText();
        if (text && text.trim().length > 10) {
          setJobText(text);
          setJobFileName(null);
          setJobBase64(null);
          setJobTab('text');
          setErrorMsg(null);
          return;
        }
      }
    } catch {
      // Permission refusée ou non supportée
    }
    setJobTab('text');
  };

  // Handler d'extraction tolérante aux pannes de l'offre d'emploi par URL
  const handleExtractJobUrl = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!jobUrl || !jobUrl.trim()) {
      setUrlExtractionError("Veuillez renseigner l'adresse web (URL) de l'offre d'emploi.");
      return;
    }
    const trimmed = jobUrl.trim();
    if (!/^https?:\/\//i.test(trimmed)) {
      setUrlExtractionError("L'adresse doit obligatoirement commencer par http:// ou https://.");
      return;
    }

    setExtractingUrl(true);
    setUrlExtractionError(null);
    setUrlBlockedInfo(null);
    setErrorMsg(null);

    try {
      const res = await fetch('/api/extract-job-url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: trimmed }),
      });
      const data = await res.json().catch(() => ({}));

      if (data.blocked) {
        setUrlBlockedInfo({
          siteName: data.siteName || "Portail d'emploi",
          reason: data.reason || "Accès protégé",
          message: data.message || "Ce site restreint la lecture automatique directe.",
          guidance: data.guidance || "Copiez simplement le texte de l'annonce et collez-le dans l'onglet Texte ci-contre.",
        });
        return;
      }

      if (data.invalidContent) {
        setUrlExtractionError(data.error || "Le contenu extrait de ce lien ne correspond pas à une offre d'emploi.");
        return;
      }

      if (!res.ok || !data.success || !data.text) {
        throw new Error(data.error || `Échec de l'extraction (${res.status})`);
      }

      // Validation de conformité sémantique sur le texte structuré
      const val = validateJobOfferDocument(data.text);
      if (!val.isValid) {
        setUrlExtractionError(val.error || "Document non conforme.");
        return;
      }

      // Réinitialisation absolue des erreurs et chargement des données
      setUrlExtractionError(null);
      setUrlBlockedInfo(null);
      setErrorMsg(null);
      setJobText(data.text);
      setJobFileName(null);
      setJobBase64(null);

      if (data.detectedRole && (!targetRoleTitle || targetRoleTitle.trim().length === 0)) {
        setTargetRoleTitle(data.detectedRole);
      }

      if (data.detectedLanguage && setTargetLanguage) {
        setTargetLanguage(data.detectedLanguage);
      }

      setUrlExtractedMeta({
        detectedRole: data.detectedRole || '',
        detectedCompany: data.detectedCompany || '',
        detectedLanguage: data.detectedLanguage || 'fr',
        siteName: data.siteName || '',
        characterCount: data.characterCount || data.text.length,
        url: trimmed,
      });
    } catch (err: any) {
      console.warn("Extraction URL :", err);
      setUrlExtractionError(err?.message || "Impossible de récupérer l'offre depuis cette URL.");
    } finally {
      setExtractingUrl(false);
    }
  };

  // Bascule fluide vers l'onglet texte en cas de site protégé
  const handleFallbackToText = async () => {
    setUrlBlockedInfo(null);
    setJobTab('text');
    try {
      if (typeof navigator !== 'undefined' && navigator.clipboard?.readText) {
        const clip = await navigator.clipboard.readText();
        if (clip && clip.trim().length > 30 && !clip.startsWith('http')) {
          setJobText(clip);
        }
      }
    } catch {
      // Ignorer
    }
  };

  // Collage direct de l'URL depuis le presse-papier
  const handlePasteUrlClipboard = async () => {
    try {
      if (typeof navigator !== 'undefined' && navigator.clipboard?.readText) {
        const clip = await navigator.clipboard.readText();
        if (clip && clip.trim().startsWith('http')) {
          setJobUrl(clip.trim());
          setUrlExtractionError(null);
          setUrlBlockedInfo(null);
        }
      }
    } catch {
      // Ignorer
    }
  };

  const hasAnyData = Boolean(cvText || jobText || cvFileName || jobFileName || jobUrl);
  const isFormValid = (cvText.trim().length > 30 || cvBase64) && (jobText.trim().length > 30 || jobBase64);

  return (
    <div className="space-y-8 max-w-5xl mx-auto pb-28 md:pb-8">
      {/* Hero Header (Zero-Pill Editorial Typography) */}
      <div className="text-center max-w-3xl mx-auto pt-2 space-y-3">
        <div className="flex items-center justify-center gap-2 text-xs font-semibold text-slate-400 light:text-slate-600">
          <ShieldCheck className="w-4 h-4 text-amber-400" />
          <span className="font-bold text-amber-300 light:text-amber-700 tracking-wider uppercase text-[11px]">Le Studio d'Optimisation</span>
          <span aria-hidden="true" className="text-slate-600 light:text-slate-300">·</span>
          <span className="text-slate-300 light:text-slate-700">Étape 1 : Importation & Alignement Sémantique</span>
        </div>
        <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-white light:text-slate-900 tracking-tight">
          Passez les filtres ATS sans jamais travestir votre parcours
        </h1>
        <p className="text-sm sm:text-base text-slate-300 light:text-slate-600 max-w-2xl mx-auto leading-relaxed">
          Importez votre CV actuel et l'offre d'emploi visée. Le prisme réalise l'analyse d'écart sémantique, 
          recalibre vos réalisations réelles avec les verbes d'action STAR et prépare vos documents certifiés.
        </p>

        {/* Anti-Perte / Sauvegarde Automatique Active Badge */}
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 light:bg-emerald-50 border border-emerald-500/25 light:border-emerald-200 text-[11px] text-emerald-400 light:text-emerald-700 font-medium shadow-xs">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span>Sauvegarde automatique active · Vos données ne seront pas effacées en rechargeant</span>
        </div>

        {/* Composant 1 : Barre de présélection rapide (Ordinateur / Desktop uniquement) */}
        <div className="hidden md:flex pt-2 flex-wrap items-center justify-center gap-2 text-xs text-slate-400 light:text-slate-600">
          <span className="flex items-center gap-1.5 text-slate-300 light:text-slate-700 font-medium">
            <Zap className="w-3.5 h-3.5 text-amber-400" />
            <span>En panne de fichier ? Tester en 1 clic avec un profil type :</span>
          </span>
          <div className="inline-flex items-center gap-1 flex-wrap">
            {SAMPLE_PRESETS.map((preset, idx) => (
              <React.Fragment key={preset.id}>
                {idx > 0 && <span className="text-slate-600 light:text-slate-300" aria-hidden="true">·</span>}
                <button
                  type="button"
                  onClick={() => handleSelectPreset(preset)}
                  className="px-2.5 py-1 text-xs font-semibold text-amber-300 light:text-amber-800 hover:text-white light:hover:text-amber-950 bg-slate-900/90 light:bg-slate-100 hover:bg-slate-800 light:hover:bg-slate-200 border border-amber-400/30 light:border-amber-300 rounded-md transition-all cursor-pointer shadow-xs active:scale-95"
                  title={`Profil de ${preset.candidateName} (${preset.roleTarget} chez ${preset.companyTarget})`}
                >
                  [{preset.roleTarget.includes('Lead') ? 'Lead Tech' : preset.roleTarget.includes('Directeur') ? 'Directeur Commercial' : 'Chef de Projet'}]
                </button>
              </React.Fragment>
            ))}
          </div>
          {hasAnyData && (
            <button
              type="button"
              onClick={handleResetAll}
              className="ml-2 inline-flex items-center gap-1 text-[11px] font-medium text-slate-400 light:text-slate-500 hover:text-rose-400 transition-colors cursor-pointer"
              title="Effacer le contenu des deux encarts"
            >
              <RotateCcw className="w-3 h-3 text-slate-500" />
              <span>Réinitialiser</span>
            </button>
          )}
        </div>

        {/* Composant 2 : Carte d'Onboarding Zéro-Friction 1-Tap (Smartphone / Mobile uniquement) */}
        <div className="md:hidden p-3.5 rounded-2xl bg-gradient-to-r from-amber-400/15 via-[#0C1A3F] to-blue-950/30 light:from-amber-50 light:via-white light:to-blue-50/60 border border-amber-400/40 light:border-amber-300 shadow-md text-left flex flex-col gap-2.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="flex h-2 w-2 rounded-full bg-amber-400 animate-ping" />
              <span className="text-xs font-extrabold text-amber-300 light:text-amber-800 uppercase tracking-wider font-mono">
                ⚡ Tester en 5 sec (Profil démo)
              </span>
            </div>
            {hasAnyData && (
              <button
                type="button"
                onClick={handleResetAll}
                className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-400 light:text-slate-500 hover:text-rose-400 transition-colors py-1 px-2 rounded"
              >
                <RotateCcw className="w-3 h-3 text-slate-500" />
                <span>Effacer</span>
              </button>
            )}
          </div>
          <p className="text-xs text-slate-300 light:text-slate-600 leading-snug">
            Pas vos fichiers sous la main ? Remplissez instantanément CV et offre pour tester :
          </p>
          <div className="grid grid-cols-3 gap-2 pt-0.5">
            {SAMPLE_PRESETS.map((preset, idx) => {
              const isLead = idx === 0;
              const shortLabel = preset.roleTarget.includes('Lead')
                ? 'Lead Tech'
                : preset.roleTarget.includes('Directeur')
                ? 'Commercial'
                : 'Chef Projet';
              return (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => handleSelectPreset(preset)}
                  className={`min-h-[44px] px-2 py-2 text-xs font-bold rounded-xl transition-all active:scale-95 cursor-pointer flex flex-col items-center justify-center gap-0.5 shadow-xs text-center ${
                    isLead
                      ? 'text-slate-950 bg-gradient-to-r from-amber-400 to-yellow-400 hover:from-amber-300 hover:to-yellow-300 shadow-amber-500/20'
                      : 'text-slate-200 light:text-slate-800 bg-slate-900/90 light:bg-slate-100 hover:bg-slate-800 light:hover:bg-slate-200 border border-slate-700 light:border-slate-300'
                  }`}
                >
                  <span className="truncate w-full">{shortLabel}</span>
                  <span className={`text-[9px] font-medium ${isLead ? 'text-slate-800' : 'text-slate-400 light:text-slate-500'}`}>
                    {isLead ? 'Doctolib' : idx === 1 ? 'LVMH' : 'BNP'}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Two Column Input Panel with Central Alignment Flux Arrow (Desktop) */}
      <div className="relative">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 relative">
          {/* Left Column: Candidate CV (The Actor) */}
          <div className="bg-gradient-to-b from-[#0F1E42] to-[#0B1530] light:from-white light:to-slate-50 border border-amber-400/30 light:border-slate-200 rounded-2xl p-4 sm:p-6 shadow-xl shadow-black/20 light:shadow-slate-200 flex flex-col justify-between transition-colors">
          <div>
            <div className="flex flex-col xs:flex-row xs:items-center justify-between gap-3 mb-4">
              <div>
                <h2 className="text-base font-bold text-white light:text-slate-900">
                  1. Votre CV actuel
                </h2>
                <p className="text-xs text-slate-300 light:text-slate-600 mt-0.5">
                  Vos vraies expériences serviront de matière exclusive.
                </p>
              </div>

              {/* Upload vs Text Mode Toggle (Functional Buttons) */}
              <div className="flex items-center p-1 bg-slate-900/90 light:bg-slate-100 border border-slate-700 light:border-slate-300 rounded-lg text-xs self-start xs:self-auto shrink-0">
                <button
                  type="button"
                  onClick={() => setCvTab('upload')}
                  className={`px-2.5 py-1 rounded-md font-semibold transition-all cursor-pointer ${
                    cvTab === 'upload' ? 'bg-amber-400 text-slate-950 font-bold' : 'text-slate-400 light:text-slate-600 hover:text-white light:hover:text-slate-900'
                  }`}
                  title="Téléverser votre CV en PDF, Word (.docx), texte ou scan"
                >
                  Déposer un fichier
                </button>
                <button
                  type="button"
                  onClick={() => setCvTab('text')}
                  className={`px-2.5 py-1 rounded-md font-semibold transition-all cursor-pointer ${
                    cvTab === 'text' ? 'bg-amber-400 text-slate-950 font-bold' : 'text-slate-400 light:text-slate-600 hover:text-white light:hover:text-slate-900'
                  }`}
                >
                  Texte
                </button>
              </div>
            </div>

            {cvTab === 'upload' ? (
              <div className="space-y-3">
                <div
                  onDragOver={(e) => {
                    e.preventDefault();
                    setCvIsDragging(true);
                  }}
                  onDragLeave={() => setCvIsDragging(false)}
                  onDrop={(e) => {
                    e.preventDefault();
                    setCvIsDragging(false);
                    const file = e.dataTransfer.files?.[0];
                    if (file) processCvFile(file);
                  }}
                  onClick={() => cvFileInputRef.current?.click()}
                  className={`border-2 border-dashed rounded-xl p-5 sm:p-6 text-center cursor-pointer transition-all group ${
                    cvIsDragging
                      ? 'border-amber-400 bg-amber-500/10 light:bg-amber-50'
                      : 'border-slate-700 light:border-slate-300 hover:border-amber-400/60 light:hover:border-amber-500 bg-slate-950/40 light:bg-slate-50 hover:bg-slate-950/60 light:hover:bg-slate-100'
                  }`}
                >
                  <input
                    ref={cvFileInputRef}
                    type="file"
                    accept=".pdf,.docx,.doc,.txt,.md,.rtf,image/png,image/jpeg,image/webp"
                    onChange={handleCvFileChange}
                    className="hidden"
                  />
                  <div className="w-11 h-11 sm:w-12 sm:h-12 mx-auto rounded-full bg-amber-400/10 light:bg-amber-50 border border-amber-400/30 light:border-amber-200 flex items-center justify-center text-amber-300 light:text-amber-800 mb-2.5 group-hover:scale-110 transition-transform">
                    <UploadCloud className="w-5 h-5 sm:w-6 sm:h-6" />
                  </div>
                  <p className="text-xs sm:text-sm font-bold text-white light:text-slate-900 group-hover:text-amber-300 light:group-hover:text-amber-800 transition-colors">
                    Glissez-déposez votre CV ici
                  </p>
                  <p className="text-[11px] sm:text-xs text-slate-400 light:text-slate-500 mt-1">
                    Tous formats acceptés : PDF, Word (.docx), texte brut ou scan (PNG/JPEG)
                  </p>
                </div>

                {cvFileName && (
                  <div className="flex items-center justify-between p-3.5 bg-slate-950/70 light:bg-slate-100 border border-slate-700 light:border-slate-300 rounded-xl text-xs">
                    <div className="flex items-center gap-2 text-slate-200 light:text-slate-800 truncate">
                      <FileCheck2 className="w-4 h-4 text-amber-400 light:text-amber-700 shrink-0" />
                      <span className="font-semibold truncate">{cvFileName}</span>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      {extractingCv ? (
                        <span className="text-amber-400 light:text-amber-800 font-medium animate-pulse">Extraction locale...</span>
                      ) : (
                        <span className="text-emerald-400 light:text-emerald-700 font-semibold flex items-center gap-1 font-mono">
                          <Check className="w-3.5 h-3.5" /> Chargé ({cvText.length} car.)
                        </span>
                      )}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          clearCvFile();
                        }}
                        className="p-1 text-slate-400 light:text-slate-500 hover:text-rose-400 light:hover:text-rose-600 rounded transition-colors"
                        title="Retirer ce fichier"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                )}

                {/* Raccourci collage simplifié / LinkedIn (Smartphone / Mobile uniquement) */}
                <div className="pt-1 md:hidden">
                  <button
                    type="button"
                    onClick={handlePasteCvClipboard}
                    className="w-full inline-flex items-center justify-center gap-2 px-3.5 py-2 text-xs font-semibold rounded-xl bg-slate-900/90 light:bg-slate-100 hover:bg-slate-800 light:hover:bg-slate-200 text-amber-300 light:text-amber-800 border border-amber-400/35 light:border-amber-300 min-h-[44px] cursor-pointer transition-all active:scale-95 shadow-xs"
                    title="Coller directement le texte de votre CV ou de votre profil LinkedIn"
                  >
                    <Clipboard className="w-4 h-4 text-amber-400 light:text-amber-700 shrink-0" />
                    <span>Coller depuis le presse-papier / profil LinkedIn</span>
                  </button>
                </div>
              </div>
            ) : (
              <div>
                <textarea
                  rows={8}
                  value={cvText}
                  onChange={(e) => setCvText(e.target.value)}
                  placeholder="Collez ici l'intégralité du texte de votre CV (coordonnées, expériences, missions, compétences, diplômes)..."
                  className="w-full text-xs bg-slate-950/80 light:bg-white border border-slate-700 light:border-slate-300 focus:border-amber-400/80 rounded-xl p-3 text-slate-100 light:text-slate-900 placeholder-slate-500 light:placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-amber-400 font-mono"
                />
                <div className="flex justify-between items-center text-[11px] text-slate-400 light:text-slate-500 mt-1">
                  <span>Texte brut préservé</span>
                  <span className="font-mono">{cvText.length} caractères</span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Target Job Offer (The Receptor) */}
        <div className="bg-gradient-to-b from-[#0F1E42] to-[#0B1530] light:from-white light:to-slate-50 border border-blue-400/30 light:border-slate-200 rounded-2xl p-4 sm:p-6 shadow-xl shadow-black/20 light:shadow-slate-200 flex flex-col justify-between transition-colors">
          <div>
            <div className="flex flex-col xs:flex-row xs:items-center justify-between gap-3 mb-4">
              <div>
                <h2 className="text-base font-bold text-white light:text-slate-900">
                  2. L'Offre d'emploi visée
                </h2>
                <p className="text-xs text-slate-300 light:text-slate-600 mt-0.5">
                  La grille de mots-clés et missions exigées par l'employeur.
                </p>
              </div>

              {/* Mode switch (3 onglets réactifs Fichier / Texte / Lien URL) */}
              <div className="flex items-center p-1 bg-slate-900/90 light:bg-slate-100 border border-slate-700 light:border-slate-300 rounded-lg text-xs self-start xs:self-auto shrink-0 gap-0.5">
                <button
                  type="button"
                  onClick={() => setJobTab('upload')}
                  className={`px-2 sm:px-2.5 py-1 rounded-md font-semibold transition-all cursor-pointer whitespace-nowrap ${
                    jobTab === 'upload' ? 'bg-blue-500 text-white font-bold shadow-xs' : 'text-slate-400 light:text-slate-600 hover:text-white light:hover:text-slate-900'
                  }`}
                  title="Téléverser l'offre d'emploi en PDF, Word (.docx) ou texte"
                >
                  <span className="hidden sm:inline">Déposer un fichier</span>
                  <span className="sm:hidden">Fichier</span>
                </button>
                <button
                  type="button"
                  onClick={() => setJobTab('text')}
                  className={`px-2 sm:px-2.5 py-1 rounded-md font-semibold transition-all cursor-pointer whitespace-nowrap ${
                    jobTab === 'text' ? 'bg-blue-500 text-white font-bold shadow-xs' : 'text-slate-400 light:text-slate-600 hover:text-white light:hover:text-slate-900'
                  }`}
                  title="Coller directement le texte de l'offre"
                >
                  Texte
                </button>
                <button
                  type="button"
                  onClick={() => setJobTab('url')}
                  className={`px-2 sm:px-2.5 py-1 rounded-md font-semibold transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
                    jobTab === 'url' ? 'bg-blue-500 text-white font-bold shadow-xs' : 'text-slate-400 light:text-slate-600 hover:text-white light:hover:text-slate-900'
                  }`}
                  title="Extraire directement l'offre depuis son lien web"
                >
                  <Globe className="w-3.5 h-3.5 text-blue-300 light:text-blue-600" />
                  <span>Lien URL</span>
                </button>
              </div>
            </div>

            {jobTab === 'upload' ? (
              <div className="space-y-3">
                <div
                  onDragOver={(e) => {
                    e.preventDefault();
                    setJobIsDragging(true);
                  }}
                  onDragLeave={() => setJobIsDragging(false)}
                  onDrop={(e) => {
                    e.preventDefault();
                    setJobIsDragging(false);
                    const file = e.dataTransfer.files?.[0];
                    if (file) processJobFile(file);
                  }}
                  onClick={() => jobFileInputRef.current?.click()}
                  className={`border-2 border-dashed rounded-xl p-5 sm:p-6 text-center cursor-pointer transition-all group ${
                    jobIsDragging
                      ? 'border-blue-400 bg-blue-500/10 light:bg-blue-50'
                      : 'border-slate-700 light:border-slate-300 hover:border-blue-400/60 light:hover:border-blue-500 bg-slate-950/40 light:bg-slate-50 hover:bg-slate-950/60 light:hover:bg-slate-100'
                  }`}
                >
                  <input
                    ref={jobFileInputRef}
                    type="file"
                    accept=".pdf,.docx,.doc,.txt,.md,.rtf,image/png,image/jpeg,image/webp"
                    onChange={handleJobFileChange}
                    className="hidden"
                  />
                  <div className="w-11 h-11 sm:w-12 sm:h-12 mx-auto rounded-full bg-blue-500/10 light:bg-blue-50 border border-blue-400/30 light:border-blue-200 flex items-center justify-center text-blue-300 light:text-blue-800 mb-2.5 group-hover:scale-110 transition-transform">
                    <Briefcase className="w-5 h-5 sm:w-6 sm:h-6" />
                  </div>
                  <p className="text-xs sm:text-sm font-bold text-white light:text-slate-900 group-hover:text-blue-300 light:group-hover:text-blue-800 transition-colors">
                    Glissez-déposez l'offre d'emploi ici
                  </p>
                  <p className="text-[11px] sm:text-xs text-slate-400 light:text-slate-500 mt-1">
                    Tous formats acceptés : PDF, Word (.docx), capture ou texte via l'onglet Texte
                  </p>
                </div>

                {jobFileName && (
                  <div className="flex items-center justify-between p-3.5 bg-slate-950/70 light:bg-slate-100 border border-slate-700 light:border-slate-300 rounded-xl text-xs">
                    <div className="flex items-center gap-2 text-slate-200 light:text-slate-800 truncate">
                      <FileCheck2 className="w-4 h-4 text-blue-400 light:text-blue-700 shrink-0" />
                      <span className="font-semibold truncate">{jobFileName}</span>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      {extractingJob ? (
                        <span className="text-blue-400 light:text-blue-800 font-medium animate-pulse">Extraction...</span>
                      ) : (
                        <span className="text-emerald-400 light:text-emerald-700 font-semibold flex items-center gap-1 font-mono">
                          <Check className="w-3.5 h-3.5" /> Chargé ({jobText.length} car.)
                        </span>
                      )}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          clearJobFile();
                        }}
                        className="p-1 text-slate-400 light:text-slate-500 hover:text-rose-400 light:hover:text-rose-600 rounded transition-colors"
                        title="Retirer ce fichier"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                )}

                {/* Raccourci collage simplifié offre (Smartphone / Mobile uniquement) */}
                <div className="pt-1 md:hidden">
                  <button
                    type="button"
                    onClick={handlePasteJobClipboard}
                    className="w-full inline-flex items-center justify-center gap-2 px-3.5 py-2 text-xs font-semibold rounded-xl bg-slate-900/90 light:bg-slate-100 hover:bg-slate-800 light:hover:bg-slate-200 text-blue-300 light:text-blue-800 border border-blue-400/35 light:border-blue-300 min-h-[44px] cursor-pointer transition-all active:scale-95 shadow-xs"
                    title="Coller directement le descriptif de l'offre d'emploi"
                  >
                    <Clipboard className="w-4 h-4 text-blue-400 light:text-blue-700 shrink-0" />
                    <span>Coller l'offre d'emploi depuis le presse-papier</span>
                  </button>
                </div>
              </div>
            ) : jobTab === 'url' ? (
              /* ONGLET LIEN URL : EXTRACTION TOLÉRANTE AUX PANNES */
              <div className="space-y-3.5">
                {/* Formulaire de saisie URL */}
                <form onSubmit={handleExtractJobUrl} className="space-y-2.5">
                  <div className="relative flex items-center">
                    <div className="absolute left-3.5 pointer-events-none text-slate-400 light:text-slate-500">
                      <LinkIcon className="w-4 h-4 text-blue-400 light:text-blue-600" />
                    </div>
                    <input
                      type="url"
                      value={jobUrl}
                      onChange={(e) => {
                        setJobUrl(e.target.value);
                        if (urlExtractionError) setUrlExtractionError(null);
                        if (urlBlockedInfo) setUrlBlockedInfo(null);
                      }}
                      placeholder="https://... (ex: Welcome to the Jungle, Apec, site carrière...)"
                      className="w-full text-xs bg-slate-950/80 light:bg-white border border-slate-700 light:border-slate-300 focus:border-blue-400 rounded-xl pl-10 pr-24 py-3 text-slate-100 light:text-slate-900 placeholder-slate-500 light:placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-400 transition-all font-mono"
                      disabled={extractingUrl}
                    />
                    <div className="absolute right-2 flex items-center gap-1">
                      {jobUrl ? (
                        <button
                          type="button"
                          onClick={() => {
                            setJobUrl('');
                            setUrlExtractionError(null);
                            setUrlBlockedInfo(null);
                          }}
                          className="p-1 text-slate-400 hover:text-slate-200 light:hover:text-slate-800 transition-colors cursor-pointer"
                          title="Effacer l'URL"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={handlePasteUrlClipboard}
                          className="px-2 py-1 text-[11px] font-semibold text-blue-300 light:text-blue-700 bg-blue-950/60 light:bg-blue-50 hover:bg-blue-900/60 rounded-md border border-blue-400/30 transition-all cursor-pointer"
                          title="Coller depuis le presse-papier"
                        >
                          Coller
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                    <p className="text-[11px] text-slate-400 light:text-slate-500 leading-tight">
                      Extraction sécurisée du titre, de l'entreprise et des prérequis clés.
                    </p>
                    <button
                      type="submit"
                      disabled={extractingUrl || !jobUrl.trim()}
                      className={`inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all shrink-0 min-h-[40px] cursor-pointer shadow-md ${
                        extractingUrl || !jobUrl.trim()
                          ? 'bg-slate-800 light:bg-slate-200 text-slate-500 light:text-slate-400 cursor-not-allowed border border-slate-700 light:border-slate-300'
                          : 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white shadow-blue-900/25 active:scale-95'
                      }`}
                    >
                      {extractingUrl ? (
                        <>
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          <span>Extraction en cours...</span>
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-3.5 h-3.5 text-blue-200" />
                          <span>Extraire l'offre</span>
                        </>
                      )}
                    </button>
                  </div>
                </form>

                {/* CAS 1 (Tolérance aux pannes) : Portail protégé détecté */}
                {urlBlockedInfo && (
                  <div className="p-4 rounded-xl bg-amber-950/40 light:bg-amber-50/90 border border-amber-400/40 light:border-amber-300 text-left space-y-3 animate-fade-in shadow-md">
                    <div className="flex items-start gap-2.5">
                      <ShieldAlert className="w-5 h-5 text-amber-400 light:text-amber-700 shrink-0 mt-0.5" />
                      <div>
                        <h3 className="text-xs font-bold text-amber-200 light:text-amber-900">
                          Accès direct restreint par {urlBlockedInfo.siteName}
                        </h3>
                        <p className="text-[11.5px] text-slate-300 light:text-slate-700 mt-1 leading-relaxed">
                          {urlBlockedInfo.message} Pour des raisons de sécurité, cette plateforme exige une connexion directe.
                        </p>
                      </div>
                    </div>

                    <div className="pt-1">
                      <button
                        type="button"
                        onClick={handleFallbackToText}
                        className="w-full inline-flex items-center justify-center gap-2 px-4 py-3 text-xs sm:text-sm font-bold rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white shadow-lg shadow-blue-900/30 transition-all active:scale-98 cursor-pointer"
                      >
                        <Clipboard className="w-4 h-4 text-blue-200" />
                        <span>Basculer sur l'onglet Texte et coller l'annonce</span>
                        <ArrowRight className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                )}

                {/* CAS 2 : Erreur de contenu non conforme ou de réseau */}
                {urlExtractionError && !urlBlockedInfo && (
                  <div className="p-3.5 rounded-xl bg-rose-950/40 light:bg-rose-50 border border-rose-500/40 light:border-rose-200 text-xs text-rose-200 light:text-rose-800 flex items-start justify-between gap-2.5 animate-fade-in shadow-xs">
                    <div className="flex items-start gap-2.5">
                      <AlertCircle className="w-4 h-4 text-rose-400 light:text-rose-600 shrink-0 mt-0.5" />
                      <div className="space-y-1">
                        <p className="font-semibold leading-relaxed">{urlExtractionError}</p>
                        <button
                          type="button"
                          onClick={() => {
                            setUrlExtractionError(null);
                            setJobTab('text');
                          }}
                          className="inline-flex items-center gap-1 text-[11px] text-rose-300 light:text-rose-700 underline font-medium hover:text-white light:hover:text-rose-950 cursor-pointer transition-colors"
                        >
                          <span>Préférer le copier-coller dans l'onglet Texte</span>
                          <ArrowRight className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setUrlExtractionError(null)}
                      className="p-1 text-rose-400/70 hover:text-rose-200 light:text-rose-600 light:hover:text-rose-900 rounded transition-colors shrink-0 cursor-pointer"
                      title="Fermer cette alerte"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}

                {/* CAS 3 : Offre extraite avec succès et pré-remplie */}
                {jobText && !extractingUrl && !urlBlockedInfo && (
                  <div className="space-y-2 pt-1 animate-fade-in">
                    <div className="flex flex-wrap items-center justify-between p-2.5 rounded-lg bg-emerald-950/40 light:bg-emerald-50 border border-emerald-500/30 light:border-emerald-200 text-xs text-emerald-300 light:text-emerald-800 gap-2">
                      <div className="flex flex-wrap items-center gap-2 truncate">
                        <Check className="w-4 h-4 text-emerald-400 light:text-emerald-600 shrink-0" />
                        <span className="font-bold truncate">Offre extraite et structurée</span>
                        <span className="text-emerald-400/80 light:text-emerald-700 font-mono text-[11px]">
                          ({jobText.length} car.)
                        </span>
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-900/60 light:bg-emerald-100 border border-emerald-400/30 text-emerald-200 light:text-emerald-800">
                          {effectiveLanguage === 'en' ? '🇬🇧 Offre en anglais' : '🇫🇷 Offre en français'}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setJobText('');
                          setUrlExtractedMeta(null);
                        }}
                        className="text-[11px] text-slate-400 light:text-slate-600 hover:text-rose-400 transition-colors cursor-pointer shrink-0"
                        title="Effacer cette offre"
                      >
                        Effacer
                      </button>
                    </div>

                    {/* Zone de prévisualisation et d'ajustement du texte extrait */}
                    <div>
                      <div className="flex justify-between items-center text-[11px] text-slate-400 light:text-slate-500 mb-1">
                        <span>Contenu extrait (vérifiable et ajustable) :</span>
                        <button
                          type="button"
                          onClick={() => setJobTab('text')}
                          className="text-blue-400 light:text-blue-600 hover:underline cursor-pointer"
                        >
                          Édition avancée dans l'onglet Texte →
                        </button>
                      </div>
                      <textarea
                        rows={6}
                        value={jobText}
                        onChange={(e) => setJobText(e.target.value)}
                        placeholder="Contenu structuré de l'offre d'emploi..."
                        className="w-full text-xs bg-slate-950/80 light:bg-white border border-slate-700 light:border-slate-300 focus:border-blue-400 rounded-xl p-3 text-slate-100 light:text-slate-900 placeholder-slate-500 light:placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-400 font-mono"
                      />
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div>
                <textarea
                  rows={8}
                  value={jobText}
                  onChange={(e) => setJobText(e.target.value)}
                  placeholder="Collez ici le descriptif de l'offre d'emploi (titre, missions, profil recherché, compétences obligatoires, contexte d'entreprise)..."
                  className="w-full text-xs bg-slate-950/80 light:bg-white border border-slate-700 light:border-slate-300 focus:border-blue-400/80 rounded-xl p-3 text-slate-100 light:text-slate-900 placeholder-slate-500 light:placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-400 font-mono"
                />
                <div className="flex justify-between items-center text-[11px] text-slate-400 light:text-slate-500 mt-1">
                  <span>Descriptif cible</span>
                  <span className="font-mono">{jobText.length} caractères</span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Central Alignment Flux Badge (Desktop) */}
        <div className="hidden lg:flex absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none z-10 items-center justify-center">
          <div className="w-11 h-11 rounded-full bg-[#060B18] light:bg-white border border-amber-400/50 light:border-amber-300 text-amber-300 light:text-amber-800 flex items-center justify-center shadow-2xl shadow-black/90 light:shadow-slate-300 ring-4 ring-slate-900/60 light:ring-slate-200">
            <ArrowRight className="w-5 h-5 animate-pulse text-amber-300 light:text-amber-800" />
          </div>
        </div>
      </div>
    </div>

      {/* Real-time Target Role and Company Alignment Banner (Zero-Pill Editorial) - CSS SELECTOR 1 */}
      {(effectiveRole || detectedCompany) && (
        <div className="p-3.5 rounded-xl bg-gradient-to-r from-blue-950/80 via-slate-900 to-amber-950/40 light:from-blue-50 light:via-white light:to-amber-50 border border-blue-400/40 light:border-slate-200 flex flex-wrap items-center justify-between gap-3 text-xs shadow-md light:shadow-slate-200/60 animate-fade-in transition-colors">
          <div className="flex items-center gap-2.5">
            <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 light:bg-emerald-600 animate-pulse shrink-0" />
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-slate-400 light:text-slate-600 font-medium">Ciblage détecté de l'offre :</span>
              <span className="font-bold text-white light:text-blue-900 bg-blue-500/20 light:bg-blue-100 border border-blue-400/30 light:border-blue-300 px-2 py-0.5 rounded text-[11px]">
                {effectiveRole || "Poste extrait de l'offre"}
              </span>
              {detectedCompany && (
                <span className="text-amber-300 light:text-amber-800 font-bold text-[11px]">
                  chez {detectedCompany}
                </span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-[11px] text-emerald-400 light:text-emerald-700 font-semibold flex items-center gap-1.5">
              <Check className="w-3.5 h-3.5 text-emerald-400 light:text-emerald-700" />
              <span>Ciblage précis pour cette offre</span>
            </span>
            <span className="text-slate-600 light:text-slate-300 hidden sm:inline" aria-hidden="true">·</span>
            <button
              type="button"
              onClick={() => setShowAdvanced(true)}
              className="text-[11px] text-slate-400 light:text-slate-600 hover:text-amber-300 light:hover:text-amber-800 underline font-medium cursor-pointer"
            >
              Ajuster
            </button>
          </div>
        </div>
      )}

      {/* Collapsible Alignment Options (Accordion to keep initial screen clean) */}
      <div className="bg-[#0C1738] light:bg-white border border-slate-700/80 light:border-slate-200 rounded-2xl overflow-hidden transition-all shadow-md light:shadow-slate-200/60">
        <button
          type="button"
          onClick={() => setShowAdvanced(!showAdvanced)}
          className="w-full p-4 flex items-center justify-between text-left text-xs font-semibold text-slate-200 light:text-slate-800 hover:text-white light:hover:text-slate-900 transition-colors cursor-pointer"
        >
          <div className="flex items-center gap-2">
            <Sliders className="w-4 h-4 text-amber-400 light:text-amber-600" />
            <span>Options d'alignement avancées (Optionnel)</span>
            <span className="text-slate-400 light:text-slate-500 text-[11px] font-normal">
              · Intitulé de poste ciblé & axes de valorisation
            </span>
          </div>
          <ChevronDown className={`w-4 h-4 text-slate-400 light:text-slate-500 transition-transform ${showAdvanced ? 'rotate-180' : ''}`} />
        </button>

        {showAdvanced && (
          <div className="p-5 pt-0 border-t border-slate-800/80 light:border-slate-200 grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
            <div>
              <label className="block text-xs font-semibold text-slate-300 light:text-slate-700 mb-1">
                Intitulé exact souhaité sur l'en-tête du CV
              </label>
              <input
                type="text"
                value={targetRoleTitle}
                onChange={(e) => setTargetRoleTitle(e.target.value)}
                placeholder="Ex: Senior Full-Stack Engineer / Lead Tech..."
                className="w-full text-xs bg-slate-950/80 light:bg-white border border-slate-700 light:border-slate-300 focus:border-amber-400 rounded-lg px-3 py-2.5 text-white light:text-slate-900 placeholder-slate-500 light:placeholder-slate-400 focus:outline-none"
              />
              <p className="text-[11px] text-slate-400 light:text-slate-500 mt-1">
                Les parseurs ATS valorisent un intitulé de profil aligné avec le titre de l'offre.
              </p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 light:text-slate-700 mb-1">
                Axes prioritaires ou projets marquants à valoriser
              </label>
              <input
                type="text"
                value={candidateNotes}
                onChange={(e) => setCandidateNotes(e.target.value)}
                placeholder="Ex: Insister sur mon leadership d'équipe et la migration Cloud AWS..."
                className="w-full text-xs bg-slate-950/80 light:bg-white border border-slate-700 light:border-slate-300 focus:border-amber-400 rounded-lg px-3 py-2.5 text-white light:text-slate-900 placeholder-slate-500 light:placeholder-slate-400 focus:outline-none"
              />
              <p className="text-[11px] text-slate-400 light:text-slate-500 mt-1">
                Indiquez les priorités à faire ressortir dans la lettre de motivation et le CV.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Error state if any */}
      {errorMsg && (
        <div className="p-4 bg-rose-950/50 light:bg-rose-50 border border-rose-500/30 light:border-rose-200 rounded-xl text-xs text-rose-200 light:text-rose-800 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-rose-400 light:text-rose-600 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Sélecteur de Langue Cible & Norme ATS (Bilingue FR/EN) - CSS SELECTOR 2 & 3 */}
      <div className="bg-[#0B1530] light:bg-white border border-amber-400/25 light:border-slate-200 rounded-2xl p-4 shadow-xl light:shadow-slate-200/60 text-left space-y-3 transition-colors">
        {/* Header Row - CSS SELECTOR 3 */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Globe className="w-4 h-4 text-amber-400 light:text-amber-700 shrink-0" />
            <span className="text-xs font-bold text-white light:text-slate-900">Langue cible & Norme ATS :</span>
            <span className="text-[11px] font-bold text-amber-300/90 light:text-amber-800">
              {effectiveLanguage === 'en' ? '🇬🇧 Mode International ATS' : '🇫🇷 Mode France / UE'}
            </span>
          </div>

          <div className="grid grid-cols-3 sm:flex w-full sm:w-auto justify-center items-center p-1 bg-slate-950/80 light:bg-slate-100 border border-slate-700/80 light:border-slate-300 rounded-xl text-xs gap-1 max-w-full">
            <button
              type="button"
              onClick={() => setTargetLanguage && setTargetLanguage('auto')}
              className={`px-2.5 sm:px-3 py-2 sm:py-1.5 rounded-lg font-semibold transition-all cursor-pointer flex items-center justify-center gap-1 sm:gap-1.5 text-center ${
                targetLanguage === 'auto'
                  ? 'bg-amber-400 text-slate-950 font-bold shadow-xs'
                  : 'text-slate-400 light:text-slate-600 hover:text-white light:hover:text-slate-900'
              }`}
              title="Détecte automatiquement la langue selon le texte de l'offre"
            >
              <span>⚡ Auto</span>
              <span className="text-[10px] font-mono opacity-80 hidden xs:inline">
                ({detectedLanguage === 'en' ? '🇬🇧 EN' : '🇫🇷 FR'})
              </span>
            </button>

            <button
              type="button"
              onClick={() => setTargetLanguage && setTargetLanguage('fr')}
              className={`px-2.5 sm:px-3 py-2 sm:py-1.5 rounded-lg font-semibold transition-all cursor-pointer flex items-center justify-center gap-1 sm:gap-1.5 text-center ${
                targetLanguage === 'fr'
                  ? 'bg-amber-400 text-slate-950 font-bold shadow-xs'
                  : 'text-slate-400 light:text-slate-600 hover:text-white light:hover:text-slate-900'
              }`}
            >
              <span>🇫🇷 FR</span>
              <span className="hidden xs:inline">Français</span>
            </button>

            <button
              type="button"
              onClick={() => setTargetLanguage && setTargetLanguage('en')}
              className={`px-2.5 sm:px-3 py-2 sm:py-1.5 rounded-lg font-semibold transition-all cursor-pointer flex items-center justify-center gap-1 sm:gap-1.5 text-center ${
                targetLanguage === 'en'
                  ? 'bg-amber-400 text-slate-950 font-bold shadow-xs'
                  : 'text-slate-400 light:text-slate-600 hover:text-white light:hover:text-slate-900'
              }`}
            >
              <span>🇬🇧 EN</span>
              <span className="hidden xs:inline">English</span>
            </button>
          </div>
        </div>

        {/* Dynamic Contextual Hint for Language Mode - CSS SELECTOR 2 */}
        {effectiveLanguage === 'en' ? (
          <div className="text-[11.5px] text-blue-200/90 light:text-blue-950 bg-blue-950/40 light:bg-blue-50/80 border border-blue-400/30 light:border-blue-200 rounded-xl p-3 flex items-start gap-2.5 leading-relaxed">
            <Sparkles className="w-4 h-4 text-blue-400 light:text-blue-700 shrink-0 mt-0.5" />
            <div className="space-y-1 text-left">
              <div>
                <strong className="text-white light:text-blue-900 font-bold">Mode International ATS activé : </strong>
                Optimisation en anglais exécutif avec verbes d'action STAR anglo-saxons (<em>Spearheaded, Engineered, Orchestrated, Scaled...</em>), en-têtes standardisés (<em>Professional Summary, Core Competencies, Experience</em>) et trame de lettre internationale (<em>Challenges / Track Record / Future Value</em>).
              </div>
              <div className="flex items-center gap-1.5 text-[10.5px] text-emerald-300 light:text-emerald-800 font-medium pt-0.5 border-t border-blue-400/20 light:border-blue-200">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span>Norme US / UK / EEO : Omission automatique des données sensibles (pas de photo, âge ou état civil, conforme aux lois anti-discrimination internationales).</span>
              </div>
            </div>
          </div>
        ) : (
          <div className="text-[11.5px] text-amber-200/90 light:text-amber-950 bg-amber-950/30 light:bg-amber-50/80 border border-amber-400/20 light:border-amber-300 rounded-xl p-3 flex items-start gap-2.5 leading-relaxed">
            <Sparkles className="w-4 h-4 text-amber-400 light:text-amber-700 shrink-0 mt-0.5" />
            <div>
              <strong className="text-white light:text-amber-900 font-bold">Mode ATS France & Francophonie activé : </strong>
              Votre CV et votre Lettre seront optimisés en français professionnel avec verbes d'action STAR (<em>Piloté, Conçu, Déployé, Optimisé...</em>), en-têtes certifiés et trame stratégique Vous / Moi / Nous.
            </div>
          </div>
        )}
      </div>

      {/* Launch CTA Button */}
      <div className="text-center pt-2 space-y-3 px-2 sm:px-0">
        <button
          type="button"
          disabled={!isFormValid || isLoading}
          onClick={onLaunchPipeline}
          className={`group w-full sm:w-auto inline-flex items-center justify-center gap-2.5 sm:gap-3 px-6 sm:px-10 py-3.5 sm:py-4 rounded-xl font-bold text-xs sm:text-sm transition-all shadow-xl ${
            isFormValid && !isLoading
              ? 'bg-gradient-to-r from-amber-400 via-amber-300 to-yellow-500 hover:from-amber-300 hover:to-yellow-400 text-slate-950 cursor-pointer shadow-amber-500/25 hover:scale-[1.02] active:scale-[0.98]'
              : 'bg-slate-800 light:bg-slate-200 text-slate-500 light:text-slate-400 cursor-not-allowed shadow-none border border-slate-700 light:border-slate-300'
          }`}
        >
          <Sparkles className="w-4 h-4 text-slate-950 group-hover:rotate-12 transition-transform shrink-0" />
          <span className="text-center">
            {effectiveLanguage === 'en'
              ? 'Optimiser en Anglais (International ATS) →'
              : 'Optimiser ma Candidature & Analyser le CV →'}
          </span>
          <ArrowRight className="w-4 h-4 text-slate-950 group-hover:translate-x-1 transition-transform shrink-0" />
        </button>

        <p className="text-xs text-slate-400 light:text-slate-600 font-medium">
          {effectiveLanguage === 'en'
            ? 'International Semantic Gap Analysis · Executive STAR Verbs · 100% Authentic Facts Preserved'
            : "Analyse d'écart sémantique · Méthode STAR · Préservation stricte de vos faits réels"}
        </p>

        {/* Bannière de Confiance & Souveraineté des Données */}
        <div className="max-w-xl mx-auto flex items-center justify-center gap-2.5 text-[11.5px] text-slate-400 light:text-slate-600 bg-slate-950/70 light:bg-white border border-slate-800 light:border-slate-200 rounded-xl px-4 py-2.5 shadow-sm light:shadow-slate-200/60 text-left sm:text-center mt-2 transition-colors">
          <span className="text-amber-400 light:text-amber-700 text-sm shrink-0">🔒</span>
          <span className="leading-relaxed">
            <strong className="text-slate-300 light:text-slate-800 font-semibold">Vos données personnelles restent strictement confidentielles.</strong> Analyse volatile en mémoire, aucune revente, aucun stockage persistant de vos coordonnées.
          </span>
        </div>
      </div>

      {/* Barre d'action mobile persistante dans la zone du pouce (Ergonomie Smartphone B) */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-[#070D1D]/95 light:bg-white/95 backdrop-blur-md border-t border-amber-400/25 light:border-slate-200 px-4 py-3 shadow-[0_-8px_30px_rgba(0,0,0,0.4)] no-print">
        <div className="flex items-center justify-between gap-3 max-w-md mx-auto">
          {isFormValid ? (
            <button
              type="button"
              disabled={isLoading}
              onClick={onLaunchPipeline}
              className="w-full inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-extrabold text-xs text-slate-950 bg-gradient-to-r from-amber-400 via-amber-300 to-yellow-500 active:scale-95 shadow-lg shadow-amber-500/25 cursor-pointer"
            >
              <Sparkles className="w-4 h-4 text-slate-950 shrink-0" />
              <span>
                {effectiveLanguage === 'en'
                  ? 'Optimiser en Anglais (STAR) →'
                  : 'Optimiser ma Candidature (STAR) →'}
              </span>
            </button>
          ) : (
            <div className="w-full flex items-center justify-between bg-slate-900/90 light:bg-slate-100 rounded-xl px-3.5 py-2.5 border border-slate-800 light:border-slate-300 text-xs text-slate-300 light:text-slate-700">
              <span className="flex items-center gap-2 font-medium">
                <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
                <span>
                  {cvText.trim().length > 30 || cvBase64 ? '✓ CV prêt' : '⏳ CV manquant'} ·{' '}
                  {jobText.trim().length > 30 || jobBase64 ? '✓ Offre prête' : '⏳ Offre manquante'}
                </span>
              </span>
              <span className="text-[11px] text-amber-400 light:text-amber-700 font-bold">1/2 étapes</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
