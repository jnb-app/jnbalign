/**
 * Moteur Audio Dédié : Bande Son Dynamique, Stimulante & Encourageante (Web Audio API)
 * Style TikTok Tendance / Future Pop Dynamique (122 BPM) :
 * - Rythmique entraînante (Kick percutant, claps vifs, hi-hats 16e énergiques)
 * - Progression d'accords stimulante et positive (C - G - Am - F)
 * - Bassline électro bondissante et motivante
 * - Montées (Risers), impacts et synthés dorés aux transitions clés
 * - Volume calibré pour laisser toute la clarté à la voix off sans saturation
 */

class TeaserAudioEngine {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private isMuted: boolean = false;
  private activeSources: { stop: (when?: number) => void }[] = [];

  private initContext() {
    if (!this.ctx || this.ctx.state === 'closed') {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      this.ctx = new AudioCtx();
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.value = this.isMuted ? 0 : 0.32; // Mix dynamique sous la voix
      this.masterGain.connect(this.ctx.destination);
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  public setMuted(muted: boolean) {
    this.isMuted = muted;
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setValueAtTime(muted ? 0 : 0.32, this.ctx.currentTime);
    }
  }

  public playTrack(startOffset: number = 0) {
    this.initContext();
    if (!this.ctx || !this.masterGain) return;

    this.stopActiveSources();

    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }

    const now = this.ctx.currentTime;
    const baseStartTime = now - startOffset;

    // 1. Rythmique dynamique et stimulante (122 BPM)
    this.scheduleDynamicBeats(baseStartTime, startOffset);

    // 2. Bassline électro entraînante
    this.scheduleDynamicBass(baseStartTime, startOffset);

    // 3. Synthés motivants & accords positifs
    this.scheduleUpliftingSynths(baseStartTime, startOffset);

    // 4. Effets de transition & impacts
    this.scheduleDynamicTransitions(baseStartTime, startOffset);
  }

  private stopActiveSources() {
    this.activeSources.forEach((src) => {
      try {
        src.stop();
      } catch {
        // Ignorer
      }
    });
    this.activeSources = [];
  }

  /**
   * Rythmique 122 BPM : 1 temps = 0.492s
   */
  private scheduleDynamicBeats(baseStartTime: number, currentOffset: number) {
    if (!this.ctx || !this.masterGain) return;

    const beatInterval = 0.4918;
    const totalBeats = Math.floor(38.5 / beatInterval);

    for (let i = 0; i < totalBeats; i++) {
      const beatOffset = i * beatInterval;
      if (beatOffset + 0.1 < currentOffset) continue;

      const beatTime = baseStartTime + beatOffset;
      if (beatTime < this.ctx.currentTime) continue;

      // Kick drum percutant sur les temps 1, 2, 3, 4 (Four-on-the-floor énergique)
      const kickOsc = this.ctx.createOscillator();
      const kickGain = this.ctx.createGain();

      kickOsc.type = 'sine';
      kickOsc.frequency.setValueAtTime(145, beatTime);
      kickOsc.frequency.exponentialRampToValueAtTime(45, beatTime + 0.08);

      kickGain.gain.setValueAtTime(0.42, beatTime);
      kickGain.gain.exponentialRampToValueAtTime(0.001, beatTime + 0.12);

      kickOsc.connect(kickGain);
      kickGain.connect(this.masterGain);

      kickOsc.start(beatTime);
      kickOsc.stop(beatTime + 0.13);
      this.activeSources.push(kickOsc);

      // Snare / Clap dynamique sur les temps 2 et 4 (temps pairs en 0-indexed : 1, 3, 5...)
      if (i % 2 === 1) {
        // Corps tonal du clap
        const clapOsc = this.ctx.createOscillator();
        const clapGain = this.ctx.createGain();
        clapOsc.type = 'triangle';
        clapOsc.frequency.setValueAtTime(240, beatTime);
        clapGain.gain.setValueAtTime(0.18, beatTime);
        clapGain.gain.exponentialRampToValueAtTime(0.001, beatTime + 0.09);
        clapOsc.connect(clapGain);
        clapGain.connect(this.masterGain);
        clapOsc.start(beatTime);
        clapOsc.stop(beatTime + 0.1);
        this.activeSources.push(clapOsc);

        // Bruit blanc percutant
        const noise = this.ctx.createBufferSource();
        const buffer = this.ctx.createBuffer(1, Math.floor(this.ctx.sampleRate * 0.12), this.ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let j = 0; j < buffer.length; j++) {
          data[j] = Math.random() * 2 - 1;
        }
        noise.buffer = buffer;

        const noiseFilter = this.ctx.createBiquadFilter();
        noiseFilter.type = 'highpass';
        noiseFilter.frequency.setValueAtTime(1800, beatTime);

        const noiseGain = this.ctx.createGain();
        noiseGain.gain.setValueAtTime(0.15, beatTime);
        noiseGain.gain.exponentialRampToValueAtTime(0.001, beatTime + 0.11);

        noise.connect(noiseFilter);
        noiseFilter.connect(noiseGain);
        noiseGain.connect(this.masterGain);

        noise.start(beatTime);
        this.activeSources.push(noise);
      }

      // Hi-Hats énergiques sur les contretemps (off-beat)
      const hatTime = beatTime + beatInterval / 2;
      const hatNoise = this.ctx.createBufferSource();
      const hatBuffer = this.ctx.createBuffer(1, Math.floor(this.ctx.sampleRate * 0.04), this.ctx.sampleRate);
      const hatData = hatBuffer.getChannelData(0);
      for (let j = 0; j < hatBuffer.length; j++) {
        hatData[j] = Math.random() * 2 - 1;
      }
      hatNoise.buffer = hatBuffer;

      const hatFilter = this.ctx.createBiquadFilter();
      hatFilter.type = 'highpass';
      hatFilter.frequency.setValueAtTime(6500, hatTime);

      const hatGain = this.ctx.createGain();
      hatGain.gain.setValueAtTime(0.06, hatTime);
      hatGain.gain.exponentialRampToValueAtTime(0.001, hatTime + 0.035);

      hatNoise.connect(hatFilter);
      hatFilter.connect(hatGain);
      hatGain.connect(this.masterGain);

      hatNoise.start(hatTime);
      this.activeSources.push(hatNoise);
    }
  }

  /**
   * Bassline bondissante et entraînante (style Dance-Pop / Electro encourageant)
   */
  private scheduleDynamicBass(baseStartTime: number, currentOffset: number) {
    if (!this.ctx || !this.masterGain) return;

    // Répétition d'un cycle de 4 mesures motivantes : Do (C) -> Sol (G) -> La min (Am) -> Fa (F)
    const beatInterval = 0.4918;
    const measureDur = beatInterval * 4; // ~1.967s par accord

    const chordRoots = [
      65.41,  // C2
      98.00,  // G2
      110.00, // A2
      87.31,  // F2
    ];

    const totalMeasures = Math.ceil(38.5 / measureDur);

    for (let m = 0; m < totalMeasures; m++) {
      const rootFreq = chordRoots[m % 4];
      const measureStartTime = baseStartTime + m * measureDur;

      // 4 pulsations de basse par mesure pour donner du groove
      for (let p = 0; p < 4; p++) {
        const pulseOffset = m * measureDur + p * beatInterval;
        if (pulseOffset + 0.1 < currentOffset) continue;

        const pulseTime = baseStartTime + pulseOffset;
        if (pulseTime < this.ctx.currentTime) continue;

        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        const filter = this.ctx.createBiquadFilter();

        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(rootFreq, pulseTime);

        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(320, pulseTime);
        filter.frequency.exponentialRampToValueAtTime(140, pulseTime + 0.22);

        gain.gain.setValueAtTime(0.24, pulseTime);
        gain.gain.exponentialRampToValueAtTime(0.001, pulseTime + 0.28);

        osc.connect(filter);
        filter.connect(gain);
        gain.connect(this.masterGain);

        osc.start(pulseTime);
        osc.stop(pulseTime + 0.3);
        this.activeSources.push(osc);
      }
    }
  }

  /**
   * Synthés motivants, brillants et positifs (Plucks & Stabs)
   */
  private scheduleUpliftingSynths(baseStartTime: number, currentOffset: number) {
    if (!this.ctx || !this.masterGain) return;

    const beatInterval = 0.4918;
    const measureDur = beatInterval * 4;

    const chords = [
      [261.63, 329.63, 392.00, 523.25], // C maj (Do - Mi - Sol - Do)
      [196.00, 246.94, 293.66, 392.00], // G maj (Sol - Si - Ré - Sol)
      [220.00, 261.63, 329.63, 440.00], // Am (La - Do - Mi - La)
      [174.61, 220.00, 261.63, 349.23], // F maj (Fa - La - Do - Fa)
    ];

    const totalMeasures = Math.ceil(38.5 / measureDur);

    for (let m = 0; m < totalMeasures; m++) {
      const chord = chords[m % 4];

      // Stabs syncopés sur les temps 1 et 2.5
      [0, beatInterval * 1.5, beatInterval * 3].forEach((stabOffset) => {
        const totalOffset = m * measureDur + stabOffset;
        if (totalOffset + 0.1 < currentOffset) return;

        const stabTime = baseStartTime + totalOffset;
        if (stabTime < this.ctx!.currentTime) return;

        chord.forEach((freq) => {
          const osc = this.ctx!.createOscillator();
          const gain = this.ctx!.createGain();

          osc.type = 'triangle';
          osc.frequency.setValueAtTime(freq, stabTime);

          gain.gain.setValueAtTime(0, stabTime);
          gain.gain.linearRampToValueAtTime(0.07, stabTime + 0.02);
          gain.gain.exponentialRampToValueAtTime(0.001, stabTime + 0.28);

          osc.connect(gain);
          gain.connect(this.masterGain!);

          osc.start(stabTime);
          osc.stop(stabTime + 0.3);
          this.activeSources.push(osc);
        });
      });
    }
  }

  /**
   * Effets de transition et montées stimulantes
   */
  private scheduleDynamicTransitions(baseStartTime: number, currentOffset: number) {
    if (!this.ctx || !this.masterGain) return;

    // Transition Scène 1 (3.35s) : Impact dynamique
    if (currentOffset <= 3.35) {
      this.playDynamicRiser(Math.max(this.ctx.currentTime, baseStartTime + 3.0));
    }

    // Transition Scène 2 (13.3s) : Montée énergétique vers la solution
    if (currentOffset <= 13.3) {
      this.playDynamicRiser(Math.max(this.ctx.currentTime, baseStartTime + 12.8));
      this.playTriumphantChime(Math.max(this.ctx.currentTime, baseStartTime + 13.3));
    }

    // Transition Scène 3 (24.3s) : Victoire du pack de documents
    if (currentOffset <= 24.3) {
      this.playTriumphantChime(Math.max(this.ctx.currentTime, baseStartTime + 24.3));
    }

    // Transition Finale (34.3s) : Impact héroïque & outro étincelant
    if (currentOffset <= 34.3) {
      this.playDynamicRiser(Math.max(this.ctx.currentTime, baseStartTime + 33.8));
      this.playTriumphantChime(Math.max(this.ctx.currentTime, baseStartTime + 34.3));
    }
  }

  private playDynamicRiser(time: number) {
    if (!this.ctx || !this.masterGain) return;
    const bufferSize = Math.floor(this.ctx.sampleRate * 0.45);
    const noise = this.ctx.createBufferSource();
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < buffer.length; i++) {
      data[i] = Math.random() * 2 - 1;
    }
    noise.buffer = buffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(350, time);
    filter.frequency.exponentialRampToValueAtTime(3600, time + 0.4);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.01, time);
    gain.gain.linearRampToValueAtTime(0.22, time + 0.25);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.44);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);

    noise.start(time);
    this.activeSources.push(noise);
  }

  private playTriumphantChime(time: number) {
    if (!this.ctx || !this.masterGain) return;
    // Arpège victorieux et stimulant (C5 - E5 - G5 - C6)
    const notes = [523.25, 659.25, 783.99, 1046.50];
    notes.forEach((freq, idx) => {
      if (!this.ctx || !this.masterGain) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, time + idx * 0.07);

      gain.gain.setValueAtTime(0, time + idx * 0.07);
      gain.gain.linearRampToValueAtTime(0.18, time + idx * 0.07 + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, time + idx * 0.07 + 0.75);

      osc.connect(gain);
      gain.connect(this.masterGain);

      osc.start(time + idx * 0.07);
      osc.stop(time + idx * 0.07 + 0.8);
      this.activeSources.push(osc);
    });
  }

  public stopTrack() {
    this.stopActiveSources();
  }
}

export const teaserAudio = new TeaserAudioEngine();
