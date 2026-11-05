const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const root = path.resolve(__dirname, '..');
function load(file, extras = {}) {
  const exports = {};
  vm.runInNewContext(ts.transpileModule(fs.readFileSync(path.join(root, file), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText, { exports, require: () => ({ isSolanaAddress: (value) => typeof value === 'string' && value.length >= 32 }), ...extras });
  return exports;
}
async function main() {
  const { recordEquity, equityRange, equityPath } = load('lib/portfolio-equity.ts');
  const now = 1800000000000, day = 86400000;
  let history = recordEquity([], 1000, now - 120000);
  history = recordEquity(history, 990, now - 60000);
  history = recordEquity(history, 1030, now);
  assert.equal(history.length, 3);
  const range = equityRange(history, 1035, '24h', now + 1000);
  assert.equal(range.change, 35);
  assert.equal(range.points.at(-1).value, 1035);
  assert.equal(range.points.at(-1).time, now + 1000);
  const sameMinute = recordEquity(recordEquity([], 1000, now), 999, now + 1000);
  assert.equal(sameMinute.length, 2);
  assert.equal(sameMinute[0].value, 1000);
  assert.equal(sameMinute.at(-1).value, 999);
  const periods = [{ time: now - 8 * day, value: 100 }, { time: now - 2 * day, value: 150 }, { time: now - 1000, value: 200 }];
  assert.equal(equityRange(periods, 220, '24h', now).change, 20);
  assert.equal(equityRange(periods, 220, '1w', now).change, 70);
  assert.equal(equityRange(periods, 220, '1m', now).change, 120);
  assert.equal(equityRange([], 220, '1y', now).change, 0);
  assert.equal(recordEquity(history, NaN, now), history);
  const dense = Array.from({ length: 20000 }, (_, i) => ({ time: now - i * 1000, value: 1000 + Math.sin(i) }));
  const compact = recordEquity(dense, 1050, now + 1000);
  assert(compact.length < 400);
  assert.equal(compact.at(-1).value, 1050);
  assert.equal(recordEquity([{ time: now - 366 * day, value: 10 }], 20, now).length, 1);
  for (const points of [range.points, [{ time: now, value: 1 }], [{ time: now - 1000, value: 0 }, { time: now, value: 0 }], dense.sort((a, b) => a.time - b.time)]) {
    const geometry = equityPath(points);
    assert(!/NaN|Infinity/.test(geometry.line));
    assert.equal(geometry.tip.x, 332);
    assert(geometry.tip.y >= 0 && geometry.tip.y <= 220);
    assert(geometry.line.split(' C ').length <= 401);
  }
  const mints = Array.from({ length: 35 }, (_, i) => String(i).padStart(32, 'a'));
  let calls = 0;
  const { fetchPortfolioPrices } = load('lib/portfolio-market.ts', {
    fetch: async (url) => {
      calls++;
      const batch = url.split('/').at(-1).split(',');
      assert(batch.length <= 30);
      return { ok: true, json: async () => batch.flatMap(mint => [
        { chainId: 'solana', baseToken: { address: mint }, priceUsd: '2', liquidity: { usd: 10 } },
        { chainId: 'solana', baseToken: { address: mint }, priceUsd: '3', liquidity: { usd: 100 } },
        { chainId: 'ethereum', baseToken: { address: mint }, priceUsd: '100', liquidity: { usd: 1000 } },
        { chainId: 'solana', baseToken: { address: mint }, priceUsd: 'NaN', liquidity: { usd: 2000 } },
      ]) };
    },
  });
  const prices = await fetchPortfolioPrices([...mints, mints[0]], new AbortController().signal);
  assert.equal(calls, 2);
  assert.equal(prices.size, 35);
  assert([...prices.values()].every(value => value === 3));
  const failed = load('lib/portfolio-market.ts', { fetch: async () => { throw Error('offline'); } });
  assert.equal((await failed.fetchPortfolioPrices(mints, new AbortController().signal)).size, 0);
  console.log('Passed: exact latest equity, period changes, first-observation preservation, bounded history/path size, finite flat/zero charts, price batching, mint/chain matching, invalid-price rejection, offline behavior.');
}
main().catch(error => { console.error(error); process.exitCode = 1; });
