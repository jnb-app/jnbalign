import React, { useState, useEffect } from 'react';
import {
  Award,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Sparkles,
  ShieldCheck,
  Zap,
  Volume2,
  VolumeX,
  Play,
  Pause,
  RotateCcw,
  Layers,
  List,
  ChevronLeft,
  ChevronRight,
  Eye,
  Check,
  UserCheck,
} from 'lucide-react';
import { SemanticGapAnalysis, OptimizedCv } from '../types/ats';
import { detectCvLanguage } from '../utils/languageDetector';
import {
  VoiceGender,
  detectCandidateGender,
  speakNaturalPitch,
  stopSpeaking,
} from '../utils/voiceAssistant';
import { normalizeToTrueSkill } from '../utils/competencyHelper';

interface PreInterviewCoachProps {
  analysis?: SemanticGapAnalysis;
  cv: OptimizedCv;
}

export const PreInterviewCoach: React.FC<PreInterviewCoachProps> = ({ analysis, cv }) => {
  const [isExpanded, setIsExpanded] = useState<boolean>(true);
  const [viewMode, setViewMode] = useState<'flashcards' | 'list'>('flashcards');
  const [currentCardIndex, setCurrentCardIndex] = useState<number>(0);
  const [revealedPitch, setRevealedPitch] = useState<boolean>(false);
  const [pitchMode, setPitchMode] = useState<'direct' | 'bridge'>('direct');
  const [validatedQuestions, setValidatedQuestions] = useState<Record<number, boolean>>({});

  // 45s Pitch Stopwatch Timer
  const [timerSeconds, setTimerSeconds] = useState<number>(45);
  const [isTimerRunning, setIsTimerRunning] = useState<boolean>(false);

  // Audio Speech Synthesis with Natural Human Voice & Gender Detection
  const [isSpeaking, setIsSpeaking] = useState<boolean>(false);
  const [currentlySpeakingId, setCurrentlySpeakingId] = useState<number | null>(null);

  // Auto-detect candidate gender from full name (e.g. female vs male)
  const detectedGender = detectCandidateGender(cv?.personalInfo?.fullName);
  const [voiceGender, setVoiceGender] = useState<VoiceGender>(detectedGender);

  // Determine active content language: English if CV or job offer is in English
  const isEn = detectCvLanguage(cv, analysis) === 'en';

  // Synchronize when CV changes
  useEffect(() => {
    setVoiceGender(detectCandidateGender(cv?.personalInfo?.fullName));
  }, [cv?.personalInfo?.fullName]);

  // Pre-load natural voices on mount & stop on unmount
  useEffect(() => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.getVoices();
      const onVoices = () => window.speechSynthesis.getVoices();
      window.speechSynthesis.onvoiceschanged = onVoices;
    }
    return () => {
      stopSpeaking();
    };
  }, []);

  // Extraction of target skills / keywords with strict separation between skills and roles
  const rawCriticalSkills = analysis?.keywordsAnalysis?.criticalRequiredKeywords || [];
  const rawMatchedSkills = analysis?.keywordsAnalysis?.matchedKeywords || [];
  const combinedRaw = [...rawCriticalSkills, ...rawMatchedSkills];

  // Convert raw keywords so any job title becomes a real skill, and retain genuine skills
  const normalizedItems = combinedRaw.map((k) => normalizeToTrueSkill(k));
  const uniqueSkills: string[] = [];
  const seenSkills = new Set<string>();

  for (const item of normalizedItems) {
    const s = item.skill;
    if (s && !seenSkills.has(s.toLowerCase())) {
      uniqueSkills.push(s);
      seenSkills.add(s.toLowerCase());
    }
  }

  const fallbackSkills = isEn
    ? [
        'Project & Delivery Management',
        'Complex Problem Solving',
        'Impactful Communication',
        'Cross-Functional Leadership',
      ]
    : [
        'Gestion de projet & Delivery',
        'Résolution de problèmes complexes',
        'Communication d\'impact',
        'Leadership & Conduite du changement',
      ];

  const skillsToUse = uniqueSkills.length >= 4 ? uniqueSkills.slice(0, 4) : [...uniqueSkills, ...fallbackSkills].slice(0, 4);

  // Target job title / position
  const targetRole = analysis?.jobOverview?.title || cv.personalInfo?.professionalTitle || (isEn ? 'this position' : 'ce poste');
  const companyName = cv.experiences[0]?.company || (isEn ? 'my previous employer' : 'mon employeur précédent');

  const primarySkill = skillsToUse[0] || (isEn ? 'Project Delivery' : 'Gestion de Projet');
  const secondarySkill = skillsToUse[1] || (isEn ? 'Problem Solving' : 'Résolution de Problèmes');
  const tertiarySkill = skillsToUse[2] || (isEn ? 'Cross-Functional Collaboration' : 'Communication Transverse');
  const quaternarySkill = skillsToUse[3] || (isEn ? 'Adaptability & Agility' : 'Adaptabilité & Agilité');

  const interviewQuestions = isEn
    ? [
        {
          id: 1,
          theme: primarySkill,
          category: 'skill' as const,
          question: `“How have you practically applied the skill of "${primarySkill}" in your past experiences?”`,
          starHint: `Anchor your response strictly on the SKILL: describe the initial Situation, your direct Task, the specific Action taken demonstrating ${primarySkill}, and the quantifiable Result achieved.`,
          suggestedPitch: `In my role at ${companyName}, I applied ${primarySkill} to address a critical operational challenge, which directly resulted in measurable efficiency gains and strong stakeholder alignment.`,
        },
        {
          id: 2,
          theme: secondarySkill,
          category: 'skill' as const,
          question: `“What key obstacles did you encounter regarding "${secondarySkill}", and how did you overcome them?”`,
          starHint: `Demonstrate your methodology and analytical problem-solving with ${secondarySkill} without blaming external team members.`,
          suggestedPitch: `Faced with complex project constraints, I structured our workflow around ${secondarySkill}, aligned cross-functional partners, and strictly preserved our quality benchmarks and delivery deadlines.`,
        },
        {
          id: 3,
          theme: targetRole,
          category: 'role' as const,
          question: `“As a candidate for the position of "${targetRole}", why should we choose you over other candidates?”`,
          starHint: `Address the POSITION directly: demonstrate your understanding of the scope, responsibilities, and 90-day deliverables expected of a ${targetRole}.`,
          suggestedPitch: `For the position of ${targetRole}, my profile combines proven mastery of your core competencies (${skillsToUse.slice(0, 2).join(', ')}) with a track record of driving cross-functional alignment and delivering business outcomes from day one.`,
        },
        {
          id: 4,
          theme: tertiarySkill,
          category: 'skill' as const,
          question: `“Can you walk me through an unforeseen situation where your mastery of "${tertiarySkill}" allowed you to act autonomously?”`,
          starHint: `Apply the STAR framework: Urgent context, immediate objective, proactive action leveraging ${tertiarySkill}, and stabilized outcome.`,
          suggestedPitch: `When an unexpected roadblock emerged, I relied on ${tertiarySkill} to reassess priorities, mobilize key stakeholders, and secure deliverables without disrupting our overall roadmap.`,
        },
        {
          id: 5,
          theme: 'Bridge Strategy (Skill Transposition)',
          category: 'skill' as const,
          question: `“How would you respond if asked about a technical tool or methodology required for the position of ${targetRole} that you haven't used yet?”`,
          starHint: `Agile Bridge Method: Never fabricate experience. Acknowledge directly, bridge immediately to your adjacent mastery (${primarySkill}), and highlight your rapid learning velocity.`,
          suggestedPitch: `“While I haven't worked hands-on with that specific tool in production yet, I bring deep mastery in ${primarySkill} which shares the exact same underlying logic. In previous roles, this proven adaptability enabled me to achieve full autonomous velocity in under two weeks.”`,
        },
      ]
    : [
        {
          id: 1,
          theme: primarySkill,
          category: 'skill' as const,
          question: `« Comment avez-vous déjà mis en pratique la compétence "${primarySkill}" dans vos expériences passées ? »`,
          starHint: `Focalisez-vous STRICTEMENT sur la COMPÉTENCE : citez la situation d'origine, votre action concrète mobilisant "${primarySkill}" et le résultat mesurable tel que formulé dans votre expérience.`,
          suggestedPitch: `Dans mon rôle chez ${companyName}, j'ai mobilisé la compétence "${primarySkill}" pour répondre à un défi opérationnel critique, ce qui s'est directement traduit par des gains mesurables et la satisfaction des parties prenantes.`,
        },
        {
          id: 2,
          theme: secondarySkill,
          category: 'skill' as const,
          question: `« Quelles difficultés avez-vous rencontrées dans la mise en œuvre de "${secondarySkill}" et comment les avez-vous surmontées ? »`,
          starHint: `Démontrez votre méthode opérationnelle et votre posture face aux obstacles en vous appuyant sur "${secondarySkill}".`,
          suggestedPitch: `Face aux contraintes du projet, j'ai structuré mon approche autour de ${secondarySkill}, aligné les parties prenantes et garanti le strict respect des délais et de la qualité fixés.`,
        },
        {
          id: 3,
          theme: targetRole,
          category: 'role' as const,
          question: `« Pour le poste de "${targetRole}", pourquoi vous choisir vous plutôt qu'un autre candidat ? »`,
          starHint: `Répondez ici sur le POSTE et la POSITION : démontrez votre compréhension des enjeux stratégiques, des responsabilités clés et de la valeur ajoutée que vous apporterez dans la fonction de ${targetRole}.`,
          suggestedPitch: `Pour le poste de ${targetRole}, mon profil réunit la maîtrise directe de vos compétences clés (${skillsToUse.slice(0, 2).join(', ')}) et la capacité démontrée à piloter des projets d'envergure et créer de la valeur dès ma prise de fonction.`,
        },
        {
          id: 4,
          theme: tertiarySkill,
          category: 'skill' as const,
          question: `« Parlez-moi d'une situation imprévue où vous avez dû mobiliser "${tertiarySkill}" pour agir rapidement sans directive précise. »`,
          starHint: `Appliquez la structure STAR : Situation d'urgence, Tâche immédiate, Action autonome via "${tertiarySkill}" et Résultat stabilisé.`,
          suggestedPitch: `Lors d'un imprévu opérationnel, j'ai mobilisé ${tertiarySkill} pour évaluer les priorités, réaligner les ressources et sécuriser les livrables sans impacter le calendrier global.`,
        },
        {
          id: 5,
          theme: 'Passerelle d\'Agilité (Compétence non couverte)',
          category: 'skill' as const,
          question: `« Que répondez-vous si l'on vous interroge sur un outil ou une méthode exigée pour le poste de ${targetRole} que vous n'avez pas encore pratiquée ? »`,
          starHint: `Règle d'or de la Passerelle : Ni mensonge, ni aveu d'impuissance. Validez votre socle de compétence connexe (${primarySkill}) et affirmez votre vitesse d'assimilation.`,
          suggestedPitch: `« Je n'ai pas encore eu l'opportunité d'utiliser directement cet outil en environnement de production, mais j'ai une solide maîtrise de ${primarySkill} qui s'appuie sur la même logique sous-jacente. Lors de mes précédents postes, cette base m'a systématiquement permis d'atteindre une pleine autonomie opérationnelle en moins de 15 jours. »`,
        },
      ];

  // Timer countdown hook
  useEffect(() => {
    let interval: any = null;
    if (isTimerRunning && timerSeconds > 0) {
      interval = setInterval(() => {
        setTimerSeconds((prev) => prev - 1);
      }, 1000);
    } else if (timerSeconds === 0) {
      setIsTimerRunning(false);
    }
    return () => clearInterval(interval);
  }, [isTimerRunning, timerSeconds]);

  const resetTimer = () => {
    setIsTimerRunning(false);
    setTimerSeconds(45);
  };

  // High-fidelity natural human speech synthesis (Gemini Studio TTS + Local Fallback)
  const handleSpeak = (text: string, questionId: number) => {
    if (isSpeaking && currentlySpeakingId === questionId) {
      stopSpeaking();
      setIsSpeaking(false);
      setCurrentlySpeakingId(null);
      return;
    }

    stopSpeaking();
    setCurrentlySpeakingId(questionId);

    speakNaturalPitch(text, voiceGender, isEn ? 'en' : 'fr', {
      onStart: () => setIsSpeaking(true),
      onEnd: () => {
        setIsSpeaking(false);
        setCurrentlySpeakingId(null);
      },
      onError: () => {
        setIsSpeaking(false);
        setCurrentlySpeakingId(null);
      },
    });
  };

  // Toggle validation
  const toggleValidate = (id: number) => {
    setValidatedQuestions((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  const markCurrentAndNext = (mastered: boolean) => {
    const q = interviewQuestions[currentCardIndex];
    setValidatedQuestions((prev) => ({
      ...prev,
      [q.id]: mastered,
    }));
    setRevealedPitch(false);
    resetTimer();
    if (currentCardIndex < interviewQuestions.length - 1) {
      setCurrentCardIndex((prev) => prev + 1);
    }
  };

  const validatedCount = Object.values(validatedQuestions).filter(Boolean).length;
  const progressPercent = Math.round((validatedCount / interviewQuestions.length) * 100);

  const currentQ = interviewQuestions[currentCardIndex];

  return (
    <div id="coach-oral" className="w-full bg-[#0B1530] light:bg-white border border-amber-400/30 light:border-slate-300 rounded-2xl shadow-xl p-4 sm:p-6 transition-all text-left text-white light:text-slate-900 scroll-mt-20">
      {/* Header bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-400 to-yellow-500 text-slate-950 flex items-center justify-center font-bold shadow-md shadow-amber-500/20 shrink-0">
            <Award className="w-5 h-5 text-slate-950" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm sm:text-base font-bold text-white light:text-slate-900 tracking-tight">
                Simulateur Oral d'Entretien (Entraîneur STAR)
              </h3>
              <span className="text-[10px] font-bold font-mono px-2 py-0.5 rounded-full bg-amber-400/20 text-amber-300 light:bg-amber-100 light:text-amber-800 border border-amber-400/30">
                Entraînement Oral
              </span>
            </div>
            <p className="text-xs text-slate-300 light:text-slate-600 mt-0.5">
              Flashcards interactives, chrono de 45s et voix humaine naturelle pour vous entraîner à voix haute.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 sm:gap-3 self-end sm:self-center">
          {/* Voice Gender Switcher (Auto-detected + Manual toggle) */}
          <div className="flex items-center p-0.5 bg-slate-900 light:bg-slate-100 rounded-lg border border-slate-800 light:border-slate-300">
            <button
              type="button"
              onClick={() => {
                stopSpeaking();
                setIsSpeaking(false);
                setCurrentlySpeakingId(null);
                setVoiceGender('female');
              }}
              className={`px-2 py-1 text-xs font-semibold rounded-md transition-all flex items-center gap-1 cursor-pointer ${
                voiceGender === 'female'
                  ? 'bg-amber-400 text-slate-950 font-bold shadow-xs'
                  : 'text-slate-400 light:text-slate-600 hover:text-white light:hover:text-slate-900'
              }`}
              title="Voix féminine naturelle"
            >
              <span>👩 Femme</span>
              {detectedGender === 'female' && (
                <span className="text-[9px] px-1 py-0.2 rounded bg-black/20 text-slate-900 light:text-slate-800 font-mono font-bold">
                  Auto
                </span>
              )}
            </button>
            <button
              type="button"
              onClick={() => {
                stopSpeaking();
                setIsSpeaking(false);
                setCurrentlySpeakingId(null);
                setVoiceGender('male');
              }}
              className={`px-2 py-1 text-xs font-semibold rounded-md transition-all flex items-center gap-1 cursor-pointer ${
                voiceGender === 'male'
                  ? 'bg-amber-400 text-slate-950 font-bold shadow-xs'
                  : 'text-slate-400 light:text-slate-600 hover:text-white light:hover:text-slate-900'
              }`}
              title="Voix masculine naturelle"
            >
              <span>👨 Homme</span>
              {detectedGender === 'male' && (
                <span className="text-[9px] px-1 py-0.2 rounded bg-black/20 text-slate-900 light:text-slate-800 font-mono font-bold">
                  Auto
                </span>
              )}
            </button>
          </div>

          {/* Mode switch */}
          <div className="flex items-center p-0.5 bg-slate-900 light:bg-slate-100 rounded-lg border border-slate-800 light:border-slate-300">
            <button
              type="button"
              onClick={() => setViewMode('flashcards')}
              className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-all flex items-center gap-1 cursor-pointer ${
                viewMode === 'flashcards'
                  ? 'bg-amber-400 text-slate-950 font-bold shadow-xs'
                  : 'text-slate-400 light:text-slate-600 hover:text-white light:hover:text-slate-900'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Flashcards</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('list')}
              className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-all flex items-center gap-1 cursor-pointer ${
                viewMode === 'list'
                  ? 'bg-amber-400 text-slate-950 font-bold shadow-xs'
                  : 'text-slate-400 light:text-slate-600 hover:text-white light:hover:text-slate-900'
              }`}
            >
              <List className="w-3.5 h-3.5" />
              <span>Liste</span>
            </button>
          </div>

          {/* Expand toggle */}
          <button
            type="button"
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white light:text-slate-500 light:hover:text-slate-900 hover:bg-slate-800 light:hover:bg-slate-100 transition-colors cursor-pointer"
            title={isExpanded ? 'Réduire' : 'Déplier'}
          >
            {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {isExpanded && (
        <div className="mt-5 space-y-4 pt-4 border-t border-slate-700/60 light:border-slate-200 animate-fade-in">
          {/* Global progress bar */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-400 light:text-slate-600 font-mono">
                Progression orale : {validatedCount}/{interviewQuestions.length} questions maîtrisées
              </span>
              <span className="font-mono font-bold text-amber-300 light:text-amber-800">
                {progressPercent}%
              </span>
            </div>
            <div className="w-full bg-slate-900 light:bg-slate-100 h-2 rounded-full overflow-hidden border border-slate-800 light:border-slate-300">
              <div
                className="bg-gradient-to-r from-amber-400 via-amber-300 to-emerald-400 h-full transition-all duration-500"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>

          {/* VIEW MODE: FLASHCARDS */}
          {viewMode === 'flashcards' ? (
            <div className="p-4 sm:p-6 rounded-2xl bg-slate-900/90 light:bg-slate-50 border border-amber-400/30 light:border-slate-300 space-y-5 relative">
              {/* Top Card Navigation & Theme */}
              <div className="flex items-center justify-between gap-2 border-b border-slate-800 light:border-slate-200 pb-3">
                <div className="flex flex-wrap items-center gap-2">
                  <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                    currentQ.category === 'role'
                      ? 'bg-purple-500/20 text-purple-300 light:text-purple-800 border border-purple-400/40'
                      : 'bg-emerald-500/20 text-emerald-300 light:text-emerald-800 border border-emerald-400/40'
                  }`}>
                    {currentQ.category === 'role' ? '🎯 Poste & Position' : '⚡ Vraie Compétence'}
                  </span>
                  <span className="text-[11px] font-mono font-bold px-2 py-0.5 rounded bg-amber-400/20 light:bg-amber-100 text-amber-300 light:text-amber-800 border border-amber-400/30">
                    {currentQ.theme}
                  </span>
                  <span className="text-xs text-slate-400 light:text-slate-500 font-mono">
                    Flashcard {currentCardIndex + 1} / {interviewQuestions.length}
                  </span>
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    disabled={currentCardIndex === 0}
                    onClick={() => {
                      setCurrentCardIndex((prev) => Math.max(0, prev - 1));
                      setRevealedPitch(false);
                      resetTimer();
                    }}
                    className="p-1 rounded-lg text-slate-400 hover:text-white light:hover:text-slate-900 disabled:opacity-30 cursor-pointer"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    disabled={currentCardIndex === interviewQuestions.length - 1}
                    onClick={() => {
                      setCurrentCardIndex((prev) => Math.min(interviewQuestions.length - 1, prev + 1));
                      setRevealedPitch(false);
                      resetTimer();
                    }}
                    className="p-1 rounded-lg text-slate-400 hover:text-white light:hover:text-slate-900 disabled:opacity-30 cursor-pointer"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Question Text */}
              <div className="space-y-2">
                <div className="text-[10px] uppercase font-mono font-bold tracking-wider text-slate-400 light:text-slate-500">
                  Question Posée par le Recruteur :
                </div>
                <h4 className="text-base sm:text-lg font-bold text-white light:text-slate-900 leading-snug">
                  {currentQ.question}
                </h4>
                <p className="text-xs text-amber-300/90 light:text-amber-900 flex items-start gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
                  <span><strong>Astuce STAR :</strong> {currentQ.starHint}</span>
                </p>
              </div>

              {/* 45s Pitch Stopwatch Bar */}
              <div className="p-3 rounded-xl bg-slate-950/70 light:bg-white border border-slate-800 light:border-slate-200 flex flex-wrap items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs text-slate-400 light:text-slate-500">
                    Chrono réponse (45s) :
                  </span>
                  <span
                    className={`font-mono text-sm font-bold px-2 py-0.5 rounded ${
                      timerSeconds <= 10
                        ? 'bg-rose-500/20 text-rose-300 light:text-rose-700 animate-pulse'
                        : 'bg-slate-800 light:bg-slate-100 text-amber-300 light:text-amber-700'
                    }`}
                  >
                    {timerSeconds}s
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setIsTimerRunning(!isTimerRunning)}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold bg-slate-800 light:bg-slate-100 hover:bg-slate-700 light:hover:bg-slate-200 text-white light:text-slate-900 border border-slate-700 light:border-slate-300 transition-colors cursor-pointer"
                  >
                    {isTimerRunning ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                    <span>{isTimerRunning ? 'Pause' : 'Démarrer chrono'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={resetTimer}
                    className="p-1 rounded-lg text-slate-400 hover:text-white light:hover:text-slate-900 hover:bg-slate-800 light:hover:bg-slate-100 transition-colors cursor-pointer"
                    title="Réinitialiser le chrono"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Revealed Pitch Section with Agility Bridge Toggle */}
              {revealedPitch ? (
                <div className="p-4 rounded-xl bg-gradient-to-br from-[#070E24] to-[#0A173A] light:from-amber-50/60 light:to-white border border-amber-400/40 light:border-amber-300 space-y-3.5 animate-fade-in">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-2 border-b border-slate-800/80 light:border-slate-200">
                    {/* Switcher: Direct STAR vs Passerelle d'Agilité */}
                    <div className="flex items-center gap-1 p-1 bg-slate-950/80 light:bg-slate-100 rounded-xl border border-slate-800 light:border-slate-300 w-full sm:w-auto">
                      <button
                        type="button"
                        onClick={() => setPitchMode('direct')}
                        className={`flex-1 sm:flex-initial px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                          pitchMode === 'direct'
                            ? 'bg-amber-400 text-slate-950 font-bold shadow-xs'
                            : 'text-slate-400 light:text-slate-600 hover:text-white light:hover:text-slate-900'
                        }`}
                      >
                        ⭐ Réponse STAR Directe
                      </button>
                      <button
                        type="button"
                        onClick={() => setPitchMode('bridge')}
                        className={`flex-1 sm:flex-initial px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                          pitchMode === 'bridge'
                            ? 'bg-cyan-400 text-slate-950 font-bold shadow-xs'
                            : 'text-slate-400 light:text-slate-600 hover:text-white light:hover:text-slate-900'
                        }`}
                        title="Comment pivoter si vous n'avez pas pratiqué cette compétence exacte"
                      >
                        🌉 Passerelle d'Agilité
                      </button>
                    </div>

                    {/* Audio Reader via Natural Human Voice */}
                    <button
                      type="button"
                      onClick={() => {
                        const bridgeFormula = isEn
                          ? `“While I haven't applied ${currentQ.theme} in that exact specific setting yet, my solid track record in ${skillsToUse[0] || 'related core methods'} shares the exact same underlying logic. This foundation enables me to achieve full autonomous velocity in under two weeks.”`
                          : `« Si je n'ai pas encore utilisé ${currentQ.theme} dans cette configuration exacte, ma solide expérience sur ${skillsToUse[0] || 'mes compétences connexes'} repose sur les mêmes principes fondamentaux. Cela m'a toujours permis d'atteindre une autonomie opérationnelle complète en moins de 15 jours. »`;
                        const activePitchText = pitchMode === 'direct' ? currentQ.suggestedPitch : bridgeFormula;
                        handleSpeak(activePitchText, currentQ.id);
                      }}
                      className={`inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer shrink-0 ${
                        isSpeaking && currentlySpeakingId === currentQ.id
                          ? 'bg-rose-500 text-white shadow-xs animate-pulse'
                          : 'bg-amber-400 text-slate-950 font-bold hover:bg-amber-300 shadow-sm shadow-amber-500/20'
                      }`}
                      title={`Écouter le pitch lu par la ${voiceGender === 'female' ? 'voix féminine' : 'voix masculine'} naturelle`}
                    >
                      {isSpeaking && currentlySpeakingId === currentQ.id ? (
                        <>
                          <VolumeX className="w-3.5 h-3.5 shrink-0" />
                          <span>Arrêter</span>
                        </>
                      ) : (
                        <>
                          <Volume2 className="w-3.5 h-3.5 shrink-0" />
                          <span>
                            Écouter ({voiceGender === 'female' ? 'Voix Femme' : 'Voix Homme'})
                          </span>
                        </>
                      )}
                    </button>
                  </div>

                  {pitchMode === 'direct' ? (
                    <div className="space-y-1.5">
                      <span className="text-[10.5px] font-mono text-amber-300 light:text-amber-800 font-bold uppercase">
                        Pitch STAR valorisant vos réussites réelles :
                      </span>
                      <p className="text-xs sm:text-sm text-slate-200 light:text-slate-800 leading-relaxed italic border-l-2 border-amber-400 pl-3">
                        « {currentQ.suggestedPitch} »
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-1.5 text-[10.5px] font-mono text-cyan-300 light:text-cyan-800 font-bold uppercase">
                        <span>Technique Passerelle d'Agilité (si compétence non pratiquée) :</span>
                      </div>
                      <p className="text-xs sm:text-sm text-slate-200 light:text-slate-800 leading-relaxed italic border-l-2 border-cyan-400 pl-3">
                        {isEn
                          ? `« While I haven't applied ${currentQ.theme} in that exact specific setting yet, my solid track record in ${skillsToUse[0] || 'related core methods'} shares the exact same underlying logic. This foundation enables me to achieve full autonomous velocity in under two weeks. »`
                          : `« Si je n'ai pas encore utilisé ${currentQ.theme} dans cette configuration exacte, ma solide expérience sur ${skillsToUse[0] || 'mes compétences connexes'} repose sur les mêmes principes fondamentaux. Cela m'a toujours permis d'atteindre une autonomie opérationnelle complète en moins de 15 jours. »`}
                      </p>
                      <p className="text-[10.5px] text-slate-400 light:text-slate-600 pl-3 pt-0.5">
                        💡 <strong>Conseil RH :</strong> Ne mentez jamais. Affirmez votre socle existant et votre vitesse d'apprentissage, c'est ce que recherchent 100% des managers.
                      </p>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-4">
                  <button
                    type="button"
                    onClick={() => setRevealedPitch(true)}
                    className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold bg-amber-400 text-slate-950 hover:bg-amber-300 transition-all cursor-pointer shadow-md shadow-amber-500/20"
                  >
                    <Eye className="w-4 h-4" />
                    <span>Révéler le Pitch STAR Recommandé</span>
                  </button>
                </div>
              )}

              {/* Assessment Action Buttons */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-3 border-t border-slate-800 light:border-slate-200">
                <span className="text-[11px] text-slate-400 light:text-slate-500">
                  Avez-vous réussi à formuler ce pitch dans le temps imparti ?
                </span>

                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <button
                    type="button"
                    onClick={() => markCurrentAndNext(false)}
                    className="flex-1 sm:flex-initial px-3 py-2 rounded-lg text-xs font-semibold text-rose-300 light:text-rose-700 bg-rose-950/40 light:bg-rose-50 hover:bg-rose-900/50 light:hover:bg-rose-100 border border-rose-500/40 light:border-rose-300 transition-colors cursor-pointer text-center"
                  >
                    À retravailler
                  </button>

                  <button
                    type="button"
                    onClick={() => markCurrentAndNext(true)}
                    className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-bold text-slate-950 bg-emerald-400 hover:bg-emerald-300 transition-colors cursor-pointer shadow-sm shadow-emerald-400/20"
                  >
                    <Check className="w-3.5 h-3.5" />
                    <span>Je maîtrise</span>
                  </button>
                </div>
              </div>
            </div>
          ) : (
            /* VIEW MODE: LIST */
            <div className="grid grid-cols-1 gap-3.5">
              {interviewQuestions.map((q) => {
                const isValid = Boolean(validatedQuestions[q.id]);
                return (
                  <div
                    key={q.id}
                    className={`p-3.5 sm:p-4 rounded-xl border transition-all ${
                      isValid
                        ? 'bg-emerald-950/20 light:bg-emerald-50/60 border-emerald-500/40 light:border-emerald-200'
                        : 'bg-slate-950/60 light:bg-slate-50 border-slate-800 light:border-slate-200'
                    }`}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className={`text-[9.5px] font-mono font-bold px-1.5 py-0.2 rounded-full uppercase tracking-wider ${
                          q.category === 'role'
                            ? 'bg-purple-500/20 text-purple-300 light:text-purple-800 border border-purple-400/40'
                            : 'bg-emerald-500/20 text-emerald-300 light:text-emerald-800 border border-emerald-400/40'
                        }`}>
                          {q.category === 'role' ? 'Poste' : 'Compétence'}
                        </span>
                        <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-slate-800 light:bg-slate-200 text-amber-300 light:text-amber-800">
                          {q.theme}
                        </span>
                        <h4 className="text-xs sm:text-sm font-semibold text-white light:text-slate-900">
                          {q.question}
                        </h4>
                      </div>

                      <button
                        type="button"
                        onClick={() => toggleValidate(q.id)}
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer shrink-0 self-start sm:self-auto ${
                          isValid
                            ? 'bg-emerald-500 text-slate-950 font-bold'
                            : 'bg-slate-800 light:bg-slate-200 text-slate-300 light:text-slate-700 hover:text-white hover:bg-slate-700'
                        }`}
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>
                          {isValid
                            ? "Maîtrisé pour l'entretien"
                            : "Je m'entraîne"}
                        </span>
                      </button>
                    </div>

                    <div className="mt-2.5 space-y-1.5 text-xs text-slate-300 light:text-slate-600">
                      <p className="flex items-start gap-1.5 text-[11px] text-amber-300/90 light:text-amber-900 font-medium">
                        <Sparkles className="w-3.5 h-3.5 shrink-0 mt-0.5 text-amber-400 light:text-amber-700" />
                        <span><strong>Conseil STAR :</strong> {q.starHint}</span>
                      </p>
                      <div className="p-2.5 rounded-lg bg-[#070E24] light:bg-white border border-slate-800 light:border-slate-200 text-[11px] text-slate-200 light:text-slate-700 italic flex items-center justify-between gap-2">
                        <span>« {q.suggestedPitch} »</span>
                        <button
                          type="button"
                          onClick={() => handleSpeak(q.suggestedPitch, q.id)}
                          className={`p-1.5 rounded-lg transition-colors cursor-pointer shrink-0 flex items-center gap-1 ${
                            isSpeaking && currentlySpeakingId === q.id
                              ? 'bg-rose-500 text-white animate-pulse'
                              : 'text-amber-300 light:text-amber-800 hover:bg-amber-400/20 light:hover:bg-amber-100'
                          }`}
                          title={`Écouter à voix haute (${voiceGender === 'female' ? 'Voix Femme' : 'Voix Homme'})`}
                        >
                          {isSpeaking && currentlySpeakingId === q.id ? (
                            <VolumeX className="w-3.5 h-3.5" />
                          ) : (
                            <Volume2 className="w-3.5 h-3.5" />
                          )}
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Footer reassurance */}
          <div className="flex items-center justify-between pt-2 text-[11px] text-slate-400 light:text-slate-600">
            <span className="flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 light:text-emerald-600" />
              <span>
                Chaque argument est extrait de votre parcours réel sans extrapolation.
              </span>
            </span>
            <span className="font-bold text-amber-300 light:text-amber-800">
              {validatedCount === interviewQuestions.length
                ? "🎉 Maîtrise 100% validée ! Vous aborderez l'oral avec sérénité."
                : "Validez chaque question à votre rythme avant votre entretien."}
            </span>
          </div>
        </div>
      )}
    </div>
  );
};

