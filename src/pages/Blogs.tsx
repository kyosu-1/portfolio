import React from 'react';
import { Link } from 'react-router-dom';
import { blogsData } from './BlogsData';
import './Blogs.css';

const Blogs = () => {
  return (
    <div className="blogs-container">
      <h1>Blogs</h1>
      {blogsData.map((blog) => (
        <div key={blog.id} className="blog-item">
          <h2 className="blog-title">
            <Link to={`/blogs/${blog.id}`} className="link">{blog.title}</Link>
          </h2>
          <p className="blog-summary">{blog.summary}</p>
          <div>
            {blog.tags.map((tag, index) => (
              <span key={index} className="tag">{tag}</span>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
};

export default Blogs;
