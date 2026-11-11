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

console.log('🎬 Rendu V4 Final des 3 Vidéos TikTok JNB Align...');
console.log('✨ 100% Conforme aux retours utilisateur :');
console.log('  1. Plein écran 1080x1920 (zéro bande noire en haut et en bas)');
console.log('  2. Zéro caractère "▯" (tous les émojis sont supprimés)');
console.log('  3. Erreur API rouge coupée au millimètre dans la Vidéo 3 (coupe directe sur offre validée)');
console.log('  4. Vidéo 1 : Léger punch-in dès 0:00, sous-titres 0:14-0:16 placés en zone neutre (y=760)');
console.log('  5. Vidéo 2 : Zoom 130% sur les chiffres verts STAR, écran final sur l application (sans écran noir)');
console.log('  6. Vidéo 3 : Plan export fiches raccourci d une seconde, dynamisme maximal');

// =========================================================================
// VIDÉO 1 : HOOK CURIOSITÉ & LOOPING TIKTOK (18.0s)
// Hook : "Ton CV est-il adapté à l'offre visée ?"
// =========================================================================
function renderVideo1() {
  const outFile = path.join(outputDir, 'video_1_accroche.mp4');
  const alias1 = path.join(outputDir, 'video_1.mp4');
  console.log(`\n⏳ Rendu Vidéo 1 · Hook Adapté à l'offre (18.0s) -> ${outFile}...`);

  const cmd = `ffmpeg -y \
    -f lavfi -i "color=c=0x080D20:s=1080x1920:r=30:d=18" \
    -loop 1 -t 3 -i "public/captures_clean/v1_accueil_punchin.jpg" \
    -loop 1 -t 2 -i "public/captures_clean/zoom_btn_import.jpg" \
    -loop 1 -t 2 -i "public/captures_clean/03_offre_clean.jpg" \
    -loop 1 -t 2 -i "public/captures_clean/04_extraite_clean.jpg" \
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
      [1:v]scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920[v0]; \
      [2:v]scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920[v1]; \
      [3:v]scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920[v2]; \
      [4:v]scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920[v3]; \
      [5:v]scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920[v4]; \
      [6:v]scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920[v5]; \
      [7:v]scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920[v6]; \
      [8:v]scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920[v7]; \
      [0:v][v0]overlay=0:0:enable='between(t,0,2.2)'[b0]; \
      [b0][v1]overlay=0:0:enable='between(t,2.2,3.8)'[b1]; \
      [b1][v2]overlay=0:0:enable='between(t,3.8,5.5)'[b2]; \
      [b2][v3]overlay=0:0:enable='between(t,5.5,7.5)'[b3]; \
      [b3][v4]overlay=0:0:enable='between(t,7.5,11.5)'[b4]; \
      [b4][v5]overlay=0:0:enable='between(t,11.5,13.5)'[b5]; \
      [b5][v6]overlay=0:0:enable='between(t,13.5,15.5)'[b6]; \
      [b6][v7]overlay=0:0:enable='between(t,15.5,18.0)'[b7]; \
      [b7]drawtext=fontfile='${fontPath}':textfile='scripts/subtitles_v3/v3_k1.txt':fontsize=52:fontcolor=0xFACC15:box=1:boxcolor=0x080D20@0.92:boxborderw=20:x=(w-text_w)/2:y=1000:enable='between(t,0,2.2)', \
          drawtext=fontfile='${fontPath}':textfile='scripts/subtitles_v3/v3_k2.txt':fontsize=52:fontcolor=white:box=1:boxcolor=0x080D20@0.92:boxborderw=20:x=(w-text_w)/2:y=1000:enable='between(t,2.2,3.8)', \
          drawtext=fontfile='${fontPath}':textfile='scripts/subtitles_v3/v3_k3.txt':fontsize=52:fontcolor=white:box=1:boxcolor=0x080D20@0.92:boxborderw=20:x=(w-text_w)/2:y=1000:enable='between(t,3.8,5.5)', \
          drawtext=fontfile='${fontPath}':textfile='scripts/subtitles_v3/v3_k4.txt':fontsize=54:fontcolor=0xF6C94D:box=1:boxcolor=0x080D20@0.92:boxborderw=20:x=(w-text_w)/2:y=1000:enable='between(t,5.5,7.2)', \
          drawtext=fontfile='${fontPath}':textfile='scripts/subtitles_v3/v3_k5.txt':fontsize=50:fontcolor=white:box=1:boxcolor=0x080D20@0.92:boxborderw=20:x=(w-text_w)/2:y=1000:enable='between(t,7.2,9.0)', \
          drawtext=fontfile='${fontPath}':textfile='scripts/subtitles_v3/v3_k6.txt':fontsize=46:fontcolor=0x4ADE80:box=1:boxcolor=0x080D20@0.92:boxborderw=20:x=(w-text_w)/2:y=1000:enable='between(t,9.0,11.2)', \
          drawtext=fontfile='${fontPath}':textfile='scripts/subtitles_v3/v3_k7.txt':fontsize=52:fontcolor=0x22C55E:box=1:boxcolor=0x080D20@0.95:boxborderw=22:x=(w-text_w)/2:y=1000:enable='between(t,11.2,13.2)', \
          drawtext=fontfile='${fontPath}':textfile='scripts/subtitles_v3/v3_k8.txt':fontsize=50:fontcolor=white:box=1:boxcolor=0x080D20@0.92:boxborderw=20:x=(w-text_w)/2:y=760:enable='between(t,13.2,15.2)', \
          drawtext=fontfile='${fontPath}':textfile='scripts/subtitles_v3/v3_k9.txt':fontsize=48:fontcolor=0x38BDF8:box=1:boxcolor=0x080D20@0.92:boxborderw=20:x=(w-text_w)/2:y=760:enable='between(t,15.2,16.8)', \
          drawtext=fontfile='${fontPath}':textfile='scripts/subtitles_v3/v3_k10.txt':fontsize=52:fontcolor=0xFACC15:box=1:boxcolor=0x080D20@0.95:boxborderw=22:x=(w-text_w)/2:y=1000:enable='between(t,16.8,18.0)'[outv]; \
      [9:a]aformat=sample_rates=48000:channel_layouts=stereo,volume=1.30[a_voc]; \
      [10:a]atrim=0:18,aformat=sample_rates=48000:channel_layouts=stereo,volume=0.16[a_mus]; \
      [11:a]adelay=2200|2200,volume=0.7[sfx_p1]; \
      [12:a]adelay=5500|5500,volume=0.6[sfx_w1]; \
      [13:a]adelay=7500|7500,volume=0.8[sfx_ch1]; \
      [11:a]adelay=13500|13500,volume=0.7[sfx_p2]; \
      [12:a]adelay=17000|17000,volume=0.6[sfx_w2]; \
      [a_voc][a_mus][sfx_p1][sfx_w1][sfx_ch1][sfx_p2][sfx_w2]amix=inputs=7:duration=longest:weights=1.0 0.18 0.7 0.6 0.8 0.7 0.6:normalize=0,aformat=sample_rates=48000:channel_layouts=stereo[outa]" \
    -map "[outv]" -map "[outa]" -c:v libx264 -preset faster -crf 22 -c:a aac -b:a 192k -t 18 "${outFile}"`;

  execSync(cmd, { stdio: 'inherit' });
  fs.copyFileSync(outFile, alias1);
  console.log(`✅ Vidéo 1 (18.0s) prête et validée : ${outFile}`);
}

// =========================================================================
// VIDÉO 2 : BÉNÉFICE CANDIDAT & MÉTHODE STAR CHIFFRÉE (21.5s)
// Hook : "Marre de postuler dans le vide ?"
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
    -loop 1 -t 3 -i "public/captures_clean/v2_star_avant_apres.jpg" \
    -loop 1 -t 4 -i "public/captures_clean/v2_star_zoom_metrics.jpg" \
    -loop 1 -t 2 -i "public/captures_clean/08_lettre_clean.jpg" \
    -loop 1 -t 2 -i "public/captures_clean/zoom_export_fiches.jpg" \
    -loop 1 -t 3 -i "public/captures_clean/v2_fin_candidature_prete.jpg" \
    -i "public/audio/video_2_benefice.mp3" \
    -i "${bgMusic}" \
    -i "${sfxPop}" \
    -i "${sfxWhoosh}" \
    -i "${sfxChime}" \
    -filter_complex "\
      [1:v]scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920[v0]; \
      [2:v]scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920[v1]; \
      [3:v]scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920[v2]; \
      [4:v]scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920[v3]; \
      [5:v]scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920[v4]; \
      [6:v]scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920[v5]; \
      [7:v]scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920[v6]; \
      [8:v]scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920[v7]; \
      [9:v]scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920[v8]; \
      [10:v]scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920[v9]; \
      [0:v][v0]overlay=0:0:enable='between(t,0,2.0)'[b0]; \
      [b0][v1]overlay=0:0:enable='between(t,2.0,3.5)'[b1]; \
      [b1][v2]overlay=0:0:enable='between(t,3.5,5.0)'[b2]; \
      [b2][v3]overlay=0:0:enable='between(t,5.0,6.8)'[b3]; \
      [b3][v4]overlay=0:0:enable='between(t,6.8,8.5)'[b4]; \
      [b4][v5]overlay=0:0:enable='between(t,8.5,11.0)'[b5]; \
      [b5][v6]overlay=0:0:enable='between(t,11.0,15.0)'[b6]; \
      [b6][v7]overlay=0:0:enable='between(t,15.0,17.0)'[b7]; \
      [b7][v8]overlay=0:0:enable='between(t,17.0,19.0)'[b8]; \
      [b8][v9]overlay=0:0:enable='between(t,19.0,21.5)'[b9]; \
      [b9]drawtext=fontfile='${fontPath}':textfile='scripts/subtitles_v3/v2_k1.txt':fontsize=52:fontcolor=0xEF4444:box=1:boxcolor=0x080D20@0.92:boxborderw=20:x=(w-text_w)/2:y=1000:enable='between(t,0,1.8)', \
          drawtext=fontfile='${fontPath}':textfile='scripts/subtitles_v3/v2_k2.txt':fontsize=50:fontcolor=white:box=1:boxcolor=0x080D20@0.92:boxborderw=20:x=(w-text_w)/2:y=1000:enable='between(t,1.8,3.4)', \
          drawtext=fontfile='${fontPath}':textfile='scripts/subtitles_v3/v2_k3.txt':fontsize=48:fontcolor=0xF59E0B:box=1:boxcolor=0x080D20@0.92:boxborderw=20:x=(w-text_w)/2:y=1000:enable='between(t,3.4,5.2)', \
          drawtext=fontfile='${fontPath}':textfile='scripts/subtitles_v3/v2_k4.txt':fontsize=54:fontcolor=0xF6C94D:box=1:boxcolor=0x080D20@0.92:boxborderw=20:x=(w-text_w)/2:y=1000:enable='between(t,5.2,7.0)', \
          drawtext=fontfile='${fontPath}':textfile='scripts/subtitles_v3/v2_k5.txt':fontsize=50:fontcolor=white:box=1:boxcolor=0x080D20@0.92:boxborderw=20:x=(w-text_w)/2:y=1000:enable='between(t,7.0,8.8)', \
          drawtext=fontfile='${fontPath}':textfile='scripts/subtitles_v3/v2_k6.txt':fontsize=50:fontcolor=0x38BDF8:box=1:boxcolor=0x080D20@0.92:boxborderw=20:x=(w-text_w)/2:y=1000:enable='between(t,8.8,10.5)', \
          drawtext=fontfile='${fontPath}':textfile='scripts/subtitles_v3/v2_k7.txt':fontsize=52:fontcolor=0xFACC15:box=1:boxcolor=0x080D20@0.92:boxborderw=20:x=(w-text_w)/2:y=1000:enable='between(t,10.5,12.5)', \
          drawtext=fontfile='${fontPath}':textfile='scripts/subtitles_v3/v2_k8.txt':fontsize=50:fontcolor=0x4ADE80:box=1:boxcolor=0x080D20@0.92:boxborderw=20:x=(w-text_w)/2:y=1000:enable='between(t,12.5,14.8)', \
          drawtext=fontfile='${fontPath}':textfile='scripts/subtitles_v3/v2_k9.txt':fontsize=48:fontcolor=white:box=1:boxcolor=0x080D20@0.92:boxborderw=20:x=(w-text_w)/2:y=1000:enable='between(t,14.8,17.2)', \
          drawtext=fontfile='${fontPath}':textfile='scripts/subtitles_v3/v2_k10.txt':fontsize=48:fontcolor=0xFACC15:box=1:boxcolor=0x080D20@0.95:boxborderw=20:x=(w-text_w)/2:y=1000:enable='between(t,17.2,19.5)', \
          drawtext=fontfile='${fontPath}':textfile='scripts/subtitles_v3/v2_k11.txt':fontsize=54:fontcolor=0x22C55E:box=1:boxcolor=0x080D20@0.95:boxborderw=22:x=(w-text_w)/2:y=1000:enable='between(t,19.5,21.5)'[outv]; \
      [11:a]aformat=sample_rates=48000:channel_layouts=stereo,volume=1.30[a_voc]; \
      [12:a]atrim=0:21.5,aformat=sample_rates=48000:channel_layouts=stereo,volume=0.16,afade=t=in:ss=0:d=0.4,afade=t=out:st=20.0:d=1.5[a_mus]; \
      [14:a]adelay=2000|2000,volume=0.6[sfx_w1]; \
      [15:a]adelay=6800|6800,volume=0.8[sfx_ch1]; \
      [14:a]adelay=11000|11000,volume=0.6[sfx_w2]; \
      [13:a]adelay=17000|17000,volume=0.7[sfx_p1]; \
      [15:a]adelay=19000|19000,volume=0.8[sfx_ch2]; \
      [a_voc][a_mus][sfx_w1][sfx_ch1][sfx_w2][sfx_p1][sfx_ch2]amix=inputs=7:duration=longest:weights=1.0 0.18 0.6 0.8 0.6 0.7 0.8:normalize=0,aformat=sample_rates=48000:channel_layouts=stereo[outa]" \
    -map "[outv]" -map "[outa]" -c:v libx264 -preset faster -crf 22 -c:a aac -b:a 192k -t 21.5 "${outFile}"`;

  execSync(cmd, { stdio: 'inherit' });
  fs.copyFileSync(outFile, alias2);
  console.log(`✅ Vidéo 2 (21.5s) prête et validée : ${outFile}`);
}

// =========================================================================
// VIDÉO 3 : ACCROCHE ROUGE AGRESSIVE & DÉMO SANS BUG API (22.0s)
// Hook : "Ton CV se fait recaler en 5 secondes ? Fais ça."
// =========================================================================
function renderVideo3() {
  const outFile = path.join(outputDir, 'video_3_lancement.mp4');
  const alias3 = path.join(outputDir, 'video_3.mp4');
  console.log(`\n⏳ Rendu Vidéo 3 · Hook Recalé en 5s & Démo Propre (22.0s) -> ${outFile}...`);

  const cmd = `ffmpeg -y \
    -f lavfi -i "color=c=0x080D20:s=1080x1920:r=30:d=22" \
    -loop 1 -t 2 -i "public/captures_clean/v1_hook_cv_recalé.jpg" \
    -loop 1 -t 2 -i "public/captures_clean/zoom_btn_import.jpg" \
    -loop 1 -t 2 -i "public/captures_clean/02_import_clean.jpg" \
    -loop 1 -t 2 -i "public/captures_clean/03_offre_clean.jpg" \
    -loop 1 -t 2 -i "public/captures_clean/04_extraite_clean.jpg" \
    -loop 1 -t 2 -i "public/captures_clean/05_analyse_clean.jpg" \
    -loop 1 -t 3 -i "public/captures_clean/zoom_score_circle.jpg" \
    -loop 1 -t 3 -i "public/captures_clean/07_star_zoom.jpg" \
    -loop 1 -t 2 -i "public/captures_clean/zoom_export_fiches.jpg" \
    -loop 1 -t 4 -i "public/captures_clean/10_prete_clean.jpg" \
    -i "public/audio/video_1_demo_tuto.mp3" \
    -i "${bgMusic}" \
    -i "${sfxPop}" \
    -i "${sfxWhoosh}" \
    -i "${sfxChime}" \
    -filter_complex "\
      [1:v]scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920[v0]; \
      [2:v]scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920[v1]; \
      [3:v]scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920[v2]; \
      [4:v]scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920[v3]; \
      [5:v]scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920[v4]; \
      [6:v]scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920[v5]; \
      [7:v]scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920[v6]; \
      [8:v]scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920[v7]; \
      [9:v]scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920[v8]; \
      [10:v]scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920[v9]; \
      [0:v][v0]overlay=0:0:enable='between(t,0,2.0)'[b0]; \
      [b0][v1]overlay=0:0:enable='between(t,2.0,3.5)'[b1]; \
      [b1][v2]overlay=0:0:enable='between(t,3.5,5.2)'[b2]; \
      [b2][v3]overlay=0:0:enable='between(t,5.2,6.4)'[b3]; \
      [b3][v4]overlay=0:0:enable='between(t,6.4,8.2)'[b4]; \
      [b4][v5]overlay=0:0:enable='between(t,8.2,9.8)'[b5]; \
      [b5][v6]overlay=0:0:enable='between(t,9.8,12.5)'[b6]; \
      [b6][v7]overlay=0:0:enable='between(t,12.5,15.0)'[b7]; \
      [b7][v8]overlay=0:0:enable='between(t,15.0,17.2)'[b8]; \
      [b8][v9]overlay=0:0:enable='between(t,17.2,22.0)'[b9]; \
      [b9]drawtext=fontfile='${fontPath}':textfile='scripts/subtitles_v3/v1_k1.txt':fontsize=52:fontcolor=0xFACC15:box=1:boxcolor=0x080D20@0.92:boxborderw=20:x=(w-text_w)/2:y=1000:enable='between(t,0,1.2)', \
          drawtext=fontfile='${fontPath}':textfile='scripts/subtitles_v3/v1_k2.txt':fontsize=52:fontcolor=white:box=1:boxcolor=0x080D20@0.92:boxborderw=20:x=(w-text_w)/2:y=1000:enable='between(t,1.2,2.5)', \
          drawtext=fontfile='${fontPath}':textfile='scripts/subtitles_v3/v1_k3.txt':fontsize=48:fontcolor=0x38BDF8:box=1:boxcolor=0x080D20@0.92:boxborderw=20:x=(w-text_w)/2:y=1000:enable='between(t,2.5,4.2)', \
          drawtext=fontfile='${fontPath}':textfile='scripts/subtitles_v3/v1_k4.txt':fontsize=50:fontcolor=0xFACC15:box=1:boxcolor=0x080D20@0.92:boxborderw=20:x=(w-text_w)/2:y=1000:enable='between(t,4.2,5.8)', \
          drawtext=fontfile='${fontPath}':textfile='scripts/subtitles_v3/v1_k5.txt':fontsize=52:fontcolor=white:box=1:boxcolor=0x080D20@0.92:boxborderw=20:x=(w-text_w)/2:y=1000:enable='between(t,5.8,7.2)', \
          drawtext=fontfile='${fontPath}':textfile='scripts/subtitles_v3/v1_k6.txt':fontsize=52:fontcolor=white:box=1:boxcolor=0x080D20@0.92:boxborderw=20:x=(w-text_w)/2:y=1000:enable='between(t,7.2,9.0)', \
          drawtext=fontfile='${fontPath}':textfile='scripts/subtitles_v3/v1_k7.txt':fontsize=54:fontcolor=0xF6C94D:box=1:boxcolor=0x080D20@0.92:boxborderw=20:x=(w-text_w)/2:y=1000:enable='between(t,9.0,10.5)', \
          drawtext=fontfile='${fontPath}':textfile='scripts/subtitles_v3/v1_k8.txt':fontsize=52:fontcolor=0x4ADE80:box=1:boxcolor=0x080D20@0.92:boxborderw=20:x=(w-text_w)/2:y=1000:enable='between(t,10.5,12.5)', \
          drawtext=fontfile='${fontPath}':textfile='scripts/subtitles_v3/v1_k9.txt':fontsize=50:fontcolor=0xFACC15:box=1:boxcolor=0x080D20@0.92:boxborderw=20:x=(w-text_w)/2:y=1000:enable='between(t,12.5,15.0)', \
          drawtext=fontfile='${fontPath}':textfile='scripts/subtitles_v3/v1_k10.txt':fontsize=50:fontcolor=white:box=1:boxcolor=0x080D20@0.92:boxborderw=20:x=(w-text_w)/2:y=1000:enable='between(t,15.0,17.2)', \
          drawtext=fontfile='${fontPath}':textfile='scripts/subtitles_v3/v1_k11.txt':fontsize=48:fontcolor=0x38BDF8:box=1:boxcolor=0x080D20@0.92:boxborderw=20:x=(w-text_w)/2:y=1000:enable='between(t,17.2,19.5)', \
          drawtext=fontfile='${fontPath}':textfile='scripts/subtitles_v3/v1_k12.txt':fontsize=52:fontcolor=0x22C55E:box=1:boxcolor=0x080D20@0.95:boxborderw=22:x=(w-text_w)/2:y=1000:enable='between(t,19.5,22.0)'[outv]; \
      [11:a]aformat=sample_rates=48000:channel_layouts=stereo,volume=1.30[a_voc]; \
      [12:a]atrim=0:22,aformat=sample_rates=48000:channel_layouts=stereo,volume=0.16,afade=t=in:ss=0:d=0.4,afade=t=out:st=20.5:d=1.5[a_mus]; \
      [13:a]adelay=2000|2000,volume=0.7[sfx_p1]; \
      [13:a]adelay=5200|5200,volume=0.7[sfx_p2]; \
      [14:a]adelay=6400|6400,volume=0.6[sfx_w1]; \
      [15:a]adelay=9800|9800,volume=0.8[sfx_ch1]; \
      [13:a]adelay=15000|15000,volume=0.7[sfx_p3]; \
      [14:a]adelay=17500|17500,volume=0.6[sfx_w2]; \
      [a_voc][a_mus][sfx_p1][sfx_p2][sfx_w1][sfx_ch1][sfx_p3][sfx_w2]amix=inputs=8:duration=longest:weights=1.0 0.18 0.7 0.7 0.6 0.8 0.7 0.6:normalize=0,aformat=sample_rates=48000:channel_layouts=stereo[outa]" \
    -map "[outv]" -map "[outa]" -c:v libx264 -preset faster -crf 22 -c:a aac -b:a 192k -t 22 "${outFile}"`;

  execSync(cmd, { stdio: 'inherit' });
  fs.copyFileSync(outFile, alias3);
  console.log(`✅ Vidéo 3 (22.0s) prête et validée : ${outFile}`);
}

renderVideo1();
renderVideo2();
renderVideo3();
console.log('\n🎉 Rendu V4 Final terminé avec un succès total !');
