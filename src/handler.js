'use strict';

const HELP = 'Envie uma imagem aqui e eu devolvo uma figurinha! 🖼️\n\n' +
  'Sem legenda: mantém a imagem inteira.\n' +
  'Legenda !quadrada: recorta para preencher o quadrado.\n' +
  '!figurinha: responda uma imagem com esse comando.\n' +
  '!ajuda: mostra esta mensagem.\n\n' +
  'Figurinhas estáticas. A transparência existente é preservada; o fundo não é removido automaticamente.';

function isAllowed(msg, mode, selfIds = []) {
  const chatId = msg.fromMe ? msg.to : msg.from;
  if (!chatId || !/@(c\.us|lid)$/.test(chatId) || msg.isStatus) return false;
  if (mode === 'private') return !msg.fromMe;
  return Boolean(msg.fromMe && (msg.from === msg.to || selfIds.includes(msg.to)));
}

function createHandler({ client, makeSticker, MessageMedia, mode, maxBytes, stickerName, stickerAuthor, logger = console }) {
  const seen = new Set();
  let queue = Promise.resolve();
  let pending = 0;
  const startedAt = Math.floor(Date.now() / 1000);

  async function processMessage(msg) {
    const target = msg.fromMe ? msg.to : msg.from;
    const send = (content, options = {}) => client.sendMessage(target, content, { sendSeen: false, ...options });
    const command = (msg.body || '').trim().toLowerCase();
    if (command === '!ajuda') return send(HELP);
    let original = msg;
    if ((command === '!figurinha' || command === '!quadrada') && !msg.hasMedia) {
      if (!msg.hasQuotedMsg) return send('Responda uma imagem com !figurinha ou envie uma imagem diretamente.');
      original = await msg.getQuotedMessage();
    }
    // Stickers are deliberately ignored to prevent replying to our own output.
    if (!['image', 'document'].includes(original.type) || !original.hasMedia) return;
    try {
      const media = await original.downloadMedia();
      if (!media) throw new Error('Não consegui baixar a imagem. Reenvie a foto.');
      if (!media.mimetype?.startsWith('image/')) {
        if (command === '!figurinha' || command === '!quadrada') await send('Envie uma imagem JPG, PNG ou WebP.');
        return;
      }
      if (media.data.length > Math.ceil(maxBytes / 3) * 4 + 4) {
        throw new Error('Imagem muito grande. Envie uma imagem de até ' + Math.floor(maxBytes / 1024 / 1024) + ' MB.');
      }
      const input = Buffer.from(media.data, 'base64');
      if (input.length > maxBytes) throw new Error('Imagem acima do limite de tamanho.');
      const output = await makeSticker(input, { crop: command === '!quadrada' });
      await send(new MessageMedia('image/webp', output.toString('base64'), 'figurinha.webp'), {
        sendMediaAsSticker: true,
        stickerName,
        stickerAuthor
      });
      logger.log('Figurinha enviada.');
    } catch (error) {
      logger.error('Falha ao criar figurinha:', error.message);
      await send('Não consegui criar esta figurinha. Tente reenviar uma imagem JPG, PNG ou WebP menor.');
    }
  }

  return function handleMessage(msg) {
    const selfIds = [client.info?.wid?._serialized, client.info?.lid?._serialized].filter(Boolean);
    if (!isAllowed(msg, mode, selfIds)) return Promise.resolve();
    if (msg.timestamp && msg.timestamp < startedAt - 5) return Promise.resolve();
    const command = (msg.body || '').trim().toLowerCase();
    if (!['!ajuda', '!figurinha', '!quadrada'].includes(command) &&
        !(msg.hasMedia && ['image', 'document'].includes(msg.type))) return Promise.resolve();
    const id = msg.id?._serialized;
    if (!id || seen.has(id) || pending >= 20) return Promise.resolve();
    seen.add(id);
    if (seen.size > 1000) seen.delete(seen.values().next().value);
    pending++;
    queue = queue.then(() => processMessage(msg)).catch(error => {
      logger.error('Não foi possível responder:', error.message);
    }).finally(() => { pending--; });
    return queue;
  };
}

module.exports = { createHandler, isAllowed };
