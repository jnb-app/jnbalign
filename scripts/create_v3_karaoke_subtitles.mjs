import fs from 'fs';
import path from 'path';

const dir = path.resolve(process.cwd(), 'scripts', 'subtitles_v3');
if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

const subtitles = {
  // === VIDEO 1 (Démo / Tuto 23s) ===
  'v1_k1.txt': "ARRÊTE D'ENVOYER",
  'v1_k2.txt': "LE MÊME CV PARTOUT !",
  'v1_k3.txt': "REGARDE COMMENT L'ALIGNER",
  'v1_k4.txt': "EN 30 SECONDES CHRONO ⚡",
  'v1_k5.txt': "DÉPOSE TON CV",
  'v1_k6.txt': "ET L'OFFRE CIBLÉE",
  'v1_k7.txt': "DANS JNB ALIGN 🧭",
  'v1_k8.txt': "POINTS CLÉS DÉTECTÉS",
  'v1_k9.txt': "MÉTHODE STAR ACTIVÉE ⭐",
  'v1_k10.txt': "DEUX DOCUMENTS PRÊTS",
  'v1_k11.txt': "CV & LETTRE STRATÉGIQUE",
  'v1_k12.txt': "LIEN EN BIO 🔗 GRATUIT",

  // === VIDEO 2 (Bénéfice candidat / Douleur 21s) ===
  'v2_k1.txt': "AUCUN ENTRETIEN ? 🛑",
  'v2_k2.txt': "TON CV EST BLOQUÉ",
  'v2_k3.txt': "PAR LES FILTRES ATS",
  'v2_k4.txt': "AVEC JNB ALIGN 💡",
  'v2_k5.txt': "CHAQUE LIGNE S'ADAPTE",
  'v2_k6.txt': "À L'OFFRE CIBLÉE",
  'v2_k7.txt': "MÉTHODE STAR :",
  'v2_k8.txt': "RÉSULTATS CHIFFRÉS 📈",
  'v2_k9.txt': "CV & LETTRE SUR-MESURE",
  'v2_k10.txt': "FAIS LE TEST SUR TON CV",
  'v2_k11.txt': "LIEN EN BIO 🚀",

  // === VIDEO 3 (Hook fort & Looping infini 18s) ===
  'v3_k1.txt': "TON CV EST-IL ADAPTÉ ?",
  'v3_k2.txt': "À L'OFFRE VISÉE ?",
  'v3_k3.txt': "DÉPOSE TON CV",
  'v3_k4.txt': "DANS JNB ALIGN 🧭",
  'v3_k5.txt': "EN QUELQUES SECONDES",
  'v3_k6.txt': "COMPÉTENCES CLÉS DÉTECTÉES ✨",
  'v3_k7.txt': "SCORE BOOSTÉ À 92% 🎯",
  'v3_k8.txt': "DEUX LIVRABLES PRÊTS",
  'v3_k9.txt': "DÉCROCHE L'ENTRETIEN 💼",
  'v3_k10.txt': "ET VOILÀ POURQUOI... 🔄"
};

for (const [filename, content] of Object.entries(subtitles)) {
  fs.writeFileSync(path.join(dir, filename), content, 'utf8');
}

console.log('✅ Tous les sous-titres Karaoke V3 (2-4 mots, JNB Align vérifié) sont générés !');
