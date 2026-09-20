import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';

const blog = defineCollection({
  // posts/ はリポジトリルートに置いたまま参照する
  loader: glob({ pattern: '**/*.md', base: './posts' }),
  schema: z.object({
    title: z.string(),
    date: z.coerce.date(),
    tags: z.array(z.string()).default([]),
    // meta description と OG description の供給源なので必須にする。
    // 欠けたまま記事を公開できないよう、ビルドを失敗させる。
    summary: z.string(),
  }),
});

export const collections = { blog };
