import React from 'react';
import { useAuth } from '../contexts/AuthContext';

const GoogleIcon = () => (
    <svg className="w-6 h-6 mr-3" viewBox="0 0 48 48">
        <path fill="#FFC107" d="M43.611 20.083H42V20H24v8h11.303c-1.649 4.657-6.08 8-11.303 8c-6.627 0-12-5.373-12-12s5.373-12 12-12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4C12.955 4 4 12.955 4 24s8.955 20 20 20s20-8.955 20-20c0-1.341-.138-2.65-.389-3.917z" />
        <path fill="#FF3D00" d="M6.306 14.691l6.571 4.819C14.655 15.108 18.961 12 24 12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4C16.318 4 9.656 8.337 6.306 14.691z" />
        <path fill="#4CAF50" d="M24 44c5.166 0 9.86-1.977 13.409-5.192l-6.19-5.238C29.211 35.091 26.715 36 24 36c-5.222 0-9.619-3.317-11.283-7.946l-6.522 5.025C9.505 39.556 16.227 44 24 44z" />
        <path fill="#1976D2" d="M43.611 20.083H24v8h11.303c-.792 2.237-2.231 4.166-4.087 5.571l6.19 5.238C42.012 36.49 44 30.634 44 24c0-1.341-.138-2.65-.389-3.917z" />
    </svg>
);


export const LoginScreen: React.FC = () => {
    const { signIn, error, isConfigured, configError } = useAuth();
    
    return (
        <div className="min-h-screen bg-gray-900 text-gray-100 flex flex-col items-center justify-center p-4">
            <div className="text-center max-w-lg">
                <h1 className="text-4xl md:text-5xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-indigo-600">
                    Veo Bulk Video Generator
                </h1>
                <p className="text-gray-400 mt-4">
                    Please sign in with your Google account to access the generator.
                    Your VEO API usage will be associated with your account.
                </p>

                <div className="mt-8">
                    {isConfigured ? (
                         <button
                            onClick={signIn}
                            className="inline-flex items-center justify-center bg-white text-gray-800 font-semibold py-3 px-6 rounded-lg shadow-lg hover:bg-gray-200 transition-colors duration-300"
                        >
                            <GoogleIcon />
                            Sign in with Google
                        </button>
                    ) : (
                        <div className="bg-red-900/50 border border-red-700 text-red-300 px-4 py-3 rounded-lg" role="alert">
                            <strong className="font-bold">Configuration Error:</strong>
                            <span className="block sm:inline ml-2">{configError || 'Please contact the administrator.'}</span>
                        </div>
                    )}
                </div>

                {error && (
                    <div className="mt-6 bg-red-900/50 text-red-300 px-4 py-3 rounded-lg" role="alert">
                       <p>{error}</p>
                    </div>
                )}
            </div>
        </div>
    );
};