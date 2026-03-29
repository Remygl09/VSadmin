import { ReactNode, useState } from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { FolderKanban, Settings, LogOut, CreditCard, DollarSign, Menu, X, Archive } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import logo from '@/assets/Vision_Software.png';
import { useUnseenPayments } from '@/hooks/useUnseenPayments';

const navLinks = [
  { to: '/admin/dashboard', label: 'Pipeline', icon: FolderKanban },
  { to: '/admin/archived', label: 'Archived', icon: Archive },
  { to: '/admin/payments', label: 'Payments', icon: CreditCard },
  { to: '/admin/settings', label: 'Settings', icon: Settings },
];

export default function AdminLayout({ children }: { children: ReactNode }) {
  const { profile, signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { hasUnseenGlobal, markGlobalSeen } = useUnseenPayments();
  const [mobileOpen, setMobileOpen] = useState(false);

  if (location.pathname === '/admin/payments' && hasUnseenGlobal) {
    markGlobalSeen();
  }

  const handleSignOut = async () => {
    await signOut();
    navigate('/login');
  };

  const initials = profile?.full_name
    ? profile.full_name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
    : 'A';

  const navContent = (
    <>
      <nav className="flex flex-1 flex-col gap-1 px-2 py-4">
        {navLinks.map((link) => (
          <NavLink
            key={link.to}
            to={link.to}
            onClick={() => setMobileOpen(false)}
            className={({ isActive }) =>
              cn(
                'flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-display transition-colors relative',
                isActive
                  ? 'bg-primary/10 text-primary'
                  : 'text-muted-foreground hover:bg-secondary hover:text-foreground'
              )
            }
          >
            <link.icon className="h-5 w-5 shrink-0" />
            <span className="lg:block hidden">{link.label}</span>
            <span className="lg:hidden block">{link.label}</span>
            {link.to === '/admin/payments' && hasUnseenGlobal && (
              <DollarSign className="h-4 w-4 text-red-500 shrink-0 ml-auto animate-pulse" />
            )}
          </NavLink>
        ))}
      </nav>

      <div className="border-t border-border p-2">
        <button
          onClick={handleSignOut}
          className="flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-sm font-display text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
        >
          <LogOut className="h-5 w-5 shrink-0" />
          <span className="lg:block hidden">Sign Out</span>
          <span className="lg:hidden block">Sign Out</span>
        </button>
      </div>
    </>
  );

  return (
    <div className="flex min-h-screen bg-background">
      {/* Desktop Sidebar */}
      <aside className="fixed inset-y-0 left-0 z-50 hidden md:flex w-[72px] flex-col border-r border-border bg-background lg:w-56">
        <div className="flex h-16 items-center px-3">
          <img src={logo} alt="Vision Software" className="hidden h-8 w-auto lg:block" />
          <span className="font-display text-lg font-bold text-foreground lg:hidden">
            V<span className="text-primary">.</span>
          </span>
        </div>
        {navContent}
      </aside>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div className="absolute inset-0 bg-black/60" onClick={() => setMobileOpen(false)} />
          <aside className="absolute inset-y-0 left-0 w-64 flex flex-col border-r border-border bg-background">
            <div className="flex h-16 items-center justify-between px-4">
              <img src={logo} alt="Vision Software" className="h-8 w-auto" />
              <Button variant="ghost" size="icon" onClick={() => setMobileOpen(false)}>
                <X className="h-5 w-5" />
              </Button>
            </div>
            {navContent}
          </aside>
        </div>
      )}

      {/* Main area */}
      <div className="md:ml-[72px] flex flex-1 flex-col lg:ml-56">
        <header className="sticky top-0 z-40 flex h-16 items-center justify-between border-b border-border bg-background/80 px-6 backdrop-blur-sm">
          <Button variant="ghost" size="icon" className="md:hidden" onClick={() => setMobileOpen(true)}>
            <Menu className="h-5 w-5" />
          </Button>
          <div className="flex-1" />
          <div className="flex items-center gap-3">
            <span className="hidden text-sm text-muted-foreground md:block">
              {profile?.full_name ?? 'Admin'}
            </span>
            <Avatar className="h-8 w-8 border border-border">
              <AvatarFallback className="bg-primary/10 text-primary text-xs font-display">
                {initials}
              </AvatarFallback>
            </Avatar>
          </div>
        </header>

        <main className="flex-1">{children}</main>
      </div>
    </div>
  );
}
