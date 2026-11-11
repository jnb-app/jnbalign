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

function renderVideo2() {
  const outFile = path.join(outputDir, 'video_2_demonstration.mp4');
  const aliasFile = path.join(outputDir, 'video_2.mp4');
  console.log(`\n⏳ Rendu Vidéo 2 · Démonstration V10 (30s) -> ${outFile}...`);

  // Inputs:
  // 0: color background 30s
  // 1: logo 30s
  // 2: v2_app_intro.mp4 (vidéo de l'appli en ouverture 0-3.2s)
  // 3: 02_import_clean.jpg (dépôt dézoomé 3.2-5.8s)
  // 4: v_step2_mots_cles.jpg (mots-clés repérés 5.8-7.6s)
  // 5: v_step2_adequation_ats.jpg (adéquation ATS 92% 7.6-9.2s)
  // 6: v2_star_plan1_avant.jpg (STAR Plan 1 Avant 9.2-13.2s)
  // 7: v2_star_plan2_apres.jpg (STAR Plan 2 Après 13.2-17.2s)
  // 8: 09_export_clean.jpg (Deux livrables 17.2-20.8s)
  // 9: 10_prete_clean.jpg (Candidature prête 20.8-23.15s)
  // 10: audio voix v7
  // 11: musique teaser
  // 12: whoosh, 13: click, 14: chime

  const cmd = `ffmpeg -y \
    -f lavfi -i "color=c=0x080D20:s=1080x1920:r=30:d=30" \
    -loop 1 -t 30 -i "public/jnb-align-logo.png" \
    -t 3.5 -i "public/clips/v2_app_intro.mp4" \
    -loop 1 -t 3.0 -i "public/captures_clean/02_import_clean.jpg" \
    -loop 1 -t 2.5 -i "public/captures_clean/v_step2_mots_cles.jpg" \
    -loop 1 -t 2.5 -i "public/captures_clean/v_step2_adequation_ats.jpg" \
    -loop 1 -t 4.5 -i "public/captures_clean/v2_star_plan1_avant.jpg" \
    -loop 1 -t 4.5 -i "public/captures_clean/v2_star_plan2_apres.jpg" \
    -loop 1 -t 4.0 -i "public/captures_clean/09_export_clean.jpg" \
    -loop 1 -t 3.5 -i "public/captures_clean/10_prete_clean.jpg" \
    -i "public/audio/video_2_demo_v7.mp3" \
    -i "${bgMusic}" \
    -i "${sfxWhoosh}" \
    -i "${sfxClick}" \
    -i "${sfxChime}" \
    -filter_complex "\
      [1:v]scale=360:360[logo_big]; \
      [2:v]scale=1080:1920:force_original_aspect_ratio=decrease,pad=1080:1920:(ow-iw)/2:(oh-ih)/2:color=0x080D20[v_app_intro]; \
      [3:v]scale=980:1920:force_original_aspect_ratio=decrease,pad=1080:1920:(ow-iw)/2:(oh-ih)/2:color=0x080D20[v_imp_dezoom]; \
      [4:v]scale=1080:1920[v_mots_cles]; \
      [5:v]scale=1080:1920[v_adequation_ats]; \
      [6:v]scale=1080:1920[v_star_p1]; \
      [7:v]scale=1080:1920[v_star_p2]; \
      [8:v]scale=1280:2560,crop=1080:1920:(in_w-1080)/2:120[v_exp]; \
      [9:v]scale=1280:2560,crop=1080:1920:(in_w-1080)/2:120[v_prete]; \
      [0:v][v_app_intro]overlay=0:0:enable='between(t,0,3.2)'[s0]; \
      [s0][v_imp_dezoom]overlay=0:0:enable='between(t,3.2,5.8)'[s1]; \
      [s1][v_mots_cles]overlay=0:0:enable='between(t,5.8,7.6)'[s2a]; \
      [s2a][v_adequation_ats]overlay=0:0:enable='between(t,7.6,9.2)'[s2b]; \
      [s2b][v_star_p1]overlay=0:0:enable='between(t,9.2,13.2)'[s3]; \
      [s3][v_star_p2]overlay=0:0:enable='between(t,13.2,17.2)'[s4]; \
      [s4][v_exp]overlay=0:0:enable='between(t,17.2,20.8)'[s5]; \
      [s5][v_prete]overlay=0:0:enable='between(t,20.8,23.15)'[s6]; \
      [s6][logo_big]overlay=(W-w)/2:360:enable='between(t,23.15,30.0)'[s7]; \
      [s7]drawtext=fontfile='${fontPath}':expansion=none:textfile='scripts/subtitles_v7/v2_badge_s0.txt':fontsize=28:fontcolor=0xF6C94D:box=1:boxcolor=0x050814@0.90:boxborderw=16:x=(w-text_w)/2:y=220:enable='between(t,0,3.2)', \
          drawtext=fontfile='${fontPath}':expansion=none:textfile='scripts/subtitles_v7/v2_s0.txt':fontsize=42:fontcolor=0xF6C94D:box=1:boxcolor=0x050814@0.90:boxborderw=24:line_spacing=12:x=(w-text_w)/2:y=1200:enable='between(t,0,3.2)', \
          drawtext=fontfile='${fontPath}':expansion=none:textfile='scripts/subtitles_v7/v2_badge_s1.txt':fontsize=28:fontcolor=0xF6C94D:box=1:boxcolor=0x050814@0.90:boxborderw=16:x=(w-text_w)/2:y=220:enable='between(t,3.2,5.8)', \
          drawtext=fontfile='${fontPath}':expansion=none:textfile='scripts/subtitles_v7/v2_s1.txt':fontsize=40:fontcolor=white:box=1:boxcolor=0x050814@0.90:boxborderw=24:line_spacing=12:x=(w-text_w)/2:y=1200:enable='between(t,3.2,5.8)', \
          drawtext=fontfile='${fontPath}':expansion=none:textfile='scripts/subtitles_v7/v2_badge_s2a.txt':fontsize=28:fontcolor=0xF6C94D:box=1:boxcolor=0x050814@0.90:boxborderw=16:x=(w-text_w)/2:y=220:enable='between(t,5.8,7.6)', \
          drawtext=fontfile='${fontPath}':expansion=none:textfile='scripts/subtitles_v7/v2_s2a.txt':fontsize=40:fontcolor=0xF6C94D:box=1:boxcolor=0x050814@0.90:boxborderw=24:line_spacing=12:x=(w-text_w)/2:y=1200:enable='between(t,5.8,7.6)', \
          drawtext=fontfile='${fontPath}':expansion=none:textfile='scripts/subtitles_v7/v2_badge_s2b.txt':fontsize=28:fontcolor=0x34D399:box=1:boxcolor=0x050814@0.90:boxborderw=16:x=(w-text_w)/2:y=220:enable='between(t,7.6,9.2)', \
          drawtext=fontfile='${fontPath}':expansion=none:textfile='scripts/subtitles_v7/v2_s2b.txt':fontsize=40:fontcolor=0x34D399:box=1:boxcolor=0x050814@0.90:boxborderw=24:line_spacing=12:x=(w-text_w)/2:y=1200:enable='between(t,7.6,9.2)', \
          drawtext=fontfile='${fontPath}':expansion=none:textfile='scripts/subtitles_v7/v2_badge_s3.txt':fontsize=28:fontcolor=0xF87171:box=1:boxcolor=0x050814@0.90:boxborderw=16:x=(w-text_w)/2:y=220:enable='between(t,9.2,13.2)', \
          drawtext=fontfile='${fontPath}':expansion=none:textfile='scripts/subtitles_v7/v2_s3.txt':fontsize=38:fontcolor=white:box=1:boxcolor=0x050814@0.90:boxborderw=24:line_spacing=12:x=(w-text_w)/2:y=1380:enable='between(t,9.2,13.2)', \
          drawtext=fontfile='${fontPath}':expansion=none:textfile='scripts/subtitles_v7/v2_badge_s4.txt':fontsize=28:fontcolor=0x37CDA3:box=1:boxcolor=0x050814@0.90:boxborderw=16:x=(w-text_w)/2:y=220:enable='between(t,13.2,17.2)', \
          drawtext=fontfile='${fontPath}':expansion=none:textfile='scripts/subtitles_v7/v2_s4.txt':fontsize=36:fontcolor=0xFDE047:box=1:boxcolor=0x050814@0.90:boxborderw=24:line_spacing=12:x=(w-text_w)/2:y=1400:enable='between(t,13.2,17.2)', \
          drawtext=fontfile='${fontPath}':expansion=none:textfile='scripts/subtitles_v7/v2_badge_s5.txt':fontsize=28:fontcolor=0x37CDA3:box=1:boxcolor=0x050814@0.90:boxborderw=16:x=(w-text_w)/2:y=220:enable='between(t,17.2,20.8)', \
          drawtext=fontfile='${fontPath}':expansion=none:textfile='scripts/subtitles_v7/v2_s5.txt':fontsize=40:fontcolor=0x37CDA3:box=1:boxcolor=0x050814@0.90:boxborderw=24:line_spacing=12:x=(w-text_w)/2:y=1200:enable='between(t,17.2,20.8)', \
          drawtext=fontfile='${fontPath}':expansion=none:textfile='scripts/subtitles_v7/v2_badge_s6.txt':fontsize=28:fontcolor=0xF6C94D:box=1:boxcolor=0x050814@0.90:boxborderw=16:x=(w-text_w)/2:y=220:enable='between(t,20.8,23.15)', \
          drawtext=fontfile='${fontPath}':expansion=none:textfile='scripts/subtitles_v7/v2_s6.txt':fontsize=38:fontcolor=white:box=1:boxcolor=0x050814@0.90:boxborderw=24:line_spacing=12:x=(w-text_w)/2:y=1200:enable='between(t,20.8,23.15)', \
          drawtext=fontfile='${fontPath}':expansion=none:textfile='scripts/subtitles_v7/v2_end_tag.txt':fontsize=40:fontcolor=0x37CDA3:box=1:boxcolor=0x050814@0.85:boxborderw=16:x=(w-text_w)/2:y=1120:enable='between(t,23.15,30.0)', \
          drawtext=fontfile='${fontPath}':expansion=none:textfile='scripts/subtitles_v7/v2_end_voice_cta.txt':fontsize=40:fontcolor=white:box=1:boxcolor=0x050814@0.90:boxborderw=20:line_spacing=12:x=(w-text_w)/2:y=1200:enable='between(t,23.15,25.5)', \
          drawtext=fontfile='${fontPath}':expansion=none:textfile='scripts/subtitles_v7/v2_end_slogan.txt':fontsize=36:fontcolor=white:box=1:boxcolor=0x050814@0.90:boxborderw=20:line_spacing=10:x=(w-text_w)/2:y=1200:enable='between(t,25.5,30.0)', \
          drawtext=fontfile='${fontPath}':expansion=none:textfile='scripts/subtitles_v7/v2_end_domain.txt':fontsize=76:fontcolor=0xF6C94D:x=(w-text_w)/2:y=1300:enable='between(t,23.15,30.0)', \
          drawtext=fontfile='${fontPath}':expansion=none:textfile='scripts/subtitles_v7/v2_end_cta.txt':fontsize=40:fontcolor=white:box=1:boxcolor=0x050814@0.85:boxborderw=16:x=(w-text_w)/2:y=1430:enable='between(t,23.15,30.0)', \
          drawtext=fontfile='${fontPath}':expansion=none:textfile='scripts/subtitles_v7/v2_end_bio.txt':fontsize=32:fontcolor=0x94A3B8:x=(w-text_w)/2:y=1510:enable='between(t,23.15,30.0)'[outv]; \
      [10:a]aformat=sample_rates=48000:channel_layouts=stereo,volume=1.20[a_voc]; \
      [11:a]atrim=0:30,aformat=sample_rates=48000:channel_layouts=stereo,volume=0.15,afade=t=in:ss=0:d=0.5,afade=t=out:st=28.5:d=1.5[a_mus]; \
      [12:a]adelay=100|100,volume=0.6[sfx_w1]; \
      [13:a]adelay=3200|3200,volume=0.6[sfx_c1]; \
      [13:a]adelay=5800|5800,volume=0.6[sfx_c2]; \
      [14:a]adelay=7600|7600,volume=0.7[sfx_ch1]; \
      [12:a]adelay=9200|9200,volume=0.6[sfx_w2]; \
      [14:a]adelay=13200|13200,volume=0.7[sfx_ch2]; \
      [14:a]adelay=17200|17200,volume=0.7[sfx_ch3]; \
      [13:a]adelay=20800|20800,volume=0.6[sfx_c3]; \
      [12:a]adelay=23150|23150,volume=0.7[sfx_w3]; \
      [14:a]adelay=23150|23150,volume=0.7[sfx_ch4]; \
      [a_voc][a_mus][sfx_w1][sfx_c1][sfx_c2][sfx_ch1][sfx_w2][sfx_ch2][sfx_ch3][sfx_c3][sfx_w3][sfx_ch4]amix=inputs=12:duration=longest:weights=1.0 0.15 0.6 0.6 0.6 0.7 0.6 0.7 0.7 0.6 0.7 0.7:normalize=0,alimiter=limit=-1.5dB,aformat=sample_rates=48000:channel_layouts=stereo[outa]" \
    -map "[outv]" -map "[outa]" -c:v libx264 -preset faster -crf 21 -c:a aac -b:a 192k -t 30 "${outFile}"`;

  execSync(cmd, { stdio: 'inherit' });
  fs.copyFileSync(outFile, aliasFile);
  console.log(`✅ Vidéo 2 (Démonstration 30s) V10 terminée et indexée !`);
}

renderVideo2();
