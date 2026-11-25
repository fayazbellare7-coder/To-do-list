import React, { useState } from 'react';
import { Check, Plus } from 'lucide-react';
import { Task, TaskStatus } from '../../types/dayflow';
import { useDayflow } from '../../context/DayflowContext';
import {
  formatDisplayDate,
  getTodayStr,
  isTaskOverdue,
  PRIORITY_META,
} from '../../utils/dateUtils';

interface TaskKanbanBoardProps {
  tasks: Task[];
  onQuickAddInProject?: () => void;
}

type KanbanColumnId = 'todo' | 'in_progress' | 'completed' | 'overdue';

const COLUMNS: Array<{ id: KanbanColumnId; title: string; dotClass: string }> = [
  { id: 'todo', title: 'To Do', dotClass: 'bg-zinc-400' },
  { id: 'in_progress', title: 'In Progress', dotClass: 'bg-blue-500' },
  { id: 'completed', title: 'Completed', dotClass: 'bg-emerald-500' },
  { id: 'overdue', title: 'Overdue', dotClass: 'bg-red-500' },
];

export function TaskKanbanBoard({ tasks, onQuickAddInProject }: TaskKanbanBoardProps) {
  const {
    dataset,
    moveTaskStatus,
    updateTask,
    toggleTaskCompletion,
    setEditingTask,
    openQuickAdd,
    pushToast,
  } = useDayflow();

  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [dragOverCol, setDragOverCol] = useState<KanbanColumnId | null>(null);

  const categorizeColumn = (t: Task): KanbanColumnId => {
    if (t.status === 'completed') return 'completed';
    if (isTaskOverdue(t)) return 'overdue';
    return t.status === 'in_progress' ? 'in_progress' : 'todo';
  };

  const handleDropOnColumn = (colId: KanbanColumnId) => {
    if (!draggedId) return;
    const task = tasks.find((t) => t.id === draggedId);
    setDraggedId(null);
    setDragOverCol(null);
    if (!task) return;

    if (colId === 'overdue') {
      pushToast({
        message: 'Overdue status is automatically determined by deadline',
      });
      return;
    }

    const wasOverdue = isTaskOverdue(task);
    const targetStatus: TaskStatus = colId;
    if (wasOverdue && targetStatus !== 'completed') {
      // Reschedule overdue task to today when explicitly dragged back into active work
      updateTask(task.id, { status: targetStatus, dueDate: getTodayStr() });
      pushToast({ message: `Moved "${task.title}" to today`, tone: 'success' });
    } else {
      moveTaskStatus(task.id, targetStatus);
    }
  };

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
      {COLUMNS.map((col) => {
        const colTasks = tasks.filter((t) => categorizeColumn(t) === col.id);
        const isTarget = dragOverCol === col.id;

        return (
          <div
            key={col.id}
            onDragOver={(e) => {
              e.preventDefault();
              if (col.id !== 'overdue') setDragOverCol(col.id);
            }}
            onDragLeave={() => setDragOverCol(null)}
            onDrop={() => handleDropOnColumn(col.id)}
            className={`flex min-h-[380px] flex-col rounded-xl border p-3 transition-colors ${
              isTarget
                ? 'df-accent-border df-accent-soft'
                : 'border-zinc-200 bg-zinc-50/70 dark:border-zinc-800/80 dark:bg-[#151519]'
            }`}
          >
            {/* Column Header */}
            <div className="mb-3 flex items-center justify-between px-1">
              <div className="flex items-center gap-2">
                <span className={`h-2 w-2 rounded-full ${col.dotClass}`} />
                <h3 className="text-xs font-semibold text-zinc-900 dark:text-zinc-100">
                  {col.title}
                </h3>
                <span className="font-mono text-xs tabular-nums text-zinc-400">
                  {colTasks.length}
                </span>
              </div>
              {col.id === 'todo' && (
                <button
                  type="button"
                  onClick={() => (onQuickAddInProject ? onQuickAddInProject() : openQuickAdd())}
                  className="rounded p-1 text-zinc-400 hover:bg-zinc-200/70 hover:text-zinc-800 dark:hover:bg-zinc-800 dark:hover:text-zinc-200"
                  aria-label="Add task to To Do"
                >
                  <Plus className="h-3.5 w-3.5" />
                </button>
              )}
            </div>

            {/* Cards */}
            <div className="flex-1 space-y-2.5">
              {colTasks.length === 0 ? (
                <div className="flex h-28 items-center justify-center rounded-lg border border-dashed border-zinc-200 text-xs text-zinc-400 dark:border-zinc-800">
                  {col.id === 'overdue' ? 'No overdue tasks' : 'Drop tasks here'}
                </div>
              ) : (
                colTasks.map((task) => {
                  const pMeta = PRIORITY_META[task.priority];
                  const cat = dataset.categories.find((c) => c.id === task.categoryId);
                  const isDone = task.status === 'completed';

                  return (
                    <div
                      key={task.id}
                      draggable
                      onDragStart={() => setDraggedId(task.id)}
                      onDragEnd={() => {
                        setDraggedId(null);
                        setDragOverCol(null);
                      }}
                      onClick={() => setEditingTask(task)}
                      className="cursor-grab rounded-xl border border-zinc-200 bg-white p-3 shadow-xs transition-all hover:border-zinc-300 active:cursor-grabbing dark:border-zinc-800 dark:bg-[#1a1a20] dark:hover:border-zinc-700"
                    >
                      <div className="flex items-start gap-2.5">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleTaskCompletion(task.id);
                          }}
                          aria-label={`Toggle completion for ${task.title}`}
                          className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded border ${
                            isDone
                              ? 'df-accent-bg border-transparent text-white'
                              : 'border-zinc-300 dark:border-zinc-600'
                          }`}
                        >
                          {isDone && <Check className="h-3 w-3" />}
                        </button>
                        <div className="min-w-0 flex-1">
                          <p
                            className={`text-sm font-medium leading-snug ${
                              isDone
                                ? 'text-zinc-400 line-through'
                                : 'text-zinc-900 dark:text-zinc-100'
                            }`}
                          >
                            {task.title}
                          </p>
                          <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-zinc-500 dark:text-zinc-400">
                            <span className={`font-medium ${pMeta.textClass}`}>
                              {pMeta.label}
                            </span>
                            {task.dueDate && (
                              <>
                                <span>·</span>
                                <span className="font-mono tabular-nums">
                                  {formatDisplayDate(task.dueDate)}
                                </span>
                              </>
                            )}
                            {cat && (
                              <>
                                <span>·</span>
                                <span>{cat.name}</span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
