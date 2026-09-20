import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readDist } from './helpers.js';

test('氏名とハンドルがトップページに出る', async () => {
  const html = await readDist('index.html');
  assert.match(html, /Shota Abe/);
  assert.match(html, /kyosu-1/);
});

test('トップページに Experience / Education セクションが出ない（/about/ へ移設済み）', async () => {
  const html = await readDist('index.html');
  assert.doesNotMatch(html, />Experience</, 'Experience 見出しがトップに残っている');
  assert.doesNotMatch(html, />Education</, 'Education 見出しがトップに残っている');
  // 職歴・学歴の具体的な内容も残っていないことを見る
  assert.doesNotMatch(html, /Site Reliability Engineer/);
  assert.doesNotMatch(html, /東京工業大学/);
});

test('連絡先（メールアドレス）が出力に含まれない', async () => {
  const html = await readDist('index.html');
  assert.doesNotMatch(html, /sho013039/, 'メールアドレスが漏れている');
});
