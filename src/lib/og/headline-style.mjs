/**
 * headline 用のスタイル。3行を超えたら省略記号で切る。
 *
 * satori は `WebkitLineClamp` だけでは行数を制限しない。
 * `textOverflow: 'ellipsis'` を同時に指定して初めて効く
 * （ドキュメント化されていない挙動で、実際に検証して判明した）。
 * satori のバージョンが上がるとこの挙動が変わる可能性があるため、
 * tests/og-render.test.js がこの関数をそのまま satori + resvg に
 * 渡し、3行を超える見出しが実際にクランプされることを直接検証する。
 *
 * プレーンな JS（.mjs）にしているのは、render.ts が
 * `astro:content`（Astro のビルドパイプライン内でのみ解決できる
 * 仮想モジュール）に依存する pages.ts を経由してつながっており、
 * 素の node から import できないため。この関数単体は
 * astro:content と無関係なので、.mjs に切り出せば
 * "node --test" が新規の実行時依存も TypeScript の型ストリッピングも
 * 使わずそのまま import できる。
 *
 * @param {{ fontSize: number, color: string }} options
 */
export function headlineClampStyle({ fontSize, color }) {
  return {
    display: '-webkit-box',
    WebkitBoxOrient: 'vertical',
    WebkitLineClamp: 3,
    textOverflow: 'ellipsis',
    overflow: 'hidden',
    fontSize: `${fontSize}px`,
    fontWeight: 700,
    lineHeight: 1.3,
    color,
  };
}
