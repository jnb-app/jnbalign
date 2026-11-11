import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

const dir = path.resolve(process.cwd(), 'public', 'captures_clean');

console.log('🔍 Génération des crops Punch-In 125-140% pour les séquences rythmées...');

// 1. Zoom sur le bouton Dépôt CV (135%)
execSync(`ffmpeg -y -i "public/captures_clean/02_import_clean.jpg" -vf "crop=540:540:90:350,scale=980:-2" -q:v 2 "${path.join(dir, 'zoom_btn_import.jpg')}"`);

// 2. Zoom sur le bouton Ajout Offre (135%)
execSync(`ffmpeg -y -i "public/captures_clean/03_offre_clean.jpg" -vf "crop=540:540:90:280,scale=980:-2" -q:v 2 "${path.join(dir, 'zoom_btn_offre.jpg')}"`);

// 3. Zoom sur le Score 92% (140%)
execSync(`ffmpeg -y -i "public/captures_clean/06_score_clean.jpg" -vf "crop=480:480:120:190,scale=980:-2" -q:v 2 "${path.join(dir, 'zoom_score_circle.jpg')}"`);

// 4. Zoom sur les Fiches Export (130%)
execSync(`ffmpeg -y -i "public/captures_clean/09_export_clean.jpg" -vf "crop=560:560:80:320,scale=980:-2" -q:v 2 "${path.join(dir, 'zoom_export_fiches.jpg')}"`);

console.log('✅ Tous les crops Punch-in 130-140% sont créés avec netteté !');
