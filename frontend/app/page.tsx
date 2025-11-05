'use client'
import React from 'react';
import { Search, Filter } from 'lucide-react';
import ProjectCard from './components/ProjectCard';
import PromptInput from './components/PromptInput';
import Navbar from './components/Navbar';

export default function Home() {
  const projects = [
    {
      title: 'Modern SaaS Dashboard',
      description: 'A clean and responsive admin dashboard template for SaaS applications with dark mode support.',
      imageUrl: '/image-1.webp',
      tags: ['React', 'Tailwind CSS', 'Dashboard', 'SaaS'],
      author: 'Alex Johnson',
      authorAvatar: 'https://randomuser.me/api/portraits/men/32.jpg',
      projectUrl: '#'
    },
    {
      title: 'E-commerce Platform',
      description: 'A full-featured e-commerce website with product listings, cart, and checkout flow.',
      imageUrl: '/image-2.webp',
      tags: ['Next.js', 'Stripe', 'E-commerce'],
      author: 'Sarah Miller',
      authorAvatar: 'https://randomuser.me/api/portraits/women/44.jpg',
      projectUrl: '#'
    },
    {
      title: 'Portfolio Website',
      description: 'A minimalist portfolio website for designers and developers to showcase their work.',
      imageUrl: '/image-3.webp',
      tags: ['Portfolio', 'Minimalist', 'Responsive'],
      author: 'James Wilson',
      authorAvatar: 'https://randomuser.me/api/portraits/men/46.jpg',
      projectUrl: '#'
    },
    {
      title: 'Task Management App',
      description: 'A collaborative task management application with real-time updates and team features.',
      imageUrl: '/image-4.webp',
      tags: ['React', 'Firebase', 'Real-time'],
      author: 'Emma Davis',
      authorAvatar: 'https://randomuser.me/api/portraits/women/63.jpg',
      projectUrl: '#'
    },
    {
      title: 'Fitness Tracker',
      description: 'A mobile-first fitness tracking application with workout plans and progress analytics.',
      imageUrl: '/image-5.webp',
      tags: ['Mobile', 'Health', 'Analytics'],
      author: 'Michael Chen',
      authorAvatar: 'https://randomuser.me/api/portraits/men/22.jpg',
      projectUrl: '#'
    },
    {
      title: 'Recipe Sharing Platform',
      description: 'A community-driven platform for sharing and discovering new recipes with advanced filtering.',
      imageUrl: '/image-6.webp',
      tags: ['Food', 'Community', 'Recipes'],
      author: 'Olivia Martinez',
      authorAvatar: 'https://randomuser.me/api/portraits/women/28.jpg',
      projectUrl: '#'
    }
  ];

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
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-white mb-4">Community Showcase</h2>
            <p className="text-blue-100/60 max-w-2xl mx-auto">
              Explore amazing projects built by our community members
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {projects.map((project, index) => (
              <ProjectCard
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