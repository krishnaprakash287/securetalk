import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const publicDir = path.resolve(__dirname, '../public');

// Minimal pure Node.js PNG encoder
function createPng(width, height, getPixel) {
  // getPixel(x, y) => [r, g, b, a] (0-255)
  const rowStride = 1 + width * 4;
  const rawData = Buffer.alloc(height * rowStride);

  for (let y = 0; y < height; y++) {
    const rowOffset = y * rowStride;
    rawData[rowOffset] = 0; // Filter type: None
    for (let x = 0; x < width; x++) {
      const [r, g, b, a] = getPixel(x, y);
      const pxOffset = rowOffset + 1 + x * 4;
      rawData[pxOffset] = r;
      rawData[pxOffset + 1] = g;
      rawData[pxOffset + 2] = b;
      rawData[pxOffset + 3] = a;
    }
  }

  const compressed = zlib.deflateSync(rawData);

  // PNG Signature
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  // CRC32 table
  const crcTable = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) {
      c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
    }
    crcTable[n] = c;
  }

  function crc32(buf) {
    let c = 0xffffffff;
    for (let i = 0; i < buf.length; i++) {
      c = crcTable[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
    }
    return (c ^ 0xffffffff) >>> 0;
  }

  function makeChunk(type, data) {
    const len = data.length;
    const buf = Buffer.alloc(12 + len);
    buf.writeUInt32BE(len, 0);
    buf.write(type, 4, 4, 'ascii');
    data.copy(buf, 8);
    const typeAndData = buf.subarray(4, 8 + len);
    const crc = crc32(typeAndData);
    buf.writeUInt32BE(crc, 8 + len);
    return buf;
  }

  // IHDR chunk
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // color type RGBA
  ihdr[10] = 0; // compression
  ihdr[11] = 0; // filter
  ihdr[12] = 0; // interlace

  const ihdrChunk = makeChunk('IHDR', ihdr);
  const idatChunk = makeChunk('IDAT', compressed);
  const iendChunk = makeChunk('IEND', Buffer.alloc(0));

  return Buffer.concat([signature, ihdrChunk, idatChunk, iendChunk]);
}

// 1. Generate favicon.png (32x32)
const faviconPng = createPng(32, 32, (x, y) => {
  // Dark slate background with emerald shield emblem
  const cx = 16, cy = 16;
  const dist = Math.hypot(x - cx, y - cy);
  // Shield shape approx
  const inShield = y >= 5 && y <= 27 && Math.abs(x - cx) <= (y > 18 ? (28 - y) * 1.2 : 9);
  if (inShield) {
    // Border or lock center
    if (Math.abs(x - cx) <= 3 && Math.abs(y - 16) <= 4) {
      return [16, 185, 129, 255]; // emerald #10b981
    }
    return [17, 24, 39, 255]; // dark slate #111827
  }
  if (dist < 15.5) {
    return [13, 19, 31, 255]; // #0d131f
  }
  return [0, 0, 0, 0];
});
fs.writeFileSync(path.join(publicDir, 'favicon.png'), faviconPng);

// 2. Generate apple-touch-icon.png (180x180)
const appleTouchIconPng = createPng(180, 180, (x, y) => {
  const cx = 90, cy = 90;
  // Rounded squircle container #0a0d14
  const inSquircle = Math.abs(x - cx) <= 80 && Math.abs(y - cy) <= 80;
  if (!inSquircle) return [0, 0, 0, 0];
  
  // Shield emblem inside
  const sy = (y - 30) / 120; // 0 to 1
  const sx = (x - 30) / 120; // 0 to 1
  const shieldDx = Math.abs(sx - 0.5);
  const maxDx = sy < 0.6 ? 0.38 : (1 - sy) * 0.95;
  const inShield = sy >= 0.05 && sy <= 0.95 && shieldDx <= maxDx;
  
  // Shield border
  const onBorder = inShield && (shieldDx >= maxDx - 0.04 || sy <= 0.08 || sy >= 0.91);
  if (onBorder) return [16, 185, 129, 255]; // emerald border

  if (inShield) {
    // Center lock emblem
    if (Math.abs(sx - 0.5) <= 0.12 && Math.abs(sy - 0.5) <= 0.15) {
      return [52, 211, 153, 255]; // lock emerald
    }
    return [17, 24, 39, 255];
  }
  
  return [10, 13, 20, 255]; // background
});
fs.writeFileSync(path.join(publicDir, 'apple-touch-icon.png'), appleTouchIconPng);

// 3. Generate og-image.png (1200x630)
const ogImagePng = createPng(1200, 630, (x, y) => {
  // Dark deep gradient background with subtle grid lines
  const isGrid = (x % 60 === 0 || y % 60 === 0) && (x > 200 && x < 1000 && y > 100 && y < 530);
  if (isGrid) return [20, 28, 45, 255];
  
  // Shield area on left/center
  const cx = 300, cy = 315;
  const dist = Math.hypot(x - cx, y - cy);
  if (dist < 140) {
    if (dist > 132) return [16, 185, 129, 255]; // emerald outer ring
    if (dist < 30) return [52, 211, 153, 255]; // center key node
    return [17, 24, 39, 255];
  }
  
  // General dark background
  return [10, 13, 20, 255];
});
fs.writeFileSync(path.join(publicDir, 'og-image.png'), ogImagePng);

console.log('Generated favicon.png, apple-touch-icon.png, og-image.png successfully.');
