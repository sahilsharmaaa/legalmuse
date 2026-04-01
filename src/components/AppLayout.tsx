import { ReactNode } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  Scale,
  LayoutDashboard,
  PlusCircle,
  List,
  Settings,
  LogOut,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { useState } from 'react';

const navItems = [
  { href: '/', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/jobs/new', label: 'New Job', icon: PlusCircle },
  { href: '/jobs', label: 'All Jobs', icon: List },
  { href: '/settings', label: 'Settings', icon: Settings },
];

export default function AppLayout({ children }: { children: ReactNode }) {
  const { user, signOut } = useAuth();
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div className="flex min-h-screen">
      {/* Sidebar */}
      <aside
        className={cn(
          'sticky top-0 flex h-screen flex-col border-r bg-sidebar-background text-sidebar-foreground transition-all duration-300',
          collapsed ? 'w-16' : 'w-60'
        )}
      >
        <div className="flex h-14 items-center gap-2 border-b border-sidebar-border px-4">
          <Scale className="h-5 w-5 shrink-0 text-sidebar-primary" />
          {!collapsed && (
            <span className="text-sm font-bold text-sidebar-primary-foreground">LegalContent.ai</span>
          )}
        </div>

        <nav className="flex-1 space-y-1 p-2">
          {navItems.map((item) => {
            const active = location.pathname === item.href || (item.href !== '/' && location.pathname.startsWith(item.href));
            return (
              <Link
                key={item.href}
                to={item.href}
                className={cn(
                  'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                  active
                    ? 'bg-sidebar-accent text-sidebar-primary'
                    : 'text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'
                )}
              >
                <item.icon className="h-4 w-4 shrink-0" />
                {!collapsed && <span>{item.label}</span>}
              </Link>
            );
          })}
        </nav>

        <div className="border-t border-sidebar-border p-2">
          {!collapsed && (
            <p className="mb-2 truncate px-3 text-xs text-sidebar-foreground/60">{user?.email}</p>
          )}
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-start gap-3 text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
            onClick={signOut}
          >
            <LogOut className="h-4 w-4 shrink-0" />
            {!collapsed && <span>Sign Out</span>}
          </Button>
        </div>

        <button
          onClick={() => setCollapsed(!collapsed)}
          className="flex h-8 items-center justify-center border-t border-sidebar-border text-sidebar-foreground/60 hover:text-sidebar-foreground"
        >
          {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
        </button>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-auto">
        <div className="mx-auto max-w-5xl p-6 lg:p-8">{children}</div>
      </main>
    </div>
  );
}
