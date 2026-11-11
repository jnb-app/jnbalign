import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

const outputDir = path.resolve('public/audio');

// Le script exact du PDF :
// Tableau 2 : "Ton CV est peut-être la raison pour laquelle tu ne décroches pas d'entretien. Mais avec JNB Align :"
// - "Optimisez votre CV pour les ATS."
// - "Valorisez vos compétences et vos expériences."
// - "Créez une lettre de motivation stratégique."
// - "Téléchargez vos documents gratuitement."
// "Ne laisse plus ton CV décider de ton avenir. Teste JNB Align gratuitement dès maintenant."

const scriptText = `Ton CV est peut-être la raison pour laquelle tu ne décroches pas d'entretien. Mais avec JNB Align : Optimisez votre CV pour les A T S. Valorisez vos compétences et vos expériences. Créez une lettre de motivation stratégique. Téléchargez vos documents gratuitement. Ne laisse plus ton CV décider de ton avenir. Teste JNB Align gratuitement dès maintenant.`;

async function main() {
  console.log('🎙️ Génération de la voix off recruteuse (Kore) via /api/tts...');
  
  const res = await fetch('http://localhost:3000/api/tts', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      text: scriptText,
      gender: 'female',
      language: 'fr',
      style: 'espresso',
    }),
  });

  const data = await res.json();
  if (!data.success || !data.audioBase64) {
    throw new Error(data.error || 'Erreur génération TTS');
  }

  const rawWav = path.join(outputDir, 'video_com_recruteuse_raw.wav');
  const buffer = Buffer.from(data.audioBase64, 'base64');
  fs.writeFileSync(rawWav, buffer);

  const finalMp3 = path.join(outputDir, 'video_com_recruteuse.mp3');
  // Mastering broadcast studio pour la voix de la recruteuse
  execSync(
    `ffmpeg -y -i "${rawWav}" -af "highpass=f=80,equalizer=f=3000:width_type=q:width=1.5:g=3.5,acompressor=threshold=-18dB:ratio=3.0:attack=5:release=50,volume=1.25" -c:a libmp3lame -b:a 192k "${finalMp3}"`,
    { stdio: 'inherit' }
  );

  if (fs.existsSync(rawWav)) fs.unlinkSync(rawWav);

  // Analyser la durée
  const durStr = execSync(`ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${finalMp3}"`).toString().trim();
  console.log(`✅ Voix off générée avec succès ! Durée : ${durStr}s`);
}

main().catch(err => {
  console.error('❌ Erreur :', err);
  process.exit(1);
});
