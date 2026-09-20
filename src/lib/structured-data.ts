import { author, currentRole, latestEducation } from '../data/profile';

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
    alumniOf: { '@type': 'CollegeOrUniversity', name: latestEducation().school },
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
