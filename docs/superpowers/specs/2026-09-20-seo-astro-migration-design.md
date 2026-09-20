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
- ~~トップページに経歴・学歴を掲載し、人物としての同定に足る情報量を持たせること~~
  **[2026-09-20 追記] 経歴の `/about/` 分離により、この行は事実と異なる。** 経歴・学歴は `/about/` に掲載する。トップは氏名・ハンドル・headline・GitHub/LinkedIn（Hero）で人物としての同定に足る情報量を持たせ、経歴の詳細は `/about/` が担う。

## 非ゴール

- デザインの変更。見た目は現状を 1:1 で維持する
- タグ別一覧ページの追加。記事2本の現状では中身の薄いページの量産になり、評価上むしろマイナスに働きうる。記事が増えてから再検討する
- 記事ごとの OG 画像自動生成。後から独立して足せる
- ~~`/about` の独立ページ。経歴はトップページ内に置く。ルートに情報を集約したほうが名前検索に効き、記事2本の規模でページを分けると評価が分散する~~
  **[2026-09-20 追記] この方針はユーザーの判断で反転した。** 当初はここに書いたとおり `/about` を作らない前提で本設計・実装を進めたが、「経歴は別ページにしたい。Blog を中心としたい」という方針変更があり、経歴・学歴セクションをトップページから `/about/` へ分離した。トップは Hero（氏名・headline・GitHub/LinkedIn）と Blog 一覧のみになり、Header に `Blog` / `About` の2リンクを持つ。詳細は「トップページの構成とプロフィール」節と「構造化データ」節の追記を参照。
- メールアドレスの掲載。スパム収集の対象になるため、連絡手段は GitHub と LinkedIn に限る
- スキル一覧。LinkedIn が自動算出した Python / Terraform / OIDC はブログの内容（Go・AWS・ISUCON）と整合しないため載せない

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
│   ├── data/
│   │   └── profile.ts            # 経歴・学歴。表示と JSON-LD の単一ソース
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

**[2026-09-20 追記] `src/pages/about.astro`（`/about/`）を追加した。** 経歴の `/about/` 分離に伴う新規ページで、上記ディレクトリ構成には含まれていない。`src/pages/` は `index.astro` / `about.astro` / `blog/[id].astro` / `rss.xml.ts` / `robots.txt.ts` / `404.astro` の6種になる。

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

**[2026-09-20 追記] `noindex` が true のページでは `canonical` と `og:url` を出さない。** `dist/404.html` のように canonical の宛先URL（`/404/`）が実際には生成されないページに canonical を出すのは有害なため。

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
  "worksFor": { "@type": "Organization", "name": "Mercari, Inc." },
  "alumniOf": { "@type": "CollegeOrUniversity", "name": "東京工業大学" },
  "sameAs": [
    "https://github.com/kyosu-1",
    "https://www.linkedin.com/in/shota-abe"
  ]
}
```

`worksFor` と `alumniOf` は `src/data/profile.ts` から導出する（`worksFor` は継続中かつ正社員の職歴、`alumniOf` は最終学歴。選び方の詳細は下記「プロフィールデータ」節の `primaryRole()` を参照）。`jobTitle` は Hero の表示テキスト「ソフトウェアエンジニア。」と揃えて `Software Engineer` とし、メルカリでの職種 `Site Reliability Engineer` は Experience セクション側で表示する。

記事 — `BlogPosting`（`headline` / `description` / `datePublished` / `keywords` / `author` は上記 Person への参照 / `mainEntityOfPage`）。

**[2026-09-20 追記] 経歴の `/about/` 分離に伴い、上記の `Person` は分割した。** 「構造化データは可視コンテンツと一致させる」という本設計の原則をそのまま適用すると、Experience/Education がトップから消えた時点でトップの `Person` から `worksFor` / `alumniOf` を落とす必要があるため。

- `personSchema(site)` — トップ用の軽量版。`name` / `alternateName` / `url` / `jobTitle` / `sameAs` のみ。`@id`（`{site}#person`）を持ち、ページを跨いで同一人物であることを示す
- `fullPersonSchema(site)` — `/about/` 用。`personSchema` の全項目に `worksFor`（`primaryRole()`）と `alumniOf`（`latestEducation().school`）を加えたもの。`worksFor` は「継続中かつ正社員」で選ぶ。ナガセ（業務委託）も継続中のため、開始日順に頼ると並びを変えた瞬間に `worksFor` が変わってしまう
- `profilePageSchema(site, url)` — `/about/` の `ProfilePage`。`mainEntity` は `{ "@id": "{site}#person" }` という参照のみで、`fullPersonSchema` をここに入れ子にしない（`@context` の二重化を避けるため）。2つの独立した JSON-LD ブロックとして出力し、`@id` で結びつく

| ページ | ブロック |
|---|---|
| `/` | `WebSite` + `Person`（軽量、`@id` 付き） |
| `/about/` | `ProfilePage`（`mainEntity` は `@id` 参照）+ `Person`（完全版、`@id` 付き） |
| `/blog/{id}/` | `BlogPosting`（変更なし） |

### トップページの構成とプロフィール

名前検索でヒットさせるには、その名前がページ上に存在している必要がある。現状の見出しは `Hi, I'm kyosu-1` のみで本名がなく、ページ全体の実テキストもごくわずか。以下の構成にする。

```
Hero        Hi, I'm Shota Abe (kyosu-1) / ソフトウェアエンジニア。/ GitHub · LinkedIn
Experience  職歴4件
Education   学歴
Blog        記事一覧（現行のまま）
```

Hero の見出しを `Hi, I'm Shota Abe (kyosu-1)` に変更し、JSON-LD の `Person.name` / `alternateName` と一致させる。既存のスタイル（`max-w-2xl` / グレー基調 / accent `#4a6cf7`）はそのまま使い、Experience / Education は Blog 見出しと同じ `text-lg font-semibold` のセクション見出しで揃える。

**[2026-09-20 追記] 上記はこの設計時点の構成であり、その後 Experience / Education を `/about/` に分離した。** 現在の構成は次のとおり。

```
/           Hero（Hi, I'm Shota Abe (kyosu-1) / headline / GitHub · LinkedIn）+ Blog 記事一覧
/about/     About Me / Shota Abe (kyosu-1) の1行 + Experience（雇用形態バッジ付き）+ Education
```

Header は `kyosu.dev`（→ `/`）/ `Blog`（→ `/`）/ `About`（→ `/about/`）の3リンクになる。Experience の役職行には雇用形態（正社員 / 業務委託）のバッジをインラインで添える。`TagBadge` の accent 青とは別のグレートーン（`bg-gray-100 text-gray-500`）を使い、タグと雇用形態を見分けられるようにしている。

### プロフィールデータ (`src/data/profile.ts`)

経歴は表示用マークアップと JSON-LD の両方から参照される。同じ内容を2箇所に書くと必ず片方が古くなるため、単一の型付きデータとして切り出し、双方がそこから読む。

```ts
export interface Experience {
  company: string;
  role: string;
  start: string;        // "2026-04"
  end: string | null;   // null = 継続中
}

export interface Education {
  school: string;
  degree: string;
  start: string;
  end: string;
}
```

**[2026-09-20 追記] 雇用形態を追加した。** `/about/` で職歴に雇用形態バッジを出すため、`Experience` に `employment: '正社員' | '業務委託'` を追加した。値は次表のとおり（推測ではなく本人からの明示による）。

```ts
export interface Experience {
  company: string;
  role: string;
  employment: '正社員' | '業務委託';
  start: string;        // "2026-04"
  end: string | null;   // null = 継続中
}
```

掲載する職歴（LinkedIn エクスポートのうち、短期インターン2件——メルカリ 2025/03–2025/04、サイバーエージェント 2023/10——を除外）:

| 会社 | 役割 | 雇用形態 | 期間 |
|---|---|---|---|
| Mercari, Inc. | Site Reliability Engineer | 正社員 | 2026/04 – 現在 |
| 株式会社ナガセ | Software Developer | 業務委託 | 2020/08 – 現在 |
| Alumnote | Software Developer | 業務委託 | 2024/03 – 2025/11 |
| ポケットサイン株式会社 | Software Developer | 業務委託 | 2024/06 – 2025/06 |

**`worksFor` の選び方（`primaryRole()`）**: 構造化データの `worksFor` は「継続中かつ正社員」の職歴を選ぶ。単純に `end === null` な職歴を開始日順（旧 `currentRole()` の選び方）で選ばないのは、ナガセ（業務委託・2020/08〜継続中）も継続中のため、日付順に頼ると `experiences` 配列の並びを変えた瞬間に `worksFor` が変わってしまうから。雇用形態という意味的に安定した基準で選ぶことで、並び順の変更に影響されない。

学歴:

| 学校 | 学位 | 期間 |
|---|---|---|
| 東京工業大学 情報理工学院 数理・計算科学系 | 修士 | 2024/04 – 2026/03 |
| 東京工業大学 情報理工学院 数理・計算科学系 | 学士 | 2020/04 – 2024/03 |

**並び順**: 継続中（`end === null`）を先に `start` 降順、続いて終了済みを `end` 降順。単純な `start` 降順だと6年続いているナガセが末尾に沈むため。結果は上表のとおりで、LinkedIn 上の並びとも一致する。

**日付の表示**: `YYYY/MM`、継続中は `現在`。`<time datetime="2026-04">` を併記する。

**大学名について**: 東京工業大学は2024年10月に東京科学大学へ統合されており、修士課程（2024/04–2026/03）は統合をまたぐ。本設計では提供された LinkedIn エクスポートの記載（Tokyo Tech）に従い「東京工業大学」と表記する。

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
2. ~~**メタ情報** — 各ページの `<title>` が固有であること、`<meta name="description">` / `<link rel="canonical">` / `og:url` が正しい絶対URLで存在すること~~
   **[2026-09-20 追記]** `<title>` / `<meta name="description">` の固有性はすべてのページに当てはまるが、`<link rel="canonical">` / `og:url` は `noindex` を出すページ（`404.html` など、canonical の宛先URLが存在しないページ）には**出さない**。この2つの「存在すること」の確認対象は indexable なページ（トップ・記事・`/about/`）に限る
3. ~~**構造化データ** — トップに `Person`、記事に `BlogPosting` の JSON-LD が含まれること。`Person` の `name` / `worksFor` / `alumniOf` が Experience セクションの表示内容と一致すること。Google の Rich Results Test でも確認する~~
   **[2026-09-20 追記]** トップの `Person`（`personSchema()`）はもはや `worksFor` / `alumniOf` を持たない軽量版。`worksFor` / `alumniOf` は `/about/` の `Person`（完全版、`fullPersonSchema()`）が持ち、`/about/` の Experience セクションの表示内容と一致することを確認する。トップと `/about/` の `Person` は `@id` で同一エンティティとして結びく。Google の Rich Results Test での確認は両ページに対して行う
4. ~~**プロフィール** — `dist/index.html` に `Shota Abe` と職歴4社名が実テキストとして含まれること。除外分の判定は社名ではなく日付で行う（`Mercari` は現職として正しく出現するため）: `2023/10`・`2025/03`・`サイバーエージェント`・`sho013039` のいずれも含まれ**ない**こと~~
   **[2026-09-20 追記]** `Shota Abe` は `dist/index.html` と `dist/about/index.html` の両方に含まれる。職歴4社名は `dist/about/index.html` にのみ含まれ、`dist/index.html` には**含まれない**こと（移設漏れの回帰チェック）。除外分・連絡先の判定方法（社名ではなく日付で行う、`sho013039` を含めない）自体は変わらず、確認対象が `dist/about/index.html` に移る
5. **sitemap** — `dist/sitemap-0.xml` にトップと全記事URLが列挙されていること
6. **robots.txt** — `Sitemap: https://kyosu.dev/sitemap-index.xml` を含むこと
7. **JS 配信量** — `dist/` に React のバンドルが残っていないこと
8. ~~**見た目** — `npm run preview` で現行サイトと並べ、**意図した変更（Hero の氏名、Experience / Education セクションの追加）以外に差分がないこと**。記事ページは完全に一致するはずなので、コードブロックの配色を特に確認する~~
   **[2026-09-20 追記]** 「意図した変更」はその後増えている。Experience / Education は `/about/` へ移動し（トップからは消えた）、雇用形態バッジ、Header の `About` リンク、トップの `description` 文言変更が加わった。現時点で「意図した変更」に含まれるのはこれらすべて

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
