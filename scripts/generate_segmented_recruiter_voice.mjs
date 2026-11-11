import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

const outputDir = path.resolve('public/audio/com_segments');
if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });

// Découpage strict selon le script du PDF :
// Tableau 2 : "une recruteuse marchant au milieu des cv rejetés et des candidats désespérés prononce les paroles suivantes :"
// 1. "Ton CV est peut-être la raison pour laquelle tu ne décroches pas d'entretien."
// 2. "Mais avec JNB Align :"
// 3. "Optimisez votre CV pour les ATS."
// 4. "Valorisez vos compétences et vos expériences."
// 5. "Créez une lettre de motivation stratégique."
// 6. "Téléchargez vos documents gratuitement."
// 7. "Ne laisse plus ton CV décider de ton avenir."
// 8. "Teste JNB Align gratuitement dès maintenant."

const SEGMENTS = [
  { id: 'seg1_raison', text: "Ton CV est peut-être la raison pour laquelle tu ne décroches pas d'entretien." },
  { id: 'seg2_mais', text: "Mais avec JNB Align :" },
  { id: 'seg3_optimisez', text: "Optimisez votre CV pour les ATS." },
  { id: 'seg4_valorisez', text: "Valorisez vos compétences et vos expériences." },
  { id: 'seg5_creez', text: "Créez une lettre de motivation stratégique." },
  { id: 'seg6_telechargez', text: "Téléchargez vos documents gratuitement." },
  { id: 'seg7_ne_laisse_plus', text: "Ne laisse plus ton CV décider de ton avenir." },
  { id: 'seg8_cta', text: "Teste JNB Align gratuitement dès maintenant." },
];

async function main() {
  console.log('🎙️ Génération des segments vocaux studio de la recruteuse...');
  const results = [];

  for (const seg of SEGMENTS) {
    console.log(`  -> Segment [${seg.id}] : "${seg.text}"`);
    const res = await fetch('http://localhost:3000/api/tts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text: seg.text,
        gender: 'female',
        language: 'fr',
        style: 'espresso',
      }),
    });

    const data = await res.json();
    if (!data.success || !data.audioBase64) {
      throw new Error(`Erreur TTS sur ${seg.id}`);
    }

    const wavFile = path.join(outputDir, `${seg.id}.wav`);
    const mp3File = path.join(outputDir, `${seg.id}.mp3`);
    fs.writeFileSync(wavFile, Buffer.from(data.audioBase64, 'base64'));

    execSync(
      `ffmpeg -y -i "${wavFile}" -af "highpass=f=80,equalizer=f=3000:width_type=q:width=1.5:g=3.0,acompressor=threshold=-18dB:ratio=3.0:attack=5:release=50,volume=1.20" -c:a libmp3lame -b:a 192k "${mp3File}" 2>/dev/null`
    );
    fs.unlinkSync(wavFile);

    const dur = parseFloat(
      execSync(`ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${mp3File}"`).toString().trim()
    );

    results.push({ ...seg, file: mp3File, duration: dur });
    console.log(`     ✅ Durée : ${dur.toFixed(2)}s`);
  }

  console.log('\n📊 Résumé des durées par segment :');
  console.table(results.map(r => ({ id: r.id, duration: r.duration, text: r.text })));
  fs.writeFileSync(path.join(outputDir, 'segments_manifest.json'), JSON.stringify(results, null, 2));
}

main().catch(err => {
  console.error('❌ Erreur :', err);
  process.exit(1);
});
