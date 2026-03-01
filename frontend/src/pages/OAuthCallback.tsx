import { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export function OAuthCallback() {
  const [params] = useSearchParams();
  const { login } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const token    = params.get('token');
    const username = params.get('username');
    const plan     = params.get('plan') || 'free';
    const error    = params.get('error');

    if (error || !token || !username) {
      navigate('/auth?error=' + (error || 'oauth_failed'), { replace: true });
      return;
    }

    login(token, username, plan);
    navigate('/app/new', { replace: true });
  }, []);

  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center">
      <div className="text-center">
        <div className="w-10 h-10 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <p className="text-gray-400 text-sm">Входим в систему...</p>
      </div>
    </div>
  );
}
