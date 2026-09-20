import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readDist } from './helpers.js';

test('トップページが静的HTMLとして出力される', async () => {
  const html = await readDist('index.html');
  assert.match(html, /<html lang="ja">/);
  assert.match(html, /kyosu\.dev/);
});

test('React のランタイムが配信されない', async () => {
  const html = await readDist('index.html');
  assert.doesNotMatch(html, /react/i);
});
