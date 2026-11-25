import { RadioStation, RadioState } from '../types/game';

/**
 * Web Audio API synthesizer for Speed Tycoon 3D Car Game
 */
class TycoonAudioSystem {
  private ctx: AudioContext | null = null;
  public isMuted: boolean = false;
  private engineOsc: OscillatorNode | null = null;
  private engineGain: GainNode | null = null;
  private engineFilter: BiquadFilterNode | null = null;
  private musicTimer: number | null = null;
  private musicStep: number = 0;
  private isInGame: boolean = false;

  // Radio System
  public currentStation: RadioStation = 'highway_fm';
  private radioTimer: number | null = null;
  private radioStep = 0;
  private currentBulletinIndex = 0;
  private currentBulletin = 'হাইওয়ে এফএম ১০২.৪: এক্সপ্রেসওয়ে মেইন লেন একদম ক্লিয়ার, গতি বজায় রাখুন!';
  private radioBulletins: string[] = [
    'হাইওয়ে এফএম ১০২.৪: এক্সপ্রেসওয়ে মেইন লেন একদম ক্লিয়ার, গতি বজায় রাখুন!',
    'হাইওয়ে বুলেটিন: কোস্টাল ওশান রোড ও মাউন্টেন পাস ট্রাফিকের জন্য সম্পূর্ণ উন্মুক্ত।',
    'ট্রাফিক কন্ট্রোল: হাই-স্পিড এক্সপ্রেসওয়েতে নিরাপদ দূরত্ব বজায় রেখে ওভারটেক করুন।',
    'হাইওয়ে আপডেট: সকল লেনে দৃষ্টিসীমা ও গ্রিপ ১০০% স্বাভাবিক রয়েছে, দ্রুত ও নিরাপদে ড্রাইভ করুন।',
    'হাইওয়ে মনিটর: সকল জংশন ও ফ্লাইওভার লেন স্বাভাবিক রয়েছে, নির্ধারিত গতি মেনে চলুন।'
  ];

  constructor() {
    const saved = localStorage.getItem('tycoon_muted');
    if (saved !== null) {
      this.isMuted = saved === 'true';
    }
    const savedStation = localStorage.getItem('tycoon_radio_station') as RadioStation | null;
    if (savedStation) {
      this.currentStation = savedStation;
    }
  }

  public init() {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') {
        this.ctx.resume().catch(() => {});
      }
      return;
    }

    try {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    } catch {}
  }

  public setInGame(active: boolean) {
    this.isInGame = active;
  }

  public toggleMute(): boolean {
    this.isMuted = !this.isMuted;
    localStorage.setItem('tycoon_muted', String(this.isMuted));
    if (this.isMuted) {
      this.stopEngine();
      this.stopMusic();
    } else if (this.isInGame) {
      this.init();
      this.startEngine();
      this.startMusic();
    }
    return this.isMuted;
  }

  public startEngine() {
    this.init();
    if (this.isMuted || !this.ctx || this.engineOsc) return;

    try {
      const now = this.ctx.currentTime;
      this.engineOsc = this.ctx.createOscillator();
      this.engineFilter = this.ctx.createBiquadFilter();
      this.engineGain = this.ctx.createGain();

      this.engineOsc.type = 'sawtooth';
      this.engineOsc.frequency.setValueAtTime(55, now);

      this.engineFilter.type = 'lowpass';
      this.engineFilter.frequency.setValueAtTime(360, now);
      this.engineFilter.Q.setValueAtTime(2.5, now);

      this.engineGain.gain.setValueAtTime(0.06, now);

      this.engineOsc.connect(this.engineFilter).connect(this.engineGain).connect(this.ctx.destination);
      this.engineOsc.start(now);
    } catch {}
  }

  public updateEngine(ratio: number, boosting: boolean) {
    if (!this.engineOsc || !this.ctx || this.isMuted) return;

    try {
      const now = this.ctx.currentTime;
      const targetFreq = 50 + ratio * 140 + (boosting ? 55 : 0);
      const targetCutoff = 320 + ratio * 480 + (boosting ? 220 : 0);

      this.engineOsc.frequency.setTargetAtTime(targetFreq, now, 0.08);
      if (this.engineFilter) {
        this.engineFilter.frequency.setTargetAtTime(targetCutoff, now, 0.08);
      }
    } catch {}
  }

  public stopEngine() {
    if (this.engineOsc) {
      try {
        this.engineOsc.stop();
        this.engineOsc.disconnect();
      } catch {}
      this.engineOsc = null;
    }
    if (this.engineFilter) {
      try {
        this.engineFilter.disconnect();
      } catch {}
      this.engineFilter = null;
    }
    if (this.engineGain) {
      try {
        this.engineGain.disconnect();
      } catch {}
      this.engineGain = null;
    }
  }

  public tone(freq: number, duration = 0.1, type: OscillatorType = 'sawtooth', volume = 0.1) {
    this.init();
    if (this.isMuted || !this.ctx) return;
    try {
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, now);
      gain.gain.setValueAtTime(volume, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + duration);
      osc.connect(gain).connect(this.ctx.destination);
      osc.start(now);
      osc.stop(now + duration);
    } catch {}
  }

  // Cash Ka-Ching sound! 💵🪙
  public playCashCollect() {
    this.init();
    if (this.isMuted || !this.ctx) return;

    try {
      const now = this.ctx.currentTime;
      const notes = [987.77, 1318.51, 1975.53]; // B5, E6, B6 shiny coin chime
      notes.forEach((freq, idx) => {
        if (!this.ctx) return;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, now + idx * 0.05);

        gain.gain.setValueAtTime(0.18, now + idx * 0.05);
        gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.05 + 0.15);

        osc.connect(gain).connect(this.ctx.destination);
        osc.start(now + idx * 0.05);
        osc.stop(now + idx * 0.05 + 0.15);
      });
    } catch {}
  }

  public playNitro() {
    this.init();
    if (this.isMuted || !this.ctx) return;

    try {
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(130, now);
      osc.frequency.exponentialRampToValueAtTime(780, now + 0.35);

      gain.gain.setValueAtTime(0.18, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.6);

      osc.connect(gain).connect(this.ctx.destination);
      osc.start(now);
      osc.stop(now + 0.6);
    } catch {}
  }

  public playTurn(left: boolean) {
    this.tone(left ? 280 : 340, 0.04, 'triangle', 0.08);
  }

  public playNearMiss() {
    this.tone(720, 0.14, 'sine', 0.22);
    setTimeout(() => this.tone(1100, 0.1, 'sine', 0.25), 40);
  }

  public playCrash() {
    this.stopEngine();
    this.tone(85, 0.6, 'triangle', 0.4);
    setTimeout(() => this.tone(40, 0.5, 'sawtooth', 0.35), 40);
  }

  public playSiren() {
    this.init();
    if (this.isMuted || !this.ctx) return;

    try {
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(620, now);
      osc.frequency.linearRampToValueAtTime(980, now + 0.3);
      osc.frequency.linearRampToValueAtTime(620, now + 0.6);

      gain.gain.setValueAtTime(0.09, now);
      gain.gain.exponentialRampToValueAtTime(0.005, now + 0.65);

      osc.connect(gain).connect(this.ctx.destination);
      osc.start(now);
      osc.stop(now + 0.65);
    } catch {}
  }

  public playBuySuccess() {
    this.init();
    if (this.isMuted || !this.ctx) return;

    const notes = [440, 554.37, 659.25, 880, 1108.73];
    notes.forEach((f, i) => {
      setTimeout(() => {
        this.tone(f, 0.16, 'triangle', 0.22);
      }, i * 55);
    });
  }

  public playMagnet() {
    this.init();
    if (this.isMuted || !this.ctx) return;
    this.tone(880, 0.08, 'sine', 0.12);
  }

  public playSpin() {
    this.init();
    if (this.isMuted || !this.ctx) return;
    this.tone(520, 0.04, 'triangle', 0.1);
  }

  public playWithdrawSuccess() {
    this.playBuySuccess();
  }

  // --- IN-GAME RADIO SYSTEM ---
  public playRadioStatic() {
    this.init();
    if (this.isMuted || !this.ctx) return;
    try {
      const now = this.ctx.currentTime;
      const bufferSize = Math.floor(this.ctx.sampleRate * 0.12);
      const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = (Math.random() * 2 - 1) * 0.15;
      }
      const noise = this.ctx.createBufferSource();
      noise.buffer = buffer;
      const filter = this.ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(1400, now);
      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(0.08, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
      noise.connect(filter).connect(gain).connect(this.ctx.destination);
      noise.start(now);

      // Highway FM signature chime
      setTimeout(() => {
        this.tone(880, 0.08, 'triangle', 0.14);
        setTimeout(() => this.tone(1174, 0.12, 'triangle', 0.16), 75);
      }, 95);
    } catch {}
  }

  public getRadioState(): RadioState {
    const names: Record<RadioStation, string> = {
      highway_fm: 'হাইওয়ে এফএম (Highway FM 102.4)',
      synthwave: 'সিন্থওয়েভ ড্রাইভ (Synthwave 104.2)',
      chillout: 'চিলআউট এক্সপ্রেস (Chillout 98.8)',
      off: 'রেডিও বন্ধ (Off)',
    };
    const freqs: Record<RadioStation, string> = {
      highway_fm: '102.4 MHz',
      synthwave: '104.2 MHz',
      chillout: '98.8 MHz',
      off: '---',
    };
    const tracks: Record<RadioStation, string> = {
      highway_fm: 'লাইভ হাইওয়ে ট্রাফিক বুলেটিন ও ক্রুজ ট্র্যাক',
      synthwave: 'Night Cruise Expressway (Synthwave)',
      chillout: 'Coastal Highway Chillout Groove',
      off: 'কোনো গান বাজছে না',
    };
    return {
      station: this.currentStation,
      name: names[this.currentStation],
      frequency: freqs[this.currentStation],
      nowPlaying: tracks[this.currentStation],
      trafficBulletin: this.currentBulletin,
      isMuted: this.isMuted || this.currentStation === 'off',
    };
  }

  public setRadioStation(station: RadioStation): RadioState {
    this.currentStation = station;
    localStorage.setItem('tycoon_radio_station', station);
    this.stopMusic();
    if (station !== 'off' && !this.isMuted && this.isInGame) {
      this.playRadioStatic();
      this.startMusic();
    }
    return this.getRadioState();
  }

  public cycleRadioStation(): RadioState {
    const list: RadioStation[] = ['highway_fm', 'synthwave', 'chillout', 'off'];
    const idx = list.indexOf(this.currentStation);
    const next = list[(idx + 1) % list.length];
    return this.setRadioStation(next);
  }

  public updateRadioTrafficNews(custom?: string) {
    if (custom) {
      this.currentBulletin = custom;
    } else {
      this.currentBulletinIndex = (this.currentBulletinIndex + 1) % this.radioBulletins.length;
      this.currentBulletin = this.radioBulletins[this.currentBulletinIndex];
    }
  }

  public startMusic() {
    this.init();
    if (this.isMuted || !this.ctx || this.musicTimer !== null) return;
    if (this.currentStation === 'off') return;

    // 1. Station: Highway FM 102.4 (Melodic synth & news pulse)
    if (this.currentStation === 'highway_fm') {
      const melody = [220, 261.63, 293.66, 329.63, 392, 440, 392, 329.63, 293.66, 261.63, 220, 196, 220, 293.66, 329.63, 220];
      const bass = [55, 55, 65.41, 65.41, 73.42, 73.42, 82.41, 82.41, 65.41, 65.41, 55, 55, 73.42, 73.42, 82.41, 55];
      const loop = () => {
        if (!this.ctx || this.isMuted || this.currentStation !== 'highway_fm') return;
        const step = this.radioStep % 16;
        this.tone(bass[step], 0.12, 'sawtooth', 0.035);
        if (step % 2 === 0) {
          this.tone(melody[step], 0.16, 'triangle', 0.03);
        }
        this.radioStep++;
        this.musicTimer = window.setTimeout(loop, 160);
      };
      loop();
    }
    // 2. Station: Synthwave (Fast driving arpeggios)
    else if (this.currentStation === 'synthwave') {
      const synthBass = [65.41, 65.41, 77.78, 77.78, 87.31, 87.31, 98, 98, 87.31, 77.78, 65.41, 65.41, 77.78, 87.31, 98, 110];
      const lead = [523.25, 659.25, 783.99, 1046.5, 783.99, 659.25, 587.33, 659.25];
      const loop = () => {
        if (!this.ctx || this.isMuted || this.currentStation !== 'synthwave') return;
        const step = this.radioStep % 16;
        this.tone(synthBass[step], 0.11, 'sawtooth', 0.04);
        this.tone(lead[step % 8], 0.09, 'sine', 0.025);
        this.radioStep++;
        this.musicTimer = window.setTimeout(loop, 130);
      };
      loop();
    }
    // 3. Station: Chillout (Smooth atmospheric groove)
    else if (this.currentStation === 'chillout') {
      const groove = [73.42, 110, 73.42, 146.83, 73.42, 110, 82.41, 164.81];
      const loop = () => {
        if (!this.ctx || this.isMuted || this.currentStation !== 'chillout') return;
        const step = this.radioStep % 8;
        this.tone(groove[step], 0.10, 'triangle', 0.045);
        if (step === 2 || step === 6) {
          this.tone(330, 0.06, 'sawtooth', 0.03); // snare snap
        }
        this.radioStep++;
        this.musicTimer = window.setTimeout(loop, 145);
      };
      loop();
    }
  }

  public stopMusic() {
    if (this.musicTimer !== null) {
      clearTimeout(this.musicTimer);
      this.musicTimer = null;
    }
  }

  // --- POLICE ESCORT POWER-UP AUDIO ---
  public playPoliceEscortPowerUp() {
    this.init();
    if (this.isMuted || !this.ctx) return;
    try {
      const now = this.ctx.currentTime;
      // High-energy fanfare chime + police radio alert
      const fanfareNotes = [523.25, 659.25, 783.99, 1046.5, 1318.5];
      fanfareNotes.forEach((f, i) => {
        setTimeout(() => this.tone(f, 0.18, 'triangle', 0.22), i * 65);
      });

      // Quick dual escort siren chirp
      setTimeout(() => {
        if (!this.ctx || this.isMuted) return;
        const sirenOsc = this.ctx.createOscillator();
        const sirenGain = this.ctx.createGain();
        const t = this.ctx.currentTime;
        sirenOsc.type = 'sawtooth';
        sirenOsc.frequency.setValueAtTime(700, t);
        sirenOsc.frequency.linearRampToValueAtTime(1150, t + 0.18);
        sirenOsc.frequency.linearRampToValueAtTime(700, t + 0.36);
        sirenGain.gain.setValueAtTime(0.16, t);
        sirenGain.gain.exponentialRampToValueAtTime(0.01, t + 0.4);
        sirenOsc.connect(sirenGain).connect(this.ctx.destination);
        sirenOsc.start(t);
        sirenOsc.stop(t + 0.4);
      }, 350);
    } catch {}
  }

  // --- HIGHWAY STREET HONKING & SPATIAL AUDIO SYSTEM ---
  private pannerNode(pan: number): StereoPannerNode | GainNode | null {
    if (!this.ctx) return null;
    try {
      if (typeof this.ctx.createStereoPanner === 'function') {
        const panner = this.ctx.createStereoPanner();
        panner.pan.setValueAtTime(Math.max(-1, Math.min(1, pan)), this.ctx.currentTime);
        return panner;
      }
    } catch {}
    return null;
  }

  /**
   * Highway Express Bus Air Horn
   * Pneumatic dual blast (392Hz + 523Hz) with characteristic air valve punch.
   */
  public playBusAirHorn(pan = 0, vol = 0.22) {
    this.init();
    if (this.isMuted || !this.ctx) return;
    try {
      const now = this.ctx.currentTime;
      const panner = this.pannerNode(pan);
      const frequencies = [392, 523.25, 784]; // G4, C5, G5 harmonic chord

      frequencies.forEach((f) => {
        if (!this.ctx) return;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(f, now);

        // Double air-blast envelope
        gain.gain.setValueAtTime(0.001, now);
        gain.gain.linearRampToValueAtTime(vol * 0.4, now + 0.04);
        gain.gain.setValueAtTime(vol * 0.35, now + 0.16);
        gain.gain.linearRampToValueAtTime(vol * 0.45, now + 0.20);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.42);

        if (panner) {
          osc.connect(gain).connect(panner).connect(this.ctx.destination);
        } else {
          osc.connect(gain).connect(this.ctx.destination);
        }
        osc.start(now);
        osc.stop(now + 0.45);
      });
    } catch {}
  }

  /**
   * Compact Transit Squeaky Horn
   * Fast staccato dual chirp.
   */
  public playCNGSqueakHorn(pan = 0, vol = 0.18) {
    this.init();
    if (this.isMuted || !this.ctx) return;
    try {
      const now = this.ctx.currentTime;
      const panner = this.pannerNode(pan);

      // Two quick sharp chirps
      [0, 0.12].forEach((offset) => {
        if (!this.ctx) return;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        const t = now + offset;

        osc.type = 'square';
        osc.frequency.setValueAtTime(840, t);
        osc.frequency.linearRampToValueAtTime(880, t + 0.06);

        gain.gain.setValueAtTime(vol, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.08);

        if (panner) {
          osc.connect(gain).connect(panner).connect(this.ctx.destination);
        } else {
          osc.connect(gain).connect(this.ctx.destination);
        }
        osc.start(t);
        osc.stop(t + 0.09);
      });
    } catch {}
  }

  /**
   * Standard Sedan / Taxi Horn
   */
  public playCarHorn(pan = 0, vol = 0.16) {
    this.init();
    if (this.isMuted || !this.ctx) return;
    try {
      const now = this.ctx.currentTime;
      const panner = this.pannerNode(pan);
      [440, 554.37].forEach((f) => {
        if (!this.ctx) return;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(f, now);
        gain.gain.setValueAtTime(vol * 0.4, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.28);
        if (panner) {
          osc.connect(gain).connect(panner).connect(this.ctx.destination);
        } else {
          osc.connect(gain).connect(this.ctx.destination);
        }
        osc.start(now);
        osc.stop(now + 0.3);
      });
    } catch {}
  }

  /**
   * Spatial traffic honk routed by relative vehicle coordinates
   */
  public playTrafficHorn(
    type: 'bus' | 'truck' | 'suv' | 'cng' | 'police' | 'car',
    relX: number,
    relZ: number
  ) {
    const dist = Math.hypot(relX, relZ);
    if (dist > 50) return; // out of hearing range

    const pan = Math.max(-0.85, Math.min(0.85, relX / 8));
    const vol = Math.max(0.05, Math.min(0.3, (1 - dist / 50) * 0.28));

    if (type === 'bus' || type === 'truck') {
      this.playBusAirHorn(pan, type === 'truck' ? vol * 1.15 : vol);
    } else if (type === 'cng') {
      this.playCNGSqueakHorn(pan, vol);
    } else if (type === 'police') {
      this.playSiren();
    } else {
      this.playCarHorn(pan, vol);
    }
  }

  public vibrate(ms: number) {
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      try {
        navigator.vibrate(ms);
      } catch {}
    }
  }
}

export const sound = new TycoonAudioSystem();

