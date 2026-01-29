import { useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { setToken } from '../lib/auth';

export default function AuthCallbackPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  useEffect(() => {
    const token = searchParams.get('token');
    
    if (token) {
      setToken(token);
      navigate('/', { replace: true });
    } else {
      navigate('/login?error=no_token', { replace: true });
    }
  }, [searchParams, navigate]);

  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center">
      <div className="text-gray-400">Authenticating...</div>
    </div>
  );
}
