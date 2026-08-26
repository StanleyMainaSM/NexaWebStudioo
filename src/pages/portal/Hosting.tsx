import { useMemo, useState } from 'react';
import {
  Globe2,
  Server,
  ShieldCheck,
  Zap,
  Plus,
  Pencil,
  Trash2,
  X,
  CheckCircle2,
  AlertTriangle,
} from 'lucide-react';

interface HostingPlan {
  id: number;
  name: string;
  description: string;
  price: number;
  billingCycle: 'monthly' | 'yearly';
  storage: string;
  bandwidth: string;
  ssl: boolean;
  backups: boolean;
  support: string;
  active: boolean;
}

const initialPlans: HostingPlan[] = [
  {
    id: 1,
    name: 'Avelixa Essential Hosting',
    description:
      'Reliable hosting for small business websites and professional digital presence.',
    price: 3500,
    billingCycle: 'yearly',
    storage: '10 GB',
    bandwidth: 'Standard',
    ssl: true,
    backups: true,
    support: 'Standard support',
    active: true,
  },
  {
    id: 2,
    name: 'Avelixa Business Hosting',
    description:
      'Higher-performance hosting for growing businesses and content-rich websites.',
    price: 6500,
    billingCycle: 'yearly',
    storage: '25 GB',
    bandwidth: 'High',
    ssl: true,
    backups: true,
    support: 'Priority support',
    active: true,
  },
  {
    id: 3,
    name: 'Avelixa Premium Hosting',
    description:
      'Premium hosting for demanding business websites and web applications.',
    price: 12000,
    billingCycle: 'yearly',
    storage: '50 GB',
    bandwidth: 'High',
    ssl: true,
    backups: true,
    support: 'Priority support',
    active: true,
  },
];

const emptyPlan: Omit<HostingPlan, 'id'> = {
  name: '',
  description: '',
  price: 0,
  billingCycle: 'yearly',
  storage: '',
  bandwidth: '',
  ssl: true,
  backups: true,
  support: '',
  active: true,
};

function formatCurrency(amount: number) {
  return `KSh ${amount.toLocaleString('en-KE')}`;
}

export default function Hosting() {
  const [plans, setPlans] =
    useState<HostingPlan[]>(initialPlans);

  const [showForm, setShowForm] =
    useState(false);

  const [editingId, setEditingId] =
    useState<number | null>(null);

  const [form, setForm] =
    useState<Omit<HostingPlan, 'id'>>(
      emptyPlan
    );

  const [success, setSuccess] =
    useState<string | null>(null);

  const [error, setError] =
    useState<string | null>(null);

  const activePlans = useMemo(
    () =>
      plans.filter(
        (plan) => plan.active
      ).length,
    [plans]
  );

  const openCreateForm = () => {
    setEditingId(null);
    setForm(emptyPlan);
    setError(null);
    setSuccess(null);
    setShowForm(true);
  };

  const openEditForm = (
    plan: HostingPlan
  ) => {
    setEditingId(plan.id);

    setForm({
      name: plan.name,
      description: plan.description,
      price: plan.price,
      billingCycle:
        plan.billingCycle,
      storage: plan.storage,
      bandwidth: plan.bandwidth,
      ssl: plan.ssl,
      backups: plan.backups,
      support: plan.support,
      active: plan.active,
    });

    setError(null);
    setSuccess(null);
    setShowForm(true);
  };

  const closeForm = () => {
    if (showForm) {
      setShowForm(false);
      setEditingId(null);
      setForm(emptyPlan);
    }
  };

  const handleSave = (
    event: React.FormEvent
  ) => {
    event.preventDefault();

    setError(null);
    setSuccess(null);

    if (!form.name.trim()) {
      setError(
        'Please enter a hosting plan name.'
      );
      return;
    }

    if (!form.description.trim()) {
      setError(
        'Please enter a hosting plan description.'
      );
      return;
    }

    if (form.price <= 0) {
      setError(
        'Please enter a valid hosting price.'
      );
      return;
    }

    if (!form.storage.trim()) {
      setError(
        'Please enter the storage allowance.'
      );
      return;
    }

    if (!form.bandwidth.trim()) {
      setError(
        'Please enter the bandwidth level.'
      );
      return;
    }

    if (!form.support.trim()) {
      setError(
        'Please enter the support level.'
      );
      return;
    }

    if (editingId !== null) {
      setPlans((current) =>
        current.map((plan) =>
          plan.id === editingId
            ? {
                ...form,
                id: editingId,
              }
            : plan
        )
      );

      setSuccess(
        'Hosting plan updated successfully.'
      );
    } else {
      setPlans((current) => [
        ...current,
        {
          ...form,
          id:
            Math.max(
              0,
              ...current.map(
                (plan) => plan.id
              )
            ) + 1,
        },
      ]);

      setSuccess(
        'Hosting plan created successfully.'
      );
    }

    setShowForm(false);
    setEditingId(null);
    setForm(emptyPlan);
  };

  const handleDelete = (
    plan: HostingPlan
  ) => {
    const confirmed =
      window.confirm(
        `Delete "${plan.name}"?\n\nThis removes the plan from the Avelixa hosting catalogue.`
      );

    if (!confirmed) {
      return;
    }

    setPlans((current) =>
      current.filter(
        (item) => item.id !== plan.id
      )
    );

    setSuccess(
      'Hosting plan removed from the catalogue.'
    );

    setError(null);
  };

  const toggleActive = (
    plan: HostingPlan
  ) => {
    setPlans((current) =>
      current.map((item) =>
        item.id === plan.id
          ? {
              ...item,
              active: !item.active,
            }
          : item
      )
    );

    setSuccess(
      plan.active
        ? 'Hosting plan deactivated.'
        : 'Hosting plan activated.'
    );

    setError(null);
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-cyan-500/20 bg-cyan-500/10">
              <Server className="h-6 w-6 text-cyan-300" />
            </div>

            <div>
              <h1 className="text-2xl font-bold text-white">
                Hosting
              </h1>

              <p className="mt-1 text-sm text-gray-400">
                Manage hosting services that can be
                attached to Avelixa service packages.
              </p>
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={openCreateForm}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-accent-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-accent-500"
        >
          <Plus className="h-4 w-4" />
          Add Hosting Plan
        </button>
      </div>

      {error && (
        <div className="flex items-start gap-3 rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm leading-6 text-red-300">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {success && (
        <div className="flex items-start gap-3 rounded-2xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-sm leading-6 text-emerald-300">
          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{success}</span>
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <div className="rounded-2xl border border-cyan-500/10 bg-cyan-500/5 p-5">
          <div className="flex items-center gap-3">
            <Server className="h-5 w-5 text-cyan-300" />

            <span className="text-xs font-bold uppercase tracking-widest text-gray-500">
              Hosting Plans
            </span>
          </div>

          <div className="mt-3 text-2xl font-semibold text-white">
            {plans.length}
          </div>
        </div>

        <div className="rounded-2xl border border-emerald-500/10 bg-emerald-500/5 p-5">
          <div className="flex items-center gap-3">
            <CheckCircle2 className="h-5 w-5 text-emerald-300" />

            <span className="text-xs font-bold uppercase tracking-widest text-gray-500">
              Active Plans
            </span>
          </div>

          <div className="mt-3 text-2xl font-semibold text-white">
            {activePlans}
          </div>
        </div>

        <div className="rounded-2xl border border-purple-500/10 bg-purple-500/5 p-5">
          <div className="flex items-center gap-3">
            <Globe2 className="h-5 w-5 text-purple-300" />

            <span className="text-xs font-bold uppercase tracking-widest text-gray-500">
              Recurring Service
            </span>
          </div>

          <div className="mt-3 text-sm font-semibold text-white">
            Subscription eligible
          </div>
        </div>
      </div>

      <section className="overflow-hidden rounded-2xl border border-ink-800/50 bg-ink-950/70">
        <div className="border-b border-ink-800/50 p-6">
          <div className="flex items-center gap-3">
            <Server className="h-5 w-5 text-accent-500" />

            <h2 className="text-lg font-semibold text-white">
              Hosting Catalogue
            </h2>
          </div>

          <p className="mt-2 text-sm text-gray-500">
            These plans form the commercial hosting
            options available when building Avelixa
            service packages and recurring services.
          </p>
        </div>

        <div className="grid gap-5 p-6 lg:grid-cols-3">
          {plans.map((plan) => (
            <div
              key={plan.id}
              className={`rounded-2xl border p-5 ${
                plan.active
                  ? 'border-ink-800/60 bg-white/[0.02]'
                  : 'border-ink-800/30 bg-black/10 opacity-60'
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-cyan-500/20 bg-cyan-500/10">
                  <Server className="h-5 w-5 text-cyan-300" />
                </div>

                <span
                  className={`rounded-full border px-2.5 py-1 text-[9px] font-bold uppercase tracking-wider ${
                    plan.active
                      ? 'border-emerald-500/20 bg-emerald-500/10 text-emerald-300'
                      : 'border-gray-500/20 bg-gray-500/10 text-gray-400'
                  }`}
                >
                  {plan.active
                    ? 'Active'
                    : 'Inactive'}
                </span>
              </div>

              <h3 className="mt-5 text-lg font-semibold text-white">
                {plan.name}
              </h3>

              <p className="mt-2 min-h-[72px] text-sm leading-6 text-gray-500">
                {plan.description}
              </p>

              <div className="mt-5">
                <span className="text-2xl font-bold text-white">
                  {formatCurrency(
                    plan.price
                  )}
                </span>

                <span className="ml-1 text-xs text-gray-500">
                  /{plan.billingCycle ===
                  'yearly'
                    ? 'year'
                    : 'month'}
                </span>
              </div>

              <div className="mt-5 space-y-3 border-t border-ink-800/50 pt-5">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-gray-500">
                    Storage
                  </span>

                  <span className="font-medium text-gray-300">
                    {plan.storage}
                  </span>
                </div>

                <div className="flex items-center justify-between text-xs">
                  <span className="text-gray-500">
                    Bandwidth
                  </span>

                  <span className="font-medium text-gray-300">
                    {plan.bandwidth}
                  </span>
                </div>

                <div className="flex items-center justify-between text-xs">
                  <span className="text-gray-500">
                    SSL
                  </span>

                  <span className="font-medium text-emerald-300">
                    {plan.ssl
                      ? 'Included'
                      : 'Not included'}
                  </span>
                </div>

                <div className="flex items-center justify-between text-xs">
                  <span className="text-gray-500">
                    Backups
                  </span>

                  <span className="font-medium text-emerald-300">
                    {plan.backups
                      ? 'Included'
                      : 'Not included'}
                  </span>
                </div>

                <div className="flex items-center justify-between gap-4 text-xs">
                  <span className="text-gray-500">
                    Support
                  </span>

                  <span className="text-right font-medium text-gray-300">
                    {plan.support}
                  </span>
                </div>
              </div>

              <div className="mt-6 flex items-center gap-2">
                <button
                  type="button"
                  onClick={() =>
                    openEditForm(plan)
                  }
                  className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl border border-ink-800/60 bg-white/5 px-3 py-2.5 text-xs font-semibold text-gray-300 transition-colors hover:bg-white/10 hover:text-white"
                >
                  <Pencil className="h-3.5 w-3.5" />
                  Edit
                </button>

                <button
                  type="button"
                  onClick={() =>
                    toggleActive(plan)
                  }
                  className="rounded-xl border border-ink-800/60 bg-white/5 px-3 py-2.5 text-xs font-semibold text-gray-400 transition-colors hover:bg-white/10 hover:text-white"
                >
                  {plan.active
                    ? 'Disable'
                    : 'Activate'}
                </button>

                <button
                  type="button"
                  onClick={() =>
                    handleDelete(plan)
                  }
                  className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-red-500/20 bg-red-500/5 text-red-400 transition-colors hover:bg-red-500/10"
                  title="Delete hosting plan"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
        </div>

        {plans.length === 0 && (
          <div className="p-10 text-center">
            <Server className="mx-auto h-8 w-8 text-gray-600" />

            <p className="mt-3 text-sm text-gray-400">
              No hosting plans have been added yet.
            </p>
          </div>
        )}
      </section>

      <div className="rounded-2xl border border-cyan-500/20 bg-cyan-500/5 p-5">
        <div className="flex items-start gap-3">
          <Zap className="mt-0.5 h-5 w-5 shrink-0 text-cyan-300" />

          <div>
            <h3 className="text-sm font-semibold text-white">
              Recurring-service foundation
            </h3>

            <p className="mt-1 text-sm leading-6 text-gray-400">
              Hosting is intentionally treated as a
              recurring service. The catalogue defines
              the commercial offering now; subscription,
              renewal tracking, automated reminders and
              recurring billing will be connected in the
              later Phase A steps.
            </p>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-purple-500/20 bg-purple-500/5 p-5">
        <div className="flex items-start gap-3">
          <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-purple-300" />

          <div>
            <h3 className="text-sm font-semibold text-white">
              Avelixa commercial control
            </h3>

            <p className="mt-1 text-sm leading-6 text-gray-400">
              Hosting plans are controlled by Avelixa
              rather than by Connectors. Connectors
              identify opportunities; Avelixa determines
              the appropriate technical solution and
              commercial package.
            </p>
          </div>
        </div>
      </div>

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
          <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-ink-800/60 bg-ink-950 p-6 shadow-2xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-cyan-500/20 bg-cyan-500/10">
                    <Server className="h-5 w-5 text-cyan-300" />
                  </div>

                  <div>
                    <h2 className="text-lg font-semibold text-white">
                      {editingId !== null
                        ? 'Edit Hosting Plan'
                        : 'Add Hosting Plan'}
                    </h2>

                    <p className="mt-1 text-xs text-gray-500">
                      Define the commercial hosting
                      service offered by Avelixa.
                    </p>
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={closeForm}
                className="inline-flex h-9 w-9 items-center justify-center rounded-xl text-gray-500 transition-colors hover:bg-white/5 hover:text-white"
                aria-label="Close form"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form
              onSubmit={handleSave}
              className="mt-6 space-y-5"
            >
              <div>
                <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-gray-500">
                  Plan Name
                </label>

                <input
                  type="text"
                  value={form.name}
                  onChange={(event) =>
                    setForm({
                      ...form,
                      name: event.target.value,
                    })
                  }
                  placeholder="Avelixa Business Hosting"
                  className="w-full rounded-xl border border-ink-800/60 bg-white/5 px-4 py-3 text-sm text-white outline-none placeholder:text-gray-700 focus:border-accent-500/40"
                />
              </div>

              <div>
                <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-gray-500">
                  Description
                </label>

                <textarea
                  value={form.description}
                  onChange={(event) =>
                    setForm({
                      ...form,
                      description:
                        event.target.value,
                    })
                  }
                  rows={3}
                  placeholder="Describe who this hosting plan is designed for."
                  className="w-full resize-none rounded-xl border border-ink-800/60 bg-white/5 px-4 py-3 text-sm text-white outline-none placeholder:text-gray-700 focus:border-accent-500/40"
                />
              </div>

              <div className="grid gap-5 md:grid-cols-2">
                <div>
                  <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-gray-500">
                    Price (KSh)
                  </label>

                  <input
                    type="number"
                    min="1"
                    value={form.price || ''}
                    onChange={(event) =>
                      setForm({
                        ...form,
                        price:
                          Number(
                            event.target.value
                          ) || 0,
                      })
                    }
                    placeholder="6500"
                    className="w-full rounded-xl border border-ink-800/60 bg-white/5 px-4 py-3 text-sm text-white outline-none placeholder:text-gray-700 focus:border-accent-500/40"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-gray-500">
                    Billing Cycle
                  </label>

                  <select
                    value={
                      form.billingCycle
                    }
                    onChange={(event) =>
                      setForm({
                        ...form,
                        billingCycle:
                          event.target
                            .value as HostingPlan['billingCycle'],
                      })
                    }
                    className="w-full rounded-xl border border-ink-800/60 bg-white/5 px-4 py-3 text-sm text-white outline-none focus:border-accent-500/40"
                  >
                    <option
                      value="yearly"
                      className="bg-ink-950"
                    >
                      Yearly
                    </option>

                    <option
                      value="monthly"
                      className="bg-ink-950"
                    >
                      Monthly
                    </option>
                  </select>
                </div>
              </div>

              <div className="grid gap-5 md:grid-cols-2">
                <div>
                  <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-gray-500">
                    Storage
                  </label>

                  <input
                    type="text"
                    value={form.storage}
                    onChange={(event) =>
                      setForm({
                        ...form,
                        storage:
                          event.target.value,
                      })
                    }
                    placeholder="25 GB"
                    className="w-full rounded-xl border border-ink-800/60 bg-white/5 px-4 py-3 text-sm text-white outline-none placeholder:text-gray-700 focus:border-accent-500/40"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-gray-500">
                    Bandwidth
                  </label>

                  <input
                    type="text"
                    value={form.bandwidth}
                    onChange={(event) =>
                      setForm({
                        ...form,
                        bandwidth:
                          event.target.value,
                      })
                    }
                    placeholder="High"
                    className="w-full rounded-xl border border-ink-800/60 bg-white/5 px-4 py-3 text-sm text-white outline-none placeholder:text-gray-700 focus:border-accent-500/40"
                  />
                </div>
              </div>

              <div>
                <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-gray-500">
                  Support
                </label>

                <input
                  type="text"
                  value={form.support}
                  onChange={(event) =>
                    setForm({
                      ...form,
                      support:
                        event.target.value,
                    })
                  }
                  placeholder="Priority support"
                  className="w-full rounded-xl border border-ink-800/60 bg-white/5 px-4 py-3 text-sm text-white outline-none placeholder:text-gray-700 focus:border-accent-500/40"
                />
              </div>

              <div className="grid gap-3 md:grid-cols-3">
                <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-ink-800/60 bg-white/5 p-4">
                  <input
                    type="checkbox"
                    checked={form.ssl}
                    onChange={(event) =>
                      setForm({
                        ...form,
                        ssl:
                          event.target.checked,
                      })
                    }
                    className="h-4 w-4 accent-accent-500"
                  />

                  <span className="text-sm text-gray-300">
                    SSL included
                  </span>
                </label>

                <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-ink-800/60 bg-white/5 p-4">
                  <input
                    type="checkbox"
                    checked={form.backups}
                    onChange={(event) =>
                      setForm({
                        ...form,
                        backups:
                          event.target.checked,
                      })
                    }
                    className="h-4 w-4 accent-accent-500"
                  />

                  <span className="text-sm text-gray-300">
                    Backups included
                  </span>
                </label>

                <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-ink-800/60 bg-white/5 p-4">
                  <input
                    type="checkbox"
                    checked={form.active}
                    onChange={(event) =>
                      setForm({
                        ...form,
                        active:
                          event.target.checked,
                      })
                    }
                    className="h-4 w-4 accent-accent-500"
                  />

                  <span className="text-sm text-gray-300">
                    Active plan
                  </span>
                </label>
              </div>

              <div className="flex justify-end gap-3 border-t border-ink-800/50 pt-5">
                <button
                  type="button"
                  onClick={closeForm}
                  className="rounded-xl border border-ink-800/60 bg-white/5 px-4 py-2.5 text-sm font-medium text-gray-400 transition-colors hover:bg-white/10 hover:text-white"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="inline-flex items-center gap-2 rounded-xl bg-accent-600 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-accent-500"
                >
                  <CheckCircle2 className="h-4 w-4" />

                  {editingId !== null
                    ? 'Save Changes'
                    : 'Create Plan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

