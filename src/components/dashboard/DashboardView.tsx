import { useMemo } from 'react';
import {
  Bar,
  BarChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { ArrowRight, Check, Flame, Plus } from 'lucide-react';
import { useDayflow } from '../../context/DayflowContext';
import {
  addDaysStr,
  calculateHabitStreaks,
  formatDisplayDate,
  formatTime12h,
  getDailyQuote,
  getGreeting,
  getTodayStr,
  isHabitScheduledForDate,
  isTaskOverdue,
  parseLocalDate,
} from '../../utils/dateUtils';
import { TaskRow } from '../tasks/TaskRow';
import { getLucideIcon } from '../../utils/iconMap';

export function DashboardView() {
  const {
    dataset,
    setActiveSection,
    openQuickAdd,
    setEditingTask,
    toggleHabitForDate,
  } = useDayflow();

  const now = new Date();
  const today = getTodayStr();
  const greeting = getGreeting(now);
  const quote = getDailyQuote(now);

  const dateHeading = now.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });

  // Real calculated KPIs
  const totalTasks = dataset.tasks.length;
  const completedTasks = dataset.tasks.filter((t) => t.status === 'completed').length;
  const pendingTasks = totalTasks - completedTasks;
  const overdueTasks = dataset.tasks.filter((t) => isTaskOverdue(t, now)).length;

  const todayTasks = useMemo(
    () =>
      dataset.tasks.filter(
        (t) => t.dueDate === today || (t.status !== 'completed' && isTaskOverdue(t, now))
      ),
    [dataset.tasks, today, now]
  );

  const todayAllScheduled = dataset.tasks.filter((t) => t.dueDate === today);
  const todayDone = todayAllScheduled.filter((t) => t.status === 'completed').length;
  const dailyCompletionPct =
    todayAllScheduled.length > 0
      ? Math.round((todayDone / todayAllScheduled.length) * 100)
      : totalTasks > 0
      ? Math.round((completedTasks / totalTasks) * 100)
      : 0;

  // Current productivity streak: consecutive days with >= 1 completed task OR habit
  const productivityStreak = useMemo(() => {
    const historyMap = new Map(dataset.productivityHistory.map((h) => [h.date, h]));
    let streak = 0;
    let cursor = today;
    const todayRec = historyMap.get(today);
    const hasTodayActivity =
      todayRec && (todayRec.tasksCompleted > 0 || todayRec.habitsCompleted > 0 || todayRec.focusMinutes > 0);
    if (!hasTodayActivity) {
      cursor = addDaysStr(today, -1);
    }
    for (let i = 0; i < 30; i++) {
      const rec = historyMap.get(cursor);
      if (rec && (rec.tasksCompleted > 0 || rec.habitsCompleted > 0 || rec.focusMinutes > 0)) {
        streak++;
        cursor = addDaysStr(cursor, -1);
      } else {
        break;
      }
    }
    return streak;
  }, [dataset.productivityHistory, today]);

  // Weekly chart data (last 7 days from actual productivityHistory)
  const weeklyChartData = useMemo(() => {
    const map = new Map(dataset.productivityHistory.map((d) => [d.date, d]));
    return Array.from({ length: 7 }, (_, i) => {
      const dateStr = addDaysStr(today, -(6 - i));
      const d = parseLocalDate(dateStr);
      const entry = map.get(dateStr);
      return {
        day: d.toLocaleDateString('en-US', { weekday: 'short' }),
        tasks: entry?.tasksCompleted ?? 0,
        habits: entry?.habitsCompleted ?? 0,
      };
    });
  }, [dataset.productivityHistory, today]);

  const upcomingDeadlines = useMemo(
    () =>
      dataset.tasks
        .filter((t) => t.status !== 'completed' && t.dueDate > today)
        .sort((a, b) => a.dueDate.localeCompare(b.dueDate))
        .slice(0, 5),
    [dataset.tasks, today]
  );

  const todayHabits = useMemo(
    () => dataset.habits.filter((h) => isHabitScheduledForDate(h, today)),
    [dataset.habits, today]
  );

  // Circular SVG progress ring math
  const radius = 38;
  const circumference = 2 * Math.PI * radius;
  const strokeOffset = circumference - (dailyCompletionPct / 100) * circumference;

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      {/* Hero Header & Circular Progress Ring */}
      <section className="flex flex-col justify-between gap-6 rounded-2xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-[#17171b] md:flex-row md:items-center">
        <div className="max-w-xl space-y-2">
          <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400">{dateHeading}</p>
          <h2 className="font-display text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
            {greeting}, {dataset.preferences.displayName.split(' ')[0]}
          </h2>
          <p className="text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
            “{quote.text}” — <span className="text-zinc-500">{quote.author}</span>
          </p>
        </div>

        <div className="flex items-center gap-5 self-start md:self-auto">
          <div className="relative flex h-24 w-24 items-center justify-center">
            <svg className="h-24 w-24 -rotate-90" viewBox="0 0 96 96">
              <circle
                cx="48"
                cy="48"
                r={radius}
                fill="none"
                stroke="currentColor"
                strokeWidth="7"
                className="text-zinc-100 dark:text-zinc-800"
              />
              <circle
                cx="48"
                cy="48"
                r={radius}
                fill="none"
                stroke="var(--df-accent)"
                strokeWidth="7"
                strokeLinecap="round"
                strokeDasharray={circumference}
                strokeDashoffset={strokeOffset}
                className="transition-[stroke-dashoffset] duration-500 ease-out"
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="font-mono text-lg font-bold tabular-nums text-zinc-900 dark:text-zinc-100">
                {dailyCompletionPct}%
              </span>
            </div>
          </div>
          <div>
            <p className="text-xs font-semibold text-zinc-900 dark:text-zinc-100">
              Daily Progress
            </p>
            <p className="mt-0.5 font-mono text-xs tabular-nums text-zinc-500 dark:text-zinc-400">
              {todayDone} of {todayAllScheduled.length} due today
            </p>
            <button
              type="button"
              onClick={() => openQuickAdd({ dueDate: today })}
              className="mt-2 inline-flex items-center gap-1 text-xs font-medium df-accent-text hover:underline"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>Add task for today</span>
            </button>
          </div>
        </div>
      </section>

      {/* 5-Column Stat Strip */}
      <section className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        <div className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-[#17171b]">
          <p className="text-xs text-zinc-500 dark:text-zinc-400">Total Tasks</p>
          <p className="mt-1.5 font-mono text-2xl font-semibold tabular-nums text-zinc-900 dark:text-zinc-100">
            {totalTasks}
          </p>
        </div>
        <div className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-[#17171b]">
          <p className="text-xs text-zinc-500 dark:text-zinc-400">Pending</p>
          <p className="mt-1.5 font-mono text-2xl font-semibold tabular-nums text-zinc-900 dark:text-zinc-100">
            {pendingTasks}
          </p>
        </div>
        <div className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-[#17171b]">
          <p className="text-xs text-zinc-500 dark:text-zinc-400">Completed</p>
          <p className="mt-1.5 font-mono text-2xl font-semibold tabular-nums text-emerald-600 dark:text-emerald-400">
            {completedTasks}
          </p>
        </div>
        <div className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-[#17171b]">
          <p className="text-xs text-zinc-500 dark:text-zinc-400">Overdue</p>
          <p
            className={`mt-1.5 font-mono text-2xl font-semibold tabular-nums ${
              overdueTasks > 0
                ? 'text-red-600 dark:text-red-400'
                : 'text-zinc-900 dark:text-zinc-100'
            }`}
          >
            {overdueTasks}
          </p>
        </div>
        <div className="col-span-2 rounded-xl border border-zinc-200 bg-white p-4 sm:col-span-1 dark:border-zinc-800 dark:bg-[#17171b]">
          <p className="text-xs text-zinc-500 dark:text-zinc-400">Productivity Streak</p>
          <div className="mt-1.5 flex items-baseline gap-1.5">
            <Flame className="h-4 w-4 text-amber-500" />
            <span className="font-mono text-2xl font-semibold tabular-nums text-zinc-900 dark:text-zinc-100">
              {productivityStreak}d
            </span>
          </div>
        </div>
      </section>

      {/* Main Content Split */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Left 2 cols: Today's Tasks + Weekly Chart */}
        <div className="space-y-6 lg:col-span-2">
          {/* Today's Task List */}
          <div className="rounded-2xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-[#17171b]">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                  Today’s Focus List
                </h3>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                  Due today and overdue items needing attention
                </p>
              </div>
              <button
                type="button"
                onClick={() => setActiveSection('today')}
                className="inline-flex items-center gap-1 text-xs font-medium df-accent-text hover:underline"
              >
                <span>View all</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </button>
            </div>

            {todayTasks.length === 0 ? (
              <div className="rounded-xl border border-dashed border-zinc-200 py-10 text-center dark:border-zinc-800">
                <p className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                  No tasks scheduled for today
                </p>
                <button
                  type="button"
                  onClick={() => openQuickAdd({ dueDate: today })}
                  className="mt-3 inline-flex items-center gap-1.5 rounded-lg df-accent-bg px-3.5 py-1.5 text-xs font-medium text-white"
                >
                  <Plus className="h-3.5 w-3.5" />
                  <span>Add Task</span>
                </button>
              </div>
            ) : (
              <div className="space-y-2">
                {todayTasks.slice(0, 6).map((task) => (
                  <TaskRow key={task.id} task={task} />
                ))}
              </div>
            )}
          </div>

          {/* Weekly Productivity Chart */}
          <div className="rounded-2xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-[#17171b]">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                  Weekly Productivity
                </h3>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                  Completed tasks and habit check-ins over the past 7 days
                </p>
              </div>
              <button
                type="button"
                onClick={() => setActiveSection('analytics')}
                className="inline-flex items-center gap-1 text-xs font-medium df-accent-text hover:underline"
              >
                <span>Analytics</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </button>
            </div>

            <div className="h-56 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={weeklyChartData} barGap={4}>
                  <XAxis
                    dataKey="day"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 11, fill: '#71717a' }}
                  />
                  <YAxis
                    allowDecimals={false}
                    axisLine={false}
                    tickLine={false}
                    width={24}
                    tick={{ fontSize: 11, fill: '#71717a' }}
                  />
                  <Tooltip
                    cursor={{ fill: 'rgba(139, 92, 246, 0.08)' }}
                    contentStyle={{
                      backgroundColor: '#18181b',
                      border: '1px solid #27272a',
                      borderRadius: '10px',
                      fontSize: '12px',
                      color: '#f4f4f5',
                    }}
                  />
                  <Bar
                    dataKey="tasks"
                    name="Tasks Completed"
                    fill="var(--df-accent)"
                    radius={[5, 5, 0, 0]}
                    maxBarSize={24}
                  />
                  <Bar
                    dataKey="habits"
                    name="Habits Checked"
                    fill="#3b82f6"
                    radius={[5, 5, 0, 0]}
                    maxBarSize={24}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Right Col: Daily Habits & Upcoming Deadlines */}
        <div className="space-y-6">
          {/* Daily Habits */}
          <div className="rounded-2xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-[#17171b]">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                Daily Habits
              </h3>
              <button
                type="button"
                onClick={() => setActiveSection('habits')}
                className="text-xs font-medium df-accent-text hover:underline"
              >
                Manage
              </button>
            </div>

            {todayHabits.length === 0 ? (
              <p className="py-4 text-xs text-zinc-500">
                No habits scheduled for today.
              </p>
            ) : (
              <div className="space-y-2">
                {todayHabits.map((h) => {
                  const done = h.completedDates.includes(today);
                  const { currentStreak } = calculateHabitStreaks(h);
                  const HIcon = getLucideIcon(h.iconName);

                  return (
                    <button
                      key={h.id}
                      type="button"
                      onClick={() => toggleHabitForDate(h.id, today)}
                      className={`flex w-full items-center gap-3 rounded-xl border px-3 py-2.5 text-left transition-colors ${
                        done
                          ? 'border-emerald-500/30 bg-emerald-500/8'
                          : 'border-zinc-200/80 hover:bg-zinc-50 dark:border-zinc-800 dark:hover:bg-zinc-800/50'
                      }`}
                    >
                      <div
                        className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-md border ${
                          done
                            ? 'border-emerald-500 bg-emerald-500 text-white'
                            : 'border-zinc-300 dark:border-zinc-600'
                        }`}
                      >
                        {done && <Check className="h-3.5 w-3.5" />}
                      </div>
                      <HIcon className="h-4 w-4 shrink-0" style={{ color: h.color }} />
                      <span
                        className={`flex-1 truncate text-xs font-medium ${
                          done
                            ? 'text-zinc-500 line-through dark:text-zinc-400'
                            : 'text-zinc-900 dark:text-zinc-100'
                        }`}
                      >
                        {h.title}
                      </span>
                      <span className="font-mono text-[11px] tabular-nums text-zinc-400">
                        {currentStreak}d
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Upcoming Deadlines */}
          <div className="rounded-2xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-[#17171b]">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                Upcoming Deadlines
              </h3>
              <button
                type="button"
                onClick={() => setActiveSection('upcoming')}
                className="text-xs font-medium df-accent-text hover:underline"
              >
                See all
              </button>
            </div>

            {upcomingDeadlines.length === 0 ? (
              <p className="py-4 text-xs text-zinc-500">
                No upcoming deadlines on the horizon.
              </p>
            ) : (
              <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
                {upcomingDeadlines.map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setEditingTask(t)}
                    className="flex w-full items-center justify-between gap-3 py-2.5 text-left transition-colors hover:opacity-80"
                  >
                    <span className="truncate text-xs font-medium text-zinc-800 dark:text-zinc-200">
                      {t.title}
                    </span>
                    <span className="shrink-0 font-mono text-[11px] tabular-nums text-zinc-500">
                      {formatDisplayDate(t.dueDate)}
                      {t.dueTime ? ` · ${formatTime12h(t.dueTime)}` : ''}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
