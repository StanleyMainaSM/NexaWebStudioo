import { ChangeEvent, useEffect, useMemo, useState } from 'react';
import {
  CheckCircle2,
  Download,
  FileImage,
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

interface ProjectFileRecord {
  id: string;
  project_id: string;
  file_name: string;
  file_size: number | null;
  storage_path: string;
  created_at: string;
  project?: ProjectSummary | null;
}

const MAX_FILE_SIZE = 20 * 1024 * 1024;

const documentCategories = [
  {
    value: 'logo',
    label: 'Business logo',
    description: 'Logo, brand mark or company identity files',
  },
  {
    value: 'photos',
    label: 'Business photos',
    description: 'Photos of your business, products or services',
  },
  {
    value: 'content',
    label: 'Website content',
    description: 'Text, documents and information for your website',
  },
  {
    value: 'business-info',
    label: 'Business information',
    description: 'Business details, contacts, services and pricing',
  },
  {
    value: 'other',
    label: 'Other',
    description: 'Anything else your Avelixa team needs',
  },
];

function formatFileSize(size: number | null | undefined) {
  if (typeof size !== 'number' || size <= 0) return 'Unknown size';

  if (size < 1024) {
    return `${size} B`;
  }

  const kb = size / 1024;

  if (kb < 1024) {
    return `${kb.toFixed(1)} KB`;
  }

  const mb = kb / 1024;

  if (mb < 1024) {
    return `${mb.toFixed(1)} MB`;
  }

  return `${(mb / 1024).toFixed(1)} GB`;
}

function getFileIcon(fileName: string) {
  const extension = fileName.split('.').pop()?.toLowerCase();

  const imageExtensions = [
    'jpg',
    'jpeg',
    'png',
    'gif',
    'webp',
    'svg',
  ];

  if (extension && imageExtensions.includes(extension)) {
    return FileImage;
  }

  return FileText;
}

function getCategoryLabel(category: string) {
  return (
    documentCategories.find((item) => item.value === category)?.label ||
    'Other'
  );
}

export default function Documents() {
  const { user } = useAuth();

  const [projects, setProjects] = useState<ProjectSummary[]>([]);
  const [files, setFiles] = useState<ProjectFileRecord[]>([]);

  const [selectedProjectId, setSelectedProjectId] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [category, setCategory] = useState('content');

  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);

  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [dragActive, setDragActive] = useState(false);

  useEffect(() => {
    const currentUserId = user?.id;

    if (!currentUserId) {
      setLoading(false);
      setProjects([]);
      setFiles([]);
      return;
    }

    let isMounted = true;

    async function loadDocuments() {
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
                'id, project_id, file_name, file_size, storage_path, created_at'
              )
              .in('project_id', projectIds)
              .order('created_at', { ascending: false });

          if (filesError) {
            throw filesError;
          }

          projectFiles = (filesData || []) as ProjectFileRecord[];
        }

        if (!isMounted) return;

        setProjects(ownedProjects);
        setFiles(projectFiles);

        if (ownedProjects.length > 0) {
          setSelectedProjectId(ownedProjects[0].id);
        }
      } catch (err) {
        console.error('Error loading documents:', err);

        if (isMounted) {
          setError(
            'We could not load your documents right now. Please refresh the page and try again.'
          );
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    loadDocuments();

    return () => {
      isMounted = false;
    };
  }, [user?.id]);

  const selectFile = (file: File | null) => {
    setError(null);
    setSuccess(null);

    if (!file) {
      setSelectedFile(null);
      return;
    }

    if (file.size > MAX_FILE_SIZE) {
      setSelectedFile(null);
      setError('The maximum file size is 20 MB.');
      return;
    }

    setSelectedFile(file);
  };

  const handleFileChange = (
    event: ChangeEvent<HTMLInputElement>
  ) => {
    selectFile(event.target.files?.[0] || null);
  };

  const handleDragOver = (
    event: React.DragEvent<HTMLLabelElement>
  ) => {
    event.preventDefault();
    setDragActive(true);
  };

  const handleDragLeave = (
    event: React.DragEvent<HTMLLabelElement>
  ) => {
    event.preventDefault();
    setDragActive(false);
  };

  const handleDrop = (
    event: React.DragEvent<HTMLLabelElement>
  ) => {
    event.preventDefault();
    setDragActive(false);

    const file = event.dataTransfer.files?.[0];

    if (file) {
      selectFile(file);
    }
  };

  const handleUpload = async (
    event: React.FormEvent
  ) => {
    event.preventDefault();

    if (!user?.id) {
      setError('You must be signed in to upload documents.');
      return;
    }

    if (!selectedProjectId) {
      setError('Please select the project this file belongs to.');
      return;
    }

    if (!selectedFile) {
      setError('Please choose a file before uploading.');
      return;
    }

    setUploading(true);
    setError(null);
    setSuccess(null);

    try {
      const safeFileName = selectedFile.name.replace(
        /[^a-zA-Z0-9._-]/g,
        '_'
      );

      const storagePath =
        `${user.id}/${selectedProjectId}/${Date.now()}-${safeFileName}`;

      const { error: uploadError } = await supabase.storage
        .from('project-documents')
        .upload(storagePath, selectedFile, {
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
            is_internal: false,
          })
          .select(
            'id, project_id, file_name, file_size, storage_path, created_at'
          )
          .single();

      if (insertError) {
        await supabase.storage
          .from('project-documents')
          .remove([storagePath]);

        throw insertError;
      }

      if (insertedFile) {
        setFiles((currentFiles) => [
          insertedFile as ProjectFileRecord,
          ...currentFiles,
        ]);
      }

      setSelectedFile(null);

      setSuccess(
        `${selectedFile.name} has been uploaded successfully. Your Avelixa team can now access it.`
      );
    } catch (err: any) {
      console.error('Error uploading document:', err);

      const message =
        err?.message ||
        'Your file could not be uploaded right now.';

      setError(`Upload failed: ${message}`);
    } finally {
      setUploading(false);
    }
  };

  const handleDownload = async (
    record: ProjectFileRecord
  ) => {
    setError(null);

    try {
      const { data, error: downloadError } =
        await supabase.storage
          .from('project-documents')
          .download(record.storage_path);

      if (downloadError) {
        throw downloadError;
      }

      const url = window.URL.createObjectURL(data);
      const link = document.createElement('a');

      link.href = url;
      link.download = record.file_name;

      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Error downloading document:', err);

      setError(
        'This file could not be downloaded. Please try again.'
      );
    }
  };

  const filesByProject = useMemo(() => {
    return projects.map((project) => ({
      project,
      files: files.filter(
        (file) => file.project_id === project.id
      ),
    }));
  }, [projects, files]);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="glass rounded-2xl border border-ink-800/50 p-8">
          <div className="flex items-center gap-3 text-white">
            <Loader2 className="h-5 w-5 animate-spin text-accent-500" />
            <span>Loading your documents...</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <div className="flex items-center gap-3">
          <div className="rounded-xl bg-accent-500/10 p-3 text-accent-400">
            <FolderOpen className="h-6 w-6" />
          </div>

          <div>
            <h2 className="text-2xl font-semibold text-white">
              Documents
            </h2>

            <p className="mt-1 text-sm text-gray-400">
              Send your business materials to the Avelixa team securely.
            </p>
          </div>
        </div>
      </div>

      {error && (
        <div className="rounded-2xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-300">
          {error}
        </div>
      )}

      {success && (
        <div className="flex items-start gap-3 rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-4 text-sm text-emerald-300">
          <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0" />
          <span>{success}</span>
        </div>
      )}

      {projects.length === 0 ? (
        <div className="glass rounded-2xl border border-ink-800/50 p-10 text-center">
          <FolderOpen className="mx-auto h-10 w-10 text-gray-600" />

          <h3 className="mt-4 text-lg font-medium text-white">
            No projects yet
          </h3>

          <p className="mx-auto mt-2 max-w-md text-sm text-gray-400">
            Once Avelixa creates a project for your business,
            you will be able to upload your logo, photos,
            content and other materials here.
          </p>
        </div>
      ) : (
        <>
          <div className="glass rounded-2xl border border-ink-800/50 p-6 md:p-8">
            <div>
              <h3 className="text-lg font-medium text-white">
                Send materials to Avelixa
              </h3>

              <p className="mt-1 text-sm text-gray-400">
                Upload the files our team needs to build your website.
              </p>
            </div>

            <form
              onSubmit={handleUpload}
              className="mt-6 space-y-6"
            >
              <div>
                <label className="mb-2 block text-sm font-medium text-gray-300">
                  Project
                </label>

                <select
                  value={selectedProjectId}
                  onChange={(event) =>
                    setSelectedProjectId(event.target.value)
                  }
                  className="w-full rounded-xl border border-ink-800/60 bg-white/5 px-4 py-3 text-sm text-white outline-none transition focus:border-accent-500/60"
                >
                  {projects.map((project) => (
                    <option
                      key={project.id}
                      value={project.id}
                      className="bg-ink-900"
                    >
                      {project.title}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-gray-300">
                  What are you uploading?
                </label>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {documentCategories.map((item) => {
                    const active = category === item.value;

                    return (
                      <button
                        key={item.value}
                        type="button"
                        onClick={() =>
                          setCategory(item.value)
                        }
                        className={`rounded-xl border p-4 text-left transition ${
                          active
                            ? 'border-accent-500/50 bg-accent-500/10'
                            : 'border-ink-800/60 bg-white/[0.03] hover:bg-white/[0.06]'
                        }`}
                      >
                        <div
                          className={`text-sm font-medium ${
                            active
                              ? 'text-accent-300'
                              : 'text-white'
                          }`}
                        >
                          {item.label}
                        </div>

                        <div className="mt-1 text-xs leading-5 text-gray-500">
                          {item.description}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label
                  htmlFor="client-document-upload"
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  className={`block cursor-pointer rounded-2xl border-2 border-dashed p-8 text-center transition ${
                    dragActive
                      ? 'border-accent-400 bg-accent-500/10'
                      : 'border-ink-700 bg-white/[0.02] hover:border-accent-500/40 hover:bg-white/[0.04]'
                  }`}
                >
                  <input
                    id="client-document-upload"
                    type="file"
                    onChange={handleFileChange}
                    className="hidden"
                  />

                  <UploadCloud className="mx-auto h-10 w-10 text-accent-400" />

                  <div className="mt-4 text-sm font-medium text-white">
                    Drop your file here or click to browse
                  </div>

                  <div className="mt-2 text-xs text-gray-500">
                    Maximum file size: 20 MB
                  </div>
                </label>
              </div>

              {selectedFile && (
                <div className="rounded-2xl border border-accent-500/20 bg-accent-500/5 p-4">
                  <div className="flex items-center gap-4">
                    <div className="rounded-xl bg-accent-500/10 p-3 text-accent-400">
                      {(() => {
                        const Icon = getFileIcon(
                          selectedFile.name
                        );

                        return <Icon className="h-6 w-6" />;
                      })()}
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-medium text-white">
                        {selectedFile.name}
                      </div>

                      <div className="mt-1 text-xs text-gray-500">
                        {formatFileSize(selectedFile.size)}
                        {' • '}
                        {getCategoryLabel(category)}
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() =>
                        setSelectedFile(null)
                      }
                      className="rounded-lg p-2 text-gray-500 transition hover:bg-white/10 hover:text-white"
                      aria-label="Remove selected file"
                    >
                      <X className="h-5 w-5" />
                    </button>
                  </div>
                </div>
              )}

              <button
                type="submit"
                disabled={
                  uploading ||
                  !selectedProjectId ||
                  !selectedFile
                }
                className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-accent-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-accent-500 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
              >
                {uploading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Uploading...
                  </>
                ) : (
                  <>
                    <UploadCloud className="h-4 w-4" />
                    Upload material
                  </>
                )}
              </button>
            </form>
          </div>

          <div className="glass rounded-2xl border border-ink-800/50 p-6 md:p-8">
            <div className="flex items-center gap-3">
              <FileText className="h-5 w-5 text-accent-400" />

              <div>
                <h3 className="text-lg font-medium text-white">
                  Your uploaded files
                </h3>

                <p className="mt-1 text-sm text-gray-400">
                  Files you have sent to the Avelixa team.
                </p>
              </div>
            </div>

            <div className="mt-6 space-y-6">
              {filesByProject.map(
                ({ project, files: projectFiles }) => (
                  <div key={project.id}>
                    <div className="mb-3 flex items-center gap-2">
                      <FolderOpen className="h-4 w-4 text-accent-400" />

                      <h4 className="text-sm font-medium text-white">
                        {project.title}
                      </h4>

                      <span className="rounded-full bg-white/5 px-2 py-0.5 text-xs text-gray-500">
                        {projectFiles.length}
                      </span>
                    </div>

                    {projectFiles.length === 0 ? (
                      <div className="rounded-xl border border-dashed border-ink-800/60 bg-white/[0.02] p-5 text-sm text-gray-500">
                        No files uploaded for this project yet.
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {projectFiles.map((record) => {
                          const Icon = getFileIcon(
                            record.file_name
                          );

                          return (
                            <div
                              key={record.id}
                              className="flex flex-col gap-4 rounded-2xl border border-ink-800/50 bg-white/[0.03] p-4 transition hover:bg-white/[0.05] sm:flex-row sm:items-center"
                            >
                              <div className="rounded-xl bg-white/5 p-3 text-accent-400">
                                <Icon className="h-5 w-5" />
                              </div>

                              <div className="min-w-0 flex-1">
                                <div className="truncate text-sm font-medium text-white">
                                  {record.file_name}
                                </div>

                                <div className="mt-1 text-xs text-gray-500">
                                  {formatFileSize(
                                    record.file_size
                                  )}
                                  {' • '}
                                  Uploaded{' '}
                                  {new Date(
                                    record.created_at
                                  ).toLocaleDateString()}
                                </div>

                                <div className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-emerald-400">
                                  <CheckCircle2 className="h-3 w-3" />
                                  Uploaded
                                </div>
                              </div>

                              <button
                                type="button"
                                onClick={() =>
                                  handleDownload(record)
                                }
                                className="inline-flex items-center justify-center gap-2 rounded-xl border border-ink-800/60 bg-white/5 px-3 py-2 text-sm text-gray-300 transition hover:border-accent-500/40 hover:text-white"
                              >
                                <Download className="h-4 w-4" />
                                Download
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}