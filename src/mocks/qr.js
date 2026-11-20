// Makes a QR-looking PNG (base64) with no dependencies, for mock labels only.
// Stored (uncompressed) deflate keeps the encoder tiny. This is NOT a scannable QR code.

const CRC = (() => {
  const t = new Uint32Array(256)
  for (let n = 0; n < 256; n++) {
    let c = n
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    t[n] = c >>> 0
  }
  return t
})()

const crc32 = (bytes) => {
  let c = 0xffffffff
  for (const b of bytes) c = CRC[(c ^ b) & 255] ^ (c >>> 8)
  return (c ^ 0xffffffff) >>> 0
}
const adler32 = (bytes) => {
  let a = 1
  let b = 0
  for (const x of bytes) {
    a = (a + x) % 65521
    b = (b + a) % 65521
  }
  return ((b << 16) | a) >>> 0
}
const u32 = (n) => [(n >>> 24) & 255, (n >>> 16) & 255, (n >>> 8) & 255, n & 255]
const ascii = (s) => [...s].map((c) => c.charCodeAt(0))

function chunk(type, data) {
  const body = [...ascii(type), ...data]
  return [...u32(data.length), ...body, ...u32(crc32(body))]
}

function modules(seed, n = 25) {
  let h = 2166136261
  for (const ch of seed) h = Math.imul(h ^ ch.charCodeAt(0), 16777619)
  const rnd = () => ((h = Math.imul(h ^ (h >>> 15), 2246822507) + 0x9e3779b9), ((h >>> 0) % 1000) / 1000)
  const m = Array.from({ length: n }, () => Array.from({ length: n }, () => rnd() > 0.5))
  const finder = (r0, c0) => {
    for (let r = -1; r <= 7; r++)
      for (let c = -1; c <= 7; c++) {
        const rr = r0 + r
        const cc = c0 + c
        if (rr < 0 || cc < 0 || rr >= n || cc >= n) continue
        const edge = r === 0 || r === 6 || c === 0 || c === 6
        m[rr][cc] = r >= 0 && r <= 6 && c >= 0 && c <= 6 && (edge || (r >= 2 && r <= 4 && c >= 2 && c <= 4))
      }
  }
  finder(0, 0)
  finder(0, n - 7)
  finder(n - 7, 0)
  return m
}

export function makeQrPng(seed) {
  const m = modules(seed)
  const quiet = 2
  const scale = 8
  const size = (m.length + quiet * 2) * scale
  const rowBytes = Math.ceil(size / 8)

  const raw = []
  for (let y = 0; y < size; y++) {
    raw.push(0) // filter: none
    const row = new Uint8Array(rowBytes).fill(255) // 1 = white
    for (let x = 0; x < size; x++) {
      const r = Math.floor(y / scale) - quiet
      const c = Math.floor(x / scale) - quiet
      if (m[r]?.[c]) row[x >> 3] &= ~(0x80 >> (x & 7)) // 0 = black
    }
    raw.push(...row)
  }

  const len = raw.length
  const zlib = [0x78, 0x01, 1, len & 255, len >> 8, ~len & 255, (~len >> 8) & 255, ...raw, ...u32(adler32(raw))]
  const png = [
    0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
    ...chunk('IHDR', [...u32(size), ...u32(size), 1, 0, 0, 0, 0]),
    ...chunk('IDAT', zlib),
    ...chunk('IEND', []),
  ]
  return btoa(String.fromCharCode(...png))
}
