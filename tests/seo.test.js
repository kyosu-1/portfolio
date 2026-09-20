import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readDist, readDistBinary, metaContent } from './helpers.js';

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
    'Shota Abe (kyosu-1) のポートフォリオ。ソフトウェアエンジニアが書いた技術記事の一覧です。',
  );
  assert.equal(metaContent(home, 'property', 'og:url'), 'https://kyosu.dev/');
});

test('トップの description は経歴に言及しない（Experience/Education は /about/ にあるため）', async () => {
  const home = await readDist('index.html');
  const desc = metaContent(home, 'name', 'description');
  assert.ok(desc?.includes('Shota Abe'), `description に氏名が入っていない: ${desc}`);
  assert.doesNotMatch(desc ?? '', /経歴/, `description が経歴に言及している: ${desc}`);
});

test('Twitter カードが出る（og:image を用意したので summary_large_image）', async () => {
  const post = await readDist('blog/introducing-batcha/index.html');
  assert.equal(metaContent(post, 'name', 'twitter:card'), 'summary_large_image');
  assert.equal(metaContent(post, 'name', 'twitter:title'), 'ecspressoライクなAWS Batchデプロイツール「batcha」を作った | kyosu.dev');
});

test('og:image / twitter:image が絶対URLで出て、対応する画像ファイルを指す', async () => {
  const cases = [
    ['index.html', 'https://kyosu.dev/og/home.png', 'og/home.png'],
    ['about/index.html', 'https://kyosu.dev/og/about.png', 'og/about.png'],
    [
      'blog/introducing-batcha/index.html',
      'https://kyosu.dev/og/blog/introducing-batcha.png',
      'og/blog/introducing-batcha.png',
    ],
    [
      'blog/private-isu-with-claude-code/index.html',
      'https://kyosu.dev/og/blog/private-isu-with-claude-code.png',
      'og/blog/private-isu-with-claude-code.png',
    ],
  ];

  for (const [htmlPath, expectedUrl, imagePath] of cases) {
    const html = await readDist(htmlPath);
    assert.equal(metaContent(html, 'property', 'og:image'), expectedUrl, `${htmlPath} の og:image`);
    assert.equal(metaContent(html, 'property', 'og:image:width'), '1200', `${htmlPath} の og:image:width`);
    assert.equal(metaContent(html, 'property', 'og:image:height'), '630', `${htmlPath} の og:image:height`);
    assert.equal(metaContent(html, 'name', 'twitter:image'), expectedUrl, `${htmlPath} の twitter:image`);
    // og:image が指す実体ファイルが dist に存在することも確認する
    await assert.doesNotReject(readDistBinary(imagePath), `${imagePath} が dist に存在しない`);
  }
});

test('404 は noindex なので og:image / twitter:image を出さない', async () => {
  const notFound = await readDist('404.html');
  assert.equal(metaContent(notFound, 'property', 'og:image'), null);
  assert.equal(metaContent(notFound, 'name', 'twitter:image'), null);
});
