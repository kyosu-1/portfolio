import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readDist, readDistBinary } from './helpers.js';

// サイトのアクセントカラー（src/styles/global.css の --color-accent）
const ACCENT_COLOR = '#4a6cf7';
const PNG_MAGIC = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

/** ICO のディレクトリエントリを読む（6バイトのヘッダの後に 16 バイトずつ並ぶ） */
function readIcoEntries(buf) {
  assert.equal(buf.readUInt16LE(0), 0, 'ICO の reserved フィールドが 0 でない');
  assert.equal(buf.readUInt16LE(2), 1, 'ICO の type が 1（アイコン）でない');
  const count = buf.readUInt16LE(4);
  const entries = [];
  for (let i = 0; i < count; i++) {
    const base = 6 + i * 16;
    entries.push({
      width: buf.readUInt8(base) || 256,
      height: buf.readUInt8(base + 1) || 256,
      size: buf.readUInt32LE(base + 8),
      offset: buf.readUInt32LE(base + 12),
    });
  }
  return entries;
}

test('favicon.svg がアクセントカラーの背景を持ち、文字はパスに変換されている', async () => {
  const svg = await readDist('favicon.svg');
  assert.match(svg, /<svg[^>]*viewBox="0 0 32 32"/);
  assert.ok(svg.includes(ACCENT_COLOR), `アクセントカラー ${ACCENT_COLOR} が含まれない`);
  // 閲覧側のフォント有無に依存しないよう <text> は使わない
  assert.doesNotMatch(svg, /<text[\s>]/);
  assert.match(svg, /<path/);
});

test('favicon.ico は React ロゴ入りのデフォルトではなく 16px と 32px の PNG を格納した ICO', async () => {
  const buf = await readDistBinary('favicon.ico');
  const entries = readIcoEntries(buf);
  assert.deepEqual(
    entries.map((e) => `${e.width}x${e.height}`).sort(),
    ['16x16', '32x32'],
  );
  for (const e of entries) {
    const png = buf.subarray(e.offset, e.offset + e.size);
    assert.ok(png.subarray(0, 8).equals(PNG_MAGIC), `${e.width}px のエントリが PNG でない`);
    assert.equal(png.readUInt32BE(16), e.width, `${e.width}px エントリの PNG 幅が一致しない`);
    assert.equal(png.readUInt32BE(20), e.height, `${e.height}px エントリの PNG 高さが一致しない`);
  }
});

test('apple-touch-icon.png は 180x180 の PNG', async () => {
  const buf = await readDistBinary('apple-touch-icon.png');
  assert.ok(buf.subarray(0, 8).equals(PNG_MAGIC), 'PNG のマジックナンバーと一致しない');
  assert.equal(buf.readUInt32BE(16), 180);
  assert.equal(buf.readUInt32BE(20), 180);
});

test('全ページの head から SVG / ICO / apple-touch-icon が参照される', async () => {
  for (const page of ['index.html', 'about/index.html', 'blog/introducing-batcha/index.html']) {
    const html = await readDist(page);
    assert.match(html, /<link rel="icon" href="\/favicon\.svg" type="image\/svg\+xml">/, page);
    assert.match(html, /<link rel="icon" href="\/favicon\.ico" sizes="32x32">/, page);
    assert.match(html, /<link rel="apple-touch-icon" href="\/apple-touch-icon\.png">/, page);
  }
});
