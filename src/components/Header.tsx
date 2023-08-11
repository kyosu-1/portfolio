import React from 'react';
import { Link } from 'react-router-dom';

const Header = () => {
  return (
    <header>
      <nav>
        <Link to="/portfolio/">About</Link>
        <Link to="/portfolio/projects">Projects</Link>
        <Link to="/portfolio/blogs">Blogs</Link>
      </nav>
    </header>
  );
};

export default Header;
