import React, { useMemo, useState } from 'react';
import { AnimatePresence } from 'motion/react';
import {
  Calendar as CalendarIcon,
  Columns3,
  List,
  Plus,
  Search,
  SlidersHorizontal,
} from 'lucide-react';
import { useDayflow } from '../../context/DayflowContext';
import { PriorityLevel, Task, TaskViewMode } from '../../types/dayflow';
import {
  addDaysStr,
  getTodayStr,
  isTaskOverdue,
  PRIORITY_META,
} from '../../utils/dateUtils';
import { TaskRow } from './TaskRow';
import { TaskKanbanBoard } from './TaskKanbanBoard';
import { CalendarView } from '../calendar/CalendarView';

interface TasksWorkspaceViewProps {
  scope: 'today' | 'upcoming' | 'all' | 'completed' | 'project';
  projectId?: string;
}

type SortOption = 'order' | 'dueDate' | 'priority' | 'newest';
type StatusFilter = 'all' | 'pending' | 'completed' | 'overdue';
type DeadlineFilter = 'all' | 'today' | 'week' | 'overdue';

export function TasksWorkspaceView({ scope, projectId }: TasksWorkspaceViewProps) {
  const { dataset, openQuickAdd, reorderTaskList } = useDayflow();

  const [viewMode, setViewMode] = useState<TaskViewMode>('list');
  const [search, setSearch] = useState('');
  const [priorityFilter, setPriorityFilter] = useState<PriorityLevel | 'all'>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [deadlineFilter, setDeadlineFilter] = useState<DeadlineFilter>('all');
  const [sortBy, setSortBy] = useState<SortOption>('order');

  const [draggedId, setDraggedId] = useState<string | null>(null);

  const today = getTodayStr();
  const nextWeek = addDaysStr(today, 7);

  const scopedTasks = useMemo(() => {
    return dataset.tasks.filter((t) => {
      if (scope === 'today') {
        return t.dueDate === today || (t.status !== 'completed' && isTaskOverdue(t));
      }
      if (scope === 'upcoming') {
        return t.status !== 'completed' && t.dueDate > today;
      }
      if (scope === 'completed') {
        return t.status === 'completed';
      }
      if (scope === 'project' && projectId) {
        return t.projectId === projectId;
      }
      return true;
    });
  }, [dataset.tasks, scope, projectId, today]);

  const filteredTasks = useMemo(() => {
    const q = search.trim().toLowerCase();
    const list = scopedTasks.filter((t) => {
      if (q) {
        const matchText =
          t.title.toLowerCase().includes(q) ||
          t.description.toLowerCase().includes(q) ||
          t.tags.some((tg) => tg.toLowerCase().includes(q));
        if (!matchText) return false;
      }
      if (priorityFilter !== 'all' && t.priority !== priorityFilter) return false;
      if (categoryFilter !== 'all' && t.categoryId !== categoryFilter) return false;

      if (statusFilter === 'pending' && t.status === 'completed') return false;
      if (statusFilter === 'completed' && t.status !== 'completed') return false;
      if (statusFilter === 'overdue' && !isTaskOverdue(t)) return false;

      if (deadlineFilter === 'today' && t.dueDate !== today) return false;
      if (
        deadlineFilter === 'week' &&
        (!t.dueDate || t.dueDate < today || t.dueDate > nextWeek)
      )
        return false;
      if (deadlineFilter === 'overdue' && !isTaskOverdue(t)) return false;

      return true;
    });

    const sorted = [...list];
    sorted.sort((a, b) => {
      if (sortBy === 'priority') {
        return PRIORITY_META[b.priority].rank - PRIORITY_META[a.priority].rank;
      }
      if (sortBy === 'dueDate') {
        if (!a.dueDate && !b.dueDate) return 0;
        if (!a.dueDate) return 1;
        if (!b.dueDate) return -1;
        return a.dueDate.localeCompare(b.dueDate);
      }
      if (sortBy === 'newest') {
        return b.createdAt.localeCompare(a.createdAt);
      }
      return (a.order || 0) - (b.order || 0);
    });

    return sorted;
  }, [
    scopedTasks,
    search,
    priorityFilter,
    categoryFilter,
    statusFilter,
    deadlineFilter,
    sortBy,
    today,
    nextWeek,
  ]);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (targetId: string) => {
    if (draggedId && draggedId !== targetId) {
      reorderTaskList(draggedId, targetId);
    }
    setDraggedId(null);
  };

  const scopeHeader: Record<typeof scope, { title: string; subtitle: string }> = {
    today: {
      title: 'Today & Overdue',
      subtitle: 'Focus on tasks scheduled for today and clear any overdue items.',
    },
    upcoming: {
      title: 'Upcoming Tasks',
      subtitle: 'Scheduled work for tomorrow and the days ahead.',
    },
    all: {
      title: 'All Tasks',
      subtitle: 'Complete workspace task inventory across categories and projects.',
    },
    completed: {
      title: 'Completed Archive',
      subtitle: 'Review finished tasks or restore any item back to active work.',
    },
    project: {
      title: 'Project Tasks',
      subtitle: 'Manage deliverables scoped to this project.',
    },
  };

  return (
    <div className="space-y-5">
      {/* Toolbar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="font-display text-lg font-semibold text-zinc-900 dark:text-zinc-100">
            {scopeHeader[scope].title}
          </h2>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            {scopeHeader[scope].subtitle}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* View Switcher */}
          <div className="inline-flex items-center rounded-lg border border-zinc-200 bg-zinc-100/80 p-0.5 dark:border-zinc-800 dark:bg-zinc-900">
            <button
              type="button"
              onClick={() => setViewMode('list')}
              className={`inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors whitespace-nowrap ${
                viewMode === 'list'
                  ? 'bg-white text-zinc-900 shadow-xs dark:bg-zinc-800 dark:text-zinc-100'
                  : 'text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-200'
              }`}
            >
              <List className="h-3.5 w-3.5" />
              <span>List</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('kanban')}
              className={`inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors whitespace-nowrap ${
                viewMode === 'kanban'
                  ? 'bg-white text-zinc-900 shadow-xs dark:bg-zinc-800 dark:text-zinc-100'
                  : 'text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-200'
              }`}
            >
              <Columns3 className="h-3.5 w-3.5" />
              <span>Board</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('calendar')}
              className={`inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors whitespace-nowrap ${
                viewMode === 'calendar'
                  ? 'bg-white text-zinc-900 shadow-xs dark:bg-zinc-800 dark:text-zinc-100'
                  : 'text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-200'
              }`}
            >
              <CalendarIcon className="h-3.5 w-3.5" />
              <span>Calendar</span>
            </button>
          </div>

          <button
            type="button"
            onClick={() => openQuickAdd({ projectId })}
            className="inline-flex items-center gap-1.5 rounded-lg df-accent-bg px-3.5 py-2 text-xs font-medium text-white shadow-xs whitespace-nowrap"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>Add Task</span>
          </button>
        </div>
      </div>

      {/* Filter & Search Bar */}
      {viewMode !== 'calendar' && (
        <div className="flex flex-wrap items-center gap-2.5 rounded-xl border border-zinc-200 bg-white p-3 dark:border-zinc-800 dark:bg-[#17171b]">
          <div className="relative min-w-[200px] flex-1">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-zinc-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search tasks or #tags..."
              className="w-full rounded-lg border border-zinc-200 bg-transparent py-1.5 pl-8 pr-3 text-xs text-zinc-900 placeholder:text-zinc-400 focus:border-violet-500 focus:outline-none dark:border-zinc-800 dark:text-zinc-100"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <SlidersHorizontal className="hidden h-3.5 w-3.5 text-zinc-400 sm:block" />

            <select
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value as PriorityLevel | 'all')}
              aria-label="Filter by priority"
              className="rounded-lg border border-zinc-200 bg-white px-2.5 py-1.5 text-xs text-zinc-700 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300"
            >
              <option value="all">All Priorities</option>
              <option value="urgent">Urgent</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>

            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              aria-label="Filter by category"
              className="rounded-lg border border-zinc-200 bg-white px-2.5 py-1.5 text-xs text-zinc-700 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300"
            >
              <option value="all">All Categories</option>
              {dataset.categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>

            {scope !== 'completed' && (
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
                aria-label="Filter by status"
                className="rounded-lg border border-zinc-200 bg-white px-2.5 py-1.5 text-xs text-zinc-700 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300"
              >
                <option value="all">All Statuses</option>
                <option value="pending">Pending</option>
                <option value="overdue">Overdue</option>
                <option value="completed">Completed</option>
              </select>
            )}

            <select
              value={deadlineFilter}
              onChange={(e) => setDeadlineFilter(e.target.value as DeadlineFilter)}
              aria-label="Filter by deadline"
              className="rounded-lg border border-zinc-200 bg-white px-2.5 py-1.5 text-xs text-zinc-700 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300"
            >
              <option value="all">Any Deadline</option>
              <option value="today">Due Today</option>
              <option value="week">Next 7 Days</option>
              <option value="overdue">Overdue</option>
            </select>

            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as SortOption)}
              aria-label="Sort tasks"
              className="rounded-lg border border-zinc-200 bg-white px-2.5 py-1.5 text-xs text-zinc-700 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300"
            >
              <option value="order">Sort: Manual</option>
              <option value="dueDate">Sort: Due Date</option>
              <option value="priority">Sort: Priority</option>
              <option value="newest">Sort: Newest</option>
            </select>
          </div>
        </div>
      )}

      {/* View Content */}
      {viewMode === 'calendar' ? (
        <CalendarView scopedTasks={filteredTasks} />
      ) : viewMode === 'kanban' ? (
        <TaskKanbanBoard
          tasks={filteredTasks}
          onQuickAddInProject={() => openQuickAdd({ projectId })}
        />
      ) : filteredTasks.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-zinc-200 py-14 text-center dark:border-zinc-800">
          <p className="text-sm font-medium text-zinc-800 dark:text-zinc-200">
            No matching tasks found
          </p>
          <p className="mt-1 max-w-sm text-xs text-zinc-500 dark:text-zinc-400">
            {search || priorityFilter !== 'all' || categoryFilter !== 'all'
              ? 'Try clearing one of your active filters or search terms.'
              : 'Create your first task here to start organizing your schedule.'}
          </p>
          <button
            type="button"
            onClick={() => openQuickAdd({ projectId })}
            className="mt-4 inline-flex items-center gap-1.5 rounded-lg df-accent-bg px-4 py-2 text-xs font-medium text-white"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>Create Task</span>
          </button>
        </div>
      ) : (
        <div className="space-y-2">
          <AnimatePresence mode="popLayout">
            {filteredTasks.map((task: Task) => (
              <TaskRow
                key={task.id}
                task={task}
                draggable={sortBy === 'order'}
                onDragStart={(id) => setDraggedId(id)}
                onDragOver={handleDragOver}
                onDrop={handleDrop}
              />
            ))}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}
