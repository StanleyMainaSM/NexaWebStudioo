import { useEffect, useMemo, useState } from 'react';
import { supabase } from '../../../lib/supabase';
import {
  AlertTriangle,
  CheckCircle2,
  Loader2,
  Mail,
  Plus,
  RefreshCw,
  ShieldCheck,
  UserPlus,
  Users,
  X,
  LockKeyhole,
  Eye,
  EyeOff,
  UserX,
  UserCheck,
} from 'lucide-react';

interface ManagedUser {
  id: string;
  email: string;
  full_name: string;
  created_at: string | null;
  last_sign_in_at: string | null;
  email_confirmed: boolean;
  roles: string[];
  is_active: boolean;
}

type AllowedRole = 'client' | 'operator' | 'connector' | 'admin';

const ALLOWED_ROLES: AllowedRole[] = ['client', 'operator', 'connector', 'admin'];

function roleLabel(role: string) {
  return role.replace(/_/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase());
}

function roleTone(role: string) {
  switch (role) {
    case 'owner': return 'border-purple-500/20 bg-purple-500/10 text-purple-300';
    case 'admin': return 'border-red-500/20 bg-red-500/10 text-red-300';
    case 'connector': return 'border-blue-500/20 bg-blue-500/10 text-blue-300';
    case 'operator': return 'border-amber-500/20 bg-amber-500/10 text-amber-300';
    case 'client': return 'border-emerald-500/20 bg-emerald-500/10 text-emerald-300';
    default: return 'border-ink-700 bg-white/5 text-gray-400';
  }
}

function getErrorMessage(error: unknown) {
  if (!error) return 'Unknown error.';
  if (typeof error === 'object' && error !== null) {
    const value = error as { message?: string; details?: string; hint?: string; code?: string };
    const parts = [value.message, value.details, value.hint ? `Hint: ${value.hint}` : undefined, value.code ? `Code: ${value.code}` : undefined].filter(Boolean);
    if (parts.length) return parts.join(' • ');
  }
  return String(error);
}

async function getAccessToken() {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.access_token) throw new Error('Your session has expired. Please sign in again.');
  return session.access_token;
}

export default function OwnerUserManagementV2() {
  const [checkingSession, setCheckingSession] = useState(true);
  const [authenticated, setAuthenticated] = useState(false);
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [verifyingPassword, setVerifyingPassword] = useState(false);
  const [users, setUsers] = useState<ManagedUser[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [showAddUser, setShowAddUser] = useState(false);
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [selectedRoles, setSelectedRoles] = useState<AllowedRole[]>(['client']);
  const [savingUser, setSavingUser] = useState(false);
  const [actionUserId, setActionUserId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!mounted) return;
        if (!session?.user?.email) setError('Your session has expired. Please sign in again.');
        else setAuthenticated(false);
      } catch (err) {
        if (mounted) setError(`Unable to verify your session: ${getErrorMessage(err)}`);
      } finally {
        if (mounted) setCheckingSession(false);
      }
    })();
    return () => { mounted = false; };
  }, []);

  const loadUsers = async (showSpinner = true) => {
    if (showSpinner) setLoadingUsers(true);
    setError(null);
    try {
      const token = await getAccessToken();
      const response = await fetch('/api/owner/users', {
        headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Failed to load users.');

      const { data: profiles, error: profileError } = await supabase
        .from('profiles')
        .select('id,is_active');
      if (profileError) throw profileError;

      const activeMap = new Map<string, boolean>((profiles || []).map((profile) => [profile.id, profile.is_active !== false]));
      setUsers((result.users || []).map((user: Omit<ManagedUser, 'is_active'>) => ({
        ...user,
        is_active: activeMap.get(user.id) ?? true,
      })));
    } catch (err) {
      console.error('Owner users could not be loaded:', err);
      setError(`Users could not be loaded: ${getErrorMessage(err)}`);
    } finally {
      setLoadingUsers(false);
      setRefreshing(false);
    }
  };

  const verifyOwnerPassword = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!password.trim()) { setError('Please enter your password.'); return; }
    setVerifyingPassword(true); setError(null); setSuccess(null);
    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user?.email) throw new Error('Your current session could not be verified. Please sign in again.');
      const { error: signInError } = await supabase.auth.signInWithPassword({ email: user.email, password });
      if (signInError) throw new Error('The password is incorrect. Please enter the password you used to sign in.');
      setPassword(''); setAuthenticated(true); await loadUsers();
    } catch (err) {
      console.error('Owner user-management re-authentication failed:', err);
      setError(getErrorMessage(err));
    } finally { setVerifyingPassword(false); }
  };

  const toggleRole = (value: AllowedRole) => {
    setSelectedRoles((current) => current.includes(value) ? current.filter((role) => role !== value) : [...current, value]);
  };

  const handleAddUser = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!fullName.trim()) { setError("Please enter the user's full name."); return; }
    if (!email.trim()) { setError("Please enter the user's email address."); return; }
    if (!selectedRoles.length) { setError('Select at least one role.'); return; }
    setSavingUser(true); setError(null); setSuccess(null);
    try {
      const token = await getAccessToken();
      const response = await fetch('/api/owner/users', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({ fullName: fullName.trim(), email: email.trim(), role: selectedRoles[0] }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Failed to create user.');

      const userId = result.userId as string;
      for (const additionalRole of selectedRoles.slice(1)) {
        const roleResponse = await fetch(`/api/owner/users/${userId}/roles`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', Accept: 'application/json' },
          body: JSON.stringify({ role: additionalRole }),
        });
        const roleResult = await roleResponse.json();
        if (!roleResponse.ok) throw new Error(roleResult.error || `Failed to add ${roleLabel(additionalRole)} role.`);
      }

      setSuccess(`${result.message || 'User created successfully.'}${selectedRoles.length > 1 ? ` Roles assigned: ${selectedRoles.map(roleLabel).join(', ')}.` : ''}`);
      setFullName(''); setEmail(''); setSelectedRoles(['client']); setShowAddUser(false);
      await loadUsers(false);
    } catch (err) {
      console.error('Owner user creation failed:', err);
      setError(`User could not be created: ${getErrorMessage(err)}`);
    } finally { setSavingUser(false); }
  };

  const handleAddRole = async (userId: string, selectedRole: AllowedRole) => {
    setActionUserId(userId); setError(null); setSuccess(null);
    try {
      const token = await getAccessToken();
      const response = await fetch(`/api/owner/users/${userId}/roles`, {
        method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({ role: selectedRole }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Failed to add role.');
      setSuccess(result.message || 'Role added successfully.');
      await loadUsers(false);
    } catch (err) { setError(`Role could not be added: ${getErrorMessage(err)}`); }
    finally { setActionUserId(null); }
  };

  const handleRemoveRole = async (user: ManagedUser, selectedRole: string) => {
    if (selectedRole === 'owner') return;
    if (!window.confirm(`Remove the ${roleLabel(selectedRole)} role from ${user.full_name || user.email}?`)) return;
    setActionUserId(user.id); setError(null); setSuccess(null);
    try {
      const token = await getAccessToken();
      const response = await fetch(`/api/owner/users/${user.id}/roles/${selectedRole}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' } });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Failed to remove role.');
      setSuccess(result.message || 'Role removed successfully.');
      await loadUsers(false);
    } catch (err) { setError(`Role could not be removed: ${getErrorMessage(err)}`); }
    finally { setActionUserId(null); }
  };

  const handleMemberStatus = async (user: ManagedUser, active: boolean) => {
    if (!active && user.roles.includes('owner')) return;
    if (!active && !window.confirm(`Deactivate ${user.full_name || user.email}? They will lose portal access but their account and roles will be preserved.`)) return;
    if (active && !window.confirm(`Reactivate ${user.full_name || user.email}? Their existing roles will remain in place.`)) return;
    setActionUserId(user.id); setError(null); setSuccess(null);
    try {
      const { data, error: invokeError } = await supabase.functions.invoke('avelixa-owner-member-status-prod', { body: { userId: user.id, active } });
      if (invokeError) throw invokeError;
      if (!data?.success) throw new Error(data?.error || 'Member status could not be updated.');
      setSuccess(data.message || (active ? 'User account reactivated successfully.' : 'User account deactivated successfully.'));
      await loadUsers(false);
    } catch (err) { setError(`Member status could not be changed: ${getErrorMessage(err)}`); }
    finally { setActionUserId(null); }
  };

  const counts = useMemo(() => ({
    clients: users.filter((user) => user.roles.includes('client')).length,
    operators: users.filter((user) => user.roles.includes('operator')).length,
    connectors: users.filter((user) => user.roles.includes('connector')).length,
    admins: users.filter((user) => user.roles.includes('admin')).length,
  }), [users]);

  if (checkingSession) return <div className="flex min-h-[500px] items-center justify-center"><div className="flex items-center gap-3 text-sm text-gray-400"><Loader2 className="h-5 w-5 animate-spin text-accent-500" />Verifying your session...</div></div>;

  if (!authenticated) return (
    <div className="mx-auto flex min-h-[650px] max-w-xl items-center justify-center">
      <div className="w-full rounded-3xl border border-purple-500/20 bg-ink-950/80 p-8 shadow-2xl">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl border border-purple-500/20 bg-purple-500/10"><LockKeyhole className="h-8 w-8 text-purple-300" /></div>
        <div className="mt-6 text-center"><h1 className="text-2xl font-bold text-white">Secure User Management</h1><p className="mx-auto mt-3 max-w-md text-sm leading-6 text-gray-400">Re-enter your Owner password before using account and access controls.</p></div>
        {error && <div className="mt-6 flex items-start gap-3 rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm leading-6 text-red-300"><AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" /><span>{error}</span></div>}
        <form onSubmit={verifyOwnerPassword} className="mt-8 space-y-5">
          <div><label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-gray-500">Owner Password</label><div className="relative"><input type={showPassword ? 'text' : 'password'} value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Enter your login password" disabled={verifyingPassword} autoFocus className="w-full rounded-xl border border-ink-800/60 bg-white/5 px-4 py-3 pr-12 text-sm text-white outline-none placeholder:text-gray-700 focus:border-purple-500/40" /><button type="button" onClick={() => setShowPassword((current) => !current)} disabled={verifyingPassword} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white" aria-label={showPassword ? 'Hide password' : 'Show password'}>{showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}</button></div></div>
          <div className="rounded-xl border border-purple-500/10 bg-purple-500/5 p-4"><div className="flex items-start gap-3"><ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-purple-300" /><p className="text-xs leading-5 text-gray-400">The password is used only for Supabase re-authentication and is never sent to the Avelixa server or stored by this page.</p></div></div>
          <button type="submit" disabled={verifyingPassword || !password} className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-purple-600 px-5 py-3 text-sm font-semibold text-white hover:bg-purple-500 disabled:cursor-not-allowed disabled:opacity-50">{verifyingPassword ? <><Loader2 className="h-4 w-4 animate-spin" />Verifying...</> : <><LockKeyhole className="h-4 w-4" />Verify & Continue</>}</button>
        </form>
      </div>
    </div>
  );

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between"><div className="flex items-center gap-3"><div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-purple-500/20 bg-purple-500/10"><ShieldCheck className="h-6 w-6 text-purple-300" /></div><div><h1 className="text-2xl font-bold text-white">User Management</h1><p className="mt-1 text-sm text-gray-400">Manage Avelixa members, roles, and reversible account access.</p></div></div><div className="flex items-center gap-3"><button type="button" onClick={() => { setRefreshing(true); loadUsers(false); }} disabled={refreshing} className="inline-flex items-center gap-2 rounded-xl border border-ink-800/50 bg-white/5 px-4 py-2.5 text-sm font-medium text-gray-300 hover:bg-white/10 hover:text-white disabled:opacity-50"><RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />Refresh</button><button type="button" onClick={() => setShowAddUser(true)} className="inline-flex items-center gap-2 rounded-xl bg-accent-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-accent-500"><UserPlus className="h-4 w-4" />Add Member</button></div></div>

      <div className="flex items-center gap-3 rounded-2xl border border-emerald-500/20 bg-emerald-500/5 px-5 py-4"><CheckCircle2 className="h-5 w-5 text-emerald-400" /><div><div className="text-sm font-semibold text-white">Security verification complete</div><div className="mt-1 text-xs text-gray-500">Owner re-authentication completed for this session.</div></div></div>
      {error && <div className="flex items-start gap-3 rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm leading-6 text-red-300"><AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" /><span>{error}</span></div>}
      {success && <div className="flex items-start gap-3 rounded-2xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-sm leading-6 text-emerald-300"><CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" /><span>{success}</span></div>}

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">{[['Clients', counts.clients, 'emerald'], ['Operators', counts.operators, 'amber'], ['Connectors', counts.connectors, 'blue'], ['Admins', counts.admins, 'red']].map(([label, count, tone]) => <div key={label as string} className={`rounded-2xl border border-${tone}-500/10 bg-${tone}-500/5 p-5`}><div className="text-xs uppercase tracking-widest text-gray-500">{label}</div><div className="mt-2 text-2xl font-semibold text-white">{count}</div></div>)}</div>

      <section className="overflow-hidden rounded-2xl border border-ink-800/50 bg-ink-950/70"><div className="flex flex-col gap-4 border-b border-ink-800/50 p-6 lg:flex-row lg:items-center lg:justify-between"><div><div className="flex items-center gap-3"><Users className="h-5 w-5 text-accent-500" /><h2 className="text-lg font-semibold text-white">All Members</h2></div><p className="mt-2 text-sm text-gray-500">Add members, assign or remove roles, and deactivate or reactivate access. Owner accounts are protected.</p></div><button type="button" onClick={() => setShowAddUser(true)} className="inline-flex items-center justify-center gap-2 rounded-xl border border-accent-500/20 bg-accent-500/10 px-4 py-2.5 text-sm font-semibold text-accent-300 hover:bg-accent-500/20"><Plus className="h-4 w-4" />Add Member</button></div>
        {loadingUsers ? <div className="flex min-h-[260px] items-center justify-center"><div className="flex items-center gap-3 text-sm text-gray-400"><Loader2 className="h-5 w-5 animate-spin text-accent-500" />Loading members...</div></div> : users.length === 0 ? <div className="p-10 text-center"><Users className="mx-auto h-8 w-8 text-gray-600" /><p className="mt-3 text-sm text-gray-400">No users found.</p></div> : <div className="overflow-x-auto"><table className="w-full min-w-[1100px]"><thead><tr className="border-b border-ink-800/50 text-left"><th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-gray-600">Member</th><th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-gray-600">Roles</th><th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-gray-600">Status</th><th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-gray-600">Verification</th><th className="px-6 py-4 text-right text-[10px] font-bold uppercase tracking-widest text-gray-600">Actions</th></tr></thead><tbody>{users.map((user) => { const isOwner = user.roles.includes('owner'); const isBusy = actionUserId === user.id; const availableToAdd = ALLOWED_ROLES.filter((candidate) => !user.roles.includes(candidate)); return <tr key={user.id} className="border-b border-ink-800/30 last:border-0 hover:bg-white/[0.02]"><td className="px-6 py-5"><div className="flex items-center gap-3"><div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-accent-500/20 bg-accent-500/10"><Users className="h-4 w-4 text-accent-400" /></div><div className="min-w-0"><div className="truncate text-sm font-medium text-white">{user.full_name || 'Unnamed user'}</div><div className="mt-1 flex items-center gap-1.5 text-xs text-gray-500"><Mail className="h-3 w-3" />{user.email}</div></div></div></td><td className="px-6 py-5"><div className="flex max-w-[340px] flex-wrap gap-2">{user.roles.length ? user.roles.map((userRole) => <span key={userRole} className={`inline-flex items-center rounded-full border px-2.5 py-1 text-[9px] font-bold uppercase tracking-wider ${roleTone(userRole)}`}>{roleLabel(userRole)}</span>) : <span className="text-xs text-gray-600">No roles</span>}</div></td><td className="px-6 py-5">{isOwner ? <span className="inline-flex items-center gap-1.5 text-xs text-purple-300"><ShieldCheck className="h-3.5 w-3.5" />Protected Owner</span> : user.is_active ? <span className="inline-flex items-center gap-1.5 text-xs text-emerald-400"><UserCheck className="h-3.5 w-3.5" />Active</span> : <span className="inline-flex items-center gap-1.5 text-xs text-red-400"><UserX className="h-3.5 w-3.5" />Inactive</span>}</td><td className="px-6 py-5">{user.email_confirmed ? <span className="inline-flex items-center gap-1.5 text-xs text-emerald-400"><CheckCircle2 className="h-3.5 w-3.5" />Verified</span> : <span className="inline-flex items-center gap-1.5 text-xs text-amber-400"><Mail className="h-3.5 w-3.5" />Pending</span>}</td><td className="px-6 py-5"><div className="flex items-center justify-end gap-2">{!isOwner && <><select defaultValue="" disabled={isBusy || !user.is_active} onChange={(event) => { const value = event.target.value as AllowedRole; event.currentTarget.value = ''; if (value) handleAddRole(user.id, value); }} className="rounded-xl border border-ink-800/60 bg-white/5 px-3 py-2 text-xs text-gray-300 outline-none focus:border-accent-500/40"><option value="" className="bg-ink-950">Add role</option>{availableToAdd.map((candidate) => <option key={candidate} value={candidate} className="bg-ink-950">{roleLabel(candidate)}</option>)}</select><select defaultValue="" disabled={isBusy} onChange={(event) => { const value = event.target.value; event.currentTarget.value = ''; if (value) handleRemoveRole(user, value); }} className="rounded-xl border border-ink-800/60 bg-white/5 px-3 py-2 text-xs text-gray-300 outline-none focus:border-accent-500/40"><option value="" className="bg-ink-950">Remove role</option>{user.roles.filter((userRole) => userRole !== 'owner').map((userRole) => <option key={userRole} value={userRole} className="bg-ink-950">{roleLabel(userRole)}</option>)}</select><button type="button" disabled={isBusy} onClick={() => handleMemberStatus(user, !user.is_active)} title={user.is_active ? 'Deactivate member' : 'Reactivate member'} className={`inline-flex h-9 items-center justify-center gap-1.5 rounded-xl border px-3 text-xs font-semibold disabled:opacity-50 ${user.is_active ? 'border-red-500/20 bg-red-500/5 text-red-400 hover:bg-red-500/10' : 'border-emerald-500/20 bg-emerald-500/5 text-emerald-400 hover:bg-emerald-500/10'}`}>{isBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : user.is_active ? <UserX className="h-4 w-4" /> : <UserCheck className="h-4 w-4" />}{user.is_active ? 'Deactivate' : 'Reactivate'}</button></>}{isOwner && <span className="text-xs text-purple-300">Owner controls protected</span>}</div></td></tr>; })}</tbody></table></div>}
      </section>

      {showAddUser && <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"><div className="w-full max-w-lg rounded-2xl border border-ink-800/60 bg-ink-950 p-6 shadow-2xl"><div className="flex items-start justify-between gap-4"><div><div className="flex items-center gap-3"><div className="flex h-10 w-10 items-center justify-center rounded-xl border border-accent-500/20 bg-accent-500/10"><UserPlus className="h-5 w-5 text-accent-400" /></div><div><h2 className="text-lg font-semibold text-white">Add Member</h2><p className="mt-1 text-xs text-gray-500">Create a secure invited account with one or more supported roles.</p></div></div></div><button type="button" onClick={() => setShowAddUser(false)} className="inline-flex h-9 w-9 items-center justify-center rounded-xl text-gray-500 hover:bg-white/5 hover:text-white"><X className="h-4 w-4" /></button></div><form onSubmit={handleAddUser} className="mt-6 space-y-5"><div><label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-gray-500">Full Name</label><input value={fullName} onChange={(event) => setFullName(event.target.value)} disabled={savingUser} className="w-full rounded-xl border border-ink-800/60 bg-white/5 px-4 py-3 text-sm text-white outline-none focus:border-accent-500/40" /></div><div><label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-gray-500">Email</label><input type="email" value={email} onChange={(event) => setEmail(event.target.value)} disabled={savingUser} className="w-full rounded-xl border border-ink-800/60 bg-white/5 px-4 py-3 text-sm text-white outline-none focus:border-accent-500/40" /></div><div><label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-gray-500">Roles</label><div className="grid grid-cols-2 gap-2">{ALLOWED_ROLES.map((candidate) => <label key={candidate} className="flex cursor-pointer items-center gap-3 rounded-xl border border-ink-800/60 bg-white/5 px-4 py-3 text-sm text-gray-300"><input type="checkbox" checked={selectedRoles.includes(candidate)} onChange={() => toggleRole(candidate)} disabled={savingUser} />{roleLabel(candidate)}</label>)}</div><p className="mt-2 text-xs text-gray-600">Owner is intentionally unavailable here.</p></div><div className="rounded-xl border border-accent-500/10 bg-accent-500/5 p-4"><div className="flex items-start gap-3"><Mail className="mt-0.5 h-5 w-5 text-accent-300" /><p className="text-xs leading-5 text-gray-400">The member receives an invitation to set their own password. Avelixa never sends a plaintext password.</p></div></div><div className="flex justify-end gap-3"><button type="button" onClick={() => setShowAddUser(false)} disabled={savingUser} className="rounded-xl border border-ink-800/60 bg-white/5 px-4 py-2.5 text-sm text-gray-300 hover:bg-white/10">Cancel</button><button type="submit" disabled={savingUser || !selectedRoles.length} className="inline-flex items-center gap-2 rounded-xl bg-accent-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-accent-500 disabled:opacity-50">{savingUser ? <><Loader2 className="h-4 w-4 animate-spin" />Creating...</> : <><UserPlus className="h-4 w-4" />Create & Invite</>}</button></div></form></div></div>}
    </div>
  );
}
