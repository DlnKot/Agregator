'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const { evaluatePing } = require('../src/main/utils/networkCheck');

test('evaluatePing: ok when latency below threshold and no loss', () => {
  const ping = { ok: true, lossPercent: 0, avgMs: 25 };
  const res = evaluatePing(ping, 100);
  assert.equal(res.status, 'ok');
});

test('evaluatePing: high_latency when avg above threshold', () => {
  const ping = { ok: true, lossPercent: 0, avgMs: 150 };
  const res = evaluatePing(ping, 100);
  assert.equal(res.status, 'high_latency');
});

test('evaluatePing: loss when packet loss is non-zero', () => {
  const ping = { ok: true, lossPercent: 10, avgMs: 10 };
  const res = evaluatePing(ping, 100);
  assert.equal(res.status, 'loss');
});

test('evaluatePing: error when ping failed', () => {
  const ping = { ok: false, error: 'host down' };
  const res = evaluatePing(ping, 100);
  assert.equal(res.status, 'error');
});
