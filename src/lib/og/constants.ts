/** 全 OG 画像のフッタに固定で出す文字列 */
export const OG_FOOTER_TEXT = 'kyosu.dev';

/**
 * OG 画像の寸法。render.ts（実際に描画するサイズ）と BaseHead.astro
 * （og:image:width / og:image:height メタタグ）の両方がここを参照する。
 * 画像サイズを変えたときに meta タグ側だけ取り残されないようにするため。
 */
export const OG_WIDTH = 1200;
export const OG_HEIGHT = 630;
