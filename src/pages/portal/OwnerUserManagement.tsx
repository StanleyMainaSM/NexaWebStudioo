import { useEffect, useState } from 'react';
import { Loader2, LockKeyhole, RefreshCw, UserPlus, UserX, UserCheck, Trash2, X } from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface ManagedUser {
  id: string;
  email: string;
  full_name: string;
  created_at: string | null;
  roles: string[];
  is_active: boolean;
}

type AllowedRole = 'client' | 'operator' | 'connector' | 'admin';
const roles: AllowedRole[] = ['client', 'operator', 'connector', 'admin'];
const OWNER_USER_MANAGEMENT_VERIFICATION_KEY = 'avelixa_owner_user_management_verified_user';
const label = (role: string) => role.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());

export default function OwnerUserManagement() {
  const [verified, setVerified] = useState(false);
  const [password, setPassword] = useState('');
  const [checking, setChecking] = useState(false);
  const [authError, setAuthError] = useState('');
  const [users, setUsers] = useState<ManagedUser[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [selectedRoles, setSelectedRoles] = useState<AllowedRole[]>(['client']);
  const [adding, setAdding] = useState(false);
  const [action, setAction] = useState<string | null>(null);

  const loadUsers = async () => {
    setLoading(true);
    setError('');
    try {
      const [{ data: profiles, error: profileError }, { data: roleRows, error: roleError }] = await Promise.all([
        supabase.from('profiles').select('id,email,full_name,created_at,is_active').order('created_at', { ascending: false }),
        supabase.from('user_roles').select('user_id,role'),
      ]);
      if (profileError) throw profileError;
      if (roleError) throw roleError;

      const roleMap = new Map<string, string[]>();
      (roleRows || []).forEach((row: { user_id: string; role: string }) => {
        roleMap.set(row.user_id, [...(roleMap.get(row.user_id) || []), row.role]);
      });

      setUsers((profiles || []).map((profile: any) => ({
        id: profile.id,
        email: profile.email || '',
        full_name: profile.full_name || '',
        created_at: profile.created_at || null,
        roles: roleMap.get(profile.id) || [],
        is_active: profile.is_active !== false,
      })));
    } catch (loadError: any) {
      console.error('Owner user list error:', loadError);
      setError(`Users could not be loaded: ${loadError?.message || 'Database query failed.'}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT' || !session?.user?.id) {
        setVerified(false);
        setUsers([]);
        setPassword('');
        sessionStorage.removeItem(OWNER_USER_MANAGEMENT_VERIFICATION_KEY);
        return;
      }

      const verifiedUserId = sessionStorage.getItem(OWNER_USER_MANAGEMENT_VERIFICATION_KEY);
      if (verifiedUserId !== session.user.id) {
        sessionStorage.removeItem(OWNER_USER_MANAGEMENT_VERIFICATION_KEY);
        setVerified(false);
      }
    });
    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    let mounted = true;
    const restoreVerification = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!mounted || !user?.id) return;
      const verifiedUserId = sessionStorage.getItem(OWNER_USER_MANAGEMENT_VERIFICATION_KEY);
      setVerified(verifiedUserId === user.id);
      if (verifiedUserId !== user.id) sessionStorage.removeItem(OWNER_USER_MANAGEMENT_VERIFICATION_KEY);
    };
    void restoreVerification();
    return () => { mounted = false; };
  }, []);

  useEffect(() => {
    if (verified) void loadUsers();
  }, [verified]);

  const verify = async (event: React.FormEvent) => {
    event.preventDefault();
    setChecking(true);
    setAuthError('');
    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user?.email || !user.id) {
        throw new Error('Your current session could not be verified. Please sign in again.');
      }

      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: user.email,
        password,
      });
      if (signInError) {
        throw new Error('The password is incorrect. Please enter your current Owner password.');
      }

      sessionStorage.setItem(OWNER_USER_MANAGEMENT_VERIFICATION_KEY, user.id);
      setPassword('');
      setVerified(true);
    } catch (verificationError: unknown) {
      console.error('Owner User Management verification error:', verificationError);
      setAuthError(
        verificationError instanceof Error
          ? verificationError.message
          : 'Owner User Management verification failed.'
      );
    } finally {
      setChecking(false);
    }
  };

  const getToken = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.access_token) throw new Error('Your session has expired. Please sign in again.');
    return session.access_token;
  };

  const toggleRole = (role: AllowedRole) => {
    setSelectedRoles((current) => current.includes(role) ? current.filter((item) => item !== role) : [...current, role]);
  };

  const addUser = async (event: React.FormEvent) => {
    event.preventDefault();
    setAdding(true);
    setError('');
    setSuccess('');
    try {
      if (selectedRoles.length === 0) throw new Error('Select at least one role.');
      const token = await getToken();
      const primaryRole = selectedRoles[0];
      const response = await fetch('/api/owner/users', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ fullName: fullName.trim(), email: email.trim(), role: primaryRole }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Failed to create user.');

      const createdUserId = result.userId as string | undefined;
      if (createdUserId && selectedRoles.length > 1) {
        for (const role of selectedRoles.slice(1)) {
          const roleResponse = await fetch(`/api/owner/users/${createdUserId}/roles`, {
            method: 'POST',
            headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ role }),
          });
          const roleResult = await roleResponse.json();
          if (!roleResponse.ok) throw new Error(roleResult.error || `Failed to add ${label(role)} role.`);
        }
      }

      setFullName('');
      setEmail('');
      setSelectedRoles(['client']);
      setSuccess(result.message || 'User created successfully.');
      await loadUsers();
    } catch (addError: any) {
      console.error('Owner user creation error:', addError);
      setError(`User could not be created: ${addError?.message || 'Unexpected error.'}`);
    } finally {
      setAdding(false);
    }
  };

  const changeRole = async (user: ManagedUser, role: AllowedRole, remove = false) => {
    setAction(user.id);
    setError('');
    setSuccess('');
    try {
      const token = await getToken();
      const url = remove ? `/api/owner/users/${user.id}/roles/${role}` : `/api/owner/users/${user.id}/roles`;
      const response = await fetch(url, {
        method: remove ? 'DELETE' : 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        ...(remove ? {} : { body: JSON.stringify({ role }) }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Role update failed.');
      setSuccess(result.message || 'Role updated successfully.');
      await loadUsers();
    } catch (roleError: any) {
      console.error('Owner role update error:', roleError);
      setError(`Role could not be updated: ${roleError?.message || 'Unexpected error.'}`);
    } finally {
      setAction(null);
    }
  };

  const handleDeleteUser = async (user: ManagedUser) => {
    const confirmed = window.confirm(
      `Permanent Account Removal\n\n${user.full_name || user.email}'s account will be permanently removed.\n\nThis is NOT Deactivate and it is not Remove Role. Reactivate cannot restore a permanently removed account. This cannot be undone through Owner User Management. Historical/business records are not intentionally erased where they can be safely preserved. If this person returns as a Connector, they must apply and go through Connector onboarding again.\n\nContinue with permanent account removal?`
    );
    if (!confirmed) return;

    setAction(user.id);
    setError('');
    setSuccess('');
    try {
      const token = await getToken();
      const response = await fetch(`/api/owner/users/${user.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Permanent account removal failed.');
      setUsers((current) => current.filter((item) => item.id !== user.id));
      setSuccess(result.message || `${user.full_name || user.email} was permanently removed.`);
    } catch (deleteError: any) {
      console.error('Owner permanent account removal error:', deleteError);
      setError(`Account could not be permanently removed: ${deleteError?.message || 'Unexpected error.'}`);
    } finally {
      setAction(null);
    }
  };

  const setMemberActive = async (user: ManagedUser, active: boolean) => {
    setAction(user.id);
    setError('');
    setSuccess('');
    try {
      const { error: functionError } = await supabase.functions.invoke('avelixa-owner-member-status-prod', {
        body: { userId: user.id, active },
      });
      if (functionError) throw functionError;
      setSuccess(active ? `${user.full_name || user.email} has been reactivated.` : `${user.full_name || user.email} has been deactivated.`);
      await loadUsers();
    } catch (statusError: any) {
      console.error('Owner member status error:', statusError);
      setError(`Member status could not be changed: ${statusError?.message || 'Unexpected error.'}`);
    } finally {
      setAction(null);
    }
  };

  if (!verified) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center">
        <form onSubmit={verify} className="w-full max-w-md rounded-3xl border border-purple-500/20 bg-ink-950/80 p-8">
          <div className="w-14 h-14 rounded-2xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center">
            <LockKeyhole className="w-7 h-7 text-purple-300" />
          </div>
          <h1 className="mt-6 text-2xl font-bold text-white">Owner Verification Required</h1>
          <p className="mt-2 text-sm text-gray-400">Enter your current Owner account password to manage users.</p>
          {authError && <div className="mt-5 rounded-xl border border-red-500/20 bg-red-500/10 p-3 text-sm text-red-300">{authError}</div>}
          <input type="password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Enter your login password" autoComplete="current-password" className="mt-5 w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none" required />
          <button disabled={checking} className="mt-4 w-full rounded-xl bg-accent-600 px-4 py-3 font-semibold text-white disabled:opacity-50">{checking ? 'Verifying...' : 'Verify Owner Access'}</button>
        </form>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between gap-4">
        <div>
          <div className="text-xs font-bold uppercase tracking-widest text-accent-400">Owner Controls</div>
          <h1 className="mt-2 text-3xl font-semibold text-white">User Management</h1>
          <p className="mt-2 text-sm text-gray-400">Add members, assign supported roles, remove roles, reversibly deactivate accounts, or permanently remove eligible accounts.</p>
        </div>
        <button onClick={() => void loadUsers()} disabled={loading} className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-gray-200">
          <RefreshCw className={loading ? 'w-4 h-4 animate-spin' : 'w-4 h-4'} />Refresh
        </button>
      </div>

      {error && <div className="rounded-xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-300">{error}</div>}
      {success && <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-4 text-sm text-emerald-300">{success}</div>}

      <form onSubmit={addUser} className="rounded-2xl border border-white/10 bg-white/[0.03] p-6">
        <div className="flex items-center gap-2 text-white font-semibold"><UserPlus className="w-5 h-5 text-accent-400" />Add Member</div>
        <div className="mt-4 grid md:grid-cols-3 gap-3">
          <input required value={fullName} onChange={(event) => setFullName(event.target.value)} placeholder="Full name" className="rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-white" />
          <input required type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="Email" className="rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-white" />
          <button disabled={adding} className="rounded-xl bg-accent-600 px-4 py-2.5 font-semibold text-white disabled:opacity-50">{adding ? 'Creating...' : 'Create & Invite Member'}</button>
        </div>
        <div className="mt-4">
          <div className="text-xs font-semibold uppercase tracking-widest text-gray-500 mb-2">Roles</div>
          <div className="flex flex-wrap gap-2">
            {roles.map((role) => (
              <label key={role} className={`inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-sm cursor-pointer ${selectedRoles.includes(role) ? 'border-accent-400/40 bg-accent-500/10 text-accent-200' : 'border-white/10 bg-white/5 text-gray-400'}`}>
                <input type="checkbox" checked={selectedRoles.includes(role)} onChange={() => toggleRole(role)} className="accent-accent-500" />
                {label(role)}
              </label>
            ))}
          </div>
          <p className="mt-2 text-xs text-gray-500">Owner is intentionally unavailable here. New members receive a secure invitation and set their own password.</p>
        </div>
      </form>

      <div className="space-y-3">
        {loading && !users.length ? (
          <div className="flex justify-center p-12"><Loader2 className="w-7 h-7 animate-spin text-accent-400" /></div>
        ) : users.length ? users.map((user) => (
          <div key={user.id} className={`rounded-2xl border p-5 ${user.is_active ? 'border-white/10 bg-white/[0.03]' : 'border-red-500/20 bg-red-500/[0.04]'}`}>
            <div className="flex flex-col xl:flex-row xl:items-center xl:justify-between gap-5">
              <div>
                <div className="flex items-center gap-3">
                  <div>
                    <div className="font-semibold text-white">{user.full_name || 'Unnamed user'}</div>
                    <div className="text-sm text-gray-400">{user.email}</div>
                  </div>
                  <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${user.is_active ? 'bg-emerald-500/10 text-emerald-300' : 'bg-red-500/10 text-red-300'}`}>{user.is_active ? 'Active' : 'Deactivated'}</span>
                </div>
                <div className="mt-3 flex flex-wrap gap-2">{user.roles.map((role) => <span key={role} className="rounded-full bg-accent-500/10 px-2.5 py-1 text-xs text-accent-200">{label(role)}</span>)}</div>
              </div>
              <div className="flex flex-wrap gap-2">
                {user.is_active ? (
                  <button onClick={() => void setMemberActive(user, false)} disabled={action === user.id} className="inline-flex items-center gap-2 rounded-xl border border-amber-500/20 bg-amber-500/10 px-3 py-2 text-sm text-amber-300 disabled:opacity-50"><UserX className="w-4 h-4" />Deactivate</button>
                ) : (
                  <button onClick={() => void setMemberActive(user, true)} disabled={action === user.id} className="inline-flex items-center gap-2 rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-300 disabled:opacity-50"><UserCheck className="w-4 h-4" />Reactivate</button>
                )}
                {roles.map((role) => user.roles.includes(role) ? (
                  <button key={role} onClick={() => void changeRole(user, role, true)} disabled={action === user.id} aria-label={`Remove ${label(role)} role`} className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-gray-300 disabled:opacity-50"><X className="w-4 h-4" />Remove {label(role)}</button>
                ) : (
                  <button key={role} onClick={() => void changeRole(user, role)} disabled={action === user.id} aria-label={`Add ${label(role)} role`} className="inline-flex items-center gap-2 rounded-xl border border-accent-500/20 bg-accent-500/10 px-3 py-2 text-sm text-accent-200 disabled:opacity-50">Add {label(role)}</button>
                ))}
                <button onClick={() => void handleDeleteUser(user)} disabled={action === user.id} className="inline-flex items-center gap-2 rounded-xl border border-red-500/20 bg-red-500/10 px-3 py-2 text-sm text-red-300 disabled:opacity-50"><Trash2 className="w-4 h-4" />Permanent Remove</button>
              </div>
            </div>
          </div>
        )) : (
          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-10 text-center text-sm text-gray-400">No managed users found.</div>
        )}
      </div>
    </div>
  );
}
