import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

const outputDir = path.resolve(process.cwd(), 'public', 'videos');
if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });

const fontPath = '/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf';
const bgMusic = 'public/audio/teaser_beat_122bpm.mp3';
const sfxWhoosh = 'public/audio/sfx/sfx_whoosh.wav';
const sfxClick = 'public/audio/sfx/sfx_click.wav';
const sfxChime = 'public/audio/sfx/sfx_chime.wav';

console.log('🎬 Rendu V9 selon les NOUVELLES RECOMMANDATIONS DU DIRECTEUR DE LA COMMUNICATION :');
console.log('  1. Vidéo 1 : Vidéo de l’appli en cours d’utilisation à 2.8s-5.5s, score ATS dézoomé pour voir les infos autour, et écran final logo dès « Essaie maintenant » (16s-25s).');
console.log('  2. Vidéo 2 : Début direct avec la vidéo de l’appli en cours d’utilisation (0s-3.2s), dézoom sur le dépôt CV/Offre (3.2s-5.8s), et dézoom sur le score ATS et critères (5.8s-9.2s).');
console.log('  3. Vidéo 3 : Quand la voix parle du copilote (3.2s-7.2s), remplacement de l’écran par la vidéo d’utilisation de l’appli. Reste inchangé.');

// =========================================================================
// VIDÉO 1 : ACCROCHE (25s) — RECOMMANDATIONS V9
// =========================================================================
function renderVideo1() {
  const outFile = path.join(outputDir, 'video_1_accroche.mp4');
  const aliasFile = path.join(outputDir, 'video_1.mp4');
  console.log(`\n⏳ Rendu Vidéo 1 · Accroche V9 (25s) -> ${outFile}...`);

  // Inputs:
  // 0: color background 25s
  // 1: logo 25s
  // 2: v1_hook_question_geante.jpg
  // 3: v1_app_demo.mp4 (video de l'appli en cours d'utilisation)
  // 4: 02_import_clean.jpg (dépôt dézoomé)
  // 5: 06_score_clean.jpg (score ATS dézoomé avec infos autour)
  // 6: 09_export_clean.jpg (deux livrables)
  // 7: audio voix v7
  // 8: musique teaser
  // 9: whoosh, 10: click, 11: chime

  const cmd = `ffmpeg -y \
    -f lavfi -i "color=c=0x080D20:s=1080x1920:r=30:d=25" \
    -loop 1 -t 25 -i "public/jnb-align-logo.png" \
    -loop 1 -t 3.0 -i "public/captures_clean/v1_hook_question_geante.jpg" \
    -t 3.5 -i "public/clips/v1_app_demo.mp4" \
    -loop 1 -t 4.5 -i "public/captures_clean/02_import_clean.jpg" \
    -loop 1 -t 4.0 -i "public/captures_clean/06_score_clean.jpg" \
    -loop 1 -t 4.5 -i "public/captures_clean/09_export_clean.jpg" \
    -i "public/audio/video_1_accroche_v7.mp3" \
    -i "${bgMusic}" \
    -i "${sfxWhoosh}" \
    -i "${sfxClick}" \
    -i "${sfxChime}" \
    -filter_complex "\
      [1:v]scale=360:360[logo_big]; \
      [2:v]scale=1080:1920[v_hook_q]; \
      [3:v]scale=1080:1920:force_original_aspect_ratio=decrease,pad=1080:1920:(ow-iw)/2:(oh-ih)/2:color=0x080D20[v_app_vid]; \
      [4:v]scale=980:1920:force_original_aspect_ratio=decrease,pad=1080:1920:(ow-iw)/2:(oh-ih)/2:color=0x080D20[v_imp_dezoom]; \
      [5:v]scale=960:1920:force_original_aspect_ratio=decrease,pad=1080:1920:(ow-iw)/2:(oh-ih)/2:color=0x080D20[v_sco_dezoom]; \
      [6:v]scale=1280:2560,crop=1080:1920:(in_w-1080)/2:120[v_exp]; \
      [0:v][v_hook_q]overlay=0:0:enable='between(t,0,2.8)'[s0]; \
      [s0][v_app_vid]overlay=0:0:enable='between(t,2.8,5.5)'[s1]; \
      [s1][v_imp_dezoom]overlay=0:0:enable='between(t,5.5,9.2)'[s2]; \
      [s2][v_sco_dezoom]overlay=0:0:enable='between(t,9.2,12.5)'[s3]; \
      [s3][v_exp]overlay=0:0:enable='between(t,12.5,16.0)'[s4]; \
      [s4][logo_big]overlay=(W-w)/2:360:enable='between(t,16.0,25.0)'[s5]; \
      [s5]drawtext=fontfile='${fontPath}':expansion=none:textfile='scripts/subtitles_v7/v1_badge_s0.txt':fontsize=28:fontcolor=0xF6C94D:box=1:boxcolor=0x050814@0.90:boxborderw=16:x=(w-text_w)/2:y=220:enable='between(t,0,2.8)', \
          drawtext=fontfile='${fontPath}':expansion=none:textfile='scripts/subtitles_v7/v1_s0.txt':fontsize=42:fontcolor=white:box=1:boxcolor=0x050814@0.90:boxborderw=24:line_spacing=12:x=(w-text_w)/2:y=1200:enable='between(t,0,2.8)', \
          drawtext=fontfile='${fontPath}':expansion=none:textfile='scripts/subtitles_v7/v1_badge_s1.txt':fontsize=28:fontcolor=0xF6C94D:box=1:boxcolor=0x050814@0.90:boxborderw=16:x=(w-text_w)/2:y=220:enable='between(t,2.8,5.5)', \
          drawtext=fontfile='${fontPath}':expansion=none:textfile='scripts/subtitles_v7/v1_s1.txt':fontsize=40:fontcolor=white:box=1:boxcolor=0x050814@0.90:boxborderw=24:line_spacing=12:x=(w-text_w)/2:y=1200:enable='between(t,2.8,5.5)', \
          drawtext=fontfile='${fontPath}':expansion=none:textfile='scripts/subtitles_v7/v1_badge_s2.txt':fontsize=28:fontcolor=0xF6C94D:box=1:boxcolor=0x050814@0.90:boxborderw=16:x=(w-text_w)/2:y=220:enable='between(t,5.5,9.2)', \
          drawtext=fontfile='${fontPath}':expansion=none:textfile='scripts/subtitles_v7/v1_s2.txt':fontsize=42:fontcolor=white:box=1:boxcolor=0x050814@0.90:boxborderw=24:line_spacing=12:x=(w-text_w)/2:y=1200:enable='between(t,5.5,9.2)', \
          drawtext=fontfile='${fontPath}':expansion=none:textfile='scripts/subtitles_v7/v1_badge_s3.txt':fontsize=28:fontcolor=0xF6C94D:box=1:boxcolor=0x050814@0.90:boxborderw=16:x=(w-text_w)/2:y=220:enable='between(t,9.2,12.5)', \
          drawtext=fontfile='${fontPath}':expansion=none:textfile='scripts/subtitles_v7/v1_s3.txt':fontsize=38:fontcolor=0xF6C94D:box=1:boxcolor=0x050814@0.90:boxborderw=24:line_spacing=12:x=(w-text_w)/2:y=1200:enable='between(t,9.2,12.5)', \
          drawtext=fontfile='${fontPath}':expansion=none:textfile='scripts/subtitles_v7/v1_badge_s4.txt':fontsize=28:fontcolor=0x37CDA3:box=1:boxcolor=0x050814@0.90:boxborderw=16:x=(w-text_w)/2:y=220:enable='between(t,12.5,16.0)', \
          drawtext=fontfile='${fontPath}':expansion=none:textfile='scripts/subtitles_v7/v1_s4.txt':fontsize=40:fontcolor=0x37CDA3:box=1:boxcolor=0x050814@0.90:boxborderw=24:line_spacing=12:x=(w-text_w)/2:y=1200:enable='between(t,12.5,16.0)', \
          drawtext=fontfile='${fontPath}':expansion=none:textfile='scripts/subtitles_v7/v1_end_tag.txt':fontsize=40:fontcolor=0x37CDA3:box=1:boxcolor=0x050814@0.85:boxborderw=16:x=(w-text_w)/2:y=1120:enable='between(t,16.0,25.0)', \
          drawtext=fontfile='${fontPath}':expansion=none:textfile='scripts/subtitles_v7/v1_s5.txt':fontsize=40:fontcolor=white:box=1:boxcolor=0x050814@0.90:boxborderw=20:line_spacing=12:x=(w-text_w)/2:y=1200:enable='between(t,16.0,20.0)', \
          drawtext=fontfile='${fontPath}':expansion=none:textfile='scripts/subtitles_v7/v1_end_slogan.txt':fontsize=36:fontcolor=white:box=1:boxcolor=0x050814@0.85:boxborderw=14:line_spacing=10:x=(w-text_w)/2:y=1200:enable='between(t,20.0,25.0)', \
          drawtext=fontfile='${fontPath}':expansion=none:textfile='scripts/subtitles_v7/v1_end_domain.txt':fontsize=76:fontcolor=0xF6C94D:x=(w-text_w)/2:y=1300:enable='between(t,16.0,25.0)', \
          drawtext=fontfile='${fontPath}':expansion=none:textfile='scripts/subtitles_v7/v1_end_cta.txt':fontsize=40:fontcolor=white:box=1:boxcolor=0x050814@0.85:boxborderw=16:x=(w-text_w)/2:y=1430:enable='between(t,16.0,25.0)', \
          drawtext=fontfile='${fontPath}':expansion=none:textfile='scripts/subtitles_v7/v1_end_bio.txt':fontsize=32:fontcolor=0x94A3B8:x=(w-text_w)/2:y=1510:enable='between(t,16.0,25.0)'[outv]; \
      [7:a]aformat=sample_rates=48000:channel_layouts=stereo,volume=1.20[a_voc]; \
      [8:a]atrim=0:25,aformat=sample_rates=48000:channel_layouts=stereo,volume=0.15,afade=t=in:ss=0:d=0.5,afade=t=out:st=23.5:d=1.5[a_mus]; \
      [9:a]adelay=100|100,volume=0.6[sfx_w1]; \
      [10:a]adelay=2800|2800,volume=0.6[sfx_c1]; \
      [10:a]adelay=5500|5500,volume=0.6[sfx_c2]; \
      [11:a]adelay=9200|9200,volume=0.7[sfx_ch1]; \
      [11:a]adelay=12500|12500,volume=0.7[sfx_ch2]; \
      [9:a]adelay=16000|16000,volume=0.6[sfx_w2]; \
      [a_voc][a_mus][sfx_w1][sfx_c1][sfx_c2][sfx_ch1][sfx_ch2][sfx_w2]amix=inputs=8:duration=longest:weights=1.0 0.15 0.6 0.6 0.6 0.7 0.7 0.6:normalize=0,alimiter=limit=-1.5dB,aformat=sample_rates=48000:channel_layouts=stereo[outa]" \
    -map "[outv]" -map "[outa]" -c:v libx264 -preset faster -crf 21 -c:a aac -b:a 192k -t 25 "${outFile}"`;

  execSync(cmd, { stdio: 'inherit' });
  fs.copyFileSync(outFile, aliasFile);
  console.log(`✅ Vidéo 1 (Accroche 25s) V9 terminée et indexée !`);
}

// =========================================================================
// VIDÉO 2 : DÉMONSTRATION (30s) — RECOMMANDATIONS V9
// =========================================================================
function renderVideo2() {
  const outFile = path.join(outputDir, 'video_2_demonstration.mp4');
  const aliasFile = path.join(outputDir, 'video_2.mp4');
  console.log(`\n⏳ Rendu Vidéo 2 · Démonstration V9 (30s) -> ${outFile}...`);

  // Inputs:
  // 0: color background 30s
  // 1: logo 30s
  // 2: v2_app_intro.mp4 (vidéo de l'appli en train d'être utilisée en ouverture 0-3.2s)
  // 3: 02_import_clean.jpg (dépôt dézoomé 3.2-5.8s)
  // 4: 06_score_clean.jpg (score ATS et critères dézoomés 5.8-9.2s)
  // 5: v2_star_plan1_avant.jpg (STAR Plan 1 Avant 9.2-13.2s)
  // 6: v2_star_plan2_apres.jpg (STAR Plan 2 Après 13.2-17.2s)
  // 7: 09_export_clean.jpg (Deux livrables 17.2-20.8s)
  // 8: 10_prete_clean.jpg (Candidature prête 20.8-24.8s)
  // 9: audio voix v7
  // 10: musique teaser
  // 11: whoosh, 12: click, 13: chime

  const cmd = `ffmpeg -y \
    -f lavfi -i "color=c=0x080D20:s=1080x1920:r=30:d=30" \
    -loop 1 -t 30 -i "public/jnb-align-logo.png" \
    -t 3.5 -i "public/clips/v2_app_intro.mp4" \
    -loop 1 -t 3.0 -i "public/captures_clean/02_import_clean.jpg" \
    -loop 1 -t 4.0 -i "public/captures_clean/06_score_clean.jpg" \
    -loop 1 -t 4.5 -i "public/captures_clean/v2_star_plan1_avant.jpg" \
    -loop 1 -t 4.5 -i "public/captures_clean/v2_star_plan2_apres.jpg" \
    -loop 1 -t 4.0 -i "public/captures_clean/09_export_clean.jpg" \
    -loop 1 -t 4.5 -i "public/captures_clean/10_prete_clean.jpg" \
    -i "public/audio/video_2_demo_v7.mp3" \
    -i "${bgMusic}" \
    -i "${sfxWhoosh}" \
    -i "${sfxClick}" \
    -i "${sfxChime}" \
    -filter_complex "\
      [1:v]scale=360:360[logo_big]; \
      [2:v]scale=1080:1920:force_original_aspect_ratio=decrease,pad=1080:1920:(ow-iw)/2:(oh-ih)/2:color=0x080D20[v_app_intro]; \
      [3:v]scale=980:1920:force_original_aspect_ratio=decrease,pad=1080:1920:(ow-iw)/2:(oh-ih)/2:color=0x080D20[v_imp_dezoom]; \
      [4:v]scale=960:1920:force_original_aspect_ratio=decrease,pad=1080:1920:(ow-iw)/2:(oh-ih)/2:color=0x080D20[v_sco_dezoom]; \
      [5:v]scale=1080:1920[v_star_p1]; \
      [6:v]scale=1080:1920[v_star_p2]; \
      [7:v]scale=1280:2560,crop=1080:1920:(in_w-1080)/2:120[v_exp]; \
      [8:v]scale=1280:2560,crop=1080:1920:(in_w-1080)/2:120[v_prete]; \
      [0:v][v_app_intro]overlay=0:0:enable='between(t,0,3.2)'[s0]; \
      [s0][v_imp_dezoom]overlay=0:0:enable='between(t,3.2,5.8)'[s1]; \
      [s1][v_sco_dezoom]overlay=0:0:enable='between(t,5.8,9.2)'[s2]; \
      [s2][v_star_p1]overlay=0:0:enable='between(t,9.2,13.2)'[s3]; \
      [s3][v_star_p2]overlay=0:0:enable='between(t,13.2,17.2)'[s4]; \
      [s4][v_exp]overlay=0:0:enable='between(t,17.2,20.8)'[s5]; \
      [s5][v_prete]overlay=0:0:enable='between(t,20.8,24.8)'[s6]; \
      [s6][logo_big]overlay=(W-w)/2:360:enable='between(t,24.8,30.0)'[s7]; \
      [s7]drawtext=fontfile='${fontPath}':expansion=none:textfile='scripts/subtitles_v7/v2_badge_s0.txt':fontsize=28:fontcolor=0xF6C94D:box=1:boxcolor=0x050814@0.90:boxborderw=16:x=(w-text_w)/2:y=220:enable='between(t,0,3.2)', \
          drawtext=fontfile='${fontPath}':expansion=none:textfile='scripts/subtitles_v7/v2_s0.txt':fontsize=42:fontcolor=0xF6C94D:box=1:boxcolor=0x050814@0.90:boxborderw=24:line_spacing=12:x=(w-text_w)/2:y=1200:enable='between(t,0,3.2)', \
          drawtext=fontfile='${fontPath}':expansion=none:textfile='scripts/subtitles_v7/v2_badge_s1.txt':fontsize=28:fontcolor=0xF6C94D:box=1:boxcolor=0x050814@0.90:boxborderw=16:x=(w-text_w)/2:y=220:enable='between(t,3.2,5.8)', \
          drawtext=fontfile='${fontPath}':expansion=none:textfile='scripts/subtitles_v7/v2_s1.txt':fontsize=40:fontcolor=white:box=1:boxcolor=0x050814@0.90:boxborderw=24:line_spacing=12:x=(w-text_w)/2:y=1200:enable='between(t,3.2,5.8)', \
          drawtext=fontfile='${fontPath}':expansion=none:textfile='scripts/subtitles_v7/v2_badge_s2.txt':fontsize=28:fontcolor=0xF6C94D:box=1:boxcolor=0x050814@0.90:boxborderw=16:x=(w-text_w)/2:y=220:enable='between(t,5.8,9.2)', \
          drawtext=fontfile='${fontPath}':expansion=none:textfile='scripts/subtitles_v7/v2_s2.txt':fontsize=40:fontcolor=0xF6C94D:box=1:boxcolor=0x050814@0.90:boxborderw=24:line_spacing=12:x=(w-text_w)/2:y=1200:enable='between(t,5.8,9.2)', \
          drawtext=fontfile='${fontPath}':expansion=none:textfile='scripts/subtitles_v7/v2_badge_s3.txt':fontsize=28:fontcolor=0xF87171:box=1:boxcolor=0x050814@0.90:boxborderw=16:x=(w-text_w)/2:y=220:enable='between(t,9.2,13.2)', \
          drawtext=fontfile='${fontPath}':expansion=none:textfile='scripts/subtitles_v7/v2_s3.txt':fontsize=38:fontcolor=white:box=1:boxcolor=0x050814@0.90:boxborderw=24:line_spacing=12:x=(w-text_w)/2:y=1380:enable='between(t,9.2,13.2)', \
          drawtext=fontfile='${fontPath}':expansion=none:textfile='scripts/subtitles_v7/v2_badge_s4.txt':fontsize=28:fontcolor=0x37CDA3:box=1:boxcolor=0x050814@0.90:boxborderw=16:x=(w-text_w)/2:y=220:enable='between(t,13.2,17.2)', \
          drawtext=fontfile='${fontPath}':expansion=none:textfile='scripts/subtitles_v7/v2_s4.txt':fontsize=36:fontcolor=0xFDE047:box=1:boxcolor=0x050814@0.90:boxborderw=24:line_spacing=12:x=(w-text_w)/2:y=1400:enable='between(t,13.2,17.2)', \
          drawtext=fontfile='${fontPath}':expansion=none:textfile='scripts/subtitles_v7/v2_badge_s5.txt':fontsize=28:fontcolor=0x37CDA3:box=1:boxcolor=0x050814@0.90:boxborderw=16:x=(w-text_w)/2:y=220:enable='between(t,17.2,20.8)', \
          drawtext=fontfile='${fontPath}':expansion=none:textfile='scripts/subtitles_v7/v2_s5.txt':fontsize=40:fontcolor=0x37CDA3:box=1:boxcolor=0x050814@0.90:boxborderw=24:line_spacing=12:x=(w-text_w)/2:y=1200:enable='between(t,17.2,20.8)', \
          drawtext=fontfile='${fontPath}':expansion=none:textfile='scripts/subtitles_v7/v2_badge_s6.txt':fontsize=28:fontcolor=white:box=1:boxcolor=0x050814@0.90:boxborderw=16:x=(w-text_w)/2:y=220:enable='between(t,20.8,24.8)', \
          drawtext=fontfile='${fontPath}':expansion=none:textfile='scripts/subtitles_v7/v2_s6.txt':fontsize=38:fontcolor=white:box=1:boxcolor=0x050814@0.90:boxborderw=24:line_spacing=12:x=(w-text_w)/2:y=1200:enable='between(t,20.8,24.8)', \
          drawtext=fontfile='${fontPath}':expansion=none:textfile='scripts/subtitles_v7/v2_end_tag.txt':fontsize=40:fontcolor=0x37CDA3:box=1:boxcolor=0x050814@0.85:boxborderw=16:x=(w-text_w)/2:y=1120:enable='between(t,24.8,30.0)', \
          drawtext=fontfile='${fontPath}':expansion=none:textfile='scripts/subtitles_v7/v2_end_slogan.txt':fontsize=36:fontcolor=white:box=1:boxcolor=0x050814@0.85:boxborderw=14:line_spacing=10:x=(w-text_w)/2:y=1190:enable='between(t,24.8,30.0)', \
          drawtext=fontfile='${fontPath}':expansion=none:textfile='scripts/subtitles_v7/v2_end_domain.txt':fontsize=76:fontcolor=0xF6C94D:x=(w-text_w)/2:y=1300:enable='between(t,24.8,30.0)', \
          drawtext=fontfile='${fontPath}':expansion=none:textfile='scripts/subtitles_v7/v2_end_cta.txt':fontsize=40:fontcolor=white:box=1:boxcolor=0x050814@0.85:boxborderw=16:x=(w-text_w)/2:y=1430:enable='between(t,24.8,30.0)', \
          drawtext=fontfile='${fontPath}':expansion=none:textfile='scripts/subtitles_v7/v2_end_bio.txt':fontsize=32:fontcolor=0x94A3B8:x=(w-text_w)/2:y=1510:enable='between(t,24.8,30.0)'[outv]; \
      [9:a]aformat=sample_rates=48000:channel_layouts=stereo,volume=1.20[a_voc]; \
      [10:a]atrim=0:30,aformat=sample_rates=48000:channel_layouts=stereo,volume=0.15,afade=t=in:ss=0:d=0.5,afade=t=out:st=28.5:d=1.5[a_mus]; \
      [11:a]adelay=100|100,volume=0.6[sfx_w1]; \
      [12:a]adelay=3200|3200,volume=0.6[sfx_c1]; \
      [13:a]adelay=5800|5800,volume=0.7[sfx_ch1]; \
      [11:a]adelay=9200|9200,volume=0.6[sfx_w2]; \
      [13:a]adelay=13200|13200,volume=0.7[sfx_ch2]; \
      [12:a]adelay=17200|17200,volume=0.6[sfx_c2]; \
      [11:a]adelay=20800|20800,volume=0.6[sfx_w3]; \
      [11:a]adelay=24800|24800,volume=0.6[sfx_w4]; \
      [a_voc][a_mus][sfx_w1][sfx_c1][sfx_ch1][sfx_w2][sfx_ch2][sfx_c2][sfx_w3][sfx_w4]amix=inputs=10:duration=longest:weights=1.0 0.15 0.6 0.6 0.7 0.6 0.7 0.6 0.6 0.6:normalize=0,alimiter=limit=-1.5dB,aformat=sample_rates=48000:channel_layouts=stereo[outa]" \
    -map "[outv]" -map "[outa]" -c:v libx264 -preset faster -crf 21 -c:a aac -b:a 192k -t 30 "${outFile}"`;

  execSync(cmd, { stdio: 'inherit' });
  fs.copyFileSync(outFile, aliasFile);
  console.log(`✅ Vidéo 2 (Démonstration 30s) V9 terminée et indexée !`);
}

// =========================================================================
// VIDÉO 3 : LANCEMENT OFFICIEL (30s) — RECOMMANDATIONS V9
// =========================================================================
function renderVideo3() {
  const outFile = path.join(outputDir, 'video_3_lancement.mp4');
  const aliasFile = path.join(outputDir, 'video_3.mp4');
  console.log(`\n⏳ Rendu Vidéo 3 · Lancement Officiel V9 (30s) -> ${outFile}...`);

  // Inputs:
  // 0: color background 30s
  // 1: logo 30s
  // 2: v3_app_copilote.mp4 (vidéo d'utilisation de l'appli quand la voix parle du copilote à 3.2-7.2s)
  // 3: 02_import_clean.jpg (entrée CV & offre 7.2-12.0s)
  // 4: v3_schema_entree_sortie_geante.jpg (schéma géant entrée/sortie 12.0-17.2s)
  // 5: 09_export_clean.jpg (deux livrables 17.2-20.5s)
  // 6: 10_prete_clean.jpg (validation 20.5-25.0s)
  // 7: audio voix v7
  // 8: musique teaser
  // 9: whoosh, 10: click, 11: chime

  const cmd = `ffmpeg -y \
    -f lavfi -i "color=c=0x080D20:s=1080x1920:r=30:d=30" \
    -loop 1 -t 30 -i "public/jnb-align-logo.png" \
    -t 4.5 -i "public/clips/v3_app_copilote.mp4" \
    -loop 1 -t 5.0 -i "public/captures_clean/02_import_clean.jpg" \
    -loop 1 -t 6.0 -i "public/captures_clean/v3_schema_entree_sortie_geante.jpg" \
    -loop 1 -t 4.5 -i "public/captures_clean/09_export_clean.jpg" \
    -loop 1 -t 5.0 -i "public/captures_clean/10_prete_clean.jpg" \
    -i "public/audio/video_3_lancement_v7.mp3" \
    -i "${bgMusic}" \
    -i "${sfxWhoosh}" \
    -i "${sfxClick}" \
    -i "${sfxChime}" \
    -filter_complex "\
      [1:v]split=2[logo_in1][logo_in2]; \
      [logo_in1]scale=400:400[logo_intro]; \
      [logo_in2]scale=360:360[logo_big]; \
      [2:v]scale=1080:1920:force_original_aspect_ratio=decrease,pad=1080:1920:(ow-iw)/2:(oh-ih)/2:color=0x080D20[v_app_copilote]; \
      [3:v]scale=980:1920:force_original_aspect_ratio=decrease,pad=1080:1920:(ow-iw)/2:(oh-ih)/2:color=0x080D20[v_imp]; \
      [4:v]scale=1080:1920[v_schema_g]; \
      [5:v]scale=1280:2560,crop=1080:1920:(in_w-1080)/2:120[v_exp]; \
      [6:v]scale=1280:2560,crop=1080:1920:(in_w-1080)/2:120[v_prete]; \
      [0:v][logo_intro]overlay=(W-w)/2:360:enable='between(t,0,3.2)'[s0]; \
      [s0][v_app_copilote]overlay=0:0:enable='between(t,3.2,7.2)'[s1]; \
      [s1][v_imp]overlay=0:0:enable='between(t,7.2,12.0)'[s2]; \
      [s2][v_schema_g]overlay=0:0:enable='between(t,12.0,17.2)'[s3]; \
      [s3][v_exp]overlay=0:0:enable='between(t,17.2,20.5)'[s4]; \
      [s4][v_prete]overlay=0:0:enable='between(t,20.5,25.0)'[s5]; \
      [s5][logo_big]overlay=(W-w)/2:360:enable='between(t,25.0,30.0)'[s6]; \
      [s6]drawtext=fontfile='${fontPath}':expansion=none:textfile='scripts/subtitles_v7/v3_badge_s0.txt':fontsize=28:fontcolor=0xF6C94D:box=1:boxcolor=0x050814@0.90:boxborderw=16:x=(w-text_w)/2:y=220:enable='between(t,0,3.2)', \
          drawtext=fontfile='${fontPath}':expansion=none:textfile='scripts/subtitles_v7/v3_s0.txt':fontsize=44:fontcolor=0xF6C94D:box=1:boxcolor=0x050814@0.90:boxborderw=24:line_spacing=12:x=(w-text_w)/2:y=1200:enable='between(t,0,3.2)', \
          drawtext=fontfile='${fontPath}':expansion=none:textfile='scripts/subtitles_v7/v3_badge_s1.txt':fontsize=28:fontcolor=0xF6C94D:box=1:boxcolor=0x050814@0.90:boxborderw=16:x=(w-text_w)/2:y=220:enable='between(t,3.2,7.2)', \
          drawtext=fontfile='${fontPath}':expansion=none:textfile='scripts/subtitles_v7/v3_s1.txt':fontsize=38:fontcolor=white:box=1:boxcolor=0x050814@0.90:boxborderw=24:line_spacing=12:x=(w-text_w)/2:y=1200:enable='between(t,3.2,7.2)', \
          drawtext=fontfile='${fontPath}':expansion=none:textfile='scripts/subtitles_v7/v3_badge_s2.txt':fontsize=28:fontcolor=0xF6C94D:box=1:boxcolor=0x050814@0.90:boxborderw=16:x=(w-text_w)/2:y=220:enable='between(t,7.2,12.0)', \
          drawtext=fontfile='${fontPath}':expansion=none:textfile='scripts/subtitles_v7/v3_s2.txt':fontsize=38:fontcolor=0xF6C94D:box=1:boxcolor=0x050814@0.90:boxborderw=24:line_spacing=12:x=(w-text_w)/2:y=1200:enable='between(t,7.2,12.0)', \
          drawtext=fontfile='${fontPath}':expansion=none:textfile='scripts/subtitles_v7/v3_badge_s3.txt':fontsize=28:fontcolor=0x37CDA3:box=1:boxcolor=0x050814@0.90:boxborderw=16:x=(w-text_w)/2:y=220:enable='between(t,12.0,17.2)', \
          drawtext=fontfile='${fontPath}':expansion=none:textfile='scripts/subtitles_v7/v3_s3.txt':fontsize=38:fontcolor=white:box=1:boxcolor=0x050814@0.90:boxborderw=24:line_spacing=12:x=(w-text_w)/2:y=1640:enable='between(t,12.0,17.2)', \
          drawtext=fontfile='${fontPath}':expansion=none:textfile='scripts/subtitles_v7/v3_badge_s4.txt':fontsize=28:fontcolor=0x37CDA3:box=1:boxcolor=0x050814@0.90:boxborderw=16:x=(w-text_w)/2:y=220:enable='between(t,17.2,20.5)', \
          drawtext=fontfile='${fontPath}':expansion=none:textfile='scripts/subtitles_v7/v3_s4.txt':fontsize=40:fontcolor=0x37CDA3:box=1:boxcolor=0x050814@0.90:boxborderw=24:line_spacing=12:x=(w-text_w)/2:y=1200:enable='between(t,17.2,20.5)', \
          drawtext=fontfile='${fontPath}':expansion=none:textfile='scripts/subtitles_v7/v3_badge_s5.txt':fontsize=28:fontcolor=white:box=1:boxcolor=0x050814@0.90:boxborderw=16:x=(w-text_w)/2:y=220:enable='between(t,20.5,25.0)', \
          drawtext=fontfile='${fontPath}':expansion=none:textfile='scripts/subtitles_v7/v3_s5.txt':fontsize=40:fontcolor=white:box=1:boxcolor=0x050814@0.90:boxborderw=24:line_spacing=12:x=(w-text_w)/2:y=1200:enable='between(t,20.5,25.0)', \
          drawtext=fontfile='${fontPath}':expansion=none:textfile='scripts/subtitles_v7/v3_end_tag.txt':fontsize=40:fontcolor=0x37CDA3:box=1:boxcolor=0x050814@0.85:boxborderw=16:x=(w-text_w)/2:y=1120:enable='between(t,25.0,30.0)', \
          drawtext=fontfile='${fontPath}':expansion=none:textfile='scripts/subtitles_v7/v3_end_slogan.txt':fontsize=36:fontcolor=white:box=1:boxcolor=0x050814@0.85:boxborderw=14:line_spacing=10:x=(w-text_w)/2:y=1190:enable='between(t,25.0,30.0)', \
          drawtext=fontfile='${fontPath}':expansion=none:textfile='scripts/subtitles_v7/v3_end_domain.txt':fontsize=76:fontcolor=0xF6C94D:x=(w-text_w)/2:y=1300:enable='between(t,25.0,30.0)', \
          drawtext=fontfile='${fontPath}':expansion=none:textfile='scripts/subtitles_v7/v3_end_cta.txt':fontsize=40:fontcolor=white:box=1:boxcolor=0x050814@0.85:boxborderw=16:x=(w-text_w)/2:y=1430:enable='between(t,25.0,30.0)', \
          drawtext=fontfile='${fontPath}':expansion=none:textfile='scripts/subtitles_v7/v3_end_bio.txt':fontsize=32:fontcolor=0x94A3B8:x=(w-text_w)/2:y=1510:enable='between(t,25.0,30.0)'[outv]; \
      [7:a]aformat=sample_rates=48000:channel_layouts=stereo,volume=1.20[a_voc]; \
      [8:a]atrim=0:30,aformat=sample_rates=48000:channel_layouts=stereo,volume=0.15,afade=t=in:ss=0:d=0.5,afade=t=out:st=28.5:d=1.5[a_mus]; \
      [11:a]adelay=100|100,volume=0.7[sfx_ch0]; \
      [9:a]adelay=3200|3200,volume=0.6[sfx_w1]; \
      [10:a]adelay=7200|7200,volume=0.6[sfx_c1]; \
      [11:a]adelay=12000|12000,volume=0.7[sfx_ch1]; \
      [10:a]adelay=17200|17200,volume=0.6[sfx_c2]; \
      [11:a]adelay=20500|20500,volume=0.7[sfx_ch2]; \
      [9:a]adelay=25000|25000,volume=0.6[sfx_w3]; \
      [a_voc][a_mus][sfx_ch0][sfx_w1][sfx_c1][sfx_ch1][sfx_c2][sfx_ch2][sfx_w3]amix=inputs=9:duration=longest:weights=1.0 0.15 0.7 0.6 0.6 0.7 0.6 0.7 0.6:normalize=0,alimiter=limit=-1.5dB,aformat=sample_rates=48000:channel_layouts=stereo[outa]" \
    -map "[outv]" -map "[outa]" -c:v libx264 -preset faster -crf 21 -c:a aac -b:a 192k -t 30 "${outFile}"`;

  execSync(cmd, { stdio: 'inherit' });
  fs.copyFileSync(outFile, aliasFile);
  console.log(`✅ Vidéo 3 (Lancement Officiel 30s) V9 terminée et indexée !`);
}

renderVideo1();
renderVideo2();
renderVideo3();
console.log('\n🎉 Rendu V9 avec TOUTES les recommandations utilisateur appliqué avec succès !');
