import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import { blogsData, getBlogById} from './BlogsData';

const BlogDetails = () => {
    const { id } = useParams<{ id: string }>();
    const [markdownContent, setMarkdownContent] = useState<string | null>(null);
    const blog = id ? getBlogById(id, blogsData) : null;
  
    useEffect(() => {
      if (blog) {
        fetch(blog.markdownPath)
          .then((response) => response.text())
          .then(setMarkdownContent)
          .catch((error) => console.error(error));
      }
    }, [blog]);
  
    if (!blog) {
      return <div>Blog not found</div>;
    }
  
    return (
      <div>
        <h1>{blog.title}</h1>
        <ReactMarkdown children={markdownContent || ''} />
        {/* その他のコンテンツやスタイリング */}
      </div>
    );
  };
  
  export default BlogDetails;