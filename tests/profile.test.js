import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readDist, plainText } from './helpers.js';

test('氏名とハンドルがトップページに出る', async () => {
  const html = await readDist('index.html');
  assert.match(html, /Shota Abe/);
  assert.match(html, /kyosu-1/);
});

test('掲載する職歴4件がすべて出る', async () => {
  const html = await readDist('index.html');
  for (const company of ['Mercari, Inc.', '株式会社ナガセ', 'Alumnote', 'ポケットサイン株式会社']) {
    assert.ok(html.includes(company), `${company} が出力されていない`);
  }
});

test('職歴は継続中が先、その後は終了日の新しい順に並ぶ', async () => {
  const html = await readDist('index.html');
  const order = ['Mercari, Inc.', '株式会社ナガセ', 'Alumnote', 'ポケットサイン株式会社'].map(
    (c) => html.indexOf(c),
  );
  for (let i = 1; i < order.length; i++) {
    assert.ok(order[i - 1] < order[i], `${i} 番目の並び順が想定と違う`);
  }
});

test('学歴が出る', async () => {
  const html = await readDist('index.html');
  assert.match(html, /東京工業大学/);
  assert.match(html, /数理・計算科学系/);
  assert.match(html, /修士/);
  assert.match(html, /学士/);
});

test('継続中の職歴は「現在」と表示される', async () => {
  // 生HTMLでは 2026/04 と 現在 の間に </time> と改行が入るため、
  // 表示テキストに畳んでから判定する
  const text = plainText(await readDist('index.html'));
  assert.match(text, /2026\/04 – 現在/);
});

test('除外したインターンと連絡先が出力に含まれない', async () => {
  const html = await readDist('index.html');
  // Mercari は現職として正しく出現するため、社名ではなく日付で判定する
  assert.doesNotMatch(html, /2025\/03/, '除外したメルカリのインターンが残っている');
  assert.doesNotMatch(html, /2023\/10/, '除外したサイバーエージェントのインターンが残っている');
  assert.doesNotMatch(html, /サイバーエージェント/);
  assert.doesNotMatch(html, /sho013039/, 'メールアドレスが漏れている');
});
