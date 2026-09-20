import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readDist } from './helpers.js';

test('トップページに記事が新しい順で並ぶ', async () => {
  const html = await readDist('index.html');
  const newer = html.indexOf('Claude Code に private-isu');
  const older = html.indexOf('batcha');
  assert.ok(newer > -1, 'private-isu の記事が見つからない');
  assert.ok(older > -1, 'batcha の記事が見つからない');
  assert.ok(newer < older, '新しい記事が先に来ていない');
});

test('記事カードに要約とタグが出る', async () => {
  const html = await readDist('index.html');
  assert.match(html, /AWS Batch Job Definitionを宣言的に管理/);
  assert.match(html, /<span[^>]*>\s*ISUCON\s*<\/span>/);
});

test('ヘッダとフッタが全ページに出る', async () => {
  for (const p of ['index.html', 'blog/introducing-batcha/index.html']) {
    const html = await readDist(p);
    assert.match(html, /<header/, `${p} にヘッダがない`);
    assert.match(html, /<footer/, `${p} にフッタがない`);
  }
});

test('記事へのリンクがハッシュURLでない', async () => {
  const html = await readDist('index.html');
  assert.match(html, /href="\/blog\/introducing-batcha\/"/);
  assert.doesNotMatch(html, /href="#\//);
});
