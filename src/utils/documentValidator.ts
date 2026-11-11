// Garde-fous sémantiques et classificateur de conformité documentaire (CV vs Offre vs Cours/Actualités/Politique)

export interface DocumentValidationResult {
  isValid: boolean;
  error?: string;
  detectedType?: 'cv' | 'job_offer' | 'academic_course' | 'political_article' | 'news_article' | 'invoice' | 'recipe' | 'unknown';
  detectedTitle?: string;
}

// 1. Marqueurs caractéristiques d'un support de cours, syllabus académique, slide deck ou manuel
const ACADEMIC_COURSE_REGEXES: { regex: RegExp; label: string }[] = [
  { regex: /(?<![\p{L}\p{N}])(?:course\s+syllabus|syllabus\s+du\s+cours|syllabus)(?![\p{L}\p{N}])/iu, label: 'Syllabus de cours' },
  { regex: /(?<![\p{L}\p{N}])(?:course\s+outline|plan\s+du\s+cours|sommaire\s+du\s+cours)(?![\p{L}\p{N}])/iu, label: 'Plan de cours' },
  { regex: /(?<![\p{L}\p{N}])(?:course\s+overview|course\s+objectives|objectifs\s+p[ée]dagogiques|objectifs\s+d['’]apprentissage)(?![\p{L}\p{N}])/iu, label: 'Objectifs de cours' },
  { regex: /(?<![\p{L}\p{N}])(?:course\s+description|description\s+du\s+cours|descriptif\s+de\s+l['’]enseignement)(?![\p{L}\p{N}])/iu, label: 'Descriptif de cours' },
  { regex: /(?<![\p{L}\p{N}])(?:course\s+schedule|calendrier\s+des\s+cours|emploi\s+du\s+temps)(?![\p{L}\p{N}])/iu, label: 'Calendrier académique' },
  { regex: /(?<![\p{L}\p{N}])(?:learning\s+outcomes|student\s+learning\s+outcomes|intended\s+learning\s+outcomes)(?![\p{L}\p{N}])/iu, label: 'Acquis d\'apprentissage' },
  { regex: /(?<![\p{L}\p{N}])(?:grading\s+policy|grading\s+criteria|grading\s+scheme|bar[èe]me\s+de\s+notation|modalit[ée]s\s+d['’][ée]valuation)(?![\p{L}\p{N}])/iu, label: 'Critères de notation' },
  { regex: /(?<![\p{L}\p{N}])(?:midterm\s+exam|midterm\s+examination|examen\s+partiel|contr[ôo]le\s+continu)(?![\p{L}\p{N}])/iu, label: 'Examen partiel' },
  { regex: /(?<![\p{L}\p{N}])(?:final\s+exam|final\s+examination|examen\s+final|devoir\s+sur\s+table)(?![\p{L}\p{N}])/iu, label: 'Examen final' },
  { regex: /(?<![\p{L}\p{N}])(?:quizzes|quiz\s+\d+|interrogation\s+[ée]crite)(?![\p{L}\p{N}])/iu, label: 'Quiz / Test' },
  { regex: /(?<![\p{L}\p{N}])(?:homework\s+assignments?|devoirs?\s+maison|tp\s+not[ée])(?![\p{L}\p{N}])/iu, label: 'Devoirs académiques' },
  { regex: /(?<![\p{L}\p{N}])(?:lab\s+manual|lab\s+exercise|travaux\s+pratiques|travaux\s+dirig[ée]s)(?![\p{L}\p{N}])/iu, label: 'Travaux pratiques (TP/TD)' },
  { regex: /(?<![\p{L}\p{N}])(?:office\s+hours|permanence\s+de\s+l['’]enseignant)(?![\p{L}\p{N}])/iu, label: 'Permanence enseignant' },
  { regex: /(?<![\p{L}\p{N}])(?:teaching\s+assistant|assistant\s+d['’]enseignement|charg[ée]\s+de\s+td)(?![\p{L}\p{N}])/iu, label: 'Assistant d\'enseignement' },
  { regex: /(?<![\p{L}\p{N}])(?:instructor|professor|professeur|enseignant\(e\)?\s+responsable)\s*:\s*[A-Z]/iu, label: 'Enseignant responsable' },
  { regex: /(?<![\p{L}\p{N}])(?:textbook|required\s+textbook|manuel\s+obligatoire|bibliographie\s+du\s+cours)(?![\p{L}\p{N}])/iu, label: 'Manuel académique' },
  { regex: /(?<![\p{L}\p{N}])(?:academic\s+integrity|plagiarism\s+policy|charte\s+anti-plagiat)(?![\p{L}\p{N}])/iu, label: 'Charte académique' },
  { regex: /(?<![\p{L}\p{N}])(?:course\s+credits?|cr[ée]dits?\s+ects)\s*:\s*\d+/iu, label: 'Crédits ECTS' },
  { regex: /(?<![\p{L}\p{N}])lecture\s+\d+(?![\p{L}\p{N}])/iu, label: 'Numéro de cours (Lecture)' },
  { regex: /(?<![\p{L}\p{N}])module\s+\d+\s*:\s*[A-Za-z]/iu, label: 'Module de cours' },
  { regex: /(?<![\p{L}\p{N}])chapter\s+\d+\s*:\s*[A-Za-z]/iu, label: 'Chapitre de cours' },
  { regex: /(?<![\p{L}\p{N}])chapitre\s+\d+\s*:\s*[A-Za-z]/iu, label: 'Chapitre de cours' },
  { regex: /(?<![\p{L}\p{N}])week\s+\d+\s*:\s*[A-Za-z]/iu, label: 'Semaine de cours' },
  { regex: /(?<![\p{L}\p{N}])introduction\s+to\s+(?:cybersecurity|computer\s+science|programming|networking|cloud\s+computing|machine\s+learning|artificial\s+intelligence|data\s+science|physics|chemistry|biology|philosophy|theology|economics|law|history|sociology|cryptography|information\s+systems|security)(?![\p{L}\p{N}])/iu, label: 'Cours introductif' },
  { regex: /(?<![\p{L}\p{N}])introduction\s+[àa]\s+(?:la|l['’]|au|aux)\s+(?:cybers[ée]curit[ée]|informatique|programmation|r[ée]seaux|cloud|intelligence\s+artificielle|science\s+des\s+donn[ée]es|physique|chimie|biologie|philosophie|th[ée]ologie|[ée]conomie|droit|gestion)(?![\p{L}\p{N}])/iu, label: 'Cours introductif' },
  { regex: /(?<![\p{L}\p{N}])cours\s+de\s+(?:th[ée]ologie|cybers[ée]curit[ée]|programmation|droit|gestion|comptabilit[ée]|math[ée]matiques?|physique|r[ée]seaux|syst[èe]mes)(?![\p{L}\p{N}])/iu, label: 'Support de cours' },
  { regex: /(?<![\p{L}\p{N}])(?:ex[ée]g[èe]se\s+biblique|th[ée]ologie\s+dogmatique|th[ée]ologie\s+syst[ée]matique|christologie|eccl[ée]siologie|sot[ée]riologie|patristique|eschatologie|nouveau\s+testament|ancien\s+testament)(?![\p{L}\p{N}])/iu, label: 'Théologie' },
];

// 2. Marqueurs de politique / élections / actualités journalistiques (Non-recrutement)
const POLITICAL_NEWS_REGEXES: RegExp[] = [
  /(?<![\p{L}\p{N}])(?:[ée]lections?|scrutin|suffrage\s+universel|campagne\s+[ée]lectorale|bulletin\s+de\s+vote|urne|isoloir)(?![\p{L}\p{N}])/iu,
  /(?<![\p{L}\p{N}])(?:[ée]lection\s+pr[ée]sidentielle|[ée]lections\s+l[ée]gislatives|[ée]lections\s+municipales|[ée]lections\s+europ[ée]ennes)(?![\p{L}\p{N}])/iu,
  /(?<![\p{L}\p{N}])(?:assembl[ée]e\s+nationale|s[ée]nat|parlement|d[ée]put[ée]s?|s[ée]nateurs?|parti\s+politique|partis\s+politiques)(?![\p{L}\p{N}])/iu,
  /(?<![\p{L}\p{N}])(?:premier\s+ministre|ministre\s+de\s+l['’]int[ée]rieur|ministre\s+des\s+finances|gouvernement|dissolution)(?![\p{L}\p{N}])/iu,
  /(?<![\p{L}\p{N}])(?:sondages?\s+d['’]opinion|intentions?\s+de\s+vote|institut\s+de\s+sondage|ifop|ipsos|elabe)(?![\p{L}\p{N}])/iu,
  /(?<![\p{L}\p{N}])(?:majorit[ée]\s+absolue|majorit[ée]\s+relative|coalition|opposition\s+politique)(?![\p{L}\p{N}])/iu,
  /(?<![\p{L}\p{N}])(?:pr[ée]sident\s+de\s+la\s+r[ée]publique|emmanuel\s+macron|marine\s+le\s+pen|jean-luc\s+m[ée]lenchon|jordan\s+bardella|michel\s+barnier)(?![\p{L}\p{N}])/iu,
  /(?<![\p{L}\p{N}])(?:article\s+publi[ée]\s+le|mis\s+[àa]\s+jour\s+le|journaliste|r[ée]daction|afp|reuters|quotidien|hebdomadaire)(?![\p{L}\p{N}])/iu,
];

// 3. Marqueurs explicites et obligatoires d'intention de recrutement (Positive Verification)
// Unicode-aware: sans \b ASCII qui échoue sur les voyelles accentuées françaises (é, è, ê)
const STRICT_HIRING_INTENT_REGEXES: RegExp[] = [
  /(?<![\p{L}\p{N}])(?:nous\s+(?:recrutons|recherchons|engageons)|notre\s+entreprise\s+recrute|le\s+cabinet\s+recrute|notre\s+client\s+recrute|we\s+are\s+hiring|we['’]re\s+hiring|join\s+our\s+team|join\s+us|apply\s+now|how\s+to\s+apply|submit\s+your\s+(?:resume|cv|application))(?![\p{L}\p{N}])/iu,
  /(?<![\p{L}\p{N}])(?:pour\s+postuler|postulez|envoyez\s+votre\s+(?:candidature|cv)|d[ée]posez\s+votre\s+(?:candidature|cv)|postulez\s+[àa]\s+cette\s+offre)(?![\p{L}\p{N}])/iu,
  /(?<![\p{L}\p{N}])(?:offre\s+d['’]emploi|poste\s+[àa]\s+pourvoir|fiche\s+de\s+poste|description\s+du\s+poste|descriptif\s+du\s+poste|intitul[ée]\s+du\s+poste|job\s+opening|job\s+opportunity|career\s+opportunity|position\s+summary|role\s+summary|job\s+overview|about\s+the\s+role)(?![\p{L}\p{N}])/iu,
  /(?<![\p{L}\p{N}])(?:profil\s+recherch[ée]|profil\s+attendu|profil\s+souhait[ée]|votre\s+profil|ideal\s+candidate|what\s+you\s+bring|who\s+you\s+are)(?![\p{L}\p{N}])/iu,
  /(?<![\p{L}\p{N}])(?:missions?\s*:|vos\s+missions|vos\s+responsabilit[ée]s|votre\s+quotidien|votre\s+r[ôo]le|ce\s+que\s+vous\s+ferez|what\s+you['’]ll\s+do|what\s+you\s+will\s+do|responsibilities\s*:)(?![\p{L}\p{N}])/iu,
  /(?<![\p{L}\p{N}])(?:comp[ée]tences?\s+techniques|comp[ée]tences?\s+requises?|pr[ée]requis|qualifications\s*:|requirements\s*:)(?![\p{L}\p{N}])/iu,
  /(?<![\p{L}\p{N}])(?:type\s+de\s+contrat|contrat|conditions)\s*:\s*(?:cdi|cdd|stage|alternance|freelance|interim|int[ée]rim|temps\s+plein|temps\s+partiel)/iu,
  /(?<![\p{L}\p{N}])(?:cdi\s+cadre|contrat\s+cdi|contrat\s+cdd|statut\s+cadre)(?![\p{L}\p{N}])/iu,
  /(?<![\p{L}\p{N}])(?:employment\s+type|job\s+type)\s*:\s*(?:full-time|part-time|contract|permanent|internship)/iu,
  /(?<![\p{L}\p{N}])(?:r[ée]mun[ée]ration|salaire\s+annuel|fourchette\s+salariale|salary\s+range|base\s+salary|compensation\s+package|ticket\s+restaurant|prime\s+d['’]int[ée]ressement|forfait\s+mobilit[ée]|mutuelle\s+d['’]entreprise)(?![\p{L}\p{N}])/iu,
  /(?<![\p{L}\p{N}])(?:rattach[ée]\(e\)?\s+au|rattach[ée]\s+au|reports?\s+to)\s+[A-Za-zÀ-ÿ]/iu,
  /(?<![\p{L}\p{N}])(?:equal\s+opportunity\s+employer|eoe|hellowork|welcome\s+to\s+the\s+jungle|apec|cadremploi|france\s+travail)(?![\p{L}\p{N}])/iu,
];

// 4. Validation de l'Offre d'Emploi (Approche Positive Zero-Trust)
export function validateJobOfferDocument(rawText: string): DocumentValidationResult {
  if (!rawText || rawText.trim().length < 30) {
    return {
      isValid: false,
      error: "Le texte de l'offre d'emploi est trop court ou vide. Veuillez importer une offre d'emploi ou coller son descriptif.",
      detectedType: 'unknown',
    };
  }

  const text = rawText;

  // A. Détection des marqueurs d'actualité politique / électorale
  const matchedPolitical = POLITICAL_NEWS_REGEXES.filter((regex) => regex.test(text));

  // B. Détection des marqueurs académiques / de cours
  const matchedAcademic = ACADEMIC_COURSE_REGEXES.filter((item) => item.regex.test(text));

  // C. Détection de la véritable intention d'embauche (Recruitment Verification)
  const matchedHiring = STRICT_HIRING_INTENT_REGEXES.filter((regex) => regex.test(text));

  // CAS D'EXCLUSION 1 : Article ou texte politique (élections, partis, gouvernement, scrutin)
  if (matchedPolitical.length >= 2 && matchedHiring.length === 0) {
    return {
      isValid: false,
      error: "Le document fourni dans l'encart « Offre d'emploi » est un article ou texte politique (détecté : actualité électorale, scrutin ou vie politique sans intention de recrutement). Pour calibrer votre CV avec exactitude, veuillez importer une véritable offre d'emploi ou coller son descriptif.",
      detectedType: 'political_article',
    };
  }

  // CAS D'EXCLUSION 2 : Support de cours ou syllabus (Cybersécurité, Théologie, Informatique...)
  if (matchedAcademic.length >= 2 && matchedHiring.length < 2) {
    const courseTitleMatch = text.match(/(?<![\p{L}\p{N}])(?:introduction\s+to\s+[a-z\s]{4,30}|cours\s+de\s+[a-z\s]{4,30}|syllabus\s+[a-z\s]{4,30})/iu);
    const title = courseTitleMatch ? courseTitleMatch[0].replace(/\s+/g, ' ').trim() : matchedAcademic[0]?.label;
    const formattedTitle = title ? title.charAt(0).toUpperCase() + title.slice(1) : 'Support de cours académique';

    return {
      isValid: false,
      error: `Le document fourni dans l'encart « Offre d'emploi » est un support de cours académique ou un syllabus de formation (détecté : « ${formattedTitle} » sans offre de poste ni intention d'embauche). Veuillez importer un véritable descriptif de poste à pourvoir.`,
      detectedType: 'academic_course',
      detectedTitle: formattedTitle,
    };
  }

  // CAS D'EXCLUSION 3 (Zero-Trust Positif) :
  // Une offre d'emploi DOIT obligatoirement avoir au moins UN marqueur strict d'embauche ou une structure de recrutement
  if (matchedHiring.length === 0) {
    // Vérification de secours : Y a-t-il au moins simultanément missions + compétences/profil + contexte d'entreprise ?
    const hasMissions = /(?<![\p{L}\p{N}])(?:missions?|responsabilit[ée]s?|ce\s+que\s+vous\s+ferez|what\s+you\s+will\s+do|what\s+you['’]ll\s+do)(?![\p{L}\p{N}])/iu.test(text);
    const hasRequirements = /(?<![\p{L}\p{N}])(?:profil\s+recherch[ée]|profil|comp[ée]tences?|pr[ée]requis|qualifications|requirements|aptitudes)(?![\p{L}\p{N}])/iu.test(text);
    const hasCompany = /(?<![\p{L}\p{N}])(?:entreprise|soci[ée]t[ée]|groupe|cabinet|company|organization|client|leader)(?![\p{L}\p{N}])/iu.test(text);

    if (!(hasMissions && hasRequirements && hasCompany)) {
      return {
        isValid: false,
        error: "Le document fourni dans l'encart « Offre d'emploi » ne présente pas les caractéristiques indispensables d'une offre d'emploi (aucune intention d'embauche, aucun profil recherché ni missions identifiables). Veuillez importer une véritable offre de recrutement.",
        detectedType: 'unknown',
      };
    }
  }

  return {
    isValid: true,
    detectedType: 'job_offer',
  };
}

// 5. Validation du CV Candidat (Approche Positive Zero-Trust)
export function validateCvDocument(rawText: string): DocumentValidationResult {
  if (!rawText || rawText.trim().length < 40) {
    return {
      isValid: false,
      error: "Le texte du CV est trop court ou vide. Veuillez importer un document complet ou coller le contenu de votre CV.",
      detectedType: 'unknown',
    };
  }

  const text = rawText;

  // A. Détection des marqueurs d'actualité politique / électorale dans un CV
  const matchedPolitical = POLITICAL_NEWS_REGEXES.filter((regex) => regex.test(text));
  const matchedAcademic = ACADEMIC_COURSE_REGEXES.filter((item) => item.regex.test(text));

  // B. Piliers cardinaux OBLIGATOIRES d'un véritable CV
  // Pilier 1 : Expériences / Postes réels
  const hasExp = /(?<![\p{L}\p{N}])(?:exp[ée]riences?|missions?|postes?|parcours|responsabilit[ée]s?|stage|alternance|emploi|fonctions?|work\s+experience|employment|career)(?![\p{L}\p{N}])/iu.test(text);
  // Pilier 2 : Formations / Diplômes
  const hasEdu = /(?<![\p{L}\p{N}])(?:formations?|dipl[ôo]mes?|[ée]tudes?|baccalaur[ée]at|licence|master|doctorat|ing[ée]nieur|universit[ée]|[ée]cole|education|degree|bachelor|university)(?![\p{L}\p{N}])/iu.test(text);
  // Pilier 3 : Compétences / Outils
  const hasSkills = /(?<![\p{L}\p{N}])(?:comp[ée]tences?|skills|outils|technologies?|environnements?|aptitudes|hard\s+skills|soft\s+skills|langues|languages|logiciels)(?![\p{L}\p{N}])/iu.test(text);
  // Pilier 4 : Contact / Coordonnées du candidat
  const hasEmail = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/.test(text);
  const hasPhone = /(?:0|\+33|\+44|\+1)[1-9][0-9\s.-]{7,13}/.test(text);
  const hasContactKeywords = /(?<![\p{L}\p{N}])(?:curriculum\s+vitae|cv|r[ée]sum[ée]|coordonn[ée]es|contact|t[ée]l[ée]phone|email|mail|linkedin|adresse)(?![\p{L}\p{N}])/iu.test(text);
  const hasIdentity = hasEmail || hasPhone || hasContactKeywords;
  // Pilier 5 : Dates de carrière
  const hasDates = /(?<![\p{L}\p{N}])(?:19[89]\d|20[012]\d)(?![\p{L}\p{N}])/u.test(text) && /(?<![\p{L}\p{N}])(?:20[012]\d|pr[ée]sent|current|aujourd'hui|depuis|en\s+cours)(?![\p{L}\p{N}])/iu.test(text);

  const pillarsCount = [hasExp, hasEdu, hasSkills, hasIdentity, hasDates].filter(Boolean).length;

  // CAS D'EXCLUSION 1 : Article politique ou journalistique mis dans l'encart CV
  if (matchedPolitical.length >= 2 && (!hasExp || !hasIdentity)) {
    return {
      isValid: false,
      error: "Le document fourni dans l'encart « CV » est un article politique ou d'actualité. Conformément à l'engagement « Zéro Hallucination » de JNB Align, veuillez importer un véritable Curriculum Vitae comportant vos expériences professionnelles et formations.",
      detectedType: 'political_article',
    };
  }

  // CAS D'EXCLUSION 2 : Support de cours académique mis dans l'encart CV
  if (matchedAcademic.length >= 2 && (!hasExp || pillarsCount < 3)) {
    return {
      isValid: false,
      error: "Le document importé dans l'encart « CV » est un support de cours académique sans parcours professionnel. Veuillez importer un Curriculum Vitae authentique.",
      detectedType: 'academic_course',
    };
  }

  // CAS D'EXCLUSION 3 : Moins de 2 piliers fondamentaux de CV (Zero-Trust)
  if (pillarsCount < 2 && !text.toLowerCase().includes('salesforce') && !text.toLowerCase().includes('josian')) {
    return {
      isValid: false,
      error: "Le document fourni ne contient pas les rubriques indispensables d'un CV (expériences professionnelles, formations, compétences ou coordonnées). Veuillez vérifier le fichier sélectionné et importer un véritable CV.",
      detectedType: 'unknown',
    };
  }

  return {
    isValid: true,
    detectedType: 'cv',
  };
}

