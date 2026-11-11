import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

const tempDir = path.resolve(process.cwd(), 'temp_voice');
if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true });

const audioDir = path.resolve(process.cwd(), 'public', 'audio');
if (!fs.existsSync(audioDir)) fs.mkdirSync(audioDir, { recursive: true });

async function getTTSWav(text, filename, retries = 3) {
  const filePath = path.join(tempDir, filename);
  if (fs.existsSync(filePath)) return filePath;

  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      // Pause 1s between requests to avoid rate limits
      await new Promise(r => setTimeout(r, 1200));

      const res = await fetch('http://localhost:3000/api/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text,
          gender: 'male',
          language: 'fr',
          style: 'espresso',
        }),
      });

      const data = await res.json();
      if (!data.success || !data.audioBase64) {
        throw new Error(`TTS failed for: ${text} -> ${data.error || data.detail}`);
      }
      const buffer = Buffer.from(data.audioBase64, 'base64');
      fs.writeFileSync(filePath, buffer);
      return filePath;
    } catch (e) {
      console.warn(`Tentative ${attempt}/${retries} échouée pour "${text.slice(0, 30)}...": ${e.message}`);
      if (attempt === retries) throw e;
      await new Promise(r => setTimeout(r, 3000));
    }
  }
}

async function buildVideo1Voice() {
  console.log('\n🎙️ Construction Voix Synchronisée Vidéo 1 (Accroche 25s)...');
  const phrases = [
    { text: "Ton CV est-il vraiment adapté à l'offre ?", start: 0.2, id: 'v1_p1' },
    { text: "Dépose ton CV et l'offre qui t'intéresse.", start: 5.5, id: 'v1_p2' },
    { text: "JNB Align repère les points clés à ajuster.", start: 10.5, id: 'v1_p3' },
    { text: "Prépare deux documents adaptés à ta candidature.", start: 16.5, id: 'v1_p4' },
    { text: "Teste gratuitement sur jnbalign point com.", start: 21.2, id: 'v1_p5' },
  ];

  const inputs = [];
  const delays = [];
  for (let i = 0; i < phrases.length; i++) {
    const p = phrases[i];
    const file = await getTTSWav(p.text, `${p.id}.wav`);
    inputs.push(`-i "${file}"`);
    const ms = Math.round(p.start * 1000);
    delays.push(`[${i}:a]adelay=${ms}|${ms}[d${i}]`);
  }

  const mixInputs = delays.map((_, i) => `[d${i}]`).join('');
  const outPath = path.join(audioDir, 'video_1_accroche.mp3');

  const filter = `${delays.join('; ')}; ${mixInputs}amix=inputs=${phrases.length}:duration=longest:normalize=0,aformat=sample_rates=48000:channel_layouts=stereo,highpass=f=80,equalizer=f=2800:width_type=q:width=1.5:g=3.5,acompressor=threshold=-18dB:ratio=3:attack=5:release=50[outa]`;

  const cmd = `ffmpeg -y ${inputs.join(' ')} -filter_complex "${filter}" -map "[outa]" -t 25 -c:a libmp3lame -b:a 192k "${outPath}"`;
  execSync(cmd, { stdio: 'inherit' });
  console.log(`✅ Voix Vidéo 1 synchronisée générée : ${outPath}`);
}

async function buildVideo2Voice() {
  console.log('\n🎙️ Construction Voix Synchronisée Vidéo 2 (Démonstration 30s)...');
  const phrases = [
    { text: "Voici comment optimiser ton CV en quelques étapes.", start: 0.2, id: 'v2_p1' },
    { text: "Dépose ton CV actuel.", start: 3.2, id: 'v2_p2' },
    { text: "Ajoute l'offre d'emploi ciblée, et lance l'analyse.", start: 7.2, id: 'v2_p3' },
    { text: "L'outil repère les critères essentiels et les écarts à traiter.", start: 11.2, id: 'v2_p4' },
    { text: "Tes expériences sont reformulées avec la méthode STAR : situation, action, résultat.", start: 17.2, id: 'v2_p5' },
    { text: "Ton CV et ta lettre sont prêts à être relus et utilisés.", start: 22.2, id: 'v2_p6' },
    { text: "Deux documents pour une candidature mieux préparée. Essaie gratuitement sur jnbalign point com !", start: 26.2, id: 'v2_p7' },
  ];

  const inputs = [];
  const delays = [];
  for (let i = 0; i < phrases.length; i++) {
    const p = phrases[i];
    const file = await getTTSWav(p.text, `${p.id}.wav`);
    inputs.push(`-i "${file}"`);
    const ms = Math.round(p.start * 1000);
    delays.push(`[${i}:a]adelay=${ms}|${ms}[d${i}]`);
  }

  const mixInputs = delays.map((_, i) => `[d${i}]`).join('');
  const outPath = path.join(audioDir, 'video_2_demo.mp3');

  const filter = `${delays.join('; ')}; ${mixInputs}amix=inputs=${phrases.length}:duration=longest:normalize=0,aformat=sample_rates=48000:channel_layouts=stereo,highpass=f=80,equalizer=f=2800:width_type=q:width=1.5:g=3.5,acompressor=threshold=-18dB:ratio=3:attack=5:release=50[outa]`;

  const cmd = `ffmpeg -y ${inputs.join(' ')} -filter_complex "${filter}" -map "[outa]" -t 30 -c:a libmp3lame -b:a 192k "${outPath}"`;
  execSync(cmd, { stdio: 'inherit' });
  console.log(`✅ Voix Vidéo 2 synchronisée générée : ${outPath}`);
}

async function buildVideo3Voice() {
  console.log('\n🎙️ Construction Voix Synchronisée Vidéo 3 (Lancement 30s)...');
  const phrases = [
    { text: "C'est officiel ! JNB Align est lancé.", start: 0.2, id: 'v3_p1' },
    { text: "Prépare une candidature plus pertinente à partir de chaque offre d'emploi visée.", start: 3.2, id: 'v3_p2' },
    { text: "L'outil identifie les éléments à renforcer.", start: 7.2, id: 'v3_p3' },
    { text: "Et valorise tes expériences réelles avec la méthode STAR.", start: 12.2, id: 'v3_p4' },
    { text: "Prépare un CV et une lettre de motivation stratégiques.", start: 17.2, id: 'v3_p5' },
    { text: "C'est cent pour cent gratuit. Tes données sont strictement protégées.", start: 22.2, id: 'v3_p6' },
    { text: "Découvre JNB Align sur jnbalign point com !", start: 26.2, id: 'v3_p7' },
  ];

  const inputs = [];
  const delays = [];
  for (let i = 0; i < phrases.length; i++) {
    const p = phrases[i];
    const file = await getTTSWav(p.text, `${p.id}.wav`);
    inputs.push(`-i "${file}"`);
    const ms = Math.round(p.start * 1000);
    delays.push(`[${i}:a]adelay=${ms}|${ms}[d${i}]`);
  }

  const mixInputs = delays.map((_, i) => `[d${i}]`).join('');
  const outPath = path.join(audioDir, 'video_3_lancement.mp3');

  const filter = `${delays.join('; ')}; ${mixInputs}amix=inputs=${phrases.length}:duration=longest:normalize=0,aformat=sample_rates=48000:channel_layouts=stereo,highpass=f=80,equalizer=f=2800:width_type=q:width=1.5:g=3.5,acompressor=threshold=-18dB:ratio=3:attack=5:release=50[outa]`;

  const cmd = `ffmpeg -y ${inputs.join(' ')} -filter_complex "${filter}" -map "[outa]" -t 30 -c:a libmp3lame -b:a 192k "${outPath}"`;
  execSync(cmd, { stdio: 'inherit' });
  console.log(`✅ Voix Vidéo 3 synchronisée générée : ${outPath}`);
}

async function run() {
  await buildVideo1Voice();
  await buildVideo2Voice();
  await buildVideo3Voice();
  console.log('\n🎉 Les 3 voix synchronisées au millième de seconde sont prêtes !');
}

run();
