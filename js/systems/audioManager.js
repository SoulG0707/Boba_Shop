class AudioManager {
  constructor() {
    this.context = null;
    this.musicEnabled = true;
    this.sfxEnabled = true;
    this.musicVolume = 0.16;
    this.sfxVolume = 0.28;
    this.musicTimer = null;
    this.musicStep = 0;
  }

  unlock() {
    if (typeof window === "undefined") return false;
    const AudioContextClass = window.AudioContext ?? window.webkitAudioContext;
    if (!AudioContextClass) return false;
    if (!this.context) this.context = new AudioContextClass();
    if (this.context.state === "suspended") this.context.resume();
    return true;
  }

  playMusic() {
    if (!this.musicEnabled || !this.unlock() || this.musicTimer) return;
    this.playMusicNote();
    this.musicTimer = window.setInterval(() => this.playMusicNote(), 2_400);
  }

  stopMusic() {
    if (this.musicTimer) window.clearInterval(this.musicTimer);
    this.musicTimer = null;
  }

  playMusicNote() {
    if (!this.context || !this.musicEnabled) return;
    const sequence = [392, 440, 523.25, 440, 349.23, 392, 440, 392];
    const frequency = sequence[this.musicStep % sequence.length];
    this.musicStep += 1;
    this.playTone(frequency, 1.1, this.musicVolume * 0.16, "sine");
    this.playTone(frequency * 1.5, 0.85, this.musicVolume * 0.07, "triangle", 0.08);
  }

  playSfx(kind = "tap") {
    if (!this.sfxEnabled || !this.unlock()) return;
    const tones = { tap: 620, mix: 390, bag: 540, cash: 880, bell: 740, levelup: 660 };
    const first = tones[kind] ?? tones.tap;
    this.playTone(first, kind === "mix" ? 0.22 : 0.12, this.sfxVolume * 0.2, "triangle");
    if (kind === "cash" || kind === "levelup") this.playTone(first * 1.25, 0.16, this.sfxVolume * 0.13, "sine", 0.1);
  }

  playTone(frequency, duration, volume, waveform, delay = 0) {
    if (!this.context) return;
    const start = this.context.currentTime + delay;
    const oscillator = this.context.createOscillator();
    const gain = this.context.createGain();
    oscillator.type = waveform;
    oscillator.frequency.setValueAtTime(frequency, start);
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(Math.max(0.0002, volume), start + 0.025);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
    oscillator.connect(gain).connect(this.context.destination);
    oscillator.start(start);
    oscillator.stop(start + duration + 0.02);
  }

  setMusicVolume(value) {
    this.musicVolume = Math.max(0, Math.min(1, Number(value) || 0));
    if (this.musicVolume === 0) this.stopMusic();
    else if (this.musicEnabled) this.playMusic();
  }

  setSfxVolume(value) {
    this.sfxVolume = Math.max(0, Math.min(1, Number(value) || 0));
  }

  setMusicEnabled(enabled) {
    this.musicEnabled = Boolean(enabled);
    if (this.musicEnabled) this.playMusic();
    else this.stopMusic();
  }

  setSfxEnabled(enabled) {
    this.sfxEnabled = Boolean(enabled);
  }
}

export const audioManager = new AudioManager();
