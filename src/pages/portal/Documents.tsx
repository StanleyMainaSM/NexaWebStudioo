import { ChangeEvent, useEffect, useMemo, useState } from 'react';
import { Download, FileText, Loader2, UploadCloud } from 'lucide-react';
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

function formatFileSize(size: number | null | undefined) {
  if (typeof size !== 'number' || size <= 0) return '—';
  if (size < 1024) return `${size} B`;
  const kb = size / 1024;
  if (kb < 1024) return `${kb.toFixed(1)} KB`;
  return `${(kb / 1024).toFixed(1)} MB`;
}

export default function Documents() {
  const { user } = useAuth();
  const [projects, setProjects] = useState<ProjectSummary[]>([]);
  const [files, setFiles] = useState<ProjectFileRecord[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    const currentUserId = user?.id;

    if (!currentUserId) {
      setLoading(false);
      return;
    }

    let isMounted = true;

    async function loadDocuments() {
      setLoading(true);
      setError(null);
      setSuccess(null);

      try {
        const { data: projectsData, error: projectsError } = await supabase
          .from('projects')
          .select('id, title')
          .eq('client_id', currentUserId)
          .order('created_at', { ascending: false });

        if (projectsError) throw projectsError;

        const ownedProjects = (projectsData || []) as ProjectSummary[];
        const projectIds = ownedProjects.map((project) => project.id);

        let projectFiles: ProjectFileRecord[] = [];
        if (projectIds.length > 0) {
          const { data: filesData, error: filesError } = await supabase
            .from('project_files')
            .select('id, project_id, file_name, file_size, storage_path, created_at')
            .in('project_id', projectIds)
            .order('created_at', { ascending: false });

          if (filesError) throw filesError;
          projectFiles = (filesData || []) as ProjectFileRecord[];
        }

        if (!isMounted) return;
        setProjects(ownedProjects);
        setFiles(projectFiles);
        setSelectedProjectId(ownedProjects[0]?.id || '');
      } catch (err) {
        console.error('Error loading documents', err);
        if (isMounted) {
          setError('We could not load your project documents right now.');
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

  const handleUpload = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!user?.id || !selectedProjectId || !selectedFile) return;

    setUploading(true);
    setError(null);
    setSuccess(null);

    try {
      const storagePath = `${user.id}/${selectedProjectId}/${Date.now()}-${selectedFile.name}`;
      const { error: uploadError } = await supabase.storage.from('project-documents').upload(storagePath, selectedFile, {
        cacheControl: '3600',
        upsert: false,
      });

      if (uploadError) throw uploadError;

      const { error: insertError } = await supabase.from('project_files').insert({
        project_id: selectedProjectId,
        uploaded_by: user.id,
        file_name: selectedFile.name,
        file_size: selectedFile.size,
        storage_path: storagePath,
        is_internal: false,
      });

      if (insertError) throw insertError;

      const { data: filesData, error: filesError } = await supabase
        .from('project_files')
        .select('id, project_id, file_name, file_size, storage_path, created_at')
        .eq('project_id', selectedProjectId)
        .order('created_at', { ascending: false });

      if (filesError) throw filesError;

      setFiles((filesData || []) as ProjectFileRecord[]);
      setSelectedFile(null);
      setSuccess('Your file was uploaded successfully.');
    } catch (err) {
      console.error('Error uploading document', err);
      setError('Your file could not be uploaded right now.');
    } finally {
      setUploading(false);
    }
  };

  const handleDownload = async (record: ProjectFileRecord) => {
    try {
      const { data, error } = await supabase.storage.from('project-documents').download(record.storage_path);
      if (error) throw error;

      const url = window.URL.createObjectURL(data);
      const link = document.createElement('a');
      link.href = url;
      link.download = record.file_name;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Error downloading document', err);
      setError('This file could not be downloaded right now.');
    }
  };

  const projectTitleById = useMemo(() => Object.fromEntries(projects.map((project) => [project.id, project.title])), [projects]);

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="glass rounded-2xl p-6 border border-ink-800/50">
          <div className="flex items-center gap-3 text-white">
            <Loader2 className="w-5 h-5 animate-spin text-accent-500" />
            <span>Loading your documents…</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-white">Documents</h2>
        <p className="mt-2 text-sm text-gray-400">Access the files shared with your projects and upload new documents where needed.</p>
      </div>

      {error ? <div className="rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-300">{error}</div> : null}
      {success ? <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-300">{success}</div> : null}

      <div className="glass rounded-2xl border border-ink-800/50 p-6">
        <div className="flex items-center gap-3">
          <UploadCloud className="w-5 h-5 text-accent-500" />
          <h3 className="text-lg font-medium text-white">Upload a document</h3>
        </div>

        <form onSubmit={handleUpload} className="mt-5 space-y-4">
          <label className="block text-sm text-gray-300">
            <span className="mb-2 block">Project</span>
            <select
              value={selectedProjectId}
              onChange={(event) => setSelectedProjectId(event.target.value)}
              className="w-full rounded-xl border border-ink-800/60 bg-white/5 px-4 py-3 text-sm text-white outline-none"
            >
              {projects.map((project) => (
                <option key={project.id} value={project.id} className="bg-ink-900">
                  {project.title}
                </option>
              ))}
            </select>
          </label>

          <label className="block text-sm text-gray-300">
            <span className="mb-2 block">Select file</span>
            <input
              type="file"
              onChange={(event: ChangeEvent<HTMLInputElement>) => setSelectedFile(event.target.files?.[0] || null)}
              className="w-full rounded-xl border border-dashed border-ink-800/60 bg-white/5 px-4 py-3 text-sm text-gray-200"
            />
          </label>

          <button
            type="submit"
            disabled={uploading || !selectedProjectId || !selectedFile}
            className="inline-flex items-center gap-2 rounded-xl bg-accent-600 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-accent-500 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <UploadCloud className="w-4 h-4" />}
            {uploading ? 'Uploading…' : 'Upload file'}
          </button>
        </form>
      </div>

      <div className="glass rounded-2xl border border-ink-800/50 p-6">
        <div className="flex items-center gap-3">
          <FileText className="w-5 h-5 text-accent-500" />
          <h3 className="text-lg font-medium text-white">Your project files</h3>
        </div>

        {files.length === 0 ? (
          <div className="mt-5 rounded-2xl border border-dashed border-ink-700/70 bg-white/[0.03] p-6 text-center text-sm text-gray-400">
            No project files have been shared with your account yet.
          </div>
        ) : (
          <div className="mt-5 space-y-3">
            {files.map((record) => (
              <div key={record.id} className="flex flex-col gap-3 rounded-2xl border border-ink-800/50 bg-white/5 p-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <div className="text-sm font-medium text-white">{record.file_name}</div>
                  <div className="mt-1 text-sm text-gray-400">
                    {projectTitleById[record.project_id] || 'Project'} • {formatFileSize(record.file_size)} • {new Date(record.created_at).toLocaleDateString()}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => handleDownload(record)}
                  className="inline-flex items-center gap-2 rounded-xl border border-ink-800/60 bg-white/5 px-3 py-2 text-sm text-gray-200 transition hover:border-accent-500/40 hover:text-white"
                >
                  <Download className="w-4 h-4" />
                  Download
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
