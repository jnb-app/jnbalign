import { execSync } from 'child_process';
import path from 'path';

const src = 'public/audio/video_3_lancement.mp3';
const dst = 'public/audio/video_3_lancement_synced.mp3';

console.log('⏳ Recalage de la piste vocale Studio pour Vidéo 3 (30s)...');

const filter = `
[0:a]atrim=0:3.5,asetpts=PTS-STARTPTS[p1];
[0:a]atrim=3.6:7.6,asetpts=PTS-STARTPTS[p2];
[0:a]atrim=7.8:10.3,asetpts=PTS-STARTPTS[p3];
[0:a]atrim=10.4:14.2,asetpts=PTS-STARTPTS[p4];
[0:a]atrim=14.4:17.3,asetpts=PTS-STARTPTS[p5];
[0:a]atrim=17.3:19.0,asetpts=PTS-STARTPTS[p6];
[0:a]atrim=19.1:22.5,asetpts=PTS-STARTPTS[p7];
[p1]adelay=200|200[d1];
[p2]adelay=3500|3500[d2];
[p3]adelay=7500|7500[d3];
[p4]adelay=12200|12200[d4];
[p5]adelay=17200|17200[d5];
[p6]adelay=22200|22200[d6];
[p7]adelay=26200|26200[d7];
[d1][d2][d3][d4][d5][d6][d7]amix=inputs=7:duration=longest:normalize=0,aformat=sample_rates=48000:channel_layouts=stereo[outa]
`.replace(/\n/g, ' ');

execSync(`ffmpeg -y -i "${src}" -filter_complex "${filter}" -map "[outa]" -t 30 -c:a libmp3lame -b:a 192k "${dst}"`, { stdio: 'inherit' });
execSync(`mv "${dst}" "${src}"`);
console.log('✅ Voix Vidéo 3 recalée avec perfection sur 30s !');
