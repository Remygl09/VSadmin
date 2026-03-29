import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, ShieldAlert } from 'lucide-react';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const { signIn, user, profile, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && user && profile) {
      const target = profile.role === 'admin' ? '/admin/dashboard' : '/founder/dashboard';
      navigate(target, { replace: true });
    }
  }, [user, profile, loading, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!email || !password) {
      setError('Please fill in all fields.');
      return;
    }

    setIsLoading(true);
    try {
      await signIn(email, password);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message.toLowerCase() : '';
      if (msg.includes('invalid') || msg.includes('credentials')) {
        setError('Incorrect email or password.');
      } else {
        setError(err instanceof Error ? err.message : 'An error occurred. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm space-y-8">
        <div className="text-center">
          <h1 className="font-display text-3xl font-bold tracking-tight text-foreground">
            Vision Software<span className="text-primary">.</span>
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">Sign in to your workspace</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="rounded-md border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
              {error}
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="email" className="text-sm text-muted-foreground">Email</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@company.com"
              className="bg-surface border-border focus:ring-primary"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password" className="text-sm text-muted-foreground">Password</Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="bg-surface border-border focus:ring-primary"
            />
          </div>
          <Button type="submit" className="w-full font-display" disabled={isLoading}>
            {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Sign In'}
          </Button>
        </form>

        <div className="flex items-center gap-2 rounded-md border border-border bg-surface p-3 text-xs text-muted-foreground">
          <ShieldAlert className="h-4 w-4 shrink-0 text-primary" />
          <span>Admin access is invitation-only. Contact your administrator for access.</span>
        </div>
      </div>
    </div>
  );
}
