import { useRouteError } from 'react-router-dom';
import { Button } from '@/components/ui/button';

export default function ErrorBoundary() {
  const error = useRouteError() as Error | undefined;

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="text-center space-y-4">
        <h1 className="font-display text-2xl font-bold text-foreground">Something went wrong</h1>
        <p className="text-muted-foreground text-sm max-w-md">
          {error?.message ?? 'An unexpected error occurred.'}
        </p>
        <Button variant="outline" onClick={() => window.location.href = '/'}>
          Back to Home
        </Button>
      </div>
    </div>
  );
}
