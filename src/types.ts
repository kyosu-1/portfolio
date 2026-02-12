export interface BlogPostMeta {
  slug: string;
  title: string;
  date: string;
  tags: string[];
  summary: string;
}

export interface BlogPost extends BlogPostMeta {
  content: string;
}
