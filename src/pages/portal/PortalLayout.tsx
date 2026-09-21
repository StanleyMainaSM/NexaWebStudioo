import { useEffect, useMemo, useState } from 'react';
import { ArrowLeftRight, BarChart3, BellRing, Briefcase, Crown, FileText, FolderKanban, Globe, LayoutDashboard, LogOut, Menu, MessageSquare, Package, ReceiptText, RefreshCw, Server, Settings, ShieldCheck, SlidersHorizontal, Sparkles, Star, UserCog, UserPlus, UserRound, Users, WalletCards, Wrench, X } from 'lucide-react';
import { useLocation, useNavigate, Outlet, Link } from 'react-router-dom';
import { useAuth, getPrimaryPortalRole, type PortalWorkspace } from '../../lib/auth';
import { supabase } from '../../lib/supabase';
import { usePortalRealtimeRefresh } from '../../lib/usePortalRealtime';
import GlobalCallListener from '../../components/portal/GlobalCallListener';

type WorkspaceKey = PortalWorkspace;
type Icon = typeof LayoutDashboard;
type NavItem = { name: string; path: string; icon: Icon; roles: WorkspaceKey[] };

const workspaceDefinitions: Record<WorkspaceKey, { key: WorkspaceKey; label: string; path: string; icon: Icon }> = {
  client: { key: 'client', label: 'Client', path: '/portal', icon: UserRound },
  connector: { key: 'connector', label: 'Connector', path: '/portal/connector', icon: Briefcase },
  operator: { key: 'operator', label: 'Operator', path: '/portal/operator', icon: Wrench },
  admin: { key: 'admin', label: 'Admin', path: '/portal/admin', icon: ShieldCheck },
  owner: { key: 'owner', label: 'Owner', path: '/portal/owner', icon: Crown },
};

function getExplicitWorkspace(pathname: string): WorkspaceKey | null {
  if (pathname.startsWith('/portal/owner')) return 'owner';
  if (pathname.startsWith('/portal/admin')) return 'admin';
  if (pathname.startsWith('/portal/connector')) return 'connector';
  if (pathname.startsWith('/portal/operator')) return 'operator';
  return null;
}

const navItems: NavItem[] = [
  { name: 'Dashboard', path: '/portal', icon: LayoutDashboard, roles: ['client'] },
  { name: 'Projects', path: '/portal/projects', icon: FolderKanban, roles: ['client', 'connector', 'operator', 'admin', 'owner'] },
  { name: 'Template Studio', path: '/portal/creation-studio', icon: Sparkles, roles: ['client', 'connector', 'operator', 'admin', 'owner'] },
  { name: 'Invoices', path: '/portal/invoices', icon: ReceiptText, roles: ['client', 'admin', 'owner'] },
  { name: 'Documents', path: '/portal/documents', icon: FileText, roles: ['client', 'operator', 'admin', 'owner'] },
  { name: 'Messages', path: '/portal/messages', icon: MessageSquare, roles: ['client', 'connector', 'operator', 'admin', 'owner'] },
  { name: 'Activity', path: '/portal/activity', icon: BellRing, roles: ['client', 'connector', 'operator', 'admin', 'owner'] },
  { name: 'My Leads', path: '/portal/connector/leads', icon: Users, roles: ['connector'] },
  { name: 'Find Clients', path: '/portal/connector/lead-generation', icon: UserPlus, roles: ['connector'] },
  { name: 'Earnings', path: '/portal/connector/earnings', icon: WalletCards, roles: ['connector'] },
  { name: 'Clients', path: '/portal/connector/clients', icon: Users, roles: ['connector'] },
  { name: 'Recruitment', path: '/portal/connector/recruitment', icon: UserPlus, roles: ['connector'] },
  { name: 'Team', path: '/portal/admin/team', icon: Users, roles: ['admin'] },
  { name: 'Connector Applications', path: '/portal/connector-applications', icon: UserPlus, roles: ['admin', 'owner'] },
  { name: 'Clients', path: '/portal/clients', icon: Users, roles: ['admin', 'owner'] },
  { name: 'Reviews', path: '/portal/reviews', icon: Star, roles: ['admin', 'owner'] },
  { name: 'Service Catalogue', path: '/portal/services', icon: Package, roles: ['admin', 'owner'] },
  { name: 'Website Packages', path: '/portal/website-packages', icon: Globe, roles: ['admin', 'owner'] },
  { name: 'Maintenance Plans', path: '/portal/maintenance', icon: RefreshCw, roles: ['admin', 'owner'] },
  { name: 'Hosting', path: '/portal/hosting', icon: Server, roles: ['admin', 'owner'] },
  { name: 'Revenue Operations', path: '/portal/revenue', icon: BarChart3, roles: ['admin', 'owner'] },
  { name: 'Finance', path: '/portal/owner/finance', icon: WalletCards, roles: ['owner'] },
  { name: 'Website Links', path: '/portal/website-links', icon: SlidersHorizontal, roles: ['owner'] },
  { name: 'Creation Access', path: '/portal/owner/creation-access', icon: ShieldCheck, roles: ['owner'] },
  { name: 'User Management', path: '/portal/owner/users', icon: UserCog, roles: ['owner'] },
  { name: 'Settings', path: '/portal/settings', icon: Settings, roles: ['client', 'connector', 'operator', 'admin', 'owner'] },
];

export default function PortalLayout() {
  const { user, roles, profile, activeWorkspace, setActiveWorkspace } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const realtimeRefreshKey = usePortalRealtimeRefresh();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [unreadMessages, setUnreadMessages] = useState(0);
  const normalizedRoles = useMemo(() => roles.map((role) => String(role).trim().toLowerCase()).filter(Boolean) as WorkspaceKey[], [roles]);
  const availableWorkspaces = normalizedRoles.filter((role, index, list) => ['client', 'connector', 'operator', 'admin', 'owner'].includes(role) && list.indexOf(role) === index).map((role) => workspaceDefinitions[role]);
  const explicitWorkspace = getExplicitWorkspace(location.pathname);

  useEffect(() => {
    if (explicitWorkspace && normalizedRoles.includes(explicitWorkspace)) { setActiveWorkspace(explicitWorkspace); return; }
    if (!activeWorkspace || !normalizedRoles.includes(activeWorkspace)) {
      const fallback = getPrimaryPortalRole(normalizedRoles) as WorkspaceKey | null;
      if (fallback) setActiveWorkspace(fallback);
    }
  }, [explicitWorkspace, activeWorkspace, normalizedRoles.join('|'), setActiveWorkspace]);

  const currentWorkspaceKey = (explicitWorkspace && normalizedRoles.includes(explicitWorkspace) ? explicitWorkspace : activeWorkspace && normalizedRoles.includes(activeWorkspace) ? activeWorkspace : getPrimaryPortalRole(normalizedRoles) as WorkspaceKey | null) || 'client';
  const currentWorkspace = workspaceDefinitions[currentWorkspaceKey];
  const visibleNavItems = navItems.filter((item) => item.roles.includes(currentWorkspaceKey));
  const otherWorkspaces = availableWorkspaces.filter((workspace) => workspace.key !== currentWorkspaceKey);

  useEffect(() => {
    if (!user?.id) return;
    let mounted = true;
    const refresh = async () => {
      const { count } = await supabase.from('notifications').select('id', { count: 'exact', head: true }).eq('user_id', user.id).eq('is_read', false).in('notification_type', ['message', 'call']);
      if (mounted) setUnreadMessages(count || 0);
    };
    void refresh();
    const channel = supabase.channel(`avelixa-notification-badge-${user.id}`).on('postgres_changes', { event: '*', schema: 'public', table: 'notifications', filter: `user_id=eq.${user.id}` }, () => void refresh()).subscribe();
    const timer = window.setInterval(() => void refresh(), 5000);
    return () => { mounted = false; window.clearInterval(timer); void supabase.removeChannel(channel); };
  }, [user?.id]);

  function switchWorkspace(workspace: typeof currentWorkspace) {
    if (!normalizedRoles.includes(workspace.key)) return;
    setActiveWorkspace(workspace.key); navigate(workspace.path); setSidebarOpen(false);
  }

  async function handleLogout() { await supabase.auth.signOut(); setSidebarOpen(false); navigate('/login', { replace: true }); }

  const isNavItemActive = (path: string) => path === currentWorkspace.path ? location.pathname === path : location.pathname === path || location.pathname.startsWith(`${path}/`);
  const userInitial = (profile?.full_name || profile?.email || user?.email || 'U').trim().charAt(0).toUpperCase();
  const userAvatar = profile?.avatar_url || '';

  const renderWorkspaceSwitcher = () => {
    if (availableWorkspaces.length <= 1) return null;
    const CurrentIcon = currentWorkspace.icon;
    return <div className="rounded-2xl border border-accent-500/20 bg-accent-500/5 p-4"><div className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-accent-400"><ArrowLeftRight className="w-4 h-4" /> Workspace</div><div className="mt-3 flex items-center gap-3"><div className="w-9 h-9 rounded-xl bg-accent-500/10 border border-accent-500/20 flex items-center justify-center shrink-0"><CurrentIcon className="w-5 h-5 text-accent-400" /></div><div className="min-w-0"><div className="text-sm font-semibold text-white">{currentWorkspace.label} Portal</div><div className="text-xs text-gray-500 mt-0.5">{availableWorkspaces.length} workspaces available</div></div></div><div className="mt-4 space-y-2">{otherWorkspaces.map((workspace) => { const WorkspaceIcon = workspace.icon; return <button key={workspace.key} type="button" onClick={() => switchWorkspace(workspace)} className="w-full inline-flex items-center justify-between gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-xs font-semibold text-gray-300 transition-all hover:border-accent-500/30 hover:bg-accent-500/10 hover:text-accent-300"><span className="inline-flex items-center gap-2"><WorkspaceIcon className="w-4 h-4" /> Switch to {workspace.label}</span><ArrowLeftRight className="w-4 h-4" /></button>; })}</div></div>;
  };

  const renderNav = (mobile = false) => <nav className="space-y-1">{visibleNavItems.map((item) => { const active = isNavItemActive(item.path); return <Link key={`${currentWorkspaceKey}-${item.name}-${item.path}`} to={item.path} onClick={mobile ? () => setSidebarOpen(false) : undefined} className={`flex items-center justify-between gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${active ? 'text-accent-400 bg-accent-500/10 border border-accent-500/10' : 'text-gray-400 hover:text-accent-400 hover:bg-white/5 border border-transparent'}`}><span className="flex min-w-0 items-center gap-3"><item.icon className="w-5 h-5 shrink-0" />{item.name}</span>{item.name === 'Messages' && unreadMessages > 0 && <span className="min-w-5 rounded-full bg-red-500 px-1.5 py-0.5 text-center text-[10px] font-bold leading-4 text-white">{unreadMessages > 99 ? '99+' : unreadMessages}</span>}</Link>; })}</nav>;
  const profileBlock = <div className="flex items-center gap-3 px-4 py-3"><div className="w-10 h-10 rounded-full bg-accent-500/10 border border-accent-500/20 flex items-center justify-center text-accent-400 font-semibold uppercase shrink-0 overflow-hidden">{userAvatar ? <img src={userAvatar} alt="Profile" className="h-full w-full object-cover" /> : userInitial}</div><div className="overflow-hidden min-w-0"><div className="text-sm font-medium text-white truncate">{profile?.full_name || user?.email || 'Avelixa User'}</div><div className="text-[10px] text-accent-500 uppercase tracking-widest truncate mt-0.5">{currentWorkspace.label} Portal</div></div></div>;

  return <div className="min-h-screen bg-ink-950 flex overflow-hidden"><GlobalCallListener /><aside className="hidden md:flex w-64 flex-col border-r border-ink-800/50 bg-ink-950 z-20 shrink-0"><div className="h-20 flex items-center px-6 border-b border-ink-800/50 shrink-0"><Link to={currentWorkspace.path} className="flex items-center gap-3 group"><div className="w-10 h-10 rounded-xl bg-white/[0.03] border border-white/10 flex items-center justify-center overflow-hidden shrink-0"><img src="/logo.avif" alt="Avelixa" className="w-full h-full object-contain" /></div><div><div className="font-medium tracking-tight text-white text-lg">Avelixa</div><div className="text-[9px] uppercase tracking-[0.2em] text-accent-400 mt-0.5">{currentWorkspace.label} Portal</div></div></Link></div><div className="px-4 pt-5">{renderWorkspaceSwitcher()}</div><div className="flex-1 overflow-y-auto py-6 px-4">{renderNav()}</div><div className="p-4 border-t border-ink-800/50">{profileBlock}<button type="button" onClick={handleLogout} className="mt-2 w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-red-400 hover:bg-red-500/10 transition-colors"><LogOut className="w-5 h-5" />Sign out</button></div></aside><main className="flex-1 flex flex-col min-w-0 overflow-hidden relative"><div className="absolute top-0 -left-32 w-[500px] h-[500px] rounded-full bg-accent-500/5 blur-[120px] pointer-events-none" /><div className="absolute bottom-0 -right-40 w-[400px] h-[400px] rounded-full bg-brand-500/5 blur-[120px] pointer-events-none" /><header className="h-20 flex items-center justify-between px-5 border-b border-ink-800/50 md:hidden bg-ink-950/90 backdrop-blur-md z-20 shrink-0"><Link to={currentWorkspace.path} className="flex items-center gap-3"><div className="w-10 h-10 rounded-xl bg-white/[0.03] border border-white/10 flex items-center justify-center overflow-hidden shrink-0"><img src="/logo.avif" alt="Avelixa" className="w-full h-full object-contain" /></div><div><div className="font-medium tracking-tight text-white text-lg">Avelixa</div><div className="text-[10px] uppercase tracking-widest text-accent-400">{currentWorkspace.label} Portal</div></div></Link><button type="button" onClick={() => setSidebarOpen(true)} className="text-white p-2 rounded-xl hover:bg-white/5 transition-colors" aria-label="Open portal menu"><Menu className="w-6 h-6" /></button></header><div className="flex-1 overflow-y-auto p-5 md:p-10 z-10"><div className="max-w-6xl mx-auto"><Outlet key={realtimeRefreshKey} /></div></div></main>{sidebarOpen && <div className="fixed inset-0 z-50 flex md:hidden"><div className="fixed inset-0 bg-ink-950/80 backdrop-blur-sm" onClick={() => setSidebarOpen(false)} /><div className="relative w-72 max-w-[85vw] bg-ink-900 h-full flex flex-col border-r border-ink-800/50 shadow-2xl"><div className="h-20 flex items-center justify-between px-5 border-b border-ink-800/50"><Link to={currentWorkspace.path} onClick={() => setSidebarOpen(false)} className="flex items-center gap-3"><div className="w-9 h-9 rounded-xl bg-white/[0.03] border border-white/10 flex items-center justify-center overflow-hidden shrink-0"><img src="/logo.avif" alt="Avelixa" className="w-full h-full object-contain" /></div><div><div className="font-medium tracking-tight text-white text-lg">Avelixa</div><div className="text-[9px] uppercase tracking-[0.2em] text-accent-400">{currentWorkspace.label} Portal</div></div></Link><button type="button" onClick={() => setSidebarOpen(false)} className="text-gray-400 hover:text-white p-2 rounded-xl hover:bg-white/5 transition-colors" aria-label="Close portal menu"><X className="w-6 h-6" /></button></div><div className="px-4 pt-5">{renderWorkspaceSwitcher()}</div><div className="flex-1 overflow-y-auto py-6 px-4">{renderNav(true)}</div><div className="p-4 border-t border-ink-800/50">{profileBlock}<button type="button" onClick={handleLogout} className="mt-2 w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-red-400 hover:bg-red-500/10 transition-colors"><LogOut className="w-5 h-5" />Sign out</button></div></div></div>}</div>;
}
