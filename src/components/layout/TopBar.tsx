import { useEffect, useRef, useState } from 'react';
import {
  Bell,
  Check,
  Clock,
  Cloud,
  Menu,
  Moon,
  RefreshCw,
  Search,
  Sun,
  Wand2,
  X,
} from 'lucide-react';
import { useDayflow } from '../../context/DayflowContext';
import { NavSection } from '../../types/dayflow';

interface TopBarProps {
  onOpenMobileMenu: () => void;
}

const SECTION_TITLES: Record<NavSection, string> = {
  dashboard: 'Dashboard',
  today: 'Today',
  upcoming: 'Upcoming',
  'all-tasks': 'All Tasks',
  calendar: 'Calendar',
  projects: 'Projects',
  habits: 'Habit Tracker',
  focus: 'Focus Mode',
  analytics: 'Analytics',
  completed: 'Completed Tasks',
  settings: 'Settings',
};

export function TopBar({ onOpenMobileMenu }: TopBarProps) {
  const {
    dataset,
    activeSection,
    setActiveSection,
    setCommandPaletteOpen,
    setAiAssistantOpen,
    notifications,
    dismissNotification,
    updatePreferences,
    timer,
    cloudUser,
    cloudSyncState,
  } = useDayflow();

  const [notifOpen, setNotifOpen] = useState(false);
  const notifRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleOutside = (e: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setNotifOpen(false);
      }
    };
    if (notifOpen) {
      document.addEventListener('mousedown', handleOutside);
      return () => document.removeEventListener('mousedown', handleOutside);
    }
  }, [notifOpen]);

  const isDark =
    dataset.preferences.theme === 'dark' ||
    (dataset.preferences.theme === 'system' &&
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-color-scheme: dark)').matches);

  const toggleTheme = () => {
    updatePreferences({ theme: isDark ? 'light' : 'dark' });
  };

  const todayLabel = new Date().toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });

  const timerLabel = `${String(Math.floor(timer.remainingSeconds / 60)).padStart(2, '0')}:${String(
    timer.remainingSeconds % 60
  ).padStart(2, '0')}`;

  return (
    <header className="sticky top-0 z-20 flex h-14 shrink-0 items-center justify-between gap-4 border-b border-zinc-200/80 bg-white/90 px-4 backdrop-blur-md dark:border-zinc-800/80 dark:bg-[#121215]/90 sm:px-6">
      {/* Left: Mobile menu + Section context */}
      <div className="flex min-w-0 items-center gap-3">
        <button
          type="button"
          onClick={onOpenMobileMenu}
          className="rounded-lg p-2 text-zinc-600 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800 lg:hidden"
          aria-label="Open navigation menu"
        >
          <Menu className="h-5 w-5" />
        </button>

        <div className="flex min-w-0 items-baseline gap-2.5">
          <h1 className="truncate font-display text-base font-semibold tracking-tight text-zinc-900 dark:text-zinc-100 sm:text-lg">
            {SECTION_TITLES[activeSection]}
          </h1>
          <span className="hidden text-xs text-zinc-400 dark:text-zinc-500 sm:inline whitespace-nowrap">
            {todayLabel}
          </span>
        </div>
      </div>

      {/* Right: Search/Command Palette, Active Timer chip if running, AI Assistant, Notifications, Theme */}
      <div className="flex shrink-0 items-center gap-2">
        {timer.isRunning && activeSection !== 'focus' && (
          <button
            type="button"
            onClick={() => setActiveSection('focus')}
            className="hidden items-center gap-1.5 rounded-lg border border-zinc-200 bg-zinc-50 px-2.5 py-1.5 font-mono text-xs font-medium tabular-nums text-zinc-800 transition-colors hover:bg-zinc-100 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800 sm:inline-flex"
            title="Jump to Focus Mode"
          >
            <Clock className="h-3.5 w-3.5 df-accent-text" />
            <span>{timerLabel}</span>
          </button>
        )}

        <button
          type="button"
          onClick={() => setCommandPaletteOpen(true)}
          className="inline-flex items-center gap-2 rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-1.5 text-xs font-medium text-zinc-600 transition-colors hover:border-zinc-300 hover:bg-zinc-100 hover:text-zinc-900 dark:border-zinc-800 dark:bg-zinc-900/70 dark:text-zinc-400 dark:hover:border-zinc-700 dark:hover:text-zinc-200"
          title="Command Palette (Ctrl/Cmd + K)"
        >
          <Search className="h-3.5 w-3.5" />
          <span className="hidden sm:inline whitespace-nowrap">Search or Jump</span>
          <kbd className="hidden rounded bg-zinc-200/70 px-1.5 py-0.5 font-mono text-[10px] text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400 md:inline">
            ⌘K
          </kbd>
        </button>

        <button
          type="button"
          onClick={() => setAiAssistantOpen(true)}
          className="inline-flex items-center gap-1.5 rounded-lg border df-accent-border df-accent-soft px-3 py-1.5 text-xs font-medium df-accent-text transition-opacity hover:opacity-90 whitespace-nowrap shrink-0"
          title="Open AI Productivity Assistant"
        >
          <Wand2 className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">AI Assistant</span>
        </button>

        {/* Cloud Sync Status */}
        <button
          type="button"
          onClick={() => setActiveSection('settings')}
          className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-200 px-2.5 py-1.5 text-xs font-medium text-zinc-600 transition-colors hover:bg-zinc-100 dark:border-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-800 whitespace-nowrap shrink-0"
          title={
            cloudUser
              ? `Supabase connected (${cloudUser.email})`
              : 'Connect Supabase Cloud Sync in Settings'
          }
        >
          {cloudSyncState === 'syncing' ? (
            <RefreshCw className="h-3.5 w-3.5 animate-spin df-accent-text" />
          ) : (
            <Cloud
              className={`h-3.5 w-3.5 ${
                cloudUser
                  ? cloudSyncState === 'error'
                    ? 'text-red-500'
                    : 'text-emerald-500'
                  : 'text-zinc-400'
              }`}
            />
          )}
          <span className="hidden md:inline">
            {cloudUser
              ? cloudSyncState === 'syncing'
                ? 'Syncing'
                : cloudSyncState === 'error'
                ? 'Sync Error'
                : 'Synced'
              : 'Cloud'}
          </span>
        </button>

        {/* Notifications Bell */}
        <div className="relative" ref={notifRef}>
          <button
            type="button"
            onClick={() => setNotifOpen((prev) => !prev)}
            className="relative rounded-lg p-2 text-zinc-600 transition-colors hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
            aria-label="Notifications and reminders"
          >
            <Bell className="h-4 w-4" />
            {notifications.length > 0 && (
              <span className="absolute right-1.5 top-1.5 flex h-2 w-2 rounded-full bg-red-500" />
            )}
          </button>

          {notifOpen && (
            <div className="absolute right-0 mt-2 w-80 max-w-[90vw] rounded-xl border border-zinc-200 bg-white p-3 shadow-xl dark:border-zinc-800 dark:bg-[#19191d]">
              <div className="mb-2 flex items-center justify-between border-b border-zinc-100 pb-2 dark:border-zinc-800">
                <span className="text-xs font-semibold text-zinc-900 dark:text-zinc-100">
                  Reminders &amp; Alerts ({notifications.length})
                </span>
                <button
                  type="button"
                  onClick={() => setNotifOpen(false)}
                  className="rounded p-1 text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                  aria-label="Close notifications"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>

              {notifications.length === 0 ? (
                <div className="py-6 text-center">
                  <Check className="mx-auto h-6 w-6 text-emerald-500" />
                  <p className="mt-2 text-xs font-medium text-zinc-700 dark:text-zinc-300">
                    All caught up
                  </p>
                  <p className="mt-0.5 text-[11px] text-zinc-500">
                    No overdue or urgent reminders right now.
                  </p>
                </div>
              ) : (
                <div className="max-h-72 space-y-1.5 overflow-y-auto">
                  {notifications.map((n) => (
                    <div
                      key={n.id}
                      className="flex items-start justify-between gap-2 rounded-lg p-2 transition-colors hover:bg-zinc-50 dark:hover:bg-zinc-800/60"
                    >
                      <button
                        type="button"
                        onClick={() => {
                          setActiveSection(n.targetSection);
                          setNotifOpen(false);
                        }}
                        className="min-w-0 flex-1 text-left"
                      >
                        <p
                          className={`truncate text-xs font-medium ${
                            n.type === 'overdue'
                              ? 'text-red-600 dark:text-red-400'
                              : n.type === 'upcoming'
                              ? 'text-amber-600 dark:text-amber-400'
                              : 'text-zinc-900 dark:text-zinc-100'
                          }`}
                        >
                          {n.title}
                        </p>
                        <p className="truncate text-[11px] text-zinc-500 dark:text-zinc-400">
                          {n.subtitle}
                        </p>
                      </button>
                      <button
                        type="button"
                        onClick={() => dismissNotification(n.id)}
                        className="shrink-0 rounded p-1 text-zinc-400 hover:bg-zinc-200/70 hover:text-zinc-700 dark:hover:bg-zinc-700"
                        aria-label="Dismiss reminder"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        <button
          type="button"
          onClick={toggleTheme}
          className="rounded-lg p-2 text-zinc-600 transition-colors hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
          aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
          title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
        >
          {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
        </button>
      </div>
    </header>
  );
}
