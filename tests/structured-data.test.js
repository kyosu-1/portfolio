import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readDist, jsonLdBlocks } from './helpers.js';

test('トップに Person と WebSite が出る', async () => {
  const blocks = jsonLdBlocks(await readDist('index.html'));
  const types = blocks.map((b) => b['@type']);
  assert.ok(types.includes('Person'), `Person がない: ${types}`);
  assert.ok(types.includes('WebSite'), `WebSite がない: ${types}`);
});

test('Person の内容が画面表示と一致する', async () => {
  const html = await readDist('index.html');
  const person = jsonLdBlocks(html).find((b) => b['@type'] === 'Person');

  assert.equal(person.name, 'Shota Abe');
  assert.equal(person.alternateName, 'kyosu-1');
  assert.equal(person.url, 'https://kyosu.dev/');
  assert.deepEqual(person.sameAs, [
    'https://github.com/kyosu-1',
    'https://www.linkedin.com/in/shota-abe',
  ]);

  // profile.ts から導出されているので、画面にも同じ文字列があるはず
  assert.equal(person.worksFor.name, 'Mercari, Inc.');
  assert.ok(html.includes(person.worksFor.name));
  assert.equal(person.alumniOf.name, '東京工業大学');
  assert.ok(html.includes(person.alumniOf.name));
});

test('記事に BlogPosting が出る', async () => {
  const blocks = jsonLdBlocks(await readDist('blog/introducing-batcha/index.html'));
  const posting = blocks.find((b) => b['@type'] === 'BlogPosting');

  assert.ok(posting, 'BlogPosting がない');
  assert.equal(posting.headline, 'ecspressoライクなAWS Batchデプロイツール「batcha」を作った');
  assert.ok(posting.datePublished.startsWith('2025-02-12'));
  assert.equal(posting.author.name, 'Shota Abe');
  assert.equal(posting.mainEntityOfPage['@id'], 'https://kyosu.dev/blog/introducing-batcha/');
  assert.match(posting.keywords, /Go/);
});

test('記事ページに Person は出さない', async () => {
  const blocks = jsonLdBlocks(await readDist('blog/introducing-batcha/index.html'));
  assert.equal(blocks.filter((b) => b['@type'] === 'Person').length, 0);
});

test('canonical link と mainEntityOfPage が同じ URL を指す', async () => {
  const html = await readDist('blog/introducing-batcha/index.html');
  const canonical = html.match(/<link rel="canonical" href="([^"]+)"/)?.[1];
  const posting = jsonLdBlocks(html).find((b) => b['@type'] === 'BlogPosting');

  assert.ok(canonical, 'canonical link が見つからない');
  assert.equal(posting.mainEntityOfPage['@id'], canonical);
});
