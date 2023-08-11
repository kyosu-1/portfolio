import { Blog } from './Types';

export const blogsData: Blog[] = [
  {
    id: "1",
    title: 'My First Blog Post',
    summary: 'This is a summary of my first blog post.',
    tags: ['React', 'JavaScript'],
    markdownPath: '../posts/1_test.md',
  },
  // 他のブログデータ
];

export const getBlogById = (id: string, blogs: Blog[]): Blog | undefined => {
    return blogs.find((blog) => blog.id === id);
  };