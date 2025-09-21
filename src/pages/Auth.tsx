import { LockKeyhole } from 'lucide-react';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

import BrandMark from '@/components/BrandMark';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
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
    <div className="min-h-screen bg-background text-foreground">
      <main className="mx-auto flex min-h-screen w-full max-w-5xl flex-col px-4 py-6 sm:px-6">
        <header className="flex items-center justify-between">
          <BrandMark />
        </header>

        <section className="grid flex-1 items-center gap-8 py-12 lg:grid-cols-[1fr_420px]">
          <div className="max-w-xl space-y-4">
            <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">
              Sign in to your workspace.
            </h1>
            <p className="text-base leading-7 text-muted-foreground">
              Manage profile data, work items, and live API-backed state from
              one authenticated app.
            </p>
          </div>

          <Card className="rounded-xl bg-card shadow-sm">
            <CardHeader className="space-y-4">
              <div className="flex size-11 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                <LockKeyhole className="size-5" />
              </div>
              <CardTitle className="text-xl">Continue with Google</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                The app uses Firebase authentication and sends the session token
                to protected NestJS endpoints.
              </p>
            </CardContent>
            <CardFooter>
              <Button
                className="h-11 w-full"
                onClick={handleGoogle}
                disabled={loading}
              >
                <LockKeyhole className="size-5" />
                {loading ? 'Signing in...' : 'Sign in'}
              </Button>
            </CardFooter>
          </Card>
        </section>
      </main>
    </div>
  );
};

export default AuthPage;
