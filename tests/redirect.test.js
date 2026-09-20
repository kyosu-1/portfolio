import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readDist } from './helpers.js';

test('トップにハッシュURLの引き継ぎスクリプトが入る', async () => {
  const html = await readDist('index.html');
  // 正規表現リテラルのエスケープ表記に依存しないよう、
  // スクリプトが使っている API の存在で判定する
  assert.match(html, /location\.hash/);
  assert.match(html, /location\.replace/);
  assert.match(html, /'\/blog\/'/);
});

test('引き継ぎスクリプト以外に JS を配信しない', async () => {
  const html = await readDist('index.html');
  const scripts = html.match(/<script(?![^>]*application\/ld\+json)[^>]*>/g) ?? [];
  assert.equal(scripts.length, 1, `想定外の <script> がある: ${scripts.join(', ')}`);
  assert.doesNotMatch(html, /<script[^>]*\ssrc=/, '外部 JS が読み込まれている');
});
