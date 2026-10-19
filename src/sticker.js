'use strict';

const sharp = require('sharp');

const MAX_STICKER_BYTES = 100 * 1024;

async function makeSticker(input, { crop = false } = {}) {
  // Decode only the first frame; this bot produces static stickers.
  const source = sharp(input, { limitInputPixels: 40_000_000, animated: false });
  const metadata = await source.metadata();
  if (!['jpeg', 'png', 'webp', 'gif', 'avif', 'heif', 'tiff'].includes(metadata.format)) {
    throw new Error('Formato de imagem não suportado. Envie JPG, PNG ou WebP.');
  }
  const image = source.rotate().resize(512, 512, {
    fit: crop ? 'cover' : 'contain',
    position: 'centre',
    background: { r: 0, g: 0, b: 0, alpha: 0 }
  });
  // Leave room for the sticker pack metadata added by WhatsApp Web.js.
  for (const quality of [85, 70, 55, 40, 25, 10, 1]) {
    const result = await image.clone().webp({ quality, alphaQuality: quality, effort: 4 }).toBuffer();
    if (result.length <= MAX_STICKER_BYTES - 4096) return result;
  }
  throw new Error('Esta imagem ficou muito complexa. Tente uma imagem mais simples ou menor.');
}

module.exports = { makeSticker, MAX_STICKER_BYTES };
