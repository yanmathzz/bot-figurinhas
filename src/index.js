'use strict';

const path = require('node:path');
process.chdir(path.resolve(__dirname, '..'));
require('dotenv').config({ quiet: true });
const { Client, LocalAuth, MessageMedia } = require('whatsapp-web.js');
const qr = require('qrcode-terminal');
const QRCode = require('qrcode');
const { createPairingServer } = require('./pairing');
const { makeSticker } = require('./sticker');
const { createHandler } = require('./handler');

const mode = process.env.BOT_MODE || 'self';
const maxMb = Number(process.env.MAX_IMAGE_MB || 15);
if (!['self', 'private'].includes(mode) || !Number.isFinite(maxMb) || maxMb < 1 || maxMb > 30) {
  console.error('Confira .env: BOT_MODE deve ser self ou private e MAX_IMAGE_MB deve estar entre 1 e 30.');
  process.exit(1);
}
const puppeteer = { headless: true };
if (process.env.CHROME_PATH) puppeteer.executablePath = process.env.CHROME_PATH;
const client = new Client({
  authStrategy: new LocalAuth({ clientId: 'figurinhas' }),
  puppeteer
});
const pairing = createPairingServer({ port: Number(process.env.PAIRING_PORT || 8787) });
let qrVersion = 0;

client.on('qr', code => {
  const version = ++qrVersion;
  QRCode.toDataURL(code, { width: 360, margin: 4 }).then(image => {
    if (version === qrVersion) pairing.setState('qr', image);
  }).catch(error => console.error('Erro ao exibir QR:', error.message));
  console.log('\nNo celular: WhatsApp > Aparelhos conectados > Conectar aparelho.\nEscaneie o QR abaixo (ele se renova automaticamente):\n');
  qr.generate(code, { small: true });
});
client.on('authenticated', () => {
  qrVersion++;
  pairing.setState('authenticated');
  console.log('Conectado. Carregando WhatsApp...');
});
client.on('ready', () => {
  qrVersion++;
  pairing.setState('ready');
  console.log('\nBot pronto! ' + (mode === 'self'
    ? 'Envie fotos na conversa com você mesmo (Você).'
    : 'Envie fotos de outro número para o WhatsApp conectado.'));
  console.log('Legenda !quadrada para recortar. !ajuda para instruções. Ctrl+C para encerrar.');
});
client.on('message_create', createHandler({
  client, MessageMedia, makeSticker, mode,
  maxBytes: maxMb * 1024 * 1024,
  stickerName: (process.env.STICKER_NAME || 'Minhas figurinhas').slice(0, 64),
  stickerAuthor: (process.env.STICKER_AUTHOR || 'Feito por mim').slice(0, 64)
}));

let stopping = false;
async function shutdown(code = 0) {
  if (stopping) return;
  stopping = true;
  pairing.close();
  const timeout = setTimeout(() => process.exit(code), 8000);
  timeout.unref();
  try { await client.destroy(); } catch { /* Browser may already be closed. */ }
  process.exit(code);
}
client.on('auth_failure', () => {
  qrVersion++;
  pairing.setState('error');
  console.error('Falha na autenticação. Desconecte este aparelho pelo celular e tente novamente.');
  void shutdown(1);
});
client.on('disconnected', reason => {
  qrVersion++;
  pairing.setState('disconnected');
  console.error('WhatsApp desconectado:', reason, '\nExecute iniciar.bat novamente para reconectar.');
  void shutdown(1);
});
process.on('SIGINT', () => void shutdown());
process.on('SIGTERM', () => void shutdown());
console.log('Iniciando o bot de figurinhas...');
pairing.listen().then(port => {
  console.log('Abra para conectar: http://127.0.0.1:' + port);
  return client.initialize();
}).catch(error => {
  console.error('Não foi possível iniciar:', error.message);
  void shutdown(1);
});
