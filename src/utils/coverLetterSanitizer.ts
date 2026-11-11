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
  if (!company) return '';
  let c = company.trim().replace(/^[-–—:|\s]+|[-–—:|\s]+$/g, '');
  const lower = c.toLowerCase();

  // Rejeter les fragments techniques / actions de test
  const forbidden = [
    'valide', 'formulaire', 'bouton', 'clique', 'automatique', 
    'remplit', 'champ', 'input', 'soumettre', 'candidature',
    'tester', 'profil type', 'descriptif'
  ];
  if (forbidden.some((kw) => lower.includes(kw))) {
    return '';
  }
  if (/^(?:et|ou|de|du|des|pour|par|avec|dans|sur|sous|en|chez)\s+/i.test(c)) {
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

  const cleanedHeader = {
    ...coverLetter.header,
    companyName: cleanCompany,
    date: effectiveDate,
    recipientNameOrTitle: cleanRecipientTitle(coverLetter.header?.recipientNameOrTitle),
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
