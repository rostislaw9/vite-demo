import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Card, CardFooter, CardHeader } from '@/components/ui/card';
import { useAuth } from '@/contexts/AuthContext';

const AuthPage: React.FC = () => {
  const { login } = useAuth();
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleGoogle = async () => {
    setLoading(true);
    await toast
      .promise(login(), {
        loading: 'Signing in with Google…',
        success: 'Signed in successfully!',
        error: {
          message: 'Sign-in failed',
          description: 'Please try again later.',
        },
      })
      .unwrap()
      .then(() => {
        navigate('/');
      })
      .catch((e) => {
        console.error('Sign-in error:', e);
      })
      .finally(() => {
        setLoading(false);
      });
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50">
      <Card className="w-full max-w-md bg-white shadow">
        <CardHeader className="mb-6 text-center text-xl font-semibold">
          Sign In / Sign Up
        </CardHeader>
        <CardFooter>
          <Button className="w-full" onClick={handleGoogle} disabled={loading}>
            {loading ? 'Signing in…' : 'Sign in with Google'}
          </Button>{' '}
        </CardFooter>
      </Card>
    </div>
  );
};

export default AuthPage;
