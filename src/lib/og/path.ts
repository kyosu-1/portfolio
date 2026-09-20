/**
 * OG 画像のページ相対パス。src/pages/og/[...route].png.ts の
 * ルーティング（getStaticPaths が params.route から組み立てる
 * ファイル名）と対応させる。
 */
export function ogImagePath(route: string): string {
  return `/og/${route}.png`;
}
