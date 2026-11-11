import fs from 'fs';
import path from 'path';

const dir = 'scripts/subtitles_com';
if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

const files = {
  // Tableau 1 (0-3.5s)
  't1_badge.txt': 'TABLEAU 1 · REJET ATS SILENCIEUX',
  't1_sub.txt': 'Un profil de qualité...\npourtant rejeté par les robots.',
  't1_alert.txt': 'REJET AUTOMATIQUE ATS',

  // Tableau 2 - Entrée de la recruteuse (3.5-7.3s)
  't2_recruteuse_badge.txt': 'LA VÉRITÉ DES RECRUTEURS',
  't2_recruteuse_sub.txt': "Ton CV est peut-être la raison\npour laquelle tu ne décroches pas d'entretien.",

  // Solution JNB Align (7.3-9.6s)
  't2_jnb_badge.txt': 'LA SOLUTION',
  't2_jnb_sub.txt': 'Mais avec JNB Align :',

  // 4 Piliers concrets de JNB Align (9.6-22.5s)
  // Pilier 1 : ATS
  'p1_badge.txt': 'PILIER 1 · OPTIMISATION ATS',
  'p1_sub.txt': 'Optimisez votre CV pour les ATS.',
  'p1_highlight.txt': 'Algorithmes franchis · Mots-clés alignés',

  // Pilier 2 : Compétences & Expériences
  'p2_badge.txt': 'PILIER 2 · VALORISATION RÉELLE',
  'p2_sub.txt': 'Valorisez vos compétences\net vos expériences.',
  'p2_highlight.txt': 'Méthode STAR · Aucun fait inventé',

  // Pilier 3 : Lettre de motivation stratégique
  'p3_badge.txt': 'PILIER 3 · LETTRE STRATÉGIQUE',
  'p3_sub.txt': 'Créez une lettre de motivation\nstratégique.',
  'p3_highlight.txt': 'Structure Vous / Moi / Nous convaincante',

  // Pilier 4 : Téléchargement gratuit
  'p4_badge.txt': 'PILIER 4 · DOCUMENTS PRÊTS',
  'p4_sub.txt': 'Téléchargez vos documents\ngratuitement.',
  'p4_highlight.txt': 'Pack Complet PDF & Word immédiat',

  // Choc de conscience (22.5-25.5s)
  't3_conscience_badge.txt': 'REPRENDS LE CONTRÔLE',
  't3_conscience_sub.txt': 'Ne laisse plus ton CV\ndécider de ton avenir.',

  // Call to Action final (25.5-30.0s)
  'end_tag.txt': 'ACCÈS 100% GRATUIT EN LIGNE',
  'end_cta_voice.txt': 'Teste JNB Align gratuitement\ndès maintenant.',
  'end_domain.txt': 'jnbalign.com',
  'end_sub_cta.txt': 'Prépare ta candidature en 3 minutes',
  'end_bio.txt': 'Lien en bio · WhatsApp · TikTok · Insta'
};

for (const [filename, content] of Object.entries(files)) {
  fs.writeFileSync(path.join(dir, filename), content.trim());
}

console.log('✅ Tous les fichiers de sous-titres et badges ont été générés dans scripts/subtitles_com/ !');
