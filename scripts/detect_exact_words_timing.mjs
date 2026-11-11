import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

// Let's get the exact silence intervals from ffmpeg
function getSpeechIntervals(filename) {
  const cmd = `ffmpeg -i public/audio/${filename} -af "silencedetect=noise=-26dB:d=0.20" -f null - 2>&1`;
  const out = execSync(cmd).toString();
  const lines = out.split('\n');
  const silences = [];
  for (const line of lines) {
    if (line.includes('silencedetect')) {
      const startMatch = line.match(/silence_start:\s*([0-9.]+)/);
      const endMatch = line.match(/silence_end:\s*([0-9.]+)\s*\|\s*silence_duration:\s*([0-9.]+)/);
      if (startMatch) {
        silences.push({ type: 'start', time: parseFloat(startMatch[1]) });
      } else if (endMatch) {
        silences.push({ type: 'end', time: parseFloat(endMatch[1]), duration: parseFloat(endMatch[2]) });
      }
    }
  }

  // Now deduce speech segments [start, end]
  // Audio starts at 0
  let speech = [];
  let curSpeechStart = 0;
  for (let i = 0; i < silences.length; i++) {
    const s = silences[i];
    if (s.type === 'start') {
      if (s.time > curSpeechStart + 0.1) {
        speech.push({ start: curSpeechStart, end: s.time });
      }
    } else if (s.type === 'end') {
      curSpeechStart = s.time;
    }
  }

  // Probe total duration
  const durStr = execSync(`ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 public/audio/${filename}`).toString().trim();
  const totalDur = parseFloat(durStr);
  if (totalDur > curSpeechStart + 0.1) {
    speech.push({ start: curSpeechStart, end: totalDur });
  }

  return { totalDur, speech };
}

console.log("=== VIDEO 1 ACCROCHE ===");
const v1 = getSpeechIntervals("video_1_accroche_v7.mp3");
console.log(JSON.stringify(v1, null, 2));

console.log("=== VIDEO 2 DEMO ===");
const v2 = getSpeechIntervals("video_2_demo_v7.mp3");
console.log(JSON.stringify(v2, null, 2));

console.log("=== VIDEO 3 LANCEMENT ===");
const v3 = getSpeechIntervals("video_3_lancement_v7.mp3");
console.log(JSON.stringify(v3, null, 2));
