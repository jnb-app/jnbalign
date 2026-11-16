import { CoverLetter } from '../types/ats';
import { isEnglishText } from './languageDetector';

/**
 * Nettoie la formule de politesse finale d'une lettre de motivation pour supprimer
 * tout prénom ou nom qui serait accolé à la fin de la phrase avant la signature.
 * Supporte le français ("Je vous prie d'agréer...") et l'anglais ("Sincerely,", "Best regards,").
 */
export function sanitizeClosingFormula(text?: string, candidateName?: string): string {
  if (!text) return "Je vous prie d'agréer, Madame, Monsieur, l'expression de mes salutations distinguées.";
  let cleaned = text.trim();

  // 1. Si le nom du candidat est fourni, le retirer strictement de la fin
  if (candidateName && typeof candidateName === 'string') {
    const trimmed = candidateName.trim();
    if (trimmed) {
      const escaped = trimmed.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      cleaned = cleaned.replace(new RegExp(`[\\s,\\.\\n–—]*${escaped}[\\s\\.]*$`, 'i'), '');

      // Retirer également les composantes individuelles du nom (prénom ou nom seul)
      const parts = trimmed.split(/\s+/).filter((p) => p.length >= 2);
      for (const part of parts) {
        const escPart = part.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        cleaned = cleaned.replace(new RegExp(`[\\s,\\.\\n–—]*${escPart}[\\s\\.]*$`, 'i'), '');
      }
    }
  }

  // 2. Supprimer tout patronyme résiduel après les formules usuelles de politesse en français
  cleaned = cleaned.replace(
    /(salutations distinguées|salutations respectueuses|salutations les meilleures|mes sincères salutations|cordialement|mes sentiments distingués|mes salutations cordiales|parfaite considération|mes respects|mes salutations)[\s,\.\n–—]+[A-ZÀ-Ÿ][\w\sÀ-ÿ\.\-]*$/i,
    '$1.'
  );

  // Supprimer patronyme après formules anglaises usuelles ("Sincerely,", "Best regards,")
  cleaned = cleaned.replace(
    /(sincerely|best regards|kind regards|warm regards|respectfully|yours sincerely|yours faithfully)[\s,\.\n–—]+[A-ZÀ-Ÿ][\w\sÀ-ÿ\.\-]*$/i,
    '$1,'
  );

  // 3. Détecter et retirer un éventuel nom isolé trailing ". Prénom Nom"
  cleaned = cleaned.replace(/[\.\s]+([A-ZÀ-Ÿ][a-zà-ÿ]+(?:\s+[A-ZÀ-Ÿ][a-zà-ÿ]+)*)\s*$/, '.');

  cleaned = cleaned.trim();
  // Formules anglaises se terminent par une virgule
  if (/^(sincerely|best regards|kind regards|warm regards|respectfully|yours sincerely|yours faithfully)$/i.test(cleaned.replace(/[,.]+$/, ''))) {
    cleaned = cleaned.replace(/[,.]+$/, '') + ',';
  } else {
    cleaned = cleaned.replace(/[,]+$/, '');
    if (!/[.!?]$/.test(cleaned) && !cleaned.endsWith(',')) {
      cleaned += '.';
    }
  }

  return cleaned;
}

/**
 * Nettoie le titre du destinataire pour éviter les doublons tels que :
 * "À l'attention de : À l'attention de l'Équipe Recrutement" ou "Attention: Attention:"
 */
export function cleanRecipientTitle(title?: string): string {
  if (!title) return "L'Équipe Recrutement";
  let t = title.trim();
  t = t.replace(/^À l'attention de\s*:\s*/i, '');
  t = t.replace(/^À l'attention de\s+/i, '');
  t = t.replace(/^A l'attention de\s*:\s*/i, '');
  t = t.replace(/^A l'attention de\s+/i, '');
  t = t.replace(/^To the attention of\s*:\s*/i, '');
  t = t.replace(/^To the attention of\s+/i, '');
  t = t.replace(/^Attention\s*:\s*/i, '');
  t = t.replace(/^Attn\s*:\s*/i, '');
  t = t.trim();
  return t || "L'Équipe Recrutement";
}

/**
 * Nettoie le nom de l'entreprise pour rejeter tout fragment technique ou résidu d'instruction (ex: "et valide automatiquement le formulaire").
 */
export function cleanCompanyName(company?: string): string {
  if (!company || typeof company !== 'string') return '';
  let c = company
    .normalize('NFC')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/^[-–—:|•·\s]+|[-–—:|•·\s]+$/g, '');
  if (!c) return '';

  // 0. Si format "Marque (SYSLEY)" ou "Entreprise (ALTECA)", extraire la marque entre parenthèses
  const parenBrandMatch = c.match(/^(?:(?:la|le|l['’]|notre|votre|the|our|your)\s+)?(?:marque|maison|enseigne|entreprise|soci[ée]t[ée]|groupe|compagnie|company|brand|client|organisation|organization|employeur|employer)\s*\(\s*([A-ZÀ-Ÿ0-9][^()]{1,45})\s*\)$/i);
  if (parenBrandMatch?.[1]) {
    c = parenBrandMatch[1].trim();
  }

  // Retirer les préfixes de libellé génériques ("Marque : SYSLEY", "La marque SYSLEY", "Maison française SYSLEY")
  const genericEntityPrefix = "(?:(?:la|le|l['’]|notre|votre|une|un|the|our|your|a|an)\\s+)?(?:marque|maison|enseigne|entreprise|soci[ée]t[ée]|company|brand|client|employeur|employer|recruteur|recruiter|filiale|entit[ée]|[ée]tablissement|groupe|organisation|organization)";
  const descriptiveAdj = "(?:fran[çc]aise?s?|europ[ée]ennes?|international(?:e|es|aux)?|mondial(?:e|es|aux)?|familial(?:e|es|aux)?|ind[ée]pendant(?:e|s)?|national(?:e|es|aux)?|r[ée]gional(?:e|es|aux)?|local(?:e|es|aux)?|parisienne?s?|lyonnaise?s?|leader|pionni[èe]re?s?|sp[ée]cialiste|innovant(?:e|s)?|historique|prestigieuse?s?|embl[ée]matique|reconnue?s?|renomm[ée]e?s?|cosm[ée]tiques?|parfumerie|beaut[ée]|luxe|french|european|global|family(?:-owned)?|independent|leading|luxury|cosmetics?)";
  c = c
    .replace(/^(?:(?:la|le|l['’]|notre|votre|the|our|your)\s+)?(?:marque|maison|enseigne|entreprise|soci[ée]t[ée]|company|brand|client|employeur|employer|recruteur|recruiter|filiale|entit[ée]|[ée]tablissement)\s*[:=]\s*/i, '')
    .replace(new RegExp(`^${genericEntityPrefix}(?:\\s+${descriptiveAdj})*\\s+(?=[A-ZÀ-Ÿ0-9])`, 'i'), (fullMatch) => {
      const trimmedPrefix = fullMatch.trim().toLowerCase();
      if (/^(?:maison|groupe)\b/.test(trimmedPrefix) && !new RegExp(`\\b${descriptiveAdj}\\b`, 'i').test(trimmedPrefix)) {
        return fullMatch;
      }
      return '';
    })
    .replace(/^["«']+|["»']+$/g, '')
    .trim();
  if (!c) return '';

  // 1. Séparer un nom d'entreprise collé sans espace à une phrase d'introduction (ex: "ALTECAChez Alteca le management de proximité")
  c = c
    .replace(
      /^([A-ZÀ-Ÿ0-9][A-Za-zÀ-ÿ0-9\s&'.\-]{1,30}?)(?=(?:Chez|Bienvenue|Rejoignez|Rejoindre|Nous|Notre|Nos|Votre|Vos|Qui|Description|Missions|Profil|Contexte|À\s+propos|A\s+propos|About|Welcome|Join|Our|We)(?:\s|$|['’]))/,
      '$1\n'
    )
    .split('\n')[0]
    .trim();

  // Cas générique : préfixe tout en MAJUSCULES collé à un mot TitleCase suivi d'une phrase (ex: "ALTECAFort de...")
  const gluedAllCapsMatch = c.match(/^([A-ZÀ-Ÿ0-9&.\-]{2,20})([A-ZÀ-Ÿ][a-zà-ÿ]{1,20}\s+.+)$/);
  if (gluedAllCapsMatch) {
    const prefix = gluedAllCapsMatch[1];
    const tail = gluedAllCapsMatch[2];
    const tailLower = tail.toLowerCase();
    const hasProseCue =
      /^(?:Chez|Le|La|Les|L'|Un|Une|Nous|Notre|Depuis|Avec|Pour|Fort|Fondé|Créé|Leader|Spécialiste|Acteur|Entreprise|Société|About|Our|Welcome|Join)\b/.test(tail) ||
      tailLower.includes(prefix.toLowerCase()) ||
      /\b(?:le|la|les|un|une|de|du|des|est|sont|vous|nous|qui|et|avec|pour|dans|sur)\b/.test(tailLower);
    if (hasProseCue) {
      c = prefix.trim();
    }
  }

  // 2. Retirer les clauses narratives espacées ("ALTECA Chez Alteca...", "ALTECA - Bienvenue chez...")
  c = c
    .replace(
      /\s+(?:[-–—|•·]\s*)?(?:Chez\s+[A-ZÀ-Ÿ]|Bienvenue\s+chez|Rejoignez\b|À\s+propos\b|A\s+propos\b|Qui\s+sommes\b|Recrute\b|Recrutement\b|Offre\s+d['’]emploi\b|Nous\s+recherchons\b).*$/i,
      ''
    )
    .replace(/\s*[-–—|•·]\s*(?:HelloWork|RegionsJob|Cadremploi|Meteojob|Indeed|LinkedIn|Glassdoor|Apec|Jooble|Jean-Michel(?:\.io)?)\b.*$/i, '')
    .trim();

  // 3. Si format "SOCASS - Société d'Assistance...", garder la marque courte si > 40 car.
  if (c.length > 40 && c.includes(' - ')) {
    const shortBrand = c.split(' - ')[0].trim();
    if (shortBrand.length >= 2) c = shortBrand;
  }

  // Rejeter dès ce stade les syntagmes débutant par un déterminant/possessif ou préposition ("Notre marque", "Votre organisation...")
  if (/^(?:et|ou|de|du|des|pour|par|avec|dans|sur|sous|en|chez|un|une|ce|cette|ces|notre|nos|votre|vos|son|sa|ses|leur|leurs|a|an|our|your|their|this|that)\s+/i.test(c)) {
    return '';
  }
  if (/^(?:(?:le|la|les|the)\s+|l['’]\s*)(?:groupe|soci[ée]t[ée]|entreprise|organisation|organization|company|marque|brand|maison|enseigne|structure|filiale|entit[ée]|[ée]tablissement|cabinet|recruteur|client|poste|offre|service|direction|p[ôo]le|[ée]quipes?|teams?|monde|secteur|industrie|division)\b/i.test(c)) {
    return '';
  }
  if (new RegExp(`^(?:(?:la|le|l['’]|notre|votre|une|the)\\s+)?(?:marque|maison|enseigne|entreprise|soci[ée]t[ée]|groupe|compagnie|company|brand)(?:\\s+${descriptiveAdj})+$`, 'i').test(c)) {
    return '';
  }

  // 4. Couper les slogans/phrases en minuscules collés après le nom ("Alteca le management de proximité" -> "Alteca")
  // tout en préservant les connecteurs légitimes suivis d'un mot majuscule ("La Banque Postale", "Banque de France").
  const words = c.split(/\s+/).filter(Boolean);
  if (words.length >= 2 && /^[A-ZÀ-Ÿ0-9]/.test(words[0])) {
    const connectors = new Set(['de', 'du', 'des', 'et', 'le', 'la', 'les', 'of', 'the', 'and', '&']);
    const isCapitalized = (w: string) => /^[A-ZÀ-Ÿ0-9]/.test(w.replace(/^(?:d'|l'|de\s+l')/i, ''));
    let cutIdx = words.length;
    for (let i = 1; i < words.length; i++) {
      const w = words[i];
      const wClean = w.replace(/[,.;:!?]+$/, '').toLowerCase();
      if (isCapitalized(w)) continue;
      if (connectors.has(wClean)) {
        const nextIsCap = i + 1 < words.length && isCapitalized(words[i + 1]);
        const nextTwoIsCap =
          i + 2 < words.length &&
          connectors.has(words[i + 1].toLowerCase()) &&
          isCapitalized(words[i + 2]);
        if (nextIsCap || nextTwoIsCap) continue;
      }
      cutIdx = i;
      break;
    }
    if (cutIdx < words.length && cutIdx >= 1) {
      c = words.slice(0, cutIdx).join(' ').replace(/[,.;:]+$/, '').trim();
    }
  }

  c = c.replace(/^[-–—:|•·"«'\s]+|[-–—:|•·"»'\s]+$/g, '');
  const lower = c.toLowerCase();

  // Rejeter explicitement les formulations génériques / placeholders / adjectifs isolés
  const genericPlaceholders = new Set([
    'notre', 'nos', 'votre', 'vos', 'leur', 'leurs', 'our', 'your', 'their', 'le', 'la', 'les', 'the', 'un', 'une', 'cette', 'ces',
    'votre organisation', 'notre organisation', "l'organisation", 'organisation',
    'your organization', 'the organization', 'our organization', 'organization',
    'votre entreprise', 'notre entreprise', "l'entreprise", 'une entreprise', 'entreprise',
    'your company', 'the company', 'our company', 'a company', 'company',
    'votre société', 'votre societe', 'notre société', 'notre societe', 'la société', 'la societe', 'une société', 'une societe', 'société', 'societe',
    'marque', 'la marque', 'une marque', 'notre marque', 'votre marque', 'brand', 'the brand', 'our brand', 'your brand',
    'maison', 'la maison', 'notre maison', 'votre maison', 'enseigne', "l'enseigne", 'notre enseigne',
    'structure', 'la structure', 'notre structure', 'votre structure', 'cabinet', 'le cabinet',
    'groupe', 'le groupe', 'notre groupe', 'un groupe', 'client', 'le client', 'notre client', 'client final',
    'filiale', 'entité', 'entite', 'établissement', 'etablissement', 'division', 'direction', 'service', 'pôle', 'pole', 'secteur', 'industrie',
    'employeur', 'employer', 'recruteur', 'recruiter', 'hiring company',
    'confidentiel', 'confidential', 'anonyme', 'anonymous', 'undisclosed', 'non précisé', 'non précise', 'n/a', 'à déterminer',
    'française', 'francaise', 'français', 'francais', 'french', 'européenne', 'europeenne', 'européen', 'europeen', 'european',
    'internationale', 'international', 'mondiale', 'mondial', 'global', 'globale',
    'familiale', 'familial', 'indépendante', 'independante', 'indépendant', 'independant', 'independent',
    'nationale', 'national', 'régionale', 'regionale', 'régional', 'regional', 'locale', 'local',
    'parisienne', 'parisien', 'lyonnaise', 'lyonnais', 'marseillaise', 'bordelaise',
    'leader', 'leading', 'pionnière', 'pionnier', 'spécialiste', 'specialiste', 'specialist',
    'innovante', 'innovant', 'innovative', 'historique', 'prestigieuse', 'prestigieux', 'emblématique', 'emblematique',
    'reconnue', 'reconnu', 'renommée', 'renomme', 'cosmétique', 'cosmetique', 'cosmétiques', 'cosmetiques', 'cosmetic', 'cosmetics',
    'parfumerie', 'beauté', 'beaute', 'beauty', 'luxe', 'luxury', 'retail', 'mode', 'fashion',
    'industriel', 'industrielle', 'technologique', 'digital', 'digitale', 'numérique', 'numerique',
    'logistique', 'supply', 'distribution', 'commerce', 'pharma', 'pharmaceutique', 'santé', 'sante', 'agroalimentaire', 'alimentaire'
  ]);
  if (genericPlaceholders.has(lower)) {
    return '';
  }

  // Rejeter les fragments techniques / actions de test
  const forbidden = [
    'valide', 'formulaire', 'bouton', 'clique', 'automatique',
    'remplit', 'champ', 'input', 'soumettre', 'candidature',
    'tester', 'profil type', 'descriptif'
  ];
  if (forbidden.some((kw) => lower.includes(kw))) {
    return '';
  }
  if (c.length < 2 || c.length > 50) return '';
  return c;
}

/**
 * Assure la cohérence intégrale de la lettre de motivation :
 * - Évite le doublon de formule de politesse entre le paragraphe 'nous' et la signature
 * - Garantit qu'aucun nom ne pollue la phrase de clôture avant la signature
 * - Évite les doublons d'intitulé de destinataire ("À l'attention de : À l'attention de...")
 * - Purge tout résidu technique (ex: "et valide automatiquement...") dans les paragraphes
 * - Adapte la date du jour selon la langue (FR ou EN)
 */
export function sanitizeCoverLetter(coverLetter: CoverLetter): CoverLetter {
  if (!coverLetter) return coverLetter;

  const candidateName = coverLetter.header?.candidateName || '';
  let vous = coverLetter.paragraphs?.vous || '';
  let moi = coverLetter.paragraphs?.moi || '';
  let nous = coverLetter.paragraphs?.nous || '';
  let signOff = coverLetter.signOff || '';

  // Purge de phrases résiduelles de test ou formulaires
  const purgeCorruptPhrase = (str: string) => {
    return str
      .replace(/\s+et\s+valide\s+automatiquement\s+le\s+formulaire/gi, '')
      .replace(/et\s+valide\s+automatiquement\s+le\s+formulaire/gi, '')
      .replace(/Votre organisation\s+et\s+valide\s+automatiquement\s+le\s+formulaire/gi, 'Votre organisation')
      .replace(/Rejoindre\s+et\s+valide\s+automatiquement\s+le\s+formulaire/gi, 'Rejoindre votre organisation')
      .replace(/\s{2,}/g, ' ')
      .trim();
  };

  vous = purgeCorruptPhrase(vous);
  moi = purgeCorruptPhrase(moi);
  nous = purgeCorruptPhrase(nous);

  // 1. Si 'nous' se termine par une formule de politesse, la transférer dans signOff si besoin
  const politeClosingRegex = /(Dans l'attente de votre retour[^\n]*|Je vous prie d'agréer[^\n]*|En espérant que ma candidature[^\n]*|Veuillez agréer[^\n]*|Sincerely[^\n]*|Best regards[^\n]*|Looking forward to hearing from you[^\n]*)/i;
  const match = nous.match(politeClosingRegex);
  if (match) {
    const extracted = match[0].trim();
    nous = nous.replace(match[0], '').trim();
    if (!signOff || signOff.includes('Madame, Monsieur') || signOff.includes('Hiring')) {
      signOff = extracted;
    }
  }

  // 2. Retirer tout nom résiduel à la fin du paragraphe 'nous'
  if (candidateName) {
    const escaped = candidateName.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    nous = nous.replace(new RegExp(`[\\s,\\.\\n–—]*${escaped}[\\s\\.]*$`, 'i'), '').trim();
  }

  // 3. Nettoyer strictement la formule de politesse finale
  const cleanedSignOff = sanitizeClosingFormula(signOff, candidateName);

  // 4. Déterminer la langue pour formater la date du jour
  const isEn = coverLetter.languageMode === 'en' || isEnglishText(coverLetter.paragraphs?.vous);
  const todayFormatted = isEn
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

  const effectiveDate =
    !coverLetter.header?.date ||
    coverLetter.header.date === '22 mai 2024' ||
    coverLetter.header.date.includes('22 mai 2024') ||
    coverLetter.header.date === 'May 22, 2024'
      ? todayFormatted
      : coverLetter.header.date;

  const rawCompany = coverLetter.header?.companyName;
  const cleanCompany = cleanCompanyName(rawCompany);

  const cleanSubjectInline = (subj?: string): string => {
    if (!subj) return isEn ? 'Subject: Application' : 'Objet : Candidature';
    let s = subj
      .replace(/^(?:objet|subject|re)\s*:\s*/i, '')
      .replace(/\s*[\(\[]\s*(?:H\s*\/\s*F(?:\s*\/\s*X)?|F\s*\/\s*H(?:\s*\/\s*X)?|M\s*\/\s*F|M\s*\/\s*W|CDD|CDI|Stage|Alternance)\s*[\)\]]/gi, '')
      .replace(/\s+(?:H\s*\/\s*F(?:\s*\/\s*X)?|F\s*\/\s*H(?:\s*\/\s*X)?|M\s*\/\s*F|M\s*\/\s*W)(?=$|[\s,.;:–—\-])/gi, '')
      .replace(/\s*[-–—,/]\s*(?:CDD|CDI|C\.D\.D\.|C\.D\.I\.)(?=$|[\s,.;:–—\-])/gi, '')
      .replace(/\s{2,}/g, ' ')
      .trim();

    if (candidateName && candidateName.trim()) {
      const escapedName = candidateName.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      s = s
        .replace(new RegExp(`\\s*[-–—|]\\s*${escapedName}\\s*$`, 'i'), '')
        .replace(new RegExp(`\\s+${escapedName}\\s*$`, 'i'), '')
        .trim();

      const parts = s.split(/\s+[-–—|]\s+/);
      if (parts.length > 1) {
        const lastSeg = parts[parts.length - 1].trim().toLowerCase();
        const nameTokens = candidateName.toLowerCase().split(/\s+/).filter((w) => w.length >= 2);
        if (nameTokens.length > 0 && nameTokens.filter((t) => lastSeg.includes(t)).length >= Math.min(2, nameTokens.length)) {
          parts.pop();
          s = parts.join(' - ').trim();
        }
      }
    }

    s = s.replace(/\s*[-–—|]\s*$/, '').trim();
    if (isEn) {
      return `Subject: ${s || 'Application'}`;
    }
    return `Objet : ${s || 'Candidature'}`;
  };

  const cleanedHeader = {
    ...coverLetter.header,
    companyName: cleanCompany,
    date: effectiveDate,
    recipientNameOrTitle: cleanRecipientTitle(coverLetter.header?.recipientNameOrTitle),
    subjectLine: cleanSubjectInline(coverLetter.header?.subjectLine),
  };

  return {
    ...coverLetter,
    languageMode: isEn ? 'en' : 'fr',
    header: cleanedHeader,
    paragraphs: {
      vous,
      moi,
      nous,
    },
    signOff: cleanedSignOff,
  };
}
