import fs from 'fs';
import path from 'path';

const subDir = path.resolve(process.cwd(), 'scripts', 'subtitles_v7');
if (!fs.existsSync(subDir)) fs.mkdirSync(subDir, { recursive: true });

// Subtitle texts strictly matched to the spoken voiceover
const files = {
  // === VIDEO 1 (ACCROCHE 25s) ===
  'v1_s0.txt': "Ton CV est-il vraiment adapté\nà l'offre que tu vises ?",
  'v1_s1.txt': "JNB Align t'aide à l'optimiser\ngratuitement, sans rien inventer.",
  'v1_s2.txt': "Dépose ton CV\net l'offre ciblée.",
  'v1_s3.txt': "L'analyse repère les mots-clés\net valorise tes compétences.",
  'v1_s4.txt': "Résultat : ton CV optimisé\net ta lettre stratégique.",
  'v1_s5.txt': "Essaie maintenant :\nlien en bio sur jnbalign.com !",
  'v1_end_tag.txt': "ANALYSE DE COMPATIBILITÉ CV & OFFRE",
  'v1_end_slogan.txt': "Deux documents. Une candidature mieux préparée.",
  'v1_end_domain.txt': "jnbalign.com",
  'v1_end_cta.txt': "Essaie maintenant — lien en bio",
  'v1_end_bio.txt': "Accès 100 % gratuit",

  // === VIDEO 2 (DÉMONSTRATION 30s) ===
  'v2_s0.txt': "Voici comment optimiser ton CV\nen quelques étapes.",
  'v2_s1.txt': "Dépose ton CV\net l'offre d'emploi ciblée.",
  'v2_s2.txt': "JNB Align analyse les mots-clés\net l'adéquation ATS.",
  'v2_s3.txt': "Regarde la méthode STAR :\nune mission générique...",
  'v2_s4.txt': "Même expérience. Meilleure présentation.\nAucun fait inventé.",
  'v2_s5.txt': "Tu obtiens ton CV optimisé\net ta lettre stratégique.",
  'v2_s6.txt': "Deux documents prêts à l'envoi.\nEssaie gratuitement : lien en bio !",
  'v2_end_tag.txt': "VALORISATION DU PARCOURS",
  'v2_end_slogan.txt': "Deux documents. Une candidature mieux préparée.",
  'v2_end_domain.txt': "jnbalign.com",
  'v2_end_cta.txt': "Essaie gratuitement — lien en bio",
  'v2_end_bio.txt': "Accès gratuit sans condition",

  // === VIDEO 3 (LANCEMENT OFFICIEL 30s) ===
  'v3_s0.txt': "C'est officiel !\nJNB Align est lancé.",
  'v3_s1.txt': "Le copilote pour adapter ton CV\nsans travestir ton parcours.",
  'v3_s2.txt': "Deux éléments en entrée :\nton CV et l'offre visée.",
  'v3_s3.txt': "Deux documents en sortie :\nton CV et ta lettre personnalisée.",
  'v3_s4.txt': "Deux documents concrets.\nUne candidature mieux préparée.",
  'v3_s5.txt': "Essaie gratuitement sur jnbalign.com\nLien en bio !",
  'v3_end_tag.txt': "LANCEMENT OFFICIEL",
  'v3_end_slogan.txt': "Deux documents. Un avenir professionnel aligné.",
  'v3_end_domain.txt': "jnbalign.com",
  'v3_end_cta.txt': "Essaie gratuitement — lien en bio",
  'v3_end_bio.txt': "Clique sur le lien en bio",
};

for (const [filename, content] of Object.entries(files)) {
  fs.writeFileSync(path.join(subDir, filename), content.trim() + '\n', 'utf-8');
}

console.log('✅ Tous les sous-titres synchronisés V7 sont prêts dans scripts/subtitles_v7/');
