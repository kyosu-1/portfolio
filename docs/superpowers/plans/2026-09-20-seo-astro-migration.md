# kyosu.dev SEO 改善 / Astro 移行 実装計画

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** React SPA（HashRouter・CSR）を Astro の静的サイトに移行し、各記事が個別URLでインデックスされる状態にしたうえで、トップページに経歴・学歴と構造化データを載せる。

**Architecture:** 記事は Astro Content Collections が `posts/*.md` を読み、`src/pages/blog/[id].astro` が `dist/blog/{slug}/index.html` として静的生成する。全ページが `BaseHead.astro` を経由してメタタグ・canonical・OG・JSON-LD を出力する。経歴データは `src/data/profile.ts` に一本化し、画面表示と構造化データの双方がそこから読むことで内容の乖離を防ぐ。

**Tech Stack:** Astro 7.3 / Tailwind CSS v4 (`@tailwindcss/vite`) / `@astrojs/sitemap` / `@astrojs/rss` / TypeScript / Node.js 組み込みテストランナー (`node --test`)

**Spec:** `docs/superpowers/specs/2026-09-20-seo-astro-migration-design.md`

## Global Constraints

すべてのタスクの要件に、以下が暗黙に含まれる。

- **バージョン**: `astro@^7.3` / `@astrojs/sitemap@^3.7` / `@astrojs/rss@^4.0` / `@astrojs/check@^0.9`
- **Node**: Astro 7 は `node >=22.12.0` を要求する（検証済み）。CI の `node-version: 22` は 22.x 最新を取得するため条件を満たす。`.github/workflows/deploy.yml` は変更しない
- **出力先**: `dist/`。CI がこのパスを `actions/upload-pages-artifact` に渡しているため変更しない
- **`site`**: `https://kyosu.dev`。`@astrojs/sitemap` の必須要件であり、canonical と OG の絶対URL生成にも使う
- **Shiki テーマ**: `github-light`。Astro の既定は `github-dark` で、指定しないとコードブロックの配色が移行前から変わる
- **記事の置き場所**: `posts/` をリポジトリルートから動かさない。`glob()` ローダーの `base` で参照する
- **表示テキストの変更範囲**: Hero の氏名（`Hi, I'm Shota Abe (kyosu-1)`）と、新設する Experience / Education セクションのみ。それ以外の文言・レイアウト・配色は移行前と一致させる
- **掲載しない情報**: メールアドレス（`sho013039@gmail.com`）、スキル一覧、`/about` ページ
- **掲載しない職歴**: メルカリ 2025/03–2025/04、サイバーエージェント 2023/10 の短期インターン2件
- **日付表示**: 記事は `YYYY-MM-DD`（移行前のまま）、経歴は `YYYY/MM`、継続中は `現在`
- **`og:image`**: 今回は出力しない。`twitter:card` は `summary` とする

### spec のディレクトリ構成からの逸脱

spec の構成図に `src/lib/` は含まれていないが、日付整形と構造化データ生成のヘルパーを置くために追加する。`.astro` ファイルにロジックを埋めると画面表示と JSON-LD で処理が二重化するため。追加するのは `src/lib/date.ts` と `src/lib/structured-data.ts` の2つのみ。

---

## File Structure

| ファイル | 責務 |
|---|---|
| `astro.config.mjs` | `site` / sitemap / Shiki テーマ / Tailwind の配線 |
| `tsconfig.json` | Astro のベース設定 |
| `src/content.config.ts` | `posts/*.md` のコレクション定義と frontmatter スキーマ |
| `src/data/profile.ts` | 著者情報・職歴・学歴の**単一ソース**。表示と JSON-LD が共に参照する |
| `src/lib/date.ts` | 日付整形（記事用 `YYYY-MM-DD` / 経歴用 `YYYY/MM`） |
| `src/lib/structured-data.ts` | `profile.ts` から JSON-LD オブジェクトを組み立てる |
| `src/components/BaseHead.astro` | `<head>` の中身すべて。メタ・canonical・OG・Twitter・JSON-LD |
| `src/components/Header.astro` | サイトヘッダ |
| `src/components/Footer.astro` | サイトフッタ |
| `src/components/BlogCard.astro` | 記事一覧の1件分 |
| `src/components/TagBadge.astro` | タグの表示 |
| `src/layouts/Layout.astro` | HTML骨格。`BaseHead` と Header/Footer を束ねる |
| `src/pages/index.astro` | トップ（Hero / Experience / Education / Blog） |
| `src/pages/blog/[id].astro` | 記事ページの静的生成 |
| `src/pages/rss.xml.ts` | RSS フィード |
| `src/pages/robots.txt.ts` | robots.txt（`Sitemap:` 行を `site` から導出） |
| `src/pages/404.astro` | 404ページ → `dist/404.html` |
| `src/styles/global.css` | 旧 `src/index.css`。hljs 用スタイルを Shiki 向けに置換 |
| `tests/helpers.js` | ビルド成果物を読み、メタタグ・JSON-LD を取り出す補助 |
| `tests/*.test.js` | `dist/` に対する検証。`node --test` で実行 |

### テスト方針

このリポジトリにはテストが1つもない。静的サイトにとって意味のある検証は「**ビルド成果物に何が入っているか**」であり、それがまさに今回直そうとしている問題（初期HTMLに本文もメタ情報もない）そのものなので、`dist/` に対するアサーションをテストとする。

新しい依存は追加しない。Node.js 22 の組み込みテストランナー（`node --test`）を使う。`npm test` は `astro build` を実行してからテストを走らせるため、常に最新の成果物を検証する。

`node --test` にパス引数を渡さないのは、Node 22 では `node --test tests/` がディレクトリをテストファイルとして扱おうとして exit 1 になるため（検証済み）。引数なしの既定探索が `tests/*.test.js` を拾う。

---

## Task 1: Astro の土台とテストハーネス

React のビルドパイプラインを Astro に置き換え、最小のトップページが静的HTMLとして出力される状態にする。

ツールチェーンが無ければテストの実行自体ができないため、このタスクに限り依存関係のインストールをテスト作成より先に行う。

**Files:**
- Create: `astro.config.mjs`, `src/layouts/Layout.astro`, `src/pages/index.astro`, `src/styles/global.css`, `tests/helpers.js`, `tests/build.test.js`
- Modify: `package.json`, `tsconfig.json`, `.gitignore`
- Delete: `index.html`, `vite.config.ts`, `vite-env.d.ts`, `tsconfig.tsbuildinfo`, `src/main.tsx`, `src/App.tsx`, `src/index.css`, `src/types.ts`, `src/lib/posts.ts`, `src/pages/Home.tsx`, `src/pages/BlogPost.tsx`, `src/pages/NotFound.tsx`, `src/components/Layout.tsx`, `src/components/Header.tsx`, `src/components/Footer.tsx`, `src/components/BlogCard.tsx`, `src/components/TagBadge.tsx`

**Interfaces:**
- Consumes: なし（最初のタスク）
- Produces:
  - `Layout.astro` の Props: `{ title: string; description: string }`。Task 5 で `type` / `publishedDate` / `tags` / `schemas` が追加される
  - `tests/helpers.js`: `readDist(relPath: string): Promise<string>`, `metaContent(html: string, attr: string, value: string): string | null`, `jsonLdBlocks(html: string): object[]`, `plainText(html: string): string`
  - `npm test` = `astro build && node --test`（パス引数なし。Node の既定の `**/*.test.js` 探索に任せる）

- [ ] **Step 1: React 系の依存を外し、Astro を入れる**

```bash
npm uninstall react react-dom react-router-dom react-markdown rehype-highlight remark-gfm front-matter @vitejs/plugin-react @types/react @types/react-dom
npm install astro@^7.3 @astrojs/sitemap@^3.7 @astrojs/rss@^4.0
npm install -D @astrojs/check@^0.9
```

`tailwindcss` / `@tailwindcss/vite` / `@tailwindcss/typography` / `typescript` は残す。

- [ ] **Step 2: `package.json` の scripts を差し替える**

```json
  "scripts": {
    "dev": "astro dev",
    "build": "astro check && astro build",
    "preview": "astro preview",
    "test": "astro build && node --test"
  },
```

`astro check` は、これまで `tsc -b` が担っていた型チェックの引き継ぎ先。

- [ ] **Step 3: 古い React のファイルを削除する**

```bash
git rm -q index.html vite.config.ts vite-env.d.ts \
  src/main.tsx src/App.tsx src/index.css src/types.ts src/lib/posts.ts \
  src/pages/Home.tsx src/pages/BlogPost.tsx src/pages/NotFound.tsx \
  src/components/Layout.tsx src/components/Header.tsx src/components/Footer.tsx \
  src/components/BlogCard.tsx src/components/TagBadge.tsx
rm -f tsconfig.tsbuildinfo
```

- [ ] **Step 4: `.gitignore` に Astro の生成物を足す**

`/dist` の行のすぐ下に追加する。

```
# Astro
.astro/
```

- [ ] **Step 5: テストの補助関数を書く**

`tests/helpers.js`:

```js
import { readFile } from 'node:fs/promises';
import path from 'node:path';

const DIST = path.resolve(import.meta.dirname, '..', 'dist');

/** dist 配下のファイルを文字列として読む */
export function readDist(relPath) {
  return readFile(path.join(DIST, relPath), 'utf8');
}

/**
 * <meta> の content を取り出す。属性の並び順は Astro の出力に依存するため
 * 両方の順序を試す。
 */
export function metaContent(html, attr, value) {
  const forward = new RegExp(
    `<meta[^>]*\\b${attr}="${value}"[^>]*\\bcontent="([^"]*)"`,
    'i',
  );
  const backward = new RegExp(
    `<meta[^>]*\\bcontent="([^"]*)"[^>]*\\b${attr}="${value}"`,
    'i',
  );
  const m = html.match(forward) ?? html.match(backward);
  return m ? m[1] : null;
}

/**
 * タグを外した表示テキスト。空白は1つに畳む。
 * Astro はテンプレートの改行をそのまま出力するため、
 * 「画面に何と表示されるか」を見たいときは生HTMLではなくこれを使う。
 */
export function plainText(html) {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/** ページ内の JSON-LD をすべてパースして返す */
export function jsonLdBlocks(html) {
  const re = /<script type="application\/ld\+json">([\s\S]*?)<\/script>/g;
  const blocks = [];
  let m;
  while ((m = re.exec(html)) !== null) {
    blocks.push(JSON.parse(m[1]));
  }
  return blocks;
}
```

- [ ] **Step 6: 失敗するテストを書く**

`tests/build.test.js`:

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readDist } from './helpers.js';

test('トップページが静的HTMLとして出力される', async () => {
  const html = await readDist('index.html');
  assert.match(html, /<html lang="ja">/);
  assert.match(html, /kyosu\.dev/);
});

test('React のランタイムが配信されない', async () => {
  const html = await readDist('index.html');
  assert.doesNotMatch(html, /react/i);
});
```

- [ ] **Step 7: テストを実行して失敗を確認する**

Run: `npm test`
Expected: FAIL。`astro.config.mjs` もページも無いためビルドが失敗するか、`dist/index.html` が見つからず `ENOENT` になる。

- [ ] **Step 8: `astro.config.mjs` を作る**

```js
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  site: 'https://kyosu.dev',
  integrations: [sitemap()],
  markdown: {
    // 移行前は highlight.js の GitHub Light テーマだった。
    // Astro の既定は github-dark なので明示しないと配色が変わる。
    shikiConfig: { theme: 'github-light' },
  },
  vite: { plugins: [tailwindcss()] },
});
```

- [ ] **Step 9: `tsconfig.json` を Astro のベース設定に差し替える**

```json
{
  "extends": "astro/tsconfigs/strict",
  "include": [".astro/types.d.ts", "**/*"],
  "exclude": ["dist", "tests"]
}
```

- [ ] **Step 10: `src/styles/global.css` を作る**

旧 `src/index.css` から `@theme` ブロックを引き継ぎ、highlight.js 用のスタイル（`.hljs-*` 系 約70行）を Shiki 向けの指定に置き換える。Shiki は `<pre class="astro-code">` を出力し、テーマ由来の背景色をインラインスタイルで付けるため、移行前の `#f6f8fa` に上書きする。

```css
@import "tailwindcss";
@plugin "@tailwindcss/typography";

@theme {
  --font-sans: "Inter", ui-sans-serif, system-ui, sans-serif;
  --font-mono: "JetBrains Mono", ui-monospace, monospace;
  --color-accent: #4a6cf7;
}

/* Shiki が出力する <pre class="astro-code"> を、移行前
   （highlight.js GitHub Light）と同じ見た目に揃える。
   背景色はテーマ由来のインラインスタイルを上書きする必要がある。 */
.prose pre.astro-code {
  background-color: #f6f8fa !important;
  border-radius: 0.5rem;
  padding: 1.2em 1.4em;
  overflow-x: auto;
}
.prose pre.astro-code code {
  background: transparent;
  padding: 0;
  font-family: var(--font-mono);
}

/* prose がコードの色を上書きするのを防ぐ（移行前から引き継ぎ） */
.prose code {
  color: inherit;
}
.prose pre code::before,
.prose pre code::after {
  content: none;
}
```

- [ ] **Step 11: `src/layouts/Layout.astro` を作る**

この時点では `<head>` をインラインで書く。Task 5 で `BaseHead.astro` に差し替える。

```astro
---
import '../styles/global.css';

interface Props {
  title: string;
  description: string;
}

const { title, description } = Astro.props;
---

<!doctype html>
<html lang="ja">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <link rel="icon" href="/favicon.ico" />
    <title>{title}</title>
    <meta name="description" content={description} />
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
    <link
      href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap"
      rel="stylesheet"
    />
  </head>
  <body class="bg-white text-gray-800 antialiased">
    <div class="mx-auto max-w-2xl px-4">
      <main class="min-h-[60vh] py-4">
        <slot />
      </main>
    </div>
  </body>
</html>
```

- [ ] **Step 12: `src/pages/index.astro` を作る**

Hero だけの最小版。記事一覧は Task 3、経歴は Task 4 で足す。

```astro
---
import Layout from '../layouts/Layout.astro';
---

<Layout
  title="kyosu.dev"
  description="Shota Abe (kyosu-1) のポートフォリオと技術ブログ。"
>
  <section class="py-8">
    <h1 class="text-2xl font-bold text-gray-800">Hi, I'm kyosu-1</h1>
    <p class="mt-2 text-gray-500">ソフトウェアエンジニア。</p>
  </section>
</Layout>
```

- [ ] **Step 13: テストを実行して通ることを確認する**

Run: `npm test`
Expected: PASS（2件）

- [ ] **Step 14: コミット**

```bash
git add -A
git commit -m "feat: React SPA を Astro に置き換える土台を作る"
```

---

## Task 2: Content Collection と記事ページ

`posts/*.md` を読み込み、各記事を個別URLの静的HTMLとして生成する。**移行の本質はここにある。**

**Files:**
- Create: `src/content.config.ts`, `src/lib/date.ts`, `src/pages/blog/[id].astro`, `tests/blog.test.js`

**Interfaces:**
- Consumes: `Layout.astro`（Props: `{ title, description }`）
- Produces:
  - コレクション `blog`。エントリは `{ id: string; data: { title: string; date: Date; tags: string[]; summary: string } }`
  - `src/lib/date.ts`: `formatPostDate(date: Date): string`（`"2026-08-21"` 形式）, `formatYearMonth(value: string): string`（`"2026-04"` → `"2026/04"`）
  - URL: `/blog/{id}/` → `dist/blog/{id}/index.html`

- [ ] **Step 1: 失敗するテストを書く**

`tests/blog.test.js`:

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readDist } from './helpers.js';

test('記事ページに本文が静的HTMLとして入っている', async () => {
  const html = await readDist('blog/private-isu-with-claude-code/index.html');
  assert.match(html, /873,466/);
  assert.match(html, /private-isu/);
});

test('記事ページに見出しとタグが出力される', async () => {
  const html = await readDist('blog/introducing-batcha/index.html');
  assert.match(html, /batcha/);
  assert.match(html, /AWS Batch/);
  // Astro はテンプレートの改行を保つため、>Go< では一致しない
  assert.match(html, /<span[^>]*>\s*Go\s*<\/span>/);
});

test('記事の日付が移行前と同じ YYYY-MM-DD 形式で表示される', async () => {
  const html = await readDist('blog/private-isu-with-claude-code/index.html');
  assert.match(html, /2026-08-21/);
});

test('コードブロックが Shiki でハイライトされる', async () => {
  const html = await readDist('blog/private-isu-with-claude-code/index.html');
  assert.match(html, /class="astro-code/);
});
```

- [ ] **Step 2: テストを実行して失敗を確認する**

Run: `npm test`
Expected: FAIL。`dist/blog/` がまだ生成されず `ENOENT`。

- [ ] **Step 3: `src/content.config.ts` を作る**

```ts
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
```

- [ ] **Step 4: `src/lib/date.ts` を作る**

```ts
/** 記事の日付表示。移行前の見た目（YYYY-MM-DD）を維持する */
export function formatPostDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

/** 経歴の期間表示。"2026-04" → "2026/04" */
export function formatYearMonth(value: string): string {
  return value.replace('-', '/');
}
```

- [ ] **Step 5: `src/pages/blog/[id].astro` を作る**

```astro
---
import { getCollection, render } from 'astro:content';
import Layout from '../../layouts/Layout.astro';
import { formatPostDate } from '../../lib/date';

export async function getStaticPaths() {
  const posts = await getCollection('blog');
  return posts.map((post) => ({ params: { id: post.id }, props: { post } }));
}

const { post } = Astro.props;
const { Content } = await render(post);
const displayDate = formatPostDate(post.data.date);
---

<Layout title={`${post.data.title} | kyosu.dev`} description={post.data.summary}>
  <article>
    <a href="/" class="text-sm text-gray-400 hover:text-accent">&larr; Back</a>

    <header class="mt-4">
      <time class="text-sm text-gray-400" datetime={displayDate}>{displayDate}</time>
      <h1 class="mt-1 text-3xl font-bold text-gray-800">{post.data.title}</h1>
      {post.data.tags.length > 0 && (
        <div class="mt-3 flex flex-wrap gap-1.5">
          {post.data.tags.map((tag) => (
            <span class="inline-block rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-medium text-accent">
              {tag}
            </span>
          ))}
        </div>
      )}
    </header>

    <div class="prose prose-gray mt-8 max-w-none prose-code:font-mono">
      <Content />
    </div>
  </article>
</Layout>
```

タグの表示は Task 3 で `TagBadge.astro` に切り出す。この時点ではインラインで書き、記事ページ単体で完結させる。

- [ ] **Step 6: テストを実行して通ることを確認する**

Run: `npm test`
Expected: PASS（Task 1 の2件 + 今回の4件 = 6件）

- [ ] **Step 7: 生成されたファイルを目視で確認する**

Run: `ls dist/blog/*/index.html`
Expected: `dist/blog/introducing-batcha/index.html` と `dist/blog/private-isu-with-claude-code/index.html` の2つ

- [ ] **Step 8: コミット**

```bash
git add -A
git commit -m "feat: 記事を Content Collection から静的生成する"
```

---

## Task 3: コンポーネント移植と記事一覧

Header / Footer / TagBadge / BlogCard を `.astro` に移植し、トップページに記事一覧を復活させる。

**Files:**
- Create: `src/components/Header.astro`, `src/components/Footer.astro`, `src/components/TagBadge.astro`, `src/components/BlogCard.astro`, `tests/home.test.js`
- Modify: `src/layouts/Layout.astro`, `src/pages/index.astro`, `src/pages/blog/[id].astro`

**Interfaces:**
- Consumes: `formatPostDate` (`src/lib/date.ts`)、コレクション `blog`
- Produces:
  - `TagBadge.astro` Props: `{ tag: string }`
  - `BlogCard.astro` Props: `{ id: string; title: string; date: Date; tags: string[]; summary: string }`
  - `Header.astro` / `Footer.astro`: Props なし

- [ ] **Step 1: 失敗するテストを書く**

`tests/home.test.js`:

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readDist } from './helpers.js';

test('トップページに記事が新しい順で並ぶ', async () => {
  const html = await readDist('index.html');
  const newer = html.indexOf('Claude Code に private-isu');
  const older = html.indexOf('batcha');
  assert.ok(newer > -1, 'private-isu の記事が見つからない');
  assert.ok(older > -1, 'batcha の記事が見つからない');
  assert.ok(newer < older, '新しい記事が先に来ていない');
});

test('記事カードに要約とタグが出る', async () => {
  const html = await readDist('index.html');
  assert.match(html, /AWS Batch Job Definitionを宣言的に管理/);
  assert.match(html, /<span[^>]*>\s*ISUCON\s*<\/span>/);
});

test('ヘッダとフッタが全ページに出る', async () => {
  for (const p of ['index.html', 'blog/introducing-batcha/index.html']) {
    const html = await readDist(p);
    assert.match(html, /<header/, `${p} にヘッダがない`);
    assert.match(html, /<footer/, `${p} にフッタがない`);
  }
});

test('記事へのリンクがハッシュURLでない', async () => {
  const html = await readDist('index.html');
  assert.match(html, /href="\/blog\/introducing-batcha\/"/);
  assert.doesNotMatch(html, /href="#\//);
});
```

- [ ] **Step 2: テストを実行して失敗を確認する**

Run: `npm test`
Expected: FAIL。トップページに記事一覧もヘッダもまだ無い。

- [ ] **Step 3: `src/components/Header.astro` を作る**

```astro
<header class="py-8">
  <nav class="flex items-center justify-between">
    <a href="/" class="text-xl font-bold text-gray-800 hover:text-accent">kyosu.dev</a>
    <a href="/" class="text-sm text-gray-500 hover:text-accent">Blog</a>
  </nav>
</header>
```

移行前の `Header.tsx` は両方のリンクが `/` を指していた。挙動を変えないためそのまま移植する。

- [ ] **Step 4: `src/components/Footer.astro` を作る**

```astro
---
const year = new Date().getFullYear();
---

<footer class="border-t border-gray-100 py-8 text-center text-sm text-gray-400">
  &copy; {year} kyosu.dev
</footer>
```

- [ ] **Step 5: `src/components/TagBadge.astro` を作る**

```astro
---
interface Props {
  tag: string;
}

const { tag } = Astro.props;
---

<span class="inline-block rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-medium text-accent">
  {tag}
</span>
```

- [ ] **Step 6: `src/components/BlogCard.astro` を作る**

```astro
---
import TagBadge from './TagBadge.astro';
import { formatPostDate } from '../lib/date';

interface Props {
  id: string;
  title: string;
  date: Date;
  tags: string[];
  summary: string;
}

const { id, title, date, tags, summary } = Astro.props;
const displayDate = formatPostDate(date);
---

<a
  href={`/blog/${id}/`}
  class="block rounded-lg border border-gray-100 p-5 transition-colors hover:border-accent/30 hover:bg-blue-50/30"
>
  <time class="text-sm text-gray-400" datetime={displayDate}>{displayDate}</time>
  <h3 class="mt-1 text-lg font-semibold text-gray-800">{title}</h3>
  {summary && <p class="mt-1 text-sm text-gray-500">{summary}</p>}
  {tags.length > 0 && (
    <div class="mt-3 flex flex-wrap gap-1.5">
      {tags.map((tag) => <TagBadge tag={tag} />)}
    </div>
  )}
</a>
```

- [ ] **Step 7: `Layout.astro` に Header / Footer を組み込む**

`<body>` の中身を差し替える。あわせて frontmatter に import を足す。

```astro
---
import '../styles/global.css';
import Header from '../components/Header.astro';
import Footer from '../components/Footer.astro';

interface Props {
  title: string;
  description: string;
}

const { title, description } = Astro.props;
---
```

```astro
  <body class="bg-white text-gray-800 antialiased">
    <div class="mx-auto max-w-2xl px-4">
      <Header />
      <main class="min-h-[60vh] py-4">
        <slot />
      </main>
      <Footer />
    </div>
  </body>
```

- [ ] **Step 8: `index.astro` に記事一覧を足す**

```astro
---
import { getCollection } from 'astro:content';
import Layout from '../layouts/Layout.astro';
import BlogCard from '../components/BlogCard.astro';

const posts = (await getCollection('blog')).sort(
  (a, b) => b.data.date.valueOf() - a.data.date.valueOf(),
);
---

<Layout
  title="kyosu.dev"
  description="Shota Abe (kyosu-1) のポートフォリオと技術ブログ。"
>
  <section class="py-8">
    <h1 class="text-2xl font-bold text-gray-800">Hi, I'm kyosu-1</h1>
    <p class="mt-2 text-gray-500">ソフトウェアエンジニア。</p>
    <div class="mt-3 flex gap-4">
      <a href="https://github.com/kyosu-1" target="_blank" rel="noopener noreferrer" class="text-sm text-gray-400 hover:text-accent">GitHub</a>
      <a href="https://www.linkedin.com/in/shota-abe" target="_blank" rel="noopener noreferrer" class="text-sm text-gray-400 hover:text-accent">LinkedIn</a>
    </div>
  </section>

  <section class="py-4">
    <h2 class="text-lg font-semibold text-gray-800">Blog</h2>
    <div class="mt-4 flex flex-col gap-3">
      {posts.map((post) => (
        <BlogCard
          id={post.id}
          title={post.data.title}
          date={post.data.date}
          tags={post.data.tags}
          summary={post.data.summary}
        />
      ))}
    </div>
  </section>
</Layout>
```

- [ ] **Step 9: `blog/[id].astro` のタグをコンポーネントに置き換える**

frontmatter に `import TagBadge from '../../components/TagBadge.astro';` を足し、インラインの `<span>` を差し替える。

```astro
      {post.data.tags.length > 0 && (
        <div class="mt-3 flex flex-wrap gap-1.5">
          {post.data.tags.map((tag) => <TagBadge tag={tag} />)}
        </div>
      )}
```

- [ ] **Step 10: テストを実行して通ることを確認する**

Run: `npm test`
Expected: PASS（合計10件）

- [ ] **Step 11: 見た目を移行前と比べる**

Run: `npm run preview`
`http://localhost:4321/` と記事ページを開き、本番 `https://kyosu.dev/` と並べて比較する。特にコードブロックの背景色（`#f6f8fa`）と等幅フォントを確認する。

- [ ] **Step 12: コミット**

```bash
git add -A
git commit -m "feat: コンポーネントを .astro に移植し記事一覧を復元する"
```

---

## Task 4: プロフィール（経歴・学歴）

`src/data/profile.ts` を単一ソースとして作り、トップページに Experience / Education セクションを足す。

**Files:**
- Create: `src/data/profile.ts`, `tests/profile.test.js`
- Modify: `src/pages/index.astro`

**Interfaces:**
- Consumes: `formatYearMonth` (`src/lib/date.ts`)
- Produces（Task 6 の構造化データがこれらを参照する）:
  - `author: { name: string; handle: string; headline: string; jobTitle: string; links: { github: string; linkedin: string } }`
  - `interface Experience { company: string; role: string; start: string; end: string | null }`
  - `interface Education { school: string; department: string; degree: string; start: string; end: string }`
  - `experiences: Experience[]`, `education: Education[]`（新しい順）
  - `sortExperiences(items: Experience[]): Experience[]`
  - `currentRole(): Experience | undefined`

- [ ] **Step 1: 失敗するテストを書く**

`tests/profile.test.js`:

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readDist, plainText } from './helpers.js';

test('氏名とハンドルがトップページに出る', async () => {
  const html = await readDist('index.html');
  assert.match(html, /Shota Abe/);
  assert.match(html, /kyosu-1/);
});

test('掲載する職歴4件がすべて出る', async () => {
  const html = await readDist('index.html');
  for (const company of ['Mercari, Inc.', '株式会社ナガセ', 'Alumnote', 'ポケットサイン株式会社']) {
    assert.ok(html.includes(company), `${company} が出力されていない`);
  }
});

test('職歴は継続中が先、その後は終了日の新しい順に並ぶ', async () => {
  const html = await readDist('index.html');
  const order = ['Mercari, Inc.', '株式会社ナガセ', 'Alumnote', 'ポケットサイン株式会社'].map(
    (c) => html.indexOf(c),
  );
  for (let i = 1; i < order.length; i++) {
    assert.ok(order[i - 1] < order[i], `${i} 番目の並び順が想定と違う`);
  }
});

test('学歴が出る', async () => {
  const html = await readDist('index.html');
  assert.match(html, /東京工業大学/);
  assert.match(html, /数理・計算科学系/);
  assert.match(html, /修士/);
  assert.match(html, /学士/);
});

test('継続中の職歴は「現在」と表示される', async () => {
  // 生HTMLでは 2026/04 と 現在 の間に </time> と改行が入るため、
  // 表示テキストに畳んでから判定する
  const text = plainText(await readDist('index.html'));
  assert.match(text, /2026\/04 – 現在/);
});

test('除外したインターンと連絡先が出力に含まれない', async () => {
  const html = await readDist('index.html');
  // Mercari は現職として正しく出現するため、社名ではなく日付で判定する
  assert.doesNotMatch(html, /2025\/03/, '除外したメルカリのインターンが残っている');
  assert.doesNotMatch(html, /2023\/10/, '除外したサイバーエージェントのインターンが残っている');
  assert.doesNotMatch(html, /サイバーエージェント/);
  assert.doesNotMatch(html, /sho013039/, 'メールアドレスが漏れている');
});
```

- [ ] **Step 2: テストを実行して失敗を確認する**

Run: `npm test`
Expected: FAIL。`Shota Abe` も職歴もまだ出力されていない。

- [ ] **Step 3: `src/data/profile.ts` を作る**

```ts
export const author = {
  name: 'Shota Abe',
  handle: 'kyosu-1',
  headline: 'ソフトウェアエンジニア。',
  jobTitle: 'Software Engineer',
  links: {
    github: 'https://github.com/kyosu-1',
    linkedin: 'https://www.linkedin.com/in/shota-abe',
  },
} as const;

export interface Experience {
  company: string;
  role: string;
  /** "YYYY-MM" */
  start: string;
  /** "YYYY-MM"。null は継続中 */
  end: string | null;
}

export interface Education {
  school: string;
  department: string;
  degree: string;
  start: string;
  end: string;
}

/**
 * 掲載する職歴。短期インターン2件（メルカリ 2025-03〜2025-04、
 * サイバーエージェント 2023-10）は意図的に含めていない。
 */
export const experiences: Experience[] = [
  { company: 'Mercari, Inc.', role: 'Site Reliability Engineer', start: '2026-04', end: null },
  { company: '株式会社ナガセ', role: 'Software Developer', start: '2020-08', end: null },
  { company: 'Alumnote', role: 'Software Developer', start: '2024-03', end: '2025-11' },
  { company: 'ポケットサイン株式会社', role: 'Software Developer', start: '2024-06', end: '2025-06' },
];

/** 新しい順 */
export const education: Education[] = [
  {
    school: '東京工業大学',
    department: '情報理工学院 数理・計算科学系',
    degree: '修士',
    start: '2024-04',
    end: '2026-03',
  },
  {
    school: '東京工業大学',
    department: '情報理工学院 数理・計算科学系',
    degree: '学士',
    start: '2020-04',
    end: '2024-03',
  },
];

/**
 * 継続中を先に開始日の新しい順、続いて終了済みを終了日の新しい順に並べる。
 * 単純な開始日降順だと6年続いているナガセが末尾に沈むため。
 */
export function sortExperiences(items: Experience[]): Experience[] {
  const ongoing = items
    .filter((e) => e.end === null)
    .sort((a, b) => b.start.localeCompare(a.start));
  const finished = items
    .filter((e): e is Experience & { end: string } => e.end !== null)
    .sort((a, b) => b.end.localeCompare(a.end));
  return [...ongoing, ...finished];
}

/** 構造化データの worksFor に使う現職 */
export function currentRole(): Experience | undefined {
  return sortExperiences(experiences).find((e) => e.end === null);
}
```

- [ ] **Step 4: `index.astro` に Experience / Education を足す**

frontmatter に import と整列を足す。

```astro
---
import { getCollection } from 'astro:content';
import Layout from '../layouts/Layout.astro';
import BlogCard from '../components/BlogCard.astro';
import { author, education, experiences, sortExperiences } from '../data/profile';
import { formatYearMonth } from '../lib/date';

const posts = (await getCollection('blog')).sort(
  (a, b) => b.data.date.valueOf() - a.data.date.valueOf(),
);
const career = sortExperiences(experiences);
---
```

Hero の見出しを氏名入りに変え、Blog セクションの前に2つのセクションを差し込む。

```astro
  <section class="py-8">
    <h1 class="text-2xl font-bold text-gray-800">
      Hi, I'm {author.name} ({author.handle})
    </h1>
    <p class="mt-2 text-gray-500">{author.headline}</p>
    <div class="mt-3 flex gap-4">
      <a href={author.links.github} target="_blank" rel="noopener noreferrer" class="text-sm text-gray-400 hover:text-accent">GitHub</a>
      <a href={author.links.linkedin} target="_blank" rel="noopener noreferrer" class="text-sm text-gray-400 hover:text-accent">LinkedIn</a>
    </div>
  </section>

  <section class="py-4">
    <h2 class="text-lg font-semibold text-gray-800">Experience</h2>
    <div class="mt-4 flex flex-col gap-4">
      {career.map((job) => (
        <div>
          <p class="font-medium text-gray-800">{job.company}</p>
          <p class="text-sm text-gray-500">{job.role}</p>
          <p class="text-sm text-gray-400">
            <time datetime={job.start}>{formatYearMonth(job.start)}</time>
            {' – '}
            {job.end ? <time datetime={job.end}>{formatYearMonth(job.end)}</time> : '現在'}
          </p>
        </div>
      ))}
    </div>
  </section>

  <section class="py-4">
    <h2 class="text-lg font-semibold text-gray-800">Education</h2>
    <div class="mt-4 flex flex-col gap-4">
      {education.map((school) => (
        <div>
          <p class="font-medium text-gray-800">{school.school} {school.department}</p>
          <p class="text-sm text-gray-500">{school.degree}</p>
          <p class="text-sm text-gray-400">
            <time datetime={school.start}>{formatYearMonth(school.start)}</time>
            {' – '}
            <time datetime={school.end}>{formatYearMonth(school.end)}</time>
          </p>
        </div>
      ))}
    </div>
  </section>
```

- [ ] **Step 5: トップページの description を氏名入りに更新する**

```astro
<Layout
  title="kyosu.dev"
  description="Shota Abe (kyosu-1) のポートフォリオ。ソフトウェアエンジニアとしての経歴と技術ブログ。"
>
```

- [ ] **Step 6: テストを実行して通ることを確認する**

Run: `npm test`
Expected: PASS（合計16件）

- [ ] **Step 7: コミット**

```bash
git add -A
git commit -m "feat: トップページに経歴と学歴を追加する"
```

---

## Task 5: BaseHead（メタタグ・canonical・OG）

`<head>` の中身を `BaseHead.astro` に集約し、ページ固有の title / description / canonical / OG / Twitter カードを出力する。

**Files:**
- Create: `src/components/BaseHead.astro`, `tests/seo.test.js`
- Modify: `src/layouts/Layout.astro`, `src/pages/index.astro`, `src/pages/blog/[id].astro`

**Interfaces:**
- Consumes: `Astro.site`（`astro.config.mjs` の `site`）
- Produces:
  - `BaseHead.astro` Props: `{ title: string; description: string; type?: 'website' | 'article'; publishedDate?: Date; tags?: string[] }`
  - `Layout.astro` Props が同じ形に拡張される（`title` と `description` は必須、残りは任意）

- [ ] **Step 1: 失敗するテストを書く**

`tests/seo.test.js`:

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readDist, metaContent } from './helpers.js';

test('ページごとに固有の title が出る', async () => {
  const home = await readDist('index.html');
  const post = await readDist('blog/introducing-batcha/index.html');
  assert.match(home, /<title>kyosu\.dev<\/title>/);
  assert.match(post, /<title>ecspressoライクなAWS Batchデプロイツール「batcha」を作った \| kyosu\.dev<\/title>/);
});

test('meta description が frontmatter の summary から入る', async () => {
  const post = await readDist('blog/introducing-batcha/index.html');
  const desc = metaContent(post, 'name', 'description');
  assert.ok(desc?.includes('AWS Batch Job Definition'), `description が想定と違う: ${desc}`);
});

test('canonical が絶対URLで出る', async () => {
  const home = await readDist('index.html');
  const post = await readDist('blog/introducing-batcha/index.html');
  assert.match(home, /<link rel="canonical" href="https:\/\/kyosu\.dev\/"/);
  assert.match(post, /<link rel="canonical" href="https:\/\/kyosu\.dev\/blog\/introducing-batcha\/"/);
});

test('OG タグが出る', async () => {
  const post = await readDist('blog/introducing-batcha/index.html');
  assert.equal(metaContent(post, 'property', 'og:type'), 'article');
  assert.equal(metaContent(post, 'property', 'og:url'), 'https://kyosu.dev/blog/introducing-batcha/');
  assert.equal(metaContent(post, 'property', 'og:site_name'), 'kyosu.dev');
  assert.equal(metaContent(post, 'property', 'og:locale'), 'ja_JP');
  assert.ok(metaContent(post, 'property', 'article:published_time')?.startsWith('2025-02-12'));
});

test('トップの og:type は website', async () => {
  const home = await readDist('index.html');
  assert.equal(metaContent(home, 'property', 'og:type'), 'website');
});

test('Twitter カードが出る（画像は未設定なので summary）', async () => {
  const post = await readDist('blog/introducing-batcha/index.html');
  assert.equal(metaContent(post, 'name', 'twitter:card'), 'summary');
  assert.equal(metaContent(post, 'name', 'twitter:title'), 'ecspressoライクなAWS Batchデプロイツール「batcha」を作った | kyosu.dev');
});

test('og:image は出力しない', async () => {
  const post = await readDist('blog/introducing-batcha/index.html');
  assert.equal(metaContent(post, 'property', 'og:image'), null);
});
```

- [ ] **Step 2: テストを実行して失敗を確認する**

Run: `npm test`
Expected: FAIL。canonical も OG もまだ出力されていない。

- [ ] **Step 3: `src/components/BaseHead.astro` を作る**

```astro
---
interface Props {
  title: string;
  description: string;
  type?: 'website' | 'article';
  publishedDate?: Date;
  tags?: string[];
}

const { title, description, type = 'website', publishedDate, tags = [] } = Astro.props;

// Astro.site は astro.config.mjs の site。sitemap の必須要件でもある。
const canonical = new URL(Astro.url.pathname, Astro.site).href;
---

<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<link rel="icon" href="/favicon.ico" />

<title>{title}</title>
<meta name="description" content={description} />
<link rel="canonical" href={canonical} />

<meta property="og:type" content={type} />
<meta property="og:title" content={title} />
<meta property="og:description" content={description} />
<meta property="og:url" content={canonical} />
<meta property="og:site_name" content="kyosu.dev" />
<meta property="og:locale" content="ja_JP" />
{publishedDate && (
  <meta property="article:published_time" content={publishedDate.toISOString()} />
)}
{tags.map((tag) => <meta property="article:tag" content={tag} />)}

{/* og:image を用意していないため summary。画像を入れる際は
    summary_large_image に変え、og:image / twitter:image を足す。 */}
<meta name="twitter:card" content="summary" />
<meta name="twitter:title" content={title} />
<meta name="twitter:description" content={description} />

<link rel="alternate" type="application/rss+xml" title="kyosu.dev" href="/rss.xml" />

<link rel="preconnect" href="https://fonts.googleapis.com" />
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
<link
  href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap"
  rel="stylesheet"
/>
```

- [ ] **Step 4: `Layout.astro` を BaseHead に差し替える**

```astro
---
import '../styles/global.css';
import BaseHead from '../components/BaseHead.astro';
import Header from '../components/Header.astro';
import Footer from '../components/Footer.astro';

interface Props {
  title: string;
  description: string;
  type?: 'website' | 'article';
  publishedDate?: Date;
  tags?: string[];
}

const { title, description, type, publishedDate, tags } = Astro.props;
---

<!doctype html>
<html lang="ja">
  <head>
    <BaseHead
      title={title}
      description={description}
      type={type}
      publishedDate={publishedDate}
      tags={tags}
    />
  </head>
  <body class="bg-white text-gray-800 antialiased">
    <div class="mx-auto max-w-2xl px-4">
      <Header />
      <main class="min-h-[60vh] py-4">
        <slot />
      </main>
      <Footer />
    </div>
  </body>
</html>
```

- [ ] **Step 5: 記事ページから article 用の props を渡す**

`blog/[id].astro` の `<Layout>` を書き換える。

```astro
<Layout
  title={`${post.data.title} | kyosu.dev`}
  description={post.data.summary}
  type="article"
  publishedDate={post.data.date}
  tags={post.data.tags}
>
```

- [ ] **Step 6: テストを実行して通ることを確認する**

Run: `npm test`
Expected: PASS（合計23件）

- [ ] **Step 7: コミット**

```bash
git add -A
git commit -m "feat: BaseHead でメタタグと OG を出力する"
```

---

## Task 6: 構造化データ (JSON-LD)

トップに `Person` と `WebSite`、記事に `BlogPosting` を出力する。内容は `profile.ts` から導出し、画面表示と食い違わないようにする。

**Files:**
- Create: `src/lib/structured-data.ts`, `tests/structured-data.test.js`
- Modify: `src/components/BaseHead.astro`, `src/layouts/Layout.astro`, `src/pages/index.astro`, `src/pages/blog/[id].astro`

**Interfaces:**
- Consumes: `author`, `education`, `currentRole` (`src/data/profile.ts`)
- Produces:
  - `personSchema(site: URL): object`
  - `websiteSchema(site: URL): object`
  - `blogPostingSchema(params: { site: URL; url: string; title: string; description: string; date: Date; tags: string[] }): object`
  - `BaseHead.astro` / `Layout.astro` の Props に `schemas?: object[]` が加わる

- [ ] **Step 1: 失敗するテストを書く**

`tests/structured-data.test.js`:

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readDist, jsonLdBlocks } from './helpers.js';

test('トップに Person と WebSite が出る', async () => {
  const blocks = jsonLdBlocks(await readDist('index.html'));
  const types = blocks.map((b) => b['@type']);
  assert.ok(types.includes('Person'), `Person がない: ${types}`);
  assert.ok(types.includes('WebSite'), `WebSite がない: ${types}`);
});

test('Person の内容が画面表示と一致する', async () => {
  const html = await readDist('index.html');
  const person = jsonLdBlocks(html).find((b) => b['@type'] === 'Person');

  assert.equal(person.name, 'Shota Abe');
  assert.equal(person.alternateName, 'kyosu-1');
  assert.equal(person.url, 'https://kyosu.dev/');
  assert.deepEqual(person.sameAs, [
    'https://github.com/kyosu-1',
    'https://www.linkedin.com/in/shota-abe',
  ]);

  // profile.ts から導出されているので、画面にも同じ文字列があるはず
  assert.equal(person.worksFor.name, 'Mercari, Inc.');
  assert.ok(html.includes(person.worksFor.name));
  assert.equal(person.alumniOf.name, '東京工業大学');
  assert.ok(html.includes(person.alumniOf.name));
});

test('記事に BlogPosting が出る', async () => {
  const blocks = jsonLdBlocks(await readDist('blog/introducing-batcha/index.html'));
  const posting = blocks.find((b) => b['@type'] === 'BlogPosting');

  assert.ok(posting, 'BlogPosting がない');
  assert.equal(posting.headline, 'ecspressoライクなAWS Batchデプロイツール「batcha」を作った');
  assert.ok(posting.datePublished.startsWith('2025-02-12'));
  assert.equal(posting.author.name, 'Shota Abe');
  assert.equal(posting.mainEntityOfPage['@id'], 'https://kyosu.dev/blog/introducing-batcha/');
  assert.match(posting.keywords, /Go/);
});

test('記事ページに Person は出さない', async () => {
  const blocks = jsonLdBlocks(await readDist('blog/introducing-batcha/index.html'));
  assert.equal(blocks.filter((b) => b['@type'] === 'Person').length, 0);
});
```

- [ ] **Step 2: テストを実行して失敗を確認する**

Run: `npm test`
Expected: FAIL。JSON-LD がまだ1つも出力されていない。

- [ ] **Step 3: `src/lib/structured-data.ts` を作る**

```ts
import { author, currentRole, education } from '../data/profile';

export function personSchema(site: URL) {
  const job = currentRole();
  return {
    '@context': 'https://schema.org',
    '@type': 'Person',
    name: author.name,
    alternateName: author.handle,
    url: site.href,
    jobTitle: author.jobTitle,
    ...(job ? { worksFor: { '@type': 'Organization', name: job.company } } : {}),
    alumniOf: { '@type': 'CollegeOrUniversity', name: education[0].school },
    sameAs: [author.links.github, author.links.linkedin],
  };
}

export function websiteSchema(site: URL) {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: 'kyosu.dev',
    url: site.href,
    author: { '@type': 'Person', name: author.name },
  };
}

export function blogPostingSchema(params: {
  site: URL;
  url: string;
  title: string;
  description: string;
  date: Date;
  tags: string[];
}) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    headline: params.title,
    description: params.description,
    datePublished: params.date.toISOString(),
    keywords: params.tags.join(', '),
    author: { '@type': 'Person', name: author.name, url: params.site.href },
    mainEntityOfPage: { '@type': 'WebPage', '@id': params.url },
  };
}
```

- [ ] **Step 4: `BaseHead.astro` に schemas を受け取らせる**

Props に追加する。

```astro
interface Props {
  title: string;
  description: string;
  type?: 'website' | 'article';
  publishedDate?: Date;
  tags?: string[];
  schemas?: object[];
}

const {
  title,
  description,
  type = 'website',
  publishedDate,
  tags = [],
  schemas = [],
} = Astro.props;
```

テンプレートの末尾（フォントの `<link>` の後）に追加する。

```astro
{schemas.map((schema) => (
  <script type="application/ld+json" set:html={JSON.stringify(schema)} is:inline />
))}
```

- [ ] **Step 5: `Layout.astro` に schemas を通す**

Props に `schemas?: object[]` を足し、分割代入に `schemas` を加えて `<BaseHead ... schemas={schemas} />` に渡す。

- [ ] **Step 6: トップページから Person / WebSite を渡す**

`index.astro` の frontmatter に追加する。

```ts
import { personSchema, websiteSchema } from '../lib/structured-data';

const site = Astro.site!;
const schemas = [personSchema(site), websiteSchema(site)];
```

`<Layout>` に `schemas={schemas}` を渡す。

- [ ] **Step 7: 記事ページから BlogPosting を渡す**

`blog/[id].astro` の frontmatter に追加する。

```ts
import { blogPostingSchema } from '../../lib/structured-data';

const site = Astro.site!;
const canonical = new URL(Astro.url.pathname, site).href;
const schemas = [
  blogPostingSchema({
    site,
    url: canonical,
    title: post.data.title,
    description: post.data.summary,
    date: post.data.date,
    tags: post.data.tags,
  }),
];
```

`<Layout>` に `schemas={schemas}` を渡す。

- [ ] **Step 8: テストを実行して通ることを確認する**

Run: `npm test`
Expected: PASS（合計27件）

- [ ] **Step 9: コミット**

```bash
git add -A
git commit -m "feat: Person / WebSite / BlogPosting の構造化データを出力する"
```

---

## Task 7: sitemap / robots.txt / RSS / 404

クローラへの導線を作る。本番で 404 だった `/robots.txt` と `/sitemap.xml` を解消する。

**Files:**
- Create: `src/pages/robots.txt.ts`, `src/pages/rss.xml.ts`, `src/pages/404.astro`, `tests/feeds.test.js`

**Interfaces:**
- Consumes: コレクション `blog`、`Astro.site`、`@astrojs/sitemap`（Task 1 で `astro.config.mjs` に配線済み）
- Produces: `dist/sitemap-index.xml`, `dist/sitemap-0.xml`, `dist/robots.txt`, `dist/rss.xml`, `dist/404.html`

- [ ] **Step 1: 失敗するテストを書く**

`tests/feeds.test.js`:

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readDist } from './helpers.js';

test('sitemap にトップと全記事が載る', async () => {
  const xml = await readDist('sitemap-0.xml');
  assert.match(xml, /<loc>https:\/\/kyosu\.dev\/<\/loc>/);
  assert.match(xml, /<loc>https:\/\/kyosu\.dev\/blog\/introducing-batcha\/<\/loc>/);
  assert.match(xml, /<loc>https:\/\/kyosu\.dev\/blog\/private-isu-with-claude-code\/<\/loc>/);
});

test('sitemap-index が生成される', async () => {
  const xml = await readDist('sitemap-index.xml');
  assert.match(xml, /sitemap-0\.xml/);
});

test('robots.txt が sitemap を指す', async () => {
  const txt = await readDist('robots.txt');
  assert.match(txt, /User-agent: \*/);
  assert.match(txt, /Sitemap: https:\/\/kyosu\.dev\/sitemap-index\.xml/);
});

test('RSS に記事が新しい順で載る', async () => {
  const xml = await readDist('rss.xml');
  // @astrojs/rss が title を CDATA で包むかは版に依存するため、
  // エスケープの影響を受けない <link> の URL とその並びで判定する
  assert.match(xml, /<link>https:\/\/kyosu\.dev\/blog\/private-isu-with-claude-code\/<\/link>/);
  assert.match(xml, /<link>https:\/\/kyosu\.dev\/blog\/introducing-batcha\/<\/link>/);
  const newer = xml.indexOf('private-isu-with-claude-code');
  const older = xml.indexOf('introducing-batcha');
  assert.ok(newer < older, 'RSS の並びが新しい順になっていない');
});

test('404 ページが生成される', async () => {
  const html = await readDist('404.html');
  assert.match(html, /404/);
  assert.match(html, /ページが見つかりませんでした/);
});
```

- [ ] **Step 2: テストを実行して失敗を確認する**

Run: `npm test`
Expected: FAIL。sitemap は Task 1 の設定で既に出ているはずだが、`robots.txt` / `rss.xml` / `404.html` が無く `ENOENT`。

- [ ] **Step 3: `src/pages/robots.txt.ts` を作る**

```ts
import type { APIRoute } from 'astro';

export const GET: APIRoute = ({ site }) => {
  // site は astro.config.mjs の値。ドメインを変えたときに
  // ここが取り残されないよう、直書きせず導出する。
  const sitemapURL = new URL('sitemap-index.xml', site);
  const body = `User-agent: *
Allow: /

Sitemap: ${sitemapURL.href}
`;
  return new Response(body, {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  });
};
```

- [ ] **Step 4: `src/pages/rss.xml.ts` を作る**

```ts
import rss from '@astrojs/rss';
import { getCollection } from 'astro:content';
import type { APIRoute } from 'astro';

export const GET: APIRoute = async (context) => {
  const posts = (await getCollection('blog')).sort(
    (a, b) => b.data.date.valueOf() - a.data.date.valueOf(),
  );

  return rss({
    title: 'kyosu.dev',
    description: 'Shota Abe (kyosu-1) の技術ブログ。',
    site: context.site!,
    items: posts.map((post) => ({
      title: post.data.title,
      description: post.data.summary,
      pubDate: post.data.date,
      categories: post.data.tags,
      link: `/blog/${post.id}/`,
    })),
  });
};
```

- [ ] **Step 5: `src/pages/404.astro` を作る**

移行前の `NotFound.tsx` をそのまま移植する。GitHub Pages は `404.html` を自動で使う。

```astro
---
import Layout from '../layouts/Layout.astro';
---

<Layout title="404 | kyosu.dev" description="ページが見つかりませんでした。">
  <div class="flex flex-col items-center justify-center py-24 text-center">
    <h1 class="text-6xl font-bold text-gray-200">404</h1>
    <p class="mt-4 text-gray-500">ページが見つかりませんでした</p>
    <a href="/" class="mt-6 text-sm font-medium text-accent hover:underline">ホームに戻る</a>
  </div>
</Layout>
```

- [ ] **Step 6: テストを実行して通ることを確認する**

Run: `npm test`
Expected: PASS（合計32件）

- [ ] **Step 7: コミット**

```bash
git add -A
git commit -m "feat: sitemap / robots.txt / RSS / 404 を追加する"
```

---

## Task 8: ハッシュURLの引き継ぎと仕上げ

旧 `/#/blog/{slug}` からの着地を新URLに送り、README を更新して、spec の検証項目を通しで確認する。

**Files:**
- Create: `tests/redirect.test.js`
- Modify: `src/pages/index.astro`, `README.md`

**Interfaces:**
- Consumes: Task 2 が定めた URL 形式 `/blog/{id}/`
- Produces: なし（最終タスク）

- [ ] **Step 1: 失敗するテストを書く**

`tests/redirect.test.js`:

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readDist } from './helpers.js';

test('トップにハッシュURLの引き継ぎスクリプトが入る', async () => {
  const html = await readDist('index.html');
  // 正規表現リテラルのエスケープ表記に依存しないよう、
  // スクリプトが使っている API の存在で判定する
  assert.match(html, /location\.hash/);
  assert.match(html, /location\.replace/);
  assert.match(html, /'\/blog\/'/);
});

test('引き継ぎスクリプト以外に JS を配信しない', async () => {
  const html = await readDist('index.html');
  const scripts = html.match(/<script(?![^>]*application\/ld\+json)[^>]*>/g) ?? [];
  assert.equal(scripts.length, 1, `想定外の <script> がある: ${scripts.join(', ')}`);
  assert.doesNotMatch(html, /<script[^>]*\ssrc=/, '外部 JS が読み込まれている');
});
```

- [ ] **Step 2: テストを実行して失敗を確認する**

Run: `npm test`
Expected: FAIL。リダイレクトスクリプトがまだ無い。

- [ ] **Step 3: `index.astro` にリダイレクトスクリプトを足す**

`<Layout>` の直下、最初の `<section>` より前に置く。`is:inline` を付けるのは、Astro にバンドルさせず生のまま出力させるため（外部 JS ファイルを作らせない）。

```astro
  {/* 旧 HashRouter 時代の /#/blog/{slug} を新URLへ送る。
      外部に共有済みのリンクへの保険であり、不要と判断したら削除してよい。 */}
  <script is:inline>
    (function () {
      var m = location.hash.match(/^#\/blog\/([A-Za-z0-9._-]+)\/?$/);
      if (m) location.replace('/blog/' + m[1] + '/');
    })();
  </script>
```

- [ ] **Step 4: テストを実行して通ることを確認する**

Run: `npm test`
Expected: PASS（合計34件）

- [ ] **Step 5: 記事一覧の空状態フォールバックを復元する**

移行前の `src/pages/Home.tsx` には記事が0件のときの表示があったが、Task 3 の実装（およびこの計画の Task 3 Step 8 のコード）がこれを落としていた。「表示テキストは移行前と一致させる」制約に反するため復元する。

`src/pages/index.astro` の Blog セクションの `{posts.map(...)}` を次の形に戻す。

```astro
      {posts.length > 0 ? (
        posts.map((post) => (
          <BlogCard
            id={post.id}
            title={post.data.title}
            date={post.data.date}
            tags={post.data.tags}
            summary={post.data.summary}
          />
        ))
      ) : (
        <p class="text-sm text-gray-400">記事はまだありません。</p>
      )}
```

`posts/` が空になることは現状ないため自動テストは追加しない（空のコレクションを作るにはリポジトリの記事を退避させる必要があり、テストの代償が見合わない）。`npm test` が引き続き10件以上通ることだけ確認する。

- [ ] **Step 6: README を更新する**

`README.md` に対して3点変更する。ネストしたコードフェンスを避けるため、差分で示す。

1. 「利用技術」のリストを次の4行に差し替える（React / Vite / TypeScript の3行を置き換える）:

~~~
- Astro 7
- TypeScript
- Tailwind CSS v4
~~~

2. 「開発」節のアクセス先ポートを `http://localhost:5173` から `http://localhost:4321` に変える（Astro の既定ポート）。

3. ファイル末尾に「テスト」節を足す。本文は次のとおり（`~~~` は実際には3連バッククォートで書く）:

~~~
## テスト

ビルド成果物（`dist/`）に対する検証を実行する。

```shell
npm test
```
~~~

- [ ] **Step 7: spec の検証項目を通しで確認する**

Run:

```bash
npm run build
echo "--- 本文の実在 ---"
grep -c "873,466" dist/blog/private-isu-with-claude-code/index.html
echo "--- JS バンドルの有無（記事本文に react の語が出ても誤検知しないよう、実ファイルを見る） ---"
find dist -name '*.js' | grep . && echo "!!! JS が配信されている" || echo "JS なし"
echo "--- メールアドレス ---"
grep -rl "sho013039" dist/ || echo "なし"
echo "--- 除外したインターン ---"
grep -rl "サイバーエージェント" dist/ || echo "なし"
echo "--- 生成物 ---"
ls dist/robots.txt dist/rss.xml dist/404.html dist/sitemap-index.xml dist/sitemap-0.xml
ls dist/blog/*/index.html
```

Expected: 本文の grep が 1 以上、「JS なし」、メールアドレスとサイバーエージェントはいずれも「なし」、生成物がすべて存在する。

- [ ] **Step 8: 見た目を本番と比較する**

Run: `npm run preview`

`http://localhost:4321/` と `https://kyosu.dev/` を並べ、**意図した変更（Hero の氏名、Experience / Education の追加）以外に差分がないこと**を確認する。記事ページは完全に一致するはずなので、コードブロックの背景色と等幅フォントを特に見る。

- [ ] **Step 9: コミット**

```bash
git add -A
git commit -m "feat: 旧ハッシュURLの引き継ぎと README 更新"
```

---

## 実装後の手順（コード外）

デプロイ後に実施する。コードでは完結しない。

1. **PR を作ってマージし、デプロイを確認する** — `.github/workflows/deploy.yml` が走り、`https://kyosu.dev/blog/private-isu-with-claude-code` が 200 を返すことを確認する
2. **Google Search Console にドメインプロパティを登録** — `kyosu.dev` を「ドメイン」プロパティとして追加し、表示された TXT レコードを DNS に登録する。ドメインプロパティを選ぶのは、リポジトリに検証用ファイルを置かずに済むため
3. **sitemap を送信** — 「サイトマップ」から `https://kyosu.dev/sitemap-index.xml` を送信する
4. **インデックス登録をリクエスト** — 「URL検査」でトップと記事2本を個別に検査し、登録をリクエストする
5. **Rich Results Test で構造化データを確認** — トップの `Person`、記事の `BlogPosting` がエラーなく読めること
6. **待つ** — インデックスは即時ではない。数日〜数週間かかる。`site:kyosu.dev` で掲載状況を確認する

## 積み残し

- **OG 画像**: 今回は出力しない。1200×630 の画像を `public/og-default.png` に置き、`BaseHead.astro` の `twitter:card` を `summary_large_image` に変えて `og:image` / `twitter:image` を足せば有効になる
- **タグ別一覧ページ**: 記事2本の現状では中身の薄いページの量産になるため見送り。記事が増えてから再検討する
- **大学名の表記**: 東京工業大学は2024年10月に東京科学大学へ統合されている。本計画では LinkedIn エクスポートの記載に従い「東京工業大学」としている
