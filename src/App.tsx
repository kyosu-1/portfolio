import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';

import About from './pages/About';
import Projects from './pages/Projects';
import Blogs from './pages/Blogs';
import BlogDetails from './pages/BlogDetails'
import Header from './components/Header';

function App() {
  return (
    <BrowserRouter>
      <Header />
      <Routes>
          <Route path="/portfolio/" element={<About />} />
          <Route path="/portfolio/projects" element={<Projects />} />
          <Route path="/portfolio/blogs" element={<Blogs />} >
            <Route path=":id" element={<BlogDetails />} />
          </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
