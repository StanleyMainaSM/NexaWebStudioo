import { useAuth } from '../../lib/auth';
import { supabase } from '../../lib/supabase';
import { useNavigate, Outlet, Link, useLocation } from 'react-router-dom';
import { LogOut, LayoutDashboard, Users, FolderKanban, ReceiptText, FileText, BellRing, Settings, Menu, X, Sparkles } from 'lucide-react';
import { useState } from 'react';

export default function PortalLayout() {
  const { user, roles } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/login');
  };

  const navItems = [
    { name: 'Dashboard', path: '/portal', icon: LayoutDashboard, role: 'all' },
    { name: 'Projects', path: '/portal/projects', icon: FolderKanban, role: 'all' },
    { name: 'Invoices', path: '/portal/invoices', icon: ReceiptText, role: 'all' },
    { name: 'Documents', path: '/portal/documents', icon: FileText, role: 'all' },
    { name: 'Activity', path: '/portal/activity', icon: BellRing, role: 'all' },
    { name: 'Clients', path: '/portal/clients', icon: Users, role: ['owner', 'admin'] },
    { name: 'Settings', path: '/portal/settings', icon: Settings, role: 'all' },
  ];



  return (
    <div className="min-h-screen bg-ink-950 flex overflow-hidden">
      {/* Sidebar - Desktop */}
      <aside className="hidden md:flex w-64 flex-col border-r border-ink-800/50 bg-ink-950 z-20">
        <div className="h-20 flex items-center px-6 border-b border-ink-800/50 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-accent-600 flex items-center justify-center rotate-3">
              <Sparkles className="w-4 h-4 text-white" strokeWidth={2.5} />
            </div>
            <span className="font-medium tracking-tight text-white text-lg">Avelixa</span>
          </div>
        </div>
        
        <div className="flex-1 overflow-y-auto py-6 px-4">
          <nav className="space-y-1">
            {navItems.filter(item => item.role === 'all' || roles.some(r => item.role.includes(r))).map((item) => (
              <Link key={item.name} to={item.path} className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-colors ${location.pathname === item.path ? 'text-accent-400 bg-white/5' : 'text-gray-400 hover:text-accent-400 hover:bg-white/5'}`}>
                <item.icon className="w-5 h-5" />
                {item.name}
              </Link>
            ))}
          </nav>
        </div>
        
        <div className="p-4 border-t border-ink-800/50">
          <div className="flex items-center gap-3 px-4 py-3">
            <div className="w-10 h-10 rounded-full bg-ink-800 flex items-center justify-center text-white font-medium uppercase shrink-0">
              {user?.email?.charAt(0) || 'U'}
            </div>
            <div className="overflow-hidden">
              <div className="text-sm font-medium text-white truncate">{user?.email}</div>
              <div className="text-xs text-accent-500 uppercase tracking-widest">{roles.length > 0 ? roles.join(', ') : 'User'}</div>
            </div>
          </div>
          <button onClick={handleLogout} className="mt-2 w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-red-400 hover:bg-red-500/10 transition-colors">
            <LogOut className="w-5 h-5" />
            Sign out
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden relative">
        <div className="absolute top-0 -left-32 w-[500px] h-[500px] rounded-full bg-accent-500/5 blur-[120px] pointer-events-none" />
        
        <header className="h-20 flex items-center justify-between px-6 border-b border-ink-800/50 md:hidden bg-ink-950/80 backdrop-blur-md z-10 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-accent-600 flex items-center justify-center rotate-3">
              <Sparkles className="w-4 h-4 text-white" strokeWidth={2.5} />
            </div>
            <span className="font-medium tracking-tight text-white text-lg">Avelixa</span>
          </div>
          <button onClick={() => setSidebarOpen(true)} className="text-white p-2">
            <Menu className="w-6 h-6" />
          </button>
        </header>

        <div className="flex-1 overflow-y-auto p-6 md:p-10 z-10">
          <div className="max-w-6xl mx-auto">
            <Outlet />
          </div>
        </div>
      </main>

      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-50 flex md:hidden">
          <div className="fixed inset-0 bg-ink-950/80 backdrop-blur-sm" onClick={() => setSidebarOpen(false)} />
          <div className="relative w-64 max-w-sm bg-ink-900 h-full flex flex-col border-r border-ink-800/50">
            <div className="h-20 flex items-center justify-between px-6 border-b border-ink-800/50">
              <span className="font-medium tracking-tight text-white text-lg">Menu</span>
              <button onClick={() => setSidebarOpen(false)} className="text-gray-400">
                <X className="w-6 h-6" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto py-6 px-4">
              <nav className="space-y-1">
                {navItems.filter(item => item.role === 'all' || roles.some(r => item.role.includes(r))).map((item) => (
                  <Link key={item.name} to={item.path} onClick={() => setSidebarOpen(false)} className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-colors ${location.pathname === item.path ? 'text-accent-400 bg-white/5' : 'text-gray-400 hover:text-accent-400 hover:bg-white/5'}`}>
                    <item.icon className="w-5 h-5" />
                    {item.name}
                  </Link>
                ))}
              </nav>
            </div>
            <div className="p-4 border-t border-ink-800/50">
              <button onClick={handleLogout} className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-red-400 hover:bg-red-500/10">
                <LogOut className="w-5 h-5" />
                Sign out
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
