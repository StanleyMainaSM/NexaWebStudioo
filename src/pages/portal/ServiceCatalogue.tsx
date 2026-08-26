import { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  Briefcase,
  CheckCircle2,
  ChevronDown,
  Edit3,
  Filter,
  Loader2,
  Plus,
  RefreshCw,
  Search,
  ToggleLeft,
  ToggleRight,
  Trash2,
  X,
} from 'lucide-react';
import { supabase } from '../../lib/supabase';

type BillingType =
  | 'one_time'
  | 'recurring'
  | 'usage'
  | 'custom';

interface Service {
  id: string;
  slug: string;
  name: string;
  category: string;
  description: string | null;
  default_price: number | null;
  min_price: number | null;
  max_price: number | null;
  currency: string;
  billing_type: BillingType;
  commission_eligible: boolean;
  commission_rate: number | null;
  is_active: boolean;
  sort_order: number;
  created_at: string | null;
  updated_at: string | null;
}

interface ServiceForm {
  name: string;
  slug: string;
  category: string;
  description: string;
  default_price: string;
  min_price: string;
  max_price: string;
  currency: string;
  billing_type: BillingType;
  commission_eligible: boolean;
  commission_rate: string;
  is_active: boolean;
  sort_order: string;
}

const EMPTY_FORM: ServiceForm = {
  name: '',
  slug: '',
  category: '',
  description: '',
  default_price: '',
  min_price: '',
  max_price: '',
  currency: 'KES',
  billing_type: 'one_time',
  commission_eligible: false,
  commission_rate: '20',
  is_active: true,
  sort_order: '0',
};

function getErrorMessage(error: unknown) {
  if (!error) {
    return 'Unknown error.';
  }

  if (
    typeof error === 'object' &&
    error !== null
  ) {
    const value = error as {
      message?: string;
      details?: string;
      hint?: string;
      code?: string;
    };

    const parts = [
      value.message,
      value.details,
      value.hint
        ? `Hint: ${value.hint}`
        : undefined,
      value.code
        ? `Code: ${value.code}`
        : undefined,
    ].filter(Boolean);

    if (parts.length > 0) {
      return parts.join(' • ');
    }
  }

  return String(error);
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function formatMoney(
  amount: number | null,
  currency: string
) {
  if (amount === null || Number.isNaN(amount)) {
    return 'Custom';
  }

  return `${currency} ${amount.toLocaleString(
    'en-KE',
    {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }
  )}`;
}

function formatBillingType(
  billingType: BillingType
) {
  switch (billingType) {
    case 'one_time':
      return 'One-time';
    case 'recurring':
      return 'Recurring';
    case 'usage':
      return 'Usage';
    case 'custom':
      return 'Custom';
    default:
      return billingType;
  }
}

function formFromService(
  service: Service
): ServiceForm {
  return {
    name: service.name,
    slug: service.slug,
    category: service.category,
    description: service.description || '',
    default_price:
      service.default_price === null
        ? ''
        : String(service.default_price),
    min_price:
      service.min_price === null
        ? ''
        : String(service.min_price),
    max_price:
      service.max_price === null
        ? ''
        : String(service.max_price),
    currency: service.currency || 'KES',
    billing_type: service.billing_type,
    commission_eligible:
      service.commission_eligible,
    commission_rate:
      service.commission_rate === null
        ? ''
        : String(service.commission_rate),
    is_active: service.is_active,
    sort_order: String(service.sort_order),
  };
}

function formToPayload(form: ServiceForm) {
  const defaultPrice =
    form.default_price.trim() === ''
      ? null
      : Number(form.default_price);

  const minPrice =
    form.min_price.trim() === ''
      ? null
      : Number(form.min_price);

  const maxPrice =
    form.max_price.trim() === ''
      ? null
      : Number(form.max_price);

  const commissionRate =
    form.commission_rate.trim() === ''
      ? null
      : Number(form.commission_rate);

  if (
    defaultPrice !== null &&
    (!Number.isFinite(defaultPrice) ||
      defaultPrice < 0)
  ) {
    throw new Error(
      'Default price must be a valid non-negative number.'
    );
  }

  if (
    minPrice !== null &&
    (!Number.isFinite(minPrice) ||
      minPrice < 0)
  ) {
    throw new Error(
      'Minimum price must be a valid non-negative number.'
    );
  }

  if (
    maxPrice !== null &&
    (!Number.isFinite(maxPrice) ||
      maxPrice < 0)
  ) {
    throw new Error(
      'Maximum price must be a valid non-negative number.'
    );
  }

  if (
    minPrice !== null &&
    maxPrice !== null &&
    minPrice > maxPrice
  ) {
    throw new Error(
      'Minimum price cannot be greater than maximum price.'
    );
  }

  if (
    commissionRate !== null &&
    (!Number.isFinite(commissionRate) ||
      commissionRate < 0 ||
      commissionRate > 100)
  ) {
    throw new Error(
      'Commission rate must be between 0 and 100.'
    );
  }

  const sortOrder = Number(
    form.sort_order
  );

  if (
    !Number.isFinite(sortOrder) ||
    !Number.isInteger(sortOrder)
  ) {
    throw new Error(
      'Sort order must be a whole number.'
    );
  }

  return {
    slug: slugify(form.slug || form.name),
    name: form.name.trim(),
    category: form.category.trim(),
    description:
      form.description.trim() || null,
    default_price: defaultPrice,
    min_price: minPrice,
    max_price: maxPrice,
    currency:
      form.currency.trim().toUpperCase() ||
      'KES',
    billing_type: form.billing_type,
    commission_eligible:
      form.commission_eligible,
    commission_rate:
      form.commission_eligible
        ? commissionRate ?? 20
        : null,
    is_active: form.is_active,
    sort_order: sortOrder,
  };
}

export default function ServiceCatalogue() {
  const [services, setServices] =
    useState<Service[]>([]);

  const [loading, setLoading] =
    useState(true);

  const [refreshing, setRefreshing] =
    useState(false);

  const [saving, setSaving] =
    useState(false);

  const [deletingId, setDeletingId] =
    useState<string | null>(null);

  const [editingService, setEditingService] =
    useState<Service | null>(null);

  const [showForm, setShowForm] =
    useState(false);

  const [form, setForm] =
    useState<ServiceForm>(EMPTY_FORM);

  const [search, setSearch] =
    useState('');

  const [categoryFilter, setCategoryFilter] =
    useState('all');

  const [billingFilter, setBillingFilter] =
    useState('all');

  const [activeFilter, setActiveFilter] =
    useState<
      'all' | 'active' | 'inactive'
    >('all');

  const [error, setError] =
    useState<string | null>(null);

  const [success, setSuccess] =
    useState<string | null>(null);

  const loadServices = async (
    showLoading = true
  ) => {
    if (showLoading) {
      setLoading(true);
    }

    setError(null);

    try {
      const { data, error: queryError } =
        await supabase
          .from('service_catalogue')
          .select(
            `
              id,
              slug,
              name,
              category,
              description,
              default_price,
              min_price,
              max_price,
              currency,
              billing_type,
              commission_eligible,
              commission_rate,
              is_active,
              sort_order,
              created_at,
              updated_at
            `
          )
          .order('sort_order', {
            ascending: true,
          })
          .order('name', {
            ascending: true,
          });

      if (queryError) {
        throw queryError;
      }

      setServices(
        (data || []) as Service[]
      );
    } catch (err) {
      console.error(
        'Service catalogue could not be loaded:',
        err
      );

      setError(
        `Service catalogue could not be loaded: ${getErrorMessage(
          err
        )}`
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    void loadServices();
  }, []);

  const categories = useMemo(() => {
    return Array.from(
      new Set(
        services
          .map((service) =>
            service.category.trim()
          )
          .filter(Boolean)
      )
    ).sort((a, b) =>
      a.localeCompare(b)
    );
  }, [services]);

  const filteredServices = useMemo(() => {
    const normalizedSearch =
      search.trim().toLowerCase();

    return services.filter((service) => {
      const matchesSearch =
        !normalizedSearch ||
        service.name
          .toLowerCase()
          .includes(normalizedSearch) ||
        service.slug
          .toLowerCase()
          .includes(normalizedSearch) ||
        service.category
          .toLowerCase()
          .includes(normalizedSearch) ||
        (service.description || '')
          .toLowerCase()
          .includes(normalizedSearch);

      const matchesCategory =
        categoryFilter === 'all' ||
        service.category ===
          categoryFilter;

      const matchesBilling =
        billingFilter === 'all' ||
        service.billing_type ===
          billingFilter;

      const matchesActive =
        activeFilter === 'all' ||
        (activeFilter === 'active' &&
          service.is_active) ||
        (activeFilter === 'inactive' &&
          !service.is_active);

      return (
        matchesSearch &&
        matchesCategory &&
        matchesBilling &&
        matchesActive
      );
    });
  }, [
    services,
    search,
    categoryFilter,
    billingFilter,
    activeFilter,
  ]);

  const activeCount = services.filter(
    (service) => service.is_active
  ).length;

  const recurringCount =
    services.filter(
      (service) =>
        service.billing_type ===
        'recurring'
    ).length;

  const commissionEligibleCount =
    services.filter(
      (service) =>
        service.commission_eligible
    ).length;

  const openCreateForm = () => {
    setEditingService(null);
    setForm(EMPTY_FORM);
    setError(null);
    setSuccess(null);
    setShowForm(true);
  };

  const openEditForm = (
    service: Service
  ) => {
    setEditingService(service);
    setForm(formFromService(service));
    setError(null);
    setSuccess(null);
    setShowForm(true);
  };

  const closeForm = () => {
    if (saving) {
      return;
    }

    setShowForm(false);
    setEditingService(null);
    setForm(EMPTY_FORM);
  };

  const handleSave = async (
    event: React.FormEvent
  ) => {
    event.preventDefault();

    if (!form.name.trim()) {
      setError(
        'Service name is required.'
      );
      return;
    }

    if (!form.category.trim()) {
      setError(
        'Service category is required.'
      );
      return;
    }

    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      const payload =
        formToPayload(form);

      if (!payload.slug) {
        throw new Error(
          'A valid service slug could not be generated.'
        );
      }

      if (editingService) {
        const { error: updateError } =
          await supabase
            .from('service_catalogue')
            .update(payload)
            .eq('id', editingService.id);

        if (updateError) {
          throw updateError;
        }

        setSuccess(
          `${payload.name} was updated successfully.`
        );
      } else {
        const { error: insertError } =
          await supabase
            .from('service_catalogue')
            .insert(payload);

        if (insertError) {
          throw insertError;
        }

        setSuccess(
          `${payload.name} was added to the service catalogue.`
        );
      }

      closeForm();
      await loadServices(false);
    } catch (err) {
      console.error(
        'Service catalogue save failed:',
        err
      );

      setError(
        `Service could not be saved: ${getErrorMessage(
          err
        )}`
      );
    } finally {
      setSaving(false);
    }
  };

  const handleToggleActive = async (
    service: Service
  ) => {
    setError(null);
    setSuccess(null);

    try {
      const { error: updateError } =
        await supabase
          .from('service_catalogue')
          .update({
            is_active:
              !service.is_active,
          })
          .eq('id', service.id);

      if (updateError) {
        throw updateError;
      }

      setSuccess(
        `${service.name} is now ${
          service.is_active
            ? 'inactive'
            : 'active'
        }.`
      );

      await loadServices(false);
    } catch (err) {
      console.error(
        'Service activation change failed:',
        err
      );

      setError(
        `Service status could not be changed: ${getErrorMessage(
          err
        )}`
      );
    }
  };

  const handleDelete = async (
    service: Service
  ) => {
    const confirmed =
      window.confirm(
        `Delete "${service.name}" from the service catalogue?\n\nIf this service is already referenced by packages, quotes, or recurring services, the database will protect those relationships and the deletion will fail.`
      );

    if (!confirmed) {
      return;
    }

    setDeletingId(service.id);
    setError(null);
    setSuccess(null);

    try {
      const { error: deleteError } =
        await supabase
          .from('service_catalogue')
          .delete()
          .eq('id', service.id);

      if (deleteError) {
        throw deleteError;
      }

      setSuccess(
        `${service.name} was removed from the service catalogue.`
      );

      await loadServices(false);
    } catch (err) {
      console.error(
        'Service deletion failed:',
        err
      );

      setError(
        `Service could not be deleted. It may already be used by another Avelixa workflow: ${getErrorMessage(
          err
        )}`
      );
    } finally {
      setDeletingId(null);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    setError(null);
    await loadServices(false);
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-accent-500/20 bg-accent-500/10">
              <Briefcase className="h-6 w-6 text-accent-400" />
            </div>

            <div>
              <div className="text-[10px] font-bold uppercase tracking-[0.25em] text-accent-500">
                Monetization Foundation
              </div>

              <h1 className="mt-1 text-2xl font-bold text-white">
                Service Catalogue
              </h1>

              <p className="mt-1 text-sm leading-6 text-gray-400">
                Manage the source-of-truth services
                that power Avelixa packages, quotes,
                projects, subscriptions and recurring
                billing.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handleRefresh}
            disabled={refreshing}
            className="inline-flex items-center gap-2 rounded-xl border border-ink-800/60 bg-white/5 px-4 py-2.5 text-sm font-medium text-gray-300 transition-colors hover:bg-white/10 hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
          >
            <RefreshCw
              className={`h-4 w-4 ${
                refreshing
                  ? 'animate-spin'
                  : ''
              }`}
            />
            Refresh
          </button>

          <button
            type="button"
            onClick={openCreateForm}
            className="inline-flex items-center gap-2 rounded-xl bg-accent-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-accent-500"
          >
            <Plus className="h-4 w-4" />
            Add Service
          </button>
        </div>
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

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <div className="rounded-2xl border border-accent-500/10 bg-accent-500/5 p-5">
          <div className="text-xs uppercase tracking-widest text-gray-500">
            Total Services
          </div>
          <div className="mt-2 text-2xl font-semibold text-white">
            {services.length}
          </div>
        </div>

        <div className="rounded-2xl border border-emerald-500/10 bg-emerald-500/5 p-5">
          <div className="text-xs uppercase tracking-widest text-gray-500">
            Active
          </div>
          <div className="mt-2 text-2xl font-semibold text-white">
            {activeCount}
          </div>
        </div>

        <div className="rounded-2xl border border-blue-500/10 bg-blue-500/5 p-5">
          <div className="text-xs uppercase tracking-widest text-gray-500">
            Recurring
          </div>
          <div className="mt-2 text-2xl font-semibold text-white">
            {recurringCount}
          </div>
        </div>

        <div className="rounded-2xl border border-purple-500/10 bg-purple-500/5 p-5">
          <div className="text-xs uppercase tracking-widest text-gray-500">
            Commission Eligible
          </div>
          <div className="mt-2 text-2xl font-semibold text-white">
            {commissionEligibleCount}
          </div>
        </div>
      </div>

      <section className="overflow-hidden rounded-2xl border border-ink-800/50 bg-ink-950/70">
        <div className="border-b border-ink-800/50 p-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center">
            <div className="relative min-w-0 flex-1">
              <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-600" />

              <input
                type="search"
                value={search}
                onChange={(event) =>
                  setSearch(
                    event.target.value
                  )
                }
                placeholder="Search services..."
                className="w-full rounded-xl border border-ink-800/60 bg-white/5 py-3 pl-11 pr-4 text-sm text-white outline-none placeholder:text-gray-600 focus:border-accent-500/40"
              />
            </div>

            <div className="flex flex-col gap-3 sm:flex-row">
              <div className="relative">
                <Filter className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-600" />

                <select
                  value={categoryFilter}
                  onChange={(event) =>
                    setCategoryFilter(
                      event.target.value
                    )
                  }
                  className="appearance-none rounded-xl border border-ink-800/60 bg-white/5 py-3 pl-9 pr-9 text-xs text-gray-300 outline-none focus:border-accent-500/40"
                >
                  <option
                    value="all"
                    className="bg-ink-950"
                  >
                    All categories
                  </option>

                  {categories.map(
                    (category) => (
                      <option
                        key={category}
                        value={category}
                        className="bg-ink-950"
                      >
                        {category}
                      </option>
                    )
                  )}
                </select>

                <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-600" />
              </div>

              <select
                value={billingFilter}
                onChange={(event) =>
                  setBillingFilter(
                    event.target.value
                  )
                }
                className="rounded-xl border border-ink-800/60 bg-white/5 px-3 py-3 text-xs text-gray-300 outline-none focus:border-accent-500/40"
              >
                <option
                  value="all"
                  className="bg-ink-950"
                >
                  All billing types
                </option>

                <option
                  value="one_time"
                  className="bg-ink-950"
                >
                  One-time
                </option>

                <option
                  value="recurring"
                  className="bg-ink-950"
                >
                  Recurring
                </option>

                <option
                  value="usage"
                  className="bg-ink-950"
                >
                  Usage
                </option>

                <option
                  value="custom"
                  className="bg-ink-950"
                >
                  Custom
                </option>
              </select>

              <select
                value={activeFilter}
                onChange={(event) =>
                  setActiveFilter(
                    event.target.value as
                      | 'all'
                      | 'active'
                      | 'inactive'
                  )
                }
                className="rounded-xl border border-ink-800/60 bg-white/5 px-3 py-3 text-xs text-gray-300 outline-none focus:border-accent-500/40"
              >
                <option
                  value="all"
                  className="bg-ink-950"
                >
                  All statuses
                </option>

                <option
                  value="active"
                  className="bg-ink-950"
                >
                  Active
                </option>

                <option
                  value="inactive"
                  className="bg-ink-950"
                >
                  Inactive
                </option>
              </select>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="flex min-h-[320px] items-center justify-center">
            <div className="flex items-center gap-3 text-sm text-gray-400">
              <Loader2 className="h-5 w-5 animate-spin text-accent-500" />
              Loading service catalogue...
            </div>
          </div>
        ) : filteredServices.length === 0 ? (
          <div className="p-12 text-center">
            <Briefcase className="mx-auto h-9 w-9 text-gray-600" />

            <h2 className="mt-4 text-sm font-semibold text-white">
              No matching services
            </h2>

            <p className="mt-2 text-sm text-gray-500">
              Adjust the filters or add a new
              service to the catalogue.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1100px]">
              <thead>
                <tr className="border-b border-ink-800/50 text-left">
                  <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-gray-600">
                    Service
                  </th>

                  <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-gray-600">
                    Category
                  </th>

                  <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-gray-600">
                    Pricing
                  </th>

                  <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-gray-600">
                    Billing
                  </th>

                  <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-gray-600">
                    Commission
                  </th>

                  <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-gray-600">
                    Status
                  </th>

                  <th className="px-6 py-4 text-right text-[10px] font-bold uppercase tracking-widest text-gray-600">
                    Actions
                  </th>
                </tr>
              </thead>

              <tbody>
                {filteredServices.map(
                  (service) => {
                    const deleting =
                      deletingId ===
                      service.id;

                    return (
                      <tr
                        key={service.id}
                        className="border-b border-ink-800/30 last:border-0 hover:bg-white/[0.02]"
                      >
                        <td className="px-6 py-5">
                          <div className="flex items-start gap-3">
                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-accent-500/20 bg-accent-500/10">
                              <Briefcase className="h-4 w-4 text-accent-400" />
                            </div>

                            <div className="min-w-0">
                              <div className="font-medium text-white">
                                {service.name}
                              </div>

                              <div className="mt-1 text-[11px] text-gray-600">
                                {service.slug}
                              </div>

                              {service.description && (
                                <div className="mt-2 max-w-[280px] text-xs leading-5 text-gray-500">
                                  {service.description}
                                </div>
                              )}
                            </div>
                          </div>
                        </td>

                        <td className="px-6 py-5">
                          <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-gray-400">
                            {service.category}
                          </span>
                        </td>

                        <td className="px-6 py-5">
                          <div className="text-sm text-white">
                            {service.default_price !==
                            null
                              ? formatMoney(
                                  service.default_price,
                                  service.currency
                                )
                              : service.min_price !==
                                    null &&
                                  service.max_price !==
                                    null
                                ? `${formatMoney(
                                    service.min_price,
                                    service.currency
                                  )} – ${formatMoney(
                                    service.max_price,
                                    service.currency
                                  )}`
                                : 'Custom pricing'}
                          </div>

                          {(service.min_price !==
                            null ||
                            service.max_price !==
                              null) && (
                            <div className="mt-1 text-[10px] text-gray-600">
                              Range configured
                            </div>
                          )}
                        </td>

                        <td className="px-6 py-5">
                          <span
                            className={`rounded-full border px-2.5 py-1 text-[10px] font-semibold ${
                              service.billing_type ===
                              'recurring'
                                ? 'border-blue-500/20 bg-blue-500/10 text-blue-300'
                                : 'border-white/10 bg-white/5 text-gray-400'
                            }`}
                          >
                            {formatBillingType(
                              service.billing_type
                            )}
                          </span>
                        </td>

                        <td className="px-6 py-5">
                          {service.commission_eligible ? (
                            <div className="text-xs text-emerald-400">
                              Eligible
                              <div className="mt-1 text-[10px] text-gray-600">
                                {service.commission_rate ??
                                  0}
                                %
                              </div>
                            </div>
                          ) : (
                            <span className="text-xs text-gray-600">
                              Not eligible
                            </span>
                          )}
                        </td>

                        <td className="px-6 py-5">
                          <span
                            className={`inline-flex items-center gap-1.5 text-xs ${
                              service.is_active
                                ? 'text-emerald-400'
                                : 'text-gray-600'
                            }`}
                          >
                            {service.is_active ? (
                              <CheckCircle2 className="h-3.5 w-3.5" />
                            ) : (
                              <ToggleLeft className="h-3.5 w-3.5" />
                            )}

                            {service.is_active
                              ? 'Active'
                              : 'Inactive'}
                          </span>
                        </td>

                        <td className="px-6 py-5">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              type="button"
                              onClick={() =>
                                void handleToggleActive(
                                  service
                                )
                              }
                              disabled={
                                deleting
                              }
                              title={
                                service.is_active
                                  ? 'Deactivate service'
                                  : 'Activate service'
                              }
                              className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-gray-400 transition-colors hover:bg-white/10 hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
                            >
                              {service.is_active ? (
                                <ToggleRight className="h-4 w-4" />
                              ) : (
                                <ToggleLeft className="h-4 w-4" />
                              )}
                            </button>

                            <button
                              type="button"
                              onClick={() =>
                                openEditForm(
                                  service
                                )
                              }
                              disabled={
                                deleting
                              }
                              title="Edit service"
                              className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-gray-400 transition-colors hover:bg-white/10 hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
                            >
                              <Edit3 className="h-4 w-4" />
                            </button>

                            <button
                              type="button"
                              onClick={() =>
                                void handleDelete(
                                  service
                                )
                              }
                              disabled={
                                deleting
                              }
                              title="Delete service"
                              className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-red-500/20 bg-red-500/5 text-red-400 transition-colors hover:bg-red-500/10 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                              {deleting ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <Trash2 className="h-4 w-4" />
                              )}
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  }
                )}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <div className="rounded-2xl border border-purple-500/20 bg-purple-500/5 p-5">
        <div className="flex items-start gap-3">
          <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-purple-300" />

          <div>
            <h3 className="text-sm font-semibold text-white">
              Catalogue is the monetization source of truth
            </h3>

            <p className="mt-1 text-sm leading-6 text-gray-400">
              Services managed here are the foundation
              for Avelixa packages, quotations,
              projects, recurring services and future
              automated billing. Deactivating a service
              removes it from public active-service
              access without destroying historical
              relationships.
            </p>
          </div>
        </div>
      </div>

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/70 p-4 backdrop-blur-sm">
          <div className="my-8 w-full max-w-3xl rounded-2xl border border-ink-800/60 bg-ink-950 shadow-2xl">
            <div className="flex items-start justify-between gap-4 border-b border-ink-800/50 p-6">
              <div>
                <div className="text-[10px] font-bold uppercase tracking-[0.25em] text-accent-500">
                  {editingService
                    ? 'Edit Catalogue Service'
                    : 'New Catalogue Service'}
                </div>

                <h2 className="mt-2 text-xl font-semibold text-white">
                  {editingService
                    ? editingService.name
                    : 'Add Service'}
                </h2>

                <p className="mt-1 text-sm text-gray-500">
                  Configure how Avelixa sells and
                  monetizes this service.
                </p>
              </div>

              <button
                type="button"
                onClick={closeForm}
                disabled={saving}
                className="inline-flex h-9 w-9 items-center justify-center rounded-xl text-gray-500 transition-colors hover:bg-white/5 hover:text-white disabled:opacity-50"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form
              onSubmit={handleSave}
              className="space-y-6 p-6"
            >
              <div className="grid gap-5 md:grid-cols-2">
                <div>
                  <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-gray-500">
                    Service Name
                  </label>

                  <input
                    type="text"
                    value={form.name}
                    onChange={(event) => {
                      const value =
                        event.target.value;

                      setForm((current) => ({
                        ...current,
                        name: value,
                        slug:
                          editingService
                            ? current.slug
                            : slugify(value),
                      }));
                    }}
                    placeholder="Website Hosting"
                    disabled={saving}
                    className="w-full rounded-xl border border-ink-800/60 bg-white/5 px-4 py-3 text-sm text-white outline-none placeholder:text-gray-700 focus:border-accent-500/40"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-gray-500">
                    Slug
                  </label>

                  <input
                    type="text"
                    value={form.slug}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        slug: slugify(
                          event.target.value
                        ),
                      }))
                    }
                    placeholder="website-hosting"
                    disabled={saving}
                    className="w-full rounded-xl border border-ink-800/60 bg-white/5 px-4 py-3 text-sm text-white outline-none placeholder:text-gray-700 focus:border-accent-500/40"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-gray-500">
                    Category
                  </label>

                  <input
                    type="text"
                    value={form.category}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        category:
                          event.target.value,
                      }))
                    }
                    placeholder="Hosting"
                    disabled={saving}
                    className="w-full rounded-xl border border-ink-800/60 bg-white/5 px-4 py-3 text-sm text-white outline-none placeholder:text-gray-700 focus:border-accent-500/40"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-gray-500">
                    Currency
                  </label>

                  <input
                    type="text"
                    value={form.currency}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        currency:
                          event.target.value.toUpperCase(),
                      }))
                    }
                    maxLength={3}
                    placeholder="KES"
                    disabled={saving}
                    className="w-full rounded-xl border border-ink-800/60 bg-white/5 px-4 py-3 text-sm text-white outline-none placeholder:text-gray-700 focus:border-accent-500/40"
                  />
                </div>
              </div>

              <div>
                <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-gray-500">
                  Description
                </label>

                <textarea
                  value={form.description}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      description:
                        event.target.value,
                    }))
                  }
                  rows={4}
                  placeholder="Describe what Avelixa delivers..."
                  disabled={saving}
                  className="w-full resize-none rounded-xl border border-ink-800/60 bg-white/5 px-4 py-3 text-sm leading-6 text-white outline-none placeholder:text-gray-700 focus:border-accent-500/40"
                />
              </div>

              <div className="rounded-2xl border border-ink-800/50 bg-white/[0.02] p-5">
                <div className="mb-4 text-xs font-semibold uppercase tracking-wider text-gray-500">
                  Pricing
                </div>

                <div className="grid gap-5 md:grid-cols-3">
                  <div>
                    <label className="mb-2 block text-xs text-gray-600">
                      Default Price
                    </label>

                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={
                        form.default_price
                      }
                      onChange={(event) =>
                        setForm((current) => ({
                          ...current,
                          default_price:
                            event.target.value,
                        }))
                      }
                      placeholder="15000"
                      disabled={saving}
                      className="w-full rounded-xl border border-ink-800/60 bg-white/5 px-4 py-3 text-sm text-white outline-none placeholder:text-gray-700 focus:border-accent-500/40"
                    />
                  </div>

                  <div>
                    <label className="mb-2 block text-xs text-gray-600">
                      Minimum Price
                    </label>

                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={form.min_price}
                      onChange={(event) =>
                        setForm((current) => ({
                          ...current,
                          min_price:
                            event.target.value,
                        }))
                      }
                      placeholder="15000"
                      disabled={saving}
                      className="w-full rounded-xl border border-ink-800/60 bg-white/5 px-4 py-3 text-sm text-white outline-none placeholder:text-gray-700 focus:border-accent-500/40"
                    />
                  </div>

                  <div>
                    <label className="mb-2 block text-xs text-gray-600">
                      Maximum Price
                    </label>

                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={form.max_price}
                      onChange={(event) =>
                        setForm((current) => ({
                          ...current,
                          max_price:
                            event.target.value,
                        }))
                      }
                      placeholder="35000"
                      disabled={saving}
                      className="w-full rounded-xl border border-ink-800/60 bg-white/5 px-4 py-3 text-sm text-white outline-none placeholder:text-gray-700 focus:border-accent-500/40"
                    />
                  </div>
                </div>

                <p className="mt-3 text-[11px] leading-5 text-gray-600">
                  Use a default price when the service
                  has a standard price. Use minimum and
                  maximum prices when Avelixa sells the
                  service within a range. Leave prices
                  blank for fully custom services.
                </p>
              </div>

              <div className="grid gap-5 md:grid-cols-2">
                <div>
                  <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-gray-500">
                    Billing Type
                  </label>

                  <select
                    value={form.billing_type}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        billing_type:
                          event.target.value as BillingType,
                      }))
                    }
                    disabled={saving}
                    className="w-full rounded-xl border border-ink-800/60 bg-white/5 px-4 py-3 text-sm text-white outline-none focus:border-accent-500/40"
                  >
                    <option
                      value="one_time"
                      className="bg-ink-950"
                    >
                      One-time
                    </option>

                    <option
                      value="recurring"
                      className="bg-ink-950"
                    >
                      Recurring
                    </option>

                    <option
                      value="usage"
                      className="bg-ink-950"
                    >
                      Usage
                    </option>

                    <option
                      value="custom"
                      className="bg-ink-950"
                    >
                      Custom
                    </option>
                  </select>
                </div>

                <div>
                  <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-gray-500">
                    Sort Order
                  </label>

                  <input
                    type="number"
                    step="1"
                    value={form.sort_order}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        sort_order:
                          event.target.value,
                      }))
                    }
                    disabled={saving}
                    className="w-full rounded-xl border border-ink-800/60 bg-white/5 px-4 py-3 text-sm text-white outline-none focus:border-accent-500/40"
                  />
                </div>
              </div>

              <div className="rounded-2xl border border-purple-500/10 bg-purple-500/5 p-5">
                <div className="flex flex-col gap-5 md:flex-row md:items-end">
                  <div className="flex-1">
                    <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-gray-500">
                      Connector Commission
                    </label>

                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        onClick={() =>
                          setForm(
                            (current) => ({
                              ...current,
                              commission_eligible:
                                !current.commission_eligible,
                            })
                          )
                        }
                        disabled={saving}
                        className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-xs font-medium text-gray-300 hover:bg-white/10 hover:text-white disabled:opacity-50"
                      >
                        {form.commission_eligible ? (
                          <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                        ) : (
                          <ToggleLeft className="h-4 w-4 text-gray-600" />
                        )}

                        {form.commission_eligible
                          ? 'Eligible'
                          : 'Not eligible'}
                      </button>

                      {form.commission_eligible && (
                        <input
                          type="number"
                          min="0"
                          max="100"
                          step="0.01"
                          value={
                            form.commission_rate
                          }
                          onChange={(event) =>
                            setForm(
                              (current) => ({
                                ...current,
                                commission_rate:
                                  event.target
                                    .value,
                              })
                            )
                          }
                          disabled={saving}
                          className="w-32 rounded-xl border border-ink-800/60 bg-white/5 px-4 py-2.5 text-sm text-white outline-none placeholder:text-gray-700 focus:border-accent-500/40"
                        />
                      )}
                    </div>

                    <p className="mt-3 text-[11px] leading-5 text-gray-600">
                      Commission eligibility is configured
                      per service. This supports the later
                      automated commission workflow.
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between rounded-2xl border border-ink-800/50 bg-white/[0.02] p-4">
                <div>
                  <div className="text-sm font-medium text-white">
                    Publicly active
                  </div>

                  <div className="mt-1 text-xs text-gray-600">
                    Active services are available to
                    public catalogue consumers.
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() =>
                    setForm((current) => ({
                      ...current,
                      is_active:
                        !current.is_active,
                    }))
                  }
                  disabled={saving}
                  className={`inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-xs font-medium ${
                    form.is_active
                      ? 'border-emerald-500/20 bg-emerald-500/10 text-emerald-300'
                      : 'border-white/10 bg-white/5 text-gray-500'
                  }`}
                >
                  {form.is_active ? (
                    <CheckCircle2 className="h-4 w-4" />
                  ) : (
                    <ToggleLeft className="h-4 w-4" />
                  )}

                  {form.is_active
                    ? 'Active'
                    : 'Inactive'}
                </button>
              </div>

              <div className="flex justify-end gap-3 border-t border-ink-800/50 pt-5">
                <button
                  type="button"
                  onClick={closeForm}
                  disabled={saving}
                  className="rounded-xl border border-ink-800/60 bg-white/5 px-4 py-2.5 text-sm font-medium text-gray-400 hover:bg-white/10 hover:text-white disabled:opacity-50"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={saving}
                  className="inline-flex items-center gap-2 rounded-xl bg-accent-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-accent-500 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {saving ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <CheckCircle2 className="h-4 w-4" />
                  )}

                  {saving
                    ? 'Saving...'
                    : editingService
                      ? 'Save Changes'
                      : 'Create Service'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}