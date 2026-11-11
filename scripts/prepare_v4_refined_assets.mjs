import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

const fontPath = '/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf';
const dir = path.resolve(process.cwd(), 'public', 'captures_clean');

console.log('🎨 Génération des assets visuels affinés (Brief V4 - Audit Final)...');

// 1. Vidéo 1 : Accroche d'accueil avec léger punch-in (120%) net et dynamique
const v1Accueil = path.join(dir, 'v1_accueil_punchin.jpg');
execSync(`ffmpeg -y -i "public/captures_clean/01_accueil_clean.jpg" -vf "\
  crop=600:1080:60:120,scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920 \
" -q:v 2 "${v1Accueil}"`);
console.log('✅ Asset V1 Accueil Punch-in créé :', v1Accueil);

// 2. Vidéo 2 : Zoom 130% sur les chiffres verts STAR (+28%, 92%)
const v2StarZoom = path.join(dir, 'v2_star_zoom_metrics.jpg');
execSync(`ffmpeg -y -i "public/captures_clean/v2_star_avant_apres.jpg" -vf "\
  crop=640:540:40:460,scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920, \
  drawbox=x=60:y=240:w=960:h=480:color=0x064E3B@0.95:t=fill, \
  drawbox=x=60:y=240:w=960:h=480:color=0x22C55E@1:t=6, \
  drawtext=fontfile='${fontPath}':text='MÉTHODE STAR CHIFFRÉE':fontsize=42:fontcolor=0x4ADE80:x=(w-text_w)/2:y=280, \
  drawtext=fontfile='${fontPath}':text='14 PROJETS PILOTÉS':fontsize=52:fontcolor=white:x=(w-text_w)/2:y=370, \
  drawtext=fontfile='${fontPath}':text='DÉLAIS : -28%':fontsize=76:fontcolor=0x22C55E:x=(w-text_w)/2:y=450, \
  drawtext=fontfile='${fontPath}':text='SCORE ATS : 92%':fontsize=82:fontcolor=0xFDE047:x=(w-text_w)/2:y=560 \
" -q:v 2 "${v2StarZoom}"`);
console.log('✅ Asset V2 STAR Zoom Chiffres créé :', v2StarZoom);

// 3. Vidéo 2 : Écran de fin sur l'application (Candidature prête) avec sticker dynamique LIEN EN BIO (ZÉRO écran noir)
const v2Fin = path.join(dir, 'v2_fin_candidature_prete.jpg');
execSync(`ffmpeg -y -i "public/captures_clean/10_prete_clean.jpg" -vf "\
  scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920, \
  drawbox=x=80:y=1320:w=920:h=260:color=0x080D20@0.96:t=fill, \
  drawbox=x=80:y=1320:w=920:h=260:color=0xF6C94D@1:t=6, \
  drawtext=fontfile='${fontPath}':text='FAIS LE TEST SUR TON CV':fontsize=48:fontcolor=white:x=(w-text_w)/2:y=1360, \
  drawtext=fontfile='${fontPath}':text='LIEN EN BIO':fontsize=68:fontcolor=0xF6C94D:x=(w-text_w)/2:y=1430, \
  drawtext=fontfile='${fontPath}':text='100% GRATUIT SUR JNBALIGN.COM':fontsize=34:fontcolor=0x37CDA3:x=(w-text_w)/2:y=1520 \
" -q:v 2 "${v2Fin}"`);
console.log('✅ Asset V2 Fin Candidature Prête créé :', v2Fin);

// 4. Mettre à jour zoom_btn_offre à partir du nouveau 03_offre_clean assaini
execSync(`ffmpeg -y -i "public/captures_clean/03_offre_clean.jpg" -vf "crop=540:540:90:200,scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920" -q:v 2 "${path.join(dir, 'zoom_btn_offre.jpg')}"`);
console.log('✅ Asset zoom_btn_offre mis à jour sans aucun bug API !');

console.log('🎉 Tous les assets affinés sont prêts !');
