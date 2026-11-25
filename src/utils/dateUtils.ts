import { Habit, PriorityLevel, Task } from '../types/dayflow';

export function pad2(n: number): string {
  return String(n).padStart(2, '0');
}

export function formatLocalDate(date: Date): string {
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;
}

export function parseLocalDate(dateStr: string): Date {
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(y, (m || 1) - 1, d || 1);
}

export function getTodayStr(): string {
  return formatLocalDate(new Date());
}

export function addDaysStr(dateStr: string, days: number): string {
  const d = parseLocalDate(dateStr);
  d.setDate(d.getDate() + days);
  return formatLocalDate(d);
}

export function isTaskOverdue(task: Task, now: Date = new Date()): boolean {
  if (task.status === 'completed' || !task.dueDate) return false;
  const todayStr = formatLocalDate(now);
  if (task.dueDate < todayStr) return true;
  if (task.dueDate > todayStr) return false;
  if (!task.dueTime) return false;
  const [hh, mm] = task.dueTime.split(':').map(Number);
  if (Number.isNaN(hh) || Number.isNaN(mm)) return false;
  const due = new Date(now.getFullYear(), now.getMonth(), now.getDate(), hh, mm, 0);
  return due.getTime() < now.getTime();
}

export function isTaskDueSoon(task: Task, leadMinutes: number, now: Date = new Date()): boolean {
  if (task.status === 'completed' || !task.dueDate) return false;
  const todayStr = formatLocalDate(now);
  if (task.dueDate !== todayStr) return false;
  if (!task.dueTime) return true;
  const [hh, mm] = task.dueTime.split(':').map(Number);
  if (Number.isNaN(hh) || Number.isNaN(mm)) return false;
  const due = new Date(now.getFullYear(), now.getMonth(), now.getDate(), hh, mm, 0);
  const diffMinutes = (due.getTime() - now.getTime()) / 60000;
  return diffMinutes >= 0 && diffMinutes <= leadMinutes;
}

export function formatDisplayDate(dateStr: string): string {
  if (!dateStr) return 'No date';
  const today = getTodayStr();
  if (dateStr === today) return 'Today';
  if (dateStr === addDaysStr(today, 1)) return 'Tomorrow';
  if (dateStr === addDaysStr(today, -1)) return 'Yesterday';
  const d = parseLocalDate(dateStr);
  return d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: d.getFullYear() !== new Date().getFullYear() ? 'numeric' : undefined,
  });
}

export function formatTime12h(timeStr: string): string {
  if (!timeStr) return '';
  const [hStr, mStr] = timeStr.split(':');
  const h = Number(hStr);
  const m = Number(mStr);
  if (Number.isNaN(h) || Number.isNaN(m)) return timeStr;
  const period = h >= 12 ? 'PM' : 'AM';
  const hour12 = h % 12 === 0 ? 12 : h % 12;
  return `${hour12}:${pad2(m)} ${period}`;
}

export function getGreeting(now: Date = new Date()): string {
  const hour = now.getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

const MOTIVATIONAL_QUOTES = [
  { text: 'Clarity precedes mastery. Focus on the single next meaningful step.', author: 'Robin Sharma' },
  { text: 'You do not rise to the level of your goals. You fall to the level of your systems.', author: 'James Clear' },
  { text: 'Amateurs sit and wait for inspiration, the rest of us just get up and go to work.', author: 'Stephen King' },
  { text: 'Small daily improvements over time lead to remarkable outcomes.', author: 'Dayflow Journal' },
  { text: 'Protect your focus like your most valuable resource—because it is.', author: 'Cal Newport' },
  { text: 'Simplicity is about subtracting the obvious and adding the meaningful.', author: 'John Maeda' },
  { text: 'Action cures anxiety. Start small, finish cleanly, then move forward.', author: 'David Allen' },
];

export function getDailyQuote(now: Date = new Date()): { text: string; author: string } {
  const start = new Date(now.getFullYear(), 0, 0);
  const diff = now.getTime() - start.getTime();
  const dayOfYear = Math.floor(diff / 86400000);
  return MOTIVATIONAL_QUOTES[dayOfYear % MOTIVATIONAL_QUOTES.length];
}

export function getWeekDates(anchorDateStr: string): string[] {
  const d = parseLocalDate(anchorDateStr);
  const day = d.getDay(); // 0 Sun..6 Sat
  const diffToMonday = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diffToMonday);
  return Array.from({ length: 7 }, (_, i) => {
    const copy = new Date(d);
    copy.setDate(d.getDate() + i);
    return formatLocalDate(copy);
  });
}

export function getMonthCalendarGrid(year: number, monthIndex: number): Array<{ dateStr: string; inCurrentMonth: boolean }> {
  const firstDay = new Date(year, monthIndex, 1);
  const startDayOfWeek = firstDay.getDay(); // 0..6
  const startOffset = startDayOfWeek === 0 ? 6 : startDayOfWeek - 1; // Monday-start grid
  const startDate = new Date(year, monthIndex, 1 - startOffset);

  const cells: Array<{ dateStr: string; inCurrentMonth: boolean }> = [];
  for (let i = 0; i < 42; i++) {
    const cellDate = new Date(startDate);
    cellDate.setDate(startDate.getDate() + i);
    cells.push({
      dateStr: formatLocalDate(cellDate),
      inCurrentMonth: cellDate.getMonth() === monthIndex,
    });
  }
  return cells;
}

export function isHabitScheduledForDate(habit: Habit, dateStr: string): boolean {
  const day = parseLocalDate(dateStr).getDay();
  if (habit.schedule === 'daily') return true;
  if (habit.schedule === 'weekdays') return day >= 1 && day <= 5;
  return habit.customDays.includes(day);
}

export function calculateHabitStreaks(habit: Habit): { currentStreak: number; longestStreak: number } {
  const set = new Set(habit.completedDates);
  const today = getTodayStr();
  let currentStreak = 0;

  // Walk backwards up to 365 days checking scheduled dates
  let cursor = set.has(today) ? today : addDaysStr(today, -1);
  for (let i = 0; i < 365; i++) {
    if (isHabitScheduledForDate(habit, cursor)) {
      if (set.has(cursor)) {
        currentStreak++;
      } else {
        break;
      }
    }
    cursor = addDaysStr(cursor, -1);
  }

  // Compute longest streak over sorted completed dates
  const sorted = [...set].sort();
  let longestStreak = 0;
  let running = 0;
  let prevDate = '';

  for (const d of sorted) {
    if (!prevDate) {
      running = 1;
    } else {
      // Check if any scheduled day was missed between prevDate and d
      let missed = false;
      let step = addDaysStr(prevDate, 1);
      while (step < d) {
        if (isHabitScheduledForDate(habit, step)) {
          missed = true;
          break;
        }
        step = addDaysStr(step, 1);
      }
      running = missed ? 1 : running + 1;
    }
    if (running > longestStreak) longestStreak = running;
    prevDate = d;
  }

  return { currentStreak, longestStreak };
}

export function getNextRecurringDueDate(currentDueDate: string, rule: Task['recurring']): string {
  const base = currentDueDate || getTodayStr();
  if (rule === 'daily') return addDaysStr(base, 1);
  if (rule === 'weekdays') {
    let next = addDaysStr(base, 1);
    while ([0, 6].includes(parseLocalDate(next).getDay())) {
      next = addDaysStr(next, 1);
    }
    return next;
  }
  if (rule === 'weekly') return addDaysStr(base, 7);
  if (rule === 'monthly') {
    const d = parseLocalDate(base);
    d.setMonth(d.getMonth() + 1);
    return formatLocalDate(d);
  }
  return base;
}

export const PRIORITY_META: Record<
  PriorityLevel,
  { label: string; rank: number; dotClass: string; textClass: string; borderClass: string }
> = {
  urgent: {
    label: 'Urgent',
    rank: 4,
    dotClass: 'bg-red-500',
    textClass: 'text-red-600 dark:text-red-400',
    borderClass: 'border-red-500/30',
  },
  high: {
    label: 'High',
    rank: 3,
    dotClass: 'bg-orange-500',
    textClass: 'text-orange-600 dark:text-orange-400',
    borderClass: 'border-orange-500/30',
  },
  medium: {
    label: 'Medium',
    rank: 2,
    dotClass: 'bg-amber-500',
    textClass: 'text-amber-600 dark:text-amber-400',
    borderClass: 'border-amber-500/30',
  },
  low: {
    label: 'Low',
    rank: 1,
    dotClass: 'bg-emerald-500',
    textClass: 'text-emerald-600 dark:text-emerald-400',
    borderClass: 'border-emerald-500/30',
  },
};
