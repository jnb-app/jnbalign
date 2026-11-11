import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

const outputDir = path.resolve('public/audio');

async function main() {
  console.log('🎙️ Génération de la notification de rejet pour le Tableau 1...');
  
  const res = await fetch('http://localhost:3000/api/tts', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      text: "Candidature rejetée par les algorithmes A T S.",
      gender: 'male',
      language: 'fr',
      style: 'espresso',
    }),
  });

  const data = await res.json();
  if (!data.success || !data.audioBase64) {
    throw new Error('Erreur TTS notification rejet');
  }

  const rawWav = path.join(outputDir, 'tableau1_notif_raw.wav');
  const finalMp3 = path.join(outputDir, 'tableau1_notif.mp3');
  fs.writeFileSync(rawWav, Buffer.from(data.audioBase64, 'base64'));

  // Effet de voix informatique / distante déçue avec réverb et filtrage radio
  execSync(
    `ffmpeg -y -i "${rawWav}" -af "highpass=f=200,lowpass=f=4000,volume=1.05" -c:a libmp3lame -b:a 192k "${finalMp3}" 2>/dev/null`
  );
  fs.unlinkSync(rawWav);

  const dur = execSync(`ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${finalMp3}"`).toString().trim();
  console.log(`✅ Notification rejet Tableau 1 prête ! Durée : ${dur}s`);
}

main().catch(console.error);
