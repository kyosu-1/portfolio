/** 記事の日付表示。移行前の見た目（YYYY-MM-DD）を維持する */
export function formatPostDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

/** 経歴の期間表示。"2026-04" → "2026/04" */
export function formatYearMonth(value: string): string {
  return value.replace('-', '/');
}
