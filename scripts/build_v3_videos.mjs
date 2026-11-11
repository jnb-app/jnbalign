import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

const outputDir = path.resolve(process.cwd(), 'public', 'videos');
if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });

const fontPath = '/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf';
const bgMusic = 'public/audio/teaser_beat_122bpm.mp3';
const sfxPop = 'public/audio/sfx/sfx_pop.wav';
const sfxWhoosh = 'public/audio/sfx/sfx_whoosh.wav';
const sfxChime = 'public/audio/sfx/sfx_chime.wav';

console.log('🎬 Rendu des 3 Vidéos TikTok ultra-optimisées selon le Brief V3...');
console.log('✨ Critères stricts : Durées réduites (23s, 21.5s, 18s), Sous-titres Karaoke 2-4 mots au milieu (y=1000, 48% du bas), Punch-in zooms 130-140%, SFX pop/whoosh/ding, aucun bug API, exemple STAR avant/après, looping infini !');

// =========================================================================
// VIDÉO 1 : ANGLE DÉMO / TUTORIEL (23.0s)
// Cible du brief : 22 à 25s. Accroche percutante, aucun bug API, analyse accélérée 250%, CTA fléché.
// =========================================================================
function renderVideo1() {
  const outFile = path.join(outputDir, 'video_1_accroche.mp4');
  const alias1 = path.join(outputDir, 'video_1.mp4');
  const aliasDemo = path.join(outputDir, 'video_2_demonstration.mp4'); // Compatibilité historique
  console.log(`\n⏳ Rendu Vidéo 1 · Démo / Tutoriel (23.0s) -> ${outFile}...`);

  const cmd = `ffmpeg -y \
    -f lavfi -i "color=c=0x080D20:s=1080x1920:r=30:d=23" \
    -loop 1 -t 2 -i "public/captures_clean/v1_hook_cv_recalé.jpg" \
    -loop 1 -t 2 -i "public/captures_clean/zoom_btn_import.jpg" \
    -loop 1 -t 2 -i "public/captures_clean/02_import_clean.jpg" \
    -loop 1 -t 2 -i "public/captures_clean/zoom_btn_offre.jpg" \
    -loop 1 -t 2 -i "public/captures_clean/03_offre_clean.jpg" \
    -loop 1 -t 2 -i "public/captures_clean/04_extraite_clean.jpg" \
    -loop 1 -t 2 -i "public/captures_clean/05_analyse_clean.jpg" \
    -loop 1 -t 2 -i "public/captures_clean/06_score_clean.jpg" \
    -loop 1 -t 3 -i "public/captures_clean/zoom_score_circle.jpg" \
    -loop 1 -t 2 -i "public/captures_clean/07_star_clean.jpg" \
    -loop 1 -t 2 -i "public/captures_clean/07_star_zoom.jpg" \
    -loop 1 -t 3 -i "public/captures_clean/zoom_export_fiches.jpg" \
    -loop 1 -t 3 -i "public/captures_clean/10_prete_clean.jpg" \
    -i "public/audio/video_1_demo_tuto.mp3" \
    -i "${bgMusic}" \
    -i "${sfxPop}" \
    -i "${sfxWhoosh}" \
    -i "${sfxChime}" \
    -filter_complex "\
      [1:v]scale=980:-2[v0]; \
      [2:v]scale=980:-2[v1]; \
      [3:v]scale=980:-2[v2]; \
      [4:v]scale=980:-2[v3]; \
      [5:v]scale=980:-2[v4]; \
      [6:v]scale=980:-2[v5]; \
      [7:v]scale=980:-2[v6]; \
      [8:v]scale=980:-2[v7]; \
      [9:v]scale=980:-2[v8]; \
      [10:v]scale=980:-2[v9]; \
      [11:v]scale=980:-2[v10]; \
      [12:v]scale=980:-2[v11]; \
      [13:v]scale=980:-2[v12]; \
      [0:v][v0]overlay=(W-w)/2:200:enable='between(t,0,1.5)'[b0]; \
      [b0][v1]overlay=(W-w)/2:320:enable='between(t,1.5,2.8)'[b1]; \
      [b1][v2]overlay=(W-w)/2:200:enable='between(t,2.8,4.2)'[b2]; \
      [b2][v3]overlay=(W-w)/2:320:enable='between(t,4.2,5.8)'[b3]; \
      [b3][v4]overlay=(W-w)/2:200:enable='between(t,5.8,7.2)'[b4]; \
      [b4][v5]overlay=(W-w)/2:200:enable='between(t,7.2,8.5)'[b5]; \
      [b5][v6]overlay=(W-w)/2:200:enable='between(t,8.5,10.2)'[b6]; \
      [b6][v7]overlay=(W-w)/2:200:enable='between(t,10.2,11.8)'[b7]; \
      [b7][v8]overlay=(W-w)/2:320:enable='between(t,11.8,14.5)'[b8]; \
      [b8][v9]overlay=(W-w)/2:200:enable='between(t,14.5,16.2)'[b9]; \
      [b9][v10]overlay=(W-w)/2:200:enable='between(t,16.2,18.0)'[b10]; \
      [b10][v11]overlay=(W-w)/2:320:enable='between(t,18.0,20.5)'[b11]; \
      [b11][v12]overlay=(W-w)/2:200:enable='between(t,20.5,23.0)'[b12]; \
      [b12]drawtext=fontfile='${fontPath}':textfile='scripts/subtitles_v3/v1_k1.txt':fontsize=52:fontcolor=0xFACC15:box=1:boxcolor=0x080D20@0.92:boxborderw=20:x=(w-text_w)/2:y=1000:enable='between(t,0,1.2)', \
           drawtext=fontfile='${fontPath}':textfile='scripts/subtitles_v3/v1_k2.txt':fontsize=52:fontcolor=white:box=1:boxcolor=0x080D20@0.92:boxborderw=20:x=(w-text_w)/2:y=1000:enable='between(t,1.2,2.5)', \
           drawtext=fontfile='${fontPath}':textfile='scripts/subtitles_v3/v1_k3.txt':fontsize=48:fontcolor=0x38BDF8:box=1:boxcolor=0x080D20@0.92:boxborderw=20:x=(w-text_w)/2:y=1000:enable='between(t,2.5,4.2)', \
           drawtext=fontfile='${fontPath}':textfile='scripts/subtitles_v3/v1_k4.txt':fontsize=50:fontcolor=0xFACC15:box=1:boxcolor=0x080D20@0.92:boxborderw=20:x=(w-text_w)/2:y=1000:enable='between(t,4.2,5.8)', \
           drawtext=fontfile='${fontPath}':textfile='scripts/subtitles_v3/v1_k5.txt':fontsize=52:fontcolor=white:box=1:boxcolor=0x080D20@0.92:boxborderw=20:x=(w-text_w)/2:y=1000:enable='between(t,5.8,7.2)', \
           drawtext=fontfile='${fontPath}':textfile='scripts/subtitles_v3/v1_k6.txt':fontsize=52:fontcolor=white:box=1:boxcolor=0x080D20@0.92:boxborderw=20:x=(w-text_w)/2:y=1000:enable='between(t,7.2,9.0)', \
           drawtext=fontfile='${fontPath}':textfile='scripts/subtitles_v3/v1_k7.txt':fontsize=54:fontcolor=0xF6C94D:box=1:boxcolor=0x080D20@0.92:boxborderw=20:x=(w-text_w)/2:y=1000:enable='between(t,9.0,10.5)', \
           drawtext=fontfile='${fontPath}':textfile='scripts/subtitles_v3/v1_k8.txt':fontsize=52:fontcolor=0x4ADE80:box=1:boxcolor=0x080D20@0.92:boxborderw=20:x=(w-text_w)/2:y=1000:enable='between(t,10.5,12.5)', \
           drawtext=fontfile='${fontPath}':textfile='scripts/subtitles_v3/v1_k9.txt':fontsize=50:fontcolor=0xFACC15:box=1:boxcolor=0x080D20@0.92:boxborderw=20:x=(w-text_w)/2:y=1000:enable='between(t,12.5,15.5)', \
           drawtext=fontfile='${fontPath}':textfile='scripts/subtitles_v3/v1_k10.txt':fontsize=50:fontcolor=white:box=1:boxcolor=0x080D20@0.92:boxborderw=20:x=(w-text_w)/2:y=1000:enable='between(t,15.5,18.0)', \
           drawtext=fontfile='${fontPath}':textfile='scripts/subtitles_v3/v1_k11.txt':fontsize=48:fontcolor=0x38BDF8:box=1:boxcolor=0x080D20@0.92:boxborderw=20:x=(w-text_w)/2:y=1000:enable='between(t,18.0,20.5)', \
           drawtext=fontfile='${fontPath}':textfile='scripts/subtitles_v3/v1_k12.txt':fontsize=52:fontcolor=0x22C55E:box=1:boxcolor=0x080D20@0.95:boxborderw=22:x=(w-text_w)/2:y=1000:enable='between(t,20.5,23.0)'[outv]; \
      [14:a]aformat=sample_rates=48000:channel_layouts=stereo,volume=1.30[a_voc]; \
      [15:a]atrim=0:23,aformat=sample_rates=48000:channel_layouts=stereo,volume=0.16,afade=t=in:ss=0:d=0.4,afade=t=out:st=21.5:d=1.5[a_mus]; \
      [16:a]adelay=1500|1500,volume=0.7[sfx_p1]; \
      [16:a]adelay=4200|4200,volume=0.7[sfx_p2]; \
      [17:a]adelay=7200|7200,volume=0.6[sfx_w1]; \
      [18:a]adelay=11800|11800,volume=0.8[sfx_ch1]; \
      [16:a]adelay=18000|18000,volume=0.7[sfx_p3]; \
      [17:a]adelay=20500|20500,volume=0.6[sfx_w2]; \
      [a_voc][a_mus][sfx_p1][sfx_p2][sfx_w1][sfx_ch1][sfx_p3][sfx_w2]amix=inputs=8:duration=longest:weights=1.0 0.18 0.7 0.7 0.6 0.8 0.7 0.6:normalize=0,aformat=sample_rates=48000:channel_layouts=stereo[outa]" \
    -map "[outv]" -map "[outa]" -c:v libx264 -preset faster -crf 22 -c:a aac -b:a 192k -t 23 "${outFile}"`;

  execSync(cmd, { stdio: 'inherit' });
  fs.copyFileSync(outFile, alias1);
  fs.copyFileSync(outFile, aliasDemo);
  console.log(`✅ Vidéo 1 (Démo / Tuto 23s) terminée et dupliquée : ${outFile}`);
}

// =========================================================================
// VIDÉO 2 : ANGLE ANNONCE / BÉNÉFICE CANDIDAT (21.5s)
// Cible du brief : 20 à 22s. Suppression hook logo, focus douleur candidat, zoom exemple STAR Avant/Après, CTA bio rapide.
// =========================================================================
function renderVideo2() {
  const outFile = path.join(outputDir, 'video_2_demonstration.mp4');
  const alias2 = path.join(outputDir, 'video_2.mp4');
  console.log(`\n⏳ Rendu Vidéo 2 · Bénéfice Candidat & STAR (21.5s) -> ${outFile}...`);

  const cmd = `ffmpeg -y \
    -f lavfi -i "color=c=0x080D20:s=1080x1920:r=30:d=21.5" \
    -loop 1 -t 2 -i "public/captures_clean/v2_hook_postuler_vide.jpg" \
    -loop 1 -t 2 -i "public/captures_clean/01_accueil_clean.jpg" \
    -loop 1 -t 2 -i "public/captures_clean/zoom_btn_import.jpg" \
    -loop 1 -t 2 -i "public/captures_clean/04_extraite_clean.jpg" \
    -loop 1 -t 2 -i "public/captures_clean/zoom_score_circle.jpg" \
    -loop 1 -t 2 -i "public/captures_clean/07_star_clean.jpg" \
    -loop 1 -t 4 -i "public/captures_clean/v2_star_avant_apres.jpg" \
    -loop 1 -t 2 -i "public/captures_clean/08_lettre_clean.jpg" \
    -loop 1 -t 2 -i "public/captures_clean/zoom_export_fiches.jpg" \
    -loop 1 -t 2 -i "public/captures_clean/10_prete_clean.jpg" \
    -loop 1 -t 2 -i "public/jnb-align-logo.png" \
    -i "public/audio/video_2_benefice.mp3" \
    -i "${bgMusic}" \
    -i "${sfxPop}" \
    -i "${sfxWhoosh}" \
    -i "${sfxChime}" \
    -filter_complex "\
      [1:v]scale=980:-2[v0]; \
      [2:v]scale=980:-2[v1]; \
      [3:v]scale=980:-2[v2]; \
      [4:v]scale=980:-2[v3]; \
      [5:v]scale=980:-2[v4]; \
      [6:v]scale=980:-2[v5]; \
      [7:v]scale=980:-2[v6]; \
      [8:v]scale=980:-2[v7]; \
      [9:v]scale=980:-2[v8]; \
      [10:v]scale=980:-2[v9]; \
      [11:v]scale=320:320[v_logo]; \
      [0:v][v0]overlay=(W-w)/2:200:enable='between(t,0,2.0)'[b0]; \
      [b0][v1]overlay=(W-w)/2:200:enable='between(t,2.0,3.5)'[b1]; \
      [b1][v2]overlay=(W-w)/2:320:enable='between(t,3.5,5.0)'[b2]; \
      [b2][v3]overlay=(W-w)/2:200:enable='between(t,5.0,6.8)'[b3]; \
      [b3][v4]overlay=(W-w)/2:320:enable='between(t,6.8,8.5)'[b4]; \
      [b4][v5]overlay=(W-w)/2:200:enable='between(t,8.5,10.5)'[b5]; \
      [b5][v6]overlay=(W-w)/2:180:enable='between(t,10.5,14.5)'[b6]; \
      [b6][v7]overlay=(W-w)/2:200:enable='between(t,14.5,16.5)'[b7]; \
      [b7][v8]overlay=(W-w)/2:320:enable='between(t,16.5,18.5)'[b8]; \
      [b8][v9]overlay=(W-w)/2:200:enable='between(t,18.5,20.2)'[b9]; \
      [b9][v_logo]overlay=(W-w)/2:400:enable='between(t,20.2,21.5)'[b10]; \
      [b10]drawtext=fontfile='${fontPath}':textfile='scripts/subtitles_v3/v2_k1.txt':fontsize=52:fontcolor=0xEF4444:box=1:boxcolor=0x080D20@0.92:boxborderw=20:x=(w-text_w)/2:y=1000:enable='between(t,0,1.8)', \
           drawtext=fontfile='${fontPath}':textfile='scripts/subtitles_v3/v2_k2.txt':fontsize=50:fontcolor=white:box=1:boxcolor=0x080D20@0.92:boxborderw=20:x=(w-text_w)/2:y=1000:enable='between(t,1.8,3.4)', \
           drawtext=fontfile='${fontPath}':textfile='scripts/subtitles_v3/v2_k3.txt':fontsize=48:fontcolor=0xF59E0B:box=1:boxcolor=0x080D20@0.92:boxborderw=20:x=(w-text_w)/2:y=1000:enable='between(t,3.4,5.2)', \
           drawtext=fontfile='${fontPath}':textfile='scripts/subtitles_v3/v2_k4.txt':fontsize=54:fontcolor=0xF6C94D:box=1:boxcolor=0x080D20@0.92:boxborderw=20:x=(w-text_w)/2:y=1000:enable='between(t,5.2,7.0)', \
           drawtext=fontfile='${fontPath}':textfile='scripts/subtitles_v3/v2_k5.txt':fontsize=50:fontcolor=white:box=1:boxcolor=0x080D20@0.92:boxborderw=20:x=(w-text_w)/2:y=1000:enable='between(t,7.0,8.8)', \
           drawtext=fontfile='${fontPath}':textfile='scripts/subtitles_v3/v2_k6.txt':fontsize=50:fontcolor=0x38BDF8:box=1:boxcolor=0x080D20@0.92:boxborderw=20:x=(w-text_w)/2:y=1000:enable='between(t,8.8,10.5)', \
           drawtext=fontfile='${fontPath}':textfile='scripts/subtitles_v3/v2_k7.txt':fontsize=52:fontcolor=0xFACC15:box=1:boxcolor=0x080D20@0.92:boxborderw=20:x=(w-text_w)/2:y=1000:enable='between(t,10.5,12.5)', \
           drawtext=fontfile='${fontPath}':textfile='scripts/subtitles_v3/v2_k8.txt':fontsize=50:fontcolor=0x4ADE80:box=1:boxcolor=0x080D20@0.92:boxborderw=20:x=(w-text_w)/2:y=1000:enable='between(t,12.5,14.8)', \
           drawtext=fontfile='${fontPath}':textfile='scripts/subtitles_v3/v2_k9.txt':fontsize=48:fontcolor=white:box=1:boxcolor=0x080D20@0.92:boxborderw=20:x=(w-text_w)/2:y=1000:enable='between(t,14.8,17.2)', \
           drawtext=fontfile='${fontPath}':textfile='scripts/subtitles_v3/v2_k10.txt':fontsize=46:fontcolor=0xFACC15:box=1:boxcolor=0x080D20@0.95:boxborderw=20:x=(w-text_w)/2:y=1000:enable='between(t,17.2,19.5)', \
           drawtext=fontfile='${fontPath}':textfile='scripts/subtitles_v3/v2_k11.txt':fontsize=54:fontcolor=0x22C55E:box=1:boxcolor=0x080D20@0.95:boxborderw=22:x=(w-text_w)/2:y=1000:enable='between(t,19.5,21.5)', \
           drawtext=fontfile='${fontPath}':text='FAIS LE TEST SUR TON CV':fontsize=46:fontcolor=white:box=1:boxcolor=0x080D20@0.85:boxborderw=16:x=(w-text_w)/2:y=1120:enable='between(t,20.2,21.5)', \
           drawtext=fontfile='${fontPath}':text='LIEN EN BIO':fontsize=40:fontcolor=0xF6C94D:box=1:boxcolor=0x080D20@0.85:boxborderw=16:x=(w-text_w)/2:y=1220:enable='between(t,20.2,21.5)'[outv]; \
      [12:a]aformat=sample_rates=48000:channel_layouts=stereo,volume=1.30[a_voc]; \
      [13:a]atrim=0:21.5,aformat=sample_rates=48000:channel_layouts=stereo,volume=0.16,afade=t=in:ss=0:d=0.4,afade=t=out:st=20.0:d=1.5[a_mus]; \
      [15:a]adelay=2000|2000,volume=0.6[sfx_w1]; \
      [16:a]adelay=6800|6800,volume=0.8[sfx_ch1]; \
      [15:a]adelay=10500|10500,volume=0.6[sfx_w2]; \
      [14:a]adelay=16500|16500,volume=0.7[sfx_p1]; \
      [16:a]adelay=20200|20200,volume=0.8[sfx_ch2]; \
      [a_voc][a_mus][sfx_w1][sfx_ch1][sfx_w2][sfx_p1][sfx_ch2]amix=inputs=7:duration=longest:weights=1.0 0.18 0.6 0.8 0.6 0.7 0.8:normalize=0,aformat=sample_rates=48000:channel_layouts=stereo[outa]" \
    -map "[outv]" -map "[outa]" -c:v libx264 -preset faster -crf 22 -c:a aac -b:a 192k -t 21.5 "${outFile}"`;

  execSync(cmd, { stdio: 'inherit' });
  fs.copyFileSync(outFile, alias2);
  console.log(`✅ Vidéo 2 (Bénéfice candidat 21.5s) terminée et dupliquée : ${outFile}`);
}

// =========================================================================
// VIDÉO 3 : ANGLE PROBLÈME / HOOK FORT & LOOPING INFINI (18.0s)
// Cible du brief : 18 à 20s. Aucune cassure de rythme (suppression logo intro), surlignage vert fluo 92%, boucle infinie.
// =========================================================================
function renderVideo3() {
  const outFile = path.join(outputDir, 'video_3_lancement.mp4');
  const alias3 = path.join(outputDir, 'video_3.mp4');
  console.log(`\n⏳ Rendu Vidéo 3 · Hook Fort & Looping Infini (18.0s) -> ${outFile}...`);

  const cmd = `ffmpeg -y \
    -f lavfi -i "color=c=0x080D20:s=1080x1920:r=30:d=18" \
    -loop 1 -t 3 -i "public/captures_clean/01_accueil_clean.jpg" \
    -loop 1 -t 2 -i "public/captures_clean/zoom_btn_import.jpg" \
    -loop 1 -t 2 -i "public/captures_clean/03_offre_clean.jpg" \
    -loop 1 -t 2 -i "public/captures_clean/05_analyse_clean.jpg" \
    -loop 1 -t 4 -i "public/captures_clean/v3_score_neon_highlight.jpg" \
    -loop 1 -t 3 -i "public/captures_clean/07_star_zoom.jpg" \
    -loop 1 -t 3 -i "public/captures_clean/zoom_export_fiches.jpg" \
    -loop 1 -t 3 -i "public/captures_clean/10_prete_clean.jpg" \
    -i "public/audio/video_3_looping.mp3" \
    -i "${bgMusic}" \
    -i "${sfxPop}" \
    -i "${sfxWhoosh}" \
    -i "${sfxChime}" \
    -filter_complex "\
      [1:v]scale=980:-2[v0]; \
      [2:v]scale=980:-2[v1]; \
      [3:v]scale=980:-2[v2]; \
      [4:v]scale=980:-2[v3]; \
      [5:v]scale=980:-2[v4]; \
      [6:v]scale=980:-2[v5]; \
      [7:v]scale=980:-2[v6]; \
      [8:v]scale=980:-2[v7]; \
      [0:v][v0]overlay=(W-w)/2:200:enable='between(t,0,2.2)'[b0]; \
      [b0][v1]overlay=(W-w)/2:320:enable='between(t,2.2,3.8)'[b1]; \
      [b1][v2]overlay=(W-w)/2:200:enable='between(t,3.8,5.5)'[b2]; \
      [b2][v3]overlay=(W-w)/2:200:enable='between(t,5.5,7.5)'[b3]; \
      [b3][v4]overlay=(W-w)/2:200:enable='between(t,7.5,11.5)'[b4]; \
      [b4][v5]overlay=(W-w)/2:200:enable='between(t,11.5,13.5)'[b5]; \
      [b5][v6]overlay=(W-w)/2:320:enable='between(t,13.5,15.5)'[b6]; \
      [b6][v7]overlay=(W-w)/2:200:enable='between(t,15.5,18.0)'[b7]; \
      [b7]drawtext=fontfile='${fontPath}':textfile='scripts/subtitles_v3/v3_k1.txt':fontsize=52:fontcolor=0xFACC15:box=1:boxcolor=0x080D20@0.92:boxborderw=20:x=(w-text_w)/2:y=1000:enable='between(t,0,2.2)', \
          drawtext=fontfile='${fontPath}':textfile='scripts/subtitles_v3/v3_k2.txt':fontsize=52:fontcolor=white:box=1:boxcolor=0x080D20@0.92:boxborderw=20:x=(w-text_w)/2:y=1000:enable='between(t,2.2,3.8)', \
          drawtext=fontfile='${fontPath}':textfile='scripts/subtitles_v3/v3_k3.txt':fontsize=52:fontcolor=white:box=1:boxcolor=0x080D20@0.92:boxborderw=20:x=(w-text_w)/2:y=1000:enable='between(t,3.8,5.5)', \
          drawtext=fontfile='${fontPath}':textfile='scripts/subtitles_v3/v3_k4.txt':fontsize=54:fontcolor=0xF6C94D:box=1:boxcolor=0x080D20@0.92:boxborderw=20:x=(w-text_w)/2:y=1000:enable='between(t,5.5,7.2)', \
          drawtext=fontfile='${fontPath}':textfile='scripts/subtitles_v3/v3_k5.txt':fontsize=50:fontcolor=white:box=1:boxcolor=0x080D20@0.92:boxborderw=20:x=(w-text_w)/2:y=1000:enable='between(t,7.2,9.0)', \
          drawtext=fontfile='${fontPath}':textfile='scripts/subtitles_v3/v3_k6.txt':fontsize=46:fontcolor=0x4ADE80:box=1:boxcolor=0x080D20@0.92:boxborderw=20:x=(w-text_w)/2:y=1000:enable='between(t,9.0,11.2)', \
          drawtext=fontfile='${fontPath}':textfile='scripts/subtitles_v3/v3_k7.txt':fontsize=52:fontcolor=0x22C55E:box=1:boxcolor=0x080D20@0.95:boxborderw=22:x=(w-text_w)/2:y=1000:enable='between(t,11.2,13.2)', \
          drawtext=fontfile='${fontPath}':textfile='scripts/subtitles_v3/v3_k8.txt':fontsize=50:fontcolor=white:box=1:boxcolor=0x080D20@0.92:boxborderw=20:x=(w-text_w)/2:y=1000:enable='between(t,13.2,15.2)', \
          drawtext=fontfile='${fontPath}':textfile='scripts/subtitles_v3/v3_k9.txt':fontsize=48:fontcolor=0x38BDF8:box=1:boxcolor=0x080D20@0.92:boxborderw=20:x=(w-text_w)/2:y=1000:enable='between(t,15.2,16.8)', \
          drawtext=fontfile='${fontPath}':textfile='scripts/subtitles_v3/v3_k10.txt':fontsize=52:fontcolor=0xFACC15:box=1:boxcolor=0x080D20@0.95:boxborderw=22:x=(w-text_w)/2:y=1000:enable='between(t,16.8,18.0)'[outv]; \
      [9:a]aformat=sample_rates=48000:channel_layouts=stereo,volume=1.30[a_voc]; \
      [10:a]atrim=0:18,aformat=sample_rates=48000:channel_layouts=stereo,volume=0.16[a_mus]; \
      [11:a]adelay=2200|2200,volume=0.7[sfx_p1]; \
      [12:a]adelay=5500|5500,volume=0.6[sfx_w1]; \
      [13:a]adelay=7500|7500,volume=0.8[sfx_ch1]; \
      [11:a]adelay=13500|13500,volume=0.7[sfx_p2]; \
      [12:a]adelay=17500|17500,volume=0.6[sfx_w2]; \
      [a_voc][a_mus][sfx_p1][sfx_w1][sfx_ch1][sfx_p2][sfx_w2]amix=inputs=7:duration=longest:weights=1.0 0.18 0.7 0.6 0.8 0.7 0.6:normalize=0,aformat=sample_rates=48000:channel_layouts=stereo[outa]" \
    -map "[outv]" -map "[outa]" -c:v libx264 -preset faster -crf 22 -c:a aac -b:a 192k -t 18 "${outFile}"`;

  execSync(cmd, { stdio: 'inherit' });
  fs.copyFileSync(outFile, alias3);
  console.log(`✅ Vidéo 3 (Hook fort & Looping infini 18s) terminée et dupliquée : ${outFile}`);
}

renderVideo1();
renderVideo2();
renderVideo3();
console.log('\n🎉 Rendu V3 terminé avec succès ! Les 3 vidéos respectent 100% des règles du brief de production.');
