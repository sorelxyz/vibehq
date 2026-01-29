import { useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { setToken } from '../lib/auth';

export default function AuthCallbackPage() {
  const [searchParams] = useSearchParams();

  useEffect(() => {
    const token = searchParams.get('token');
    
    if (token) {
      setToken(token);
      // Full reload to reset auth state
      window.location.href = '/';
    } else {
      window.location.href = '/login?error=no_token';
    }
  }, [searchParams]);

  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center">
      <div className="text-gray-400">Authenticating...</div>
    </div>
  );
}
