import { useEffect, useMemo, useState } from 'react';
import { supabase } from '../../lib/supabase';
import {
  AlertTriangle,
  CheckCircle2,
  Loader2,
  Package,
  Plus,
  RefreshCw,
  Save,
  Trash2,
  X,
  Edit3,
  Eye,
  EyeOff,
  Layers3,
  CircleDollarSign,
} from 'lucide-react';

interface Service {
  id: string;
  name: string;
  description: string | null;
  category: string | null;
  price_type: string | null;
  base_price: number | null;
  is_active: boolean;
}

interface PackageService {
  id: string;
  package_id: string;
  service_id: string;
  quantity: number;
  service?: Service | null;
}

interface WebsitePackage {
  id: string;
  name: string;
  description: string | null;
  min_price: number | null;
  max_price: number | null;
  is_active: boolean;
  created_at: string;
  package_services?: PackageService[];
}

interface PackageForm {
  name: string;
  description: string;
  minPrice: string;
  maxPrice: string;
  isActive: boolean;
}

const emptyForm: PackageForm = {
  name: '',
  description: '',
  minPrice: '',
  maxPrice: '',
  isActive: true,
};

function formatCurrency(value: number | null) {
  if (value === null || Number.isNaN(value)) {
    return '—';
  }

  return `KSh ${value.toLocaleString('en-KE')}`;
}

function getErrorMessage(error: unknown) {
  if (!error) {
    return 'Unknown error.';
  }

  if (typeof error === 'object' && error !== null) {
    const value = error as {
      message?: string;
      details?: string;
      hint?: string;
      code?: string;
    };

    const parts = [
      value.message,
      value.details,
      value.hint ? `Hint: ${value.hint}` : undefined,
      value.code ? `Code: ${value.code}` : undefined,
    ].filter(Boolean);

    if (parts.length) {
      return parts.join(' • ');
    }
  }

  return String(error);
}

export default function WebsitePackages() {
  const [packages, setPackages] = useState<WebsitePackage[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [showForm, setShowForm] = useState(false);
  const [editingPackage, setEditingPackage] =
    useState<WebsitePackage | null>(null);

  const [form, setForm] = useState<PackageForm>(emptyForm);

  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const loadData = async (showRefresh = false) => {
    if (showRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    setError(null);

    try {
      const [
        packagesResult,
        packageServicesResult,
        servicesResult,
      ] = await Promise.all([
        supabase
          .from('packages')
          .select(
            'id,name,description,min_price,max_price,is_active,created_at'
          )
          .order('created_at', {
            ascending: true,
          }),

        supabase
          .from('package_services')
          .select(
            'id,package_id,service_id,quantity'
          ),

        supabase
          .from('service_catalogue')
          .select(
            'id,name,description,category,price_type,base_price,is_active'
          )
          .order('name', {
            ascending: true,
          }),
      ]);

      if (packagesResult.error) {
        throw packagesResult.error;
      }

      if (packageServicesResult.error) {
        throw packageServicesResult.error;
      }

      if (servicesResult.error) {
        throw servicesResult.error;
      }

      const packageRows =
        (packagesResult.data || []) as WebsitePackage[];

      const packageServiceRows =
        (packageServicesResult.data || []) as PackageService[];

      const serviceRows =
        (servicesResult.data || []) as Service[];

      const serviceMap = new Map(
        serviceRows.map((service) => [
          service.id,
          service,
        ])
      );

      const enrichedPackages =
        packageRows.map((pkg) => ({
          ...pkg,
          package_services:
            packageServiceRows
              .filter(
                (item) =>
                  item.package_id === pkg.id
              )
              .map((item) => ({
                ...item,
                service:
                  serviceMap.get(
                    item.service_id
                  ) || null,
              })),
        }));

      setPackages(enrichedPackages);
      setServices(serviceRows);
    } catch (err) {
      console.error(
        'Website packages could not be loaded:',
        err
      );

      setError(
        `Website packages could not be loaded: ${getErrorMessage(
          err
        )}`
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    void loadData();
  }, []);

  const activeServices = useMemo(
    () =>
      services.filter(
        (service) => service.is_active
      ),
    [services]
  );

  const activePackages = useMemo(
    () =>
      packages.filter(
        (pkg) => pkg.is_active
      ).length,
    [packages]
  );

  const totalIncludedServices = useMemo(
    () =>
      packages.reduce(
        (total, pkg) =>
          total +
          (pkg.package_services?.length || 0),
        0
      ),
    [packages]
  );

  const openCreateForm = () => {
    setEditingPackage(null);
    setForm(emptyForm);
    setError(null);
    setSuccess(null);
    setShowForm(true);
  };

  const openEditForm = (
    pkg: WebsitePackage
  ) => {
    setEditingPackage(pkg);

    setForm({
      name: pkg.name || '',
      description:
        pkg.description || '',
      minPrice:
        pkg.min_price === null
          ? ''
          : String(pkg.min_price),
      maxPrice:
        pkg.max_price === null
          ? ''
          : String(pkg.max_price),
      isActive: pkg.is_active,
    });

    setError(null);
    setSuccess(null);
    setShowForm(true);
  };

  const closeForm = () => {
    if (saving) {
      return;
    }

    setShowForm(false);
    setEditingPackage(null);
    setForm(emptyForm);
  };

  const handleSave = async (
    event: React.FormEvent
  ) => {
    event.preventDefault();

    const name = form.name.trim();

    if (!name) {
      setError(
        'Please enter a package name.'
      );
      return;
    }

    const minPrice =
      form.minPrice.trim() === ''
        ? null
        : Number(form.minPrice);

    const maxPrice =
      form.maxPrice.trim() === ''
        ? null
        : Number(form.maxPrice);

    if (
      minPrice !== null &&
      (!Number.isFinite(minPrice) ||
        minPrice < 0)
    ) {
      setError(
        'Minimum price must be a valid amount.'
      );
      return;
    }

    if (
      maxPrice !== null &&
      (!Number.isFinite(maxPrice) ||
        maxPrice < 0)
    ) {
      setError(
        'Maximum price must be a valid amount.'
      );
      return;
    }

    if (
      minPrice !== null &&
      maxPrice !== null &&
      maxPrice < minPrice
    ) {
      setError(
        'Maximum price cannot be lower than minimum price.'
      );
      return;
    }

    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      if (editingPackage) {
        const { error: updateError } =
          await supabase
            .from('packages')
            .update({
              name,
              description:
                form.description.trim() ||
                null,
              min_price: minPrice,
              max_price: maxPrice,
              is_active:
                form.isActive,
            })
            .eq(
              'id',
              editingPackage.id
            );

        if (updateError) {
          throw updateError;
        }

        setSuccess(
          'Website package updated successfully.'
        );
      } else {
        const { error: insertError } =
          await supabase
            .from('packages')
            .insert({
              name,
              description:
                form.description.trim() ||
                null,
              min_price: minPrice,
              max_price: maxPrice,
              is_active:
                form.isActive,
            });

        if (insertError) {
          throw insertError;
        }

        setSuccess(
          'Website package created successfully.'
        );
      }

      setShowForm(false);
      setEditingPackage(null);
      setForm(emptyForm);

      await loadData();
    } catch (err) {
      console.error(
        'Website package save failed:',
        err
      );

      setError(
        `Package could not be saved: ${getErrorMessage(
          err
        )}`
      );
    } finally {
      setSaving(false);
    }
  };

  const handleToggleStatus = async (
    pkg: WebsitePackage
  ) => {
    setError(null);
    setSuccess(null);

    try {
      const { error: updateError } =
        await supabase
          .from('packages')
          .update({
            is_active:
              !pkg.is_active,
          })
          .eq('id', pkg.id);

      if (updateError) {
        throw updateError;
      }

      setSuccess(
        `${pkg.name} is now ${
          !pkg.is_active
            ? 'active'
            : 'inactive'
        }.`
      );

      await loadData();
    } catch (err) {
      console.error(
        'Website package status update failed:',
        err
      );

      setError(
        `Package status could not be updated: ${getErrorMessage(
          err
        )}`
      );
    }
  };

  const handleDelete = async (
    pkg: WebsitePackage
  ) => {
    const confirmed =
      window.confirm(
        `Delete "${pkg.name}"?\n\nThis removes the package record. Existing projects or quotes that already reference this package may prevent deletion.`
      );

    if (!confirmed) {
      return;
    }

    setDeletingId(pkg.id);
    setError(null);
    setSuccess(null);

    try {
      const { error: deleteError } =
        await supabase
          .from('packages')
          .delete()
          .eq('id', pkg.id);

      if (deleteError) {
        throw deleteError;
      }

      setSuccess(
        'Website package deleted successfully.'
      );

      await loadData();
    } catch (err) {
      console.error(
        'Website package deletion failed:',
        err
      );

      setError(
        `Package could not be deleted: ${getErrorMessage(
          err
        )}`
      );
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-accent-500/20 bg-accent-500/10">
            <Package className="h-6 w-6 text-accent-400" />
          </div>

          <div>
            <h1 className="text-2xl font-bold text-white">
              Website Packages
            </h1>

            <p className="mt-1 text-sm text-gray-400">
              Build and manage the website
              packages Avelixa sells to clients.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() =>
              void loadData(true)
            }
            disabled={refreshing}
            className="inline-flex items-center gap-2 rounded-xl border border-ink-800/60 bg-white/5 px-4 py-2.5 text-sm font-medium text-gray-300 transition-colors hover:bg-white/10 hover:text-white disabled:opacity-50"
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
            New Package
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

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <div className="rounded-2xl border border-accent-500/10 bg-accent-500/5 p-5">
          <div className="flex items-center justify-between">
            <span className="text-xs uppercase tracking-widest text-gray-500">
              Total Packages
            </span>

            <Package className="h-4 w-4 text-accent-400" />
          </div>

          <div className="mt-2 text-2xl font-semibold text-white">
            {packages.length}
          </div>
        </div>

        <div className="rounded-2xl border border-emerald-500/10 bg-emerald-500/5 p-5">
          <div className="flex items-center justify-between">
            <span className="text-xs uppercase tracking-widest text-gray-500">
              Active Packages
            </span>

            <CheckCircle2 className="h-4 w-4 text-emerald-400" />
          </div>

          <div className="mt-2 text-2xl font-semibold text-white">
            {activePackages}
          </div>
        </div>

        <div className="rounded-2xl border border-purple-500/10 bg-purple-500/5 p-5">
          <div className="flex items-center justify-between">
            <span className="text-xs uppercase tracking-widest text-gray-500">
              Active Catalogue Services
            </span>

            <Layers3 className="h-4 w-4 text-purple-400" />
          </div>

          <div className="mt-2 text-2xl font-semibold text-white">
            {activeServices.length}
          </div>

          <div className="mt-1 text-xs text-gray-500">
            {totalIncludedServices}{' '}
            service assignments across packages
          </div>
        </div>
      </div>

      <section className="overflow-hidden rounded-2xl border border-ink-800/50 bg-ink-950/70">
        <div className="border-b border-ink-800/50 p-6">
          <div className="flex items-center gap-3">
            <Package className="h-5 w-5 text-accent-500" />

            <div>
              <h2 className="text-lg font-semibold text-white">
                Package Catalogue
              </h2>

              <p className="mt-1 text-sm text-gray-500">
                These packages form the commercial
                foundation for quotes and projects.
              </p>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="flex min-h-[280px] items-center justify-center">
            <div className="flex items-center gap-3 text-sm text-gray-400">
              <Loader2 className="h-5 w-5 animate-spin text-accent-500" />
              Loading packages...
            </div>
          </div>
        ) : packages.length === 0 ? (
          <div className="p-12 text-center">
            <Package className="mx-auto h-9 w-9 text-gray-600" />

            <p className="mt-4 text-sm text-gray-400">
              No website packages have been created yet.
            </p>

            <button
              type="button"
              onClick={openCreateForm}
              className="mt-5 inline-flex items-center gap-2 rounded-xl bg-accent-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-accent-500"
            >
              <Plus className="h-4 w-4" />
              Create First Package
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-5 p-6 lg:grid-cols-2">
            {packages.map((pkg) => {
              const packageServices =
                pkg.package_services || [];

              const isDeleting =
                deletingId === pkg.id;

              return (
                <article
                  key={pkg.id}
                  className="rounded-2xl border border-ink-800/60 bg-white/[0.02] p-6 transition-colors hover:border-accent-500/20"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-lg font-semibold text-white">
                          {pkg.name}
                        </h3>

                        <span
                          className={`inline-flex items-center rounded-full border px-2.5 py-1 text-[9px] font-bold uppercase tracking-wider ${
                            pkg.is_active
                              ? 'border-emerald-500/20 bg-emerald-500/10 text-emerald-300'
                              : 'border-gray-500/20 bg-gray-500/10 text-gray-400'
                          }`}
                        >
                          {pkg.is_active
                            ? 'Active'
                            : 'Inactive'}
                        </span>
                      </div>

                      <p className="mt-2 text-sm leading-6 text-gray-500">
                        {pkg.description ||
                          'No package description has been added.'}
                      </p>
                    </div>

                    <div className="flex shrink-0 items-center gap-1">
                      <button
                        type="button"
                        onClick={() =>
                          openEditForm(pkg)
                        }
                        className="inline-flex h-9 w-9 items-center justify-center rounded-xl text-gray-500 transition-colors hover:bg-white/5 hover:text-white"
                        title="Edit package"
                      >
                        <Edit3 className="h-4 w-4" />
                      </button>

                      <button
                        type="button"
                        onClick={() =>
                          void handleToggleStatus(
                            pkg
                          )
                        }
                        className="inline-flex h-9 w-9 items-center justify-center rounded-xl text-gray-500 transition-colors hover:bg-white/5 hover:text-white"
                        title={
                          pkg.is_active
                            ? 'Deactivate package'
                            : 'Activate package'
                        }
                      >
                        {pkg.is_active ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                      </button>

                      <button
                        type="button"
                        onClick={() =>
                          void handleDelete(pkg)
                        }
                        disabled={isDeleting}
                        className="inline-flex h-9 w-9 items-center justify-center rounded-xl text-red-400 transition-colors hover:bg-red-500/10 disabled:opacity-50"
                        title="Delete package"
                      >
                        {isDeleting ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Trash2 className="h-4 w-4" />
                        )}
                      </button>
                    </div>
                  </div>

                  <div className="mt-6 rounded-xl border border-ink-800/50 bg-black/10 p-4">
                    <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-gray-500">
                      <CircleDollarSign className="h-4 w-4 text-accent-400" />
                      Package Price
                    </div>

                    <div className="mt-2 text-xl font-semibold text-white">
                      {pkg.min_price !== null &&
                      pkg.max_price !== null
                        ? `${formatCurrency(
                            pkg.min_price
                          )} – ${formatCurrency(
                            pkg.max_price
                          )}`
                        : pkg.min_price !==
                          null
                        ? `${formatCurrency(
                            pkg.min_price
                          )}+`
                        : pkg.max_price !==
                          null
                        ? `Up to ${formatCurrency(
                            pkg.max_price
                          )}`
                        : 'Custom pricing'}
                    </div>
                  </div>

                  <div className="mt-5">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold uppercase tracking-widest text-gray-500">
                        Included Services
                      </span>

                      <span className="text-xs text-gray-600">
                        {packageServices.length}{' '}
                        {packageServices.length ===
                        1
                          ? 'service'
                          : 'services'}
                      </span>
                    </div>

                    {packageServices.length ===
                    0 ? (
                      <div className="mt-3 rounded-xl border border-dashed border-ink-800/60 px-4 py-4 text-xs text-gray-600">
                        No catalogue services assigned
                        yet.
                      </div>
                    ) : (
                      <div className="mt-3 flex flex-wrap gap-2">
                        {packageServices.map(
                          (item) => (
                            <span
                              key={item.id}
                              className="inline-flex items-center rounded-full border border-accent-500/10 bg-accent-500/5 px-3 py-1.5 text-xs text-gray-400"
                            >
                              {item.service
                                ?.name ||
                                'Catalogue service'}
                              {item.quantity >
                                1 && (
                                <span className="ml-1 text-accent-400">
                                  ×
                                  {item.quantity}
                                </span>
                              )}
                            </span>
                          )
                        )}
                      </div>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>

      <div className="rounded-2xl border border-purple-500/20 bg-purple-500/5 p-5">
        <div className="flex items-start gap-3">
          <Layers3 className="mt-0.5 h-5 w-5 shrink-0 text-purple-300" />

          <div>
            <h3 className="text-sm font-semibold text-white">
              Monetization foundation
            </h3>

            <p className="mt-1 text-sm leading-6 text-gray-400">
              Website packages sit between Avelixa's
              service catalogue and the quotation/project
              workflow. The catalogue defines what Avelixa
              sells; packages group those services into
              commercial offers.
            </p>
          </div>
        </div>
      </div>

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
          <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-ink-800/60 bg-ink-950 p-6 shadow-2xl">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-accent-500/20 bg-accent-500/10">
                  {editingPackage ? (
                    <Edit3 className="h-5 w-5 text-accent-400" />
                  ) : (
                    <Plus className="h-5 w-5 text-accent-400" />
                  )}
                </div>

                <div>
                  <h2 className="text-lg font-semibold text-white">
                    {editingPackage
                      ? 'Edit Website Package'
                      : 'New Website Package'}
                  </h2>

                  <p className="mt-1 text-xs text-gray-500">
                    Define the commercial package details.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={closeForm}
                disabled={saving}
                className="inline-flex h-9 w-9 items-center justify-center rounded-xl text-gray-500 hover:bg-white/5 hover:text-white disabled:opacity-50"
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
                  Package Name
                </label>

                <input
                  type="text"
                  value={form.name}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      name: event.target.value,
                    }))
                  }
                  placeholder="Basic Website"
                  disabled={saving}
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
                    setForm((current) => ({
                      ...current,
                      description:
                        event.target.value,
                    }))
                  }
                  placeholder="A professional website package for small businesses."
                  rows={4}
                  disabled={saving}
                  className="w-full resize-none rounded-xl border border-ink-800/60 bg-white/5 px-4 py-3 text-sm text-white outline-none placeholder:text-gray-700 focus:border-accent-500/40"
                />
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-gray-500">
                    Minimum Price
                  </label>

                  <input
                    type="number"
                    min="0"
                    step="1"
                    value={form.minPrice}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        minPrice:
                          event.target.value,
                      }))
                    }
                    placeholder="15000"
                    disabled={saving}
                    className="w-full rounded-xl border border-ink-800/60 bg-white/5 px-4 py-3 text-sm text-white outline-none placeholder:text-gray-700 focus:border-accent-500/40"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-gray-500">
                    Maximum Price
                  </label>

                  <input
                    type="number"
                    min="0"
                    step="1"
                    value={form.maxPrice}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        maxPrice:
                          event.target.value,
                      }))
                    }
                    placeholder="20000"
                    disabled={saving}
                    className="w-full rounded-xl border border-ink-800/60 bg-white/5 px-4 py-3 text-sm text-white outline-none placeholder:text-gray-700 focus:border-accent-500/40"
                  />
                </div>
              </div>

              <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-ink-800/60 bg-white/[0.03] px-4 py-3">
                <input
                  type="checkbox"
                  checked={form.isActive}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      isActive:
                        event.target.checked,
                    }))
                  }
                  disabled={saving}
                  className="h-4 w-4 accent-accent-500"
                />

                <span>
                  <span className="block text-sm font-medium text-white">
                    Active package
                  </span>

                  <span className="mt-0.5 block text-xs text-gray-500">
                    Active packages can be used in the
                    commercial workflow.
                  </span>
                </span>
              </label>

              <div className="rounded-xl border border-accent-500/10 bg-accent-500/5 p-4">
                <div className="flex items-start gap-3">
                  <Package className="mt-0.5 h-4 w-4 shrink-0 text-accent-400" />

                  <p className="text-xs leading-5 text-gray-400">
                    Services are assigned to packages
                    through the package-services layer.
                    This screen manages the commercial
                    package itself without changing the
                    underlying service catalogue.
                  </p>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-2">
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
                    <Save className="h-4 w-4" />
                  )}

                  {saving
                    ? 'Saving...'
                    : editingPackage
                    ? 'Save Changes'
                    : 'Create Package'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

