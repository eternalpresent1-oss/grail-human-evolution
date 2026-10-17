/**
 * Deterministic brand asset generator.
 *
 * Draws the GRAIL octagon mark mathematically into an RGBA buffer and encodes
 * PNGs by hand (IHDR + zlib-deflated IDAT + IEND) using only Node built-ins, so
 * the artwork can be regenerated on any machine with `node scripts/generate-brand-assets.mjs`.
 *
 * Edges are antialiased by supersampling: every output pixel averages SUPERSAMPLE^2
 * point samples of the shading function (box downsample).
 */
import { Buffer } from 'node:buffer';
import { deflateSync } from 'node:zlib';
import { spawnSync } from 'node:child_process';
import { mkdirSync, writeFileSync, readFileSync, statSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const ASSETS = resolve(ROOT, 'assets');

/** Brand palette, mirrored from src/theme/colors.ts. */
const VOID = [0x05, 0x03, 0x08];
const GOLD = [0xe8, 0xb8, 0x6d];
const IVORY = [0xf3, 0xe6, 0xc4];
const CYAN = [0x22, 0xd3, 0xee];
const CYAN_DEEP = [0x06, 0xb6, 0xd4];

const SIDES = 8;
const SUPERSAMPLE = 4;

// ---------------------------------------------------------------------------
// PNG encoding
// ---------------------------------------------------------------------------

const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n += 1) {
    let c = n;
    for (let k = 0; k < 8; k += 1) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
    table[n] = c >>> 0;
  }
  return table;
})();

function crc32(buffer) {
  let c = 0xffffffff;
  for (let i = 0; i < buffer.length; i += 1) {
    c = CRC_TABLE[(c ^ buffer[i]) & 0xff] ^ (c >>> 8);
  }
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length, 0);
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body), 0);
  return Buffer.concat([length, body, crc]);
}

/**
 * @param {number} width
 * @param {number} height
 * @param {Uint8Array} rgba premultiplied-free RGBA, 4 bytes per pixel
 * @param {boolean} opaque when true the alpha channel is dropped entirely (colour type 2),
 *   because the App Store rejects icons that carry an alpha channel
 */
function encodePng(width, height, rgba, opaque) {
  const channels = opaque ? 3 : 4;
  const colourType = opaque ? 2 : 6;

  const raw = Buffer.alloc(height * (1 + width * channels));
  let cursor = 0;
  for (let y = 0; y < height; y += 1) {
    raw[cursor] = 0; // filter: none
    cursor += 1;
    for (let x = 0; x < width; x += 1) {
      const source = (y * width + x) * 4;
      raw[cursor] = rgba[source];
      raw[cursor + 1] = rgba[source + 1];
      raw[cursor + 2] = rgba[source + 2];
      if (!opaque) {
        raw[cursor + 3] = rgba[source + 3];
      }
      cursor += channels;
    }
  }

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = colourType;
  ihdr[10] = 0; // deflate
  ihdr[11] = 0; // adaptive filtering
  ihdr[12] = 0; // no interlace

  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

// ---------------------------------------------------------------------------
// Geometry
// ---------------------------------------------------------------------------

/** Vertex convention shared with the in-app octagon chart. */
function vertexAngle(index) {
  return (index * 2 * Math.PI) / SIDES - Math.PI / 2;
}

const APOTHEM_RATIO = Math.cos(Math.PI / SIDES);

const EDGE_NORMALS = Array.from({ length: SIDES }, (_, i) => {
  const a = vertexAngle(i) + Math.PI / SIDES;
  return [Math.cos(a), Math.sin(a)];
});

/**
 * Signed distance to a regular octagon of circumradius `r` centred at the
 * origin: negative inside, positive outside, mitred at the corners.
 */
function octagonDistance(dx, dy, r) {
  const apothem = r * APOTHEM_RATIO;
  let best = -Infinity;
  for (let i = 0; i < SIDES; i += 1) {
    const projection = dx * EDGE_NORMALS[i][0] + dy * EDGE_NORMALS[i][1];
    if (projection > best) {
      best = projection;
    }
  }
  return best - apothem;
}

/** Distance from a point to the segment running from the origin to (vx, vy). */
function spokeDistance(dx, dy, vx, vy) {
  const lengthSquared = vx * vx + vy * vy;
  let t = (dx * vx + dy * vy) / lengthSquared;
  t = t < 0 ? 0 : t > 1 ? 1 : t;
  const px = dx - vx * t;
  const py = dy - vy * t;
  return Math.hypot(px, py);
}

// ---------------------------------------------------------------------------
// Shading
// ---------------------------------------------------------------------------

/** Source-over composite of [r,g,b] at `alpha` onto the accumulator. */
function over(acc, colour, alpha) {
  if (alpha <= 0) {
    return;
  }
  const a = alpha > 1 ? 1 : alpha;
  const outA = a + acc[3] * (1 - a);
  if (outA <= 0) {
    acc[0] = 0;
    acc[1] = 0;
    acc[2] = 0;
    acc[3] = 0;
    return;
  }
  for (let i = 0; i < 3; i += 1) {
    acc[i] = (colour[i] * a + acc[i] * acc[3] * (1 - a)) / outA;
  }
  acc[3] = outA;
}

/**
 * Colour of the mark at canvas point (x, y).
 *
 * @param {number} x
 * @param {number} y
 * @param {{ size: number, markFraction: number, opaque: boolean }} spec
 * @param {number[]} acc scratch [r, g, b, a] reused across samples
 */
function shade(x, y, spec, acc) {
  const cx = spec.cx ?? spec.size / 2;
  const cy = spec.cy ?? spec.size / 2;
  const outerR = spec.outerR ?? (spec.size * spec.markFraction) / 2;
  const midR = outerR * 0.8;
  const innerR = outerR * 0.6;

  const ringWidth = outerR * 0.075;
  const midWidth = outerR * 0.026;
  const coreWidth = outerR * 0.055;
  const spokeWidth = outerR * 0.02;
  const dotR = outerR * 0.078;

  const dx = x - cx;
  const dy = y - cy;
  const radius = Math.hypot(dx, dy);

  acc[0] = VOID[0];
  acc[1] = VOID[1];
  acc[2] = VOID[2];
  acc[3] = spec.opaque ? 1 : 0;

  // Cyan halo bloom behind the mark.
  const bloom = Math.exp(-((radius / (outerR * 0.62)) ** 2));
  over(acc, CYAN_DEEP, 0.2 * bloom);

  // Faint gold spokes from the centre to each vertex, chart-style.
  for (let i = 0; i < SIDES; i += 1) {
    const angle = vertexAngle(i);
    const vx = Math.cos(angle) * outerR;
    const vy = Math.sin(angle) * outerR;
    if (spokeDistance(dx, dy, vx, vy) <= spokeWidth / 2) {
      over(acc, GOLD, 0.28);
      break;
    }
  }

  // Translucent cyan core.
  const innerD = octagonDistance(dx, dy, innerR);
  if (innerD <= 0) {
    over(acc, CYAN_DEEP, 0.42);
  }
  if (Math.abs(innerD) <= coreWidth / 2) {
    over(acc, CYAN, 1);
  }

  // Inner grid ring.
  if (Math.abs(octagonDistance(dx, dy, midR)) <= midWidth / 2) {
    over(acc, GOLD, 0.3);
  }

  // Outer gold ring.
  if (Math.abs(octagonDistance(dx, dy, outerR)) <= ringWidth / 2) {
    over(acc, GOLD, 1);
  }

  // Bright vertex dots.
  for (let i = 0; i < SIDES; i += 1) {
    const angle = vertexAngle(i);
    const vx = Math.cos(angle) * outerR;
    const vy = Math.sin(angle) * outerR;
    const d = Math.hypot(dx - vx, dy - vy);
    if (d <= dotR) {
      over(acc, GOLD, 1);
    }
    if (d <= dotR * 0.46) {
      over(acc, IVORY, 1);
    }
  }
}

/** @param {{ size: number, markFraction: number, opaque: boolean }} spec */
function render(spec) {
  return renderCanvas(spec.size, spec.size, {
    cx: spec.size / 2,
    cy: spec.size / 2,
    outerR: (spec.size * spec.markFraction) / 2,
    opaque: spec.opaque,
  });
}

/**
 * @param {number} width
 * @param {number} height
 * @param {{ cx: number, cy: number, outerR: number, opaque: boolean }} spec
 * @param {number} [supersample]
 */
function renderCanvas(width, height, spec, supersample = SUPERSAMPLE) {
  const { opaque } = spec;
  const pixels = new Uint8Array(width * height * 4);
  const acc = [0, 0, 0, 0];
  const samples = supersample * supersample;
  const step = 1 / supersample;
  const offset = step / 2;

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      let r = 0;
      let g = 0;
      let b = 0;
      let a = 0;
      for (let sy = 0; sy < supersample; sy += 1) {
        for (let sx = 0; sx < supersample; sx += 1) {
          shade(x + sx * step + offset, y + sy * step + offset, spec, acc);
          r += acc[0] * acc[3];
          g += acc[1] * acc[3];
          b += acc[2] * acc[3];
          a += acc[3];
        }
      }

      const target = (y * width + x) * 4;
      if (a <= 0) {
        pixels[target] = 0;
        pixels[target + 1] = 0;
        pixels[target + 2] = 0;
        pixels[target + 3] = 0;
        continue;
      }
      pixels[target] = Math.round(r / a);
      pixels[target + 1] = Math.round(g / a);
      pixels[target + 2] = Math.round(b / a);
      pixels[target + 3] = opaque ? 255 : Math.round((a / samples) * 255);
    }
  }

  return pixels;
}

// ---------------------------------------------------------------------------
// Verification
// ---------------------------------------------------------------------------

const PNG_SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

/** Re-reads the file from disk and parses IHDR rather than trusting the write. */
function verify(file, expectedWidth, expectedHeight = expectedWidth) {
  const bytes = readFileSync(file);
  if (!bytes.subarray(0, 8).equals(PNG_SIGNATURE)) {
    throw new Error(`${file}: not a PNG`);
  }
  if (bytes.subarray(12, 16).toString('ascii') !== 'IHDR') {
    throw new Error(`${file}: missing IHDR`);
  }
  const width = bytes.readUInt32BE(16);
  const height = bytes.readUInt32BE(20);
  const colourType = bytes[25];
  const byteLength = statSync(file).size;

  if (width !== expectedWidth || height !== expectedHeight) {
    throw new Error(
      `${file}: expected ${expectedWidth}x${expectedHeight}, header says ${width}x${height}`
    );
  }
  if (byteLength < 256) {
    throw new Error(`${file}: suspiciously small (${byteLength} bytes)`);
  }

  return { width, height, colourType, byteLength };
}

// ---------------------------------------------------------------------------

/**
 * Four jobs, four files. Do not reuse one PNG for all of them.
 *
 * icon.png            iOS / legacy launcher. Opaque. Mark ~64% so the squircle
 *                     mask does not eat the cardinal vertices.
 * adaptive-icon.png   Android home-screen foreground. Transparent. Mark ~56% so
 *                     the 66% circular safe zone keeps every vertex.
 * splash-blank.png    Android system splash. Solid void, same colour as the
 *                     poster background, so the forced circle shows nothing.
 *                     The only launch picture is splash.png, drawn in the app.
 * splash.png          Full-screen poster (octagon + ARCHE). iOS launch image
 *                     and the in-app hold while the field is loading.
 */
const TARGETS = [
  { file: 'icon.png', size: 1024, markFraction: 0.64, opaque: true },
  { file: 'adaptive-icon.png', size: 1024, markFraction: 0.56, opaque: false },
  { file: 'splash-icon.png', size: 1024, markFraction: 0.6, opaque: true },
  { file: 'favicon.png', size: 48, markFraction: 0.86, opaque: true },
];

const BLANK = 64;
const blankPixels = new Uint8Array(BLANK * BLANK * 4);
for (let i = 0; i < blankPixels.length; i += 4) {
  blankPixels[i] = VOID[0];
  blankPixels[i + 1] = VOID[1];
  blankPixels[i + 2] = VOID[2];
  blankPixels[i + 3] = 255;
}

/** iPhone 11 Pro Max @3x. Octagon diameter = 80% of width. */
const SPLASH = {
  file: 'splash.png',
  width: 1242,
  height: 2688,
  cx: 621,
  cy: 967,
  outerR: 497,
};

mkdirSync(ASSETS, { recursive: true });

const blankPath = resolve(ASSETS, 'splash-blank.png');
writeFileSync(blankPath, encodePng(BLANK, BLANK, blankPixels, true));
const blankInfo = verify(blankPath, BLANK);
console.log(
  `assets/splash-blank.png: ${blankInfo.width}x${blankInfo.height} RGB (no alpha channel), ${blankInfo.byteLength} bytes — header verified`
);

const only = process.argv[2];

for (const target of TARGETS) {
  if (only === 'splash' && target.file !== 'splash-icon.png') {
    continue;
  }
  const spec = { size: target.size, markFraction: target.markFraction, opaque: target.opaque };
  const png = encodePng(target.size, target.size, render(spec), target.opaque);
  const path = resolve(ASSETS, target.file);
  writeFileSync(path, png);

  const info = verify(path, target.size);
  const alpha = info.colourType === 6 ? 'RGBA' : 'RGB (no alpha channel)';
  console.log(
    `assets/${target.file}: ${info.width}x${info.height} ${alpha}, ${info.byteLength} bytes — header verified`
  );
}

if (only !== 'icons') {
  const splashPixels = renderCanvas(
    SPLASH.width,
    SPLASH.height,
    { cx: SPLASH.cx, cy: SPLASH.cy, outerR: SPLASH.outerR, opaque: true },
    2
  );
  const splashPath = resolve(ASSETS, SPLASH.file);
  writeFileSync(splashPath, encodePng(SPLASH.width, SPLASH.height, splashPixels, true));
  const splashInfo = verify(splashPath, SPLASH.width, SPLASH.height);
  console.log(
    `assets/${SPLASH.file}: ${splashInfo.width}x${splashInfo.height} RGB (no alpha channel), ${splashInfo.byteLength} bytes — header verified`
  );

  const letterer = resolve(ROOT, 'scripts/letter-splash.py');
  const attempts = [
    ['python', [letterer]],
    ['py', ['-3', letterer]],
  ];
  let lettered = false;
  for (const [cmd, args] of attempts) {
    const result = spawnSync(cmd, args, { stdio: 'inherit', cwd: ROOT });
    if (result.status === 0) {
      lettered = true;
      break;
    }
  }
  if (!lettered) {
    throw new Error('letter-splash.py failed — install Pillow (`pip install pillow`) and retry');
  }
}
