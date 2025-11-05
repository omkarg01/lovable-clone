'use client';

import { useState } from 'react';
import ENV from '@/environment/environment';
import { Send, Wand2, Image as ImageIcon, Code } from 'lucide-react';

export default function PromptInput() {
  const [prompt, setPrompt] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt.trim()) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      const user : any = localStorage.getItem('user') || '';
      const token = JSON.parse(user).token;
      const response = await fetch(`${ENV.API_BASE_URL}/api/projects`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}` // localstorage has user object not token
        },
        body: JSON.stringify({ initialPrompt: prompt }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create project');
      }
      
      const data = await response.json();
      console.log('Project created:', data);
      setPrompt('');
      // You might want to redirect or update the UI with the new project
      // router.push(`/project/${data.id}`);
      
    } catch (err) {
      console.error('Error creating project:', err);
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="bg-black/80 backdrop-blur-lg rounded-2xl border border-white/10 p-4 shadow-2xl">
        <form onSubmit={handleSubmit} className="w-full">
          {/* Input Section */}
          <div className="w-full relative">
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Ask AI to generate anything"
              className="w-full bg-transparent border-0 focus:ring-0 text-white placeholder-gray-400 text-[16px] leading-relaxed px-4 py-3 outline-none mb-3 resize-none overflow-y-auto max-h-[200px] min-h-[60px]"
              disabled={isLoading}
              rows={1}
              style={{
                fontFamily: 'inherit',
                scrollbarWidth: 'thin',
                scrollbarColor: 'rgba(255,255,255,0.3) transparent',
              }}
              onInput={(e) => {
                const target = e.target as HTMLTextAreaElement;
                target.style.height = 'auto';
                target.style.height = `${Math.min(target.scrollHeight, 200)}px`; // Max height 200px
              }}
            />
            <style jsx>{`
              textarea::-webkit-scrollbar {
                width: 6px;
              }
              textarea::-webkit-scrollbar-track {
                background: transparent;
              }
              textarea::-webkit-scrollbar-thumb {
                background-color: rgba(255, 255, 255, 0.3);
                border-radius: 3px;
              }
            `}</style>
          </div>
          
          {/* Error Message */}
          {error && (
            <div className="text-red-400 text-sm mb-3 px-4 py-2 bg-red-900/30 rounded-lg">
              {error}
            </div>
          )}
          
          {/* Action Buttons Section */}
          <div className="flex items-center justify-between border-t border-white/10 pt-3">
            <div className="flex items-center space-x-1 text-gray-400">
              <button type="button" className="p-2 rounded-lg hover:bg-white/10 hover:text-white transition-colors">
                <Wand2 className="h-5 w-5" />
              </button>
              <button type="button" className="p-2 rounded-lg hover:bg-white/10 hover:text-white transition-colors">
                <ImageIcon className="h-5 w-5" />
              </button>
              <button type="button" className="p-2 rounded-lg hover:bg-white/10 hover:text-white transition-colors">
                <Code className="h-5 w-5" />
              </button>
            </div>
            
            <button
              type="submit"
              disabled={!prompt.trim() || isLoading}
              className={`p-2.5 rounded-full transition-colors ${
                !prompt.trim() || isLoading
                  ? 'text-gray-500 cursor-not-allowed'
                  : 'text-white hover:bg-white/10 bg-white/5'
              }`}
            >
              <Send className="h-6 w-6" />
            </button>
          </div>
        </form>
      </div>
      <div className="mt-3 flex justify-center">
        <p className="text-xs text-gray-400 text-center">
          <span className="inline-flex items-center">
            <svg className="h-3 w-3 mr-1" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z" />
            </svg>
            AI may produce inaccurate information. Consider checking important information.
          </span>
        </p>
      </div>
    </div>
  );
}
