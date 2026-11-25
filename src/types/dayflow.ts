export type PriorityLevel = 'urgent' | 'high' | 'medium' | 'low';

export type TaskStatus = 'todo' | 'in_progress' | 'completed';

export type RecurringRule = 'none' | 'daily' | 'weekdays' | 'weekly' | 'monthly';

export type NavSection =
  | 'dashboard'
  | 'today'
  | 'upcoming'
  | 'all-tasks'
  | 'calendar'
  | 'projects'
  | 'habits'
  | 'focus'
  | 'analytics'
  | 'completed'
  | 'settings';

export type TaskViewMode = 'list' | 'kanban' | 'calendar';

export type ThemePreference = 'light' | 'dark' | 'system';

export type AccentColor = 'violet' | 'indigo' | 'blue' | 'emerald' | 'rose';

export type ProjectStatus = 'active' | 'on_hold' | 'completed';

export type HabitSchedule = 'daily' | 'weekdays' | 'custom';

export type FocusModeType = 'focus' | 'short_break' | 'long_break';

export interface Subtask {
  id: string;
  title: string;
  completed: boolean;
}

export interface Task {
  id: string;
  title: string;
  description: string;
  dueDate: string; // YYYY-MM-DD or ''
  dueTime: string; // HH:mm or ''
  priority: PriorityLevel;
  categoryId: string;
  projectId?: string;
  status: TaskStatus;
  subtasks: Subtask[];
  tags: string[];
  estimatedMinutes: number;
  recurring: RecurringRule;
  notes: string;
  order: number;
  createdAt: string;
  completedAt?: string;
}

export interface Category {
  id: string;
  name: string;
  color: string;
  iconName: string;
  isDefault?: boolean;
}

export interface Project {
  id: string;
  name: string;
  description: string;
  deadline: string; // YYYY-MM-DD
  color: string;
  status: ProjectStatus;
  createdAt: string;
}

export interface Habit {
  id: string;
  title: string;
  description: string;
  schedule: HabitSchedule;
  customDays: number[]; // 0 = Sun ... 6 = Sat
  color: string;
  iconName: string;
  completedDates: string[]; // YYYY-MM-DD[]
  createdAt: string;
}

export interface FocusSession {
  id: string;
  taskId?: string;
  taskTitle?: string;
  mode: FocusModeType;
  durationMinutes: number;
  completedAt: string; // ISO string
}

export interface ProductivityDay {
  date: string; // YYYY-MM-DD
  tasksCompleted: number;
  focusMinutes: number;
  habitsCompleted: number;
}

export interface UserPreferences {
  displayName: string;
  roleTitle: string;
  avatarUrl: string;
  theme: ThemePreference;
  accentColor: AccentColor;
  defaultPriority: PriorityLevel;
  focusMinutes: number;
  shortBreakMinutes: number;
  longBreakMinutes: number;
  soundEnabled: boolean;
  browserNotifications: boolean;
  inAppReminders: boolean;
  reminderLeadMinutes: number;
}

export interface DayflowDataset {
  version: number;
  tasks: Task[];
  projects: Project[];
  categories: Category[];
  habits: Habit[];
  focusSessions: FocusSession[];
  preferences: UserPreferences;
  productivityHistory: ProductivityDay[];
}

export interface GeneratedAITaskDraft {
  title: string;
  description?: string;
  dueDate: string;
  dueTime?: string;
  priority: PriorityLevel;
  categoryName: string;
  estimatedMinutes: number;
  subtasks?: string[];
  tags?: string[];
}

export interface AIPlanResponse {
  summary: string;
  tasks: GeneratedAITaskDraft[];
}

export interface AIScheduleResponse {
  overview: string;
  scheduleBlocks: Array<{
    timeSlot: string;
    taskId?: string;
    taskTitle: string;
    reason: string;
  }>;
  overloadedDays: Array<{
    date: string;
    taskCount: number;
    totalMinutes: number;
    recommendation: string;
  }>;
}

export interface AIWeeklySummaryResponse {
  headline: string;
  summary: string;
  wins: string[];
  recommendations: string[];
}
