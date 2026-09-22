// ファビコン一式を生成する。手動実行のみ（ビルドには組み込まない）:
//   node scripts/generate-favicon.mjs
//
// 出力:
//   public/favicon.svg          32x32、アクセントカラーの角丸に白の「k」（文字はパス化済み）
//   public/favicon.ico          上を 16px / 32px にラスタライズした PNG を格納した ICO
//   public/apple-touch-icon.png 180x180
//
// 文字は satori がフォントからパスに変換するため、閲覧側のフォント有無に
// 依存しない。フォントは OG 画像と同じく Google Fonts から取得する。
import satori from 'satori';
import { Resvg } from '@resvg/resvg-js';
import { writeFile } from 'node:fs/promises';
import path from 'node:path';

// src/styles/global.css の --color-accent と揃える
const ACCENT_COLOR = '#4a6cf7';
const LETTER = 'k';
const SIZE = 32;
const PUBLIC_DIR = path.resolve(import.meta.dirname, '..', 'public');

// Google Fonts の CSS API は既定で WOFF2 を返すが satori は読めないため、
// 古い UA を送って truetype を返させる（src/lib/og/font.ts と同じ手法）
const CSS_USER_AGENT = 'Mozilla/4.0';

async function fetchInterBold(text) {
  const cssUrl = `https://fonts.googleapis.com/css2?family=Inter:wght@700&text=${encodeURIComponent(text)}`;
  const cssRes = await fetch(cssUrl, { headers: { 'User-Agent': CSS_USER_AGENT } });
  if (!cssRes.ok) throw new Error(`フォント CSS の取得に失敗 (status: ${cssRes.status})`);
  const css = await cssRes.text();
  const m = css.match(/src:\s*url\(([^)]+)\)\s*format\('truetype'\)/);
  if (!m) throw new Error(`CSS から truetype URL を抽出できない: ${css}`);
  const fontRes = await fetch(m[1]);
  if (!fontRes.ok) throw new Error(`フォント本体の取得に失敗 (status: ${fontRes.status})`);
  return fontRes.arrayBuffer();
}

function buildElement() {
  return {
    type: 'div',
    props: {
      style: {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: `${SIZE}px`,
        height: `${SIZE}px`,
        borderRadius: '7px',
        backgroundColor: ACCENT_COLOR,
        color: '#ffffff',
        fontFamily: 'Inter',
        fontWeight: 700,
        fontSize: '26px',
        // Inter の「k」はアセンダが高く見た目の重心が上に寄るので少し下げる
        paddingTop: '1px',
      },
      children: LETTER,
    },
  };
}

function renderPng(svg, size) {
  const resvg = new Resvg(svg, { fitTo: { mode: 'width', value: size } });
  return resvg.render().asPng();
}

/**
 * PNG を格納した ICO を組み立てる。
 * 6 バイトのヘッダ + 16 バイトのディレクトリエントリ × N + 画像データ。
 * 幅・高さは 1 バイトで、256 は 0 と書く決まり。
 */
function buildIco(pngs) {
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0); // reserved
  header.writeUInt16LE(1, 2); // type: 1 = icon
  header.writeUInt16LE(pngs.length, 4);

  const dirSize = 16 * pngs.length;
  let offset = 6 + dirSize;
  const entries = [];
  for (const { size, data } of pngs) {
    const e = Buffer.alloc(16);
    e.writeUInt8(size === 256 ? 0 : size, 0); // width
    e.writeUInt8(size === 256 ? 0 : size, 1); // height
    e.writeUInt8(0, 2); // color palette
    e.writeUInt8(0, 3); // reserved
    e.writeUInt16LE(1, 4); // color planes
    e.writeUInt16LE(32, 6); // bits per pixel
    e.writeUInt32LE(data.length, 8);
    e.writeUInt32LE(offset, 12);
    entries.push(e);
    offset += data.length;
  }
  return Buffer.concat([header, ...entries, ...pngs.map((p) => p.data)]);
}

const font = await fetchInterBold(LETTER);
const svg = await satori(buildElement(), {
  width: SIZE,
  height: SIZE,
  fonts: [{ name: 'Inter', data: font, weight: 700, style: 'normal' }],
});

await writeFile(path.join(PUBLIC_DIR, 'favicon.svg'), svg);
await writeFile(
  path.join(PUBLIC_DIR, 'favicon.ico'),
  buildIco([16, 32].map((size) => ({ size, data: renderPng(svg, size) }))),
);
await writeFile(path.join(PUBLIC_DIR, 'apple-touch-icon.png'), renderPng(svg, 180));
console.log('generated: public/favicon.svg, public/favicon.ico, public/apple-touch-icon.png');
