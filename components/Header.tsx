
import React from 'react';
import { useAuth } from '../contexts/AuthContext';

export const Header: React.FC = () => {
    const { user, signOut } = useAuth();
    
    if (!user) return null;

    return (
        <header className="bg-gray-800/50 backdrop-blur-sm border-b border-gray-700">
            <div className="container mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex items-center justify-between h-16">
                    <div className="flex-shrink-0">
                        <h1 className="text-xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-indigo-600">
                            Veo Bulk Video Generator
                        </h1>
                    </div>
                    <div className="flex items-center gap-4">
                        <div className="flex items-center gap-3">
                            <img className="h-8 w-8 rounded-full" src={user.picture} alt="User avatar" />
                            <span className="text-gray-300 text-sm font-medium hidden sm:block">{user.name}</span>
                        </div>
                        <button
                            onClick={signOut}
                            className="bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded-lg text-sm transition-colors duration-300"
                        >
                            Sign Out
                        </button>
                    </div>
                </div>
            </div>
        </header>
    );
};
