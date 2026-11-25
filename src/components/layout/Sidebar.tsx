import { useState } from 'react';
import {
  BarChart3,
  Calendar as CalendarIcon,
  CalendarClock,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Flame,
  FolderKanban,
  Inbox,
  LayoutDashboard,
  ListTodo,
  Plus,
  Settings,
  Sun,
  Timer,
  X,
} from 'lucide-react';
import { useDayflow } from '../../context/DayflowContext';
import { NavSection } from '../../types/dayflow';
import { getTodayStr } from '../../utils/dateUtils';

interface SidebarProps {
  collapsed: boolean;
  onToggleCollapse: () => void;
  mobileOpen: boolean;
  onCloseMobile: () => void;
}

const NAV_ITEMS: Array<{
  id: NavSection;
  label: string;
  icon: typeof LayoutDashboard;
}> = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'today', label: 'Today', icon: Sun },
  { id: 'upcoming', label: 'Upcoming', icon: CalendarClock },
  { id: 'all-tasks', label: 'All Tasks', icon: ListTodo },
  { id: 'calendar', label: 'Calendar', icon: CalendarIcon },
  { id: 'projects', label: 'Projects', icon: FolderKanban },
  { id: 'habits', label: 'Habit Tracker', icon: Flame },
  { id: 'focus', label: 'Focus Mode', icon: Timer },
  { id: 'analytics', label: 'Analytics', icon: BarChart3 },
  { id: 'completed', label: 'Completed Tasks', icon: CheckCircle2 },
  { id: 'settings', label: 'Settings', icon: Settings },
];

export function Sidebar({
  collapsed,
  onToggleCollapse,
  mobileOpen,
  onCloseMobile,
}: SidebarProps) {
  const {
    dataset,
    activeSection,
    setActiveSection,
    openQuickAdd,
    timer,
    setSelectedProjectId,
  } = useDayflow();
  const [avatarError, setAvatarError] = useState(false);

  const today = getTodayStr();
  const pendingTasks = dataset.tasks.filter((t) => t.status !== 'completed');
  const todayCount = pendingTasks.filter((t) => t.dueDate === today).length;
  const upcomingCount = pendingTasks.filter((t) => t.dueDate > today).length;
  const completedCount = dataset.tasks.filter((t) => t.status === 'completed').length;

  const getBadgeCount = (id: NavSection): number | null => {
    if (id === 'today') return todayCount || null;
    if (id === 'upcoming') return upcomingCount || null;
    if (id === 'all-tasks') return pendingTasks.length || null;
    if (id === 'projects') return dataset.projects.length || null;
    if (id === 'completed') return completedCount || null;
    return null;
  };

  const formatTimerShort = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  const handleNav = (id: NavSection) => {
    setActiveSection(id);
    if (id !== 'projects') {
      setSelectedProjectId(null);
    }
    onCloseMobile();
  };

  const initials = dataset.preferences.displayName
    .split(' ')
    .map((p) => p[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  const renderSidebarContent = (isMobile: boolean) => {
    const isCompact = !isMobile && collapsed;

    return (
      <div className="flex h-full flex-col border-r border-zinc-200 bg-zinc-50/80 dark:border-zinc-800/90 dark:bg-[#151519]">
        {/* Top brand bar */}
        <div className="flex h-14 items-center justify-between border-b border-zinc-200/80 px-3.5 dark:border-zinc-800/80">
          <button
            type="button"
            onClick={() => handleNav('dashboard')}
            className="flex items-center gap-2.5 overflow-hidden text-left focus-visible:outline-none"
          >
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg df-accent-bg text-white shadow-sm">
              <Inbox className="h-4 w-4" />
            </div>
            {!isCompact && (
              <span className="font-display text-base font-bold tracking-tight text-zinc-900 dark:text-zinc-100 whitespace-nowrap">
                Dayflow
              </span>
            )}
          </button>

          {isMobile ? (
            <button
              type="button"
              onClick={onCloseMobile}
              className="rounded-lg p-1.5 text-zinc-500 hover:bg-zinc-200/70 dark:text-zinc-400 dark:hover:bg-zinc-800"
              aria-label="Close navigation menu"
            >
              <X className="h-4 w-4" />
            </button>
          ) : (
            <button
              type="button"
              onClick={onToggleCollapse}
              className="hidden rounded-lg p-1.5 text-zinc-500 transition-colors hover:bg-zinc-200/70 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-100 lg:inline-flex"
              aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
              title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            >
              {collapsed ? (
                <ChevronRight className="h-4 w-4" />
              ) : (
                <ChevronLeft className="h-4 w-4" />
              )}
            </button>
          )}
        </div>

        {/* Prominent Quick Add Task CTA */}
        <div className="p-3">
          <button
            type="button"
            onClick={() => {
              openQuickAdd();
              onCloseMobile();
            }}
            className={`flex w-full items-center justify-center gap-2 rounded-lg df-accent-bg px-3 py-2.5 text-sm font-medium text-white shadow-sm transition-all active:scale-[0.98] ${
              isCompact ? 'px-0' : ''
            }`}
            title="Quick Add Task (N)"
          >
            <Plus className="h-4 w-4 shrink-0" />
            {!isCompact && (
              <>
                <span className="whitespace-nowrap">Quick Add Task</span>
                <kbd className="ml-auto rounded bg-white/20 px-1.5 py-0.5 font-mono text-[10px] font-medium">
                  N
                </kbd>
              </>
            )}
          </button>
        </div>

        {/* Navigation links */}
        <nav className="flex-1 space-y-0.5 overflow-y-auto px-2.5 py-1" aria-label="Primary">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const active = activeSection === item.id;
            const count = getBadgeCount(item.id);
            const showRunningTimer = item.id === 'focus' && timer.isRunning;

            return (
              <button
                key={item.id}
                type="button"
                onClick={() => handleNav(item.id)}
                title={isCompact ? item.label : undefined}
                className={`group flex w-full items-center gap-3 rounded-lg px-2.5 py-2 text-sm font-medium transition-colors ${
                  active
                    ? 'bg-zinc-200/80 text-zinc-950 dark:bg-zinc-800/90 dark:text-white'
                    : 'text-zinc-600 hover:bg-zinc-200/50 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800/50 dark:hover:text-zinc-100'
                } ${isCompact ? 'justify-center px-0' : ''}`}
              >
                <Icon
                  className={`h-4 w-4 shrink-0 transition-colors ${
                    active
                      ? 'df-accent-text'
                      : 'text-zinc-500 group-hover:text-zinc-700 dark:text-zinc-400 dark:group-hover:text-zinc-200'
                  }`}
                />
                {!isCompact && (
                  <>
                    <span className="flex-1 truncate text-left whitespace-nowrap">
                      {item.label}
                    </span>
                    {showRunningTimer ? (
                      <span className="font-mono text-xs font-medium tabular-nums df-accent-text">
                        {formatTimerShort(timer.remainingSeconds)}
                      </span>
                    ) : count !== null ? (
                      <span className="font-mono text-xs tabular-nums text-zinc-400 dark:text-zinc-500">
                        {count}
                      </span>
                    ) : null}
                  </>
                )}
              </button>
            );
          })}
        </nav>

        {/* Bottom user profile strip */}
        <div className="border-t border-zinc-200/80 p-3 dark:border-zinc-800/80">
          <button
            type="button"
            onClick={() => handleNav('settings')}
            className={`flex w-full items-center gap-2.5 rounded-lg p-1.5 text-left transition-colors hover:bg-zinc-200/60 dark:hover:bg-zinc-800/60 ${
              isCompact ? 'justify-center' : ''
            }`}
            title="Profile & Settings"
          >
            {dataset.preferences.avatarUrl && !avatarError ? (
              <img
                src={dataset.preferences.avatarUrl}
                alt={dataset.preferences.displayName}
                referrerPolicy="no-referrer"
                onError={() => setAvatarError(true)}
                className="h-8 w-8 shrink-0 rounded-full object-cover ring-1 ring-zinc-200 dark:ring-zinc-700"
              />
            ) : (
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full df-accent-soft text-xs font-semibold df-accent-text">
                {initials || 'DF'}
              </div>
            )}
            {!isCompact && (
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-zinc-900 dark:text-zinc-100">
                  {dataset.preferences.displayName}
                </p>
                <p className="truncate text-xs text-zinc-500 dark:text-zinc-400">
                  {dataset.preferences.roleTitle}
                </p>
              </div>
            )}
          </button>
        </div>
      </div>
    );
  };

  return (
    <>
      {/* Desktop Sidebar */}
      <aside
        className={`hidden shrink-0 transition-[width] duration-200 ease-out lg:block ${
          collapsed ? 'w-[68px]' : 'w-[248px]'
        }`}
      >
        {renderSidebarContent(false)}
      </aside>

      {/* Mobile Drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-40 flex lg:hidden">
          <div
            onClick={onCloseMobile}
            className="fixed inset-0 bg-black/50 backdrop-blur-[1px]"
          />
          <aside className="relative z-10 h-full w-64 max-w-[82vw] shadow-2xl">
            {renderSidebarContent(true)}
          </aside>
        </div>
      )}
    </>
  );
}
