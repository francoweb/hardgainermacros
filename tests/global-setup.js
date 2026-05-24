// @ts-check
'use strict';

/**
 * global-setup.js
 *
 * Aguarda o servidor local estar acessível antes de iniciar qualquer teste.
 * Evita falhas de timeout em C1/C2/C6/C7 quando o Live Server demora a arrancar.
 */

const http  = require('http');
const https = require('https');

const BASE_URL    = process.env.BASE_URL || 'http://127.0.0.1:5500';
const MAX_WAIT_MS = 30_000;
const POLL_MS     = 500;

/**
 * Tenta uma ligação ao servidor (http ou https). Resolve true se responder, false caso contrário.
 * @param {string} url
 */
function probe(url) {
  const lib = url.startsWith('https') ? https : http;
  return new Promise((resolve) => {
    const req = lib.get(url, (res) => {
      resolve((res.statusCode ?? 500) < 500);
      res.resume();
    });
    req.setTimeout(1000, () => { req.destroy(); resolve(false); });
    req.on('error', () => resolve(false));
  });
}

module.exports = async function globalSetup() {
  const deadline = Date.now() + MAX_WAIT_MS;
  process.stdout.write(`\n[setup] A aguardar servidor em ${BASE_URL}`);

  while (Date.now() < deadline) {
    if (await probe(BASE_URL)) {
      process.stdout.write(' — pronto.\n');
      return;
    }
    process.stdout.write('.');
    await new Promise(r => setTimeout(r, POLL_MS));
  }

  throw new Error(
    `\n[setup] Servidor não disponível em ${BASE_URL} após ${MAX_WAIT_MS / 1000}s.\n` +
    `Inicie o Live Server (porta 5500) antes de correr os testes.\n`
  );
};
