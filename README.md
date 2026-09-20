# kyosu.dev

ブログ中心のポートフォリオサイト。`/` はブログ一覧、経歴・学歴は `/about/` に分離している。

## 利用技術

- Astro 7
- TypeScript
- Tailwind CSS v4

## セットアップ

```shell
npm install
```

## 開発

```shell
npm run dev
```

アクセス: `http://localhost:4321`

## 記事の追加

`posts/*.md` に Markdown ファイルを追加する。frontmatter は次の4項目。

```yaml
---
title: 記事タイトル
date: "2026-01-01"
tags: [Go, AWS]
summary: 記事の要約。
---
```

- `title` / `date` / `summary` は必須、`tags` は省略可（省略時は `[]`）
- `summary` は meta description と OG description にそのまま使われるため必須。**欠けると `astro build` が失敗する**
- `date` は `YYYY-MM-DD` 形式のみ（タイムゾーン付きの日時は不可）

## テスト

ビルド成果物（`dist/`）に対する検証を実行する。

```shell
npm test
```
