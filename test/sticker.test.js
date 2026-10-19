'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const sharp = require('sharp');
const { randomBytes } = require('node:crypto');
const { makeSticker, MAX_STICKER_BYTES } = require('../src/sticker');

test('imagem retangular vira WebP 512x512 com margens transparentes', async () => {
  const input = await sharp({ create: { width: 800, height: 400, channels: 3, background: '#f00' } }).jpeg().toBuffer();
  const result = await makeSticker(input);
  const metadata = await sharp(result).metadata();
  assert.equal(metadata.format, 'webp');
  assert.equal(metadata.width, 512);
  assert.equal(metadata.height, 512);
  assert.ok(result.length < MAX_STICKER_BYTES);
  const { data, info } = await sharp(result).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  assert.equal(data[3], 0);
  assert.equal(data[(256 * info.width + 256) * 4 + 3], 255);
});

test('recorte quadrado preenche a imagem e conserva alpha original', async () => {
  const solid = await sharp({ create: { width: 800, height: 300, channels: 3, background: '#00f' } }).png().toBuffer();
  const filled = await sharp(await makeSticker(solid, { crop: true })).ensureAlpha().raw().toBuffer();
  assert.equal(filled[3], 255);
  const transparent = await sharp({ create: { width: 64, height: 64, channels: 4, background: { r: 0, g: 255, b: 0, alpha: 0 } } }).png().toBuffer();
  const alpha = await sharp(await makeSticker(transparent)).ensureAlpha().raw().toBuffer();
  assert.equal(alpha[3], 0);
});

test('imagem ruidosa respeita limite da figurinha', async () => {
  const input = await sharp(randomBytes(512 * 512 * 3), { raw: { width: 512, height: 512, channels: 3 } }).png().toBuffer();
  const result = await makeSticker(input);
  assert.ok(result.length <= MAX_STICKER_BYTES - 4096);
});

test('entrada inválida e SVG são rejeitados', async () => {
  await assert.rejects(makeSticker(Buffer.from('isto não é uma imagem')));
  await assert.rejects(makeSticker(Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20"></svg>')), /não suportado/);
});
