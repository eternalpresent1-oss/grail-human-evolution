import { Buffer } from 'node:buffer';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const RATE = 44100;
const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', 'assets', 'sounds');

function clamp(value) {
  return Math.max(-1, Math.min(1, value));
}

function writeWav(name, samples) {
  const data = Buffer.alloc(samples.length * 2);
  for (let i = 0; i < samples.length; i += 1) {
    data.writeInt16LE(Math.round(clamp(samples[i] ?? 0) * 32767), i * 2);
  }

  const header = Buffer.alloc(44);
  header.write('RIFF', 0);
  header.writeUInt32LE(36 + data.length, 4);
  header.write('WAVE', 8);
  header.write('fmt ', 12);
  header.writeUInt32LE(16, 16);
  header.writeUInt16LE(1, 20);
  header.writeUInt16LE(1, 22);
  header.writeUInt32LE(RATE, 24);
  header.writeUInt32LE(RATE * 2, 28);
  header.writeUInt16LE(2, 32);
  header.writeUInt16LE(16, 34);
  header.write('data', 36);
  header.writeUInt32LE(data.length, 40);

  writeFileSync(join(ROOT, name), Buffer.concat([header, data]));
}

function env(attack, hold, release, t, duration) {
  if (t < attack) {
    return t / attack;
  }
  if (t > duration - release) {
    return Math.max(0, (duration - t) / release);
  }
  if (t < hold) {
    return 1;
  }
  return 1;
}

function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function plink(samples, start, f0, f1, gain, k) {
  const startI = Math.max(0, Math.floor(start * RATE));
  let phase = 0;
  for (let i = startI; i < samples.length; i += 1) {
    const t = (i - startI) / RATE;
    if (t > 0.22) {
      break;
    }
    const freq = f1 + (f0 - f1) * Math.exp(-k * t);
    phase += (2 * Math.PI * freq) / RATE;
    const amp = Math.exp(-t * 16) * (1 - Math.exp(-t * 900));
    samples[i] = (samples[i] ?? 0) + Math.sin(phase) * amp * gain;
  }
}

function waterDrop() {
  const duration = 0.38;
  const n = Math.floor(RATE * duration);
  const samples = new Float64Array(n);
  const rnd = mulberry32(0x51a0);

  plink(samples, 0, 2650, 480, 0.78, 14);
  plink(samples, 0.012, 1480, 360, 0.22, 11);

  let lp = 0;
  let hp = 0;
  for (let i = 0; i < n; i += 1) {
    const t = i / RATE;
    const white = rnd() * 2 - 1;
    lp += 0.12 * (white - lp);
    hp = white - lp;
    const impact = t < 0.006 ? hp * (1 - t / 0.006) * 0.18 : 0;
    const bloom = t > 0.018 && t < 0.16 ? lp * Math.exp(-(t - 0.018) * 22) * 0.2 : 0;
    samples[i] = (samples[i] ?? 0) + impact + bloom;
  }

  return samples;
}

function scatter() {
  const duration = 0.72;
  const n = Math.floor(RATE * duration);
  const samples = new Float64Array(n);
  const rnd = mulberry32(0xc0bb1e);

  const grains = 64;
  for (let g = 0; g < grains; g += 1) {
    const u = g / grains;
    const start = (1 - (1 - u) ** 1.55) * 0.52 + rnd() * 0.03;
    const len = 0.004 + rnd() * 0.016;
    const gain = (0.08 + rnd() * 0.22) * (1 - u * 0.62);
    const cutoff = 900 + rnd() * 5200;
    const startI = Math.floor(start * RATE);
    const count = Math.floor(len * RATE);
    let lp = 0;
    for (let i = 0; i < count; i += 1) {
      const index = startI + i;
      if (index >= n) {
        break;
      }
      const t = i / RATE;
      const white = rnd() * 2 - 1;
      const a = Math.min(1, cutoff / 8000);
      lp += a * (white - lp);
      const envAmp = Math.sin(Math.PI * (t / len)) ** 1.4;
      samples[index] = (samples[index] ?? 0) + lp * envAmp * gain;
    }
  }

  for (let c = 0; c < 7; c += 1) {
    const start = 0.02 + rnd() * 0.28;
    const freq = 140 + rnd() * 220;
    const startI = Math.floor(start * RATE);
    for (let i = 0; i < Math.floor(0.03 * RATE); i += 1) {
      const index = startI + i;
      if (index >= n) {
        break;
      }
      const t = i / RATE;
      samples[index] =
        (samples[index] ?? 0) + Math.sin(2 * Math.PI * freq * t) * Math.exp(-t * 90) * 0.12;
    }
  }

  return samples;
}

function fluteNote(samples, start, duration, hz, gain) {
  const startI = Math.floor(start * RATE);
  const n = Math.floor(duration * RATE);
  let phase = 0;
  const rnd = mulberry32(0x11 + Math.floor(hz));

  for (let i = 0; i < n; i += 1) {
    const t = i / RATE;
    const vibrato = 1 + 0.012 * Math.sin(2 * Math.PI * 4.6 * t);
    phase += (2 * Math.PI * hz * vibrato) / RATE;
    const breath = rnd() * 0.04 + Math.sin(phase * 2) * 0.12 + Math.sin(phase);
    const air = env(0.08, duration * 0.35, 0.28, t, duration);
    const index = startI + i;
    if (index < samples.length) {
      samples[index] = (samples[index] ?? 0) + breath * air * gain;
    }
  }
}

function fluteLoop() {
  const duration = 18;
  const samples = new Float64Array(Math.floor(RATE * duration));
  const Fs3 = 185.0;
  const Cs4 = 277.18;
  const Fs4 = 369.99;
  const A4 = 440.0;
  const B4 = 493.88;
  const Cs5 = 554.37;

  fluteNote(samples, 0.4, 2.6, Fs4, 0.22);
  fluteNote(samples, 2.6, 2.2, A4, 0.18);
  fluteNote(samples, 5.1, 3.1, Cs4, 0.2);
  fluteNote(samples, 8.4, 2.4, B4, 0.16);
  fluteNote(samples, 10.6, 2.8, Fs3, 0.24);
  fluteNote(samples, 13.6, 3.4, Cs5, 0.14);

  let peak = 0.0001;
  for (const sample of samples) {
    peak = Math.max(peak, Math.abs(sample));
  }
  const scale = 0.72 / peak;
  for (let i = 0; i < samples.length; i += 1) {
    samples[i] = (samples[i] ?? 0) * scale;
  }

  return samples;
}

function normalize(samples, peakTarget = 0.86) {
  let peak = 0.0001;
  for (const sample of samples) {
    peak = Math.max(peak, Math.abs(sample));
  }
  const scale = peakTarget / peak;
  for (let i = 0; i < samples.length; i += 1) {
    samples[i] = (samples[i] ?? 0) * scale;
  }
  return samples;
}

mkdirSync(ROOT, { recursive: true });
writeWav('drop.wav', normalize(waterDrop(), 0.9));
writeWav('shatter.wav', normalize(scatter(), 0.84));
writeWav('flute.wav', fluteLoop());
console.log('wrote grail sounds');
