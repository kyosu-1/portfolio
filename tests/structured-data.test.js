import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readDist, jsonLdBlocks } from './helpers.js';

test('トップに Person と WebSite が出る', async () => {
  const blocks = jsonLdBlocks(await readDist('index.html'));
  const types = blocks.map((b) => b['@type']);
  assert.ok(types.includes('Person'), `Person がない: ${types}`);
  assert.ok(types.includes('WebSite'), `WebSite がない: ${types}`);
});

test('トップの Person の内容が画面表示と一致する（軽量版）', async () => {
  const html = await readDist('index.html');
  const person = jsonLdBlocks(html).find((b) => b['@type'] === 'Person');

  assert.equal(person.name, 'Shota Abe');
  assert.equal(person.alternateName, 'kyosu-1');
  assert.equal(person.url, 'https://kyosu.dev/');
  assert.deepEqual(person.sameAs, [
    'https://github.com/kyosu-1',
    'https://www.linkedin.com/in/shota-abe',
  ]);
});

test('トップの Person には worksFor / alumniOf が含まれない（Experience/Education は /about/ にしかない）', async () => {
  const person = jsonLdBlocks(await readDist('index.html')).find((b) => b['@type'] === 'Person');
  assert.equal(person.worksFor, undefined);
  assert.equal(person.alumniOf, undefined);
});

test('/about/ に ProfilePage と Person（完全版）が出る', async () => {
  const blocks = jsonLdBlocks(await readDist('about/index.html'));
  const types = blocks.map((b) => b['@type']);
  assert.ok(types.includes('ProfilePage'), `ProfilePage がない: ${types}`);
  assert.ok(types.includes('Person'), `Person がない: ${types}`);
});

test('/about/ の Person に worksFor / alumniOf が画面表示と一致して含まれる', async () => {
  const html = await readDist('about/index.html');
  const person = jsonLdBlocks(html).find((b) => b['@type'] === 'Person');

  assert.equal(person.worksFor.name, 'Mercari, Inc.');
  assert.ok(html.includes(person.worksFor.name));
  assert.equal(person.alumniOf.name, '東京工業大学');
  assert.ok(html.includes(person.alumniOf.name));
});

test('/about/ の ProfilePage.mainEntity は Person の @id を参照する', async () => {
  const blocks = jsonLdBlocks(await readDist('about/index.html'));
  const profilePage = blocks.find((b) => b['@type'] === 'ProfilePage');
  const person = blocks.find((b) => b['@type'] === 'Person');

  assert.ok(profilePage.mainEntity?.['@id'], 'ProfilePage.mainEntity["@id"] がない');
  assert.equal(profilePage.mainEntity['@id'], person['@id']);
});

test('トップと /about/ の Person の @id が一致する（同一人物であることを示す）', async () => {
  const topPerson = jsonLdBlocks(await readDist('index.html')).find((b) => b['@type'] === 'Person');
  const aboutPerson = jsonLdBlocks(await readDist('about/index.html')).find(
    (b) => b['@type'] === 'Person',
  );

  assert.ok(topPerson['@id'], 'トップの Person に @id がない');
  assert.equal(topPerson['@id'], aboutPerson['@id']);
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
