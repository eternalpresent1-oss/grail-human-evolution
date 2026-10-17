import { Buffer } from 'node:buffer';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = join(ROOT, 'assets', 'sounds');

function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) >>> 0;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function encodeWav(samples, sampleRate) {
  const n = samples.length;
  const buffer = Buffer.alloc(44 + n * 2);
  buffer.write('RIFF', 0);
  buffer.writeUInt32LE(36 + n * 2, 4);
  buffer.write('WAVE', 8);
  buffer.write('fmt ', 12);
  buffer.writeUInt32LE(16, 16);
  buffer.writeUInt16LE(1, 20);
  buffer.writeUInt16LE(1, 22);
  buffer.writeUInt32LE(sampleRate, 24);
  buffer.writeUInt32LE(sampleRate * 2, 28);
  buffer.writeUInt16LE(2, 32);
  buffer.writeUInt16LE(16, 34);
  buffer.write('data', 36);
  buffer.writeUInt32LE(n * 2, 40);

  for (let i = 0; i < n; i += 1) {
    const clamped = Math.max(-1, Math.min(1, samples[i] ?? 0));
    buffer.writeInt16LE(clamped < 0 ? Math.round(clamped * 0x8000) : Math.round(clamped * 0x7fff), 44 + i * 2);
  }

  return buffer;
}

function mixTone(out, sampleRate, start, duration, freq, amp, { attack = 0.08, release = 0.22, chiff = 0.05 } = {}) {
  const rand = mulberry32(Math.round(freq * 100 + start * 1000));
  const n0 = Math.floor(start * sampleRate);
  const n1 = Math.min(out.length, n0 + Math.floor(duration * sampleRate));
  let phase = 0;

  for (let i = n0; i < n1; i += 1) {
    const local = (i - n0) / sampleRate;
    const remain = (n1 - i) / sampleRate;
    const env = Math.min(1, local / attack) * Math.min(1, remain / release);
    const vib = 1 + 0.011 * Math.sin(2 * Math.PI * 4.6 * local);
    phase += (freq * vib) / sampleRate;
    const sine = Math.sin(2 * Math.PI * phase);
    const second = 0.16 * Math.sin(4 * Math.PI * phase);
    const air = (rand() * 2 - 1) * 0.035 * env;
    const attackChiff = local < 0.035 ? (rand() * 2 - 1) * chiff * (1 - local / 0.035) : 0;
    out[i] += amp * env * (0.84 * sine + second) + air * amp + attackChiff * amp;
  }
}

function normalize(samples, peak = 0.89) {
  let max = 0;
  for (const sample of samples) {
    max = Math.max(max, Math.abs(sample));
  }
  if (max < 1e-6) {
    return samples;
  }
  const gain = peak / max;
  for (let i = 0; i < samples.length; i += 1) {
    samples[i] *= gain;
  }
  return samples;
}

function waterDrop(sampleRate) {
  const duration = 0.62;
  const n = Math.floor(sampleRate * duration);
  const out = new Float32Array(n);
  const rand = mulberry32(0x51f00d);

  const drip = (offset, scale) => {
    for (let i = 0; i < n; i += 1) {
      const t = i / sampleRate - offset;
      if (t < 0 || t > 0.45) {
        continue;
      }
      const env = Math.exp(-t * 9.2) * (t < 0.004 ? t / 0.004 : 1);
      const freq = 880 * Math.exp(-t * 6.1) + 118;
      const tone = Math.sin(2 * Math.PI * freq * t) + 0.22 * Math.sin(2 * Math.PI * freq * 1.47 * t);
      const splash = (rand() * 2 - 1) * Math.exp(-t * 38) * 0.22;
      out[i] += (tone * env * 0.72 + splash) * scale;
    }
  };

  drip(0, 1);
  drip(0.21, 0.38);
  return normalize(out, 0.72);
}

function shatter(sampleRate) {
  const duration = 0.55;
  const n = Math.floor(sampleRate * duration);
  const out = new Float32Array(n);
  const rand = mulberry32(0x5ca773);
  const rings = [1760, 2340, 2970, 3550, 4120];

  for (let i = 0; i < n; i += 1) {
    const t = i / sampleRate;
    let noise = 0;
    for (const at of [0, 0.028, 0.07, 0.118]) {
      const local = t - at;
      if (local >= 0) {
        noise += (rand() * 2 - 1) * Math.exp(-local * 28) * (at === 0 ? 0.55 : 0.28);
      }
    }
    let metal = 0;
    for (const freq of rings) {
      metal += Math.sin(2 * Math.PI * freq * t) * Math.exp(-t * (9 + freq / 800));
    }
    const grit = (rand() * 2 - 1) * Math.exp(-t * 14) * 0.22;
    out[i] = noise + metal * 0.12 + grit;
  }

  return normalize(out, 0.78);
}

function fluteLoop(sampleRate) {
  const duration = 22;
  const n = Math.floor(sampleRate * duration);
  const out = new Float32Array(n);
  const D4 = 293.66;
  const F4 = 349.23;
  const G4 = 392.0;
  const A4 = 440.0;
  const C5 = 523.25;
  const D5 = 587.33;
  const A3 = 220.0;
  const C4 = 261.63;

  const notes = [
    [0.6, A3, 2.4, 0.34],
    [2.4, D4, 2.1, 0.42],
    [4.2, F4, 1.6, 0.38],
    [5.6, G4, 2.2, 0.4],
    [7.5, A4, 1.5, 0.36],
    [8.8, F4, 2.4, 0.4],
    [11.0, D4, 1.8, 0.34],
    [12.4, C4, 1.4, 0.3],
    [13.6, D4, 2.6, 0.42],
    [15.8, A4, 1.7, 0.32],
    [17.2, C5, 1.3, 0.28],
    [18.3, A4, 1.6, 0.3],
    [19.6, G4, 1.8, 0.34],
    [20.8, D4, 1.1, 0.26],
  ];

  for (const [start, freq, dur, amp] of notes) {
    mixTone(out, sampleRate, start, dur, freq, amp);
  }

  mixTone(out, sampleRate, 3.1, 3.8, A3, 0.16, { attack: 0.4, release: 0.9, chiff: 0.02 });
  mixTone(out, sampleRate, 9.4, 4.2, D4 / 2, 0.14, { attack: 0.5, release: 1.1, chiff: 0.015 });
  mixTone(out, sampleRate, 16.2, 3.4, D5, 0.12, { attack: 0.2, release: 0.7, chiff: 0.03 });

  const fade = Math.floor(sampleRate * 0.8);
  for (let i = 0; i < fade; i += 1) {
    const gain = i / fade;
    out[i] *= gain;
    out[n - 1 - i] *= gain;
  }

  return normalize(out, 0.42);
}

mkdirSync(OUT, { recursive: true });
const rate = 22050;
writeFileSync(join(OUT, 'drop.wav'), encodeWav(waterDrop(rate), rate));
writeFileSync(join(OUT, 'shatter.wav'), encodeWav(shatter(rate), rate));
writeFileSync(join(OUT, 'flute.wav'), encodeWav(fluteLoop(rate), rate));
console.log('wrote drop.wav, shatter.wav, flute.wav');
