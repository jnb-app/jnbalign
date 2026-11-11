/**
 * Utilitaire de détection et gestion bilingue (Français / Anglais).
 * Détecte si un texte d'offre ou de CV est rédigé en anglais ou en français
 * grâce aux mots fonctionnels, tournures clés et terminologies métiers.
 */

function scoreLanguage(text: string): { enScore: number; frScore: number } {
  if (!text || !text.trim()) return { enScore: 0, frScore: 0 };
  const lower = text.toLowerCase();

  // Mots indicateurs anglais fréquents (mots fonctionnels, prépositions, verbes d'action, termes de recrutement)
  const englishKeywords = [
    '\\bthe\\b', '\\band\\b', '\\bwith\\b', '\\bfor\\b', '\\bfrom\\b', '\\byour\\b',
    '\\bthis\\b', '\\bthat\\b', '\\bhave\\b', '\\bwill\\b', '\\bare\\b', '\\babout us\\b',
    '\\bwe are looking for\\b', '\\bresponsibilities\\b', '\\brequirements\\b',
    '\\bqualifications\\b', '\\bexperience\\b', '\\bteam\\b', '\\brole\\b',
    '\\bskills\\b', '\\bapply\\b', '\\bdescription\\b', '\\bkey duties\\b',
    '\\bwhat you will do\\b', '\\bwhat we offer\\b', '\\bwork\\b', '\\byears of\\b',
    '\\bof\\b', '\\bin\\b', '\\bto\\b', '\\bat\\b', '\\bby\\b', '\\bon\\b', '\\bas\\b',
    '\\ban\\b', '\\bis\\b', '\\bwas\\b', '\\bwere\\b', '\\bmanager\\b', '\\bengineer\\b',
    '\\bdeveloper\\b', '\\blead\\b', '\\bsenior\\b', '\\bdirector\\b', '\\banalyst\\b',
    '\\bproduct\\b', '\\bcustomer\\b', '\\bremote\\b', '\\bbenefits\\b', '\\bstartup\\b',
    '\\bmanaged\\b', '\\bled\\b', '\\bdesigned\\b', '\\bdeveloped\\b', '\\bdelivered\\b',
    '\\bspearheaded\\b', '\\borchestrated\\b', '\\bimplemented\\b', '\\bpresent\\b',
    '\\beducation\\b', '\\bdegree\\b', '\\buniversity\\b', '\\blanguages\\b', '\\baccomplished\\b'
  ];

  // Mots indicateurs français fréquents
  const frenchKeywords = [
    '\\ble\\b', '\\bla\\b', '\\bles\\b', '\\bdes\\b', '\\bdu\\b', '\\bpour\\b',
    '\\bavec\\b', '\\bdans\\b', '\\bsur\\b', '\\bune\\b', '\\bun\\b', '\\bqui\\b',
    '\\bque\\b', '\\bvous\\b', '\\bnous\\b', '\\bnotre\\b', '\\bvotre\\b', '\\bposte\\b',
    '\\bprofil\\b', '\\bmissions\\b', '\\bcompétences\\b', '\\bcompetences\\b',
    '\\bentreprise\\b', '\\brecherche\\b', '\\brecherchons\\b', '\\bcandidat\\b',
    '\\bexpérience\\b', '\\bexperience\\b', '\\bcandidature\\b', '\\bà propos\\b',
    '\\bce que nous\\b', '\\ben\\b', '\\bà\\b', '\\bau\\b', '\\baux\\b', '\\bpar\\b',
    '\\bsous\\b', '\\bchez\\b', '\\bet\\b', '\\bou\\b', '\\best\\b', '\\bsont\\b',
    '\\bprésent\\b', '\\bactuel\\b', '\\bformation\\b', '\\bdiplôme\\b',
    '\\buniversité\\b', '\\blangues\\b', '\\bgestion\\b', '\\bchef\\b',
    '\\bingénieur\\b', '\\bdéveloppeur\\b', '\\bresponsable\\b', '\\bdirecteur\\b',
    '\\bpiloté\\b', '\\bdéployé\\b', '\\boptimisé\\b', '\\bmené\\b', '\\bcoordonné\\b'
  ];

  let enScore = 0;
  let frScore = 0;

  for (const pattern of englishKeywords) {
    const matches = lower.match(new RegExp(pattern, 'gi'));
    if (matches) enScore += matches.length;
  }

  for (const pattern of frenchKeywords) {
    const matches = lower.match(new RegExp(pattern, 'gi'));
    if (matches) frScore += matches.length;
  }

  return { enScore, frScore };
}

export function detectLanguageFromText(jobText: string, cvText?: string): 'fr' | 'en' {
  // RÈGLE CARDINALE DE RECRUTEMENT INTERNATIONAL :
  // La langue d'une candidature ATS est dictée en priorité ABSOLUE par l'offre d'emploi visée.
  // Si le candidat téléverse un CV en français pour une offre en anglais (ex: LinkedIn),
  // la candidature doit être rédigée à 100% en anglais. Ne JAMAIS laisser le CV français noyer l'offre anglaise.
  if (jobText && jobText.trim().length >= 25) {
    const jobScores = scoreLanguage(jobText);
    if (jobScores.enScore > jobScores.frScore) {
      return 'en';
    }
    if (jobScores.frScore > jobScores.enScore) {
      return 'fr';
    }
  }

  // Si l'offre d'emploi est trop courte ou équivoque, examiner le CV en complément
  if (cvText && cvText.trim().length >= 25) {
    const cvScores = scoreLanguage(cvText);
    if (cvScores.enScore > cvScores.frScore) {
      return 'en';
    }
  }

  return 'fr';
}

export function isEnglishText(text?: string): boolean {
  if (!text) return false;
  return detectLanguageFromText(text) === 'en';
}

/**
 * Détecte avec précision infaillible si un CV ou une analyse est en anglais
 * en agrégeant l'ensemble des textes du CV (résumé, compétences, puces, rôles, etc.).
 */
export function detectCvLanguage(cv?: any, analysis?: any): 'fr' | 'en' {
  if (cv?.languageMode === 'en' || analysis?.languageMode === 'en') {
    return 'en';
  }
  if (cv?.languageMode === 'fr' || analysis?.languageMode === 'fr') {
    return 'fr';
  }

  // Agréger tout le texte significatif du CV
  const textChunks: string[] = [];
  if (cv?.personalInfo?.professionalTitle) textChunks.push(cv.personalInfo.professionalTitle);
  if (cv?.professionalSummary) textChunks.push(cv.professionalSummary);

  if (Array.isArray(cv?.skillsCategories)) {
    for (const cat of cv.skillsCategories) {
      if (cat.categoryName) textChunks.push(cat.categoryName);
      if (Array.isArray(cat.skills)) textChunks.push(cat.skills.join(' '));
    }
  }

  if (Array.isArray(cv?.experiences)) {
    for (const exp of cv.experiences) {
      if (exp.role) textChunks.push(exp.role);
      if (exp.company) textChunks.push(exp.company);
      if (Array.isArray(exp.bullets)) textChunks.push(exp.bullets.join(' '));
    }
  }

  if (Array.isArray(cv?.education)) {
    for (const edu of cv.education) {
      if (edu.degree) textChunks.push(edu.degree);
      if (edu.field) textChunks.push(edu.field);
    }
  }

  if (analysis?.jobOverview?.title) textChunks.push(analysis.jobOverview.title);
  if (analysis?.jobOverview?.summary) textChunks.push(analysis.jobOverview.summary);

  const fullText = textChunks.join(' ');
  if (!fullText.trim()) return 'fr';

  return detectLanguageFromText(fullText);
}
