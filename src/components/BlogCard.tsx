import { Link } from "react-router-dom";
import type { BlogPostMeta } from "../types";
import TagBadge from "./TagBadge";

interface BlogCardProps {
  post: BlogPostMeta;
}

export default function BlogCard({ post }: BlogCardProps) {
  return (
    <Link
      to={`/blog/${post.slug}`}
      className="block rounded-lg border border-gray-100 p-5 transition-colors hover:border-accent/30 hover:bg-blue-50/30"
    >
      <time className="text-sm text-gray-400">{post.date}</time>
      <h3 className="mt-1 text-lg font-semibold text-gray-800">{post.title}</h3>
      {post.summary && (
        <p className="mt-1 text-sm text-gray-500">{post.summary}</p>
      )}
      {post.tags.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {post.tags.map((tag) => (
            <TagBadge key={tag} tag={tag} />
          ))}
        </div>
      )}
    </Link>
  );
}
