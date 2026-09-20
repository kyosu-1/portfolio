import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import satori from 'satori';
import { Resvg } from '@resvg/resvg-js';
import { headlineClampStyle } from '../src/lib/og/headline-style.mjs';

/**
 * satori の line-clamp（3行を超えたら省略記号で切る）が実際に効くことを
 * 検証する。これはドキュメント化されていない satori の挙動で、
 * `WebkitLineClamp` だけでは効かず `textOverflow: 'ellipsis'` を
 * 同時に指定して初めて機能することが分かっている（src/lib/og/render.ts
 * のコメント参照）。satori をアップデートしたときにこの挙動が
 * 変わっていないかを検出するための回帰テスト。
 *
 * render.ts（本番コード）はここでは import できない。render.ts →
 * font.ts → pages.ts が `astro:content`（Astro のビルドパイプライン内
 * でのみ解決できる仮想モジュール）に依存しており、素の "node --test"
 * からは解決できないため。そのため実際にクランプに使っている
 * スタイルオブジェクトの組み立てだけを src/lib/og/headline-style.mjs
 * （プレーンな JS、astro:content と無関係）に切り出し、ここでは
 * その関数を直接 import して本物の satori + resvg に渡している。
 * コピーではなく本番と同じ関数を使っているため、render.ts 側の
 * スタイルが変わればこのテストにも反映される。
 */

const FIXTURE_FONT = path.resolve(import.meta.dirname, 'fixtures', 'og-clamp-test-font.ttf');

// 3行を大きく超える量の英文（フィクスチャフォントは ASCII サブセットのみ）
const LONG_HEADLINE = [
  'Lorem ipsum dolor sit amet consectetur adipiscing elit sed do eiusmod tempor incididunt ut labore magna aliqua enim ad minim veniam quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat',
  'Lorem ipsum dolor sit amet consectetur adipiscing elit sed do eiusmod tempor incididunt ut labore magna aliqua enim ad minim veniam quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat',
].join(' ');

async function renderHeadlineBBox(style) {
  const font = await readFile(FIXTURE_FONT);
  const element = {
    type: 'div',
    props: {
      // 幅だけを与える折り返しコンテキスト。背景を塗ると bbox が
      // キャンバス全体になってしまうため、あえて塗らない。
      style: { display: 'flex', width: '1040px' },
      children: { type: 'div', props: { style, children: LONG_HEADLINE } },
    },
  };

  const svg = await satori(element, {
    width: 1200,
    height: 630,
    fonts: [{ name: 'Test Font', data: font, weight: 700, style: 'normal' }],
  });

  // getBBox() は実際に描画された要素（＝グリフ）の外接矩形を返す。
  // PNG の寸法は常に 1200x630 のままなので、寸法チェックでは
  // クランプが効いているかを検出できない。溢れの検出には
  // 描画内容そのものの bbox を見る必要がある。
  const resvg = new Resvg(svg, { fitTo: { mode: 'width', value: 1200 } });
  return resvg.getBBox();
}

test('headlineClampStyle: 3行を大きく超える見出しはクランプされ、キャンバス内に収まる', async () => {
  const style = headlineClampStyle({ fontSize: 46, color: '#12171d' });
  const bbox = await renderHeadlineBBox(style);

  assert.ok(bbox, 'bbox が取得できない（何も描画されていない）');
  const bottom = bbox.y + bbox.height;
  // 46px・lineHeight 1.3 の3行分はおよそ 180px 前後。余裕を見て 250px
  // 未満なら「3行程度で収まっている」とみなす。クランプが効かない場合は
  // 600px 近くまで伸びる（下の回帰テストで確認済み）。
  assert.ok(
    bottom < 250,
    `見出しがクランプされずキャンバスまで溢れている可能性がある (bbox bottom: ${bottom})`,
  );
});

test('比較対照: textOverflow を欠くと satori はクランプせず溢れる（クランプ有無の差を確認）', async () => {
  const { textOverflow, ...withoutEllipsis } = headlineClampStyle({ fontSize: 46, color: '#12171d' });
  void textOverflow;

  const clamped = await renderHeadlineBBox(headlineClampStyle({ fontSize: 46, color: '#12171d' }));
  const unclamped = await renderHeadlineBBox(withoutEllipsis);

  const clampedBottom = clamped.y + clamped.height;
  const unclampedBottom = unclamped.y + unclamped.height;

  // textOverflow: 'ellipsis' を抜くと WebkitLineClamp が効かず、
  // 明らかに大きく溢れることを確認する（このリポジトリで実際に踏んだ
  // satori の非対応挙動）。単なる余裕の違いではなく、質的に違う結果に
  // なることを見たいので大きな差を要求する。
  assert.ok(
    unclampedBottom > clampedBottom + 200,
    `textOverflow なしでも溢れが再現しない（satori の挙動が変わった？） clamped=${clampedBottom} unclamped=${unclampedBottom}`,
  );
});
