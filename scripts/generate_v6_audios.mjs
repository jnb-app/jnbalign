import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

const SCRIPTS = [
  {
    id: 'video_1_accroche_v6',
    title: 'Vidéo 1 - Accroche (25s) - Audit Complet',
    text: "Ton CV ne correspond pas toujours à l'offre ? Adapte-le avec JNB Align, gratuitement. Dépose ton CV et l'offre visée. L'analyse repère instantanément les compétences clés et valorise ton parcours en toute fidélité. Résultat : un score de compatibilité optimisé, ton CV ajusté et ta lettre personnalisée. Optimise ton CV gratuitement : clique sur le lien en bio !",
    targetDuration: 25,
  },
  {
    id: 'video_2_demo_v6',
    title: 'Vidéo 2 - Démonstration (30s) - Audit Complet',
    text: "Voici comment JNB Align adapte ton CV à une offre. Dépose ton CV et l'annonce cible en quelques secondes. L'outil analyse les compétences requises et valorise tes expériences réelles. Regarde la méthode STAR : une mission générique devient une réalisation concrète et chiffrée, sans rien inventer. Tu obtiens deux documents prêts à l'envoi : ton CV optimisé et ta lettre stratégique. Essaie gratuitement : lien en bio !",
    targetDuration: 30,
  },
  {
    id: 'video_3_lancement_v6',
    title: 'Vidéo 3 - Lancement Officiel (30s) - Audit Complet',
    text: "C'est officiel : JNB Align est disponible ! Le nouvel outil pour adapter ton CV et préparer ta prochaine candidature gratuitement. Le principe est simple : en entrée, dépose ton CV et l'offre cible. En sortie, reçois instantanément tes deux documents prêts à l'emploi : ton CV valorisé selon tes compétences réelles et ta lettre personnalisée. Deux documents, une candidature alignée. Clique sur le lien en bio !",
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
      // Mastering broadcast studio : coupe-bas à 80Hz, EQ présence 2.8kHz (+3.2dB), compresseur vocal broadcast punchy
      execSync(
        `ffmpeg -y -i "${rawWavPath}" -af "highpass=f=80,equalizer=f=2800:width_type=q:width=1.5:g=3.2,acompressor=threshold=-18dB:ratio=3.2:attack=5:release=50,volume=1.20" -c:a libmp3lame -b:a 192k "${finalMp3Path}"`,
        { stdio: 'inherit' }
      );

      if (fs.existsSync(rawWavPath)) fs.unlinkSync(rawWavPath);

      // Probe duration
      const durationStr = execSync(
        `ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${finalMp3Path}"`
      ).toString().trim();

      console.log(`✅ Fichier vocal généré : ${finalMp3Path} (Durée exacte : ${parseFloat(durationStr).toFixed(2)}s)`);
    } catch (err) {
      console.error(`❌ Échec pour ${item.id}:`, err);
    }
  }
}

generate();
