const fs = require('fs');
const path = require('path');

const soundPath = path.join(__dirname, 'src/audio/soundEngine.ts');
let soundContent = fs.readFileSync(soundPath, 'utf8');

const hornPattern = /public playHorn\\(.*?\\) \\{[\\s\\S]*?setTimeout\\(\\) => \\{[\\s\\S]*?playAirHornBurst.*?\\}[\\s\\S]*?\\}[\\s\\S]*?\\}/m;

const newHorn = `public playHorn(isMusical: boolean = false) {
    if (this.isMuted) return;
    this.initCtx();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;
    
    if (isMusical) {
      const notes = [349.23, 440.0, 523.25, 698.46];
      notes.forEach((freq, idx) => {
        if (!this.ctx) return;
        const noteTime = t + idx * 0.09;
        const osc = this.ctx.createOscillator();
        const filter = this.ctx.createBiquadFilter();
        const gain = this.ctx.createGain();

        osc.type = 'square';
        osc.frequency.setValueAtTime(freq, noteTime);

        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(2000, noteTime);

        gain.gain.setValueAtTime(0.3, noteTime);
        gain.gain.exponentialRampToValueAtTime(0.001, noteTime + 0.18);

        osc.connect(filter);
        filter.connect(gain);
        gain.connect(this.ctx.destination);

        osc.start(noteTime);
        osc.stop(noteTime + 0.20);
      });
      return;
    }

    const playAirHornBurst = (startTime: number, duration: number) => {
      if (!this.ctx) return;
      const osc1 = this.ctx.createOscillator();
      const osc2 = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc1.type = 'sawtooth';
      osc2.type = 'square';

      // Authentic Danfo sharp dissonant horn (C4 & D#4)
      osc1.frequency.setValueAtTime(261.63, startTime); 
      osc2.frequency.setValueAtTime(311.13, startTime); 

      gain.gain.setValueAtTime(0.01, startTime);
      gain.gain.linearRampToValueAtTime(0.5, startTime + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);

      osc1.connect(gain);
      osc2.connect(gain);
      gain.connect(this.ctx.destination);

      osc1.start(startTime);
      osc2.start(startTime);
      osc1.stop(startTime + duration + 0.02);
      osc2.stop(startTime + duration + 0.02);
    };

    playAirHornBurst(t, 0.15);
    setTimeout(() => {
      if (!this.ctx || this.isMuted) return;
      playAirHornBurst(this.ctx.currentTime, 0.25);
    }, 120);
  }`;

soundContent = soundContent.replace(hornPattern, newHorn);
fs.writeFileSync(soundPath, soundContent);
console.log('Fixed horn');
