import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

const SCRIPTS = [
  {
    id: 'video_1_accroche_v5',
    title: 'Vidéo 1 - Accroche (25s)',
    text: "Ton CV mérite mieux qu'une candidature envoyée au hasard. Adapte ton CV à chaque offre avec JNB Align. L'outil repère les critères essentiels et optimise ton parcours sans rien inventer. Deux documents concrets : un CV optimisé et une lettre stratégique. Optimise ton CV gratuitement sur jnbalign point com !",
    targetDuration: 25,
  },
  {
    id: 'video_2_demo_v5',
    title: 'Vidéo 2 - Démonstration (30s)',
    text: "Ton expérience a de la valeur. Fais-la ressortir. Dépose ton CV et l'offre d'emploi ciblée. JNB Align analyse les critères clés et la compatibilité ATS. Transforme tes expériences en réalisations concrètes grâce à la méthode STAR. Obtiens instantanément ton CV optimisé et ta lettre stratégique. Deux documents pour une candidature mieux préparée. Gratuitement sur jnbalign point com !",
    targetDuration: 30,
  },
  {
    id: 'video_3_lancement_v5',
    title: 'Vidéo 3 - Lancement Officiel (30s)',
    text: "C'est officiel : JNB Align est lancé ! Le copilote conçu pour valoriser ton vrai parcours face aux filtres recruteurs. Importe ton CV et l'offre d'emploi. L'outil identifie les forces de ton profil et restructure tes expériences en réalisations percutantes. Télécharge deux documents prêts à l'envoi : ton CV optimisé et ta lettre stratégique. Deux documents, une candidature alignée. Découvre JNB Align gratuitement sur jnbalign point com !",
    targetDuration: 30,
  },
];

async function generate() {
  const audioDir = path.resolve(process.cwd(), 'public', 'audio');
  if (!fs.existsSync(audioDir)) fs.mkdirSync(audioDir, { recursive: true });

  for (const item of SCRIPTS) {
    console.log(`\n🎙️ Génération de la voix Fenrir studio pour : ${item.title}...`);
    try {
      const res = await fetch('http://localhost:3000/api/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: item.text,
          gender: 'male',
          language: 'fr',
          style: 'espresso',
        }),
      });

      const data = await res.json();
      if (!data.success || !data.audioBase64) {
        throw new Error(data.error || 'Aucun audio généré');
      }

      const rawWavPath = path.join(audioDir, `${item.id}_raw.wav`);
      const buffer = Buffer.from(data.audioBase64, 'base64');
      fs.writeFileSync(rawWavPath, buffer);

      const finalMp3Path = path.join(audioDir, `${item.id}.mp3`);
      // Mastering broadcast : coupe-bas à 80Hz, EQ présence 2.8kHz (+3dB), compresseur vocal broadcast
      execSync(
        `ffmpeg -y -i "${rawWavPath}" -af "highpass=f=80,equalizer=f=2800:width_type=q:width=1.5:g=3.0,acompressor=threshold=-18dB:ratio=3.2:attack=5:release=50,volume=1.15" -c:a libmp3lame -b:a 192k "${finalMp3Path}"`,
        { stdio: 'inherit' }
      );

      if (fs.existsSync(rawWavPath)) fs.unlinkSync(rawWavPath);

      // Probe duration
      const durationStr = execSync(
        `ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${finalMp3Path}"`
      ).toString().trim();

      console.log(`✅ Fichier vocal généré : ${finalMp3Path} (Durée : ${parseFloat(durationStr).toFixed(2)}s)`);
    } catch (err) {
      console.error(`❌ Échec pour ${item.id}:`, err);
    }
  }
}

generate();
