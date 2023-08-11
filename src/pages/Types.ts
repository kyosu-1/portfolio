// Types.ts

export type Skill = {
    skill: string;
    level: string; // 例: "Beginner", "Intermediate", "Expert"
};
  
export type Experience = {
    role: string;
    company: string;
    year: string; // 期間や年を表す文字列
};
  
export type Project = {
    id: number;
    name: string;
    description: string;
    technologies: string[];
    link: string; // GitHub link or project link
};

export type Blog = {
    id: string;
    title: string;
    summary: string;
    tags: string[];
    markdownPath: string;
  };
