// About.tsx
import React from 'react';
import './About.css';
import { skills, experiences } from './AboutData';

const About = () => {
  return (
    <div>
      <h1>About Me</h1>
      <p>ここに自己紹介を書く</p>
      <a href="https://github.com/kyosu-1" target="_blank" rel="noopener noreferrer">GitHub</a>
      <h2>Skills</h2>
      <ul>
        {skills.map((skill, index) => (
          <li key={index}>{skill.skill}: {skill.level}</li>
        ))}
      </ul>
      <h2>Experiences</h2>
      <ul>
        {experiences.map((experience, index) => (
          <li key={index}>{experience.role} at {experience.company}, {experience.year}</li>
        ))}
      </ul>
    </div>
  );
};

export default About;
