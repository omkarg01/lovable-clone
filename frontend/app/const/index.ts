// Get a random item from an array
const getRandomItem = <T,>(array: T[]): T => {
  return array[Math.floor(Math.random() * array.length)];
};

// Get all unique avatar URLs from the projects
const getAllAvatars = (): string[] => {
  return Array.from(new Set(communityProjects.map(project => project.authorAvatar)));
};

// Get all unique project image URLs
const getAllProjectImages = (): string[] => {
  return Array.from(new Set(communityProjects.map(project => project.imageUrl)));
};

// Get all unique tags from projects
const getAllTags = (): string[] => {
  const allTags = communityProjects.flatMap(project => project.tags);
  return Array.from(new Set(allTags));
};

// Get all unique authors from projects
const getAllAuthors = (): string[] => {
  return Array.from(new Set(communityProjects.map(project => project.author)));
};

// Get all unique descriptions from projects
const getAllDescriptions = (): string[] => {
  return Array.from(new Set(communityProjects.map(project => project.description)));
};

// Get a random avatar from the existing ones
export const getRandomAvatar = (): string => {
  const avatars = getAllAvatars();
  return getRandomItem(avatars);
};

// Get a random project image from the existing ones
export const getRandomProjectImage = (): string => {
  const images = getAllProjectImages();
  return getRandomItem(images);
};

// Get random tags (between 1 and 4 tags)
export const getRandomTags = (): string[] => {
  const allTags = getAllTags();
  const count = Math.floor(Math.random() * 4) + 1; // 1-4 tags
  return Array.from({ length: count }, () => getRandomItem(allTags));
};

// Get a random author from the existing ones
export const getRandomAuthor = (): string => {
  const authors = getAllAuthors();
  return getRandomItem(authors);
};

// Get a random description from the existing ones
export const getRandomDescription = (): string => {
  const descriptions = getAllDescriptions();
  return getRandomItem(descriptions);
};

export const communityProjects = [
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