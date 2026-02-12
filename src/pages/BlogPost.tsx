import { useParams, Link } from "react-router-dom";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeHighlight from "rehype-highlight";
import { getPostBySlug } from "../lib/posts";
import TagBadge from "../components/TagBadge";
import NotFound from "./NotFound";

export default function BlogPost() {
  const { slug } = useParams<{ slug: string }>();
  const post = slug ? getPostBySlug(slug) : undefined;

  if (!post) return <NotFound />;

  return (
    <article>
      <Link
        to="/"
        className="text-sm text-gray-400 hover:text-accent"
      >
        &larr; Back
      </Link>

      <header className="mt-4">
        <time className="text-sm text-gray-400">{post.date}</time>
        <h1 className="mt-1 text-3xl font-bold text-gray-800">{post.title}</h1>
        {post.tags.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {post.tags.map((tag) => (
              <TagBadge key={tag} tag={tag} />
            ))}
          </div>
        )}
      </header>

      <div className="prose prose-gray mt-8 max-w-none prose-code:font-mono">
        <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeHighlight]}>
          {post.content}
        </ReactMarkdown>
      </div>
    </article>
  );
}
