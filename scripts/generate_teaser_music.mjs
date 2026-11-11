import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

// Synthétiseur d'instrumental dynamique 122 BPM (Future Pop / TikTok Teaser)
// 44100 Hz, Stéréo, 35 secondes
const sampleRate = 44100;
const durationSec = 35;
const numSamples = Math.floor(sampleRate * durationSec);
const leftChannel = new Float32Array(numSamples);
const rightChannel = new Float32Array(numSamples);

const bpm = 122;
const beatInterval = 60 / bpm; // ~0.4918s
const measureInterval = beatInterval * 4; // ~1.967s

// Accords : C (Do maj), G (Sol maj), Am (La min), F (Fa maj)
const chordRoots = [65.41, 98.00, 110.00, 87.31];
const chordPitches = [
  [261.63, 329.63, 392.00, 523.25], // C4, E4, G4, C5
  [196.00, 246.94, 293.66, 392.00], // G3, B3, D4, G4
  [220.00, 261.63, 329.63, 440.00], // A3, C4, E4, A4
  [174.61, 220.00, 261.63, 349.23], // F3, A3, C4, F4
];

console.log('🎵 Synthèse de la bande son dynamique 122 BPM...');

// 1. Kick drum (Four-on-the-floor)
const totalBeats = Math.floor(durationSec / beatInterval);
for (let b = 0; b < totalBeats; b++) {
  const beatTime = b * beatInterval;
  const startSample = Math.floor(beatTime * sampleRate);
  const kickLength = Math.floor(0.14 * sampleRate);

  for (let s = 0; s < kickLength && (startSample + s) < numSamples; s++) {
    const t = s / sampleRate;
    const progress = s / kickLength;
    // Pitch drop de 150Hz à 42Hz
    const freq = 42 + 108 * Math.exp(-t * 35);
    const amp = Math.pow(1 - progress, 1.8) * 0.48;
    const sampleVal = Math.sin(2 * Math.PI * freq * t) * amp;
    leftChannel[startSample + s] += sampleVal;
    rightChannel[startSample + s] += sampleVal;
  }
}

// 2. Claps / Snares sur les temps 2 et 4
for (let b = 0; b < totalBeats; b++) {
  if (b % 2 === 1) {
    const beatTime = b * beatInterval;
    const startSample = Math.floor(beatTime * sampleRate);
    const clapLength = Math.floor(0.12 * sampleRate);

    for (let s = 0; s < clapLength && (startSample + s) < numSamples; s++) {
      const t = s / sampleRate;
      const progress = s / clapLength;
      const noise = (Math.random() * 2 - 1) * Math.pow(1 - progress, 2.2) * 0.22;
      const tone = Math.sin(2 * Math.PI * 220 * t) * Math.pow(1 - progress, 3) * 0.15;
      const sampleVal = noise + tone;
      leftChannel[startSample + s] += sampleVal * 0.95;
      rightChannel[startSample + s] += sampleVal * 1.05;
    }
  }
}

// 3. Hi-hats 16th notes (contretemps et groove dynamique)
const sixteenthInterval = beatInterval / 4;
const totalSixteenths = Math.floor(durationSec / sixteenthInterval);
for (let h = 0; h < totalSixteenths; h++) {
  const hatTime = h * sixteenthInterval;
  const startSample = Math.floor(hatTime * sampleRate);
  const hatLength = Math.floor(0.035 * sampleRate);
  const isAccent = (h % 4 === 2); // Contretemps accentué
  const volume = isAccent ? 0.08 : 0.035;

  for (let s = 0; s < hatLength && (startSample + s) < numSamples; s++) {
    const progress = s / hatLength;
    const noise = (Math.random() * 2 - 1) * Math.pow(1 - progress, 4) * volume;
    leftChannel[startSample + s] += noise * (h % 2 === 0 ? 0.8 : 1.2);
    rightChannel[startSample + s] += noise * (h % 2 === 0 ? 1.2 : 0.8);
  }
}

// 4. Bassline électro bondissante (4 notes par mesure)
const totalMeasures = Math.ceil(durationSec / measureInterval);
for (let m = 0; m < totalMeasures; m++) {
  const rootFreq = chordRoots[m % 4];
  for (let p = 0; p < 4; p++) {
    const bassTime = m * measureInterval + p * beatInterval;
    const startSample = Math.floor(bassTime * sampleRate);
    const bassLength = Math.floor(0.38 * sampleRate);

    for (let s = 0; s < bassLength && (startSample + s) < numSamples; s++) {
      const t = s / sampleRate;
      const progress = s / bassLength;
      // Sawtooth harmonisée avec filtre lowpass progressif
      let osc = Math.sin(2 * Math.PI * rootFreq * t);
      osc += 0.5 * Math.sin(2 * Math.PI * rootFreq * 2 * t);
      osc += 0.25 * Math.sin(2 * Math.PI * rootFreq * 3 * t);
      const amp = Math.pow(1 - progress, 1.4) * 0.28;
      const sampleVal = osc * amp;
      leftChannel[startSample + s] += sampleVal;
      rightChannel[startSample + s] += sampleVal;
    }
  }
}

// 5. Synthés / Arpèges motivants et mélodieux (Plucks)
for (let m = 0; m < totalMeasures; m++) {
  const chord = chordPitches[m % 4];
  const eighthInterval = beatInterval / 2;
  for (let e = 0; e < 8; e++) {
    const noteFreq = chord[e % chord.length];
    const noteTime = m * measureInterval + e * eighthInterval;
    const startSample = Math.floor(noteTime * sampleRate);
    const noteLength = Math.floor(0.25 * sampleRate);
    const pan = ((e % 2) * 2 - 1) * 0.35; // léger pan stéréo

    for (let s = 0; s < noteLength && (startSample + s) < numSamples; s++) {
      const t = s / sampleRate;
      const progress = s / noteLength;
      // Cloche / synthé cristallin (fondamentale + harmonique)
      const tone = (Math.sin(2 * Math.PI * noteFreq * t) + 0.3 * Math.sin(2 * Math.PI * noteFreq * 2 * t)) * Math.pow(1 - progress, 2.5) * 0.14;
      leftChannel[startSample + s] += tone * (1 - pan);
      rightChannel[startSample + s] += tone * (1 + pan);
    }
  }
}

// 6. Risers / Balayages sonores aux moments clés (3s, 13s, 24s)
const risers = [2.5, 12.0, 23.5];
risers.forEach((rTime) => {
  const startSample = Math.floor(rTime * sampleRate);
  const rLength = Math.floor(0.8 * sampleRate);
  for (let s = 0; s < rLength && (startSample + s) < numSamples; s++) {
    const t = s / rLength;
    const freq = 300 + 3200 * Math.pow(t, 2);
    const noise = (Math.random() * 2 - 1) * 0.12 * Math.pow(t, 2);
    const sweep = Math.sin(2 * Math.PI * freq * (s / sampleRate)) * 0.08 * t;
    const val = noise + sweep;
    leftChannel[startSample + s] += val;
    rightChannel[startSample + s] += val;
  }
});

// Écriture du fichier WAV 16-bit PCM stéréo
const wavBuffer = Buffer.alloc(44 + numSamples * 4);
// Header WAV
wavBuffer.write('RIFF', 0);
wavBuffer.writeUInt32LE(36 + numSamples * 4, 4);
wavBuffer.write('WAVE', 8);
wavBuffer.write('fmt ', 12);
wavBuffer.writeUInt32LE(16, 16);
wavBuffer.writeUInt16LE(1, 20); // PCM
wavBuffer.writeUInt16LE(2, 22); // Stéréo
wavBuffer.writeUInt32LE(sampleRate, 24);
wavBuffer.writeUInt32LE(sampleRate * 4, 28); // Byte rate
wavBuffer.writeUInt16LE(4, 32); // Block align
wavBuffer.writeUInt16LE(16, 34); // Bits per sample
wavBuffer.write('data', 36);
wavBuffer.writeUInt32LE(numSamples * 4, 40);

// Limiteur / Normalisation douce pour éviter tout clipping
let peak = 0;
for (let i = 0; i < numSamples; i++) {
  peak = Math.max(peak, Math.abs(leftChannel[i]), Math.abs(rightChannel[i]));
}
const normFactor = peak > 0.95 ? 0.95 / peak : 1.0;

let offset = 44;
for (let i = 0; i < numSamples; i++) {
  const left = Math.max(-1, Math.min(1, leftChannel[i] * normFactor));
  const right = Math.max(-1, Math.min(1, rightChannel[i] * normFactor));
  wavBuffer.writeInt16LE(Math.floor(left * 32767), offset);
  wavBuffer.writeInt16LE(Math.floor(right * 32767), offset + 2);
  offset += 4;
}

const rawWavPath = path.resolve(process.cwd(), 'public', 'audio', 'teaser_beat_122bpm_raw.wav');
fs.writeFileSync(rawWavPath, wavBuffer);

const finalMp3Path = path.resolve(process.cwd(), 'public', 'audio', 'teaser_beat_122bpm.mp3');
console.log('⚡ Encodage MP3 haute qualité et mastering dynamique...');
execSync(`ffmpeg -y -i "${rawWavPath}" -af "highpass=f=35,equalizer=f=3200:width_type=q:width=1.2:g=1.5,loudnorm=I=-16:TP=-1.5:LRA=7" -c:a libmp3lame -b:a 192k "${finalMp3Path}"`, { stdio: 'inherit' });

if (fs.existsSync(rawWavPath)) fs.unlinkSync(rawWavPath);
console.log(`✅ Piste musicale dynamique créée : ${finalMp3Path}`);
