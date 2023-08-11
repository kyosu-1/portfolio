import React from 'react';
import { Link } from 'react-router-dom';
import './Header.css';

const Header = () => {
  return (
    <header className="header">
      <nav className="navigation">
        <Link to="/portfolio/" className="nav-link">About</Link>
        <Link to="/portfolio/projects" className="nav-link">Projects</Link>
        <Link to="/portfolio/blogs" className="nav-link">Blogs</Link>
      </nav>
    </header>
  );
};

export default Header;
