import { useEffect } from 'react';
import { useAuth } from '../../lib/auth';
import {
  ShieldCheck,
  Link as ConnectorIcon,
  Briefcase,
  UserCircle2,
  ArrowRight,
  Loader2,
  Crown,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import ClientDashboard from './dashboards/ClientDashboard';

export default function PortalHome() {
  const { user, roles, loading, rolesLoading, activeWorkspace } = useAuth();
  const navigate = useNavigate();
  const normalizedRoles = roles.map((role) => String(role).trim().toLowerCase()).filter(Boolean);
  const canAccessOwner = normalizedRoles.includes('owner');
  const canAccessAdmin = normalizedRoles.includes('admin');
  const canAccessConnector = normalizedRoles.includes('connector');
  const canAccessOperator = normalizedRoles.includes('operator');
  const canAccessClient = normalizedRoles.includes('client');
  const workspaceCount = [canAccessOwner, canAccessAdmin, canAccessConnector, canAccessOperator, canAccessClient].filter(Boolean).length;

  useEffect(() => {
    if (loading || rolesLoading || workspaceCount !== 1) return;
    if (canAccessOwner) { navigate('/portal/owner', { replace: true }); return; }
    if (canAccessAdmin) { navigate('/portal/admin', { replace: true }); return; }
    if (canAccessConnector) { navigate('/portal/connector', { replace: true }); return; }
    if (canAccessOperator) { navigate('/portal/operator', { replace: true }); }
  }, [loading, rolesLoading, workspaceCount, canAccessOwner, canAccessAdmin, canAccessConnector, canAccessOperator, navigate]);

  if (loading || rolesLoading) return <div className="min-h-[50vh] flex items-center justify-center"><div className="text-center"><Loader2 className="w-7 h-7 text-accent-500 animate-spin mx-auto mb-4" /><p className="text-gray-400 text-sm">Loading your workspace...</p></div></div>;
  if (workspaceCount === 1 && canAccessClient) return <ClientDashboard />;
  if (workspaceCount > 1 && canAccessClient && activeWorkspace === 'client') return <ClientDashboard />;
  if (workspaceCount === 1) return <div className="min-h-[50vh] flex items-center justify-center"><div className="text-center"><Loader2 className="w-7 h-7 text-accent-500 animate-spin mx-auto mb-4" /><p className="text-gray-400 text-sm">Opening your workspace...</p></div></div>;

  const firstName = user?.user_metadata?.full_name?.split(' ')[0] || user?.email?.split('@')[0] || 'User';
  const workspaceCards = [];
  if (canAccessOwner) workspaceCards.push({ key: 'owner', title: 'Owner Portal', description: 'Full business ownership, oversight, role management, and system control.', icon: Crown, path: '/portal/owner' });
  if (canAccessAdmin) workspaceCards.push({ key: 'admin', title: 'Admin Portal', description: 'Manage clients, projects, team operations, reviews, messages, and Avelixa administration.', icon: ShieldCheck, path: '/portal/admin' });
  if (canAccessConnector) workspaceCards.push({ key: 'connector', title: 'Connector Portal', description: 'Manage your leads, submit new leads, and track your connector activity.', icon: ConnectorIcon, path: '/portal/connector' });
  if (canAccessOperator) workspaceCards.push({ key: 'operator', title: 'Operator Portal', description: 'Access assigned projects, tasks, progress, documents, and communication.', icon: Briefcase, path: '/portal/operator' });
  if (canAccessClient) workspaceCards.push({ key: 'client', title: 'Client Portal', description: 'View your projects, invoices, documents, activity, and account information.', icon: UserCircle2, path: '/portal' });

  return <div className="space-y-10"><div><div className="text-xs font-bold text-accent-500 uppercase tracking-widest mb-2">Workspace Selection</div><h1 className="text-3xl font-light tracking-tight text-white">Welcome back, {firstName}</h1><p className="mt-3 max-w-2xl text-sm leading-6 text-gray-400">Your Avelixa account has access to multiple workspaces. Choose the workspace you want to enter.</p></div><div className={`grid gap-6 ${workspaceCards.length === 1 ? 'max-w-xl' : 'md:grid-cols-2'}`}>{workspaceCards.map((workspace) => { const Icon = workspace.icon; return <button key={workspace.key} type="button" onClick={() => navigate(workspace.path)} className="group text-left rounded-2xl border border-ink-800/50 bg-white/[0.03] p-6 transition-all hover:border-accent-500/40 hover:bg-white/[0.05]"><div className="flex items-start justify-between gap-5"><div className="flex h-12 w-12 items-center justify-center rounded-xl bg-accent-500/10"><Icon className="h-6 w-6 text-accent-400" /></div><ArrowRight className="h-5 w-5 text-gray-600 transition-transform group-hover:translate-x-1 group-hover:text-accent-400" /></div><h2 className="mt-6 text-xl font-medium text-white">{workspace.title}</h2><p className="mt-2 text-sm leading-6 text-gray-400">{workspace.description}</p><div className="mt-6 text-sm font-medium text-accent-400">Enter workspace</div></button>; })}</div>{roles.length > 1 && <div className="rounded-2xl border border-ink-800/50 bg-white/[0.02] p-5"><div className="text-xs uppercase tracking-[0.25em] text-gray-500">Account roles</div><div className="mt-3 flex flex-wrap gap-2">{roles.map((role) => <span key={role} className="rounded-full border border-accent-500/20 bg-accent-500/10 px-3 py-1.5 text-xs font-medium uppercase tracking-wider text-accent-300">{role}</span>)}</div><p className="mt-4 text-sm text-gray-500">Your roles remain active independently. Entering one workspace does not merge its content or permissions with another workspace.</p></div>}</div>;
}
