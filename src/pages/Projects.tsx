// Projects.tsx
import React from 'react';
import { projects } from './ProjectsData';
import './Projects.css';

const Projects = () => {
  return (
    <div>
      <h1>Projects</h1>
      <div className="projects-container">
        {projects.map(project => (
          <div key={project.id} className="project-card">
            <h2>{project.name}</h2>
            <p>{project.description}</p>
            <p>Technologies: {project.technologies.join(", ")}</p>
            <a href={project.link} target="_blank" rel="noreferrer">GitHub Link</a>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Projects;
