import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readDist } from './helpers.js';

test('記事ページに本文が静的HTMLとして入っている', async () => {
  const html = await readDist('blog/private-isu-with-claude-code/index.html');
  assert.match(html, /873,466/);
  assert.match(html, /private-isu/);
});

test('記事ページに見出しとタグが出力される', async () => {
  const html = await readDist('blog/introducing-batcha/index.html');
  assert.match(html, /batcha/);
  assert.match(html, /AWS Batch/);
  // Astro はテンプレートの改行を保つため、>Go< では一致しない
  assert.match(html, /<span[^>]*>\s*Go\s*<\/span>/);
});

test('記事の日付が移行前と同じ YYYY-MM-DD 形式で表示される', async () => {
  const html = await readDist('blog/private-isu-with-claude-code/index.html');
  assert.match(html, /2026-08-21/);
});

test('コードブロックが Shiki でハイライトされる', async () => {
  const html = await readDist('blog/private-isu-with-claude-code/index.html');
  assert.match(html, /class="astro-code/);
});
