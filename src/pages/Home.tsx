import { getAllPosts } from "../lib/posts";
import BlogCard from "../components/BlogCard";

const posts = getAllPosts();

export default function Home() {
  return (
    <>
      <section className="py-8">
        <h1 className="text-2xl font-bold text-gray-800">Hi, I'm kyosu-1</h1>
        <p className="mt-2 text-gray-500">
          ソフトウェアエンジニア。技術ブログを書いています。
        </p>
        <div className="mt-3 flex gap-4">
          <a href="https://github.com/kyosu-1" target="_blank" rel="noopener noreferrer" className="text-sm text-gray-400 hover:text-accent">GitHub</a>
          <a href="https://www.linkedin.com/in/shota-abe" target="_blank" rel="noopener noreferrer" className="text-sm text-gray-400 hover:text-accent">LinkedIn</a>
        </div>
      </section>

      <section className="py-4">
        <h2 className="text-lg font-semibold text-gray-800">Blog</h2>
        <div className="mt-4 flex flex-col gap-3">
          {posts.length > 0 ? (
            posts.map((post) => <BlogCard key={post.slug} post={post} />)
          ) : (
            <p className="text-sm text-gray-400">記事はまだありません。</p>
          )}
        </div>
      </section>
    </>
  );
}
