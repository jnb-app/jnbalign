import fs from 'fs';
import path from 'path';

const dir = path.resolve(process.cwd(), 'scripts', 'subtitles');
if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

const subtitles = {
  // Video 1 : Accroche 25s
  'v1_s0.txt': "Ton CV est-il vraiment adapté à l'offre ?",
  'v1_s1.txt': "JNB ALIGN",
  'v1_s1_sub.txt': "Le copilote de candidature bienveillant",
  'v1_s2.txt': "Dépose ton CV et l'offre qui t'intéresse",
  'v1_s3.txt': "JNB Align repère les points clés à ajuster",
  'v1_s4.txt': "Prépare deux documents adaptés à ta candidature",
  'v1_s5_tag.txt': "ACCÈS EN LIGNE GRATUIT",
  'v1_s5_domain.txt': "jnbalign.com",
  'v1_s5_cta.txt': "Teste gratuitement sur jnbalign.com",
  'v1_s5_bio.txt': "Lien en bio",

  // Video 2 : Démonstration 30s
  'v2_s0.txt': "Voici comment optimiser ton CV en quelques étapes",
  'v2_s1.txt': "Dépose ton CV actuel",
  'v2_s2.txt': "Ajoute l'offre d'emploi ciblée",
  'v2_s3.txt': "Analyse les compétences clés et les écarts",
  'v2_s4.txt': "Méthode STAR : Situation, Action, Résultat",
  'v2_s5.txt': "Ton CV et ta lettre prêts à être relus et utilisés",
  'v2_s6_slogan.txt': "Deux documents. Une candidature mieux préparée.",
  'v2_s6_tag.txt': "Gratuitement.",
  'v2_s6_domain.txt': "jnbalign.com",
  'v2_s6_cta.txt': "Essaie gratuitement sur jnbalign.com",
  'v2_s6_bio.txt': "Lien en bio",

  // Video 3 : Lancement 30s
  'v3_s0_title.txt': "C'EST OFFICIEL !",
  'v3_s0_sub.txt': "JNB ALIGN EST LANCÉ !",
  'v3_s1.txt': "Un CV travaillé à partir de chaque offre visée",
  'v3_s2.txt': "Identifie les éléments clés à renforcer",
  'v3_s3.txt': "Mets en valeur tes expériences réelles (STAR)",
  'v3_s4.txt': "Prépare ton CV et ta lettre de motivation",
  'v3_s5_tag.txt': "ACCÈS EN LIGNE GRATUIT",
  'v3_s5_sub.txt': "Données privées strictement préservées",
  'v3_s6_slogan.txt': "Deux documents. Un avenir professionnel aligné.",
  'v3_s6_domain.txt': "jnbalign.com",
  'v3_s6_cta.txt': "Découvre JNB Align sur jnbalign.com",
  'v3_s6_bio.txt': "Lien en bio"
};

for (const [filename, content] of Object.entries(subtitles)) {
  fs.writeFileSync(path.join(dir, filename), content, 'utf8');
}

console.log('✅ Tous les fichiers de sous-titres UTF-8 avec accents parfaits sont générés dans scripts/subtitles/');
