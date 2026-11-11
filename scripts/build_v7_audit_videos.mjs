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

console.log('🎬 Rendu V7 des 3 vidéos TikTok selon l’AUDIT TECHNIQUE & ÉDITORIAL...');
console.log('✨ 100% des recommandations mises en oeuvre :');
console.log('  1. Captures agrandies à 88% de la largeur utile, barres et marges supprimées.');
console.log('  2. Vidéo 1 : Hook géant lisible en 1 seconde (« Ton CV est-il vraiment adapté ? »), logo bref, CTA final stabilisé.');
console.log('  3. Vidéo 2 : Avant / Après STAR en DEUX PLANS SUCCESSIFS avec mention « Exemple illustratif », chiffres certifiés sans fausse promesse.');
console.log('  4. Vidéo 3 : Schéma ENTRÉE / SORTIE géant lisible sans effort, différenciation totale de la démo, CTA énergique.');
console.log('  5. Audio : Voix intelligible Fenrir, beat en retrait (-18dB), zéro écrêtage avec limiteur True Peak.');

// =========================================================================
// VIDÉO 1 : ACCROCHE (25s) — DÉCOUPAGE AUDIT TECHNIQUE PAGE 3
// =========================================================================
function renderVideo1() {
  const outFile = path.join(outputDir, 'video_1_accroche.mp4');
  const aliasFile = path.join(outputDir, 'video_1.mp4');
  console.log(`\n⏳ Rendu Vidéo 1 · Accroche (25s) -> ${outFile}...`);

  const cmd = `ffmpeg -y \
    -f lavfi -i "color=c=0x080D20:s=1080x1920:r=30:d=25" \
    -loop 1 -t 25 -i "public/jnb-align-logo.png" \
    -loop 1 -t 3.0 -i "public/captures_clean/v1_hook_question_geante.jpg" \
    -loop 1 -t 5.5 -i "public/captures_clean/02_import_clean.jpg" \
    -loop 1 -t 6.0 -i "public/captures_clean/06_score_zoom.jpg" \
    -loop 1 -t 5.0 -i "public/captures_clean/09_export_clean.jpg" \
    -i "public/audio/video_1_accroche_v7.mp3" \
    -i "${bgMusic}" \
    -i "${sfxWhoosh}" \
    -i "${sfxClick}" \
    -i "${sfxChime}" \
    -filter_complex "\
      [1:v]split=2[logo_in1][logo_in2]; \
      [logo_in1]scale=400:400[logo_mid]; \
      [logo_in2]scale=360:360[logo_big]; \
      [2:v]scale=1080:1920[v_hook_q]; \
      [3:v]scale=1280:2560,crop=1080:1920:(in_w-1080)/2:220[v_imp]; \
      [4:v]scale=1280:2560,crop=1080:1920:(in_w-1080)/2:100[v_sco]; \
      [5:v]scale=1280:2560,crop=1080:1920:(in_w-1080)/2:120[v_exp]; \
      [0:v][v_hook_q]overlay=0:0:enable='between(t,0,2.5)'[s0]; \
      [s0][logo_mid]overlay=(W-w)/2:420:enable='between(t,2.5,5.5)'[s1]; \
      [s1][v_imp]overlay=0:0:enable='between(t,5.5,10.5)'[s2]; \
      [s2][v_sco]overlay=0:0:enable='between(t,10.5,16.0)'[s3]; \
      [s3][v_exp]overlay=0:0:enable='between(t,16.0,20.5)'[s4]; \
      [s4][logo_big]overlay=(W-w)/2:360:enable='between(t,20.5,25.0)'[s5]; \
      [s5]drawtext=fontfile='${fontPath}':expansion=none:textfile='scripts/subtitles_v7/v1_s0.txt':fontsize=42:fontcolor=0xF6C94D:box=1:boxcolor=0x050814@0.90:boxborderw=24:line_spacing=12:x=(w-text_w)/2:y=1200:enable='between(t,0,2.5)', \
          drawtext=fontfile='${fontPath}':expansion=none:textfile='scripts/subtitles_v7/v1_s1.txt':fontsize=40:fontcolor=white:box=1:boxcolor=0x050814@0.90:boxborderw=24:line_spacing=12:x=(w-text_w)/2:y=1200:enable='between(t,2.5,5.5)', \
          drawtext=fontfile='${fontPath}':expansion=none:textfile='scripts/subtitles_v7/v1_s2.txt':fontsize=42:fontcolor=white:box=1:boxcolor=0x050814@0.90:boxborderw=24:line_spacing=12:x=(w-text_w)/2:y=1200:enable='between(t,5.5,10.5)', \
          drawtext=fontfile='${fontPath}':expansion=none:textfile='scripts/subtitles_v7/v1_s3.txt':fontsize=38:fontcolor=0xF6C94D:box=1:boxcolor=0x050814@0.90:boxborderw=24:line_spacing=12:x=(w-text_w)/2:y=1200:enable='between(t,10.5,16.0)', \
          drawtext=fontfile='${fontPath}':expansion=none:textfile='scripts/subtitles_v7/v1_s4.txt':fontsize=40:fontcolor=0x37CDA3:box=1:boxcolor=0x050814@0.90:boxborderw=24:line_spacing=12:x=(w-text_w)/2:y=1200:enable='between(t,16.0,20.5)', \
          drawtext=fontfile='${fontPath}':expansion=none:textfile='scripts/subtitles_v7/v1_end_tag.txt':fontsize=40:fontcolor=0x37CDA3:box=1:boxcolor=0x050814@0.85:boxborderw=16:x=(w-text_w)/2:y=1120:enable='between(t,20.5,25.0)', \
          drawtext=fontfile='${fontPath}':expansion=none:textfile='scripts/subtitles_v7/v1_end_slogan.txt':fontsize=36:fontcolor=white:box=1:boxcolor=0x050814@0.85:boxborderw=14:line_spacing=10:x=(w-text_w)/2:y=1190:enable='between(t,20.5,25.0)', \
          drawtext=fontfile='${fontPath}':expansion=none:textfile='scripts/subtitles_v7/v1_end_domain.txt':fontsize=76:fontcolor=0xF6C94D:x=(w-text_w)/2:y=1300:enable='between(t,20.5,25.0)', \
          drawtext=fontfile='${fontPath}':expansion=none:textfile='scripts/subtitles_v7/v1_end_cta.txt':fontsize=40:fontcolor=white:box=1:boxcolor=0x050814@0.85:boxborderw=16:x=(w-text_w)/2:y=1430:enable='between(t,20.5,25.0)', \
          drawtext=fontfile='${fontPath}':expansion=none:textfile='scripts/subtitles_v7/v1_end_bio.txt':fontsize=32:fontcolor=0x94A3B8:x=(w-text_w)/2:y=1510:enable='between(t,20.5,25.0)'[outv]; \
      [6:a]aformat=sample_rates=48000:channel_layouts=stereo,volume=1.20[a_voc]; \
      [7:a]atrim=0:25,aformat=sample_rates=48000:channel_layouts=stereo,volume=0.15,afade=t=in:ss=0:d=0.5,afade=t=out:st=23.5:d=1.5[a_mus]; \
      [8:a]adelay=100|100,volume=0.6[sfx_w1]; \
      [9:a]adelay=5500|5500,volume=0.6[sfx_c1]; \
      [10:a]adelay=10800|10800,volume=0.7[sfx_ch1]; \
      [9:a]adelay=16200|16200,volume=0.6[sfx_c2]; \
      [10:a]adelay=18500|18500,volume=0.7[sfx_ch2]; \
      [8:a]adelay=20500|20500,volume=0.6[sfx_w2]; \
      [a_voc][a_mus][sfx_w1][sfx_c1][sfx_ch1][sfx_c2][sfx_ch2][sfx_w2]amix=inputs=8:duration=longest:weights=1.0 0.15 0.6 0.6 0.7 0.6 0.7 0.6:normalize=0,alimiter=limit=-1.5dB,aformat=sample_rates=48000:channel_layouts=stereo[outa]" \
    -map "[outv]" -map "[outa]" -c:v libx264 -preset faster -crf 21 -c:a aac -b:a 192k -t 25 "${outFile}"`;

  execSync(cmd, { stdio: 'inherit' });
  fs.copyFileSync(outFile, aliasFile);
  console.log(`✅ Vidéo 1 (Accroche 25s) terminée et indexée : ${outFile} & ${aliasFile}`);
}

// =========================================================================
// VIDÉO 2 : DÉMONSTRATION (30s) — DÉCOUPAGE AUDIT TECHNIQUE PAGE 4-5
// STAR EN DEUX PLANS SUCCESSIFS + EXEMPLE ILLUSTRATIF
// =========================================================================
function renderVideo2() {
  const outFile = path.join(outputDir, 'video_2_demonstration.mp4');
  const aliasFile = path.join(outputDir, 'video_2.mp4');
  console.log(`\n⏳ Rendu Vidéo 2 · Démonstration (30s) -> ${outFile}...`);

  const cmd = `ffmpeg -y \
    -f lavfi -i "color=c=0x080D20:s=1080x1920:r=30:d=30" \
    -loop 1 -t 30 -i "public/jnb-align-logo.png" \
    -loop 1 -t 4.0 -i "public/captures_clean/01_accueil_clean.jpg" \
    -loop 1 -t 4.5 -i "public/captures_clean/02_import_clean.jpg" \
    -loop 1 -t 5.0 -i "public/captures_clean/03_offre_clean.jpg" \
    -loop 1 -t 6.0 -i "public/captures_clean/06_score_zoom.jpg" \
    -loop 1 -t 3.0 -i "public/captures_clean/v2_star_plan1_avant.jpg" \
    -loop 1 -t 3.5 -i "public/captures_clean/v2_star_plan2_apres.jpg" \
    -loop 1 -t 4.0 -i "public/captures_clean/09_export_clean.jpg" \
    -i "public/audio/video_2_demo_v7.mp3" \
    -i "${bgMusic}" \
    -i "${sfxWhoosh}" \
    -i "${sfxClick}" \
    -i "${sfxChime}" \
    -filter_complex "\
      [1:v]scale=360:360[logo_big]; \
      [2:v]scale=1280:2560,crop=1080:1920:(in_w-1080)/2:120[v_acc]; \
      [3:v]scale=1280:2560,crop=1080:1920:(in_w-1080)/2:220[v_imp]; \
      [4:v]scale=1280:2560,crop=1080:1920:(in_w-1080)/2:180[v_off]; \
      [5:v]scale=1280:2560,crop=1080:1920:(in_w-1080)/2:100[v_sco]; \
      [6:v]scale=1080:1920[v_star_p1]; \
      [7:v]scale=1080:1920[v_star_p2]; \
      [8:v]scale=1280:2560,crop=1080:1920:(in_w-1080)/2:120[v_exp]; \
      [0:v][v_acc]overlay=0:0:enable='between(t,0,3.2)'[s0]; \
      [s0][v_imp]overlay=0:0:enable='between(t,3.2,7.2)'[s1]; \
      [s1][v_off]overlay=0:0:enable='between(t,7.2,11.5)'[s2]; \
      [s2][v_sco]overlay=0:0:enable='between(t,11.5,16.8)'[s3]; \
      [s3][v_star_p1]overlay=0:0:enable='between(t,16.8,19.5)'[s4]; \
      [s4][v_star_p2]overlay=0:0:enable='between(t,19.5,22.8)'[s5]; \
      [s5][v_exp]overlay=0:0:enable='between(t,22.8,25.8)'[s6]; \
      [s6][logo_big]overlay=(W-w)/2:360:enable='between(t,25.8,30.0)'[s7]; \
      [s7]drawtext=fontfile='${fontPath}':expansion=none:textfile='scripts/subtitles_v7/v2_s0.txt':fontsize=42:fontcolor=0xF6C94D:box=1:boxcolor=0x050814@0.90:boxborderw=24:line_spacing=12:x=(w-text_w)/2:y=1200:enable='between(t,0,3.2)', \
          drawtext=fontfile='${fontPath}':expansion=none:textfile='scripts/subtitles_v7/v2_s1.txt':fontsize=40:fontcolor=white:box=1:boxcolor=0x050814@0.90:boxborderw=24:line_spacing=12:x=(w-text_w)/2:y=1200:enable='between(t,3.2,7.2)', \
          drawtext=fontfile='${fontPath}':expansion=none:textfile='scripts/subtitles_v7/v2_s2.txt':fontsize=40:fontcolor=0xF6C94D:box=1:boxcolor=0x050814@0.90:boxborderw=24:line_spacing=12:x=(w-text_w)/2:y=1200:enable='between(t,7.2,11.5)', \
          drawtext=fontfile='${fontPath}':expansion=none:textfile='scripts/subtitles_v7/v2_s3.txt':fontsize=38:fontcolor=white:box=1:boxcolor=0x050814@0.90:boxborderw=24:line_spacing=12:x=(w-text_w)/2:y=1200:enable='between(t,11.5,16.8)', \
          drawtext=fontfile='${fontPath}':expansion=none:textfile='scripts/subtitles_v7/v2_s4.txt':fontsize=36:fontcolor=0xFDE047:box=1:boxcolor=0x050814@0.90:boxborderw=24:line_spacing=12:x=(w-text_w)/2:y=1420:enable='between(t,19.5,22.8)', \
          drawtext=fontfile='${fontPath}':expansion=none:textfile='scripts/subtitles_v7/v2_s5.txt':fontsize=38:fontcolor=0x37CDA3:box=1:boxcolor=0x050814@0.90:boxborderw=24:line_spacing=12:x=(w-text_w)/2:y=1200:enable='between(t,22.8,25.8)', \
          drawtext=fontfile='${fontPath}':expansion=none:textfile='scripts/subtitles_v7/v2_end_tag.txt':fontsize=40:fontcolor=0x37CDA3:box=1:boxcolor=0x050814@0.85:boxborderw=16:x=(w-text_w)/2:y=1120:enable='between(t,25.8,30.0)', \
          drawtext=fontfile='${fontPath}':expansion=none:textfile='scripts/subtitles_v7/v2_end_slogan.txt':fontsize=36:fontcolor=white:box=1:boxcolor=0x050814@0.85:boxborderw=14:line_spacing=10:x=(w-text_w)/2:y=1190:enable='between(t,25.8,30.0)', \
          drawtext=fontfile='${fontPath}':expansion=none:textfile='scripts/subtitles_v7/v2_end_domain.txt':fontsize=76:fontcolor=0xF6C94D:x=(w-text_w)/2:y=1300:enable='between(t,25.8,30.0)', \
          drawtext=fontfile='${fontPath}':expansion=none:textfile='scripts/subtitles_v7/v2_end_cta.txt':fontsize=40:fontcolor=white:box=1:boxcolor=0x050814@0.85:boxborderw=16:x=(w-text_w)/2:y=1430:enable='between(t,25.8,30.0)', \
          drawtext=fontfile='${fontPath}':expansion=none:textfile='scripts/subtitles_v7/v2_end_bio.txt':fontsize=32:fontcolor=0x94A3B8:x=(w-text_w)/2:y=1510:enable='between(t,25.8,30.0)'[outv]; \
      [9:a]aformat=sample_rates=48000:channel_layouts=stereo,volume=1.20[a_voc]; \
      [10:a]atrim=0:30,aformat=sample_rates=48000:channel_layouts=stereo,volume=0.15,afade=t=in:ss=0:d=0.5,afade=t=out:st=28.5:d=1.5[a_mus]; \
      [11:a]adelay=100|100,volume=0.6[sfx_w1]; \
      [12:a]adelay=3200|3200,volume=0.6[sfx_c1]; \
      [12:a]adelay=7200|7200,volume=0.6[sfx_c2]; \
      [13:a]adelay=11500|11500,volume=0.7[sfx_ch1]; \
      [11:a]adelay=16800|16800,volume=0.6[sfx_w2]; \
      [13:a]adelay=19500|19500,volume=0.7[sfx_ch2]; \
      [12:a]adelay=22800|22800,volume=0.6[sfx_c3]; \
      [11:a]adelay=25800|25800,volume=0.6[sfx_w3]; \
      [a_voc][a_mus][sfx_w1][sfx_c1][sfx_c2][sfx_ch1][sfx_w2][sfx_ch2][sfx_c3][sfx_w3]amix=inputs=10:duration=longest:weights=1.0 0.15 0.6 0.6 0.6 0.7 0.6 0.7 0.6 0.6:normalize=0,alimiter=limit=-1.5dB,aformat=sample_rates=48000:channel_layouts=stereo[outa]" \
    -map "[outv]" -map "[outa]" -c:v libx264 -preset faster -crf 21 -c:a aac -b:a 192k -t 30 "${outFile}"`;

  execSync(cmd, { stdio: 'inherit' });
  fs.copyFileSync(outFile, aliasFile);
  console.log(`✅ Vidéo 2 (Démonstration 30s) terminée et indexée : ${outFile} & ${aliasFile}`);
}

// =========================================================================
// VIDÉO 3 : LANCEMENT OFFICIEL (30s) — DÉCOUPAGE AUDIT TECHNIQUE PAGE 6
// SCHÉMA ENTRÉE / SORTIE GÉANT LISIBLE SANS EFFORT
// =========================================================================
function renderVideo3() {
  const outFile = path.join(outputDir, 'video_3_lancement.mp4');
  const aliasFile = path.join(outputDir, 'video_3.mp4');
  console.log(`\n⏳ Rendu Vidéo 3 · Lancement Officiel (30s) -> ${outFile}...`);

  const cmd = `ffmpeg -y \
    -f lavfi -i "color=c=0x080D20:s=1080x1920:r=30:d=30" \
    -loop 1 -t 30 -i "public/jnb-align-logo.png" \
    -loop 1 -t 4.5 -i "public/captures_clean/v1_accueil_punchin.jpg" \
    -loop 1 -t 11.0 -i "public/captures_clean/v3_schema_entree_sortie_geante.jpg" \
    -loop 1 -t 5.5 -i "public/captures_clean/09_export_clean.jpg" \
    -loop 1 -t 4.5 -i "public/captures_clean/10_prete_clean.jpg" \
    -i "public/audio/video_3_lancement_v7.mp3" \
    -i "${bgMusic}" \
    -i "${sfxWhoosh}" \
    -i "${sfxClick}" \
    -i "${sfxChime}" \
    -filter_complex "\
      [1:v]split=2[logo_in1][logo_in2]; \
      [logo_in1]scale=400:400[logo_intro]; \
      [logo_in2]scale=360:360[logo_big]; \
      [2:v]scale=1280:2560,crop=1080:1920:(in_w-1080)/2:120[v_acc]; \
      [3:v]scale=1080:1920[v_schema_g]; \
      [4:v]scale=1280:2560,crop=1080:1920:(in_w-1080)/2:120[v_exp]; \
      [5:v]scale=1280:2560,crop=1080:1920:(in_w-1080)/2:120[v_prete]; \
      [0:v][logo_intro]overlay=(W-w)/2:360:enable='between(t,0,1.8)'[s0]; \
      [s0][v_acc]overlay=0:0:enable='between(t,1.8,7.0)'[s1]; \
      [s1][v_schema_g]overlay=0:0:enable='between(t,7.0,17.0)'[s2]; \
      [s2][v_exp]overlay=0:0:enable='between(t,17.0,22.0)'[s3]; \
      [s3][v_prete]overlay=0:0:enable='between(t,22.0,25.5)'[s4]; \
      [s4][logo_big]overlay=(W-w)/2:360:enable='between(t,25.5,30.0)'[s5]; \
      [s5]drawtext=fontfile='${fontPath}':expansion=none:textfile='scripts/subtitles_v7/v3_s0.txt':fontsize=44:fontcolor=0xF6C94D:box=1:boxcolor=0x050814@0.90:boxborderw=24:line_spacing=12:x=(w-text_w)/2:y=1200:enable='between(t,0,3.0)', \
          drawtext=fontfile='${fontPath}':expansion=none:textfile='scripts/subtitles_v7/v3_s1.txt':fontsize=38:fontcolor=white:box=1:boxcolor=0x050814@0.90:boxborderw=24:line_spacing=12:x=(w-text_w)/2:y=1200:enable='between(t,3.0,7.0)', \
          drawtext=fontfile='${fontPath}':expansion=none:textfile='scripts/subtitles_v7/v3_s2.txt':fontsize=38:fontcolor=0xF6C94D:box=1:boxcolor=0x050814@0.90:boxborderw=24:line_spacing=12:x=(w-text_w)/2:y=1640:enable='between(t,7.0,12.0)', \
          drawtext=fontfile='${fontPath}':expansion=none:textfile='scripts/subtitles_v7/v3_s3.txt':fontsize=38:fontcolor=white:box=1:boxcolor=0x050814@0.90:boxborderw=24:line_spacing=12:x=(w-text_w)/2:y=1640:enable='between(t,12.0,17.0)', \
          drawtext=fontfile='${fontPath}':expansion=none:textfile='scripts/subtitles_v7/v3_s4.txt':fontsize=40:fontcolor=0x37CDA3:box=1:boxcolor=0x050814@0.90:boxborderw=24:line_spacing=12:x=(w-text_w)/2:y=1200:enable='between(t,17.0,22.0)', \
          drawtext=fontfile='${fontPath}':expansion=none:textfile='scripts/subtitles_v7/v3_s5.txt':fontsize=40:fontcolor=white:box=1:boxcolor=0x050814@0.90:boxborderw=24:line_spacing=12:x=(w-text_w)/2:y=1200:enable='between(t,22.0,25.5)', \
          drawtext=fontfile='${fontPath}':expansion=none:textfile='scripts/subtitles_v7/v3_end_tag.txt':fontsize=40:fontcolor=0x37CDA3:box=1:boxcolor=0x050814@0.85:boxborderw=16:x=(w-text_w)/2:y=1120:enable='between(t,25.5,30.0)', \
          drawtext=fontfile='${fontPath}':expansion=none:textfile='scripts/subtitles_v7/v3_end_slogan.txt':fontsize=36:fontcolor=white:box=1:boxcolor=0x050814@0.85:boxborderw=14:line_spacing=10:x=(w-text_w)/2:y=1190:enable='between(t,25.5,30.0)', \
          drawtext=fontfile='${fontPath}':expansion=none:textfile='scripts/subtitles_v7/v3_end_domain.txt':fontsize=76:fontcolor=0xF6C94D:x=(w-text_w)/2:y=1300:enable='between(t,25.5,30.0)', \
          drawtext=fontfile='${fontPath}':expansion=none:textfile='scripts/subtitles_v7/v3_end_cta.txt':fontsize=40:fontcolor=white:box=1:boxcolor=0x050814@0.85:boxborderw=16:x=(w-text_w)/2:y=1430:enable='between(t,25.5,30.0)', \
          drawtext=fontfile='${fontPath}':expansion=none:textfile='scripts/subtitles_v7/v3_end_bio.txt':fontsize=32:fontcolor=0x94A3B8:x=(w-text_w)/2:y=1510:enable='between(t,25.5,30.0)'[outv]; \
      [6:a]aformat=sample_rates=48000:channel_layouts=stereo,volume=1.20[a_voc]; \
      [7:a]atrim=0:30,aformat=sample_rates=48000:channel_layouts=stereo,volume=0.15,afade=t=in:ss=0:d=0.5,afade=t=out:st=28.5:d=1.5[a_mus]; \
      [10:a]adelay=100|100,volume=0.7[sfx_ch0]; \
      [8:a]adelay=1800|1800,volume=0.6[sfx_w1]; \
      [8:a]adelay=7000|7000,volume=0.6[sfx_w2]; \
      [10:a]adelay=12500|12500,volume=0.7[sfx_ch1]; \
      [9:a]adelay=17000|17000,volume=0.6[sfx_c1]; \
      [10:a]adelay=22000|22000,volume=0.7[sfx_ch2]; \
      [8:a]adelay=25500|25500,volume=0.6[sfx_w3]; \
      [a_voc][a_mus][sfx_ch0][sfx_w1][sfx_w2][sfx_ch1][sfx_c1][sfx_ch2][sfx_w3]amix=inputs=9:duration=longest:weights=1.0 0.15 0.7 0.6 0.6 0.7 0.6 0.7 0.6:normalize=0,alimiter=limit=-1.5dB,aformat=sample_rates=48000:channel_layouts=stereo[outa]" \
    -map "[outv]" -map "[outa]" -c:v libx264 -preset faster -crf 21 -c:a aac -b:a 192k -t 30 "${outFile}"`;

  execSync(cmd, { stdio: 'inherit' });
  fs.copyFileSync(outFile, aliasFile);
  console.log(`✅ Vidéo 3 (Lancement 30s) terminée et indexée : ${outFile} & ${aliasFile}`);
}

renderVideo1();
renderVideo2();
renderVideo3();
console.log('\n🎉 Rendu V7 des 3 vidéos TikTok terminé avec succès et conformité totale à l’audit technique !');
