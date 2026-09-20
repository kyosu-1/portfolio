# kyosu.dev SEO 改善: Astro 移行 設計

作成日: 2026-09-20

## 背景

kyosu.dev が検索結果に出ていない。体感ではなく構造的な原因がある。2026-09-20 時点の実測:

| パス | HTTP |
|---|---|
| `/` | 200 |
| `/robots.txt` | 404 |
| `/sitemap.xml` | 404 |
| `/blog/private-isu-with-claude-code` | 404 |

原因は4つ。

**1. `HashRouter` を使っている（決定的）**

`src/App.tsx` が `HashRouter` を使うため、記事URLは `https://kyosu.dev/#/blog/{slug}` になる。URL のフラグメント（`#` 以降）はサーバーに送られず、クローラは全記事を `https://kyosu.dev/` という単一URLとして扱う。Google の `#!` クロール方式は2015年に廃止済みで代替もない。**記事ページは検索エンジンから見て存在していない。**

**2. ビルド成果物に本文がない**

`dist/index.html` の `<body>` は `<div id="root"></div>` のみ。完全なクライアントサイドレンダリングで、初期HTMLにタイトルも本文も見出しも含まれない。

**3. メタ情報がほぼ空**

`<title>` は全ページ `kyosu.dev` 固定。meta description / OG / Twitter card / canonical / 構造化データがいずれも無い。SNS に貼っても無地のリンクになる。

**4. クローラへの導線がない**

`robots.txt` と `sitemap.xml` が存在せず、Google Search Console にも未登録。

## ゴール

- 記事が個別URLでインデックスされ、技術トピックの検索から流入すること（主目的）
- 「kyosu-1」「Shota Abe」での検索でポートフォリオが出ること（副目的）

## 非ゴール

- デザインの変更。見た目は現状を 1:1 で維持する
- タグ別一覧ページの追加。記事2本の現状では中身の薄いページの量産になり、評価上むしろマイナスに働きうる。記事が増えてから再検討する
- 記事ごとの OG 画像自動生成。後から独立して足せる

## 採用する方針

**Astro への移行**、React コンポーネントは `.astro` に書き直す。

既存コンポーネント8個（Layout / Header / Footer / BlogCard / TagBadge / NotFound / Home / BlogPost）を確認した結果、`useState` も `useEffect` も使われておらず、**インタラクティブな要素がひとつもない**。React が担っているのは `Link`（→ ただの `<a>`）と `useParams`（→ Astro の動的ルートパラメータ）だけ。静的表示しかしないのに React ランタイムを配信し続ける理由がないため、`.astro` に書き直して配信JSを実質ゼロにする。

Markdown 処理は Astro Content Collections、シンタックスハイライトは組み込みの Shiki が引き継ぐ。

### バージョン

| パッケージ | バージョン |
|---|---|
| `astro` | 7.3.x |
| `@astrojs/sitemap` | 3.7.x |
| `@astrojs/rss` | 4.0.x |
| `@astrojs/check` | 0.9.x |

実装時に `astro` の Node エンジン要件を確認する。CI は Node 22 を使っており、満たさない場合は `deploy.yml` の `node-version` を上げる。

## アーキテクチャ

### ディレクトリ構成

`posts/` はリポジトリルートに残す。Astro の `glob()` ローダーは `base` で任意のディレクトリを指定できるため、記事ファイルの場所と git 履歴を動かす必要がない。

```
├── astro.config.mjs
├── tsconfig.json                 # Astro のベース設定に差し替え
├── src/
│   ├── content.config.ts
│   ├── components/
│   │   ├── BaseHead.astro        # SEO の中核。全ページがこれを通る
│   │   ├── Header.astro
│   │   ├── Footer.astro
│   │   ├── BlogCard.astro
│   │   └── TagBadge.astro
│   ├── layouts/
│   │   └── Layout.astro
│   ├── pages/
│   │   ├── index.astro           # /
│   │   ├── blog/[id].astro       # /blog/{slug}
│   │   ├── rss.xml.ts            # /rss.xml
│   │   ├── robots.txt.ts         # /robots.txt
│   │   └── 404.astro             # → dist/404.html（GitHub Pages が自動採用）
│   └── styles/global.css         # 旧 src/index.css
├── posts/                        # 移動しない
│   ├── introducing-batcha.md
│   └── private-isu-with-claude-code.md
└── public/
    ├── CNAME
    └── favicon.ico
```

### astro.config.mjs

`site` は `@astrojs/sitemap` の必須要件であり、canonical と OG の絶対URL生成にも使う。

```js
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  site: 'https://kyosu.dev',
  integrations: [sitemap()],
  markdown: {
    shikiConfig: { theme: 'github-light' },
  },
  vite: { plugins: [tailwindcss()] },
});
```

`shikiConfig.theme` に `github-light` を指定するのは、現行の highlight.js が GitHub Light テーマだから。Astro の既定は `github-dark` なので、指定しないと見た目が変わる。

### content.config.ts

```ts
import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';

const blog = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './posts' }),
  schema: z.object({
    title: z.string(),
    date: z.coerce.date(),
    tags: z.array(z.string()).default([]),
    summary: z.string(),
  }),
});

export const collections = { blog };
```

`summary` は **必須**にする。これが meta description と OG description になるため、欠けたまま記事を公開できないようにビルドを落とす。既存2記事はいずれも記入済みなので移行時の追記は不要。

`date` は現在ただの文字列（`"2026-08-21"`）。`z.coerce.date()` で Date に変換し、`<time datetime>` と構造化データの ISO 8601 に使う。**画面上の表示は `YYYY-MM-DD` のままにする**（`toISOString().slice(0, 10)`）。

エントリの `id` はファイル名から自動生成されるため、`introducing-batcha.md` → `id: "introducing-batcha"` となり、現行の slug と一致する。

### ルーティング

`src/pages/blog/[id].astro`:

```astro
---
import { getCollection, render } from 'astro:content';

export async function getStaticPaths() {
  const posts = await getCollection('blog');
  return posts.map((post) => ({ params: { id: post.id }, props: { post } }));
}

const { post } = Astro.props;
const { Content } = await render(post);
---
```

各記事は `dist/blog/{slug}/index.html` として実ファイル生成される。GitHub Pages は静的ファイルをそのまま配信するので、直リンクが 404 にならない。

## SEO レイヤー

### BaseHead.astro

全ページが経由する単一のコンポーネント。props:

| prop | 型 | 用途 |
|---|---|---|
| `title` | `string` | ページ固有タイトル |
| `description` | `string` | meta description / OG / Twitter |
| `type` | `'website' \| 'article'` | og:type |
| `publishedDate` | `Date?` | article:published_time / datePublished |
| `tags` | `string[]?` | article:tag / keywords |

出力:

- `<title>` — 記事: `{記事タイトル} | kyosu.dev` / トップ: `kyosu.dev — Shota Abe (kyosu-1)`
- `<meta name="description">`
- `<link rel="canonical">` — `new URL(Astro.url.pathname, Astro.site)` で絶対URL化
- **OG** — `og:type` / `og:title` / `og:description` / `og:url` / `og:site_name` / `og:locale=ja_JP`、記事のみ `article:published_time` と `article:tag`
- **Twitter** — `twitter:card` / `twitter:title` / `twitter:description`
- `<link rel="alternate" type="application/rss+xml" href="/rss.xml">`
- **JSON-LD**（下記）

`og:image` は未決事項（後述）。画像を持たない間は `twitter:card` を `summary` にし、画像が入った時点で `summary_large_image` に切り替える。

### 構造化データ (JSON-LD)

トップ — `Person` と `WebSite`:

```json
{
  "@context": "https://schema.org",
  "@type": "Person",
  "name": "Shota Abe",
  "alternateName": "kyosu-1",
  "url": "https://kyosu.dev",
  "jobTitle": "Software Engineer",
  "sameAs": [
    "https://github.com/kyosu-1",
    "https://www.linkedin.com/in/shota-abe"
  ]
}
```

記事 — `BlogPosting`（`headline` / `description` / `datePublished` / `keywords` / `author` は上記 Person への参照 / `mainEntityOfPage`）。

### トップページの氏名表記

名前検索でヒットさせるには、その名前がページ上に存在している必要がある。現状の見出しは `Hi, I'm kyosu-1` のみで本名がない。これを **`Hi, I'm Shota Abe (kyosu-1)`** に変更し、JSON-LD の `Person.name` と一致させる。これが本設計における唯一の表示テキスト変更。

### 生成される成果物

| ファイル | 生成元 |
|---|---|
| `sitemap-index.xml` / `sitemap-0.xml` | `@astrojs/sitemap` が自動生成 |
| `robots.txt` | `src/pages/robots.txt.ts`。`Astro.site` から `Sitemap:` 行を導出する |
| `rss.xml` | `src/pages/rss.xml.ts`（`@astrojs/rss`） |
| `404.html` | `src/pages/404.astro` |

## URL 移行

新URL は `/` と `/blog/{slug}`。

旧ハッシュURL `/#/blog/{slug}` は素のままだとトップに着地する（404 にはならない）。`index.astro` にインラインスクリプトを置き、`location.hash` が `#/blog/...` 形式なら対応する新URLへ `location.replace()` する。10行程度。

これは外部に共有済みリンクへの保険であり、該当がなければ削除してよい。ゼロJSのサイトに唯一残るスクリプトになるため、不要と判断した時点で落とす。

## 削除されるもの

**ファイル**: `src/App.tsx` / `src/main.tsx` / `src/pages/*.tsx` / `src/components/*.tsx` / `src/lib/posts.ts` / `src/types.ts` / `index.html` / `vite.config.ts` / `vite-env.d.ts`

**依存**: `react` / `react-dom` / `react-router-dom` / `react-markdown` / `rehype-highlight` / `remark-gfm`（Astro に GFM 組み込み）/ `front-matter` / `@vitejs/plugin-react` / `@types/react` / `@types/react-dom`

**残す依存**: `tailwindcss` / `@tailwindcss/vite` / `@tailwindcss/typography` / `typescript`

**CSS**: `src/index.css` の highlight.js 用スタイル（`.hljs-*` 系、約70行）を削除。Shiki は `<pre class="astro-code" style="...">` を出力するため、`.prose pre` の `!important` オーバーライドも Shiki 向けに書き直す。`@theme` ブロック（`--font-sans` / `--font-mono` / `--color-accent: #4a6cf7`）はそのまま残す。

## CI / デプロイ

`.github/workflows/deploy.yml` は**変更不要**。Astro の既定出力先も `dist/` で、`npm run build` を叩く構造も同じ。

`package.json` の scripts のみ差し替える:

```json
"dev": "astro dev",
"build": "astro check && astro build",
"preview": "astro preview"
```

`astro check` を入れるのは、`tsc -b` が担っていた型チェックを引き継ぐため。

## 検証

「デプロイしたら検索に出るはず」では終わらせない。`npm run build` 後に `dist/` に対して以下を確認する。

1. **本文の実在** — `dist/blog/private-isu-with-claude-code/index.html` に記事本文の一節が含まれること（grep）。初期HTMLに本文が入ることが移行の本質なので、これが通らなければ他は無意味
2. **メタ情報** — 各ページの `<title>` が固有であること、`<meta name="description">` / `<link rel="canonical">` / `og:url` が正しい絶対URLで存在すること
3. **構造化データ** — トップに `Person`、記事に `BlogPosting` の JSON-LD が含まれること。Google の Rich Results Test でも確認する
4. **sitemap** — `dist/sitemap-0.xml` にトップと全記事URLが列挙されていること
5. **robots.txt** — `Sitemap: https://kyosu.dev/sitemap-index.xml` を含むこと
6. **JS 配信量** — `dist/` に React のバンドルが残っていないこと
7. **見た目** — `npm run preview` で現行サイトと並べて差分がないこと（ハイライトの配色を特に確認）

## コード外の手順（デプロイ後に実施）

1. **Google Search Console にドメインプロパティを登録** — `kyosu.dev` を「ドメイン」プロパティとして追加し、表示された TXT レコードを DNS に登録して所有権を確認する。ドメインプロパティを選ぶのは、HTML ファイル方式と違いリポジトリに検証用ファイルを置かずに済み、サブドメイン・プロトコルをまとめて扱えるため
2. **sitemap を送信** — 「サイトマップ」から `https://kyosu.dev/sitemap-index.xml` を送信
3. **インデックス登録をリクエスト** — 「URL検査」でトップと記事2本を個別に検査し、インデックス登録をリクエストする
4. **数日〜数週間待つ** — インデックスは即時ではない。`site:kyosu.dev` で検索して掲載状況を確認する

## 未決事項

**OG 画像**。`og:image` があると SNS 上での見え方が大きく変わるが、現状 1200×630 の画像素材がない。選択肢:

- 画像を用意してもらい `public/og-default.png` に置く（`twitter:card=summary_large_image`）
- 画像なしで進める（`twitter:card=summary`。タイトルと説明文は表示される）

実装は後者で始め、画像が入った時点で `BaseHead.astro` の2行を変えるだけで切り替わる構造にする。
