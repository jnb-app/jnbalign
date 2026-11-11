import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

// Let's create a directory to store short snippets of audio for inspection
const testDir = path.resolve('public/audio_slices');
if (!fs.existsSync(testDir)) fs.mkdirSync(testDir, { recursive: true });

// Let's test the speech segments for Video 1, 2, 3
// We know the exact script words. Let's slice the audio at each pause and check duration!

console.log("=== VIDEO 1 ACCROCHE SPEECH SEGMENTS ===");
// Script 1:
// 1. "Ton CV est-il vraiment adapté à l'offre que tu vises ?"
// 2. "JNB Align t'aide à l'optimiser gratuitement, sans inventer ton parcours."
// 3. "Dépose ton CV et l'offre ciblée."
// 4. "L'analyse repère les mots-clés et valorise tes compétences."
// 5. "Résultat : ton CV optimisé et ta lettre stratégique."
// 6. "Essaie maintenant : lien en bio sur jnbalign point com !"

const v1Cuts = [
  { label: "1_question", start: 0.25, dur: 2.3 },
  { label: "2_jnb_align", start: 3.05, dur: 2.25 },
  { label: "3_depose", start: 5.5, dur: 3.3 },
  { label: "4_analyse", start: 9.5, dur: 2.45 },
  { label: "5_resultat", start: 12.5, dur: 3.0 },
  { label: "6_cta", start: 16.0, dur: 3.3 },
];

for (const c of v1Cuts) {
  const outFile = path.join(testDir, `v1_${c.label}.mp3`);
  execSync(`ffmpeg -y -ss ${c.start} -t ${c.dur} -i public/audio/video_1_accroche_v7.mp3 -c copy "${outFile}" 2>/dev/null`);
}

console.log("=== VIDEO 2 DEMO SPEECH SEGMENTS ===");
// Script 2:
// 1. "Voici comment optimiser ton CV en quelques étapes." (0.26 - 2.78)
// 2. "Dépose ton CV et l'offre ciblée." (3.38 - 5.12)
// 3. "JNB Align analyse les mots-clés et l'adéquation ATS." (5.78 - 8.68)
// 4. "Regarde la méthode STAR : une mission générique devient une réalisation concrète." (9.31 - 12.97)
// 5. "Même expérience, meilleure présentation, aucun fait inventé." (13.55 - 16.38)
// 6. "Tu obtiens ton CV optimisé et ta lettre stratégique." (17.36 - 19.97)
// 7. "Deux documents pour une candidature mieux préparée." (20.54 - 22.53)
// 8. "Essaie gratuitement : lien en bio !" (23.19 - 24.50)

console.log("=== VIDEO 3 LANCEMENT SPEECH SEGMENTS ===");
// Script 3:
// 1. "C'est officiel ! JNB Align est lancé." (0.36 - 2.94)
// 2. "Le copilote pour adapter ton CV à chaque offre, sans travestir ton parcours." (3.52 - 6.69)
// 3. "Le principe est simple : deux éléments en entrée, ton CV et l'offre visée." (7.65 - 11.85)
// 4. "Et deux documents en sortie, ton CV optimisé et ta lettre personnalisée prêts à l'envoi." (12.57 - 16.90)
// 5. "Deux documents, une candidature mieux préparée." (17.65 - 19.75)
// 6. "Découvre JNB Align : essaie gratuitement sur jnbalign point com, lien en bio !" (20.53 - 24.74)

console.log("Segments defined successfully.");
