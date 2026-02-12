import fm from "front-matter";
import type { BlogPost, BlogPostMeta } from "../types";

interface FrontMatterAttributes {
  title: string;
  date: string;
  tags?: string[];
  summary?: string;
}

const modules = import.meta.glob("/posts/*.md", {
  query: "?raw",
  eager: true,
}) as Record<string, { default: string }>;

function parsePosts(): BlogPost[] {
  return Object.entries(modules).map(([filepath, mod]) => {
    const slug = filepath.replace("/posts/", "").replace(".md", "");
    const { attributes, body } = fm<FrontMatterAttributes>(mod.default);
    return {
      slug,
      title: attributes.title ?? slug,
      date: attributes.date ?? "",
      tags: attributes.tags ?? [],
      summary: attributes.summary ?? "",
      content: body,
    };
  });
}

export function getAllPosts(): BlogPostMeta[] {
  return parsePosts()
    .map(({ content: _, ...meta }) => meta)
    .sort((a, b) => (a.date > b.date ? -1 : 1));
}

export function getPostBySlug(slug: string): BlogPost | undefined {
  return parsePosts().find((p) => p.slug === slug);
}
