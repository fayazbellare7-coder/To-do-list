import React, { useMemo, useState } from 'react';
import {
  ArrowLeft,
  Calendar,
  Edit3,
  FolderKanban,
  Plus,
  Trash2,
  X,
} from 'lucide-react';
import { useDayflow } from '../../context/DayflowContext';
import { Project, ProjectStatus } from '../../types/dayflow';
import { formatDisplayDate, getTodayStr } from '../../utils/dateUtils';
import { TasksWorkspaceView } from '../tasks/TasksWorkspaceView';
import { ConfirmDialog } from '../common/ConfirmDialog';

const PROJECT_COLORS = [
  '#7c3aed',
  '#2563eb',
  '#10b981',
  '#f59e0b',
  '#ec4899',
  '#06b6d4',
];

export function ProjectsView() {
  const {
    dataset,
    selectedProjectId,
    setSelectedProjectId,
    addProject,
    updateProject,
    deleteProject,
    pushToast,
  } = useDayflow();

  const [modalOpen, setModalOpen] = useState(false);
  const [editingProj, setEditingProj] = useState<Project | null>(null);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [deadline, setDeadline] = useState(getTodayStr());
  const [color, setColor] = useState(PROJECT_COLORS[0]);
  const [status, setStatus] = useState<ProjectStatus>('active');
  const [formError, setFormError] = useState('');

  const [deletingProject, setDeletingProject] = useState<Project | null>(null);

  const selectedProject = useMemo(
    () => dataset.projects.find((p) => p.id === selectedProjectId) || null,
    [dataset.projects, selectedProjectId]
  );

  const openCreateModal = () => {
    setEditingProj(null);
    setName('');
    setDescription('');
    setDeadline(getTodayStr());
    setColor(PROJECT_COLORS[0]);
    setStatus('active');
    setFormError('');
    setModalOpen(true);
  };

  const openEditModal = (proj: Project, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingProj(proj);
    setName(proj.name);
    setDescription(proj.description);
    setDeadline(proj.deadline);
    setColor(proj.color);
    setStatus(proj.status);
    setFormError('');
    setModalOpen(true);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setFormError('Project name is required.');
      return;
    }
    if (editingProj) {
      updateProject(editingProj.id, {
        name: name.trim(),
        description: description.trim(),
        deadline,
        color,
        status,
      });
      pushToast({ message: 'Project updated', tone: 'success' });
    } else {
      addProject({
        name: name.trim(),
        description: description.trim(),
        deadline,
        color,
        status,
      });
      pushToast({ message: `Project "${name.trim()}" created`, tone: 'success' });
    }
    setModalOpen(false);
  };

  if (selectedProject) {
    const projTasks = dataset.tasks.filter((t) => t.projectId === selectedProject.id);
    const done = projTasks.filter((t) => t.status === 'completed').length;
    const pct = projTasks.length > 0 ? Math.round((done / projTasks.length) * 100) : 0;

    return (
      <div className="space-y-6">
        <div className="rounded-2xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-[#17171b]">
          <button
            type="button"
            onClick={() => setSelectedProjectId(null)}
            className="mb-3 inline-flex items-center gap-1.5 text-xs font-medium text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>Back to Projects</span>
          </button>

          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
            <div>
              <div className="flex items-center gap-2.5">
                <span
                  className="h-3 w-3 rounded-full"
                  style={{ backgroundColor: selectedProject.color }}
                />
                <h2 className="font-display text-xl font-bold text-zinc-900 dark:text-zinc-100">
                  {selectedProject.name}
                </h2>
              </div>
              {selectedProject.description && (
                <p className="mt-1 text-xs text-zinc-600 dark:text-zinc-400">
                  {selectedProject.description}
                </p>
              )}
              <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-zinc-500 dark:text-zinc-400">
                <span className="capitalize">{selectedProject.status.replace('_', ' ')}</span>
                <span>·</span>
                <span className="font-mono tabular-nums">
                  Due {formatDisplayDate(selectedProject.deadline)}
                </span>
                <span>·</span>
                <span className="font-mono tabular-nums">
                  {done}/{projTasks.length} tasks complete ({pct}%)
                </span>
              </div>
            </div>

            <div className="w-full sm:w-52">
              <div className="h-2 w-full overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800">
                <div
                  className="h-full rounded-full transition-all duration-300"
                  style={{ width: `${pct}%`, backgroundColor: selectedProject.color }}
                />
              </div>
            </div>
          </div>
        </div>

        <TasksWorkspaceView scope="project" projectId={selectedProject.id} />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-display text-lg font-semibold text-zinc-900 dark:text-zinc-100">
            Projects
          </h2>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            Group multi-step goals and track automated completion progress
          </p>
        </div>
        <button
          type="button"
          onClick={openCreateModal}
          className="inline-flex items-center gap-1.5 rounded-lg df-accent-bg px-4 py-2 text-xs font-medium text-white shadow-xs"
        >
          <Plus className="h-3.5 w-3.5" />
          <span>New Project</span>
        </button>
      </div>

      {dataset.projects.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-zinc-200 py-16 text-center dark:border-zinc-800">
          <FolderKanban className="h-8 w-8 text-zinc-400" />
          <p className="mt-3 text-sm font-medium text-zinc-800 dark:text-zinc-200">
            No projects yet
          </p>
          <p className="mt-1 max-w-sm text-xs text-zinc-500">
            Create a project to organize related tasks under a shared deadline.
          </p>
          <button
            type="button"
            onClick={openCreateModal}
            className="mt-4 inline-flex items-center gap-1.5 rounded-lg df-accent-bg px-4 py-2 text-xs font-medium text-white"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>Create First Project</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {dataset.projects.map((proj) => {
            const projTasks = dataset.tasks.filter((t) => t.projectId === proj.id);
            const completed = projTasks.filter((t) => t.status === 'completed').length;
            const progress =
              projTasks.length > 0 ? Math.round((completed / projTasks.length) * 100) : 0;

            return (
              <div
                key={proj.id}
                onClick={() => setSelectedProjectId(proj.id)}
                className="group cursor-pointer rounded-2xl border border-zinc-200 bg-white p-5 transition-all hover:border-zinc-300 dark:border-zinc-800 dark:bg-[#17171b] dark:hover:border-zinc-700"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span
                      className="h-3 w-3 shrink-0 rounded-full"
                      style={{ backgroundColor: proj.color }}
                    />
                    <h3 className="truncate font-display text-base font-semibold text-zinc-900 dark:text-zinc-100">
                      {proj.name}
                    </h3>
                  </div>

                  <div className="flex items-center gap-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100">
                    <button
                      type="button"
                      onClick={(e) => openEditModal(proj, e)}
                      className="rounded p-1 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700 dark:hover:bg-zinc-800"
                      aria-label={`Edit ${proj.name}`}
                    >
                      <Edit3 className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setDeletingProject(proj);
                      }}
                      className="rounded p-1 text-zinc-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-500/10"
                      aria-label={`Delete ${proj.name}`}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>

                {proj.description && (
                  <p className="mt-2 line-clamp-2 text-xs leading-relaxed text-zinc-500 dark:text-zinc-400">
                    {proj.description}
                  </p>
                )}

                <div className="mt-4 flex items-center justify-between text-xs text-zinc-500 dark:text-zinc-400">
                  <span className="capitalize">{proj.status.replace('_', ' ')}</span>
                  <span className="inline-flex items-center gap-1 font-mono tabular-nums">
                    <Calendar className="h-3 w-3" />
                    {formatDisplayDate(proj.deadline)}
                  </span>
                </div>

                <div className="mt-3">
                  <div className="mb-1.5 flex items-center justify-between text-xs">
                    <span className="font-mono tabular-nums text-zinc-500 dark:text-zinc-400">
                      {completed}/{projTasks.length} tasks
                    </span>
                    <span className="font-mono font-semibold tabular-nums text-zinc-900 dark:text-zinc-100">
                      {progress}%
                    </span>
                  </div>
                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800">
                    <div
                      className="h-full rounded-full transition-all duration-300"
                      style={{ width: `${progress}%`, backgroundColor: proj.color }}
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Create / Edit Project Modal */}
      {modalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
        >
          <div
            onClick={() => setModalOpen(false)}
            className="fixed inset-0 bg-black/50 backdrop-blur-[2px]"
          />
          <form
            onSubmit={handleSave}
            className="relative z-10 w-full max-w-md rounded-xl border border-zinc-200 bg-white p-6 shadow-xl dark:border-zinc-800 dark:bg-[#19191d]"
          >
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">
                {editingProj ? 'Edit Project' : 'Create Project'}
              </h3>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="rounded p-1 text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="mb-1 block text-xs font-medium text-zinc-500">
                  Project name
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => {
                    setName(e.target.value);
                    if (formError) setFormError('');
                  }}
                  placeholder="e.g. Portfolio Redesign"
                  className="w-full rounded-lg border border-zinc-200 bg-transparent px-3 py-2 text-sm text-zinc-900 dark:border-zinc-800 dark:text-zinc-100"
                />
                {formError && <p className="mt-1 text-xs text-red-500">{formError}</p>}
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium text-zinc-500">
                  Description
                </label>
                <textarea
                  rows={2}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full rounded-lg border border-zinc-200 bg-transparent px-3 py-2 text-xs text-zinc-800 dark:border-zinc-800 dark:text-zinc-200"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-xs font-medium text-zinc-500">
                    Deadline
                  </label>
                  <input
                    type="date"
                    value={deadline}
                    onChange={(e) => setDeadline(e.target.value)}
                    className="w-full rounded-lg border border-zinc-200 bg-transparent px-2.5 py-2 text-xs text-zinc-900 dark:border-zinc-800 dark:text-zinc-100"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-zinc-500">
                    Status
                  </label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value as ProjectStatus)}
                    className="w-full rounded-lg border border-zinc-200 bg-white px-2.5 py-2 text-xs text-zinc-900 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-100"
                  >
                    <option value="active">Active</option>
                    <option value="on_hold">On Hold</option>
                    <option value="completed">Completed</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-medium text-zinc-500">
                  Color
                </label>
                <div className="flex items-center gap-2">
                  {PROJECT_COLORS.map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setColor(c)}
                      className={`h-6 w-6 rounded-full transition-transform ${
                        color === c ? 'scale-110 ring-2 ring-zinc-900 dark:ring-white' : ''
                      }`}
                      style={{ backgroundColor: c }}
                    />
                  ))}
                </div>
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="rounded-lg border border-zinc-200 px-4 py-2 text-xs font-medium text-zinc-700 dark:border-zinc-700 dark:text-zinc-300"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="rounded-lg df-accent-bg px-4 py-2 text-xs font-medium text-white"
              >
                {editingProj ? 'Save Project' : 'Create Project'}
              </button>
            </div>
          </form>
        </div>
      )}

      <ConfirmDialog
        open={Boolean(deletingProject)}
        title="Delete project?"
        description={`"${deletingProject?.name}" will be removed. Tasks inside it will remain in your workspace without a project assignment.`}
        confirmLabel="Delete Project"
        onConfirm={() => {
          if (deletingProject) deleteProject(deletingProject.id);
          setDeletingProject(null);
        }}
        onCancel={() => setDeletingProject(null)}
      />
    </div>
  );
}
