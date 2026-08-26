import { useCallback, useEffect, useMemo, useRef, useState, type ChangeEvent, type DragEvent } from 'react';
import {
  AlertCircle,
  CheckCircle2,
  Download,
  FileText,
  FolderOpen,
  Loader2,
  UploadCloud,
  X,
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../lib/auth';

interface ProjectSummary {
  id: string;
  title: string;
}

type DocumentCategory =
  | 'logo'
  | 'photos'
  | 'content'
  | 'business-info'
  | 'other';

interface ProjectFileRecord {
  id: string;
  project_id: string;
  file_name: string;
  file_size: number | null;
  storage_path: string;
  category: DocumentCategory | null;
  created_at: string;
  project?: ProjectSummary | null;
}

const BUCKET_NAME = 'project-documents';
const MAX_FILE_SIZE = 20 * 1024 * 1024;

const categories: Array<{
  value: DocumentCategory;
  label: string;
}> = [
  { value: 'logo', label: 'Logo / branding' },
  { value: 'photos', label: 'Photos / images' },
  { value: 'content', label: 'Website content' },
  { value: 'business-info', label: 'Business information' },
  { value: 'other', label: 'Other' },
];

function formatFileSize(size: number | null | undefined) {
  if (typeof size !== 'number' || size <= 0) {
    return 'Unknown size';
  }

  if (size < 1024) {
    return `${size} B`;
  }

  const kb = size / 1024;

  if (kb < 1024) {
    return `${kb.toFixed(1)} KB`;
  }

  return `${(kb / 1024).toFixed(1)} MB`;
}

function formatCategory(category: DocumentCategory | null | undefined) {
  if (!category) {
    return 'Other';
  }

  const match = categories.find((item) => item.value === category);

  return match?.label || 'Other';
}

function sanitizeFileName(fileName: string) {
  const extensionIndex = fileName.lastIndexOf('.');
  const extension =
    extensionIndex > 0 ? fileName.slice(extensionIndex).toLowerCase() : '';
  const baseName =
    extensionIndex > 0 ? fileName.slice(0, extensionIndex) : fileName;

  const safeBaseName = baseName
    .normalize('NFKD')
    .replace(/[^\w\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .toLowerCase();

  return `${safeBaseName || 'file'}${extension}`;
}

export default function Documents() {
  const { user } = useAuth();

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [projects, setProjects] = useState<ProjectSummary[]>([]);
  const [files, setFiles] = useState<ProjectFileRecord[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [category, setCategory] =
    useState<DocumentCategory>('other');

  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [downloadingId, setDownloadingId] = useState<string | null>(
    null
  );
  const [dragActive, setDragActive] = useState(false);

  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const loadDocuments = useCallback(async () => {
    const currentUserId = user?.id;

    if (!currentUserId) {
      setProjects([]);
      setFiles([]);
      setSelectedProjectId('');
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const { data: projectsData, error: projectsError } =
        await supabase
          .from('projects')
          .select('id, title')
          .eq('client_id', currentUserId)
          .order('created_at', { ascending: false });

      if (projectsError) {
        throw projectsError;
      }

      const ownedProjects = (projectsData || []) as ProjectSummary[];
      const projectIds = ownedProjects.map((project) => project.id);

      let projectFiles: ProjectFileRecord[] = [];

      if (projectIds.length > 0) {
        const { data: filesData, error: filesError } =
          await supabase
            .from('project_files')
            .select(
              'id, project_id, file_name, file_size, storage_path, category, created_at'
            )
            .in('project_id', projectIds)
            .eq('is_internal', false)
            .order('created_at', { ascending: false });

        if (filesError) {
          throw filesError;
        }

        projectFiles = (filesData || []) as ProjectFileRecord[];
      }

      setProjects(ownedProjects);
      setFiles(projectFiles);

      setSelectedProjectId((currentSelection) => {
        if (
          currentSelection &&
          ownedProjects.some(
            (project) => project.id === currentSelection
          )
        ) {
          return currentSelection;
        }

        return ownedProjects[0]?.id || '';
      });
    } catch (err) {
      console.error('Error loading client documents:', err);

      setProjects([]);
      setFiles([]);
      setSelectedProjectId('');

      setError(
        'We could not load your project documents right now. Please try again.'
      );
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    loadDocuments();
  }, [loadDocuments]);

  const selectedProject = useMemo(
    () =>
      projects.find(
        (project) => project.id === selectedProjectId
      ) || null,
    [projects, selectedProjectId]
  );

  const projectFiles = useMemo(
    () =>
      files.filter(
        (file) => file.project_id === selectedProjectId
      ),
    [files, selectedProjectId]
  );

  const groupedFiles = useMemo(() => {
    return projects.map((project) => ({
      project,
      files: files.filter(
        (file) => file.project_id === project.id
      ),
    }));
  }, [projects, files]);

  function clearMessages() {
    setError(null);
    setSuccess(null);
  }

  function handleFileSelected(file: File | null) {
    clearMessages();

    if (!file) {
      setSelectedFile(null);
      return;
    }

    if (file.size > MAX_FILE_SIZE) {
      setSelectedFile(null);
      setError(
        `The selected file is too large. Maximum allowed size is 20 MB.`
      );

      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }

      return;
    }

    if (file.size === 0) {
      setSelectedFile(null);
      setError('The selected file is empty.');

      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }

      return;
    }

    setSelectedFile(file);
  }

  function handleInputChange(event: ChangeEvent<HTMLInputElement>) {
    handleFileSelected(event.target.files?.[0] || null);
  }

  function handleDragOver(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    event.stopPropagation();
    setDragActive(true);
  }

  function handleDragLeave(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    event.stopPropagation();
    setDragActive(false);
  }

  function handleDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    event.stopPropagation();
    setDragActive(false);

    const file = event.dataTransfer.files?.[0] || null;

    handleFileSelected(file);
  }

  function removeSelectedFile() {
    setSelectedFile(null);

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }

    clearMessages();
  }

  async function handleUpload() {
    clearMessages();

    if (!user?.id) {
      setError('You must be signed in to upload a document.');
      return;
    }

    if (!selectedProjectId) {
      setError('Please select the project this document belongs to.');
      return;
    }

    if (!selectedFile) {
      setError('Please select a file to upload.');
      return;
    }

    if (selectedFile.size > MAX_FILE_SIZE) {
      setError('The selected file is larger than the 20 MB limit.');
      return;
    }

    if (selectedFile.size === 0) {
      setError('The selected file is empty.');
      return;
    }

    setUploading(true);

    const safeFileName = sanitizeFileName(selectedFile.name);
    const storagePath = `${user.id}/${selectedProjectId}/${Date.now()}-${safeFileName}`;

    try {
      const { error: uploadError } = await supabase.storage
        .from(BUCKET_NAME)
        .upload(storagePath, selectedFile, {
          contentType:
            selectedFile.type || 'application/octet-stream',
          cacheControl: '3600',
          upsert: false,
        });

      if (uploadError) {
        throw uploadError;
      }

      const { data: insertedFile, error: insertError } =
        await supabase
          .from('project_files')
          .insert({
            project_id: selectedProjectId,
            uploaded_by: user.id,
            file_name: selectedFile.name,
            file_size: selectedFile.size,
            storage_path: storagePath,
            category,
            is_internal: false,
          })
          .select(
            'id, project_id, file_name, file_size, storage_path, category, created_at'
          )
          .single();

      if (insertError) {
        await supabase.storage
          .from(BUCKET_NAME)
          .remove([storagePath]);

        throw insertError;
      }

      const newFile = insertedFile as ProjectFileRecord;

      setFiles((currentFiles) => [
        newFile,
        ...currentFiles,
      ]);

      setSelectedFile(null);

      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }

      setSuccess(
        `"${selectedFile.name}" was uploaded successfully to ${selectedProject?.title || 'your project'}.`
      );
    } catch (err) {
      console.error('Document upload failed:', err);

      setError(
        err instanceof Error
          ? `Upload failed: ${err.message}`
          : 'The document could not be uploaded. Please try again.'
      );
    } finally {
      setUploading(false);
    }
  }

  async function handleDownload(file: ProjectFileRecord) {
    clearMessages();
    setDownloadingId(file.id);

    try {
      const { data, error: downloadError } = await supabase.storage
        .from(BUCKET_NAME)
        .download(file.storage_path);

      if (downloadError) {
        throw downloadError;
      }

      const url = URL.createObjectURL(data);
      const anchor = document.createElement('a');

      anchor.href = url;
      anchor.download = file.file_name;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();

      window.setTimeout(() => {
        URL.revokeObjectURL(url);
      }, 1000);
    } catch (err) {
      console.error('Document download failed:', err);

      setError(
        err instanceof Error
          ? `The document could not be downloaded: ${err.message}`
          : 'The document could not be downloaded.'
      );
    } finally {
      setDownloadingId(null);
    }
  }

  if (loading) {
    return (
      <div className="space-y-6 pb-8">
        <div className="glass rounded-3xl border border-ink-800/50 p-8">
          <div className="flex items-center gap-3 text-white">
            <Loader2 className="h-5 w-5 animate-spin text-accent-500" />
            <span>Loading your project documents...</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-8">
      <section className="relative overflow-hidden rounded-3xl border border-ink-800/50 bg-gradient-to-br from-accent-600/20 via-white/[0.04] to-transparent p-6 md:p-8">
        <div className="absolute -right-10 -top-10 h-56 w-56 rounded-full bg-accent-500/10 blur-3xl" />

        <div className="relative">
          <div className="inline-flex items-center gap-2 rounded-full border border-accent-500/20 bg-accent-500/10 px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.25em] text-accent-400">
            <FileText className="h-3.5 w-3.5" />
            Project resources
          </div>

          <h1 className="mt-5 text-3xl font-semibold tracking-tight text-white md:text-4xl">
            Documents & materials
          </h1>

          <p className="mt-3 max-w-2xl text-sm leading-6 text-gray-400">
            Upload the files Avelixa needs for your website project,
            including logos, photos, content and business information.
          </p>
        </div>
      </section>

      {error && (
        <div className="flex items-start gap-3 rounded-2xl border border-red-500/20 bg-red-500/5 p-4">
          <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-red-400" />

          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-red-300">
              Something went wrong
            </p>

            <p className="mt-1 text-sm leading-6 text-red-200/70">
              {error}
            </p>
          </div>

          <button
            type="button"
            onClick={() => setError(null)}
            className="rounded-lg p-1 text-red-300/70 hover:bg-red-500/10 hover:text-red-200"
            aria-label="Dismiss error"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {success && (
        <div className="flex items-start gap-3 rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-4">
          <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-400" />

          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-emerald-300">
              Upload complete
            </p>

            <p className="mt-1 text-sm leading-6 text-emerald-200/70">
              {success}
            </p>
          </div>

          <button
            type="button"
            onClick={() => setSuccess(null)}
            className="rounded-lg p-1 text-emerald-300/70 hover:bg-emerald-500/10 hover:text-emerald-200"
            aria-label="Dismiss success message"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {projects.length === 0 ? (
        <section className="glass rounded-3xl border border-ink-800/50 p-8">
          <div className="mx-auto max-w-xl text-center">
            <FolderOpen className="mx-auto h-12 w-12 text-ink-600" />

            <h2 className="mt-5 text-xl font-semibold text-white">
              No projects yet
            </h2>

            <p className="mt-2 text-sm leading-6 text-gray-400">
              You can upload project materials once a project has
              been assigned to your client account.
            </p>
          </div>
        </section>
      ) : (
        <>
          <section className="glass rounded-3xl border border-ink-800/50 p-6 md:p-7">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-ink-500">
                Upload materials
              </p>

              <h2 className="mt-2 text-xl font-semibold text-white">
                Add a project document
              </h2>

              <p className="mt-1 text-sm leading-6 text-gray-400">
                Select the project first, then choose the file and
                upload it securely.
              </p>
            </div>

            <div className="mt-6 grid grid-cols-1 gap-5 md:grid-cols-2">
              <div>
                <label
                  htmlFor="project"
                  className="text-xs font-bold uppercase tracking-[0.15em] text-ink-500"
                >
                  Project
                </label>

                <select
                  id="project"
                  value={selectedProjectId}
                  onChange={(event) => {
                    setSelectedProjectId(event.target.value);
                    clearMessages();
                  }}
                  disabled={uploading}
                  className="mt-2 w-full rounded-xl border border-ink-800/60 bg-white/[0.04] px-4 py-3 text-sm text-white outline-none transition focus:border-accent-500/50 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {projects.map((project) => (
                    <option
                      key={project.id}
                      value={project.id}
                      className="bg-ink-950 text-white"
                    >
                      {project.title}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label
                  htmlFor="category"
                  className="text-xs font-bold uppercase tracking-[0.15em] text-ink-500"
                >
                  Document type
                </label>

                <select
                  id="category"
                  value={category}
                  onChange={(event) =>
                    setCategory(
                      event.target.value as DocumentCategory
                    )
                  }
                  disabled={uploading}
                  className="mt-2 w-full rounded-xl border border-ink-800/60 bg-white/[0.04] px-4 py-3 text-sm text-white outline-none transition focus:border-accent-500/50 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {categories.map((item) => (
                    <option
                      key={item.value}
                      value={item.value}
                      className="bg-ink-950 text-white"
                    >
                      {item.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              className={`mt-5 rounded-2xl border border-dashed p-6 transition ${
                dragActive
                  ? 'border-accent-500 bg-accent-500/10'
                  : 'border-ink-700/70 bg-white/[0.03] hover:border-accent-500/40 hover:bg-white/[0.05]'
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                onChange={handleInputChange}
                disabled={uploading}
                className="hidden"
                id="project-document-file"
              />

              {!selectedFile ? (
                <label
                  htmlFor="project-document-file"
                  className="flex cursor-pointer flex-col items-center justify-center text-center"
                >
                  <div className="rounded-2xl bg-accent-500/10 p-4">
                    <UploadCloud className="h-8 w-8 text-accent-400" />
                  </div>

                  <p className="mt-4 text-sm font-medium text-white">
                    Choose a file or drag it here
                  </p>

                  <p className="mt-2 text-xs text-gray-500">
                    Maximum file size: 20 MB
                  </p>
                </label>
              ) : (
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="rounded-xl bg-accent-500/10 p-3">
                      <FileText className="h-5 w-5 text-accent-400" />
                    </div>

                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-white">
                        {selectedFile.name}
                      </p>

                      <p className="mt-1 text-xs text-gray-500">
                        {formatFileSize(selectedFile.size)}
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={removeSelectedFile}
                    disabled={uploading}
                    className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl border border-ink-800/60 bg-white/[0.04] px-4 py-2.5 text-sm text-gray-300 transition hover:bg-white/[0.08] disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <X className="h-4 w-4" />
                    Remove
                  </button>
                </div>
              )}
            </div>

            <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="text-xs text-gray-500">
                {selectedProject
                  ? `Uploading to: ${selectedProject.title}`
                  : 'Select a project'}
              </div>

              <button
                type="button"
                onClick={handleUpload}
                disabled={
                  uploading ||
                  !selectedProjectId ||
                  !selectedFile
                }
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-accent-600 px-5 py-3 text-sm font-medium text-white transition hover:bg-accent-500 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {uploading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Uploading...
                  </>
                ) : (
                  <>
                    <UploadCloud className="h-4 w-4" />
                    Upload document
                  </>
                )}
              </button>
            </div>
          </section>

          <section className="glass rounded-3xl border border-ink-800/50 p-6 md:p-7">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.2em] text-ink-500">
                  Project files
                </p>

                <h2 className="mt-2 text-xl font-semibold text-white">
                  {selectedProject?.title || 'Your documents'}
                </h2>

                <p className="mt-1 text-sm text-gray-400">
                  {projectFiles.length} document
                  {projectFiles.length === 1 ? '' : 's'} in this project.
                </p>
              </div>
            </div>

            {projectFiles.length === 0 ? (
              <div className="mt-6 rounded-2xl border border-dashed border-ink-700/70 bg-white/[0.03] p-8 text-center">
                <FileText className="mx-auto h-9 w-9 text-ink-600" />

                <h3 className="mt-4 text-sm font-medium text-white">
                  No documents uploaded yet
                </h3>

                <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-gray-500">
                  Upload your logo, photos, website content or other
                  business materials above.
                </p>
              </div>
            ) : (
              <div className="mt-6 space-y-3">
                {projectFiles.map((file) => (
                  <div
                    key={file.id}
                    className="flex flex-col gap-4 rounded-2xl border border-ink-800/50 bg-white/[0.04] p-4 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      <div className="rounded-xl bg-accent-500/10 p-3">
                        <FileText className="h-5 w-5 text-accent-400" />
                      </div>

                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-white">
                          {file.file_name}
                        </p>

                        <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-xs text-gray-500">
                          <span>
                            {formatFileSize(file.file_size)}
                          </span>

                          <span>
                            {formatCategory(file.category)}
                          </span>

                          <span>
                            {new Date(
                              file.created_at
                            ).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleDownload(file)}
                      disabled={downloadingId === file.id}
                      className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl border border-ink-800/60 bg-white/[0.04] px-4 py-2.5 text-sm font-medium text-gray-200 transition hover:bg-white/[0.08] disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {downloadingId === file.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Download className="h-4 w-4 text-accent-400" />
                      )}
                      Download
                    </button>
                  </div>
                ))}
              </div>
            )}
          </section>

          {projects.length > 1 && (
            <section className="glass rounded-3xl border border-ink-800/50 p-6 md:p-7">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.2em] text-ink-500">
                  All projects
                </p>

                <h2 className="mt-2 text-xl font-semibold text-white">
                  Document overview
                </h2>
              </div>

              <div className="mt-6 grid grid-cols-1 gap-3 md:grid-cols-2">
                {groupedFiles.map(({ project, files: projectDocuments }) => (
                  <button
                    key={project.id}
                    type="button"
                    onClick={() => {
                      setSelectedProjectId(project.id);
                      clearMessages();
                    }}
                    className={`flex items-center justify-between rounded-2xl border p-4 text-left transition ${
                      selectedProjectId === project.id
                        ? 'border-accent-500/30 bg-accent-500/10'
                        : 'border-ink-800/50 bg-white/[0.03] hover:bg-white/[0.06]'
                    }`}
                  >
                    <span className="flex min-w-0 items-center gap-3">
                      <FolderOpen className="h-5 w-5 shrink-0 text-accent-400" />

                      <span className="min-w-0">
                        <span className="block truncate text-sm font-medium text-white">
                          {project.title}
                        </span>

                        <span className="mt-1 block text-xs text-gray-500">
                          {projectDocuments.length} file
                          {projectDocuments.length === 1
                            ? ''
                            : 's'}
                        </span>
                      </span>
                    </span>

                    <span className="text-xs text-accent-400">
                      {selectedProjectId === project.id
                        ? 'Selected'
                        : 'View'}
                    </span>
                  </button>
                ))}
              </div>
            </section>
          )}
        </>
      )}
    </div>
  );
}
