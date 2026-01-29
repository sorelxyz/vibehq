import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { config } from '../lib/config';

export default function LoginPage() {
  const [searchParams] = useSearchParams();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const errorParam = searchParams.get('error');
    if (errorParam) {
      const errorMessages: Record<string, string> = {
        'not_allowed': 'Your GitHub account is not authorized to access this app.',
        'no_code': 'GitHub authentication failed. Please try again.',
        'token_failed': 'Failed to authenticate with GitHub. Please try again.',
        'oauth_failed': 'Authentication error. Please try again.',
        'no_user': 'Could not get your GitHub user info. Please try again.',
      };
      setError(errorMessages[errorParam] || 'Authentication failed. Please try again.');
    }
  }, [searchParams]);

  const handleGitHubLogin = () => {
    // Redirect to backend GitHub OAuth endpoint
    window.location.href = `${config.apiBase}/auth/github`;
  };

  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center">
      <div className="bg-gray-800 p-8 rounded-lg shadow-lg w-full max-w-md text-center">
        <h1 className="text-2xl font-bold text-white mb-2">VibeHQ</h1>
        <p className="text-gray-400 mb-6">Sign in to continue</p>
        
        {error && (
          <div className="bg-red-900/50 border border-red-700 text-red-200 px-4 py-3 rounded-lg mb-6">
            {error}
          </div>
        )}
        
        <button
          onClick={handleGitHubLogin}
          className="w-full py-3 bg-gray-700 hover:bg-gray-600 text-white font-medium rounded-lg transition-colors flex items-center justify-center gap-3"
        >
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
            <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.477 2 12c0 4.42 2.865 8.17 6.839 9.49.5.092.682-.217.682-.482 0-.237-.008-.866-.013-1.7-2.782.604-3.369-1.34-3.369-1.34-.454-1.156-1.11-1.463-1.11-1.463-.908-.62.069-.608.069-.608 1.003.07 1.531 1.03 1.531 1.03.892 1.529 2.341 1.087 2.91.831.092-.646.35-1.086.636-1.336-2.22-.253-4.555-1.11-4.555-4.943 0-1.091.39-1.984 1.029-2.683-.103-.253-.446-1.27.098-2.647 0 0 .84-.269 2.75 1.025A9.578 9.578 0 0112 6.836c.85.004 1.705.114 2.504.336 1.909-1.294 2.747-1.025 2.747-1.025.546 1.377.203 2.394.1 2.647.64.699 1.028 1.592 1.028 2.683 0 3.842-2.339 4.687-4.566 4.935.359.309.678.919.678 1.852 0 1.336-.012 2.415-.012 2.743 0 .267.18.578.688.48C19.138 20.167 22 16.418 22 12c0-5.523-4.477-10-10-10z" />
          </svg>
          Sign in with GitHub
        </button>
      </div>
    </div>
  );
}
