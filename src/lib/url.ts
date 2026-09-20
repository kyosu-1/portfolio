/**
 * ページの canonical URL。
 * <link rel="canonical"> と構造化データの mainEntityOfPage が
 * 同じ値になることを保証するため、組み立ては必ずここを通す。
 */
export function canonicalUrl(pathname: string, site: URL): string {
  return new URL(pathname, site).href;
}
