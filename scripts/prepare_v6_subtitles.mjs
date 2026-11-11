import fs from 'fs';
import path from 'path';

const subDir = path.resolve(process.cwd(), 'scripts', 'subtitles_v6');
if (!fs.existsSync(subDir)) fs.mkdirSync(subDir, { recursive: true });

function writeSub(filename, content) {
  // Strip any emoji or special glyph that could trigger tofu box
  const clean = content
    .replace(/[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1F100}-\u{1F1FF}\u{1F200}-\u{1F2FF}\u{1F680}-\u{1F6FF}\u{1F900}-\u{1F9FF}\u{1FA70}-\u{1FAFF}]/gu, '')
    .trim();
  fs.writeFileSync(path.join(subDir, filename), clean, 'utf-8');
}

// =========================================================================
// VIDÉO 1 : ACCROCHE (25s) — Recommandations Audit V6
// =========================================================================
writeSub('v1_s0.txt', "Ton CV ne correspond pas\ntoujours a l'offre visée ?");
writeSub('v1_s1.txt', "Adapte-le avec JNB Align,\ngratuitement.");
writeSub('v1_s2.txt', "Dépose ton CV\net l'offre visée.");
writeSub('v1_s3.txt', "L'analyse repère les compétences clés\net valorise ton parcours.");
writeSub('v1_s4.txt', "Score de compatibilité en hausse,\nCV ajusté et lettre sur mesure.");

writeSub('v1_end_tag.txt', "ANALYSE DE COMPATIBILITÉ");
writeSub('v1_end_slogan.txt', "Optimise ton CV gratuitement\navec JNB Align");
writeSub('v1_end_domain.txt', "jnbalign.com");
writeSub('v1_end_cta.txt', "Optimise ton CV gratuitement");
writeSub('v1_end_bio.txt', "Lien en bio");

// =========================================================================
// VIDÉO 2 : DÉMONSTRATION (30s) — Recommandations Audit V6
// =========================================================================
writeSub('v2_s0.txt', "Voici comment JNB Align\nadapte ton CV à une offre.");
writeSub('v2_s1.txt', "Dépose ton CV et l'annonce cible\nen quelques secondes.");
writeSub('v2_s2.txt', "L'outil analyse les compétences clés\net valorise tes expériences.");
writeSub('v2_s3.txt', "Méthode STAR : une mission devient\nune réalisation chiffrée.");
writeSub('v2_s4.txt', "Tu obtiens ton CV optimisé\net ta lettre stratégique.");
writeSub('v2_s5.txt', "Deux documents prêts\npour une candidature réussie.");

writeSub('v2_end_tag.txt', "VALORISATION DU PARCOURS");
writeSub('v2_end_slogan.txt', "Deux documents.\nUne candidature mieux préparée.");
writeSub('v2_end_domain.txt', "jnbalign.com");
writeSub('v2_end_cta.txt', "Essaie gratuitement");
writeSub('v2_end_bio.txt', "Lien en bio");

// =========================================================================
// VIDÉO 3 : LANCEMENT OFFICIEL (30s) — Recommandations Audit V6
// =========================================================================
writeSub('v3_s0.txt', "C'est officiel :\nJNB Align est disponible !");
writeSub('v3_s1.txt', "Le nouvel outil pour adapter ton CV\net préparer ta candidature.");
writeSub('v3_s2.txt', "En entrée : dépose ton CV\net l'offre ciblée.");
writeSub('v3_s3.txt', "En sortie : reçois tes 2 documents\nprêts à l'emploi.");
writeSub('v3_s4.txt', "CV valorisé selon tes vraies forces\net lettre personnalisée.");
writeSub('v3_s5.txt', "Deux documents.\nUne candidature alignée.");

writeSub('v3_end_tag.txt', "LANCEMENT OFFICIEL");
writeSub('v3_end_slogan.txt', "Deux documents.\nUn avenir professionnel aligné.");
writeSub('v3_end_domain.txt', "jnbalign.com");
writeSub('v3_end_cta.txt', "Clique sur le lien en bio");
writeSub('v3_end_bio.txt', "Accès 100 % gratuit sur jnbalign.com");

console.log('✅ Tous les sous-titres v6 créés avec succès !');
