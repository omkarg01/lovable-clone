'use client'
import React, { useEffect, useState } from 'react';
import { Search, Filter } from 'lucide-react';
import ProjectCard from './components/ProjectCard';
import PromptInput from './components/PromptInput';
import Navbar from './components/Navbar';
import { communityProjects, getRandomAuthor, getRandomAvatar, getRandomDescription, getRandomProjectImage, getRandomTags } from './const';
import { useAuth } from './context/AuthContext';
import { Project } from './types';

export default function Home() {
  const [myProjects, setMyProjects] = useState<Project[]>([]);
  const { user } = useAuth();

  useEffect(() => {
    const fetchProjects = async () => {
      try {
        const response = await fetch(`${process.env.API_BASE_URL}/api/projects`,
          {
            headers: {
              "Authorization": `Bearer ${user?.token}`
            }
          }
        );
        const data = await response.json();
        setMyProjects(data.projects);
      } catch (error) {
        console.error('Error fetching projects:', error);
      }
    };
    fetchProjects();
  }, [user]);

  return (
    <main className="text-white">
      <Navbar />
      {/* Hero Section with Prompt Input */}
      <section
        className="relative min-h-screen flex items-center justify-center px-4 py-12"
        style={{
          backgroundImage: 'url(/background-image.webp)',
          backgroundSize: 'cover',
          backgroundPosition: 'center -30%',
          backgroundAttachment: 'fixed',
          backgroundRepeat: 'no-repeat',
          minHeight: '100vh',
          width: '100%',
          position: 'relative',
          overflow: 'hidden',
          paddingTop: '4rem' /* Add padding to push content down */
        }}
      >
        <div
          className="absolute inset-0 bg-black/50 backdrop-blur-sm"
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            zIndex: 1
          }}
        ></div>
        <div className="w-full max-w-4xl mx-auto text-center relative z-10" style={{ zIndex: 2 }}>
          <h2 className="text-4xl md:text-5xl font-bold text-white mb-6 flex items-center justify-center gap-2">
            Build something
            <img
              src="/heart-icon.svg"
              alt="Heart"
              className="h-8 w-8 md:h-10 md:w-10"
            />
            Lovable
          </h2>
          <p className="text-xl text-blue-100/70 mb-12 max-w-2xl mx-auto">
            Create apps and websites by chatting with AI.
          </p>
          <div className="w-full max-w-3xl mx-auto">
            <PromptInput />
          </div>
        </div>
      </section>

      {/* Projects Section */}
      <section className="py-16 bg-gray-900">
        {/* My Projects */}
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-white mb-4">MY PROJECTS</h2>
          </div>


          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {myProjects ? myProjects.map((project, index) => (
              <ProjectCard
                id={project.id}
                key={index}
                title={project.title}
                description={project.description ? project.description : getRandomDescription()}
                imageUrl={project.imageUrl ? project.imageUrl : getRandomProjectImage()}
                tags={project.tags ? project.tags : getRandomTags()}
                author={project.author ? project.author : getRandomAuthor()}
                authorAvatar={project.authorAvatar ? project.authorAvatar : getRandomAvatar()}
                projectUrl={`/projects/${project.id}`}
              />
            )) : <p className="text-blue-100/60 max-w-2xl mx-auto">
              No Projects Found!
            </p>}
          </div>
        </div>

        {/* Community Showcase */}
        <div className="container mx-auto px-4 mt-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-white mb-4">Community Showcase</h2>
            <p className="text-blue-100/60 max-w-2xl mx-auto">
              Explore amazing projects built by our community members
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {communityProjects.map((project, index) => (
              <ProjectCard
                id={index.toString()}
                key={index}
                title={project.title}
                description={project.description}
                imageUrl={project.imageUrl}
                tags={project.tags}
                author={project.author}
                authorAvatar={project.authorAvatar}
                projectUrl={project.projectUrl}
              />
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}