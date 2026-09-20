import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readDistBinary } from './helpers.js';

// PNG のマジックナンバー（8バイト固定）
const PNG_MAGIC = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

const OG_IMAGES = [
  'og/home.png',
  'og/about.png',
  'og/blog/introducing-batcha.png',
  'og/blog/private-isu-with-claude-code.png',
];

/** IHDR チャンクから width / height を読む（PNG は常にこの位置に固定長で入る） */
function readPngSize(buf) {
  return { width: buf.readUInt32BE(16), height: buf.readUInt32BE(20) };
}

test('OG 画像が4枚とも生成される', async () => {
  for (const path of OG_IMAGES) {
    const buf = await readDistBinary(path);
    assert.ok(buf.length > 0, `${path} が空ファイル`);
  }
});

test('OG 画像は本物の PNG（マジックナンバーで判定）', async () => {
  for (const path of OG_IMAGES) {
    const buf = await readDistBinary(path);
    assert.ok(
      buf.subarray(0, 8).equals(PNG_MAGIC),
      `${path} の先頭8バイトが PNG のマジックナンバーと一致しない: ${buf.subarray(0, 8).toString('hex')}`,
    );
  }
});

test('OG 画像は 1200x630', async () => {
  for (const path of OG_IMAGES) {
    const buf = await readDistBinary(path);
    const { width, height } = readPngSize(buf);
    assert.equal(width, 1200, `${path} の width`);
    assert.equal(height, 630, `${path} の height`);
  }
});
