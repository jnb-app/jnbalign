import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

const fontPath = '/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf';
const outDir = path.resolve(process.cwd(), 'public', 'captures_clean');

console.log('🎨 Génération des assets graphiques haute lisibilité mobile (Audit V7)...');

// 1. CARTE VIDÉO 1 : HOOK GÉANT LISIBLE EN 1 SECONDE (0-2s)
// "Ton CV est-il vraiment adapté à l'offre que tu vises ?"
const v1HookJpg = path.join(outDir, 'v1_hook_question_geante.jpg');
const cmdV1Hook = `ffmpeg -y -f lavfi -i "color=c=0x080D20:s=1080x1920:r=1:d=1" -vf "\
  drawbox=x=120:y=380:w=840:h=64:color=0x1E293B@1:t=fill, \
  drawbox=x=120:y=380:w=840:h=64:color=0xF6C94D@1:t=3, \
  drawtext=fontfile='${fontPath}':expansion=none:text='CANDIDATURE & RECRUTEMENT':fontsize=30:fontcolor=0xF6C94D:x=(w-text_w)/2:y=398, \
  drawtext=fontfile='${fontPath}':expansion=none:text='TON CV EST-IL':fontsize=64:fontcolor=white:x=(w-text_w)/2:y=540, \
  drawtext=fontfile='${fontPath}':expansion=none:text='VRAIMENT ADAPTE':fontsize=76:fontcolor=0xF6C94D:x=(w-text_w)/2:y=640, \
  drawtext=fontfile='${fontPath}':expansion=none:text='A L OFFRE QUE TU VISES ?':fontsize=54:fontcolor=white:x=(w-text_w)/2:y=760, \
  drawbox=x=140:y=920:w=800:h=260:color=0x0D1530@0.95:t=fill, \
  drawbox=x=140:y=920:w=800:h=260:color=0x37CDA3@1:t=4, \
  drawtext=fontfile='${fontPath}':expansion=none:text='JNB Align t aide a l optimiser gratuitement':fontsize=32:fontcolor=white:x=(w-text_w)/2:y=970, \
  drawtext=fontfile='${fontPath}':expansion=none:text='sans inventer ton parcours':fontsize=32:fontcolor=0x37CDA3:x=(w-text_w)/2:y=1030, \
  drawtext=fontfile='${fontPath}':expansion=none:text='Deux documents prets a l envoi':fontsize=28:fontcolor=0xF6C94D:x=(w-text_w)/2:y=1110, \
  drawbox=x=220:y=1320:w=640:h=90:color=0x064E3B@1:t=fill, \
  drawbox=x=220:y=1320:w=640:h=90:color=0x34D399@1:t=3, \
  drawtext=fontfile='${fontPath}':expansion=none:text='DECOUVRE LA METHODE JNB ALIGN':fontsize=28:fontcolor=white:x=(w-text_w)/2:y=1355 \
" -vframes 1 "${v1HookJpg}"`;
execSync(cmdV1Hook, { stdio: 'inherit' });
console.log('✅ Carte v1_hook_question_geante.jpg créée !');

// 2. CARTE VIDÉO 2 : STAR PLAN 1 - AVANT (17.0 - 19.5s)
// Écran spécifique grand format pour l'état initial
const v2StarAvantJpg = path.join(outDir, 'v2_star_plan1_avant.jpg');
const cmdV2StarAvant = `ffmpeg -y -f lavfi -i "color=c=0x080D20:s=1080x1920:r=1:d=1" -vf "\
  drawbox=x=100:y=240:w=880:h=70:color=0x1E293B@1:t=fill, \
  drawbox=x=100:y=240:w=880:h=70:color=0xEF4444@1:t=4, \
  drawtext=fontfile='${fontPath}':expansion=none:text='1. DESCRIPTION INITIALE (AVANT)':fontsize=32:fontcolor=0xFCA5A5:x=(w-text_w)/2:y=260, \
  drawtext=fontfile='${fontPath}':expansion=none:text='EXPERIENCE CLASSIQUE ET GENERIQUE':fontsize=46:fontcolor=white:x=(w-text_w)/2:y=370, \
  drawbox=x=80:y=480:w=920:h=600:color=0x111827@0.96:t=fill, \
  drawbox=x=80:y=480:w=920:h=600:color=0xEF4444@1:t=5, \
  drawbox=x=120:y=520:w=200:h=48:color=0x7F1D1D@1:t=fill, \
  drawtext=fontfile='${fontPath}':expansion=none:text='CV INITIAL':fontsize=26:fontcolor=white:x=150:y=532, \
  drawtext=fontfile='${fontPath}':expansion=none:text='Charge de projet marketing':fontsize=38:fontcolor=white:x=120:y=610, \
  drawtext=fontfile='${fontPath}':expansion=none:text='Entreprise - 2 ans d experience':fontsize=26:fontcolor=0x94A3B8:x=120:y=670, \
  drawbox=x=120:y=720:w=840:h=280:color=0x0F172A@1:t=fill, \
  drawtext=fontfile='${fontPath}':expansion=none:text='- Gestion des reseaux sociaux et creation de contenus':fontsize=28:fontcolor=0xCBD5E1:x=140:y=770, \
  drawtext=fontfile='${fontPath}':expansion=none:text='- Suivi des reunions et coordination des prestataires':fontsize=28:fontcolor=0xCBD5E1:x=140:y=830, \
  drawtext=fontfile='${fontPath}':expansion=none:text='- Redaction de rapports d activite':fontsize=28:fontcolor=0xCBD5E1:x=140:y=890, \
  drawbox=x=120:y=1160:w=840:h=120:color=0x1F2937@1:t=fill, \
  drawbox=x=120:y=1160:w=840:h=120:color=0xEF4444@1:t=3, \
  drawtext=fontfile='${fontPath}':expansion=none:text='CONSTAT : Description vague, peu valorisante':fontsize=28:fontcolor=0xFCA5A5:x=(w-text_w)/2:y=1190, \
  drawtext=fontfile='${fontPath}':expansion=none:text='Les filtres recruteurs ne reperent pas les forces':fontsize=26:fontcolor=0x94A3B8:x=(w-text_w)/2:y=1235 \
" -vframes 1 "${v2StarAvantJpg}"`;
execSync(cmdV2StarAvant, { stdio: 'inherit' });
console.log('✅ Carte v2_star_plan1_avant.jpg créée !');

// 3. CARTE VIDÉO 2 : STAR PLAN 2 - APRÈS (19.5 - 22.5s)
// Écran spécifique grand format pour la reformulation STAR avec mention EXEMPLE ILLUSTRATIF
const v2StarApresJpg = path.join(outDir, 'v2_star_plan2_apres.jpg');
const cmdV2StarApres = `ffmpeg -y -f lavfi -i "color=c=0x080D20:s=1080x1920:r=1:d=1" -vf "\
  drawbox=x=100:y=220:w=880:h=70:color=0x064E3B@1:t=fill, \
  drawbox=x=100:y=220:w=880:h=70:color=0x34D399@1:t=4, \
  drawtext=fontfile='${fontPath}':expansion=none:text='2. METHODE STAR (APRES)':fontsize=32:fontcolor=0xA7F3D0:x=(w-text_w)/2:y=240, \
  drawtext=fontfile='${fontPath}':expansion=none:text='EXPERIENCE VALORISEE ET STRUCTUREE':fontsize=46:fontcolor=white:x=(w-text_w)/2:y=340, \
  drawbox=x=80:y=430:w=920:h=760:color=0x064E3B@0.96:t=fill, \
  drawbox=x=80:y=430:w=920:h=760:color=0x34D399@1:t=5, \
  drawbox=x=120:y=470:w=360:h=48:color=0x047857@1:t=fill, \
  drawtext=fontfile='${fontPath}':expansion=none:text='RESTRUCTURE PAR JNB ALIGN':fontsize=22:fontcolor=white:x=140:y=484, \
  drawtext=fontfile='${fontPath}':expansion=none:text='Responsable projets et acquisition':fontsize=38:fontcolor=white:x=120:y=560, \
  drawbox=x=120:y=620:w=840:h=480:color=0x022C22@1:t=fill, \
  drawtext=fontfile='${fontPath}':expansion=none:text='SITUATION & TACHE :':fontsize=24:fontcolor=0x34D399:x=140:y=660, \
  drawtext=fontfile='${fontPath}':expansion=none:text='Pilotage de campagnes digitales multi-canaux':fontsize=28:fontcolor=white:x=140:y=695, \
  drawtext=fontfile='${fontPath}':expansion=none:text='ACTIONS MENEES :':fontsize=24:fontcolor=0x34D399:x=140:y=765, \
  drawtext=fontfile='${fontPath}':expansion=none:text='Refonte editoriale et coordination de 4 intervenants':fontsize=28:fontcolor=white:x=140:y=800, \
  drawtext=fontfile='${fontPath}':expansion=none:text='RESULTATS CONCRETS :':fontsize=24:fontcolor=0xFDE047:x=140:y=870, \
  drawtext=fontfile='${fontPath}':expansion=none:text='Hausse mesuree de l engagement et des conversions':fontsize=28:fontcolor=white:x=140:y=905, \
  drawtext=fontfile='${fontPath}':expansion=none:text='(Exemple illustratif - Fidele a votre parcours)':fontsize=22:fontcolor=0x94A3B8:x=140:y=960, \
  drawbox=x=120:y=1260:w=840:h=120:color=0x0D1530@1:t=fill, \
  drawbox=x=120:y=1260:w=840:h=120:color=0xF6C94D@1:t=3, \
  drawtext=fontfile='${fontPath}':expansion=none:text='MEME EXPERIENCE. MEILLEURE PRESENTATION.':fontsize=28:fontcolor=0xF6C94D:x=(w-text_w)/2:y=1290, \
  drawtext=fontfile='${fontPath}':expansion=none:text='AUCUN FAIT INVENTE':fontsize=32:fontcolor=white:x=(w-text_w)/2:y=1335 \
" -vframes 1 "${v2StarApresJpg}"`;
execSync(cmdV2StarApres, { stdio: 'inherit' });
console.log('✅ Carte v2_star_plan2_apres.jpg créée !');

// 4. CARTE VIDÉO 3 : SCHÉMA ENTRÉE / SORTIE GÉANT LISIBLE SANS EFFORT (7 - 17s)
// Format agrandi à 88% de la largeur avec textes très grands et contrastés
const v3SchemaJpg = path.join(outDir, 'v3_schema_entree_sortie_geante.jpg');
const cmdV3Schema = `ffmpeg -y -f lavfi -i "color=c=0x080D20:s=1080x1920:r=1:d=1" -vf "\
  drawbox=x=120:y=180:w=840:h=60:color=0x1E293B@1:t=fill, \
  drawbox=x=120:y=180:w=840:h=60:color=0x37CDA3@1:t=3, \
  drawtext=fontfile='${fontPath}':expansion=none:text='LANCEMENT OFFICIEL - JNB ALIGN':fontsize=28:fontcolor=0x37CDA3:x=(w-text_w)/2:y=196, \
  drawtext=fontfile='${fontPath}':expansion=none:text='LE PRINCIPE EST SIMPLE':fontsize=56:fontcolor=white:x=(w-text_w)/2:y=280, \
  drawtext=fontfile='${fontPath}':expansion=none:text='Deux elements en entree - Deux documents en sortie':fontsize=28:fontcolor=0xF6C94D:x=(w-text_w)/2:y=350, \
  drawbox=x=60:y=430:w=960:h=380:color=0x0F1E36@0.96:t=fill, \
  drawbox=x=60:y=430:w=960:h=380:color=0x38BDF8@1:t=5, \
  drawbox=x=90:y=460:w=260:h=50:color=0x0369A1@1:t=fill, \
  drawtext=fontfile='${fontPath}':expansion=none:text='1. EN ENTREE':fontsize=28:fontcolor=white:x=120:y=472, \
  drawbox=x=90:y=530:w=420:h=240:color=0x0B132B@1:t=fill, \
  drawbox=x=90:y=530:w=420:h=240:color=0x38BDF8@1:t=2, \
  drawtext=fontfile='${fontPath}':expansion=none:text='TON CV ACTUEL':fontsize=32:fontcolor=white:x=150:y=590, \
  drawtext=fontfile='${fontPath}':expansion=none:text='PDF, Word ou texte':fontsize=24:fontcolor=0x38BDF8:x=170:y=650, \
  drawtext=fontfile='${fontPath}':expansion=none:text='Tes vraies experiences':fontsize=22:fontcolor=0x94A3B8:x=160:y=710, \
  drawbox=x=570:y=530:w=420:h=240:color=0x0B132B@1:t=fill, \
  drawbox=x=570:y=530:w=420:h=240:color=0x38BDF8@1:t=2, \
  drawtext=fontfile='${fontPath}':expansion=none:text='L OFFRE CIBLEE':fontsize=32:fontcolor=white:x=630:y=590, \
  drawtext=fontfile='${fontPath}':expansion=none:text='Lien ou description':fontsize=24:fontcolor=0x38BDF8:x=650:y=650, \
  drawtext=fontfile='${fontPath}':expansion=none:text='Criteres du recruteur':fontsize=22:fontcolor=0x94A3B8:x=640:y=710, \
  drawbox=x=220:y=840:w=640:h=60:color=0x0F172A@1:t=fill, \
  drawbox=x=220:y=840:w=640:h=60:color=0xF6C94D@1:t=3, \
  drawtext=fontfile='${fontPath}':expansion=none:text='ANALYSE D ADEQUATION JNB ALIGN':fontsize=26:fontcolor=0xF6C94D:x=(w-text_w)/2:y=858, \
  drawbox=x=60:y=930:w=960:h=560:color=0x0F1E36@0.96:t=fill, \
  drawbox=x=60:y=930:w=960:h=560:color=0xF6C94D@1:t=5, \
  drawbox=x=90:y=960:w=260:h=50:color=0xB45309@1:t=fill, \
  drawtext=fontfile='${fontPath}':expansion=none:text='2. EN SORTIE':fontsize=28:fontcolor=white:x=120:y=972, \
  drawbox=x=90:y=1030:w=420:h=320:color=0x0B132B@1:t=fill, \
  drawbox=x=90:y=1030:w=420:h=320:color=0xF6C94D@1:t=2, \
  drawtext=fontfile='${fontPath}':expansion=none:text='CV OPTIMISE':fontsize=32:fontcolor=0xF6C94D:x=170:y=1090, \
  drawtext=fontfile='${fontPath}':expansion=none:text='- Competences alignees':fontsize=24:fontcolor=0xA7F3D0:x=130:y=1150, \
  drawtext=fontfile='${fontPath}':expansion=none:text='- Methode STAR':fontsize=24:fontcolor=0xA7F3D0:x=130:y=1200, \
  drawtext=fontfile='${fontPath}':expansion=none:text='- Export PDF & Word':fontsize=22:fontcolor=white:x=130:y=1260, \
  drawbox=x=570:y=1030:w=420:h=320:color=0x0B132B@1:t=fill, \
  drawbox=x=570:y=1030:w=420:h=320:color=0xF6C94D@1:t=2, \
  drawtext=fontfile='${fontPath}':expansion=none:text='LETTRE SUR-MESURE':fontsize=30:fontcolor=0xF6C94D:x=600:y=1090, \
  drawtext=fontfile='${fontPath}':expansion=none:text='- Accroche ciblee':fontsize=24:fontcolor=0xA7F3D0:x=610:y=1150, \
  drawtext=fontfile='${fontPath}':expansion=none:text='- Alignement missions':fontsize=24:fontcolor=0xA7F3D0:x=610:y=1200, \
  drawtext=fontfile='${fontPath}':expansion=none:text='- Export PDF & Word':fontsize=22:fontcolor=white:x=610:y=1260, \
  drawbox=x=90:y=1380:w=900:h=80:color=0x064E3B@1:t=fill, \
  drawbox=x=90:y=1380:w=900:h=80:color=0x34D399@1:t=2, \
  drawtext=fontfile='${fontPath}':expansion=none:text='DEUX DOCUMENTS. UNE CANDIDATURE MIEUX PREPAREE.':fontsize=26:fontcolor=white:x=(w-text_w)/2:y=1430, \
  drawbox=x=140:y=1540:w=800:h=70:color=0x0D1530@1:t=fill, \
  drawbox=x=140:y=1540:w=800:h=70:color=0xF6C94D@1:t=2, \
  drawtext=fontfile='${fontPath}':expansion=none:text='ESSAIE GRATUITEMENT SUR JNBALIGN.COM':fontsize=26:fontcolor=0xF6C94D:x=(w-text_w)/2:y=1562 \
" -vframes 1 "${v3SchemaJpg}"`;
execSync(cmdV3Schema, { stdio: 'inherit' });
console.log('✅ Carte v3_schema_entree_sortie_geante.jpg créée !');
