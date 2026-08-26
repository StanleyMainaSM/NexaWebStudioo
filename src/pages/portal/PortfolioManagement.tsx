import { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  ExternalLink,
  Eye,
  EyeOff,
  FilePenLine,
  FolderKanban,
  Image as ImageIcon,
  Loader2,
  Pencil,
  Plus,
  RefreshCw,
  Save,
  Sparkles,
  Trash2,
  X,
} from 'lucide-react';
import { supabase } from '../../lib/supabase';

type PortfolioItem = {
  id: string;
  project_id: string | null;
  title: string;
  client_name: string | null;
  category: string | null;
  description: string | null;
  image_url: string | null;
  image_alt: string | null;
  live_url: string | null;
  tags: string[] | null;
  technologies: string[] | null;
  is_published: boolean | null;
  is_featured: boolean | null;
  sort_order: number | null;
  published_at: string | null;
  created_at: string | null;
};

type ProjectOption = {
  id: string;
  title: string;
  status: string | null;
};

type PortfolioForm = {
  project_id: string;
  title: string;
  client_name: string;
  category: string;
  description: string;
  image_url: string;
  image_alt: string;
  live_url: string;
  tags: string;
  technologies: string;
  is_featured: boolean;
  sort_order: string;
  is_published: boolean;
};

const emptyForm: PortfolioForm = {
  project_id: '',
  title: '',
  client_name: '',
  category: '',
  description: '',
  image_url: '',
  image_alt: '',
  live_url: '',
  tags: '',
  technologies: '',
  is_featured: false,
  sort_order: '0',
  is_published: true,
};

function splitList(value: string) {
  return Array.from(
    new Set(
      value
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean)
    )
  );
}

function formatDate(value: string | null) {
  if (!value) {
    return 'Not published';
  }

  return new Date(value).toLocaleString();
}

export default function PortfolioManagement() {
  const [items, setItems] = useState<PortfolioItem[]>([]);
  const [projects, setProjects] = useState<ProjectOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [actionId, setActionId] = useState<string | null>(
    null
  );

  const [showEditor, setShowEditor] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(
    null
  );

  const [form, setForm] =
    useState<PortfolioForm>(emptyForm);

  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] =
    useState<string | null>(null);

  const loadData = async () => {
    setLoading(true);
    setError(null);

    try {
      const [portfolioResult, projectsResult] =
        await Promise.all([
          supabase
            .from('portfolio_items')
            .select(
              `
                id,
                project_id,
                title,
                client_name,
                category,
                description,
                image_url,
                image_alt,
                live_url,
                tags,
                technologies,
                is_published,
                is_featured,
                sort_order,
                published_at,
                created_at
              `
            )
            .order('is_featured', {
              ascending: false,
            })
            .order('sort_order', {
              ascending: true,
            })
            .order('created_at', {
              ascending: false,
            }),

          supabase
            .from('projects')
            .select('id, title, status')
            .order('created_at', {
              ascending: false,
            }),
        ]);

      if (portfolioResult.error) {
        throw portfolioResult.error;
      }

      if (projectsResult.error) {
        throw projectsResult.error;
      }

      setItems(
        (portfolioResult.data || []) as PortfolioItem[]
      );

      setProjects(
        (projectsResult.data || []) as ProjectOption[]
      );
    } catch (err) {
      console.error(
        'Failed to load portfolio CMS:',
        err
      );

      setError(
        err instanceof Error
          ? err.message
          : 'The portfolio could not be loaded.'
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadData();
  }, []);

  const publishedCount = useMemo(
    () =>
      items.filter(
        (item) => item.is_published
      ).length,
    [items]
  );

  const featuredCount = useMemo(
    () =>
      items.filter(
        (item) => item.is_featured
      ).length,
    [items]
  );

  const openCreate = () => {
    setEditingId(null);
    setForm(emptyForm);
    setError(null);
    setSuccess(null);
    setShowEditor(true);
  };

  const openEdit = (
    item: PortfolioItem
  ) => {
    setEditingId(item.id);

    setForm({
      project_id: item.project_id || '',
      title: item.title || '',
      client_name: item.client_name || '',
      category: item.category || '',
      description: item.description || '',
      image_url: item.image_url || '',
      image_alt: item.image_alt || '',
      live_url: item.live_url || '',
      tags: (item.tags || []).join(', '),
      technologies: (
        item.technologies || []
      ).join(', '),
      is_featured: Boolean(item.is_featured),
      sort_order: String(
        item.sort_order ?? 0
      ),
      is_published: Boolean(
        item.is_published
      ),
    });

    setError(null);
    setSuccess(null);
    setShowEditor(true);
  };

  const saveItem = async (
    event: React.FormEvent
  ) => {
    event.preventDefault();

    if (!form.title.trim()) {
      setError(
        'A project title is required.'
      );
      return;
    }

    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      const now = new Date().toISOString();

      const payload = {
        project_id:
          form.project_id || null,

        title: form.title.trim(),

        client_name:
          form.client_name.trim() || null,

        category:
          form.category.trim() || null,

        description:
          form.description.trim() || null,

        image_url:
          form.image_url.trim() || null,

        image_alt:
          form.image_alt.trim() || null,

        live_url:
          form.live_url.trim() || null,

        tags: splitList(form.tags),

        technologies:
          splitList(form.technologies),

        is_featured:
          form.is_featured,

        sort_order:
          Number(form.sort_order) || 0,

        is_published:
          form.is_published,

        published_at:
          form.is_published
            ? now
            : null,
      };

      const result = editingId
        ? await supabase
            .from('portfolio_items')
            .update(payload)
            .eq('id', editingId)
        : await supabase
            .from('portfolio_items')
            .insert(payload);

      if (result.error) {
        throw result.error;
      }

      setSuccess(
        editingId
          ? 'Portfolio project updated successfully.'
          : form.is_published
            ? 'Portfolio project published successfully.'
            : 'Portfolio project saved as a draft.'
      );

      setShowEditor(false);
      setEditingId(null);
      setForm(emptyForm);

      await loadData();
    } catch (err) {
      console.error(
        'Failed to save portfolio item:',
        err
      );

      setError(
        err instanceof Error
          ? err.message
          : 'The portfolio project could not be saved.'
      );
    } finally {
      setSaving(false);
    }
  };

  const togglePublished = async (
    item: PortfolioItem
  ) => {
    setActionId(item.id);
    setError(null);
    setSuccess(null);

    try {
      const nextPublished =
        !item.is_published;

      const {
        error: updateError,
      } = await supabase
        .from('portfolio_items')
        .update({
          is_published:
            nextPublished,

          published_at:
            nextPublished
              ? new Date().toISOString()
              : null,
        })
        .eq('id', item.id);

      if (updateError) {
        throw updateError;
      }

      setSuccess(
        nextPublished
          ? 'Project is now live on the public Our Work page.'
          : 'Project was removed from the public Our Work page.'
      );

      await loadData();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'The publication status could not be changed.'
      );
    } finally {
      setActionId(null);
    }
  };

  const deleteItem = async (
    item: PortfolioItem
  ) => {
    const confirmed = window.confirm(
      `Delete "${item.title}" from the portfolio? This cannot be undone.`
    );

    if (!confirmed) {
      return;
    }

    setActionId(item.id);
    setError(null);
    setSuccess(null);

    try {
      const {
        error: deleteError,
      } = await supabase
        .from('portfolio_items')
        .delete()
        .eq('id', item.id);

      if (deleteError) {
        throw deleteError;
      }

      setSuccess(
        'Portfolio project deleted successfully.'
      );

      await loadData();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'The portfolio project could not be deleted.'
      );
    } finally {
      setActionId(null);
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <div className="mb-2 text-xs font-semibold uppercase tracking-widest text-accent-400">
            Public Website CMS
          </div>

          <h1 className="font-display text-3xl font-bold text-white md:text-4xl">
            Portfolio / Our Work
          </h1>

          <p className="mt-2 max-w-2xl text-sm leading-6 text-gray-500">
            Publish completed Avelixa websites directly to the public
            Our Work page. No code changes are required.
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => void loadData()}
            disabled={loading}
            className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm font-medium text-gray-300 hover:bg-white/10 disabled:opacity-50"
          >
            <RefreshCw
              className={`h-4 w-4 ${
                loading
                  ? 'animate-spin'
                  : ''
              }`}
            />

            Refresh
          </button>

          <button
            type="button"
            onClick={openCreate}
            className="inline-flex items-center gap-2 rounded-xl bg-accent-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-accent-500"
          >
            <Plus className="h-4 w-4" />

            Add Portfolio Project
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

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
          <div className="text-xs uppercase tracking-widest text-gray-500">
            Total Projects
          </div>

          <div className="mt-2 text-3xl font-semibold text-white">
            {items.length}
          </div>
        </div>

        <div className="rounded-2xl border border-emerald-500/10 bg-emerald-500/5 p-5">
          <div className="text-xs uppercase tracking-widest text-gray-500">
            Published
          </div>

          <div className="mt-2 text-3xl font-semibold text-white">
            {publishedCount}
          </div>
        </div>

        <div className="rounded-2xl border border-purple-500/10 bg-purple-500/5 p-5">
          <div className="text-xs uppercase tracking-widest text-gray-500">
            Featured
          </div>

          <div className="mt-2 text-3xl font-semibold text-white">
            {featuredCount}
          </div>
        </div>
      </div>

      <section className="overflow-hidden rounded-2xl border border-white/10 bg-ink-950/60">
        <div className="flex flex-col gap-3 border-b border-white/5 p-6 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-accent-500/20 bg-accent-500/10">
              <FolderKanban className="h-5 w-5 text-accent-400" />
            </div>

            <div>
              <h2 className="text-lg font-semibold text-white">
                Portfolio Projects
              </h2>

              <p className="mt-1 text-sm text-gray-500">
                Control what visitors can see at /work.
              </p>
            </div>
          </div>

          <a
            href="/work"
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-2 text-sm font-medium text-accent-400 hover:text-accent-300"
          >
            <ExternalLink className="h-4 w-4" />

            Open Public Page
          </a>
        </div>

        {loading ? (
          <div className="flex min-h-[280px] items-center justify-center gap-3 text-sm text-gray-400">
            <Loader2 className="h-5 w-5 animate-spin text-accent-500" />

            Loading portfolio projects...
          </div>
        ) : items.length === 0 ? (
          <div className="p-12 text-center">
            <FilePenLine className="mx-auto h-9 w-9 text-gray-600" />

            <h3 className="mt-4 text-lg font-medium text-white">
              No portfolio projects yet
            </h3>

            <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-gray-500">
              Add the first completed client website and publish it when
              it is ready for the public website.
            </p>

            <button
              type="button"
              onClick={openCreate}
              className="mt-5 inline-flex items-center gap-2 rounded-xl bg-accent-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-accent-500"
            >
              <Plus className="h-4 w-4" />

              Add First Project
            </button>
          </div>
        ) : (
          <div className="divide-y divide-white/5">
            {items.map((item) => {
              const busy =
                actionId === item.id;

              return (
                <div
                  key={item.id}
                  className="p-6"
                >
                  <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
                    <div className="flex min-w-0 gap-4">
                      <div className="h-24 w-32 shrink-0 overflow-hidden rounded-2xl border border-white/10 bg-white/5">
                        {item.image_url ? (
                          <img
                            src={item.image_url}
                            alt={
                              item.image_alt ||
                              item.title
                            }
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center">
                            <ImageIcon className="h-7 w-7 text-gray-600" />
                          </div>
                        )}
                      </div>

                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="text-lg font-semibold text-white">
                            {item.title}
                          </h3>

                          {item.is_published ? (
                            <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-emerald-300">
                              <Eye className="h-3 w-3" />
                              Live
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-500/20 bg-amber-500/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-amber-300">
                              <EyeOff className="h-3 w-3" />
                              Draft
                            </span>
                          )}

                          {item.is_featured && (
                            <span className="inline-flex items-center gap-1.5 rounded-full border border-purple-500/20 bg-purple-500/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-purple-300">
                              <Sparkles className="h-3 w-3" />
                              Featured
                            </span>
                          )}
                        </div>

                        <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-500">
                          {item.client_name && (
                            <span>
                              {item.client_name}
                            </span>
                          )}

                          {item.category && (
                            <span>
                              {item.category}
                            </span>
                          )}

                          <span>
                            {formatDate(
                              item.published_at
                            )}
                          </span>
                        </div>

                        {item.description && (
                          <p className="mt-3 max-w-3xl text-sm leading-6 text-gray-400">
                            {item.description}
                          </p>
                        )}

                        {(item.tags || []).length > 0 && (
                          <div className="mt-3 flex flex-wrap gap-2">
                            {(item.tags || []).map(
                              (tag) => (
                                <span
                                  key={tag}
                                  className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-gray-400"
                                >
                                  {tag}
                                </span>
                              )
                            )}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 xl:justify-end">
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() =>
                          void togglePublished(
                            item
                          )
                        }
                        className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs font-semibold text-gray-300 hover:bg-white/10 disabled:opacity-50"
                      >
                        {busy ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : item.is_published ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}

                        {item.is_published
                          ? 'Unpublish'
                          : 'Publish'}
                      </button>

                      <button
                        type="button"
                        disabled={busy}
                        onClick={() =>
                          openEdit(item)
                        }
                        className="inline-flex items-center gap-2 rounded-xl border border-accent-500/20 bg-accent-500/10 px-3 py-2 text-xs font-semibold text-accent-300 hover:bg-accent-500/15 disabled:opacity-50"
                      >
                        <Pencil className="h-4 w-4" />

                        Edit
                      </button>

                      <button
                        type="button"
                        disabled={busy}
                        onClick={() =>
                          void deleteItem(item)
                        }
                        title="Delete portfolio project"
                        className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-red-500/20 bg-red-500/5 text-red-400 hover:bg-red-500/10 disabled:opacity-50"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {showEditor && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/70 p-4 backdrop-blur-sm">
          <div className="mx-auto my-8 w-full max-w-4xl rounded-3xl border border-white/10 bg-ink-950 shadow-2xl">
            <div className="flex items-start justify-between gap-4 border-b border-white/5 p-6">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-accent-500/20 bg-accent-500/10">
                  <FilePenLine className="h-5 w-5 text-accent-400" />
                </div>

                <div>
                  <h2 className="text-xl font-semibold text-white">
                    {editingId
                      ? 'Edit Portfolio Project'
                      : 'Add Portfolio Project'}
                  </h2>

                  <p className="mt-1 text-sm text-gray-500">
                    Save as a draft or publish directly to the public
                    Our Work page.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() =>
                  setShowEditor(false)
                }
                disabled={saving}
                className="inline-flex h-10 w-10 items-center justify-center rounded-xl text-gray-500 hover:bg-white/5 hover:text-white disabled:opacity-50"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form
              onSubmit={saveItem}
              className="space-y-6 p-6"
            >
              <div className="grid gap-5 md:grid-cols-2">
                <Field label="Completed Project (Optional)">
                  <select
                    value={form.project_id}
                    onChange={(event) =>
                      setForm(
                        (current) => ({
                          ...current,
                          project_id:
                            event.target.value,
                        })
                      )
                    }
                    disabled={saving}
                    className="input-base"
                  >
                    <option
                      value=""
                      className="bg-ink-950"
                    >
                      No Linked Project
                    </option>

                    {projects.map(
                      (project) => (
                        <option
                          key={project.id}
                          value={project.id}
                          className="bg-ink-950"
                        >
                          {project.title} —{' '}
                          {project.status ||
                            'unknown'}
                        </option>
                      )
                    )}
                  </select>
                </Field>

                <Field
                  label="Project Title"
                  required
                >
                  <input
                    value={form.title}
                    onChange={(event) =>
                      setForm(
                        (current) => ({
                          ...current,
                          title:
                            event.target.value,
                        })
                      )
                    }
                    disabled={saving}
                    placeholder="Client website name"
                    className="input-base"
                  />
                </Field>

                <Field label="Client / Brand Name">
                  <input
                    value={form.client_name}
                    onChange={(event) =>
                      setForm(
                        (current) => ({
                          ...current,
                          client_name:
                            event.target.value,
                        })
                      )
                    }
                    disabled={saving}
                    placeholder="Client or business name"
                    className="input-base"
                  />
                </Field>

                <Field label="Category">
                  <input
                    value={form.category}
                    onChange={(event) =>
                      setForm(
                        (current) => ({
                          ...current,
                          category:
                            event.target.value,
                        })
                      )
                    }
                    disabled={saving}
                    placeholder="Business, E-Commerce, Portfolio..."
                    className="input-base"
                  />
                </Field>
              </div>

              <Field label="Project Description">
                <textarea
                  value={form.description}
                  onChange={(event) =>
                    setForm(
                      (current) => ({
                        ...current,
                        description:
                          event.target.value,
                      })
                    )
                  }
                  disabled={saving}
                  rows={4}
                  placeholder="Describe the finished website and what was delivered..."
                  className="input-base resize-y"
                />
              </Field>

              <div className="grid gap-5 md:grid-cols-2">
                <Field label="Cover Image URL">
                  <input
                    type="url"
                    value={form.image_url}
                    onChange={(event) =>
                      setForm(
                        (current) => ({
                          ...current,
                          image_url:
                            event.target.value,
                        })
                      )
                    }
                    disabled={saving}
                    placeholder="https://..."
                    className="input-base"
                  />
                </Field>

                <Field label="Image Description / Alt Text">
                  <input
                    value={form.image_alt}
                    onChange={(event) =>
                      setForm(
                        (current) => ({
                          ...current,
                          image_alt:
                            event.target.value,
                        })
                      )
                    }
                    disabled={saving}
                    placeholder="What the portfolio image shows"
                    className="input-base"
                  />
                </Field>

                <Field label="Live Website URL">
                  <input
                    type="url"
                    value={form.live_url}
                    onChange={(event) =>
                      setForm(
                        (current) => ({
                          ...current,
                          live_url:
                            event.target.value,
                        })
                      )
                    }
                    disabled={saving}
                    placeholder="https://clientwebsite.com"
                    className="input-base"
                  />
                </Field>

                <Field label="Display Order">
                  <input
                    type="number"
                    value={form.sort_order}
                    onChange={(event) =>
                      setForm(
                        (current) => ({
                          ...current,
                          sort_order:
                            event.target.value,
                        })
                      )
                    }
                    disabled={saving}
                    className="input-base"
                  />
                </Field>

                <Field label="Tags">
                  <input
                    value={form.tags}
                    onChange={(event) =>
                      setForm(
                        (current) => ({
                          ...current,
                          tags:
                            event.target.value,
                        })
                      )
                    }
                    disabled={saving}
                    placeholder="Responsive, SEO, E-Commerce"
                    className="input-base"
                  />
                </Field>

                <Field label="Technologies">
                  <input
                    value={form.technologies}
                    onChange={(event) =>
                      setForm(
                        (current) => ({
                          ...current,
                          technologies:
                            event.target.value,
                        })
                      )
                    }
                    disabled={saving}
                    placeholder="React, Supabase, Tailwind"
                    className="input-base"
                  />
                </Field>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <Toggle
                  label="Feature This Project"
                  description="Featured projects are shown before standard projects."
                  checked={form.is_featured}
                  onChange={(checked) =>
                    setForm(
                      (current) => ({
                        ...current,
                        is_featured:
                          checked,
                      })
                    )
                  }
                  disabled={saving}
                />

                <Toggle
                  label="Publish Immediately"
                  description="Published projects become visible on the public /work page."
                  checked={form.is_published}
                  onChange={(checked) =>
                    setForm(
                      (current) => ({
                        ...current,
                        is_published:
                          checked,
                      })
                    )
                  }
                  disabled={saving}
                />
              </div>

              <div className="flex flex-col-reverse gap-3 border-t border-white/5 pt-5 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={() =>
                    setShowEditor(false)
                  }
                  disabled={saving}
                  className="rounded-xl border border-white/10 bg-white/5 px-5 py-2.5 text-sm font-medium text-gray-300 hover:bg-white/10 disabled:opacity-50"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={saving}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-accent-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-accent-500 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {saving ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Save className="h-4 w-4" />
                  )}

                  {saving
                    ? 'Saving...'
                    : editingId
                      ? 'Save Changes'
                      : form.is_published
                        ? 'Publish Project'
                        : 'Save Draft'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <style>{`
        .input-base {
          width: 100%;
          border-radius: 0.75rem;
          border: 1px solid rgba(255,255,255,.1);
          background: rgba(255,255,255,.05);
          padding: .75rem 1rem;
          color: white;
          outline: none;
        }

        .input-base:focus {
          border-color: rgba(99,102,241,.55);
        }

        .input-base::placeholder {
          color: #6b7280;
        }
      `}</style>
    </div>
  );
}

function Field({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-xs font-semibold uppercase tracking-wider text-gray-500">
        {label}
        {required ? ' *' : ''}
      </span>

      {children}
    </label>
  );
}

function Toggle({
  label,
  description,
  checked,
  onChange,
  disabled,
}: {
  label: string;
  description: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled: boolean;
}) {
  return (
    <label className="flex cursor-pointer items-start gap-3 rounded-2xl border border-white/10 bg-white/[0.03] p-4">
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) =>
          onChange(
            event.target.checked
          )
        }
        disabled={disabled}
        className="mt-1 h-4 w-4 accent-indigo-500"
      />

      <span>
        <span className="block text-sm font-semibold text-white">
          {label}
        </span>

        <span className="mt-1 block text-xs leading-5 text-gray-500">
          {description}
        </span>
      </span>
    </label>
  );
}