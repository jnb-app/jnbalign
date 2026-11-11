import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

const SCRIPTS = [
  {
    id: 'video_1_accroche_v7',
    title: 'Vidéo 1 - Accroche (25s) - Audit Technique & Éditorial',
    text: "Ton CV est-il vraiment adapté à l'offre que tu vises ? JNB Align t'aide à l'optimiser gratuitement, sans inventer ton parcours. Dépose ton CV et l'offre ciblée. L'analyse repère les mots-clés et valorise tes compétences. Résultat : ton CV optimisé et ta lettre stratégique. Essaie maintenant : lien en bio sur jnbalign point com !",
    targetDuration: 25,
  },
  {
    id: 'video_2_demo_v7',
    title: 'Vidéo 2 - Démonstration (30s) - Audit Technique & Éditorial',
    text: "Voici comment optimiser ton CV en quelques étapes. Dépose ton CV et l'offre ciblée. JNB Align analyse les mots-clés et l'adéquation ATS. Regarde la méthode STAR : une mission générique devient une réalisation concrète. Même expérience, meilleure présentation, aucun fait inventé. Tu obtiens ton CV optimisé et ta lettre stratégique. Deux documents pour une candidature mieux préparée. Essaie gratuitement : lien en bio !",
    targetDuration: 30,
  },
  {
    id: 'video_3_lancement_v7',
    title: 'Vidéo 3 - Lancement Officiel (30s) - Audit Technique & Éditorial',
    text: "C'est officiel ! JNB Align est lancé. Le copilote pour adapter ton CV à chaque offre, sans travestir ton parcours. Le principe est simple : deux éléments en entrée, ton CV et l'offre visée. Et deux documents en sortie, ton CV optimisé et ta lettre personnalisée prêts à l'envoi. Deux documents, une candidature mieux préparée. Découvre JNB Align : essaie gratuitement sur jnbalign point com, lien en bio !",
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
      // Mastering broadcast studio certifié ZÉRO ÉCRÊTAGE (Audit Section 8) :
      // coupe-bas 80Hz, EQ présence 2.5kHz (+1.8dB), compresseur vocal broadcast, limiteur True Peak à -1.5dB
      execSync(
        `ffmpeg -y -i "${rawWavPath}" -af "highpass=f=80,equalizer=f=2500:width_type=q:width=1.5:g=1.8,acompressor=threshold=-20dB:ratio=2.8:attack=10:release=60,volume=0.95,alimiter=limit=-1.5dB" -c:a libmp3lame -b:a 192k "${finalMp3Path}"`,
        { stdio: 'inherit' }
      );

      if (fs.existsSync(rawWavPath)) fs.unlinkSync(rawWavPath);

      // Probe duration
      const durationStr = execSync(
        `ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${finalMp3Path}"`
      ).toString().trim();

      console.log(`✅ Fichier vocal v7 généré : ${finalMp3Path} (Durée exacte : ${parseFloat(durationStr).toFixed(2)}s)`);
    } catch (err) {
      console.error(`❌ Échec pour ${item.id}:`, err);
    }
  }
}

generate();
