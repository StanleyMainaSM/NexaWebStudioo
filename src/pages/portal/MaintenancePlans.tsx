
import { useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  CheckCircle2,
  Clock3,
  Edit3,
  Loader2,
  Plus,
  RefreshCw,
  ShieldCheck,
  Trash2,
  XCircle,
} from 'lucide-react';
import { supabase } from '../../lib/supabase';

type BillingInterval = 'monthly' | 'yearly';

type MaintenancePlan = {
  id: string;
  name: string;
  description: string | null;
  monthly_price: number;
  annual_price: number | null;
  trial_days: number | null;
  reminder_days: number | null;
  features: unknown;
  is_active: boolean | null;
  created_at: string | null;
  updated_at: string | null;
};

type Project = {
  id: string;
  title: string;
  client_id: string | null;
  status: string | null;
};

type ClientProfile = {
  id: string;
  full_name: string | null;
  email: string | null;
};

type MaintenanceSubscription = {
  id: string;
  project_id: string | null;
  plan_id: string | null;
  client_id: string | null;
  status: string | null;
  trial_ends_at: string | null;
  next_billing_date: string | null;
  billing_interval: string | null;
  billing_amount: number | null;
  auto_renew: boolean | null;
  recurring_service_id: string | null;
  started_at: string | null;
  cancelled_at: string | null;
  created_at: string | null;
  updated_at: string | null;
};

type FormState = {
  name: string;
  description: string;
  monthly_price: string;
  annual_price: string;
  trial_days: string;
  reminder_days: string;
  features: string;
  is_active: boolean;
};

const emptyForm: FormState = {
  name: '',
  description: '',
  monthly_price: '',
  annual_price: '',
  trial_days: '0',
  reminder_days: '7',
  features: '',
  is_active: true,
};

function formatCurrency(value: number | null | undefined) {
  if (value === null || value === undefined || Number.isNaN(Number(value))) {
    return '—';
  }

  return `KSh ${Number(value).toLocaleString()}`;
}

function formatDate(value: string | null | undefined) {
  if (!value) return '—';

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return '—';
  }

  return date.toLocaleDateString();
}

function formatDateTime(value: string | null | undefined) {
  if (!value) return '—';

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return '—';
  }

  return date.toLocaleString();
}

function formatStatus(status: string | null | undefined) {
  if (!status) return 'Unknown';

  return status
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (character) => character.toUpperCase());
}

function getSubscriptionStatusClass(status: string | null | undefined) {
  switch ((status || '').toLowerCase()) {
    case 'active':
      return 'border-emerald-500/20 bg-emerald-500/10 text-emerald-400';

    case 'trial':
      return 'border-accent-500/20 bg-accent-500/10 text-accent-400';

    case 'past_due':
      return 'border-red-500/20 bg-red-500/10 text-red-400';

    case 'paused':
      return 'border-amber-500/20 bg-amber-500/10 text-amber-400';

    case 'cancelled':
    case 'expired':
      return 'border-gray-500/20 bg-gray-500/10 text-gray-400';

    default:
      return 'border-white/10 bg-white/[0.04] text-gray-400';
  }
}

function parseFeatures(value: unknown) {
  if (Array.isArray(value)) {
    return value.map(String).filter(Boolean);
  }

  if (typeof value === 'string') {
    return value
      .split('\n')
      .map((item) => item.trim())
      .filter(Boolean);
  }

  return [];
}

function featuresToDatabase(value: string) {
  return value
    .split('\n')
    .map((item) => item.trim())
    .filter(Boolean);
}

function getClientName(
  clientId: string | null | undefined,
  clients: ClientProfile[]
) {
  if (!clientId) return 'No client';

  const client = clients.find((item) => item.id === clientId);

  if (!client) return 'Unknown client';

  return client.full_name?.trim() || client.email || 'Unnamed client';
}

function getProjectName(
  projectId: string | null | undefined,
  projects: Project[]
) {
  if (!projectId) return 'No project';

  return (
    projects.find((project) => project.id === projectId)?.title ||
    'Unknown project'
  );
}

export default function MaintenancePlans() {
  const [plans, setPlans] = useState<MaintenancePlan[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [clients, setClients] = useState<ClientProfile[]>([]);
  const [subscriptions, setSubscriptions] = useState<
    MaintenanceSubscription[]
  >([]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [actionId, setActionId] = useState<string | null>(null);

  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [showForm, setShowForm] = useState(false);
  const [editingPlanId, setEditingPlanId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);

  const [selectedProjectId, setSelectedProjectId] = useState('');
  const [selectedPlanId, setSelectedPlanId] = useState('');
  const [billingInterval, setBillingInterval] =
    useState<BillingInterval>('monthly');
  const [trialDays, setTrialDays] = useState('0');
  const [autoRenew, setAutoRenew] = useState(true);

  const [subscriptionOpen, setSubscriptionOpen] = useState(false);

  async function loadData() {
    setLoading(true);
    setError('');

    try {
      const [
        plansResult,
        projectsResult,
        subscriptionsResult,
      ] = await Promise.all([
        supabase
          .from('maintenance_plans')
          .select(
            'id, name, description, monthly_price, annual_price, trial_days, reminder_days, features, is_active, created_at, updated_at'
          )
          .order('created_at', { ascending: false }),

        supabase
          .from('projects')
          .select('id, title, client_id, status')
          .order('created_at', { ascending: false }),

        supabase
          .from('maintenance_subscriptions')
          .select(
            'id, project_id, plan_id, client_id, status, trial_ends_at, next_billing_date, billing_interval, billing_amount, auto_renew, recurring_service_id, started_at, cancelled_at, created_at, updated_at'
          )
          .order('created_at', { ascending: false }),
      ]);

      if (plansResult.error) throw plansResult.error;
      if (projectsResult.error) throw projectsResult.error;
      if (subscriptionsResult.error) throw subscriptionsResult.error;

      const projectRows = (projectsResult.data || []) as Project[];
      const subscriptionRows =
        (subscriptionsResult.data || []) as MaintenanceSubscription[];

      const clientIds = Array.from(
        new Set(
          [
            ...projectRows.map((project) => project.client_id),
            ...subscriptionRows.map((subscription) => subscription.client_id),
          ].filter(Boolean)
        )
      ) as string[];

      let clientRows: ClientProfile[] = [];

      if (clientIds.length > 0) {
        const clientsResult = await supabase
          .from('profiles')
          .select('id, full_name, email')
          .in('id', clientIds);

        if (clientsResult.error) throw clientsResult.error;

        clientRows = (clientsResult.data || []) as ClientProfile[];
      }

      setPlans((plansResult.data || []) as MaintenancePlan[]);
      setProjects(projectRows);
      setClients(clientRows);
      setSubscriptions(subscriptionRows);
    } catch (err) {
      console.error('Maintenance plans loading error:', err);
      setError(
        err instanceof Error
          ? err.message
          : 'Unable to load the maintenance management workspace.'
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  const activePlans = useMemo(
    () => plans.filter((plan) => plan.is_active !== false),
    [plans]
  );

  const openSubscriptions = useMemo(
    () =>
      subscriptions.filter((subscription) =>
        ['trial', 'active', 'past_due', 'paused'].includes(
          (subscription.status || '').toLowerCase()
        )
      ),
    [subscriptions]
  );

  const activeSubscriptions = useMemo(
    () =>
      subscriptions.filter(
        (subscription) =>
          (subscription.status || '').toLowerCase() === 'active'
      ),
    [subscriptions]
  );

  const trialSubscriptions = useMemo(
    () =>
      subscriptions.filter(
        (subscription) =>
          (subscription.status || '').toLowerCase() === 'trial'
      ),
    [subscriptions]
  );

  const recurringRevenue = useMemo(
    () =>
      activeSubscriptions.reduce(
        (total, subscription) =>
          total + Number(subscription.billing_amount || 0),
        0
      ),
    [activeSubscriptions]
  );

  const projectsAvailableForMaintenance = useMemo(() => {
    const subscribedProjectIds = new Set(
      openSubscriptions
        .map((subscription) => subscription.project_id)
        .filter(Boolean)
    );

    return projects.filter(
      (project) =>
        project.client_id &&
        !subscribedProjectIds.has(project.id) &&
        !['cancelled', 'cancelled_project'].includes(
          (project.status || '').toLowerCase()
        )
    );
  }, [projects, openSubscriptions]);

  function resetForm() {
    setForm(emptyForm);
    setEditingPlanId(null);
    setShowForm(false);
  }

  function beginCreate() {
    setSuccess('');
    setError('');
    setForm(emptyForm);
    setEditingPlanId(null);
    setShowForm(true);
  }

  function beginEdit(plan: MaintenancePlan) {
    setSuccess('');
    setError('');

    setEditingPlanId(plan.id);

    setForm({
      name: plan.name || '',
      description: plan.description || '',
      monthly_price: String(plan.monthly_price ?? ''),
      annual_price:
        plan.annual_price === null || plan.annual_price === undefined
          ? ''
          : String(plan.annual_price),
      trial_days: String(plan.trial_days ?? 0),
      reminder_days: String(plan.reminder_days ?? 7),
      features: parseFeatures(plan.features).join('\n'),
      is_active: plan.is_active !== false,
    });

    setShowForm(true);
  }

  async function savePlan() {
    setSaving(true);
    setError('');
    setSuccess('');

    try {
      const name = form.name.trim();
      const monthlyPrice = Number(form.monthly_price);
      const annualPrice =
        form.annual_price.trim() === ''
          ? null
          : Number(form.annual_price);

      const trialDays = Number(form.trial_days || 0);
      const reminderDays = Number(form.reminder_days || 7);

      if (!name) {
        throw new Error('Maintenance plan name is required.');
      }

      if (!Number.isFinite(monthlyPrice) || monthlyPrice < 0) {
        throw new Error('Monthly price must be a valid non-negative amount.');
      }

      if (
        annualPrice !== null &&
        (!Number.isFinite(annualPrice) || annualPrice < 0)
      ) {
        throw new Error('Annual price must be a valid non-negative amount.');
      }

      if (!Number.isInteger(trialDays) || trialDays < 0) {
        throw new Error('Trial days must be a non-negative whole number.');
      }

      if (!Number.isInteger(reminderDays) || reminderDays < 0) {
        throw new Error('Reminder days must be a non-negative whole number.');
      }

      const payload = {
        name,
        description: form.description.trim() || null,
        monthly_price: monthlyPrice,
        annual_price: annualPrice,
        trial_days: trialDays,
        reminder_days: reminderDays,
        features: featuresToDatabase(form.features),
        is_active: form.is_active,
        updated_at: new Date().toISOString(),
      };

      if (editingPlanId) {
        const { error: updateError } = await supabase
          .from('maintenance_plans')
          .update(payload)
          .eq('id', editingPlanId);

        if (updateError) throw updateError;

        setSuccess('Maintenance plan updated successfully.');
      } else {
        const { error: insertError } = await supabase
          .from('maintenance_plans')
          .insert(payload);

        if (insertError) throw insertError;

        setSuccess('Maintenance plan created successfully.');
      }

      resetForm();
      await loadData();
    } catch (err) {
      console.error('Maintenance plan save error:', err);

      setError(
        err instanceof Error
          ? err.message
          : 'Unable to save the maintenance plan.'
      );
    } finally {
      setSaving(false);
    }
  }

  async function togglePlan(plan: MaintenancePlan) {
    setActionId(plan.id);
    setError('');
    setSuccess('');

    try {
      const { error: updateError } = await supabase
        .from('maintenance_plans')
        .update({
          is_active: plan.is_active === false,
          updated_at: new Date().toISOString(),
        })
        .eq('id', plan.id);

      if (updateError) throw updateError;

      setSuccess(
        plan.is_active === false
          ? `${plan.name} is now active.`
          : `${plan.name} has been deactivated. Existing subscriptions are not cancelled.`
      );

      await loadData();
    } catch (err) {
      console.error('Maintenance plan toggle error:', err);

      setError(
        err instanceof Error
          ? err.message
          : 'Unable to change the maintenance plan status.'
      );
    } finally {
      setActionId(null);
    }
  }

  async function deletePlan(plan: MaintenancePlan) {
    const confirmed = window.confirm(
      `Delete "${plan.name}"? This should only be done when the plan has no dependent subscriptions.`
    );

    if (!confirmed) return;

    setActionId(plan.id);
    setError('');
    setSuccess('');

    try {
      const { error: deleteError } = await supabase
        .from('maintenance_plans')
        .delete()
        .eq('id', plan.id);

      if (deleteError) throw deleteError;

      setSuccess(`${plan.name} was deleted.`);
      await loadData();
    } catch (err) {
      console.error('Maintenance plan delete error:', err);

      setError(
        err instanceof Error
          ? err.message
          : 'Unable to delete the maintenance plan.'
      );
    } finally {
      setActionId(null);
    }
  }

  async function createSubscription() {
    setSaving(true);
    setError('');
    setSuccess('');

    try {
      if (!selectedProjectId) {
        throw new Error('Select a project first.');
      }

      if (!selectedPlanId) {
        throw new Error('Select a maintenance plan first.');
      }

      const selectedPlan = plans.find(
        (plan) => plan.id === selectedPlanId
      );

      if (!selectedPlan) {
        throw new Error('The selected maintenance plan could not be found.');
      }

      const requestedTrialDays = Number(trialDays || 0);

      if (
        !Number.isInteger(requestedTrialDays) ||
        requestedTrialDays < 0
      ) {
        throw new Error(
          'Trial days must be a non-negative whole number.'
        );
      }

      const { data, error: rpcError } = await supabase.rpc(
        'create_maintenance_subscription',
        {
          p_project_id: selectedProjectId,
          p_plan_id: selectedPlanId,
          p_billing_interval: billingInterval,
          p_trial_days: requestedTrialDays,
          p_auto_renew: autoRenew,
        }
      );

      if (rpcError) throw rpcError;

      if (!data) {
        throw new Error(
          'The maintenance subscription was not created.'
        );
      }

      setSuccess(
        `Maintenance subscription created for ${getProjectName(
          selectedProjectId,
          projects
        )}.`
      );

      setSelectedProjectId('');
      setSelectedPlanId('');
      setBillingInterval('monthly');
      setTrialDays('0');
      setAutoRenew(true);
      setSubscriptionOpen(false);

      await loadData();
    } catch (err) {
      console.error('Maintenance subscription creation error:', err);

      setError(
        err instanceof Error
          ? err.message
          : 'Unable to create the maintenance subscription.'
      );
    } finally {
      setSaving(false);
    }
  }

  async function activateSubscription(
    subscription: MaintenanceSubscription
  ) {
    const confirmed = window.confirm(
      `Activate the maintenance subscription for "${getProjectName(
        subscription.project_id,
        projects
      )}"?`
    );

    if (!confirmed) return;

    setActionId(subscription.id);
    setError('');
    setSuccess('');

    try {
      const { error: rpcError } = await supabase.rpc(
        'activate_maintenance_subscription',
        {
          p_subscription_id: subscription.id,
        }
      );

      if (rpcError) throw rpcError;

      setSuccess(
        `Maintenance subscription for ${getProjectName(
          subscription.project_id,
          projects
        )} is now active.`
      );

      await loadData();
    } catch (err) {
      console.error('Maintenance subscription activation error:', err);

      setError(
        err instanceof Error
          ? err.message
          : 'Unable to activate the maintenance subscription.'
      );
    } finally {
      setActionId(null);
    }
  }

  async function deactivateSubscription(
    subscription: MaintenanceSubscription
  ) {
    const reason = window.prompt(
      'Reason for cancelling this maintenance subscription:',
      'Client requested cancellation'
    );

    if (reason === null) return;

    setActionId(subscription.id);
    setError('');
    setSuccess('');

    try {
      const { error: rpcError } = await supabase.rpc(
        'deactivate_maintenance_subscription',
        {
          p_subscription_id: subscription.id,
          p_reason: reason.trim() || null,
        }
      );

      if (rpcError) throw rpcError;

      setSuccess(
        `Maintenance subscription for ${getProjectName(
          subscription.project_id,
          projects
        )} has been cancelled.`
      );

      await loadData();
    } catch (err) {
      console.error('Maintenance subscription cancellation error:', err);

      setError(
        err instanceof Error
          ? err.message
          : 'Unable to cancel the maintenance subscription.'
      );
    } finally {
      setActionId(null);
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="glass rounded-3xl border border-ink-800/50 p-8">
          <div className="flex items-center gap-3 text-white">
            <Loader2 className="h-5 w-5 animate-spin text-accent-400" />
            <span>Loading maintenance management...</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-10">
      <section className="relative overflow-hidden rounded-3xl border border-accent-500/20 bg-gradient-to-br from-accent-600/20 via-white/[0.04] to-transparent p-6 md:p-8">
        <div className="absolute -right-16 -top-16 h-64 w-64 rounded-full bg-accent-500/10 blur-3xl" />

        <div className="relative flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-accent-500/20 bg-accent-500/10 px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.25em] text-accent-400">
              <ShieldCheck className="h-3.5 w-3.5" />
              Recurring services
            </div>

            <h1 className="mt-5 text-3xl font-semibold tracking-tight text-white md:text-4xl">
              Maintenance Plans
            </h1>

            <p className="mt-3 max-w-3xl text-sm leading-6 text-gray-400">
              Manage Avelixa maintenance plans and connect completed
              projects to the recurring maintenance and billing workflow.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={loadData}
              className="inline-flex items-center gap-2 rounded-xl border border-ink-800/60 bg-white/[0.04] px-4 py-2.5 text-sm font-medium text-gray-200 transition hover:bg-white/[0.08]"
            >
              <RefreshCw className="h-4 w-4" />
              Refresh
            </button>

            <button
              type="button"
              onClick={beginCreate}
              className="inline-flex items-center gap-2 rounded-xl bg-accent-600 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-accent-500"
            >
              <Plus className="h-4 w-4" />
              New plan
            </button>
          </div>
        </div>
      </section>

      {error && (
        <div className="flex items-start gap-3 rounded-2xl border border-red-500/20 bg-red-500/5 p-4 text-sm text-red-300">
          <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {success && (
        <div className="flex items-start gap-3 rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-4 text-sm text-emerald-300">
          <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0" />
          <span>{success}</span>
        </div>
      )}

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <div className="glass rounded-2xl border border-ink-800/50 p-5">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-ink-500">
            Plans
          </p>
          <p className="mt-3 text-3xl font-light text-white">
            {plans.length}
          </p>
          <p className="mt-1 text-xs text-gray-500">
            {activePlans.length} active
          </p>
        </div>

        <div className="glass rounded-2xl border border-ink-800/50 p-5">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-ink-500">
            Open subscriptions
          </p>
          <p className="mt-3 text-3xl font-light text-white">
            {openSubscriptions.length}
          </p>
          <p className="mt-1 text-xs text-gray-500">
            Trial, active, paused or past due
          </p>
        </div>

        <div className="glass rounded-2xl border border-ink-800/50 p-5">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-ink-500">
            Active subscriptions
          </p>
          <p className="mt-3 text-3xl font-light text-white">
            {activeSubscriptions.length}
          </p>
          <p className="mt-1 text-xs text-gray-500">
            Currently billing
          </p>
        </div>

        <div className="glass rounded-2xl border border-ink-800/50 p-5">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-ink-500">
            Recurring revenue
          </p>
          <p className="mt-3 text-2xl font-light text-white">
            {formatCurrency(recurringRevenue)}
          </p>
          <p className="mt-1 text-xs text-gray-500">
            Current active billing total
          </p>
        </div>
      </section>

      {showForm && (
        <section className="glass rounded-3xl border border-accent-500/20 p-6 md:p-7">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-accent-400">
                Plan configuration
              </p>

              <h2 className="mt-2 text-xl font-semibold text-white">
                {editingPlanId
                  ? 'Edit maintenance plan'
                  : 'Create maintenance plan'}
              </h2>
            </div>

            <button
              type="button"
              onClick={resetForm}
              className="rounded-xl border border-ink-800/60 p-2 text-gray-400 hover:bg-white/[0.06] hover:text-white"
            >
              <XCircle className="h-5 w-5" />
            </button>
          </div>

          <div className="mt-6 grid grid-cols-1 gap-5 md:grid-cols-2">
            <label className="block">
              <span className="text-xs font-medium text-gray-300">
                Plan name
              </span>
              <input
                value={form.name}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    name: event.target.value,
                  }))
                }
                className="mt-2 w-full rounded-xl border border-ink-800/70 bg-black/20 px-4 py-3 text-sm text-white outline-none placeholder:text-gray-600 focus:border-accent-500/50"
                placeholder="e.g. Avelixa Care"
              />
            </label>

            <label className="block">
              <span className="text-xs font-medium text-gray-300">
                Monthly price
              </span>
              <input
                type="number"
                min="0"
                step="0.01"
                value={form.monthly_price}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    monthly_price: event.target.value,
                  }))
                }
                className="mt-2 w-full rounded-xl border border-ink-800/70 bg-black/20 px-4 py-3 text-sm text-white outline-none placeholder:text-gray-600 focus:border-accent-500/50"
                placeholder="0"
              />
            </label>

            <label className="block">
              <span className="text-xs font-medium text-gray-300">
                Annual price
              </span>
              <input
                type="number"
                min="0"
                step="0.01"
                value={form.annual_price}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    annual_price: event.target.value,
                  }))
                }
                className="mt-2 w-full rounded-xl border border-ink-800/70 bg-black/20 px-4 py-3 text-sm text-white outline-none placeholder:text-gray-600 focus:border-accent-500/50"
                placeholder="Optional"
              />
            </label>

            <label className="block">
              <span className="text-xs font-medium text-gray-300">
                Included trial / free period (days)
              </span>
              <input
                type="number"
                min="0"
                step="1"
                value={form.trial_days}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    trial_days: event.target.value,
                  }))
                }
                className="mt-2 w-full rounded-xl border border-ink-800/70 bg-black/20 px-4 py-3 text-sm text-white outline-none placeholder:text-gray-600 focus:border-accent-500/50"
                placeholder="0"
              />
            </label>

            <label className="block">
              <span className="text-xs font-medium text-gray-300">
                Renewal reminder days
              </span>
              <input
                type="number"
                min="0"
                step="1"
                value={form.reminder_days}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    reminder_days: event.target.value,
                  }))
                }
                className="mt-2 w-full rounded-xl border border-ink-800/70 bg-black/20 px-4 py-3 text-sm text-white outline-none placeholder:text-gray-600 focus:border-accent-500/50"
                placeholder="7"
              />
            </label>

            <label className="flex items-center gap-3 rounded-xl border border-ink-800/60 bg-white/[0.03] p-4">
              <input
                type="checkbox"
                checked={form.is_active}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    is_active: event.target.checked,
                  }))
                }
                className="h-4 w-4 accent-accent-500"
              />
              <span>
                <span className="block text-sm font-medium text-white">
                  Available for new subscriptions
                </span>
                <span className="mt-1 block text-xs text-gray-500">
                  Deactivating a plan does not cancel existing subscriptions.
                </span>
              </span>
            </label>
          </div>

          <label className="mt-5 block">
            <span className="text-xs font-medium text-gray-300">
              Description
            </span>
            <textarea
              value={form.description}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  description: event.target.value,
                }))
              }
              rows={3}
              className="mt-2 w-full resize-none rounded-xl border border-ink-800/70 bg-black/20 px-4 py-3 text-sm text-white outline-none placeholder:text-gray-600 focus:border-accent-500/50"
              placeholder="Describe what this maintenance plan includes."
            />
          </label>

          <label className="mt-5 block">
            <span className="text-xs font-medium text-gray-300">
              Features
            </span>
            <textarea
              value={form.features}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  features: event.target.value,
                }))
              }
              rows={5}
              className="mt-2 w-full resize-none rounded-xl border border-ink-800/70 bg-black/20 px-4 py-3 text-sm text-white outline-none placeholder:text-gray-600 focus:border-accent-500/50"
              placeholder={'One feature per line.\nWebsite monitoring\nSecurity updates\nTechnical support'}
            />
          </label>

          <div className="mt-6 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={savePlan}
              disabled={saving}
              className="inline-flex items-center gap-2 rounded-xl bg-accent-600 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-accent-500 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {saving && (
                <Loader2 className="h-4 w-4 animate-spin" />
              )}
              {editingPlanId ? 'Save changes' : 'Create plan'}
            </button>

            <button
              type="button"
              onClick={resetForm}
              disabled={saving}
              className="rounded-xl border border-ink-800/60 bg-white/[0.04] px-5 py-2.5 text-sm font-medium text-gray-300 hover:bg-white/[0.08]"
            >
              Cancel
            </button>
          </div>
        </section>
      )}

      <section className="glass rounded-3xl border border-ink-800/50 p-6 md:p-7">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-ink-500">
              Subscription workflow
            </p>

            <h2 className="mt-2 text-xl font-semibold text-white">
              Assign maintenance to a project
            </h2>

            <p className="mt-1 max-w-2xl text-sm leading-6 text-gray-400">
              Select a client project, choose a plan and create the
              subscription through the protected database workflow.
            </p>
          </div>

          <button
            type="button"
            onClick={() => setSubscriptionOpen((current) => !current)}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-accent-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-accent-500"
          >
            <Plus className="h-4 w-4" />
            {subscriptionOpen
              ? 'Close subscription form'
              : 'Create subscription'}
          </button>
        </div>

        {subscriptionOpen && (
          <div className="mt-6 rounded-2xl border border-accent-500/20 bg-accent-500/5 p-5">
            {projectsAvailableForMaintenance.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-ink-700/70 bg-white/[0.03] p-6 text-center">
                <Clock3 className="mx-auto h-8 w-8 text-ink-600" />
                <p className="mt-3 font-medium text-white">
                  No eligible projects
                </p>
                <p className="mt-2 text-sm text-gray-500">
                  Projects with an existing open maintenance subscription
                  are excluded from this list.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
                <label className="block">
                  <span className="text-xs font-medium text-gray-300">
                    Project
                  </span>

                  <select
                    value={selectedProjectId}
                    onChange={(event) =>
                      setSelectedProjectId(event.target.value)
                    }
                    className="mt-2 w-full rounded-xl border border-ink-800/70 bg-black/30 px-4 py-3 text-sm text-white outline-none focus:border-accent-500/50"
                  >
                    <option value="">Select project</option>

                    {projectsAvailableForMaintenance.map((project) => (
                      <option key={project.id} value={project.id}>
                        {project.title} —{' '}
                        {getClientName(project.client_id, clients)}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="block">
                  <span className="text-xs font-medium text-gray-300">
                    Maintenance plan
                  </span>

                  <select
                    value={selectedPlanId}
                    onChange={(event) =>
                      setSelectedPlanId(event.target.value)
                    }
                    className="mt-2 w-full rounded-xl border border-ink-800/70 bg-black/30 px-4 py-3 text-sm text-white outline-none focus:border-accent-500/50"
                  >
                    <option value="">Select plan</option>

                    {activePlans.map((plan) => (
                      <option key={plan.id} value={plan.id}>
                        {plan.name} — {formatCurrency(plan.monthly_price)}
                        /month
                      </option>
                    ))}
                  </select>
                </label>

                <div>
                  <span className="text-xs font-medium text-gray-300">
                    Billing interval
                  </span>

                  <div className="mt-2 grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setBillingInterval('monthly')}
                      className={`rounded-xl border px-4 py-3 text-sm font-medium transition ${
                        billingInterval === 'monthly'
                          ? 'border-accent-500/40 bg-accent-500/10 text-accent-300'
                          : 'border-ink-800/60 bg-white/[0.03] text-gray-400'
                      }`}
                    >
                      Monthly
                    </button>

                    <button
                      type="button"
                      onClick={() => setBillingInterval('yearly')}
                      className={`rounded-xl border px-4 py-3 text-sm font-medium transition ${
                        billingInterval === 'yearly'
                          ? 'border-accent-500/40 bg-accent-500/10 text-accent-300'
                          : 'border-ink-800/60 bg-white/[0.03] text-gray-400'
                      }`}
                    >
                      Yearly
                    </button>
                  </div>
                </div>

                <label className="block">
                  <span className="text-xs font-medium text-gray-300">
                    Trial / free period override (days)
                  </span>

                  <input
                    type="number"
                    min="0"
                    step="1"
                    value={trialDays}
                    onChange={(event) =>
                      setTrialDays(event.target.value)
                    }
                    className="mt-2 w-full rounded-xl border border-ink-800/70 bg-black/20 px-4 py-3 text-sm text-white outline-none focus:border-accent-500/50"
                  />

                  <p className="mt-1.5 text-xs text-gray-600">
                    Use 0 to use the plan immediately without a trial.
                  </p>
                </label>

                <label className="flex items-center gap-3 rounded-xl border border-ink-800/60 bg-white/[0.03] p-4">
                  <input
                    type="checkbox"
                    checked={autoRenew}
                    onChange={(event) =>
                      setAutoRenew(event.target.checked)
                    }
                    className="h-4 w-4 accent-accent-500"
                  />

                  <span>
                    <span className="block text-sm font-medium text-white">
                      Auto-renew
                    </span>
                    <span className="mt-1 block text-xs text-gray-500">
                      When enabled, the scheduled workflow will move the
                      subscription into recurring billing after the trial.
                    </span>
                  </span>
                </label>

                <div className="flex items-end">
                  <button
                    type="button"
                    onClick={createSubscription}
                    disabled={saving}
                    className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-accent-600 px-5 py-3 text-sm font-medium text-white hover:bg-accent-500 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {saving && (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    )}
                    Create maintenance subscription
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </section>

      <section className="glass rounded-3xl border border-ink-800/50 p-6 md:p-7">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-ink-500">
            Plan catalogue
          </p>

          <h2 className="mt-2 text-xl font-semibold text-white">
            Maintenance plans
          </h2>
        </div>

        {plans.length === 0 ? (
          <div className="mt-6 rounded-2xl border border-dashed border-ink-700/70 bg-white/[0.03] p-8 text-center">
            <ShieldCheck className="mx-auto h-9 w-9 text-ink-600" />
            <p className="mt-3 font-medium text-white">
              No maintenance plans created yet
            </p>
            <p className="mt-2 text-sm text-gray-500">
              Create the first recurring maintenance plan to begin building
              the subscription catalogue.
            </p>
          </div>
        ) : (
          <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
            {plans.map((plan) => {
              const featureList = parseFeatures(plan.features);
              const isActive = plan.is_active !== false;

              return (
                <div
                  key={plan.id}
                  className="rounded-2xl border border-ink-800/60 bg-white/[0.03] p-5"
                >
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-lg font-semibold text-white">
                          {plan.name}
                        </h3>

                        <span
                          className={`rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.15em] ${
                            isActive
                              ? 'border-emerald-500/20 bg-emerald-500/10 text-emerald-400'
                              : 'border-gray-500/20 bg-gray-500/10 text-gray-500'
                          }`}
                        >
                          {isActive ? 'Active' : 'Inactive'}
                        </span>
                      </div>

                      <p className="mt-2 text-sm leading-6 text-gray-400">
                        {plan.description ||
                          'No description has been added to this plan.'}
                      </p>
                    </div>

                    <div className="shrink-0 sm:text-right">
                      <p className="text-2xl font-light text-white">
                        {formatCurrency(plan.monthly_price)}
                      </p>
                      <p className="text-xs text-gray-600">
                        per month
                      </p>
                    </div>
                  </div>

                  <div className="mt-5 grid grid-cols-2 gap-3">
                    <div className="rounded-xl border border-ink-800/50 bg-black/10 p-3">
                      <p className="text-[10px] uppercase tracking-[0.15em] text-ink-500">
                        Annual
                      </p>
                      <p className="mt-1 text-sm font-medium text-white">
                        {plan.annual_price === null ||
                        plan.annual_price === undefined
                          ? 'Not set'
                          : formatCurrency(plan.annual_price)}
                      </p>
                    </div>

                    <div className="rounded-xl border border-ink-800/50 bg-black/10 p-3">
                      <p className="text-[10px] uppercase tracking-[0.15em] text-ink-500">
                        Free period
                      </p>
                      <p className="mt-1 text-sm font-medium text-white">
                        {plan.trial_days || 0} days
                      </p>
                    </div>
                  </div>

                  {featureList.length > 0 && (
                    <div className="mt-5 space-y-2">
                      {featureList.map((feature, index) => (
                        <div
                          key={`${plan.id}-feature-${index}`}
                          className="flex items-start gap-2 text-sm text-gray-400"
                        >
                          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-accent-400" />
                          <span>{feature}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="mt-5 flex flex-wrap gap-2 border-t border-ink-800/50 pt-4">
                    <button
                      type="button"
                      onClick={() => beginEdit(plan)}
                      className="inline-flex items-center gap-2 rounded-xl border border-ink-800/60 bg-white/[0.04] px-3.5 py-2 text-xs font-medium text-gray-300 hover:bg-white/[0.08]"
                    >
                      <Edit3 className="h-3.5 w-3.5" />
                      Edit
                    </button>

                    <button
                      type="button"
                      onClick={() => togglePlan(plan)}
                      disabled={actionId === plan.id}
                      className="inline-flex items-center gap-2 rounded-xl border border-ink-800/60 bg-white/[0.04] px-3.5 py-2 text-xs font-medium text-gray-300 hover:bg-white/[0.08] disabled:opacity-50"
                    >
                      {actionId === plan.id ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : isActive ? (
                        <XCircle className="h-3.5 w-3.5" />
                      ) : (
                        <CheckCircle2 className="h-3.5 w-3.5" />
                      )}
                      {isActive ? 'Deactivate' : 'Activate'}
                    </button>

                    <button
                      type="button"
                      onClick={() => deletePlan(plan)}
                      disabled={actionId === plan.id}
                      className="inline-flex items-center gap-2 rounded-xl border border-red-500/20 bg-red-500/5 px-3.5 py-2 text-xs font-medium text-red-400 hover:bg-red-500/10 disabled:opacity-50"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      Delete
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      <section className="glass rounded-3xl border border-ink-800/50 p-6 md:p-7">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-ink-500">
            Recurring service lifecycle
          </p>

          <h2 className="mt-2 text-xl font-semibold text-white">
            Active subscriptions
          </h2>

          <p className="mt-1 text-sm text-gray-400">
            Subscriptions are linked to projects and recurring services.
            Billing automation will use their next billing dates.
          </p>
        </div>

        {subscriptions.length === 0 ? (
          <div className="mt-6 rounded-2xl border border-dashed border-ink-700/70 bg-white/[0.03] p-8 text-center">
            <RefreshCw className="mx-auto h-9 w-9 text-ink-600" />

            <p className="mt-3 font-medium text-white">
              No maintenance subscriptions yet
            </p>

            <p className="mt-2 text-sm text-gray-500">
              Create a subscription above to connect a project to recurring
              maintenance billing.
            </p>
          </div>
        ) : (
          <div className="mt-6 space-y-3">
            {subscriptions.map((subscription) => {
              const status = (subscription.status || '').toLowerCase();

              const canActivate = ['trial', 'paused', 'past_due'].includes(
                status
              );

              const canDeactivate = [
                'trial',
                'active',
                'past_due',
                'paused',
              ].includes(status);

              return (
                <div
                  key={subscription.id}
                  className="rounded-2xl border border-ink-800/60 bg-white/[0.03] p-5"
                >
                  <div className="flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="font-medium text-white">
                          {getProjectName(
                            subscription.project_id,
                            projects
                          )}
                        </h3>

                        <span
                          className={`rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.15em] ${getSubscriptionStatusClass(
                            subscription.status
                          )}`}
                        >
                          {formatStatus(subscription.status)}
                        </span>
                      </div>

                      <p className="mt-2 text-sm text-gray-400">
                        Client:{' '}
                        {getClientName(
                          subscription.client_id,
                          clients
                        )}
                      </p>

                      <div className="mt-4 grid grid-cols-2 gap-4 md:grid-cols-4">
                        <div>
                          <p className="text-[10px] uppercase tracking-[0.15em] text-ink-500">
                            Billing
                          </p>
                          <p className="mt-1 text-sm text-white">
                            {formatCurrency(
                              subscription.billing_amount
                            )}
                          </p>
                        </div>

                        <div>
                          <p className="text-[10px] uppercase tracking-[0.15em] text-ink-500">
                            Interval
                          </p>
                          <p className="mt-1 text-sm text-white">
                            {formatStatus(
                              subscription.billing_interval
                            )}
                          </p>
                        </div>

                        <div>
                          <p className="text-[10px] uppercase tracking-[0.15em] text-ink-500">
                            Trial ends
                          </p>
                          <p className="mt-1 text-sm text-white">
                            {formatDate(subscription.trial_ends_at)}
                          </p>
                        </div>

                        <div>
                          <p className="text-[10px] uppercase tracking-[0.15em] text-ink-500">
                            Next billing
                          </p>
                          <p className="mt-1 text-sm text-white">
                            {formatDate(
                              subscription.next_billing_date
                            )}
                          </p>
                        </div>
                      </div>

                      <p className="mt-3 text-xs text-gray-600">
                        Started:{' '}
                        {formatDateTime(subscription.started_at)}
                        {' · '}
                        Auto-renew:{' '}
                        {subscription.auto_renew ? 'Yes' : 'No'}
                      </p>
                    </div>

                    <div className="flex shrink-0 flex-wrap gap-2">
                      {canActivate && (
                        <button
                          type="button"
                          onClick={() =>
                            activateSubscription(subscription)
                          }
                          disabled={actionId === subscription.id}
                          className="inline-flex items-center gap-2 rounded-xl bg-emerald-600/90 px-4 py-2.5 text-xs font-medium text-white hover:bg-emerald-600 disabled:opacity-50"
                        >
                          {actionId === subscription.id ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <CheckCircle2 className="h-3.5 w-3.5" />
                          )}
                          Activate
                        </button>
                      )}

                      {canDeactivate && (
                        <button
                          type="button"
                          onClick={() =>
                            deactivateSubscription(subscription)
                          }
                          disabled={actionId === subscription.id}
                          className="inline-flex items-center gap-2 rounded-xl border border-red-500/20 bg-red-500/5 px-4 py-2.5 text-xs font-medium text-red-400 hover:bg-red-500/10 disabled:opacity-50"
                        >
                          <XCircle className="h-3.5 w-3.5" />
                          Cancel
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      <section className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="rounded-3xl border border-accent-500/20 bg-accent-500/5 p-6">
          <div className="flex items-start gap-3">
            <Clock3 className="mt-0.5 h-5 w-5 text-accent-400" />

            <div>
              <h3 className="font-medium text-white">
                Trial automation
              </h3>

              <p className="mt-2 text-sm leading-6 text-gray-400">
                Trial subscriptions are processed automatically by the
                database scheduler. When a trial ends, auto-renewing
                subscriptions move into active recurring service billing.
              </p>

              <p className="mt-3 text-xs text-gray-600">
                Current trial subscriptions: {trialSubscriptions.length}
              </p>
            </div>
          </div>
        </div>

        <div className="rounded-3xl border border-emerald-500/20 bg-emerald-500/5 p-6">
          <div className="flex items-start gap-3">
            <RefreshCw className="mt-0.5 h-5 w-5 text-emerald-400" />

            <div>
              <h3 className="font-medium text-white">
                Recurring billing connection
              </h3>

              <p className="mt-2 text-sm leading-6 text-gray-400">
                Active maintenance subscriptions are connected to the
                recurring-services workflow. Renewal reminders and
                recurring invoice creation are handled by the automated
                billing process.
              </p>

              <p className="mt-3 text-xs text-gray-600">
                Active recurring services: {activeSubscriptions.length}
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

