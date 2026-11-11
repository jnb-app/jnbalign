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

console.log('🎬 Rendu des 3 vidéos TikTok officielles selon le Rapport d’Audit Post-Production V2...');
console.log('✨ Critères 100% appliqués : Indexation exacte, Sous-titres rehaussés (>15%), Accents UTF-8, Captures assainies (sans URL staging ni barres), Punch-in Zooms 125%, Sound Design complet (Voix + SFX + Musique Teaser)');

// =========================================================================
// VIDÉO 1 : ACCROCHE (25s) — Fichier officiel video_1.mp4 & video_1_accroche.mp4
// =========================================================================
function renderVideo1() {
  const outFile = path.join(outputDir, 'video_1_accroche.mp4');
  const aliasFile = path.join(outputDir, 'video_1.mp4');
  console.log(`\n⏳ Rendu Vidéo 1 · Accroche (25s) -> ${outFile}...`);

  const cmd = `ffmpeg -y \
    -f lavfi -i "color=c=0x080D20:s=1080x1920:r=30:d=25" \
    -loop 1 -t 25 -i "public/jnb-align-logo.png" \
    -loop 1 -t 3 -i "public/captures_clean/01_accueil_clean.jpg" \
    -loop 1 -t 6 -i "public/captures_clean/02_import_clean.jpg" \
    -loop 1 -t 3 -i "public/captures_clean/06_score_clean.jpg" \
    -loop 1 -t 5 -i "public/captures_clean/06_score_zoom.jpg" \
    -loop 1 -t 6 -i "public/captures_clean/09_export_clean.jpg" \
    -i "public/audio/video_1_accroche.mp3" \
    -i "${bgMusic}" \
    -i "${sfxWhoosh}" \
    -i "${sfxClick}" \
    -i "${sfxChime}" \
    -filter_complex "\
      [1:v]split=2[logo1_in1][logo1_in2]; \
      [logo1_in1]scale=320:320[logo_med]; \
      [logo1_in2]scale=360:360[logo_big]; \
      [2:v]scale=980:-2[v_acc]; \
      [3:v]scale=980:-2[v_imp]; \
      [4:v]scale=980:-2[v_sco]; \
      [5:v]scale=980:-2[v_sco_zoom]; \
      [6:v]scale=980:-2[v_exp]; \
      [0:v][v_acc]overlay=(W-w)/2:220:enable='between(t,0,2.5)'[s0]; \
      [s0][logo_med]overlay=(W-w)/2:(H-h)/2-140:enable='between(t,2.5,5.5)'[s1]; \
      [s1][v_imp]overlay=(W-w)/2:220:enable='between(t,5.5,10.5)'[s2]; \
      [s2][v_sco]overlay=(W-w)/2:220:enable='between(t,10.5,12.5)'[s3]; \
      [s3][v_sco_zoom]overlay=(W-w)/2:220:enable='between(t,12.5,16.5)'[s4]; \
      [s4][v_exp]overlay=(W-w)/2:220:enable='between(t,16.5,21.0)'[s5]; \
      [s5][logo_big]overlay=(W-w)/2:380:enable='between(t,21.0,25.0)'[s6]; \
      [s6]drawtext=fontfile='${fontPath}':textfile='scripts/subtitles/v1_s0.txt':fontsize=44:fontcolor=0xF6C94D:box=1:boxcolor=0x080D20@0.92:boxborderw=22:x=(w-text_w)/2:y=1240:enable='between(t,0,2.5)', \
          drawtext=fontfile='${fontPath}':textfile='scripts/subtitles/v1_s1.txt':fontsize=64:fontcolor=0xF6C94D:x=(w-text_w)/2:y=1120:enable='between(t,2.5,5.5)', \
          drawtext=fontfile='${fontPath}':textfile='scripts/subtitles/v1_s1_sub.txt':fontsize=36:fontcolor=white:box=1:boxcolor=0x080D20@0.85:boxborderw=14:x=(w-text_w)/2:y=1220:enable='between(t,2.5,5.5)', \
          drawtext=fontfile='${fontPath}':textfile='scripts/subtitles/v1_s2.txt':fontsize=40:fontcolor=white:box=1:boxcolor=0x080D20@0.92:boxborderw=22:x=(w-text_w)/2:y=1240:enable='between(t,5.5,10.5)', \
          drawtext=fontfile='${fontPath}':textfile='scripts/subtitles/v1_s3.txt':fontsize=42:fontcolor=0xF6C94D:box=1:boxcolor=0x080D20@0.92:boxborderw=22:x=(w-text_w)/2:y=1240:enable='between(t,10.5,16.5)', \
          drawtext=fontfile='${fontPath}':textfile='scripts/subtitles/v1_s4.txt':fontsize=38:fontcolor=white:box=1:boxcolor=0x080D20@0.92:boxborderw=22:x=(w-text_w)/2:y=1240:enable='between(t,16.5,21.0)', \
          drawtext=fontfile='${fontPath}':textfile='scripts/subtitles/v1_s5_tag.txt':fontsize=48:fontcolor=0x37CDA3:box=1:boxcolor=0x080D20@0.85:boxborderw=16:x=(w-text_w)/2:y=1120:enable='between(t,21.0,25.0)', \
          drawtext=fontfile='${fontPath}':textfile='scripts/subtitles/v1_s5_domain.txt':fontsize=76:fontcolor=0xF6C94D:x=(w-text_w)/2:y=1240:enable='between(t,21.0,25.0)', \
          drawtext=fontfile='${fontPath}':textfile='scripts/subtitles/v1_s5_cta.txt':fontsize=38:fontcolor=white:box=1:boxcolor=0x080D20@0.85:boxborderw=16:x=(w-text_w)/2:y=1380:enable='between(t,21.0,25.0)', \
          drawtext=fontfile='${fontPath}':textfile='scripts/subtitles/v1_s5_bio.txt':fontsize=32:fontcolor=0x94A3B8:x=(w-text_w)/2:y=1460:enable='between(t,21.0,25.0)'[outv]; \
      [7:a]aformat=sample_rates=48000:channel_layouts=stereo,volume=1.30[a_voc]; \
      [8:a]atrim=0:25,aformat=sample_rates=48000:channel_layouts=stereo,volume=0.18,afade=t=in:ss=0:d=0.5,afade=t=out:st=23.5:d=1.5[a_mus]; \
      [9:a]adelay=2500|2500,volume=0.6[sfx_w1]; \
      [10:a]adelay=5800|5800,volume=0.6[sfx_c1]; \
      [11:a]adelay=12500|12500,volume=0.75[sfx_ch1]; \
      [10:a]adelay=16800|16800,volume=0.6[sfx_c2]; \
      [9:a]adelay=21000|21000,volume=0.6[sfx_w2]; \
      [a_voc][a_mus][sfx_w1][sfx_c1][sfx_ch1][sfx_c2][sfx_w2]amix=inputs=7:duration=longest:weights=1.0 0.20 0.6 0.6 0.7 0.6 0.6:normalize=0,aformat=sample_rates=48000:channel_layouts=stereo[outa]" \
    -map "[outv]" -map "[outa]" -c:v libx264 -preset faster -crf 22 -c:a aac -b:a 192k -t 25 "${outFile}"`;

  execSync(cmd, { stdio: 'inherit' });
  fs.copyFileSync(outFile, aliasFile);
  console.log(`✅ Vidéo 1 (Accroche 25s) terminée et indexée : ${outFile} & ${aliasFile}`);
}

// =========================================================================
// VIDÉO 2 : DÉMONSTRATION (30s) — Fichier officiel video_2.mp4 & video_2_demonstration.mp4
// =========================================================================
function renderVideo2() {
  const outFile = path.join(outputDir, 'video_2_demonstration.mp4');
  const aliasFile = path.join(outputDir, 'video_2.mp4');
  console.log(`\n⏳ Rendu Vidéo 2 · Démonstration (30s) -> ${outFile}...`);

  const cmd = `ffmpeg -y \
    -f lavfi -i "color=c=0x080D20:s=1080x1920:r=30:d=30" \
    -loop 1 -t 30 -i "public/jnb-align-logo.png" \
    -loop 1 -t 4 -i "public/captures_clean/01_accueil_clean.jpg" \
    -loop 1 -t 5 -i "public/captures_clean/02_import_clean.jpg" \
    -loop 1 -t 5 -i "public/captures_clean/03_offre_clean.jpg" \
    -loop 1 -t 3 -i "public/captures_clean/06_score_clean.jpg" \
    -loop 1 -t 5 -i "public/captures_clean/06_score_zoom.jpg" \
    -loop 1 -t 3 -i "public/captures_clean/07_star_clean.jpg" \
    -loop 1 -t 5 -i "public/captures_clean/07_star_zoom.jpg" \
    -loop 1 -t 5 -i "public/captures_clean/09_export_clean.jpg" \
    -i "public/audio/video_2_demo.mp3" \
    -i "${bgMusic}" \
    -i "${sfxWhoosh}" \
    -i "${sfxClick}" \
    -i "${sfxChime}" \
    -filter_complex "\
      [1:v]scale=360:360[logo_big]; \
      [2:v]scale=980:-2[v_acc]; \
      [3:v]scale=980:-2[v_imp]; \
      [4:v]scale=980:-2[v_off]; \
      [5:v]scale=980:-2[v_sco]; \
      [6:v]scale=980:-2[v_sco_zoom]; \
      [7:v]scale=980:-2[v_star]; \
      [8:v]scale=980:-2[v_star_zoom]; \
      [9:v]scale=980:-2[v_exp]; \
      [0:v][v_acc]overlay=(W-w)/2:220:enable='between(t,0,3.0)'[s0]; \
      [s0][v_imp]overlay=(W-w)/2:220:enable='between(t,3.0,7.0)'[s1]; \
      [s1][v_off]overlay=(W-w)/2:220:enable='between(t,7.0,11.0)'[s2]; \
      [s2][v_sco]overlay=(W-w)/2:220:enable='between(t,11.0,13.0)'[s3]; \
      [s3][v_sco_zoom]overlay=(W-w)/2:220:enable='between(t,13.0,17.0)'[s4]; \
      [s4][v_star]overlay=(W-w)/2:220:enable='between(t,17.0,18.5)'[s5]; \
      [s5][v_star_zoom]overlay=(W-w)/2:220:enable='between(t,18.5,22.0)'[s6]; \
      [s6][v_exp]overlay=(W-w)/2:220:enable='between(t,22.0,26.0)'[s7]; \
      [s7][logo_big]overlay=(W-w)/2:380:enable='between(t,26.0,30.0)'[s8]; \
      [s8]drawtext=fontfile='${fontPath}':textfile='scripts/subtitles/v2_s0.txt':fontsize=40:fontcolor=0xF6C94D:box=1:boxcolor=0x080D20@0.92:boxborderw=22:x=(w-text_w)/2:y=1240:enable='between(t,0,3.0)', \
          drawtext=fontfile='${fontPath}':textfile='scripts/subtitles/v2_s1.txt':fontsize=42:fontcolor=white:box=1:boxcolor=0x080D20@0.92:boxborderw=22:x=(w-text_w)/2:y=1240:enable='between(t,3.0,7.0)', \
          drawtext=fontfile='${fontPath}':textfile='scripts/subtitles/v2_s2.txt':fontsize=42:fontcolor=white:box=1:boxcolor=0x080D20@0.92:boxborderw=22:x=(w-text_w)/2:y=1240:enable='between(t,7.0,11.0)', \
          drawtext=fontfile='${fontPath}':textfile='scripts/subtitles/v2_s3.txt':fontsize=40:fontcolor=0xF6C94D:box=1:boxcolor=0x080D20@0.92:boxborderw=22:x=(w-text_w)/2:y=1240:enable='between(t,11.0,17.0)', \
          drawtext=fontfile='${fontPath}':textfile='scripts/subtitles/v2_s4.txt':fontsize=38:fontcolor=white:box=1:boxcolor=0x080D20@0.92:boxborderw=22:x=(w-text_w)/2:y=1240:enable='between(t,17.0,22.0)', \
          drawtext=fontfile='${fontPath}':textfile='scripts/subtitles/v2_s5.txt':fontsize=36:fontcolor=white:box=1:boxcolor=0x080D20@0.92:boxborderw=22:x=(w-text_w)/2:y=1240:enable='between(t,22.0,26.0)', \
          drawtext=fontfile='${fontPath}':textfile='scripts/subtitles/v2_s6_slogan.txt':fontsize=36:fontcolor=white:box=1:boxcolor=0x080D20@0.85:boxborderw=16:x=(w-text_w)/2:y=1120:enable='between(t,26.0,30.0)', \
          drawtext=fontfile='${fontPath}':textfile='scripts/subtitles/v2_s6_tag.txt':fontsize=48:fontcolor=0x37CDA3:box=1:boxcolor=0x080D20@0.85:boxborderw=16:x=(w-text_w)/2:y=1190:enable='between(t,26.0,30.0)', \
          drawtext=fontfile='${fontPath}':textfile='scripts/subtitles/v2_s6_domain.txt':fontsize=76:fontcolor=0xF6C94D:x=(w-text_w)/2:y=1270:enable='between(t,26.0,30.0)', \
          drawtext=fontfile='${fontPath}':textfile='scripts/subtitles/v2_s6_cta.txt':fontsize=38:fontcolor=white:box=1:boxcolor=0x080D20@0.85:boxborderw=16:x=(w-text_w)/2:y=1400:enable='between(t,26.0,30.0)', \
          drawtext=fontfile='${fontPath}':textfile='scripts/subtitles/v2_s6_bio.txt':fontsize=32:fontcolor=0x94A3B8:x=(w-text_w)/2:y=1480:enable='between(t,26.0,30.0)'[outv]; \
      [10:a]aformat=sample_rates=48000:channel_layouts=stereo,volume=1.30[a_voc]; \
      [11:a]atrim=0:30,aformat=sample_rates=48000:channel_layouts=stereo,volume=0.18,afade=t=in:ss=0:d=0.5,afade=t=out:st=28.5:d=1.5[a_mus]; \
      [13:a]adelay=3200|3200,volume=0.6[sfx_c1]; \
      [13:a]adelay=7200|7200,volume=0.6[sfx_c2]; \
      [14:a]adelay=13000|13000,volume=0.75[sfx_ch1]; \
      [12:a]adelay=17000|17000,volume=0.6[sfx_w1]; \
      [13:a]adelay=22200|22200,volume=0.6[sfx_c3]; \
      [12:a]adelay=26000|26000,volume=0.6[sfx_w2]; \
      [a_voc][a_mus][sfx_c1][sfx_c2][sfx_ch1][sfx_w1][sfx_c3][sfx_w2]amix=inputs=8:duration=longest:weights=1.0 0.20 0.6 0.6 0.7 0.6 0.6 0.6:normalize=0,aformat=sample_rates=48000:channel_layouts=stereo[outa]" \
    -map "[outv]" -map "[outa]" -c:v libx264 -preset faster -crf 22 -c:a aac -b:a 192k -t 30 "${outFile}"`;

  execSync(cmd, { stdio: 'inherit' });
  fs.copyFileSync(outFile, aliasFile);
  console.log(`✅ Vidéo 2 (Démonstration 30s) terminée et indexée : ${outFile} & ${aliasFile}`);
}

// =========================================================================
// VIDÉO 3 : LANCEMENT OFFICIEL (30s) — Fichier officiel video_3.mp4 & video_3_lancement.mp4
// =========================================================================
function renderVideo3() {
  const outFile = path.join(outputDir, 'video_3_lancement.mp4');
  const aliasFile = path.join(outputDir, 'video_3.mp4');
  console.log(`\n⏳ Rendu Vidéo 3 · Lancement Officiel (30s) -> ${outFile}...`);

  const cmd = `ffmpeg -y \
    -f lavfi -i "color=c=0x080D20:s=1080x1920:r=30:d=30" \
    -loop 1 -t 30 -i "public/jnb-align-logo.png" \
    -loop 1 -t 5 -i "public/captures_clean/01_accueil_clean.jpg" \
    -loop 1 -t 3 -i "public/captures_clean/06_score_clean.jpg" \
    -loop 1 -t 5 -i "public/captures_clean/06_score_zoom.jpg" \
    -loop 1 -t 3 -i "public/captures_clean/07_star_clean.jpg" \
    -loop 1 -t 5 -i "public/captures_clean/07_star_zoom.jpg" \
    -loop 1 -t 6 -i "public/captures_clean/08_lettre_clean.jpg" \
    -loop 1 -t 6 -i "public/captures_clean/10_prete_clean.jpg" \
    -i "public/audio/video_3_lancement.mp3" \
    -i "${bgMusic}" \
    -i "${sfxWhoosh}" \
    -i "${sfxClick}" \
    -i "${sfxChime}" \
    -filter_complex "\
      [1:v]split=2[logo3_in1][logo3_in2]; \
      [logo3_in1]scale=360:360[logo_big1]; \
      [logo3_in2]scale=360:360[logo_big2]; \
      [2:v]scale=980:-2[v_acc]; \
      [3:v]scale=980:-2[v_sco]; \
      [4:v]scale=980:-2[v_sco_zoom]; \
      [5:v]scale=980:-2[v_star]; \
      [6:v]scale=980:-2[v_star_zoom]; \
      [7:v]scale=980:-2[v_let]; \
      [8:v]scale=980:-2[v_prete]; \
      [0:v][logo_big1]overlay=(W-w)/2:380:enable='between(t,0,3.0)'[s0]; \
      [s0][v_acc]overlay=(W-w)/2:220:enable='between(t,3.0,7.0)'[s1]; \
      [s1][v_sco]overlay=(W-w)/2:220:enable='between(t,7.0,8.5)'[s2]; \
      [s2][v_sco_zoom]overlay=(W-w)/2:220:enable='between(t,8.5,12.0)'[s3]; \
      [s3][v_star]overlay=(W-w)/2:220:enable='between(t,12.0,13.5)'[s4]; \
      [s4][v_star_zoom]overlay=(W-w)/2:220:enable='between(t,13.5,17.0)'[s5]; \
      [s5][v_let]overlay=(W-w)/2:220:enable='between(t,17.0,22.0)'[s6]; \
      [s6][v_prete]overlay=(W-w)/2:220:enable='between(t,22.0,26.0)'[s7]; \
      [s7][logo_big2]overlay=(W-w)/2:380:enable='between(t,26.0,30.0)'[s8]; \
      [s8]drawtext=fontfile='${fontPath}':textfile='scripts/subtitles/v3_s0_title.txt':fontsize=64:fontcolor=0xF6C94D:x=(w-text_w)/2:y=1120:enable='between(t,0,3.0)', \
          drawtext=fontfile='${fontPath}':textfile='scripts/subtitles/v3_s0_sub.txt':fontsize=48:fontcolor=0x37CDA3:box=1:boxcolor=0x080D20@0.85:boxborderw=16:x=(w-text_w)/2:y=1220:enable='between(t,0,3.0)', \
          drawtext=fontfile='${fontPath}':textfile='scripts/subtitles/v3_s1.txt':fontsize=38:fontcolor=white:box=1:boxcolor=0x080D20@0.92:boxborderw=22:x=(w-text_w)/2:y=1240:enable='between(t,3.0,7.0)', \
          drawtext=fontfile='${fontPath}':textfile='scripts/subtitles/v3_s2.txt':fontsize=40:fontcolor=0xF6C94D:box=1:boxcolor=0x080D20@0.92:boxborderw=22:x=(w-text_w)/2:y=1240:enable='between(t,7.0,12.0)', \
          drawtext=fontfile='${fontPath}':textfile='scripts/subtitles/v3_s3.txt':fontsize=38:fontcolor=white:box=1:boxcolor=0x080D20@0.92:boxborderw=22:x=(w-text_w)/2:y=1240:enable='between(t,12.0,17.0)', \
          drawtext=fontfile='${fontPath}':textfile='scripts/subtitles/v3_s4.txt':fontsize=38:fontcolor=white:box=1:boxcolor=0x080D20@0.92:boxborderw=22:x=(w-text_w)/2:y=1240:enable='between(t,17.0,22.0)', \
          drawtext=fontfile='${fontPath}':textfile='scripts/subtitles/v3_s5_tag.txt':fontsize=48:fontcolor=0x37CDA3:box=1:boxcolor=0x080D20@0.92:boxborderw=18:x=(w-text_w)/2:y=1240:enable='between(t,22.0,26.0)', \
          drawtext=fontfile='${fontPath}':textfile='scripts/subtitles/v3_s5_sub.txt':fontsize=34:fontcolor=white:box=1:boxcolor=0x080D20@0.92:boxborderw=16:x=(w-text_w)/2:y=1330:enable='between(t,22.0,26.0)', \
          drawtext=fontfile='${fontPath}':textfile='scripts/subtitles/v3_s6_slogan.txt':fontsize=34:fontcolor=white:box=1:boxcolor=0x080D20@0.85:boxborderw=16:x=(w-text_w)/2:y=1120:enable='between(t,26.0,30.0)', \
          drawtext=fontfile='${fontPath}':textfile='scripts/subtitles/v3_s6_domain.txt':fontsize=76:fontcolor=0xF6C94D:x=(w-text_w)/2:y=1220:enable='between(t,26.0,30.0)', \
          drawtext=fontfile='${fontPath}':textfile='scripts/subtitles/v3_s6_cta.txt':fontsize=38:fontcolor=white:box=1:boxcolor=0x080D20@0.85:boxborderw=16:x=(w-text_w)/2:y=1360:enable='between(t,26.0,30.0)', \
          drawtext=fontfile='${fontPath}':textfile='scripts/subtitles/v3_s6_bio.txt':fontsize=32:fontcolor=0x94A3B8:x=(w-text_w)/2:y=1440:enable='between(t,26.0,30.0)'[outv]; \
      [9:a]aformat=sample_rates=48000:channel_layouts=stereo,volume=1.30[a_voc]; \
      [10:a]atrim=0:30,aformat=sample_rates=48000:channel_layouts=stereo,volume=0.18,afade=t=in:ss=0:d=0.5,afade=t=out:st=28.5:d=1.5[a_mus]; \
      [13:a]adelay=200|200,volume=0.75[sfx_ch0]; \
      [11:a]adelay=3000|3000,volume=0.6[sfx_w1]; \
      [13:a]adelay=8500|8500,volume=0.75[sfx_ch1]; \
      [11:a]adelay=12000|12000,volume=0.6[sfx_w2]; \
      [12:a]adelay=17200|17200,volume=0.6[sfx_c1]; \
      [12:a]adelay=22200|22200,volume=0.6[sfx_c2]; \
      [11:a]adelay=26000|26000,volume=0.6[sfx_w3]; \
      [a_voc][a_mus][sfx_ch0][sfx_w1][sfx_ch1][sfx_w2][sfx_c1][sfx_c2][sfx_w3]amix=inputs=9:duration=longest:weights=1.0 0.20 0.7 0.6 0.7 0.6 0.6 0.6 0.6:normalize=0,aformat=sample_rates=48000:channel_layouts=stereo[outa]" \
    -map "[outv]" -map "[outa]" -c:v libx264 -preset faster -crf 22 -c:a aac -b:a 192k -t 30 "${outFile}"`;

  execSync(cmd, { stdio: 'inherit' });
  fs.copyFileSync(outFile, aliasFile);
  console.log(`✅ Vidéo 3 (Lancement 30s) terminée et indexée : ${outFile} & ${aliasFile}`);
}

renderVideo1();
renderVideo2();
renderVideo3();
console.log('\n🎉 Rendu terminé avec succès ! Les 3 vidéos disposent des sous-titres rehaussés, sans barre d’URL, avec zooms dynamiques et sound design complet.');
