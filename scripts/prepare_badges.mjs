import fs from 'fs';
import path from 'path';

const subDir = path.resolve(process.cwd(), 'scripts', 'subtitles_v7');
if (!fs.existsSync(subDir)) fs.mkdirSync(subDir, { recursive: true });

const badges = {
  // Video 1
  'v1_badge_s0.txt': 'QUESTION CANDIDAT',
  'v1_badge_s1.txt': 'SOLUTION JNB ALIGN',
  'v1_badge_s2.txt': 'ÉTAPE 1 · DÉPÔT CV & OFFRE',
  'v1_badge_s3.txt': 'ÉTAPE 2 · ANALYSE & MOTS-CLÉS',
  'v1_badge_s4.txt': 'RÉSULTAT · 2 LIVRABLES CONCRETS',
  'v1_badge_s5.txt': 'CANDIDATURE PRÊTE & VALIDÉE',

  // Video 2
  'v2_badge_s0.txt': 'DÉMONSTRATION PRODUIT',
  'v2_badge_s1.txt': 'ÉTAPE 1 · DÉPÔT DU CV & DE L’OFFRE',
  'v2_badge_s2.txt': 'ÉTAPE 2 · ADÉQUATION ATS & CRITÈRES',
  'v2_badge_s3.txt': 'MÉTHODE STAR · PLAN 1 AVANT',
  'v2_badge_s4.txt': 'MÉTHODE STAR · PLAN 2 APRÈS',
  'v2_badge_s5.txt': 'ÉTAPE 3 · LES 2 LIVRABLES PRÊTS',
  'v2_badge_s6.txt': 'CANDIDATURE MIEUX PRÉPARÉE',

  // Video 3
  'v3_badge_s0.txt': 'ANNONCE ÉVÉNEMENTIELLE',
  'v3_badge_s1.txt': 'LA PROMESSE JNB ALIGN',
  'v3_badge_s2.txt': 'EN ENTRÉE · CV & OFFRE CIBLÉE',
  'v3_badge_s3.txt': 'SCHÉMA COMPLET · ENTRÉE ➔ SORTIE',
  'v3_badge_s4.txt': 'LIVRABLES · CV & LETTRE SUR MESURE',
  'v3_badge_s5.txt': 'ACCÈS 100 % GRATUIT',
};

for (const [f, txt] of Object.entries(badges)) {
  fs.writeFileSync(path.join(subDir, f), txt + '\n', 'utf-8');
}

console.log('✅ Badges text files written.');
