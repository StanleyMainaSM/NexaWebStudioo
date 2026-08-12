import { useEffect, useState } from 'react';
import { Loader2, Save, Settings as SettingsIcon, UserCircle2, X } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../lib/auth';

interface ProfileRecord {
  id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
  created_at?: string;
  updated_at?: string;
}

export default function Settings() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<ProfileRecord | null>(null);
  const [formData, setFormData] = useState({ full_name: '', avatar_url: '' });
  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    const currentUserId = user?.id;

    if (!currentUserId) {
      setLoading(false);
      return;
    }

    let isMounted = true;

    async function loadProfile() {
      setLoading(true);
      setError(null);
      setSuccess(null);

      try {
        const { data, error: profileError } = await supabase
          .from('profiles')
          .select('id, email, full_name, avatar_url, created_at, updated_at')
          .eq('id', currentUserId)
          .maybeSingle();

        if (profileError) throw profileError;

        if (!isMounted) return;

        if (data) {
          const profileData = data as ProfileRecord;
          setProfile(profileData);
          setFormData({
            full_name: profileData.full_name ?? '',
            avatar_url: profileData.avatar_url ?? '',
          });
          setEditing(false);
        } else {
          setProfile(null);
          setFormData({ full_name: '', avatar_url: '' });
          setEditing(true);
        }
      } catch  {
        if (isMounted) {
          setError('We could not load your profile information right now.');
          setProfile(null);
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    loadProfile();

    return () => {
      isMounted = false;
    };
  }, [user?.id]);

  const handleChange = (field: 'full_name' | 'avatar_url', value: string) => {
    setFormData((current) => ({ ...current, [field]: value }));
  };

  const resetFromProfile = () => {
    if (profile) {
      setFormData({
        full_name: profile.full_name ?? '',
        avatar_url: profile.avatar_url ?? '',
      });
    } else {
      setFormData({ full_name: '', avatar_url: '' });
    }
    setEditing(false);
    setError(null);
    setSuccess(null);
  };

  const handleSave = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!user?.id) return;

    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      const payload = {
        id: user.id,
        email: user.email ?? profile?.email ?? '',
        full_name: formData.full_name.trim() || null,
        avatar_url: formData.avatar_url.trim() || null,
      };

      const { data, error: saveError } = await supabase
        .from('profiles')
        .upsert(payload, { onConflict: 'id' })
        .select('id, email, full_name, avatar_url, created_at, updated_at')
        .single();

      if (saveError) throw saveError;

      const updatedProfile = data as ProfileRecord;
      setProfile(updatedProfile);
      setFormData({
        full_name: updatedProfile.full_name ?? '',
        avatar_url: updatedProfile.avatar_url ?? '',
      });
      setEditing(false);
      setSuccess('Your profile information has been updated.');
    } catch {
      setError('Your profile could not be saved right now. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="mb-8">
        <h1 className="text-3xl font-semibold text-white">Settings</h1>
        <p className="mt-2 text-gray-400">Manage your Avelixa client profile and account details.</p>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
        <div className="glass rounded-2xl border border-ink-800/50 p-6 sm:p-8">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-accent-500/10">
              <SettingsIcon className="h-6 w-6 text-accent-400" />
            </div>
            <div>
              <h2 className="text-xl font-medium text-white">Profile settings</h2>
              <p className="text-sm text-gray-400">Keep your account details up to date for your portal experience.</p>
            </div>
          </div>

          <div className="mt-6 rounded-2xl border border-ink-800/50 bg-white/[0.03] p-5">
            {loading ? (
              <div className="flex items-center gap-3 text-sm text-gray-300">
                <Loader2 className="h-4 w-4 animate-spin text-accent-500" />
                Loading your profile…
              </div>
            ) : error && !profile ? (
              <div className="space-y-3">
                <p className="text-sm text-gray-300">No profile information is available yet.</p>
                <p className="text-sm text-gray-400">You can create your profile details below using your authenticated account.</p>
              </div>
            ) : (
              <div className="flex items-start gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-accent-500/10 text-accent-400">
                  <UserCircle2 className="h-6 w-6" />
                </div>
                <div className="min-w-0">
                  <div className="text-sm font-medium text-white">{profile?.full_name || 'No display name set'}</div>
                  <div className="mt-1 truncate text-sm text-gray-400">{profile?.email || user?.email || 'No email available'}</div>
                </div>
              </div>
            )}
          </div>

          {success ? <div className="mt-4 rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-300">{success}</div> : null}
          {error ? <div className="mt-4 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-300">{error}</div> : null}

          <form className="mt-6 space-y-5" onSubmit={handleSave}>
            <div className="grid gap-5 md:grid-cols-2">
              <label className="block text-sm">
                <span className="mb-2 block text-gray-300">Full name</span>
                <input
                  type="text"
                  value={formData.full_name}
                  onChange={(event) => handleChange('full_name', event.target.value)}
                  disabled={!editing || saving}
                  className="w-full rounded-xl border border-ink-800/60 bg-white/5 px-4 py-3 text-sm text-white outline-none transition focus:border-accent-500 disabled:cursor-not-allowed disabled:opacity-70"
                  placeholder="Enter your full name"
                />
              </label>

              <label className="block text-sm">
                <span className="mb-2 block text-gray-300">Avatar URL</span>
                <input
                  type="url"
                  value={formData.avatar_url}
                  onChange={(event) => handleChange('avatar_url', event.target.value)}
                  disabled={!editing || saving}
                  className="w-full rounded-xl border border-ink-800/60 bg-white/5 px-4 py-3 text-sm text-white outline-none transition focus:border-accent-500 disabled:cursor-not-allowed disabled:opacity-70"
                  placeholder="https://example.com/avatar.png"
                />
              </label>
            </div>

            <div className="flex flex-wrap gap-3">
              {!editing ? (
                <button
                  type="button"
                  onClick={() => setEditing(true)}
                  className="inline-flex items-center gap-2 rounded-xl bg-accent-600 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-accent-500"
                >
                  Edit profile
                </button>
              ) : (
                <>
                  <button
                    type="submit"
                    disabled={saving}
                    className="inline-flex items-center gap-2 rounded-xl bg-accent-600 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-accent-500 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                    {saving ? 'Saving…' : 'Save changes'}
                  </button>

                  <button
                    type="button"
                    onClick={resetFromProfile}
                    disabled={saving}
                    className="inline-flex items-center gap-2 rounded-xl border border-ink-800/60 bg-white/5 px-4 py-2.5 text-sm font-medium text-gray-300 transition hover:border-accent-500/50 hover:text-white disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    <X className="h-4 w-4" />
                    Cancel
                  </button>
                </>
              )}
            </div>
          </form>
        </div>

        <div className="space-y-6">
          <div className="glass rounded-2xl border border-ink-800/50 p-6">
            <h3 className="text-lg font-medium text-white">Account information</h3>
            <div className="mt-4 space-y-4 text-sm text-gray-300">
              <div>
                <div className="text-xs uppercase tracking-[0.25em] text-ink-500">Signed in as</div>
                <div className="mt-1 text-white">{user?.email || 'No email available'}</div>
              </div>
              <div>
                <div className="text-xs uppercase tracking-[0.25em] text-ink-500">Profile source</div>
                <div className="mt-1 text-white">Your profile is stored in the existing profiles table for this portal account.</div>
              </div>
            </div>
          </div>

          <div className="glass rounded-2xl border border-ink-800/50 p-6">
            <h3 className="text-lg font-medium text-white">Notes</h3>
            <ul className="mt-4 space-y-3 text-sm text-gray-400">
              <li>• Only your own profile can be viewed or updated through this page.</li>
              <li>• Password changes and provider changes are not included in this task.</li>
              <li>• The current schema supports full name and avatar URL, so those are the editable profile fields exposed here.</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
