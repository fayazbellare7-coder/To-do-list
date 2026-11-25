import {
  Category,
  DayflowDataset,
  FocusSession,
  Habit,
  ProductivityDay,
  Project,
  Task,
  UserPreferences,
} from '../types/dayflow';
import { addDaysStr, getTodayStr } from '../utils/dateUtils';

const STORAGE_KEY = 'dayflow_workspace_v1';
const INITIALIZED_KEY = 'dayflow_initialized_v1';

export const DEFAULT_AVATAR_URL = '/src/assets/images/avatar_dayflow_user_1795500932205.jpg';

export const DEFAULT_CATEGORIES: Category[] = [
  { id: 'cat-personal', name: 'Personal', color: '#8b5cf6', iconName: 'User', isDefault: true },
  { id: 'cat-academics', name: 'Academics', color: '#3b82f6', iconName: 'GraduationCap', isDefault: true },
  { id: 'cat-business', name: 'Business', color: '#6366f1', iconName: 'Briefcase', isDefault: true },
  { id: 'cat-fitness', name: 'Fitness', color: '#10b981', iconName: 'Dumbbell', isDefault: true },
  { id: 'cat-finance', name: 'Finance', color: '#f59e0b', iconName: 'Wallet', isDefault: true },
  { id: 'cat-work', name: 'Work', color: '#ec4899', iconName: 'Laptop', isDefault: true },
];

export const DEFAULT_PREFERENCES: UserPreferences = {
  displayName: 'Alex Morgan',
  roleTitle: 'Product Designer & Builder',
  avatarUrl: DEFAULT_AVATAR_URL,
  theme: 'dark',
  accentColor: 'violet',
  defaultPriority: 'medium',
  focusMinutes: 25,
  shortBreakMinutes: 5,
  longBreakMinutes: 15,
  soundEnabled: true,
  browserNotifications: false,
  inAppReminders: true,
  reminderLeadMinutes: 45,
};

function generateSeedHabitDates(today: string, pattern: number[]): string[] {
  const dates: string[] = [];
  for (let i = 0; i < 45; i++) {
    const d = addDaysStr(today, -i);
    if (pattern.includes(i % 7) || (i > 0 && i % 5 !== 0 && i < 14)) {
      dates.push(d);
    }
  }
  return Array.from(new Set(dates)).sort();
}

export function createSampleDataset(): DayflowDataset {
  const today = getTodayStr();
  const yesterday = addDaysStr(today, -1);
  const twoDaysAgo = addDaysStr(today, -2);
  const tomorrow = addDaysStr(today, 1);
  const inTwoDays = addDaysStr(today, 2);
  const inFourDays = addDaysStr(today, 4);
  const inSevenDays = addDaysStr(today, 7);

  const projects: Project[] = [
    {
      id: 'proj-q4-launch',
      name: 'Dayflow Q4 Product Launch',
      description: 'Finalize onboarding polish, keyboard navigation QA, and release notes.',
      deadline: inSevenDays,
      color: '#7c3aed',
      status: 'active',
      createdAt: new Date(Date.now() - 86400000 * 10).toISOString(),
    },
    {
      id: 'proj-dbms',
      name: 'DBMS Mid-Term Preparation',
      description: 'Normalization, B+ Trees, concurrency control, and past paper practice.',
      deadline: inFourDays,
      color: '#2563eb',
      status: 'active',
      createdAt: new Date(Date.now() - 86400000 * 7).toISOString(),
    },
    {
      id: 'proj-half-marathon',
      name: 'Half-Marathon Conditioning',
      description: '10-week endurance progression and recovery tracking.',
      deadline: addDaysStr(today, 21),
      color: '#10b981',
      status: 'active',
      createdAt: new Date(Date.now() - 86400000 * 14).toISOString(),
    },
  ];

  const tasks: Task[] = [
    {
      id: 'task-1',
      title: 'Finalize onboarding flow wireframes & copy',
      description: 'Review step transitions and empty-state copy before engineering handoff.',
      dueDate: today,
      dueTime: '11:30',
      priority: 'high',
      categoryId: 'cat-work',
      projectId: 'proj-q4-launch',
      status: 'in_progress',
      subtasks: [
        { id: 'st-1', title: 'Audit mobile step spacing', completed: true },
        { id: 'st-2', title: 'Update microcopy for workspace setup', completed: false },
        { id: 'st-3', title: 'Export design tokens', completed: false },
      ],
      tags: ['design', 'launch'],
      estimatedMinutes: 60,
      recurring: 'none',
      notes: 'Keep contrast >= 4.5:1 across both light and dark modes.',
      order: 1,
      createdAt: new Date(Date.now() - 86400000 * 2).toISOString(),
    },
    {
      id: 'task-2',
      title: 'Solve Chapter 4 B+ Tree indexing problems',
      description: 'Complete exercises 4.1 through 4.8 and verify insertion split cases.',
      dueDate: today,
      dueTime: '17:00',
      priority: 'urgent',
      categoryId: 'cat-academics',
      projectId: 'proj-dbms',
      status: 'todo',
      subtasks: [
        { id: 'st-4', title: 'Review leaf node split rules', completed: true },
        { id: 'st-5', title: 'Work through 6 practice insertions', completed: false },
      ],
      tags: ['exam', 'dbms'],
      estimatedMinutes: 75,
      recurring: 'none',
      notes: 'Focus on order p=4 edge cases.',
      order: 2,
      createdAt: new Date(Date.now() - 86400000).toISOString(),
    },
    {
      id: 'task-3',
      title: '45-minute Zone 2 endurance run',
      description: 'Keep heart rate steady between 138–148 bpm.',
      dueDate: today,
      dueTime: '18:30',
      priority: 'medium',
      categoryId: 'cat-fitness',
      projectId: 'proj-half-marathon',
      status: 'todo',
      subtasks: [],
      tags: ['running', 'cardio'],
      estimatedMinutes: 45,
      recurring: 'weekdays',
      notes: 'Hydrate 30 mins prior.',
      order: 3,
      createdAt: new Date(Date.now() - 86400000).toISOString(),
    },
    {
      id: 'task-4',
      title: 'Reconcile monthly SaaS subscriptions & invoices',
      description: 'Export bank statement CSV and categorize business expenses.',
      dueDate: yesterday,
      dueTime: '16:00',
      priority: 'high',
      categoryId: 'cat-finance',
      status: 'todo',
      subtasks: [
        { id: 'st-6', title: 'Download October card statement', completed: true },
        { id: 'st-7', title: 'Tag deductible software tools', completed: false },
      ],
      tags: ['bookkeeping'],
      estimatedMinutes: 35,
      recurring: 'monthly',
      notes: 'Send summary receipt folder to accountant.',
      order: 4,
      createdAt: new Date(Date.now() - 86400000 * 3).toISOString(),
    },
    {
      id: 'task-5',
      title: 'Draft Q4 client retainer renewal proposal',
      description: 'Outline deliverables, timeline milestones, and scope boundaries.',
      dueDate: tomorrow,
      dueTime: '14:00',
      priority: 'high',
      categoryId: 'cat-business',
      status: 'todo',
      subtasks: [],
      tags: ['clients', 'proposal'],
      estimatedMinutes: 50,
      recurring: 'none',
      notes: '',
      order: 5,
      createdAt: new Date(Date.now() - 86400000).toISOString(),
    },
    {
      id: 'task-6',
      title: 'Complete normalization & 3NF/BCNF cheat sheet',
      description: 'Summarize functional dependency preservation proofs.',
      dueDate: inTwoDays,
      dueTime: '15:00',
      priority: 'medium',
      categoryId: 'cat-academics',
      projectId: 'proj-dbms',
      status: 'todo',
      subtasks: [],
      tags: ['study', 'dbms'],
      estimatedMinutes: 45,
      recurring: 'none',
      notes: '',
      order: 6,
      createdAt: new Date(Date.now() - 86400000).toISOString(),
    },
    {
      id: 'task-7',
      title: 'Book dental checkup & annual blood panel',
      description: 'Schedule morning slot before 10 AM.',
      dueDate: inFourDays,
      dueTime: '10:00',
      priority: 'low',
      categoryId: 'cat-personal',
      status: 'todo',
      subtasks: [],
      tags: ['health'],
      estimatedMinutes: 15,
      recurring: 'none',
      notes: '',
      order: 7,
      createdAt: new Date(Date.now() - 86400000).toISOString(),
    },
    {
      id: 'task-8',
      title: 'Audit keyboard shortcuts & modal focus traps',
      description: 'Verify Escape, Tab order, and Ctrl+K command palette behavior.',
      dueDate: today,
      dueTime: '09:30',
      priority: 'medium',
      categoryId: 'cat-work',
      projectId: 'proj-q4-launch',
      status: 'completed',
      subtasks: [
        { id: 'st-8', title: 'Test Escape dismissal', completed: true },
        { id: 'st-9', title: 'Verify focus-visible outline', completed: true },
      ],
      tags: ['a11y', 'qa'],
      estimatedMinutes: 40,
      recurring: 'none',
      notes: '',
      order: 8,
      createdAt: new Date(Date.now() - 86400000 * 2).toISOString(),
      completedAt: new Date(Date.now() - 3600000 * 2).toISOString(),
    },
    {
      id: 'task-9',
      title: 'Prepare release changelog & feature screenshots',
      description: 'Write concise summary of workflow upgrades for newsletter.',
      dueDate: yesterday,
      dueTime: '18:00',
      priority: 'medium',
      categoryId: 'cat-work',
      projectId: 'proj-q4-launch',
      status: 'completed',
      subtasks: [],
      tags: ['launch'],
      estimatedMinutes: 30,
      recurring: 'none',
      notes: '',
      order: 9,
      createdAt: new Date(Date.now() - 86400000 * 4).toISOString(),
      completedAt: `${yesterday}T17:15:00.000Z`,
    },
    {
      id: 'task-10',
      title: 'Review SQL transaction isolation levels',
      description: 'Compare Read Committed, Repeatable Read, and Serializable anomalies.',
      dueDate: twoDaysAgo,
      dueTime: '19:00',
      priority: 'high',
      categoryId: 'cat-academics',
      projectId: 'proj-dbms',
      status: 'completed',
      subtasks: [],
      tags: ['dbms'],
      estimatedMinutes: 50,
      recurring: 'none',
      notes: '',
      order: 10,
      createdAt: new Date(Date.now() - 86400000 * 5).toISOString(),
      completedAt: `${twoDaysAgo}T18:40:00.000Z`,
    },
  ];

  const habits: Habit[] = [
    {
      id: 'hab-exercise',
      title: 'Exercise 30m',
      description: 'Strength, run, or mobility session',
      schedule: 'daily',
      customDays: [1, 2, 3, 4, 5, 6, 0],
      color: '#10b981',
      iconName: 'Dumbbell',
      completedDates: generateSeedHabitDates(today, [0, 1, 2, 3, 4, 6]),
      createdAt: new Date(Date.now() - 86400000 * 30).toISOString(),
    },
    {
      id: 'hab-read',
      title: 'Read 20 pages',
      description: 'Non-fiction or technical literature',
      schedule: 'daily',
      customDays: [1, 2, 3, 4, 5, 6, 0],
      color: '#6366f1',
      iconName: 'BookOpen',
      completedDates: generateSeedHabitDates(today, [0, 1, 2, 4, 5, 6]),
      createdAt: new Date(Date.now() - 86400000 * 30).toISOString(),
    },
    {
      id: 'hab-water',
      title: 'Drink 2.5L water',
      description: 'Hydration target before 8 PM',
      schedule: 'daily',
      customDays: [1, 2, 3, 4, 5, 6, 0],
      color: '#3b82f6',
      iconName: 'Droplets',
      completedDates: generateSeedHabitDates(today, [0, 1, 2, 3, 4, 5, 6]),
      createdAt: new Date(Date.now() - 86400000 * 30).toISOString(),
    },
    {
      id: 'hab-study',
      title: 'Deep study block',
      description: '1 uninterrupted academic sprint',
      schedule: 'weekdays',
      customDays: [1, 2, 3, 4, 5],
      color: '#8b5cf6',
      iconName: 'GraduationCap',
      completedDates: generateSeedHabitDates(today, [1, 2, 3, 4, 5]),
      createdAt: new Date(Date.now() - 86400000 * 25).toISOString(),
    },
    {
      id: 'hab-wake',
      title: 'Wake up at 6:30 AM',
      description: 'Consistent morning rhythm',
      schedule: 'weekdays',
      customDays: [1, 2, 3, 4, 5],
      color: '#f59e0b',
      iconName: 'Sun',
      completedDates: generateSeedHabitDates(today, [1, 2, 3, 5]),
      createdAt: new Date(Date.now() - 86400000 * 25).toISOString(),
    },
    {
      id: 'hab-biz',
      title: 'Work on business',
      description: 'Outreach, product, or client growth',
      schedule: 'custom',
      customDays: [1, 3, 5],
      color: '#ec4899',
      iconName: 'Briefcase',
      completedDates: generateSeedHabitDates(today, [1, 3, 5]),
      createdAt: new Date(Date.now() - 86400000 * 20).toISOString(),
    },
  ];

  const focusSessions: FocusSession[] = [
    {
      id: 'fs-1',
      taskId: 'task-8',
      taskTitle: 'Audit keyboard shortcuts & modal focus traps',
      mode: 'focus',
      durationMinutes: 25,
      completedAt: new Date(Date.now() - 3600000 * 3).toISOString(),
    },
    {
      id: 'fs-2',
      taskId: 'task-1',
      taskTitle: 'Finalize onboarding flow wireframes & copy',
      mode: 'focus',
      durationMinutes: 25,
      completedAt: new Date(Date.now() - 3600000 * 1.5).toISOString(),
    },
    {
      id: 'fs-3',
      taskId: 'task-9',
      taskTitle: 'Prepare release changelog & feature screenshots',
      mode: 'focus',
      durationMinutes: 25,
      completedAt: `${yesterday}T16:30:00.000Z`,
    },
    {
      id: 'fs-4',
      taskId: 'task-10',
      taskTitle: 'Review SQL transaction isolation levels',
      mode: 'focus',
      durationMinutes: 50,
      completedAt: `${twoDaysAgo}T18:10:00.000Z`,
    },
  ];

  return {
    version: 1,
    tasks,
    projects,
    categories: DEFAULT_CATEGORIES,
    habits,
    focusSessions,
    preferences: DEFAULT_PREFERENCES,
    productivityHistory: computeProductivityHistory(tasks, habits, focusSessions),
  };
}

export function createEmptyDataset(): DayflowDataset {
  return {
    version: 1,
    tasks: [],
    projects: [],
    categories: DEFAULT_CATEGORIES,
    habits: [],
    focusSessions: [],
    preferences: DEFAULT_PREFERENCES,
    productivityHistory: [],
  };
}

export function computeProductivityHistory(
  tasks: Task[],
  habits: Habit[],
  focusSessions: FocusSession[]
): ProductivityDay[] {
  const today = getTodayStr();
  const days: ProductivityDay[] = [];

  for (let i = 29; i >= 0; i--) {
    const date = addDaysStr(today, -i);
    const tasksCompleted = tasks.filter(
      (t) => t.status === 'completed' && t.completedAt && t.completedAt.slice(0, 10) === date
    ).length;
    const focusMinutes = focusSessions
      .filter((s) => s.mode === 'focus' && s.completedAt.slice(0, 10) === date)
      .reduce((sum, s) => sum + s.durationMinutes, 0);
    const habitsCompleted = habits.filter((h) => h.completedDates.includes(date)).length;

    days.push({
      date,
      tasksCompleted,
      focusMinutes,
      habitsCompleted,
    });
  }
  return days;
}

export interface DayflowRepository {
  load(): DayflowDataset;
  save(dataset: DayflowDataset): void;
  reset(withSampleData: boolean): DayflowDataset;
}

export class LocalStorageRepository implements DayflowRepository {
  load(): DayflowDataset {
    try {
      const initialized = localStorage.getItem(INITIALIZED_KEY);
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!initialized || !raw) {
        const seed = createSampleDataset();
        this.save(seed);
        localStorage.setItem(INITIALIZED_KEY, 'true');
        return seed;
      }
      const parsed = JSON.parse(raw) as Partial<DayflowDataset>;
      const merged: DayflowDataset = {
        version: 1,
        tasks: Array.isArray(parsed.tasks) ? parsed.tasks : [],
        projects: Array.isArray(parsed.projects) ? parsed.projects : [],
        categories:
          Array.isArray(parsed.categories) && parsed.categories.length > 0
            ? parsed.categories
            : DEFAULT_CATEGORIES,
        habits: Array.isArray(parsed.habits) ? parsed.habits : [],
        focusSessions: Array.isArray(parsed.focusSessions) ? parsed.focusSessions : [],
        preferences: { ...DEFAULT_PREFERENCES, ...(parsed.preferences || {}) },
        productivityHistory: Array.isArray(parsed.productivityHistory)
          ? parsed.productivityHistory
          : [],
      };
      merged.productivityHistory = computeProductivityHistory(
        merged.tasks,
        merged.habits,
        merged.focusSessions
      );
      return merged;
    } catch {
      const seed = createSampleDataset();
      this.save(seed);
      localStorage.setItem(INITIALIZED_KEY, 'true');
      return seed;
    }
  }

  save(dataset: DayflowDataset): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(dataset));
      localStorage.setItem(INITIALIZED_KEY, 'true');
    } catch (err) {
      console.error('Failed to persist Dayflow dataset:', err);
    }
  }

  reset(withSampleData: boolean): DayflowDataset {
    const next = withSampleData ? createSampleDataset() : createEmptyDataset();
    this.save(next);
    return next;
  }
}

export const dayflowStorage: DayflowRepository = new LocalStorageRepository();

export function validateImportedDataset(input: unknown): DayflowDataset | null {
  if (!input || typeof input !== 'object') return null;
  const obj = input as Record<string, unknown>;
  if (!Array.isArray(obj.tasks) || !Array.isArray(obj.categories)) {
    return null;
  }
  const tasks = obj.tasks.filter(
    (t): t is Task =>
      Boolean(t && typeof t === 'object' && typeof (t as Task).id === 'string' && typeof (t as Task).title === 'string')
  );
  const categories = obj.categories.filter(
    (c): c is Category =>
      Boolean(c && typeof c === 'object' && typeof (c as Category).id === 'string' && typeof (c as Category).name === 'string')
  );
  const projects = Array.isArray(obj.projects)
    ? obj.projects.filter((p): p is Project => Boolean(p && typeof p === 'object' && typeof (p as Project).id === 'string'))
    : [];
  const habits = Array.isArray(obj.habits)
    ? obj.habits.filter((h): h is Habit => Boolean(h && typeof h === 'object' && typeof (h as Habit).id === 'string'))
    : [];
  const focusSessions = Array.isArray(obj.focusSessions)
    ? obj.focusSessions.filter(
        (f): f is FocusSession => Boolean(f && typeof f === 'object' && typeof (f as FocusSession).id === 'string')
      )
    : [];
  const preferences: UserPreferences =
    obj.preferences && typeof obj.preferences === 'object'
      ? { ...DEFAULT_PREFERENCES, ...(obj.preferences as Partial<UserPreferences>) }
      : DEFAULT_PREFERENCES;

  // Sanitize avatarUrl against unsafe javascript:/data: protocols except safe data:image/
  if (
    preferences.avatarUrl &&
    !preferences.avatarUrl.startsWith('/') &&
    !preferences.avatarUrl.startsWith('https://') &&
    !preferences.avatarUrl.startsWith('data:image/')
  ) {
    preferences.avatarUrl = DEFAULT_AVATAR_URL;
  }

  return {
    version: 1,
    tasks,
    projects,
    categories: categories.length > 0 ? categories : DEFAULT_CATEGORIES,
    habits,
    focusSessions,
    preferences,
    productivityHistory: computeProductivityHistory(tasks, habits, focusSessions),
  };
}

export function exportTasksToCSV(tasks: Task[], categories: Category[], projects: Project[]): string {
  const catMap = new Map(categories.map((c) => [c.id, c.name]));
  const projMap = new Map(projects.map((p) => [p.id, p.name]));
  const esc = (val: string | number | undefined) => {
    const s = String(val ?? '');
    return `"${s.replace(/"/g, '""')}"`;
  };
  const header = [
    'ID',
    'Title',
    'Description',
    'Status',
    'Priority',
    'Due Date',
    'Due Time',
    'Category',
    'Project',
    'Estimated Minutes',
    'Recurring',
    'Tags',
    'Completed At',
  ].join(',');
  const rows = tasks.map((t) =>
    [
      esc(t.id),
      esc(t.title),
      esc(t.description),
      esc(t.status),
      esc(t.priority),
      esc(t.dueDate),
      esc(t.dueTime),
      esc(catMap.get(t.categoryId) || 'Personal'),
      esc(t.projectId ? projMap.get(t.projectId) || '' : ''),
      esc(t.estimatedMinutes),
      esc(t.recurring),
      esc(t.tags.join('; ')),
      esc(t.completedAt || ''),
    ].join(',')
  );
  return [header, ...rows].join('\n');
}
