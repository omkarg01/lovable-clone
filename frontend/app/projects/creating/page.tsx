'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

const page = () => {
    const router = useRouter();

    useEffect(() => {
        const interval = setInterval(() => {
            // Read stored data
            const projectId = localStorage.getItem('projectId');

            // if (error) {
            //     clearInterval(interval);
            //     alert('❌ Failed to create project');
            //     localStorage.removeItem('pendingProjectError');
            //     router.replace('/projects'); // optional: go back to list
            // }

            if (projectId) {
                router.replace(`/projects/${projectId}`);
            }
        }, 1000);

        return () => clearInterval(interval);
    }, [router]);

    return (
        <div className="flex h-screen bg-gray-100">
            {/* Sidebar Skeleton */}
            <div className="w-16 md:w-64 bg-gray-900 p-4">
                <div className="h-8 bg-gray-700 rounded-md animate-pulse mb-6"></div>
                <div className="space-y-2">
                    {[1, 2, 3].map((i) => (
                        <div key={i} className="h-10 bg-gray-700 rounded-lg animate-pulse"></div>
                    ))}
                </div>
            </div>

            {/* Main Content Skeleton */}
            <div className="flex-1 p-4">
                <div className="max-w-3xl mx-auto">
                    <div className="h-8 bg-gray-200 rounded-md w-1/3 mb-6 animate-pulse"></div>
                    <div className="space-y-4">
                        {[1, 2, 3].map((i) => (
                            <div key={i} className="h-20 bg-gray-200 rounded-lg animate-pulse"></div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    )
}

export default page