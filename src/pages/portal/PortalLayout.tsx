import { useAuth } from '../../lib/auth';
import { supabase } from '../../lib/supabase';
import { useNavigate, Outlet, Link, useLocation } from 'react-router-dom';
import { LogOut, LayoutDashboard, Users, FolderKanban, ReceiptText, FileText, BellRing, Settings, Menu, X, Star, Crown, ShieldCheck, ArrowLeftRight, Briefcase, UserRound, Link as ConnectorIcon, Wrench, MessageSquare, WalletCards, UserCog, Package, Globe, Server, RefreshCw, BarChart3, UserPlus, SlidersHorizontal } from 'lucide-react';
import { useState } from 'react';
import { usePortalRealtimeRefresh } from '../../lib/usePortalRealtime';

type WorkspaceKey = 'client' | 'connector' | 'operator' | 'admin' | 'owner';
interface Workspace { key: WorkspaceKey; label: string; path: string; icon: typeof UserRound; }
interface NavItem { name: string; path: string; icon: typeof LayoutDashboard; roles: 'all' | WorkspaceKey[]; }

const workspaceDefinitions: Record<WorkspaceKey, Workspace> = {
  client: { key: 'client', label: 'Client', path: '/portal', icon: UserRound },
  connector: { key: 'connector', label: 'Connector', path: '/portal/connector', icon: ConnectorIcon },
  operator: { key: 'operator', label: 'Operator', path: '/portal/operator', icon: Wrench },
  admin: { key: 'admin', label: 'Admin', path: '/portal/admin', icon: ShieldCheck },
  owner: { key: 'owner', label: 'Owner', path: '/portal/owner', icon: Crown },
};

function getCurrentWorkspace(pathname: string, roles: string[]): WorkspaceKey {
  if (pathname.startsWith('/portal/owner')) return 'owner';
  if (pathname.startsWith('/portal/admin')) return 'admin';
  if (pathname.startsWith('/portal/connector')) return 'connector';
  if (pathname.startsWith('/portal/operator')) return 'operator';
  if (pathname.startsWith('/portal/clients') || pathname.startsWith('/portal/reviews') || pathname.startsWith('/portal/portfolio') || pathname.startsWith('/portal/services') || pathname.startsWith('/portal/website-packages') || pathname.startsWith('/portal/maintenance') || pathname.startsWith('/portal/hosting') || pathname.startsWith('/portal/revenue') || pathname.startsWith('/portal/connector-applications')) {
    if (roles.includes('owner')) return 'owner';
    if (roles.includes('admin')) return 'admin';
  }
  if (pathname.startsWith('/portal/website-links')) return roles.includes('owner') ? 'owner' : roles.includes('admin') ? 'admin' : 'client';
  if (pathname === '/portal' || pathname.startsWith('/portal/projects') || pathname.startsWith('/portal/invoices') || pathname.startsWith('/portal/documents') || pathname.startsWith('/portal/activity') || pathname.startsWith('/portal/settings') || pathname.startsWith('/portal/messages')) {
    if (roles.includes('client')) return 'client';
    if (roles.includes('owner')) return 'owner';
    if (roles.includes('admin')) return 'admin';
    if (roles.includes('operator')) return 'operator';
    if (roles.includes('connector')) return 'connector';
  }
  if (roles.includes('owner')) return 'owner';
  if (roles.includes('admin')) return 'admin';
  if (roles.includes('connector')) return 'connector';
  if (roles.includes('operator')) return 'operator';
  return 'client';
}

export default function PortalLayout() {
  const { user, roles } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const realtimeRefreshKey = usePortalRealtimeRefresh();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const normalizedRoles = roles.map(role => String(role).trim().toLowerCase()).filter(Boolean);
  const availableWorkspaces = (['client', 'connector', 'operator', 'admin', 'owner'] as WorkspaceKey[]).filter(role => normalizedRoles.includes(role)).map(role => workspaceDefinitions[role]);
  const currentWorkspaceKey = getCurrentWorkspace(location.pathname, normalizedRoles);
  const currentWorkspace = workspaceDefinitions[currentWorkspaceKey];
  const switchWorkspace = (workspace: Workspace) => { if (!normalizedRoles.includes(workspace.key)) return; navigate(workspace.path); setSidebarOpen(false); };
  const handleLogout = async () => { await supabase.auth.signOut(); setSidebarOpen(false); navigate('/login', { replace: true }); };
  const dashboardPath = currentWorkspace.path;

  const navItems: NavItem[] = [
    { name: 'Dashboard', path: dashboardPath, icon: LayoutDashboard, roles: 'all' },
    { name: 'Projects', path: '/portal/projects', icon: FolderKanban, roles: 'all' },
    { name: 'Invoices', path: '/portal/invoices', icon: ReceiptText, roles: 'all' },
    { name: 'Documents', path: '/portal/documents', icon: FileText, roles: 'all' },
    { name: 'Messages', path: '/portal/messages', icon: MessageSquare, roles: 'all' },
    { name: 'Activity', path: '/portal/activity', icon: BellRing, roles: 'all' },
    { name: 'Service Catalogue', path: '/portal/services', icon: Package, roles: ['owner', 'admin'] },
    { name: 'Website Packages', path: '/portal/website-packages', icon: Globe, roles: ['owner', 'admin'] },
    { name: 'Maintenance Plans', path: '/portal/maintenance', icon: RefreshCw, roles: ['owner', 'admin'] },
    { name: 'Hosting', path: '/portal/hosting', icon: Server, roles: ['owner', 'admin'] },
    { name: 'Revenue Operations', path: '/portal/revenue', icon: BarChart3, roles: ['owner', 'admin'] },
    { name: 'Clients', path: '/portal/clients', icon: Users, roles: ['owner', 'admin'] },
    { name: 'Reviews', path: '/portal/reviews', icon: Star, roles: ['owner', 'admin'] },
    { name: 'Connector Applications', path: '/portal/connector-applications', icon: UserPlus, roles: ['owner', 'admin'] },
    { name: 'Portfolio', path: '/portal/portfolio', icon: Briefcase, roles: ['owner', 'admin'] },
    { name: 'Finance', path: '/portal/owner/finance', icon: WalletCards, roles: ['owner'] },
    { name: 'Website Links', path: '/portal/website-links', icon: SlidersHorizontal, roles: ['owner'] },
    { name: 'User Management', path: '/portal/owner/users', icon: UserCog, roles: ['owner'] },
    { name: 'Settings', path: '/portal/settings', icon: Settings, roles: 'all' },
  ];

  const visibleNavItems = navItems.filter(item => item.roles === 'all' || item.roles.some(role => normalizedRoles.includes(role)));
  const otherWorkspaces = availableWorkspaces.filter(workspace => workspace.key !== currentWorkspaceKey);
  const isNavItemActive = (path: string) => path === dashboardPath ? location.pathname === path : location.pathname === path || location.pathname.startsWith(`${path}/`);

  const renderWorkspaceSwitcher = () => {
    if (availableWorkspaces.length <= 1) return null;
    const CurrentIcon = currentWorkspace.icon;
    return (
      <div className="rounded-2xl border border-accent-500/20 bg-accent-500/5 p-4">
        <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-accent-400"><ArrowLeftRight className="w-4 h-4" />Workspace</div>
        <div className="mt-3 flex items-center gap-3"><div className="w-9 h-9 rounded-xl bg-accent-500/10 border border-accent-500/20 flex items-center justify-center shrink-0"><CurrentIcon className="w-5 h-5 text-accent-400" /></div><div className="min-w-0"><div className="text-sm font-semibold text-white">{currentWorkspace.label} Portal</div><div className="text-xs text-gray-500 mt-0.5">{availableWorkspaces.length} workspaces available</div></div></div>
        <div className="mt-4 space-y-2">{otherWorkspaces.map(workspace => { const WorkspaceIcon = workspace.icon; return <button key={workspace.key} type="button" onClick={() => switchWorkspace(workspace)} className="w-full inline-flex items-center justify-between gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-xs font-semibold text-gray-300 transition-all hover:border-accent-500/30 hover:bg-accent-500/10 hover:text-accent-300"><span className="inline-flex items-center gap-2"><WorkspaceIcon className="w-4 h-4" />Switch to {workspace.label}</span><ArrowLeftRight className="w-4 h-4" /></button>; })}</div>
      </div>
    );
  };

  const userInitial = user?.email?.charAt(0).toUpperCase() || 'U';
  const renderNav = (mobile = false) => <nav className="space-y-1">{visibleNavItems.map(item => { const active = isNavItemActive(item.path); return <Link key={item.name} to={item.path} onClick={mobile ? () => setSidebarOpen(false) : undefined} className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${active ? 'text-accent-400 bg-accent-500/10 border border-accent-500/10' : 'text-gray-400 hover:text-accent-400 hover:bg-white/5 border border-transparent'}`}><item.icon className="w-5 h-5 shrink-0" />{item.name}</Link>; })}</nav>;

  return (
    <div className="min-h-screen bg-ink-950 flex overflow-hidden">
      <aside className="hidden md:flex w-64 flex-col border-r border-ink-800/50 bg-ink-950 z-20 shrink-0">
        <div className="h-20 flex items-center px-6 border-b border-ink-800/50 shrink-0"><Link to={currentWorkspace.path} className="flex items-center gap-3 group"><div className="w-10 h-10 rounded-xl bg-white/[0.03] border border-white/10 flex items-center justify-center overflow-hidden shrink-0 transition-all group-hover:border-accent-500/40"><img src="/logo.avif" alt="Avelixa" className="w-full h-full object-contain" /></div><div><div className="font-medium tracking-tight text-white text-lg">Avelixa</div><div className="text-[9px] uppercase tracking-[0.2em] text-accent-400 mt-0.5">{currentWorkspace.label} Portal</div></div></Link></div>
        <div className="px-4 pt-5">{renderWorkspaceSwitcher()}</div>
        <div className="flex-1 overflow-y-auto py-6 px-4">{renderNav()}</div>
        <div className="p-4 border-t border-ink-800/50"><div className="flex items-center gap-3 px-4 py-3"><div className="w-10 h-10 rounded-full bg-accent-500/10 border border-accent-500/20 flex items-center justify-center text-accent-400 font-semibold uppercase shrink-0">{userInitial}</div><div className="overflow-hidden min-w-0"><div className="text-sm font-medium text-white truncate">{user?.email || 'Avelixa User'}</div><div className="text-[10px] text-accent-500 uppercase tracking-widest truncate mt-0.5">{currentWorkspace.label} Portal</div></div></div><button type="button" onClick={handleLogout} className="mt-2 w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-red-400 hover:bg-red-500/10 transition-colors"><LogOut className="w-5 h-5" />Sign out</button></div>
      </aside>

      <main className="flex-1 flex flex-col min-w-0 overflow-hidden relative"><div className="absolute top-0 -left-32 w-[500px] h-[500px] rounded-full bg-accent-500/5 blur-[120px] pointer-events-none" /><div className="absolute bottom-0 -right-40 w-[400px] h-[400px] rounded-full bg-brand-500/5 blur-[120px] pointer-events-none" />
        <header className="h-20 flex items-center justify-between px-5 border-b border-ink-800/50 md:hidden bg-ink-950/90 backdrop-blur-md z-20 shrink-0"><Link to={currentWorkspace.path} className="flex items-center gap-3"><div className="w-10 h-10 rounded-xl bg-white/[0.03] border border-white/10 flex items-center justify-center overflow-hidden shrink-0"><img src="/logo.avif" alt="Avelixa" className="w-full h-full object-contain" /></div><div><div className="font-medium tracking-tight text-white text-lg">Avelixa</div><div className="text-[10px] uppercase tracking-widest text-accent-400">{currentWorkspace.label} Portal</div></div></Link><button type="button" onClick={() => setSidebarOpen(true)} className="text-white p-2 rounded-xl hover:bg-white/5 transition-colors" aria-label="Open portal menu"><Menu className="w-6 h-6" /></button></header>
        <div className="flex-1 overflow-y-auto p-5 md:p-10 z-10"><div className="max-w-6xl mx-auto"><Outlet key={realtimeRefreshKey} /></div></div>
      </main>

      {sidebarOpen && <div className="fixed inset-0 z-50 flex md:hidden"><div className="fixed inset-0 bg-ink-950/80 backdrop-blur-sm" onClick={() => setSidebarOpen(false)} /><div className="relative w-72 max-w-[85vw] bg-ink-900 h-full flex flex-col border-r border-ink-800/50 shadow-2xl"><div className="h-20 flex items-center justify-between px-5 border-b border-ink-800/50"><Link to={currentWorkspace.path} onClick={() => setSidebarOpen(false)} className="flex items-center gap-3"><div className="w-9 h-9 rounded-xl bg-white/[0.03] border border-white/10 flex items-center justify-center overflow-hidden"><img src="/logo.avif" alt="Avelixa" className="w-full h-full object-contain" /></div><div><div className="font-medium tracking-tight text-white text-lg">Avelixa</div><div className="text-[9px] uppercase tracking-[0.2em] text-accent-400">{currentWorkspace.label} Portal</div></div></Link><button type="button" onClick={() => setSidebarOpen(false)} className="text-gray-400 hover:text-white p-2 rounded-xl hover:bg-white/5 transition-colors" aria-label="Close portal menu"><X className="w-6 h-6" /></button></div><div className="px-4 pt-5">{renderWorkspaceSwitcher()}</div><div className="flex-1 overflow-y-auto py-6 px-4">{renderNav(true)}</div><div className="p-4 border-t border-ink-800/50"><div className="flex items-center gap-3 px-3 py-3 mb-2"><div className="w-10 h-10 rounded-full bg-accent-500/10 border border-accent-500/20 flex items-center justify-center text-accent-400 font-semibold uppercase shrink-0">{userInitial}</div><div className="overflow-hidden min-w-0"><div className="text-sm font-medium text-white truncate">{user?.email || 'Avelixa User'}</div><div className="text-[10px] text-accent-500 uppercase tracking-widest truncate mt-0.5">{currentWorkspace.label} Portal</div></div></div><button type="button" onClick={handleLogout} className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-red-400 hover:bg-red-500/10 transition-colors"><LogOut className="w-5 h-5" />Sign out</button></div></div></div>}
    </div>
  );
}
