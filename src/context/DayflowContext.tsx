import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  Category,
  DayflowDataset,
  FocusModeType,
  FocusSession,
  Habit,
  NavSection,
  Project,
  Task,
  TaskStatus,
  UserPreferences,
} from '../types/dayflow';
import {
  computeProductivityHistory,
  dayflowStorage,
  DEFAULT_CATEGORIES,
  DEFAULT_PREFERENCES,
} from '../services/storageService';
import {
  fetchSupabaseStatus,
  pullWorkspaceFromSupabase,
  pushWorkspaceToSupabase,
  signInWithSupabase,
  signUpWithSupabase,
  SupabaseStatusInfo,
  SupabaseUser,
} from '../services/supabaseSyncService';
import {
  getNextRecurringDueDate,
  getTodayStr,
  isHabitScheduledForDate,
  isTaskDueSoon,
  isTaskOverdue,
} from '../utils/dateUtils';
import { playSoftCompleteTone, playTimerCompleteChime } from '../utils/soundUtils';

export interface ToastItem {
  id: string;
  message: string;
  tone?: 'default' | 'success' | 'warning' | 'error';
  undoLabel?: string;
  onUndo?: () => void;
}

export interface InAppNotification {
  id: string;
  type: 'overdue' | 'upcoming' | 'habit' | 'summary';
  title: string;
  subtitle: string;
  targetSection: NavSection;
  taskId?: string;
}

interface TimerState {
  mode: FocusModeType;
  isRunning: boolean;
  remainingSeconds: number;
  totalSeconds: number;
  endTimestamp: number | null;
  linkedTaskId: string;
  customMinutes: number | null;
}

interface QuickAddOptions {
  dueDate?: string;
  dueTime?: string;
  projectId?: string;
}

interface DayflowContextValue {
  dataset: DayflowDataset;
  activeSection: NavSection;
  setActiveSection: (s: NavSection) => void;
  selectedProjectId: string | null;
  setSelectedProjectId: (id: string | null) => void;

  // Modals & Drawers
  quickAddOpen: boolean;
  quickAddDefaults: QuickAddOptions;
  openQuickAdd: (opts?: QuickAddOptions) => void;
  closeQuickAdd: () => void;
  editingTask: Task | null;
  setEditingTask: (t: Task | null) => void;
  commandPaletteOpen: boolean;
  setCommandPaletteOpen: (open: boolean) => void;
  aiAssistantOpen: boolean;
  setAiAssistantOpen: (open: boolean) => void;

  // Toasts
  toasts: ToastItem[];
  pushToast: (toast: Omit<ToastItem, 'id'>) => void;
  dismissToast: (id: string) => void;

  // Notifications
  notifications: InAppNotification[];
  dismissNotification: (id: string) => void;

  // Task operations
  addTask: (
    partial: Partial<Task> & Pick<Task, 'title'>
  ) => Task;
  addMultipleTasks: (partials: Array<Partial<Task> & Pick<Task, 'title'>>) => Task[];
  updateTask: (id: string, updates: Partial<Task>) => void;
  deleteTask: (id: string) => void;
  duplicateTask: (id: string) => void;
  toggleTaskCompletion: (id: string) => void;
  moveTaskStatus: (id: string, status: TaskStatus) => void;
  reorderTaskList: (draggedId: string, targetId: string) => void;

  // Category operations
  addCategory: (cat: Omit<Category, 'id'>) => Category;
  deleteCategory: (id: string) => void;

  // Project operations
  addProject: (proj: Omit<Project, 'id' | 'createdAt'>) => Project;
  updateProject: (id: string, updates: Partial<Project>) => void;
  deleteProject: (id: string) => void;

  // Habit operations
  addHabit: (habit: Omit<Habit, 'id' | 'createdAt' | 'completedDates'>) => Habit;
  updateHabit: (id: string, updates: Partial<Habit>) => void;
  deleteHabit: (id: string) => void;
  toggleHabitForDate: (habitId: string, dateStr: string) => void;

  // Focus Timer
  timer: TimerState;
  startTimer: () => void;
  pauseTimer: () => void;
  resetTimer: () => void;
  switchTimerMode: (mode: FocusModeType) => void;
  setCustomTimerMinutes: (minutes: number) => void;
  setTimerLinkedTask: (taskId: string) => void;
  deleteFocusSession: (id: string) => void;

  // Preferences & Data management
  updatePreferences: (updates: Partial<UserPreferences>) => void;
  importDataset: (next: DayflowDataset) => void;
  resetDataset: (withSampleData: boolean) => void;

  // Supabase Backend Sync
  supabaseStatus: SupabaseStatusInfo | null;
  refreshSupabaseStatus: () => Promise<void>;
  cloudUser: SupabaseUser | null;
  cloudSyncState: 'idle' | 'syncing' | 'synced' | 'error';
  cloudSyncError: string;
  lastSyncedAt: string | null;
  signInCloud: (email: string, password: string) => Promise<void>;
  signUpCloud: (email: string, password: string) => Promise<{ needsEmailConfirmation: boolean }>;
  signOutCloud: () => void;
  syncNowToCloud: () => Promise<void>;
  pullFromCloud: () => Promise<void>;
}

const DayflowContext = createContext<DayflowContextValue | null>(null);

function makeId(prefix: string): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return `${prefix}-${crypto.randomUUID().slice(0, 8)}`;
  }
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
}

export function DayflowProvider({ children }: { children: React.ReactNode }) {
  const [dataset, setDataset] = useState<DayflowDataset>(() => dayflowStorage.load());
  const [activeSection, setActiveSection] = useState<NavSection>('dashboard');
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);

  const [quickAddOpen, setQuickAddOpen] = useState(false);
  const [quickAddDefaults, setQuickAddDefaults] = useState<QuickAddOptions>({});
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);
  const [aiAssistantOpen, setAiAssistantOpen] = useState(false);

  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const [dismissedNotifIds, setDismissedNotifIds] = useState<string[]>([]);
  const browserAlertedRef = useRef<Set<string>>(new Set());

  const [timer, setTimer] = useState<TimerState>(() => {
    const mins = dataset.preferences.focusMinutes || 25;
    return {
      mode: 'focus',
      isRunning: false,
      remainingSeconds: mins * 60,
      totalSeconds: mins * 60,
      endTimestamp: null,
      linkedTaskId: '',
      customMinutes: null,
    };
  });

  // Supabase in-memory session & status (never stored in localStorage)
  const [supabaseStatus, setSupabaseStatus] = useState<SupabaseStatusInfo | null>(null);
  const [cloudUser, setCloudUser] = useState<SupabaseUser | null>(null);
  const [cloudToken, setCloudToken] = useState<string | null>(null);
  const [cloudSyncState, setCloudSyncState] = useState<'idle' | 'syncing' | 'synced' | 'error'>('idle');
  const [cloudSyncError, setCloudSyncError] = useState('');
  const [lastSyncedAt, setLastSyncedAt] = useState<string | null>(null);
  const skipNextCloudPushRef = useRef(false);

  const refreshSupabaseStatus = useCallback(async () => {
    try {
      const status = await fetchSupabaseStatus();
      setSupabaseStatus(status);
    } catch {
      // Non-blocking
    }
  }, []);

  useEffect(() => {
    refreshSupabaseStatus();
  }, [refreshSupabaseStatus]);

  // Persist dataset locally + debounced push to Supabase when signed in
  useEffect(() => {
    const synced: DayflowDataset = {
      ...dataset,
      productivityHistory: computeProductivityHistory(
        dataset.tasks,
        dataset.habits,
        dataset.focusSessions
      ),
    };
    dayflowStorage.save(synced);

    if (!cloudToken || !cloudUser) return;
    if (skipNextCloudPushRef.current) {
      skipNextCloudPushRef.current = false;
      return;
    }

    const timerId = window.setTimeout(async () => {
      setCloudSyncState('syncing');
      setCloudSyncError('');
      try {
        const res = await pushWorkspaceToSupabase(cloudToken, synced);
        setLastSyncedAt(res.syncedAt);
        setCloudSyncState('synced');
      } catch (err) {
        setCloudSyncState('error');
        setCloudSyncError(err instanceof Error ? err.message : 'Cloud sync failed.');
      }
    }, 800);

    return () => window.clearTimeout(timerId);
  }, [dataset, cloudToken, cloudUser]);

  // Apply theme & accent color to <html>
  useEffect(() => {
    const root = document.documentElement;
    root.setAttribute('data-accent', dataset.preferences.accentColor || 'violet');

    const applyTheme = () => {
      const pref = dataset.preferences.theme;
      const prefersDark =
        typeof window !== 'undefined' &&
        window.matchMedia('(prefers-color-scheme: dark)').matches;
      const shouldBeDark = pref === 'dark' || (pref === 'system' && prefersDark);
      if (shouldBeDark) {
        root.classList.add('dark');
      } else {
        root.classList.remove('dark');
      }
    };

    applyTheme();

    if (dataset.preferences.theme === 'system' && typeof window !== 'undefined') {
      const mq = window.matchMedia('(prefers-color-scheme: dark)');
      mq.addEventListener('change', applyTheme);
      return () => mq.removeEventListener('change', applyTheme);
    }
  }, [dataset.preferences.theme, dataset.preferences.accentColor]);

  const pushToast = useCallback((toast: Omit<ToastItem, 'id'>) => {
    const id = makeId('toast');
    setToasts((prev) => [...prev.slice(-3), { ...toast, id }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 6000);
  }, []);

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  // Global keyboard shortcuts: N (new task), Cmd/Ctrl+K (command palette), Esc (close modals)
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const isInput =
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.tagName === 'SELECT' ||
          target.isContentEditable);

      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setCommandPaletteOpen((prev) => !prev);
        return;
      }

      if (e.key === 'Escape') {
        if (commandPaletteOpen) {
          setCommandPaletteOpen(false);
          return;
        }
        if (quickAddOpen) {
          setQuickAddOpen(false);
          return;
        }
        if (editingTask) {
          setEditingTask(null);
          return;
        }
        if (aiAssistantOpen) {
          setAiAssistantOpen(false);
          return;
        }
      }

      if (!isInput && !e.metaKey && !e.ctrlKey && !e.altKey && e.key.toLowerCase() === 'n') {
        e.preventDefault();
        setQuickAddDefaults({});
        setQuickAddOpen(true);
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [commandPaletteOpen, quickAddOpen, editingTask, aiAssistantOpen]);

  const sendBrowserNotification = useCallback(
    (title: string, body: string) => {
      if (
        dataset.preferences.browserNotifications &&
        typeof Notification !== 'undefined' &&
        Notification.permission === 'granted'
      ) {
        try {
          new Notification(title, { body });
        } catch {
          // Ignore browser restrictions
        }
      }
    },
    [dataset.preferences.browserNotifications]
  );

  // Accurate Focus Timer Interval using endTimestamp
  useEffect(() => {
    if (!timer.isRunning || !timer.endTimestamp) return;

    const tick = () => {
      const now = Date.now();
      const left = Math.max(0, Math.ceil((timer.endTimestamp! - now) / 1000));
      if (left <= 0) {
        const completedDurationMin = Math.max(1, Math.round(timer.totalSeconds / 60));
        const linkedTask = dataset.tasks.find((t) => t.id === timer.linkedTaskId);

        const newSession: FocusSession = {
          id: makeId('fs'),
          taskId: linkedTask?.id,
          taskTitle: linkedTask?.title,
          mode: timer.mode,
          durationMinutes: completedDurationMin,
          completedAt: new Date().toISOString(),
        };

        setDataset((prev) => ({
          ...prev,
          focusSessions: [newSession, ...prev.focusSessions],
        }));

        if (dataset.preferences.soundEnabled) {
          playTimerCompleteChime();
        }

        const label =
          timer.mode === 'focus'
            ? 'Focus session complete'
            : timer.mode === 'short_break'
            ? 'Short break finished'
            : 'Long break finished';

        pushToast({
          message: linkedTask
            ? `${label} (${completedDurationMin}m) · ${linkedTask.title}`
            : `${label} (${completedDurationMin}m)`,
          tone: 'success',
        });

        sendBrowserNotification('Dayflow Focus Timer', `${label}! Ready for your next block.`);

        const nextDuration =
          timer.mode === 'focus'
            ? (timer.customMinutes ?? dataset.preferences.focusMinutes) * 60
            : timer.mode === 'short_break'
            ? dataset.preferences.shortBreakMinutes * 60
            : dataset.preferences.longBreakMinutes * 60;

        setTimer((prev) => ({
          ...prev,
          isRunning: false,
          endTimestamp: null,
          remainingSeconds: nextDuration,
          totalSeconds: nextDuration,
        }));
      } else {
        setTimer((prev) => ({ ...prev, remainingSeconds: left }));
      }
    };

    tick();
    const id = window.setInterval(tick, 500);
    return () => window.clearInterval(id);
  }, [
    timer.isRunning,
    timer.endTimestamp,
    timer.mode,
    timer.totalSeconds,
    timer.linkedTaskId,
    timer.customMinutes,
    dataset.tasks,
    dataset.preferences.soundEnabled,
    dataset.preferences.focusMinutes,
    dataset.preferences.shortBreakMinutes,
    dataset.preferences.longBreakMinutes,
    pushToast,
    sendBrowserNotification,
  ]);

  const startTimer = useCallback(() => {
    setTimer((prev) => {
      if (prev.isRunning) return prev;
      const secs = prev.remainingSeconds > 0 ? prev.remainingSeconds : prev.totalSeconds;
      return {
        ...prev,
        isRunning: true,
        remainingSeconds: secs,
        endTimestamp: Date.now() + secs * 1000,
      };
    });
  }, []);

  const pauseTimer = useCallback(() => {
    setTimer((prev) => {
      if (!prev.isRunning) return prev;
      const left = prev.endTimestamp
        ? Math.max(0, Math.ceil((prev.endTimestamp - Date.now()) / 1000))
        : prev.remainingSeconds;
      return {
        ...prev,
        isRunning: false,
        remainingSeconds: left,
        endTimestamp: null,
      };
    });
  }, []);

  const resetTimer = useCallback(() => {
    setTimer((prev) => ({
      ...prev,
      isRunning: false,
      endTimestamp: null,
      remainingSeconds: prev.totalSeconds,
    }));
  }, []);

  const switchTimerMode = useCallback(
    (mode: FocusModeType) => {
      const mins =
        mode === 'focus'
          ? dataset.preferences.focusMinutes || 25
          : mode === 'short_break'
          ? dataset.preferences.shortBreakMinutes || 5
          : dataset.preferences.longBreakMinutes || 15;
      setTimer((prev) => ({
        ...prev,
        mode,
        isRunning: false,
        endTimestamp: null,
        customMinutes: null,
        totalSeconds: mins * 60,
        remainingSeconds: mins * 60,
      }));
    },
    [
      dataset.preferences.focusMinutes,
      dataset.preferences.shortBreakMinutes,
      dataset.preferences.longBreakMinutes,
    ]
  );

  const setCustomTimerMinutes = useCallback((minutes: number) => {
    const safe = Math.max(1, Math.min(180, Math.round(minutes)));
    setTimer((prev) => ({
      ...prev,
      mode: 'focus',
      isRunning: false,
      endTimestamp: null,
      customMinutes: safe,
      totalSeconds: safe * 60,
      remainingSeconds: safe * 60,
    }));
  }, []);

  const setTimerLinkedTask = useCallback((taskId: string) => {
    setTimer((prev) => ({ ...prev, linkedTaskId: taskId }));
  }, []);

  const deleteFocusSession = useCallback((id: string) => {
    setDataset((prev) => ({
      ...prev,
      focusSessions: prev.focusSessions.filter((s) => s.id !== id),
    }));
  }, []);

  // Task operations
  const addTask = useCallback(
    (partial: Partial<Task> & Pick<Task, 'title'>): Task => {
      const maxOrder = dataset.tasks.reduce((max, t) => Math.max(max, t.order || 0), 0);
      const newTask: Task = {
        id: makeId('task'),
        title: partial.title.trim(),
        description: partial.description?.trim() ?? '',
        dueDate: partial.dueDate ?? getTodayStr(),
        dueTime: partial.dueTime ?? '',
        priority: partial.priority ?? dataset.preferences.defaultPriority,
        categoryId: partial.categoryId ?? dataset.categories[0]?.id ?? 'cat-personal',
        projectId: partial.projectId || undefined,
        status: partial.status ?? 'todo',
        subtasks: partial.subtasks ?? [],
        tags: partial.tags ?? [],
        estimatedMinutes: partial.estimatedMinutes ?? 30,
        recurring: partial.recurring ?? 'none',
        notes: partial.notes ?? '',
        order: maxOrder + 1,
        createdAt: new Date().toISOString(),
        completedAt: partial.status === 'completed' ? new Date().toISOString() : undefined,
      };
      setDataset((prev) => ({
        ...prev,
        tasks: [newTask, ...prev.tasks],
      }));
      return newTask;
    },
    [dataset.tasks, dataset.preferences.defaultPriority, dataset.categories]
  );

  const addMultipleTasks = useCallback(
    (partials: Array<Partial<Task> & Pick<Task, 'title'>>): Task[] => {
      let maxOrder = dataset.tasks.reduce((max, t) => Math.max(max, t.order || 0), 0);
      const created: Task[] = partials.map((p) => {
        maxOrder += 1;
        return {
          id: makeId('task'),
          title: p.title.trim(),
          description: p.description?.trim() ?? '',
          dueDate: p.dueDate ?? getTodayStr(),
          dueTime: p.dueTime ?? '',
          priority: p.priority ?? dataset.preferences.defaultPriority,
          categoryId: p.categoryId ?? dataset.categories[0]?.id ?? 'cat-personal',
          projectId: p.projectId || undefined,
          status: p.status ?? 'todo',
          subtasks: p.subtasks ?? [],
          tags: p.tags ?? [],
          estimatedMinutes: p.estimatedMinutes ?? 30,
          recurring: p.recurring ?? 'none',
          notes: p.notes ?? '',
          order: maxOrder,
          createdAt: new Date().toISOString(),
        };
      });
      setDataset((prev) => ({
        ...prev,
        tasks: [...created, ...prev.tasks],
      }));
      return created;
    },
    [dataset.tasks, dataset.preferences.defaultPriority, dataset.categories]
  );

  const updateTask = useCallback((id: string, updates: Partial<Task>) => {
    setDataset((prev) => ({
      ...prev,
      tasks: prev.tasks.map((t) => {
        if (t.id !== id) return t;
        const nextStatus = updates.status ?? t.status;
        const completedAt =
          nextStatus === 'completed' && t.status !== 'completed'
            ? new Date().toISOString()
            : nextStatus !== 'completed'
            ? undefined
            : t.completedAt;
        return { ...t, ...updates, completedAt };
      }),
    }));
    setEditingTask((prev) => (prev && prev.id === id ? { ...prev, ...updates } : prev));
  }, []);

  const deleteTask = useCallback(
    (id: string) => {
      const target = dataset.tasks.find((t) => t.id === id);
      if (!target) return;
      setDataset((prev) => ({
        ...prev,
        tasks: prev.tasks.filter((t) => t.id !== id),
      }));
      if (editingTask?.id === id) setEditingTask(null);

      pushToast({
        message: `Deleted "${target.title}"`,
        undoLabel: 'Undo',
        onUndo: () => {
          setDataset((prev) => ({
            ...prev,
            tasks: [target, ...prev.tasks],
          }));
        },
      });
    },
    [dataset.tasks, editingTask, pushToast]
  );

  const duplicateTask = useCallback(
    (id: string) => {
      const source = dataset.tasks.find((t) => t.id === id);
      if (!source) return;
      const copy: Task = {
        ...source,
        id: makeId('task'),
        title: `${source.title} (Copy)`,
        status: 'todo',
        completedAt: undefined,
        createdAt: new Date().toISOString(),
        subtasks: source.subtasks.map((st) => ({ ...st, id: makeId('st'), completed: false })),
        order: dataset.tasks.reduce((m, t) => Math.max(m, t.order || 0), 0) + 1,
      };
      setDataset((prev) => ({
        ...prev,
        tasks: [copy, ...prev.tasks],
      }));
      pushToast({ message: `Duplicated "${source.title}"`, tone: 'success' });
    },
    [dataset.tasks, pushToast]
  );

  const toggleTaskCompletion = useCallback(
    (id: string) => {
      const target = dataset.tasks.find((t) => t.id === id);
      if (!target) return;

      const wasCompleted = target.status === 'completed';
      const nextStatus: TaskStatus = wasCompleted ? 'todo' : 'completed';

      let spawnedRecurring: Task | null = null;
      if (!wasCompleted && target.recurring !== 'none') {
        spawnedRecurring = {
          ...target,
          id: makeId('task'),
          status: 'todo',
          dueDate: getNextRecurringDueDate(target.dueDate, target.recurring),
          completedAt: undefined,
          createdAt: new Date().toISOString(),
          subtasks: target.subtasks.map((st) => ({ ...st, id: makeId('st'), completed: false })),
        };
      }

      if (!wasCompleted && dataset.preferences.soundEnabled) {
        playSoftCompleteTone();
      }

      setDataset((prev) => {
        const updated = prev.tasks.map((t) =>
          t.id === id
            ? {
                ...t,
                status: nextStatus,
                completedAt: nextStatus === 'completed' ? new Date().toISOString() : undefined,
              }
            : t
        );
        return {
          ...prev,
          tasks: spawnedRecurring ? [spawnedRecurring, ...updated] : updated,
        };
      });

      if (!wasCompleted) {
        pushToast({
          message: spawnedRecurring
            ? `Completed "${target.title}" · Next occurrence scheduled`
            : `Completed "${target.title}"`,
          tone: 'success',
          undoLabel: 'Undo',
          onUndo: () => {
            setDataset((prev) => ({
              ...prev,
              tasks: prev.tasks
                .filter((t) => t.id !== spawnedRecurring?.id)
                .map((t) =>
                  t.id === id
                    ? { ...t, status: target.status, completedAt: target.completedAt }
                    : t
                ),
            }));
          },
        });
      }
    },
    [dataset.tasks, dataset.preferences.soundEnabled, pushToast]
  );

  const moveTaskStatus = useCallback(
    (id: string, status: TaskStatus) => {
      const target = dataset.tasks.find((t) => t.id === id);
      if (!target || target.status === status) return;
      if (status === 'completed' && dataset.preferences.soundEnabled) {
        playSoftCompleteTone();
      }
      updateTask(id, { status });
    },
    [dataset.tasks, dataset.preferences.soundEnabled, updateTask]
  );

  const reorderTaskList = useCallback((draggedId: string, targetId: string) => {
    if (draggedId === targetId) return;
    setDataset((prev) => {
      const list = [...prev.tasks];
      const fromIdx = list.findIndex((t) => t.id === draggedId);
      const toIdx = list.findIndex((t) => t.id === targetId);
      if (fromIdx === -1 || toIdx === -1) return prev;
      const [moved] = list.splice(fromIdx, 1);
      list.splice(toIdx, 0, moved);
      return {
        ...prev,
        tasks: list.map((t, i) => ({ ...t, order: i + 1 })),
      };
    });
  }, []);

  // Category operations
  const addCategory = useCallback((cat: Omit<Category, 'id'>): Category => {
    const newCat: Category = { ...cat, id: makeId('cat') };
    setDataset((prev) => ({
      ...prev,
      categories: [...prev.categories, newCat],
    }));
    return newCat;
  }, []);

  const deleteCategory = useCallback((id: string) => {
    setDataset((prev) => {
      if (prev.categories.length <= 1) return prev;
      const fallbackId = prev.categories.find((c) => c.id !== id)?.id ?? 'cat-personal';
      return {
        ...prev,
        categories: prev.categories.filter((c) => c.id !== id),
        tasks: prev.tasks.map((t) => (t.categoryId === id ? { ...t, categoryId: fallbackId } : t)),
      };
    });
  }, []);

  // Project operations
  const addProject = useCallback((proj: Omit<Project, 'id' | 'createdAt'>): Project => {
    const created: Project = {
      ...proj,
      id: makeId('proj'),
      createdAt: new Date().toISOString(),
    };
    setDataset((prev) => ({
      ...prev,
      projects: [created, ...prev.projects],
    }));
    return created;
  }, []);

  const updateProject = useCallback((id: string, updates: Partial<Project>) => {
    setDataset((prev) => ({
      ...prev,
      projects: prev.projects.map((p) => (p.id === id ? { ...p, ...updates } : p)),
    }));
  }, []);

  const deleteProject = useCallback(
    (id: string) => {
      setDataset((prev) => ({
        ...prev,
        projects: prev.projects.filter((p) => p.id !== id),
        tasks: prev.tasks.map((t) => (t.projectId === id ? { ...t, projectId: undefined } : t)),
      }));
      if (selectedProjectId === id) setSelectedProjectId(null);
      pushToast({ message: 'Project deleted' });
    },
    [selectedProjectId, pushToast]
  );

  // Habit operations
  const addHabit = useCallback(
    (habit: Omit<Habit, 'id' | 'createdAt' | 'completedDates'>): Habit => {
      const created: Habit = {
        ...habit,
        id: makeId('hab'),
        completedDates: [],
        createdAt: new Date().toISOString(),
      };
      setDataset((prev) => ({
        ...prev,
        habits: [...prev.habits, created],
      }));
      return created;
    },
    []
  );

  const updateHabit = useCallback((id: string, updates: Partial<Habit>) => {
    setDataset((prev) => ({
      ...prev,
      habits: prev.habits.map((h) => (h.id === id ? { ...h, ...updates } : h)),
    }));
  }, []);

  const deleteHabit = useCallback((id: string) => {
    setDataset((prev) => ({
      ...prev,
      habits: prev.habits.filter((h) => h.id !== id),
    }));
  }, []);

  const toggleHabitForDate = useCallback(
    (habitId: string, dateStr: string) => {
      setDataset((prev) => ({
        ...prev,
        habits: prev.habits.map((h) => {
          if (h.id !== habitId) return h;
          const exists = h.completedDates.includes(dateStr);
          if (!exists && prev.preferences.soundEnabled) {
            playSoftCompleteTone();
          }
          return {
            ...h,
            completedDates: exists
              ? h.completedDates.filter((d) => d !== dateStr)
              : [...h.completedDates, dateStr].sort(),
          };
        }),
      }));
    },
    []
  );

  const updatePreferences = useCallback((updates: Partial<UserPreferences>) => {
    setDataset((prev) => ({
      ...prev,
      preferences: { ...prev.preferences, ...updates },
    }));
  }, []);

  const importDataset = useCallback(
    (next: DayflowDataset) => {
      setDataset(next);
      pushToast({ message: 'Workspace data imported successfully', tone: 'success' });
    },
    [pushToast]
  );

  const resetDataset = useCallback(
    (withSampleData: boolean) => {
      const next = dayflowStorage.reset(withSampleData);
      setDataset(next);
      setSelectedProjectId(null);
      pushToast({
        message: withSampleData ? 'Sample workspace restored' : 'All workspace data cleared',
      });
    },
    [pushToast]
  );

  const openQuickAdd = useCallback((opts?: QuickAddOptions) => {
    setQuickAddDefaults(opts ?? {});
    setQuickAddOpen(true);
  }, []);

  const closeQuickAdd = useCallback(() => {
    setQuickAddOpen(false);
    setQuickAddDefaults({});
  }, []);

  // Real-time Notifications
  const notifications = useMemo<InAppNotification[]>(() => {
    if (!dataset.preferences.inAppReminders) return [];
    const now = new Date();
    const today = getTodayStr();
    const list: InAppNotification[] = [];

    const overdueTasks = dataset.tasks.filter((t) => isTaskOverdue(t, now));
    overdueTasks.slice(0, 4).forEach((t) => {
      list.push({
        id: `overdue-${t.id}`,
        type: 'overdue',
        title: `Overdue: ${t.title}`,
        subtitle: `Due ${t.dueDate}${t.dueTime ? ` at ${t.dueTime}` : ''}`,
        targetSection: 'today',
        taskId: t.id,
      });
    });

    const upcomingSoon = dataset.tasks.filter(
      (t) => !isTaskOverdue(t, now) && isTaskDueSoon(t, dataset.preferences.reminderLeadMinutes, now)
    );
    upcomingSoon.slice(0, 4).forEach((t) => {
      list.push({
        id: `due-${t.id}`,
        type: 'upcoming',
        title: `Upcoming: ${t.title}`,
        subtitle: t.dueTime ? `Scheduled today at ${t.dueTime}` : 'Due today',
        targetSection: 'today',
        taskId: t.id,
      });
    });

    const dueHabitsToday = dataset.habits.filter(
      (h) => isHabitScheduledForDate(h, today) && !h.completedDates.includes(today)
    );
    if (dueHabitsToday.length > 0) {
      list.push({
        id: `habits-${today}`,
        type: 'habit',
        title: `${dueHabitsToday.length} habit${dueHabitsToday.length > 1 ? 's' : ''} remaining today`,
        subtitle: dueHabitsToday
          .slice(0, 3)
          .map((h) => h.title)
          .join(', '),
        targetSection: 'habits',
      });
    }

    const todayTasks = dataset.tasks.filter((t) => t.dueDate === today);
    if (todayTasks.length > 0) {
      const doneCount = todayTasks.filter((t) => t.status === 'completed').length;
      list.push({
        id: `summary-${today}`,
        type: 'summary',
        title: `Daily Summary: ${doneCount}/${todayTasks.length} today's tasks complete`,
        subtitle: `${overdueTasks.length} overdue · ${dueHabitsToday.length} habits pending`,
        targetSection: 'dashboard',
      });
    }

    return list.filter((n) => !dismissedNotifIds.includes(n.id));
  }, [
    dataset.tasks,
    dataset.habits,
    dataset.preferences.inAppReminders,
    dataset.preferences.reminderLeadMinutes,
    dismissedNotifIds,
  ]);

  // Fire optional browser notification once per due task
  useEffect(() => {
    if (!dataset.preferences.browserNotifications) return;
    notifications.forEach((n) => {
      if ((n.type === 'upcoming' || n.type === 'overdue') && !browserAlertedRef.current.has(n.id)) {
        browserAlertedRef.current.add(n.id);
        sendBrowserNotification('Dayflow Reminder', `${n.title} — ${n.subtitle}`);
      }
    });
  }, [notifications, dataset.preferences.browserNotifications, sendBrowserNotification]);

  const dismissNotification = useCallback((id: string) => {
    setDismissedNotifIds((prev) => [...prev, id]);
  }, []);

  const hydrateOrSeedFromCloud = useCallback(
    async (token: string) => {
      setCloudSyncState('syncing');
      setCloudSyncError('');
      try {
        const remote = await pullWorkspaceFromSupabase(token);
        if (remote.isEmpty) {
          const res = await pushWorkspaceToSupabase(token, dataset);
          setLastSyncedAt(res.syncedAt);
          setCloudSyncState('synced');
          pushToast({
            message: 'Connected & pushed local workspace to Supabase',
            tone: 'success',
          });
        } else {
          const nextTasks = remote.tasks ?? [];
          const nextHabits = remote.habits ?? [];
          const nextSessions = remote.focusSessions ?? [];
          const nextDataset: DayflowDataset = {
            version: 1,
            tasks: nextTasks,
            projects: remote.projects ?? [],
            categories:
              remote.categories && remote.categories.length > 0
                ? remote.categories
                : DEFAULT_CATEGORIES,
            habits: nextHabits,
            focusSessions: nextSessions,
            preferences: { ...DEFAULT_PREFERENCES, ...(remote.preferences || {}) },
            productivityHistory: computeProductivityHistory(
              nextTasks,
              nextHabits,
              nextSessions
            ),
          };
          skipNextCloudPushRef.current = true;
          setDataset(nextDataset);
          setLastSyncedAt(new Date().toISOString());
          setCloudSyncState('synced');
          pushToast({
            message: 'Loaded workspace from Supabase',
            tone: 'success',
          });
        }
      } catch (err) {
        setCloudSyncState('error');
        const msg = err instanceof Error ? err.message : 'Failed to sync with Supabase.';
        setCloudSyncError(msg);
        throw err;
      }
    },
    [dataset, pushToast]
  );

  const signInCloud = useCallback(
    async (email: string, password: string) => {
      const auth = await signInWithSupabase(email, password);
      if (!auth.accessToken || !auth.user) {
        throw new Error('Authentication failed.');
      }
      setCloudToken(auth.accessToken);
      setCloudUser(auth.user);
      await hydrateOrSeedFromCloud(auth.accessToken);
    },
    [hydrateOrSeedFromCloud]
  );

  const signUpCloud = useCallback(
    async (email: string, password: string) => {
      const auth = await signUpWithSupabase(email, password);
      if (auth.needsEmailConfirmation) {
        return { needsEmailConfirmation: true };
      }
      if (auth.accessToken && auth.user) {
        setCloudToken(auth.accessToken);
        setCloudUser(auth.user);
        await hydrateOrSeedFromCloud(auth.accessToken);
      }
      return { needsEmailConfirmation: false };
    },
    [hydrateOrSeedFromCloud]
  );

  const signOutCloud = useCallback(() => {
    setCloudToken(null);
    setCloudUser(null);
    setCloudSyncState('idle');
    setCloudSyncError('');
    pushToast({ message: 'Signed out of Supabase cloud sync' });
  }, [pushToast]);

  const syncNowToCloud = useCallback(async () => {
    if (!cloudToken) return;
    setCloudSyncState('syncing');
    setCloudSyncError('');
    try {
      const res = await pushWorkspaceToSupabase(cloudToken, dataset);
      setLastSyncedAt(res.syncedAt);
      setCloudSyncState('synced');
      pushToast({ message: 'Synced to Supabase', tone: 'success' });
    } catch (err) {
      setCloudSyncState('error');
      setCloudSyncError(err instanceof Error ? err.message : 'Sync failed.');
    }
  }, [cloudToken, dataset, pushToast]);

  const pullFromCloud = useCallback(async () => {
    if (!cloudToken) return;
    await hydrateOrSeedFromCloud(cloudToken);
  }, [cloudToken, hydrateOrSeedFromCloud]);

  const value: DayflowContextValue = {
    dataset,
    activeSection,
    setActiveSection,
    selectedProjectId,
    setSelectedProjectId,
    quickAddOpen,
    quickAddDefaults,
    openQuickAdd,
    closeQuickAdd,
    editingTask,
    setEditingTask,
    commandPaletteOpen,
    setCommandPaletteOpen,
    aiAssistantOpen,
    setAiAssistantOpen,
    toasts,
    pushToast,
    dismissToast,
    notifications,
    dismissNotification,
    addTask,
    addMultipleTasks,
    updateTask,
    deleteTask,
    duplicateTask,
    toggleTaskCompletion,
    moveTaskStatus,
    reorderTaskList,
    addCategory,
    deleteCategory,
    addProject,
    updateProject,
    deleteProject,
    addHabit,
    updateHabit,
    deleteHabit,
    toggleHabitForDate,
    timer,
    startTimer,
    pauseTimer,
    resetTimer,
    switchTimerMode,
    setCustomTimerMinutes,
    setTimerLinkedTask,
    deleteFocusSession,
    updatePreferences,
    importDataset,
    resetDataset,
    supabaseStatus,
    refreshSupabaseStatus,
    cloudUser,
    cloudSyncState,
    cloudSyncError,
    lastSyncedAt,
    signInCloud,
    signUpCloud,
    signOutCloud,
    syncNowToCloud,
    pullFromCloud,
  };

  return <DayflowContext.Provider value={value}>{children}</DayflowContext.Provider>;
}

export function useDayflow(): DayflowContextValue {
  const ctx = useContext(DayflowContext);
  if (!ctx) throw new Error('useDayflow must be used within DayflowProvider');
  return ctx;
}
