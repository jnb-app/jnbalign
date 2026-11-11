import fs from 'fs';
import path from 'path';

const subDir = path.resolve(process.cwd(), 'scripts', 'subtitles_audit');
if (!fs.existsSync(subDir)) fs.mkdirSync(subDir, { recursive: true });

function writeSub(filename, content) {
  // Strip any emoji or non-standard characters
  const clean = content
    .replace(/[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1F100}-\u{1F1FF}\u{1F200}-\u{1F2FF}\u{1F680}-\u{1F6FF}\u{1F900}-\u{1F9FF}\u{1FA70}-\u{1FAFF}]/gu, '')
    .trim();
  fs.writeFileSync(path.join(subDir, filename), clean, 'utf-8');
}

// =========================================================================
// VIDÉO 1 : ACCROCHE (25s) — Recommandations Audit Page 2 & 5
// =========================================================================
writeSub('v1_s0.txt', "Ton CV mérite mieux\nqu'une candidature au hasard.");
writeSub('v1_s1.txt', "Adapte ton CV à chaque offre\navec JNB Align.");
writeSub('v1_s2.txt', "L'outil repère les critères clés\net optimise ton profil.");
writeSub('v1_s3.txt', "Deux documents concrets :\nCV optimisé et lettre stratégique.");
writeSub('v1_s4.txt', "Optimise ton CV gratuitement\nsur jnbalign.com !");

// Outro Vidéo 1 (Écran de fin épuré orienté bénéfice)
writeSub('v1_end_tag.txt', "CANDIDATURE CERTIFIÉE & OPTIMISÉE");
writeSub('v1_end_slogan.txt', "Optimise ton CV gratuitement\navec JNB Align");
writeSub('v1_end_domain.txt', "jnbalign.com");
writeSub('v1_end_cta.txt', "Accès 100 % gratuit");
writeSub('v1_end_bio.txt', "Lien en bio");

// =========================================================================
// VIDÉO 2 : DÉMONSTRATION (30s) — Recommandations Audit Page 3 & 5
// =========================================================================
writeSub('v2_s0.txt', "Ton expérience a de la valeur.\nFais-la ressortir.");
writeSub('v2_s1.txt', "Dépose ton CV\net l'offre d'emploi visée.");
writeSub('v2_s2.txt', "JNB Align analyse les critères clés\net l'adéquation ATS.");
writeSub('v2_s3.txt', "Transforme tes expériences\nen réalisations concrètes (STAR).");
writeSub('v2_s4.txt', "Obtiens instantanément ton CV\net ta lettre stratégique.");
writeSub('v2_s5.txt', "Deux documents pour\nune candidature mieux préparée.");
writeSub('v2_s6.txt', "Gratuitement\nsur jnbalign.com !");

// Outro Vidéo 2 (Écran de fin épuré)
writeSub('v2_end_tag.txt', "CANDIDATURE OPTIMISÉE");
writeSub('v2_end_slogan.txt', "Deux documents.\nUne candidature mieux préparée.");
writeSub('v2_end_domain.txt', "jnbalign.com");
writeSub('v2_end_cta.txt', "Gratuitement sur jnbalign.com");
writeSub('v2_end_bio.txt', "Lien en bio");

// =========================================================================
// VIDÉO 3 : LANCEMENT OFFICIEL (30s) — Recommandations Audit transversales
// =========================================================================
writeSub('v3_s0.txt', "C'est officiel :\nJNB Align est lancé !");
writeSub('v3_s1.txt', "Le copilote conçu pour valoriser\nton vrai parcours.");
writeSub('v3_s2.txt', "Importe ton CV\net l'offre d'emploi visée.");
writeSub('v3_s3.txt', "L'outil restructure tes expériences\nen réalisations percutantes.");
writeSub('v3_s4.txt', "Télécharge deux documents\nprêts à l'envoi.");
writeSub('v3_s5.txt', "Deux documents.\nUne candidature alignée.");
writeSub('v3_s6.txt', "Découvre JNB Align gratuitement\nsur jnbalign.com !");

// Outro Vidéo 3 (Écran de fin prestige officiel)
writeSub('v3_end_tag.txt', "LANCEMENT OFFICIEL");
writeSub('v3_end_slogan.txt', "Deux documents.\nUn avenir professionnel aligné.");
writeSub('v3_end_domain.txt', "jnbalign.com");
writeSub('v3_end_cta.txt', "Accès 100 % gratuit");
writeSub('v3_end_bio.txt', "Lien en bio");

console.log('✅ Tous les sous-titres 2 lignes audit créés sans émoji ni artefact !');
