import fs from 'fs';
import path from 'path';

const subDir = path.resolve(process.cwd(), 'scripts', 'subtitles_v7');
if (!fs.existsSync(subDir)) fs.mkdirSync(subDir, { recursive: true });

function writeSub(filename, content) {
  // Strip any emoji or non-standard characters
  const clean = content
    .replace(/[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1F100}-\u{1F1FF}\u{1F200}-\u{1F2FF}\u{1F680}-\u{1F6FF}\u{1F900}-\u{1F9FF}\u{1FA70}-\u{1FAFF}]/gu, '')
    .trim();
  fs.writeFileSync(path.join(subDir, filename), clean, 'utf-8');
}

// VIDÉO 1 : ACCROCHE (25s) — Formulations exactes Audit V7
writeSub('v1_s0.txt', "Ton CV est-il vraiment adapté\nà l'offre que tu vises ?");
writeSub('v1_s1.txt', "JNB Align t'aide à l'optimiser\ngratuitement, sans inventer.");
writeSub('v1_s2.txt', "Dépose ton CV\net l'offre ciblée.");
writeSub('v1_s3.txt', "L'analyse repère les mots-clés\net valorise tes compétences.");
writeSub('v1_s4.txt', "Deux documents concrets :\nCV optimisé et lettre stratégique.");

writeSub('v1_end_tag.txt', "ANALYSE DE COMPATIBILITÉ");
writeSub('v1_end_slogan.txt', "Optimise ton CV gratuitement\navec JNB Align");
writeSub('v1_end_domain.txt', "jnbalign.com");
writeSub('v1_end_cta.txt', "Essaie maintenant — lien en bio");
writeSub('v1_end_bio.txt', "Accès 100 % gratuit");

// VIDÉO 2 : DÉMONSTRATION (30s) — Formulations exactes Audit V7
writeSub('v2_s0.txt', "Voici comment optimiser ton CV\nen quelques étapes.");
writeSub('v2_s1.txt', "Dépose ton CV\net l'offre d'emploi ciblée.");
writeSub('v2_s2.txt', "JNB Align analyse les mots-clés\net l'adéquation aux critères.");
writeSub('v2_s3.txt', "Méthode STAR : une mission générique\ndevient une réalisation concrète.");
writeSub('v2_s4.txt', "Même expérience. Meilleure présentation.\nAucun fait inventé.");
writeSub('v2_s5.txt', "Deux documents prêts à l'envoi :\nton CV et ta lettre stratégique.");

writeSub('v2_end_tag.txt', "VALORISATION DU PARCOURS");
writeSub('v2_end_slogan.txt', "Deux documents.\nUne candidature mieux préparée.");
writeSub('v2_end_domain.txt', "jnbalign.com");
writeSub('v2_end_cta.txt', "Essaie gratuitement — lien en bio");
writeSub('v2_end_bio.txt', "Accès gratuit sans condition");

// VIDÉO 3 : LANCEMENT OFFICIEL (30s) — Formulations exactes Audit V7
writeSub('v3_s0.txt', "C'est officiel !\nJNB Align est lancé.");
writeSub('v3_s1.txt', "Adapte ton CV à chaque offre,\nsans travestir ton parcours.");
writeSub('v3_s2.txt', "Deux éléments en entrée :\nton CV et l'offre visée.");
writeSub('v3_s3.txt', "Deux documents en sortie :\nCV optimisé et lettre sur mesure.");
writeSub('v3_s4.txt', "Deux documents concrets.\nUne candidature mieux préparée.");
writeSub('v3_s5.txt', "Découvre JNB Align gratuitement\nsur jnbalign.com !");

writeSub('v3_end_tag.txt', "LANCEMENT OFFICIEL");
writeSub('v3_end_slogan.txt', "Deux documents.\nUn avenir professionnel aligné.");
writeSub('v3_end_domain.txt', "jnbalign.com");
writeSub('v3_end_cta.txt', "Essaie gratuitement — lien en bio");
writeSub('v3_end_bio.txt', "Clique sur le lien en bio");

console.log('✅ Tous les sous-titres V7 sont créés !');
