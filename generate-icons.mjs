// Run once: node generate-icons.mjs
// Generates solid-color PNG icons for PWA — replace with real branded icons later
import { deflateSync } from 'zlib'
import { writeFileSync } from 'fs'

function crc32(buf) {
  const table = []
  for (let n = 0; n < 256; n++) {
    let c = n
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    table[n] = c
  }
  let crc = 0xffffffff
  for (const byte of buf) crc = table[(crc ^ byte) & 0xff] ^ (crc >>> 8)
  return (crc ^ 0xffffffff) >>> 0
}

function pngChunk(type, data) {
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length)
  const crcVal = Buffer.alloc(4); crcVal.writeUInt32BE(crc32(Buffer.concat([Buffer.from(type), data])))
  return Buffer.concat([len, Buffer.from(type), data, crcVal])
}

function makePNG(size, r, g, b) {
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(size, 0); ihdr.writeUInt32BE(size, 4)
  ihdr[8] = 8; ihdr[9] = 2 // 8-bit RGB
  const row = Buffer.alloc(1 + size * 3)
  row[0] = 0 // filter none
  for (let x = 0; x < size; x++) { row[1 + x * 3] = r; row[2 + x * 3] = g; row[3 + x * 3] = b }
  const raw = Buffer.concat(Array(size).fill(row))
  return Buffer.concat([sig, pngChunk('IHDR', ihdr), pngChunk('IDAT', deflateSync(raw)), pngChunk('IEND', Buffer.alloc(0))])
}

// BazarMela brand blue
const [r, g, b] = [26, 86, 219]
writeFileSync('public/pwa-192.png', makePNG(192, r, g, b))
writeFileSync('public/pwa-512.png', makePNG(512, r, g, b))
writeFileSync('public/apple-touch-icon.png', makePNG(180, r, g, b))
console.log('✓ Icons generated in public/')
