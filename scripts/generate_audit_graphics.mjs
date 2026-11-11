import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

const fontPath = '/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf';
const outDir = path.resolve(process.cwd(), 'public', 'captures_clean');

// 1. CARTE AVANT / APRÈS STAR (Vidéo 2 - Recommandation Prioritaire Audit)
const starJpg = path.join(outDir, 'v2_star_transformation.jpg');
console.log('Generating v2_star_transformation.jpg with FFmpeg...');

const cmdStar = `ffmpeg -y -f lavfi -i "color=c=0x080D20:s=1080x1920:r=1:d=1" -vf "\
  drawbox=x=80:y=180:w=920:h=60:color=0x1E293B@1:t=fill, \
  drawbox=x=80:y=180:w=920:h=60:color=0xF6C94D@1:t=3, \
  drawtext=fontfile='${fontPath}':expansion=none:text='METHODE STAR - EXEMPLE REEL':fontsize=28:fontcolor=0xF6C94D:x=(w-text_w)/2:y=195, \
  drawtext=fontfile='${fontPath}':expansion=none:text='TRANSFORMATION CONCRETE':fontsize=52:fontcolor=white:x=(w-text_w)/2:y=270, \
  drawtext=fontfile='${fontPath}':expansion=none:text='Valorise ton parcours sans rien inventer':fontsize=28:fontcolor=0x94A3B8:x=(w-text_w)/2:y=340, \
  drawbox=x=70:y=410:w=940:h=380:color=0x111827@0.95:t=fill, \
  drawbox=x=70:y=410:w=940:h=380:color=0xEF4444@1:t=4, \
  drawbox=x=100:y=440:w=160:h=44:color=0x7F1D1D@1:t=fill, \
  drawtext=fontfile='${fontPath}':expansion=none:text='AVANT':fontsize=24:fontcolor=0xFCA5A5:x=140:y=450, \
  drawtext=fontfile='${fontPath}':expansion=none:text='Description classique et generique':fontsize=24:fontcolor=0x94A3B8:x=290:y=450, \
  drawtext=fontfile='${fontPath}':expansion=none:text='Charge de projet marketing':fontsize=34:fontcolor=white:x=110:y=520, \
  drawtext=fontfile='${fontPath}':expansion=none:text='Entreprise Tech (2022 - 2024)':fontsize=24:fontcolor=0x64748B:x=110:y=570, \
  drawbox=x=100:y=620:w=880:h=140:color=0x0F172A@1:t=fill, \
  drawtext=fontfile='${fontPath}':expansion=none:text='- Gestion des reseaux sociaux et creation de contenus':fontsize=26:fontcolor=0xCBD5E1:x=130:y=655, \
  drawtext=fontfile='${fontPath}':expansion=none:text='- Suivi des reunions et coordination des prestataires':fontsize=26:fontcolor=0xCBD5E1:x=130:y=705, \
  drawbox=x=320:y=830:w=440:h=56:color=0x0F172A@1:t=fill, \
  drawbox=x=320:y=830:w=440:h=56:color=0xF6C94D@1:t=3, \
  drawtext=fontfile='${fontPath}':expansion=none:text='RESTRUCTURE PAR JNB ALIGN':fontsize=24:fontcolor=0xF6C94D:x=(w-text_w)/2:y=846, \
  drawbox=x=70:y=920:w=940:h=600:color=0x064E3B@0.95:t=fill, \
  drawbox=x=70:y=920:w=940:h=600:color=0x34D399@1:t=5, \
  drawbox=x=100:y=950:w=200:h=46:color=0x065F46@1:t=fill, \
  drawtext=fontfile='${fontPath}':expansion=none:text='APRES (STAR)':fontsize=26:fontcolor=0xA7F3D0:x=120:y=960, \
  drawtext=fontfile='${fontPath}':expansion=none:text='Fidele aux faits et valorisant':fontsize=26:fontcolor=white:x=330:y=960, \
  drawtext=fontfile='${fontPath}':expansion=none:text='Responsable projets et acquisition':fontsize=36:fontcolor=white:x=110:y=1030, \
  drawbox=x=100:y=1090:w=880:h=390:color=0x032E24@1:t=fill, \
  drawtext=fontfile='${fontPath}':expansion=none:text='SITUATION & TACHE :':fontsize=24:fontcolor=0x34D399:x=130:y=1120, \
  drawtext=fontfile='${fontPath}':expansion=none:text='Pilotage de 12 campagnes multi-canaux':fontsize=28:fontcolor=white:x=130:y=1155, \
  drawtext=fontfile='${fontPath}':expansion=none:text='ACTIONS MENEES :':fontsize=24:fontcolor=0x34D399:x=130:y=1220, \
  drawtext=fontfile='${fontPath}':expansion=none:text='Refonte editoriale et coordination de 4 experts':fontsize=28:fontcolor=white:x=130:y=1255, \
  drawtext=fontfile='${fontPath}':expansion=none:text='RESULTATS CHIFFRES CONCRETS :':fontsize=26:fontcolor=0xFDE047:x=130:y=1320, \
  drawtext=fontfile='${fontPath}':expansion=none:text='+45 % d engagement | 3 500 inscrits qualifies':fontsize=32:fontcolor=white:x=130:y=1365, \
  drawtext=fontfile='${fontPath}':expansion=none:text='Score de compatibilite ATS : 92 %':fontsize=28:fontcolor=0x34D399:x=130:y=1420, \
  drawbox=x=190:y=1560:w=700:h=60:color=0x0D1530@1:t=fill, \
  drawbox=x=190:y=1560:w=700:h=60:color=0xF6C94D@1:t=2, \
  drawtext=fontfile='${fontPath}':expansion=none:text='FAITS REELS PRESERVES - AUCUNE INVENTION':fontsize=24:fontcolor=0xF6C94D:x=(w-text_w)/2:y=1578 \
" -vframes 1 "${starJpg}"`;

execSync(cmdStar, { stdio: 'inherit' });
console.log('✅ Carte v2_star_transformation.jpg créée !');

// 2. CARTE ENTRÉE / SORTIE (Vidéo 3 - Recommandation Spécifique Audit)
const esJpg = path.join(outDir, 'v3_entree_sortie.jpg');
console.log('Generating v3_entree_sortie.jpg with FFmpeg...');

const cmdEs = `ffmpeg -y -f lavfi -i "color=c=0x080D20:s=1080x1920:r=1:d=1" -vf "\
  drawbox=x=140:y=180:w=800:h=60:color=0x1E293B@1:t=fill, \
  drawbox=x=140:y=180:w=800:h=60:color=0x37CDA3@1:t=3, \
  drawtext=fontfile='${fontPath}':expansion=none:text='LANCEMENT OFFICIEL - JNB ALIGN':fontsize=28:fontcolor=0x37CDA3:x=(w-text_w)/2:y=195, \
  drawtext=fontfile='${fontPath}':expansion=none:text='LE PRINCIPE EST SIMPLE':fontsize=52:fontcolor=white:x=(w-text_w)/2:y=270, \
  drawtext=fontfile='${fontPath}':expansion=none:text='En entree - ton CV et l offre | En sortie - 2 documents':fontsize=26:fontcolor=0xF6C94D:x=(w-text_w)/2:y=340, \
  drawbox=x=70:y=410:w=940:h=380:color=0x0F1E36@0.95:t=fill, \
  drawbox=x=70:y=410:w=940:h=380:color=0x38BDF8@1:t=4, \
  drawbox=x=100:y=440:w=220:h=46:color=0x0369A1@1:t=fill, \
  drawtext=fontfile='${fontPath}':expansion=none:text='1. EN ENTREE':fontsize=26:fontcolor=white:x=130:y=450, \
  drawtext=fontfile='${fontPath}':expansion=none:text='Deux elements en quelques clics':fontsize=24:fontcolor=0x94A3B8:x=350:y=450, \
  drawbox=x=100:y=510:w=410:h=240:color=0x0B132B@1:t=fill, \
  drawbox=x=100:y=510:w=410:h=240:color=0x38BDF8@1:t=2, \
  drawtext=fontfile='${fontPath}':expansion=none:text='TON CV ACTUEL':fontsize=30:fontcolor=white:x=170:y=560, \
  drawtext=fontfile='${fontPath}':expansion=none:text='PDF, Word ou texte':fontsize=24:fontcolor=0x38BDF8:x=180:y=620, \
  drawtext=fontfile='${fontPath}':expansion=none:text='Experiences et parcours':fontsize=22:fontcolor=0x94A3B8:x=160:y=680, \
  drawbox=x=560:y=510:w=410:h=240:color=0x0B132B@1:t=fill, \
  drawbox=x=560:y=510:w=410:h=240:color=0x38BDF8@1:t=2, \
  drawtext=fontfile='${fontPath}':expansion=none:text='L OFFRE CIBLEE':fontsize=30:fontcolor=white:x=630:y=560, \
  drawtext=fontfile='${fontPath}':expansion=none:text='Lien ou descriptif':fontsize=24:fontcolor=0x38BDF8:x=650:y=620, \
  drawtext=fontfile='${fontPath}':expansion=none:text='Criteres recruteurs':fontsize=22:fontcolor=0x94A3B8:x=640:y=680, \
  drawbox=x=250:y=830:w=580:h=56:color=0x0F172A@1:t=fill, \
  drawbox=x=250:y=830:w=580:h=56:color=0xF6C94D@1:t=3, \
  drawtext=fontfile='${fontPath}':expansion=none:text='ADEQUATION ET RESTUCTURATION JNB ALIGN':fontsize=24:fontcolor=0xF6C94D:x=(w-text_w)/2:y=846, \
  drawbox=x=70:y=920:w=940:h=590:color=0x0F1E36@0.95:t=fill, \
  drawbox=x=70:y=920:w=940:h=590:color=0xF6C94D@1:t=4, \
  drawbox=x=100:y=950:w=240:h=46:color=0xB45309@1:t=fill, \
  drawtext=fontfile='${fontPath}':expansion=none:text='2. EN SORTIE':fontsize=26:fontcolor=white:x=140:y=960, \
  drawtext=fontfile='${fontPath}':expansion=none:text='Deux documents strategiques':fontsize=26:fontcolor=white:x=370:y=960, \
  drawbox=x=100:y=1020:w=410:h=340:color=0x0B132B@1:t=fill, \
  drawbox=x=100:y=1020:w=410:h=340:color=0xF6C94D@1:t=2, \
  drawtext=fontfile='${fontPath}':expansion=none:text='CV OPTIMISE':fontsize=30:fontcolor=0xF6C94D:x=180:y=1070, \
  drawtext=fontfile='${fontPath}':expansion=none:text='- Competences alignees':fontsize=22:fontcolor=0xA7F3D0:x=130:y=1130, \
  drawtext=fontfile='${fontPath}':expansion=none:text='- Methode STAR appliquee':fontsize=22:fontcolor=0xA7F3D0:x=130:y=1180, \
  drawtext=fontfile='${fontPath}':expansion=none:text='- Resultats chiffres':fontsize=22:fontcolor=0xA7F3D0:x=130:y=1230, \
  drawbox=x=140:y=1270:w=330:h=50:color=0x047857@1:t=fill, \
  drawtext=fontfile='${fontPath}':expansion=none:text='Export PDF et Word':fontsize=22:fontcolor=white:x=190:y=1300, \
  drawbox=x=560:y=1020:w=410:h=340:color=0x0B132B@1:t=fill, \
  drawbox=x=560:y=1020:w=410:h=340:color=0xF6C94D@1:t=2, \
  drawtext=fontfile='${fontPath}':expansion=none:text='LETTRE SUR-MESURE':fontsize=28:fontcolor=0xF6C94D:x=600:y=1070, \
  drawtext=fontfile='${fontPath}':expansion=none:text='- Accroche ciblee':fontsize=22:fontcolor=0xA7F3D0:x=590:y=1130, \
  drawtext=fontfile='${fontPath}':expansion=none:text='- Reponse aux missions':fontsize=22:fontcolor=0xA7F3D0:x=590:y=1180, \
  drawtext=fontfile='${fontPath}':expansion=none:text='- Ton personnalise':fontsize=22:fontcolor=0xA7F3D0:x=590:y=1230, \
  drawbox=x=600:y=1270:w=330:h=50:color=0x047857@1:t=fill, \
  drawtext=fontfile='${fontPath}':expansion=none:text='Export PDF et Word':fontsize=22:fontcolor=white:x=650:y=1300, \
  drawbox=x=100:y=1390:w=870:h=90:color=0x064E3B@1:t=fill, \
  drawbox=x=100:y=1390:w=870:h=90:color=0x34D399@1:t=2, \
  drawtext=fontfile='${fontPath}':expansion=none:text='DEUX DOCUMENTS - CANDIDATURE PRETE':fontsize=28:fontcolor=white:x=(w-text_w)/2:y=1445, \
  drawbox=x=190:y=1560:w=700:h=60:color=0x0D1530@1:t=fill, \
  drawbox=x=190:y=1560:w=700:h=60:color=0xF6C94D@1:t=2, \
  drawtext=fontfile='${fontPath}':expansion=none:text='ESSAIE GRATUITEMENT SUR JNBALIGN.COM':fontsize=24:fontcolor=0xF6C94D:x=(w-text_w)/2:y=1578 \
" -vframes 1 "${esJpg}"`;

execSync(cmdEs, { stdio: 'inherit' });
console.log('✅ Carte v3_entree_sortie.jpg créée !');
