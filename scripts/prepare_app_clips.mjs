import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

const clipsDir = path.resolve('public/clips');
if (!fs.existsSync(clipsDir)) fs.mkdirSync(clipsDir, { recursive: true });

const srcRecording = 'public/assets/aistudio/Screen_Recording_20261105_192506_Chrome_3b294f11.mp4';

console.log("🎬 Génération des 3 clips vidéo réels de l'application en cours d'utilisation...");

// V1 clip: 2.8s à 5.5s (durée 3.0s) - Action sur l'interface
const v1Clip = path.join(clipsDir, 'v1_app_demo.mp4');
execSync(`ffmpeg -y -ss 2 -t 3.5 -i "${srcRecording}" -vf "crop=720:1360:0:110,scale=1000:1880:force_original_aspect_ratio=decrease,pad=1080:1920:(ow-iw)/2:(oh-ih)/2:color=0x080D20,fps=30" -c:v libx264 -preset fast -crf 20 "${v1Clip}"`, { stdio: 'inherit' });

// V2 clip: 0.0s à 3.2s (durée 3.5s) - Démarrage dynamique
const v2Clip = path.join(clipsDir, 'v2_app_intro.mp4');
execSync(`ffmpeg -y -ss 0.5 -t 3.5 -i "${srcRecording}" -vf "crop=720:1360:0:110,scale=1000:1880:force_original_aspect_ratio=decrease,pad=1080:1920:(ow-iw)/2:(oh-ih)/2:color=0x080D20,fps=30" -c:v libx264 -preset fast -crf 20 "${v2Clip}"`, { stdio: 'inherit' });

// V3 clip: 3.2s à 7.2s (durée 4.5s) - Le copilote en action
const v3Clip = path.join(clipsDir, 'v3_app_copilote.mp4');
execSync(`ffmpeg -y -ss 4 -t 4.5 -i "${srcRecording}" -vf "crop=720:1360:0:110,scale=1000:1880:force_original_aspect_ratio=decrease,pad=1080:1920:(ow-iw)/2:(oh-ih)/2:color=0x080D20,fps=30" -c:v libx264 -preset fast -crf 20 "${v3Clip}"`, { stdio: 'inherit' });

console.log("✅ Clips d'application en cours d'utilisation générés avec succès !");
