const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const root = path.resolve(__dirname, '..');

function environment(respond) {
  let now = 1800000000000;
  const modules = new Map();
  const calls = [];
  class Clock extends Date { static now() { return now; } }
  function load(file) {
    file = path.resolve(root, file);
    if (modules.has(file)) return modules.get(file);
    const exports = {};
    modules.set(file, exports);
    vm.runInNewContext(ts.transpileModule(fs.readFileSync(file, 'utf8'), {
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
    }).outputText, {
      exports, require: (name) => name.startsWith('.') ? load(path.resolve(path.dirname(file), `${name}.ts`)) : require(name),
      process: { env: {} }, URL, Date: Clock, AbortController, setTimeout, clearTimeout,
      fetch: async (url) => { calls.push(url); return { ok: true, json: async () => respond(url, now) }; },
    });
    return exports;
  }
  return { api: load('lib/public-data.ts'), normalize: load('lib/candles.ts').normalizeCandles, calls, advance: (ms) => { now += ms; } };
}

async function main() {
  const env = environment((url, now) => {
    if (url.includes('/tokens/mint/pools')) return { data: [{ attributes: { address: 'pool' }, relationships: { base_token: { data: { id: 'solana_mint' } } } }] };
    if (url.includes('/ohlcv/')) {
      assert(url.includes('token=base'));
      const t = Math.floor(now / 1000 / 60) * 60;
      return { data: { attributes: { ohlcv_list: [[t, 1, 2, 1, 1.2, 2], [t - 60, 1, 1.2, 1, 1.1, 3]] } } };
    }
    throw Error(`Unexpected request: ${url}`);
  });
  const [a, b] = await Promise.all([env.api.fetchPublicOhlcv('mint', '1m', 1.3), env.api.fetchPublicOhlcv('mint', '1m', 1.4)]);
  assert.equal(env.calls.filter(url => url.includes('/ohlcv/')).length, 1);
  assert.equal(a.at(-1).close, 1.3);
  assert.equal(b.at(-1).close, 1.4);
  assert.equal(env.api.readCachedOhlcv('mint', '1m').at(-1).close, 1.2);
  assert.equal(env.api.readCachedOhlcv('other', '1m'), null);
  assert.equal(env.api.readCachedOhlcv('mint', '5m'), null);
  await env.api.fetchPublicOhlcv('mint', '1m', 1.5);
  assert.equal(env.calls.length, 2);

  const normalized = env.normalize([
    { time: 1800000000000, open: NaN, high: NaN, low: -1, close: 2, volume: NaN },
    { time: 1800000000, open: 1, high: 4, low: 1, close: 3, volume: 5 },
    { time: 1800000060, open: 3, high: 5, low: 2, close: 4, volume: 6 },
    { time: 1800000061, close: NaN },
  ], 3600);
  assert.equal(normalized.length, 1);
  assert.equal(normalized[0].open, 1);
  assert.equal(normalized[0].close, 4);
  assert.equal(normalized[0].high, 5);
  assert.equal(normalized[0].low, 1);
  assert.equal(normalized[0].volume, 11);
  assert(Object.values(normalized[0]).every(Number.isFinite));

  let offline = false;
  const fallback = environment((url, now) => {
    if (url.includes('/pools') || url.includes('dexscreener')) return {};
    if (url.includes('/tokens/new')) return offline ? {} : { data: { token: { pool: 'launch', quote: { symbol: 'USDC' } } } };
    if (url.includes('/kline')) {
      assert(url.includes('interval=15m'));
      const t = Math.floor(now / 1000 / 3600) * 3600;
      return { data: { rows: Array.from({ length: 8 }, (_, i) => ({ t: (t - (7 - i) * 900) * 1000, o: 1 + i, h: 3 + i, l: 0.5 + i, c: 2 + i })) } };
    }
    throw Error(url);
  });
  const hourly = await fallback.api.fetchPublicOhlcv('new', '1h');
  assert(hourly.length >= 2);
  assert(hourly.every(row => row.time % 3600 === 0 && row.time < 1e12));
  const good = JSON.stringify(hourly);
  offline = true;
  fallback.advance(16000);
  const stale = await fallback.api.fetchPublicOhlcv('new', '1h');
  assert.equal(JSON.stringify(stale), good);
  assert.equal(fallback.calls.filter(url => url.includes('/tokens/new/pools')).length, 2);
  const before = fallback.calls.length;
  await fallback.api.fetchPublicOhlcv('new', '1h');
  assert.equal(fallback.calls.length, before);
  console.log('Passed: shared requests, independent live prices, cache isolation, normalization, deduplication, hourly fallback aggregation, millisecond timestamps, stale-cache retention, missing-pool retry, failure backoff.');
}
main().catch(error => { console.error(error); process.exitCode = 1; });
