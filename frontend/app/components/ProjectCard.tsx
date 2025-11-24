import Image from 'next/image';
import Link from 'next/link';

export default function ProjectCard({
  id,
  title = 'Untitled Project',
  description = 'No description available',
  imageUrl = '/image-2.webp', // Make sure to add a placeholder image in public folder
  tags = [],
  author = 'Anonymous',
  authorAvatar = 'https://randomuser.me/api/portraits/women/44.jpg',
  projectUrl = '#'
}: Project) {
  const content = (
    <div className="group rounded-2xl overflow-hidden bg-gradient-to-br from-slate-900 to-slate-800 border border-slate-700/50 hover:border-blue-500/50 transition-all duration-300 hover:shadow-2xl hover:shadow-blue-500/10 h-full flex flex-col">
      <div className="relative h-48 overflow-hidden">
        <Image
          src={imageUrl}
          alt={title}
          fill
          className="object-cover group-hover:scale-105 transition-transform duration-500"
        />
      </div>
      <div className="p-6 flex-1 flex flex-col">
        {(author || authorAvatar) && (
          <div className="flex items-center mb-3">
            {authorAvatar && (
              <div className="relative w-8 h-8 rounded-full overflow-hidden mr-3">
                <Image
                  src={authorAvatar}
                  alt={author}
                  fill
                  className="object-cover"
                />
              </div>
            )}
            <span className="text-sm text-blue-100/80">by {author}</span>
          </div>
        )}
        <h3 className="text-white font-medium text-lg mb-2 group-hover:text-blue-400 transition-colors">{title}</h3>
        {description && (
          <p className="text-blue-100/60 text-sm mb-4 line-clamp-2 flex-1">
            {description}
          </p>
        )}
        {tags && tags.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-4">
            {tags.map((tag, index) => (
              <span 
                key={index}
                className="px-2 py-1 bg-blue-500/10 text-blue-400 text-xs rounded-full"
              >
                {tag}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );

  return projectUrl ? (
    <Link href={projectUrl} rel="noopener noreferrer" className="block h-full">
      {content}
    </Link>
  ) : (
    <div className="h-full">
      {content}
    </div>
  );
}
