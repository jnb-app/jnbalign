import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

const sampleRate = 48000;
const sfxDir = path.resolve(process.cwd(), 'public', 'audio', 'sfx');
if (!fs.existsSync(sfxDir)) fs.mkdirSync(sfxDir, { recursive: true });

function writeWav(filePath, floatSamples) {
  const numSamples = floatSamples.length;
  const wavBuffer = Buffer.alloc(44 + numSamples * 2);
  wavBuffer.write('RIFF', 0);
  wavBuffer.writeUInt32LE(36 + numSamples * 2, 4);
  wavBuffer.write('WAVE', 8);
  wavBuffer.write('fmt ', 12);
  wavBuffer.writeUInt32LE(16, 16);
  wavBuffer.writeUInt16LE(1, 20); // PCM
  wavBuffer.writeUInt16LE(1, 22); // Mono
  wavBuffer.writeUInt32LE(sampleRate, 24);
  wavBuffer.writeUInt32LE(sampleRate * 2, 28);
  wavBuffer.writeUInt16LE(2, 32);
  wavBuffer.writeUInt16LE(16, 34);
  wavBuffer.write('data', 36);
  wavBuffer.writeUInt32LE(numSamples * 2, 40);

  // Normaliser à 0.85 max
  let maxVal = 0;
  for (let i = 0; i < numSamples; i++) {
    maxVal = Math.max(maxVal, Math.abs(floatSamples[i]));
  }
  const norm = maxVal > 0 ? 0.85 / maxVal : 1;

  let offset = 44;
  for (let i = 0; i < numSamples; i++) {
    const val = Math.max(-1, Math.min(1, floatSamples[i] * norm));
    wavBuffer.writeInt16LE(Math.floor(val * 32767), offset);
    offset += 2;
  }

  fs.writeFileSync(filePath, wavBuffer);
}

// 1. Whoosh de transition dynamique (0.35s)
function generateWhoosh() {
  const dur = 0.35;
  const len = Math.floor(dur * sampleRate);
  const samples = new Float32Array(len);
  for (let i = 0; i < len; i++) {
    const t = i / len;
    // Bruit blanc avec sweep de fréquence et enveloppe en cloche
    const env = Math.sin(t * Math.PI);
    const noise = (Math.random() * 2 - 1) * Math.pow(env, 1.8);
    const sweep = Math.sin(2 * Math.PI * (250 + 2600 * Math.pow(t, 2.2)) * (i / sampleRate)) * 0.35 * env;
    samples[i] = noise + sweep;
  }
  const outPath = path.join(sfxDir, 'sfx_whoosh.wav');
  writeWav(outPath, samples);
  console.log('✅ SFX Whoosh généré :', outPath);
}

// 2. Clic franc d'importation / bouton tactile (0.06s)
function generateClick() {
  const dur = 0.06;
  const len = Math.floor(dur * sampleRate);
  const samples = new Float32Array(len);
  for (let i = 0; i < len; i++) {
    const t = i / len;
    const env = Math.exp(-t * 80);
    const pop = Math.sin(2 * Math.PI * (900 - 650 * t) * (i / sampleRate)) * env * 0.9;
    const click = (Math.random() * 2 - 1) * Math.exp(-t * 220) * 0.5;
    samples[i] = pop + click;
  }
  const outPath = path.join(sfxDir, 'sfx_click.wav');
  writeWav(outPath, samples);
  console.log('✅ SFX Click généré :', outPath);
}

// 3. Carillon feutré sur l'affichage du score 92% (0.85s)
function generateChime() {
  const dur = 0.85;
  const len = Math.floor(dur * sampleRate);
  const samples = new Float32Array(len);
  // Accord cristallin Majeur (Do6 1046.5Hz, Mi6 1318.5Hz, Sol6 1567.9Hz)
  const freqs = [1046.5, 1318.5, 1567.9, 2093.0];
  freqs.forEach((f, idx) => {
    const offset = Math.floor(idx * 0.04 * sampleRate);
    for (let i = offset; i < len; i++) {
      const t = (i - offset) / sampleRate;
      const env = Math.exp(-t * 4.5);
      const tone = Math.sin(2 * Math.PI * f * t) * env * 0.25;
      samples[i] += tone;
    }
  });
  const outPath = path.join(sfxDir, 'sfx_chime.wav');
  writeWav(outPath, samples);
  console.log('✅ SFX Chime généré :', outPath);
}

console.log('🔊 Génération du Sound Design immersif JNB Align...');
generateWhoosh();
generateClick();
generateChime();
