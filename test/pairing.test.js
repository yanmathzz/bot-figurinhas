'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { createPairingServer } = require('../src/pairing');

test('página local atualiza QR e remove o código depois de conectar', async () => {
  const server = createPairingServer({ port: 0 });
  const port = await server.listen();
  const url = `http://127.0.0.1:${port}`;
  try {
    assert.equal((await fetch(url)).status, 200);
    server.setState('qr', 'data:image/png;base64,test');
    let result = await fetch(url + '/status');
    assert.equal(result.headers.get('cache-control'), 'no-store');
    assert.equal((await result.json()).qr, 'data:image/png;base64,test');
    server.setState('ready');
    result = await fetch(url + '/status');
    assert.deepEqual(await result.json(), { status: 'ready', qr: null });
    assert.equal((await fetch(url + '/status', { method: 'POST' })).status, 405);
  } finally { server.close(); }
});
