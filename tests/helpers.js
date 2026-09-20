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
