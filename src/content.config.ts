import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';

const blog = defineCollection({
  // posts/ はリポジトリルートに置いたまま参照する
  loader: glob({ pattern: '**/*.md', base: './posts' }),
  schema: z.object({
    title: z.string(),
    // "YYYY-MM-DD" のみ受け付ける。z.coerce.date() は
    // タイムゾーン付きの文字列（例: "2026-08-21T09:00:00+09:00"）も
    // 受理してしまい、UTC 深夜にパースされる結果 formatPostDate /
    // datetime 属性 / datePublished が1日ずれる。それを防ぐため
    // frontmatter の書式そのものを縛る。
    date: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, '日付は YYYY-MM-DD 形式で書いてください')
      .pipe(z.coerce.date()),
    tags: z.array(z.string()).default([]),
    // meta description と OG description の供給源なので必須にする。
    // 欠けたまま記事を公開できないよう、ビルドを失敗させる。
    summary: z.string(),
  }),
});

export const collections = { blog };
