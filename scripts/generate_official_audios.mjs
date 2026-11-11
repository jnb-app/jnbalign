import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

// Scripts vocaux calibrés selon l'audit critique officiel JNB Align (Pages 4, 5, 6)
const SCRIPTS = [
  {
    id: 'video_1_accroche',
    title: 'Vidéo 1 - Accroche (25s)',
    text: "Ton CV est-il vraiment adapté à l'offre ? Dépose ton CV et l'offre qui t'intéresse. JNB Align repère les points clés à ajuster. Prépare deux documents adaptés à ta candidature : un CV optimisé et une lettre stratégique. Teste gratuitement sur jnbalign point com.",
    targetDuration: 25,
  },
  {
    id: 'video_2_demo',
    title: 'Vidéo 2 - Démonstration (30s)',
    text: "Voici comment optimiser ton CV en quelques étapes. Dépose ton CV actuel, ajoute l'offre d'emploi ciblée, et lance l'analyse. L'outil repère les critères essentiels et les écarts à traiter. Tes expériences sont reformulées avec la méthode STAR : situation, action, résultat. Ton CV et ta lettre sont prêts à être relus et utilisés. Deux documents pour une candidature mieux préparée. Essaie gratuitement sur jnbalign point com !",
    targetDuration: 30,
  },
  {
    id: 'video_3_lancement',
    title: 'Vidéo 3 - Lancement Officiel (30s)',
    text: "C'est officiel ! JNB Align est lancé. Prépare une candidature plus pertinente à partir de chaque offre d'emploi visée. L'outil identifie les éléments à renforcer et valorise tes expériences réelles avec la méthode STAR. Prépare un CV et une lettre de motivation stratégiques. C'est cent pour cent gratuit. Découvre JNB Align sur jnbalign point com !",
    targetDuration: 30,
  },
];

async function generate() {
  const audioDir = path.resolve(process.cwd(), 'public', 'audio');
  if (!fs.existsSync(audioDir)) fs.mkdirSync(audioDir, { recursive: true });

  for (const item of SCRIPTS) {
    console.log(`\n🎙️ Génération de la voix studio ('Fenrir') pour : ${item.title}...`);
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
      // Equalisation dynamique studio : coupe-bas à 80Hz, boost présence 2.8kHz + compresseur vocal broadcast
      execSync(
        `ffmpeg -y -i "${rawWavPath}" -af "highpass=f=80,equalizer=f=2800:width_type=q:width=1.5:g=3.5,acompressor=threshold=-18dB:ratio=3:attack=5:release=50" -c:a libmp3lame -b:a 192k "${finalMp3Path}"`,
        { stdio: 'inherit' }
      );

      // Clean raw wav
      if (fs.existsSync(rawWavPath)) fs.unlinkSync(rawWavPath);

      console.log(`✅ Fichier vocal généré avec succès : ${finalMp3Path}`);
    } catch (err) {
      console.error(`❌ Échec pour ${item.id}:`, err);
    }
  }
}

generate();
