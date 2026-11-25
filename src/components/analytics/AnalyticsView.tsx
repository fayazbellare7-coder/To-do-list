import { useMemo } from 'react';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { useDayflow } from '../../context/DayflowContext';
import {
  addDaysStr,
  getTodayStr,
  isHabitScheduledForDate,
  isTaskOverdue,
  parseLocalDate,
} from '../../utils/dateUtils';

export function AnalyticsView() {
  const { dataset } = useDayflow();
  const today = getTodayStr();
  const now = new Date();

  const metrics = useMemo(() => {
    const totalTasks = dataset.tasks.length;
    const completedTasks = dataset.tasks.filter((t) => t.status === 'completed').length;
    const pendingTasks = totalTasks - completedTasks;
    const overdueTasks = dataset.tasks.filter((t) => isTaskOverdue(t, now)).length;
    const overdueRate = pendingTasks > 0 ? Math.round((overdueTasks / pendingTasks) * 100) : 0;

    const todayScheduled = dataset.tasks.filter((t) => t.dueDate === today);
    const todayCompleted = todayScheduled.filter((t) => t.status === 'completed').length;
    const dailyCompletionRate =
      todayScheduled.length > 0
        ? Math.round((todayCompleted / todayScheduled.length) * 100)
        : totalTasks > 0
        ? Math.round((completedTasks / totalTasks) * 100)
        : 0;

    const totalFocusMins = dataset.focusSessions
      .filter((s) => s.mode === 'focus')
      .reduce((sum, s) => sum + s.durationMinutes, 0);
    const totalFocusHours = Math.round((totalFocusMins / 60) * 10) / 10;

    // Habit consistency over last 14 days
    let scheduledHabits14d = 0;
    let doneHabits14d = 0;
    for (let i = 0; i < 14; i++) {
      const d = addDaysStr(today, -i);
      for (const h of dataset.habits) {
        if (isHabitScheduledForDate(h, d)) {
          scheduledHabits14d++;
          if (h.completedDates.includes(d)) doneHabits14d++;
        }
      }
    }
    const habitConsistency =
      scheduledHabits14d > 0 ? Math.round((doneHabits14d / scheduledHabits14d) * 100) : 0;

    // Most productive day of week from completed tasks
    const dayCounts = [0, 0, 0, 0, 0, 0, 0];
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    for (const t of dataset.tasks) {
      if (t.status === 'completed' && t.completedAt) {
        const dow = new Date(t.completedAt).getDay();
        dayCounts[dow]++;
      }
    }
    const maxDayVal = Math.max(...dayCounts);
    const mostProductiveDay =
      maxDayVal > 0 ? dayNames[dayCounts.indexOf(maxDayVal)] : 'No data yet';

    // Current productivity streak
    const historyMap = new Map(dataset.productivityHistory.map((d) => [d.date, d]));
    let streak = 0;
    let cursor = today;
    const todayRec = historyMap.get(today);
    if (!todayRec || (todayRec.tasksCompleted === 0 && todayRec.habitsCompleted === 0 && todayRec.focusMinutes === 0)) {
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

    return {
      totalTasks,
      completedTasks,
      pendingTasks,
      overdueTasks,
      overdueRate,
      dailyCompletionRate,
      totalFocusHours,
      habitConsistency,
      mostProductiveDay,
      streak,
    };
  }, [dataset, today, now]);

  const weeklyData = useMemo(() => {
    const map = new Map(dataset.productivityHistory.map((d) => [d.date, d]));
    return Array.from({ length: 7 }, (_, i) => {
      const dateStr = addDaysStr(today, -(6 - i));
      const d = parseLocalDate(dateStr);
      const entry = map.get(dateStr);
      return {
        label: d.toLocaleDateString('en-US', { weekday: 'short' }),
        tasks: entry?.tasksCompleted ?? 0,
        focusMin: entry?.focusMinutes ?? 0,
        habits: entry?.habitsCompleted ?? 0,
      };
    });
  }, [dataset.productivityHistory, today]);

  const monthlyData = useMemo(() => {
    return dataset.productivityHistory.map((d) => ({
      label: d.date.slice(5),
      tasks: d.tasksCompleted,
      focusMin: d.focusMinutes,
    }));
  }, [dataset.productivityHistory]);

  const statusDonutData = useMemo(
    () => [
      { name: 'Completed', value: metrics.completedTasks, color: '#10b981' },
      { name: 'Pending (On Track)', value: Math.max(0, metrics.pendingTasks - metrics.overdueTasks), color: '#6366f1' },
      { name: 'Overdue', value: metrics.overdueTasks, color: '#ef4444' },
    ],
    [metrics]
  );

  const categoryDistribution = useMemo(() => {
    return dataset.categories
      .map((c) => {
        const count = dataset.tasks.filter((t) => t.categoryId === c.id).length;
        return {
          name: c.name,
          count,
          color: c.color,
        };
      })
      .filter((c) => c.count > 0);
  }, [dataset.categories, dataset.tasks]);

  const tooltipStyle = {
    backgroundColor: '#18181b',
    border: '1px solid #27272a',
    borderRadius: '10px',
    fontSize: '12px',
    color: '#f4f4f5',
  };

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div>
        <h2 className="font-display text-lg font-semibold text-zinc-900 dark:text-zinc-100">
          Productivity Analytics
        </h2>
        <p className="text-xs text-zinc-500 dark:text-zinc-400">
          Calculated dynamically from your tasks, focus sessions, and habit check-ins
        </p>
      </div>

      {/* KPI Grid */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <div className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-[#17171b]">
          <p className="text-[11px] text-zinc-500">Completion Rate</p>
          <p className="mt-1 font-mono text-2xl font-semibold tabular-nums text-zinc-900 dark:text-zinc-100">
            {metrics.dailyCompletionRate}%
          </p>
        </div>
        <div className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-[#17171b]">
          <p className="text-[11px] text-zinc-500">Total Focus</p>
          <p className="mt-1 font-mono text-2xl font-semibold tabular-nums text-zinc-900 dark:text-zinc-100">
            {metrics.totalFocusHours}h
          </p>
        </div>
        <div className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-[#17171b]">
          <p className="text-[11px] text-zinc-500">Habit Consistency</p>
          <p className="mt-1 font-mono text-2xl font-semibold tabular-nums text-emerald-600 dark:text-emerald-400">
            {metrics.habitConsistency}%
          </p>
        </div>
        <div className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-[#17171b]">
          <p className="text-[11px] text-zinc-500">Active Streak</p>
          <p className="mt-1 font-mono text-2xl font-semibold tabular-nums text-zinc-900 dark:text-zinc-100">
            {metrics.streak}d
          </p>
        </div>
        <div className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-[#17171b]">
          <p className="text-[11px] text-zinc-500">Overdue Tasks</p>
          <p className="mt-1 font-mono text-2xl font-semibold tabular-nums text-red-600 dark:text-red-400">
            {metrics.overdueTasks}
            <span className="ml-1 text-xs font-normal text-zinc-400">
              ({metrics.overdueRate}%)
            </span>
          </p>
        </div>
        <div className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-[#17171b]">
          <p className="text-[11px] text-zinc-500">Peak Day</p>
          <p className="mt-1 truncate text-base font-semibold text-zinc-900 dark:text-zinc-100">
            {metrics.mostProductiveDay}
          </p>
        </div>
      </div>

      {/* Charts Row 1 */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="rounded-2xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-[#17171b]">
          <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
            Weekly Output (Tasks &amp; Habits)
          </h3>
          <p className="mb-4 text-xs text-zinc-500 dark:text-zinc-400">
            7-day comparison of completed tasks and habit check-ins
          </p>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={weeklyData}>
                <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#71717a' }} />
                <YAxis allowDecimals={false} axisLine={false} tickLine={false} width={26} tick={{ fontSize: 11, fill: '#71717a' }} />
                <Tooltip contentStyle={tooltipStyle} />
                <Bar dataKey="tasks" name="Tasks" fill="var(--df-accent)" radius={[5, 5, 0, 0]} maxBarSize={24} />
                <Bar dataKey="habits" name="Habits" fill="#10b981" radius={[5, 5, 0, 0]} maxBarSize={24} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="rounded-2xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-[#17171b]">
          <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
            30-Day Productivity &amp; Focus Trend
          </h3>
          <p className="mb-4 text-xs text-zinc-500 dark:text-zinc-400">
            Daily focus minutes logged across the last 30 days
          </p>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={monthlyData}>
                <XAxis dataKey="label" axisLine={false} tickLine={false} interval={4} tick={{ fontSize: 11, fill: '#71717a' }} />
                <YAxis allowDecimals={false} axisLine={false} tickLine={false} width={30} tick={{ fontSize: 11, fill: '#71717a' }} />
                <Tooltip contentStyle={tooltipStyle} />
                <Area
                  type="monotone"
                  dataKey="focusMin"
                  name="Focus Minutes"
                  stroke="#3b82f6"
                  fill="#3b82f6"
                  fillOpacity={0.18}
                  strokeWidth={2}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Charts Row 2 */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="rounded-2xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-[#17171b]">
          <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
            Completed vs Pending Tasks
          </h3>
          <p className="mb-4 text-xs text-zinc-500 dark:text-zinc-400">
            Real-time breakdown of all {metrics.totalTasks} workspace tasks
          </p>

          {metrics.totalTasks === 0 ? (
            <div className="flex h-56 items-center justify-center text-xs text-zinc-500">
              Add tasks to view completion breakdown.
            </div>
          ) : (
            <div className="flex flex-col items-center gap-4 sm:flex-row">
              <div className="h-56 w-56 shrink-0">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={statusDonutData}
                      dataKey="value"
                      nameKey="name"
                      innerRadius={56}
                      outerRadius={82}
                      paddingAngle={3}
                    >
                      {statusDonutData.map((entry, idx) => (
                        <Cell key={idx} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={tooltipStyle} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="flex-1 space-y-2.5">
                {statusDonutData.map((item) => (
                  <div key={item.name} className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <span
                        className="h-2.5 w-2.5 rounded-full"
                        style={{ backgroundColor: item.color }}
                      />
                      <span className="text-zinc-700 dark:text-zinc-300">{item.name}</span>
                    </div>
                    <span className="font-mono font-semibold tabular-nums text-zinc-900 dark:text-zinc-100">
                      {item.value}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="rounded-2xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-[#17171b]">
          <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
            Category Distribution
          </h3>
          <p className="mb-4 text-xs text-zinc-500 dark:text-zinc-400">
            Tasks organized across your active categories
          </p>

          {categoryDistribution.length === 0 ? (
            <div className="flex h-56 items-center justify-center text-xs text-zinc-500">
              No categorized tasks available.
            </div>
          ) : (
            <div className="h-56 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={categoryDistribution} layout="vertical" margin={{ left: 10 }}>
                  <XAxis type="number" allowDecimals={false} axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#71717a' }} />
                  <YAxis type="category" dataKey="name" axisLine={false} tickLine={false} width={86} tick={{ fontSize: 11, fill: '#71717a' }} />
                  <Tooltip contentStyle={tooltipStyle} />
                  <Bar dataKey="count" name="Tasks" radius={[0, 5, 5, 0]} maxBarSize={20}>
                    {categoryDistribution.map((entry, idx) => (
                      <Cell key={idx} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
