'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { LogOut } from 'lucide-react';
import SignupDialog from './SignupDialog';
import LoginDialog from './LoginDialog';

export default function Navbar() {
  const [isSignupOpen, setIsSignupOpen] = useState(false);
  const [isLoginOpen, setIsLoginOpen] = useState(false);
  const [user, setUser] = useState<User>({
    username: "",
    id: "",
    token: ""
  });

  useEffect(() => {
    // Check for existing token in localStorage on component mount
    const user = localStorage.getItem('user');
    if (user) {
      setUser(JSON.parse(user));
    }
  }, []);

  const handleLoginSuccess = (data: User) => {
    console.log("handleLoginSuccess");
    setUser(data);
    localStorage.setItem('user', JSON.stringify(data));
    setIsLoginOpen(false);
  };

  const handleLogout = () => {
    setUser({
      username: "",
      id: "",
      token: ""
    });
    localStorage.removeItem('user');
  };

  return (
    <>
        <nav className="w-full bg-white/10 backdrop-blur-md border-b border-white/10">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex items-center justify-between h-16">
                    <div className="flex items-center">
                        <Link href="/" className="flex items-center">
                            <Image
                                src="/logo.svg"
                                alt="Lovable Logo"
                                width={150}
                                height={30}
                                className="h-6 w-auto"
                                priority
                            />
                        </Link>
                        <div className="ml-10">
                            <Link href="/docs" className="cursor-pointer text-white/80 hover:text-white px-3 py-2 rounded-md text-sm font-medium">
                                Documentation
                            </Link>
                            <Link href="/examples" className="cursor-pointer text-white/80 hover:text-white px-3 py-2 rounded-md text-sm font-medium">
                                Examples
                            </Link>
                            <Link href="/blog" className="cursor-pointer text-white/80 hover:text-white px-3 py-2 rounded-md text-sm font-medium">
                                Blog
                            </Link>
                        </div>
                    </div>
                    <div className="hidden md:block">
                        <div className="flex items-center space-x-4">
                            {user.username ? (
                              <div className="flex items-center space-x-4">
                                <span className="text-white text-sm font-medium">
                                  {user.username}
                                </span>
                                <button
                                  onClick={handleLogout}
                                  className="cursor-pointer flex items-center space-x-1 bg-red-500/10 hover:bg-red-500/20 text-red-400 px-3 py-1.5 rounded-md text-sm font-medium transition-colors"
                                  title="Log out"
                                >
                                  <LogOut size={16} />
                                  <span>Logout</span>
                                </button>
                              </div>
                            ) : (
                              <>
                                <button
                                  onClick={() => setIsLoginOpen(true)}
                                  className="bg-black/20 cursor-pointer border border-white/20 px-4 py-1.5 rounded-md text-white hover:bg-white/10 text-sm font-medium transition-colors"
                                >
                                  Log in
                                </button>
                                <button
                                  onClick={() => setIsSignupOpen(true)}
                                  className="bg-white cursor-pointer hover:bg-white/90 text-black px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                                >
                                  Get started
                                </button>
                              </>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </nav>
      
      <SignupDialog 
        isOpen={isSignupOpen}
        onClose={() => setIsSignupOpen(false)}
        onSwitchToLogin={() => {
          setIsSignupOpen(false);
          setIsLoginOpen(true);
        }}
      />
      
      <LoginDialog 
        isOpen={isLoginOpen}
        onClose={() => setIsLoginOpen(false)}
        onSwitchToSignup={() => {
          setIsLoginOpen(false);
          setIsSignupOpen(true);
        }}
        onLoginSuccess={handleLoginSuccess}
      />
      
    </>
    );
}
