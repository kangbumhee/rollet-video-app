// scripts/generateSounds.mjs
// Node.js로 간단한 WAV 사운드 파일 생성
import fs from 'fs';
import path from 'path';

const SAMPLE_RATE = 44100;

function createWavBuffer(samples) {
  const numSamples = samples.length;
  const buffer = Buffer.alloc(44 + numSamples * 2);

  // WAV header
  buffer.write('RIFF', 0);
  buffer.writeUInt32LE(36 + numSamples * 2, 4);
  buffer.write('WAVE', 8);
  buffer.write('fmt ', 12);
  buffer.writeUInt32LE(16, 16);
  buffer.writeUInt16LE(1, 20); // PCM
  buffer.writeUInt16LE(1, 22); // mono
  buffer.writeUInt32LE(SAMPLE_RATE, 24);
  buffer.writeUInt32LE(SAMPLE_RATE * 2, 28);
  buffer.writeUInt16LE(2, 32);
  buffer.writeUInt16LE(16, 34);
  buffer.write('data', 36);
  buffer.writeUInt32LE(numSamples * 2, 40);

  for (let i = 0; i < numSamples; i++) {
    const val = Math.max(-1, Math.min(1, samples[i]));
    buffer.writeInt16LE(Math.round(val * 32767), 44 + i * 2);
  }
  return buffer;
}

function sine(freq, duration, volume = 0.5) {
  const samples = [];
  const numSamples = Math.floor(SAMPLE_RATE * duration);
  for (let i = 0; i < numSamples; i++) {
    const t = i / SAMPLE_RATE;
    const envelope = Math.min(1, (numSamples - i) / (SAMPLE_RATE * 0.05)); // fade out
    samples.push(Math.sin(2 * Math.PI * freq * t) * volume * envelope);
  }
  return samples;
}

function noise(duration, volume = 0.3) {
  const samples = [];
  const numSamples = Math.floor(SAMPLE_RATE * duration);
  for (let i = 0; i < numSamples; i++) {
    const envelope = Math.min(1, (numSamples - i) / (SAMPLE_RATE * 0.02));
    samples.push((Math.random() * 2 - 1) * volume * envelope);
  }
  return samples;
}

function concat(...arrays) {
  return arrays.flat();
}

function silence(duration) {
  return new Array(Math.floor(SAMPLE_RATE * duration)).fill(0);
}

const SOUNDS = {
  'countdown-tick': () => sine(800, 0.1, 0.6),
  'countdown-final': () => concat(sine(1000, 0.15, 0.7), silence(0.1), sine(1200, 0.15, 0.7), silence(0.1), sine(1500, 0.3, 0.8)),
  'correct': () => concat(sine(523, 0.1, 0.5), sine(659, 0.1, 0.5), sine(784, 0.2, 0.6)),
  'wrong': () => concat(sine(300, 0.15, 0.5), sine(250, 0.25, 0.4)),
  'coin-flip': () => concat(sine(2000, 0.03, 0.4), silence(0.03), sine(2500, 0.03, 0.4), silence(0.03), sine(3000, 0.03, 0.4), silence(0.03), sine(2000, 0.05, 0.3)),
  'dice-roll': () => {
    const s = [];
    for (let i = 0; i < 15; i++) {
      s.push(...noise(0.02, 0.4 - i * 0.02));
      s.push(...silence(0.02 + i * 0.005));
    }
    return s;
  },
  'slot-spin': () => {
    const s = [];
    for (let i = 0; i < 20; i++) {
      s.push(...sine(400 + i * 30, 0.04, 0.3));
      s.push(...silence(0.01));
    }
    return s;
  },
  'card-flip': () => concat(noise(0.02, 0.3), sine(1200, 0.05, 0.3)),
  'combo': () => concat(sine(523, 0.08, 0.5), sine(659, 0.08, 0.5), sine(784, 0.08, 0.5), sine(1047, 0.15, 0.6)),
  'new-record': () =>
    concat(
      sine(523, 0.1, 0.5),
      sine(659, 0.1, 0.5),
      sine(784, 0.1, 0.5),
      silence(0.05),
      sine(1047, 0.1, 0.6),
      sine(1047, 0.3, 0.7)
    ),
  'bomb-tick': () => concat(sine(600, 0.05, 0.4), silence(0.05), sine(600, 0.05, 0.4)),
  'explosion': () => {
    const s = noise(0.5, 0.8);
    // low pass simulation
    for (let i = 1; i < s.length; i++) s[i] = s[i] * 0.3 + s[i - 1] * 0.7;
    return s;
  },
  'horse-gallop': () => {
    const s = [];
    for (let i = 0; i < 8; i++) {
      s.push(...noise(0.03, 0.5));
      s.push(...silence(0.05));
      s.push(...noise(0.02, 0.3));
      s.push(...silence(0.1 - i * 0.005));
    }
    return s;
  },
  'cash-register': () => concat(sine(1500, 0.05, 0.5), sine(2000, 0.05, 0.5), silence(0.05), sine(2500, 0.15, 0.6)),
  'whoosh': () => {
    const s = [];
    const dur = 0.2;
    const numSamples = Math.floor(SAMPLE_RATE * dur);
    for (let i = 0; i < numSamples; i++) {
      const t = i / numSamples;
      const freq = 200 + t * 2000;
      const vol = Math.sin(Math.PI * t) * 0.4;
      s.push((Math.random() * 2 - 1) * vol * Math.sin(2 * Math.PI * freq * (i / SAMPLE_RATE)));
    }
    return s;
  },
  'pop-up': () => concat(sine(800, 0.05, 0.4), sine(1200, 0.08, 0.5)),
};

const outDir = path.join(process.cwd(), 'public', 'sounds');
if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

for (const [name, gen] of Object.entries(SOUNDS)) {
  const filePath = path.join(outDir, `${name}.wav`);
  if (fs.existsSync(filePath)) {
    const stat = fs.statSync(filePath);
    if (stat.size > 100) {
      console.log(`⏭️  ${name}.wav already exists (${stat.size} bytes), skipping`);
      continue;
    }
  }
  const samples = gen();
  const buf = createWavBuffer(samples);
  fs.writeFileSync(filePath, buf);
  console.log(`✅ Generated ${name}.wav (${buf.length} bytes)`);
}

console.log('\n🎵 Done! All sounds are in public/sounds/');
