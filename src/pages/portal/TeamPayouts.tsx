import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import {
  Wallet,
  RefreshCw,
  Plus,
  CheckCircle2,
  Clock3,
  XCircle,
} from 'lucide-react';

type TeamMember = {
  id: string;
  email: string;
  full_name: string | null;
  roles: string[];
};

type Payout = {
  id: string;
  recipient_id: string;
  recipient_role: string;
  amount: number;
  payout_type: string;
  status: string;
  notes: string | null;
  paid_at: string | null;
  created_at: string;
  profile?: {
    email: string;
    full_name: string | null;
  } | null;
};

export default function TeamPayouts() {
  const [payouts, setPayouts] = useState<Payout[]>([]);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);

  const [loading, setLoading] = useState(true);
  const [membersLoading, setMembersLoading] = useState(true);
  const [error, setError] = useState('');

  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);

  const [recipientId, setRecipientId] = useState('');
  const [recipientRole, setRecipientRole] = useState('connector');
  const [amount, setAmount] = useState('');
  const [payoutType, setPayoutType] = useState('connector_commission');
  const [notes, setNotes] = useState('');

  const loadTeamMembers = async () => {
    setMembersLoading(true);

    try {
      const { data: profiles, error: profilesError } =
        await supabase
          .from('profiles')
          .select('id,email,full_name')
          .order('created_at', { ascending: false });

      if (profilesError) {
        throw profilesError;
      }

      const { data: roles, error: rolesError } =
        await supabase
          .from('user_roles')
          .select('user_id,role');

      if (rolesError) {
        throw rolesError;
      }

      const result: TeamMember[] = (profiles || [])
        .map((profile) => {
          const memberRoles = (roles || [])
            .filter(
              (item) => item.user_id === profile.id
            )
            .map((item) => item.role);

          return {
            id: profile.id,
            email: profile.email,
            full_name: profile.full_name,
            roles: memberRoles,
          };
        })
        .filter((member) =>
          member.roles.some((role) =>
            [
              'connector',
              'operator',
              'admin',
              'owner',
            ].includes(role.toLowerCase())
          )
        );

      setTeamMembers(result);
    } catch (err: any) {
      setError(
        err?.message ||
          'Unable to load Avelixa team members.'
      );
    } finally {
      setMembersLoading(false);
    }
  };

  const loadPayouts = async () => {
    setLoading(true);
    setError('');

    try {
      const { data, error: payoutsError } =
        await supabase
          .from('payouts')
          .select(
            'id,recipient_id,recipient_role,amount,payout_type,status,notes,paid_at,created_at'
          )
          .order('created_at', {
            ascending: false,
          });

      if (payoutsError) {
        throw payoutsError;
      }

      const rows = data || [];

      const recipientIds = [
        ...new Set(
          rows
            .map((item) => item.recipient_id)
            .filter(Boolean)
        ),
      ];

      let profiles: {
        id: string;
        email: string;
        full_name: string | null;
      }[] = [];

      if (recipientIds.length > 0) {
        const { data: profileData, error: profileError } =
          await supabase
            .from('profiles')
            .select('id,email,full_name')
            .in('id', recipientIds);

        if (profileError) {
          throw profileError;
        }

        profiles = profileData || [];
      }

      const result: Payout[] = rows.map((payout) => ({
        ...payout,
        profile:
          profiles.find(
            (profile) =>
              profile.id === payout.recipient_id
          ) || null,
      }));

      setPayouts(result);
    } catch (err: any) {
      setError(
        err?.message ||
          'Unable to load team payouts.'
      );
    } finally {
      setLoading(false);
    }
  };

  const loadAll = async () => {
    setError('');

    await Promise.all([
      loadTeamMembers(),
      loadPayouts(),
    ]);
  };

  useEffect(() => {
    loadAll();
  }, []);

  const selectedMember = teamMembers.find(
    (member) => member.id === recipientId
  );

  useEffect(() => {
    if (!selectedMember) {
      return;
    }

    const availableRoles =
      selectedMember.roles.map((role) =>
        role.toLowerCase()
      );

    if (
      availableRoles.includes(
        recipientRole.toLowerCase()
      )
    ) {
      return;
    }

    if (availableRoles.includes('connector')) {
      setRecipientRole('connector');
    } else if (
      availableRoles.includes('operator')
    ) {
      setRecipientRole('operator');
    } else if (
      availableRoles.includes('admin')
    ) {
      setRecipientRole('admin');
    } else if (
      availableRoles.includes('owner')
    ) {
      setRecipientRole('owner');
    }
  }, [recipientId, selectedMember, recipientRole]);

  const createPayout = async () => {
    setError('');

    const numericAmount = Number(amount);

    if (!recipientId) {
      setError(
        'Please select an Avelixa team member.'
      );
      return;
    }

    if (!numericAmount || numericAmount <= 0) {
      setError(
        'Please enter a valid payout amount.'
      );
      return;
    }

    const member = teamMembers.find(
      (item) => item.id === recipientId
    );

    if (!member) {
      setError(
        'The selected team member could not be found.'
      );
      return;
    }

    const availableRoles = member.roles.map((role) =>
      role.toLowerCase()
    );

    if (
      !availableRoles.includes(
        recipientRole.toLowerCase()
      )
    ) {
      setError(
        'The selected role is not assigned to this team member.'
      );
      return;
    }

    setSaving(true);

    try {
      const { data: currentUser } =
        await supabase.auth.getUser();

      if (!currentUser.user) {
        throw new Error(
          'You must be logged in to create a payout.'
        );
      }

      const { error: insertError } =
        await supabase
          .from('payouts')
          .insert({
            recipient_id: member.id,
            recipient_role: recipientRole,
            amount: numericAmount,
            payout_type: payoutType,
            status: 'pending',
            notes: notes.trim() || null,
            created_by: currentUser.user.id,
          });

      if (insertError) {
        throw insertError;
      }

      setRecipientId('');
      setRecipientRole('connector');
      setAmount('');
      setPayoutType('connector_commission');
      setNotes('');
      setShowForm(false);

      await loadPayouts();
    } catch (err: any) {
      setError(
        err?.message ||
          'Unable to create payout.'
      );
    } finally {
      setSaving(false);
    }
  };

  const updateStatus = async (
    payoutId: string,
    status: string
  ) => {
    setError('');

    try {
      const updateData: {
        status: string;
        paid_at?: string | null;
      } = {
        status,
      };

      if (status === 'paid') {
        updateData.paid_at =
          new Date().toISOString();
      }

      const { error: updateError } =
        await supabase
          .from('payouts')
          .update(updateData)
          .eq('id', payoutId);

      if (updateError) {
        throw updateError;
      }

      await loadPayouts();
    } catch (err: any) {
      setError(
        err?.message ||
          'Unable to update payout.'
      );
    }
  };

  const formatAmount = (value: number) =>
    new Intl.NumberFormat('en-KE', {
      style: 'currency',
      currency: 'KES',
      maximumFractionDigits: 0,
    }).format(value);

  const formatDate = (value: string | null) => {
    if (!value) return '—';

    return new Date(value).toLocaleDateString(
      'en-KE',
      {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      }
    );
  };

  const getStatusClasses = (status: string) => {
    switch (status.toLowerCase()) {
      case 'paid':
        return 'bg-emerald-500/10 text-emerald-400';

      case 'cancelled':
      case 'canceled':
        return 'bg-red-500/10 text-red-400';

      default:
        return 'bg-amber-500/10 text-amber-400';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status.toLowerCase()) {
      case 'paid':
        return (
          <CheckCircle2 className="w-3.5 h-3.5" />
        );

      case 'cancelled':
      case 'canceled':
        return (
          <XCircle className="w-3.5 h-3.5" />
        );

      default:
        return (
          <Clock3 className="w-3.5 h-3.5" />
        );
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-accent-600/10 flex items-center justify-center">
            <Wallet className="w-5 h-5 text-accent-400" />
          </div>

          <div>
            <h1 className="text-2xl font-semibold text-white">
              Team Payouts
            </h1>

            <p className="text-sm text-gray-400 mt-1">
              Manage payments to Avelixa connectors,
              operators and team members.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={loadAll}
            disabled={
              loading || membersLoading
            }
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-white/5 border border-ink-800 text-gray-300 hover:text-white hover:bg-white/10 transition-colors disabled:opacity-50"
          >
            <RefreshCw
              className={`w-4 h-4 ${
                loading || membersLoading
                  ? 'animate-spin'
                  : ''
              }`}
            />
            Refresh
          </button>

          <button
            onClick={() =>
              setShowForm((value) => !value)
            }
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-accent-600 text-white hover:bg-accent-500 transition-colors"
          >
            <Plus className="w-4 h-4" />
            New Payout
          </button>
        </div>
      </div>

      {error && (
        <div className="rounded-xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-300">
          {error}
        </div>
      )}

      {showForm && (
        <div className="rounded-2xl border border-ink-800/60 bg-ink-900/40 p-6">
          <h2 className="text-lg font-semibold text-white mb-5">
            Create Team Payout
          </h2>

          <div className="grid md:grid-cols-2 gap-5">
            <div>
              <label className="block text-sm text-gray-400 mb-2">
                Team Member
              </label>

              <select
                value={recipientId}
                onChange={(event) =>
                  setRecipientId(
                    event.target.value
                  )
                }
                disabled={membersLoading}
                className="w-full rounded-xl bg-ink-950 border border-ink-800 px-4 py-3 text-white outline-none focus:border-accent-500 disabled:opacity-50"
              >
                <option value="">
                  {membersLoading
                    ? 'Loading team members...'
                    : 'Select team member'}
                </option>

                {teamMembers.map((member) => (
                  <option
                    key={member.id}
                    value={member.id}
                  >
                    {member.full_name ||
                      member.email}{' '}
                    —{' '}
                    {member.roles
                      .map((role) =>
                        role.charAt(0).toUpperCase() +
                        role.slice(1)
                      )
                      .join(', ')}
                  </option>
                ))}
              </select>

              {selectedMember && (
                <p className="text-xs text-gray-500 mt-2">
                  {selectedMember.email}
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm text-gray-400 mb-2">
                Team Member Role
              </label>

              <select
                value={recipientRole}
                onChange={(event) =>
                  setRecipientRole(
                    event.target.value
                  )
                }
                disabled={!selectedMember}
                className="w-full rounded-xl bg-ink-950 border border-ink-800 px-4 py-3 text-white outline-none focus:border-accent-500 disabled:opacity-50"
              >
                {selectedMember?.roles.map(
                  (role) => (
                    <option
                      key={role}
                      value={role.toLowerCase()}
                    >
                      {role.charAt(0).toUpperCase() +
                        role.slice(1)}
                    </option>
                  )
                )}

                {!selectedMember && (
                  <option value="connector">
                    Select a member first
                  </option>
                )}
              </select>
            </div>

            <div>
              <label className="block text-sm text-gray-400 mb-2">
                Amount (KES)
              </label>

              <input
                type="number"
                min="1"
                value={amount}
                onChange={(event) =>
                  setAmount(event.target.value)
                }
                placeholder="e.g. 5000"
                className="w-full rounded-xl bg-ink-950 border border-ink-800 px-4 py-3 text-white outline-none focus:border-accent-500"
              />
            </div>

            <div>
              <label className="block text-sm text-gray-400 mb-2">
                Payout Type
              </label>

              <select
                value={payoutType}
                onChange={(event) =>
                  setPayoutType(
                    event.target.value
                  )
                }
                className="w-full rounded-xl bg-ink-950 border border-ink-800 px-4 py-3 text-white outline-none focus:border-accent-500"
              >
                <option value="connector_commission">
                  Connector Commission
                </option>

                <option value="operator_payment">
                  Operator Payment
                </option>

                <option value="team_payment">
                  Team Payment
                </option>

                <option value="other">
                  Other
                </option>
              </select>
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm text-gray-400 mb-2">
                Notes
              </label>

              <input
                value={notes}
                onChange={(event) =>
                  setNotes(event.target.value)
                }
                placeholder="Optional payout note"
                className="w-full rounded-xl bg-ink-950 border border-ink-800 px-4 py-3 text-white outline-none focus:border-accent-500"
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 mt-6">
            <button
              onClick={() =>
                setShowForm(false)
              }
              className="px-4 py-2.5 rounded-xl bg-white/5 text-gray-300 hover:bg-white/10 transition-colors"
            >
              Cancel
            </button>

            <button
              onClick={createPayout}
              disabled={
                saving ||
                membersLoading ||
                !recipientId
              }
              className="px-5 py-2.5 rounded-xl bg-accent-600 text-white hover:bg-accent-500 transition-colors disabled:opacity-50"
            >
              {saving
                ? 'Creating...'
                : 'Create Payout'}
            </button>
          </div>
        </div>
      )}

      <div className="rounded-2xl border border-ink-800/60 bg-ink-900/40 overflow-hidden">
        {loading ? (
          <div className="p-10 text-center text-gray-400">
            Loading payouts...
          </div>
        ) : payouts.length === 0 ? (
          <div className="p-10 text-center">
            <Wallet className="w-10 h-10 mx-auto text-gray-600 mb-3" />

            <p className="text-gray-400">
              No team payouts found.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-ink-800/60">
            {payouts.map((payout) => (
              <div
                key={payout.id}
                className="p-5 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-5"
              >
                <div>
                  <p className="font-medium text-white">
                    {payout.profile?.full_name ||
                      'Unknown team member'}
                  </p>

                  <p className="text-sm text-gray-500">
                    {payout.profile?.email ||
                      payout.recipient_id}
                  </p>

                  <div className="flex flex-wrap gap-2 mt-2">
                    <span className="px-2.5 py-1 rounded-lg bg-white/5 text-xs text-gray-400 capitalize">
                      {payout.recipient_role}
                    </span>

                    <span className="px-2.5 py-1 rounded-lg bg-white/5 text-xs text-gray-400 capitalize">
                      {payout.payout_type.replace(
                        /_/g,
                        ' '
                      )}
                    </span>

                    <span className="px-2.5 py-1 rounded-lg bg-white/5 text-xs text-gray-500">
                      {formatDate(
                        payout.created_at
                      )}
                    </span>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  <span className="text-lg font-semibold text-white">
                    {formatAmount(
                      payout.amount
                    )}
                  </span>

                  <span
                    className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs capitalize ${getStatusClasses(
                      payout.status
                    )}`}
                  >
                    {getStatusIcon(
                      payout.status
                    )}
                    {payout.status}
                  </span>

                  {payout.status ===
                    'pending' && (
                    <>
                      <button
                        onClick={() =>
                          updateStatus(
                            payout.id,
                            'paid'
                          )
                        }
                        className="px-3 py-2 rounded-lg bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 text-xs"
                      >
                        Mark Paid
                      </button>

                      <button
                        onClick={() =>
                          updateStatus(
                            payout.id,
                            'cancelled'
                          )
                        }
                        className="px-3 py-2 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 text-xs"
                      >
                        Cancel
                      </button>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
