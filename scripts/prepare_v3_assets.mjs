import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

const cleanDir = path.resolve(process.cwd(), 'public', 'captures_clean');
if (!fs.existsSync(cleanDir)) fs.mkdirSync(cleanDir, { recursive: true });

const fontPath = '/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf';

console.log('🎨 Préparation des nouveaux assets visuels haute conversion pour le brief V3...');

// 1. Hook Vidéo 1 : Gros plan sur CV avec alerte "Recalé en 5s"
function makeV1Hook() {
  const outFile = path.join(cleanDir, 'v1_hook_cv_recalé.jpg');
  const cmd = `ffmpeg -y -i "public/captures_clean/01_accueil_clean.jpg" -vf "\
    boxblur=4:2, \
    drawbox=x=40:y=380:w=640:h=320:color=0xEF4444@0.95:t=fill, \
    drawbox=x=40:y=380:w=640:h=320:color=0xFFFFFF@1:t=4, \
    drawtext=fontfile='${fontPath}':text='TON CV SE FAIT RECALER':fontsize=38:fontcolor=white:x=(w-text_w)/2:y=420, \
    drawtext=fontfile='${fontPath}':text='EN 5 SECONDES ?':fontsize=48:fontcolor=0xFEE2E2:x=(w-text_w)/2:y=480, \
    drawtext=fontfile='${fontPath}':text='FAIS ÇA 👇':fontsize=44:fontcolor=0xFACC15:x=(w-text_w)/2:y=560 \
  " -q:v 2 "${outFile}"`;
  execSync(cmd, { stdio: 'inherit' });
  console.log(`✅ Asset V1 Hook créé : ${outFile}`);
}

// 2. Hook Vidéo 2 : Douleur candidat "Marre de postuler dans le vide ?"
function makeV2Hook() {
  const outFile = path.join(cleanDir, 'v2_hook_postuler_vide.jpg');
  const cmd = `ffmpeg -y -i "public/captures_clean/01_accueil_clean.jpg" -vf "\
    boxblur=6:3, \
    drawbox=x=40:y=400:w=640:h=280:color=0x080D20@0.95:t=fill, \
    drawbox=x=40:y=400:w=640:h=280:color=0xF59E0B@1:t=4, \
    drawtext=fontfile='${fontPath}':text='MARRE DE POSTULER':fontsize=42:fontcolor=white:x=(w-text_w)/2:y=440, \
    drawtext=fontfile='${fontPath}':text='DANS LE VIDE ?':fontsize=52:fontcolor=0xF59E0B:x=(w-text_w)/2:y=500, \
    drawtext=fontfile='${fontPath}':text='Le problème, c est les filtres ATS':fontsize=28:fontcolor=0xE2E8F0:x=(w-text_w)/2:y=580 \
  " -q:v 2 "${outFile}"`;
  execSync(cmd, { stdio: 'inherit' });
  console.log(`✅ Asset V2 Hook créé : ${outFile}`);
}

// 3. Exemple STAR Avant / Après pour Vidéo 2
function makeStarBeforeAfter() {
  const outFile = path.join(cleanDir, 'v2_star_avant_apres.jpg');
  const cmd = `ffmpeg -y -i "public/captures_clean/07_star_clean.jpg" -vf "\
    drawbox=x=30:y=240:w=660:h=680:color=0x080D20@0.95:t=fill, \
    drawbox=x=30:y=240:w=660:h=680:color=0x38BDF8@1:t=4, \
    drawtext=fontfile='${fontPath}':text='EXEMPLE CONCRET METHODE STAR':fontsize=28:fontcolor=0x38BDF8:x=(w-text_w)/2:y=270, \
    drawbox=x=50:y=330:w=620:h=190:color=0x1E293B@0.9:t=fill, \
    drawbox=x=50:y=330:w=620:h=190:color=0xEF4444@0.9:t=3, \
    drawtext=fontfile='${fontPath}':text='AVANT - CV classique flou :':fontsize=26:fontcolor=0xF87171:x=70:y=350, \
    drawtext=fontfile='${fontPath}':text='En charge de la gestion des projets':fontsize=26:fontcolor=white:x=70:y=400, \
    drawtext=fontfile='${fontPath}':text='Aucun chiffre - Recale par les ATS':fontsize=22:fontcolor=0x94A3B8:x=70:y=450, \
    drawbox=x=50:y=550:w=620:h=240:color=0x064E3B@0.95:t=fill, \
    drawbox=x=50:y=550:w=620:h=240:color=0x22C55E@1:t=3, \
    drawtext=fontfile='${fontPath}':text='APRES AVEC JNB ALIGN - STAR :':fontsize=26:fontcolor=0x4ADE80:x=70:y=580, \
    drawtext=fontfile='${fontPath}':text='Pilote 14 projets digitaux en 8 mois':fontsize=26:fontcolor=white:x=70:y=630, \
    drawtext=fontfile='${fontPath}':text='reduisant les delais de 28 pour cent':fontsize=26:fontcolor=white:x=70:y=670, \
    drawtext=fontfile='${fontPath}':text='92 pour cent d adequation avec l offre':fontsize=22:fontcolor=0xFDE047:x=70:y=720 \
  " -q:v 2 "${outFile}"`;
  execSync(cmd, { stdio: 'inherit' });
  console.log(`✅ Asset V2 STAR Avant/Après créé : ${outFile}`);
}

// 4. Score 92% avec Surlignage Vert Fluo pour Vidéo 3
function makeScoreNeonHighlight() {
  const outFile = path.join(cleanDir, 'v3_score_neon_highlight.jpg');
  // Encadré néon vert fluo autour de la note de correspondance et des tags
  const cmd = `ffmpeg -y -i "public/captures_clean/06_score_clean.jpg" -vf "\
    drawbox=x=120:y=180:w=480:h=340:color=0x22C55E@0.9:t=8, \
    drawbox=x=115:y=175:w=490:h=350:color=0x4ADE80@0.5:t=3, \
    drawtext=fontfile='${fontPath}':text='SCORE ATS 92% DETECTE':fontsize=28:fontcolor=0x22C55E:box=1:boxcolor=0x080D20@0.9:boxborderw=10:x=(w-text_w)/2:y=140 \
  " -q:v 2 "${outFile}"`;
  execSync(cmd, { stdio: 'inherit' });
  console.log(`✅ Asset V3 Score Néon Fluo créé : ${outFile}`);
}

makeV1Hook();
makeV2Hook();
makeStarBeforeAfter();
makeScoreNeonHighlight();
console.log('🎉 Tous les nouveaux visuels spécifiques sont prêts !');
