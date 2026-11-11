import fs from 'fs';
import path from 'path';

// Création d'un WAV audio dramatique triste / défaitiste :
// Piano mineur sombre, nappe d'accords lents (La mineur / Ré mineur), battement sourd étouffé, ambiance mélancolique
const sampleRate = 48000;
const durationSec = 4.2;
const numSamples = Math.floor(sampleRate * durationSec);
const numChannels = 2;
const bytesPerSample = 2; // 16-bit
const blockAlign = numChannels * bytesPerSample;
const byteRate = sampleRate * blockAlign;
const dataSize = numSamples * blockAlign;
const buffer = Buffer.alloc(44 + dataSize);

// Header WAV
buffer.write('RIFF', 0);
buffer.writeUInt32LE(36 + dataSize, 4);
buffer.write('WAVE', 8);
buffer.write('fmt ', 12);
buffer.writeUInt32LE(16, 16); // PCM format
buffer.writeUInt16LE(1, 20); // Audio format 1 = PCM
buffer.writeUInt16LE(numChannels, 22);
buffer.writeUInt32LE(sampleRate, 24);
buffer.writeUInt32LE(byteRate, 28);
buffer.writeUInt16LE(blockAlign, 32);
buffer.writeUInt16LE(16, 34); // Bits per sample
buffer.write('data', 36);
buffer.writeUInt32LE(dataSize, 40);

// Synthèse sonore :
// Notes piano mineur : A2 (110Hz), C3 (130.8Hz), E3 (164.8Hz), D2 (73.4Hz), F2 (87.3Hz)
// Drone basse sombre + heartbeat étouffé + résonance mélancolique
let offset = 44;

for (let i = 0; i < numSamples; i++) {
  const t = i / sampleRate;

  // Drone basse sombre en La (55Hz et 110Hz)
  const drone = 0.22 * Math.sin(2 * Math.PI * 55 * t) + 0.15 * Math.sin(2 * Math.PI * 110 * t);

  // Accord triste nappe : C3 (130.8) + E3 (164.8)
  const chord = 0.12 * Math.sin(2 * Math.PI * 130.81 * t) * Math.exp(-t * 0.4)
              + 0.10 * Math.sin(2 * Math.PI * 164.81 * t) * Math.exp(-t * 0.45);

  // Battement de cœur sourd et lent (à t=0.5s et t=2.0s)
  let heartbeat = 0;
  if (t > 0.4 && t < 0.9) {
    const ht = t - 0.4;
    heartbeat += 0.35 * Math.sin(2 * Math.PI * 45 * ht) * Math.exp(-ht * 9);
  }
  if (t > 1.8 && t < 2.3) {
    const ht = t - 1.8;
    heartbeat += 0.30 * Math.sin(2 * Math.PI * 42 * ht) * Math.exp(-ht * 8);
  }

  // Bruit de fond étouffé / pluie lointaine mélancolique
  const rain = (Math.random() * 2 - 1) * 0.015;

  // Note isolée de piano triste à t=0.8s (E4 = 329.6Hz) et t=2.2s (C4 = 261.6Hz)
  let piano = 0;
  if (t > 0.8) {
    const pt = t - 0.8;
    piano += 0.25 * Math.sin(2 * Math.PI * 329.63 * pt) * Math.exp(-pt * 2.2);
  }
  if (t > 2.2) {
    const pt = t - 2.2;
    piano += 0.22 * Math.sin(2 * Math.PI * 261.63 * pt) * Math.exp(-pt * 2.0);
  }

  // Fade out progressif vers la fin pour laisser place à la recruteuse
  let masterEnv = 1.0;
  if (t < 0.3) masterEnv = t / 0.3;
  if (t > 3.4) masterEnv = Math.max(0, 1.0 - (t - 3.4) / 0.8);

  const sample = (drone + chord + heartbeat + rain + piano) * masterEnv * 0.85;
  const clamped = Math.max(-1, Math.min(1, sample));
  const intVal = Math.floor(clamped * 32767);

  buffer.writeInt16LE(intVal, offset);
  buffer.writeInt16LE(intVal, offset + 2);
  offset += 4;
}

const outWav = 'public/audio/defaitiste_mood.wav';
const outMp3 = 'public/audio/defaitiste_mood.mp3';
fs.writeFileSync(outWav, buffer);
console.log('✅ WAV fond triste généré');

import { execSync } from 'child_process';
execSync(`ffmpeg -y -i "${outWav}" -c:a libmp3lame -b:a 192k "${outMp3}"`);
fs.unlinkSync(outWav);
console.log('✅ MP3 fond sonore triste et défaitiste généré avec succès !');
