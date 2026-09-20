import { listOgPages } from './pages';
import { OG_FOOTER_TEXT } from './constants';

export interface OgFonts {
  regular: ArrayBuffer;
  bold: ArrayBuffer;
}

// Google Fonts の CSS API は既定で WOFF2 を返すが、satori は
// WOFF2 を読めない（TTF / OTF / WOFF のみ）。古い UA を送ると
// format('truetype') で返ってくるため、それを利用する。
const CSS_USER_AGENT = 'Mozilla/4.0';
const FONT_FAMILY = 'Noto Sans JP';

let fontsPromise: Promise<OgFonts> | null = null;

/**
 * OG 画像用フォント（Noto Sans JP の 400 / 700、実際に使う文字だけの
 * サブセット）を取得する。ビルド中に何度呼ばれても実際のフェッチは
 * 最初の1回だけ（このモジュールのメモ化による）。
 *
 * 取得に失敗した場合は例外を投げてビルドを失敗させる。OG 画像が
 * 静かに欠けた状態でデプロイされるより、ビルドが落ちる方がよい
 * という判断による。
 */
export function loadOgFonts(): Promise<OgFonts> {
  if (!fontsPromise) {
    fontsPromise = fetchOgFonts();
  }
  return fontsPromise;
}

async function fetchOgFonts(): Promise<OgFonts> {
  const text = await collectRequiredText();

  // 個々の画像ごとにフォントを取得すると、記事が増えるたびに
  // リクエスト回数が増えて失敗の面も広がる。そのため全画像に
  // 出てくる文字の和集合をまとめて1回の &text= で取得する。
  const cssUrl = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(
    `${FONT_FAMILY}:wght@400;700`,
  )}&text=${encodeURIComponent(text)}`;

  const cssRes = await fetch(cssUrl, { headers: { 'User-Agent': CSS_USER_AGENT } });
  if (!cssRes.ok) {
    throw new Error(
      `OG画像用フォントの CSS 取得に失敗しました (status: ${cssRes.status}, url: ${cssUrl})`,
    );
  }
  const css = await cssRes.text();

  const [regular, bold] = await Promise.all([
    fetchFontBinary(extractFontUrl(css, 400)),
    fetchFontBinary(extractFontUrl(css, 700)),
  ]);

  return { regular, bold };
}

/** 全 OG 画像（eyebrow / headline）とフッタ固定文言に出てくる文字の和集合 */
async function collectRequiredText(): Promise<string> {
  const pages = await listOgPages();
  const chars = new Set<string>(OG_FOOTER_TEXT);

  for (const page of pages) {
    for (const ch of page.headline) chars.add(ch);
    if (page.eyebrow) {
      for (const ch of page.eyebrow) chars.add(ch);
    }
  }

  return [...chars].join('');
}

function extractFontUrl(css: string, weight: 400 | 700): string {
  const re = new RegExp(
    `font-weight:\\s*${weight};[\\s\\S]*?src:\\s*url\\(([^)]+)\\)\\s*format\\('truetype'\\)`,
  );
  const match = css.match(re);
  if (!match) {
    throw new Error(
      `OG画像用フォント CSS から weight ${weight} の truetype URL を抽出できませんでした。` +
        `Google Fonts のレスポンス形式が変わった可能性があります: ${css}`,
    );
  }
  return match[1];
}

async function fetchFontBinary(url: string): Promise<ArrayBuffer> {
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`OG画像用フォント本体の取得に失敗しました (status: ${res.status}, url: ${url})`);
  }
  return res.arrayBuffer();
}
