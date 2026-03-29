import { ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';
import logo from '@/assets/Vision_Software.png';

export default function FounderLayout({ children }: { children: ReactNode }) {
  const { profile, signOut } = useAuth();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await signOut();
    navigate('/login');
  };

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="sticky top-0 z-50 flex h-16 items-center justify-between border-b border-border bg-background/80 px-6 backdrop-blur-sm">
        <div className="flex items-center gap-4">
          <img src={logo} alt="Vision Software" className="h-8 w-auto" />
          {profile?.full_name && (
            <>
              <span className="h-5 w-px bg-border" />
              <span className="text-sm text-muted-foreground">{profile.full_name}</span>
            </>
          )}
        </div>

        <Button
          variant="ghost"
          size="sm"
          onClick={handleSignOut}
          className="gap-2 text-muted-foreground hover:text-foreground"
        >
          <LogOut className="h-4 w-4" />
          <span className="hidden sm:inline">Sign Out</span>
        </Button>
      </header>

      <main className="flex-1">{children}</main>
    </div>
  );
}
