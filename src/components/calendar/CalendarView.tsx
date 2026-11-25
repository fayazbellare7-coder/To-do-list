import { useMemo, useState } from 'react';
import {
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  Plus,
} from 'lucide-react';
import { useDayflow } from '../../context/DayflowContext';
import { Task } from '../../types/dayflow';
import {
  addDaysStr,
  formatDisplayDate,
  formatLocalDate,
  formatTime12h,
  getMonthCalendarGrid,
  getTodayStr,
  getWeekDates,
  isTaskOverdue,
  pad2,
  parseLocalDate,
} from '../../utils/dateUtils';

interface CalendarViewProps {
  scopedTasks?: Task[];
}

type CalendarMode = 'month' | 'week' | 'day';

const WEEKDAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export function CalendarView({ scopedTasks }: CalendarViewProps) {
  const { dataset, openQuickAdd, setEditingTask } = useDayflow();
  const tasks = scopedTasks ?? dataset.tasks;

  const [mode, setMode] = useState<CalendarMode>('month');
  const [cursorDate, setCursorDate] = useState<string>(getTodayStr());

  const today = getTodayStr();
  const categoryMap = useMemo(
    () => new Map(dataset.categories.map((c) => [c.id, c])),
    [dataset.categories]
  );

  const tasksByDate = useMemo(() => {
    const map = new Map<string, Task[]>();
    for (const t of tasks) {
      if (!t.dueDate) continue;
      const list = map.get(t.dueDate) || [];
      list.push(t);
      map.set(t.dueDate, list);
    }
    for (const [, list] of map) {
      list.sort((a, b) => (a.dueTime || '99:99').localeCompare(b.dueTime || '99:99'));
    }
    return map;
  }, [tasks]);

  const parsedCursor = parseLocalDate(cursorDate);
  const monthGrid = useMemo(
    () => getMonthCalendarGrid(parsedCursor.getFullYear(), parsedCursor.getMonth()),
    [parsedCursor]
  );
  const weekDates = useMemo(() => getWeekDates(cursorDate), [cursorDate]);

  const navigate = (dir: -1 | 1) => {
    if (mode === 'month') {
      const d = parseLocalDate(cursorDate);
      d.setMonth(d.getMonth() + dir);
      setCursorDate(formatLocalDate(d));
    } else if (mode === 'week') {
      setCursorDate(addDaysStr(cursorDate, dir * 7));
    } else {
      setCursorDate(addDaysStr(cursorDate, dir));
    }
  };

  const headerTitle = useMemo(() => {
    if (mode === 'month') {
      return parsedCursor.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    }
    if (mode === 'week') {
      const start = parseLocalDate(weekDates[0]);
      const end = parseLocalDate(weekDates[6]);
      return `${start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} – ${end.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;
    }
    return parsedCursor.toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    });
  }, [mode, parsedCursor, weekDates]);

  const upcomingDeadlines = useMemo(() => {
    return tasks
      .filter((t) => t.status !== 'completed' && t.dueDate >= today)
      .sort((a, b) => a.dueDate.localeCompare(b.dueDate))
      .slice(0, 6);
  }, [tasks, today]);

  const overloadedDays = useMemo(() => {
    const result: Array<{ date: string; count: number; mins: number }> = [];
    for (const [date, dayTasks] of tasksByDate.entries()) {
      if (date < today) continue;
      const pending = dayTasks.filter((t) => t.status !== 'completed');
      const totalMins = pending.reduce((s, t) => s + (t.estimatedMinutes || 30), 0);
      if (pending.length >= 4 || totalMins >= 180) {
        result.push({ date, count: pending.length, mins: totalMins });
      }
    }
    return result.sort((a, b) => a.date.localeCompare(b.date)).slice(0, 4);
  }, [tasksByDate, today]);

  const renderTaskChip = (t: Task) => {
    const cat = categoryMap.get(t.categoryId);
    const overdue = isTaskOverdue(t);
    const completed = t.status === 'completed';

    return (
      <button
        key={t.id}
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setEditingTask(t);
        }}
        className={`flex w-full items-center gap-1.5 rounded-md px-1.5 py-1 text-left text-[11px] transition-colors ${
          overdue
            ? 'bg-red-500/12 text-red-700 hover:bg-red-500/20 dark:text-red-300'
            : completed
            ? 'bg-zinc-100 text-zinc-400 line-through dark:bg-zinc-800/60 dark:text-zinc-500'
            : 'bg-zinc-100/90 text-zinc-800 hover:bg-zinc-200/80 dark:bg-zinc-800/80 dark:text-zinc-200 dark:hover:bg-zinc-700/80'
        }`}
      >
        <span
          className="h-1.5 w-1.5 shrink-0 rounded-full"
          style={{ backgroundColor: overdue ? '#ef4444' : cat?.color || '#8b5cf6' }}
        />
        <span className="truncate font-medium">{t.title}</span>
      </button>
    );
  };

  return (
    <div className="grid grid-cols-1 gap-5 xl:grid-cols-4">
      {/* Main Calendar */}
      <div className="space-y-4 xl:col-span-3">
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-zinc-200 bg-white px-4 py-3 dark:border-zinc-800 dark:bg-[#17171b]">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="rounded-lg border border-zinc-200 p-1.5 text-zinc-600 hover:bg-zinc-100 dark:border-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-800"
              aria-label="Previous period"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => setCursorDate(today)}
              className="rounded-lg border border-zinc-200 px-3 py-1.5 text-xs font-medium text-zinc-700 hover:bg-zinc-100 dark:border-zinc-800 dark:text-zinc-200 dark:hover:bg-zinc-800"
            >
              Today
            </button>
            <button
              type="button"
              onClick={() => navigate(1)}
              className="rounded-lg border border-zinc-200 p-1.5 text-zinc-600 hover:bg-zinc-100 dark:border-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-800"
              aria-label="Next period"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
            <h2 className="ml-2 font-display text-base font-semibold text-zinc-900 dark:text-zinc-100">
              {headerTitle}
            </h2>
          </div>

          <div className="flex items-center gap-2">
            <div className="inline-flex rounded-lg border border-zinc-200 bg-zinc-100/80 p-0.5 dark:border-zinc-800 dark:bg-zinc-900">
              {(['month', 'week', 'day'] as CalendarMode[]).map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setMode(m)}
                  className={`rounded-md px-3 py-1 text-xs font-medium capitalize transition-colors ${
                    mode === m
                      ? 'bg-white text-zinc-900 shadow-xs dark:bg-zinc-800 dark:text-zinc-100'
                      : 'text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-200'
                  }`}
                >
                  {m}
                </button>
              ))}
            </div>
            <button
              type="button"
              onClick={() => openQuickAdd({ dueDate: cursorDate })}
              className="inline-flex items-center gap-1 rounded-lg df-accent-bg px-3 py-1.5 text-xs font-medium text-white"
            >
              <Plus className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Add Task</span>
            </button>
          </div>
        </div>

        {/* Monthly Grid */}
        {mode === 'month' && (
          <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-[#17171b]">
            <div className="grid grid-cols-7 border-b border-zinc-200 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900/60">
              {WEEKDAY_LABELS.map((day) => (
                <div
                  key={day}
                  className="py-2 text-center text-[11px] font-semibold text-zinc-500 dark:text-zinc-400"
                >
                  {day}
                </div>
              ))}
            </div>

            <div className="grid grid-cols-7">
              {monthGrid.map(({ dateStr, inCurrentMonth }) => {
                const dayTasks = tasksByDate.get(dateStr) || [];
                const isToday = dateStr === today;
                const dayNum = Number(dateStr.slice(8, 10));
                const hasOverdue = dayTasks.some((t) => isTaskOverdue(t));

                return (
                  <div
                    key={dateStr}
                    onClick={() => openQuickAdd({ dueDate: dateStr })}
                    className={`group min-h-[104px] cursor-pointer border-b border-r border-zinc-100 p-1.5 transition-colors hover:bg-zinc-50/80 dark:border-zinc-800/80 dark:hover:bg-zinc-800/30 ${
                      !inCurrentMonth ? 'opacity-45' : ''
                    }`}
                  >
                    <div className="mb-1 flex items-center justify-between">
                      <span
                        className={`inline-flex h-6 w-6 items-center justify-center rounded-full font-mono text-xs tabular-nums ${
                          isToday
                            ? 'df-accent-bg font-semibold text-white'
                            : hasOverdue
                            ? 'font-semibold text-red-600 dark:text-red-400'
                            : 'text-zinc-700 dark:text-zinc-300'
                        }`}
                      >
                        {dayNum}
                      </span>
                      <span className="opacity-0 transition-opacity group-hover:opacity-100">
                        <Plus className="h-3 w-3 text-zinc-400" />
                      </span>
                    </div>

                    <div className="space-y-1">
                      {dayTasks.slice(0, 3).map(renderTaskChip)}
                      {dayTasks.length > 3 && (
                        <p className="px-1 font-mono text-[10px] text-zinc-400">
                          +{dayTasks.length - 3} more
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Weekly Grid */}
        {mode === 'week' && (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-7">
            {weekDates.map((dateStr) => {
              const d = parseLocalDate(dateStr);
              const isToday = dateStr === today;
              const dayTasks = tasksByDate.get(dateStr) || [];

              return (
                <div
                  key={dateStr}
                  className={`flex min-h-[280px] flex-col rounded-xl border p-2.5 ${
                    isToday
                      ? 'df-accent-border bg-white dark:bg-[#191920]'
                      : 'border-zinc-200 bg-white dark:border-zinc-800 dark:bg-[#17171b]'
                  }`}
                >
                  <div className="mb-2.5 flex items-center justify-between border-b border-zinc-100 pb-2 dark:border-zinc-800">
                    <div>
                      <p className="text-[11px] font-medium text-zinc-500">
                        {d.toLocaleDateString('en-US', { weekday: 'short' })}
                      </p>
                      <p
                        className={`font-mono text-sm font-semibold tabular-nums ${
                          isToday ? 'df-accent-text' : 'text-zinc-900 dark:text-zinc-100'
                        }`}
                      >
                        {d.getDate()}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => openQuickAdd({ dueDate: dateStr })}
                      className="rounded p-1 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700 dark:hover:bg-zinc-800"
                      aria-label={`Add task on ${dateStr}`}
                    >
                      <Plus className="h-3.5 w-3.5" />
                    </button>
                  </div>

                  <div className="flex-1 space-y-1.5">
                    {dayTasks.length === 0 ? (
                      <p className="py-4 text-center text-[11px] text-zinc-400">Free</p>
                    ) : (
                      dayTasks.map((t) => (
                        <div key={t.id}>
                          {t.dueTime && (
                            <span className="block px-1 font-mono text-[10px] text-zinc-400 tabular-nums">
                              {formatTime12h(t.dueTime)}
                            </span>
                          )}
                          {renderTaskChip(t)}
                        </div>
                      ))
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Daily Hourly View */}
        {mode === 'day' && (
          <div className="rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-[#17171b]">
            <div className="border-b border-zinc-100 px-4 py-3 dark:border-zinc-800">
              <p className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                All-day / Unscheduled Time ({(tasksByDate.get(cursorDate) || []).filter((t) => !t.dueTime).length})
              </p>
              <div className="mt-2 flex flex-wrap gap-2">
                {(tasksByDate.get(cursorDate) || [])
                  .filter((t) => !t.dueTime)
                  .map((t) => (
                    <div key={t.id} className="w-56">
                      {renderTaskChip(t)}
                    </div>
                  ))}
              </div>
            </div>

            <div className="divide-y divide-zinc-100 dark:divide-zinc-800/80">
              {Array.from({ length: 15 }, (_, idx) => idx + 7).map((hour) => {
                const hourPrefix = `${pad2(hour)}:`;
                const slotTasks = (tasksByDate.get(cursorDate) || []).filter((t) =>
                  t.dueTime.startsWith(hourPrefix)
                );
                const label = `${hour > 12 ? hour - 12 : hour}:00 ${hour >= 12 ? 'PM' : 'AM'}`;

                return (
                  <div
                    key={hour}
                    onClick={() =>
                      openQuickAdd({ dueDate: cursorDate, dueTime: `${pad2(hour)}:00` })
                    }
                    className="group flex min-h-[52px] cursor-pointer items-stretch hover:bg-zinc-50 dark:hover:bg-zinc-800/30"
                  >
                    <div className="w-20 shrink-0 border-r border-zinc-100 px-3 py-2 font-mono text-[11px] tabular-nums text-zinc-400 dark:border-zinc-800/80">
                      {label}
                    </div>
                    <div className="flex flex-1 flex-wrap items-center gap-2 px-3 py-1.5">
                      {slotTasks.map((t) => (
                        <div key={t.id} className="min-w-[200px]">
                          {renderTaskChip(t)}
                        </div>
                      ))}
                      <span className="ml-auto text-[11px] text-zinc-400 opacity-0 transition-opacity group-hover:opacity-100">
                        + Schedule at {label}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Right Rail: Upcoming Deadlines & Workload Alerts */}
      <div className="space-y-4">
        <div className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-[#17171b]">
          <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
            Upcoming Deadlines
          </h3>
          {upcomingDeadlines.length === 0 ? (
            <p className="mt-3 text-xs text-zinc-500">No upcoming deadlines scheduled.</p>
          ) : (
            <div className="mt-3 space-y-2.5">
              {upcomingDeadlines.map((t) => {
                const cat = categoryMap.get(t.categoryId);
                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setEditingTask(t)}
                    className="block w-full rounded-lg border border-zinc-100 p-2.5 text-left transition-colors hover:bg-zinc-50 dark:border-zinc-800/80 dark:hover:bg-zinc-800/50"
                  >
                    <p className="truncate text-xs font-medium text-zinc-900 dark:text-zinc-100">
                      {t.title}
                    </p>
                    <p className="mt-1 font-mono text-[11px] text-zinc-500 tabular-nums">
                      {formatDisplayDate(t.dueDate)}
                      {t.dueTime ? ` · ${formatTime12h(t.dueTime)}` : ''}
                      {cat ? ` · ${cat.name}` : ''}
                    </p>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <div className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-[#17171b]">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-amber-500" />
            <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
              Heavy Workload Days
            </h3>
          </div>
          {overloadedDays.length === 0 ? (
            <p className="mt-2.5 text-xs text-zinc-500 dark:text-zinc-400">
              Your upcoming schedule looks balanced.
            </p>
          ) : (
            <div className="mt-3 space-y-2">
              {overloadedDays.map((ov) => (
                <button
                  key={ov.date}
                  type="button"
                  onClick={() => {
                    setCursorDate(ov.date);
                    setMode('day');
                  }}
                  className="flex w-full items-center justify-between rounded-lg bg-amber-500/10 px-3 py-2 text-left text-xs text-amber-800 hover:bg-amber-500/15 dark:text-amber-300"
                >
                  <span className="font-mono font-medium">{formatDisplayDate(ov.date)}</span>
                  <span className="font-mono tabular-nums">
                    {ov.count} tasks · {ov.mins}m
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
