import Image from 'next/image';
import Link from 'next/link';

interface ProjectCardProps {
  title: string;
  description: string;
  imageUrl: string;
  tags: string[];
  author: string;
  authorAvatar: string;
  projectUrl: string;
}

export default function ProjectCard({
  title,
  description,
  imageUrl,
  tags,
  author,
  authorAvatar,
  projectUrl
}: ProjectCardProps) {
  return (
    <Link href={projectUrl} target="_blank" rel="noopener noreferrer">
      <div className="group rounded-2xl overflow-hidden bg-gradient-to-br from-slate-900 to-slate-800 border border-slate-700/50 hover:border-blue-500/50 transition-all duration-300 hover:shadow-2xl hover:shadow-blue-500/10">
        <div className="relative h-48 overflow-hidden">
          <Image
            src={imageUrl}
            alt={title}
            fill
            className="object-cover group-hover:scale-105 transition-transform duration-500"
          />
        </div>
        <div className="p-6">
          <div className="flex items-center mb-3">
            <div className="relative w-8 h-8 rounded-full overflow-hidden mr-3">
              <Image
                src={authorAvatar}
                alt={author}
                fill
                className="object-cover"
              />
            </div>
            <span className="text-sm text-blue-100/80">by {author}</span>
          </div>
          <h3 className="text-white font-medium text-lg mb-2 group-hover:text-blue-400 transition-colors">{title}</h3>
          <p className="text-blue-100/60 text-sm mb-4 line-clamp-2">{description}</p>
          <div className="flex flex-wrap gap-2 mt-4">
            {tags.map((tag, index) => (
              <span 
                key={index}
                className="text-xs px-2 py-1 bg-white/5 text-white/70 rounded-full"
              >
                {tag}
              </span>
            ))}
          </div>
        </div>
      </div>
    </Link>
  );
}
