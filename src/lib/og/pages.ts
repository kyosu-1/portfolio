import { getCollection } from 'astro:content';
import { author } from '../../data/profile';

/** OG 画像1枚分の中身。route は /og/ 以下のパス（拡張子なし） */
export interface OgPage {
  route: string;
  /** タグなどの小さい見出し。無いページ（トップ）もある */
  eyebrow?: string;
  headline: string;
}

const HOME_HEADLINE = `${author.name} (${author.handle})`;

/**
 * 生成する OG 画像の一覧。getStaticPaths（実際に描画するページ）と
 * font.ts（フォントに含めるべき文字の和集合を求める側）の両方が
 * ここを参照する。2箇所が別々に「どのページに画像を出すか」を
 * 持つと、フォント取得に使う文字集合と実際の描画内容がずれる
 * おそれがあるため、単一の情報源にしている。
 */
export async function listOgPages(): Promise<OgPage[]> {
  const posts = await getCollection('blog');

  return [
    { route: 'home', headline: HOME_HEADLINE },
    { route: 'about', eyebrow: 'About', headline: HOME_HEADLINE },
    ...posts.map((post) => ({
      route: `blog/${post.id}`,
      eyebrow: post.data.tags.join('・'),
      headline: post.data.title,
    })),
  ];
}
