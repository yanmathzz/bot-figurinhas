'use strict';

const http = require('node:http');

// Only available on this computer. Never exposes the login QR to the network.
function createPairingServer({ port = 8787 } = {}) {
  let state = { status: 'starting', qr: null };
  const html = `<!doctype html><html lang="pt-BR"><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Conectar bot de figurinhas</title>
<style>body{margin:0;background:#eef5f1;color:#172d24;font:17px system-ui,sans-serif;display:grid;place-items:center;min-height:100vh}main{background:white;border-radius:24px;padding:36px;max-width:520px;margin:24px;text-align:center;box-shadow:0 8px 40px #1232}h1{font-size:27px}img{width:320px;max-width:100%;image-rendering:pixelated}p{line-height:1.6}small{color:#55665d}</style>
<main><h1>Bot de figurinhas</h1><p id="status">Iniciando WhatsApp...</p>
<img id="qr" alt="QR code para conectar seu WhatsApp" hidden>
<p id="guide">No celular: <b>WhatsApp → Aparelhos conectados → Conectar aparelho</b>.</p>
<small>Esta página funciona somente neste computador. Mantenha o bot em execução.</small></main>
<script src="/app.js"></script></html>`;
  const script = `async function update(){try{const r=await fetch('/status',{cache:'no-store'});const s=await r.json();const img=document.getElementById('qr');img.hidden=!s.qr;if(s.qr)img.src=s.qr;
document.getElementById('status').textContent=({starting:'Iniciando WhatsApp...',qr:'Escaneie o QR code abaixo. Ele é atualizado automaticamente.',authenticated:'Conectado! Carregando WhatsApp...',ready:'Bot pronto! Envie uma imagem na conversa com você mesmo (Você).',disconnected:'WhatsApp desconectado. Reinicie o bot.',error:'Não foi possível conectar. Confira o registro do bot.'})[s.status]||s.status;
document.getElementById('guide').hidden=['authenticated','ready'].includes(s.status);
}catch{document.getElementById('status').textContent='O bot está desligado. Execute iniciar.bat para iniciar.';document.getElementById('qr').hidden=true;}}
update();setInterval(update,2000);`;
  const server = http.createServer((req, res) => {
    const allowedHosts = new Set([`127.0.0.1:${server.address().port}`, `localhost:${server.address().port}`]);
    if (!allowedHosts.has(req.headers.host)) {
      res.writeHead(403).end();
      return;
    }
    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Content-Security-Policy', "default-src 'self'; img-src data:; style-src 'unsafe-inline'; frame-ancestors 'none'");
    if (req.method !== 'GET') return void res.writeHead(405).end();
    if (req.url === '/') {
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' }).end(html);
    } else if (req.url === '/app.js') {
      res.writeHead(200, { 'Content-Type': 'application/javascript; charset=utf-8' }).end(script);
    } else if (req.url === '/status') {
      res.writeHead(200, { 'Content-Type': 'application/json' }).end(JSON.stringify(state));
    } else {
      res.writeHead(404).end();
    }
  });
  return {
    setState(status, qr = null) { state = { status, qr }; },
    listen() { return new Promise((resolve, reject) => {
      server.once('error', reject);
      server.listen(port, '127.0.0.1', () => resolve(server.address().port));
    }); },
    close() { server.close(); }
  };
}

module.exports = { createPairingServer };
