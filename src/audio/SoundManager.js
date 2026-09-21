// Procedural Web Audio synthesizer for Super Cars II VR (Zero external audio file dependencies)

export class SoundManager {
  constructor() {
    this.ctx = null;
    this.isMuted = false;
    this.initialized = false;

    // Engine sound nodes
    this.engineGain = null;
    this.engineOsc1 = null;
    this.engineOsc2 = null;
    this.engineFilter = null;

    // Tire screech nodes
    this.skidGain = null;
    this.skidNoise = null;
  }

  init() {
    if (this.initialized) return;

    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      this.ctx = new AudioContext();

      // Master gain
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.setValueAtTime(0.7, this.ctx.currentTime);
      this.masterGain.connect(this.ctx.destination);

      // Setup continuous engine sound
      this.setupEngineSound();

      // Setup continuous skid sound
      this.setupSkidSound();

      this.initialized = true;
    } catch (e) {
      console.warn("Web Audio API not supported or failed to initialize:", e);
    }
  }

  resume() {
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  setupEngineSound() {
    if (!this.ctx) return;

    // Dual oscillator engine roar
    this.engineOsc1 = this.ctx.createOscillator();
    this.engineOsc1.type = 'sawtooth';
    this.engineOsc1.frequency.setValueAtTime(45, this.ctx.currentTime);

    this.engineOsc2 = this.ctx.createOscillator();
    this.engineOsc2.type = 'triangle';
    this.engineOsc2.frequency.setValueAtTime(90, this.ctx.currentTime);

    this.engineFilter = this.ctx.createBiquadFilter();
    this.engineFilter.type = 'lowpass';
    this.engineFilter.frequency.setValueAtTime(280, this.ctx.currentTime);
    this.engineFilter.Q.setValueAtTime(3.0, this.ctx.currentTime);

    // Distortion shaper for growl
    const waveShaper = this.ctx.createWaveShaper();
    waveShaper.curve = this.makeDistortionCurve(20);

    this.engineGain = this.ctx.createGain();
    this.engineGain.gain.setValueAtTime(0.05, this.ctx.currentTime);

    this.engineOsc1.connect(waveShaper);
    this.engineOsc2.connect(waveShaper);
    waveShaper.connect(this.engineFilter);
    this.engineFilter.connect(this.engineGain);
    this.engineGain.connect(this.masterGain);

    this.engineOsc1.start();
    this.engineOsc2.start();
  }

  setupSkidSound() {
    if (!this.ctx) return;

    // Buffer of white noise
    const bufferSize = this.ctx.sampleRate * 2;
    const noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const output = noiseBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      output[i] = Math.random() * 2 - 1;
    }

    const whiteNoise = this.ctx.createBufferSource();
    whiteNoise.buffer = noiseBuffer;
    whiteNoise.loop = true;

    const skidFilter = this.ctx.createBiquadFilter();
    skidFilter.type = 'bandpass';
    skidFilter.frequency.setValueAtTime(1400, this.ctx.currentTime);
    skidFilter.Q.setValueAtTime(2.5, this.ctx.currentTime);

    this.skidGain = this.ctx.createGain();
    this.skidGain.gain.setValueAtTime(0, this.ctx.currentTime);

    whiteNoise.connect(skidFilter);
    skidFilter.connect(this.skidGain);
    this.skidGain.connect(this.masterGain);

    whiteNoise.start();
  }

  updateEngine(speed, maxSpeed, isAccelerating) {
    if (!this.initialized || !this.ctx || this.isMuted) return;

    const normSpeed = Math.min(1.0, Math.abs(speed) / maxSpeed);
    const baseFreq = 40 + normSpeed * 110 + (isAccelerating ? 25 : 0);
    const filterFreq = 200 + normSpeed * 900 + (isAccelerating ? 300 : 0);
    const volume = 0.08 + normSpeed * 0.16 + (isAccelerating ? 0.06 : 0);

    const t = this.ctx.currentTime;
    this.engineOsc1.frequency.setTargetAtTime(baseFreq, t, 0.08);
    this.engineOsc2.frequency.setTargetAtTime(baseFreq * 1.5, t, 0.08);
    this.engineFilter.frequency.setTargetAtTime(filterFreq, t, 0.08);
    this.engineGain.gain.setTargetAtTime(volume, t, 0.08);
  }

  updateSkid(driftIntensity) {
    if (!this.initialized || !this.ctx || this.isMuted) return;

    const targetGain = Math.min(0.25, driftIntensity * 0.25);
    this.skidGain.gain.setTargetAtTime(targetGain, this.ctx.currentTime, 0.05);
  }

  playCollision(intensity = 1.0) {
    if (!this.initialized || !this.ctx || this.isMuted) return;

    const t = this.ctx.currentTime;
    // Metal impact & sub thud
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(120 * intensity, t);
    osc.frequency.exponentialRampToValueAtTime(30, t + 0.15);

    gain.gain.setValueAtTime(0.4 * intensity, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.2);

    osc.connect(gain);
    gain.connect(this.masterGain);

    osc.start(t);
    osc.stop(t + 0.2);

    // Crunch noise
    this.playNoiseBurst(0.12, 0.25 * intensity, 800);
  }

  playRocketFire() {
    if (!this.initialized || !this.ctx || this.isMuted) return;

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(800, t);
    osc.frequency.exponentialRampToValueAtTime(140, t + 0.25);

    gain.gain.setValueAtTime(0.3, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.28);

    osc.connect(gain);
    gain.connect(this.masterGain);

    osc.start(t);
    osc.stop(t + 0.28);

    this.playNoiseBurst(0.22, 0.18, 1200);
  }

  playExplosion() {
    if (!this.initialized || !this.ctx || this.isMuted) return;

    const t = this.ctx.currentTime;

    // Deep sub-bass drop
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(150, t);
    osc.frequency.exponentialRampToValueAtTime(25, t + 0.6);

    gain.gain.setValueAtTime(0.7, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.65);

    osc.connect(gain);
    gain.connect(this.masterGain);

    osc.start(t);
    osc.stop(t + 0.65);

    // Rumble noise
    this.playNoiseBurst(0.8, 0.5, 400);
  }

  playCountdownBeep(isGo = false) {
    if (!this.initialized || !this.ctx || this.isMuted) return;

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = isGo ? 'sawtooth' : 'sine';
    osc.frequency.setValueAtTime(isGo ? 880 : 440, t);

    gain.gain.setValueAtTime(0.35, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + (isGo ? 0.7 : 0.25));

    osc.connect(gain);
    gain.connect(this.masterGain);

    osc.start(t);
    osc.stop(t + (isGo ? 0.7 : 0.25));
  }

  playNoiseBurst(duration, volume, filterFreq) {
    const bufferSize = this.ctx.sampleRate * duration;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufferSize * 0.3));
    }

    const source = this.ctx.createBufferSource();
    source.buffer = buffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(filterFreq, this.ctx.currentTime);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(volume, this.ctx.currentTime);

    source.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);

    source.start();
  }

  makeDistortionCurve(amount = 20) {
    const k = amount;
    const n_samples = 44100;
    const curve = new Float32Array(n_samples);
    const deg = Math.PI / 180;
    for (let i = 0; i < n_samples; ++i) {
      const x = (i * 2) / n_samples - 1;
      curve[i] = ((3 + k) * x * 20 * deg) / (Math.PI + k * Math.abs(x));
    }
    return curve;
  }
}
