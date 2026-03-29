import { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Loader2 } from 'lucide-react';

interface ProtectedRouteProps {
  children: ReactNode;
  allowedRole?: 'admin' | 'founder';
}

export function ProtectedRoute({ children, allowedRole }: ProtectedRouteProps) {
  const { user, profile, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRole && profile?.role !== allowedRole) {
    const target = profile?.role === 'admin' ? '/admin/dashboard' : '/founder/dashboard';
    return <Navigate to={target} replace />;
  }

  return <>{children}</>;
}
