import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

const outputDir = path.resolve('public/videos');
if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });

const fontPath = '/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf';

const outFile = path.join(outputDir, 'video_com_multireseaux.mp4');
console.log(`\n⏳ Rendu de la Grande Vidéo de Com Multi-Réseaux (30s) -> ${outFile}...`);

// Assets :
// Visuals:
// 0: color=0x080D20 (30s 1080x1920)
// 1: public/assets_com/tableau1_candidat_rejete.jpg (Tableau 1 : 0 - 3.5s)
// 2: public/assets_com/tableau2_recruteuse.jpg (Tableau 2 : 3.5 - 7.3s)
// 3: public/assets_com/jnb_align_avatar.png (Avatar / Logo tech de JNB Align : 7.3 - 9.6s)
// 4: public/captures_clean/v_step2_adequation_ats.jpg (Pilier 1 ATS : 9.6 - 12.8s)
// 5: public/captures_clean/v2_star_plan2_apres.jpg (Pilier 2 STAR : 12.8 - 16.1s)
// 6: public/captures_clean/08_lettre_clean.jpg (Pilier 3 Lettre Stratégique : 16.1 - 19.6s)
// 7: public/captures_clean/09_export_clean.jpg (Pilier 4 Téléchargement Gratuit : 19.6 - 22.5s)
// 8: public/assets_com/tableau2_recruteuse.jpg (Choc conscience : 22.5 - 25.5s)
// 9: public/jnb-align-logo.png (Outro CTA dorée : 25.5 - 30.0s)

// Audios:
// 10: public/audio/defaitiste_mood.mp3 (Musique triste / sombre Tableau 1 : 0 - 4.0s)
// 11: public/audio/tableau1_notif.mp3 (Notif rejet Tableau 1 : 0.5 - 3.5s)
// 12: public/audio/teaser_beat_122bpm.mp3 (Musique rythmée dynamique JNB Align : 3.5 - 30.0s)
// 13: public/audio/com_segments/seg1_raison.mp3 (3.816s -> 3.500)
// 14: public/audio/com_segments/seg2_mais.mp3 (2.328s -> 7.300)
// 15: public/audio/com_segments/seg3_optimisez.mp3 (3.264s -> 9.600)
// 16: public/audio/com_segments/seg4_valorisez.mp3 (3.384s -> 12.800)
// 17: public/audio/com_segments/seg5_creez.mp3 (3.576s -> 16.100)
// 18: public/audio/com_segments/seg6_telechargez.mp3 (2.664s -> 19.600)
// 19: public/audio/com_segments/seg7_ne_laisse_plus.mp3 (3.024s -> 22.500)
// 20: public/audio/com_segments/seg8_cta.mp3 (3.864s -> 25.500)

// SFX:
// 21: sfx_whoosh (public/audio/sfx/sfx_whoosh.wav)
// 22: sfx_click (public/audio/sfx/sfx_click.wav)
// 23: sfx_chime (public/audio/sfx/sfx_chime.wav)

const cmd = `ffmpeg -y \
  -f lavfi -i "color=c=0x080D20:s=1080x1920:r=30:d=30" \
  -loop 1 -t 4.0 -i "public/assets_com/tableau1_candidat_rejete.jpg" \
  -loop 1 -t 4.5 -i "public/assets_com/tableau2_recruteuse.jpg" \
  -loop 1 -t 3.0 -i "public/assets_com/jnb_align_avatar.png" \
  -loop 1 -t 4.0 -i "public/captures_clean/v_step2_adequation_ats.jpg" \
  -loop 1 -t 4.0 -i "public/captures_clean/v2_star_plan2_apres.jpg" \
  -loop 1 -t 4.0 -i "public/captures_clean/08_lettre_clean.jpg" \
  -loop 1 -t 4.0 -i "public/captures_clean/09_export_clean.jpg" \
  -loop 1 -t 4.0 -i "public/assets_com/tableau2_recruteuse.jpg" \
  -loop 1 -t 5.5 -i "public/jnb-align-logo.png" \
  -i "public/audio/defaitiste_mood.mp3" \
  -i "public/audio/tableau1_notif.mp3" \
  -i "public/audio/teaser_beat_122bpm.mp3" \
  -i "public/audio/com_segments/seg1_raison.mp3" \
  -i "public/audio/com_segments/seg2_mais.mp3" \
  -i "public/audio/com_segments/seg3_optimisez.mp3" \
  -i "public/audio/com_segments/seg4_valorisez.mp3" \
  -i "public/audio/com_segments/seg5_creez.mp3" \
  -i "public/audio/com_segments/seg6_telechargez.mp3" \
  -i "public/audio/com_segments/seg7_ne_laisse_plus.mp3" \
  -i "public/audio/com_segments/seg8_cta.mp3" \
  -i "public/audio/sfx/sfx_whoosh.wav" \
  -i "public/audio/sfx/sfx_click.wav" \
  -i "public/audio/sfx/sfx_chime.wav" \
  -filter_complex "\
    [1:v]scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920[v_tab1]; \
    [2:v]scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920[v_tab2]; \
    [3:v]scale=720:720[v_avatar]; \
    [4:v]scale=1080:1920[v_p1_ats]; \
    [5:v]scale=1080:1920[v_p2_star]; \
    [6:v]scale=960:1920:force_original_aspect_ratio=decrease,pad=1080:1920:(ow-iw)/2:(oh-ih)/2:color=0x080D20[v_p3_lettre]; \
    [7:v]scale=960:1920:force_original_aspect_ratio=decrease,pad=1080:1920:(ow-iw)/2:(oh-ih)/2:color=0x080D20[v_p4_export]; \
    [8:v]scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920[v_tab2_zoom]; \
    [9:v]scale=380:380[logo_big]; \
    [0:v][v_tab1]overlay=0:0:enable='between(t,0,3.5)'[s0]; \
    [s0][v_tab2]overlay=0:0:enable='between(t,3.5,7.3)'[s1]; \
    [s1][v_avatar]overlay=(W-w)/2:320:enable='between(t,7.3,9.6)'[s2]; \
    [s2][v_p1_ats]overlay=0:0:enable='between(t,9.6,12.8)'[s3]; \
    [s3][v_p2_star]overlay=0:0:enable='between(t,12.8,16.1)'[s4]; \
    [s4][v_p3_lettre]overlay=0:0:enable='between(t,16.1,19.6)'[s5]; \
    [s5][v_p4_export]overlay=0:0:enable='between(t,19.6,22.5)'[s6]; \
    [s6][v_tab2_zoom]overlay=0:0:enable='between(t,22.5,25.5)'[s7]; \
    [s7][logo_big]overlay=(W-w)/2:360:enable='between(t,25.5,30.0)'[s8]; \
    [s8]drawtext=fontfile='${fontPath}':expansion=none:textfile='scripts/subtitles_com/t1_badge.txt':fontsize=28:fontcolor=0xF87171:box=1:boxcolor=0x050814@0.90:boxborderw=16:x=(w-text_w)/2:y=200:enable='between(t,0,3.5)', \
        drawtext=fontfile='${fontPath}':expansion=none:textfile='scripts/subtitles_com/t1_sub.txt':fontsize=38:fontcolor=white:box=1:boxcolor=0x050814@0.90:boxborderw=24:line_spacing=12:x=(w-text_w)/2:y=1220:enable='between(t,0,3.5)', \
        drawtext=fontfile='${fontPath}':expansion=none:textfile='scripts/subtitles_com/t2_recruteuse_badge.txt':fontsize=28:fontcolor=0xF6C94D:box=1:boxcolor=0x050814@0.90:boxborderw=16:x=(w-text_w)/2:y=200:enable='between(t,3.5,7.3)', \
        drawtext=fontfile='${fontPath}':expansion=none:textfile='scripts/subtitles_com/t2_recruteuse_sub.txt':fontsize=40:fontcolor=white:box=1:boxcolor=0x050814@0.90:boxborderw=24:line_spacing=12:x=(w-text_w)/2:y=1220:enable='between(t,3.5,7.3)', \
        drawtext=fontfile='${fontPath}':expansion=none:textfile='scripts/subtitles_com/t2_jnb_badge.txt':fontsize=28:fontcolor=0x37CDA3:box=1:boxcolor=0x050814@0.90:boxborderw=16:x=(w-text_w)/2:y=200:enable='between(t,7.3,9.6)', \
        drawtext=fontfile='${fontPath}':expansion=none:textfile='scripts/subtitles_com/t2_jnb_sub.txt':fontsize=48:fontcolor=0xF6C94D:box=1:boxcolor=0x050814@0.90:boxborderw=24:x=(w-text_w)/2:y=1220:enable='between(t,7.3,9.6)', \
        drawtext=fontfile='${fontPath}':expansion=none:textfile='scripts/subtitles_com/p1_badge.txt':fontsize=28:fontcolor=0x34D399:box=1:boxcolor=0x050814@0.90:boxborderw=16:x=(w-text_w)/2:y=200:enable='between(t,9.6,12.8)', \
        drawtext=fontfile='${fontPath}':expansion=none:textfile='scripts/subtitles_com/p1_sub.txt':fontsize=40:fontcolor=0x34D399:box=1:boxcolor=0x050814@0.90:boxborderw=24:line_spacing=12:x=(w-text_w)/2:y=1220:enable='between(t,9.6,12.8)', \
        drawtext=fontfile='${fontPath}':expansion=none:textfile='scripts/subtitles_com/p2_badge.txt':fontsize=28:fontcolor=0xF6C94D:box=1:boxcolor=0x050814@0.90:boxborderw=16:x=(w-text_w)/2:y=200:enable='between(t,12.8,16.1)', \
        drawtext=fontfile='${fontPath}':expansion=none:textfile='scripts/subtitles_com/p2_sub.txt':fontsize=38:fontcolor=0xFDE047:box=1:boxcolor=0x050814@0.90:boxborderw=24:line_spacing=12:x=(w-text_w)/2:y=1380:enable='between(t,12.8,16.1)', \
        drawtext=fontfile='${fontPath}':expansion=none:textfile='scripts/subtitles_com/p3_badge.txt':fontsize=28:fontcolor=0x37CDA3:box=1:boxcolor=0x050814@0.90:boxborderw=16:x=(w-text_w)/2:y=200:enable='between(t,16.1,19.6)', \
        drawtext=fontfile='${fontPath}':expansion=none:textfile='scripts/subtitles_com/p3_sub.txt':fontsize=38:fontcolor=white:box=1:boxcolor=0x050814@0.90:boxborderw=24:line_spacing=12:x=(w-text_w)/2:y=1220:enable='between(t,16.1,19.6)', \
        drawtext=fontfile='${fontPath}':expansion=none:textfile='scripts/subtitles_com/p4_badge.txt':fontsize=28:fontcolor=0x37CDA3:box=1:boxcolor=0x050814@0.90:boxborderw=16:x=(w-text_w)/2:y=200:enable='between(t,19.6,22.5)', \
        drawtext=fontfile='${fontPath}':expansion=none:textfile='scripts/subtitles_com/p4_sub.txt':fontsize=40:fontcolor=0x37CDA3:box=1:boxcolor=0x050814@0.90:boxborderw=24:line_spacing=12:x=(w-text_w)/2:y=740:enable='between(t,19.6,22.5)', \
        drawtext=fontfile='${fontPath}':expansion=none:textfile='scripts/subtitles_com/t3_conscience_badge.txt':fontsize=28:fontcolor=0xF87171:box=1:boxcolor=0x050814@0.90:boxborderw=16:x=(w-text_w)/2:y=200:enable='between(t,22.5,25.5)', \
        drawtext=fontfile='${fontPath}':expansion=none:textfile='scripts/subtitles_com/t3_conscience_sub.txt':fontsize=42:fontcolor=white:box=1:boxcolor=0x050814@0.90:boxborderw=24:line_spacing=12:x=(w-text_w)/2:y=1220:enable='between(t,22.5,25.5)', \
        drawtext=fontfile='${fontPath}':expansion=none:textfile='scripts/subtitles_com/end_tag.txt':fontsize=38:fontcolor=0x37CDA3:box=1:boxcolor=0x050814@0.85:boxborderw=16:x=(w-text_w)/2:y=1120:enable='between(t,25.5,30.0)', \
        drawtext=fontfile='${fontPath}':expansion=none:textfile='scripts/subtitles_com/end_cta_voice.txt':fontsize=40:fontcolor=white:box=1:boxcolor=0x050814@0.90:boxborderw=20:line_spacing=12:x=(w-text_w)/2:y=1200:enable='between(t,25.5,28.5)', \
        drawtext=fontfile='${fontPath}':expansion=none:textfile='scripts/subtitles_com/end_domain.txt':fontsize=76:fontcolor=0xF6C94D:x=(w-text_w)/2:y=1310:enable='between(t,25.5,30.0)', \
        drawtext=fontfile='${fontPath}':expansion=none:textfile='scripts/subtitles_com/end_sub_cta.txt':fontsize=38:fontcolor=white:box=1:boxcolor=0x050814@0.85:boxborderw=16:x=(w-text_w)/2:y=1430:enable='between(t,25.5,30.0)', \
        drawtext=fontfile='${fontPath}':expansion=none:textfile='scripts/subtitles_com/end_bio.txt':fontsize=32:fontcolor=0x94A3B8:x=(w-text_w)/2:y=1510:enable='between(t,25.5,30.0)'[outv]; \
    [10:a]atrim=0:4.0,aformat=sample_rates=48000:channel_layouts=stereo,volume=0.90,afade=t=out:st=3.2:d=0.8[a_sad]; \
    [11:a]adelay=600|600,aformat=sample_rates=48000:channel_layouts=stereo,volume=0.95[a_notif]; \
    [12:a]atrim=0:26.5,asetpts=PTS-STARTPTS,aformat=sample_rates=48000:channel_layouts=stereo,volume=0.15,afade=t=in:ss=0:d=1.0,afade=t=out:st=24.5:d=2.0[a_beat_raw]; \
    [a_beat_raw]adelay=3500|3500[a_beat]; \
    [13:a]adelay=3500|3500,aformat=sample_rates=48000:channel_layouts=stereo,volume=1.25[v_s1]; \
    [14:a]adelay=7300|7300,aformat=sample_rates=48000:channel_layouts=stereo,volume=1.25[v_s2]; \
    [15:a]adelay=9600|9600,aformat=sample_rates=48000:channel_layouts=stereo,volume=1.25[v_s3]; \
    [16:a]adelay=12800|12800,aformat=sample_rates=48000:channel_layouts=stereo,volume=1.25[v_s4]; \
    [17:a]adelay=16100|16100,aformat=sample_rates=48000:channel_layouts=stereo,volume=1.25[v_s5]; \
    [18:a]adelay=19600|19600,aformat=sample_rates=48000:channel_layouts=stereo,volume=1.25[v_s6]; \
    [19:a]adelay=22500|22500,aformat=sample_rates=48000:channel_layouts=stereo,volume=1.25[v_s7]; \
    [20:a]adelay=25500|25500,aformat=sample_rates=48000:channel_layouts=stereo,volume=1.25[v_s8]; \
    [21:a]adelay=3500|3500,volume=0.6[sfx_w1]; \
    [22:a]adelay=7300|7300,volume=0.6[sfx_c1]; \
    [23:a]adelay=9600|9600,volume=0.7[sfx_ch1]; \
    [23:a]adelay=12800|12800,volume=0.7[sfx_ch2]; \
    [23:a]adelay=16100|16100,volume=0.7[sfx_ch3]; \
    [23:a]adelay=19600|19600,volume=0.7[sfx_ch4]; \
    [21:a]adelay=22500|22500,volume=0.7[sfx_w2]; \
    [23:a]adelay=25500|25500,volume=0.8[sfx_ch5]; \
    [a_sad][a_notif][a_beat][v_s1][v_s2][v_s3][v_s4][v_s5][v_s6][v_s7][v_s8][sfx_w1][sfx_c1][sfx_ch1][sfx_ch2][sfx_ch3][sfx_ch4][sfx_w2][sfx_ch5]amix=inputs=19:duration=longest:weights=0.9 0.95 0.15 1.0 1.0 1.0 1.0 1.0 1.0 1.0 1.0 0.6 0.6 0.7 0.7 0.7 0.7 0.7 0.8:normalize=0,alimiter=limit=-1.5dB,aformat=sample_rates=48000:channel_layouts=stereo[outa]" \
  -map "[outv]" -map "[outa]" -c:v libx264 -preset faster -crf 20 -c:a aac -b:a 192k -t 30 "${outFile}"`;

console.log('⚡ Lancement de l\'encodage vidéo...');
execSync(cmd, { stdio: 'inherit' });
console.log(`\n🎉 Grande Vidéo de Com générée avec succès : ${outFile}`);
