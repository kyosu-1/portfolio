import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readDist, metaContent } from './helpers.js';

test('ページごとに固有の title が出る', async () => {
  const home = await readDist('index.html');
  const post = await readDist('blog/introducing-batcha/index.html');
  const about = await readDist('about/index.html');
  assert.match(home, /<title>kyosu\.dev — Shota Abe \(kyosu-1\)<\/title>/);
  assert.match(post, /<title>ecspressoライクなAWS Batchデプロイツール「batcha」を作った \| kyosu\.dev<\/title>/);
  assert.match(about, /<title>Shota Abe \(kyosu-1\) \| kyosu\.dev<\/title>/);
});

test('/about/ の description に氏名が入る', async () => {
  const about = await readDist('about/index.html');
  const desc = metaContent(about, 'name', 'description');
  assert.ok(desc?.includes('Shota Abe'), `description が想定と違う: ${desc}`);
});

test('meta description が frontmatter の summary から入る', async () => {
  const post = await readDist('blog/introducing-batcha/index.html');
  const desc = metaContent(post, 'name', 'description');
  assert.ok(desc?.includes('AWS Batch Job Definition'), `description が想定と違う: ${desc}`);
});

test('canonical が絶対URLで出る', async () => {
  const home = await readDist('index.html');
  const post = await readDist('blog/introducing-batcha/index.html');
  const about = await readDist('about/index.html');
  assert.match(home, /<link rel="canonical" href="https:\/\/kyosu\.dev\/"/);
  assert.match(post, /<link rel="canonical" href="https:\/\/kyosu\.dev\/blog\/introducing-batcha\/"/);
  assert.match(about, /<link rel="canonical" href="https:\/\/kyosu\.dev\/about\/"/);
});

test('OG タグが出る', async () => {
  const post = await readDist('blog/introducing-batcha/index.html');
  assert.equal(metaContent(post, 'property', 'og:type'), 'article');
  assert.equal(metaContent(post, 'property', 'og:url'), 'https://kyosu.dev/blog/introducing-batcha/');
  assert.equal(metaContent(post, 'property', 'og:site_name'), 'kyosu.dev');
  assert.equal(metaContent(post, 'property', 'og:locale'), 'ja_JP');
  assert.ok(metaContent(post, 'property', 'article:published_time')?.startsWith('2025-02-12'));
});

test('トップの og:type は website', async () => {
  const home = await readDist('index.html');
  assert.equal(metaContent(home, 'property', 'og:type'), 'website');
});

test('トップの og:title / og:description / og:url が出る', async () => {
  const home = await readDist('index.html');
  assert.equal(metaContent(home, 'property', 'og:title'), 'kyosu.dev — Shota Abe (kyosu-1)');
  assert.equal(
    metaContent(home, 'property', 'og:description'),
    'Shota Abe (kyosu-1) のポートフォリオ。ソフトウェアエンジニアとしての経歴と技術ブログ。',
  );
  assert.equal(metaContent(home, 'property', 'og:url'), 'https://kyosu.dev/');
});

test('Twitter カードが出る（画像は未設定なので summary）', async () => {
  const post = await readDist('blog/introducing-batcha/index.html');
  assert.equal(metaContent(post, 'name', 'twitter:card'), 'summary');
  assert.equal(metaContent(post, 'name', 'twitter:title'), 'ecspressoライクなAWS Batchデプロイツール「batcha」を作った | kyosu.dev');
});

test('og:image は出力しない', async () => {
  const post = await readDist('blog/introducing-batcha/index.html');
  assert.equal(metaContent(post, 'property', 'og:image'), null);
});
