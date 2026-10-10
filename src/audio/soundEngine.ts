/**
 * Web Audio API Procedural Sound Engine for Danfo Express
 * Synthesizes Danfo air horn, engine revs, conductor door slap, coins, and sirens.
 */

class DanfoSoundEngine {
  private ctx: AudioContext | null = null;
  private engineOsc: OscillatorNode | null = null;
  private engineGain: GainNode | null = null;
  private isMuted: boolean = false;

  private initCtx() {
    if (!this.ctx && typeof window !== 'undefined') {
      const AudioCtxClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new AudioCtxClass();
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  public setMuted(muted: boolean) {
    this.isMuted = muted;
    if (muted && this.engineGain) {
      this.engineGain.gain.setValueAtTime(0, this.ctx?.currentTime || 0);
    }
  }

  public toggleMute(): boolean {
    this.setMuted(!this.isMuted);
    return this.isMuted;
  }

  public getIsMuted(): boolean {
    return this.isMuted;
  }

  /**
   * Dual-tone resonant air horn (Authentic Lagos Danfo "POMM-POMM")
   */
  public playHorn(isMusical: boolean = false) {
    if (this.isMuted) return;
    this.initCtx();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;
    
    if (isMusical) {
      // 3-Tone Musical fanfare horn: F4 -> A4 -> C5 -> F5
      const notes = [349.23, 440.0, 523.25, 698.46];
      notes.forEach((freq, idx) => {
        if (!this.ctx) return;
        const noteTime = t + idx * 0.09;
        const osc = this.ctx.createOscillator();
        const filter = this.ctx.createBiquadFilter();
        const gain = this.ctx.createGain();

        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(freq, noteTime);

        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(1400, noteTime);

        gain.gain.setValueAtTime(0.25, noteTime);
        gain.gain.exponentialRampToValueAtTime(0.001, noteTime + 0.18);

        osc.connect(filter);
        filter.connect(gain);
        gain.connect(this.ctx.destination);

        osc.start(noteTime);
        osc.stop(noteTime + 0.20);
      });
      return;
    }

    // Authentic resonant dual air-horn tone: Low F#3 (185 Hz) & C#4 (277 Hz)
    const playAirHornBurst = (startTime: number, duration: number) => {
      if (!this.ctx) return;
      const osc1 = this.ctx.createOscillator();
      const osc2 = this.ctx.createOscillator();
      const osc3 = this.ctx.createOscillator();
      const filter = this.ctx.createBiquadFilter();
      const gain = this.ctx.createGain();

      osc1.type = 'sawtooth';
      osc2.type = 'sawtooth';
      osc3.type = 'triangle'; // Sub harmonic depth

      osc1.frequency.setValueAtTime(220, startTime); // A3
      osc2.frequency.setValueAtTime(277.18, startTime); // C#4
      osc3.frequency.setValueAtTime(110, startTime); // Sub A2 bass punch

      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(1800, startTime);
      filter.Q.setValueAtTime(2.5, startTime);

      gain.gain.setValueAtTime(0.01, startTime);
      gain.gain.linearRampToValueAtTime(0.35, startTime + 0.02); // crisp air valve punch
      gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);

      osc1.connect(filter);
      osc2.connect(filter);
      osc3.connect(filter);
      filter.connect(gain);
      gain.connect(this.ctx.destination);

      osc1.start(startTime);
      osc2.start(startTime);
      osc3.start(startTime);

      osc1.stop(startTime + duration + 0.02);
      osc2.stop(startTime + duration + 0.02);
      osc3.stop(startTime + duration + 0.02);
    };

    // First burst
    playAirHornBurst(t, 0.22);

    // Follow-up second blast ("PON-PON!")
    setTimeout(() => {
      if (!this.ctx || this.isMuted) return;
      playAirHornBurst(this.ctx.currentTime, 0.26);
    }, 160);
  }

  /**
   * Bus rear boot door lifting up or closing ("KPAA-CHUCK")
   */
  public playBootDoorSound(isOpen: boolean) {
    if (this.isMuted) return;
    this.initCtx();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = isOpen ? 'sine' : 'triangle';
    osc.frequency.setValueAtTime(isOpen ? 180 : 90, t);
    osc.frequency.exponentialRampToValueAtTime(isOpen ? 340 : 45, t + 0.15);

    gain.gain.setValueAtTime(0.3, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.22);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(t);
    osc.stop(t + 0.25);
  }

  /**
   * Windshield wiper sweep squeak across glass
   */
  public playWiperSweep() {
    if (this.isMuted) return;
    this.initCtx();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const filter = this.ctx.createBiquadFilter();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(600, t);
    osc.frequency.linearRampToValueAtTime(320, t + 0.2);

    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(500, t);

    gain.gain.setValueAtTime(0.08, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.22);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(t);
    osc.stop(t + 0.25);
  }

  /**
   * Pothole heavy thud and suspension rattle ("GBUUUM!")
   */
  public playPotholeThud() {
    if (this.isMuted) return;
    this.initCtx();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(75, t);
    osc.frequency.exponentialRampToValueAtTime(20, t + 0.25);

    gain.gain.setValueAtTime(0.4, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.3);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(t);
    osc.stop(t + 0.3);
  }

  /**
   * Water puddle splash for flood roads
   */
  public playSplash() {
    if (this.isMuted) return;
    this.initCtx();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;
    const buffer = this.ctx.createBuffer(1, this.ctx.sampleRate * 0.2, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < buffer.length; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.sin(Math.PI * (i / buffer.length));
    }
    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(800, t);
    filter.frequency.exponentialRampToValueAtTime(200, t + 0.2);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.28, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.22);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.ctx.destination);

    noise.start(t);
    noise.stop(t + 0.22);
  }

  /**
   * Mechanical upgrade installation fanfare
   */
  public playUpgradeChime() {
    if (this.isMuted) return;
    this.initCtx();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;
    [523.25, 659.25, 783.99, 1046.5].forEach((freq, idx) => {
      if (!this.ctx) return;
      const noteTime = t + idx * 0.07;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, noteTime);
      gain.gain.setValueAtTime(0.18, noteTime);
      gain.gain.exponentialRampToValueAtTime(0.001, noteTime + 0.25);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(noteTime);
      osc.stop(noteTime + 0.28);
    });
  }

  /**
   * Conductor slap against the side of the yellow bus ("GBAM-GBAM!")
   */
  public playDoorSlap() {
    if (this.isMuted) return;
    this.initCtx();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const noise = this.ctx.createBufferSource();
    const buffer = this.ctx.createBuffer(1, this.ctx.sampleRate * 0.1, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < buffer.length; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (this.ctx.sampleRate * 0.02));
    }
    noise.buffer = buffer;

    const gain = this.ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(120, t);
    osc.frequency.exponentialRampToValueAtTime(30, t + 0.1);

    gain.gain.setValueAtTime(0.35, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.12);

    osc.connect(gain);
    noise.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(t);
    noise.start(t);
    osc.stop(t + 0.12);
    noise.stop(t + 0.12);

    // Double slap for authentic Lagos rhythm
    setTimeout(() => {
      if (!this.ctx || this.isMuted) return;
      const t2 = this.ctx.currentTime;
      const osc2 = this.ctx.createOscillator();
      const noise2 = this.ctx.createBufferSource();
      const buffer2 = this.ctx.createBuffer(1, this.ctx.sampleRate * 0.08, this.ctx.sampleRate);
      const data2 = buffer2.getChannelData(0);
      for (let i = 0; i < buffer2.length; i++) {
        data2[i] = (Math.random() * 2 - 1) * Math.exp(-i / (this.ctx.sampleRate * 0.02));
      }
      noise2.buffer = buffer2;

      const gain2 = this.ctx.createGain();
      osc2.type = 'triangle';
      osc2.frequency.setValueAtTime(130, t2);
      osc2.frequency.exponentialRampToValueAtTime(35, t2 + 0.09);

      gain2.gain.setValueAtTime(0.3, t2);
      gain2.gain.exponentialRampToValueAtTime(0.001, t2 + 0.1);

      osc2.connect(gain2);
      noise2.connect(gain2);
      gain2.connect(this.ctx.destination);

      osc2.start(t2);
      noise2.start(t2);
      osc2.stop(t2 + 0.1);
      noise2.stop(t2 + 0.1);
    }, 110);
  }

  /**
   * Danfo heavy sliding metal door rumble and latch click ("CH-KLUNK!")
   */
  public playDoorSlide(isOpen: boolean) {
    if (this.isMuted) return;
    this.initCtx();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;
    
    // 1. Sliding roller rumble
    const buffer = this.ctx.createBuffer(1, this.ctx.sampleRate * 0.28, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < buffer.length; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.sin(Math.PI * (i / buffer.length));
    }
    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(isOpen ? 450 : 350, t);
    filter.Q.setValueAtTime(3, t);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.25, t);
    gain.gain.exponentialRampToValueAtTime(0.01, t + 0.26);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.ctx.destination);
    noise.start(t);
    noise.stop(t + 0.28);

    // 2. Heavy metal latch clunk
    setTimeout(() => {
      if (!this.ctx || this.isMuted) return;
      const tLatch = this.ctx.currentTime;
      const clunkOsc = this.ctx.createOscillator();
      const clunkGain = this.ctx.createGain();
      clunkOsc.type = 'triangle';
      clunkOsc.frequency.setValueAtTime(isOpen ? 110 : 85, tLatch);
      clunkOsc.frequency.exponentialRampToValueAtTime(30, tLatch + 0.08);

      clunkGain.gain.setValueAtTime(0.4, tLatch);
      clunkGain.gain.exponentialRampToValueAtTime(0.001, tLatch + 0.09);

      clunkOsc.connect(clunkGain);
      clunkGain.connect(this.ctx.destination);
      clunkOsc.start(tLatch);
      clunkOsc.stop(tLatch + 0.1);
    }, 180);
  }

  /**
   * Heavy air brake pressure release hiss ("PSSSHHH-T!")
   */
  public playAirBrakeHiss() {
    if (this.isMuted) return;
    this.initCtx();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;
    const buffer = this.ctx.createBuffer(1, this.ctx.sampleRate * 0.35, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < buffer.length; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (this.ctx.sampleRate * 0.15));
    }
    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.setValueAtTime(1800, t);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.2, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.32);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.ctx.destination);

    noise.start(t);
    noise.stop(t + 0.35);
  }

  /**
   * Passenger boarding footsteps and fare payment
   */
  public playPassengerBoarding() {
    if (this.isMuted) return;
    this.initCtx();
    if (!this.ctx) return;

    this.playFootstep();
    setTimeout(() => {
      this.playCoin();
    }, 120);
  }

  /**
   * Industrial truck / Danfo reverse warning beep ("BEEP... BEEP...")
   */
  public playReverseBeep() {
    if (this.isMuted) return;
    this.initCtx();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'square';
    osc.frequency.setValueAtTime(1400, t);

    gain.gain.setValueAtTime(0.08, t);
    gain.gain.setValueAtTime(0.08, t + 0.12);
    gain.gain.linearRampToValueAtTime(0.001, t + 0.15);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(t);
    osc.stop(t + 0.16);
  }

  /**
   * Coin / Cash chime when fares are collected
   */
  public playCoin() {
    if (this.isMuted) return;
    this.initCtx();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(987.77, t); // B5
    osc.frequency.setValueAtTime(1318.51, t + 0.06); // E6

    gain.gain.setValueAtTime(0.15, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.25);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(t);
    osc.stop(t + 0.25);
  }

  /**
   * Brake screech sound
   */
  public playBrake() {
    if (this.isMuted) return;
    this.initCtx();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(1400, t);
    osc.frequency.exponentialRampToValueAtTime(800, t + 0.2);

    gain.gain.setValueAtTime(0.08, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.22);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(t);
    osc.stop(t + 0.22);
  }

  /**
   * Bump or crash sound on obstacle impact
   */
  public playCrash() {
    if (this.isMuted) return;
    this.initCtx();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'square';
    osc.frequency.setValueAtTime(90, t);
    osc.frequency.exponentialRampToValueAtTime(25, t + 0.25);

    gain.gain.setValueAtTime(0.35, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.28);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(t);
    osc.stop(t + 0.3);
  }

  private isEngineRunningState: boolean = false;

  /**
   * Dynamic engine tone update based on speed (km/h)
   */
  public updateEngine(speedKmH: number) {
    if (this.isMuted || !this.isEngineRunningState) {
      if (this.engineGain && this.ctx) {
        this.engineGain.gain.setValueAtTime(0, this.ctx.currentTime);
      }
      return;
    }
    this.initCtx();
    if (!this.ctx) return;

    if (!this.engineOsc) {
      this.engineOsc = this.ctx.createOscillator();
      this.engineGain = this.ctx.createGain();
      this.engineOsc.type = 'sawtooth';
      this.engineOsc.frequency.setValueAtTime(50, this.ctx.currentTime);
      this.engineGain.gain.setValueAtTime(0.02, this.ctx.currentTime);

      this.engineOsc.connect(this.engineGain);
      this.engineGain.connect(this.ctx.destination);
      this.engineOsc.start();
    }

    if (this.engineOsc && this.engineGain) {
      const targetFreq = 48 + Math.min(195, (speedKmH / 100) * 135);
      const targetVol = 0.02 + Math.min(0.07, (speedKmH / 100) * 0.06);
      this.engineOsc.frequency.setTargetAtTime(targetFreq, this.ctx.currentTime, 0.04);
      this.engineGain.gain.setTargetAtTime(targetVol, this.ctx.currentTime, 0.04);
    }
  }

  public stopEngine() {
    this.isEngineRunningState = false;
    if (this.engineGain && this.ctx) {
      this.engineGain.gain.setValueAtTime(0, this.ctx.currentTime);
    }
  }

  /**
   * Dead starter / ignition relay mechanical click when engine is off
   */
  public playStarterDeadClick() {
    if (this.isMuted) return;
    this.initCtx();
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(650, t);
    osc.frequency.exponentialRampToValueAtTime(140, t + 0.035);
    gain.gain.setValueAtTime(0.3, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.04);
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(t);
    osc.stop(t + 0.045);
  }

  /**
   * Conductor / Agbero gate whistle when rolling out of the motor park gate
   */
  public playParkExitWhistle() {
    if (this.isMuted) return;
    this.initCtx();
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    // Dual tone metal referee/marshall whistle
    [2400, 2850].forEach((freq, idx) => {
      const osc = this.ctx!.createOscillator();
      const gain = this.ctx!.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, t);
      osc.frequency.setValueAtTime(freq + 150, t + 0.1);
      osc.frequency.setValueAtTime(freq - 80, t + 0.22);
      gain.gain.setValueAtTime(0.18, t);
      gain.gain.setValueAtTime(0.25, t + 0.08);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.38 + idx * 0.05);
      osc.connect(gain);
      gain.connect(this.ctx!.destination);
      osc.start(t);
      osc.stop(t + 0.42);
    });
  }

  /**
   * Diesel starter motor crank and engine ignition roar
   */
  public playEngineIgnition(turnOn: boolean = true) {
    if (this.isMuted) return;
    this.initCtx();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;
    if (turnOn) {
      this.isEngineRunningState = true;

      // 0. Ignition switch mechanical click
      const clickOsc = this.ctx.createOscillator();
      const clickGain = this.ctx.createGain();
      clickOsc.type = 'triangle';
      clickOsc.frequency.setValueAtTime(800, t);
      clickOsc.frequency.exponentialRampToValueAtTime(120, t + 0.04);
      clickGain.gain.setValueAtTime(0.35, t);
      clickGain.gain.exponentialRampToValueAtTime(0.001, t + 0.045);
      clickOsc.connect(clickGain);
      clickGain.connect(this.ctx.destination);
      clickOsc.start(t);
      clickOsc.stop(t + 0.05);

      // 1. High-pitched starter motor electrical whine & alternator hum
      const starterOsc = this.ctx.createOscillator();
      const starterGain = this.ctx.createGain();
      starterOsc.type = 'sawtooth';
      starterOsc.frequency.setValueAtTime(240, t + 0.04);
      starterOsc.frequency.linearRampToValueAtTime(360, t + 0.48);
      starterGain.gain.setValueAtTime(0.12, t + 0.04);
      starterGain.gain.exponentialRampToValueAtTime(0.001, t + 0.52);
      starterOsc.connect(starterGain);
      starterGain.connect(this.ctx.destination);
      starterOsc.start(t + 0.04);
      starterOsc.stop(t + 0.54);

      // 2. 5 heavy diesel compression crank pulses ("chug-chug-chug-chug-VROOM!")
      for (let i = 0; i < 5; i++) {
        const ct = t + 0.05 + i * 0.095;
        const osc = this.ctx.createOscillator();
        const sub = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        const filter = this.ctx.createBiquadFilter();

        osc.type = 'square';
        sub.type = 'triangle';
        osc.frequency.setValueAtTime(160, ct);
        osc.frequency.exponentialRampToValueAtTime(50, ct + 0.075);
        sub.frequency.setValueAtTime(90, ct);
        sub.frequency.exponentialRampToValueAtTime(35, ct + 0.075);

        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(650, ct);

        gain.gain.setValueAtTime(0.3, ct);
        gain.gain.exponentialRampToValueAtTime(0.005, ct + 0.085);

        osc.connect(filter);
        sub.connect(filter);
        filter.connect(gain);
        gain.connect(this.ctx.destination);

        osc.start(ct);
        sub.start(ct);
        osc.stop(ct + 0.09);
        sub.stop(ct + 0.09);
      }

      // 3. Deep diesel combustion roar & rev flare ("VROOOOM!")
      const catchTime = t + 0.52;
      const roar = this.ctx.createOscillator();
      const roarSub = this.ctx.createOscillator();
      const roarFilter = this.ctx.createBiquadFilter();
      const roarGain = this.ctx.createGain();

      roar.type = 'sawtooth';
      roarSub.type = 'triangle';

      // Rev pitch flare up to 220Hz then settles into 65Hz idling
      roar.frequency.setValueAtTime(60, catchTime);
      roar.frequency.exponentialRampToValueAtTime(220, catchTime + 0.25);
      roar.frequency.exponentialRampToValueAtTime(65, catchTime + 0.75);

      roarSub.frequency.setValueAtTime(45, catchTime);
      roarSub.frequency.exponentialRampToValueAtTime(110, catchTime + 0.25);
      roarSub.frequency.exponentialRampToValueAtTime(38, catchTime + 0.75);

      roarFilter.type = 'lowpass';
      roarFilter.frequency.setValueAtTime(1400, catchTime);
      roarFilter.frequency.linearRampToValueAtTime(480, catchTime + 0.75);

      roarGain.gain.setValueAtTime(0.48, catchTime);
      roarGain.gain.exponentialRampToValueAtTime(0.07, catchTime + 0.8);

      roar.connect(roarFilter);
      roarSub.connect(roarFilter);
      roarFilter.connect(roarGain);
      roarGain.connect(this.ctx.destination);

      roar.start(catchTime);
      roarSub.start(catchTime);
      roar.stop(catchTime + 0.85);
      roarSub.stop(catchTime + 0.85);

      // Start continuous idling engine sound right after
      setTimeout(() => {
        if (!this.isMuted && this.isEngineRunningState) {
          this.updateEngine(0);
        }
      }, 780);
    } else {
      this.isEngineRunningState = false;
      this.stopEngine();

      // Sputtering engine shutdown ("putt-putt-sputter-off")
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(65, t);
      osc.frequency.exponentialRampToValueAtTime(12, t + 0.45);
      gain.gain.setValueAtTime(0.28, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.5);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(t);
      osc.stop(t + 0.5);
      this.stopEngine();
    }
  }

  /**
   * Walking footstep on asphalt
   */
  public playFootstep() {
    if (this.isMuted) return;
    this.initCtx();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(85, t);
    osc.frequency.exponentialRampToValueAtTime(30, t + 0.06);
    gain.gain.setValueAtTime(0.12, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.08);
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(t);
    osc.stop(t + 0.08);
  }

  /**
   * Danfo sliding door clack (eject / enter vehicle)
   */
  public playDoorOpenClose() {
    if (this.isMuted) return;
    this.initCtx();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'square';
    osc.frequency.setValueAtTime(260, t);
    osc.frequency.exponentialRampToValueAtTime(70, t + 0.12);
    gain.gain.setValueAtTime(0.25, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.15);
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(t);
    osc.stop(t + 0.15);
  }
}

export const soundEngine = new DanfoSoundEngine();
