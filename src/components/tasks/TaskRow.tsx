import React, { useState } from 'react';
import { motion } from 'motion/react';
import {
  Check,
  Copy,
  Edit3,
  GripVertical,
  Repeat,
  Trash2,
} from 'lucide-react';
import { Task } from '../../types/dayflow';
import { useDayflow } from '../../context/DayflowContext';
import {
  formatDisplayDate,
  formatTime12h,
  isTaskOverdue,
  PRIORITY_META,
} from '../../utils/dateUtils';
import { getLucideIcon } from '../../utils/iconMap';
import { ConfirmDialog } from '../common/ConfirmDialog';

interface TaskRowProps {
  task: Task;
  draggable?: boolean;
  onDragStart?: (id: string) => void;
  onDragOver?: (e: React.DragEvent, id: string) => void;
  onDrop?: (id: string) => void;
}

export function TaskRow({
  task,
  draggable = false,
  onDragStart,
  onDragOver,
  onDrop,
}: TaskRowProps) {
  const {
    dataset,
    toggleTaskCompletion,
    setEditingTask,
    duplicateTask,
    deleteTask,
  } = useDayflow();

  const [confirmDelete, setConfirmDelete] = useState(false);

  const completed = task.status === 'completed';
  const overdue = isTaskOverdue(task);
  const priorityInfo = PRIORITY_META[task.priority];
  const category = dataset.categories.find((c) => c.id === task.categoryId);
  const project = task.projectId
    ? dataset.projects.find((p) => p.id === task.projectId)
    : undefined;
  const CatIcon = getLucideIcon(category?.iconName || 'Folder');

  const doneSubtasks = task.subtasks.filter((s) => s.completed).length;

  return (
    <>
      <motion.div
        layout
        initial={{ opacity: 0, y: 4 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -4 }}
        transition={{ duration: 0.16, ease: [0.16, 1, 0.3, 1] }}
        draggable={draggable}
        onDragStart={() => onDragStart?.(task.id)}
        onDragOver={(e) => onDragOver?.(e, task.id)}
        onDrop={() => onDrop?.(task.id)}
        className={`group flex items-start gap-3 rounded-xl border px-3.5 py-3 transition-colors ${
          completed
            ? 'border-zinc-200/70 bg-zinc-50/70 dark:border-zinc-800/60 dark:bg-zinc-900/30'
            : 'border-zinc-200 bg-white hover:border-zinc-300 dark:border-zinc-800 dark:bg-[#17171b] dark:hover:border-zinc-700'
        }`}
      >
        {draggable && (
          <span
            className="mt-1 hidden cursor-grab text-zinc-300 group-hover:text-zinc-500 dark:text-zinc-700 dark:group-hover:text-zinc-500 sm:inline-flex"
            title="Drag to reorder"
          >
            <GripVertical className="h-4 w-4" />
          </span>
        )}

        {/* Animated Checkbox */}
        <button
          type="button"
          onClick={() => toggleTaskCompletion(task.id)}
          aria-label={completed ? `Mark "${task.title}" incomplete` : `Complete "${task.title}"`}
          className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md border transition-all active:scale-90 ${
            completed
              ? 'df-accent-bg border-transparent text-white'
              : 'border-zinc-300 hover:border-violet-500 dark:border-zinc-600 dark:hover:border-violet-400'
          }`}
        >
          {completed && (
            <motion.span
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.14 }}
            >
              <Check className="h-3.5 w-3.5 stroke-[2.5]" />
            </motion.span>
          )}
        </button>

        {/* Main Info */}
        <div
          onClick={() => setEditingTask(task)}
          className="min-w-0 flex-1 cursor-pointer"
        >
          <div className="flex items-baseline justify-between gap-2">
            <p
              className={`text-sm font-medium transition-colors ${
                completed
                  ? 'text-zinc-400 line-through dark:text-zinc-500'
                  : 'text-zinc-900 dark:text-zinc-100'
              }`}
            >
              {task.title}
            </p>
          </div>

          {task.description && (
            <p className="mt-0.5 line-clamp-1 text-xs text-zinc-500 dark:text-zinc-400">
              {task.description}
            </p>
          )}

          {/* Unboxed clean metadata line */}
          <div className="mt-1.5 flex flex-wrap items-center gap-x-2.5 gap-y-1 text-xs text-zinc-500 dark:text-zinc-400">
            <span className={`inline-flex items-center gap-1.5 font-medium ${priorityInfo.textClass}`}>
              <span className={`h-1.5 w-1.5 rounded-full ${priorityInfo.dotClass}`} />
              {priorityInfo.label}
            </span>

            {task.status === 'in_progress' && !completed && (
              <>
                <span aria-hidden="true">·</span>
                <span className="font-medium text-blue-600 dark:text-blue-400">
                  In Progress
                </span>
              </>
            )}

            {task.dueDate && (
              <>
                <span aria-hidden="true">·</span>
                <span
                  className={`font-mono tabular-nums ${
                    overdue
                      ? 'font-medium text-red-600 dark:text-red-400'
                      : ''
                  }`}
                >
                  {formatDisplayDate(task.dueDate)}
                  {task.dueTime ? ` ${formatTime12h(task.dueTime)}` : ''}
                  {overdue ? ' (Overdue)' : ''}
                </span>
              </>
            )}

            {category && (
              <>
                <span aria-hidden="true">·</span>
                <span className="inline-flex items-center gap-1">
                  <CatIcon className="h-3 w-3" style={{ color: category.color }} />
                  <span>{category.name}</span>
                </span>
              </>
            )}

            {project && (
              <>
                <span aria-hidden="true">·</span>
                <span className="truncate max-w-[140px]" style={{ color: project.color }}>
                  {project.name}
                </span>
              </>
            )}

            {task.subtasks.length > 0 && (
              <>
                <span aria-hidden="true">·</span>
                <span className="font-mono tabular-nums">
                  {doneSubtasks}/{task.subtasks.length} subtasks
                </span>
              </>
            )}

            {task.estimatedMinutes > 0 && (
              <>
                <span aria-hidden="true">·</span>
                <span className="font-mono tabular-nums">{task.estimatedMinutes}m</span>
              </>
            )}

            {task.recurring !== 'none' && (
              <>
                <span aria-hidden="true">·</span>
                <span className="inline-flex items-center gap-1 capitalize">
                  <Repeat className="h-3 w-3" />
                  {task.recurring}
                </span>
              </>
            )}

            {task.tags.length > 0 && (
              <>
                <span aria-hidden="true">·</span>
                <span className="text-zinc-400 dark:text-zinc-500">
                  {task.tags.map((tg) => `#${tg}`).join(' ')}
                </span>
              </>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex shrink-0 items-center gap-0.5 opacity-100 transition-opacity sm:opacity-0 sm:group-hover:opacity-100 sm:focus-within:opacity-100">
          <button
            type="button"
            onClick={() => setEditingTask(task)}
            className="rounded-md p-1.5 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700 dark:hover:bg-zinc-800 dark:hover:text-zinc-200"
            aria-label="Edit task"
            title="Edit"
          >
            <Edit3 className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onClick={() => duplicateTask(task.id)}
            className="rounded-md p-1.5 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700 dark:hover:bg-zinc-800 dark:hover:text-zinc-200"
            aria-label="Duplicate task"
            title="Duplicate"
          >
            <Copy className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onClick={() => setConfirmDelete(true)}
            className="rounded-md p-1.5 text-zinc-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-500/10 dark:hover:text-red-400"
            aria-label="Delete task"
            title="Delete"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </motion.div>

      <ConfirmDialog
        open={confirmDelete}
        title="Delete task?"
        description={`"${task.title}" will be removed from your workspace.`}
        confirmLabel="Delete"
        onConfirm={() => {
          setConfirmDelete(false);
          deleteTask(task.id);
        }}
        onCancel={() => setConfirmDelete(false)}
      />
    </>
  );
}
