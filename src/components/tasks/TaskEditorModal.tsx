import React, { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import {
  Check,
  Copy,
  Loader2,
  Plus,
  Trash2,
  Wand2,
  X,
} from 'lucide-react';
import { useDayflow } from '../../context/DayflowContext';
import {
  PriorityLevel,
  RecurringRule,
  Subtask,
  TaskStatus,
} from '../../types/dayflow';
import { AIBreakdownResponse, generateAiTaskBreakdown } from '../../services/aiService';
import { ConfirmDialog } from '../common/ConfirmDialog';
import { ICON_OPTIONS } from '../../utils/iconMap';

const CATEGORY_COLORS = ['#8b5cf6', '#3b82f6', '#10b981', '#f59e0b', '#ec4899', '#06b6d4', '#ef4444'];

export function TaskEditorModal() {
  const {
    dataset,
    editingTask,
    setEditingTask,
    updateTask,
    deleteTask,
    duplicateTask,
    addCategory,
    pushToast,
  } = useDayflow();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [dueTime, setDueTime] = useState('');
  const [priority, setPriority] = useState<PriorityLevel>('medium');
  const [status, setStatus] = useState<TaskStatus>('todo');
  const [categoryId, setCategoryId] = useState('');
  const [projectId, setProjectId] = useState('');
  const [estimatedMinutes, setEstimatedMinutes] = useState(30);
  const [recurring, setRecurring] = useState<RecurringRule>('none');
  const [notes, setNotes] = useState('');
  const [tagsInput, setTagsInput] = useState('');
  const [subtasks, setSubtasks] = useState<Subtask[]>([]);
  const [newSubtask, setNewSubtask] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  // Custom Category inline creator
  const [creatingCategory, setCreatingCategory] = useState(false);
  const [newCatName, setNewCatName] = useState('');
  const [newCatColor, setNewCatColor] = useState(CATEGORY_COLORS[0]);
  const [newCatIcon, setNewCatIcon] = useState('Layers');

  // AI Breakdown state (review & approve before applying)
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState('');
  const [aiPreview, setAiPreview] = useState<AIBreakdownResponse | null>(null);

  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);

  useEffect(() => {
    if (editingTask) {
      setTitle(editingTask.title);
      setDescription(editingTask.description);
      setDueDate(editingTask.dueDate);
      setDueTime(editingTask.dueTime);
      setPriority(editingTask.priority);
      setStatus(editingTask.status);
      setCategoryId(editingTask.categoryId);
      setProjectId(editingTask.projectId || '');
      setEstimatedMinutes(editingTask.estimatedMinutes || 30);
      setRecurring(editingTask.recurring || 'none');
      setNotes(editingTask.notes || '');
      setTagsInput(editingTask.tags.join(', '));
      setSubtasks(editingTask.subtasks || []);
      setNewSubtask('');
      setErrorMsg('');
      setAiPreview(null);
      setAiError('');
      setCreatingCategory(false);
    }
  }, [editingTask]);

  if (!editingTask) return null;

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setErrorMsg('Task title is required.');
      return;
    }
    const tags = tagsInput
      .split(',')
      .map((s) => s.trim().replace(/^#/, ''))
      .filter(Boolean);

    updateTask(editingTask.id, {
      title: title.trim(),
      description: description.trim(),
      dueDate,
      dueTime,
      priority,
      status,
      categoryId,
      projectId: projectId || undefined,
      estimatedMinutes: Math.max(5, Number(estimatedMinutes) || 30),
      recurring,
      notes,
      tags,
      subtasks,
    });

    pushToast({ message: 'Task updated', tone: 'success' });
    setEditingTask(null);
  };

  const handleAddSubtask = () => {
    if (!newSubtask.trim()) return;
    setSubtasks((prev) => [
      ...prev,
      {
        id: `st-${Date.now().toString(36)}`,
        title: newSubtask.trim(),
        completed: false,
      },
    ]);
    setNewSubtask('');
  };

  const handleToggleSubtask = (id: string) => {
    setSubtasks((prev) =>
      prev.map((st) => (st.id === id ? { ...st, completed: !st.completed } : st))
    );
  };

  const handleDeleteSubtask = (id: string) => {
    setSubtasks((prev) => prev.filter((st) => st.id !== id));
  };

  const handleCreateCategory = () => {
    if (!newCatName.trim()) return;
    const created = addCategory({
      name: newCatName.trim(),
      color: newCatColor,
      iconName: newCatIcon,
    });
    setCategoryId(created.id);
    setNewCatName('');
    setCreatingCategory(false);
    pushToast({ message: `Category "${created.name}" created`, tone: 'success' });
  };

  const handleAiBreakdown = async () => {
    if (!title.trim()) {
      setAiError('Enter a task title first.');
      return;
    }
    setAiLoading(true);
    setAiError('');
    setAiPreview(null);
    try {
      const result = await generateAiTaskBreakdown(title, description, dueDate);
      setAiPreview(result);
    } catch (err) {
      setAiError(err instanceof Error ? err.message : 'Unable to generate breakdown.');
    } finally {
      setAiLoading(false);
    }
  };

  const applyAiPreview = () => {
    if (!aiPreview) return;
    const newItems: Subtask[] = aiPreview.subtasks.map((stTitle, idx) => ({
      id: `st-ai-${Date.now().toString(36)}-${idx}`,
      title: stTitle,
      completed: false,
    }));
    setSubtasks((prev) => [...prev, ...newItems]);
    if (['urgent', 'high', 'medium', 'low'].includes(aiPreview.suggestedPriority)) {
      setPriority(aiPreview.suggestedPriority);
    }
    if (/^\d{4}-\d{2}-\d{2}$/.test(aiPreview.suggestedDueDate)) {
      setDueDate(aiPreview.suggestedDueDate);
    }
    if (aiPreview.estimatedMinutes > 0) {
      setEstimatedMinutes(aiPreview.estimatedMinutes);
    }
    setAiPreview(null);
    pushToast({ message: 'Applied AI subtasks and estimate', tone: 'success' });
  };

  return (
    <>
      <AnimatePresence>
        <div
          className="fixed inset-0 z-50 flex items-center justify-end"
          role="dialog"
          aria-modal="true"
          aria-label="Edit Task"
        >
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setEditingTask(null)}
            className="fixed inset-0 bg-black/50 backdrop-blur-[2px]"
          />

          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
            className="relative z-10 flex h-full w-full max-w-xl flex-col border-l border-zinc-200 bg-white shadow-2xl dark:border-zinc-800 dark:bg-[#16161a]"
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-zinc-200 px-5 py-3.5 dark:border-zinc-800">
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                  Task Details
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => {
                    duplicateTask(editingTask.id);
                    setEditingTask(null);
                  }}
                  className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium text-zinc-600 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800"
                  title="Duplicate task"
                >
                  <Copy className="h-3.5 w-3.5" />
                  <span>Duplicate</span>
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmDeleteOpen(true)}
                  className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-500/10"
                  title="Delete task"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  <span>Delete</span>
                </button>
                <button
                  type="button"
                  onClick={() => setEditingTask(null)}
                  className="rounded-lg p-1.5 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700 dark:hover:bg-zinc-800 dark:hover:text-zinc-200"
                  aria-label="Close editor"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Body */}
            <form onSubmit={handleSave} className="flex flex-1 flex-col overflow-hidden">
              <div className="flex-1 space-y-5 overflow-y-auto p-5">
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-zinc-500 dark:text-zinc-400">
                    Task title
                  </label>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => {
                      setTitle(e.target.value);
                      if (errorMsg) setErrorMsg('');
                    }}
                    className="w-full rounded-lg border border-zinc-200 bg-transparent px-3 py-2 text-sm font-medium text-zinc-900 focus:border-violet-500 focus:outline-none dark:border-zinc-800 dark:text-zinc-100"
                  />
                  {errorMsg && (
                    <p className="mt-1 text-xs text-red-600 dark:text-red-400">{errorMsg}</p>
                  )}
                </div>

                <div>
                  <label className="mb-1.5 block text-xs font-medium text-zinc-500 dark:text-zinc-400">
                    Description
                  </label>
                  <textarea
                    rows={2}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Add context or acceptance criteria..."
                    className="w-full rounded-lg border border-zinc-200 bg-transparent px-3 py-2 text-sm text-zinc-800 placeholder:text-zinc-400 focus:border-violet-500 focus:outline-none dark:border-zinc-800 dark:text-zinc-200"
                  />
                </div>

                {/* Metadata Grid */}
                <div className="grid grid-cols-2 gap-3.5 sm:grid-cols-3">
                  <div>
                    <label className="mb-1 block text-xs font-medium text-zinc-500 dark:text-zinc-400">
                      Due date
                    </label>
                    <input
                      type="date"
                      value={dueDate}
                      onChange={(e) => setDueDate(e.target.value)}
                      className="w-full rounded-lg border border-zinc-200 bg-transparent px-2.5 py-2 text-xs text-zinc-900 dark:border-zinc-800 dark:text-zinc-100"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-zinc-500 dark:text-zinc-400">
                      Due time
                    </label>
                    <input
                      type="time"
                      value={dueTime}
                      onChange={(e) => setDueTime(e.target.value)}
                      className="w-full rounded-lg border border-zinc-200 bg-transparent px-2.5 py-2 text-xs text-zinc-900 dark:border-zinc-800 dark:text-zinc-100"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-zinc-500 dark:text-zinc-400">
                      Priority
                    </label>
                    <select
                      value={priority}
                      onChange={(e) => setPriority(e.target.value as PriorityLevel)}
                      className="w-full rounded-lg border border-zinc-200 bg-white px-2.5 py-2 text-xs text-zinc-900 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-100"
                    >
                      <option value="urgent">Urgent</option>
                      <option value="high">High</option>
                      <option value="medium">Medium</option>
                      <option value="low">Low</option>
                    </select>
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-zinc-500 dark:text-zinc-400">
                      Status
                    </label>
                    <select
                      value={status}
                      onChange={(e) => setStatus(e.target.value as TaskStatus)}
                      className="w-full rounded-lg border border-zinc-200 bg-white px-2.5 py-2 text-xs text-zinc-900 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-100"
                    >
                      <option value="todo">To Do</option>
                      <option value="in_progress">In Progress</option>
                      <option value="completed">Completed</option>
                    </select>
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-zinc-500 dark:text-zinc-400">
                      Est. minutes
                    </label>
                    <input
                      type="number"
                      min={5}
                      max={480}
                      value={estimatedMinutes}
                      onChange={(e) => setEstimatedMinutes(Number(e.target.value))}
                      className="w-full rounded-lg border border-zinc-200 bg-transparent px-2.5 py-2 font-mono text-xs tabular-nums text-zinc-900 dark:border-zinc-800 dark:text-zinc-100"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-zinc-500 dark:text-zinc-400">
                      Recurring
                    </label>
                    <select
                      value={recurring}
                      onChange={(e) => setRecurring(e.target.value as RecurringRule)}
                      className="w-full rounded-lg border border-zinc-200 bg-white px-2.5 py-2 text-xs text-zinc-900 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-100"
                    >
                      <option value="none">None</option>
                      <option value="daily">Daily</option>
                      <option value="weekdays">Weekdays</option>
                      <option value="weekly">Weekly</option>
                      <option value="monthly">Monthly</option>
                    </select>
                  </div>
                </div>

                {/* Category & Project */}
                <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
                  <div>
                    <div className="mb-1 flex items-center justify-between">
                      <label className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
                        Category
                      </label>
                      <button
                        type="button"
                        onClick={() => setCreatingCategory((p) => !p)}
                        className="text-[11px] font-medium df-accent-text hover:underline"
                      >
                        {creatingCategory ? 'Cancel' : '+ New category'}
                      </button>
                    </div>
                    <select
                      value={categoryId}
                      onChange={(e) => setCategoryId(e.target.value)}
                      className="w-full rounded-lg border border-zinc-200 bg-white px-2.5 py-2 text-xs text-zinc-900 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-100"
                    >
                      {dataset.categories.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="mb-1 block text-xs font-medium text-zinc-500 dark:text-zinc-400">
                      Project
                    </label>
                    <select
                      value={projectId}
                      onChange={(e) => setProjectId(e.target.value)}
                      className="w-full rounded-lg border border-zinc-200 bg-white px-2.5 py-2 text-xs text-zinc-900 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-100"
                    >
                      <option value="">No project</option>
                      {dataset.projects.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {creatingCategory && (
                  <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-3 dark:border-zinc-800 dark:bg-zinc-900/60">
                    <p className="mb-2 text-xs font-medium text-zinc-700 dark:text-zinc-200">
                      Create Custom Category
                    </p>
                    <div className="flex flex-wrap items-center gap-2">
                      <input
                        type="text"
                        value={newCatName}
                        onChange={(e) => setNewCatName(e.target.value)}
                        placeholder="Category name"
                        className="flex-1 rounded-md border border-zinc-200 bg-white px-2.5 py-1.5 text-xs dark:border-zinc-700 dark:bg-zinc-900"
                      />
                      <select
                        value={newCatIcon}
                        onChange={(e) => setNewCatIcon(e.target.value)}
                        className="rounded-md border border-zinc-200 bg-white px-2 py-1.5 text-xs dark:border-zinc-700 dark:bg-zinc-900"
                      >
                        {ICON_OPTIONS.map((ic) => (
                          <option key={ic} value={ic}>
                            {ic}
                          </option>
                        ))}
                      </select>
                      <div className="flex items-center gap-1">
                        {CATEGORY_COLORS.map((col) => (
                          <button
                            key={col}
                            type="button"
                            onClick={() => setNewCatColor(col)}
                            className={`h-5 w-5 rounded-full transition-transform ${
                              newCatColor === col ? 'scale-110 ring-2 ring-zinc-900 dark:ring-white' : ''
                            }`}
                            style={{ backgroundColor: col }}
                            aria-label={`Select color ${col}`}
                          />
                        ))}
                      </div>
                      <button
                        type="button"
                        onClick={handleCreateCategory}
                        className="rounded-md df-accent-bg px-3 py-1.5 text-xs font-medium text-white"
                      >
                        Add
                      </button>
                    </div>
                  </div>
                )}

                {/* AI Subtask Breakdown & Deadline Suggestion */}
                <div className="rounded-xl border border-zinc-200 p-3.5 dark:border-zinc-800">
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <p className="text-xs font-semibold text-zinc-900 dark:text-zinc-100">
                        Subtasks ({subtasks.filter((s) => s.completed).length}/{subtasks.length})
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={handleAiBreakdown}
                      disabled={aiLoading}
                      className="inline-flex items-center gap-1.5 rounded-lg border df-accent-border df-accent-soft px-2.5 py-1 text-xs font-medium df-accent-text disabled:opacity-50"
                    >
                      {aiLoading ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Wand2 className="h-3.5 w-3.5" />
                      )}
                      <span>{aiLoading ? 'Thinking...' : 'AI Break Down'}</span>
                    </button>
                  </div>

                  {aiError && (
                    <p className="mt-2 rounded-lg bg-red-500/10 px-3 py-2 text-xs text-red-600 dark:text-red-400">
                      {aiError}
                    </p>
                  )}

                  {aiPreview && (
                    <div className="mt-3 rounded-lg border df-accent-border df-accent-soft p-3">
                      <p className="text-xs font-semibold text-zinc-900 dark:text-zinc-100">
                        AI Suggestion Preview
                      </p>
                      <p className="mt-1 text-xs text-zinc-600 dark:text-zinc-300">
                        {aiPreview.rationale}
                      </p>
                      <p className="mt-1.5 font-mono text-[11px] text-zinc-500 dark:text-zinc-400">
                        Suggested priority: {aiPreview.suggestedPriority} · Due:{' '}
                        {aiPreview.suggestedDueDate} · {aiPreview.estimatedMinutes}m
                      </p>
                      <ul className="mt-2 space-y-1 text-xs text-zinc-800 dark:text-zinc-200">
                        {aiPreview.subtasks.map((s, i) => (
                          <li key={i} className="flex items-center gap-1.5">
                            <span className="h-1.5 w-1.5 rounded-full df-accent-bg" />
                            <span>{s}</span>
                          </li>
                        ))}
                      </ul>
                      <div className="mt-3 flex items-center gap-2">
                        <button
                          type="button"
                          onClick={applyAiPreview}
                          className="rounded-md df-accent-bg px-3 py-1 text-xs font-medium text-white"
                        >
                          Approve &amp; Apply
                        </button>
                        <button
                          type="button"
                          onClick={() => setAiPreview(null)}
                          className="rounded-md px-2.5 py-1 text-xs text-zinc-600 hover:bg-zinc-200/50 dark:text-zinc-400"
                        >
                          Discard
                        </button>
                      </div>
                    </div>
                  )}

                  <div className="mt-3 space-y-1.5">
                    {subtasks.map((st) => (
                      <div
                        key={st.id}
                        className="flex items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-zinc-50 dark:hover:bg-zinc-800/50"
                      >
                        <button
                          type="button"
                          onClick={() => handleToggleSubtask(st.id)}
                          className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border transition-colors ${
                            st.completed
                              ? 'df-accent-bg border-transparent text-white'
                              : 'border-zinc-300 dark:border-zinc-600'
                          }`}
                          aria-label={`Toggle subtask ${st.title}`}
                        >
                          {st.completed && <Check className="h-3 w-3" />}
                        </button>
                        <span
                          className={`flex-1 text-xs ${
                            st.completed
                              ? 'text-zinc-400 line-through'
                              : 'text-zinc-800 dark:text-zinc-200'
                          }`}
                        >
                          {st.title}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleDeleteSubtask(st.id)}
                          className="rounded p-1 text-zinc-400 hover:text-red-500"
                          aria-label="Remove subtask"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    ))}
                  </div>

                  <div className="mt-2.5 flex items-center gap-2">
                    <input
                      type="text"
                      value={newSubtask}
                      onChange={(e) => setNewSubtask(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleAddSubtask();
                        }
                      }}
                      placeholder="Add a subtask..."
                      className="flex-1 rounded-lg border border-zinc-200 bg-transparent px-2.5 py-1.5 text-xs text-zinc-900 placeholder:text-zinc-400 dark:border-zinc-800 dark:text-zinc-100"
                    />
                    <button
                      type="button"
                      onClick={handleAddSubtask}
                      className="inline-flex items-center gap-1 rounded-lg border border-zinc-200 px-2.5 py-1.5 text-xs font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800"
                    >
                      <Plus className="h-3.5 w-3.5" />
                      <span>Add</span>
                    </button>
                  </div>
                </div>

                <div>
                  <label className="mb-1.5 block text-xs font-medium text-zinc-500 dark:text-zinc-400">
                    Tags (comma separated)
                  </label>
                  <input
                    type="text"
                    value={tagsInput}
                    onChange={(e) => setTagsInput(e.target.value)}
                    placeholder="design, sprint, exam"
                    className="w-full rounded-lg border border-zinc-200 bg-transparent px-3 py-2 text-xs text-zinc-900 dark:border-zinc-800 dark:text-zinc-100"
                  />
                </div>

                <div>
                  <label className="mb-1.5 block text-xs font-medium text-zinc-500 dark:text-zinc-400">
                    Additional notes
                  </label>
                  <textarea
                    rows={3}
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Links, references, or reminders..."
                    className="w-full rounded-lg border border-zinc-200 bg-transparent px-3 py-2 text-xs text-zinc-800 placeholder:text-zinc-400 focus:border-violet-500 focus:outline-none dark:border-zinc-800 dark:text-zinc-200"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2.5 border-t border-zinc-200 px-5 py-3.5 dark:border-zinc-800">
                <button
                  type="button"
                  onClick={() => setEditingTask(null)}
                  className="rounded-lg border border-zinc-200 px-4 py-2 text-xs font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-lg df-accent-bg px-4 py-2 text-xs font-medium text-white shadow-sm"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      </AnimatePresence>

      <ConfirmDialog
        open={confirmDeleteOpen}
        title="Delete this task?"
        description={`"${editingTask.title}" will be removed. You can undo right after deleting.`}
        confirmLabel="Delete Task"
        onConfirm={() => {
          setConfirmDeleteOpen(false);
          deleteTask(editingTask.id);
        }}
        onCancel={() => setConfirmDeleteOpen(false)}
      />
    </>
  );
}
