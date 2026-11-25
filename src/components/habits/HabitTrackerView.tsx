import React, { useMemo, useState } from 'react';
import {
  Check,
  Edit3,
  Flame,
  Plus,
  Trash2,
  Trophy,
  X,
} from 'lucide-react';
import { useDayflow } from '../../context/DayflowContext';
import { Habit, HabitSchedule } from '../../types/dayflow';
import {
  addDaysStr,
  calculateHabitStreaks,
  getTodayStr,
  getWeekDates,
  isHabitScheduledForDate,
  parseLocalDate,
} from '../../utils/dateUtils';
import { getLucideIcon, ICON_OPTIONS } from '../../utils/iconMap';
import { ConfirmDialog } from '../common/ConfirmDialog';

const HABIT_COLORS = ['#10b981', '#6366f1', '#3b82f6', '#8b5cf6', '#f59e0b', '#ec4899'];
const DAY_SHORT = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

export function HabitTrackerView() {
  const { dataset, addHabit, updateHabit, deleteHabit, toggleHabitForDate, pushToast } =
    useDayflow();

  const [modalOpen, setModalOpen] = useState(false);
  const [editingHabit, setEditingHabit] = useState<Habit | null>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [schedule, setSchedule] = useState<HabitSchedule>('daily');
  const [customDays, setCustomDays] = useState<number[]>([1, 3, 5]);
  const [color, setColor] = useState(HABIT_COLORS[0]);
  const [iconName, setIconName] = useState('Flame');
  const [formError, setFormError] = useState('');

  const [deletingHabit, setDeletingHabit] = useState<Habit | null>(null);

  const today = getTodayStr();
  const weekDates = useMemo(() => getWeekDates(today), [today]);

  // Build 16-week (112 days) GitHub-style consistency heatmap ending today
  const heatmapWeeks = useMemo(() => {
    const totalDays = 112;
    const cells: Array<{ date: string; count: number; level: number }> = [];
    const totalHabits = Math.max(1, dataset.habits.length);

    for (let i = totalDays - 1; i >= 0; i--) {
      const date = addDaysStr(today, -i);
      const count = dataset.habits.filter((h) => h.completedDates.includes(date)).length;
      const ratio = count / totalHabits;
      const level =
        count === 0 ? 0 : ratio < 0.34 ? 1 : ratio < 0.67 ? 2 : ratio < 1 ? 3 : 4;
      cells.push({ date, count, level });
    }

    const weeks: Array<typeof cells> = [];
    for (let i = 0; i < cells.length; i += 7) {
      weeks.push(cells.slice(i, i + 7));
    }
    return weeks;
  }, [dataset.habits, today]);

  const weeklyConsistency = useMemo(() => {
    if (dataset.habits.length === 0) return 0;
    let scheduledTotal = 0;
    let completedTotal = 0;
    for (const h of dataset.habits) {
      for (const d of weekDates) {
        if (d <= today && isHabitScheduledForDate(h, d)) {
          scheduledTotal++;
          if (h.completedDates.includes(d)) completedTotal++;
        }
      }
    }
    return scheduledTotal > 0 ? Math.round((completedTotal / scheduledTotal) * 100) : 0;
  }, [dataset.habits, weekDates, today]);

  const openCreate = () => {
    setEditingHabit(null);
    setTitle('');
    setDescription('');
    setSchedule('daily');
    setCustomDays([1, 3, 5]);
    setColor(HABIT_COLORS[0]);
    setIconName('Flame');
    setFormError('');
    setModalOpen(true);
  };

  const openEdit = (h: Habit) => {
    setEditingHabit(h);
    setTitle(h.title);
    setDescription(h.description);
    setSchedule(h.schedule);
    setCustomDays(h.customDays);
    setColor(h.color);
    setIconName(h.iconName);
    setFormError('');
    setModalOpen(true);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setFormError('Habit name is required.');
      return;
    }
    if (schedule === 'custom' && customDays.length === 0) {
      setFormError('Select at least one day for a custom schedule.');
      return;
    }

    if (editingHabit) {
      updateHabit(editingHabit.id, {
        title: title.trim(),
        description: description.trim(),
        schedule,
        customDays,
        color,
        iconName,
      });
      pushToast({ message: 'Habit updated', tone: 'success' });
    } else {
      addHabit({
        title: title.trim(),
        description: description.trim(),
        schedule,
        customDays,
        color,
        iconName,
      });
      pushToast({ message: `Created habit "${title.trim()}"`, tone: 'success' });
    }
    setModalOpen(false);
  };

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      {/* Header & Summary */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-display text-lg font-semibold text-zinc-900 dark:text-zinc-100">
            Habit Tracker
          </h2>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            Build daily consistency · This week’s completion rate:{' '}
            <span className="font-mono font-semibold tabular-nums text-zinc-900 dark:text-zinc-100">
              {weeklyConsistency}%
            </span>
          </p>
        </div>
        <button
          type="button"
          onClick={openCreate}
          className="inline-flex items-center gap-1.5 rounded-lg df-accent-bg px-4 py-2 text-xs font-medium text-white shadow-xs"
        >
          <Plus className="h-3.5 w-3.5" />
          <span>New Habit</span>
        </button>
      </div>

      {/* Habit Weekly Table */}
      {dataset.habits.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-zinc-200 py-14 text-center dark:border-zinc-800">
          <Flame className="h-8 w-8 text-zinc-400" />
          <p className="mt-3 text-sm font-medium text-zinc-800 dark:text-zinc-200">
            No habits configured yet
          </p>
          <p className="mt-1 max-w-sm text-xs text-zinc-500">
            Track daily routines like exercise, reading, hydration, or focused study.
          </p>
          <button
            type="button"
            onClick={openCreate}
            className="mt-4 inline-flex items-center gap-1.5 rounded-lg df-accent-bg px-4 py-2 text-xs font-medium text-white"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>Create First Habit</span>
          </button>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-[#17171b]">
          <table className="w-full min-w-[680px] border-collapse text-left">
            <thead>
              <tr className="border-b border-zinc-200 text-[11px] font-semibold text-zinc-500 dark:border-zinc-800 dark:text-zinc-400">
                <th className="px-4 py-3">Habit</th>
                {weekDates.map((dStr) => {
                  const d = parseLocalDate(dStr);
                  const isToday = dStr === today;
                  return (
                    <th key={dStr} className="px-2 py-3 text-center">
                      <span
                        className={`block ${
                          isToday ? 'df-accent-text font-bold' : ''
                        }`}
                      >
                        {d.toLocaleDateString('en-US', { weekday: 'short' })}
                      </span>
                      <span className="font-mono text-[10px] font-normal tabular-nums">
                        {d.getDate()}
                      </span>
                    </th>
                  );
                })}
                <th className="px-3 py-3 text-right">Streak</th>
                <th className="px-3 py-3 text-right">Best</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/80">
              {dataset.habits.map((habit) => {
                const Icon = getLucideIcon(habit.iconName);
                const { currentStreak, longestStreak } = calculateHabitStreaks(habit);

                return (
                  <tr
                    key={habit.id}
                    className="group transition-colors hover:bg-zinc-50/70 dark:hover:bg-zinc-800/30"
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div
                          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg"
                          style={{ backgroundColor: `${habit.color}18`, color: habit.color }}
                        >
                          <Icon className="h-4 w-4" />
                        </div>
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium text-zinc-900 dark:text-zinc-100">
                            {habit.title}
                          </p>
                          <p className="truncate text-[11px] text-zinc-500 dark:text-zinc-400">
                            {habit.description || habit.schedule}
                          </p>
                        </div>
                      </div>
                    </td>

                    {weekDates.map((dStr) => {
                      const done = habit.completedDates.includes(dStr);
                      const scheduled = isHabitScheduledForDate(habit, dStr);
                      const isFuture = dStr > today;

                      return (
                        <td key={dStr} className="px-2 py-3 text-center">
                          <button
                            type="button"
                            disabled={isFuture}
                            onClick={() => toggleHabitForDate(habit.id, dStr)}
                            aria-label={`Toggle ${habit.title} for ${dStr}`}
                            className={`mx-auto flex h-7 w-7 items-center justify-center rounded-lg border transition-all active:scale-90 ${
                              done
                                ? 'border-transparent text-white shadow-xs'
                                : scheduled
                                ? 'border-zinc-200 hover:border-zinc-400 dark:border-zinc-700 dark:hover:border-zinc-500'
                                : 'border-dashed border-zinc-200/70 opacity-45 dark:border-zinc-800'
                            } ${isFuture ? 'cursor-not-allowed opacity-30' : ''}`}
                            style={done ? { backgroundColor: habit.color } : undefined}
                          >
                            {done && <Check className="h-3.5 w-3.5 stroke-[2.5]" />}
                          </button>
                        </td>
                      );
                    })}

                    <td className="px-3 py-3 text-right font-mono text-xs font-semibold tabular-nums text-zinc-900 dark:text-zinc-100">
                      <span className="inline-flex items-center gap-1">
                        <Flame className="h-3.5 w-3.5 text-amber-500" />
                        {currentStreak}d
                      </span>
                    </td>

                    <td className="px-3 py-3 text-right font-mono text-xs tabular-nums text-zinc-500 dark:text-zinc-400">
                      <span className="inline-flex items-center gap-1">
                        <Trophy className="h-3 w-3 text-zinc-400" />
                        {longestStreak}d
                      </span>
                    </td>

                    <td className="px-4 py-3 text-right">
                      <div className="inline-flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => openEdit(habit)}
                          className="rounded p-1.5 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700 dark:hover:bg-zinc-800 dark:hover:text-zinc-200"
                          aria-label={`Edit ${habit.title}`}
                        >
                          <Edit3 className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeletingHabit(habit)}
                          className="rounded p-1.5 text-zinc-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-500/10"
                          aria-label={`Delete ${habit.title}`}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* GitHub-Style Consistency Heatmap */}
      <div className="rounded-2xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-[#17171b]">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <div>
            <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
              Consistency Heatmap (Last 16 Weeks)
            </h3>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              Daily habit completion density across your entire routine
            </p>
          </div>
          <div className="flex items-center gap-1.5 text-[11px] text-zinc-500">
            <span>Less</span>
            {[0, 1, 2, 3, 4].map((lvl) => (
              <span
                key={lvl}
                className={`h-3 w-3 rounded-[3px] ${
                  lvl === 0
                    ? 'bg-zinc-100 dark:bg-zinc-800'
                    : lvl === 1
                    ? 'bg-emerald-200 dark:bg-emerald-950'
                    : lvl === 2
                    ? 'bg-emerald-400 dark:bg-emerald-800'
                    : lvl === 3
                    ? 'bg-emerald-500 dark:bg-emerald-600'
                    : 'bg-emerald-600 dark:bg-emerald-400'
                }`}
              />
            ))}
            <span>More</span>
          </div>
        </div>

        <div className="overflow-x-auto pb-1">
          <div className="inline-flex gap-1.5">
            {heatmapWeeks.map((week, wIdx) => (
              <div key={wIdx} className="flex flex-col gap-1.5">
                {week.map((cell) => (
                  <div
                    key={cell.date}
                    title={`${cell.date}: ${cell.count} habit${cell.count === 1 ? '' : 's'} completed`}
                    className={`h-3.5 w-3.5 rounded-[3px] transition-colors ${
                      cell.level === 0
                        ? 'bg-zinc-100 dark:bg-zinc-800/80'
                        : cell.level === 1
                        ? 'bg-emerald-200 dark:bg-emerald-950'
                        : cell.level === 2
                        ? 'bg-emerald-400 dark:bg-emerald-800'
                        : cell.level === 3
                        ? 'bg-emerald-500 dark:bg-emerald-600'
                        : 'bg-emerald-600 dark:bg-emerald-400'
                    }`}
                  />
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Create / Edit Habit Modal */}
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
                {editingHabit ? 'Edit Habit' : 'Create Habit'}
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
                  Habit title
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => {
                    setTitle(e.target.value);
                    if (formError) setFormError('');
                  }}
                  placeholder="e.g. Read 20 pages"
                  className="w-full rounded-lg border border-zinc-200 bg-transparent px-3 py-2 text-sm text-zinc-900 dark:border-zinc-800 dark:text-zinc-100"
                />
                {formError && <p className="mt-1 text-xs text-red-500">{formError}</p>}
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium text-zinc-500">
                  Description
                </label>
                <input
                  type="text"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Optional target or note"
                  className="w-full rounded-lg border border-zinc-200 bg-transparent px-3 py-2 text-xs text-zinc-900 dark:border-zinc-800 dark:text-zinc-100"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium text-zinc-500">
                  Schedule
                </label>
                <select
                  value={schedule}
                  onChange={(e) => setSchedule(e.target.value as HabitSchedule)}
                  className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-xs text-zinc-900 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-100"
                >
                  <option value="daily">Every day</option>
                  <option value="weekdays">Weekdays (Mon–Fri)</option>
                  <option value="custom">Custom days</option>
                </select>
              </div>

              {schedule === 'custom' && (
                <div className="flex items-center gap-1.5">
                  {DAY_SHORT.map((lbl, idx) => {
                    const active = customDays.includes(idx);
                    return (
                      <button
                        key={idx}
                        type="button"
                        onClick={() =>
                          setCustomDays((prev) =>
                            prev.includes(idx)
                              ? prev.filter((d) => d !== idx)
                              : [...prev, idx].sort()
                          )
                        }
                        className={`h-8 w-8 rounded-lg font-mono text-xs font-semibold transition-colors ${
                          active
                            ? 'df-accent-bg text-white'
                            : 'border border-zinc-200 text-zinc-600 dark:border-zinc-700 dark:text-zinc-400'
                        }`}
                      >
                        {lbl}
                      </button>
                    );
                  })}
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-xs font-medium text-zinc-500">
                    Icon
                  </label>
                  <select
                    value={iconName}
                    onChange={(e) => setIconName(e.target.value)}
                    className="w-full rounded-lg border border-zinc-200 bg-white px-2.5 py-2 text-xs text-zinc-900 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-100"
                  >
                    {ICON_OPTIONS.map((ic) => (
                      <option key={ic} value={ic}>
                        {ic}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="mb-1.5 block text-xs font-medium text-zinc-500">
                    Accent Color
                  </label>
                  <div className="flex items-center gap-1.5 pt-1">
                    {HABIT_COLORS.map((c) => (
                      <button
                        key={c}
                        type="button"
                        onClick={() => setColor(c)}
                        className={`h-5 w-5 rounded-full transition-transform ${
                          color === c ? 'scale-110 ring-2 ring-zinc-900 dark:ring-white' : ''
                        }`}
                        style={{ backgroundColor: c }}
                      />
                    ))}
                  </div>
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
                {editingHabit ? 'Save Habit' : 'Create Habit'}
              </button>
            </div>
          </form>
        </div>
      )}

      <ConfirmDialog
        open={Boolean(deletingHabit)}
        title="Delete habit?"
        description={`"${deletingHabit?.title}" and its streak history will be removed.`}
        confirmLabel="Delete Habit"
        onConfirm={() => {
          if (deletingHabit) deleteHabit(deletingHabit.id);
          setDeletingHabit(null);
        }}
        onCancel={() => setDeletingHabit(null)}
      />
    </div>
  );
}
