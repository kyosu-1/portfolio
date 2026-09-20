import satori from 'satori';
import { Resvg } from '@resvg/resvg-js';
import { loadOgFonts } from './font';
import { OG_FOOTER_TEXT } from './constants';

export const OG_WIDTH = 1200;
export const OG_HEIGHT = 630;

// サイトの --color-accent (src/styles/global.css) と揃える
const ACCENT_COLOR = '#4a6cf7';
const HEADLINE_COLOR = '#12171d';
const FOOTER_COLOR = '#9ca3af';

export interface RenderOgImageOptions {
  eyebrow?: string;
  headline: string;
}

/**
 * headline の文字数からフォントサイズを決める。長いタイトルほど
 * 小さくして3行に収まりやすくする。目安:
 * 20文字以下 → 64px / 40文字以下 → 54px / それ以上 → 46px
 */
function headlineFontSize(headline: string): number {
  if (headline.length <= 20) return 64;
  if (headline.length <= 40) return 54;
  return 46;
}

// satori は JSX を使えない（.ts ファイルのため）。React 要素と同じ形の
// プレーンオブジェクトを直接組み立てる。satori 自体の型は公開されて
// いないため any で受ける。
type SatoriNode = any;

function buildElement({ eyebrow, headline }: RenderOgImageOptions): SatoriNode {
  const fontSize = headlineFontSize(headline);

  // eyebrow が無いページ（トップ）でも headline の縦位置が揃うよう、
  // テキストの代わりに同じ高さのプレースホルダーを置く。
  const eyebrowNode: SatoriNode = eyebrow
    ? {
        type: 'div',
        props: {
          style: {
            display: 'flex',
            fontSize: '28px',
            fontWeight: 400,
            color: ACCENT_COLOR,
          },
          children: eyebrow,
        },
      }
    : { type: 'div', props: { style: { display: 'flex', height: '28px' } } };

  return {
    type: 'div',
    props: {
      style: {
        display: 'flex',
        width: `${OG_WIDTH}px`,
        height: `${OG_HEIGHT}px`,
        backgroundColor: '#ffffff',
      },
      children: [
        {
          type: 'div',
          props: {
            style: {
              display: 'flex',
              width: '16px',
              height: `${OG_HEIGHT}px`,
              backgroundColor: ACCENT_COLOR,
            },
          },
        },
        {
          type: 'div',
          props: {
            style: {
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              flex: 1,
              padding: '72px 80px',
            },
            children: [
              eyebrowNode,
              {
                type: 'div',
                props: {
                  style: {
                    // 3行を超える分は省略記号で切る。satori では
                    // textOverflow: 'ellipsis' を欠くと clamp が
                    // 効かず素通しで溢れるため、必ず一緒に指定する。
                    display: '-webkit-box',
                    WebkitBoxOrient: 'vertical',
                    WebkitLineClamp: 3,
                    textOverflow: 'ellipsis',
                    overflow: 'hidden',
                    fontSize: `${fontSize}px`,
                    fontWeight: 700,
                    lineHeight: 1.3,
                    color: HEADLINE_COLOR,
                  },
                  children: headline,
                },
              },
              {
                type: 'div',
                props: {
                  style: {
                    display: 'flex',
                    fontSize: '26px',
                    fontWeight: 400,
                    color: FOOTER_COLOR,
                  },
                  children: OG_FOOTER_TEXT,
                },
              },
            ],
          },
        },
      ],
    },
  };
}

/** OG 画像（1200x630 PNG）を1枚描画する */
export async function renderOgImage(options: RenderOgImageOptions): Promise<Buffer> {
  const { regular, bold } = await loadOgFonts();

  const svg = await satori(buildElement(options), {
    width: OG_WIDTH,
    height: OG_HEIGHT,
    fonts: [
      { name: 'Noto Sans JP', data: regular, weight: 400, style: 'normal' },
      { name: 'Noto Sans JP', data: bold, weight: 700, style: 'normal' },
    ],
  });

  const resvg = new Resvg(svg, { fitTo: { mode: 'width', value: OG_WIDTH } });
  return resvg.render().asPng();
}
