/**
 * Procedural Web Audio Afrobeat Radio Engine for Danfo Express
 * Plays synthesized Lagos radio stations: Wazobia FM, Eko Fuji Wave, and Highlife Groove.
 */

class AfrobeatRadioEngine {
  private ctx: AudioContext | null = null;
  private isPlaying: boolean = false;
  private currentStation: 'WAZOBIA_95' | 'EKO_FUJI' | 'HIGHLIFE' = 'WAZOBIA_95';
  private timerId: number | null = null;
  private masterGain: GainNode | null = null;
  private step: number = 0;
  private volume: number = 0.25;

  private initCtx() {
    if (!this.ctx && typeof window !== 'undefined') {
      const AudioCtxClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new AudioCtxClass();
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.setValueAtTime(this.volume, this.ctx.currentTime);
      this.masterGain.connect(this.ctx.destination);
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  public setVolume(vol: number) {
    this.volume = Math.max(0, Math.min(1, vol));
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setTargetAtTime(this.volume, this.ctx.currentTime, 0.05);
    }
  }

  public setStation(station: 'WAZOBIA_95' | 'EKO_FUJI' | 'HIGHLIFE') {
    this.currentStation = station;
  }

  public getStation() {
    return this.currentStation;
  }

  public isRadioPlaying() {
    return this.isPlaying;
  }

  public togglePlay(): boolean {
    if (this.isPlaying) {
      this.stop();
      return false;
    } else {
      this.start();
      return true;
    }
  }

  public start() {
    this.initCtx();
    if (this.isPlaying || !this.ctx) return;
    this.isPlaying = true;
    this.step = 0;

    const tempoMs = this.currentStation === 'WAZOBIA_95' ? 140 : this.currentStation === 'EKO_FUJI' ? 120 : 160;

    this.timerId = window.setInterval(() => {
      this.tick();
    }, tempoMs);
  }

  public stop() {
    this.isPlaying = false;
    if (this.timerId !== null) {
      clearInterval(this.timerId);
      this.timerId = null;
    }
  }

  private tick() {
    if (!this.ctx || !this.masterGain) return;
    const t = this.ctx.currentTime;
    const stepInBar = this.step % 16;

    // 1. Bassline (Syncopated Afrobeat bass)
    if (stepInBar === 0 || stepInBar === 3 || stepInBar === 6 || stepInBar === 10 || stepInBar === 12) {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'triangle';

      const freqs = this.currentStation === 'WAZOBIA_95' 
        ? [65.41, 73.42, 87.31, 98.0] // C2, D2, F2, G2
        : this.currentStation === 'EKO_FUJI'
        ? [55.0, 65.41, 82.41, 73.42] // A1, C2, E2, D2
        : [58.27, 65.41, 77.78, 87.31]; // Bb1, C2, Eb2, F2

      const f = freqs[Math.floor(this.step / 4) % freqs.length];
      osc.frequency.setValueAtTime(f, t);

      gain.gain.setValueAtTime(0.3, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.18);

      osc.connect(gain);
      gain.connect(this.masterGain);
      osc.start(t);
      osc.stop(t + 0.2);
    }

    // 2. Afrobeat Clave / Rimshot / Talking Drum hit
    if (stepInBar === 0 || stepInBar === 4 || stepInBar === 7 || stepInBar === 10 || stepInBar === 14) {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(320, t);
      osc.frequency.exponentialRampToValueAtTime(140, t + 0.08);

      gain.gain.setValueAtTime(0.2, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.09);

      osc.connect(gain);
      gain.connect(this.masterGain);
      osc.start(t);
      osc.stop(t + 0.1);
    }

    // 3. Shaker / Shekere rhythm (continuous high frequency sizzle)
    if (this.step % 2 === 0) {
      const buffer = this.ctx.createBuffer(1, this.ctx.sampleRate * 0.04, this.ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < buffer.length; i++) {
        data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (this.ctx.sampleRate * 0.01));
      }
      const noise = this.ctx.createBufferSource();
      noise.buffer = buffer;
      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(0.08, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.05);

      noise.connect(gain);
      gain.connect(this.masterGain);
      noise.start(t);
      noise.stop(t + 0.05);
    }

    // 4. Brass / Horn Stabs (Iconic Fela/Burna style brass riff)
    if (stepInBar === 6 || stepInBar === 14) {
      const osc1 = this.ctx.createOscillator();
      const osc2 = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc1.type = 'sawtooth';
      osc2.type = 'sawtooth';

      const root = this.currentStation === 'WAZOBIA_95' ? 261.63 : 220.0;
      osc1.frequency.setValueAtTime(root, t);
      osc2.frequency.setValueAtTime(root * 1.25, t);

      gain.gain.setValueAtTime(0.12, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.22);

      osc1.connect(gain);
      osc2.connect(gain);
      gain.connect(this.masterGain);

      osc1.start(t);
      osc2.start(t);
      osc1.stop(t + 0.25);
      osc2.stop(t + 0.25);
    }

    this.step++;
  }
}

export const afrobeatRadio = new AfrobeatRadioEngine();
