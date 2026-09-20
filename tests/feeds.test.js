import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readDist } from './helpers.js';

test('sitemap にトップと全記事が載る', async () => {
  const xml = await readDist('sitemap-0.xml');
  assert.match(xml, /<loc>https:\/\/kyosu\.dev\/<\/loc>/);
  assert.match(xml, /<loc>https:\/\/kyosu\.dev\/blog\/introducing-batcha\/<\/loc>/);
  assert.match(xml, /<loc>https:\/\/kyosu\.dev\/blog\/private-isu-with-claude-code\/<\/loc>/);
});

test('sitemap-index が生成される', async () => {
  const xml = await readDist('sitemap-index.xml');
  assert.match(xml, /sitemap-0\.xml/);
});

test('robots.txt が sitemap を指す', async () => {
  const txt = await readDist('robots.txt');
  assert.match(txt, /User-agent: \*/);
  assert.match(txt, /Sitemap: https:\/\/kyosu\.dev\/sitemap-index\.xml/);
});

test('RSS に記事が新しい順で載る', async () => {
  const xml = await readDist('rss.xml');
  // @astrojs/rss が title を CDATA で包むかは版に依存するため、
  // エスケープの影響を受けない <link> の URL とその並びで判定する
  assert.match(xml, /<link>https:\/\/kyosu\.dev\/blog\/private-isu-with-claude-code\/<\/link>/);
  assert.match(xml, /<link>https:\/\/kyosu\.dev\/blog\/introducing-batcha\/<\/link>/);
  const newer = xml.indexOf('private-isu-with-claude-code');
  const older = xml.indexOf('introducing-batcha');
  assert.ok(newer < older, 'RSS の並びが新しい順になっていない');
});

test('404 ページが生成される', async () => {
  const html = await readDist('404.html');
  assert.match(html, /404/);
  assert.match(html, /ページが見つかりませんでした/);
});
