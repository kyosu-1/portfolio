import { author, primaryRole, latestEducation } from '../data/profile';

/** 人物エンティティの安定した識別子。ページを跨いで同一人物であることを示す */
function personId(site: URL): string {
  return new URL('#person', site).href;
}

/** トップ用。可視コンテンツ（氏名・ハンドル・リンク）に対応する軽量版 */
export function personSchema(site: URL) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Person',
    '@id': personId(site),
    name: author.name,
    alternateName: author.handle,
    url: site.href,
    jobTitle: author.jobTitle,
    sameAs: [author.links.github, author.links.linkedin],
  };
}

/** /about 用。経歴・学歴が可視なので worksFor / alumniOf を含む */
export function fullPersonSchema(site: URL) {
  const job = primaryRole();
  return {
    ...personSchema(site),
    ...(job ? { worksFor: { '@type': 'Organization', name: job.company } } : {}),
    alumniOf: { '@type': 'CollegeOrUniversity', name: latestEducation().school },
  };
}

/** /about のページ型。mainEntity は @id 参照で Person ノードに繋ぐ */
export function profilePageSchema(site: URL, url: string) {
  return {
    '@context': 'https://schema.org',
    '@type': 'ProfilePage',
    url,
    mainEntity: { '@id': personId(site) },
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
