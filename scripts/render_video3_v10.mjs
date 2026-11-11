import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

const fontPath = '/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf';
const outputDir = path.resolve(process.cwd(), 'public', 'videos');
fs.mkdirSync(outputDir, { recursive: true });

const bgMusic = 'public/audio/teaser_beat_122bpm.mp3';
const sfxWhoosh = 'public/audio/sfx/sfx_whoosh.wav';
const sfxClick = 'public/audio/sfx/sfx_click.wav';
const sfxChime = 'public/audio/sfx/sfx_chime.wav';

function renderVideo3() {
  const outFile = path.join(outputDir, 'video_3_lancement.mp4');
  const aliasFile = path.join(outputDir, 'video_3.mp4');
  console.log(`\n⏳ Rendu Vidéo 3 · Lancement Officiel V10 (30s) -> ${outFile}...`);

  // Inputs:
  // 0: color background 30s
  // 1: logo 30s
  // 2: v3_app_copilote.mp4 (vidéo d'utilisation de l'appli 3.2-7.2s)
  // 3: 02_import_clean.jpg (entrée CV & offre 7.2-12.0s)
  // 4: v3_schema_entree_sortie_geante.jpg (schéma géant entrée/sortie 12.0-17.2s)
  // 5: 09_export_clean.jpg (deux livrables concrets 17.2-20.5s)
  // 6: audio voix v7 (video_3_lancement_v7.mp3)
  // 7: musique teaser
  // 8: whoosh, 9: click, 10: chime

  const cmd = `ffmpeg -y \
    -f lavfi -i "color=c=0x080D20:s=1080x1920:r=30:d=30" \
    -loop 1 -t 30 -i "public/jnb-align-logo.png" \
    -t 4.5 -i "public/clips/v3_app_copilote.mp4" \
    -loop 1 -t 5.0 -i "public/captures_clean/02_import_clean.jpg" \
    -loop 1 -t 6.0 -i "public/captures_clean/v3_schema_entree_sortie_geante.jpg" \
    -loop 1 -t 4.0 -i "public/captures_clean/09_export_clean.jpg" \
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
      [0:v][logo_intro]overlay=(W-w)/2:360:enable='between(t,0,3.2)'[s0]; \
      [s0][v_app_copilote]overlay=0:0:enable='between(t,3.2,7.2)'[s1]; \
      [s1][v_imp]overlay=0:0:enable='between(t,7.2,12.0)'[s2]; \
      [s2][v_schema_g]overlay=0:0:enable='between(t,12.0,17.2)'[s3]; \
      [s3][v_exp]overlay=0:0:enable='between(t,17.2,20.5)'[s4]; \
      [s4][logo_big]overlay=(W-w)/2:360:enable='between(t,20.5,30.0)'[s5]; \
      [s5]drawtext=fontfile='${fontPath}':expansion=none:textfile='scripts/subtitles_v7/v3_badge_s0.txt':fontsize=28:fontcolor=0xF6C94D:box=1:boxcolor=0x050814@0.90:boxborderw=16:x=(w-text_w)/2:y=220:enable='between(t,0,3.2)', \
          drawtext=fontfile='${fontPath}':expansion=none:textfile='scripts/subtitles_v7/v3_s0.txt':fontsize=44:fontcolor=0xF6C94D:box=1:boxcolor=0x050814@0.90:boxborderw=24:line_spacing=12:x=(w-text_w)/2:y=1200:enable='between(t,0,3.2)', \
          drawtext=fontfile='${fontPath}':expansion=none:textfile='scripts/subtitles_v7/v3_badge_s1.txt':fontsize=28:fontcolor=0xF6C94D:box=1:boxcolor=0x050814@0.90:boxborderw=16:x=(w-text_w)/2:y=220:enable='between(t,3.2,7.2)', \
          drawtext=fontfile='${fontPath}':expansion=none:textfile='scripts/subtitles_v7/v3_s1.txt':fontsize=38:fontcolor=white:box=1:boxcolor=0x050814@0.90:boxborderw=24:line_spacing=12:x=(w-text_w)/2:y=1200:enable='between(t,3.2,7.2)', \
          drawtext=fontfile='${fontPath}':expansion=none:textfile='scripts/subtitles_v7/v3_badge_s2.txt':fontsize=28:fontcolor=0xF6C94D:box=1:boxcolor=0x050814@0.90:boxborderw=16:x=(w-text_w)/2:y=220:enable='between(t,7.2,12.0)', \
          drawtext=fontfile='${fontPath}':expansion=none:textfile='scripts/subtitles_v7/v3_s2.txt':fontsize=38:fontcolor=0xF6C94D:box=1:boxcolor=0x050814@0.90:boxborderw=24:line_spacing=12:x=(w-text_w)/2:y=1200:enable='between(t,7.2,12.0)', \
          drawtext=fontfile='${fontPath}':expansion=none:textfile='scripts/subtitles_v7/v3_badge_s3.txt':fontsize=28:fontcolor=0x37CDA3:box=1:boxcolor=0x050814@0.90:boxborderw=16:x=(w-text_w)/2:y=220:enable='between(t,12.0,17.2)', \
          drawtext=fontfile='${fontPath}':expansion=none:textfile='scripts/subtitles_v7/v3_s3.txt':fontsize=38:fontcolor=white:box=1:boxcolor=0x050814@0.90:boxborderw=24:line_spacing=12:x=(w-text_w)/2:y=1640:enable='between(t,12.0,17.2)', \
          drawtext=fontfile='${fontPath}':expansion=none:textfile='scripts/subtitles_v7/v3_badge_s4.txt':fontsize=28:fontcolor=0x37CDA3:box=1:boxcolor=0x050814@0.90:boxborderw=16:x=(w-text_w)/2:y=220:enable='between(t,17.2,20.5)', \
          drawtext=fontfile='${fontPath}':expansion=none:textfile='scripts/subtitles_v7/v3_s4.txt':fontsize=40:fontcolor=0x37CDA3:box=1:boxcolor=0x050814@0.90:boxborderw=24:line_spacing=12:x=(w-text_w)/2:y=1200:enable='between(t,17.2,20.5)', \
          drawtext=fontfile='${fontPath}':expansion=none:textfile='scripts/subtitles_v7/v3_end_tag.txt':fontsize=40:fontcolor=0x37CDA3:box=1:boxcolor=0x050814@0.85:boxborderw=16:x=(w-text_w)/2:y=1120:enable='between(t,20.5,30.0)', \
          drawtext=fontfile='${fontPath}':expansion=none:textfile='scripts/subtitles_v7/v3_s5.txt':fontsize=40:fontcolor=white:box=1:boxcolor=0x050814@0.90:boxborderw=20:line_spacing=12:x=(w-text_w)/2:y=1200:enable='between(t,20.5,25.0)', \
          drawtext=fontfile='${fontPath}':expansion=none:textfile='scripts/subtitles_v7/v3_end_slogan.txt':fontsize=36:fontcolor=white:box=1:boxcolor=0x050814@0.85:boxborderw=14:line_spacing=10:x=(w-text_w)/2:y=1200:enable='between(t,25.0,30.0)', \
          drawtext=fontfile='${fontPath}':expansion=none:textfile='scripts/subtitles_v7/v3_end_domain.txt':fontsize=76:fontcolor=0xF6C94D:x=(w-text_w)/2:y=1300:enable='between(t,20.5,30.0)', \
          drawtext=fontfile='${fontPath}':expansion=none:textfile='scripts/subtitles_v7/v3_end_cta.txt':fontsize=40:fontcolor=white:box=1:boxcolor=0x050814@0.85:boxborderw=16:x=(w-text_w)/2:y=1430:enable='between(t,20.5,30.0)', \
          drawtext=fontfile='${fontPath}':expansion=none:textfile='scripts/subtitles_v7/v3_end_bio.txt':fontsize=32:fontcolor=0x94A3B8:x=(w-text_w)/2:y=1510:enable='between(t,20.5,30.0)'[outv]; \
      [6:a]aformat=sample_rates=48000:channel_layouts=stereo,volume=1.20[a_voc]; \
      [7:a]atrim=0:30,aformat=sample_rates=48000:channel_layouts=stereo,volume=0.15,afade=t=in:ss=0:d=0.5,afade=t=out:st=28.5:d=1.5[a_mus]; \
      [10:a]adelay=100|100,volume=0.7[sfx_ch0]; \
      [8:a]adelay=3200|3200,volume=0.6[sfx_w1]; \
      [9:a]adelay=7200|7200,volume=0.6[sfx_c1]; \
      [10:a]adelay=12000|12000,volume=0.7[sfx_ch1]; \
      [9:a]adelay=17200|17200,volume=0.6[sfx_c2]; \
      [8:a]adelay=20500|20500,volume=0.7[sfx_w2]; \
      [10:a]adelay=20500|20500,volume=0.7[sfx_ch2]; \
      [a_voc][a_mus][sfx_ch0][sfx_w1][sfx_c1][sfx_ch1][sfx_c2][sfx_w2][sfx_ch2]amix=inputs=9:duration=longest:weights=1.0 0.15 0.7 0.6 0.6 0.7 0.6 0.7 0.7:normalize=0,alimiter=limit=-1.5dB,aformat=sample_rates=48000:channel_layouts=stereo[outa]" \
    -map "[outv]" -map "[outa]" -c:v libx264 -preset faster -crf 21 -c:a aac -b:a 192k -t 30 "${outFile}"`;

  execSync(cmd, { stdio: 'inherit' });
  fs.copyFileSync(outFile, aliasFile);
  console.log(`✅ Vidéo 3 (Lancement Officiel 30s) V10 terminée et indexée !`);
}

renderVideo3();
