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
