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

test('引き継ぎスクリプトの正規表現が実際に期待通りマッチする', async () => {
  const html = await readDist('index.html');
  // JSON-LD (<script type="application/ld+json">) には属性があるため、
  // 属性なしの <script> リテラルは引き継ぎスクリプトのみにマッチする。
  // 念のため location.hash を含むことを確認してから実行する。
  const match = html.match(/<script>([\s\S]*?)<\/script>/);
  assert.ok(match, '属性なしの <script> が見つからない');
  const src = match[1];
  assert.match(src, /location\.hash/, '抽出したスクリプトが引き継ぎスクリプトではない');

  const fn = new Function('location', src);

  let to = null;
  const replace = (u) => {
    to = u;
  };

  to = null;
  fn({ hash: '#/blog/introducing-batcha', replace });
  assert.equal(to, '/blog/introducing-batcha/');

  to = null;
  fn({ hash: '#/blog/introducing-batcha/', replace });
  assert.equal(to, '/blog/introducing-batcha/');

  fn({ hash: '#//evil.com', replace: () => assert.fail('open redirect') });

  fn({ hash: '#/blog/a/b', replace: () => assert.fail('多階層パスをリダイレクトしてはいけない') });

  fn({ hash: '#section-1', replace: () => assert.fail('記事内アンカーをリダイレクトしてはいけない') });

  fn({ hash: '', replace: () => assert.fail('hash なしでリダイレクトしてはいけない') });
});

test('引き継ぎスクリプト以外に JS を配信しない', async () => {
  const html = await readDist('index.html');
  const scripts = html.match(/<script(?![^>]*application\/ld\+json)[^>]*>/g) ?? [];
  assert.equal(scripts.length, 1, `想定外の <script> がある: ${scripts.join(', ')}`);
  assert.doesNotMatch(html, /<script[^>]*\ssrc=/, '外部 JS が読み込まれている');
});
