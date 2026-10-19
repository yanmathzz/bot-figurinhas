'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { createHandler, isAllowed } = require('../src/handler');

function message(overrides = {}) {
  return {
    id: { _serialized: 'msg-1' }, fromMe: true,
    from: '5511999999999@c.us', to: '5511999999999@c.us',
    type: 'image', hasMedia: true, body: '', timestamp: Math.floor(Date.now() / 1000),
    downloadMedia: async () => ({ mimetype: 'image/png', data: Buffer.from('fake-image').toString('base64') }),
    ...overrides
  };
}

function fixture(extra = {}) {
  const sent = [];
  const conversions = [];
  const handler = createHandler({
    client: { info: { wid: { _serialized: '5511999999999@c.us' } }, sendMessage: async (...args) => { sent.push(args); } },
    makeSticker: async (buffer, options) => { conversions.push({ buffer, options }); return Buffer.from('webp'); },
    MessageMedia: class { constructor(mimetype, data) { this.mimetype = mimetype; this.data = data; } },
    mode: 'self', maxBytes: 1024, stickerName: 'Meu pacote', stickerAuthor: 'Eu',
    logger: { log() {}, error() {} }, ...extra
  });
  return { handler, sent, conversions };
}

test('modo pessoal só aceita conversa própria e nunca grupos/status', () => {
  assert.equal(isAllowed(message(), 'self'), true);
  assert.equal(isAllowed(message({ to: 'outro@c.us' }), 'self'), false);
  assert.equal(isAllowed(message({ fromMe: false }), 'self'), false);
  assert.equal(isAllowed(message({ from: 'grupo@g.us', to: 'grupo@g.us' }), 'self'), false);
  assert.equal(isAllowed(message({ isStatus: true }), 'self'), false);
  assert.equal(isAllowed(message({ from: 'eu@lid', to: 'eu@lid' }), 'self'), true);
  assert.equal(isAllowed(message({ from: 'eu@lid' }), 'self', ['5511999999999@c.us']), true);
});

test('modo privado aceita imagens recebidas, ignora mensagens próprias', () => {
  assert.equal(isAllowed(message({ fromMe: false, from: 'outro@lid' }), 'private'), true);
  assert.equal(isAllowed(message(), 'private'), false);
  assert.equal(isAllowed(message({ fromMe: false, from: 'grupo@g.us' }), 'private'), false);
});

test('envia figurinha, aplica recorte e não processa duplicatas nem próprias figurinhas', async () => {
  const { handler, sent, conversions } = fixture();
  const image = message({ body: '!quadrada' });
  await handler(image);
  await handler(image);
  await handler(message({ id: { _serialized: 'output' }, type: 'sticker' }));
  assert.equal(sent.length, 1);
  assert.equal(conversions.length, 1);
  assert.equal(conversions[0].options.crop, true);
  assert.equal(sent[0][1].mimetype, 'image/webp');
  assert.equal(sent[0][2].sendMediaAsSticker, true);
  assert.equal(sent[0][0], image.to);
});

test('comando como resposta converte imagem citada', async () => {
  const { handler, sent } = fixture();
  await handler(message({ type: 'chat', hasMedia: false, body: '!figurinha', hasQuotedMsg: true, getQuotedMessage: async () => message() }));
  assert.equal(sent[0][2].sendMediaAsSticker, true);
});

test('limite de bytes e erro de download não impedem imagem seguinte', async () => {
  const { handler, sent, conversions } = fixture({ maxBytes: 2 });
  await handler(message());
  await handler(message({ id: { _serialized: 'bad-download' }, downloadMedia: async () => { throw new Error('offline'); } }));
  await handler(message({ id: { _serialized: 'good' }, downloadMedia: async () => ({ mimetype: 'image/png', data: 'YQ==' }) }));
  assert.equal(sent.length, 3);
  assert.equal(conversions.length, 1);
  assert.equal(sent[2][2].sendMediaAsSticker, true);
});

test('ignora histórico antigo e documentos que não sejam imagens', async () => {
  const { handler, sent, conversions } = fixture();
  await handler(message({ timestamp: 1 }));
  await handler(message({ id: { _serialized: 'pdf' }, type: 'document', downloadMedia: async () => ({ mimetype: 'application/pdf', data: 'YQ==' }) }));
  assert.equal(sent.length, 0);
  assert.equal(conversions.length, 0);
});

test('processa imagens em sequência mesmo quando chegam juntas', async () => {
  let active = 0;
  let peak = 0;
  const { handler, sent } = fixture({ makeSticker: async () => {
    active++;
    peak = Math.max(active, peak);
    await new Promise(resolve => setTimeout(resolve, 10));
    active--;
    return Buffer.from('webp');
  } });
  await Promise.all([handler(message()), handler(message({ id: { _serialized: 'second' } }))]);
  assert.equal(peak, 1);
  assert.equal(sent.length, 2);
});
