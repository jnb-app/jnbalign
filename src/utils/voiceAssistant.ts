/**
 * Intelligent voice assistant for interview pitch simulation.
 * - Strict gender matching: ensures male voice for male selection, female voice for female selection (FR & EN).
 * - Humanized acoustics: optimizes pitch, rate, and breath pauses to eliminate robotic drone.
 * - Phonetic optimization: articulates acronyms (A.T.S, S.T.A.R, K.P.I) naturally.
 */

export type VoiceGender = 'female' | 'male';

const FEMALE_FIRST_NAMES = new Set([
  'marie', 'sophie', 'camille', 'julie', 'sarah', 'emma', 'lea', 'léa', 'manon', 'chloe', 'chloé',
  'pauline', 'laura', 'marine', 'clara', 'marion', 'aurelie', 'aurélie', 'elodie', 'élodie',
  'emilie', 'émilie', 'celine', 'céline', 'virginie', 'anne', 'claire', 'helene', 'hélène',
  'isabelle', 'nathalie', 'sandrine', 'christelle', 'valerie', 'valérie', 'delphine', 'jessica',
  'jennifer', 'charlotte', 'mathilde', 'justine', 'ines', 'inès', 'alice', 'lucie', 'caroline',
  'stephanie', 'stéphanie', 'audrey', 'morgane', 'anaïs', 'anais', 'fanny', 'melanie', 'mélanie',
  'oceane', 'océane', 'elise', 'élise', 'charlene', 'charlène', 'florence', 'cindy', 'solene',
  'solène', 'amélie', 'amelie', 'fatima', 'khadija', 'amina', 'yasmina', 'samira', 'leila',
  'leïla', 'asma', 'yasmine', 'elena', 'élena', 'anna', 'maria', 'patricia', 'corinne',
  'christine', 'monique', 'martine', 'brigitte', 'catherine', 'sylvie', 'francoise', 'françoise',
  'nicole', 'jacqueline', 'beatrice', 'béatrice', 'laurence', 'veronique', 'véronique',
  'dominique', 'genevieve', 'geneviève', 'chantal', 'michele', 'michèle', 'danielle', 'joelle',
  'joëlle', 'eliane', 'éliane', 'pascale', 'maryse', 'regine', 'régine', 'josiane', 'evelyne',
  'évelyne', 'colette', 'annick', 'nadine', 'claudine', 'lucile', 'alix', 'diane', 'estelle',
  // Common Anglo-Saxon female first names
  'mary', 'jennifer', 'linda', 'elizabeth', 'barbara', 'susan', 'jessica', 'sarah', 'karen',
  'lisa', 'nancy', 'betty', 'margaret', 'sandra', 'ashley', 'dorothy', 'kimberly', 'emily',
  'donna', 'michelle', 'carol', 'amanda', 'melissa', 'deborah', 'stephanie', 'rebecca', 'sharon',
  'laura', 'cynthia', 'kathleen', 'amy', 'angela', 'shirley', 'anna', 'brenda', 'pamela', 'nicole',
  'samantha', 'katherine', 'christine', 'helen', 'rachel', 'carolyn', 'janet', 'maria', 'heather',
  'diane', 'julie', 'joyce', 'victoria', 'kelly', 'christina', 'lauren', 'joan', 'evelyn', 'olivia',
  'judith', 'megan', 'cheryl', 'andrea', 'hannah', 'martha', 'jacqueline', 'frances', 'gloria',
  'ann', 'teresa', 'kathryn', 'sara', 'janice', 'jean', 'alice', 'madison', 'doris', 'abigail',
  'julia', 'judy', 'grace', 'denise', 'amber', 'marilyn', 'beverly', 'danielle', 'theresa', 'sophia'
]);

/**
 * Detects candidate gender based on their full name.
 */
export function detectCandidateGender(fullName?: string): VoiceGender {
  if (!fullName) return 'male';

  const cleaned = fullName.trim().toLowerCase();
  
  if (/\b(mme|madame|mrs|ms|miss)\b/i.test(cleaned)) {
    return 'female';
  }
  if (/\b(m\.|mr|monsieur)\b/i.test(cleaned)) {
    return 'male';
  }

  const rawFirstName = cleaned.split(/[\s-]+/)[0] || '';
  const normalized = rawFirstName.normalize("NFD").replace(/[\u0300-\u036f]/g, "");

  if (FEMALE_FIRST_NAMES.has(rawFirstName) || FEMALE_FIRST_NAMES.has(normalized)) {
    return 'female';
  }

  return 'male';
}

/**
 * Cached voices loaded in browser to avoid asynchronous race condition.
 */
let cachedVoices: SpeechSynthesisVoice[] = [];

if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
  const loadVoices = () => {
    try {
      const v = window.speechSynthesis.getVoices();
      if (v && v.length > 0) {
        cachedVoices = v;
      }
    } catch {
      // Ignore
    }
  };
  loadVoices();
  window.speechSynthesis.onvoiceschanged = loadVoices;
}

/**
 * Strict gender voice identifiers across Windows, macOS, iOS, Android, ChromeOS, Linux (FR + EN).
 */
const FEMALE_VOICE_IDENTIFIERS = [
  // French female voices
  'denise', 'julie', 'hortense', 'audrey', 'amelie', 'amélie', 'aurelie', 'aurélie',
  'clara', 'charlotte', 'virginie', 'celine', 'céline', 'harmonie', 'siwis',
  'google français', 'google francais',
  // English female voices (Crucial: Google US English is female!)
  'google us english', 'google us english female', 'google uk english female',
  'zira', 'samantha', 'victoria', 'karen', 'fiona', 'moira', 'alice', 'tessa',
  'hazel', 'susan', 'cynthia', 'jenny', 'aria', 'ava', 'emma', 'stephanie',
  'serena', 'allison', 'kate', 'veena', 'joanna', 'salli', 'ivy', 'kendra', 'kimberly',
  // Android Google Speech Services female models
  '-fra-', '-frc-', '-sfg-', '-iom-', 'voice 1', 'voice i', 'voice 3',
  // Generic female tokens
  'female', 'femme', 'woman', 'girl'
];

const MALE_VOICE_IDENTIFIERS = [
  // French male voices
  'henri', 'paul', 'claude', 'thomas', 'nicolas', 'alain', 'antoine', 'bruno',
  'mathieu', 'bernard', 'jean', 'pierre', 'louis', 'francois', 'françois',
  'luc', 'philippe', 'michel', 'olivier', 'charles', 'sébastien', 'sebastien',
  // English male voices
  'google uk english male', 'david', 'mark', 'george', 'georges', 'guy', 'ryan',
  'christopher', 'eric', 'brian', 'alex', 'fred', 'tom', 'oliver', 'arthur', 'aaron',
  'daniel', 'matthew', 'richard', 'james', 'michael', 'william', 'joey', 'justin', 'kevin',
  // Android Google Speech Services male models
  '-frd-', '-frb-', '-tpd-', '-iol-', '-rjs-', 'voice 2', 'voice ii', 'voice 4',
  // Generic male tokens
  'male', 'homme', 'man', 'boy'
];

/**
 * Helper to match keywords as whole words or multi-word phrases,
 * preventing false positives like 'man' matching 'samantha' or 'german',
 * 'luc' matching 'lucie', or 'jean' matching 'jeanne'.
 */
function matchesWordOrPhrase(name: string, keyword: string): boolean {
  const lowerName = name.toLowerCase();
  const lowerKw = keyword.toLowerCase();
  if (lowerKw.includes(' ') || lowerKw.includes('-')) {
    return lowerName.includes(lowerKw);
  }
  const regex = new RegExp(`(^|[^a-zA-Z0-9àâäéèêëîïôöùûüç])${lowerKw}([^a-zA-Z0-9àâäéèêëîïôöùûüç]|$)`, 'i');
  return regex.test(lowerName);
}

export function isVoiceFemale(voiceName: string): boolean {
  const n = voiceName.toLowerCase();
  if (n.includes('google uk english male')) return false;
  return FEMALE_VOICE_IDENTIFIERS.some((keyword) => matchesWordOrPhrase(n, keyword));
}

export function isVoiceMale(voiceName: string): boolean {
  const n = voiceName.toLowerCase();
  // Ensure we don't accidentally match 'male' when the word is 'female'
  if (matchesWordOrPhrase(n, 'female') || isVoiceFemale(n)) {
    return false;
  }
  return MALE_VOICE_IDENTIFIERS.some((keyword) => matchesWordOrPhrase(n, keyword));
}

/**
 * Retrieves the best natural voice strictly conforming to the requested gender & language.
 */
export function getBestNaturalVoice(
  gender: VoiceGender,
  language: 'fr' | 'en' = 'fr'
): SpeechSynthesisVoice | null {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
    return null;
  }

  let allVoices = window.speechSynthesis.getVoices();
  if (!allVoices || allVoices.length === 0) {
    allVoices = cachedVoices;
  }
  if (!allVoices || allVoices.length === 0) {
    return null;
  }

  const langPrefix = language === 'en' ? 'en' : 'fr';
  const matchingLangVoices = allVoices.filter((v) =>
    v.lang.toLowerCase().startsWith(langPrefix)
  );

  const voicePool = matchingLangVoices.length > 0 ? matchingLangVoices : allVoices;

  // 1. First priority: Find voices that STRICTLY match the gender
  const strictGenderMatches = voicePool.filter((v) => {
    const name = v.name.toLowerCase();
    if (gender === 'male') {
      return isVoiceMale(name) && !isVoiceFemale(name);
    } else {
      return isVoiceFemale(name) && !isVoiceMale(name);
    }
  });

  if (strictGenderMatches.length > 0) {
    // Rank among strict matches (prefer neural / natural / local)
    strictGenderMatches.sort((a, b) => {
      let scoreA = 0;
      let scoreB = 0;
      const nameA = a.name.toLowerCase();
      const nameB = b.name.toLowerCase();

      if (nameA.includes('google uk english male')) scoreA += 500;
      if (nameB.includes('google uk english male')) scoreB += 500;

      if (nameA.includes('natural')) scoreA += 100;
      if (nameB.includes('natural')) scoreB += 100;

      if (nameA.includes('premium') || nameA.includes('enhanced')) scoreA += 80;
      if (nameB.includes('premium') || nameB.includes('enhanced')) scoreB += 80;

      if (nameA.includes('google')) scoreA += 40;
      if (nameB.includes('google')) scoreB += 40;

      return scoreB - scoreA;
    });

    return strictGenderMatches[0];
  }

  // 2. If no strict match in target language and gender is male, check ALL browser voices for ANY male voice
  if (gender === 'male') {
    const anyMaleVoices = allVoices.filter((v) => isVoiceMale(v.name.toLowerCase()) && !isVoiceFemale(v.name.toLowerCase()));
    if (anyMaleVoices.length > 0) {
      // Find the one closest to the target language (e.g. English male voice if language is English)
      const langMatch = anyMaleVoices.find((v) => v.lang.toLowerCase().startsWith(langPrefix));
      if (langMatch) return langMatch;
      // Or English male voice if on Chrome
      const googleUkMale = anyMaleVoices.find((v) => v.name.toLowerCase().includes('google uk english male'));
      if (googleUkMale) return googleUkMale;
      return anyMaleVoices[0];
    }
  }

  // 3. Fallback to scoring
  const scoredVoices = voicePool.map((voice) => {
    let score = 0;
    const name = voice.name.toLowerCase();

    const isF = isVoiceFemale(name);
    const isM = isVoiceMale(name);

    if (gender === 'female') {
      if (isF) score += 2000;
      if (isM) score -= 5000;
    } else {
      if (isM) score += 2000;
      if (isF) score -= 5000;
    }

    if (name.includes('google uk english male')) score += 1000;
    if (name.includes('natural')) score += 100;
    if (name.includes('premium')) score += 90;

    return { voice, score };
  });

  scoredVoices.sort((a, b) => b.score - a.score);
  return scoredVoices[0]?.voice || voicePool[0];
}

/**
 * Pre-processes pitch text to replace mechanical robot reading with natural human phrasing:
 * - Expands acronyms (ATS, STAR, KPI) into clean phonetics
 * - Replaces quotes and mechanical punctuation
 * - Adds natural breathing pauses at commas and semicolons
 */
export function humanizeSpeechText(rawText: string, language: 'fr' | 'en' = 'fr'): string {
  if (!rawText) return '';

  let text = rawText
    .replace(/[«»"“”]/g, '') // Remove quotation marks that confuse speech engines
    .replace(/\bATS\b/g, 'A.T.S.')
    .replace(/\bSTAR\b/g, 'S.T.A.R.')
    .replace(/\bKPI\b/g, 'K.P.I.')
    .replace(/\bKPIs\b/g, 'K.P.I.s')
    .replace(/\bROI\b/g, 'R.O.I.')
    .replace(/\bex:\s*/gi, language === 'en' ? 'for example, ' : 'par exemple, ')
    .replace(/\bvs\b/gi, language === 'en' ? 'versus' : 'versus')
    .replace(/%/g, language === 'en' ? ' percent' : ' pour cent')
    .replace(/\s*;\s*/g, ', ') // convert semicolons to natural comma pauses
    .replace(/\s*:\s*/g, ', ') // convert colons to natural comma pauses
    .replace(/\s+/g, ' ')
    .trim();

  return text;
}

let activeAudio: HTMLAudioElement | null = null;
let currentSpeechCancel: (() => void) | null = null;

/**
 * Arrête immédiatement toute synthèse en cours (audio distant ou synthèse locale).
 */
export function stopSpeaking() {
  if (currentSpeechCancel) {
    try {
      currentSpeechCancel();
    } catch {
      // Ignore
    }
    currentSpeechCancel = null;
  }
  if (activeAudio) {
    try {
      activeAudio.pause();
      activeAudio.currentTime = 0;
    } catch {
      // Ignore
    }
    activeAudio = null;
  }
  if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
    try {
      window.speechSynthesis.cancel();
    } catch {
      // Ignore
    }
  }
}

/**
 * Synthèse vocale locale native (Web Speech API)
 * Directe, instantanée et non bloquée par les politiques d'autoplay car exécutée lors du clic.
 */
export function playLocalSpeechSynthesis(
  text: string,
  gender: VoiceGender = 'male',
  language: 'fr' | 'en' = 'fr',
  callbacks?: {
    onStart?: () => void;
    onEnd?: () => void;
    onError?: (err?: any) => void;
  },
  options?: {
    style?: 'espresso' | 'pitch';
  }
) {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
    callbacks?.onError?.('Synthèse vocale non supportée');
    return;
  }

  // Débloquer immédiatement la synthèse vocale
  try {
    if (window.speechSynthesis.paused) {
      window.speechSynthesis.resume();
    }
  } catch {
    // Ignorer
  }

  const humanizedText = humanizeSpeechText(text, language);
  const utterance = new SpeechSynthesisUtterance(humanizedText);
  utterance.lang = language === 'en' ? 'en-US' : 'fr-FR';

  const bestVoice = getBestNaturalVoice(gender, language);
  if (bestVoice) {
    utterance.voice = bestVoice;
  }

  const isEspresso = options?.style === 'espresso';

  if (gender === 'male') {
    // Style expresso : timbre grave posé, chaleureux et bien audible (pitch 0.82)
    utterance.pitch = isEspresso ? 0.82 : 0.90;
    utterance.rate = isEspresso ? 0.88 : 0.95;
  } else {
    // Féminin : timbre doux et naturel
    utterance.pitch = isEspresso ? 1.0 : 1.05;
    utterance.rate = isEspresso ? 0.90 : 0.95;
  }

  utterance.volume = 1.0;

  // Empêcher le garbage collection prématuré sur Chromium/Safari
  (window as any).__jnbActiveUtterance = utterance;

  // Heartbeat anti-coupure subite (résout le bug natif Web Speech API qui stoppe après 14s)
  const resumeTimer = setInterval(() => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      try {
        if (window.speechSynthesis.speaking) {
          window.speechSynthesis.pause();
          window.speechSynthesis.resume();
        } else {
          clearInterval(resumeTimer);
        }
      } catch {
        clearInterval(resumeTimer);
      }
    } else {
      clearInterval(resumeTimer);
    }
  }, 6000);

  if (callbacks?.onStart) utterance.onstart = () => callbacks.onStart?.();
  utterance.onend = () => {
    clearInterval(resumeTimer);
    (window as any).__jnbActiveUtterance = null;
    callbacks?.onEnd?.();
  };
  utterance.onerror = (e) => {
    clearInterval(resumeTimer);
    (window as any).__jnbActiveUtterance = null;
    callbacks?.onError?.(e);
  };

  try {
    window.speechSynthesis.speak(utterance);
  } catch (err) {
    callbacks?.onError?.(err);
  }
}

/**
 * Lit le pitch ou le spot vidéo avec une voix humaine naturelle ultra-réaliste :
 * - Priorité 1 : Voix studio humaine générée par Gemini TTS (/api/tts)
 *   * Style 'espresso' : timbre grave, velouté, chaleureux (type publicité café haut de gamme Nespresso)
 *   * Style 'pitch' : cadence d'entretien professionnelle
 * - Priorité 2 : Synthèse locale optimisée avec heartbeat anti-coupure
 */
export function speakNaturalPitch(
  text: string,
  gender: VoiceGender,
  language: 'fr' | 'en' = 'fr',
  callbacks?: {
    onStart?: () => void;
    onEnd?: () => void;
    onError?: (err?: any) => void;
  },
  options?: {
    style?: 'espresso' | 'pitch';
  }
): { cancel: () => void; getAudio: () => HTMLAudioElement | null } {
  stopSpeaking();

  let isCancelled = false;

  const cancel = () => {
    isCancelled = true;
    stopSpeaking();
  };

  currentSpeechCancel = cancel;

  // 1. Tenter la voix studio humaine via Gemini TTS (/api/tts)
  fetch('/api/tts', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      text,
      gender,
      language,
      style: options?.style || 'pitch',
    }),
  })
    .then((res) => {
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return res.json();
    })
    .then((data) => {
      if (isCancelled) return;
      if (data.success && data.audioBase64) {
        const audioSrc = `data:${data.mimeType || 'audio/wav'};base64,${data.audioBase64}`;
        const audio = new Audio(audioSrc);
        activeAudio = audio;

        audio.onplay = () => {
          if (!isCancelled) callbacks?.onStart?.();
        };

        audio.onended = () => {
          activeAudio = null;
          if (!isCancelled) callbacks?.onEnd?.();
        };

        audio.onerror = () => {
          activeAudio = null;
          if (!isCancelled) {
            playLocalSpeechSynthesis(text, gender, language, callbacks, options);
          }
        };

        audio.play().catch(() => {
          if (!isCancelled) {
            playLocalSpeechSynthesis(text, gender, language, callbacks, options);
          }
        });
      } else {
        throw new Error('TTS data missing');
      }
    })
    .catch(() => {
      if (!isCancelled) {
        playLocalSpeechSynthesis(text, gender, language, callbacks, options);
      }
    });

  return { cancel, getAudio: () => activeAudio };
}
