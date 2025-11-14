'use client';

import { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import { MessageSquare, Menu, X, Search, Bell, Settings, User, Code as CodeIcon, Globe, Code, Folder, File, ChevronRight, ChevronDown, ThumbsUp, ThumbsDown, Copy } from 'lucide-react';

// Dynamically import Monaco Editor with SSR disabled
const MonacoEditor = dynamic(
    () => import('@monaco-editor/react'),
    { ssr: false }
);

// File type definition
type FileType = {
    id: string;
    name: string;
    type: 'file' | 'folder';
    language?: string;
    content?: string;
    children?: FileType[];
};

const initialFiles: FileType[] = [];

type Message = {
    id: string;
    role: 'user' | 'assistant';
    content: string;
    createdOn: string;
    assistantResponses: Array<{
        id: string;
        role: 'user' | 'assistant';
        content: string;
        createdOn: string;
    }>;
};

export default function ProjectPage() {
    const { projectId } = useParams();
    const router = useRouter();
    const [messages, setMessages] = useState<Message[]>([]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [project, setProject] = useState<any>(null);
    const [isLoadingConversations, setIsLoadingConversations] = useState(true);
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [sidebarWidth, setSidebarWidth] = useState(320); // Default width (20rem = 320px)
    const [isResizing, setIsResizing] = useState(false);
    const [activeView, setActiveView] = useState<'preview' | 'code'>('preview');
    const [files, setFiles] = useState<FileType[]>(initialFiles);
    const [selectedFile, setSelectedFile] = useState<FileType | null>(null);
    const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set(['1']));
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const [sandboxUrl, setSandboxUrl] = useState<string | undefined>(undefined);

    // Fetch conversations when projectId changes
    useEffect(() => {
        const sandboxUrl = localStorage.getItem('sandboxUrl');
        if (sandboxUrl) {
            setSandboxUrl(sandboxUrl);
        }
        const fetchConversations = async () => {
            if (!projectId) return;

            setIsLoadingConversations(true);
            const user = localStorage.getItem('user');
            if (!user) return;
            try {
                const response = await fetch(`${process.env.API_BASE_URL}/api/projects/conversation/${projectId}`,
                    {
                        headers: {
                            'Authorization': `Bearer ${JSON.parse(user).token}`
                        }
                    }
                );
                if (!response.ok) {
                    throw new Error('Failed to fetch conversations');
                }
                const data = await response.json();
                setMessages(data.data || []);
            } catch (error) {
                console.error('Error fetching conversations:', error);
            } finally {
                setIsLoadingConversations(false);
            }
        };

        fetchConversations();

        return () => {
            localStorage.removeItem('sandboxUrl');
            localStorage.removeItem('projectId');
        };
    }, [projectId]);


    const toggleFolder = (folderId: string) => {
        setExpandedFolders(prev => {
            const newSet = new Set(prev);
            if (newSet.has(folderId)) {
                newSet.delete(folderId);
            } else {
                newSet.add(folderId);
            }
            return newSet;
        });
    };

    const handleFileClick = async (file: FileType) => {
        if (file.type === 'folder') {
            toggleFolder(file.id);
            return;
        }

        // Set the selected file immediately for better UX
        setSelectedFile(file);

        try {
            const user = localStorage.getItem('user');
            if (!user) throw new Error('User not authenticated');

            // Get the full path of the file from its ID
            const getFullPath = (files: FileType[], id: string, currentPath = ''): string | null => {
                for (const file of files) {
                    const filePath = currentPath ? `${currentPath}/${file.name}` : file.name;
                    if (file.id === id) return filePath;
                    if (file.children) {
                        const childPath = getFullPath(file.children, id, filePath);
                        if (childPath) return childPath;
                    }
                }
                return null;
            };

            const fullPath = getFullPath(files, file.id);
            if (!fullPath) throw new Error('Could not determine file path');

            const token = JSON.parse(user).token;
            const response = await fetch(`${process.env.API_BASE_URL}/api/projects/${projectId}/file?path=${encodeURIComponent(fullPath)}`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (!response.ok) throw new Error('Failed to load file content');

            const data = await response.json();

            // Update the file with its content
            setFiles(prevFiles => {
                const updateFileContent = (files: FileType[]): FileType[] => {
                    return files.map(f => {
                        if (f.id === file.id) {
                            return { ...f, content: data.content };
                        }
                        if (f.children) {
                            return { ...f, children: updateFileContent(f.children) };
                        }
                        return f;
                    });
                };
                return updateFileContent(prevFiles);
            });

            // Update the selected file with the content
            setSelectedFile(prev => prev ? { ...prev, content: data.content } : null);

        } catch (error) {
            console.error('Error loading file content:', error);
            // You might want to show an error message to the user here
        }
    };

    const renderFileTree = (files: FileType[], level = 0) => {
        return files.map(file => (
            <div key={file.id} className="w-full">
                <div
                    className={`flex items-center py-1 px-2 rounded hover:bg-gray-700 cursor-pointer ${selectedFile?.id === file.id ? 'bg-gray-700' : ''}`}
                    onClick={() => handleFileClick(file)}
                    style={{ paddingLeft: `${level * 12 + 8}px` }}
                >
                    {file.type === 'folder' ? (
                        <>
                            {expandedFolders.has(file.id) ? (
                                <ChevronDown className="h-4 w-4 mr-1 text-gray-400" />
                            ) : (
                                <ChevronRight className="h-4 w-4 mr-1 text-gray-400" />
                            )}
                            <Folder className="h-4 w-4 mr-2 text-blue-400" />
                        </>
                    ) : (
                        <File className="h-4 w-4 mr-2 text-gray-400" />
                    )}
                    <span className="text-sm text-gray-200 truncate">{file.name}</span>
                </div>
                {file.type === 'folder' && expandedFolders.has(file.id) && file.children && (
                    <div className="ml-2">
                        {renderFileTree(file.children, level + 1)}
                    </div>
                )}
            </div>
        ));
    };

    // Resizable sidebar handlers
    const handleMouseDown = (e: React.MouseEvent) => {
        e.preventDefault();
        setIsResizing(true);

        const startX = e.clientX;
        const startWidth = sidebarWidth;

        const handleMouseMove = (e: MouseEvent) => {
            const newWidth = startWidth + (e.clientX - startX);
            // Limit sidebar width between 240px and 50% of viewport width
            const maxWidth = Math.min(window.innerWidth * 0.5, 600);
            setSidebarWidth(Math.min(Math.max(newWidth, 240), maxWidth));
        };

        const handleMouseUp = () => {
            setIsResizing(false);
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);
            document.body.style.cursor = '';
            document.body.style.userSelect = '';
        };

        document.body.style.cursor = 'col-resize';
        document.body.style.userSelect = 'none';
        document.addEventListener('mousemove', handleMouseMove);
        document.addEventListener('mouseup', handleMouseUp, { once: true });
    };

    // Function to convert flat file paths to nested structure
    const buildFileTree = (files: string[]): FileType[] => {
        const root: FileType = { id: 'root', name: 'project', type: 'folder', children: [] };

        files.forEach(filePath => {
            const parts = filePath.split('/').filter(Boolean);
            let current = root;

            parts.forEach((part, index) => {
                const isFile = index === parts.length - 1;
                const existingNode = current.children?.find(child => child.name === part);

                if (existingNode) {
                    current = existingNode;
                } else {
                    const newNode: FileType = {
                        id: `${current.id}-${part}`,
                        name: part,
                        type: isFile ? 'file' : 'folder',
                        language: isFile ? getLanguageFromFileName(part) : undefined,
                        content: '', // We'll load this when the file is selected
                        children: isFile ? undefined : []
                    };

                    if (!current.children) {
                        current.children = [];
                    }

                    current.children.push(newNode);
                    current = newNode;
                }
            });
        });

        return root.children || [];
    };

    const getLanguageFromFileName = (filename: string): string | undefined => {
        const extension = filename.split('.').pop()?.toLowerCase();
        const languageMap: Record<string, string> = {
            'js': 'javascript',
            'jsx': 'javascript',
            'ts': 'typescript',
            'tsx': 'typescript',
            'json': 'json',
            'css': 'css',
            'html': 'html',
            'md': 'markdown',
            'py': 'python',
            'java': 'java',
            'c': 'c',
            'cpp': 'cpp',
            'cs': 'csharp',
            'go': 'go',
            'rs': 'rust',
            'rb': 'ruby',
            'php': 'php',
            'sh': 'shell',
            'yaml': 'yaml',
            'yml': 'yaml',
            'dockerfile': 'dockerfile',
            'gitignore': 'gitignore'
        };

        return languageMap[extension || ''] || 'plaintext';
    };

    // 2. Fetch project details and files
    useEffect(() => {
        const fetchProject = async () => {
            try {
                const user = localStorage.getItem('user');
                if (!user) return;

                const token = JSON.parse(user).token;
                const response = await fetch(`${process.env.API_BASE_URL}/api/projects/${projectId}`, {
                    headers: {
                        'Authorization': `Bearer ${token}`
                    }
                });

                if (response.ok) {
                    const data = await response.json();
                    setProject(data.project);

                    // Build file tree from the flat file list
                    if (data.project?.files) {
                        const fileTree = buildFileTree(data.project.files);
                        setFiles(fileTree);

                        // Expand the root folder by default
                        if (fileTree.length > 0) {
                            setExpandedFolders(new Set([fileTree[0].id]));
                        }
                    }
                }
            } catch (error) {
                console.error('Error fetching project:', error);
            }
        };

        fetchProject();
    }, [projectId]);

    // ✅ 3. Send message handler (unchanged)
    // const handleSendMessage = async (e: React.FormEvent) => {
    //     e.preventDefault();
    //     if (!input.trim() || !projectId) return;

    //     const userMessage: Message = {
    //         id: Date.now().toString(),
    //         content: input,
    //         role: 'user',
    //         createdOn: new Date().toISOString()
    //     };

    //     setMessages(prev => [...prev, userMessage]);
    //     setInput('');
    //     setIsLoading(true);

    //     try {
    //         const user = localStorage.getItem('user');
    //         if (!user) throw new Error('User not authenticated');

    //         const token = JSON.parse(user).token;
    //         const response = await fetch(`${ENV.API_BASE_URL}/api/projects/${projectId}/chat`, {
    //             method: 'POST',
    //             headers: {
    //                 'Content-Type': 'application/json',
    //                 'Authorization': `Bearer ${token}`
    //             },
    //             body: JSON.stringify({ message: input })
    //         });

    //         if (!response.ok) throw new Error('Failed to get response');

    //         const data = await response.json();

    //         const assistantResponse: Message = {
    //             id: Date.now().toString(),
    //             content: data.response,
    //             role: 'assistant',
    //             createdOn: new Date().toISOString(),
    //         };

    //         setMessages(prev => [...prev, assistantResponse]);
    //     } catch (error) {
    //         console.error('Error sending message:', error);
    //         setMessages(prev => [...prev, {
    //             id: Date.now().toString(),
    //             content: 'Sorry, there was an error processing your message.',
    //             role: 'assistant',
    //             createdOn: new Date().toISOString()
    //         }]);
    //     } finally {
    //         setIsLoading(false);
    //     }
    // };

    // ✅ 4. Auto scroll
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    return (
        <div className="flex h-screen bg-gray-100">
            {/* Mobile menu button */}
            <button
                onClick={() => setIsSidebarOpen(true)}
                className="md:hidden fixed top-4 left-4 z-20 p-2 bg-gray-800 text-white rounded-lg"
            >
                <Menu className="h-6 w-6" />
            </button>

            {/* Sidebar */}
            <div
                className={`fixed inset-y-0 left-0 bg-gray-900 text-white flex flex-col z-30 transition-[width] duration-100 ${isResizing ? 'select-none' : ''}`}
                style={{
                    width: `${sidebarWidth}px`,
                    minWidth: '240px',
                    maxWidth: '50vw',
                    resize: 'horizontal',
                    overflow: 'hidden',

                }}
            >
                <div className="p-4 border-b border-gray-700 flex justify-between items-center">
                    <h1 className="cursor-pointer text-xl font-bold truncate" onClick={() => router.push('/')}> {project?.name || 'Project'}</h1>
                    <button
                        onClick={() => setIsSidebarOpen(false)}
                        className="md:hidden p-1 hover:bg-red-700 rounded"
                    >
                        <X className="h-5 w-5" />
                    </button>
                </div>

                {/* Messages */}
                <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-gray-900">
                    {messages.map((message: Message) => (
                        <div
                            key={message.id}
                            className={`flex flex-center flex-col`}
                        >
                            <div
                                className='max-w-auto p-4 rounded-xl shadow-md text-sm leading-relaxed bg-slate-800 border-blue-800 border-2 text-white'
                            >
                                {/* User or assistant main message */}
                                <p className="whitespace-pre-wrap">{message.content}</p>

                            </div>
                            <div>
                                {/* Assistant responses (if any) */}
                                {message.assistantResponses?.length > 0 && (
                                    <div className="mt-3 space-y-2 border-gray-700 pt-2">
                                        {message.assistantResponses.map((each, i) => (
                                            <p key={i} className="text-gray-300 whitespace-pre-wrap">
                                                {each.content}
                                            </p>
                                        ))}
                                    </div>
                                )}
                                {/* actions like and dislike */}
                                <div className='flex gap-1 mt-2'>
                                    <button className='cursor-pointer p-2 rounded hover:bg-gray-600'>
                                        <ThumbsUp className='h-3 w-3' />
                                    </button>
                                    <button className='cursor-pointer p-2 rounded hover:bg-gray-600'>
                                        <ThumbsDown className='h-3 w-3' />
                                    </button>
                                    <button className='cursor-pointer p-2 rounded hover:bg-gray-600'>
                                        <Copy className='h-3 w-3' />
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}

                    {/* Auto-scroll anchor */}
                    <div ref={messagesEndRef} />
                </div>


                {/* Resize Handle with improved visibility */}
                <div
                    onMouseDown={handleMouseDown}
                    className={`absolute right-0 top-0 h-full w-0.5 cursor-col-resize transition-colors ${isResizing ? 'bg-blue-500' : 'bg-transparent hover:bg-gray-600'}`}
                />

                {/* Chat Input */}
                <div className="p-4 border-t border-gray-700">
                    <form
                        // onSubmit={handleSendMessage}
                        className="relative"
                    >
                        <input
                            type="text"
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            placeholder="Type a message..."
                            className="w-full p-2 pr-10 rounded-lg bg-gray-700 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                            disabled={isLoading}
                        />
                        <button
                            type="submit"
                            disabled={!input.trim() || isLoading}
                            className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-white disabled:opacity-50"
                        >
                            <svg
                                xmlns="http://www.w3.org/2000/svg"
                                className="h-5 w-5"
                                viewBox="0 0 20 20"
                                fill="currentColor"
                            >
                                <path
                                    fillRule="evenodd"
                                    d="M10.293 5.293a1 1 0 011.414 0l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414-1.414L12.586 11H5a1 1 0 110-2h7.586l-2.293-2.293a1 1 0 010-1.414z"
                                    clipRule="evenodd"
                                />
                            </svg>
                        </button>
                    </form>
                </div>
            </div>

            {/* Main content with transition */}
            <div
                className="flex-1 flex flex-col overflow-hidden transition-[margin] duration-100"
                style={{ marginLeft: `${sidebarWidth}px` }}
            >
                {/* Top Navigation Bar */}
                <div className="bg-gray-900 border-b border-gray-700 px-6 py-3 flex items-center justify-between">
                    {/* Left side - Project info and actions */}
                    <div className="flex items-center space-x-4">
                        <div className="hidden md:flex items-center space-x-1">
                            <button
                                onClick={() => setActiveView('preview')}
                                className={`flex items-center px-3 py-1.5 text-sm font-medium rounded-md space-x-1.5 cursor-pointer border ${activeView === 'preview' ? 'bg-gray-800 text-white border-transparent' : 'text-gray-400 border-gray-600 hover:text-white hover:bg-gray-800'}`}
                            >
                                <Globe className="h-4 w-4" />
                                {activeView === 'preview' && <span>Preview</span>}
                            </button>
                            <button
                                onClick={() => setActiveView('code')}
                                className={`flex items-center px-3 py-1.5 text-sm font-medium rounded-md space-x-1.5 cursor-pointer border ${activeView === 'code' ? 'bg-gray-800 text-white border-transparent' : 'text-gray-400 border-gray-600 hover:text-white hover:bg-gray-800'}`}
                            >
                                <CodeIcon className="h-4 w-4" />
                                {activeView === 'code' && <span>Code</span>}
                            </button>
                        </div>
                    </div>

                    {/* Right side - Actions and user menu */}
                    <div className="flex items-center space-x-3">
                        <div className="relative">
                            <input
                                type="text"
                                placeholder="Search files..."
                                className="w-48 pl-9 pr-3 py-1.5 text-sm bg-gray-800 border border-gray-700 text-white placeholder-gray-400 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            />
                            <Search className="absolute left-2.5 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-500" />
                        </div>

                        <button className="p-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded-full">
                            <Bell className="h-5 w-5" />
                            <span className="sr-only">Notifications</span>
                        </button>

                        <button className="p-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded-full">
                            <Settings className="h-5 w-5" />
                            <span className="sr-only">Settings</span>
                        </button>

                        <div className="h-8 w-8 rounded-full bg-gray-700 flex items-center justify-center">
                            <User className="h-4 w-4 text-gray-300" />
                        </div>
                    </div>
                </div>

                {/* Main content */}
                <div className="flex-1 overflow-y-auto bg-gray-800">
                    {activeView === 'preview' ? (
                        messages.length === 0 ? (
                            <div className="flex flex-col items-center justify-center h-full text-gray-500">
                                <MessageSquare className="h-16 w-16 mb-4 text-gray-300" />
                                <h2 className="text-2xl font-semibold mb-2">Welcome to {project?.name || 'your project'}</h2>
                                <p className="text-center max-w-md">
                                    Start a conversation in the sidebar to get help with your project.
                                </p>
                            </div>
                        ) : (
                            <div className="w-full h-full p-5 border rounded-lg overflow-hidden">
                                <iframe
                                    src={sandboxUrl}
                                    className="w-full h-full"
                                    title="Live Preview"
                                    sandbox="allow-same-origin allow-scripts allow-popups allow-forms"
                                    allowFullScreen
                                />
                            </div>
                        )
                    ) : (
                        <div className="flex h-full">
                            {/* File Explorer */}
                            <div className="w-64 border-r border-gray-700 bg-gray-900 overflow-y-auto">
                                <div className="p-3 border-b border-gray-700">
                                    <h3 className="text-sm font-medium text-gray-300">EXPLORER</h3>
                                </div>
                                <div className="py-2">
                                    {renderFileTree(files)}
                                </div>
                            </div>

                            {/* Code Editor */}
                            <div className="flex-1">
                                {selectedFile ? (
                                    <div className="h-full flex flex-col">
                                        <div className="bg-gray-900 px-4 py-2 border-b border-gray-700">
                                            <div className="flex items-center">
                                                <File className="h-4 w-4 mr-2 text-gray-400" />
                                                <span className="text-sm text-gray-300">{selectedFile.name}</span>
                                            </div>
                                        </div>
                                        <div className="flex-1">
                                            <MonacoEditor
                                                height="100%"
                                                defaultLanguage={selectedFile.language || 'plaintext'}
                                                value={selectedFile.content || ''}
                                                theme="vs-dark"
                                                options={{
                                                    minimap: { enabled: false },
                                                    scrollBeyondLastLine: false,
                                                    fontSize: 14,
                                                    wordWrap: 'on',
                                                    automaticLayout: true,
                                                }}
                                            />
                                        </div>
                                    </div>
                                ) : (
                                    <div className="h-full flex items-center justify-center text-gray-500">
                                        <div className="text-center">
                                            <CodeIcon className="h-12 w-12 mx-auto mb-4 text-gray-600" />
                                            <p>Select a file to edit</p>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
