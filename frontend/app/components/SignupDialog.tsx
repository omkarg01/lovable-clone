'use client';

import { useState } from 'react';
import { X } from 'lucide-react';
import { User } from '../types';

interface SignupDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSwitchToLogin: () => void;
  onSignupSuccess: (data: User) => void;
}

export default function SignupDialog({ isOpen, onClose, onSwitchToLogin, onSignupSuccess }: SignupDialogProps) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);
    
    try {
      const response = await fetch(`${process.env.API_BASE_URL}/api/auth/signup`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          username,
          password,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        if (data.error === 'Validation failed' && data.details) {
          // Format validation errors
          const errorMessage = data.details
            .map((detail: { field: string; message: string }) => 
              `${detail.field}: ${detail.message}`)
            .join('\n');
          throw new Error(errorMessage);
        }
        throw new Error(data.error || 'Failed to sign up');
      }

      // Handle successful signup
      // Transform the nested response to match User type
      if (data.success && data.data) {
        const userData: User = {
          id: data.data.user.id,
          username: data.data.user.username,
          token: data.data.token
        };
        onSignupSuccess(userData);
      }
      
      // Close the dialog
      onClose();
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to sign up. Please try again.');
      console.error('Signup error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-gray-950 rounded-xl p-6 w-full max-w-md relative border border-gray-800/50 shadow-2xl">
        <div className="absolute -left-3 -top-3">
          <div className="bg-gray-950 p-1.5 rounded-lg border border-gray-800/50 shadow-lg">
            <img 
              src="/heart-icon.svg" 
              alt="Heart" 
              className="h-10 w-10"
            />
          </div>
        </div>
        
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-white transition-colors"
          aria-label="Close signup dialog"
        >
          <X size={20} />
        </button>
        
        <h2 className="text-2xl font-bold text-white text-center mb-6">Sign up</h2>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="bg-red-500/20 border border-red-500/30 text-red-200 text-sm p-3 rounded-md">
              {error}
            </div>
          )}
          
          <div>
            <label htmlFor="username" className="block text-sm font-medium text-gray-300 mb-1">
              Username
            </label>
            <input
              type="text"
              id="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full bg-gray-800/50 border border-gray-700 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
              placeholder="Enter your username"
              required
            />
          </div>
          
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-300 mb-1">
              Password
            </label>
            <input
              type="password"
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-gray-800/50 border border-gray-700 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
              placeholder="Create a password"
              minLength={6}
              required
            />
          </div>
          
          <button
            type="submit"
            disabled={isLoading}
            className={`cursor-pointer w-full bg-white hover:bg-white/90 text-black font-medium py-2.5 px-4 rounded-lg transition-colors flex items-center justify-center ${
              isLoading ? 'opacity-70 cursor-not-allowed' : ''
            }`}
          >
            {isLoading ? 'Signing up...' : 'Sign up'}
          </button>
        </form>
        
        <p className="mt-4 text-sm text-gray-400 text-center">
          Already have an account?{' '}
          <button
            onClick={() => {
              onClose();
              onSwitchToLogin();
            }}
            className="cursor-pointer text-blue-400 hover:text-blue-300 font-medium focus:outline-none"
          >
            Log in
          </button>
        </p>
      </div>
    </div>
  );
}
