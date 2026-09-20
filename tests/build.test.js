import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readdir } from 'node:fs/promises';
import path from 'node:path';
import { readDist } from './helpers.js';

const DIST = path.resolve(import.meta.dirname, '..', 'dist');

test('トップページが静的HTMLとして出力される', async () => {
  const html = await readDist('index.html');
  assert.match(html, /<html lang="ja">/);
  assert.match(html, /kyosu\.dev/);
});

test('JS が配信されない（React ランタイム含め dist/ に .js / .mjs が一切ない）', async () => {
  const entries = await readdir(DIST, { recursive: true });
  const jsFiles = entries.filter((p) => /\.m?js$/i.test(p));
  assert.deepEqual(jsFiles, [], `想定外の JS ファイルがある: ${jsFiles.join(', ')}`);
});

test('dist/CNAME にカスタムドメインが入る', async () => {
  const cname = await readDist('CNAME');
  assert.match(cname.trim(), /^kyosu\.dev$/);
});
