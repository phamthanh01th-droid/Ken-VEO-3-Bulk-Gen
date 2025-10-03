import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { User } from '../types';

// Add a global type declaration for window.google to satisfy TypeScript
declare global {
    interface Window {
        google: any;
    }
}

interface AuthContextType {
    user: User | null;
    accessToken: string | null;
    isInitialized: boolean;
    error: string | null;
    isConfigured: boolean;
    configError: string | null;
    signIn: () => void;
    signOut: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const GOOGLE_CLIENT_ID = '65331249013-h92qnupqivfh85jbfh1jehv5vgt2ok7g.apps.googleusercontent.com';
const GOOGLE_PROJECT_ID = 'concise-perigee-474013-p4';
const GOOGLE_API_SCOPE = 'https://www.googleapis.com/auth/cloud-platform';

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [user, setUser] = useState<User | null>(null);
    const [accessToken, setAccessToken] = useState<string | null>(null);
    const [isInitialized, setIsInitialized] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);
    const [tokenClient, setTokenClient] = useState<any>(null);
    
    const [isConfigured, setIsConfigured] = useState(false);
    const [configError, setConfigError] = useState<string | null>(null);

    useEffect(() => {
        if (!GOOGLE_CLIENT_ID) {
            setConfigError("Configuration Error: Google Client ID is not set. Please contact the administrator.");
        } else if (!GOOGLE_PROJECT_ID) {
            setConfigError("Configuration Error: Google Project ID is not set. Please contact the administrator.");
        } else {
            setIsConfigured(true);
            setConfigError(null);
        }
    }, []);

    const fetchUserProfile = useCallback(async (token: string) => {
        try {
            const response = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (!response.ok) throw new Error('Failed to fetch user profile');
            const profile = await response.json();
            setUser({ name: profile.name, picture: profile.picture });
        } catch (e: any) {
            console.error("Profile fetch error:", e);
            setError('Failed to load user profile. Please try signing in again.');
            signOut();
        }
    }, []);

    useEffect(() => {
        if (!isConfigured) {
            console.error("Authentication is disabled due to missing configuration.");
            setIsInitialized(true);
            return;
        }

        const initializeGsi = () => {
            // The Google GSI script is loaded from index.html, so we just need to wait for `window.google`
            if (window.google && window.google.accounts) {
                try {
                    const client = window.google.accounts.oauth2.initTokenClient({
                        client_id: GOOGLE_CLIENT_ID,
                        scope: GOOGLE_API_SCOPE,
                        callback: (tokenResponse: any) => {
                            if (tokenResponse.error) {
                                setError(tokenResponse.error_description || 'An unknown error occurred during authentication.');
                                return;
                            }
                            setAccessToken(tokenResponse.access_token);
                            fetchUserProfile(tokenResponse.access_token);
                        },
                        error_callback: (error: any) => {
                            console.error('Google Auth Error:', error);
                            if (error.type === 'popup_closed') {
                                setError('The sign-in window was closed. If this persists, please check your browser settings or contact support.');
                            } else if (error.type === 'popup_failed_to_open') {
                                 setError('The sign-in popup was blocked. Please allow popups for this site and try again.');
                            } else {
                                setError('An unexpected error occurred during authentication.');
                            }
                        }
                    });
                    setTokenClient(client);
                } catch (e) {
                    console.error("Failed to initialize Google Auth:", e);
                    setError("Could not initialize Google Sign-In. The API script might have failed to load.");
                } finally {
                    setIsInitialized(true);
                }
            } else {
                 // If the script isn't loaded yet, wait and retry.
                setTimeout(initializeGsi, 200);
            }
        };

        initializeGsi();
    }, [isConfigured, fetchUserProfile]);


    const signIn = () => {
        if (tokenClient) {
            setError(null);
            // prompt: '' will skip the consent screen if the user has already granted permission.
            tokenClient.requestAccessToken({ prompt: '' });
        } else {
            setError('Google Sign-In is not ready yet. Please wait a moment and try again.');
        }
    };

    const signOut = () => {
        if (accessToken) {
            window.google?.accounts.oauth2.revoke(accessToken, () => {});
        }
        setUser(null);
        setAccessToken(null);
    };

    return (
        <AuthContext.Provider value={{ user, accessToken, isInitialized, error, isConfigured, configError, signIn, signOut }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = (): AuthContextType => {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};
